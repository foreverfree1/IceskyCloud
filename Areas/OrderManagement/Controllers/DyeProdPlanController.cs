using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.OrderManagement.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-10-08 08:50
    /// 描 述：染色排产控制器类
    /// </summary>
    [Area("OrderManagement")]
    public class DyeProdPlanController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "DyeProdPlan";
                field = value;
            }
        }

        /// <summary>
        /// 修改位置
        /// </summary>
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> UpdateSortCode(string fieldName, string fieldValue, string keyValue)
        {
            try
            {
                await _publicService.UpdateIndex(fieldName, fieldValue, keyValue);
                return await Success("操作成功。", keyValue, "DyeProdPlanController");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "DyeProdPlanController", keyValue);
            }
        }
    }
}
