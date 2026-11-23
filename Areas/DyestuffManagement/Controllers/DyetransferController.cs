using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.OrderManagement;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.DyestuffManagement.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-05-27
    /// 描述：染化料调拨控制器
    /// </summary>
    [Area("DyestuffManagement")]
    public class DyetransferController : BaseController
    {
        public OrderService _service { get; set; }

        public PublicService _publicService
        {
            get;
            set
            {
                value.moduleEnCode = "Dyetransfer";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_wch_dyetransfer", keyword ?? "");
            return Content(data);
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_wch_dyetransfer_Id", keyValue);
            var list = await _publicService.GetList("wch_dyetransfer_list_Id", keyValue);
            var data = await _publicService.GetList("wch_dyetransfer_list_list_Id", keyValue);
            var result = new
            {
                form = form,
                list = list,
                data = data,
            };
            return Content(result.ToJson());
        }
        

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetMatstockFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_dye_matstock", keyValue);
            return Content(form.ToJson());
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
                    { "wch_dyetransfer", "F_Id" },
                    { "wch_dyetransfer_list","F_PrimaryId"},
                    { "wch_dyetransfer_list_list","F_PrimaryId"},
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
