using IceskyCloud.Code;
using IceskyCloud.Code.Model;
using IceskyCloud.Service.Infrastructure;
using iTextSharp.text;
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
    public class MealcardController : ControllerBase
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Mealcard";
                field = value;
            }
        }

        /// <summary>
        /// 获取该员工刷卡记录
        /// </summary>
        /// <param name="F_EmployeeCode">员工工号</param>
        /// <param name="F_CardNo">卡号</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetSwipeRecord(string F_EmployeeCode,string F_CardNo)
        {
            ApiResult result = new ApiResult();
            try
            {
                // 卡号和员工是否绑定
                var isBind = await _publicService.GetList("BindThisPerson", F_EmployeeCode ?? "", F_CardNo ?? "");
                if (isBind != null && isBind.Count > 0)
                {
                    var form = await _publicService.GetForm("view_base_mealcard_winform", F_EmployeeCode ?? "", F_CardNo ?? "");
                    var list = await _publicService.GetList("base_mealcard_winform", F_EmployeeCode ?? "", F_CardNo ?? "");
                    var datainfo = new
                    {
                        form = form,
                        list = list,
                    };
                    result.code = 0;
                    result.data = datainfo;
                }
                else
                {
                    var datainfo = new
                    {
                        form = (object)null,
                        list = (object)null,
                    };
                    result.code = 0;
                    result.data = datainfo;
                }
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
