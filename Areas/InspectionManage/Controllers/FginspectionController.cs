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
    public class FgInspectionController :  BaseController
    {

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "FgInspection"; 
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_ins_fginspection", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ins_fginspection", keyword ?? "");
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetEquipListIdListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ins_fginspection_EquipListId", keyword ?? "");
            return Content(data.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetPassListJson(string keyword)
        {
            var data = await _publicService.GetList("view_ins_fginspection_pass", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var form  = await _publicService.GetList("view_ins_fginspection_first", keyValue);
            var list1 = await _publicService.GetList("ins_fginspectionI_list", keyValue);
            var list2 = await _publicService.GetList("ins_fginspectionII_list", keyValue);
            var list3 = await _publicService.GetList("ins_fginspectionIII_list", keyValue);
            var list4 = await _publicService.GetList("ins_fginspectionIV_list", keyValue);
            var list5 = await _publicService.GetList("ins_fginspectionV_list", keyValue);
            var list6 = await _publicService.GetList("ins_fginspectionVI_list", keyValue);
            var list7 = await _publicService.GetList("ins_fginspectionVII_list", keyValue);
            var list8 = await _publicService.GetList("ins_fginspectionVIII_list", keyValue);
            var result = new
            {
                main = form.FirstOrDefault(),
                list1 = list1.FirstOrDefault(),
                list2 = list2.FirstOrDefault(),
                list3 = list3.FirstOrDefault(),
                list4 = list4.FirstOrDefault(),
                list5 = list5.FirstOrDefault(),
                list6 = list6.FirstOrDefault(),
                list7 = list7.FirstOrDefault(),
                list8 = list8

            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLlistJson(string keyValue)
        {
            var Llist = await _publicService.GetList("view_ins_fginspectionL_list", keyValue);
            return Content(Llist.ToJson());
        }
        #endregion




        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSClistJson(string keyword)
        {
            if (string.IsNullOrEmpty(keyword))
            {
                keyword = "";
            }

            var Llist = await _publicService.GetList("view_prod_processcard_JY", keyword);
            return Content(Llist.ToJson());
        }

        #region 提交数据
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetColor(string keyValue)
        {
            var Llist = await _publicService.GetList("View_baseinfo", keyValue);
            return Content(Llist.ToJson());
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
                    { "ins_fginspection", "F_Id" },
                    { "ins_fginspection_size", "F_PrimaryId" },
                    { "ins_fginspection_color", "F_PrimaryId" },
                    { "ins_fginspection_defect", "F_PrimaryId" },
                    { "ins_fginspection_feel", "F_PrimaryId" },
                    { "ins_fginspection_fast", "F_PrimaryId" },
                    { "ins_fginspection_phys", "F_PrimaryId" },
                    { "ins_fginspection_safe", "F_PrimaryId" },
                    { "ins_fginspection_resut", "F_PrimaryId" },

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
