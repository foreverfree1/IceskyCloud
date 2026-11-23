using IceskyCloud.Code;
using IceskyCloud.Domain.Entity.Infrastructure;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Service;
using IceskyCloud.Service.FlowManage;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemManage;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using NUglify.Helpers;
using SqlSugar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2020-05-21 14:38
    /// 描 述：字段管理控制器类
    /// </summary>
    [Area("SystemManage")]
    public class ModuleFieldsController : BaseController
    {
        public ModuleFieldsService _service { get; set; }
        public ModuleService _moduleService { get; set; }
        public ModuleDataService _dataservice { get; set; }
        public DatabaseTableService _dbService { get; set; }
        public FlowschemeService _flowService { get; set; }

        public PublicService _publicService { get; set; }
        [HttpGet]
        public ActionResult TempForm()
        {
            return View();
        }

        #region 获取数据
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetGridJson(SoulPage<ModuleFieldsEntity> pagination, string moduleId, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.order = "asc";
                pagination.field = "F_Description";
            }
            var data = await _service.GetLookList(pagination, moduleId, keyword);
            return Content(pagination.setData(data).ToJson());
        }

        [IgnoreAntiforgeryToken]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetGridByTableNameJson(SoulPage<ModuleFieldsEntity> pagination, string tableNames)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.order = "asc";
                pagination.field = "F_Description";
            }
            var data = await _service.GetLookList(pagination, (tableNames ?? "").Split(','));
            return Content(pagination.setData(data).ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFilterJson(string F_ModuleId)
        {
            string mainTable = "";
            var module = await _moduleService.GetLookForm(F_ModuleId);
            if (module != null)
            {
                if (!string.IsNullOrEmpty(module.F_MainView))
                    mainTable = module.F_MainView;
                else
                    mainTable = module.F_MainTable;
            }
            var data = await _service.GetLookList(mainTable);
            data = data.Where(p =>
            {
                if (string.IsNullOrEmpty(p.F_Template)) return false;
                try
                {
                    var filterToken = JObject.Parse(p.F_Template)["filter"];
                    return filterToken != null && filterToken.ToString().ToLower() == "true";
                }
                catch
                {
                    return false;
                }
            }).ToList();
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetColsJson(string encode = "", string tablename = "")
        {
            var moduledata = (await _dataservice.GetList()).FirstOrDefault(p => p.F_EnCode == encode);

            if (moduledata == null && string.IsNullOrEmpty(tablename))//如果enCode在模块数据中找不到对应的记录，则直接把EnCode作为对象名（公共Index页面不需要配置）
            {
                tablename = encode;
            }

            if (moduledata?.F_DataType == "4" || moduledata?.F_DataType == "5" || moduledata?.F_DataType == "7")//参照字段
            {
                var modelfields = await _service.GetLookList(moduledata.F_ObjectName);
                //var data = new List<JObject>();
                var renameList = (moduledata.F_Rename ?? "").Split(',');
                if (moduledata.F_Fields.Trim() == "*")
                {
                    var fieldlist = await _service.GetLookList(moduledata.F_ObjectName);
                    moduledata.F_Fields = string.Join(",", fieldlist.Select(f => f.F_EnCode));
                }
                // 先清理 F_Fields 中的空项，再过滤
                var fieldList = moduledata.F_Fields
                    .Split(',')
                    .Select(f => f.Trim())
                    .Where(f => !string.IsNullOrEmpty(f))
                    .ToList();

                modelfields = modelfields.Where(p => fieldList.Contains(p.F_EnCode)).OrderBy(p => fieldList.IndexOf(p.F_EnCode)).OrderBy(p => p.F_SortCode).ToList();
                renameList.ForEach(rename =>
                {
                    if (!string.IsNullOrEmpty(rename))
                    {
                        var renameCode = rename.Split('|')[0].Trim();
                        var renameName = rename.Split('|')[1].Trim();
                        var titleName = rename.Split('|')[2].Trim();
                        object isrefer = null;
                        if (rename.Split('|').Length > 3)
                        {
                            isrefer = rename.Split('|')[3].Trim();
                        }
                        modelfields.ForEach(d =>
                        {
                            var templateObj = string.IsNullOrEmpty(d.F_Template) ? new JObject() : JObject.Parse(d.F_Template);
                            if (d.F_EnCode == renameCode)
                            {
                                if (!string.IsNullOrEmpty(renameName))
                                    d.F_EnCode = renameName;
                                d.F_FullName = titleName;
                                if (isrefer != null)
                                {
                                    if (isrefer.ToString().Trim() == "hide")
                                        templateObj["isrefer"] = false;
                                    else
                                        templateObj["isrefer"] = true;

                                }
                                else
                                    templateObj["isrefer"] = true;

                                d.F_Template = templateObj.ToString();
                            }
                        });
                    }
                });
                return Content(modelfields.ToJson());
            }
            else
            {
                var data = await _service.GetLookList(!string.IsNullOrEmpty(tablename) ? tablename : moduledata.F_ObjectName);
                data = data.OrderBy(p => GetFixedOrder(p))     // 主排序：left(0) < ""(1) < right(2)
                .ThenBy(p => p.F_SortCode)          // 次排序：组内按排序码
                .GroupBy(p => p.F_Id)               // 按 F_Id 去重，排序优先的先出现，保留第一条
                .Select(g => g.First())
                .ToList();
                return Content(data.ToJson());
            }
        }

        // 辅助函数：fixed 排序权重 left=0 < ""=1 < right=2
        int GetFixedOrder(ModuleFieldsEntity p)
        {
            var fixedValue = "";
            if (!string.IsNullOrEmpty(p.F_Template))
            {
                try { fixedValue = JObject.Parse(p.F_Template)["fixed"]?.ToString() ?? ""; }
                catch { fixedValue = ""; }
            }
            return fixedValue == "left" ? 0 : fixedValue == "right" ? 2 : 1;
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _service.GetList(keyword);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSysObjectListJson(string objectname, string param)
        {
            JObject paramobj;
            try { paramobj = JObject.Parse(param); }
            catch { paramobj = new JObject(); }
            var paraList = paramobj.Properties();
            var data = await _service.GetSysLookList(objectname, paraList?.FirstOrDefault().Value.ParseToString() ?? "");
            data = data.OrderBy(p => p.F_EnCode).ToList();
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetModuleTableListJson(string encode)
        {
            List<DbObjectInfo> data = _dbService.GetTableList("");
            if (!string.IsNullOrEmpty(encode))
            {
                data = data.Where(p => p.Name == encode).ToList();
            }
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSelectJson(string moduleId)
        {
            var module = await _moduleService.GetForm(moduleId);
            var data = (await _service.GetLookList(module.F_Id, "")).Where(a => a.F_TableName == module.F_MainView).ToList();
            var list = new List<object>();
            foreach (var item in data)
            {
                list.Add(new { id = item.F_EnCode, text = item.F_FullName + "(" + item.F_EnCode + ")", template = item.F_Template, referType = item.F_ReferType });
            }
            return Content(list.ToJson());
        }

        //[HttpGet]
        //[HandlerAjaxOnly]
        //public async Task<ActionResult> GetFormJson(string keyValue)
        //{
        //	var data = await _service.GetLookForm(keyValue);
        //	return Content(data.ToJson());
        //}

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string module, string encode)
        {
            var data = await _service.GetLookForm(module, encode);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetTableFormJson(string tablename, string encode)
        {
            var data = await _service.GetLookList(tablename);
            data = data.Where(p => p.F_EnCode == encode).ToList();
            return Content(data.FirstOrDefault().ToJson());
        }

        #endregion 获取数据

        #region 提交数据

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(ModuleFieldsEntity entity, string keyValue)
        {
            try
            {
                await _service.SubmitForm(entity, keyValue);
                return await Success("操作成功。", "", "", keyValue);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue);
            }
        }

        [HttpPost]
        public async Task<ActionResult> SubmitTemplet(string F_Templet, string keyValue)
        {
            var data = await _service.Db.Queryable<ModuleFieldsEntity>().FirstAsync(_ => _.F_Id == keyValue);
            if (data != null)
            {
                data.F_Template = F_Templet;
            }
            await _service.Db.Updateable(data).ExecuteCommandAsync();
            return await Success("操作成功。", "", "", keyValue);
        }

        /// <summary>
        /// 同步
        /// </summary>
        /// <param name="entity"></param>
        /// <returns></returns>
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SyncForm(ModuleFieldsEntity entity)
        {
            try
            {
                await _service.SyncForm(entity);
                return await Success("操作成功。", "", "");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", "");
            }
        }

        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        public async Task<ActionResult> DeleteForm(string keyValue)
        {
            try
            {
                await _service.DeleteForm(keyValue);
                return await Success("操作成功。", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Delete);
            }
        }

        [HttpGet]
        public ActionResult CloneFields()
        {
            return View();
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetCloneFieldsTreeJson()
        {
            var moduledata = await _moduleService.GetList();
            //moduledata = moduledata.Where(a => a.F_Target == "iframe" || a.F_Layers>1).ToList();
            var fieldsdata = await _service.GetList();
            var treeList = new List<TreeGridModel>();
            foreach (ModuleEntity item in moduledata)
            {
                TreeGridModel treeModel = new TreeGridModel();
                treeModel.id = item.F_Id;
                treeModel.title = item.F_FullName;
                treeModel.parentId = item.F_ParentId;
                treeModel.checkArr = "0";
                treeModel.disabled = true;
                //treeModel.self = item;
                treeList.Add(treeModel);
            }
            foreach (ModuleFieldsEntity item in fieldsdata)
            {
                TreeGridModel treeModel = new TreeGridModel();
                treeModel.id = item.F_Id;
                treeModel.title = item.F_EnCode;
                treeModel.parentId = item.F_ModuleId;
                treeModel.checkArr = "0";
                //treeModel.self = item;
                treeList.Add(treeModel);
            }
            return DTreeResult(treeList.TreeList());
        }

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitCloneFields(string moduleId, string Ids)
        {
            try
            {
                await _service.SubmitCloneFields(moduleId, Ids);
                return await Success("克隆成功。", "", "", Ids, DbLogType.Create);
            }
            catch (Exception ex)
            {
                return await Error("克隆失败，" + ex.Message, "", Ids, DbLogType.Create);
            }
        }

        #endregion 提交数据
    }
}