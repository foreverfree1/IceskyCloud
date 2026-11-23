using IceskyCloud.Code;
using IceskyCloud.Domain.SystemSecurity;
using IceskyCloud.Service.SystemSecurity;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemSecurity.Controllers
{
    [Area("SystemSecurity")]
    public class ThirdAppLogController : BaseController
    {
        public ThirdAppLogService _service { get; set; }

        [HttpGet]
        [HandlerAuthorize]
        public ActionResult RemoveLog()
        {
            return View();
        }

        [IgnoreAntiforgeryToken]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetGridJson(SoulPage<ThirdAppLogEntity> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.order = "desc";
                pagination.field = "F_CreatorTime";
            }
            var data = await _service.GetLookList(pagination, keyword);
            return Content(pagination.setData(data).ToJson());
        }
        [HttpGet]
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitRemoveLog(string keepTime)
        {
            await _service.RemoveLog(keepTime);
            return Success("清空成功。");
        }
    }
}