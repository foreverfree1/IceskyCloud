using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Web.Areas.FileManage.Controllers;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SampleProofManage.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-04-20
    /// 描述：复样任务管理控制器
    /// </summary>
    [Area("SampleProofManage")]
    public class DuplicateSampleTaskController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "DuplicateSampleTask";
                field = value;
            }
        }


        #region 获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_CreatorTime";
                pagination.order = "desc";
            }                
            var data = await _publicService.GetLookListDynamic(pagination, "view_sap_duplicatesample", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_sap_duplicatesample", keyword);
            return Content(data.ToJson());
        }
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetTaskStatusListJson(string keyword)
        {
            var data = await _publicService.GetList("view_sap_duplicatesamplestate", keyword);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _publicService.GetForm("view_sap_duplicatesampleId", keyValue);
            return Content(data.ToJson());
        }

        #endregion


        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string encode)
        {
            try
            {
                var Id = await _publicService.SubmitForm(model, encode, keyValue);
                return await Success("操作成功。", Id, "");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue);
            }
        }
        #endregion

    }
}
