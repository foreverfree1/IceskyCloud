using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Web.Areas.FileManage.Controllers;
using iTextSharp.text;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using static iTextSharp.text.pdf.AcroFields;

namespace IceskyCloud.Web.Areas.BaseManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-12 13:56
    /// 描 述：质量扣款条例控制器类
    /// </summary>
    [Area("BaseManage")]
    public class PayForQualityController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "PayForQuality";
                field = value;
            }
        }
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_base_payforquality", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_base_payforquality", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetPositionCodeFormJson(string F_DeptId, string F_ReworkReasonName)
        {
            var data = await _publicService.GetList("base_payforquality_cuscomplaint", F_DeptId ?? "", F_ReworkReasonName ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetDeptIdListJson(string F_DeptId, string keyword)
        {
            var data = await _publicService.GetList("base_payforquality_DeptId", F_DeptId ?? "", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string deptid, string reason)
        {
            var data = await _publicService.GetList("base_payforquality", deptid ?? "", reason.Replace("'", "''") ?? "");
            return Content(data.ToJson());
        }
        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(List<string> model, string deptid, string reason, string enCode)
        {
            try
            {
                var Id = "";
                if (!string.IsNullOrEmpty(deptid))
                    await DeleteFormCore(deptid, reason);   // 改调核心方法，异常直接冒上来
                foreach (var item in model)
                {
                    Id = await _publicService.SubmitForm(item, enCode);
                }
                return await Success("操作成功。", Id, "");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", deptid);
            }
        }

        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        public async Task<ActionResult> DeleteForm(string deptid, string reason)
        {
            try
            {
                await DeleteFormCore(deptid, reason);
                return await Success("操作成功。", "", "", deptid, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", deptid, DbLogType.Delete);
            }
        }

        /// <summary>删除核心逻辑：失败时抛异常，由调用方决定如何处理</summary>
        private async Task DeleteFormCore(string deptid, string reason)
        {
            var list = await _publicService.GetList("base_payforquality", deptid ?? "", reason ?? "");

            var dicts = new Dictionary<string, string>()
    {
        { "base_payforquality", "F_Id" }
    };
            foreach (dynamic item in list)
            {
                await _publicService.DeleteForm(dicts, "NF-delete", item.F_Id);
            }
        }
        #endregion
    }
}
