






using IceskyCloud.Code;
using IceskyCloud.Domain.SystemSecurity;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemSecurity.Controllers
{
    [Area("SystemSecurity")]
    public class LogController : BaseController
    {
        [HttpGet]
        [HandlerAuthorize]
        public ActionResult RemoveLog()
        {
            return View();
        }

        [IgnoreAntiforgeryToken]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetGridJson(SoulPage<LogEntity> pagination, string keyword, int timetype = 2)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.order = "desc";
                pagination.field = "F_CreatorTime";
            }
            //导出全部页使用
            if (pagination.rows == 0 && pagination.page == 0)
            {
                pagination.rows = 99999999;
                pagination.page = 1;
            }
            var data = await _logService.GetList(pagination, timetype, keyword);
            return Content(pagination.setData(data).ToJson());
        }

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitRemoveLog(string keepTime)
        {
            await _logService.RemoveLog(keepTime);
            return Success("清空成功。");
        }
    }
}