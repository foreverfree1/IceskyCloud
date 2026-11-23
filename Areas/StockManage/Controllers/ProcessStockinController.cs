using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using SqlSugar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.StockManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-17 15:00
    /// 描 述：来样登记控制器类
    /// </summary>
    [Area("StockManage")]
    public class ProcessStockinController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "ProcessStockin";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_wch_processstockin", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_wch_processstockin", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetBatchNoJson(string keyword)
        {
            var data = await _publicService.GetList("view_base_equip_stockin_combined_BatchNo", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetCusOrderListJson(string CusCode,string MatCode)
        {
            var data = await _publicService.GetList("view_wch_cusordercode", CusCode ?? "", MatCode ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetBeforeOrderListJson(string cusCode, string cusOrderCode)
        {
            var data = await _publicService.GetList("view_wch_processstockin_before", cusCode ?? "", cusOrderCode ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetStockHandListJson(string keyword,string colorscheme, string cuscode,string matcode,string receipttype)
        {
            var data = await _publicService.GetList("view_wch_stockhand_first", keyword ?? "", colorscheme ?? "", cuscode ?? "", matcode ?? "", receipttype ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetComplaintListJson(string keyword)
        {
            var data = await _publicService.GetList("wch_processstockin_list_complaint", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> AutoBatchNo(int index)
        {
            string header = DateTime.Now.ToString("yyyyMMdd");
            var result = await _publicService.GetStoredProcedureList("proc_GetNextBatchNo", header ?? "");
            var F_BatchNo = result.Select(p => p.F_BatchNo).FirstOrDefault();
            string autoNumber = header + F_BatchNo.ToString().PadLeft(3, '0');
            return Content((autoNumber.ToDecimal() + index).ToString());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_wch_processstockin_first", keyValue);
            var detail = await _publicService.GetList("view_wch_processstockin_list", keyValue);
            var shelflist = await _publicService.GetList("view_wch_processstockin_list_list", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                list = detail,
                shelflist = shelflist
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
                    { "wch_processstockin", "F_Id" },
                    { "wch_processstockin_list", "F_PrimaryId" },
                    { "wch_processstockin_list_list", "F_PrimaryId" },
                    { "sap_register_com", "F_PrimaryId" }
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
