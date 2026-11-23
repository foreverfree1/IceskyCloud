using IceskyCloud.Code;
using IceskyCloud.Domain.Entity.Infrastructure;
using IceskyCloud.Service;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SampleProofManage.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-04-20
    /// 描述：复样管理控制器
    /// </summary>

    [Area("SampleProofManage")]
    public class RepetitionFormulaController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "RepetitionFormula";
                field = value;
            }
        }

        //获取第三方数据库

        public ThirdPartyService _thirdPartyService { get; set; } = new ThirdPartyService(new ThirdPartyDbInfo()
        {
            ServerIp = "192.168.3.254",
            DataBaseName = "DatabaseShare",
            DataBaseUserId = "dci",
            DataBasePassWord = "Datacolor@2024",
        });

        #region 第三方获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetThreeJson(string TaskCode)
        {
            string sql = $@"
                SELECT t1.TaskCode,t3.ProductCode,t3.Remark,t3.CalcUnit,t3.ActualConc,t1.TaskFlag,t1.TaskClass,lDetSeq as F_No,t2.TaskGroupNo,t2.TaskGroupName 
                FROM MyTask t1 
                INNER JOIN MyRecipeHeader t2 ON t1.TaskCode = t2.TaskCode 
                INNER JOIN MyRecipeDetail t3  ON t2.RecipeHeadAK = t3.RecipeHeadAK 
                WHERE t1.TaskFlag = '3' AND t1.TaskCode ='{TaskCode}'";
                //WHERE  t1.TaskCode ='{TaskCode}'";
            var data = await _thirdPartyService.SqlQueryable(sql);
            return Content(data.ToJson());
        }
        #endregion

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
            var data = await _publicService.GetLookListDynamic(pagination, "view_sap_newformula", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_sap_newformula", keyword);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetIdListJson(string keyword)
        {
            var list = await _publicService.GetList("view_sap_newformula_list", keyword);
            return Content(list.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetDYList(string keyword)
        {
            var list = await _publicService.GetList("data_duplicatesample_formula", keyword);
            return Content(list.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetColorNoJson(string keyword)
        {
            var list = await _publicService.GetList("view_sap_newformula_ColorNo", keyword);
            return Content(list.ToJson());
        }
        
        //获取复方配方物料价格
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetMatPriceListJson(string keyword)
        {
            var list = await _publicService.GetList("view_sap_formula_price", keyword);
            return Content(list.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetForm("view_sap_newformulaId", keyValue);
            var list = await _publicService.GetList("view_sap_newformula_list", keyValue);
            
            var result = new
            {
                form = form,
                list = list,

            };
            return Content(result.ToJson());
        }
        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string encode)
        {
            try
            {
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
                    { "sap_newformula", "F_Id" },
                    {"sap_newformula_list","F_PrimaryId" }
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
