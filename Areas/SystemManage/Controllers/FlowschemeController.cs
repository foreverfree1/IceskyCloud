using IceskyCloud.Code;
using IceskyCloud.Domain.Entity.Infrastructure;
using IceskyCloud.Domain.FlowManage;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Service;
using IceskyCloud.Service.FlowManage;
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
    /// 日 期：2020-07-10 08:49
    /// 描 述：流程设计控制器类
    /// </summary>
    [Area("SystemManage")]
    public class FlowschemeController : BaseController
    {
        public FlowschemeService _service { get; set; }
        public FormService _formService { get; set; }
        public ModuleService _moduleService { get; set; }
        public ModuleButtonService _btnService { get; set; }
        public ModuleFieldsService _fieldsService { get; set; }
        public DatabaseTableService _dataTableService { get; set; }//wzx
        public FlowinstanceService _flowInstanceService { get; set; }

        [HttpGet]
        public virtual ActionResult NodeInfo()
        {
            return View();
        }

        [HttpGet]
        public virtual ActionResult LineInfo()
        {
            return View();
        }

        [HttpGet]
        public virtual ActionResult AreaInfo()
        {
            return View();
        }

        #region 获取数据

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetTreeGridJson(string keyword)
        {
            var data = await _service.GetLookList();
            if (!string.IsNullOrEmpty(keyword))
            {
                data = data.TreeWhere(t => t.F_SchemeCode.Contains(keyword) || t.F_SchemeName.Contains(keyword));
            }
            var treeList = new List<TreeGridModel>();
            foreach (var item in data)
            {
                TreeGridModel treeModel = new TreeGridModel();
                treeModel.id = item.F_Id;
                treeModel.title = item.F_SchemeName;
                treeModel.parentId = "0";
                treeModel.self = item;
                treeList.Add(treeModel);
            }
            return DTreeResult(treeList.TreeList());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetGridJson(string ItemId, string keyword)
        {
            var data = await _service.GetLookList(ItemId, keyword);
            return Success(data.Count, data);
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
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
                var data = await _service.GetFormExtend(keyValue);
                return Content(data.ToJson());
        }



        /// <summary>
        /// 通过流程ID（F_Id 或 F_SchemeCode）获取方案信息，F_SchemeContent 返回 JSON 对象
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJsonByenCode(string enCode,string KeyValue="")
        {
            var data = await _service.GetFormExtendByenCode(enCode);
            if(data!=null && !string.IsNullOrEmpty(KeyValue))
            {
                var ins_data = await _flowInstanceService.GetForm(data.F_Id, KeyValue);
                if(ins_data!=null)
                {
                    return Content(ins_data.ToJson());
                }
            }
            return Content((data ?? new object()).ToJson());
        }
        /// <summary>
        /// 通过流程ID（F_Id 或 F_SchemeCode）获取方案信息，F_SchemeContent 返回 JSON 对象
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSchemeInfoJson(string keyValue)
        {
            FlowschemeEntity entity;
            if (Guid.TryParse(keyValue, out _))
            {
                entity = await _service.GetForm(keyValue);
            }
            else
            {
                var list = await _service.GetLookList(keyword: keyValue);
                entity = list.FirstOrDefault(t => t.F_SchemeCode == keyValue);
            }
            if (entity == null)
                return Error("流程方案不存在");
            // F_SchemeContent 从字符串加工为 JSON 对象后返回
            var jobj = JObject.FromObject(entity);
            if (!string.IsNullOrEmpty(entity.F_SchemeContent))
            {
                jobj["F_SchemeContent"] = JToken.Parse(entity.F_SchemeContent);
            }
            return Content(jobj.ToString());
        }
        /// <summary>
        /// 根据模块编码（sys_module.F_EnCode）获取该模块的按钮列表和字段列表，
        /// 字段按 F_TableName 分组为 table 数组，并附带表的中文名
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetModuleButtonsFieldsJson(string keyValue)
        {
            var module = (await _moduleService.GetLookList()).FirstOrDefault(p => p.F_Id == keyValue);
            if (module == null)
                return Error("模块不存在");

            var mainTable = module.F_MainView ?? module.F_MainTable;

            var buttons = await _btnService.GetList(module.F_Id);
            var fields = (await _fieldsService.GetLookList(module.F_Id, ""))
                .Where(f => !string.IsNullOrEmpty(f.F_TableName) && f.F_TableName == mainTable)
                .ToList();

            return Content(new { buttons, fields }.ToJson());
        }

        
        /// <summary>
        /// 返回当前用户角色下所有可用的业务模块（有字段的模块）
        /// 管理员返回全部，普通用户按角色过滤
        /// 排除已被同一组织绑定过的业务模块（F_OrganizeId=''或=传入值）
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFlowModules(string F_OrganizeId, string keyValue = "")
        {
            var modules = (await _moduleService.GetList())
                .Where(m => m.F_EnabledMark==true && m.F_IsFlow == true && !string.IsNullOrEmpty(m.F_UrlAddress))
                .ToList();

            var allFlows = await _service.GetLookList();

            var occupiedIds = allFlows
            .Where(f => f.F_FrmType == 2 && f.F_Id != keyValue && (
                string.IsNullOrEmpty(f.F_OrganizeId)                                          // 已有全局:
                || f.F_OrganizeId == F_OrganizeId                                             // 同部门
                || (!string.IsNullOrEmpty(f.F_OrganizeId) && string.IsNullOrEmpty(F_OrganizeId)) // 已有部门 && 当前全局(新建)
            ))
            .Select(f => f.F_FrmId)
            .Where(id => !string.IsNullOrEmpty(id))
            .ToHashSet();

            var available = new List<object>();

            foreach (var m in modules)
            {
                var isOccupied = occupiedIds.Contains(m.F_Id);
                var btns = await _btnService.GetList(m.F_Id);
                var formAddress = btns.FirstOrDefault(b =>!string.IsNullOrEmpty(b.F_UrlAddress) &&
                    b.F_UrlAddress.Contains("/Form", StringComparison.OrdinalIgnoreCase))?.F_UrlAddress ?? "";

                available.Add(new
                {
                    m.F_Id, m.F_EnCode, m.F_Icon,
                    F_FullName = isOccupied ? m.F_FullName + "（已经有流程）" : m.F_FullName,
                    index_address = m.F_UrlAddress,form_address = formAddress,
                    create_flag = !isOccupied
                });
            }
            return Success(available.Count, available);
        }

        #endregion 获取数据

        #region 提交数据

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(FlowschemeEntity entity, string keyValue)
        {
            if (string.IsNullOrEmpty(keyValue))
            {
                entity.F_DeleteMark = false;
                if(entity.F_FrmType!=2){
                    entity.F_OrganizeId = (await _formService.GetForm(entity.F_FrmId)).F_OrganizeId;
                }
                
                entity.F_CreatorUserName = _service.currentuser.UserName;
                // 业务表单：检查是否已有同模块的非空部门流程存在
                // 如果已有 F_OrganizeId != '' 的流程，不允许再建 F_OrganizeId = '' 或相同部门
                if (entity.F_FrmType == 2 && !string.IsNullOrEmpty(entity.F_FrmId))
                {
                    var allFlows = await _service.GetLookList();
                    var existingWithOrg = allFlows
                        .Where(f => f.F_FrmType == 2
                            && f.F_FrmId == entity.F_FrmId
                            && f.F_Id != keyValue
                        )
                        .ToList();

                    if (existingWithOrg.Any())
                    {
                        
                        // 已存在无归属部门（全局）的流程
                        if (existingWithOrg.Any(f => string.IsNullOrEmpty(f.F_OrganizeId)))
                        {
                            return await Error("该业务模块已存在无归属部门的流程，不允许创建流程。", "", keyValue);
                        }
                        if (string.IsNullOrEmpty(entity.F_OrganizeId))
                        {
                            return await Error("该业务模块已存在归属指定部门的流程，不允许创建无归属部门的流程。", "", keyValue);
                        }
                        if (existingWithOrg.Any(f => f.F_OrganizeId == entity.F_OrganizeId))
                        {
                            return await Error("该业务模块在此部门下已存在流程方案。", "", keyValue);
                        }
                    }
                }

            }
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

        #endregion 提交数据
    }
}