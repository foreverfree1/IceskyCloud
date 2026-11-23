using IceskyCloud.Code;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Domain.SystemSecurity;
using IceskyCloud.Service.SystemSecurity;
using IceskyCloud.Web.Areas.FileManage.Controllers;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemSecurity.Controllers
{
    [Area("SystemSecurity")]
    public class ApiLogController : BaseController
    {
        public ApiLogService _service { get; set; }

        [HttpGet]
        [HandlerAuthorize]
        public ActionResult RemoveLog()
        {
            return View();
        }

        [IgnoreAntiforgeryToken]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetGridJson(SoulPage<ApiLogEntity> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.order = "desc";
                pagination.field = "F_CreatorTime";
            }
            var data = await _service.GetLookList(pagination, keyword);
            return Content(pagination.setData(data).ToJson());
        }

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(ApiLogEntity entity)
        {
            try
            {
                await _service.SubmitForm(entity);
                return await Success("操作成功。", "", "");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "");
            }
        }

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitRemoveLog(string keepTime)
        {
            await _service.RemoveLog(keepTime);
            return Success("清空成功。");
        }
    }
}