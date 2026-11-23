using IceskyCloud.Code;
using IceskyCloud.Code.Model;
using IceskyCloud.Domain.Api;
using IceskyCloud.Domain.SystemSecurity;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemSecurity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NetTaste;
using SqlSugar;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web
{
    [Authorize]
    [Route("api/[controller]/[action]")]
    [ApiController]
    //[TypeFilter(typeof(MyActionFilter))]
    public class LogController : ControllerBase
    {
        public ThirdAppLogService _service { get; set; }
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "ThirdApp";
                field = value;
            }
        }

        /// <summary>
        /// 新增App日志
        /// </summary>
        /// <param name="requestParams"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<ApiResult> Add([FromBody] AppLogRequest requestParams)
        {
            ApiResult result = new ApiResult();
            try
            {
                ThirdAppLogEntity logEntity = new ThirdAppLogEntity();
                logEntity.F_AppId = requestParams.F_AppId;
                logEntity.F_ErrorInfo = requestParams.F_ErrorInfo;
                await _service.SubmitForm(logEntity, "");
                result.code = 0;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data= ex.ToString();
            }
            return result;
        }

        /// <summary>
        /// 获取应用最新安装包
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public async Task<ActionResult> GetUpdateInfo()
        {
            var token = Request.Headers["Authorization"].FirstOrDefault();
            token = token.ToString().Substring("Bearer ".Length).Trim();
            string appid = JwtHelper.GetUserInfo(token)?.Payload["appId"].ToString();
            var data = await _publicService.GetForm("view_thirdapp_update", appid ?? "");
            return Content(data.ToJson());
        }
    }
}
