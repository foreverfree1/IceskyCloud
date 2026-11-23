using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.OrderManagement;
using iTextSharp.text;
using Microsoft.AspNetCore.Mvc;
using NetTaste;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.OrderManagement.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-04-27
    /// 描述：工序刷卡控制器
    /// </summary>
    [Area("OrderManagement")]
    public class ProcessswipeController : BaseController
    {
        public OrderService _service { get; set; }

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Processswipe";
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
                pagination.order = "asc";
            }
            var data = await _publicService.GetLookListDynamic(pagination, "view_prod_processswipe", keyword ?? "");
            return Content(data);
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            object form = await _publicService.GetForm("view_prod_processswipe_Id", keyValue);
            // F_ParentId存储的流程卡号Id

            object list = null;
            if (form != null)
            {
                dynamic dynObj = form;
                var parentId = dynObj.F_ParentId;
                if (parentId != null && parentId != "")
                {
                    list = await _publicService.GetList("view_prod_processswipe_F_ParentId", parentId);
                }
            }
            var result = new
            {
                form = form,
                list = list
            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetProcessCodeFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_prod_processswipe_ProcessCode", keyValue);
            return Content(form.ToJson());
        }

        #endregion

        #region 提交数据

        /// <summary>
        /// 提交数据
        /// </summary>
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode,string delList)
        {
            try
            {
                _publicService.Db.Ado.BeginTran();
                if (delList != "")
                {
                    // 删除数据
                    JObject obj = JObject.Parse(delList.ToString());

                    // 提取 StandList 数组（JArray）
                    JArray delListArray = (JArray)obj["delList"];
                    var del = delListArray.ToObject<List<Dictionary<string, object>>>();
                    _publicService.Db.Deleteable<object>().AS("[prod_processswipe]").WhereColumns(del).ExecuteCommand();
                }
                var Id = await _publicService.SubmitForm(model, enCode, keyValue);
                _publicService.Db.Ado.CommitTran();
                return await Success("操作成功", Id, "");
            }
            catch (Exception ex)
            {
                _publicService.Db.Ado.RollbackTran();
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
                    { "prod_processswipe","F_Id"},
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
