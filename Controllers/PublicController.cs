using IceskyCloud.Code;
using IceskyCloud.Domain.Entity.Infrastructure;
using IceskyCloud.Domain.FlowManage;
using IceskyCloud.Domain.InfoManage;
using IceskyCloud.Domain.SystemManage;
using IceskyCloud.Service;
using IceskyCloud.Service.FlowManage;
using IceskyCloud.Service.InfoManage;
using IceskyCloud.Service.Infrastructure;
using IceskyCloud.Service.SystemManage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using MiniExcelLibs;
using Newtonsoft.Json.Linq;
using NUglify.Helpers;
using SqlSugar;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace IceskyCloud.Web.Controllers
{
    /// <summary>
    /// 创 建：超级管理员
    /// 日 期：2026-04-22 08:50
    /// 描 述：公共方法控制器类
    /// </summary>
    public class PublicController : BaseController
    {
        public PublicService _publicService { get; set; }
        public ModuleFieldsService _moduleFieldsService { get; set; }
        public ModuleDataService _moduleDataService { get; set; }
        public ModulePlanService _modulePlanService { get; set; }
        public MessageService _messageService { get; set; }
        public ModuleService _moduleService { get; set; }
        // 修改内容：拼流程完整打开地址时查流程实例
        public FlowinstanceService _flowinstanceService { get; set; }
        public DatabaseTableService _dbservice { get; set; }

        #region Index页面
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListJson(string enCode, string param, bool IsReferenced = false)
        {
            JObject paraList;
            try { paraList = JObject.Parse(param); }
            catch { paraList = []; }
            var data = await _publicService.GetList(enCode, paraList["keyword"] ?? "");
            if (IsReferenced)
                data.RemoveAt(0);
            return Content(data.ToJson());
        }

        /// <summary>
        /// 获取首页树形结构数据
        /// </summary>
        /// <param name="moduleEnCode">模块EnCode</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetTreeList(string moduleEnCode)
        {
            _publicService.moduleEnCode = moduleEnCode;
            var data = await _publicService.GetTreeList();
            return Content(data.ToJson());
        }

        [IgnoreAntiforgeryToken]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetReferenceListJson(SoulPage<dynamic> pagination, string enCode, string param, bool IsReferenced = false)
        {
            var moduledata = (await _moduleDataService.GetList()).FirstOrDefault(p => p.F_EnCode == enCode);
            var renameList = Array.Empty<string>();
            ModuleEntity singe = null;

            if (moduledata != null)
            {
                var modules = await _moduleService.GetList();
                singe = modules.FirstOrDefault(p =>
                    p.F_MainTable.ParseToString() == moduledata.F_ObjectName ||
                    p.F_MainView.ParseToString() == moduledata.F_ObjectName ||
                    p.F_TableName.ParseToString().Contains(moduledata.F_ObjectName));
                _publicService.moduleEnCode = singe?.F_EnCode;
                renameList = (moduledata.F_Rename ?? "").Split(',');
            }
            else
            {
                var modules = await _moduleService.GetList();
                singe = modules.FirstOrDefault(p =>
                    p.F_MainTable.ParseToString() == enCode ||
                    p.F_MainView.ParseToString() == enCode);
                _publicService.moduleEnCode = singe?.F_EnCode;
            }

            try
            {
                var keyword = "";
                var dic = new List<object>();

                if (!param.IsNullOrWhiteSpace())
                {
                    var paraList = JObject.Parse(param);
                    foreach (var prop in paraList.Properties())
                    {
                        var key = prop.Name;
                        var valueStr = prop.Value?.ToString();

                        if (key == "v")
                            continue;
                        if (key == "keyword")
                            keyword = valueStr;
                        else if (valueStr != "null")
                            dic.Add(valueStr);
                    }
                }

                if (!IsReferenced)
                    dic.Add(keyword);

                // 列表数据需要分页
                if (moduledata?.F_DataType == "1" || moduledata == null)
                {
                    if (!string.IsNullOrEmpty(singe?.F_Sort))
                    {
                        pagination.field = singe?.F_Sort.Replace("asc", "").Replace("desc", "").Trim();
                        pagination.order = singe?.F_Sort.Contains("desc") == true ? "desc" : "asc";
                    }
                    var data = await _publicService.GetLookListDynamic(pagination, singe?.F_UrlAddress.Contains("/Module/") == true ? null : enCode, [.. dic]);
                    return Content(data);
                }
                else
                {
                    var data = await _publicService.GetListDynamic(enCode, [.. dic]);
                    var list = JArray.Parse(data).Cast<JObject>().ToList();

                    // 字段过滤
                    if (moduledata.F_Fields != "*")
                    {
                        var fieldsToKeep = moduledata.F_Fields.Split(',')
                            .Where(r => !string.IsNullOrEmpty(r))
                            .Select(r => r.Trim())
                            .ToHashSet();

                        foreach (var item in list)
                        {
                            var propertiesToRemove = item.Properties()
                                .Where(p => !fieldsToKeep.Contains(p.Name))
                                .ToList();

                            foreach (var prop in propertiesToRemove)
                                prop.Remove();
                        }
                    }

                    // 字段重命名映射
                    var keyMapping = new Dictionary<string, string>();
                    foreach (var rename in renameList)
                    {
                        if (string.IsNullOrEmpty(rename))
                            continue;
                        var parts = rename.Split('|');
                        if (parts.Length < 2)
                            continue;
                        var renameCode = parts[0].Trim();
                        var renameName = parts[1].Trim();
                        if (!string.IsNullOrEmpty(renameName) && renameCode != renameName)
                            keyMapping[renameCode] = renameName;
                    }

                    foreach (var item in list)
                    {
                        if (item["F_ReNameCn"]?.ParseToString().Contains("hide") == true)
                        {
                            var templateObj = string.IsNullOrEmpty(item["F_Template"]?.ParseToString()) ? [] : JObject.Parse(item["F_Template"].ParseToString());
                            templateObj["isrefer"] = false;
                            item["F_Template"] = templateObj.ParseToString();
                        }

                        foreach (var mapping in keyMapping)
                        {
                            if (item.ContainsKey(mapping.Key))
                            {
                                item[mapping.Value] = item[mapping.Key];
                                item.Remove(mapping.Key);
                            }
                        }
                    }
                    return Content(list.ToJson());
                }
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, singe?.F_EnCode + "Controller", null, DbLogType.Visit);
            }
        }

        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetReferenceFormJson(string enCode, string keyValue)
        {
            var data = await _publicService.GetList(enCode, keyValue);
            return Content(data.ToJson());
        }

        /// <summary>
        /// 获取参照模块选中数据，用于回显
        /// </summary>
        /// <param name="ObjectName"></param>
        /// <param name="fieldName"></param>
        /// <param name="fieldValue"></param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormJson(string ObjectName, string fieldName, string fieldValue)
        {
            var data = await _publicService.GetFormData(ObjectName, fieldName, fieldValue);
            return Content((data as object).ToJson());
        }



        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> Import(string moduleEnCode)
        {
            try
            {
                //获取文件参数，创建临时文件，使用完成就删除
                var files = HttpContext.Request.Form.Files;
                var file = files.First();
                var fileName = ContentDispositionHeaderValue.Parse(file.ContentDisposition).FileName.Trim('"');
                if (string.IsNullOrEmpty(fileName))
                {
                    throw new Exception("文件不存在");
                }
                if (!FileHelper.IsExcel(fileName))
                {
                    throw new Exception("请上传Excel");
                }
                string filePath = GlobalContext.HostingEnvironment.WebRootPath + $@"/" + "file" + $@"/";
                fileName = Utils.CreateNo() + fileName.Substring(fileName.LastIndexOf("."));
                string fileFullName = filePath + fileName;
                if (!Directory.Exists(filePath))
                {
                    Directory.CreateDirectory(filePath);
                }
                using (FileStream fs = System.IO.File.Create(fileFullName))
                {
                    file.CopyTo(fs);
                    fs.Flush();
                }
                if (!FileHelper.IsExcel(fileFullName))
                {
                    throw new Exception("文件不是有效的Excel文件!");
                }
                var module = (await _moduleService.GetLookList()).FirstOrDefault(p => p.F_EnCode == moduleEnCode);
                //获取备注不为空的字段
                var descriptionfileds = (await _moduleFieldsService.GetLookList()).Where(p => p.F_ModuleId == module?.F_Id && !string.IsNullOrEmpty(p.F_FullName)).ToList();
                var rows = MiniExcel.Query(fileFullName).ToList(); // List<IDictionary<string, object>>，key 为 Excel 表头
                                                                   // ① 取第一行（其 Keys 即全部表头）与 descriptionfileds 比较，建立 表头名 → F_EnCode 映射
                var firstRow = rows.FirstOrDefault();
                var keyMap = new Dictionary<string, string>();
                if (firstRow != null)
                {
                    foreach (var kv in firstRow)
                    {
                        var field = descriptionfileds.FirstOrDefault(f => f.F_FullName == kv.Value);
                        if (field != null)
                        {
                            keyMap[kv.Key] = field.F_EnCode;
                        }
                    }
                }
                //删除第一行
                rows.RemoveAt(0);
                // ② 所有行统一替换：F_FullName 匹配的 Key 换成 F_EnCode，未匹配的保留原 Key
                var list = rows.Select(row =>
                {
                    var dict = new Dictionary<string, object>();
                    foreach (var kv in row)
                    {
                        dict[keyMap.TryGetValue(kv.Key, out string enCode) ? enCode : kv.Key] = kv.Value;
                    }
                    return dict;
                }).ToList();
                List<SugarParameter> inPars = new List<SugarParameter>
                {
                    new SugarParameter("entity", list.ToJson()),
                    new SugarParameter("state", null) { Direction = System.Data.ParameterDirection.Output },
                   new SugarParameter("message", null) { Direction = System.Data.ParameterDirection.Output }
                };
                var resultlist = await _publicService.GetStoredProcedureList("proc_UpdateFormalSalary", inPars);
                var result = JToken.Parse((resultlist.FirstOrDefault() as object).ToJson());
                if (result["state"].ParseToInt() == 3)
                    throw new Exception(result["message"].ParseToString());
                return Content(new { code = 0, msg = "操作成功" }.ToJson());
            }
            catch (Exception ex)
            {
                return Content(new { code = 400, msg = "操作失败," + ex.Message }.ToJson());
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="type">1:方案搜索 2:Index首页加载 3:快捷搜索</param>
        /// <param name="pagination">分页</param>
        /// <param name="moduleEnCode">模块EnCode</param>
        /// <param name="keyword">关键字</param>
        /// <param name="buttonEncode">搜索方案Code</param>
        /// <param name="filedName">快捷搜索字段（空则默认全部）</param>
        /// <param name="param">参数</param>
        /// <param name="enCode">数据源</param>
        /// <returns></returns>
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> GetTableJson(
            int type,
            SoulPage<dynamic> pagination,
            string moduleEnCode,
            string keyword,
            string buttonEncode,
            string filedName,
            string param,
            string enCode = null)
        {
            try
            {
                ModuleEntity module = (await _moduleService.GetLookList()).FirstOrDefault(p => p.F_EnCode == moduleEnCode);
                if (module == null)
                    return await Error("模块不存在", "", null, DbLogType.Visit);
                var mainView = module?.F_MainView;
                _publicService.moduleEnCode = moduleEnCode;

                var moduledata = (await _moduleDataService.GetList()).FirstOrDefault(p => p.F_EnCode == enCode);
                if (moduledata == null)//如果enCode在模块数据中找不到对应的记录
                {
                    enCode = null;//还是按模块主视图来查询,enCode传null即可
                }
                else
                {
                    mainView = moduledata.F_ObjectName;//如果传入了enCode,则快捷搜索的主视图改为data里面的对象，否则字段不存在会报做
                }    

                //方案搜索
                if (type == 1)
                {
                    // ===== 原 GetGridJson 逻辑 =====
                    if (string.IsNullOrEmpty(pagination.field))
                    {
                        pagination.field = "";
                        pagination.order = "";
                    }

                    var inPars = new List<SugarParameter>();
                    var moduleplan = (await _modulePlanService.GetLookList())
                        .FirstOrDefault(p => p.F_EnCode == buttonEncode);
                    var F_TreeId = "";
                    var whereBuilder = new StringBuilder();

                    if (!string.IsNullOrEmpty(keyword))
                    {
                        var dicList = JArray.Parse(keyword);
                        foreach (var p in dicList)
                        {
                            var field = p["field"].ParseToString();
                            var op = p["op"].ParseToString();
                            var value = p["value"].ParseToString();

                            if (module.F_IsNavi.ParseToBool() && field == "TreeId")//如果首页是树形结构
                            {
                                F_TreeId = value;
                            }
                            else if (field.StartsWith("Tree_"))//TableSelect树形结构查询
                            {
                                whereBuilder.Append(" and (");
                                value = value.Replace("‵", "");
                                for (int i = 0; i < value.Split(',').Length; i++)
                                {
                                    if (i == 0)
                                        whereBuilder.Append($" {field} like ‵%{value.Split(',')[i]}%‵");
                                    else
                                        whereBuilder.Append($" or {field} like ‵%{value.Split(',')[i]}%‵");
                                }
                                whereBuilder.Append(" )");
                            }
                            else
                            {
                                if (op == "=" && string.IsNullOrEmpty(value))
                                {
                                    whereBuilder.Append($" and ({field}='' or {field} is null)");
                                }
                                else
                                {
                                    // 拼接 where 条件
                                    whereBuilder.Append(op switch
                                    {
                                        "in" or "not in" => !string.IsNullOrEmpty(value) ? $" and {field} {op} ({value})" : "",
                                        "like" => !string.IsNullOrEmpty(value) ? $" and {field} {op} ‵%{value}%‵" : $" and ({field} {op} ‵%{value}%‵ or {field} is null)",
                                        "not like" => !string.IsNullOrEmpty(value) ? $" and {field} {op} ‵%{value}%‵" : "",
                                        "start" => $" and {field} like ‵{value}%‵",
                                        "end" => $" and {field} like ‵%{value}‵",
                                        "is null" => $" and {field} {op}",
                                        "is not null" => $" and {field} {op}",
                                        "is empty" => $" and {field} = ‵‵",
                                        "is not empty" => $" and {field} <> ‵‵",
                                        _ => $" and {field}{op}‵{value}‵",
                                    });
                                }
                            }
                        }
                    }

                    if (!string.IsNullOrEmpty(moduleplan?.F_Stored))
                    {
                        // 前置存储过程传参
                        inPars.Add(new SugarParameter("entity", whereBuilder.ToString().Replace("‵", "'")));
                        if (moduleEnCode == "StockSum")//库存汇总（tab页通用搜索查询视图不一样）
                        {
                            inPars.Add(new SugarParameter("dataview", enCode));
                        }
                    }
                    var data = module.F_IsNavi.ParseToBool()
                        ? await _publicService.SearchForm(pagination, buttonEncode, enCode, inPars, F_TreeId, whereBuilder.ToString())
                        : await _publicService.SearchForm(pagination, buttonEncode, enCode, inPars, whereBuilder.ToString());

                    // SearchForm 在模块未配置主视图等场景可能返回 "/" 或 ""，
                    // 直接返回会让前端表格报"返回的数据不符合规范"，这里兜底成空列表(格式同 BaseController.Success)
                    if (string.IsNullOrWhiteSpace(data) || data.Trim() == "\"\"")
                    {
                        return Success(0, new List<object>());
                    }
                    if((!string.IsNullOrEmpty(moduleplan?.F_Stored)))
                        data = (data as string).Replace("\\r\\n", "\r\n").Replace("\\r", "\r").Replace("\\n", "\n").Replace("\\t", "\t").Replace("\\\"", "\"").Replace("\\\\", "\\").Trim('"', '/');
                    return Content(data);
                }
                //Index首页加载
                else if (type == 2)
                {
                    keyword = "";
                    var dic = new List<object>();
                    if (!param.IsNullOrWhiteSpace())
                    {
                        var paraList = JObject.Parse(param);
                        foreach (var prop in paraList.Properties())
                        {
                            var key = prop.Name;
                            var valueStr = prop.Value?.ToString();

                            if (key == "v")
                                continue;
                            if (key == "keyword")
                                keyword = valueStr;
                            else if (valueStr != "null")
                                dic.Add(valueStr);
                        }
                    }
                    dic.Add(keyword);
                    pagination.field = module?.F_Sort.Replace("asc", "").Replace("desc", "").Trim();
                    pagination.order = module?.F_Sort.Contains("desc") == true ? "desc" : "asc";
                    var data = await _publicService.GetLookListDynamic(pagination, enCode, [.. dic]);
                    return Content(data);
                }
                //快捷搜索
                else if (type == 3)
                {
                    // ===== 原 GetQuickJson 逻辑 =====
                    var whereBuilder = new StringBuilder();
                    if (!string.IsNullOrEmpty(filedName))
                    {
                        whereBuilder.Append($" and {filedName} like ‵%{keyword}%‵");
                    }
                    else
                    {
                        var fieldList = (await _moduleFieldsService.GetLookList(moduleEnCode, "")).Where(p => p.F_EnabledMark == true);
                        fieldList = fieldList.Where(p => p.F_EnabledMark == true && JObject.Parse(p.F_Template == null ? "{}" : p.F_Template.ToString())?["filter"].ParseToString().ToLower() == "true");
                        List<string> filterArray = new List<string>();//需要过滤的字段(去掉Name或Code)
                        fieldList.ForEach(item =>
                        {
                            var name = item.F_EnCode.Replace("Name", "").Replace("Code", "");
                            if (!string.IsNullOrEmpty(name)) filterArray.Add(name);
                        });
                        List<SugarParameter> parameters = new List<SugarParameter>();
                        parameters.Add(new SugarParameter("ObjectName", mainView) { });
                        parameters.Add(new SugarParameter("UseLike", 0) { });
                        parameters.Add(new SugarParameter("ResultSetMode", 1) { });
                        SoulPage<DbObjectInfo> objpagination = new SoulPage<DbObjectInfo>();
                        objpagination.rows = 999999;
                        //获取主视图的所有字段
                        List<DbObjectInfo> dbObjects = await _dbservice.GetTablePageList(objpagination, "", parameters);
                        dbObjects = dbObjects.Where(p => !string.IsNullOrEmpty(p.F_ColumnName) && filterArray.Any(f => p.F_ColumnName.IndexOf(f, StringComparison.OrdinalIgnoreCase) >= 0)).ToList();
                        int index = 0;
                        if (dbObjects.Count() > 0) whereBuilder.Append(" and (");
                        dbObjects.ForEach(item =>
                        {
                            whereBuilder.Append(index++ == 0
                            ? $" {item.F_ColumnName} like ‵%{keyword}%‵"
                            : $" or {item.F_ColumnName} like ‵%{keyword}%‵");
                        });
                        if (dbObjects.Count() > 0) whereBuilder.Append(")");
                    }
                    var data = module.F_IsTree == 1
                        ? await _publicService.GetLookListDynamic(pagination, enCode, "", whereBuilder.ToString())
                        : await _publicService.GetLookListDynamic(pagination, enCode, whereBuilder.ToString());
                    return Content(data);
                }
                else
                {
                    return await Error("type 参数无效（仅支持 1 或 2 或 3）", "", null, DbLogType.Visit);
                }
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, (moduleEnCode ?? "") + "Controller", null, DbLogType.Visit);
            }
        }

        /// <summary>
        /// 根据控制器名称（含或不含 "Controller" 后缀）反射获取其 [Area] 特性值
        /// </summary>
        /// <param name="controllerName">控制器名，如 "Samplelog" 或 "SamplelogController"</param>
        /// <returns>Area 名称，如 "SampleProofManage"；找不到则返回 null</returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetControllerArea(string controllerName)
        {
            if (string.IsNullOrWhiteSpace(controllerName)) return null;

            var typeName = controllerName.EndsWith("Controller", StringComparison.OrdinalIgnoreCase)
                ? controllerName
                : controllerName + "Controller";

            return Content(_controllerAreaCache.TryGetValue(typeName, out var area) ? area : null);
        }

        #endregion

        #region Form页面

        /// <summary>
        /// 加载Form页面方法
        /// </summary>
        /// <param name="ModuleEnCode">模块EnCode</param>
        /// <param name="keyValue">主键Id</param>
        /// <param name="dataname">子表dataname数组 例：["wch_processstockin_list","wch_processstockin_list_list"]</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormsJson(string ModuleEnCode, string keyValue, string dataname)
        {
            _publicService.moduleEnCode = ModuleEnCode;
            var result = new Dictionary<string, object>();
            try
            {
                var form = await _publicService.GetFormData(keyValue);
                result["form"] = ((Dictionary<string, object>)form[0]).FirstOrDefault().Value;
            }
            catch (Exception)
            {
                //子表配得是视图，可能没有F_PrimaryId
                var module = (await _moduleService.GetList()).FirstOrDefault(p=>p.F_EnCode== ModuleEnCode);
                result["form"] = _publicService.Db.Queryable<object>().AS(module.F_MainView).Where("F_Id = '" + keyValue + "'").FirstAsync();
            }
            if (!string.IsNullOrEmpty(dataname))
            {
                var tableList = JArray.Parse(dataname);
                foreach (var item in tableList)
                {
                    var tableName = item.ParseToString(); // key：表名
                    result[tableName] = await _publicService.GetList(tableName, keyValue);
                }
            }
            return Content(result.ToJson());
        }

        /// <summary>
        /// 加载Print页面方法
        /// </summary>
        /// <param name="ModuleEnCode">模块EnCode</param>
        /// <param name="keyValue">主键Id</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetPrintJson(string ModuleEnCode, string keyValue)
        {
            _publicService.moduleEnCode = ModuleEnCode;
            List<Dictionary<string, object>> list = await _publicService.GetFormData(keyValue);
            var result = new Dictionary<string, object>();
            if (list == null || list.Count == 0)
            {
                return Content(result.ToJson());
            }

            // 第一项：主表 form
            result["form"] = list[0].FirstOrDefault().Value;

            // 其余项：每个字典的 Key 为子表名，Value 为数组
            // 目标结构：{ form: {...}, sap_registercolor_list: [...], sap_registercom_list: [...] }
            for (int i = 1; i < list.Count; i++)
            {
                foreach (var kv in list[i])
                {
                    if (string.IsNullOrEmpty(kv.Key)) continue;
                    result[kv.Key] = kv.Value;
                }
            }
            return Content(result.ToJson());
        }

        /// <summary>
        /// 获取多条模块数据（返回object类型）
        /// </summary>
        /// <param name="enCode">数据编码</param>
        /// <param name="param">参数 例：{arguments:["xx","yy"],keyword:""}</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetList(string enCode, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            object[] args = null;
            if (param != null && !string.IsNullOrEmpty(param))
            {
                JObject paramobj = JObject.Parse(param);
                // 如果 args 还是空，尝试从 param 中取 arguments
                if (args == null && paramobj["arguments"] != null)
                {
                    args = JArray.Parse(paramobj["arguments"].ToString()).ToObject<object[]>();
                }
                var keyword = paramobj["keyword"].ParseToString() ?? "";
                // 将 keyword 追加到 args 数组末尾
                if (paramobj["keyword"] != null)
                {
                    if (args != null)
                    {
                        args = args.Append(keyword).ToArray();
                    }
                    else
                    {
                        args = new object[] { keyword };
                    }
                }
            }

            var data = await _publicService.GetList(enCode, args);
            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// 获取多条模块数据（动态编译）
        /// </summary>
        /// <param name="enCode">数据编码</param>
        /// <param name="param">参数 例：{arguments:["xx","yy"],keyword:""}</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetListDynamic(string enCode, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            object[] args = null;
            if (param != null && !string.IsNullOrEmpty(param))
            {
                JObject paramobj = JObject.Parse(param);
                // 如果 args 还是空，尝试从 param 中取 arguments
                if (args == null && paramobj["arguments"] != null)
                {
                    args = JArray.Parse(paramobj["arguments"].ToString()).ToObject<object[]>();
                }
                var keyword = paramobj["keyword"].ParseToString() ?? "";
                // 将 keyword 追加到 args 数组末尾
                if (paramobj["keyword"] != null)
                {
                    if (args != null)
                    {
                        args = args.Append(keyword).ToArray();
                    }
                    else
                    {
                        args = new object[] { keyword };
                    }
                }
            }

            var data = await _publicService.GetListDynamic(enCode, args);
            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// 获取单条模块数据
        /// </summary>
        /// <param name="enCode">数据编码</param>
        /// <param name="param">参数 例：{arguments:["xx","yy"],keyword:""}</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetForm(string enCode, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            object[] args = null;
            if (param != null && !string.IsNullOrEmpty(param))
            {
                JObject paramobj = JObject.Parse(param);
                // 如果 args 还是空，尝试从 param 中取 arguments
                if (args == null && paramobj["arguments"] != null)
                {
                    args = JArray.Parse(paramobj["arguments"].ToString()).ToObject<object[]>();
                }
                var keyword = paramobj["keyword"].ParseToString() ?? "";
                // 将 keyword 追加到 args 数组末尾
                if (paramobj["keyword"] != null)
                {
                    if (args != null)
                    {
                        args = args.Append(keyword).ToArray();
                    }
                    else
                    {
                        args = new object[] { keyword };
                    }
                }
            }

            var data = await _publicService.GetForm(enCode, args);

            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// 获取单条模块数据（动态编译）
        /// </summary>
        /// <param name="enCode">数据编码</param>
        /// <param name="param">参数 例：{arguments:["xx","yy"],keyword:""}</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetFormDynamic(string enCode, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            object[] args = null;
            if (param != null && !string.IsNullOrEmpty(param))
            {
                JObject paramobj = JObject.Parse(param);
                // 如果 args 还是空，尝试从 param 中取 arguments
                if (args == null && paramobj["arguments"] != null)
                {
                    args = JArray.Parse(paramobj["arguments"].ToString()).ToObject<object[]>();
                }
                var keyword = paramobj["keyword"].ParseToString() ?? "";
                // 将 keyword 追加到 args 数组末尾
                if (paramobj["keyword"] != null)
                {
                    if (args != null)
                    {
                        args = args.Append(keyword).ToArray();
                    }
                    else
                    {
                        args = new object[] { keyword };
                    }
                }
            }

            var data = await _publicService.GetFormDynamic(enCode, args);
            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// 获取多条模块数据（返回dynamic类型）
        /// </summary>
        /// <param name="enCode">数据编码</param>
        /// <param name="param">参数 例：{arguments:["xx","yy"],keyword:""}</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLookList(string enCode, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            object[] args = null;
            if (param != null && !string.IsNullOrEmpty(param))
            {
                JObject paramobj = JObject.Parse(param);
                // 如果 args 还是空，尝试从 param 中取 arguments
                if (args == null && paramobj["arguments"] != null)
                {
                    args = JArray.Parse(paramobj["arguments"].ToString()).ToObject<object[]>();
                }
                var keyword = paramobj["keyword"].ParseToString() ?? "";
                // 将 keyword 追加到 args 数组末尾
                if (paramobj["keyword"] != null)
                {
                    if (args != null)
                    {
                        args = args.Append(keyword).ToArray();
                    }
                    else
                    {
                        args = new object[] { keyword };
                    }
                }
            }

            var data = await _publicService.GetLookList(enCode, args);
            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// 获取多条模块数据（分页）（返回dynamic类型）
        /// </summary>
        /// <param name="pagination">分页参数</param>
        /// <param name="enCode">数据编码</param>
        /// <param name="param">参数 例：{arguments:["xx","yy"],keyword:""}</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLookList(SoulPage<dynamic> pagination, string enCode, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            object[] args = null;
            if (param != null && !string.IsNullOrEmpty(param))
            {
                JObject paramobj = JObject.Parse(param);
                // 如果 args 还是空，尝试从 param 中取 arguments
                if (args == null && paramobj["arguments"] != null)
                {
                    args = JArray.Parse(paramobj["arguments"].ToString()).ToObject<object[]>();
                }
                var keyword = paramobj["keyword"].ParseToString() ?? "";
                // 将 keyword 追加到 args 数组末尾
                if (paramobj["keyword"] != null)
                {
                    if (args != null)
                    {
                        args = args.Append(keyword).ToArray();
                    }
                    else
                    {
                        args = new object[] { keyword };
                    }
                }
            }

            var data = await _publicService.GetLookList(pagination, enCode, args);
            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// 获取多条模块数据（分页）（动态编译）
        /// </summary>
        /// <param name="pagination">分页参数</param>
        /// <param name="enCode">数据编码</param>
        /// <param name="param">参数 例：{arguments:["xx","yy"],keyword:""}</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetLookListDynamic(SoulPage<dynamic> pagination, string enCode, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            object[] args = null;
            if (param != null && !string.IsNullOrEmpty(param))
            {
                JObject paramobj = JObject.Parse(param);
                // 如果 args 还是空，尝试从 param 中取 arguments
                if (args == null && paramobj["arguments"] != null)
                {
                    args = JArray.Parse(paramobj["arguments"].ToString()).ToObject<object[]>();
                }
                var keyword = paramobj["keyword"].ParseToString() ?? "";
                // 将 keyword 追加到 args 数组末尾
                if (paramobj["keyword"] != null)
                {
                    if (args != null)
                    {
                        args = args.Append(keyword).ToArray();
                    }
                    else
                    {
                        args = new object[] { keyword };
                    }
                }
            }

            var data = await _publicService.GetLookListDynamic(pagination, enCode, args);
            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// 获取存储过程
        /// </summary>
        /// <param name="procName">过程名</param>
        /// <param name="param">参数 例：["xx","yy","zz"]</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetExecProcedureList(string procName, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            object[] args = null;
            if (param != null && !string.IsNullOrEmpty(param))
            {
                if (args == null)
                {
                    args = JArray.Parse(param).ToObject<object[]>();
                }
            }

            var data = await _publicService.GetStoredProcedureList(procName, args);
            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// 获取存储过程数据
        /// </summary>
        /// <param name="procName">过程名</param>
        /// <param name="param">参数 例：[{"key":"11","value":"11"},{"key":"22","value":"22"}]</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetStoredProcedureList(string procName, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            List<SugarParameter> sugarParam = new List<SugarParameter>();
            if (param != null && !string.IsNullOrEmpty(param))
            {
                JArray paramlist = JArray.Parse(param);
                foreach (var item in paramlist)
                {
                    sugarParam.Add(new SugarParameter(item["key"].ParseToString(), item["value"].ParseToString()));
                }
            }

            var data = await _publicService.GetStoredProcedureList(procName, sugarParam);
            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// 获取存储过程数据（分页）
        /// </summary>
        /// <param name="pagination">分页参数</param>
        /// <param name="procName">过程名</param>
        /// <param name="param">参数 例：[{"key":"11","value":"11"},{"key":"22","value":"22"}]</param>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetStoredProcedureList(SoulPage<dynamic> pagination, string procName, string param)
        {
            // 将 JSON 字符串反序列化为 object[]
            List<SugarParameter> sugarParam = new List<SugarParameter>();
            if (param != null && !string.IsNullOrEmpty(param))
            {
                JArray paramlist = JArray.Parse(param);
                foreach (var item in paramlist)
                {
                    sugarParam.Add(new SugarParameter(item["key"].ParseToString(), item["value"].ParseToString()));
                }
            }

            var data = await _publicService.GetStoredProcedureList(pagination, procName, sugarParam);
            return Content(data == null ? "{}" : data.ToJson());
        }

        /// <summary>
        /// Form提交
        /// </summary>
        /// <param name="model"></param>
        /// <param name="keyValue">主键Id</param>
        /// <param name="enCode">按钮Id 例（NF-edit）</param>
        /// <param name="flow_model">流程model</param>
        /// <returns></returns>
        [HttpPost]
        [HandlerAjaxOnly]
        [Route("/Module/{*path:regex(.*\\/SubmitForm)}")]   // ★ 匹配 /Public/xx/SubmitForm
        public async Task<ActionResult> SubmitForm(string model, string keyValue, string enCode, int flow_model)
        {
            var currentUrl = HttpContext.Request.Path.ToString();
            var moduleEncode = currentUrl.Replace("/Module/", "").Replace("/SubmitForm", "");
            try
            {
                _publicService.moduleEnCode = moduleEncode;
                var Id = await _publicService.SubmitForm(model, enCode, keyValue, flow_model == 0 ? null : new FlowinstanceEntity { FlowOperate = flow_model, F_Code = "" });
                return await Success("操作成功。", Id, moduleEncode + "Controller");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, moduleEncode + "Controller", keyValue);
            }
        }

        /// <summary>
        /// 首页字段编辑更新
        /// </summary>
        /// <param name="url">IndexUrl</param>
        /// <param name="fieldName">字段名</param>
        /// <param name="fieldValue">字段值</param>
        /// <param name="keyValue">主键Id</param>
        /// <returns></returns>
        [HttpPost]
        [HandlerAjaxOnly]
        public async Task<ActionResult> UpdateIndex(string url, string fieldName, string fieldValue, string keyValue)
        {
            var moduleEncode = url.Replace("/Module/", "").Replace("/Index", "");
            try
            {
                _publicService.moduleEnCode = moduleEncode;
                await _publicService.UpdateIndex(fieldName, fieldValue, keyValue);
                return await Success("操作成功。", keyValue, moduleEncode + "Controller");
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, moduleEncode + "Controller", keyValue);
            }
        }

        /// <summary>
        /// 删除数据
        /// </summary>
        /// <param name="deleteparams">删除参数 例：[{"table":"base_supplier","primary":"F_Id"},{"table":"base_supplier_list","primary":"F_PrimaryId"}]</param>
        /// <param name="keyValue">删除主键Id</param>
        /// <returns></returns>
        [HttpPost]
        [HandlerAjaxOnly]
        [HandlerAuthorize]
        [Route("/Module/{*path:regex(.*\\/DeleteForm$)}")]   // ★ 匹配 /Public/xx/DeleteForm
        public async Task<ActionResult> DeleteForm(string deleteparams, string keyValue)
        {
            var currentUrl = HttpContext.Request.Path.ToString();
            var moduleEncode = currentUrl.Replace("/Module/", "").Replace("/DeleteForm", "");
            try
            {
                _publicService.moduleEnCode = moduleEncode;
                var dicts = new Dictionary<string, string>();
                JArray paramlist = JArray.Parse(deleteparams);
                foreach (var item in paramlist)
                {
                    dicts.Add(item["table"].ParseToString(), item["primary"].ParseToString());
                }
                await _publicService.DeleteForm(dicts, "NF-delete", keyValue);
                return await Success("操作成功。", "", moduleEncode + "Controller", keyValue, DbLogType.Delete);
            }
            catch (Exception ex)
            {
                return await Error(ex.Message, moduleEncode + "Controller", keyValue, DbLogType.Delete);
            }
        }

        #endregion

        #region 业务处理

        /// <summary>
        /// 获取待办事项
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [HandlerAjaxOnly]
        public async Task<ActionResult> GetToDoList()
        {
            // 修改内容：转成 JArray 后可直接加 FlowItem
            var processlist = JArray.FromObject(await _messageService.GetUnReadListJson() ?? new List<MessageEntity>());
            foreach (JObject msg in processlist)
            {
                if (msg["F_MessageType"]?.Value<int>() != 2) continue;
                var flowId = msg["F_KeyValue"]?.ToString();
                if (string.IsNullOrEmpty(flowId)) continue;
                try
                {
                    var flow = await _flowinstanceService.GetForm(flowId);
                    if (flow?.F_FrmType != 2) continue;
                    var meta = JObject.Parse(flow.F_SchemeContent)["meta"];
                    if (meta?.Type == JTokenType.String) meta = JObject.Parse(meta.ToString());
                    var url = meta?["url"]?.ToString();
                    if (string.IsNullOrEmpty(url)) continue;
                    msg["F_Href"] = $"{url}?keyValue={flow.F_FrmId}&formFlow=true";
                    msg["FlowItem"] = JObject.FromObject(flow);
                    msg["IsEnd"] = flow.F_ActivityType == 3 || flow.F_ActivityType == 4;
                }
                catch { }
            }
            //执行对应模块的消息存储过程，过程名为ModuleEnCode+Alert
            List<SugarParameter> inPars = new List<SugarParameter>
            {
                new SugarParameter("LoginUserId", _moduleService.currentuser.UserId)
            };
            var resultlist = await _publicService.GetStoredProcedureList("proc_AlertInfo", inPars);
            // 倒序循环：边记录日志边删除，避免 foreach 中修改集合抛异常
            for (int i = resultlist.Count - 1; i >= 0; i--)
            {
                // item 是 dynamic：先 as object 才能调用扩展方法（同 ActivateCardController 的写法）
                var row = (resultlist[i] as object).ToJson().ToJObject();
                if (row["state"].ParseToInt() == 2)
                {
                    var moduleEnCode = (await _moduleService.GetForm(row["module"].ParseToString()))?.F_EnCode;
                    //返回状态为错误则记录到日志里，并从结果集中剔除
                    await Error(row["message"].ParseToString(), moduleEnCode + "Controller", null, DbLogType.Visit);
                    resultlist.RemoveAt(i);
                }
            }
            // 修改内容：JArray 只能 Add JToken，不能直接 Add 匿名对象
            if (resultlist != null && resultlist.Count > 0 && resultlist.FirstOrDefault() != null)
            {
                foreach (var row in resultlist)
                {
                    var obj = (row as object).ToJson().ToJObject();
                    processlist.Add(new JObject
                    {
                        ["F_MessageInfo"] = obj["text"].ParseToString(),
                        ["F_Href"] = obj["url"].ParseToString(),
                        ["F_KeyValue"] = obj["module"].ParseToString(),
                        ["F_CreatorTime"] = obj["CreatorTime"],
                        ["F_MessageType"] = 3,
                        ["FlowItem"] = null,
                        ["IsEnd"] = false
                    });
                }
            }
            // 排序：未办结(IsEnd=false)在前，未读(F_ClickRead=false)在前，创建时间倒序
            processlist = new JArray(processlist
                .OrderBy(m => m.Value<bool?>("IsEnd") ?? false)
                .ThenBy(m => m.Value<bool?>("F_ClickRead") ?? false)
                .ThenByDescending(m => m.Value<DateTime?>("F_CreatorTime") ?? DateTime.MinValue));
            return Content(processlist.ToJson());
        }

        #endregion

        #region 通用URL请求

        // 静态复用，避免频繁创建导致端口耗尽
        private static readonly HttpClient _requestUrlClient = new HttpClient(
            new HttpClientHandler
            {
                AutomaticDecompression = System.Net.DecompressionMethods.GZip | System.Net.DecompressionMethods.Deflate,
                UseCookies = false
            })
        { Timeout = TimeSpan.FromSeconds(30) };

        /// <summary>
        /// 通用 URL 请求接口：服务端转发 HTTP 请求并返回响应结果
        /// </summary>
        /// <param name="url">目标地址，必须以 http:// 或 https:// 开头</param>
        /// <param name="method">请求方式 GET/POST/PUT/DELETE，默认 GET</param>
        /// <param name="headers">请求头，JSON 字符串，如 {"Authorization":"Bearer xxx"}</param>
        /// <param name="body">请求体（POST/PUT 时有效）</param>
        /// <param name="contentType">请求体类型，默认 application/json</param>
        /// <returns></returns>
        [HttpPost]
        [HandlerAjaxOnly]
        [IgnoreAntiforgeryToken]
        public async Task<ActionResult> RequestUrl(string url, string method = "GET",
            string headers = null, string body = null, string contentType = "application/json")
        {
            try
            {
                // 基础校验
                if (string.IsNullOrWhiteSpace(url))
                    return Error("url 不能为空");
                if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                    !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    return Error("url 仅支持 http/https 协议");

                // 方法白名单
                var httpMethod = (method ?? "GET").ToUpperInvariant();
                if (!new[] { "GET", "POST", "PUT", "DELETE" }.Contains(httpMethod))
                    return Error($"不支持的请求方式：{method}");

                // 组装请求
                using var request = new HttpRequestMessage(new HttpMethod(httpMethod), url);
                if (!string.IsNullOrWhiteSpace(headers))
                {
                    var headerObj = JObject.Parse(headers);   // 解析失败会被下面的 catch 接住
                    foreach (var prop in headerObj.Properties())
                    {
                        request.Headers.TryAddWithoutValidation(prop.Name, prop.Value?.ToString());
                    }
                }
                if (httpMethod != "GET" && !string.IsNullOrWhiteSpace(body))
                {
                    request.Content = new StringContent(body, Encoding.UTF8, contentType);
                }

                // 发送
                using var response = await _requestUrlClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                return Success("操作成功", new
                {
                    StatusCode = (int)response.StatusCode,   // 200/404/500，由前端自行判断
                    ReasonPhrase = response.ReasonPhrase,
                    Content = content
                });
            }
            catch (TaskCanceledException)
            {
                return Error("请求超时（30 秒）");
            }
            catch (Exception ex)
            {
                return Error(ex.Message);
            }
        }

        #endregion


        #region 非接口方法

        private static readonly ConcurrentDictionary<string, string> _controllerAreaCache = InitControllerAreaCache();
        private static ConcurrentDictionary<string, string> InitControllerAreaCache()
        {
            var cache = new ConcurrentDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var assembly = typeof(ModuleController).Assembly;

            foreach (var type in assembly.GetTypes())
            {
                if (typeof(ControllerBase).IsAssignableFrom(type))
                {
                    var area = type.GetCustomAttribute<AreaAttribute>()?.RouteValue;
                    cache.TryAdd(type.Name, area);  // 去除命名空间
                }
            }
            return cache;
        }

        #endregion
    }
}