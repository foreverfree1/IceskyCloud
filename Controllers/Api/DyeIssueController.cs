using IceskyCloud.Code.Model;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Controllers.Api
{
    [Authorize]
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class DyeIssueController : ControllerBase
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "DyeSubStockOut";
                field = value;
            }
        }

        /// <summary>
        /// 根据配方单号查询数据
        /// </summary>
        /// <param name="F_FormulaCode"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetProductFormula(string F_FormulaCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("view_pdt_productformula_FormulaCode", F_FormulaCode ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 根据配方单号Id查询配方单号子表数据
        /// </summary>
        /// <param name="F_PrimaryId"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetProductFormulaList(string F_PrimaryId)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetList("view_pdt_productformula_list_Id", F_PrimaryId ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 根据id查询岗位名称
        /// </summary>
        /// <param name="F_Id"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetRole(string F_Id)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("sys_role_FullName", F_Id ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 查询仓库
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetWarehouseType()
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetList("ItemsView_WarehouseType_App");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 查询电子秤编号
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetDigitalScale()
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetList("ItemsView_DigitalScale_APP");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 根据仓库编号、物料名称查询物料对应数量
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetAllstockHand(string F_WarehouseTypeCode,string F_MatCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetList("view_wch_allstockhand_APP", F_WarehouseTypeCode ?? "", F_MatCode ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 提交数据
        /// </summary>
        /// <param name="model"></param>
        /// <param name="enCode"></param>
        /// <param name="F_Id"></param>
        /// <returns></returns>
        [HttpPost]
        [LoginFilter]
        public async Task<ApiResult> SubmitForm([FromBody] string model, string enCode, string F_Id = null)
        {
            ApiResult result = new ApiResult();
            try
            {
                var Id = await _publicService.SubmitForm(model, enCode, F_Id);
                result.code = 0;
                result.data = Id;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }
    }
}
