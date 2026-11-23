

using IceskyCloud.Service.SystemOrganize;
using Microsoft.AspNetCore.Mvc;

namespace IceskyCloud.Web.Controllers
{
    public class HomeController : Controller
    {
        public SystemSetService _setService { get; set; }

        [HttpGet]
        [HandlerLogin]
        public ActionResult Index()
        {
            //主页信息获取
            if (_setService.currentuser.UserId == null)
            {
                return View();
            }
            var systemset = _setService.GetForm(_setService.currentuser.CompanyId).GetAwaiter().GetResult();
            ViewBag.ProjectName = systemset.F_ProjectName;
            ViewBag.LogoIcon = ".." + systemset.F_Logo;
            return View();
        }

        [HttpGet]
        [HandlerLogin]
        public ActionResult Default()
        {
            return View();
        }

        [HttpGet]
        [HandlerLogin]
        public ActionResult UserSetting()
        {
            return View();
        }

        [HttpGet]
        public ActionResult Error()
        {
            return View();
        }

        [HttpGet]
        [HandlerLogin]
        public ActionResult Message()
        {
            return View();
        }
    }
}