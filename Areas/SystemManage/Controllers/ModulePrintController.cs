using IceskyCloud.Code;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Service.SystemManage;
using IceskyCloud.Service.SystemOrganize;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2025-12-11 08:45
    /// 描 述：数据管理控制器类
    /// </summary>
    [Area("SystemManage")]
    public class ModulePrintController : BaseController
    {
        public ModulePrintService _service { get; set; }
        public ModuleService _moduleservice { get; set; }
        public RoleAuthorizeService _roleAuthorizeService { get; set; }

        #region 获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<ModulePrintEntity> pagination, string keyword, string moduleId)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_CreatorTime";
                pagination.order = "desc";
            }
            var data = await _service.GetLookList(pagination, moduleId, keyword);
            return Content(pagination.setData(data).ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string F_Url, string F_PrintType)
        {
            var moduleList = await _moduleservice.GetList();
            var indexUrl = F_Url.Substring(0, F_Url.LastIndexOf('/') + 1) + "Index";
            var moduleid = moduleList.Where(p => p.F_UrlAddress == indexUrl).FirstOrDefault()?.F_Id;
            if (moduleid == null)//Index为公共页面
            {
                moduleid = moduleList.Where(p => p.F_UrlAddress == F_Url.Replace(F_Url.Split('/')[1],"Module").Replace("/Form", "/Index")).FirstOrDefault()?.F_Id;
            }
            List<ModulePrintEntity> data = new List<ModulePrintEntity>();
            foreach (var printtype in F_PrintType.Split(","))
            {
                var result = await _service.GetList(moduleid, printtype);
                data.AddRange(result);
            }
            // 管理员豁免：管理员可见全部打印模板
            var current = _logService.currentuser;
            if (current != null && current.IsAdmin != true && current.IsSuperAdmin != true)
            {
                // 非管理员：只返回已授权（sys_roleauthorize F_ItemType=4 且 F_ItemId=模板ID）的打印模板
                var authorizedIds = new HashSet<string>();
                foreach (var roleId in (current.RoleId ?? "").Split(','))
                {
                    if (string.IsNullOrEmpty(roleId)) continue;
                    var list = await _roleAuthorizeService.GetList(roleId);
                    foreach (var item in list.Where(t => t.F_ItemType == 4))
                    {
                        authorizedIds.Add(item.F_ItemId);
                    }
                }
                data = data.Where(p => authorizedIds.Contains(p.F_Id)).ToList();
            }
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListByTypeJson(SoulPage<ModulePrintEntity> pagination, string F_Url, string F_PrintType)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_CreatorTime";
                pagination.order = "desc";
            }
            var moduleList = await _moduleservice.GetList();
            var indexUrl = F_Url.Substring(0, F_Url.LastIndexOf('/') + 1) + "Index";
            var moduleid = moduleList.Where(p => p.F_UrlAddress == indexUrl).FirstOrDefault()?.F_Id;
            var data = await _service.GetLookList(pagination, moduleid);
            data = data.Where(p => p.F_PrintType == F_PrintType).ToList();
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _service.GetLookForm(keyValue);
            return Content(data.ToJson());
        }
        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(ModulePrintEntity entity, string keyValue)
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
        #endregion
    }
}
