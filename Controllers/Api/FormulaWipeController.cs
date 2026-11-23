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
    public class FormulaWipeController : ControllerBase
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "FormulaWipe";
                field = value;
            }
        }

        /// <summary>
        /// 根据配方单号查询数据
        /// </summary>
        /// <param name="F_FormulaCode"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetFormulaCode(string F_FormulaCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var list = await _publicService.GetList("view_prod_formulawipe_ref_winform", F_FormulaCode ?? "");
                result.code = 0;
                result.data = list;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取人员信息
        /// </summary>
        /// <param name="F_EmployeeCode">员工工号</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetEmployeeInfo(string F_EmployeeCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("FormulaWipe_employeeinfo_winform", F_EmployeeCode ?? "");
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
        /// <param name="keyValue"></param>
        /// <param name="enCode"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<ApiResult> SubmitForm([FromBody] string model, string keyValue, string enCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var Id = await _publicService.SubmitForm(model, enCode, keyValue);
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
