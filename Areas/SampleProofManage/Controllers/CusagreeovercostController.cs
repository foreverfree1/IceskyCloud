using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SampleProofManage.Controllers
{
    /// <summary>
    /// 创建：
    /// 日期：2026-05-15
    /// 描述：客户色号超成本协议控制器
    /// </summary>
    [Area("SampleProofManage")]
    public class CusagreeovercostController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Cusagreeovercost";
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
                pagination.order = "asc";
            }
            var data = await _publicService.GetLookListDynamic(pagination, "view_sap_cusagreeovercost", keyword ?? "");
            return Content(data);
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _publicService.GetForm("sap_cusagreeovercost", keyValue);
            return Content(data.ToJson());
        }

        #endregion


        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string encode)
        {
            try
            {
                var Id = await _publicService.SubmitForm(model, encode, keyValue);
                return await Success("操作成功。", Id, "");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue);
            }
        }
        #endregion

    }
}
