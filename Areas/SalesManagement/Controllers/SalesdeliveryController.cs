using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.OrderManagement;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SalesManage.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-05-12
    /// 描述：销售订单控制器
    /// </summary>
    /// 
    [Area("SalesManagement")]
    public class SalesdeliveryController : BaseController
    {
        public OrderService _service { get; set; }

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Salesdelivery";
                field = value;
            }
        }

        #region 获取数据

        /// <summary>
        /// 分页获取数据
        /// </summary>
        /// <param name="pagination"></param>
        /// <param name="keyword"></param>
        /// <returns></returns>
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_CreatorTime";
                pagination.order = "desc";
            }
            var data = await _publicService.GetLookListDynamic(pagination, "view_sale_salesdelivery", keyword ?? "");
            return Content(data);
        }
        /// <summary>
        /// 获取已审核和未出库或者部分出库数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson()
        {
            var form = await _publicService.GetList("view_sale_salesdelivery_Status");
            return Content(form.ToJson());
        }

        /// <summary>
        /// 获取id和未出库数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetDeliverListJson(string param, string keyValue = "")
        {
            JObject paramobj;
            try { paramobj = JObject.Parse(param); }
            catch { paramobj = new JObject(); }
            var paraList = paramobj.Properties();
            var form = await _publicService.GetList("view_sale_salesdelivery_list_IsDeliver", keyValue ?? "", paraList?.FirstOrDefault().Value?.ToString() ?? "");
            return Content(form.ToJson());
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_sale_salesdelivery_Id", keyValue);
            var detail = await _publicService.GetList("view_sale_salesdelivery_list", keyValue);
            var result = new
            {
                form = form,
                list = detail
            };
            return Content(result.ToJson());
        }

        #endregion

        #region 提交数据

        /// <summary>
        /// 提交数据
        /// </summary>
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode)
        {
            try
            {
                var Id = await _publicService.SubmitForm(model, enCode, keyValue);
                return await Success("操作成功", Id, "");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue);
            }
        }

        /// <summary>
        /// 删除数据
        /// </summary>
        /// <param name="keyValue"></param>
        /// <returns></returns>
        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        public async Task<ActionResult> DeleteForm(string keyValue)
        {
            try
            {
                var dicts = new Dictionary<string, string>()
                {
                    { "sale_salesdelivery","F_Id"},
                    { "sale_salesdelivery_list","F_PrimaryId"}
                };
                await _publicService.DeleteForm(dicts, "NF-delete", keyValue);
                return await Success("操作成功", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message,"", keyValue, DbLogType.Delete);
            }
        }


        #endregion
    }
}
