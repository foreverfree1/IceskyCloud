using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using iTextSharp.text;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.OrderManagement.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-01-14
    /// 描述：开卡任务管理控制器
    /// </summary>
    [Area("OrderManagement")]
    public class CardopenmanagementController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Cardopenmanagement";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_ord_cardactivation", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ord_cardactivation", keyword ?? "");
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLockListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ord_cardactivation_locklist", keyword ?? "");
            return Content(data.ToJson());
        }

        

        /// <summary>
        /// 根据点色单ID查询数据
        /// </summary>
        /// <param name="keyValue"></param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetIdFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("ord_cardactivation_SpotColorId", keyValue);
            if (form == null)
            {
                var result = new
                {
                    form = form,
                };
                return Content(result.ToJson());
            }
            else 
            {
                var formModel = JObject.Parse(form.ToJson());
                var list = await _publicService.GetList("ord_cardactivation_list", formModel["F_Id"].ParseToString());
                var result = new
                {
                    form = form,
                    list = list,
                };
                return Content(result.ToJson());
            }
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_ord_cardactivation_id", keyValue);
            var list = await _publicService.GetList("view_ord_cardactivation_list", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                list = list,
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
                   { "ord_cardactivation", "F_Id" },
                   { "ord_cardactivation_list", "F_PrimaryId" }
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
