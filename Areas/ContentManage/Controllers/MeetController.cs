using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.ContentManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2020-06-09 19:42
    /// 描 述：新闻类别控制器类
    /// </summary>
    [Area("ContentManage")]
    [AllowAnonymous]
    public class MeetController : BaseController
    {
        public PublicService _service
        {
            get; set
            {
                value.moduleEnCode = "Meet";
                field = value;
            }
        }
        #region 获取数据
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_StartTime";
                pagination.order = "desc";
            }
            var data = await _service.GetLookListDynamic(pagination, "Grid", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _service.GetLookList("Form", keyValue);
            //var detail = await _service.GetLookList("Detail", keyValue);
            return Content(form.ToJson());
        }
        #endregion 获取数据

        #region 提交数据

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string entity, string enCode, string keyValue)
        {
            try
            {
                entity = @"{""F_Title"":""123456"",""F_StartTime"":""2026-01-02""}";

                await _service.SubmitForm(entity, enCode, keyValue ?? "");
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
                var dic = new Dictionary<string, string>
                {
                    { "hr_meet", "F_Id" }
                };
                await _service.DeleteForm(dic, "Delete", keyValue);
                return await Success("操作成功。", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Delete);
            }
        }

        #endregion 提交数据
    }
}