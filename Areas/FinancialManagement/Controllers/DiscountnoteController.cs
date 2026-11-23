using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.FinancialManagement.Controllers
{
    /// <summary>
    /// 创 建：lx
    /// 日 期：2026-05-21
    /// 描 述：销售折让单控制器类
    /// </summary>
    [Area("FinancialManagement")]
    public class DiscountnoteController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Discountnote";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_fina_discountnote", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_fina_discountnote", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_fina_discountnote_Id", keyValue);
            var detail = await _publicService.GetList("view_fina_discountnote_list_Id", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                list = detail
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
                string Id = await _publicService.SubmitForm(model, enCode, keyValue);
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
                    { "fina_discountnote", "F_Id" },
                    { "fina_discountnote_list", "F_PrimaryId" }
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
