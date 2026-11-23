using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.AdminManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-12 08:50
    /// 描 述：月度水电录入控制器类
    /// </summary>
    [Area("AdminManage")]
    public class EwFeeController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "EwFee";
                field = value;
            }
        }

        #region 获取数据

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_adm_ewfee", keyword ?? "");
            return Content(data.ToJson());
        }

        /// <summary>
        /// 获取员工的上次水电费读数
        /// </summary>
        /// <param name="houseCode">楼栋号</param>
        /// <param name="roomCode">房间号</param>
        /// <param name="employeeCode">员工工号</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLastElecNumListJson(string houseCode, string roomCode,string employeeCode)
        {
            var data = await _publicService.GetList("view_adm_ewfee_top", houseCode ?? "", roomCode ?? "", employeeCode ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _publicService.GetFormDynamic("view_adm_ewfee_first", keyValue);
            return Content((data as object).ParseToString());
        }
        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(List<string> model, string keyValue, string enCode)
        {
            try
            {
                var Id = "";
                foreach (var item in model)
                {
                    Id = await _publicService.SubmitForm(item, enCode, keyValue);
                }
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
                    { "adm_ewfee", "F_Id" }
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
