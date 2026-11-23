using IceskyCloud.Code;
using IceskyCloud.Domain.Entity.Infrastructure;
using IceskyCloud.Service;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.OrderManagement;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SampleProofManage.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-04-23
    /// 描述：生产配方控制器
    /// </summary>
    [Area("SampleProofManage")]
    public class ProductFormulaController : BaseController
    {
        public OrderService _service { get; set; }

        public ThirdPartyService _thirdPartyService { get; set; } = new ThirdPartyService(new ThirdPartyDbInfo()
        {
            ServerIp = "192.168.3.254",
            DataBaseName = "DatabaseShare",
            DataBaseUserId = "dci",
            DataBasePassWord = "Datacolor@2024",
        });

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "ProductFormula";
                field = value;
            }
        }

        #region 获取数据

        /// <summary>
        /// index主页获取数据
        /// </summary>
        /// <returns></returns>
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_CreatorTime";
                pagination.order = "desc";
            }
            var data = await _publicService.GetLookListDynamic(pagination, "view_pdt_productformula", keyword ?? "");
            return Content(data);
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_pdt_productformula_Id", keyValue);
            var productformula_list = await _publicService.GetList("view_pdt_productformula_list_Id", keyValue);
            var formulaboth_list = await _publicService.GetList("view_pdt_formulaboth_list_id", keyValue);
            var para_form = await _publicService.GetForm("pdt_productformula_para_id", keyValue);
            var result = new
            {
                form = form,
                productformulaList = productformula_list,
                formulabothList = formulaboth_list,
                paraForm = para_form,
            };
            return Content(result.ToJson());
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormulaCodeFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_pdt_productformula_FormulaCode", keyValue);
            return Content(form.ToJson());
        }

        /// <summary>
        /// 根据id查询子表信息
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetIdListJson(string keyword)
        {
            var list = await _publicService.GetList("view_pdt_productformula_list_Id", keyword);
            return Content(list.ToJson());
        }

        /// <summary>
        /// 根据流程卡号以及配方性质查询生产配方
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetIdNatureJson(string keyword)
        {
            var list = await _publicService.GetForm("view_pdt_productformula_IdNature", keyword);
            return Content(list.ToJson());
        }

        /// <summary>
        /// 根据色号查询对应的数据
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetColorNoListJson(string keyword)
        {
            var list = await _publicService.GetList("view_pdt_productformula_ColorNo", keyword);
            return Content(list.ToJson());
        }

        /// <summary>
        /// 根据名称、克重查询对应的数据
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetDyeParameteJson(string F_ParaName,string F_GramWeight)
        {
            var form = await _publicService.GetForm("view_base_dyeparamete_ref", F_ParaName, F_GramWeight);
            return Content(form.ToJson());
        }

        /// <summary>
        /// 获取染色工艺号
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetDyeTechniqueJson(string MatMajorClassId, string FlowStep,string Component)
        {
            var form = await _publicService.GetList("view_base_dyetechnique_all", MatMajorClassId, FlowStep, Component);
            return Content(form.ToJson());
        }

        /// <summary>
        /// 获取是否敏感色
        /// </summary>
        /// <param name="keyword">色号</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetIsSensitive(string keyword)
        {
            string sql = $"SELECT StringValue3 FROM [dbo].[ImportTask] WHERE TaskCode = '{keyword}'";
            var data = await _thirdPartyService.SqlQueryable(sql);
            return Content(data.ToJson());
        }

        #endregion

        #region 提交数据

        /// <summary>
        /// 提交数据
        /// </summary>
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode)
        {
            try
            {
                var Id = await _publicService.SubmitForm(model, enCode, keyValue);
                return await Success("操作成功", Id, "");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue);
            }
        }

        /// <summary>
        /// 删除
        /// </summary>
        /// <param name="keyValue"></param>
        /// <returns></returns>
        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        public async Task<ActionResult> DeleteForm(string keyValue)
        {
            try
            {
                var dicts = new Dictionary<string, string>()
                {
                    { "pdt_productformula","F_Id"},
                    { "pdt_productformula_list","F_PrimaryId"},
                    { "pdt_productformula_both","F_PrimaryId"}
                };
                await _publicService.DeleteForm(dicts, "NF-delete", keyValue);
                return await Success("操作成功", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Delete);
            }
        }

        #endregion
    }
}
