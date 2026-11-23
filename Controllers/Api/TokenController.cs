using IceskyCloud.Code;
using IceskyCloud.Code.Model;
using IceskyCloud.Service.SystemManage;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace IceskyCloud.Web
{
    [ApiController]
    [Route("[controller]")]
    public class TokenController : ControllerBase
    {
        public ThirdAppService _service { get; set; }
        /// <summary>
        /// 获取授权Token
        /// </summary>
        /// <param name="appId"></param>
        /// <param name="appSecret"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<object> Index(string appId, string appSecret)
        {
            var expires = 7200;
            if (await _service.Existed(appId, appSecret))
            {
                var token = JwtHelper.CreateJwtToken(appId, appSecret, expires);
                return new BaseApiToken()
                {
                    access_token = token,
                    expires_in = expires
                };
            }
            else
                return new ApiResult() { code = 803 };
        }
    }
}