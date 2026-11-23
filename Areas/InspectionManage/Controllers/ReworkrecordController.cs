using IceskyCloud.Code;
using IceskyCloud.Code.Model;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.InspectionManage.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-05-25
    /// 描述：厂内回修通知单控制器
    /// </summary>
    [Area("InspectionManage")]
    public class ReworkrecordController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Reworkrecord";
                field = value;
            }
        }

        //[HttpGet]
        //[HandlerAuthorize]
        //public override ActionResult Form()
        //{
        //    ViewBag.UserId = _publicService.currentuser.UserId;
        //    ViewBag.UserName = _publicService.currentuser.UserName;
        //    ViewBag.UserCode = _publicService.currentuser.UserCode;
        //    ViewBag.Organize = _publicService.currentuser.OrganizeId;
        //    return View();
        //}

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
            var data = await _publicService.GetLookListDynamic(pagination, "view_ins_reworkrecord", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form = await _publicService.GetList("view_ins_reworkrecord_Id", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
            };
            return Content(result.ToJson());
        }

        /// <summary>
        /// 获取部门名称
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public async Task<ActionResult> GetOrganize(string F_Id)
        {
            var data = await _publicService.GetForm("sys_organize_Id", F_Id);
            return Content(data.ToJson());
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
                    { "ins_reworkrecord", "F_Id" },
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
