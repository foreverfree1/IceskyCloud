using IceskyCloud.Code;
//using IceskyCloud.Domain.BaseManage;
using IceskyCloud.Service;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
//using IceskyCloud.Service.BaseManage;

namespace IceskyCloud.Web.Areas.BaseManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-13 14:21
    /// 描 述：物料基础管理控制器类
    /// </summary>
    [Area("BaseManage")]
    public class PieceWorkCraftController :  BaseController
    {     
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "PieceWorkCraft";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_pieceworkcraft", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetListDynamic("view_base_pieceworkcraft", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _publicService.GetForm("view_base_sal_pieceworkcraft_first", keyValue);
            return Content(data.ToJson());
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
                    { "base_pieceworkcraft", "F_Id" }
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
