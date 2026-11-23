using IceskyCloud.Code;
//using IceskyCloud.Domain.BaseManage;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using SqlSugar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
//using IceskyCloud.Service.BaseManage;

namespace IceskyCloud.Web.Areas.FinancialManagement.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-12 13:56
    /// 描 述：供应商信息控制器类
    /// </summary>
    [Area("FinancialManagement")]
    public class PSstatementController :  BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "PSstatement";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_fina_PSstatement", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_fina_PSstatement", keyword ?? "");
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetProcessCodeJson(string keyword)
        {
            var data = await _publicService.GetForm("fina_PSstatement_ProcessCode", keyword);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetDetailListJson(string keyValue,string CusCode)
        {
            var data = await _publicService.GetList("view_fina_PSstatement_list", keyValue ?? "", CusCode ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("fina_PSstatement", keyValue);
            var detail = await _publicService.GetList("fina_PSstatement_list", keyValue);
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
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode)
        {
            try
            {
                string Id = await _publicService.SubmitForm(model, enCode, keyValue);
                return await Success("操作成功。", Id, "");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue);
            }
        }

        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> CreateStatement(string StartDate, string EndDate)
        {
            try
            {
                List<SugarParameter> parameters = new List<SugarParameter>();
                parameters.Add(new SugarParameter("F_StartDay", StartDate));
                parameters.Add(new SugarParameter("F_EndDay", EndDate));
                parameters.Add(new SugarParameter("state", null) { Direction = System.Data.ParameterDirection.Output });
                parameters.Add(new SugarParameter("message", null) { Direction = System.Data.ParameterDirection.Output });
                var result = await _publicService.GetStoredProcedureList("usp_PSstatement", parameters);
                //var data = result[0].ToJson().ToJObject();
                //if (data["state"].ParseToInt() == 1)
                //    throw new Exception(data["message"].ParseToString());
                return Success("生成成功。", result);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "");
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
                    { "fina_PSstatement", "F_Id" },
                    { "fina_PSstatement_list", "F_PrimaryId" }
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
