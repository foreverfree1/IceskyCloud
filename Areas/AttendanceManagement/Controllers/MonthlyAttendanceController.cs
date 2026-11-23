using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using SqlSugar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.AttendanceManagement.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-12 13:56
    /// 描 述：考勤报表控制器类
    /// </summary>
    [Area("AttendanceManagement")]
    public class MonthlyAttendanceController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "MonthlyAttendance";
                field = value;
            }
        }
        #region 获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string EmployeeCode, string StartDay, string EndDay)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_EmployeeName,F_CardTime";
                pagination.order = "desc";
            }
            var data = await _publicService.GetLookListDynamic(pagination, "view_sche_month", EmployeeCode ?? "", EmployeeCode ?? "", EmployeeCode ?? "");
            return Content(data);
        }
        #endregion
    }
}
