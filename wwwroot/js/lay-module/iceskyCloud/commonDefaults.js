/**
 * 公共默认配置：表单、表格、控件渲染、树表、分页。
 * 使用：commonDefaults.take(名称) 或 take('form'|'table'|'control', 控件类型)
 * 已有字段会盖掉这里的默认值，没写的字段和方法仍留在结果上。
 */
layui.define(['jquery'], function (exports) {
    var $ = layui.$;

    function formOn() {
        return { change: null, blur: null, click: null };
    }

    function tableOn() {
        return { change: null, click: null, keydown: null, keypress: null, keyup: null, focus: null, blur: null };
    }

    var form = {
        input: {
            disabled: false,
            readonly: false,
            precision: null,
            min: null,
            max: null,
            step: null,
            placeholder: '',
            prefix: '',
            suffix: '',
            on: formOn()
        },
        textarea: {
            disabled: false,
            readonly: false,
            maxlength: null,
            rows: null,
            placeholder: '',
            on: formOn()
        },
        date: {
            disabled: false,
            readonly: false,
            dateType: 'date',
            format: '',
            show: false,
            on: formOn()
        },
        imageUpload: {
            id: '',
            url: '/FileManage/Uploadfile/Upload',
            fileType: 1,
            maxCount: 1,
            value: [],
            readonly: false,
            width: 25,
            height: 25,
            on: formOn()
        },
        select: {
            el: '',
            on: formOn(),
            xmConfig: {
                el: '',
                name: '',
                disabled: false,
                tips: false,
                layVerify: '',
                layReqText: '',
                data: [],
                model: { label: { type: 'text' } },
                show: null,
                on: null
            }
        },
        tableSelect: {
            elem: '',
            sameApi: true,
            canInput: true,
            searchKey: 'keyword',
            searchPlaceholder: '关键词搜索',
            checkedKey: '',
            selected: [],
            istree: null,
            disabled: false,
            readonly: false,
            table: { url: '', cols: [], params: {}, page: false, height: 315, disabled: false },
            on: formOn(),
            beforeRender: function (tableOpts) { },
            setCustomConfig: function (tableConfig) { },
            beforeKeydownEnter: function (elem, checkStatus) { },
            afterKeydownEnter: function (elem, checkStatus) { },
            beforeBlur: function (elem, checkStatus) { },
            afterBlur: function (elem, checkStatus) { },
            onClose: function () { }
        }
    };

    var table = {
        input: {
            type: 'input',
            disabled: false,
            readonly: false,
            inputType: 'text',
            min: null,
            max: null,
            step: null,
            placeholder: '',
            verify: null,
            _cross: null,
            on: tableOn()
        },
        date: {
            type: 'date',
            disabled: false,
            readonly: false,
            dateType: 'date',
            format: '',
            verify: null,
            _cross: null,
            on: tableOn()
        },
        select: {
            type: 'select',
            disabled: false,
            readonly: false,
            radio: true,
            search: false,
            data: [],
            verify: null,
            _cross: null,
            on: tableOn()
        },
        tableSelect: {
            type: 'tableSelect',
            sameApi: true,
            canInput: true,
            disabled: false,
            readonly: false,
            searchKey: 'keyword',
            searchPlaceholder: '关键词搜索',
            checkedKey: '',
            istree: null,
            verify: null,
            _cross: null,
            table: { url: '', cols: [], params: {} },
            on: tableOn(),
            beforeRender: function (tableOpts) { },
            setCustomConfig: function (tableConfig) { },
            beforeKeydownEnter: function (elem, checkStatus) { },
            afterKeydownEnter: function (elem, checkStatus) { },
            beforeBlur: function (elem, checkStatus) { },
            afterBlur: function (elem, checkStatus) { },
            onClose: function () { }
        },
        imageUpload: {
            type: 'imageUpload',
            disabled: false,
            readonly: false,
            id: '',
            url: '/FileManage/Uploadfile/Upload',
            fileType: 1,
            auto: false,
            maxCount: 1,
            width: 25,
            height: 25,
            verify: null,
            _cross: null,
            on: tableOn()
        },
        checkbox: {
            type: 'checkbox',
            disabled: false,
            readonly: false,
            laySkin: 'switch',
            layText: '是|否',
            verify: null,
            _cross: null,
            on: tableOn()
        }
    };

    /** fieldControl 渲染时的公共项。单选/多选、日期格式、参照主键在调用处按字段覆盖 */
    var control = {
        input: { inputType: 'text' },
        textarea: {},
        date: { dateType: 'date', format: '' },
        checkbox: { laySkin: 'switch', layText: '是|否', filter: 'fieldControlCheck' },
        select: {
            size: 'mini',
            radio: true,
            clickClose: true,
            filterable: true,
            searchTips: '关键词搜索',
            style: { 'box-sizing': 'border-box' },
            toolbar: { show: true },
            model: { type: 'fixed', icon: 'show', label: { type: 'text' } }
        },
        tableSelect: {
            sameApi: true,
            canInput: true,
            checkedKey: '',
            setCustomConfig: function (tableConfig) { }
        },
        imageUpload: {},
        searchInput: {}
    };

    /** 树表 tree 配置 */
    var tree = {
        customName: {
            id: 'F_Id',
            pid: 'F_ParentId',
            name: 'F_FullName',
            isParent: 'haveChild',
            children: 'children'
        },
        view: {
            showIcon: true,
            expandAllDefault: false,
            iconClose: '<i class="layui-icon tree-icon-folder"></i>',
            iconOpen: '<i class="layui-icon tree-icon-folder-open"></i>',
            iconLeaf: '<i class="layui-icon tree-icon-file"></i>'
        },
        data: {
            isSimpleData: true,
            rootPid: '0'
        }
    };

    /** 参照面板里的树覆盖：默认展开，不级联勾选 */
    var treePanel = {
        view: { expandAllDefault: true },
        data: { cascade: 'none' }
    };

    /** layui.table 公共项。右键菜单、导出文件名、parseData 仍在表格模块里补 */
    var tableRender = {
        method: 'get',
        cellMinWidth: 48,
        limit: 20,
        limits: [10, 20, 30, 40, 50, 90],
        loading: false,
        autoSort: true,
        filter: { bottom: false },
        authorizeFields: true,
        autoColumnWidth: true,
        overflow: {
            type: 'tips',
            hoverTime: 300,
            color: 'black',
            bgColor: 'white',
            header: true,
            total: true
        },
        request: { pageName: 'page', limitName: 'rows' },
        defaultToolbar: []
    };

    var page = {
        layout: ['skip', 'prev', 'page', 'next', 'limit', 'count'],
        curr: 1,
        groups: 3,
        first: false,
        last: false
    };

    var treePage = {
        layout: ['count'],
        curr: 1
    };

    /** 调用方手写字段时的默认结构 */
    var formField = {
        label: '',
        id: '',
        required: false,
        md: 3,
        width: '', // 有值则 flex 固定宽自适应；区间为两框合计
        placeholder: '',
        disabled: false,
        hide: false,
        type: 'input',
        _raw: { F_ReferType: 2 },
        _template: {}
    };

    /** renderForm 入参 */
    var formRender = {
        elem: '',
        enCode: '',
        data: [],
        isEnabled: true,
        setCustomConfig: null,
        fields: null,
        filter: 'adminform',
        labelWidth: ''
    };
    // 获取配置入口
    function take(side, type) {
        var groups = {
            form: form,
            table: table,
            control: control,
            tree: tree,
            treePanel: treePanel,
            tableRender: tableRender,
            page: page,
            treePage: treePage,
            formField: formField,
            formRender: formRender
        };
        var group = groups[side];
        if (!group) return {};
        if (type == null || type === '') return $.extend(true, {}, group);
        var src = group[type];
        return $.extend(true, {}, src);
    }

    exports('commonDefaults', { take: take });
});
