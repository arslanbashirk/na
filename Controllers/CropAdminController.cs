using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity.Core.EntityClient;
using System.Data.SqlClient;
using System.Configuration;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.Caching;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using Microsoft.VisualBasic.FileIO;

namespace NADashboard.Controllers
{
    [Authorize(Users = "admin")]
    [OutputCache(NoStore = true, Location = System.Web.UI.OutputCacheLocation.None, Duration = 0, VaryByParam = "*")]
    public class CropAdminController : Controller
    {
        private SqlConnection Connection()
        {
            var builder = new EntityConnectionStringBuilder(ConfigurationManager.ConnectionStrings["NationalAccountsEntities"].ConnectionString);
            return new SqlConnection(builder.ProviderConnectionString);
        }

        [AllowAnonymous, HttpGet]
        public ActionResult Login(string returnUrl)
        {
            ViewBag.ReturnUrl = returnUrl;
            return View();
        }

        [AllowAnonymous, HttpPost, ValidateAntiForgeryToken]
        public ActionResult Login(string username, string password, string returnUrl)
        {
            var key = "crop.login." + Request.UserHostAddress;
            var attempts = (int?)MemoryCache.Default.Get(key) ?? 0;
            bool valid = false;
            if (attempts < 10 && username == "admin" && password != null && password.Length < 256)
            {
                using (var derive = new Rfc2898DeriveBytes(password, Encoding.UTF8.GetBytes("CropAtlasAdmin2026"), 100000, HashAlgorithmName.SHA256))
                {
                    var actual = derive.GetBytes(32);
                    var expected = Convert.FromBase64String("mFhNRN0Qc4J1a8XFfmI+QKTR/+LhhIRAxoVDEfGP/Xk=");
                    int difference = 0;
                    for (int i = 0; i < actual.Length; i++) difference |= actual[i] ^ expected[i];
                    valid = difference == 0;
                }
            }
            if (!valid)
            {
                MemoryCache.Default.Set(key, attempts + 1, DateTimeOffset.Now.AddMinutes(15));
                ModelState.AddModelError("", attempts >= 10 ? "Too many attempts. Please try again in 15 minutes." : "The username or password is incorrect.");
                ViewBag.ReturnUrl = returnUrl;
                ViewBag.Username = username;
                return View();
            }
            MemoryCache.Default.Remove(key);
            Session.Clear();
            FormsAuthentication.SetAuthCookie("admin", false);
            Response.Cookies[FormsAuthentication.FormsCookieName].Secure = Request.IsSecureConnection;
            return Redirect(Url.IsLocalUrl(returnUrl) ? returnUrl : Url.Action("Explorer"));
        }

        [HttpPost, ValidateAntiForgeryToken]
        public ActionResult Logout()
        {
            FormsAuthentication.SignOut();
            Session.Abandon();
            return RedirectToAction("Home", "Crops");
        }

        private List<AdminCrop> Crops(SqlConnection cn)
        {
            var rows = new List<AdminCrop>();
            using (var cmd = new SqlCommand("SELECT id,name FROM dbo.Crops ORDER BY name", cn))
            using (var reader = cmd.ExecuteReader())
                while (reader.Read()) rows.Add(new AdminCrop { Id = reader.GetInt32(0), Name = reader.IsDBNull(1) ? "Unnamed crop" : reader.GetString(1) });
            return rows;
        }

        [HttpGet]
        public ActionResult Explorer(int crop = 4, string year = "", string search = "", int page = 1)
        {
            var model = new CropExplorer { CropId = crop, Year = year ?? "", Search = (search ?? "").Trim(), Page = Math.Max(1, page) };
            if (model.Search.Length > 80) model.Search = model.Search.Substring(0, 80);
            using (var cn = Connection())
            {
                cn.Open(); model.Crops = Crops(cn);
                using (var cmd = new SqlCommand("SELECT DISTINCT RTRIM(fiscalyear) FROM dbo.CropData WHERE CropId=@crop ORDER BY 1 DESC", cn))
                {
                    cmd.Parameters.AddWithValue("@crop", crop);
                    using (var reader = cmd.ExecuteReader()) while (reader.Read()) model.Years.Add(reader.GetString(0));
                }
                const string where = " WHERE CropId=@crop AND (@year='' OR RTRIM(fiscalyear)=@year) AND (@search='' OR District LIKE @search ESCAPE '~' OR dist_desc LIKE @search ESCAPE '~' OR dist_code LIKE @search ESCAPE '~')";
                using (var cmd = new SqlCommand("SELECT COUNT(*) FROM dbo.CropData" + where, cn))
                {
                    FilterParameters(cmd, model); model.Count = (int)cmd.ExecuteScalar();
                }
                model.Page = Math.Min(model.Page, Math.Max(1, (model.Count + 29) / 30));
                using (var cmd = new SqlCommand("SELECT id,District,RTRIM(fiscalyear),RTRIM(dist_code),dist_desc,Area,Production FROM dbo.CropData" + where + " ORDER BY fiscalyear DESC,dist_code,District,id OFFSET @offset ROWS FETCH NEXT 30 ROWS ONLY", cn))
                {
                    FilterParameters(cmd, model); cmd.Parameters.AddWithValue("@offset", (model.Page - 1) * 30);
                    using (var r = cmd.ExecuteReader()) while (r.Read()) model.Rows.Add(new AdminObservation { Id = r.GetInt32(0), District = r.IsDBNull(1) ? "" : r.GetString(1), FiscalYear = r.IsDBNull(2) ? "" : r.GetString(2), DistrictCode = r.IsDBNull(3) ? "" : r.GetString(3), DistrictDescription = r.IsDBNull(4) ? "" : r.GetString(4), Area = r.IsDBNull(5) ? (double?)null : Convert.ToDouble(r[5]), Production = r.IsDBNull(6) ? (double?)null : Convert.ToDouble(r[6]) });
                }
            }
            return View(model);
        }

        private void FilterParameters(SqlCommand cmd, CropExplorer model)
        {
            cmd.Parameters.AddWithValue("@crop", model.CropId);
            cmd.Parameters.AddWithValue("@year", model.Year);
            var escaped = model.Search.Replace("~", "~~").Replace("%", "~%").Replace("_", "~_").Replace("[", "~[");
            cmd.Parameters.AddWithValue("@search", model.Search == "" ? "" : "%" + escaped + "%");
        }

        [HttpGet]
        public ActionResult Import()
        {
            var model = new CropImport();
            using (var cn = Connection()) { cn.Open(); model.Crops = Crops(cn); }
            return View(model);
        }

        [HttpGet]
        public FileResult Template()
        {
            return File(Encoding.UTF8.GetBytes("District,dist_code,fiscalyear,Area,Production\r\n"), "text/csv", "crop-import-template.csv");
        }

        [HttpPost, ValidateAntiForgeryToken]
        public ActionResult Preview(int crop, HttpPostedFileBase file)
        {
            Session.Remove("crop.import");
            var model = new CropImport { CropId = crop };
            using (var cn = Connection())
            {
                cn.Open(); model.Crops = Crops(cn);
                if (!model.Crops.Any(c => c.Id == crop)) model.Errors.Add("Select a valid crop.");
                if (file == null || file.ContentLength == 0 || file.ContentLength > 4 * 1024 * 1024 || !String.Equals(Path.GetExtension(file.FileName), ".csv", StringComparison.OrdinalIgnoreCase)) model.Errors.Add("Upload a CSV file of up to 4 MB.");
                if (model.Errors.Any()) return View("Import", model);
                var codes = new Dictionary<string, string>();
                using (var cmd = new SqlCommand("SELECT RTRIM(dsid),ds FROM dbo.ds", cn))
                using (var reader = cmd.ExecuteReader()) while (reader.Read()) codes[reader.GetString(0)] = reader.IsDBNull(1) ? reader.GetString(0) : reader.GetString(1);
                codes["990"] = "KARACHI DIVISION"; codes["991"] = "CHITRAL COMBINED REPORTING AREA"; codes["992"] = "KOHISTAN COMBINED REPORTING AREA";
                var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                try
                {
                    using (var parser = new TextFieldParser(file.InputStream, Encoding.UTF8, true))
                    {
                        parser.SetDelimiters(","); parser.HasFieldsEnclosedInQuotes = true; parser.TrimWhiteSpace = true;
                        var header = parser.ReadFields();
                        var expected = new[] { "District", "dist_code", "fiscalyear", "Area", "Production" };
                        if (header == null || !header.SequenceEqual(expected, StringComparer.OrdinalIgnoreCase)) model.Errors.Add("Use the template columns in this order: District, dist_code, fiscalyear, Area, Production.");
                        int line = 1;
                        while (!parser.EndOfData && !model.Errors.Any())
                        {
                            line++;
                            if (model.Rows.Count >= 5000) { model.Errors.Add("Import up to 5,000 rows at a time."); break; }
                            var fields = parser.ReadFields();
                            if (fields.Length != 5) { model.Errors.Add("Row " + line + ": expected five columns."); break; }
                            var code = fields[1]; int numericCode;
                            if (Int32.TryParse(code, out numericCode) && numericCode >= 0 && numericCode <= 999) code = numericCode.ToString("D3");
                            var row = new AdminObservation { District = fields[0], DistrictCode = code, FiscalYear = fields[2] };
                            if (String.IsNullOrWhiteSpace(row.District) || row.District.Length > 50 || !codes.ContainsKey(code)) model.Errors.Add("Row " + line + ": provide a district name (up to 50 characters) and a valid reporting-area code.");
                            if (!Regex.IsMatch(row.FiscalYear, @"^\d{4}-\d{2}$") || (Int32.Parse(row.FiscalYear.Substring(0, 4)) + 1) % 100 != Int32.Parse(row.FiscalYear.Substring(5, 2))) model.Errors.Add("Row " + line + ": use a consecutive fiscal year such as 2025-26.");
                            double? area, production;
                            var validArea = Measurement(fields[3], out area);
                            var validProduction = Measurement(fields[4], out production);
                            if (!validArea || !validProduction) model.Errors.Add("Row " + line + ": area and production must be non-negative finite numbers or empty.");
                            row.Area = area; row.Production = production;
                            if (row.Yield.HasValue && row.Yield > 3e38) model.Errors.Add("Row " + line + ": yield exceeds the database numeric range.");
                            row.DistrictDescription = codes.ContainsKey(code) ? codes[code] : "";
                            if (!keys.Add(row.FiscalYear + "|" + code + "|" + row.District)) model.Errors.Add("Row " + line + ": repeated fiscal-year / reporting-area / source-district key in this file.");
                            if (!model.Errors.Any()) model.Rows.Add(row);
                        }
                    }
                }
                catch (MalformedLineException) { model.Errors.Add("The CSV contains malformed quoting. Use the downloadable template."); }
                catch (DecoderFallbackException) { model.Errors.Add("Save the CSV with UTF-8 encoding."); }
                if (!model.Rows.Any() && !model.Errors.Any()) model.Errors.Add("The CSV has no data rows.");
                if (!model.Errors.Any())
                {
                    var existing = ExistingKeys(cn, null, crop);
                    if (model.Rows.Any(r => existing.Contains(Key(r)))) model.Errors.Add("Some rows already exist for this crop, year and source district. This import adds new records and does not overwrite existing observations.");
                }
                if (!model.Errors.Any())
                {
                    model.Token = Guid.NewGuid().ToString("N"); model.Created = DateTime.UtcNow;
                    Session["crop.import"] = model;
                }
            }
            return View("Import", model);
        }

        private bool Measurement(string value, out double? result)
        {
            result = null;
            if (String.IsNullOrWhiteSpace(value)) return true;
            double n;
            if (!Double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out n) || Double.IsNaN(n) || Double.IsInfinity(n) || n < 0 || n > 3e38) return false;
            result = n; return true;
        }
        private string Key(AdminObservation r) { return r.FiscalYear.Trim() + "|" + r.DistrictCode.Trim() + "|" + r.District.Trim(); }
        private HashSet<string> ExistingKeys(SqlConnection cn, SqlTransaction tx, int crop)
        {
            var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var cmd = new SqlCommand("SELECT RTRIM(fiscalyear),RTRIM(dist_code),District FROM dbo.CropData WHERE CropId=@crop", cn, tx))
            {
                cmd.Parameters.AddWithValue("@crop", crop);
                using (var r = cmd.ExecuteReader()) while (r.Read()) keys.Add((r.IsDBNull(0) ? "" : r.GetString(0).Trim()) + "|" + (r.IsDBNull(1) ? "" : r.GetString(1).Trim()) + "|" + (r.IsDBNull(2) ? "" : r.GetString(2).Trim()));
            }
            return keys;
        }

        [HttpPost, ValidateAntiForgeryToken]
        public ActionResult Commit(string token)
        {
            var model = Session["crop.import"] as CropImport;
            if (model == null || String.IsNullOrEmpty(token) || model.Token != token || DateTime.UtcNow - model.Created > TimeSpan.FromMinutes(20))
            {
                TempData["ImportMessage"] = "The preview expired. Upload and review the file again.";
                return RedirectToAction("Import");
            }
            try
            {
                using (var cn = Connection())
                {
                    cn.Open();
                    using (var tx = cn.BeginTransaction(IsolationLevel.Serializable))
                    {
                        long next;
                        using (var lockCmd = new SqlCommand("SELECT COALESCE(MAX(CAST(id AS bigint)),0) FROM dbo.CropData WITH (TABLOCKX,HOLDLOCK)", cn, tx)) next = (long)lockCmd.ExecuteScalar();
                        if (next + model.Rows.Count > Int32.MaxValue) throw new InvalidOperationException("The observation ID range is exhausted.");
                        var existing = ExistingKeys(cn, tx, model.CropId);
                        if (model.Rows.Any(r => existing.Contains(Key(r)))) throw new InvalidOperationException("These records were added since the preview. Please upload and review again.");
                        bool identity;
                        using (var cmd = new SqlCommand("SELECT COLUMNPROPERTY(OBJECT_ID('dbo.CropData'),'id','IsIdentity')", cn, tx)) identity = Convert.ToInt32(cmd.ExecuteScalar()) == 1;
                        foreach (var year in model.Rows.Select(r => r.FiscalYear).Distinct())
                        using (var cmd = new SqlCommand("IF NOT EXISTS(SELECT 1 FROM dbo.[Year] WHERE fiscalyear=@year) INSERT dbo.[Year](fiscalyear) VALUES(@year)", cn, tx)) { cmd.Parameters.AddWithValue("@year", year); cmd.ExecuteNonQuery(); }
                        foreach (var row in model.Rows)
                        using (var cmd = new SqlCommand("INSERT dbo.CropData (" + (identity ? "" : "id,") + "District,dist_code,dist_desc,fiscalyear,CropId,Area,Production,Yield) VALUES (" + (identity ? "" : "@id,") + "@district,@code,@description,@year,@crop,@area,@production,@yield)", cn, tx))
                        {
                            if (!identity) cmd.Parameters.AddWithValue("@id", (int)++next);
                            cmd.Parameters.AddWithValue("@district", row.District); cmd.Parameters.AddWithValue("@code", row.DistrictCode); cmd.Parameters.AddWithValue("@description", row.DistrictDescription);
                            cmd.Parameters.AddWithValue("@year", row.FiscalYear); cmd.Parameters.AddWithValue("@crop", model.CropId);
                            cmd.Parameters.Add("@area", SqlDbType.Real).Value = (object)row.Area ?? DBNull.Value;
                            cmd.Parameters.Add("@production", SqlDbType.Real).Value = (object)row.Production ?? DBNull.Value;
                            cmd.Parameters.Add("@yield", SqlDbType.Real).Value = (object)row.Yield ?? DBNull.Value;
                            cmd.ExecuteNonQuery();
                        }
                        tx.Commit();
                    }
                }
                Session.Remove("crop.import"); MemoryCache.Default.Remove("crops.observations.v1");
                TempData["ImportMessage"] = model.Rows.Count + " records imported successfully.";
                return RedirectToAction("Explorer", new { crop = model.CropId });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError("Crop import failed: {0}", ex);
                model.Errors.Add(ex is InvalidOperationException ? ex.Message : "The import could not be saved. No records were committed. Please retry after checking the database connection.");
                return View("Import", model);
            }
        }
    }

    public class AdminCrop { public int Id { get; set; } public string Name { get; set; } }
    public class AdminObservation
    {
        public int Id { get; set; }
        public string District { get; set; }
        public string DistrictCode { get; set; }
        public string DistrictDescription { get; set; }
        public string FiscalYear { get; set; }
        public double? Area { get; set; }
        public double? Production { get; set; }
        public double? Yield { get { return Area.HasValue && Area > 0 && Production.HasValue ? Production / Area : null; } }
    }
    public class CropExplorer
    {
        public int CropId { get; set; } public string Year { get; set; } public string Search { get; set; } public int Page { get; set; } public int Count { get; set; }
        public List<AdminCrop> Crops = new List<AdminCrop>(); public List<string> Years = new List<string>(); public List<AdminObservation> Rows = new List<AdminObservation>();
    }
    public class CropImport
    {
        public int CropId { get; set; } public string Token { get; set; } public DateTime Created { get; set; }
        public List<AdminCrop> Crops = new List<AdminCrop>(); public List<AdminObservation> Rows = new List<AdminObservation>(); public List<string> Errors = new List<string>();
    }
}
