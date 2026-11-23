using Autofac.Core;
using IceskyCloud.Code;
//using IceskyCloud.Domain.BaseManage;
using IceskyCloud.Service;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Web.Areas.FileManage.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
//using IceskyCloud.Service.BaseManage;

namespace IceskyCloud.Web.Areas.FinancialManagement.Controllers
{
    /// <summary>
    /// 创 建：lx
    /// 日 期：2026-05-18
    /// 描 述：收款单控制器类
    /// </summary>
    [Area("FinancialManagement")]
    public class PaymentReceiptController :  BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "PaymentReceipt";
                field = value;
            }
        }


        //[HttpGet]
        //[HandlerAuthorize]
        //public override ActionResult Form()
        //{
        //    ViewBag.UserId = _publicService.currentuser.UserId;
        //    ViewBag.UserName = _publicService.currentuser.UserName;
        //    ViewBag.UserCode = _publicService.currentuser.UserCode;
        //    ViewBag.RoleId = _publicService.currentuser.RoleId;
        //    return View();
        //}

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
            var data = await _publicService.GetLookListDynamic(pagination, "view_fina_paymentreceipt", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_fina_paymentreceipt", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_fina_paymentreceipt_Id", keyValue);
            var detail = await _publicService.GetList("fina_paymentreceipt_list_Id", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                list = detail
            };
            return Content(result.ToJson());
        }

        #endregion

        #region 提交数据

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode)
        {
            try
            {
                string Id = await _publicService.SubmitForm(model, enCode, keyValue);
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
                    { "fina_paymentreceipt", "F_Id" },
                    { "fina_paymentreceipt_list", "F_PrimaryId" }
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
