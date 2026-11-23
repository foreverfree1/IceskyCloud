using Autofac.Core;
using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.BaseManage.Controllers
{
    /// <summary>
    /// 创 建：
    /// 日 期：2026-05-15 
    /// 描 述：超成本计算控制器类
    /// </summary>
    [Area("BaseManage")]
    public class OvercostController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Overcost";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_overcost", keyword ?? "");
            return Content(data);
        }

        //检查染色成分是否已经存在
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> CheckComponent(string keyValue,string F_ComponentCode)
        {            
            keyValue = keyValue ?? "";            
            var data = await _publicService.GetList("check_component", keyValue, F_ComponentCode);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue = "")
        {
            var form = await _publicService.GetList("base_overcost", keyValue);
            var detail = await _publicService.GetList("base_overcost_list", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                list = detail
            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetStandardPriceFormJson(string keyValue = "")
        {
            var form = await _publicService.GetForm("base_overcost_StandardPrice", keyValue);

            return Content(form.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetOverPriceFormJson(string keyValue = "", string OverPrice = "")
        {
            var form = await _publicService.GetForm("base_overcost_OverPrice", keyValue, OverPrice);

            //return Content(form.ToJson());
            return Content((form ?? new object()).ToJson());
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
                    { "base_overcost", "F_Id" }
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
