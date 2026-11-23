using IceskyCloud.Code;
using IceskyCloud.Service;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Web.Areas.FileManage.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Principal;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.OrderManagement.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-17 15:00
    /// 描 述：来样登记控制器类
    /// </summary>
    [Area("OrderManagement")]
    public class SpotColorController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "SpotColor";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_ord_spotcolor", keyword ?? "");
            return Content(data);
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetViewListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ord_spotcolor_list", keyword);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetIdColorNoListJson(string keyword,string ColorNo)
        {
            var data = await _publicService.GetList("view_ord_spotcolorList_IdColorNo", keyword, ColorNo);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSpotIdJson(string keyword)
        {
            var data = await _publicService.GetForm("view_ord_spotcolor_Id", keyword);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetOrdListJson(string keyword)
        {
            var data = await _publicService.GetForm("view_ord_spotcolor_Id", keyword ?? "");
            var list = await _publicService.GetList("view_ord_spotcolor_list", keyword ?? "");
            var result = new
            {
                form = data,
                list = list,
            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetStatusJson(string keyword)
        {
            var data = await _publicService.GetList("view_ord_spotcolor_Status", keyword ?? "");
            return Content(data.ToJson());
        }
        
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetViewListInfoJson(string keyword)
        {
            var data = await _publicService.GetList("view_ord_spotcolorList", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ord_spotcolor", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _publicService.GetForm("view_ord_spotcolor_Id", keyValue);
            var colorlist = await _publicService.GetList("view_ord_spotcolor_list", keyValue);
            var sslist = await _publicService.GetList("ord_spotcolor_shrink", keyValue);
            var result = new
            {
                form = data,
                colorlist = colorlist,
                sslist = sslist
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
                        { "ord_spotcolor", "F_Id" },
                        { "ord_spotcolor_list", "F_PrimaryId" },
                        { "ord_spotcolor_shrink", "F_PrimaryId" }
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
