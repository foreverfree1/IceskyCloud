using IceskyCloud.Code;
//using IceskyCloud.Domain.BaseManage;
using IceskyCloud.Service;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Web.Areas.FileManage.Controllers;
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
    public class EquipmentLedgerController :  BaseController
    {     
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "EquipmentLedger";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_equipmentledger", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetListDynamic("view_base_equipmentledger", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormColorSchemeJson(string keyword)
        {
            var data = await _publicService.GetList("base_equipmentledger_ColorSchemeCode", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetBathRatioFormJson(string keyword,string EquipCode)
        {
            var data = await _publicService.GetList("base_equipbath_list_BathRatio", keyword ?? "", EquipCode ?? "");
            return Content(data.ToJson());
        }
 

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetRollUpListJson(string keyword)
        {
            var data = await _publicService.GetList("base_equipmentledger_RollUpMachine", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _publicService.GetForm("view_base_equipmentledger_first", keyValue);
            var list = await _publicService.GetList("base_equipbath_list", keyValue);
            var result = new
            {
                form = data,
                list = list,

            };
            return Content(result.ToJson());
        }

  
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetEquipmentListJson(string keyValue)
        {
            var form = await _publicService.GetList("view_base_equipmentledger_equipment", keyValue);
            return Content(form.ToJson());
        }

        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode, List<string> urlList)
        {
            try
            {
                var result = await new UploadfileController().Deletes(urlList);
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
                    { "base_equipmentledger", "F_Id" },
                    { "base_equipmentledger_list", "F_PrimaryId" }
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
