using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemOrganize;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.AttendanceManagement.Controllers
{
    /// <summary>
    /// 创建：
    /// 日期：2026-05-11
    /// 描述：加班申请控制器
    /// </summary>
    [Area("AttendanceManagement")]
    public class WorkoverTime : BaseController
    {
        public OrganizeService _service { get; set; }

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "WorkoverTime";
                field = value;
            }
        }

        #region  获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_CreatorTime";
                pagination.order = "desc";
            }
            var data = await _publicService.GetLookListDynamic(pagination, "view_sche_workovertime", keyword ?? "");
            return Content(data);
        }



        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue = "")
        {
            var data = await _publicService.GetForm("sche_workovertime", keyValue ?? "");

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

        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        public async Task<ActionResult> DeleteForm(string keyValue)
        {
            try
            {
                var dicts = new Dictionary<string, string>()
                {
                    { "sche_workovertime", "F_Id" }
                };
                await _publicService.DeleteForm(dicts, "NF-delete", keyValue);
                return await Success("操作成功。", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Delete);
            }
        }
        #endregion
    }
}
