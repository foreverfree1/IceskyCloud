using IceskyCloud.Code;
using IceskyCloud.Code.Model;
using IceskyCloud.Domain.Api;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Org.BouncyCastle.Asn1.Pkcs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web
{
    [Authorize]
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class BaseEquipController : ControllerBase
    {
        public PublicService _publicService 
        {
            get; set
            {
                value.moduleEnCode = "Processswipe";
                field = value;
            }
        }

        /// <summary>
        /// 获取最新一条刷卡信息
        /// </summary>
        /// <param name="F_ProcessCode"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetLatestEquip(string F_ProcessCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("view_prod_latestprocesscard", F_ProcessCode ?? "");
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
        /// 根据流程卡号，执行染色第一步骤
        /// </summary>
        /// <param name="F_ProcessCode">流程卡号</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> ExecuteTheProcess(string F_ProcessCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                // 获取最新一条刷卡信息
                var data = await _publicService.GetForm("view_prod_latestprocesscard", F_ProcessCode ?? "");
                // 将动态对象转为 JSON 字符串
                string json = JsonConvert.SerializeObject(data);

                // 将 JSON 字符串反序列化为强类型的 EquipList
                EquipList equip = JsonConvert.DeserializeObject<EquipList>(json);
                if (equip.F_NextProcess == "染色" && equip.F_NowProcess == "染色")
                {
                    result.code = 1;
                    result.data = "染色工序已刷卡,请勿重复操作！";
                }
                else if (equip.F_NextProcess == "染色" && equip.F_NowProcess != "染色")
                {
                    equip.F_Id = Guid.NewGuid().ToString();
                    equip.F_NO = equip.F_NO + 1;
                    equip.F_EmployeeCode = "系统";
                    equip.F_StartTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                    equip.F_FnishiTime = null;
                    equip.F_PreviousProcess = equip.F_NowProcess;
                    equip.F_NowProcess = "染色";
                    equip.F_ActulWeight = null;
                    equip.F_CompletePercent = 0;
                    equip.F_MachineCode = null;

                    // 先将对象转为 JObject
                    JObject jo = JObject.FromObject(equip);
                    // 动态移除不需要的字段
                    jo.Remove("F_NextProcess");
                    //再转成 JSON 字符串
                    string jsonStr = jo.ToString();
                    var Id = await _publicService.SubmitForm(jsonStr, "NF-add", null);
                    result.code = 0;
                    result.data = Id;
                }
                else
                {
                    result.code = 1;
                    result.data = $"当前工序为{equip.F_NextProcess},禁止操作！";
                }
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        public class EquipList
        {
            public string F_Id { get; set; }
            public string F_PrimaryId { get; set; }
            public string F_ParentId { get; set; }
            public decimal? F_ActulWeight { get; set; }
            public string F_MachineCode { get; set; }
            public decimal? F_CompletePercent { get; set; }
            public string F_PreviousProcess { get; set; }
            public string F_NowProcess { get; set; }
            public string F_StartTime { get; set; }
            public string F_FnishiTime { get; set; }
            public string F_EmployeeCode { get; set; }
            public int? F_NO { get; set; }
            /// <summary>
            /// 下一工序
            /// </summary>
            public string F_NextProcess { get; set; }
        }

        /// <summary>
        /// 获取车号重量
        /// </summary>
        /// <param name="F_CardNo">车号</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetCarHeight(string F_CardNo)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("ItemsView", F_CardNo ?? "");
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
        /// 获取人员信息
        /// </summary>
        /// <param name="F_EmployeeNo">员工工号</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetEmployeeInfo(string F_EmployeeNo)
        {
            ApiResult result = new ApiResult();
            try
            {
                //F_EmployeeNo = $" and F_EmployeeNo='{F_EmployeeNo}'";
                //var data = await _publicService.GetForm("view_base_employeeinfo", F_EmployeeNo ?? "");
                var data = await _publicService.GetForm("view_base_employeeinfo_winform", F_EmployeeNo ?? "");
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
        /// 获取工序刷卡扫描次数
        /// </summary>
        /// <param name="F_ProcessName">工序名称</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetScanCount(string F_ProcessName)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("base_processmaintenance_winform", F_ProcessName ?? "");
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
        public async Task<ApiResult> SubmitForm([FromBody]string model, string keyValue, string enCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var Id = await _publicService.SubmitForm(model, enCode, keyValue);
                result.code = 0;
                result.data= Id;
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
