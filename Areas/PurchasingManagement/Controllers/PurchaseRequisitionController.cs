using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemOrganize;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using RabbitMQ.Client;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace IceskyCloud.Web.Areas.PurchasingManagement.Controllers
{
    [Area("PurchasingManagement")]
    public class PurchaseRequisitionController : BaseController
    {
        public OrganizeService _service { get; set; }
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "PurchaseRequisition";
                field = value;
            }
        }

        //[HttpGet]
        //[HandlerAuthorize]
        //public override ActionResult Form()
        //{
        //    ViewBag.UserName = _publicService.currentuser.UserName;
        //  
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_pro_requisition", keyword ?? "");
            return Content(data);
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_pro_requisition", keyword ?? "");
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListStatusJson(string keyword)
        {
            var data = await _publicService.GetList("view_F_Status", keyword ?? "");
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetLookList("pro_requisition", keyValue);
            var model = JObject.Parse((form.FirstOrDefault() as object).ToJson());
            var data = await _service.GetLookForm(model["F_DeptId"].ParseToString());
            model["F_DeptName"] = data.F_FullName;
            var colorno = await _publicService.GetList("pro_requisition_list", model["F_Id"].ParseToString());
            var result = new
            {
                form = model,
                colornolist = colorno,
          
            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson_name(string keyValue)
        {
            var form = await _publicService.GetList("pro_requisition", keyValue);
            var model = JObject.Parse(form.FirstOrDefault().ToJson());
            var data = await _service.GetLookForm(model["F_DeptId"].ParseToString());
            model["F_DeptName"] = data.F_FullName;
            var colorno = await _publicService.GetList("pro_requisition_list", model["F_Id"].ParseToString());
            var result = new
            {
                form = model,
                colornolist = colorno,

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

                JsonNode root = JsonNode.Parse(model)!;
                JsonArray list = root["pro_requisition_list"]!.AsArray();

                foreach (JsonNode? item in list)
                {
                    if (item is JsonObject obj)
                    {
                        obj.Remove("F_MatCodeName");
                        obj.Remove("F_MaterialName");
                        obj.Remove("F_Model");
                        obj.Remove("F_Unit");
                    }
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
                    { "pro_requisition", "F_Id" },
                    {"pro_requisition_list","F_PrimaryId"}
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
