using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using iTextSharp.text;
using Microsoft.AspNetCore.Mvc;
using SqlSugar;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.OrderManagement.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-01-14
    /// 描述：开卡管理控制器
    /// </summary>
    [Area("OrderManagement")]
    public class ActivateCardController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "ActivateCard";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_prod_processcard", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLikeListJson(string keyword)
        {
            var data = await _publicService.GetList("view_prod_processcard_like", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_prod_processcard_ProcessCode", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListNoJson(string spotColor, string colorNo)
        {
            var data = await _publicService.GetList("view_base_equip_list_No", spotColor, colorNo);
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListIdJson(string keyValue)
        {
            var data = await _publicService.GetList("view_base_equip_stockin_combined", keyValue);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormIdJson(string keyword)
        {
            var data = await _publicService.GetForm("prod_processcard", keyword);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLatestJson(string keyValue)
        {
            // 从原本的view_prod_latestprocesscard改为 view_prod_latestprocesscard_color
            var data = await _publicService.GetForm("view_prod_latestprocesscard_color", keyValue);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetPrintDataJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_prod_processcard_print", keyValue);
            var list = await _publicService.GetList("view_prod_processcard_list_print", keyValue);
            var flowstep_print = await _publicService.GetList("view_prod_processcard_flowstep_print", keyValue);
            var result = new
            {
                form,
                list,
                flowstep_print
            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {

            var form = await _publicService.GetForm("view_prod_processcard_print", keyValue);
            var list = await _publicService.GetList("view_prod_processcard_list_print", keyValue);
            var flowstep_print = await _publicService.GetList("view_prod_processcard_flowstep_print", keyValue);
            var result = new
            {
                form,
                list,
                flowstep_print
            };
            return Content(result.ToJson());


            //var form = await _publicService.GetForm("view_prod_processcard_first", keyValue);
            //var list = await _publicService.GetList("view_base_equip_stockin_combined", keyValue);
            //var printlist = await _publicService.GetList("view_print_equip_list", " and F_Id='" + keyValue + "'");
            //var printshelfno = await _publicService.GetList("view_print_shelfno", keyValue);
            //var printflowstep = await _publicService.GetList("view_print_flowstep", keyValue);
            ////var result = new
            //{
            //    form,
            //    list
            //    //printlist,
            //    //printshelfno,
            //    //printflowstep
            //};

            //return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetProcessCodeFormJson(string keyValue)
        {
            var list = await _publicService.GetList("view_forpdt_productformula", keyValue);
            return Content(list.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetProcesscardFormJson(string keyValue)
        {
            var list = await _publicService.GetList("view_prod_processcard_Code", keyValue);
            return Content(list.ToJson());
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
        public async Task<ActionResult> UpdatePrintStatus(string keyValue)
        {
            try
            {
                var form = await _publicService.GetForm("view_prod_processcard_first", keyValue);
                List<SugarParameter> parameters = new List<SugarParameter>();
                parameters.Add(new SugarParameter("Id", keyValue));
                parameters.Add(new SugarParameter("entity", form.ToJson()));
                parameters.Add(new SugarParameter("state", null) { Direction = System.Data.ParameterDirection.Output });
                parameters.Add(new SugarParameter("message", null) { Direction = System.Data.ParameterDirection.Output });
                await _publicService.GetStoredProcedureList("usp_Createprocessswipe", parameters);
                var result = await _publicService.GetStoredProcedureList("usp_CreateDuplicatesample", parameters);
                var data = (result[0] as object).ToJson().ToJObject();
                if (data["state"].ParseToInt() == 3)
                    throw new Exception(data["message"].ParseToString());
                return await Success("操作成功。", keyValue, "");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue);
            }

        }
        #endregion
    }
}
