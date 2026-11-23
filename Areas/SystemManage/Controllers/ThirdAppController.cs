using IceskyCloud.Code;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Service.SystemManage;
using IceskyCloud.Web.Areas.FileManage.Controllers;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2022-10-06 14:11
    /// 描 述：打印模板控制器类
    /// </summary>
    [Area("SystemManage")]
    public class ThirdAppController : BaseController
    {
        public ThirdAppService _service { get; set; }

        #region 获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<ThirdAppEntity> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_Id";
                pagination.order = "desc";
            }
            var data = await _service.GetLookList(pagination, keyword);
            return Content(pagination.setData(data).ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string keyword)
        {
            var data = await _service.GetList(keyword);
            return Content(data.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string keyValue)
        {
            var data = await _service.GetLookForm(keyValue);
            return Content(data.ToJson());
        }
        #endregion

        #region 提交数据
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(ThirdAppEntity entity, string keyValue, List<string> deleteUrl)
        {
            try
            {
                var result = await new UploadfileController().Deletes(deleteUrl);
                await _service.SubmitForm(entity, keyValue);
                return await Success("操作成功。", "", "", keyValue);
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
                var deleteurl = new List<string>();
                foreach (var id in keyValue.Split(','))
                {
                    var model = await _service.GetLookForm(id);
                    if (!string.IsNullOrEmpty(model.F_StartPackage))
                        deleteurl.Add(model.F_StartPackage);
                    if (!string.IsNullOrEmpty(model.F_UpdatePackage))
                        deleteurl.Add(model.F_UpdatePackage);
                }
                await new UploadfileController().Deletes(deleteurl);
                await _service.DeleteForm(keyValue);
                return await Success("操作成功。", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Delete);
            }
        }

        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        public async Task<ActionResult> DisabledForm(string keyValue, bool Status = false)
        {
            try
            {
                var data = await _service.GetLookForm(keyValue);
                data.F_DeleteMark = Status;
                await _service.Update(data);
                return await Success("操作成功。", "", "", keyValue, DbLogType.Other);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Other);
            }
        }
        #endregion
    }
}
