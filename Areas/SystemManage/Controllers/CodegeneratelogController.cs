using IceskyCloud.Code;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Service.SystemManage;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.SystemManage.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2022-10-06 14:18
    /// 描 述：条码生成记录控制器类
    /// </summary>
    [Area("SystemManage")]
    public class CodegeneratelogController : BaseController
    {
        public CodegeneratelogService _service { get; set; }

        #region 获取数据
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<CodegeneratelogEntity> pagination, string keyword)
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
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> Reprint(string keyValue, int count = 1)
        {
            var data = await _service.Reprint(keyValue, count);
            return Content(data.ToJson());
        }
        #endregion

        #region 提交数据

        #endregion
    }
}
