using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using iTextSharp.text.pdf;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.StockManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-12 08:50
    /// 描 述：客户信息控制器类
    /// </summary>
    [Area("StockManage")]
    public class MatCheckNoteController :  BaseController
    {

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "MatCheckNote";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_wch_matchecknote", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_wch_matchecknote", keyword ?? "");
            return Content(data.ToJson());
        }

        /// <summary>
        /// 获取物料库存信息
        /// </summary>
        /// <param name="supCode">供应商编码</param>
        /// <param name="cusCode">客户编码</param>
        /// <param name="storageLocaCode">库位Code</param>
        /// <param name="warehouseLocaCode">仓位Code</param>
        /// <param name="shelfNoCode">架子号</param>
        /// <param name="matCode">物料编码</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetMaterialStockListJson(string cusCode, string storageLocaCode, string warehouseLocaCode, string shelfNoCode, string matCode)
        {
            var data = await _publicService.GetList("view_wch_allstockhand", cusCode ?? "", storageLocaCode ?? "", warehouseLocaCode ?? "", shelfNoCode ?? "", matCode ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _publicService.GetForm("view_wch_matchecknote_first", keyValue);
            var list = await _publicService.GetList("wch_matchecknote_list", keyValue);
            var result = new
            {
                form = data,
                list = list
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
                    { "wch_matchecknote", "F_Id" },
                    { "wch_matchecknote_list", "F_PrimaryId" }
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
