window.FormTemplate = {
    cshtml: `<!-- 前端Form模板 -->
<script>
    var keyValue = ""
    var btnId = "";
    var isEnabled = true;
    var SampleComponent = "";
    var enCode = '';
    layui.use(['jquery', 'form','layer', 'commonTable', 'table', 'common','commonForm'], function () {
        var form = layui.form,
            $ = layui.$,
            table = layui.table,
            commonTable = layui.commonTable,
            commonForm = layui.commonForm,
            common = layui.common;
        keyValue = $.request("keyValue");
        btnId = $.request("btnId");
        //系统配置按钮点击事件
        window.ToolClick = function (obj) {
            enCode = obj;
            eval(common.clickTools(obj));
        }

        //权限字段
        common.authorizeFields('adminform');
        wcLoading.close();
        // 编辑表单，打开编辑状态
        window.UpdateForm = function () {
            common.disableButtons(['NF-edit']);
        }
        // 查看表单，只读模式
        window.ViewForm = function () {
            // 只禁用保存按钮
            common.disableButtons(['NF-save']);
            // 设置所有表单项为只读
            common.setTabReadOnly('adminform');
        }

        // 新增表单，初始化按钮状态
        window.AddForm = function () {
            // 禁用“编辑”和“删除”按钮
            common.disableButtons(['NF-edit', 'NF-delete', 'NF-pred', 'NF-next']);
        }

        $(function () {
            if (btnId != "NF-edit" && keyValue) {//如果不是编辑状态，则禁用表单
                isEnabled = false;
            }
            const tableOptsList = [{
                // 必填 / 常用
                elem: '#sap_register_color',
                id: 'sap_register_color',
                enCode: 'sap_registercolor_list',
                cols: [[{ type: 'radio', width: 50, fixed: 'left' }]],
                tableFilter: 'colorTableFilter',
                // data: listData,//表格初始化数据，需要自己处理表格数据就传递data
                isEnabled: true,// false 为只读
                search: false,
                toolbar: '#toolbarDemo',// 无模板则自动生成；有模板则用手写
                defaultToolbar: [],
                limit: 9999,
                page: false,
                height: 'full-235',
                filter: { clearFilter: false },
                // 按字段名隐藏列
                hideFields: [],
                // 主字段不存在时，连带隐藏其子字段
                hiddenFields: {},
                // 单选显示按钮
                oneBtnList: [],
                // 多选显示按钮
                moreBtnList: ["NF-delete"],
                // 行/勾选回调
                clickfunction:function (obj) {},
                // 回调
                done: function (res, curr, count) { },
                // 每列生成后钩子：可改编辑配置 / 事件
                setCustomConfig: function (col, config) {
                    config.on.click = function (obj) {  }; // 点击字段时触发
                    config.on.change = function (obj) {  }; // 字段值变化时触发
                    // ----------------- tableSelect 专属钩子 -----------------
                    // config.canInput = false; // false：仅面板；默认 true
                    config.beforeRender = function (tableOpts) { }; // 弹窗表格渲染前回调：可动态改 url、params、cols 等；返回 false 可阻止打开
                    config.beforeKeydownEnter = function (elem, checkStatus) { }; // 回车确认前回调：返回 false 可中断后续回填逻辑
                    config.afterKeydownEnter = function (elem, checkStatus) { }; // 回车确认并完成回填后的回调
                },
                onToolbar: function (obj) { },        // 工具栏 add/delete/自定义 lay-event
                onEditTool: function (obj) { },       // 行工具或编辑单元格变更后（eipTableEdit / tool）
            }]
            // 初始化表头动态表单：根据表单配置编码拉取字段并渲染到指定容器
            commonForm.createForm({
                // 表单字段渲染容器选择器（对应页面中的 .form-fields）
                elem: '.form-fields',
                // 表单配置编码：用于从后端获取该表单的字段定义/控件类型等元数据
                enCode: 'form_sap_register',
                // 表单初始数据（编辑回填 / 新增时可为空对象）
                // data: formData, //需要自己处理表单数据就传递data
                // 是否可编辑：true 可编辑，false 只读（通常与页面权限/流程状态联动）
                isEnabled,
                createtable:tableOptsList,
                // 联动隐藏配置：
                // key 为判断字段；value 为需要隐藏的字段数组；
                // 当 key 对应字段不存在/无值时，隐藏 value 中的字段
                // 示例：hiddenFields:{'F_ContactPerson': ['F_ContactPhone', 'F_ContactAddress']}
                hiddenFields: {},
                // 表单数据加载完成后的回调：可自由处理接口返回的 data（以及 options / tableList）
                // data：接口返回数据；options：createForm 入参；tableList：子表配置列表
                afterLoadData:(data, options, tableList)=>{},
                // 自定义字段配置钩子：在每个字段渲染前调用，可按字段扩展事件与 tableSelect 行为
                // item：当前字段元数据；col：该字段最终渲染配置对象
                setCustomConfig: (item, col) => {
                    // 只写副作用：请求、弹窗、重建子表。同步到输入框不用写，改 commonForm.formData 即可
                    col.on.change = (elem, value) => {};
                    // 光标离开（失焦）时触发，常用于格式化、二次校验等
                    col.on.blur = (elem, value) => {};
                    // 点击字段时触发
                    col.on.click = (elem, value) => {};
                    // ----------------- tableSelect 专属钩子 -----------------
                    // col.canInput = false; // false：仅面板；默认 true
                    // 弹窗表格渲染前回调：可动态改 url、params、cols 等；返回 false 可阻止打开
                    col.beforeRender = (tableOpts) => {};
                    // 回车确认前回调：返回 false 可中断后续回填逻辑
                    col.beforeKeydownEnter = (elem, checkStatus) => {};
                    // 回车确认并完成回填后的回调
                    col.afterKeydownEnter = (elem, checkStatus) => {};
                },
                // 表单全部字段渲染完成后的回调（可在此做控件二次初始化、默认值、联动等）
                done: () => {}
            });
            // 主表只认这一份。改 form.字段名，控件会跟上
            var form = commonForm.formData;
        });

        //监听提交
        form.on('submit(saveBtn)', function (data) {
            commonForm.formSubmit({
                // 基础表单参数
                formData: data,
                // 提交时 强制追加的字段
                keepFields:{
                    form:[],//表头写法
                    sap_register_color:[]//表体写法
                },
                // 自定义校验
                customValidates: function (postData) {},
                // 请求前自定义处理
                beforeRequest: function (postData) {
                    common.submitForm({
                        url: '/SampleProofManage/Samplelog/SubmitForm?keyValue=' + keyValue + "&enCode=" + ((isNaN(keyValue) ?? "") == "" ? "NF-add" : "NF-edit"),
                        param: { model: JSON.stringify(postData), keyValue: keyValue },
                        success: function () {
                            common.tableOnlyReload();
                        }
                    })
                },
            });
        });
    });
</script>
<style type="text/css"></style>

<body>
    <div class="layuimini-main1"
        style="background-color:white; border:1px solid #f2f2f2;border-radius:5px; margin:5px 0px; ">
        <div class="layui-btn-container" id="toolbarMain">
        </div>
    </div>
    <div class="layuimini-container">
        <div class="layuimini-main">
            <div class="layui-form layuimini-form" lay-filter="adminform">
                <div class="form-fields"></div>
                <div class="layui-form-item">
                    <div class="layui-col-md12 layui-col-sm12">
                        <table class="layui-hide" id="sap_register_color" lay-filter="currentTableFilter"></table>
                    </div>
                </div>
                <div class="layui-tabform-item text-right layui-hide">
                    <button class="layui-btn site-demo-active" lay-submit id="submit" lay-filter="saveBtn">确认保存</button>
                    <input type="hidden" id="SelectIndex" />
                </div>
            </div>
        </div>
    </div>
</body>
`,
    index: `<!-- 前端Index模板 -->
<div class="layuimini-container">
    <div class="layuimini-main">
        <fieldset class="table-search-fieldset layui-hide" id="searchField">
            <div>
                <form class="layui-form layui-form-pane">
                    <div class="layui-form-item">
                        <label class="layui-form-label">关键字:</label>
                        <div class="layui-input-inline">
                            <input type="text" id="txt_keyword" name="txt_keyword" autocomplete="off"
                                class="layui-input">
                        </div>
                        <button type="submit" class="layui-btn layui-btn-primary" lay-submit
                            lay-filter="data-search-btn"><i class="layui-icon">&#xe615;</i> 搜 索</button>
                    </div>
                </form>
            </div>
        </fieldset>
        <fieldset class="table-search-fieldset layui-hide" id="quickSearch">
            <div class="quickSearch-fields" id="quickSearchFields"></div>
            <div class="quickSearch-actions">
                <button type="button" class="layui-btn layui-btn-sm" id="quickSearchBtn">搜索</button>
                <button type="button" class="layui-btn layui-btn-primary layui-btn-sm" id="quickSearchReset">重置</button>
            </div>
        </fieldset>
        <table class="layui-hide" id="moduleTablePlaceholder" lay-filter="moduleTablePlaceholder"></table>
    </div>
</div>
<script>
    layui.use(['jquery', 'form', 'table', 'commonTable', 'common', 'optimizeSelectOption'], function () {
        var $ = layui.jquery, form = layui.form, table = layui.table, commonTable = layui.commonTable, common = layui.common;
        const pathSegments = window.location.pathname.split('/');
        const pathname = pathSegments[pathSegments.length - 2] || '';
        var moduleCfg = top.clients.GetMainView[pathname];
        var mainTableId = (moduleCfg && moduleCfg.mainTable) || 'currentTableId';
        var tableFilter = mainTableId + 'Filter';
        $('#moduleTablePlaceholder').attr({ id: mainTableId, 'lay-filter': tableFilter });
        var tableOpts = {
            elem: '#' + mainTableId,
            id: mainTableId,
            tableFilter: tableFilter,
            isEnabled: true,
            cols: [[{ type: "checkbox", width: 50, fixed: 'left' }]],
            setCustomConfig: function (col, config) {
                if (config.type) {
                    config.on.change = function (obj) {
                        var fieldValue = obj.value;
                        if (fieldValue && typeof fieldValue === 'object') {
                            fieldValue = fieldValue.value ?? fieldValue.name ?? JSON.stringify(fieldValue);
                        }
                        common.ajax({
                            type: 'POST',
                            url: '/Public/UpdateIndex',
                            data: { url: window.location.pathname, fieldName: obj.field, fieldValue: fieldValue, keyValue: obj.data.F_Id },
                            async: false,
                            success: function (result) {
                                if (result.state == "success") {
                                    common.modalMsg('修改成功', 'success');
                                    reloadMainTable('data');
                                } else {
                                    common.modalMsg('修改失败：' + result.message, 'error');
                                }
                            }
                        });
                    };
                }
            },
            onToolbar: function (obj) { },
            onEditTool: function (obj) { }
        };
        var IsTree = (moduleCfg && moduleCfg.IsTree) || 0;
        var activeTableOpts = tableOpts;
        function reloadMainTable(type) {
            type = type === 'all' ? 'all' : 'data';
            if (IsTree == 1 || IsTree == 2) commonTable.reloadtreetable($.extend({}, activeTableOpts, { type: type }));
            else commonTable.reloadtable({ elem: mainTableId, type: type });
        }
        if (IsTree == 1) {
            activeTableOpts = $.extend(true, {}, tableOpts, {
                tree: { customName: { id: 'F_Id', name: 'F_FullName', isParent: 'haveChild' }, async: { enable: true } },
                oneBtnList: ['NF-edit', 'NF-details', 'NF-delete']
            });
            commonTable.createtreetable(activeTableOpts);
        } else if (IsTree == 2) {
            activeTableOpts = $.extend(true, {}, tableOpts, {
                tree: { customName: { id: 'F_Id', pid: 'F_ParentId', name: 'F_FullName' }, view: { expandAllDefault: true } }
            });
            commonTable.createtreetable(activeTableOpts);
        } else {
            commonTable.createtable(tableOpts);
        }
        wcLoading.close();
    });
</script>
`,
    csharp: `/* 后端模板暂定*/`
};