using IceskyCloud.Code;
using IceskyCloud.Service.SystemManage;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Linq;
using System.Text;
using System.Text.Unicode;

namespace IceskyCloud.Web.Controllers
{
    [Route("Module")]
    public class ModuleController : BaseController
    {
        public ModuleService _moduleService { get; set; }

        [IgnoreAntiforgeryToken]
        [HandlerLogin]
        [Route("{*path:regex(.*\\/Index$)}")]          // /PublicModule/*/Index
        public override ActionResult Index()
        {
            SetStoredCode(0, "IndexCode");
            return View();
        }

        [HttpGet]
        [HandlerAuthorize]
        [Route("{*path:regex(.*\\/Form$)}")]           // /PublicModule/*/Form
        public override ActionResult Form()
        {
            var formIndex = Request.Query["formIndex"].ToIntOrNull() ?? 1;
            SetStoredCode(formIndex, "FormCode");
            return View();
        }

        [HttpGet]
        [HandlerAuthorize]
        [Route("{*path:regex(.*\\/Details$)}")]        // /PublicModule/*/Details
        public override ActionResult Details()
        {
            var formIndex = Request.Query["formIndex"].ToIntOrNull() ?? 1;
            SetStoredCode(formIndex, "FormCode");
            return View();
        }

        void SetStoredCode(int formIndex, string viewKey)
        {
            var currentUrl = HttpContext.Request.Path.ToString();
            var urlParts = currentUrl.Replace("/Module/", "").Split('/', StringSplitOptions.RemoveEmptyEntries);
            var moduleEncode = string.Join("/", urlParts.Take(urlParts.Length - 1));
            var module = _moduleService.GetLookList().Result.FirstOrDefault(p => p.F_EnCode == moduleEncode);
            if (module == null || string.IsNullOrEmpty(module.F_FormCode)) return;
            JArray formCodeList = JArray.Parse(module.F_FormCode);
            var target = formCodeList.FirstOrDefault(t => t.Value<int?>("Index") == formIndex);
            if (target == null) return;
            var formCodeJson = Encoding.UTF8.GetString(Convert.FromBase64String(target["Code"].ParseToString()));
            ViewData[viewKey] = formCodeJson
                .Replace("\\r\\n", "\r\n")
                .Replace("\\r", "\r")
                .Replace("\\n", "\n")
                .Replace("\\t", "\t")
                .Replace("\\\"", "\"")
                .Replace("\\\\", "\\")
                .Trim('"', '/');
        }
    }
}
