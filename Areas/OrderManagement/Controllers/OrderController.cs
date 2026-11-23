using IceskyCloud.Code;
using IceskyCloud.Domain.OrderManagement;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.OrderManagement;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Areas.OrderManagement.Controllers
{

    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2021-07-12 20:41
    /// 描 述：订单管理控制器类
    /// </summary>
    [Area("OrderManagement")]
    public class OrderController : BaseController
    {
        public OrderService _service { get; set; }

        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "Order";
                field = value;
            }
        }

        [HttpGet]
        [HandlerAuthorize]
        public override ActionResult Index()
        {
            return View();
        }
        #region 获取数据

        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetGridJson(SoulPage<dynamic> pagination, string keyword)
        {
            if (string.IsNullOrEmpty(pagination.field))
            {
                pagination.field = "F_NeedTime";
                pagination.order = "asc";
            }
            var data = await _publicService.GetLookListDynamic(pagination, "view_crm_order", keyword ?? "");
            return Content(data);
            //var data = await _publicService.GetLookList(pagination, "Grid", keyword ?? "");
            //var a = Content(pagination.setData(data).ToJson());
            //return a;
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
            var form = await _publicService.GetList("crm_order", keyValue);
            var detail = await _publicService.GetList("crm_orderdetail", keyValue);
            var result = new
            {
                form = form.FirstOrDefault(),
                list = detail
            };
            return Content(result.ToJson());
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetBtns()
        {
            // var html = '[{"id":"NF-edit", "class":"layui-btn layui-btn-xs layui-btn-warm", "title":"修改", "event": "edit", "condition":"d.F_Status == \"0\" && #CurrentUserId == d.F_CreatorUserId"},{"id":"NF-add", "class":"layui-btn layui-btn-xs layui-btn-warm", "title":"增加", "event": "add", "condition":""}]';
            var btns = new object[]
            {
                new
                {
                    Id = "NF-edit",
                    Class = "layui-btn layui-btn-xs layui-btn-warm",
                    Title = "修改",
                    Event = "edit",
                    Condition = CreateCondition<OrderEntity>("F_OrderState == '1' && #CurrentUserId == F_CreatorUserId")
                },
                new
                {
                    Id = "NF-add",
                    Class = "layui-btn layui-btn-xs layui-btn-warm",
                    Title = "增加",
                    Event = "add",
                    Condition = ""
                }
            };
            return Success(btns.ToJson());
        }

        private string CreateCondition<T>(string Condition)
        {
            foreach (var item in typeof(T).GetProperties())
            {
                Condition = Condition
                    .Replace(item.Name, $"d.{item.Name}");
            }
            return Condition;
        }

        #endregion 获取数据

        #region 提交数据


        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string encode)
        {
            try
            {
                var Id = await _publicService.SubmitForm(model, encode, keyValue);
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
                    { "crm_order", "F_Id" },
                    { "crm_orderdetail", "F_PrimaryId" }
                };
                await _publicService.DeleteForm(dicts, "NF-delete", keyValue);
                return await Success("操作成功。", "", "", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, "", keyValue, DbLogType.Delete);
            }
        }



        #endregion 提交数据
    }
}