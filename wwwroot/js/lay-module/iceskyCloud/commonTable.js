/*
================================================================================
commonTable 使用说明（导出方法：createtable / createtreetable / rendertable / reloadtable / rendertreetable / reloadtreetable / tableRowClick）
================================================================================
树表 createtreetable / rendertreetable / reloadtreetable：业务准备在 commonTable，纯渲染走 controls.treeTableControl.render
================================================================================

一、createtable（推荐入口：按 enCode 拉字段、拼列、渲染，并绑定行/工具栏事件）

// ---------- Index 列表页（createtable 固定可编辑；Index 默认禁 tableSelect，保留搜索/右侧工具）----------
commonTable.createtable({
    // 必填 / 常用
    elem: '#currentTableId',
    id: 'currentTableId',
    enCode: 'view_sche_schedule',        // 模块编码，用于 GetColsJson / 默认 url
    cols: [[{ type: 'checkbox', width: 50, fixed: 'left' }]], // 首列预留，后续列由字段配置追加
    tableFilter: 'currentTableFilter',    // lay-filter，默认 currentTableFilter

    // 数据源：无 data 时会按 enCode 自动拼 url
    // url: '/Public/GetTableJson',      // Index 默认拼这个，一般可不传

    // 无需传 isEditTable（createtable/createtreetable 固定可编辑）
    // Index 可用 excludeEditTypes 覆盖默认 ['tableSelect']
    method: 'post',                       // createtable 内部会强制改为 post
    type: 'checkbox',                     // 'checkbox' | 'radio'
    search: true,
    // 右侧工具。不传则：导入(模块开启时)、筛选、导出、打印、搜索；有方案搜索再加快捷搜索
    // 字符串用组件内置方法；同名对象可只重写 onClick
    // defaultToolbar: ['import', 'filter', 'exports', 'print', 'search', 'quickSearch']
    // defaultToolbar: ['filter', { name: 'exports', onClick: function (obj) {} }]
    // split: { icon, onClick } 拼在该按钮右边的小按钮，如搜索旁下拉箭头
    // toolbar: '#xxx' 有模板用手写、无则自动生成；false/不传=关闭。行按钮仅自动生成
    // limit / limits / page / height 可不传：用内置分页与高度自适应
    hideFields: ['F_Id'],                 // 按字段名隐藏列
    // 主字段不存在时，连带隐藏其子字段
    hiddenFields: { mainField: ['subField1', 'subField2'] },

    // 按钮显隐（按勾选数量）
    oneBtnList: ['NF-edit', 'NF-details'],
    moreBtnList: ['NF-delete'],
    // 行按钮条件模板替换
    user: {
        id: '@ViewData["CurrentUserId"]',
        role: '@ViewData["CurrentRoleId"]',
        org: '@ViewData["CurrentDeptId"]'
    },

    // 左侧树 + 右侧表（可选）
    // dtree: {
    //     elem: '#orgTree',
    //     url: '/xxx/GetTreeJson',
    //     whereField: 'organizeId',
    // },

    // 打印（工具栏 myPrint，可选）
    // printConfig: {
    //     tip: '确认打印？',
    //     beforeUpdate: function (config) { },
    //     updated:function (data) { }
    // },

    // 回调
    done: function (res, curr, count) { },
    clickfunction: function (obj) { },    // 行点击 / 勾选后
    onToolbar: function (obj) { },        // 工具栏事件
    onEditTool: function (obj) { },       // 单元格变更后
    // 搜索（快捷 / 方案）：返回 false 则不走内置 reloadSearchTable
    // onSearch: function (e) { // e.type: 'quick'|'plan', e.reloadCfg ...
    //     return false;
    // },
    // 快捷搜索（相关参数都写在这个对象里）
    // quickSearch: {
    //     elem: '#quickSearch', // 默认 #quickSearch
    //     fields: [...],
    //     data: {}
    // },
});

// ---------- Form 可编辑子表----------
commonTable.createtable({
    // 必填 / 常用
    elem: '#base_houseinfo_list',
    id: 'base_houseinfo_list',
    enCode: 'base_houseinfo_list',
    cols: [[{ type: 'checkbox', width: 50, fixed: 'left' }]],
    tableFilter: 'colorTableFilter',
    data: listData,
    isEnabled: true,                      // false 为只读（不传 isEditTable）
    search: false,
    toolbar: '#toolbarDemo',              // 有模板用手写；无模板则自动生成。false/不传=关闭
    defaultToolbar: [],
    limit: 9999,
    page: false,
    height: 'full-185',
    filter: { clearFilter: false },
    // 按字段名隐藏列
    hideFields: ['F_Id'],
    // 主字段不存在时，连带隐藏其子字段
    hiddenFields: { mainField: ['subField1', 'subField2'] },
    // 按钮显隐（按勾选数量）
    oneBtnList: ['NF-edit', 'NF-details'],
    moreBtnList: ['NF-delete'],
    // 行/勾选回调
    clickfunction:function (obj) {},
    // 回调
    done: function (res, curr, count) { },
    // 每列生成后钩子：可改编辑配置 / 事件
    setCustomConfig: function (col, config) {
        if (!config) return;
        config.on.click = function (obj) { console.log('click', obj); };
        config.on.change = function (obj) { console.log('change', obj); };
        // col.controlMap.F_Date.update({ dateType: 'month' }) 这一列
        // col.controlMap.F_Date(td).update({ disabled: true }) 这一格
        // col.controlMap.F_Date(tr).update({ disabled: true }) 这一行
        // col.controlMap.F_Date.update({ required: true }) 这一列必填
         // ----------------- tableSelect 专属钩子 -----------------
        config.canInput = false; // false：仅面板；默认 true 可手输
        config.beforeRender = function (tableOpts) { }; // 弹窗表格渲染前回调：可动态改 url、params、cols 等；返回 false 可阻止打开
        config.beforeKeydownEnter = function (elem, checkStatus) { }; // 回车确认前回调：返回 false 可中断后续回填逻辑
        config.afterKeydownEnter = function (elem, checkStatus) { }; // 回车确认并完成回填后的回调
    },
    onToolbar: function (obj) { },        // 工具栏 add/delete/自定义 lay-event
    onEditTool: function (obj) { },       // 行工具或编辑单元格变更后（eipTableEdit / tool）
});


一（附）、createtreetable（树表 Index；layui 官方 treeTable）

// ---------- 全量加载（平铺数据 isSimpleData）----------
commonTable.createtreetable({
    elem: '#currentTableId',
    id: 'currentTableId',
    url: '/ContentManage/ArticleCategory/GetTreeGridJson',
    cols: [[{ type: 'radio', width: 50 }, { field: 'F_FullName', title: '名称' }]],
    tree: {
        customName: { id: 'F_Id', pid: 'F_ParentId', name: 'F_FullName' },
        data: { isSimpleData: true, rootPid: '0' }
    }
});

// ---------- 懒加载（async.enable；首页 url 拉根，展开再按父节点拉）----------
commonTable.createtreetable({
    elem: '#currentTableId',
    id: 'currentTableId',
    enCode: 'view_base_mattype',
    cols: [[{ type: 'radio', width: 50 }]],
    tree: {
        customName: { id: 'F_Id', name: 'F_FullName', isParent: 'haveChild' },
        async: { enable: true }
    }
});

二、rendertable（底层渲染）
commonTable.rendertable(options, GetColsJson, function (res, curr, count) { });
// cols 可加 color、tip（悬停走 tipControl，按单元格顺序进 data）：{ color:'#2289ed', tip:true|{unit:'匹'|fn}|fn }
// tip 为函数时建议返回 { title, rows:[{ label, value, color? }] }

三、reloadtable（刷新）
// type: 'data' 只重载数据（默认）；'all' 整表重载
commonTable.reloadtable({ elem: 'currentTableId', page: true, curr: 1, where: {}, type: 'data' });

四、rendertreetable（官方 treeTable 首次渲染；已存在实例时内部也会 reload）
commonTable.rendertreetable(options);

四-b、reloadtreetable（树表搜索/刷新，已渲染后用这个，不要反复 rendertreetable）
// type: 'data' 只重载数据（默认）；'all' 清实例后整表重渲染
commonTable.reloadtreetable({ ...options, type: 'data' });

五、tableRowClick（树表第二个参数传 lay-filter）
commonTable.tableRowClick(type, tableFilter, tableId, oneList, moreList, clickfunction, tableOptions, onToolbar, onEditTool);
*/

layui.define(["jquery", "layer", 'table', 'treeTable', 'soulTable', 'common', 'controls', 'commonDefaults', 'laytpl', 'popupSearch', 'xmSelect', 'imageUpload', 'eipTableEdit', 'form', 'upload', 'searchInput', 'dtree', 'quickSearch'], function (exports) {
    var $ = layui.jquery,
        layer = layui.layer,
        soulTable = layui.soulTable,
        treeTable = layui.treeTable,
        common = layui.common,
        controls = layui.controls,
        commonDefaults = layui.commonDefaults,
        laytpl = layui.laytpl,
        table = layui.table,
        popupSearch = layui.popupSearch,
        xmSelect = layui.xmSelect,
        eipTableEdit = layui.eipTableEdit,
        imageUpload = layui.imageUpload,
        upload = layui.upload,
        form = layui.form,
        searchInput = layui.searchInput,
        dtree = layui.dtree,
        quickSearch = layui.quickSearch;
    // ===================== 【正确位置】全局缓存，只请求一次 =====================
    window._tableCommonCache = window._tableCommonCache || {};
    let cache = window._tableCommonCache;
    const currentPagePath = window.location.pathname;
    const pathSegments = currentPagePath.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1] || '';
    const pathname = pathSegments[pathSegments.length - 2] || ''
    let keyValue = $.request("keyValue")

    function isIndexPage() {
        return lastSegment === 'Index' || /\/index$/i.test(currentPagePath);
    }
    function isLoginPage() {
        return /(^|\/)login(\/|$)/i.test(currentPagePath);
    }

    function ensureClients() {
        top.clients = top.clients || {};
        top.clients.GetMainView = top.clients.GetMainView || {};
        return top.clients;
    }

    // form-item 下并排 ≥2 个「表格槽位」时打 class（按直系 col / 直系 table-view 计数）
    function markMultiTableFormItem(elem) {
        var $item = $(elem).closest('.layui-form-item');
        if (!$item.length) return;
        var n = $item.children('.layui-table-view').length
            + $item.children('[class*="layui-col-"]').filter(function () {
                return $(this).find('.layui-table-view').length;
            }).length;
        $item.toggleClass('ice-multi-table-row', n >= 2);
    }

    // ==========================
    // 【右键复制/粘贴】（单格可跨表/跨页；整行仅同源表）
    // ==========================
    var menuTd, menuTableId;

    function getCopy() {
        try { return JSON.parse(localStorage.getItem('iceskyTableCopy') || '{}'); } catch (e) { return {}; }
    }
    function setCopy(data) {
        localStorage.setItem('iceskyTableCopy', JSON.stringify(data));
    }
    function tableIdOf(obj) {
        return $(obj.cell).closest('.layui-table-view').attr('lay-table-id');
    }
    function colPick(obj, el) {
        var $td = $(obj.cell).closest('td[data-field]');
        var map = (table.getOptions(tableIdOf(obj)) || {}).controlMap || {};
        return map[$td.attr('data-field') || obj.field] && map[$td.attr('data-field') || obj.field](el || $td);
    }
    // 可编辑格子才可粘贴（整表只读时列上也会带 disabled）
    function cellOk($td) {
        var cfg = $td && ((($td.closest('.layui-table-view').data('eipAop') || {}).config || {}).colsConfig || {})[$td.attr('data-field')];
        return !!(cfg && !cfg.disabled);
    }
    // 工具栏按钮 id/name/lay-event 含 add → 可粘贴行；含 delete → 可删行
    function hasToolBtn(id, key) {
        return $('div[lay-table-id="' + (id || menuTableId) + '"] .layui-table-tool').find('[lay-event],button').filter(function () {
            const idVal = $(this).attr('id') || '';
            if (idVal === 'NF-add') return false;
            const s = [idVal, $(this).attr('name'), $(this).attr('lay-event')].join(' ');
            return new RegExp(key, 'i').test(s);
        }).length > 0;
    }
    // 有添加即可复制/粘贴/删除行（有添加即视为可删）
    function hasAddBtn(id) { return hasToolBtn(id, 'add'); }
    function tableOk(id) { return (table.getOptions(id || menuTableId) || {}).isEnabled !== false; }

    document.addEventListener('contextmenu', function (e) {
        menuTableId = $(e.target).closest('.layui-table-view').attr('lay-table-id') || null;
        var $td = $(e.target).closest('td');
        menuTd = $td.length ? $td : null;
    }, true);

    function copyCellMenu(obj) {
        var $td = $(obj.cell).closest('td');
        var api = colPick(obj);
        var text = String((api && api.getValue && api.getValue()) || '');
        // 不用 $td.text()：xm-select 会把全部选项名拼进来
        var display = (api && api.instance && api.instance.getValue && api.instance.getValue('nameStr'))
            || $.trim($td.find('> .layui-table-cell > .cell-text').text() || '')
            || text;
        setCopy($.extend(getCopy(), { text: text, display: display }));
    }
    function copyRowMenu(obj) {
        var tableId = tableIdOf(obj);
        var idx = $(obj.trElem || obj.cell).closest('tr').data('index');
        var row = (table.cache[tableId] || [])[idx];
        if (!row) {
            var api = colPick(obj, $(obj.trElem || obj.cell).closest('tr'));
            row = api && api.getValue ? api.getValue() : null;
        } else {
            row = $.extend(true, {}, row);
        }
        setCopy($.extend(getCopy(), { row: row || null, rowTableId: tableId }));
    }
    function pasteCellMenu(obj) {
        var buf = getCopy();
        var api = colPick(obj);
        if (api) api.setValue(buf.display || buf.text);
    }
    function pasteRowMenu(obj) {
        var buf = getCopy(), tableId = tableIdOf(obj);
        var row = $.extend(true, {}, buf.row);
        row.F_Id = uuid();
        table.reloadData(tableId, { data: (table.cache[tableId] || []).concat([row]), url: '' });
        imageUpload.refreshTable(tableId);
    }
    function deleteRowMenu(obj) {
        var tableId = tableIdOf(obj);
        var idx = $(obj.trElem || obj.cell).closest('tr').data('index');
        var cfg = table.getOptions(tableId) || {};
        var filter = $('#' + tableId).attr('lay-filter') || tableId;
        var $del = $('div[lay-table-id="' + tableId + '"] .layui-table-tool').find('[lay-event],button,#NF-delete').filter(function () {
            return /delete|del/i.test([$(this).attr('id'), $(this).attr('name'), $(this).attr('lay-event')].join(' '));
        }).first();
        layui.event.call(this, 'table', 'toolbar(' + filter + ')', {
            event: $del.attr('lay-event') || $del.attr('id') || $del.attr('name') || 'NF-delete',
            config: cfg,
            data: [(cfg.data || table.cache[tableId] || [])[idx]],
            index: [idx],
            type: 'contextmenu'
        });
    }

    var menuDivider = { type: 'divider' };
    // 刷新表格：重载当前表
    function refreshTableMenu(obj) {
        var id = menuTableId || (obj && tableIdOf(obj)) || (this && this.id);
        if (id) table.reloadData(id);
    }
    // 刷新当前：与页签「刷新当前」一致
    function refreshPageMenu() { location.reload(); }
    // 修改内容：首页 Index 在 disabled 里禁用非「复制文本」项
    var refreshMenuItems = [
        menuDivider,
        { name: '刷新表格', icon: 'layui-icon layui-icon-refresh-1', click: refreshTableMenu },
        { name: '刷新当前', icon: 'layui-icon layui-icon-refresh', click: refreshPageMenu }
    ];
    var bodyMenu = [
        { name: '复制文本', icon: 'layui-icon layui-icon-template', click: function (obj) { setCopy($.extend(getCopy(), { text: String(obj.text || ''), display: String(obj.text || '') })); soulTable.copy(obj.text); } },
        menuDivider,
        { name: '复制单格', icon: 'layui-icon layui-icon-template-1', disabled: function () { return isIndexPage() || !menuTd; }, click: copyCellMenu },
        { name: '粘贴单格', icon: 'layui-icon layui-icon-transfer', disabled: function () { return isIndexPage() || getCopy().text == null || !cellOk(menuTd); }, click: pasteCellMenu },
        menuDivider,
        { name: '复制整行', icon: 'layui-icon layui-icon-table', disabled: function () { return isIndexPage(); }, click: copyRowMenu },
        { name: '粘贴整行', icon: 'layui-icon layui-icon-download-circle', disabled: function () { return true; }, click: pasteRowMenu },
        { name: '删除整行', icon: 'layui-icon layui-icon-delete', disabled: function () { return isIndexPage() || !tableOk() || !hasAddBtn(); }, click: deleteRowMenu }
    ].concat(refreshMenuItems);
    var blankMenu = [
        { name: '复制文本', icon: 'layui-icon layui-icon-template', disabled: function () { return true; }, click: function (obj) { soulTable.copy(obj.text); } },
        menuDivider,
        { name: '复制单格', icon: 'layui-icon layui-icon-template-1', disabled: function () { return true; }, click: copyCellMenu },
        { name: '粘贴单格', icon: 'layui-icon layui-icon-transfer', disabled: function () { return true; }, click: pasteCellMenu },
        menuDivider,
        { name: '复制整行', icon: 'layui-icon layui-icon-table', disabled: function () { return true; }, click: copyRowMenu },
        { name: '粘贴整行', icon: 'layui-icon layui-icon-download-circle', disabled: function () { var b = getCopy(); return isIndexPage() || !tableOk() || !hasAddBtn() || !b.row || b.rowTableId !== menuTableId; }, click: pasteRowMenu },
        { name: '删除整行', icon: 'layui-icon layui-icon-delete', disabled: function () { return true; }, click: deleteRowMenu }
    ].concat(refreshMenuItems);

    // ==========================
    // 【全局公共默认配置】
    // ==========================

    const COMMON_TABLE_DEFAULTS = $.extend(true, {}, commonDefaults.take('tableRender'), {
        excel: { filename: '表格信息' + new Date().formatDate() + '.xlsx' },
        contextmenu: {
            header: [
                { name: '复制标题', icon: 'layui-icon layui-icon-template', click: function (obj) { soulTable.copy(obj.text); } }
            ].concat(refreshMenuItems),
            body: bodyMenu,
            total: [
                { name: '复制文本', icon: 'layui-icon layui-icon-template', click: function (obj) { soulTable.copy(obj.text); } }
            ].concat(refreshMenuItems),
            blank: blankMenu
        },
        parseData(res) {
            return {
                code: res.state,
                msg: res.message,
                count: res.count,
                data: res.data
            };
        },
    });

    const PAGE_DEFAULTS = commonDefaults.take('page');
    const TREE_PAGE_DEFAULTS = commonDefaults.take('treePage');
    const TABLE_JSON_URL = '/Public/GetTableJson';

    // 树表约定：首页/重载走 url；懒加载点开父节点再按 keyValue 拉子集
    function indexWhere(extra) {
        return $.extend({ type: 2, moduleEnCode: pathname }, extra || {});
    }
    function treeKeyParam(pid) {
        return JSON.stringify({ keyValue: pid == null || pid === '' ? '0' : String(pid) });
    }
    function treeFormat(options) {
        return options && options.tree && options.tree.async && options.tree.async.format;
    }
    // Layui 首次渲染只走 url/data，format 只在展开时触发；没 url 时先 format(null) 拿根节点
    function fillLazyRoot(opts) {
        var format = treeFormat(opts);
        if (opts.url || typeof format !== 'function') return;
        format(null, opts, function (list) { opts.data = list || []; });
    }
    function applyLazyTree(options) {
        if (!controls.treeTableControl.isLazy((options || {}).tree)) return;
        var asyncCfg = options.tree.async || (options.tree.async = {});
        asyncCfg.enable = true;
        if (typeof asyncCfg.format === 'function') return;
        options.where = options.where || {};
        if (!options.where.param) options.where.param = treeKeyParam('0');
        asyncCfg.format = function (row, _opts, done) {
            if (!row) return;
            common.ajax({
                url: TABLE_JSON_URL,
                dataType: 'json',
                async: false,
                data: indexWhere({ param: treeKeyParam(row.F_Id) }),
                success: function (res) { done(res.data || res || []); }
            });
        };
    }
    function isTreePaged(raw) {
        var currMod = treeGrid?.find(x => x.F_UrlAddress === currentPagePath);
        return (raw || {}).page !== false && currMod?.F_IsPage !== false;
    }
    function treePage(raw, isPaged) {
        if (!isPaged) return false;
        if (raw.page && typeof raw.page === 'object') return $.extend({}, TREE_PAGE_DEFAULTS, raw.page, { layout: ['count'] });
        if (raw.curr != null) return $.extend({}, TREE_PAGE_DEFAULTS, { curr: raw.curr });
        return $.extend({}, TREE_PAGE_DEFAULTS);
    }
    function reloadTreeIns(tableId, reloadCfg) {
        if (typeof treeTable.reloadData === 'function') treeTable.reloadData(tableId, reloadCfg);
        else treeTable.reload(tableId, reloadCfg);
    }

    // 关键字搜索：展开页面上原来的搜索条
    function handleSearchToolbar(event, tableId) {
        // 修改内容：快捷搜索不再共用这条搜索条
        if (event !== 'mySearch') return false;

        $('#searchField').toggleClass('layui-hide');
        table.resize(tableId);
        return true;
    }

    // 普通表走 table.reload，树表走 treeTable
    function reloadSearchTable(kind, tableId, reloadCfg) {
        reloadCfg.where = mergeWhere(reloadCfg.where);
        reloadCfg.url = TABLE_JSON_URL;
        if (kind === 'tree') {
            reloadTreeIns(tableId, reloadCfg);
            return;
        }
        table.reload(tableId, reloadCfg);
    }
    // 优先本次 opts，其次表格 where，最后 URL（方案搜索共用）
    function getLiveEnCodes(tableId, opts) {
        var w = {};
        try { w = ((table.getOptions(tableId) || {}).where) || {}; } catch (e) { }
        opts = opts || {};
        return {
            moduleEnCode: opts.moduleEnCode || w.moduleEnCode || pathname,
            enCode: opts.enCode || w.enCode || ''
        };
    }
    // 读/写「快捷搜索」全局展开状态；无参=读（未设置过时默认展开）。无字段只藏界面，不改这个状态
    function quickOpen(v) {
        try {
            if (arguments.length === 0) {
                var s = localStorage.getItem('iceskyQuickSearchOpen');
                return s == null ? true : s === '1';
            }
            localStorage.setItem('iceskyQuickSearchOpen', v ? '1' : '0');
        } catch (e) { return false; }
    }

    // 修改内容：快捷搜索改为通用 quickSearch 模块；显示/提示由表格外部控制
    function openQuickSearch(opts, isPaged, kind, quiet) {
        var qs = (opts && opts.quickSearch) || {};
        var elem = qs.elem || '#quickSearch';
        var $box = $(elem);
        if (!$box.length) {
            if (!quiet) layer.msg('页面缺少快捷搜索容器', { icon: 0 });
            syncQuickSearchIcon(opts && opts.id);
            return;
        }
        // 先按全局记忆状态摆好显隐，避免刷新时先展开再收起闪一下
        $box[quickOpen() ? 'removeClass' : 'addClass']('layui-hide');
        var api = quickSearch.render({
            elem: elem,
            moduleEnCode: opts && opts.moduleEnCode,
            fields: qs.fields,
            data: qs.data,
            setCustomConfig: qs.setCustomConfig,
            done: function () {
                // 渲染完成后仍以全局记忆状态为准（收起时保持收起）
                $box[quickOpen() ? 'removeClass' : 'addClass']('layui-hide');
                syncQuickSearchIcon(opts && opts.id);
                if (opts && opts.id) table.resize(opts.id);
            },
            onSearch: function (e) {
                var codes = getLiveEnCodes(opts.id, opts);
                var reloadCfg = {
                    where: {
                        type: 1,
                        moduleEnCode: codes.moduleEnCode,
                        keyword: JSON.stringify(e.keyword || []),
                        buttonEncode: (e.plan || {}).F_EnCode
                    }
                };
                if (codes.enCode) reloadCfg.where.enCode = codes.enCode;
                if (!isPaged) { reloadCfg.page = false; reloadCfg.limit = 10000; }
                else reloadCfg.page = { curr: 1 };
                if (typeof opts.onSearch === 'function'
                    && opts.onSearch({ type: 'quick', keyword: e.keyword, reloadCfg: reloadCfg, kind: kind }) === false) {
                    return false;
                }
                reloadSearchTable(kind, opts.id, reloadCfg);
            }
        });
        if (!api) {
            // 无字段只藏界面，不改全局展开状态（否则会把别的表的快捷搜索一起收起/展开）
            if (!quiet) layer.msg(qs.fields ? '暂无快捷搜索字段' : '未配置常用搜索', { icon: 0 });
            $box.addClass('layui-hide');
            syncQuickSearchIcon(opts && opts.id);
            if (opts && opts.id) table.resize(opts.id);
        }
    }

    // 修改内容：用 quickSearch.elem（默认 #quickSearch）判断展开/收起
    function syncQuickSearchIcon(tableId) {
        var $root = tableId ? $('#' + tableId).parent() : $(document);
        var qs = {};
        try { qs = (table.getOptions(tableId) || {}).quickSearch || {}; } catch (e) { }
        var $box = $(qs.elem || '#quickSearch');
        var open = $box.length && !$box.hasClass('layui-hide');
        var $btn = $root.find('[lay-event="myQuickSearch"]');
        if (!$btn.length) return;
        $btn.attr('title', open ? '收起' : '展开');
        $btn.find('i').attr('class', 'layui-icon fa ' + (open ? 'fa-angle-double-up' : 'fa-angle-double-down'));
    }

    // 这些事件的动作在工具 onClick 里，工具栏监听不再重复执行
    function isBuiltinToolbarEvent(event) {
        return event === 'myExport' || event === 'myPrint' || event === 'myImport'
            || event === 'mySearch' || event === 'myQuickSearch' || event === 'myCustomSearch';
    }

    // 工具栏添加按钮：事件名 add，或按钮编码 NF-add
    function isAddToolbarButton(obj, elem) {
        var eventName = String((obj && obj.event) || '');
        if (eventName === 'add' || eventName === 'NF-add') return true;
        var $btn = $(elem).closest('[lay-event]');
        var id = String($btn.attr('id') || $btn.attr('name') || '');
        return id === 'NF-add' || /^NF-add/i.test(id);
    }

    // 勾选行 → obj.data/index；默认 type=button（右键删除会带 type=contextmenu）
    function fillToolbarRow(obj) {
        if (!obj) return;
        if (obj.type == null) obj.type = 'button';
        if (obj.data != null || !(obj.config && obj.config.id)) return;
        var key = obj.config.checkName || 'LAY_CHECKED';
        obj.data = []; obj.index = [];
        (table.cache[obj.config.id] || []).forEach(function (r, i) {
            if (r && r[key]) { obj.data.push(r); obj.index.push(i); }
        });
    }
    // 仅右键删除：二次确认后按 index 本地删行
    function removeToolbarRows(obj) {
        var id = obj.config && obj.config.id;
        if (!id) return;
        layer.confirm('确定删除选中行吗？', { icon: 3, title: '提示' }, function (idx) {
            var skip = {};
            [].concat(obj.index || []).forEach(function (i) { skip[i] = 1; });
            table.reloadData(id, { data: (table.cache[id] || []).filter(function (r, i) { return !skip[i] && r && !Array.isArray(r); }), url: '' });
            imageUpload.refreshTable(id);
            layer.close(idx);
        });
    }
    // 导出本页 / 全部
    function openExportPanel(obj, tableId) {
        var $btn = $(obj && obj.elem);
        var currTableId = (obj && obj.config && obj.config.id) || tableId;
        $btn.parent().find('.layui-table-tool-panel').remove();
        var $panel = $([
            '<ul class="layui-table-tool-panel">',
            '   <li data-type="csv">导出本页数据</li>',
            '   <li data-type="xls">导出全部数据</li>',
            '</ul>'
        ].join(''));
        $btn.append($panel);
        $panel.on('click', function (e) { layui.stope(e); });
        $panel.children('li[data-type]').on('click', function (e) {
            layui.stope(e);
            var type = $(this).data('type');
            if (type === 'csv') table.exportFile(currTableId);
            else if (type === 'xls') soulTable.export(currTableId);
            $panel.remove();
        });
    }

    // 打印模板菜单
    function openPrintMenu(obj, tableId, printConfig, moduleEnCode) {
        $('.print-dropdown-menu').remove();
        var $realBtn = $(obj && obj.elem);
        var currTableId = (obj && obj.config && obj.config.id) || tableId;
        var selectedRows = (table.checkStatus(currTableId).data) || [];
        function getAllRows(callback) {
            var cfg = (obj && obj.config) || {};
            if (!cfg.url) return callback([]);
            $.ajax({
                url: cfg.url,
                type: cfg.method || 'GET',
                data: $.extend({}, cfg.where || {}, { page: 1, limit: 999999 }),
                dataType: 'json',
                success: function (res) { callback(res.data || []); },
                error: function () { callback([]); }
            });
        }
        function showMenu(allRows) {
            // 打印模板列表：优先按传入的 moduleEnCode 拼模块地址，没传则按当前页面 URL
            common.printList('1,2', function (res) {
                var data = (res || []).map(function (i) {
                    return {
                        name: i.F_FullName,
                        value: i.F_EnCode,
                        icon: 'layui-icon-file-b',
                        item: i,
                        type: i.F_PrintType == 1 ? '列表' : '表单'
                    };
                });
                if (!data.length) return layer.msg('无可用打印模板', { icon: 0 });
                common.showPrintMenu({
                    elem: $realBtn,
                    data: data,
                    width: '145px',
                    height: '200px',
                    callback: function (i) {
                        var cfg = {
                            tableId: i.data.item.F_PrintType,
                            content: i.data.item.F_PrintContent,
                            allRows: allRows,
                            selectedRows: selectedRows,
                            printConfig: printConfig
                        };
                        if (printConfig && printConfig.beforeUpdate && printConfig.beforeUpdate.call) {
                            if (printConfig.beforeUpdate(cfg) !== undefined) return;
                        }
                        if (printConfig && printConfig.tip) {
                            layer.confirm(printConfig.tip, { icon: 3, title: '提示' }, function (idx) {
                                common.doPrint(cfg);
                                layer.close(idx);
                            });
                            return;
                        }
                        common.doPrint(cfg);
                    }
                });
            }, moduleEnCode ? ('/Module/' + moduleEnCode + '/Index') : undefined);
        }
        selectedRows.length ? showMenu(selectedRows) : getAllRows(showMenu);
    }

    // 导入按钮出现后绑定上传
    function bindImportUpload(tableId) {
        var importElem = '.layui-table-tool [lay-event="myImport"]';
        if (!$(importElem).length) return;
        upload.render({
            elem: importElem,
            accept: 'file',
            exts: 'xls|xlsx',
            url: '/Public/Import?moduleEnCode=' + pathname,
            done: function (res) {
                if (res.code === 0) {
                    layer.msg('导入成功', { time: 1500 }, function () { table.reload(tableId); });
                } else {
                    layer.msg(res.msg, { icon: 2 });
                }
            },
            error: function () { layer.msg('导入失败', { icon: 2 }); }
        });
    }

    // 右侧按钮一次组装。字符串名走内置方法，{ name, onClick } 可重写对应内置工具
    function setupDefaultToolbar(opts, rawOptions, currMod, kind, isPaged) {
        const raw = rawOptions || {};
        const canImport = !!(top.clients.GetMainView && top.clients.GetMainView[pathname] && top.clients.GetMainView[pathname].IsImport);
        // 修改内容：树表也走方案搜索和快捷搜索
        const usePlan = !!(currMod && currMod.F_MainView);
        // 修改内容：手写 quickSearch.fields 时也挂快捷搜索按钮
        var qsCfg = raw.quickSearch || {};
        const hasQuickFields = !!(qsCfg.fields && qsCfg.fields.length);
        const useQuick = usePlan || hasQuickFields;
        const lastValues = {};

        function planField(item) {
            let tpl;
            try { tpl = JSON.parse(item.F_Template); } catch (e) { return null; }
            if (!tpl || !tpl.filter) return null;
            // 修改内容：只传 referType + template 元数据，单多选/树交给 fieldControl
            const type = getFieldEditType(tpl, item);
            const field = {
                label: item.F_FullName,
                name: item.F_EnCode,
                // 搜索必填单独配置（模板键 filterverify）；旧数据没有该键时回退到原来的表头/表体必填
                required: tpl.filterverify == null
                    ? !!(tpl.islistaddverify || tpl.isheadupdateverify)
                    : (tpl.filterverify === true || tpl.filterverify === 'true'),
                type: type,
                referType: item.F_ReferType,
                template: tpl
            };
            if (type === 'tableSelect' || type === 'select') {
                field.dataname = tpl.dataname;
                field.params = tpl.params;
                if (Array.isArray(tpl.data) && tpl.data.length) {
                    field.data = tpl.data.map(function (opt) {
                        return {
                            name: opt.name || opt.label || '',
                            value: opt.value == null ? '' : String(opt.value)
                        };
                    });
                }
            } else if (type === 'input') {
                if (['bigint', 'int', 'float', 'decimal'].indexOf(tpl.datatype) > -1) field.inputType = 'number';
            } else if (type === 'date') {
                field.dateType = tpl.datatype === 'datetime' || tpl.datatype === 'datetime2' ? 'datetime' : (tpl.datatype === 'time' || tpl.datatype === 'year' || tpl.datatype === 'month' ? tpl.datatype : 'date');
            }
            return field;
        }

        function openPlanPopup(plan) {
            const planKey = plan.item.F_Id || plan.name;
            popupSearch.render({
                fields: (JSON.parse(plan.value) || []).map(planField).filter(Boolean),
                items: plan.item,
                defaultValues: lastValues[planKey] ? Object.assign({}, lastValues[planKey]) : {},
                onSearch: function (values, items, index) {
                    const planParam = JSON.parse(items.F_PlanParam);
                    lastValues[planKey] = values;
                    const keyword = [];
                    Object.keys(values).forEach(function (key) {
                        const fieldVal = values[key];
                        const planItem = (planParam || []).find(function (item) { return item.F_EnCode === key; });
                        if (planItem && (planItem.F_ReferType == 4 || planItem.F_ReferType == 5)) key = key.replace('F_', 'Tree_');
                        fieldVal.field = key;
                        if (fieldVal.isRange) {
                            if (fieldVal.from) keyword.push({ field: key, op: '>=', value: fieldVal.from, displayValue: fieldVal.from });
                            if (fieldVal.to) keyword.push({ field: key, op: '<=', value: fieldVal.to, displayValue: fieldVal.to });
                            return;
                        }
                        if (fieldVal.value && (fieldVal.op === 'in' || fieldVal.op === 'not in')) {
                            fieldVal.value = String(fieldVal.value).replace(/‵/g, '').split(',').map(function (id) { return '‵' + id + '‵'; }).join(',');
                        }
                        keyword.push(fieldVal);
                    });
                    const treeSel = controls.dtreeControl.getSelection();
                    if (treeSel.nodeId) keyword.push({ field: treeSel.whereField, op: '=', value: treeSel.nodeId });

                    const saveBoxes = $("input[name='saveplan']");
                    if (saveBoxes[0].checked || saveBoxes[1].checked) {
                        let history = [];
                        const rawHistory = plan.item.F_PlanHistory;
                        if (rawHistory) {
                            try {
                                const parsed = typeof rawHistory === 'string' ? JSON.parse(rawHistory) : rawHistory;
                                history = Array.isArray(parsed) ? parsed : [];
                            } catch (e) { history = []; }
                        }
                        const searchName = $('#schemeInput').val();
                        const planItem = {
                            F_Id: uuid(),
                            F_SearchName: searchName,
                            F_IsPublic: saveBoxes[0].checked ? 1 : 0,
                            F_PlanFields: JSON.stringify(keyword),
                            F_CreatorUserId: currentUser.F_Id
                        };
                        const existIdx = history.findIndex(function (p) { return p.F_SearchName === searchName; });
                        if (existIdx > -1) {
                            history[existIdx] = Object.assign({}, history[existIdx], {
                                F_SearchName: searchName,
                                F_IsPublic: planItem.F_IsPublic,
                                F_PlanFields: planItem.F_PlanFields
                            });
                        } else {
                            history.push(planItem);
                        }
                        syncAjax('/SystemManage/ModulePlan/SubmitForm', { keyValue: plan.item.F_Id, F_PlanHistory: JSON.stringify(history) }, 'Post');
                    }
                    layer.close(index);
                    // 修改内容：编码实时从表格当前配置取，切换 tab 页后跟随新模块
                    const codes = getLiveEnCodes(opts && opts.id, opts);
                    const reloadCfg = {
                        where: {
                            type: 1,
                            moduleEnCode: codes.moduleEnCode,
                            keyword: JSON.stringify(keyword),
                            buttonEncode: items.F_EnCode
                        }
                    };
                    // 修改内容：配置了 enCode 就带给 GetTableJson，没配置不带
                    if (codes.enCode) reloadCfg.where.enCode = codes.enCode;
                    if (!isPaged) {
                        reloadCfg.page = false;
                        reloadCfg.limit = 10000;
                    } else {
                        reloadCfg.page = { curr: 1 };
                    }
                    // 外部 onSearch 返回 false：不刷新、不关弹窗
                    if (typeof opts.onSearch === 'function'
                        && opts.onSearch({ type: 'plan', values: values, items: items, keyword: keyword, reloadCfg: reloadCfg, kind: kind, index: index }) === false) {
                        return false;
                    }
                    reloadSearchTable(kind, opts.id, reloadCfg);
                }
            });
        }

        function openPlanSearch(obj, isDrop) {
            // 搜索方案列表：优先按传入的 moduleEnCode 拼模块地址（后台按 F_EnCode 匹配），没传则按当前页面 URL
            const planUrl = (opts && opts.moduleEnCode) ? ('/Module/' + opts.moduleEnCode + '/Index') : currentPagePath;
            const data = (syncAjax('/SystemManage/ModulePlan/GetListJson', { url: planUrl, page: 1, rows: 9999 }) || []).map(function (i) {
                return {
                    name: i.F_PlanName,
                    value: i.F_PlanParam,
                    icon: 'layui-icon-template-1',
                    item: i,
                    type: i.F_Stored ? '过程' : '查询'
                };
            });
            if (isDrop) {
                const list = data.filter(function (p) { return p.item.F_PlanType != 0; });
                if (!list.length) return layer.msg('暂无可用功能', { icon: 0 });
                common.showPrintMenu({
                    elem: (obj && obj.elem) || $('.layui-table-tool [lay-event="myCustomSearch"]'),
                    data: list,
                    width: '145px',
                    height: '200px',
                    callback: function (i) { openPlanPopup(i.data); }
                });
                return;
            }
            const hit = data.find(function (p) { return p.item.F_PlanType == 0; });
            if (!hit) return layer.msg('暂无搜索方案', { icon: 0 });
            openPlanPopup(hit);
        }

        const builtins = {
            import: { name: 'import', title: '导入', layEvent: 'myImport', icon: 'layui-icon-upload-drag' },
            exports: {
                name: 'exports', title: '导出', layEvent: 'myExport', icon: 'layui-icon-export',
                onClick: function (obj) { openExportPanel(obj, opts.id); }
            },
            print: {
                name: 'print', title: '打印', layEvent: 'myPrint', icon: 'layui-icon-print',
                onClick: function (obj) { openPrintMenu(obj, opts.id, opts.printConfig, opts.moduleEnCode); }
            },
            search: usePlan ? {
                name: 'search', title: '搜索', layEvent: 'myCustomSearch', icon: 'layui-icon-search',
                onClick: function (obj) { openPlanSearch(obj, false); },
                split: { icon: 'layui-icon-down', onClick: function (obj) { openPlanSearch(obj, true); } }
            } : {
                name: 'search', title: '搜索', layEvent: 'mySearch', icon: 'layui-icon-search',
                onClick: function () { handleSearchToolbar('mySearch', opts.id); }
            },
            quickSearch: {
                name: 'quickSearch', title: '展开快捷搜索', layEvent: 'myQuickSearch', icon: 'fa fa-angle-double-down',
                onClick: function () {
                    var $box = $((((opts && opts.quickSearch) || {}).elem) || '#quickSearch');
                    if ($box.length && !$box.hasClass('layui-hide')) {
                        quickOpen(false);
                        $box.addClass('layui-hide');
                        syncQuickSearchIcon(opts.id);
                        table.resize(opts.id);
                        return;
                    }
                    quickOpen(true);
                    openQuickSearch(opts, isPaged, kind);
                }
            }
        };
        // 字符串用内置；带 name 的对象盖住同名内置（可只改 onClick）
        function resolveTool(item) {
            if (item == null || item === false) return null;
            if (typeof item === 'string') return builtins[item] ? $.extend({}, builtins[item]) : item;
            if (typeof item === 'object' && item.name && builtins[item.name]) return $.extend({}, builtins[item.name], item);
            return item;
        }
        var names = Array.isArray(raw.defaultToolbar) ? raw.defaultToolbar : null;
        if (!names) {
            names = [];
            if (canImport) names.push('import');
            names.push('filter', 'exports', 'print');
            if (opts.search !== false) {
                // 修改内容：页面上已有快捷搜索时，树表不再放原来的放大镜搜索
                if (!(kind === 'tree' && $(qsCfg.elem || '#quickSearch').length)) names.push('search');
                // 修改内容：有方案或手写字段都挂快捷搜索
                if (useQuick) names.push('quickSearch');
            }
        }
        opts.defaultToolbar = names.map(resolveTool).filter(function (item) { return item != null && item !== false; });
        // 有快捷搜索：按全局记忆状态展开/收起（不再强制 quickOpen(true)，否则刷新后会把 0 改回 1）
        if (useQuick && opts.search !== false) {
            openQuickSearch(opts, isPaged, kind, true);
            syncQuickSearchIcon(opts.id);
        } else if (opts.search !== false) {
            syncQuickSearchIcon(opts.id);
        }
    }

    ensureClients();
    if (!cache.treeGrid) {
        cache.treeGrid = [];
        if (!isLoginPage()) {
            let data = syncAjax("/SystemManage/Module/GetTreeGridJson")?.data || [];
            cache.treeGrid = Array.isArray(data) ? data.filter(item => !!item.F_UrlAddress) : [];
        }
    }
    const treeGrid = cache.treeGrid;
    if (pathname && !isLoginPage()) {
        if (!top.clients.GetMainView[pathname]) {
            top.clients.GetMainView[pathname] = syncAjax('/SystemManage/Module/GetMainView', { encode: pathname }) || {};
        }
        window.mainTableId = top.clients.GetMainView[pathname].mainTable;
    }
    // 同步ajax请求（必须放在 layui.define 内部）
    function syncAjax(url, data, type = 'GET') {
        let result = null;
        common.ajax({
            type: type,
            url: url,
            data: data,
            async: false,
            success: res => { result = res || []; }

        });
        return result;
    }
    // 修改内容：选项存在列上，按这一格的 params 当 key 取；格子不存列表
    function cellSelectData(col, row) {
        var json = col && col._template;
        var fallback = (col && col.config && col.config.data) || [];
        if (!json || !json.params || !json.dataname) return fallback;
        // 全局按 encode+param 缓存，多行/多列同条件只打一次
        return common.refSelect(json.dataname, common.buildParams(json.params, row || {}).params);
    }

    function getFieldEditType(json, item) {
        if (json && Array.isArray(json.data) && json.data.length) return 'select';
        return controls.fieldControl.type(json, item, { scene: 'table' });
    }
    function init(options) {
        const enCode = options?.enCode
        const IsIndex = isIndexPage();
        // 按照表名分别缓存字段定义，避免所有表的GetColsJson共享
        if (!cache.GetColsJsonByTable) {
            cache.GetColsJsonByTable = {};
        }
        if (enCode && !cache.GetColsJsonByTable[enCode]) {
            let sendData = { enCode, IsIndex, page: 1, rows: 9999 }
            let res = syncAjax(`/SystemManage/ModuleFields/GetColsJson`, sendData);
            cache.GetColsJsonByTable[enCode] = res || [];
        }
        if (lastSegment == 'Index') {
            // 修改内容：enCode / moduleEnCode 一次传进 indexWhere，避免后写再被 pathname 盖掉
            // 多表时各自 enCode 进 where，否则 GetTableJson 会回退到模块主视图
            const pass = {};
            if (options.enCode) pass.enCode = options.enCode;
            if (options.moduleEnCode) pass.moduleEnCode = options.moduleEnCode;

            // 页面已写 url 或显式传了 data（含 []）或懒加载 format 时，不自动拼 GetTableJson
            if (!options.url && !Array.isArray(options.data) && typeof treeFormat(options) !== 'function') {
                options.url = TABLE_JSON_URL;
                options.where = $.extend({}, options.where, indexWhere(pass));
            } else if (pass.enCode || pass.moduleEnCode) {
                options.where = $.extend({}, options.where, pass);
            }
            if (options.dtree) {
                options.where = $.extend({}, options.where, indexWhere(pass), { param: JSON.stringify({ field: '' }) });
            }
            applyLazyTree(options);
        }
        return {
            GetColsJson: enCode ? cache.GetColsJsonByTable[enCode] : [],
        }
    }
    // 重载 where：默认首页参数 + 上一次条件 + 这次传入的
    function mergeWhere(where, tableId) {
        var last = {};
        try {
            if (tableId) last = (table.getOptions(tableId) || {}).where || {};
        } catch (e) { last = {}; }
        return $.extend({}, indexWhere(), last, where || {});
    }
    function setBtnVisible(names, show) {
        (names || []).forEach(n => $(`[name="${n}"]`)[show ? 'removeClass' : 'addClass']('layui-hide'));
    }

    // 点这些地方只是在改单元格，不是换选中行（td[lay-event] 另判：只读列要能点行勾选）
    var editorClickSelector = 'input, textarea, button, a, select, .layui-table-edit, .eip-table-edit, .layui-form-select, .tableSelect, .layui-laydate, xm-select, .xm-select, .cell-keep';
    // 每张表“选中后才显示”的按钮。reload 会按模板重画工具栏，单选事件不会再来
    var tableClickState = {};

    function isEditorClick(evt) {
        if (!evt || !evt.target) return false;
        var $t = $(evt.target);
        if ($t.closest(editorClickSelector).length) return true;
        var $td = $t.closest('td[lay-event]');
        if (!$td.length) return false;
        var field = $td.attr('data-field');
        var aop = $td.closest('.layui-table-view').data('eipAop');
        var cfg = field && aop && aop.config && aop.config.colsConfig && aop.config.colsConfig[field];
        // 无编辑类型 / 禁用 / 只读：当作普通单元格，允许行选中
        if (!cfg || !cfg.type || cfg.disabled || cfg.readonly) return false;
        return true;
    }

    // 重绘后行上还有 LAY_CHECKED，就把删除等按钮重新打开。只选一行时单行按钮也打开
    function restoreCheckedButtons(tableId) {
        var state = tableClickState[tableId];
        if (!state) return;
        var checkedCount = 0;
        (table.cache[tableId] || []).forEach(function (row) {
            if (row && row.LAY_CHECKED) checkedCount++;
        });
        if (!checkedCount) return;
        setBtnVisible(state.moreList, true);
        setBtnVisible(state.oneList, checkedCount === 1);
    }

    function syncRowClickButtons(obj, oneList, moreList, checkedLen, allCount) {
        if (sessionStorage.getItem('iceskycloudButtonHumanized')) {
            setBtnVisible(oneList, true);
            setBtnVisible(moreList, true);
            return;
        }
        if (obj.type === 'all') {
            if (obj.checked && allCount > 0) {
                setBtnVisible(oneList, allCount <= 1);
                setBtnVisible(moreList, true);
            } else {
                setBtnVisible(oneList, false);
                setBtnVisible(moreList, false);
            }
        } else if (checkedLen > 1) {
            setBtnVisible(oneList, false);
            setBtnVisible(moreList, true);
        } else if (checkedLen === 1) {
            setBtnVisible(oneList, true);
            setBtnVisible(moreList, true);
        } else {
            setBtnVisible(oneList, false);
            setBtnVisible(moreList, false);
        }
    }

    // ==========================
    // 工具函数：单元格鼠标样式（按 data-field，普通表/树表通用）
    // ==========================
    function setCellCursor(cols, tableId) {
        if (!cols?.[0]) return;
        const $view = tableId
            ? $(`#${tableId},[lay-filter="${tableId}"]`).first().next('.layui-table-view')
            : $(document);
        if (!$view.length) return;

        cols[0].forEach(col => {
            if (!col?.config?.type || !col.field) return;
            var type = col.config.type;
            var locked = !!(col.config.disabled || col.config.readonly);
            var cursor = 'default';
            if (!locked && type === 'select') cursor = col.config.search ? 'text' : 'pointer';
            else if (!locked && (type === 'input' || type === 'textarea')) cursor = 'text';
            else if (!locked && (type === 'date' || type === 'tableSelect' || type === 'imageUpload')) cursor = 'pointer';
            $view.find('td[data-field="' + col.field + '"] .layui-table-cell').css('cursor', cursor);
        });
    }

    /**
     * 按合并列分组插入小计行。
     * @param {Array} GetColsJson - 配置字段数组
     * @param {Array} data - 需处理的数据数组
     * @returns {Array}
     *
     * 显示小计行需同时满足：
     * 1. 至少配置一个合并列（F_IsMerge）
     * 2. 至少有一个字段勾选了合计（F_IsTotal），且模板中开启了小计（subtotal）
     * 小计按「第一个合并列」分组：该列连续相同值且行数 > 1 时，在组末插入一行小计
     */
    function processDataWithSubTotal(GetColsJson, data) {
        if (!Array.isArray(data) || !data.length) return data;

        const cols = GetColsJson || [];

        // 合并列字段
        const mergeFields = cols.filter(x => x.F_IsMerge).map(x => x.F_EnCode);

        // 开启了「合计 + 小计」的字段
        const totalFields = cols.filter(item => {
            if (!item.F_IsTotal || !item.F_Template) return false;
            try {
                const tpl = typeof item.F_Template === 'string'
                    ? JSON.parse(item.F_Template)
                    : item.F_Template;
                return tpl.subtotal === true || tpl.subtotal === 'true';
            } catch (e) {
                return false;
            }
        }).map(item => item.F_EnCode);

        // 没有合并列或没有小计字段，原样返回
        if (!mergeFields.length || !totalFields.length) return data;

        const groupField = mergeFields[0];
        const result = [];
        let group = [];
        let lastValue;

        const isEmpty = v => v == null || v === '';

        // 生成当前分组的小计行
        function buildSubtotalRow() {
            const subtotal = { ...group[group.length - 1] };

            // 合计字段：数字累加，保留两位小数（加零宽前缀，避免被当成普通值处理）
            totalFields.forEach(field => {
                const sum = group.reduce((total, row) => {
                    const num = Number(row[field]);
                    return isNaN(num) ? total : total + num;
                }, 0);
                subtotal[field] = '\u200B' + sum.toFixed(2);
            });

            // 非合计字段清空（保留 layui 内部索引）
            Object.keys(subtotal).forEach(key => {
                if (!totalFields.includes(key) && key !== 'LAY_INDEX' && key !== 'LAY_NUM') {
                    subtotal[key] = '';
                }
            });

            // 合并列写「小计」，避免被竖向合并吃掉
            subtotal[groupField] = '小计';
            subtotal._isSubTotal = true;
            return subtotal;
        }

        // 把当前分组写入结果；多于 1 行时追加小计
        function flushGroup() {
            if (!group.length) return;
            result.push(...group);
            if (group.length > 1) {
                result.push(buildSubtotalRow());
            }
            group = [];
        }

        for (const row of data) {
            const val = row[groupField];

            // 空值单独成行，不参与分组小计
            if (isEmpty(val)) {
                flushGroup();
                result.push(row);
                continue;
            }

            // 分组值变化时，先结算上一组
            if (group.length > 0 && val !== lastValue) {
                flushGroup();
            }

            group.push(row);
            lastValue = val;
        }

        flushGroup();
        return result;
    }

    function markSubtotalRows(id) {
        (table.cache[id] || []).forEach(function (row, i) {
            if (!row || !row._isSubTotal) return;
            $('#' + id).next('.layui-table-view').find('tr[data-index="' + i + '"]')
                .css('background-color', '#fbe6b5').find('.laytable-cell-radio,.laytable-cell-checkbox').empty();
        });
    }

    // 合并单元格（小计行、空值都会打断合并）
    // $rows 必须是主表 tr（不要含 fixed 操作列行）
    function mergeCells($rows, colsJson) {
        const mergeFields = (colsJson || [])
            .filter(x => x.F_IsMerge)
            .map(x => x.F_EnCode);

        if (!mergeFields.length || !$rows.length) return;

        const rows = $rows.get().map(tr => [...tr.children]);
        const fieldNames = rows[0].map(td => td.getAttribute('data-field') || '');
        // 只合并有业务 field 的列，排除操作列（无 field / 带行按钮）
        const colIndexes = mergeFields
            .map(f => fieldNames.indexOf(f))
            .filter(i => {
                if (i < 0) return false;
                const td = rows[0][i];
                if (!td) return false;
                if (!td.getAttribute('data-field')) return false;
                if (td.querySelector('a[lay-event], .layui-btn, button[lay-event]')) return false;
                return true;
            });

        if (!colIndexes.length) return;

        const cellText = (r, c) => (rows[r]?.[c]?.textContent || '').trim();
        const isSubtotalRow = r => !!rows[r]?.some(td => (td.textContent || '').trim() === '小计');

        function applyRowSpan(colIndex, from, to) {
            const span = to - from;
            if (span <= 1 || isSubtotalRow(from)) return;
            const master = rows[from][colIndex];
            if (!master || master.querySelector('a[lay-event], .layui-btn, button[lay-event]')) return;

            master.rowSpan = span;
            for (let r = from + 1; r < to; r++) {
                const td = rows[r][colIndex];
                if (td) td.classList.add('layui-hide', 'soul-merge-hide');
            }
        }

        colIndexes.forEach(colIndex => {
            let start = 0;
            let startVal = cellText(0, colIndex);

            for (let i = 1; i <= rows.length; i++) {
                const atEnd = i >= rows.length;
                const curr = atEnd ? '' : cellText(i, colIndex);
                const canContinue = !atEnd
                    && !isSubtotalRow(i)
                    && !isSubtotalRow(start)
                    && curr
                    && curr === startVal;

                if (canContinue) continue;

                applyRowSpan(colIndex, start, i);
                start = i;
                startVal = curr;
            }
        });
    }

    // 合计列配置：仅叶子列（field / 选择列），兼容复杂表头（cols[0] 分组 + cols[1] 叶子）
    function applyTotalRowConfig(cols, colsJson) {
        if (!Array.isArray(cols) || !cols.length) return cols;
        const totalFields = new Set((colsJson || []).filter(x => x.F_IsTotal && x.F_EnCode).map(x => x.F_EnCode));
        const isLeaf = col => col && !(col.colspan > 1) && !!(col.field || ['checkbox', 'radio', 'numbers'].includes(col.type));
        let firstLeaf = true;

        return cols.map(row => Array.isArray(row) ? row.map(col => {
            if (col.width == null) col.width = 'auto';
            if (!isLeaf(col)) return col;
            const newCol = { ...col };
            if (firstLeaf) {
                newCol.totalRow = '合计';
                firstLeaf = false;
            } else if (newCol.field && totalFields.has(newCol.field)) {
                newCol.totalRow = true;
            }
            return newCol;
        }) : row);
    }

    // 复杂表头
    function generateComplexCols(base, groups) {
        const fieldGroup = {}, groupIdx = {};
        Object.entries(groups).forEach(([g, fs]) => fs.forEach(f => fieldGroup[f] = g));
        base.forEach((col, i) => { const g = fieldGroup[col.field]; if (g) (groupIdx[g] || (groupIdx[g] = [])).push(i); });
        const r1 = [], r2 = [], used = new Set();
        let i = 0;
        while (i < base.length) {
            const g = fieldGroup[base[i].field];
            if (g && !used.has(g)) { used.add(g); const idxs = groupIdx[g]; r1.push({ title: g, colspan: idxs.length, align: 'center' }); idxs.forEach(x => r2.push(base[x])); i += idxs.length; }
            else { r1.push({ ...base[i], rowspan: 2 }); i++; }
        }
        return [r1, r2];
    }

    /** 公共列外观：排序 / 对齐 / 过滤 / 固定 / 宽度 */
    function applyCommonColConfig(col, json) {
        if (!json) return;
        col.sort = Boolean(json.order) ?? false;
        col.align = json.align ?? 'left';
        if (Boolean(json.filter) ?? false) {
            if (['date', 'time', 'datetime', 'datetime2', 'year', 'month'].indexOf(json.datatype) >= 0) {
                col.filter = { type: 'date[' + common.formatsDateType(json.datatype).replace(/YYYY/g, 'yyyy').replace(/DD/g, 'dd').replace(/-/g, '/') + ']' };
            } else {
                col.filter = true;
            }
        }
        if (json.fixed) col.fixed = json.fixed;
        switch (json.formwidth ?? '0') {
            case '1':
                col.width = json.width;
                break;
            case '2':
                col.minWidth = json.minWidth;
                col.maxWidth = json.maxWidth;
                break;
            default:
                col.width = 'auto';
        }
    }

    /**
     * createtable / createtreetable 统一生成可编辑列（eipTableEdit）。
     * Index：默认排除 tableSelect；不注入交叉列。Form：完整编辑能力。
     */
    function buildTableCols(data, btns, tableOpts) {
        const isIndex = isIndexPage();
        var controlMap = {};
        var colsByField = {};
        tableOpts.controlMap = controlMap;
        function each(bag, fn) {
            Object.keys(bag).forEach(function (k) {
                if (/^\d+$/.test(k) && bag[k]) fn(bag[k], k);
            });
        }
        // createtable 固定可编辑：未显式 isEnabled:false 即可改；Details 等只读页传 false
        const isEnabled = tableOpts?.isEnabled !== false;
        const allowCellEdit = isEnabled;
        const hasActivityId = !!(history.state?.routeState || {}).F_ActivityId;
        const excludeEditTypes = Array.isArray(tableOpts?.excludeEditTypes)
            ? tableOpts.excludeEditTypes
            : (isIndex ? ['tableSelect'] : []);
        let cols = [];

        (data || []).forEach(item => {
            const rawTpl = item && item.F_Template;
            const json = !rawTpl ? null : (typeof rawTpl === 'string' ? JSON.parse(rawTpl) : rawTpl);
            if (!json) return;

            let col = {
                field: item.F_ReNameCode || item.F_EnCode || '',
                title: item.F_ReNameCn || item.F_FullName || '',
                _raw: item,
                _template: json,
            };

            let required = false, disabled = false, hide = false;
            if (isEnabled) {
                if (!keyValue) {
                    required = !!json.islistaddverify;
                    disabled = !!json.islistedit;
                    hide = !json.islist;
                } else {
                    required = !!json.islistupdateverify;
                    disabled = !!json.islistupdateedit;
                    hide = !json.islistupdate;
                }
            } else {
                required = !!json.islistupdateverify;
                disabled = !!json.islistupdateedit;
                hide = !json.islistupdate;
            }

            const needHide = hide || item.F_EnCode === 'F_Id' || (tableOpts?.hideFields?.includes(item.F_EnCode));
            if (needHide) col.hide = true;

            if (!col.hide && json.cross) col._cross = json.cross.split(',');
            col.title = item.F_ReNameCn || item.F_FullName || '';
            col.config = {
                required: required,
                verify: required ? { type: 'required' } : null,
                _template: json,
                ...(col._cross ? { _cross: col._cross } : {})
            };
            if (json.templet) {
                col.templet = new Function('d', json.templet);
            } else {
                col.templet = (d) => {
                    let val = d?.[col.field] ?? d?.[item.F_EnCode];
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        const text = val.displayValue ?? val.name ?? val.value ?? '';
                        return common.escapeHtml(text);
                    }
                    if (col.config?.type === 'select' && val != null && val !== '') {
                        const parts = String(val).split(',').filter(Boolean);
                        const list = cellSelectData(col, d);
                        const hit = p => list.find(x => String(x.value) === String(p) || String(x.name) === String(p));
                        return common.escapeHtml(parts.map(p => {
                            const x = hit(p);
                            return x ? x.name : p;
                        }).join(','));
                    }
                    if (['date', 'time', 'datetime', 'datetime2', 'year', 'month'].includes(json.datatype) && val != null && val !== '') {
                        val = common.formatDateValue(val, json.datatype);
                    }
                    return common.escapeHtml(val ?? '');
                };
            }

            let fieldType = getFieldEditType(json, item);
            // 修改内容：隐藏列统一当 input（与表单一致），只存值不挂编辑
            if (col.hide) fieldType = 'input';
            // 修改内容：identity 用 Layui 序号列
            if (json.datatype === 'identity') col.type = 'numbers';
            const globalReadonly = !!hasActivityId;
            // 列合并（F_IsMerge）与单元格编辑互斥：合并列不可编辑
            const isMergeCol = !!item.F_IsMerge;
            const isReadonly = globalReadonly || disabled || !allowCellEdit || isMergeCol
                || !fieldType
                || !!(fieldType && excludeEditTypes.includes(fieldType));
            var patch = { disabled: isReadonly };
            if (!fieldType) patch.type = '';
            if (fieldType === 'date') {
                patch.dateType = json.datatype === 'datetime' || json.datatype === 'datetime2' ? 'datetime' : (json.datatype === 'time' || json.datatype === 'year' || json.datatype === 'month' ? json.datatype : 'date');
            } else if (fieldType === 'tableSelect') {
                $.extend(patch, common.tableSelectUtil.buildConfig({
                    dataname: json.dataname || '',
                    referType: item.F_ReferType,
                    paramsStr: json.params,
                    searchKey: json.searchKey,
                    searchPlaceholder: json.searchPlaceholder
                }));
            } else if (fieldType === 'imageUpload') {
                patch.id = '#' + col.field;
                patch.auto = isIndexPage();
                patch.maxCount = json.length ? Math.round(Number(json.length) / 50) : 1;
                // 与 cellEdit 同一套 isReadonly：只读时隐藏上传/删除
                if (isReadonly) patch.readonly = true;
            }
            // 可编辑列（含图片）挂 cellEdit；只读列不挂，避免拦行选中
            if (fieldType && !isReadonly) col.event = 'cellEdit';
            col.config = $.extend({}, commonDefaults.take('table', fieldType || 'input'), col.config, patch);
            if (fieldType === 'input') {
                const numberTypes = ['bigint', 'int', 'float', 'decimal'];
                if (numberTypes.includes(json.datatype)) {
                    col.config.inputType = 'number';
                    if (['bigint', 'int'].includes(json.datatype) && col.config.verify) {
                        col.config.verify.type = 'onlyInteger';
                    }
                }
            } else if (fieldType === 'select') {
                col.config.radio = item.F_ReferType != 3;
                if (Array.isArray(json.data) && json.data.length) {
                    col.config.data = json.data;
                } else if (!common.buildParams(json.params).keys.length) {
                    col.config.data = common.refSelect(json.dataname || '', {});
                } else {
                    col.config.data = [];
                }
            }
            applyCommonColConfig(col, json);

            col.controlMap = controlMap;
            if (fieldType && col.field) {
                colsByField[col.field] = col;
                function pick(el) {
                    var $el = el && (el.jquery || el.nodeType) ? $(el) : $();
                    if ($el.is('tr')) {
                        var i = $el.attr('data-index');
                        return {
                            getValue: function () {
                                var o = {};
                                Object.keys(colsByField).forEach(function (k) {
                                    var a = controlMap[k][i] || $el.find('td[data-field="' + k + '"]').data('fieldControl');
                                    if (a && a.getValue) o[k] = a.getValue();
                                });
                                return o;
                            },
                            setValue: function (v, d) {
                                Object.keys(v || {}).forEach(function (k) {
                                    if (controlMap[k]) controlMap[k]($el.find('td[data-field="' + k + '"]')).setValue(v[k], d);
                                });
                                return this;
                            },
                            update: function (p) {
                                Object.keys(colsByField).forEach(function (k) {
                                    controlMap[k].update(p, i);
                                });
                                return this;
                            }
                        };
                    }
                    var $td = $el.closest('td');
                    var a = $td.data('fieldControl');
                    return {
                        getValue: function () {
                            if (a && a.getValue) return a.getValue();
                            var row = (table.cache[tableOpts.id] || [])[$td.closest('tr').attr('data-index')];
                            return (row && row[$td.attr('data-field')]) || '';
                        },
                        setValue: function (v) {
                            if (!a) return this;
                            var raw = v == null ? '' : String(v);
                            if (a.setValue) a.setValue(v);
                            // 始终把粘贴原文交给 commitCell，避免控件拒收后 getValue 仍是旧值
                            if (a.notify) a.notify(raw);
                            return this;
                        },
                        update: function (p) {
                            pick.update(p, $td.closest('tr').attr('data-index'));
                            return a && a.update ? a.update(p) : this;
                        },
                        input: function () { return a && a.input ? a.input() : $(); },
                        instance: a && a.instance
                    };
                }
                pick.getValue = function () {
                    var a = [];
                    each(pick, function (x) { a.push(x.getValue()); });
                    return a;
                };
                pick.setValue = function (v, d) {
                    var rows = table.cache[tableOpts.id] || [];
                    rows.forEach(function (_, i) {
                        pick($('tr[data-index="' + i + '"] td[data-field="' + col.field + '"]')).setValue(Array.isArray(v) ? v[i] : v, d);
                    });
                    return pick;
                };
                pick.update = function (p, index) {
                    if (p && p.disabled != null && p.readonly == null) p.readonly = p.disabled;
                    if (index != null) {
                        col.config.rowConfig = col.config.rowConfig || {};
                        col.config.rowConfig[index] = $.extend({}, col.config.rowConfig[index], p);
                        eipTableEdit.syncCell(tableOpts.id, col.field, index, col.config);
                        return pick;
                    }
                    $.extend(col.config, p);
                    if (p && p.required != null) {
                        col.config.verify = p.required ? (col.config.verify || { type: 'required' }) : null;
                        var $th = $('div[lay-table-id="' + tableOpts.id + '"]').find('th[data-field="' + col.field + '"] .layui-table-cell');
                        $th.find('.requiredcolumn').remove();
                        if (p.required) $th.append('<span class="requiredcolumn">*</span>');
                    }
                    eipTableEdit.syncColumn(tableOpts.id, col.field, col.config);
                    return pick;
                };
                controlMap[col.field] = pick;
            }
            if (typeof tableOpts.setCustomConfig === 'function') {
                tableOpts.setCustomConfig(col, col.config);
            }
            if (col.config.required) {
                col.config.verify = col.config.verify || { type: 'required' };
                col.title += '<span class="requiredcolumn">*</span>';
            } else {
                col.config.verify = null;
            }

            // 修改内容：所有 select 点格子都用这一格自己的选项
            if (fieldType === 'select') {
                const userClick = col.config.on && col.config.on.click;
                col.config.on.click = function (obj) {
                    col.config.data = cellSelectData(col, obj.data);
                    if (typeof userClick === 'function') return userClick.call(this, obj);
                };
            }
            cols.push(col);
        });

        // 交叉字段插到当前列后面
        const withCross = [];
        cols.forEach(item => {
            withCross.push(item);
            if (!Array.isArray(item._cross) || !item._cross.length) return;
            common.getCrossFields(item._template && item._template.dataname, item._cross).forEach(function (i) {
                withCross.push({
                    field: i.F_ReNameCode || i.F_EnCode || '',
                    title: i.F_ReNameCn || i.F_FullName || '',
                    hide: false,
                    sort: false,
                    width: 'auto',
                    align: 'center',
                    event: 'cellEdit',
                    _isCross: true,
                    templet: function (d) {
                        const fieldKey = i.F_ReNameCode || i.F_EnCode;
                        const val = d?.[fieldKey];
                        const text = val?.displayValue ?? val ?? '';
                        return common.escapeHtml(text);
                    }
                });
            });
        });
        cols = withCross;
        if (btns?.length && isEnabled) {
            const rowBtns = btns.filter(b => b.F_Location == '2');
            const hasToolbarCol = (tableOpts?.cols?.[0] || []).some(c => c.toolbar)
                || cols.some(c => c.toolbar);
            if (rowBtns.length && !hasToolbarCol) {
                cols.push({
                    title: '操作',
                    toolbar: '#'+tableOpts.id+'Toolbar',
                    align: 'center',
                    fixed: 'right',
                    width: 'auto'
                });
            }
        }
        return cols;
    }

    /**
     * 表格图片列：autoSetUploadColumn + 挂到 done 里 initTableAllImages（createtable / createtreetable 共用）
     */
    function setupTableImageUpload(tableOpts, fieldsData) {
        const uploadCols = (tableOpts.cols[0] || []).filter(col => col.config && col.config.type === 'imageUpload');
        if (uploadCols.length) {
            imageUpload.autoSetUploadColumn(tableOpts.cols[0]);
            uploadCols.forEach(function (col) {
                col.config.on = $.extend({}, col.config.on, {
                    change: function (p) { eipTableEdit.emitCell(tableOpts.id, p); }
                });
            });
        }
        const prevDone = tableOpts.done;
        tableOpts.done = function (res, curr, count) {
            const $view = $(`#${tableOpts.id},[lay-filter="${tableOpts.id}"]`).first().next('.layui-table-view');
            (tableOpts.cols[0] || []).forEach(col => {
                if (!col.field) return;
                if (col._template?.ignore?.toString() === 'true') return;
                if ((col.config && col.config.type) || col._isCross) {
                    $view.find(`thead th[data-field="${col.field}"]`).attr('name', col.field);
                }
            });
            if (uploadCols.length) {
                uploadCols.forEach(uploadCol => {
                    var cfg = uploadCol.config || {};
                    controls.fieldControl.render({
                        type: 'imageUpload',
                        config: $.extend({}, cfg, {
                            tableId: tableOpts.id,
                            // 与 cellEdit 一致：readonly / disabled / 整表只读
                            readonly: !!(cfg.readonly || cfg.disabled) || tableOpts.isEnabled === false
                        })
                    });
                });
            }
            if (typeof prevDone === 'function') {
                prevDone.apply(this, arguments);
            }
        };
    }

    /** eipTableEdit 单元格编辑 + 回填 cache / onEditTool / JsEventCode */
    function bindCellEditAop(tableOptions, onEditToolFn) {
        if (!tableOptions || !tableOptions.cols) return;
        const filter = tableOptions.tableFilter || 'currentTableFilter';
        const aopTable = eipTableEdit.aopObj(tableOptions.cols, tableOptions.id);
        aopTable.on(`tool(${filter})`, function (obj) {
            if (obj.value !== undefined) {
                var update = {};
                var rawVal = obj.value;
                if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal) && rawVal.rowUpdate && typeof rawVal.rowUpdate === 'object') {
                    Object.assign(update, rawVal.rowUpdate);
                } else {
                    update[obj.field] = rawVal;
                }
                if (obj.data) Object.assign(obj.data, update);
                if (obj.dataCache) Object.assign(obj.dataCache, update);
                if (rawVal && typeof rawVal === 'object' && rawVal.isEnter) {
                    return;
                }
            }
            const editTool = typeof tableOptions.onEditTool === 'function'
                ? tableOptions.onEditTool
                : onEditToolFn;
            if (typeof editTool === 'function') editTool.call(this, obj);
            if (typeof JsEventCode === 'function') JsEventCode(obj);
        }, { useTreeTable: !!tableOptions._useTreeTable });
    }

    /** createtable / createtreetable 共用的前置准备（直接改入参 options，便于页面保留引用做搜索重载） */
    function prepareCreateOptions(rawOpts, mode, index) {
        const tableOpts = rawOpts;
        const isTree = mode === 'tree';
        if (isTree) {
            if (typeof tableOpts.search === 'undefined') tableOpts.search = true;
            if (!tableOpts.method) tableOpts.method = 'get';
        }
        if (!tableOpts.id && tableOpts.elem) {
            tableOpts.id = String(tableOpts.elem).replace('#', '');
        }
        if (!tableOpts.tableFilter) tableOpts.tableFilter = 'currentTableFilter';
        if (typeof tableOpts.toolbar === 'undefined') tableOpts.toolbar = '#toolbarDemo';
        if (!tableOpts.cols) tableOpts.cols = [[]];

        const mainView = (top.clients && top.clients.GetMainView && top.clients.GetMainView[pathname]) || {};
        if (mainView.IsNavi) {
            tableOpts.dtree = tableOpts.dtree || { elem: '#leftTree' };
        }
        if (mainView.mainTable && !tableOpts.enCode && (!tableOpts.cols?.[0] || tableOpts.cols[0].length <= 1)) {
            tableOpts.enCode = mainView.mainTable;
        }

        // init 在 Index 会写入 GetTableJson
        const { GetColsJson } = init(tableOpts);

        if (!isTree) {
            tableOpts.data = common.nullToEmpty(tableOpts?.data || []);
        }

        // createTableTool：toolbar 传 '#xxx'（无模板则自动生成）；false/未传/空则关闭；行按钮仅自动生成
        const btnsPack = (tableOpts.autoButtons === false)
            ? { btns: [], event: '' }
            : common.createTableTool(tableOpts, index);

        // 过滤启用字段，并按 hiddenFields 去掉无主字段时的子字段
        let fieldsData = (Array.isArray(tableOpts.fields) ? tableOpts.fields : (GetColsJson || [])).filter(i => tableOpts.fields ? true : i.F_EnabledMark);
        if (tableOpts.hiddenFields && typeof tableOpts.hiddenFields === 'object') {
            for (const mainField in tableOpts.hiddenFields) {
                const hasMainField = (GetColsJson || []).some(i => i.F_EnCode === mainField);
                if (!hasMainField) {
                    const hiddenSubFields = tableOpts.hiddenFields[mainField];
                    if (Array.isArray(hiddenSubFields) && hiddenSubFields.length) {
                        fieldsData = fieldsData.filter(i => !hiddenSubFields.includes(i.F_EnCode));
                    }
                }
            }
        }

        return {
            tableOpts,
            GetColsJson,
            fieldsData,
            btns: btnsPack.btns,
            event: btnsPack.event
        };
    }

    function bindCreateRowClick(_this, tableOpts, btns, rowClickFilter) {
        _this.tableRowClick(
            tableOpts.cols[0][0]?.type || 'radio',
            rowClickFilter || tableOpts.tableFilter || 'currentTableFilter',
            tableOpts.id || String(tableOpts.elem).replace('#', ''),
            tableOpts.oneBtnList || btns.filter(x => x.F_Location == '4').map(x => x.F_EnCode) || ['NF-edit', 'NF-details'],
            tableOpts.moreBtnList || btns.filter(x => x.F_Location == '5').map(x => x.F_EnCode) || ['NF-delete'],
            tableOpts.clickfunction || null,
            tableOpts,
            tableOpts.onToolbar,
            tableOpts.onEditTool
        );
    }

    // color / tip：先收集 tip，表格 done 后再创建 tipControl
    function applyColExtras(opts) {
        var tips = [], tipApi;
        (opts.cols || []).forEach(function (row) {
            if (!Array.isArray(row)) return;
            row.forEach(function (col) {
                if (!col || (!col.color && !col.tip) || typeof col.templet === 'string') return;
                var color = col.color, tip = col.tip, prev = col.templet, field = col.field, label = col.title || '';
                col.templet = function (d) {
                    var text = typeof prev === 'function' ? prev(d) : (d[field] == null ? '' : d[field]);
                    if (color) text = '<span style="color:' + color + '">' + text + '</span>';
                    if (!tip) return text;
                    var val = $('<div>').html(text).text(), unit = typeof tip.unit === 'function' ? tip.unit(d) : tip.unit;
                    tips.push(typeof tip === 'function' ? tip(d) : {
                        title: d.name || '',
                        rows: [{ label: label, value: val + (unit ? ' ' + unit : '') }]
                    });
                    return '<span class="ice-col-tip" style="cursor:auto">' + text + '</span>';
                };
            });
        });
        var prevDone = opts.done;
        opts.done = function (res, curr, count) {
            if (tipApi) tipApi.destroy();
            var $view = $(this.elem).next('.layui-table-view');
            tipApi = controls.tipControl.render({
                elem: $view.length ? $view : this.elem,
                selector: '.ice-col-tip',
                data: tips
            });
            tips = [];
            if (typeof prevDone === 'function') prevDone.call(this, res, curr, count);
        };
    }

    var obj = {
        //table渲染封装里面有字段权限
        rendertable: function (options, GetColsJson, callback) {
            const rowType = options.type || '';

            const opts = $.extend(true, {}, COMMON_TABLE_DEFAULTS, {
                elem: '#currentTableId',
                toolbar: '#toolbarDemo',
                id: 'currentTableId',
                page: PAGE_DEFAULTS,
                search: options.search !== undefined ? options.search : true,
                totalRow: Array.isArray(GetColsJson) && GetColsJson.some(x => x.F_IsTotal),
            }, options);
            // 模块开关：开启/关闭分页（F_IsPage === false 为关）
            const currMod = treeGrid?.find(x => x.F_UrlAddress === currentPagePath);
            const isPaged = currMod?.F_IsPage !== false;
            if (!isPaged) {
                opts.page = false;
                opts.limit = 10000;
            }
            // 右侧工具栏
            setupDefaultToolbar(opts, options, currMod, 'table', isPaged);

            // 处理单选/多选列
            if (opts.cols?.[0]) {
                const cols = opts.cols[0];
                let idx = -1, type = rowType;
                for (let i = 0; i < cols.length; i++) {
                    if (cols[i].type === 'checkbox' || cols[i].type === 'radio') {
                        idx = i; type = rowType || cols[i].type; break;
                    }
                }
                if (idx >= 0) Object.assign(cols[idx], { type, width: 50, fixed: 'left' });
                else if (type) cols.unshift({ type, width: 50, fixed: 'left' });
            }

            // 防缓存 + 字段权限
            opts.url = common.urlAddTime(opts.url);
            // 修改内容：列表加载时用 Layui 转圈。默认 loading:false 时页面上没有这个遮罩
            if (options.loading == null) opts.loading = true;
            // if (opts.authorizeFields) opts.cols = common.tableAuthorizeFields(opts.cols);

            // done 回调
            const userDone = opts.done;
            opts.done = function (res, curr, count) {
                layer.closeAll('loading');
                if (typeof callback === 'function') callback(res, curr, count);
                const $view = $(this.elem).next('.layui-table-view');
                // 不分页隐藏分页栏
                if (!isPaged) {
                    $view.find('.layui-table-page').hide();
                } else {
                    $view.find('.layui-table-page').show();
                }
                // 只要主表行，不要选到 fixed 操作列里的 tr
                const $rows = $view.find('.layui-table-box > .layui-table-body tbody tr');
                soulTable.render(this);
                table.resize(opts.id);
                markSubtotalRows(opts.id);
                // 树结构自适应高度
                if (opts.dtree) controls.dtreeControl.syncHeight($view);
                setCellCursor(opts.cols, opts.id);
                mergeCells($rows, GetColsJson);
                restoreCheckedButtons(opts.id);
                if (typeof eipTableEdit.mount === 'function') eipTableEdit.mount(opts.id, opts.cols);
                if (typeof userDone === 'function') userDone(res, curr, count);
            };



            // 复杂表头逻辑
            const groupMap = {};
            if (Array.isArray(GetColsJson)) {
                GetColsJson.forEach(item => {
                    const t = JSON.parse(item.F_Template);
                    if (t.coltitle) (groupMap[t.coltitle] || (groupMap[t.coltitle] = [])).push(item.F_EnCode);
                });
            }
            if (Object.values(groupMap).some(a => a.length > 1)) opts.cols = generateComplexCols(opts.cols[0], groupMap);

            // 占满剩余位置：设置高度使表格占满剩余空间
            if (!opts.height) {
                var $formFields = $('.form-fields');
                var windowHeight = $(window).height();
                if ($formFields.length > 0) {
                    // 计算form-fields下方还剩多少高度
                    var formFieldsOffset = $formFields.offset().top + $formFields.outerHeight(true);
                    // 需要考虑页面下外边距等，可适当减去一个数字做padding调整
                    var remaining = windowHeight - formFieldsOffset - 18;
                    opts.height = remaining > 200 ? remaining : 200; // 最小100高度，避免太小
                } else {
                    var remaining = windowHeight - 33;
                    opts.height = remaining;
                }
            }
            // hideFields：直接从列配置移除，不进列筛选面板
            if (Array.isArray(opts.cols) && options.hideFields?.length) {
                opts.cols = opts.cols.map(row => {
                    if (!Array.isArray(row)) return row;
                    return row.filter(item => !(item.field && options.hideFields.includes(item.field)));
                });
            }
            // 报表：默认 url=''；首列 radio/checkbox 默认 hide:true，显式 hide:false 则显示并保留 url
            if (currMod?.F_IsReport) {
                var firstCol = opts.cols && Array.isArray(opts.cols[0]) ? opts.cols[0][0] : null;
                var isSelectCol = firstCol && (firstCol.type === 'checkbox' || firstCol.type === 'radio');
                var keepReportSelect = isSelectCol && firstCol.hide === false;
                if (!keepReportSelect) {
                    opts.url = '';
                    if (isSelectCol) firstCol.hide = true;
                }
                const prevParseData = opts.parseData;
                opts.parseData = function (res) {
                    var parsed = typeof prevParseData === 'function' ? prevParseData(res) : res;
                    if (!parsed) parsed = res;
                    if (parsed && Array.isArray(parsed.data)) {
                        parsed.data = processDataWithSubTotal(GetColsJson, parsed.data);
                    }
                    return parsed;
                };
            };
            // 合计列
            opts.cols = applyTotalRowConfig(opts.cols, GetColsJson);
            applyColExtras(opts);

            var rendered = table.render(opts);
            markMultiTableFormItem(opts.elem);
            return rendered;
        },
        // table 刷新：type 'data'=只重载数据（默认）；'all'=整表重载
        reloadtable: function (options) {
            layer.load(0, { shade: false });
            const currMod = treeGrid?.find(x => x.F_UrlAddress === currentPagePath);
            const isPaged = currMod?.F_IsPage !== false;
            const opts = $.extend(true, {}, {
                elem: 'currentTableId',
                page: isPaged,
                curr: 1,
                where: {},
                type: 'data'
            }, options);
            // 模块关闭分页时，避免调用方 page:true 又把分页打开
            if (!isPaged) opts.page = false;
            const tableId = String(opts.elem || '').replace(/^#/, '');
            opts.where = mergeWhere(opts.where, tableId);
            opts.where.time = new Date().Format("yyyy-MM-dd hh:mm:ss");

            const config = { where: opts.where };
            if (opts.page === true) {
                config.page = { ...PAGE_DEFAULTS, curr: opts.curr };
            } else if (opts.page === false) {
                config.page = false;
                config.limit = opts.limit || 10000;
            }
            if (opts.url) config.url = common.urlAddTime(opts.url);
            if (opts.done) config.done = opts.done;
            if (opts.type === 'all') {
                table.reload(tableId, config);
            } else {
                // 只重载数据，保留列/工具栏等
                if (typeof table.reloadData === 'function') {
                    table.reloadData(tableId, config);
                } else {
                    table.reload(tableId, config, 'data');
                }
            }
            layer.closeAll('loading');
        },
        //table行点击事件及按钮显示控制
        tableRowClick: function (
            type,
            tableFilter,
            tableId,
            oneList = [],
            moreList = [],
            clickfunction = null,
            tableOptions = {},
            onToolbar = null,
            onEditTool = null
        ) {
            oneList = oneList ?? [];
            moreList = moreList ?? [];
            if (tableId) tableClickState[tableId] = { oneList: oneList, moreList: moreList };
            const isTreeTable = !!controls.treeTableControl.has(tableId) || !!(tableOptions && tableOptions._useTreeTable);

            if (isTreeTable) {
                const tbFilter = (typeof tableFilter === 'string' && tableFilter)
                    ? tableFilter
                    : (tableOptions.tableFilter || tableId);
                const tid = tableId || tableOptions.id;
                treeTable.on('row(' + tbFilter + ')', function (obj) {
                    obj.tr.addClass('layui-table-click').siblings().removeClass('layui-table-click');
                    if (typeof obj.setRowChecked === 'function') {
                        obj.setRowChecked({ type: type });
                    } else {
                        var $box = obj.tr.find('div.layui-unselect.layui-form-' + type);
                        if ($box[0]) $box[0].click();
                    }
                    if (type === 'radio') {
                        setBtnVisible(oneList, true);
                        setBtnVisible(moreList, true);
                    }
                    clickfunction && clickfunction(obj);
                });
                treeTable.on(type + '(' + tbFilter + ')', function (obj) {
                    const checked = treeTable.checkStatus(tid) || {};
                    const data = checked.data || [];
                    syncRowClickButtons(
                        obj,
                        oneList,
                        moreList,
                        data.length,
                        (treeTable.getData(tid, true) || []).length
                    );
                });
                treeTable.on('toolbar(' + tbFilter + ')', function (obj) {
                    fillToolbarRow(obj);
                    if (onToolbar && onToolbar.call(this, obj) === false) return false;
                    if (isBuiltinToolbarEvent(obj.event)) return false;
                    if (obj.type === 'contextmenu') return removeToolbarRows(obj);
                    if (isAddToolbarButton(obj, this) && !eipTableEdit.validTable(obj.config.id)) return false;
                    typeof JsEventCode === 'function' && JsEventCode(obj);
                });
                bindImportUpload(tid);
                bindCellEditAop(tableOptions, onEditTool);
                return;
            }

            // 1. 行点击模拟选中（off 后再 on，避免多表重复绑定）
            $(document).off('click.iceTableRow').on('click.iceTableRow', '.layui-table-body table.layui-table tbody tr', function (e) {
                if (isEditorClick(e)) return;
                var index = $(this).attr('data-index');
                var tableBox = $(this).parents('.layui-table-box');
                var tableDiv = tableBox.find('.layui-table-fixed.layui-table-fixed-l').length
                    ? tableBox.find('.layui-table-fixed.layui-table-fixed-l')
                    : tableBox.find('.layui-table-body.layui-table-main');
                var $box = tableDiv.find('tr[data-index="' + index + '"]')
                    .find('td div.laytable-cell-checkbox div.layui-form-checkbox, td div.laytable-cell-radio div.layui-form-radio').first();
                if ($box.length) $box[0].click();
            });

            // 2. 阻止单选复选冒泡
            $(document).off('click.iceTableCheck').on('click.iceTableCheck',
                'td div.laytable-cell-checkbox div.layui-form-checkbox, td div.laytable-cell-radio div.layui-form-radio',
                function (e) { e.stopPropagation(); });

            // 3. 行选中样式（clickfunction 只在勾选里调，避免点行时触发两次）
            table.on(`row(${tableFilter})`, function (obj) {
                if (isEditorClick(obj && obj.e)) return;
                obj.tr.addClass('layui-table-click').siblings().removeClass('layui-table-click');
            });

            // 4. 勾选控制按钮显隐
            table.on(`${type}(${tableFilter})`, function (obj) {
                if (obj.data && obj.data._isSubTotal) return;
                syncRowClickButtons(
                    obj,
                    oneList,
                    moreList,
                    table.checkStatus(tableId).data.length,
                    (table.cache[tableId] || []).length
                );
                clickfunction && clickfunction(obj);
                table.resize();
            });
            // 5. 排序监听 统一收纳
            table.on(`sort(${tableFilter})`, function (obj) {
                if (obj.config.url) {
                    table.reload(obj.config.id);
                }
            });

            if (!tableOptions || Object.keys(tableOptions).length === 0) return;

            // 6. 工具栏监听【统一收纳：滚动复位 + 自定义事件 + 打印 + JsEventCode】
            table.on(`toolbar(${tableFilter})`, function (obj) {
                // 固定滚动回到原位（原来编辑表格逻辑）
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const scrollLeft = document.documentElement.scrollLeft || document.body.scrollTop;

                fillToolbarRow(obj);
                if (onToolbar && onToolbar.call(this, obj) === false) return false;
                if (isBuiltinToolbarEvent(obj.event)) return false;
                if (obj.type === 'contextmenu') removeToolbarRows(obj);
                else {
                    if (isAddToolbarButton(obj, this) && !eipTableEdit.validTable(obj.config.id)) return false;
                    typeof JsEventCode === 'function' && JsEventCode(obj);
                }
                window.scrollTo(scrollLeft, scrollTop);
            });  // 这是 table.on('toolbar',...) 的结束

            // ===== 新增：在表格初始化时创建上传实例 =====
            bindImportUpload(tableId);
            // ===== 新增结束 =====

            // createtable / createtreetable：eipTableEdit 单元格编辑
            bindCellEditAop(tableOptions, onEditTool);
        },
        // Index 业务准备后交给 controls.treeTableControl.render
        rendertreetable: function (options) {
            var raw = options || {};
            var currMod = treeGrid?.find(x => x.F_UrlAddress === currentPagePath);
            var isPaged = isTreePaged(raw);
            var opts = $.extend(true, {}, COMMON_TABLE_DEFAULTS, {
                elem: '#currentTableId',
                toolbar: '#toolbarDemo',
                id: 'currentTableId',
                search: true,
                page: TREE_PAGE_DEFAULTS
            }, raw);
            opts.page = treePage(raw, isPaged);
            opts.limit = 99999;
            setupDefaultToolbar(opts, raw, currMod, 'tree', isPaged);
            if (opts.url) opts.url = common.urlAddTime(opts.url);
            if (opts.authorizeFields) opts.cols = common.tableAuthorizeFields(opts.cols);
            if (!opts.height) {
                var $formFields = $('.form-fields');
                var windowHeight = $(window).height();
                if ($formFields.length) {
                    var remaining = windowHeight - $formFields.offset().top - $formFields.outerHeight(true) - 18;
                    opts.height = remaining > 200 ? remaining : 200;
                } else {
                    opts.height = windowHeight - 33;
                }
            }
            opts._useTreeTable = raw._useTreeTable = true;
            var prevDone = opts.done;
            opts.done = function () {
                if (typeof prevDone === 'function') prevDone.apply(this, arguments);
                var $view = $(this.elem).next('.layui-table-view');
                $view.find('.layui-table-page')[isPaged ? 'show' : 'hide']();
                setCellCursor(opts.cols, opts.id);
                if (typeof eipTableEdit.mount === 'function') eipTableEdit.mount(opts.id, opts.cols);
            };
            opts.tree = opts.tree || {};
            opts.tree.callback = opts.tree.callback || {};
            var prevOnExpand = opts.tree.callback.onExpand;
            opts.tree.callback.onExpand = function (tableId, trData, expandFlag) {
                if (typeof prevOnExpand === 'function') prevOnExpand.apply(this, arguments);
                if (expandFlag) setTimeout(function () {
                    setCellCursor(opts.cols, opts.id);
                    if (typeof eipTableEdit.mount === 'function') eipTableEdit.mount(opts.id, opts.cols);
                }, 0);
            };
            fillLazyRoot(opts);
            var rendered = controls.treeTableControl.render(opts);
            markMultiTableFormItem(opts.elem);
            return rendered;
        },
        reloadtreetable: function (options) {
            layer.load(0, { shade: false });
            var raw = options || {};
            var id = raw.id || String(raw.elem || '#currentTableId').replace('#', '');
            if (raw.type === 'all' || !controls.treeTableControl.has(id)) {
                if (controls.treeTableControl.has(id)) controls.treeTableControl.clear(id);
                layer.closeAll('loading');
                return this.rendertreetable(raw);
            }
            var reloadOpts = {
                where: mergeWhere(raw.where, id),
                page: treePage(raw, isTreePaged(raw))
            };
            var format = treeFormat(raw);
            if (raw.url) {
                reloadOpts.url = common.urlAddTime(raw.url);
            } else if (typeof format === 'function') {
                format(null, raw, function (list) { reloadOpts.data = list || []; });
            } else {
                reloadOpts.url = common.urlAddTime(TABLE_JSON_URL);
            }
            reloadTreeIns(id, reloadOpts);
            layer.closeAll('loading');
            return true;
        },
        // 树表推荐入口（与 createtable 一样支持可编辑列 / 图片上传）
        createtreetable: async function (options) {
            var _this = this;
            const tableOptionsList = Array.isArray(options) ? options : [options];

            for (const [index, rawOpts] of tableOptionsList.entries()) {
                const { tableOpts, fieldsData, btns, event } = prepareCreateOptions(rawOpts, 'tree', index);
                if (tableOpts.id && tableOpts.enCode === window.mainTableId) window.mainTableId = tableOpts.id;
                if (tableOpts.dtree) {
                    controls.dtreeControl.render({
                        tableElem: tableOpts.elem,
                        tableId: tableOpts.id,
                        enCode: tableOpts.enCode,
                        moduleEnCode: pathname,
                        dtree: tableOpts.dtree,
                        onNode: function (nodeId) {
                            _this.reloadtreetable({
                                elem: tableOpts.id,
                                where: indexWhere({ param: JSON.stringify({ field: nodeId }) }),
                                page: { curr: 1 }
                            });
                        }
                    });
                    const prevDone = tableOpts.done;
                    tableOpts.done = function (res, curr, count) {
                        controls.dtreeControl.syncHeight($(this.elem).next('.layui-table-view'));
                        if (typeof prevDone === 'function') prevDone.apply(this, arguments);
                    };
                }
                tableOpts.cols[0].push(...buildTableCols(fieldsData, btns, tableOpts));
                // 手写行按钮：有模板且无操作列时补一列（优先 #表idToolbar，兼容 #currentTableBar）
                if (tableOpts.autoButtons === false && !(tableOpts.cols[0] || []).some(c => c.toolbar)) {
                    var barId = [tableOpts.id + 'Toolbar', 'currentTableBar'].find(function (id) {
                        var el = document.getElementById(id);
                        return el && String(el.innerHTML || '').trim();
                    });
                    if (barId) {
                        tableOpts.cols[0].push({ title: '操作', toolbar: '#' + barId, align: 'center', fixed: 'right', width: 'auto' });
                    }
                }

                setupTableImageUpload(tableOpts, fieldsData);

                common.createFunction(
                    'JsEventCode',
                    event || '',
                    tableOpts.id || tableOpts.enCode || ('tree_' + index)
                );

                _this.rendertreetable(tableOpts);
                bindCreateRowClick(
                    _this,
                    tableOpts,
                    btns,
                    tableOpts.tableFilter || 'currentTableFilter'
                );
            }
        },
        refreshQuickSearch: function (tableId) {
            if (!tableId || !quickOpen()) return;
            var opts = null;
            try { opts = table.getOptions(tableId); } catch (e) { }
            if (opts) openQuickSearch(opts, true, 'table', true);
        },
        //table按扭生成
        createtable: async function (options) {
            var _this = this;
            const tableOptionsList = Array.isArray(options) ? options : [options];
            for (const [index, rawOpts] of tableOptionsList.entries()) {
                const { tableOpts, GetColsJson, fieldsData, btns, event } = prepareCreateOptions(rawOpts, 'table', index);
                if (tableOpts.id && tableOpts.enCode === window.mainTableId) window.mainTableId = tableOpts.id;

                // 左侧树 + 右侧表格
                if (tableOpts.dtree) {
                    controls.dtreeControl.render({
                        tableElem: tableOpts.elem,
                        tableId: tableOpts.id,
                        enCode: tableOpts.enCode,
                        moduleEnCode: pathname,
                        dtree: tableOpts.dtree
                    });
                }

                // 列：Index / Form 统一 buildTableCols
                tableOpts.cols[0].push(...buildTableCols(fieldsData, btns, tableOpts));
                tableOpts.method = 'post';

                setupTableImageUpload(tableOpts, fieldsData);
                _this.rendertable(tableOpts, GetColsJson);
                bindCreateRowClick(_this, tableOpts, btns);
                // 按表 id 分片写入，多次 createtable 不会互相覆盖
                common.createFunction(
                    'JsEventCode',
                    event || '',
                    tableOpts.id || tableOpts.enCode || ('table_' + index)
                );
            }
        }

    }
    exports("commonTable", obj);
});
