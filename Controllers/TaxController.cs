using NADashboard.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace NADashboard.Controllers
{
    public class TaxController : Controller
    {
        NationalAccountsEntities db = new NationalAccountsEntities();

        public ActionResult Index()
        {
            return View();
        }
        public JsonResult getTax(int year, string sector, string subsector, string title)
        {
            List<getTaxes_Result> data = db.getTaxes(year, sector, subsector,title).ToList();
            return Json(new { data = data }, JsonRequestBehavior.AllowGet);
        }

    }
}