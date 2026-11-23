using Autofac.Core;
using IceskyCloud.Code;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Service.SystemManage;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-07-23
    /// 描 述：搜索方案控制器类
    /// </summary>
    [Area("SystemManage")]
    public class ModulePlanController : BaseController
    {
        public ModulePlanService _servicePlan { get; set; }
        public ModuleService _serviceModule { get; set; }
        public ModuleFieldsService _serviceFields { get; set; }

        #region 获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<ModulePlanEntity> pagination, string keyword, string moduleId)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_CreatorTime";
                pagination.order = "desc";
            }
            var data = await _servicePlan.GetLookList(pagination, keyword, moduleId);
            return Content(pagination.setData(data).ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyValue, string url)
        {
            ModuleEntity module;
            if (url.StartsWith("/Module"))
            {
                var moduleEncode = url.Replace("/Module/", "").Replace("/Index", "");
                module = (await _serviceModule.GetLookList()).FirstOrDefault(p => p.F_EnCode == moduleEncode);
            }
            else
            {
                var modulefields = (await _serviceFields.GetLookList("", url)).FirstOrDefault();
                module = await _serviceModule.GetForm(modulefields?.F_ModuleId);
            }
            string mainTable = "";
            if (module != null)
            {
                if (!string.IsNullOrEmpty(module.F_MainView))
                    mainTable = module.F_MainView;
                else
                    mainTable = module.F_MainTable;
            }
            //模块Index里的所有配置字段
            var fieldsList = await _serviceFields.GetLookList(mainTable);

            var planList = await _servicePlan.GetLookList(keyValue);
            planList = planList.Where(p => p.F_ModuleId == module?.F_Id).ToList();
            planList.ForEach(p =>
            {
                var planfieldsList = new List<ModuleFieldsEntity>();
                var paramlist = JArray.Parse(p.F_PlanParam).Cast<JObject>().OrderBy(x => x["sortcode"]?.ParseToInt(0) ?? 0).ToList();
                paramlist.ForEach(x =>
                {
                    var fieldEntity = fieldsList.FirstOrDefault(y => y.F_EnCode == x["fieldvalue"].ParseToString());
                    if (fieldEntity != null)
                    {
                        var template = JObject.Parse(fieldEntity.F_Template);
                        template["islistaddverify"] = x["isverify"].ParseToInt(0) == 1 ? true : false;
                        template["isstandard"] = x["isstandard"].ParseToInt(0) == 1 ? true : false;
                        template["default"] = x["defaultvalue"].ParseToString();
                        fieldEntity.F_Template = template.ToJson();
                        planfieldsList.Add(fieldEntity);
                    }
                });
                p.F_PlanParam = planfieldsList.ToJson();
            });
            return Content(planList.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _servicePlan.GetLookForm(keyValue);
            return Content(data.ToJson());
        }
        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(ModulePlanEntity entity, string keyValue)
        {
            try
            {
                await _servicePlan.SubmitForm(entity, keyValue);
                return await Success("操作成功。", "", "", keyValue);
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
                await _servicePlan.DeleteForm(keyValue);
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
