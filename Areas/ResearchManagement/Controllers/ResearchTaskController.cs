using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.ResearchManagement.Controllers
{
    /// <summary>
    /// 创建
    /// 日期：2026-04-28
    /// 描述：研发任务控制器
    /// </summary>
    [Area("ResearchManagement")]
    public class ResearchTaskController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "ResearchTask";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_rd_devtask", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("rd_devtask", keyword ?? "");
            return Content(data.ToJson());
        }

 

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {

            var form = await _publicService.GetForm("rd_devtask", keyValue);
            var list = await _publicService.GetList("rd_devtask_list", keyValue);
            var result = new
            {
                form = form,
                list = list,

            };
            return Content(result.ToJson());
        }

        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode)
        {
            try
            {
                var Id = await _publicService.SubmitForm(model, enCode, keyValue);
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
