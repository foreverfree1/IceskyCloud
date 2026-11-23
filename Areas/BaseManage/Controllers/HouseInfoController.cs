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
    /// 日期：2026-07-09
    /// 描述：宿舍档案控制器
    /// </summary>
    [Area("BaseManage")]
    public class HouseInfoController : BaseController
    {
        public OrderService _service { get; set; }

        public PublicService _publicService
        {
            get;
            set
            {
                value.moduleEnCode = "HouseInfo";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_houseinfo", keyword ?? "");
            return Content(data);
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_base_houseinfo_Id", keyValue);
            var list = await _publicService.GetList("view_base_houseinfo_list_Id", keyValue);
            var result = new {
                form = form,
                list = list
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
                    { "base_houseinfo","F_Id"},
                    { "base_houseinfo_list","F_PrimaryId"},
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
