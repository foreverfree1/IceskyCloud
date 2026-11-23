using Autofac.Core;
using IceskyCloud.Code;
//using IceskyCloud.Domain.BaseManage;
using IceskyCloud.Service;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Web.Areas.FileManage.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
//using IceskyCloud.Service.BaseManage;

namespace IceskyCloud.Web.Areas.BaseManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-12 13:56
    /// 描 述：供应商信息控制器类
    /// </summary>
    [Area("BaseManage")]
    public class SupplierController :  BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Supplier";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_supplier", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_base_supplier", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSpotColorListJson(string param)
        {
            JObject paramobj;
            try { paramobj = JObject.Parse(param); }
            catch { paramobj = new JObject(); }
            var paraList = paramobj.Properties();
            var data = await _publicService.GetList("view_base_supplier_spotcolor", paraList?.FirstOrDefault().Value?.ToString() ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_supplier_first", keyValue);
            var detail = await _publicService.GetList("base_supplier_list", keyValue);
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
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode, List<string> urlList)
        {
            try
            {
                var result = await new UploadfileController().Deletes(urlList);
                var Id = string.Empty;
                Id = await _publicService.SubmitForm(model, enCode, keyValue);
                //if (result)
                //{
                //    Id = await _publicService.SubmitForm(model, encode, keyValue);
                //}
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
                    { "base_supplier", "F_Id" },
                    { "base_supplier_list", "F_PrimaryId" }
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
