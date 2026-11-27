/*
用法
 <div class="layui-form layuimini-form" lay-filter="adminform">
                <div class="form-fields"></div>
</div>
commonForm.createForm({
    elem: '.form-fields',
    enCode:'sap_register',
    data: formData, //这里的data和tableOptsList里的data都是需要自己处理表格数据就传递data
    createtable:tableOptsList,//传递createtable的配置参数 参考commonTable里的createtable
    isEnabled,
    hiddenFields:{   key为判断字段，value为隐藏字段,key不存在就隐藏value中的字段
        'F_ContactPerson': ['F_ContactPhone', 'F_ContactAddress'],
        '123': ['F_RatingRemark', 'F_InvoiceBank'],
        "456": ['F_BlacklistReason']
    },
    // 表单数据加载完成后的回调：可自由处理接口返回的 data（以及 options / tableList）
    // data：接口返回数据；options：createForm 入参；tableList：子表配置列表
    afterLoadData:(data, options, tableList)=>{},
    printConfig: {
        tip: '确认打印？',
        beforeUpdate: function (config) { },
        updated:function (data) { }
    },
    setCustomConfig:(item,col)=>{
        // col 是当前控件；on 是这个实例的事件
        col.on.change = (elem, value) => {};
        col.on.blur = (elem, value) => {}; // 新增blur, 用于光标消失后处理
        col.on.click = (elem, value) => {}; // 新增click, 用于点击时触发
        // col.canInput = false; // tableSelect：false 仅面板；默认 true 可手输+回车/失焦匹配
        col.beforeRender = (tableOpts)=>{}
        col.beforeKeydownEnter = (elem, checkStatus)=>{}
        col.afterKeydownEnter = (elem, checkStatus)=>{}
        // 拿实例请到 done(controlMap, xmSelectMap)
    },
    beforeUpdate: (config) => {},
    updated: (data) => {},
    done: (controlMap, xmSelectMap) => {
        // controlMap.F_ProductName.update({ disabled: true })
        // controlMap.F_ProductName.setValue('xxx')
        // xmSelectMap.F_Xxx → 下拉字段（等同 controlMap，仅含有 instance 的）
        initControl();
    }
});

// 只生成表单控件，不取业务数据、不生成菜单、不创建子表。createForm 画表单时也走这里。
// 传 enCode：按模块字段配置生成。传 fields：按调用方给的字段生成，不再请求字段配置。
// commonForm.renderForm({
//     elem: '.form-fields',
//     enCode: 'sap_register',
//     labelWidth: 100, // 标签宽度，也可写在单个 field.labelWidth
//     fields: [
//         { id: 'day', label: '排缸日期', type: 'date', width: 280 }, // 有 width → flex 换行；区间 width 为两框合计
//         { id: 'post', label: '岗位', type: 'text' }, // 只读纯文本；无 width 仍按 md
//         { id: 'capacity', label: '染缸载量', type: 'select', options: [{ name: '全部型号', value: '' }] }
//     ],
//     data: {},
//     isEnabled: true,
//     filter: 'adminform',
//     setCustomConfig: (item, col) => {},
//     done: () => {}
// });
*/


layui.define(['jquery', 'form', 'laydate', 'common', 'controls', 'commonDefaults', 'imageUpload', 'tableSelect', 'eipTableEdit', 'xmSelect', 'table', 'commonTable'], function (exports) {
    "use strict";
    var $ = layui.$;
    var form = layui.form;
    var laydate = layui.laydate;
    var common = layui.common;
    var controls = layui.controls;
    var commonDefaults = layui.commonDefaults;
    var imageUpload = layui.imageUpload;
    var tableSelect = layui.tableSelect;
    var eipTableEdit = layui.eipTableEdit;
    var table = layui.table;
    var commonTable = layui.commonTable;
    var keyValue = $.request("keyValue")


    window._formCommonCache = window._formCommonCache || {};
    let cache = window._formCommonCache;
    // 父 select 变更时需清空的子控件：{ parentField: [{ id, clear }] }
    var selectDependents = {};
    // 已渲染实例，按字段名（每次 renderForm 换新对象）
    var controlMap = {};
    var xmSelectMap = {};
    function saveControl(item, api) {
        if (!item || !item.id || !api) return;
        controlMap[item.id] = api;
        if (api.instance) xmSelectMap[item.id] = api;
    }
    const currentPagePath = window.location.pathname;
    const pathSegments = currentPagePath.split('/');

    function syncAjax(url, data, async = false) {
        let result = null;
        common.ajax({ url: url, data: data, async: async, success: res => { result = res || []; } });
        return result;
    }

    function init(enCode) {
        if (!cache.GetColsJsonByTable) cache.GetColsJsonByTable = {};

        if (enCode && !cache.GetColsJsonByTable[enCode]) {
            let sendData = { enCode, page: 1, rows: 9999 }
            let res = syncAjax(`/SystemManage/ModuleFields/GetColsJson`, sendData);
            cache.GetColsJsonByTable[enCode] = res || [];
        }
        return { GetColsJson: enCode ? cache.GetColsJsonByTable[enCode] : [] }
    }

    function getFieldEditType(json, item) {
        return controls.fieldControl.type(json, item, { scene: 'form' });
    }

    function bindForm(that, data, hiddenFields, $box) {
        that.formData = typeof reactive === 'function' ? reactive(data || {}) : (data || {});
            Object.keys(that.formData).forEach(function (id) {
                watch(function () { return that.formData[id]; }, function (val) {
                    var hideList = (hiddenFields || {})[id];
                    if (hideList) {
                        var hide = val == null || val === '';
                        hideList.forEach(function (hid) {
                            var $col = $('[data-field="' + hid + '"]');
                            if (!$col.length) $col = $('#' + hid).closest('[class*="layui-col-md"], .form-field-col');
                            $col.toggleClass('layui-hide', hide);
                        });
                    }
                    var api = controlMap[id];
                    if (!api || val == null) return;
                    if (api.match) api.match('change', val);
                    else if (api.setValue) api.setValue(val);
                });
            });
        common.bindFocusNav({ elem: $box, type: 'form' });
        return that.formData;
    }

    var commonForm = {
        /** 表单唯一数据源；与 common.val() / $form.data('formData') 始终同一对象 */
        formData: {},
        setFormData: function (data, rows, filter) {
            if (!data || typeof data !== 'object') return;
            // 修改内容：合并进现有 formData，不换新对象
            if (!this.formData) this.formData = data;
            if (this.formData !== data) {
                var target = this.formData;
                Object.keys(data).forEach(function (k) { target[k] = data[k]; });
            }
            var fd = this.formData;
            (rows || []).flat().forEach(function (item) {
                if (!item || !item.id || item.type !== 'date') return;
                if (fd[item.id] == null || fd[item.id] === '') return;
                var dt = (item._template || {}).datatype;
                fd[item.id] = common.formatDateValue(fd[item.id], dt === 'datetime' || dt === 'datetime2' ? 'datetime' : (dt === 'time' || dt === 'year' || dt === 'month' ? dt : 'date'));
            });
            // 修改内容：刷 DOM，并挂同一引用
            common.val(filter || 'adminform', fd);
            // 修改内容：统一走 controlMap.setValue（含 text / 下拉）
            Object.keys(controlMap).forEach(function (id) {
                var api = controlMap[id];
                if (!api || !api.setValue || fd[id] == null || fd[id] === '') return;
                api.setValue(fd[id]);
            });
            return this;
        },
        // 只把字段画成表单。传 enCode 走模块字段；传 fields 走调用方自己的字段。
        renderForm: function (options) {
            var that = this;
            var opts = $.extend(true, {}, commonDefaults.take('formRender'), options);
            // 修改内容：data 不被 deep extend 克隆，始终同一引用
            opts.data = (options && options.data) || {};
            var $container = $(opts.elem);
            var useFields = Array.isArray(opts.fields) && opts.fields.length;
            if (!$container.length || (!opts.enCode && !useFields)) return false;

            // 字段带 width → 一张 flex 里自适应换行；否则仍按 md 凑 12 分行
            var useFlex = useFields && opts.fields.some(function (f) { return f && f.width; });
            var rows;
            if (useFields) {
                rows = [];
                var currentRow = [];
                var currentTotal = 0;
                opts.fields.forEach(function (field) {
                    var item = $.extend(true, {}, commonDefaults.take('formField'), field || {});
                    if (item.type === 'number') {
                        item.type = 'input';
                        item._template = $.extend({ datatype: 'int' }, item._template);
                    }
                    item.md = Number(item.md);
                    if (useFlex) {
                        currentRow.push(item);
                        return;
                    }
                    if (item.hide) {
                        currentRow.push(item);
                        return;
                    }
                    if (currentTotal + item.md > 12) {
                        rows.push(currentRow.slice());
                        currentRow = [item];
                        currentTotal = item.md;
                    } else {
                        currentRow.push(item);
                        currentTotal += item.md;
                    }
                });
                if (currentRow.length) rows.push(currentRow);
            } else {
                const { GetColsJson } = init(opts.enCode);
                const routeParams = history.state?.routeState || {}
                let CanWriteFormItemIds = []
                if (routeParams && routeParams?.F_SchemeContent) {
                    const F_SchemeContent = JSON.parse(routeParams.F_SchemeContent)
                    if (routeParams?.F_ActivityId) {
                        CanWriteFormItemIds = F_SchemeContent.nodes.find(item => item.id == routeParams?.F_ActivityId)?.setInfo?.CanWriteFormItemIds
                    }
                    if (Array.isArray(CanWriteFormItemIds)) {
                        CanWriteFormItemIds = CanWriteFormItemIds.map(id => (typeof id === 'string' && id.includes('.')) ? id.split('.').pop() : id)
                    }
                }
                rows = this.autoSplitRows(GetColsJson, opts.isEnabled, options, CanWriteFormItemIds);
            }

            selectDependents = {};
            controlMap = {};
            xmSelectMap = {};
            const items = rows.flat();
            // 修改内容：按字段铺齐 key，再 reactive 成唯一 formData
            items.forEach(function (item) {
                if (!item || !item.id) return;
                if (opts.data[item.id] == null) opts.data[item.id] = '';
                item.controlMap = controlMap;
                item.xmSelectMap = xmSelectMap;
            });
            that.formData = bindForm(that, opts.data, opts.hiddenFields || options.hiddenFields, $container);
            opts.data = that.formData;
            if (options) options.data = that.formData;
            // 修改内容：先处理参数（含 setCustomConfig），再画
            items.forEach(function (item) {
                that.buildFieldCol(item, opts.isEnabled, opts.setCustomConfig);
            });

            var html = [];
            rows.forEach(function (row) {
                html.push('<div class="layui-form-item' + (useFlex ? ' form-fields-flex' : '') + '">');
                row.forEach(function (item) {
                    var hide = item.hide ? 'layui-hide' : '';
                    var lw = parseInt(item.labelWidth != null && item.labelWidth !== '' ? item.labelWidth : opts.labelWidth, 10);
                    var labelStyle = lw ? (' style="width:' + lw + 'px;"') : '';
                    var md = item.md || 3;
                    var cls = useFlex
                        ? ('form-field-col ' + hide)
                        : ('layui-col-md' + md + ' layui-col-sm' + md + ' ' + hide);
                    var style = 'display:flex;align-items:center;';
                    if (useFlex && item.width) {
                        style += 'width:' + (typeof item.width === 'number' ? item.width + 'px' : item.width) + ';';
                    }
                    // 修改内容：列即宿主，fieldControl 直接往 label 后追加控件
                    html.push('<div class="' + cls + '" data-field="' + (item.id || '') + '" style="' + style + '">');
                    html.push('<label class="layui-form-label ' + (item.required ? 'required' : '') + '"' + labelStyle + '>' + (item.label || '') + '</label></div>');
                });
                html.push('</div>');
            });
            $container.html(html.join(''));
            that.afterRender($container, items);
            that.setFormData(that.formData, rows, opts.filter);
            if (typeof opts.done === 'function') opts.done(controlMap, xmSelectMap);
            form.render();
            if (!opts.isEnabled) {
                common.setTabReadOnly(opts.filter || 'adminform');
            }
            return true;
        },
        createForm: function (options) {
            const printConfig = options?.printConfig || null
            if (!!keyValue) {//如果有keyValue，则说明不是新增，需要获取表单数据
                const tableList = Array.isArray(options?.createtable) ? options.createtable : (options?.createtable ? [options.createtable] : []);
                // 没有data的那一项才需要调用接口
                const dataname = tableList
                    .filter(item => item.enCode && !item.data)
                    .map(item => item.enCode);
                const needFormData = !options.data;
                // 外部回调：可自由处理接口返回的data（以及 options / tableList）
                const runAfterLoadData = (data) => {
                    if (typeof options.afterLoadData === 'function') {
                        options.afterLoadData(data, options, tableList);
                    }
                };
                if (needFormData || dataname.length > 0) {
                    common.ajax({
                        url: '/Public/GetFormsJson',//来样登记数据的请求url地址
                        dataType: 'json',// 数据类型：JSON
                        data: { ModuleEnCode: pathSegments[pathSegments.length - 2], keyValue: keyValue, dataname: JSON.stringify(dataname) },//主键id
                        async: false,// 同步请求
                        success: function (data) {
                            // 外部有传入的就不需要赋值
                            if (needFormData) {
                                options.data = data.form;//表头数据赋值给formData，用于后续的自定义表单赋值
                            }
                            tableList.forEach(item => {
                                // 没有data的那一项才需要给data赋值
                                if (item.enCode && !item.data && data.hasOwnProperty(item.enCode)) {
                                    item.data = data[item.enCode];
                                }
                            });
                            // 外部可自由处理data里的数据（可改 options.data / 子表 data 等）
                            runAfterLoadData(data);
                            //生成菜单配置按钮
                            common.createTool(options.data || data.form, {
                                id: currentUser.F_Id,
                                role: currentUser.F_RoleId,
                                org: currentUser.F_OrganizeId
                            }, ['obj', 'common', 'table', 'layer', 'keyValue'], printConfig);

                        }
                    });
                } else {
                    // 外部已传入data，仍可自由处理后再生成菜单配置按钮
                    runAfterLoadData({ form: options.data });
                    common.createTool(options.data, {
                        id: currentUser.F_Id,
                        role: currentUser.F_RoleId,
                        org: currentUser.F_OrganizeId
                    }, ['obj', 'common', 'table', 'layer', 'keyValue'], printConfig);
                }
            }
            else {
                //生成菜单配置按钮
                common.createTool({ F_Id: '' }, {
                    id: currentUser.F_Id,
                    role: currentUser.F_RoleId,
                    org: currentUser.F_OrganizeId
                }, ['obj', 'common', 'table', 'layer', 'keyValue'], printConfig);
            }

            // 修改内容：renderForm 内生成唯一 formData；这里只保证有对象
            options.data = options.data || {};
            // 修改内容：表单控件改由 renderForm 生成，这里只保留取数、菜单和子表
            if (this.renderForm(options) === false) return;
            if (options?.createtable) {
                const tableList = Array.isArray(options.createtable) ? options.createtable : [options.createtable];
                // 修改内容：子表指向同一份 formData
                const formData = this.formData;
                const user = {
                    id: currentUser.F_Id,
                    role: currentUser.F_RoleId,
                    org: currentUser.F_OrganizeId
                };
                tableList.forEach(function (item) {
                    if (!item) return;
                    item.formData = formData;
                    if (!item.user) item.user = user;
                    // 修改内容：表单只读则子表默认只读
                    if (item.isEnabled == null && options.isEnabled === false) item.isEnabled = false;
                });
                commonTable.createtable(options.createtable);
            }
        },

        autoSplitRows: function (GetColsJson, isEnabled, options, CanWriteFormItemIds) {
            var rows = [];
            var currentRow = [];
            var currentTotal = 0;
            var filterFields = [];
            if (GetColsJson) {
                let fieldsData = GetColsJson.filter(i => i.F_EnabledMark);
                if (options.hiddenFields && typeof options.hiddenFields === "object" && Object.keys(options.hiddenFields).length > 0) {
                    // 遍历 hiddenFieldsObj 的每个主字段
                    for (const mainField in options.hiddenFields) {
                        const hasMainField = GetColsJson.some(i => i.F_EnCode === mainField);
                        if (!hasMainField) {
                            // 如果没有，过滤掉 fieldsData 中配置的子字段
                            const hiddenSubFields = options.hiddenFields[mainField];
                            if (Array.isArray(hiddenSubFields) && hiddenSubFields.length > 0) {
                                fieldsData = fieldsData.filter(i => !hiddenSubFields.includes(i.F_EnCode));
                            }
                        }
                    }
                }
                filterFields = fieldsData.sort((a, b) => Number(a.F_SortCode) - Number(b.F_SortCode)).map(item => {
                    const F_Template = JSON.parse(item?.F_Template || '{}');
                    // 如果keyValue没有就表示是编辑用后者，是add就用前者，否则根据实际逻辑切换
                    var required = false, disabled = false, hide = false;

                    if (isEnabled) {
                        if (!keyValue) {
                            // 新增时
                            required = !!F_Template.isheadaddverify;
                            disabled = !!F_Template.isheadedit;
                            hide = !F_Template.ishead;
                        } else {
                            // 编辑时
                            required = !!F_Template.isheadupdateverify;
                            disabled = !!F_Template.isheadupdateedit;
                            hide = !F_Template.isheadupdate;

                        }
                    } else {
                        // 只读场景
                        required = !!F_Template.isheadupdateverify;
                        disabled = !!F_Template.isheadupdateedit;
                        hide = !F_Template.isheadupdate;
                    }
                    const fieldObj = {
                        label: item.F_ReNameCn || item.F_FullName || '',
                        id: item.F_ReNameCode || item.F_EnCode || '',
                        required,
                        md: F_Template.headwidth || 3,
                        placeholder: F_Template.placeholder || '',
                        disabled,
                        hide,
                        type: getFieldEditType(F_Template, item),
                        _raw: item,
                        _template: F_Template,
                        ...(F_Template.cross ? { _cross: F_Template.cross.split(',') } : {})
                    };
                    if (Array.isArray(CanWriteFormItemIds) && CanWriteFormItemIds.length > 0) {
                        // 原有字段本身不禁用 && 当前字段id在白名单内 → 允许编辑，其余全部禁用
                        const inWhiteList = CanWriteFormItemIds.includes(fieldObj.id);
                        fieldObj.disabled = !(fieldObj.disabled === false && inWhiteList);
                    }
                    return fieldObj;
                });


            }

            // 交叉字段插入到当前字段后面
            let filterFieldsCross = [];
            filterFields.forEach(item => {
                filterFieldsCross.push(item);
                if (!Array.isArray(item._cross) || !item._cross.length) return;
                common.getCrossFields(item._template && item._template.dataname, item._cross).forEach(function (i) {
                    filterFieldsCross.push({
                        label: i.F_ReNameCn || i.F_FullName || '',
                        id: i.F_ReNameCode || i.F_EnCode || '',
                        required: false,
                        md: item.md || 3,
                        placeholder: '',
                        disabled: false,
                        readonly: true,
                        hide: false,
                        type: 'input',
                    });
                });
            });

            filterFields = filterFieldsCross;
            filterFields.forEach(item => {
                item.md = Number(item.md)
                if (item.hide) { currentRow.push(item); return; }
                if (currentTotal + item.md > 12) {
                    rows.push([...currentRow]);
                    currentRow = [item]; currentTotal = item.md;
                } else {
                    currentRow.push(item); currentTotal += item.md;
                }
            });
            if (currentRow.length) rows.push(currentRow);
            return rows;
        },

        buildFieldCol: function (item, isEnabled, setCustomConfig) {
            var that = this;
            if (!item) return;
            // 修改内容：隐藏字段统一当 input，.val / formData 读写不丢
            if (item.hide) item.type = 'input';

            const F_Template = item._template || {};
            const useName = item.id !== 'F_Id' && !item.hide && F_Template.ignore?.toString() !== 'true';
            const fieldAttrs = {
                id: item.id,
                name: useName ? item.id : '',
                placeholder: item.placeholder || '',
                required: !!item.required,
                layVerify: item.required ? 'required' : '',
                layReqText: item.required ? ((item.label || '') + ' 必填项不能为空！') : ''
            };
            const initVal = that.formData?.[item.id];
            var col;

            if (item.type === 'input') {
                col = $.extend({}, commonDefaults.take('form', 'input'), fieldAttrs);
                if (item.disabled) col.disabled = true;
                if (item.readonly) col.readonly = true;
                const dt = F_Template.datatype;
                if (['int', 'bigint', 'float', 'decimal'].includes(dt)) {
                    col.precision = Number(F_Template.digits);
                }
            } else if (item.type === 'textarea') {
                col = $.extend({}, commonDefaults.take('form', 'textarea'), fieldAttrs);
                if (item.disabled) col.disabled = true;
                if (F_Template.maxlength) col.maxlength = F_Template.maxlength;
                if (F_Template.rows) col.rows = F_Template.rows;
            } else if (item.type === 'date') {
                let dateKind = F_Template.datatype;
                col = $.extend({}, commonDefaults.take('form', 'date'), fieldAttrs, {
                    dateType: dateKind === 'datetime' || dateKind === 'datetime2' ? 'datetime' : (dateKind === 'time' || dateKind === 'year' || dateKind === 'month' ? dateKind : 'date')
                });
                if (item.disabled) col.disabled = true;
            } else if (item.type === 'text') {
                col = $.extend({}, commonDefaults.take('form', 'input'), fieldAttrs);
            } else if (item.type === 'imageUpload') {
                let maxCount = Math.max(1, Math.round(Number(F_Template.length || 0) / 50));
                col = $.extend({}, commonDefaults.take('form', 'imageUpload'), fieldAttrs, {
                    id: '#' + item.id,
                    maxCount: maxCount,
                    value: initVal ? String(initVal).split(',') : []
                });
                if (item.disabled || !isEnabled) col.readonly = true;
            } else if (item.type === 'select') {
                const isDisabled = item.disabled || false;
                const localOpts = Array.isArray(item.options);
                const referType = item._raw && item._raw.F_ReferType != null ? item._raw.F_ReferType : 2;
                var data = [];
                var valueKey = '';
                var relateFields = [];
                if (localOpts) {
                    data = item.options.map(function (opt) {
                        return {
                            name: opt.name || opt.label || '',
                            value: opt.value == null ? '' : String(opt.value)
                        };
                    });
                } else {
                    const built = common.buildParams(F_Template.params, that.formData);
                    relateFields = built.keys;
                    data = common.refSelect(F_Template.dataname, built.params);
                }
                col = commonDefaults.take('form', 'select');
                col.required = !!item.required;
                col.disabled = isDisabled || !isEnabled;
                var selectState = { demo: null };
                const config = $.extend({}, col.xmConfig, {
                    id: item.id,
                    name: item.id,
                    disabled: col.disabled,
                    layVerify: item.required ? 'required' : '',
                    layReqText: item.required ? (item.label + ' 必填项不能为空！') : '',
                    data
                });
                if (!localOpts && relateFields.length) {
                    config.show = function () {
                        var opts = common.refSelect(F_Template.dataname, common.buildParams(F_Template.params, that.formData).params);
                        const oldVals = selectState.demo.getValue('value');
                        selectState.demo.update({ data: opts || [] });
                        if (oldVals && oldVals.length > 0 && opts.length > 0) selectState.demo.setValue(oldVals);
                    };
                }
                col.xmConfig = config;
                item._select = { state: selectState, relateFields: relateFields, valueKey: valueKey, referType: referType };
            } else if (item.type === 'tableSelect') {
                const referType = item._raw?.F_ReferType;
                const tableSelectOpts = common.tableSelectUtil.buildConfig({
                    dataname: F_Template.dataname,
                    referType: referType,
                    paramsStr: F_Template.params,
                    disabled: item.disabled || false
                });
                var tableConfig = Object.assign({}, tableSelectOpts.table);
                var selected = tableSelectOpts.istree
                    ? []
                    : String(initVal || '').split(',').filter(Boolean);
                col = $.extend({}, commonDefaults.take('form', 'tableSelect'), tableSelectOpts, fieldAttrs, {
                    table: tableConfig,
                    selected: selected
                });
                item._tableSelect = { tableConfig: tableConfig, referType: referType, selected: selected };
            } else if (item.type === 'checkbox') {
                col = $.extend({}, commonDefaults.take('form', 'checkbox'), fieldAttrs, {
                    laySkin: F_Template.laySkin || 'switch',
                    layText: F_Template.layText || '是|否',
                    disabled: item.disabled || false,
                    readonly: item.readonly || false
                });
            }

            if (!col) return;
            if (typeof setCustomConfig === 'function') setCustomConfig(item, col);
            if (item.type === 'tableSelect' && ((col.table && col.table.disabled) || col.canInput === false)) col.readonly = true;
            // 透传区间：由 fieldControl 在宿主内画起止
            if (item.range !== false && (item.range === true || item.isRange)) col.isRange = true;
            if (item.placeholderFrom != null) col.placeholderFrom = item.placeholderFrom;
            if (item.placeholderTo != null) col.placeholderTo = item.placeholderTo;
            item.required = !!col.required;
            col.layVerify = item.required ? (col.layVerify || 'required') : '';
            col.layReqText = item.required ? (col.layReqText || ((item.label || '') + ' 必填项不能为空！')) : '';
            if (col.xmConfig) {
                col.xmConfig.layVerify = col.layVerify;
                col.xmConfig.layReqText = col.layReqText;
                if (col.disabled != null) col.xmConfig.disabled = !!col.disabled;
            }
            item.col = col;
        },

        afterRender: function ($container, items) {
            var that = this;
            for (let item of items) {
                let col = item.col;
                if (!col) continue;
                const F_Template = item._template || {};
                const $host = $container.find('[data-field="' + item.id + '"]');
                const initVal = that.formData?.[item.id];

                function syncFormValue(value) {
                    that.formData[item.id] = value == null ? '' : value;
                }
                if (item.type === 'input' || item.type === 'textarea' || item.type === 'text') {
                    saveControl(item, controls.fieldControl.render({
                        elem: $host,
                        type: item.type,
                        template: F_Template,
                        value: initVal,
                        config: col,
                        onChange: syncFormValue
                    }));
                } else if (item.type === 'date') {
                    saveControl(item, controls.fieldControl.render({
                        elem: $host,
                        type: 'date',
                        template: F_Template,
                        value: initVal,
                        config: col,
                        onChange: syncFormValue
                    }));
                } else if (item.type === 'imageUpload') {
                    saveControl(item, controls.fieldControl.render({
                        elem: $host,
                        type: 'imageUpload',
                        template: F_Template,
                        value: col.value,
                        config: col,
                        onChange: syncFormValue
                    }));
                } else if (item.type === 'select') {
                    var selectMeta = item._select || {};
                    var selectState = selectMeta.state || { demo: null };
                    var selectApi = controls.fieldControl.render({
                        elem: $host,
                        type: 'select',
                        template: F_Template,
                        field: { F_ReferType: selectMeta.referType },
                        value: initVal,
                        config: $.extend({}, col.xmConfig, { on: col.on }),
                        onChange: function (value) {
                            syncFormValue(value);
                            (selectDependents[item.id] || []).forEach(function (d) { if (d && d.clear) d.clear(); });
                        }
                    });
                    selectState.demo = selectApi.instance;
                    saveControl(item, selectApi);
                    const selectInit = initVal ?? that.formData?.[selectMeta.valueKey];
                    if (selectInit) selectState.demo.setValue(String(selectInit).split(',').filter(Boolean));
                    (selectMeta.relateFields || []).forEach(function (field) {
                        selectDependents[field] = (selectDependents[field] || []).filter(function (d) { return d.id !== item.id; });
                        selectDependents[field].push({
                            id: item.id,
                            clear: function () { selectState.demo.setValue([]); }
                        });
                    });
                } else if (item.type === 'tableSelect') {
                    var tsMeta = item._tableSelect || {};
                    var tableConfig = col.table || tsMeta.tableConfig || {};
                    var selected = col.selected || tsMeta.selected || [];
                    function fillCrossField(elem, checkStatus, item, $container) {
                        var $el = $(elem);
                        var result = common.tableSelectUtil.resolveFill(checkStatus, item.id, {
                            cross: item._cross,
                            fallbackDisplay: $el.val() || '',
                            prevFilledKeys: $el.data('tsFilledKeys') || []
                        });
                        Object.keys(result.patch || {}).forEach(function (key) {
                            var val = result.patch[key];
                            if (key === item.id) return; // 本字段已由 notify / setValue 处理
                            if (!$container.find('[data-field="' + key + '"]').length) return;
                            // 修改内容：只写 formData，由 watch 统一 setValue，避免进两遍
                            if (that.formData) that.formData[key] = val;
                        });
                        if (result.empty) $el.removeData('tsFilledKeys');
                        else $el.data('tsFilledKeys', Object.keys(result.patch || {}));
                        var keys = ($el.attr('ts-selected') || '').trim();
                        selected.splice(0, selected.length, ...(keys ? keys.split(',') : []).filter(Boolean));
                    }
                    function tsInput() {
                        return $container.find('[id="' + col.id + '"]');
                    }
                    saveControl(item, controls.fieldControl.render({
                        elem: $host,
                        type: 'tableSelect',
                        value: initVal,
                        field: { F_EnCode: item.id, F_ReferType: tsMeta.referType },
                        template: F_Template,
                        config: col,
                        onChange: function (v, display, extra) {
                            syncFormValue(v);
                            extra = extra || {};
                            if (extra.checkStatus) fillCrossField(tsInput()[0] || $host[0], extra.checkStatus, item, $container);
                        }
                    }));
                    function finishFormMatch(trigger, assignVal) {
                        // 手输：canInput=false 不匹配；formData 赋值带 assignVal
                        if (col.canInput === false && assignVal == null) return;
                        var api = controlMap[item.id];
                        // 修改内容：值未变跳过；有赋值时不清空，未命中只写赋值
                        if (assignVal != null && assignVal !== '' && api && String(api.getValue() || '') === String(assignVal)) return;

                        var $input = tsInput();
                        if (!$input.length) return;
                        if (col.table) col.table.params = common.tableSelectUtil.resolveParams(col);
                        var result = common.tableSelectUtil.matchInput(col, $input, {
                            clearOnMiss: assignVal == null,
                            snapshotVal: assignVal != null ? assignVal : undefined
                        });
                        if (!result) return;
                        var checkStatus = result.checkStatus || { data: [] };
                        if (checkStatus.skipped) return;
                        checkStatus.trigger = trigger;
                        if (!common.tableSelectUtil.hooks('before', trigger, col, result.$input, checkStatus)) return;

                        if (!(checkStatus.data || []).length && assignVal != null && String(assignVal).trim() !== '') {
                            if (api && api.setValue) api.setValue(assignVal, assignVal);
                            return;
                        }

                        var keys = result.$input.attr('ts-selected') || '';
                        var display = common.tableSelectUtil.resolveFill(checkStatus, item.id, {
                            fallbackDisplay: result.$input.val() || ''
                        }).displayValue || '';
                        if (api && api.setValue) api.setValue(keys, display);
                        if (api && typeof api.notify === 'function') {
                            api.notify(keys, display, { checkStatus: checkStatus, arr: checkStatus.data || [] });
                        }
                        common.tableSelectUtil.hooks('after', trigger, col, result.$input, checkStatus);
                        if (trigger === 'blur' && typeof col.on.blur === 'function') {
                            col.on.blur(result.$input[0] || result.$input, $(result.$input).val());
                        }
                    }
                    if (controlMap[item.id]) controlMap[item.id].match = finishFormMatch;
                    if (col.canInput !== false && !tableConfig.disabled) {
                        common.tableSelectUtil.bindMatch(tsInput(), finishFormMatch, 'tsFormMatch');
                    } else {
                        tsInput().off('keydown.tsFormMatch blur.tsFormMatch input.tsFormMatch change.tsFormMatch');
                    }
                } else if (item.type === 'checkbox') {
                    saveControl(item, controls.fieldControl.render({
                        elem: $host,
                        type: 'checkbox',
                        template: F_Template,
                        value: initVal,
                        config: col,
                        onChange: function (value) {
                            syncFormValue(value);
                        }
                    }));
                }
            }
        },

        // form页提交事件
        /**
         * 优化后的表单提交函数
         * 支持校验、自定义验证、上传、钩子、数据包装、请求、回调处理
         * @param {Object} opts 配置项
         */
        /**
         commonForm.formSubmit({
                // 1. 基础表单参数
                formData: data,
                // 强制追加的字段
                keepFields:{
                    form:[],表头写法
                    currentTableId:[] 表体写法
                },
                // 自定义校验
                customValidates: function (postData) {},

                // 请求前自定义处理
                beforeRequest: function (postData) {},
            });
         */
        formSubmit: async function (opts) {
            if (!opts) return;

            const {
                formData = {},
                keepFields = {},
                customValidates,
                beforeRequest,
            } = opts;
            // 自动收集当前页面所有带 id 的 table
            const subTables = $('table[id]').map(function () {
                const cacheId = this.id;
                return { cacheId };
            }).get();
            // 子表编辑校验
            if (subTables.length > 0 && !eipTableEdit.valid()) return false;

            // 以 layui form 序列化结果为底；再剔除表格内部控件（勾选/单选 name 会被扫进 field）
            const postData = { ...(formData.field || {}) };
            Object.keys(postData).forEach(function (key) {
                // 修改内容：去掉表格 xm-select 默认 name=select，以及 layui 表格勾选
                if (key === 'select' || key === 'layTableCheckbox' || key.indexOf('layTableRadio_') === 0) {
                    delete postData[key];
                }
            });
            // 处理form补字段：keepFields.form数组，存在则跳过，不存在从页面表单读取回填
            if (Array.isArray(keepFields?.form)) {
                keepFields.form.forEach(fieldName => {
                    // 修改内容：已有空值也补；优先 formData，再读 DOM
                    if (postData[fieldName] != null && postData[fieldName] !== '') return;
                    var val = (this.formData && this.formData[fieldName]) || '';
                    if (val == null || val === '') {
                        var $elem = $(`input[name="${fieldName}"], #${fieldName}`);
                        if ($elem.length) val = $elem.last().val() || '';
                    }
                    if (val != null && val !== '') postData[fieldName] = val;
                });
            }

            // 填充子表缓存（校验 / 上传前需要完整行数据）
            subTables.forEach(({ cacheId }) => {
                if (cacheId) {
                    postData[cacheId] = table.cache[cacheId] || [];
                }
            });

            // 自定义校验
            if (typeof customValidates === 'function' && customValidates(postData) === false) {
                return false;
            }

            // 图片上传并回写到 postData
            if (!await imageUpload.submitAll(postData, subTables)) return false;

            // 子表仅保留表头可见且有 name 的字段
            const getVisibleFields = (cacheId) => {
                const $view = $(`#${cacheId},[lay-filter="${cacheId}"]`).first().next('.layui-table-view');
                const fields = $view.find('thead th[name]').not('.layui-hide')
                    .toArray()
                    .map(th => th.getAttribute('name'))
                    .filter(Boolean);
                let allFields = [...new Set(['F_Id', ...fields])]
                if (cacheId in keepFields) {
                    const addFields = keepFields[cacheId]
                    allFields = [...new Set(['F_Id', ...addFields, ...fields])]
                }
                return allFields;
            };

            subTables.forEach(({ cacheId }) => {
                if (!cacheId) return;
                const rows = postData[cacheId] || table.cache[cacheId] || [];
                const fields = getVisibleFields(cacheId);
                postData[cacheId] = rows.map(row => {
                    const data = {};
                    fields.forEach(f => {
                        if (Object.prototype.hasOwnProperty.call(row, f)) {
                            data[f] = row[f];
                        }
                    });
                    return data;
                });
            });

            if (typeof beforeRequest === 'function') beforeRequest(postData);
        },
    };

    // 值变化时写入 formData，由 watch 刷控件 / tableSelect.match
    var _oldVal = $.fn.val;
    $.fn.val = function (v) {
        if (!arguments.length) return _oldVal.apply(this, arguments);
        var r = _oldVal.apply(this, arguments);
        var fd = commonForm.formData;
        if (!fd) return r;
        this.each(function () {
            if (!this.id) return;
            var next = v == null ? '' : String(v);
            if (fd[this.id] !== next) fd[this.id] = next;
        });
        return r;
    };

    exports('commonForm', commonForm);
});