using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.OrderManagement;
using Microsoft.AspNetCore.Mvc;

namespace IceskyCloud.Web.Areas.AttendanceManagement.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-05-07
    /// 描述：轮班规则控制器
    /// </summary>
    [Area("AttendanceManagement")]
    public class ShiftlistruleController : BaseController
    {
        public OrderService _service { get; set; }

        public PublicService _publicService
        {
            get;
            set
            {
                value.moduleEnCode = "Shiftlistrule";
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
            var data = await _publicService.GetLookListDynamic(
                pagination,
                "view_sche_shiftlistrule",
                keyword ?? ""
            );
            return Content(data);
        }

        /// <summary>
        /// 获取有效轮班规则
        /// </summary>
        /// <param name="keyword"></param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetUselessListJson(string keyword)
        {
            var data = await _publicService.GetList("sche_shiftlistrule_Useless", keyword ?? "");
            return Content(data.ToJson());
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_sche_shiftlistrule_Id", keyValue);
            var detail = await _publicService.GetList("sche_shiftlistrule_list_Id", keyValue);
            var result = new { form = form, list = detail };
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
                    { "sche_shiftlistrule", "F_Id" },
                    { "sche_shiftlistrule_list", "F_PrimaryId" },
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
