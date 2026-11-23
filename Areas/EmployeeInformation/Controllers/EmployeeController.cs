using Autofac.Core;
using Dm.util;
using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemOrganize;
using iTextSharp.text;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using static iTextSharp.text.pdf.AcroFields;

namespace IceskyCloud.Web.Areas.EmployeeInformation.Controllers
{
    [Area("EmployeeInformation")]
    public class EmployeeController : BaseController
    {
        public OrganizeService _service { get; set; }

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Employee";
                field = value;
            }
        }

        #region  获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string keyword, string organizeId)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_CreatorTime";
                pagination.order = "desc";
            }
            //根节点ID
            var rootEntity = await _publicService.GetForm("sys_organize_root");
            var children = await _publicService.GetList("sys_organize_children", organizeId ?? JObject.FromObject(rootEntity)["F_Id"]?.ToString());
            // 提取 F_Id 数组
            var childrenIds = children.Select(item => JObject.FromObject(item)["F_Id"]?.ToString()).Where(id => !string.IsNullOrEmpty(id)).ToArray();
            var childrenIdsStr = childrenIds == null ? "" : string.Join(",", childrenIds.Select(id => $"'{id}'"));
            keyword = $" and F_DeptId in ({childrenIdsStr})";
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_employeeinfo", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("employeeinfo_referenced", keyword ?? "");
            data.RemoveAt(0);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetemployeeListJson(string keyword)
        {
            var data = await _publicService.GetList("view_employeeinfo", keyword ?? "");
            return Content(data.ToJson());
        }



        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetReferenceListJson(string keyword)
        {
            var data = await _publicService.GetList("employeeinfo_referenced", keyword ?? "");
            return Content(data.ToJson());
        }

        /// <summary>
        /// 获取楼栋房间住宿人员
        /// </summary>
        /// <param name="houseCode">楼栋号</param>
        /// <param name="roomCode">房间号</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetHouseMemberListJson(string houseCode, string roomCode)
        {
            var data = await _publicService.GetList("base_employeeinfo_HouseMember", houseCode ?? "", roomCode ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJsons(string keyValue)
        {
            var form = await _publicService.GetForm("base_employeeinfo", keyValue);
            return Content(form.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetCuscomplaintJsons(string keyValue)
        {
            var form = await _publicService.GetForm("view_base_employeeinfo_Cuscomplaint", keyValue);
            return Content(form.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetKeyFormJsons(string keyValue,string EmployeeCode)
        {
            var form = await _publicService.GetForm("view_base_employeeinfo_key", keyValue ?? "", EmployeeCode ?? "");
            return Content(form.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue = "")
        {
            var form = await _publicService.GetLookList("base_employeeinfo", keyValue);
            var model = JObject.Parse((form.FirstOrDefault() as object).ToJson());
            var data = await _service.GetLookForm(model["F_DeptId"].ParseToString());
            model["F_DeptName"] = data?.F_FullName;
            return Content(model.ToJson());
        }
        #endregion


        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string encode)
        {
            try
            {
                if (string.IsNullOrEmpty(keyValue))//如果是新增，员工编号后置事件里面自动生成
                {
                    var entity = JObject.Parse(model);
                    var maxcode = await _publicService.GetForm("base_employeeinfo_maxcode");
                    entity["F_EmployeeCode"] = JObject.FromObject(maxcode)["F_MaxCode"]?.ToString();
                    model = entity.ToJson();
                }
                var Id = await _publicService.SubmitForm(model, encode, keyValue);
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
                    { "base_employeeinfo", "F_Id" }
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
