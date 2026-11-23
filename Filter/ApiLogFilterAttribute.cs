using IceskyCloud.Code;
using IceskyCloud.Domain.SystemSecurity;
using IceskyCloud.Service.SystemSecurity;
using Microsoft.AspNetCore.Mvc.Filters;
using NUglify.Helpers;
using SqlSugar;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

namespace IceskyCloud.Web
{
    public class ApiLogFilterAttribute : ActionFilterAttribute
    {
        private readonly ISqlSugarClient _context;

        public ApiLogFilterAttribute(ISqlSugarClient context)
        {
            _context = context;
        }

        ApiLogEntity apiLog = new();

        public override void OnActionExecuting(ActionExecutingContext context)
        {
            // 只记录API请求
            if (!context.HttpContext.Request.Path.StartsWithSegments("/api"))
            {
                return;
            }
            var token = context.HttpContext.Request.Headers["Authorization"];
            if (!string.IsNullOrEmpty(token))
            {
                token = token.ToString().Substring("Bearer ".Length).Trim();
                apiLog.F_AppId = JwtHelper.GetUserInfo(token)?.Payload["appId"].ToString();
            }
            var stopwatch = Stopwatch.StartNew();
            var originalBodyStream = context.HttpContext.Response.Body;

            try
            {
                var paramList = new List<object>();
                if (context.HttpContext.Request.Method == "GET")
                {
                    paramList.Add(context.ActionArguments);
                }
                else
                {
                    context.ActionDescriptor.Parameters.ForEach(p =>
                    {
                        paramList.Add(context.ActionArguments[p.Name]);
                    });
                }
                apiLog.F_RequestTime = DateTime.Now;
                // 读取请求体
                apiLog.F_RequestParams = paramList.ToJson();
                apiLog.F_RequestUrl = context.HttpContext.Request.Path.ToString();

                // 读取用户信息(如果有)
                string userName = null;
                try
                {
                    var user = OperatorProvider.Provider.GetCurrent();
                    if (user != null)
                    {
                        apiLog.F_CreatorUserId = user.UserId;
                        userName = user.UserName;
                    }
                }
                catch { }

                // 使用MemoryStream来捕获响应体
                using (var responseBodyStream = new MemoryStream())
                {
                    //context.HttpContext.Request.Body = responseBodyStream;
                    //await _next(context);
                    stopwatch.Stop();
                    // 读取响应体
                    responseBodyStream.Position = 0;
                    // 将响应体复制回原始流
                    responseBodyStream.CopyToAsync(originalBodyStream);
                }
            }
            catch
            {
                stopwatch.Stop();
                throw;
            }
            finally
            {
                context.HttpContext.Response.Body = originalBodyStream;
            }
            base.OnActionExecuting(context);
        }

        public override async void OnResultExecuted(ResultExecutedContext context)
        {
            // 执行后的代码可以在这里写
            if (!context.HttpContext.Request.Path.StartsWithSegments("/api"))
            {
                return;
            }
            ApiLogService _service = new ApiLogService(_context);
            apiLog.F_ResponseResult = context.Result.ToJson().ToJObject()["Value"] == null ? "" : context.Result.ToJson().ToJObject()["Value"].ToString();
            apiLog.F_ReturnTime = DateTime.Now;
            apiLog.F_CreatorTime = DateTime.Now;
            await _service.SubmitForm(apiLog);
            base.OnResultExecuted(context);
        }
    }
}