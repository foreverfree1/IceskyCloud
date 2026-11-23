using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Web.Areas.FileManage.Controllers;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SampleProofManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-03-17 15:00
    /// 描 述：来样登记控制器类
    /// </summary>
    [Area("SampleProofManage")]
    public class SamplelogController : BaseController
    {
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Samplelog";
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
            var data = await _publicService.GetLookListDynamic(pagination, "view_sap_register", keyword ?? "");
            return Content(data);
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLikeListJson(string keyword)
        {
            var data = await _publicService.GetList("view_sap_register_like", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLikeColornoListColornoJson(string PrimaryId, string keyword)
        {
            var data = await _publicService.GetList("view_sap_register_colorno_like", PrimaryId ?? "", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _publicService.GetList("view_sap_register", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListColorJson(string keyword)
        {
            var data = await _publicService.GetList("view_sap_register_colorno_color", keyword ?? "");
            var form = await _publicService.GetForm("view_sap_register_detail", keyword ?? "");
            var result = new
            {
                form = form,
                data = data,
            };
            return Content(result.ToJson());
        }


        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetColorSchemeJson(string code)
        {
            var data = await _publicService.GetList("sap_ColorScheme_first", code ?? "", "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetColorComponentJson(string code)
        {
            var data = await _publicService.GetList("sap_Component_first", code ?? "", "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetProportionComponentJson(string code)
        {
            var data = await _publicService.GetList("sap_Component_first", code ?? "", "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListByCusCodeJson(string keyword, string matcode, string localfactory, string colorscheme, string component, string param)
        {
            JObject paramobj;
            try { paramobj = JObject.Parse(param); }
            catch { paramobj = new JObject(); }
            var data = await _publicService.GetList("view_sap_registercolor_list", keyword ?? "", matcode ?? "", localfactory ?? "", colorscheme ?? "", component ?? "", paramobj["keyword"].ParseToString() ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetSubCompanyJson(string keyword)
        {
            var data = await _publicService.GetList("sys_organize_subcompany", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetComponentNumJson(string keyword)
        {
            var data = await _publicService.GetList("view_base_componentnumchange", keyword ?? "");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetMaxColorNo()
        {
            var data = await _publicService.GetForm("view_sap_register_newcolorno");
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {

            var formJson = await _publicService.GetFormDynamic("view_sap_register_first", keyValue);
            var colornoJson = await _publicService.GetListDynamic("sap_registercolor_list", keyValue);
            var componentJson = await _publicService.GetListDynamic("sap_registercom_list", keyValue);

            var result = new
            {
                form = string.IsNullOrEmpty(formJson) ? null : JToken.Parse((formJson as string) ?? "null"),
                colornolist = colornoJson == "[]" ? null : JToken.Parse(colornoJson ?? "[]"),
                componentlist = JToken.Parse(componentJson ?? "[]")
            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormDetailsJson(string keyValue)
        {
            var data = await _publicService.GetList("view_sap_register_detail", keyValue);
            var colorno = await _publicService.GetList("sap_registercolor_list", keyValue);
            var result = new
            {
                form = data.FirstOrDefault(),
                colornolist = colorno
            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormStatusJson(string keyValue)
        {
            var data = await _publicService.GetList("view_sap_register_Status", keyValue);
         
            return Content(data.ToJson());
        }

        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode, List<string> urlList)
        {
            try
            {
                var result = await new UploadfileController().Deletes(urlList);
                var Id = string.Empty;
                Id = await _publicService.SubmitForm(model, enCode, keyValue);
                //if (result)
                //{
                //    Id = await _publicService.SubmitForm(model, enCode, keyValue);
                //}
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
                var deleteUrl = new List<string>();
                var colornolist = await _publicService.GetList("sap_registercolor_list", keyValue);
                colornolist.ForEach(p =>
                {
                    var model = JObject.Parse(p.ToJson());
                    deleteUrl.Add(model["F_Photo"].ParseToString());
                });
                var result = await new UploadfileController().Deletes(deleteUrl);
                //if (result)
                //{
                //    var dicts = new Dictionary<string, string>()
                //    {
                //        { "sap_register", "F_Id" },
                //        { "sap_register_colorno", "F_PrimaryId" },
                //        { "sap_register_component", "F_PrimaryId" }
                //    };
                //    await _publicService.DeleteForm(dicts, "NF-delete", keyValue);
                //}
                var dicts = new Dictionary<string, string>()
                    {
                        { "sap_register", "F_Id" },
                        { "sap_register_color", "F_PrimaryId" },
                        { "sap_register_com", "F_PrimaryId" }
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
