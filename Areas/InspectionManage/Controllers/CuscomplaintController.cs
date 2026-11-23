using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.InspectionManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-12 08:50
    /// 描 述：客户信息控制器类
    /// </summary>
    [Area("InspectionManage")]
    public class CuscomplaintController :  BaseController
    {

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Cuscomplaint";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_ins_cuscomplaint", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ins_cuscomplaint", keyword ?? "");
            return Content(data.ToJson());
        }



        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetPassListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ins_cuscomplaint_pass", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_ins_cuscomplaint_Id", keyValue);
            var Llist = await _publicService.GetList("view_ins_cuscomplaintL_list", keyValue);
            var Rlist = await _publicService.GetList("ins_cuscomplaintR_list", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                Llist = Llist,
                Rlist = Rlist
            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLlistJson(string keyValue)
        {
            var Llist = await _publicService.GetList("view_ins_cuscomplaintL_list", keyValue);
            return Content(Llist.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetDeptPostLlistJson(string keyValue)
        {
            var list = await _publicService.GetList("func_GetEmployeeDeptPost", keyValue);
            return Content(list.ToJson());
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

        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        public async Task<ActionResult> DeleteForm(string keyValue)
        {
            try
            {
                var dicts = new Dictionary<string, string>()
                {
                    { "ins_cuscomplaint", "F_Id" },
                    { "ins_cuscomplaint_card", "F_PrimaryId" },
                    { "ins_cuscomplaint_duty", "F_PrimaryId" }
                };
                await _publicService.DeleteForm(dicts, "NF-delete", keyValue);
                return await Success("操作成功。", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Delete);
            }
        }
        #endregion
    }
}
