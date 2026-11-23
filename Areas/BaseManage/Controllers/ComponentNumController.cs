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
    /// 日期：2026-05-29
    /// 描述：成分编码控制器
    /// </summary>
    [Area("BaseManage")]
    public class ComponentNumController : BaseController
    {
        public OrderService _service { get; set; }

        public PublicService _publicService
        {
            get;
            set
            {
                value.moduleEnCode = "ComponentNum";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_componentnum", keyword ?? "");
            return Content(data);
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_base_componentnum_Id", keyValue);
            var result = new { form = form };
            return Content(result.ToJson());
        }

        #endregion

        #region 提交数据

        /// <summary>
        /// 提交数据
        /// </summary>
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(List<string> model, string deptid, string keyValue, string enCode)
        {
            try
            {
                if (!string.IsNullOrEmpty(keyValue))
                {
                    await DeleteForm(keyValue);
                }
                foreach (var item in model)
                {
                    await _publicService.SubmitForm(item, enCode);
                }
                //var Id = await _publicService.SubmitForm(model, enCode, keyValue);
                return await Success("操作成功", deptid, "");
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
                var list = await _publicService.GetList("view_base_componentnum_Id", keyValue);

                var dicts = new Dictionary<string, string>()
                    {
                        { "base_componentnum", "F_Id" },
                    };
                foreach (dynamic item in list)
                {
                    await _publicService.DeleteForm(dicts, "NF-delete", item.F_Id);
                }
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
