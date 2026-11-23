using IceskyCloud.Code;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.OrderManagement;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.DyestuffManagement.Controllers
{
    /// <summary>
    /// 创建：lx
    /// 日期：2026-05-28
    /// 描述：染化料分仓库用料查询控制器
    /// </summary>
    [Area("DyestuffManagement")]
    public class Query_DyesubstockoutController : BaseController
    {
        public OrderService _service { get; set; }

        public PublicService _publicService
        {
            get;
            set
            {
                value.moduleEnCode = "Query_Dyesubstockout";
                field = value;
            }
        }

        /// 分页获取数据
        /// <param name="pagination"></param>
        /// <param name="keyword"></param>
        /// <returns></returns>
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_CreatorTime";
                pagination.order = "desc";
            }
            var data = await _publicService.GetLookListDynamic(pagination, "view_query_dyesubstockout", keyword ?? "");
            return Content(data);
        }
    }
}
