using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.OrderManagement;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.BaseManage.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-07-20
    /// 描述：染缸中控参数
    /// </summary>
    [Area("BaseManage")]
    public class DyeParameteController : BaseController
    {
        public OrderService _service { get; set; }

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "DyeParamete";
                field = value;
            }
        }
        #region 获取数据

        /// <summary>
        /// index主页获取数据
        /// </summary>
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_dyeparamete", keyword ?? "");
            return Content(data);
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetFormDynamic("view_base_dyeparamete_Id", keyValue);
            var productformula_list = await _publicService.GetListDynamic("base_dyeparamete_list_Id", keyValue);
            var result = new
            {
                form = form,
                list = productformula_list,
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
        /// 删除
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
                    { "base_dyeparamete","F_Id"},
                    { "base_dyeparamete_list","F_PrimaryId"},
                };
                await _publicService.DeleteForm(dicts, "NF-delete", keyValue);
                return await Success("操作成功", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Delete);
            }
        }

        #endregion
    }
}
