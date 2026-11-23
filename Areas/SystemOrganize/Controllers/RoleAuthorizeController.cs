

using Autofac.Core;
using Dm.util;
using IceskyCloud.Code;
using IceskyCloud.Domain.Entity.Infrastructure;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Domain.SystemOrganize;
using IceskyCloud.Service;
using IceskyCloud.Service.SystemManage;
using IceskyCloud.Service.SystemOrganize;
using Microsoft.AspNetCore.Mvc;
using Serenity.Data.Schema;
using SqlSugar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;

namespace IceskyCloud.Web.Areas.SystemOrganize.Controllers
{
    [Area("SystemOrganize")]
    public class RoleAuthorizeController : BaseController 
    {
        public RoleAuthorizeService _roleAuthorizeService { get; set; }
        public ModuleService _moduleService { get; set; }
        public ModuleButtonService _moduleButtonService { get; set; }
        public ModuleFieldsService _moduleFieldsService { get; set; }
        public ModulePrintService _modulePrintService { get; set; }
        public IceskyCloud.Service.Infrastructure.PublicService _publicService { get; set; }

        
        public DatabaseTableService _dataTableService { get; set; }//wzx

        [HttpGet]
        public async Task<ActionResult> GetPermissionTree(string roleId)
        {
            var current = _moduleService.currentuser;
            string roleid = current.RoleId;
            var moduledata = new List<ModuleEntity>();
            var buttondata = new List<ModuleButtonEntity>();
            var authorizedata = new List<RoleAuthorizeEntity>();
            //隐藏系统菜单及字典管理
            if (roleid == null && current.IsAdmin)
            {
                moduledata = await _moduleService.GetList();
                buttondata = await _moduleButtonService.GetList();
                moduledata = moduledata.Where(a => a.F_EnabledMark == true).ToList();
                buttondata = buttondata.Where(a => a.F_EnabledMark == true).ToList();
            }
            else
            {
                var rolelist = roleid.Split(',');
                foreach (var item in rolelist)
                {
                    moduledata.AddRange(await _moduleService.GetListByRole(item));
                    buttondata.AddRange(await _moduleButtonService.GetListByRole(item));
                }
                moduledata = moduledata.GroupBy(p => p.F_Id).Select(q => q.First()).ToList();
                buttondata = buttondata.GroupBy(p => p.F_Id).Select(q => q.First()).ToList();
            }
            if (!string.IsNullOrEmpty(roleId))
            {
                authorizedata = await _roleAuthorizeService.GetList(roleId);
            }
            // ★ 获取表/视图中文名，用于按钮按 F_TableId 分组
            var tabledata = _dataTableService.GetTableList("");
            var tableDescMap = tabledata.ToDictionary(t => t.Name, t => t.Description?.Trim() ?? t.Name);

            // 模块主表/主视图映射（用于表单分组命名与分组归属判断）
            var moduleMainMap = moduledata.ToDictionary(m => m.F_Id, m => new { m.F_MainView, m.F_MainTable });

            var treeList = new List<TreeGridModel>();
            foreach (ModuleEntity item in moduledata)
            {
                TreeGridModel tree = new TreeGridModel();
                tree.id = item.F_Id;
                tree.title = item.F_FullName;
                tree.parentId = item.F_ParentId;
                if (item.F_IsPublic == true)
                {
                    tree.checkArr = "1";
                    tree.disabled = true;
                }
                else
                {
                    tree.checkArr = authorizedata.Count(t => t.F_ItemId == item.F_Id) > 0 ? "1" : "0";
                }
                treeList.Add(tree);
            }

            // ★ 按钮分组：F_Location=3 → "表单"，F_Location!=3 → F_TableId 中文名
            var buttonGroups = new Dictionary<string, TreeGridModel>();

            // 预扫描：存在表单分组（F_Location=3 顶级按钮）的模块
            var formGroupModuleIds = buttondata
                .Where(b => b.F_ParentId == "0" && b.F_Location == 3)
                .Select(b => b.F_ModuleId)
                .ToHashSet();

            // 第一轮：为顶级按钮（F_ParentId=="0"）创建分组节点
            // 排序规则：主视图/主表分组 → 表单分组 → 表单按钮 → 其他表分组（子视图）
            // 局部函数：创建"按表名分组"节点
            void AddTableGroup(ModuleButtonEntity item, string parentId)
            {
                string tableId = item.F_TableId;
                string tableCnName = tableDescMap.TryGetValue(tableId, out var desc) ? desc : tableId;
                string groupTitle;
                if (tableId.StartsWith("view_"))
                    groupTitle = tableCnName + "视图";
                else if (tableId.StartsWith("func_"))
                    groupTitle = tableCnName + "函数";
                else if (tableId.StartsWith("proc_"))
                    groupTitle = tableCnName + "过程";
                else
                    groupTitle = tableCnName + "表";
                groupTitle = groupTitle + "（" + tableId + "）";

                string groupId = $"btnGroup_{item.F_ModuleId}_{tableId}";
                if (buttonGroups.ContainsKey(groupId)) return;

                TreeGridModel groupNode = new TreeGridModel();
                groupNode.id = groupId;
                groupNode.title = groupTitle;
                groupNode.parentId = parentId;
                groupNode.checkArr = "0";
                buttonGroups[groupId] = groupNode;
                treeList.Add(groupNode);
            }

            // ① 先创建主视图/主表分组（挂在模块下）
            foreach (ModuleButtonEntity item in buttondata.Where(b => b.F_ParentId == "0" && b.F_Location != 3 && !string.IsNullOrEmpty(b.F_TableId)))
            {
                var main = moduleMainMap.GetValueOrDefault(item.F_ModuleId);
                bool isMainTable = (!string.IsNullOrEmpty(main?.F_MainView) && item.F_TableId == main.F_MainView)
                                || (!string.IsNullOrEmpty(main?.F_MainTable) && item.F_TableId == main.F_MainTable);
                if (isMainTable)
                    AddTableGroup(item, item.F_ModuleId);
            }

            // ② 再创建表单分组（挂在模块下，位于主视图/主表分组之后）
            foreach (ModuleButtonEntity item in buttondata.Where(b => b.F_ParentId == "0" && b.F_Location == 3))
            {
                string groupId = $"btnGroup_{item.F_ModuleId}_form";
                if (!buttonGroups.ContainsKey(groupId))
                {
                    // 表单分组标题：表单（主表名）
                    string mainTable = moduleMainMap.GetValueOrDefault(item.F_ModuleId)?.F_MainTable;
                    string mainTableCn = "";
                    if (!string.IsNullOrEmpty(mainTable))
                        mainTableCn = tableDescMap.TryGetValue(mainTable, out var desc) ? desc : mainTable;
                    string groupTitle = string.IsNullOrEmpty(mainTableCn) ? "表单" : $"表单（{mainTable}）";

                    TreeGridModel groupNode = new TreeGridModel();
                    groupNode.id = groupId;
                    groupNode.title = groupTitle;
                    groupNode.parentId = item.F_ModuleId;
                    groupNode.checkArr = "0";
                    buttonGroups[groupId] = groupNode;
                    treeList.Add(groupNode);
                }
            }

            // ③ 添加表单分组下的按钮（先显示属于分组的按钮）
            foreach (ModuleButtonEntity item in buttondata.Where(b => b.F_ParentId == "0" && b.F_Location == 3))
            {
                TreeGridModel tree = new TreeGridModel();
                tree.id = item.F_Id;
                tree.title = item.F_FullName;
                tree.parentId = $"btnGroup_{item.F_ModuleId}_form";

                if (item.F_IsPublic == true)
                {
                    tree.checkArr = "1";
                    tree.disabled = true;
                }
                else
                {
                    tree.checkArr = authorizedata.Count(t => t.F_ItemId == item.F_Id) > 0 ? "1" : "0";
                }
                treeList.Add(tree);
            }

            // ④ 再创建其他表分组（挂在表单分组下，位于表单按钮之后）
            foreach (ModuleButtonEntity item in buttondata.Where(b => b.F_ParentId == "0" && b.F_Location != 3 && !string.IsNullOrEmpty(b.F_TableId)))
            {
                var main = moduleMainMap.GetValueOrDefault(item.F_ModuleId);
                bool isMainTable = (!string.IsNullOrEmpty(main?.F_MainView) && item.F_TableId == main.F_MainView)
                                || (!string.IsNullOrEmpty(main?.F_MainTable) && item.F_TableId == main.F_MainTable);
                if (isMainTable) continue; // 主视图/主表分组已在①创建

                // 存在表单分组时，其他分组挂在表单分组下；否则挂在模块下
                string parentId = formGroupModuleIds.Contains(item.F_ModuleId)
                    ? $"btnGroup_{item.F_ModuleId}_form"
                    : item.F_ModuleId;
                AddTableGroup(item, parentId);
            }

            // 第二轮：添加其余按钮节点（表单分组按钮已在③添加）
            foreach (ModuleButtonEntity item in buttondata.Where(b => !(b.F_ParentId == "0" && b.F_Location == 3)))
            {
                TreeGridModel tree = new TreeGridModel();
                tree.id = item.F_Id;
                tree.title = item.F_FullName;

                if (item.F_ParentId == "0")
                {
                    if (!string.IsNullOrEmpty(item.F_TableId))
                        tree.parentId = $"btnGroup_{item.F_ModuleId}_{item.F_TableId}";
                    else
                        tree.parentId = item.F_ModuleId; // F_TableId为空，直接挂在模块下
                }
                else
                {
                    tree.parentId = item.F_ParentId;
                }

                if (item.F_IsPublic == true)
                {
                    tree.checkArr = "1";
                    tree.disabled = true;
                }
                else
                {
                    tree.checkArr = authorizedata.Count(t => t.F_ItemId == item.F_Id) > 0 ? "1" : "0";
                }
                treeList.Add(tree);
            }

            // ★ 第三轮：根据子按钮勾选状态回填分组节点的 checkArr
            // "1"=全选, "2"=半选, "0"=未选
            foreach (var group in buttonGroups.Values)
            {
                // 递归收集所有后代按钮（含子分组下的按钮）
                var descendantButtons = new List<TreeGridModel>();
                var stack = new Stack<string>();
                stack.Push(group.id);
                while (stack.Count > 0)
                {
                    string pid = stack.Pop();
                    foreach (var node in treeList.Where(t => t.parentId == pid))
                    {
                        if (node.id.StartsWith("btnGroup_"))
                            stack.Push(node.id);
                        else
                            descendantButtons.Add(node);
                    }
                }
                if (descendantButtons.Count == 0) continue;

                int checkedCount = descendantButtons.Count(t => t.checkArr == "1");
                // if (checkedCount == descendantButtons.Count)
                //     group.checkArr = "1";
                // else 
                if (checkedCount > 0)
                    group.checkArr = "1"; // 半选状态可以用 "2" 表示，但这里沿用你的逻辑，若有需要可改为 "2"
                else
                    group.checkArr = "0";
            }

            return DTreeResult(treeList.TreeList());
        }

        [HttpPost]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetPermissionFieldsTree(string roleId, string moduleids)
        {
            var current = _moduleService.currentuser;
            // 优先使用传入的 roleId，未传入时使用当前用户的角色
            string targetRoleId = !string.IsNullOrEmpty(roleId) ? roleId : current.RoleId;
            var moduledata = new List<ModuleEntity>();
            var fieldsdata = new List<ModuleFieldsEntity>();
            var authorizedata = new List<RoleAuthorizeEntity>();

            //获取表和视图中文名
            List<DbObjectInfo> tabledata = _dataTableService.GetTableList("");
            
            //隐藏系统菜单及字典管理
            if (targetRoleId == null && current.IsAdmin)
            {
                moduledata = await _moduleService.GetList();
                fieldsdata = await _moduleFieldsService.GetList();
                moduledata = moduledata.Where(a => a.F_EnabledMark == true).ToList();
                fieldsdata = fieldsdata.Where(a => a.F_EnabledMark == true).ToList();
            }
            else
            {
                var rolelist = targetRoleId.Split(',');
                foreach (var item in rolelist)                      
                {
                    moduledata.AddRange(await _moduleService.GetListByRole(item));
                    fieldsdata.AddRange(await _moduleFieldsService.GetListByRole(item));
                }
                moduledata = moduledata.GroupBy(p => p.F_Id).Select(q => q.First()).ToList(); 
                fieldsdata = fieldsdata.GroupBy(p => p.F_Id).Select(q => q.First()).ToList();
            }
            // ===== 优化：只保留"开启了字段权限的模块"及其"上级模块"，字段也只加载这些模块的 =====
            var allModules = moduledata.ToDictionary(m => m.F_Id);

            // 1. 找出开启了字段权限的模块
            var fieldModuleIds = moduledata.Where(a => a.F_IsFields == true).Select(a => a.F_Id).ToHashSet();

            // 2. 沿 F_ParentId 向上回溯，收集所有上级模块 ID
            var ancestorIds = new HashSet<string>();
            foreach (var fieldModuleId in fieldModuleIds)
            {
                var pid = allModules.GetValueOrDefault(fieldModuleId)?.F_ParentId;
                while (!string.IsNullOrEmpty(pid) && pid != "0" && ancestorIds.Add(pid))
                {
                    pid = allModules.GetValueOrDefault(pid)?.F_ParentId;
                }
            }

            // 3. 模块：保留字段权限模块 + 其上级
            var keepModuleIds = new HashSet<string>(fieldModuleIds);
            keepModuleIds.UnionWith(ancestorIds);
            moduledata = moduledata.Where(a => keepModuleIds.Contains(a.F_Id)).ToList();

            // 4. 字段：只保留属于字段权限模块的，按排序号排列
            if (fieldModuleIds.Count > 0)
            {
                var allFieldsByModule = await _moduleFieldsService.Db.Queryable<ModuleFieldsEntity>()
                    .Where(f => fieldModuleIds.Contains(f.F_ModuleId)
                        && f.F_EnabledMark == true
                        && f.F_DeleteMark == false)
                    .OrderBy(f => f.F_SortCode)
                    .ToListAsync();

                // 合并：保留 fieldsdata 中非字段权限模块的字段（如公共字段等），
                // 字段权限模块则用全部字段替换
                var merged = new List<ModuleFieldsEntity>(allFieldsByModule);
                foreach (var f in fieldsdata.Where(f => !fieldModuleIds.Contains(f.F_ModuleId)))
                {
                    merged.Add(f);
                }
                fieldsdata = merged;
            }
            // ===== /优化 =====

            if (!string.IsNullOrEmpty(moduleids))
            {
                var list = moduleids.Split(',');
                moduledata = moduledata.Where(a => list.Contains(a.F_Id) || a.F_IsPublic == true).ToList();
            }
            else
            {
                moduledata = moduledata.Where(a => a.F_IsPublic == true).ToList();
            }
            if (!string.IsNullOrEmpty(roleId))
            {
                authorizedata = await _roleAuthorizeService.GetList(roleId);
            }
            var treeList = new List<TreeGridModel>();
            foreach (ModuleEntity item in moduledata)
            {
                TreeGridModel tree = new TreeGridModel();
                tree.id = item.F_Id;
                tree.title = item.F_FullName;
                tree.parentId = item.F_ParentId;
                if (item.F_IsPublic == true)
                {
                    tree.checkArr = "1";
                    tree.disabled = true;
                }
                else
                {
                    tree.checkArr = authorizedata.Count(t => t.F_ItemId == item.F_Id) > 0 ? "1" : "0";
                }
                treeList.Add(tree);
            }

           
            // 存储 表名 -> 表节点Id 的映射（去重用）
            Dictionary<string, (string Id, string EnName, string CnName)> tableMap = new();
            int tableIdCounter = 1;  // 用于生成表节点的数字Id

            foreach (ModuleFieldsEntity item in fieldsdata)
            {
                TreeGridModel tree = new TreeGridModel();
                tree.id = item.F_Id;
                tree.title = item.F_FullName+"("+item.F_EnCode+")";

                if (item.F_IsPublic == true)
                {
                    tree.checkArr = "1";
                    tree.disabled = true;
                }
                else
                {
                    tree.checkArr = authorizedata.Count(t => t.F_ItemId == item.F_Id) > 0 ? "1" : "0";
                }
                //尝试添加权限ID，如果已存在，返回 false；如果不存在，添加成功并返回 true

                // ---------- 2. 处理表名（去重+创建表节点） ----------
                if (!string.IsNullOrWhiteSpace(item?.F_TableName))
                {
                    string tableName = item.F_TableName.Trim();          // 英文表名
                    string tableName_en = "";
                    //tree.tableName = tableName;
                    

                    // 尝试获取已存在的表节点Id
                    if (!tableMap.TryGetValue(tableName, out var tableInfo))
                    {
                        DbObjectInfo dbInfo = tabledata.FirstOrDefault(t => t.Name == tableName);
                        if (dbInfo != null)
                        {
                            tableName_en = dbInfo.Description?.Trim() ?? tableName;
                            // 使用 cnName
                        }

                        // 表名不存在 → 创建新表节点
                        string newId = tableIdCounter.ToString();
                        tableIdCounter++;

                        TreeGridModel tableNode = new TreeGridModel();
                        tableNode.id = tableName;

                        //string firstFour = tableName.Length >= 4 ? tableName.Substring(0, 4) : tableName;

                        tableNode.title = tableName_en+"("+tableName+")";

                        tableNode.parentId = item.F_ModuleId;   // 表挂在模块下
                        // 表的勾选状态：是否有任何字段被授权？可根据业务调整，这里沿用你的逻辑（用表名作为授权依据，但这里暂时置0，或保持默认）
                        tableNode.checkArr = "0";
                        if (tree.checkArr?.Equals("1") ?? false) tableNode.checkArr = "1";

                        // 如果你希望表节点的授权从字段继承，可以在后面重新计算

                        treeList.Add(tableNode);
                        tableMap[tableName] = (newId, tableName, tableName_en);   // 记录映射
                    }
                    //else if(tree.checkArr?.Equals("0") ?? false)
                    //{
                    //    // 表节点已存在 → 可以根据需要更新表节点的勾选状态
                    //    var existingTableNode = treeList.FirstOrDefault(t => t.id == tableName);
                    //    if (existingTableNode.checkArr?.Equals("1") ?? false)
                    //    {
                    //        existingTableNode.checkArr = "2";  // 从全选变为半选，表示有字段被授权但表并未全部授权  
                    //    }
                    //}

                    tree.parentId = tableName;   // 字段挂在表节点下
                }
                else
                {
                    tree.parentId = item.F_ModuleId;
                }
                treeList.Add(tree);
            }
            return DTreeResult(treeList.TreeList());
        }

        /// <summary>
        /// 设置打印权限树（第4步）：打印模板
        /// 树结构: 模块 → 打印模板（模板直接挂在模块目录下）
        /// F_ItemType = 4 打印权限
        /// F_ObjectType = 1 打印 (F_ItemId = sys_moduleprint.F_Id)
        /// 树节点ID: printtemplate_模板Id
        /// </summary>
        [HttpPost]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetPermissionOptionsTree(string roleId, string moduleids)
        {
            var current = _moduleService.currentuser;
            string roleid = current.RoleId;
            var moduledata = new List<ModuleEntity>();
            var authorizedata = new List<RoleAuthorizeEntity>();

            // 加载角色可见模块
            if (roleid == null && current.IsAdmin){
                moduledata = (await _moduleService.GetList()).Where(a => a.F_EnabledMark == true).ToList();
            }
            else{
                foreach (var item in roleid.Split(',')){
                    moduledata.AddRange(await _moduleService.GetListByRole(item));
                }
                moduledata = moduledata.GroupBy(p => p.F_Id).Select(q => q.First()).ToList();
            }
            if (!string.IsNullOrEmpty(roleId)){ authorizedata = await _roleAuthorizeService.GetList(roleId);}

            // 全部未删除的打印模板
            var printList = await _publicService.Db.Queryable<ModulePrintEntity>().Where(p => p.F_DeleteTime == null).ToListAsync();

            // 如果功能权限树(demoTree1)未勾选任何模块（moduleids 为空），则打印权限树(demoTree3)显示无数据
            if (string.IsNullOrEmpty(moduleids))
            {
                return DTreeResult(new List<TreeGridModel>());
            }

            // 收集给定模块ID及其祖先链（回溯至各自顶级模块），用于树骨架过滤与回显
            HashSet<string> CollectAncestors(IEnumerable<string> ids)
            {
                var set = new HashSet<string>();
                foreach (var mid in ids){
                    string cur = mid;
                    for (int i = 0; i < 10 && !string.IsNullOrEmpty(cur); i++){
                        set.Add(cur);
                        var parent = moduledata.FirstOrDefault(m => m.F_Id == cur);
                        if (parent == null || parent.F_ParentId == "0") break; // 回溯到顶级模块为止
                        cur = parent.F_ParentId;
                    }
                }
                return set;
            }

            // 只保留"勾选模块其祖先链"与"有打印模板模块其祖先链"的交集作为树骨架
            var keepIds = string.IsNullOrEmpty(moduleids) ? new HashSet<string>() : CollectAncestors(moduleids.Split(','));
            var printLeafModuleIds = printList.Select(p => p.F_ModuleId).Where(m => !string.IsNullOrEmpty(m)).ToHashSet();
            var keepPrintAncestors = CollectAncestors(printLeafModuleIds);
            moduledata = moduledata.Where(a => keepIds.Contains(a.F_Id) && keepPrintAncestors.Contains(a.F_Id)).ToList();

            // 若勾选的模块中没有一个自身有打印模板 → 显示无数据（空树）
            if (!moduledata.Any(m => printLeafModuleIds.Contains(m.F_Id)))
            {
                return DTreeResult(new List<TreeGridModel>());
            }

            // 已授权打印模板所属模块 + 祖先链 → 模块节点向上回显勾选
            var checkedModuleIds = CollectAncestors(printList
                .Where(p => authorizedata.Any(t => t.F_ItemType == 4 && t.F_ObjectType == 1 && t.F_ItemId == p.F_Id && t.F_ObjectId == roleId))
                .Select(p => p.F_ModuleId)
                .Where(m => !string.IsNullOrEmpty(m)));

            var treeList = new List<TreeGridModel>();

            // 1. 构建模块树骨架：自身或后代存在已授权打印模板时向上回显勾选
            foreach (ModuleEntity item in moduledata)
            {
                treeList.Add(new TreeGridModel{
                    id = item.F_Id,title = item.F_FullName,parentId = item.F_ParentId,disabled = item.F_IsPublic == true,
                    checkArr = item.F_IsPublic == true || checkedModuleIds.Contains(item.F_Id) ? "1" : "0"
                });
            }

            // 2. 为每个模块挂载打印模板节点（直接挂在模块目录下）
            foreach (ModuleEntity item in moduledata)
            {
                foreach (var p in printList.Where(pr => (pr.F_ModuleId ?? "") == (item.F_Id ?? "")))
                {
                    string pid = p.F_Id;
                    string templateNodeId = "printtemplate_" + pid;
                    if (treeList.All(t => t.id != templateNodeId)){
                        treeList.Add(new TreeGridModel{
                            id = templateNodeId,title = p.F_FullName,parentId = item.F_Id,
                            checkArr = authorizedata.Any(t => t.F_ItemType == 4 && t.F_ObjectType == 1 && t.F_ItemId == pid && t.F_ObjectId == roleId) ? "1" : "0"
                        });
                    }
                }
            }
            return DTreeResult(treeList.TreeList());
        }
    }
}