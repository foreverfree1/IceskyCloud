using IceskyCloud.Code;
//using IceskyCloud.Domain.ProductionManage;
using IceskyCloud.Service;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
//using IceskyCloud.Service.ProductionManage;

namespace IceskyCloud.Web.Areas.ProductionManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-16 16:34
    /// 描 述：生产信息控制器类
    /// </summary>
    [Area("BaseManage")]
    public class ProcessmaintenanceController :  BaseController
    {

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Processmaintenance";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_processmaintenance", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string processcategory)
        {
            string where = "";
            if (!string.IsNullOrEmpty(processcategory))
            {
                where = string.Format(" and F_ProcessCategory='{0}'", processcategory);
            }
            var data = await _publicService.GetListDynamic("view_base_processmaintenance", where);
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetProcessNameFormJson(string keyValue)
        {
            var data = await _publicService.GetForm("base_processmaintenance_ProcessName", keyValue);
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _publicService.GetFormDynamic("view_base_processmaintenance_first", keyValue);
            return Content((data as object).ParseToString());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson_name(string keyValue)
        {
            var data = await _publicService.GetList("base_processmaintenance_name", keyValue);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> CheckProcessName(string keyValue,string F_ProcessName)
        {            
            // keyValue 可能为 null（URL 未带该参数）或 ""（前端 keyValue??'' 传入），统一为空字符串
            keyValue = keyValue ?? "";            
            var data = await _publicService.GetList("checkProcessName", keyValue, F_ProcessName);
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSwipeCarStartListJson()
        {
            var data = await _publicService.GetList("view_base_processmaintenance_SwipeCarStart");
            return Content(data.ToJson());
        }
        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode)
        {
            try
            {
                var Id = await _publicService.SubmitForm(model, enCode, keyValue);
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
                    { "base_processmaintenance", "F_Id" }
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
