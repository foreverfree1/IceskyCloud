using IceskyCloud.Code;
using IceskyCloud.Code.Model;
using IceskyCloud.Code.Util;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemManage;
using IceskyCloud.Web.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace IceskyCloud.Web
{
    [Authorize]
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class PackTaskController : ControllerBase
    {
        public ModulePrintService _service { get; set; }
        public PublicController publicController { get; set; }
        public PublicService _publicService
        {
            get; set
            {
                value.moduleEnCode = "PackagingHomework";
                field = value;
            }
        }
        private readonly IWebHostEnvironment _env;

        public PackTaskController(IWebHostEnvironment env)
        {
            _env = env;
        }

        /// <summary>
        /// 打印标签
        /// </summary>
        /// <param name="request">
        ///   templateUrl: 模板url地址（如 printmodel.html）
        ///   data: 替换数据，key 为字段名，value 为替换值
        /// </param>
        [HttpPost]
        public async Task<ApiResult> PrintTags([FromBody] TemplateRequest request)
        {
            ApiResult result = new ApiResult();
            try
            {
                // 1. 获取模板文件实体

                var printmodel = await _service.GetForm(request.TemplateId);

                // 2. 读取 HTML 模板内容
                var html = printmodel.F_PrintContent;

                var returndata = new Dictionary<string, object>();

                // 3. 替换所有{FieldName}的字段
                var renderedHtml = ReplaceFields(html, request.Data, true);

                // 4. 替换所有 [[QRCODE:xxx]] 为二维码图片
                //renderedHtml = ReplaceQrcodeFields(renderedHtml, returndata.ToJson());
                //renderedHtml = renderedHtml.Replace("[[", "").Replace("]]", "");
                result.code = 0;
                result.data = renderedHtml;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.ToString();
            }
            return result;
        }

        /// <summary>
        /// 排序
        /// </summary>
        /// <param name="packNo"></param>
        /// <returns></returns>
        static int ExtractNumber(string packNo)
        {
            if (string.IsNullOrEmpty(packNo)) return 0;
            var match = Regex.Match(packNo, @"\d+");
            return match.Success ? int.Parse(match.Value) : 0;
        }

        /// <summary>
        /// 打印码单
        /// </summary>
        /// <param name="request">
        ///   templateUrl: 模板url地址（如 printmodel.html）
        ///   data: 替换数据，key 为字段名，value 为替换值
        /// </param>
        [HttpPost]
        public async Task<ApiResult> PrintBarcode([FromBody] BarcodeRequest request)
        {
            ApiResult result = new ApiResult();
            try
            {
                // 1. 获取模板文件实体

                var printmodel = await _service.GetForm(request.TemplateId);

                // 2. 读取 HTML 模板内容
                var renderedHtml = printmodel.F_PrintContent;

                //var printdata = await publicController.GetPrintJson("PackagingHomework", "9dbc46f1-619e-498e-b31c-ca4cb7e82a6e");
                var printdata = await publicController.GetPrintJson(request.ModuleEnCode, request.KeyValue);
                var datajson = (printdata as ContentResult)?.Content ?? "{}";

                // 解析 GetPrintJson 返回的 JSON：{ form: {主表字段}, 子表名: [...] }
                // 把主表 form 字段展开到 formdata，供 {F_xxx} 占位符直接按字段名替换
                var formdata = new Dictionary<string, object>();
                var printData = JObject.Parse(datajson);
                JArray subList = null;

                // 3. 判断 printData 除 form 之外是否还有其他 key（子表），有则遍历
                foreach (var prop in printData.Properties())
                {
                    if (prop.Name == "form")
                    {
                        if (printData["form"] is JObject formData)
                        {
                            foreach (var formprop in formData.Properties())
                            {
                                formdata[formprop.Name] = formprop.Value?.ToString() ?? "";
                            }
                        }

                        // 3. 替换所有{FieldName}的字段
                        renderedHtml = ReplaceFields(renderedHtml, formdata, true);
                        continue;
                    }

                    if (prop.Value is JArray arr) { subList = arr; break; }
                }

                if (subList != null && subList.Count > 0)
                {
                    subList = new JArray(subList.OrderBy(x => ExtractNumber(x["F_PackNo"]?.ToString() ?? "")));
                    // 4.1 匹配整张 table
                    var tableMatch = Regex.Match(renderedHtml, @"<table\b[^>]*>.*?</table>",
                        RegexOptions.Singleline | RegexOptions.IgnoreCase);
                    if (tableMatch.Success)
                    {
                        string tableHtml = tableMatch.Value;
                        string tableOpenTag = Regex.Match(tableHtml, @"<table\b[^>]*>", RegexOptions.IgnoreCase).Value;

                        // 4.2 判断是否码单表（is-code-sheet="true"）
                        if (Regex.IsMatch(tableOpenTag, @"is-code-sheet\s*=\s*""true""", RegexOptions.IgnoreCase))
                        {
                            // 4.3 取 max-col-rows（每列最大行数 = 表格行数）
                            int maxColRows = 12; // 模板没写时默认 12
                            var mcrMatch = Regex.Match(tableOpenTag, @"max-col-rows\s*=\s*""(?<v>\d+)""", RegexOptions.IgnoreCase);
                            if (mcrMatch.Success)
                                maxColRows = int.Parse(mcrMatch.Groups["v"].Value);

                            int rowNumber = maxColRows;
                            int colNumber = (subList.Count + rowNumber - 1) / rowNumber; // 列数向上取整

                            // 4.4 取表格内第一个 <td...>...</td> 作为单元格模板（保留占位符和 style）
                            //var tdTemplateMatch = Regex.Match(tableHtml, @"<td\b[^>]*>.*?</td>",
                            //    RegexOptions.Singleline | RegexOptions.IgnoreCase);
                            // 修正后的正则表达式
                            string pattern = @"<td\b[^>]*>(?:(?!</?td).)*?\{.*?\}(?:(?!</?td).)*?</td>";
                            Match tdTemplateMatch = Regex.Match(tableHtml, pattern, RegexOptions.Singleline | RegexOptions.IgnoreCase);
                            string tdTemplate = tdTemplateMatch.Success ? tdTemplateMatch.Value : "<td></td>";

                            // 4.5 按"先列后行"填充：第 c 列第 r 行 ← 记录下标 c * rowNumber + r
                            var sb = new System.Text.StringBuilder();
                            for (int r = 0; r < rowNumber; r++)
                            {
                                sb.Append("<tr>");
                                for (int c = 0; c < colNumber; c++)
                                {
                                    int idx = c * rowNumber + r;
                                    if (idx < subList.Count && subList[idx] is JObject rowData)
                                    {
                                        // 用该条子表记录替换 td 模板中的 {F_xxx} 占位符，生成单元格内容
                                        var rowValues = new Dictionary<string, object>();
                                        foreach (var p in rowData.Properties())
                                            rowValues[p.Name] = p.Value?.ToString() ?? "";
                                        sb.Append(ReplaceFields(tdTemplate, rowValues, false));
                                    }
                                    else if (colNumber != 1)
                                    {
                                        // 数据不足：补空单元格
                                        sb.Append("<td></td>");
                                    }
                                }
                                sb.Append("</tr>");
                            }

                            // 4.6 用新 tbody 重建表格并替换回 renderedHtml
                            string newTableHtml = tableOpenTag + "<tbody>" + sb + "</tbody></table>";
                            renderedHtml = renderedHtml.Replace(tableHtml, newTableHtml);
                        }
                        //判断是否启用明细
                        else if (Regex.IsMatch(tableOpenTag, @"is-list-table\s*=\s*""true""", RegexOptions.IgnoreCase))
                        {
                            // 明细模式：行模板 = 第一个含 {字段} 的 <tr>，
                            // 其上方的行保留为表头，下方的行保留为固定尾行
                            var trMatches = Regex.Matches(tableHtml, @"<tr\b[^>]*>.*?</tr>",
                                RegexOptions.Singleline | RegexOptions.IgnoreCase);

                            // 4A. 找第一个含 {xxx} 占位符的 tr 作为行模板
                            int tplIndex = -1;
                            for (int i = 0; i < trMatches.Count; i++)
                            {
                                if (Regex.IsMatch(trMatches[i].Value, @"\{[^}]+\}"))
                                {
                                    tplIndex = i;
                                    break;
                                }
                            }

                            if (tplIndex >= 0)
                            {
                                string tplTr = trMatches[tplIndex].Value;

                                // 4B. 表头 = 模板行之前的行（原样保留）
                                var sbHead = new System.Text.StringBuilder();
                                for (int i = 0; i < tplIndex; i++)
                                    sbHead.Append(trMatches[i].Value);

                                // 4C. 复制 subList.Count 条行模板，每条用对应子表记录替换内容
                                var sbBody = new System.Text.StringBuilder();
                                for (int i = 0; i < subList.Count; i++)
                                {
                                    if (subList[i] is JObject rowData)
                                    {
                                        // 行数据 = 主表字段 + 子表行字段（行覆盖主表）+ 行号
                                        var rowValues = new Dictionary<string, object>(formdata);
                                        foreach (var p in rowData.Properties())
                                            rowValues[p.Name] = p.Value?.ToString() ?? "";
                                        rowValues["RowNumber"] = (i + 1).ToString();

                                        // 该 tr 属于 table 内部内容，逐条替换占位符
                                        sbBody.Append(ReplaceFields(tplTr, rowValues, false));
                                    }
                                }

                                // 4D. 固定尾行 = 模板行之后的行（原样保留）
                                var sbFix = new System.Text.StringBuilder();
                                for (int i = tplIndex + 1; i < trMatches.Count; i++)
                                    sbFix.Append(trMatches[i].Value);

                                // 4E. 用 表头 + 明细行 + 尾行 重建表格
                                string newTableHtml = tableOpenTag + "<tbody>" + sbHead + sbBody + sbFix + "</tbody></table>";
                                renderedHtml = renderedHtml.Replace(tableHtml, newTableHtml);
                            }
                        }
                    }
                }
                result.code = 0;
                result.data = renderedHtml;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.ToString();
            }
            return result;
        }

        /// <summary>
        /// 按"特殊 table"区分替换。特殊 table = 带 is-code-sheet="true" 或 is-list-table="true" 属性的 &lt;table&gt;：
        ///   isform=false → 只替换特殊 table 内部的内容（html 不含 table 时整段替换）
        ///   isform=true  → 替换特殊 table 之外的所有内容：&lt;table&gt; 外部 + 普通 table 内部
        /// </summary>
        [NonAction]
        private static string ReplaceFields(string html, Dictionary<string, object> data, bool isform)
        {
            if (data == null || data.Count == 0)
                return html;

            var pattern = @"\{(\w+)\}"; 
            string Replacer(Match match)
            {
                var fieldName = match.Groups[1].Value;
                if (data.TryGetValue(fieldName, out var value))
                    return value?.ToString() ?? "";
                return match.Value;
            }

            // 按 <table ...>...</table> 拆分：捕获组使奇数索引为 table 块，偶数索引为 table 外内容
            var parts = Regex.Split(html, @"(<table\b[^>]*>.*?</table>)",
                RegexOptions.Singleline | RegexOptions.IgnoreCase);

            // html 中没有 table：整段直接替换（isform 两个取值效果一致）
            if (parts.Length == 1)
                return Regex.Replace(html, pattern, Replacer);

            for (int i = 0; i < parts.Length; i++)
            {
                // 偶数索引：table 外内容 → 仅 isform=true 时替换
                if (i % 2 == 0)
                {
                    if (!isform)
                        continue;
                    parts[i] = Regex.Replace(parts[i], pattern, Replacer);
                    continue;
                }

                // 奇数索引：table 块 → 判断该 table 是否带 is-code-sheet="true" / is-list-table="true"
                bool isSpecialTable = false;
                var tagMatch = Regex.Match(parts[i], @"^<table\b[^>]*>", RegexOptions.IgnoreCase);
                if (tagMatch.Success)
                {
                    isSpecialTable =
                        Regex.IsMatch(tagMatch.Value, @"\bis-code-sheet\s*=\s*[""']?\btrue\b", RegexOptions.IgnoreCase) ||
                        Regex.IsMatch(tagMatch.Value, @"\bis-list-table\s*=\s*[""']?\btrue\b", RegexOptions.IgnoreCase);
                }

                // isform=false → 只替换特殊 table；isform=true → 跳过特殊 table（只替换普通 table）
                if (isSpecialTable == isform)
                    continue;
                parts[i] = Regex.Replace(parts[i], pattern, Replacer);
            }

            return string.Concat(parts);
        }

        /// <summary>
        /// 请求模型
        /// </summary>
        public class BarcodeRequest
        {
            /// <summary>模板Id</summary>
            public string TemplateId { get; set; } = "";

            /// <summary>模块EnCode</summary>
            public string ModuleEnCode { get; set; } = "";

            /// <summary>主键Id</summary>
            public string KeyValue { get; set; } = "";
        }

        /// <summary>
        /// 请求模型
        /// </summary>
        public class TemplateRequest
        {
            /// <summary>模板Id</summary>
            public string TemplateId { get; set; } = "";

            /// <summary>替换数据</summary>
            public Dictionary<string, object> Data { get; set; }
        }

        /// <summary>
        /// 提交数据
        /// </summary>
        /// <param name="model"></param>
        /// <param name="enCode"></param>
        /// <param name="F_Id"></param>
        /// <returns></returns>
        [HttpPost]
        [LoginFilter]
        public async Task<ApiResult> SubmitForm([FromBody] string model, string enCode, string F_Id)
        {
            ApiResult result = new ApiResult();
            try
            {
                var Id = await _publicService.SubmitForm(model, enCode, F_Id);
                result.code = 0;
                result.data = Id;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取员工信息
        /// </summary>
        /// <param name="F_EmployeeCode">工号</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetEmployeeInfo(string F_EmployeeCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("view_base_employeeinfo_StatusName", F_EmployeeCode ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取客户品名、成份布名、批次号
        /// </summary>
        /// <param name="F_BaseEquipId">主键Id</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetStockinInfo(string F_BaseEquipId)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetList("view_base_equip_stockin_combined_Id", F_BaseEquipId ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取打卷机
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetRollUpMachine(string F_EquipCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetList("base_equipmentledger_RollUpMachine", F_EquipCode ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取点色单信息
        /// </summary>
        /// <param name="F_Id">主键Id</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetSpotColor(string F_Id)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("view_ord_spotcolor_Id", F_Id ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取部门信息
        /// </summary>
        /// <param name="F_Id">主键Id</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetFullName(string F_Id)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("sys_organize_Id", F_Id ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取领班人员
        /// </summary>
        /// <param name="F_EmployeeNo">员工工号</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetForeMan(string F_EmployeeNo)
        {
            ApiResult result = new ApiResult();
            try
            {
                //string where = " and F_PostName like %班长%";
                //if (!string.IsNullOrEmpty(F_Name))
                //{
                //    where += $" and F_Name='{F_Name}'";
                //}
                var data = await _publicService.GetList("view_base_employeeinfo_PostName");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取数据字典Code
        /// </summary>
        /// <param name="F_EnCode">分类编号</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetItemCode(string F_EnCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetList("ItemsView_type", F_EnCode ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取点色单细表
        /// </summary>
        /// <param name="F_PrimaryId">主键Id</param>
        /// <param name="F_ColorNo">色号</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetSpotColorList(string F_PrimaryId, string F_ColorNo)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("view_ord_spotcolorList_IdColorNo", F_PrimaryId ?? "", F_ColorNo ?? "");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取设备列表信息
        /// </summary>
        /// <param name="F_ProcessCode">主键Id</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetEquipList(string F_ProcessCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetList("view_prod_processcard_ProcessCode", F_ProcessCode ?? "");
                //var list = await _publicService.GetList("view_pack_packregister_list_app", F_ProcessCode ?? "");
                result.code = 0;
                //result.data = (new { form = data, list = list }).ToJson();
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取设备列表信息
        /// </summary>
        /// <param name="F_ProcessCode">主键Id</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetList(string F_ProcessCode)
        {
            ApiResult result = new ApiResult();
            try
            {
                var form = await _publicService.GetForm("view_pack_packregister_app", F_ProcessCode ?? "");
                var list = await _publicService.GetList("view_pack_packregister_list_app", F_ProcessCode ?? "");
                result.code = 0;
                result.data = (new { form = form, list = list }).ToJson();
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// 获取包装作业打印模板
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetPackPrintList()
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetList("view_sys_moduleprint");
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }
        /// <summary>
        /// 获取部门名称
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public async Task<ApiResult> GetOrganize(string F_Id)
        {
            ApiResult result = new ApiResult();
            try
            {
                var data = await _publicService.GetForm("sys_organize_Id", F_Id);
                result.code = 0;
                result.data = data;
            }
            catch (Exception ex)
            {
                result.code = 805;
                result.data = ex.Message;
            }
            return result;
        }
    }
}
