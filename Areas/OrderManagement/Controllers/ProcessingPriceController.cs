using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.OrderManagement.Controllers
{
    [Area("OrderManagement")]
    public class ProcessingPriceController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "ProcessingPrice";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_ord_procespriceapproval", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ord_procespriceapproval_Id", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListByStatusJson(string status, string cuscode, string matcode, string keyword)
        {
            var data = await _publicService.GetList("view_ord_procespriceapproval_bystatus", status ?? "", cuscode ?? "", matcode ?? "", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetProcesIdJson(string keyword)
        {
            var data = await _publicService.GetForm("view_ord_procespriceapproval_Id", keyword);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFastnessListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ord_procespri_fastnesslist", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_ord_procespriceapproval_first", keyValue);
            var list = await _publicService.GetList("view_ord_procespriceapproval_list", keyValue);
            var date = await _publicService.GetList("view_ord_procespri_fastnesslist", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                list = list,
                date= date
            };
            return Content(result.ToJson());
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
                   { "ord_procespriceapproval", "F_Id" },
                   { "ord_procespriceapproval_list", "F_PrimaryId" },
                   {"ord_procespriceapproval_fast","F_PrimaryId" }

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
