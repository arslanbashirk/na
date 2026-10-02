using NADashboard.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace NADashboard.Controllers
{
    public class GDPController : Controller
    {
        NationalAccountsEntities db = new NationalAccountsEntities();
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult QNA()
        {
            return View();
        }

        public JsonResult getGDP(int months, string currency, string price, string output, int year)
        {
            List<getGDP_Result> data = db.getGDP(months, currency,price,output,year).ToList();
            return Json(new { data = data }, JsonRequestBehavior.AllowGet);
        }

        public JsonResult getGDPbreakdown(int months, string currency, string price, string output, int year)
        {
            List<getGDPbreakdown_Result> data = db.getGDPbreakdown(months, currency, price, output, year).ToList();
            return Json(new { data = data }, JsonRequestBehavior.AllowGet);

        }
        public JsonResult getWorldYear(string c3)
        {
            List<getWorldYear_Result> data = db.getWorldYear(c3).ToList();
            return Json(new { data = data }, JsonRequestBehavior.AllowGet);
        }

        public JsonResult getWorldGDP(int year, string cc, string c3, string output)
        {
            List<getWorldGDP_Result> data = db.getWorldGDP(year, cc, c3, output).ToList();
            return Json(new { data = data }, JsonRequestBehavior.AllowGet);

        }


        public JsonResult getGrowth(int months, string currency, string price, int from, int to)
        {
            List<getGrowths_Result> data = db.getGrowths(months, currency, price, from, to).ToList();
            return Json(new { data = data }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult Global()
        {
            return View();
        }
    }
}