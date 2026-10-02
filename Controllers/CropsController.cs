using NADashboard.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Runtime.Caching;
using System.Diagnostics;

namespace NADashboard.Controllers
{
    public class CropsController : Controller
    {
        NationalAccountsEntities db = new NationalAccountsEntities();
        // GET: Crops
        public ActionResult Index()
        {
            return RedirectToAction("Home");
        }

        public ActionResult Home()
        {
            return Dashboard("overview");
        }
        public ActionResult CropProfile() { return Dashboard("crop"); }
        public ActionResult AreaProfile()
        {
            var action = !String.IsNullOrEmpty(Request.QueryString["district"]) && Request.QueryString["district"] != "0" ? "DistrictProfile"
                : !String.IsNullOrEmpty(Request.QueryString["division"]) && Request.QueryString["division"] != "0" ? "DivisionProfile" : "ProvinceProfile";
            var values = new System.Web.Routing.RouteValueDictionary(Request.QueryString.AllKeys.Where(k => k != null && k != "crop").ToDictionary(k => k, k => (object)Request.QueryString[k]));
            return RedirectToAction(action, values);
        }
        public ActionResult ProvinceProfile() { return AreaDashboard("province"); }
        public ActionResult DivisionProfile() { return AreaDashboard("division"); }
        public ActionResult DistrictProfile() { return AreaDashboard("district"); }
        private ActionResult AreaDashboard(string level)
        {
            ViewBag.CropPage = "area";
            ViewBag.AreaLevel = level;
            return View("AreaDashboard");
        }
        public ActionResult AreaComparison()
        {
            ViewBag.CropPage = "areaCompare";
            return View("AreaComparison");
        }
        public ActionResult About()
        {
            ViewBag.CropPage = "about";
            return View();
        }
        public ActionResult Compare() { return Dashboard("compare"); }
        private ActionResult Dashboard(string page)
        {
            ViewBag.CropPage = page;
            return View("Dashboard");
        }
        public ActionResult Map()
        {
            return RedirectToAction("Home");
        }

        // Read-only analytical layer. Combined reporting areas remain intact:
        // never allocate their observations to constituent districts.
        private List<CropObservation> Observations()
        {
            const string key = "crops.observations.v1";
            var cached = MemoryCache.Default.Get(key) as List<CropObservation>;
            if (cached != null) return cached;
            var rows = db.Database.SqlQuery<CropObservation>(@"
                SELECT d.CropId, c.name CropName, RTRIM(d.fiscalyear) FiscalYear,
                       RTRIM(d.dist_code) DistrictId,
                       COALESCE(ds.ds, MAX(d.dist_desc)) DistrictName,
                       RTRIM(COALESCE(ds.dvid, special.dvid)) DivisionId,
                       COALESCE(dv.dv, special.dv) DivisionName,
                       RTRIM(COALESCE(dv.pvid, special.pvid)) ProvinceId,
                       COALESCE(pv.pv, special.pv) ProvinceName,
                       SUM(CAST(d.Area AS float)) Area,
                       SUM(CAST(d.Production AS float)) Production,
                       COUNT(*) SourceRows,
                       SUM(CASE WHEN d.Area IS NULL OR d.Production IS NULL THEN 1 ELSE 0 END) MissingRows
                FROM dbo.CropData d
                JOIN dbo.Crops c ON c.id=d.CropId
                LEFT JOIN dbo.ds ds ON ds.dsid=d.dist_code
                LEFT JOIN dbo.dv dv ON dv.dvid=ds.dvid
                LEFT JOIN dbo.pv pv ON pv.pvid=dv.pvid
                OUTER APPLY (
                    SELECT TOP (1) v.dvid, v.dv, v.pvid, p.pv
                    FROM dbo.dv v JOIN dbo.pv p ON p.pvid=v.pvid
                    WHERE (d.dist_code='990' AND v.dv LIKE '%KARACHI%')
                       OR (d.dist_code='991' AND v.dv LIKE '%MALAKAND%')
                       OR (d.dist_code='992' AND v.dv LIKE '%HAZARA%')
                    ORDER BY v.dvid
                ) special
                GROUP BY d.CropId,c.name,RTRIM(d.fiscalyear),RTRIM(d.dist_code),ds.ds,
                         ds.dvid,special.dvid,dv.dv,special.dv,dv.pvid,special.pvid,pv.pv,special.pv
                ORDER BY RTRIM(d.fiscalyear),d.CropId,RTRIM(d.dist_code)").ToList();
            MemoryCache.Default.Set(key, rows, DateTimeOffset.Now.AddMinutes(5));
            return rows;
        }

        [HttpGet]
        public JsonResult Explore(int crop = 4, string year = null, string province = "0", string division = "0", string district = "0", bool metadataOnly = false)
        {
            try
            {
                var all = Observations();
                var years = all.Select(r => r.FiscalYear).Distinct().OrderByDescending(y => y).ToList();
                if (String.IsNullOrWhiteSpace(year)) year = years.FirstOrDefault();
                if (!years.Contains(year) || (crop != 0 && !all.Any(r => r.CropId == crop)))
                {
                    Response.StatusCode = 400;
                    return Json(new { error = "Select an available crop and fiscal year." }, JsonRequestBehavior.AllowGet);
                }
                var previous = years.Where(y => String.CompareOrdinal(y, year) < 0).FirstOrDefault();
                var districts = db.ds.AsNoTracking().ToList();
                var divisions = db.dvs.AsNoTracking().ToList();
                var provinces = db.pvs.AsNoTracking().ToList();
                var geography = districts.Select(d => {
                    var v = divisions.FirstOrDefault(x => x.dvid == d.dvid);
                    var p = v == null ? null : provinces.FirstOrDefault(x => x.pvid == v.pvid);
                    return new { id = d.dsid.Trim(), name = d.ds, division = v == null ? null : v.dvid.Trim(),
                        divisionName = v == null ? null : v.dv1, province = p == null ? null : p.pvid.Trim(),
                        provinceName = p == null ? null : p.pv1, combined = false };
                }).Concat(all.GroupBy(r => r.DistrictId).Select(g => new {
                    id = g.Key, name = g.First().DistrictName,
                    division = g.First().DivisionId, divisionName = g.First().DivisionName,
                    province = g.First().ProvinceId, provinceName = g.First().ProvinceName,
                    combined = g.Key == "990" || g.Key == "991" || g.Key == "992"
                })).GroupBy(g => g.id).Select(g => g.First()).ToList();
                Func<CropObservation, bool> scope = r =>
                    (province == "0" || r.ProvinceId == province) &&
                    (division == "0" || r.DivisionId == division) &&
                    (district == "0" || r.DistrictId == district);
                var result = Json(new {
                    year, previous,
                    crops = db.Database.SqlQuery<CropCatalogEntry>(@"
                        SELECT c.id, c.name, COALESCE(cat.CategoryKey,'uncategorized') CategoryKey,
                               COALESCE(cat.Name,'Uncategorized') Category,
                               COALESCE(a.IconKey,cat.IconKey,'shell-sprout') Icon
                        FROM dbo.Crops c
                        LEFT JOIN dbo.CropCategoryAssignments a ON a.CropId=c.id
                        LEFT JOIN dbo.CropCategories cat ON cat.CategoryKey=a.CategoryKey")
                        .ToList().Where(c => all.Any(r => r.CropId == c.Id))
                        .Select(c => new { id = c.Id, name = c.Name, categoryKey = c.CategoryKey, category = c.Category, icon = c.Icon }).OrderBy(c => c.name),
                    years,
                    geography,
                    reportingAreas = all.Where(r => r.FiscalYear == year).Select(r => new { province = r.ProvinceId, division = r.DivisionId, district = r.DistrictId }).Distinct(),
                    history = metadataOnly ? Enumerable.Empty<CropObservation>() : all.Where(r => (crop == 0 || r.CropId == crop) && scope(r)),
                    portfolio = metadataOnly ? Enumerable.Empty<CropObservation>() : all.Where(r => (r.FiscalYear == year || r.FiscalYear == previous) && scope(r))
                }, JsonRequestBehavior.AllowGet);
                result.MaxJsonLength = crop == 0 ? 64000000 : 12000000;
                return result;
            }
            catch (Exception ex)
            {
                Trace.TraceError("Crop exploration failed: {0}", ex);
                Response.StatusCode = 503;
                return Json(new { error = "Crop data could not be loaded. Please retry." }, JsonRequestBehavior.AllowGet);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) db.Dispose();
            base.Dispose(disposing);
        }

        public JsonResult GetSelectList(string item, string parent)
        {
            if (item != null)
            {
                if (item.Equals("pv"))
                {
                    var result=db.pvs.Select(p => new { id = p.pvid, name = p.pv1}).ToList();
                    return Json(new { data = result }, JsonRequestBehavior.AllowGet);
                }
                else if (item.Equals("dv"))
                {
                    var result = db.dvs.Where(p => p.pvid.Equals(parent) || parent.Equals("0")).Select(p => new { id = p.dvid, name = p.dv1 }).ToList();
                    return Json(new { data = result }, JsonRequestBehavior.AllowGet);
                }
                else if (item.Equals("ds"))
                {
                    var result = db.ds.Where(p => p.dvid.Equals(parent) || parent.Equals("0")).Select(p => new { id = p.dsid, name = p.ds }).ToList();
                    return Json(new { data = result }, JsonRequestBehavior.AllowGet);
                }
                else if (item.Equals("year"))
                {
                    var result = db.Years.OrderByDescending(p => p.fiscalyear).Select(p => new { id = p.fiscalyear, name = p.fiscalyear }).ToList();
                    return Json(new { data = result }, JsonRequestBehavior.AllowGet);
                }
            }
            return Json(null, JsonRequestBehavior.AllowGet);
        }

       

        public JsonResult GetCrops()
        {
            List<getCrops_Result> data = db.getCrops().ToList();
            return Json(new { data = data }, JsonRequestBehavior.AllowGet);
        }


        public JsonResult GetCropsData(string pv, string dv, string ds, string year, int crop)
        {
            List<getCropdata_Result> data = db.getCropdata(pv, dv, ds, year, crop).ToList();
            return Json(new { data = data }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public JsonResult GetCropsCard(int level, string area, string year, int crop)
        {
            try
            {
                List<getCards_Result> data = db.getCards(crop, year, level, area).ToList();
                return Json(new { data = data }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(null, JsonRequestBehavior.AllowGet);
            }
            
        }

        [HttpPost]
        public JsonResult GetSimpleCard(int level, string area, string year, int crop)
        {
            try
            {
                List<getSimpleCards_Result> data = db.getSimpleCards(crop, year, level, area).ToList();
                return Json(new { data = data }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(null, JsonRequestBehavior.AllowGet);
            }

        }

        [HttpPost]
        public JsonResult GetYearly(int level, string area, int crop)
        {
            try
            {
                List<getCropYearly_Result> data = db.getCropYearly(crop, level, area).ToList();
                return Json(new { data = data }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(null, JsonRequestBehavior.AllowGet);
            }

        }

        [HttpPost]
        public JsonResult GetMap(int level, string area, string year, int crop)
        {
            try
            {
                List<getCropMap_Result> data = db.getCropMap(crop, level, area,year).ToList();
                return Json(new { data = data }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(null, JsonRequestBehavior.AllowGet);
            }

        }

        [HttpPost]
        public JsonResult GetHierarchyWise(string year, int crop)
        {
            try
            {
                List<getCropHierarchyWise_Result> data = db.getCropHierarchyWise(crop, year).ToList();
                return Json(new { data = data }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(null, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult GetWorldMap(string country, string year, int crop)
        {
            try
            {
                List<WorldCropMap_Result> data = db.WorldCropMap(year,crop,country).ToList();
                return Json(new { data = data }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(null, JsonRequestBehavior.AllowGet);
            }

        }
    }

    public class CropCatalogEntry
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string CategoryKey { get; set; }
        public string Category { get; set; }
        public string Icon { get; set; }
    }

    public class CropObservation
    {
        public int CropId { get; set; }
        public string CropName { get; set; }
        public string FiscalYear { get; set; }
        public string DistrictId { get; set; }
        public string DistrictName { get; set; }
        public string DivisionId { get; set; }
        public string DivisionName { get; set; }
        public string ProvinceId { get; set; }
        public string ProvinceName { get; set; }
        public double? Area { get; set; }
        public double? Production { get; set; }
        public int SourceRows { get; set; }
        public int MissingRows { get; set; }
    }
}
