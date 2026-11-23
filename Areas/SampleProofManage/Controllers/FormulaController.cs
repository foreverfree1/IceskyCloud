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
    /// 日期：2026-04-20
    /// 描述：打样配方控制器
    /// </summary>
    [Area("SampleProofManage")]
    public class FormulaController : BaseController
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
                value.moduleEnCode = "Formula";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_sap_formula", keyword ?? "");
            return Content(data);
        }

        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_sap_formula_Id", keyValue);
            var formula_list = await _publicService.GetList("view_sap_formula_list_Id", keyValue);
            var formulafastness_list = await _publicService.GetList("view_sap_formulafastness_list_id", keyValue);
            var result = new
            {
                form = form,
                formulaList = formula_list,
                formulafastnessList = formulafastness_list
            };
            return Content(result.ToJson());
        }


        /// <summary>
        /// 获取单条数据详情
        /// </summary>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetColorNoFormJson(string keyword)
        {
            var form = await _publicService.GetForm("view_sap_formula_ColorNo", keyword);
            var model = JObject.Parse(form.ToJson());
            var list = await _publicService.GetList("view_sap_formula_list_Id", model["F_Id"]);
            return Content(list.ToJson());
        }

        /// <summary>
        /// 获取对应色号的成份顺序
        /// </summary>
        /// <param name="keyword">色号</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetColorNo(string keyword)
        {
            var form = await _publicService.GetForm("register_color", keyword);
            return Content(form.ToJson());
        }

        /// <summary>
        /// 查询所有染色成分字典
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetComponent()
        {
            var form = await _publicService.GetList("ItemsView_Component");
            return Content(form.ToJson());
        }

        /// <summary>
        /// 获取测配色数据
        /// </summary>
        /// <param name="keyword">色号</param>
        /// <param name="ColorantSet">成分顺序</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetMyRecipeHeader(string keyword)
        {
            // , string ColorantSet
            string sql = $"SELECT t1.TaskCode,t3.ProductCode,t3.Remark,t3.CalcUnit,t3.ActualConc FROM MyTask t1 INNER JOIN MyRecipeHeader t2 ON t1.TaskCode = t2.TaskCode INNER JOIN MyRecipeDetail t3  ON t2.RecipeHeadAK = t3.RecipeHeadAK WHERE t1.TaskCode ='{keyword}'";
            //string sql = $"SELECT t1.TaskCode,t4.ColorantSet,t4.Ordernumer,t3.ProductCode,t3.Remark,t3.CalcUnit,t3.ActualConc,t3.lDetSeq FROM MyTask t1 INNER JOIN MyRecipeHeader t2 ON t1.TaskCode = t2.TaskCode INNER JOIN MyRecipeDetail t3  ON t2.RecipeHeadAK = t3.RecipeHeadAK INNER JOIN TaskColorantSet t4 ON t1.TaskCode = t4.TaskCode WHERE t1.TaskCode ='{keyword}' AND t4.ColorantSet = '{ColorantSet}' ORDER BY t3.lDetSeq";
            var data = await _thirdPartyService.SqlQueryable(sql);
            return Content(data.ToJson()) ;
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
                    { "sap_formula","F_Id"},
                    { "sap_formula_list","F_PrimaryId"},
                    { "sap_formula_fast","F_PrimaryId"}
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
