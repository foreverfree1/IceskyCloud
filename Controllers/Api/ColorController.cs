using IceskyCloud.Code.Model;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Controllers.Api
{
    [Authorize]
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class ColorController : ControllerBase
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "ColorManager";
                field = value;
            }
        }

        /// <summary>
        /// 提交数据
        /// </summary>
        /// <param name="model"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<ApiResult> SubmitForm([FromBody] object model)
        {
            ApiResult result = new ApiResult();
            try
            {
                _publicService.Db.Ado.BeginTran();
                JObject obj = JObject.Parse(model.ToString());

                // 提取 StandList 数组（JArray）
                JArray standList = (JArray)obj["StandList"];
                var standDict = standList.ToObject<List<Dictionary<string, object>>>();

                JArray actlList = (JArray)obj["ActlList"];
                var actlDict = actlList.ToObject<List<Dictionary<string, object>>>();

                JArray resutList = (JArray)obj["ResutList"];
                var resutDict = resutList.ToObject<List<Dictionary<string, object>>>();
                var stand =  _publicService.Db.Insertable(standDict).AS("col_colormanager_stand").ExecuteCommand();
                var actl =  _publicService.Db.Insertable(actlDict).AS("col_colormanager_actl").ExecuteCommand();
                var resut =  _publicService.Db.Insertable(resutDict).AS("col_colormanager_resut").ExecuteCommand();
                result.code = 0;
                result.data = true;
                _publicService.Db.Ado.CommitTran();
            }
            catch
            {
                _publicService.Db.Ado.RollbackTran();
                result.code = 805;
                result.data = null;
            }
            return result;
        }

        /// <summary>
        /// 获取到主表Id
        /// </summary>
        /// <param name="ColorNo"></param>
        /// <param name="ProcessCode"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetColor(string ColorNo,string ProcessCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                // string sql = $"select * from view_col_colormanager where  F_ColorNo = '{ColorNo}' and F_ProcessCode = '{ProcessCode}'";
                var data = _publicService.Db.Queryable<dynamic>().AS("view_col_colormanager").Where("F_ColorNo = @ColorNo and F_ProcessCode = @ProcessCode",new { ColorNo = ColorNo, ProcessCode = ProcessCode }).Select("*").Take(1).ToList();
                string Id = null;
                if (data != null && data.Count > 0)
                {
                    Id = data[0].F_Id;
                }
                result.code = 0;
                result.data = Id;
            }
            catch
            {
                result.code = 805;
                result.data = null;
            }
            return result;
        }
    }
}
