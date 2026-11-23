using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemOrganize;
using iTextSharp.text.pdf;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.StockManage.Controllers
{
    /// <summary>
    /// 创建：
    /// 日期：2026-06-10
    /// 描述：其他出库控制器
    /// </summary>
    [Area("StockManage")]
    public class ReceptOutController : BaseController
    {
        public OrganizeService _service { get; set; }

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "ReceptOut";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_wch_receptout", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue = "")
        {
            var form = await _publicService.GetForm("view_wch_receptout_first", keyValue ?? "");
            var list = await _publicService.GetList("view_wch_receptout_list", keyValue ?? "");
            var list1 = await _publicService.GetList("view_wch_receptout_list_list", keyValue ?? "");
            var result = new
            {
                form = form,
                list = list,
                list1 = list1
            };
            return Content(result.ToJson());
        }
        #endregion

        #region  获取领料单明细数据
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLLJson(string keyValue)
        {
            var detail = await _publicService.GetList("wch_dyematrequest_list", keyValue);
            var result = new
            {
                ll_list = detail
            };
            return Content(result.ToJson());
        }
        #endregion


        #region  获取库存数据
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetKCListJson(string WarehouseTypeCode, string keyValue)
        {
            var detail = await _publicService.GetList("view_wch_receptout_kc", WarehouseTypeCode);
            var result = new
            {
                kc_list = detail
            };
            return Content(result.ToJson());//view_wch_receiptstockhand
        }
        #endregion

        #region  获取领料单明细数据
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetKCJson(string WarehouseTypeCode, string mateCode)
        {
            var detail = await _publicService.GetList("view_wch_receiptstockhand", WarehouseTypeCode ?? "", mateCode ?? "");
            var result = new
            {
                kc_list = detail
            };
            return Content(result.ToJson());//view_wch_receiptstockhand
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
                    {"wch_receptout", "F_Id" },
                    {"wch_receptout_list","F_PrimaryId" },
                    {"wch_receptout_list_list","F_PrimaryId" },
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
