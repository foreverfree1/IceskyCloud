using Autofac.Core;
using IceskyCloud.Code;
using IceskyCloud.Domain.SystemManage;

//using IceskyCloud.Domain.BaseManage;
using IceskyCloud.Service;
//using IceskyCloud.Service.BaseManage;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemManage;
using IceskyCloud.Service.SystemOrganize;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Reflection.Metadata;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.BaseManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-12 08:50
    /// 描 述：物料类别控制器类
    /// </summary>
    [Area("BaseManage")]
    public class ProcessCraftController :  BaseController
    {

        public UserService _service { get; set; }
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "ProcessCraft";
                field = value;
            }
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetTreeSelectJson()
        {
            var data = await _publicService.GetListDynamic("view_base_processcraft", " and F_Layers = 1");
            JArray datalist = JArray.Parse(data);
            var treeList = new List<TreeSelectModel>();
            foreach (var item in datalist)
            {
                TreeSelectModel treeModel = new TreeSelectModel();
                treeModel.id = item["F_Id"].ParseToString();
                treeModel.text = item["F_FullName"].ParseToString();
                treeModel.parentId = item["F_ParentId"].ParseToString();
                treeList.Add(treeModel);
            }
            return Content(treeList.TreeSelectJson());
        }

        #region 获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string keyValue, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_SortCode";
                pagination.order = "asc";
            }
            var alldata = await _publicService.GetListDynamic("view_base_processcraft", "");
            string where = string.Format(" and F_ParentId = '{0}'", keyValue);
            var data = await _publicService.GetListDynamic("view_base_processcraft", where);
            JArray alllist = JArray.Parse(alldata);
            JArray list = JArray.Parse(data);
            foreach (var item in list)
            {
                var userinfo = await _service.GetLookForm(item["F_CreatorUserId"].ParseToString());
                item["F_CreateUserName"] = userinfo.F_RealName;
                item["haveChild"] = alllist.Where(p => p["F_ParentId"].ParseToString() == item["F_Id"].ParseToString()).Any() ? true : false;
            }
            return Content(list.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string ParentId = "0")
        {
            string where = string.Format(" and F_ParentId = '{0}'", ParentId);
            var data = await _publicService.GetListDynamic("view_base_processcraft", where);
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _publicService.GetFormDynamic("base_processcraft", keyValue);
            return Content((data as object).ToJson());
        }
        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode)
        {
            try
            {
                JObject childmodel = JObject.Parse(model);
                if (childmodel["F_ParentId"].ParseToString() == "0")
                {
                    childmodel["F_Layers"] = 1;
                }
                else
                {
                    var parentmodel = await GetFormJson(childmodel["F_ParentId"].ParseToString());
                    if (parentmodel != null)
                    {
                        var Layers = JObject.Parse(JObject.Parse(JObject.Parse(parentmodel.ToJson())?["Content"].ParseToString())?["form"].ParseToString())?["F_Layers"];
                        childmodel["F_Layers"] = Layers.ParseToInt() + 1;
                    }
                }
                model = childmodel.ToJson();
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
                    { "base_processcraft", "F_Id" }
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
