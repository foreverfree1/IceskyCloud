using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.PackageManagement.Controllers
{

    /// <summary>
    /// 创建：
    /// 日期：2026-05-04
    /// 描述：包装作业管理控制器
    /// </summary>
    [Area("PackageManagement")]
    public class PackagingHomeworkController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "PackagingHomework";
                field = value;
            }
        }
        //[HttpGet]
        //[HandlerAuthorize]
        //public override ActionResult Form()
        //{
        //    ViewBag.UserName = _publicService.currentuser.OrganizeId;
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_pack_packregister", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("pack_packregister", keyword ?? "");
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetEquipListIdListJson(string keyword)
        {
            var data = await _publicService.GetList("view_pack_packregister_EquipListId", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetProcessCodeListJson(string keyword)
        {
            var data = await _publicService.GetList("view_wch_fgstockout_list_list", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetPrimaryIdListJson(string keyword)
        {
            var data = await _publicService.GetList("pack_packregister_list", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {

            var form = await _publicService.GetForm("view_pack_packregister_first", keyValue);
            var list = await _publicService.GetList("pack_packregister_list", keyValue);
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

        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        public async Task<ActionResult> DeleteForm(string keyValue)
        {
            try
            {
                var dicts = new Dictionary<string, string>()
                    {
                        { "pack_packregister", "F_Id" },
                        { "pack_packregister_list", "F_PrimaryId" }
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
