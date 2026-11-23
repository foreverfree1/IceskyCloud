using IceskyCloud.Code;
using IceskyCloud.Domain.Entity.SystemManage;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Service.SystemManage;
using IceskyCloud.Service.SystemOrganize;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemManage.Controllers
{
    [Area("SystemManage")]
    public class ModuleController : BaseController
    {
        public ModuleService _service { get; set; }
        public ModuleButtonService _moduleButtonService { get; set; }
        public RoleAuthorizeService _roleAuthorizeService { get; set; }

        [HttpGet]
        [HandlerAuthorize]
        public ActionResult ConfigForm()
        {
            return View();
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetTreeSelectJson()
        {
            var data = await _service.GetList();
            data = data.Where(a => a.F_IsExpand == true).ToList();
            var treeList = new List<TreeSelectModel>();
            foreach (ModuleEntity item in data)
            {
                TreeSelectModel treeModel = new TreeSelectModel();
                treeModel.id = item.F_Id;
                treeModel.text = item.F_FullName;
                treeModel.parentId = item.F_ParentId;
                treeList.Add(treeModel);
            }
            return Content(treeList.TreeSelectJson());
        }

        [HandlerAjaxOnly]
        public async Task<ActionResult> GetTreeGridJson(string keyword)
        {
            var data = await _service.GetLookList();

            //按登录人角色过滤：角色未授权的模块直接移除（超管/管理员不过滤）
            data = await FilterModuleByRole(data);

            if (!string.IsNullOrEmpty(keyword))
            {
                data = data.TreeWhere(t => t.F_FullName.Contains(keyword));
            }
            return Success(data.Count, data);
        }

        /// <summary>
        /// 按登录人角色过滤模块：角色未授权的模块直接移除；保留被授权模块的父级链，避免树断链
        /// </summary>
        private async Task<List<ModuleEntity>> FilterModuleByRole(List<ModuleEntity> data)
        {
            var currentuser = _service.currentuser;
            //超级管理员/管理员拥有全部模块，不过滤
            if (currentuser == null || currentuser.IsSuperAdmin || currentuser.IsAdmin)
            {
                return data;
            }
            var roleId = currentuser.RoleId;
            if (string.IsNullOrEmpty(roleId))
            {
                roleId = "visitor";
            }
            //与菜单授权同源：角色已授权的模块集合
            var menuList = await _roleAuthorizeService.GetMenuList(roleId);
            var moduleMap = data.ToDictionary(a => a.F_Id);
            var authorizedIds = new HashSet<string>();
            foreach (var item in menuList)
            {
                if (!moduleMap.ContainsKey(item.F_Id)) continue;
                authorizedIds.Add(item.F_Id);
                //补齐父级链，防止子模块保留而父级被删导致树断链
                var ok = moduleMap.TryGetValue(item.F_ParentId, out var parent);
                while (ok && parent != null)
                {
                    authorizedIds.Add(parent.F_Id);
                    ok = moduleMap.TryGetValue(parent.F_ParentId, out parent);
                }
            }
            return data.Where(a => authorizedIds.Contains(a.F_Id)).ToList();
        }

        /// <summary>
        /// 获取模块Index主视图名
        /// </summary>
        /// <param name="encode"></param>
        /// <returns></returns>
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetMainView(string encode)
        {
            string mainTable = "";
            var list = await _service.GetLookList();
            var data = list.FirstOrDefault(p => p.F_EnCode == encode);
            if (data != null)
            {
                if (!string.IsNullOrEmpty(data.F_MainView))
                    mainTable = data.F_MainView;
                else
                    mainTable = data.F_MainTable;
            }
            return Content(new { mainTable = mainTable, IsTree = data.F_IsTree, IsImport = data.F_IsImport, IsNavi = data.F_IsNavi, IsFlow = data.F_IsFlow }.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetMaxSortCodeText(string F_ParentId)
        {
            var data = await _service.GetMaxSortCode(F_ParentId);
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSelectJson()
        {
            var data = await _service.GetList();
            data = data.Where(a => a.F_Target == "expand" && a.F_IsExpand == true).ToList();
            var treeList = new List<TreeSelectModel>();
            foreach (ModuleEntity item in data)
            {
                TreeSelectModel treeModel = new TreeSelectModel();
                treeModel.id = item.F_Id;
                treeModel.text = item.F_EnCode;
                treeModel.parentId = item.F_ParentId;
                treeList.Add(treeModel);
            }
            return Content(treeList.TreeSelectJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSelectMunuJson(string keyword)
        {
            var data = (await _service.GetList()).Where(a => a.F_Target == "iframe").ToList();
            if (!string.IsNullOrEmpty(keyword))
            {
                data = data.Where(a => a.F_FullName.Contains(keyword)).ToList();
            }
            List<object> list = new List<object>();
            foreach (var item in data)
            {
                list.Add(new { id = item.F_Id, text = item.F_FullName });
            }
            return Content(list.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSelectMunuBesidesJson(string keyword)
        {
            var data = await _service.GetBesidesList();
            if (!string.IsNullOrEmpty(keyword))
            {
                data = data.Where(a => a.F_FullName.Contains(keyword)).ToList();
            }
            List<object> list = new List<object>();
            foreach (var item in data)
            {
                list.Add(new { id = item.F_Id, text = item.F_FullName });
            }
            return Content(list.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _service.GetLookForm(keyValue);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSqlDataList(string ModuleEncode)
        {
            var data = await _service.Db.Queryable<ModuleDataEntity>().Where(x => x.F_ModuleId == ModuleEncode).ToListAsync();
            return Content(data.ToJson());
        }


        /// <summary>
        /// 获取模块代码历史记录
        /// </summary>
        /// <param name="formIndex"></param>
        /// <param name="ModuleId"></param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormHistoryList(int formIndex, string ModuleId)
        {
            var data = await _service.GetFormHistoryList(formIndex, ModuleId);
            return Content(data.ToJson());
        }

        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAdmin(false)]
        public async Task<ActionResult> SubmitForm(ModuleEntity moduleEntity, string keyValue)
        {
            if (string.IsNullOrEmpty(keyValue))
            {
                moduleEntity.F_DeleteMark = false;
                moduleEntity.F_AllowEdit = false;
                moduleEntity.F_AllowDelete = false;
                moduleEntity.F_IsPublic = false;
            }
            else
            {
                if (keyValue == moduleEntity.F_ParentId)
                {
                    throw new Exception("父级不能是自身");
                }
                //前端传值为null，更新的时候null不更新
                if (moduleEntity.F_Icon == null)
                {
                    moduleEntity.F_Icon = "";
                }
            }
            try
            {
                if (moduleEntity.F_ParentId == "0")
                {
                    moduleEntity.F_Layers = 1;
                }
                else
                {
                    moduleEntity.F_Layers = (await _service.GetForm(moduleEntity.F_ParentId)).F_Layers + 1;
                }
                if (!string.IsNullOrEmpty(moduleEntity.F_UrlAddress))
                {
                    var templist = await _service.GetList();
                    if (!string.IsNullOrEmpty(keyValue))
                    {
                        templist = templist.Where(a => a.F_Id != keyValue).ToList();
                    }
                    if (templist.Find(a => a.F_UrlAddress == moduleEntity.F_UrlAddress) != null)
                        throw new Exception("菜单地址不能重复！");
                }
                else
                {
                    moduleEntity.F_UrlAddress = null;
                }
                await _service.SubmitForm(moduleEntity, keyValue);
                return await Success("操作成功。", "", "", keyValue);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue);
            }
        }

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitUpdateForm(string F_Id, int SortCode)
        {
            try
            {
                await _service.SubmitUpdateForm(F_Id, SortCode);
                return await Success("操作成功。", "", "", F_Id);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", F_Id);
            }
        }

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitUpdateFormCode(string F_Id, string FormCode, int? FormIndex, string FormAction, bool Ishistory = true)
        {
            try
            {
                var F_FormCode = (await _service.GetForm(F_Id))?.F_FormCode;

                // 解析现有代码列表，容错空值/脏数据
                JArray formCodeList;
                if (string.IsNullOrWhiteSpace(F_FormCode))
                {
                    formCodeList = new JArray();
                }
                else
                {
                    try { formCodeList = JArray.Parse(F_FormCode); }
                    catch { formCodeList = new JArray(); }
                }
                var maxIndex = 0;
                if (FormIndex == null)
                {
                    if (formCodeList.Count > 0)
                        maxIndex = formCodeList.Max(t => t.Value<int?>("Index") ?? 0);
                    formCodeList.Add(new JObject
                    {
                        ["Index"] = maxIndex + 1,
                        ["Code"] = FormCode
                    });
                }
                else
                {
                    var target = formCodeList
                        .FirstOrDefault(t => (t.Value<int?>("Index") ?? -1) == FormIndex.Value);

                    if (FormAction == "edit")
                    {
                        if (target == null)
                        {
                            formCodeList.Add(new JObject
                            {
                                ["Index"] = FormIndex.Value,
                                ["Code"] = FormCode
                            });
                        }
                        else
                        {
                            target["Code"] = FormCode;
                        }
                    }
                    else if (FormAction == "delete")
                    {
                        if (target != null)
                        {
                            formCodeList.Remove(target);
                            //同时删除历史记录
                            await _service.DeleteFormHistory(F_Id, FormIndex.ParseToInt(0));
                        }
                    }
                }

                // 保存操作后的完整 JSON 数组（而不是传入的 FormCode）
                var newFormCodeJson = formCodeList.ToJson();
                await _service.SubmitUpdateForm(F_Id, newFormCodeJson);
                if (Ishistory && FormAction != "delete")
                {
                    ModuleFormHistoryEntity moduleFormHistory = new ModuleFormHistoryEntity();
                    moduleFormHistory.F_ModuleId = F_Id;
                    moduleFormHistory.F_FormName = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                    moduleFormHistory.F_FormCode = FormCode;
                    moduleFormHistory.F_FormIndex = FormIndex == null ? maxIndex + 1 : FormIndex.ParseToInt();
                    await _service.SubmitFormHistory(moduleFormHistory);
                }

                return await Success("操作成功。", (FormIndex == null ? maxIndex + 1 : FormIndex).ParseToString(), "", F_Id);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", F_Id);
            }
        }

        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        [HandlerAdmin(false)]
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
    }
}