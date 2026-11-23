






using IceskyCloud.Code;
using IceskyCloud.Domain.SystemSecurity;
using IceskyCloud.Service.SystemSecurity;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemSecurity.Controllers
{
    [Area("SystemSecurity")]
    public class FilterIPController : BaseController
    {
        public FilterIPService _service { get; set; }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetGridJson(string keyword)
        {
            var data = await _service.GetLookList(keyword);
            return Success(data.Count, data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _service.GetLookForm(keyValue);
            return Content(data.ToJson());
        }

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(FilterIPEntity filterIPEntity, string keyValue)
        {
            try
            {
                if (string.IsNullOrEmpty(keyValue))
                {
                    filterIPEntity.F_DeleteMark = false;
                }
                await _service.SubmitForm(filterIPEntity, keyValue);
                return await Success("操作成功。", "", "", keyValue);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue);
            }
        }

        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        public async Task<ActionResult> DeleteForm(string keyValue)
        {
            try
            {
                await _service.DeleteForm(keyValue);
                return await Success("操作成功。", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Delete);
            }
        }
    }
}