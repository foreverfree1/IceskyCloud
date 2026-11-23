using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemOrganize;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.PurchasingManagement.Controllers
{
    [Area("PurchasingManagement")]
    public class PurchaseOrderController :BaseController
    {
        public OrganizeService _service { get; set; }

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "PurchaseOrder";
                field = value;
            }
        }
        //[HttpGet]
        //[HandlerAuthorize]
        //public override ActionResult Form()
        //{
        //    ViewBag.UserName = _publicService.currentuser.UserName;
        //    return View();
        //}
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_pro_procureorder", keyword ?? "");
            return Content(data);
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_pro_procureorder", keyword ?? "");
            return Content(data.ToJson());
        }
     

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListReviewedJson(string keyword)
        {
            var data = await _publicService.GetList("view_procureorder_status", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListReviewedDetailsJson(string keyword)
        {
            var data = await _publicService.GetList("view_procureorder_statuslist", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListDetailsByMatCodeJson(string F_PrimaryId,string F_MatCode)
        {
            var data = await _publicService.GetList("view_pro_procureorder_list_bymatecode",F_PrimaryId, F_MatCode);
            return Content(data.ToJson());
        }

        /// <summary>
        /// 获取物料最新单价
        /// </summary>
        /// <param name="matcode">物料编码</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetNewPriceJson(string matcode)
        {
            var data = await _publicService.GetList("view_procureorder_price", matcode ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("pro_procureorder_name", keyValue);
            var colorno = await _publicService.GetList("pro_procureorder_list", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                colornolist = colorno,

            };
            return Content(result.ToJson());
            ;
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson_name(string keyValue)
        {
            var form = await _publicService.GetList("pro_procureorder_name", keyValue);
            var colorno = await _publicService.GetList("pro_procureorder_list", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                colornolist = colorno,

            };
            return Content(result.ToJson());
            ;
        }
        #endregion


        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode)
        {
            try
            {
                JsonNode root = JsonNode.Parse(model)!;
                JsonArray list = root["pro_procureorder_list"]!.AsArray();

                foreach (JsonNode? item in list)
                {
                    if (item is JsonObject obj)
                    {
                        obj.Remove("F_GoodTotalQuantity");
                        obj.Remove("F_TotalReceiptQuantity");
                        obj.Remove("InQuantityStatus");
                        if (obj.TryGetPropertyValue("F_InTaxUnitPrice", out JsonNode? priceNode) &&
                       priceNode is JsonValue value &&
                       value.TryGetValue<string>(out string? priceStr) &&
                       string.IsNullOrEmpty(priceStr))
                        {
                            obj["F_InTaxUnitPrice"] = null;   // 设置为 JSON null
                        }
                    }
                    // 处理 F_InTaxUnitPrice：若值为 "" 则转为 null
                   
                }
                string newJson = root.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
                var Id = await _publicService.SubmitForm(newJson, enCode, keyValue);
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
                    { "pro_procureorder", "F_Id" },
                    { "pro_procureorder_list","F_PrimaryId"}
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
