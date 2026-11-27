layui.define(["jquery", "layer", 'table', 'miniTab', 'util', 'form', 'commonDefaults'], function (exports) {
    var $ = layui.jquery,
        miniTab = layui.miniTab,
        layer = layui.layer,
        laytpl = layui.laytpl,
        table = layui.table,
        form = layui.form,
        util = layui.util,
        commonDefaults = layui.commonDefaults;
    const currentPagePath = window.location.pathname;
    const pathSegments = currentPagePath.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1] || '';
    const ModuleEnCode = pathSegments[pathSegments.length - 2] || '';

    /**
     * 按流程方案过滤模块按钮（createTool / createTableTool 共用）。
     * @returns {Array|null} null=非流程不过滤；否则返回过滤后的按钮列表
     */
    function filterModuleBtnsByFlow(btns, formJson, keyValue, formFlow) {
        if (!formJson || !formJson.F_SchemeContent) return null;
        btns = Array.isArray(btns) ? btns : [];
        try {
            var scheme = typeof formJson.F_SchemeContent === 'string'
                ? JSON.parse(formJson.F_SchemeContent)
                : formJson.F_SchemeContent;
            var resolveNode = function () {
                var node = (scheme.nodes || []).find(function (item) { return item.id == formJson.F_ActivityId; });
                if (!formJson.F_ActivityId) {
                    var startNode = (scheme.nodes || []).find(function (item) { return item.type == 'start round mix'; });
                    if (startNode) {
                        var startLine = (scheme.lines || []).find(function (item) { return item.from == startNode.id; });
                        if (startLine) {
                            node = (scheme.nodes || []).find(function (item) { return item.id == startLine.to; }) || node;
                        }
                    }
                }
                return node;
            };
            // 新增 / 流程处理 / 无 ActivityId：按当前（或起始下一）节点允许的按钮过滤
            if (!keyValue || formFlow || !formJson.F_ActivityId) {
                var node = resolveNode();
                var codes = (node && node.setInfo && node.setInfo.NodeDesignateData
                    && node.setInfo.NodeDesignateData.btns) || [];
                return btns.filter(function (item) { return codes.indexOf(item.F_EnCode) > -1; });
            }
            // 已有数据且在流程节点中（非处理入口）：不展示模块业务按钮
            return [];
        } catch (e) {
            return btns;
        }
    }

    // 当前页签（layuiminiOpenTabs）
    function currentOpenTab() {
        var tabs = [];
        try { tabs = JSON.parse(top.sessionStorage.getItem('layuiminiOpenTabs') || '[]') || []; } catch (e) { }
        var id = '';
        try { id = top.$('.layuimini-tab .layui-tab-title li.layui-this').attr('lay-id') || ''; } catch (e) { }
        var tab = tabs.filter(function (t) { return t && t.tabId === id; })[0];
        return { tabs: tabs, tab: tab };
    }
    function patchOpenTab(patch) {
        var hit = currentOpenTab();
        if (!hit.tab) return hit;
        for (var k in patch) hit.tab[k] = patch[k];
        try { top.sessionStorage.setItem('layuiminiOpenTabs', JSON.stringify(hit.tabs)); } catch (e) { }
        return hit;
    }
    // 全局快捷开关；首次默认关闭
    function getKeepOpen() {
        try { return localStorage.getItem('iceskyKeepOpen') === '1'; } catch (e) { return false; }
    }
    function setKeepOpen(val) {
        try { localStorage.setItem('iceskyKeepOpen', val ? '1' : '0'); } catch (e) { }
    }
    // 读/写当前页签上的标记
    function tabProp(key, val) {
        if (arguments.length < 2) return !!((currentOpenTab().tab || {})[key]);
        var patch = {};
        patch[key] = !!val;
        patchOpenTab(patch);
    }
    var formBtns = [];

    var obj = {
        /**
         * HTML 转义（封装 layui.util.escape）
         * 用于 xmSelect / 表格 templet / 下拉菜单等 innerHTML 场景，避免 "50%<Y≤60%" 被当成标签截断
         * @example common.escapeHtml('50%<Y≤60%')
         */
        escapeHtml: function (str) {
            return util.escape(str);
        },

        formatsDateType: function (type) {
            if (type === 'datetime2') type = 'datetime';
            var dateFormats = { date: 'YYYY-MM-DD', time: 'HH:mm:ss', datetime: 'YYYY-MM-DD HH:mm:ss', year: 'YYYY', month: 'YYYY-MM' };
            return dateFormats[type] || dateFormats.date;
        },

        formatDateValue: function (val, type) {
            if (val == null || val === '' || val === '&nbsp;') return '';
            var raw = String(val).trim();
            if (!raw) return '';
            type = type === 'datetime2' ? 'datetime' : (type || 'datetime');
            var fmt = obj.formatsDateType(type);
            if (type !== 'time' && /^\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(raw)) return raw;
            if (type === 'time' && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) return raw;
            var m = moment(raw);
            if (!m.isValid()) return raw;
            return m.format(fmt);
        },

        /**
         * select / tableSelect 共用：按模板 params 组装查询参数。
         * 取值顺序：source（行数据对象）→ 表单字段；表单没有该字段时用 paramsInput 原值。
         * @param {string|Array|Object} paramsInput params 字符串 / 键数组 / 已有对象
         * @param {Object} [source] 行数据/表单数据对象
         * @returns {{keys:string[], params:Object}}
         */
        buildParams: function (paramsInput, source) {
            var keys = [];
            var params = {};
            var formCache = null;

            function normalize(val) {
                if (val == null || val === '' || val === '&nbsp;') return '';
                if (typeof val === 'object' && !Array.isArray(val)) {
                    if (val.value != null && val.value !== '') return val.value;
                    if (val.displayValue != null && val.displayValue !== '') return val.displayValue;
                    if (val.name != null && val.name !== '') return val.name;
                    return '';
                }
                return val;
            }

            function getFormFieldValue(key) {
                if (!formCache) formCache = obj.val('adminform') || {};
                if (!Object.prototype.hasOwnProperty.call(formCache, key)) {
                    if (paramsInput && typeof paramsInput === 'object' && !Array.isArray(paramsInput)) {
                        return normalize(paramsInput[key]);
                    }
                    return '';
                }
                return normalize(formCache[key]);
            }

            if (paramsInput && typeof paramsInput === 'object' && !Array.isArray(paramsInput)) {
                keys = Object.keys(paramsInput);
            } else if (Array.isArray(paramsInput)) {
                keys = paramsInput.map(function (p) { return String(p || '').trim(); }).filter(Boolean);
            } else if (paramsInput != null && paramsInput !== '') {
                keys = String(paramsInput).split(',').map(function (p) { return p.trim(); }).filter(Boolean);
            }

            keys.forEach(function (key) {
                if (!key) return;
                var val = '';
                // 修改内容：source 是子表行数据时，行里“有”该字段只信行（避免滞后 DOM 盖新值）；
                // 行里“没有”的键（主表/隐藏字段，如 F_MatCode、F_CustomerCodeName）回退表单取值，
                // 否则子表单元格弹窗的关联参数永远带不出主表字段
                if (source && typeof source === 'object') {
                    val = Object.prototype.hasOwnProperty.call(source, key) ? normalize(source[key]) : getFormFieldValue(key);
                }
                else val = getFormFieldValue(key);
                params[key] = (val == null || val === '') ? '' : val;
            });
            return { keys: keys, params: params };
            },

        /**
         * 参照 select 全局缓存：key = enCode + param，同条件只请求一次。
         * 无参也会写入 dataItems，方便当字典用。
         */
        refSelect: function (enCode, params) {
            if (!enCode) return [];
            params = params || {};
            if (!top.clients) top.clients = {};
            if (!top.clients.refSelect) top.clients.refSelect = {};
            var key = enCode + '|' + JSON.stringify(params);
            // 每次返回新对象：xm-select 会改 selected，不能把缓存引用直接给控件
            function copyRows(rows) {
                return (rows || []).map(function (o) { return { name: o.name, value: o.value }; });
            }
            if (top.clients.refSelect[key]) return copyRows(top.clients.refSelect[key]);
            var res = null;
            obj.ajax({
                url: '/Public/GetReferenceListJson',
                data: { enCode: enCode, param: JSON.stringify(params) },
                async: false,
                success: function (r) { res = r; }
            });
            var list = Array.isArray(res) ? res : ((res && res.data) || []);
            var data = [];
            var map = {};
            if (list.length) {
                var keys = Object.keys(list[0]);
                var valueKey = keys.filter(function (k) { return /code/i.test(k); })[0]
                    || keys.filter(function (k) { return /id/i.test(k); })[0] || keys[0];
                var nameKey = keys.filter(function (k) { return k !== valueKey && /name/i.test(k); })[0]
                    || keys.filter(function (k) { return k !== valueKey; })[0] || valueKey;
                list.forEach(function (row) {
                    var c = row[valueKey];
                    if (c == null || c === '') return;
                    var n = row[nameKey] == null ? '' : String(row[nameKey]);
                    map[String(c)] = n;
                    data.push({ name: obj.escapeHtml(n), value: String(c) });
                });
            }
            top.clients.refSelect[key] = data;
            // 无参同步进 dataItems
            if (!Object.keys(params).length) {
                if (!top.clients.dataItems) top.clients.dataItems = {};
                top.clients.dataItems[enCode] = map;
                if (typeof clients !== 'undefined') clients.dataItems = top.clients.dataItems;
            }
            return copyRows(data);
        },

        /** 交叉字段元数据，同表+同字段只请求一次 */
        getCrossFields: function (tableName, codes) {
            codes = (codes || []).map(function (c) { return String(c || '').trim(); }).filter(Boolean);
            if (!tableName || !codes.length) return [];
            if (!top.clients) top.clients = {};
            if (!top.clients.crossFields) top.clients.crossFields = {};
            var key = tableName + '|' + codes.slice().sort().join(',');
            if (top.clients.crossFields[key]) return top.clients.crossFields[key];
            var res = null;
            obj.ajax({
                url: '/Public/GetReferenceListJson',
                data: {
                    enCode: 'GetCrossFields',
                    IsReferenced: true,
                    param: JSON.stringify({
                        TableName: tableName,
                        F_EnCode: codes.map(function (c) { return '‵' + c + '‵'; }).join(',')
                    })
                },
                async: false,
                success: function (r) { res = r; }
            });
            var rows = Array.isArray(res) ? res : ((res && res.data) || []);
            top.clients.crossFields[key] = rows;
            return rows;
        },

            /**
         * Tab/回车跳可编辑 input。参数：elem、type('form'|'table')
         */
        bindFocusNav: function (opts) {
                opts = opts || {};
            var isTable = opts.type === 'table';
            var $root = $(opts.elem || document);
            var ns = 'focusNav_' + (opts.type || 'form');
            function next(cur, list, back) {
                list = $.makeArray(list);
                if (!list.length) return null;
                cur = cur && (cur.nodeType ? cur : cur[0]);
                var i = list.indexOf(cur);
                if (i >= 0) return list[(i + (back ? -1 : 1) + list.length) % list.length];
                for (var j = back ? list.length - 1 : 0; back ? j >= 0 : j < list.length; back ? j-- : j++) {
                    if (cur && (cur.compareDocumentPosition(list[j]) & (back ? 2 : 4))) return list[j];
                }
                return list[back ? list.length - 1 : 0];
            }
            function locked(td, cfg) {
                if (!cfg || cfg.disabled || cfg.readonly) return true;
                var p = (cfg.rowConfig || {})[$(td).closest('tr').attr('data-index')] || {};
                return !!(p.disabled || p.readonly);
            }

            $root.off('keydown.' + ns).on('keydown.' + ns, function (e) {
                if (e.key !== 'Tab' && e.key !== 'Enter') return;
                if (!isTable) {
                    var $t = $(e.target);
                    if ($t.closest('.layui-table-view, textarea').length || $t.is('textarea')) return;
                    var ft = $t.closest('[data-fc-type]').attr('data-fc-type');
                    if (!ft || (e.key === 'Enter' && (ft === 'select' || ft === 'tableSelect'))) return;
                    var list = $root.find('input:visible:not([type=hidden]):not([disabled]):not([readonly])[data-fc-type=input]').get();
                    var el = next(ft === 'input' ? e.target : $t.closest('[data-fc-type]')[0], list, e.shiftKey);
                    if (el) { e.preventDefault(); $(el).focus(); }
                        return;
                    }
                var $td = $(document.activeElement).closest('td[lay-event="cellEdit"]');
                if (!$td.length) $td = $('.layui-table-view .cell-keep:visible').closest('td').first();
                var aop = $td.closest('.layui-table-view').data('eipAop');
                if (!$td.length || !aop) return;
                var cols = aop.config.colsConfig || {};
                var tds = $td.closest('.layui-table-view').find('tr[data-index] td[lay-event="cellEdit"]:not(.layui-hide)').get().filter(function (td) {
                    var c = cols[$(td).attr('data-field')];
                    return c && c.type === 'input' && !locked(td, c);
                });
                var el = next($td[0], tds, e.shiftKey);
                if (el) { e.preventDefault(); $(el).trigger('click'); }
                });
            },

        /**
         * tableSelect 共用：配置组装、回填解析、匹配事件与钩子。
         */
        tableSelectUtil: {
            join: function (vals) {
                return (vals || []).map(function (v) {
                    if (v == null || v === '') return '';
                    if (typeof v === 'object') {
                        return v.displayValue != null ? v.displayValue : (v.value != null ? v.value : '');
                    }
                    return String(v);
                }).filter(Boolean).join(',');
            },
            /** 本系统字段约定（组件不写死，统一从这里取） */
            fields: function () {
                var tree = commonDefaults.take('tree');
                var cn = (tree && tree.customName) || {};
                return {
                    id: cn.id || 'F_Id',
                    name: cn.name || 'F_FullName',
                    pid: cn.pid || 'F_ParentId'
                };
            },
            buildConfig: function (opts) {
                opts = opts || {};
                var referType = opts.referType;
                var paramsInput = opts.paramsStr != null ? opts.paramsStr : opts.params;
                // 保留模板键；真正按表单/行取值在打开面板时 resolveParams
                var params = obj.buildParams(paramsInput).params;
                var multi = referType == 1 || referType == 5;
                var tree = referType == 4 || referType == 5;
                var fields = this.fields();
                var cfg = {
                    table: {
                        url: '/Public/GetReferenceListJson?enCode=' + (opts.dataname || ''),
                        cols: [[{ type: multi ? 'checkbox' : 'radio', fixed: 'left' }]],
                        params: params,
                        enCode: opts.dataname || ''
                    }
                };
                if (opts.canInput === false) cfg.canInput = false;
                if (opts.searchKey) cfg.searchKey = opts.searchKey;
                if (opts.searchPlaceholder) cfg.searchPlaceholder = opts.searchPlaceholder;
                if (opts.disabled) cfg.table.disabled = true;
                if (tree) {
                    cfg.istree = {
                        customName: { id: fields.id, name: fields.name, pid: fields.pid }
                    };
                    cfg.checkedKey = fields.id;
                }
                return cfg;
            },
            /**
             * 解析 table.params（行 cache / 表单字段）。仅 Adapter/Host 调用，组件不碰。
             */
            resolveParams: function (opt) {
                opt = opt || {};
                var tableCfg = opt.table || {};
                if (!tableCfg.params || typeof tableCfg.params !== 'object') return {};
                var rowData = null;
                if (opt.elem) {
                    var $tr = $(opt.elem).closest('tr[data-index]');
                    var tid = $tr.closest('.layui-table-view').attr('lay-table-id');
                    if (tid != null) {
                        rowData = ((layui.table && layui.table.cache[tid]) || [])[$tr.attr('data-index')];
                    }
                }
                return obj.buildParams(tableCfg.params, rowData).params;
            },
            /**
             * sameApi：拉模块字段并拼参照列（隐藏 isrefer=false / 主键列，首可见列开 filter）。
             * 组件 sameApi=true 时直接调用。
             */
            resolveSelectCols: function (opt) {
                opt = opt || {};
                var table = opt.table || {};
                if (!opt.sameApi) return $.extend(true, [], table.cols || [[]]);
                var enCode = table.enCode || (table.url || '').split('enCode=')[1]?.split('&')[0] || '';
                var moduleFields = null;
                obj.ajax({
                    type: 'GET',
                    url: '/SystemManage/ModuleFields/GetColsJson?tablename=&enCode=' + enCode,
                    data: { page: 1, rows: 9999 },
                    async: false,
                    success: function (res) { moduleFields = res || []; }
                });
                var idKey = this.fields().id;
                var filterAdded = false;
                var filterCols = (moduleFields || []).map(function (item) {
                    var json = item && item.F_Template ? JSON.parse(item.F_Template) : null;
                    if (!json) return null;
                    var col = {
                        field: item.F_EnCode,
                        title: item.F_FullName,
                        width: 'auto'
                    };
                    if (String(json.isrefer) === 'false' || item.F_EnCode === idKey) col.hide = true;
                    if (!col.hide && !filterAdded) {
                        col.filter = true;
                        filterAdded = true;
                    }
                    // 修改内容：参照弹窗日期列走 formatDateValue（含 00:00:00 → 日期）
                    if (['date', 'time', 'datetime', 'datetime2', 'year', 'month'].indexOf(json.datatype) >= 0) {
                        col.templet = function (d) {
                            return obj.escapeHtml(obj.formatDateValue(d[item.F_EnCode], json.datatype));
                        };
                    }
                    return col;
                }).filter(Boolean);
                var base = $.extend(true, [], (table.cols && table.cols[0]) ? table.cols[0] : []);
                return [base.concat(filterCols)];
            },
            resolveFill: function (checkStatus, field, options) {
                options = options || {};
                checkStatus = checkStatus || {};
                var data = checkStatus.data || [];
                var join = this.join;
                var patch = {};
                var valueMap = {};
                var idKey = this.fields().id;
                var nameKey = this.fields().name;
                data.forEach(function (row) {
                    if (!row || typeof row !== 'object') return;
                    Object.keys(row).forEach(function (key) {
                        if (key === idKey || key.indexOf('LAY_') === 0) return;
                        if (!valueMap[key]) valueMap[key] = [];
                        valueMap[key].push(row[key]);
                    });
                });
                var display = '';
                if (data.length) {
                    display = checkStatus.isTree
                        // 树表展示优先用表单字段名（input id），再回退默认 name / 主键
                        ? join(data.map(function (row) { return row[field] || row[nameKey] || row[checkStatus.checkedKey]; }))
                        : (join(valueMap[field]) || join(valueMap[checkStatus.checkedKey || field]) || options.fallbackDisplay || '');
                    patch[field] = display;
                    Object.keys(valueMap).forEach(function (key) {
                        if (key !== field) patch[key] = join(valueMap[key]);
                    });
                } else {
                    patch[field] = '';
                    (options.cross || []).concat(options.prevFilledKeys || []).forEach(function (key) {
                        if (key && key !== field) patch[key] = '';
                    });
                }
                return { empty: !data.length, patch: patch, displayValue: display, isTree: !!checkStatus.isTree, data: data };
            },
            /**
             * 精确匹配：按 key 查行 → 命中写 ts-selected；未命中默认清空。
             * Host 先 resolveParams；opts.snapshotVal 按赋的值查（formData/.val）。
             */
            matchInput: function (opt, elem, opts) {
                opts = opts || {};
                opt = opt || {};
                var self = this;
                var $input = $(elem);
                if ($input.length && !$input.is('input,textarea')) $input = $input.find('input,textarea').first();
                if (!$input.length) return null;

                var isTree = !!opt.istree;
                var key = isTree
                    ? (opt.checkedKey || (opt.istree !== true && opt.istree.customName && opt.istree.customName.id) || self.fields().id)
                    : (opt.checkedKey || $input.attr('id') || $input.closest('td[data-field]').attr('data-field'));
                if (!key) return null;

                var raw = opts.snapshotVal != null
                    ? String(opts.snapshotVal).trim()
                    : String($input.val() || '').trim();
                var checkStatus = { data: [], checkedKey: key, isTree: isTree };
                var clearOnMiss = opts.clearOnMiss !== false;
                var tableCfg = opt.table || {};

                function clearSelected() {
                    $input.removeAttr('ts-selected');
                    checkStatus.data = [];
                }

                if (!raw) {
                    clearSelected();
                    return { $input: $input, checkStatus: checkStatus };
                }

                var values = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                if (!values.length || !tableCfg.url) {
                    if (!clearOnMiss) return { $input: $input, checkStatus: checkStatus };
                    $input[0].value = '';
                    clearSelected();
                    return { $input: $input, checkStatus: checkStatus };
                }

                var where = $.extend({}, (tableCfg.params && typeof tableCfg.params === 'object') ? tableCfg.params : {});
                where[opt.searchKey || 'keyword'] = values.join(',');
                var list = [];
                obj.ajax({
                    type: tableCfg.method || 'GET',
                    url: tableCfg.url,
                    data: { param: JSON.stringify(where) },
                    async: false,
                    success: function (res) {
                        if (typeof tableCfg.parseData === 'function') {
                            var parsed = tableCfg.parseData(res) || {};
                            list = Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);
                        } else if (Array.isArray(res)) {
                            list = res;
                        } else {
                            list = (res && res.data) || [];
                        }
                    }
                });
                // 修改内容：every 判齐；命中键/展示名走 join，去掉多余 filter
                var matched = values.map(function (v) {
                    return list.find(function (row) {
                        return row && String(row[key]) === String(v);
                    });
                });
                if (!matched.every(Boolean)) {
                    if (!clearOnMiss) return { $input: $input, checkStatus: checkStatus };
                    $input[0].value = '';
                    clearSelected();
                    return { $input: $input, checkStatus: checkStatus };
                }

                checkStatus.data = matched;
                $input.attr('ts-selected', self.join(matched.map(function (r) { return r[key]; })));
                if (isTree) {
                    var nameKey = $input.attr('id') || $input.closest('td[data-field]').attr('data-field') || self.fields().name;
                    var names = self.join(matched.map(function (r) { return r[nameKey]; }));
                    if (names) $input[0].value = names;
                }
                return { $input: $input, checkStatus: checkStatus };
            },
            bindMatch: function ($el, onMatch, ns) {
                ns = ns || 'tsMatch';
                $el = $($el);
                $el.off('keydown.' + ns + ' blur.' + ns + ' input.' + ns + ' change.' + ns);
                if (typeof onMatch !== 'function') return;
                $el.on('keydown.' + ns, function (e) {
                    if (e.keyCode === 13 || e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        onMatch('enter');
                    }
                });
                $el.on('change.' + ns, function (e) {
                    // 隐藏/程序关编辑时 blur 产生的 change 忽略，否则粘贴会再 notify 一次
                    if (e.isTrigger || $('div.tableSelect').length || !$el.is(':visible')) return;
                    onMatch('change');
                });
                $el.on('input.' + ns, function () {
                    var empty = !String($el.val() || '').trim();
                    if (!empty && $('div.tableSelect').length > 0) return;
                    if (document.activeElement === $el[0] && !empty) return;
                    if (!$el.is(':visible')) return;
                    onMatch('input');
                });
            },
            hooks: function (when, trigger, hooks, $input, checkStatus) {
                hooks = hooks || {};
                if (when === 'before') {
                    if (trigger === 'enter' && typeof hooks.beforeKeydownEnter === 'function') {
                        if (hooks.beforeKeydownEnter($input, checkStatus) === false) return false;
                    }
                    if (trigger === 'blur' && typeof hooks.beforeBlur === 'function') {
                        if (hooks.beforeBlur($input, checkStatus) === false) return false;
                    }
                    return true;
                }
                if (trigger === 'enter' && typeof hooks.afterKeydownEnter === 'function') {
                    hooks.afterKeydownEnter($input, checkStatus);
                }
                if (trigger === 'blur' && typeof hooks.afterBlur === 'function') {
                    hooks.afterBlur($input, checkStatus);
                }
                return true;
            }
        },

        //msg
        modalMsg: function (content, type) {
            if (type != undefined) {
                var icon = 0;
                if (type == 'success') {
                    icon = 1;
                }
                else if (type == 'error') {
                    icon = 2;
                }
                else if (type == 'warning') {
                    icon = 7;
                }
                else {
                    icon = 5;
                }
                top.layer.msg(content, {
                    icon: icon, time: 1000, shift: 5,
                });
            } else {
                top.layer.msg(content);
            }
        },
        //alert
        modalAlert: function (content, type) {
            var icon = 0;
            if (type == 'success') {
                icon = 1;
            }
            if (type == 'error') {
                icon = 2;
            }
            if (type == 'warning') {
                icon = 7;
            }
            top.layer.alert(String(content), {
                icon: icon,
                title: "系统提示",
                id: "系统提示",
                btn: ['确认'],
                btnclass: ['btn btn-primary'],
                yes: function (index) {
                    top.layer.close(index);
                }
            });
        },
        //界面关闭
        modalClose: function () {
            var index = parent.layer.getFrameIndex(window.name);
            // 修改内容：快捷时刷新，不关层
            if (getKeepOpen()) {
                location.reload();
                return;
            }
            parent.layer.close(index);
        },
        //创建界面 / 打开无标题弹出层（通过 type 区分）
        modalOpen: function (options) {
            var clickTarget = event ? $(event.target).closest('#NF-add, #NF-edit')[0] : null;
            options = options || {};

            // 如果传递了 param，把参数拼接在 url 后面
            if (options.param && options.url) {
                var query = typeof options.param === 'string'
                    ? options.param
                    : $.param(options.param);
                if (query) {
                    options.url += (options.url.indexOf('?') > -1 ? '&' : '?') + query;
                }
            }

            // type: 2 —— 原 openNewNoTitle 无标题全屏弹出层
            // options.keepOpen 显式传值时才修改全局状态；未传时沿用上次状态
            if (options.type == 2) {
                if (options.keepOpen != null) setKeepOpen(!!options.keepOpen);
                var index = layer.open({
                    type: 2,
                    area: ['100%', '100%'],
                    title: false,
                    closeBtn: 0,
                    fix: false,
                    shadeClose: false,
                    content: options.url,
                    success: function (layero, idx) {
                        //建立父子关系
                        if (window.top != null && !window.top.hasOwnProperty('iframesList')) {
                            window.top.iframesList = {};
                        }
                        window.top.iframesList[index] = window;
                        const iframeWin = layero.find('iframe')[0].contentWindow;
                        // 把数据注入子页面路由状态
                        if (options.routeState) {
                            iframeWin.history.replaceState(
                                { routeState: options.routeState },
                                '',
                                iframeWin.location.href
                            );
                        }
                        if (clickTarget) {
                            iframeWin._clickTarget = clickTarget;
                        }
                        if (!!options.success) {
                            options.success(layero, idx);
                        }
                    },
                    end: function () {
                        if (!!options.end) {
                            options.end();
                            return;
                        }
                    }
                });
                return index;
            }

            // type: 1（默认）—— 带标题的创建界面
            var defaults = {
                type: 1,
                title: '系统窗口',
                width: "800px",
                height: "600px",
                anim: 0,//动画
                isOutAnim: true,//关闭动画
                maxmin: true, //开启最大化最小化按钮
                url: '',
                shade: 0.3,
                routeState: null,//传参
                btn: ['确认', '关闭'],
                btnclass: ['layui-btn', 'layui-btn-primary'],
                isMax: false,//最大化属性 默认不是
                end: null,
                yes: function (index, layero) {
                    // 修改内容：用 layero 取 iframe，避免 top.layer 下 window 取不到
                    layero.find('iframe').contents().find('#submit').trigger('click');
                }
            };
            var options = $.extend(defaults, options);
            //ie缓存问题
            //options.url = obj.urlAddTime(options.url);
            //options.url = obj.urlAddTime(options.url);
            //高度宽度超出就适应屏幕
            var _width = document.body.clientWidth > parseInt(options.width.replace('px', '')) ? options.width : document.body.clientWidth - 20 + 'px';
            var _height = document.body.clientHeight > parseInt(options.height.replace('px', '')) ? options.height : document.body.clientHeight - 20 + 'px';
            if (obj.currentWindow()) {
                _width = obj.currentWindow().document.body.clientWidth > parseInt(options.width.replace('px', '')) ? options.width : obj.currentWindow().document.body.clientWidth - 20 + 'px';
                _height = obj.currentWindow().document.body.clientHeight > parseInt(options.height.replace('px', '')) ? options.height : obj.currentWindow().document.body.clientHeight - 20 + 'px';
            }
            // 修改内容：手机端全屏
            if (top.layui.miniAdmin.checkMobile()) {
                _width = _height = '100%';
                options.maxmin = false;
            }

            var index = top.layer.open({
                type: 2,
                shade: options.shade,
                title: options.title,
                isOutAnim: options.isOutAnim,//关闭动画
                maxmin: options.maxmin, //开启最大化最小化按钮
                fix: false,
                area: [_width, _height],
                content: options.url,
                id: !!options.id ? options.id : options.title,
                btn: options.btn,
                success: function (layero, index) {
                    $(layero).addClass("scroll-wrapper");//苹果 iframe 滚动条失效解决方式
                    //建立父子关系
                    if (window.top != null && !window.top.hasOwnProperty('iframesList')) {
                        window.top.iframesList = {};
                    }
                    if (window.MIC != null) {
                        window.top.MIC = window.MIC
                    }
                    window.top.iframesList[index] = window;
                    const iframeWin = layero.find('iframe')[0].contentWindow;
                    if (clickTarget && !(Array.isArray(options.btn) && options.btn.length === 0)) {
                        // 给按钮区添加“启用”复选框
                        var btnArea = layero.find('.layui-layer-btn');
                        btnArea.css({
                            'display': 'flex',
                            'justify-content': 'flex-end',
                        });
                        // append 保持 layui 按钮 a 的兄弟 index 不被打乱（yes 依赖 index），再用 flex order 视觉放到最前
                        if (btnArea.find('#keepOpen').length === 0) {
                            btnArea.append(`
                            <div class="layui-form" style="order:-1;display:flex;align-items: flex-end">
                                <input type="checkbox" id="keepOpen" lay-skin="tag" title="快捷" lay-filter="keepOpen">
                            </div>
                        `);
                            if (getKeepOpen()) layero.find('#keepOpen').prop('checked', true);
                            top.layui.form.render('checkbox')
                            var formCheckbox = layero.find('.layui-form-checkbox')
                            formCheckbox.css({
                                'height': '25px',
                                'line-height': '25px'
                            })
                            top.layui.form.on('checkbox(keepOpen)', function (res) {
                                setKeepOpen(!!res.elem.checked);
                            });

                        }
                    }
                    // 把数据注入子页面路由状态
                    if (options.routeState) {
                        iframeWin.history.replaceState(
                            { routeState: options.routeState },
                            '',
                            iframeWin.location.href
                        );
                    }
                    if (!!options.success) {
                        options.success(layero, index);
                    }
                },
                //btnclass: options.btnclass,
                yes: function (index, layero) {
                    // 修改内容：只走 yes，返回值交给 layer（false 不关）
                    var ret = typeof options.yes === 'function' ? options.yes(index, layero) : undefined;
                    // 勾选快捷则不关层
                    if (layero.find('#keepOpen').is(':checked')) {
                        return false;
                    }
                    return ret;
                }, btn2: function (index, layero) {
                    if (!!options.btn2) {
                        options.btn2(index, layero);
                    }
                    else {
                        if (window.top != null && window.top.hasOwnProperty('iframesList')) {
                            delete window.top.iframesList[index];
                        }
                    }
                }, cancel: function (index, layero) {
                    if (window.top != null && window.top.hasOwnProperty('iframesList')) {
                        delete window.top.iframesList[index];
                    }
                    if (!!options.cancel) {
                        options.cancel(index, layero);
                    }
                    else {
                        return true;
                    }
                },
                end: function () {
                    if (!!options.end) {
                        options.end();
                        return
                    }
                }
            });
            if (options.isMax) {
                top.layer.full(index);
            }
            return index;
        },
        //表单提交
        submitForm: function (options) {
            var defaults = {
                url: "",
                param: [],
                success: null,
                close: true,
                preventReuse: '.site-demo-active'//防止重复的参数
            };
            var options = $.extend(defaults, options);
            //ie缓存问题
            options.url = obj.urlAddTime(options.url);
            // 单击之后提交按钮不可选,防止重复提交
            if (!!options.preventReuse) {
                $(options.preventReuse).addClass('layui-btn-disabled');
                $(options.preventReuse).attr('disabled', 'disabled');
            }
            window.setTimeout(function () {
                if ($('[name=__RequestVerificationToken]').length > 0) {
                    var csrfToken = $('[name=__RequestVerificationToken]').val();
                }
                var index = parent.layer.load(0, {
                    shade: [0.5, '#000'], //0.1透明度的背景
                });
                $.ajax({
                    url: options.url,
                    data: options.param,
                    type: "post",
                    dataType: "json",
                    async: false,
                    headers: {
                        "X-CSRF-TOKEN": csrfToken
                    },
                    success: function (data) {
                        if (data.state == "success") {
                            options.success(data);
                            obj.modalMsg(data.message, data.state);
                            // 快捷模式：不关层，刷新当前页
                            if (getKeepOpen()) {
                                var urlObj = new URL(location.href);
                                urlObj.searchParams.delete('btnId');
                                history.replaceState(history.state || {}, '', urlObj);
                                location.reload();
                            } else {
                                if (options.close) {
                                    try {
                                        obj.modalClose();
                                    }
                                    catch (err) {
                                        parent.layer.close(index);
                                        miniTab.deleteCurrentByIframe();
                                    }
                                }
                            }
                        } else {
                            obj.modalAlert(data.message, data.state);
                        }
                        if (!!options.preventReuse) {
                            $(options.preventReuse).removeClass('layui-btn-disabled');
                            $(options.preventReuse).removeAttr('disabled');
                        }
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        parent.layer.close(index);
                        obj.modalAlert(errorThrown, "error");
                        if (!!options.preventReuse) {
                            $(options.preventReuse).removeClass('layui-btn-disabled');
                            $(options.preventReuse).removeAttr('disabled');
                        }
                    },
                    beforeSend: function () {
                    },
                    complete: function () {
                        parent.layer.close(index);
                    }
                });
                return false;
            }, 500);
        },
        //二次确认框
        modalConfirm: function (content, callBack, data = []) {
            var index = top.layer.confirm(content, {
                icon: "fa-exclamation-circle",
                title: "系统提示",
                id: "系统提示",
                btn: ['确认', '取消'],
                btnclass: ['btn btn-primary', 'btn btn-danger'],
            }, function () {
                // 如果是对象就转成数组
                if (typeof data === "object" && !Array.isArray(data)) {
                    top.modalConfirmData = [data];
                } else {
                    top.modalConfirmData = data;
                }
                top.layer.close(index);
                callBack(true);
            }, function () {
                callBack(false)
            });
        },
        //文档弹窗
        modalPrompt: function (type, title, value, callBack) {
            if (type < 0 || type > 3) {
                type = 0;
            }
            top.layer.prompt({
                formType: type,
                value: value,
                title: title,
                id: title,
                btn: ['确认', '取消'],
                btnclass: ['btn btn-primary', 'btn btn-danger'],
            }, function (value, index, elem) {
                top.layer.close(index);
                callBack(value);
            });
        },
        //删除
        deleteForm: function (options) {
            var defaults = {
                prompt: "注：您确定要删除选中数据吗？",
                url: "",
                param: [],
                success: null,
                close: false
            };
            var options = $.extend(defaults, options);
            //ie缓存问题
            options.url = obj.urlAddTime(options.url);
            if ($('[name=__RequestVerificationToken]').length > 0) {
                var csrfToken = $('[name=__RequestVerificationToken]').val();
            }
            obj.modalConfirm(options.prompt, function (r) {
                if (r) {
                    var index = top.layer.load(0, {
                        shade: [0.5, '#000'], //0.1透明度的背景
                    });
                    window.setTimeout(function () {
                        $.ajax({
                            url: options.url,
                            data: options.param,
                            type: "post",
                            dataType: "json",
                            headers: {
                                "X-CSRF-TOKEN": csrfToken
                            },
                            success: function (data) {
                                if (data.state == "success") {
                                    options.success(data);
                                    obj.modalMsg(data.message, data.state);
                                    if (options.close) {
                                        obj.modalClose();
                                    }
                                } else {
                                    obj.modalAlert(data.message, data.state);
                                    top.layer.close(index);
                                }
                            },
                            error: function (XMLHttpRequest, textStatus, errorThrown) {
                                top.layer.close(index);
                                obj.modalMsg(errorThrown, "error");
                            },
                            beforeSend: function () {
                            },
                            complete: function () {
                                top.layer.close(index);
                            }
                        });
                    }, 500);
                }
            });

        },
        //post提交
        submitPost: function (options) {
            var defaults = {
                prompt: options.title,
                url: "",
                param: [],
                success: null,
                close: false
            };
            var options = $.extend(defaults, options);
            //ie缓存问题
            options.url = obj.urlAddTime(options.url);
            if ($('[name=__RequestVerificationToken]').length > 0) {
                var csrfToken = $('[name=__RequestVerificationToken]').val();
            }
            obj.modalConfirm(options.prompt, function (r) {
                if (r) {
                    var index = parent.layer.load(0, {
                        shade: [0.5, '#000'], //0.1透明度的背景
                    });
                    window.setTimeout(function () {
                        $.ajax({
                            url: options.url,
                            data: options.param,
                            type: "post",
                            dataType: "json",
                            headers: {
                                "X-CSRF-TOKEN": csrfToken
                            },
                            success: function (data) {
                                if (data.state == "success") {
                                    options.success(data);
                                    obj.modalMsg(data.message, data.state);
                                    if (options.close) {
                                        obj.modalClose();
                                    }
                                } else {
                                    obj.modalAlert(data.message, data.state);
                                }

                            },
                            error: function (XMLHttpRequest, textStatus, errorThrown) {
                                parent.layer.close(index);
                                obj.modalMsg(errorThrown, "error");
                            },
                            beforeSend: function () {
                            },
                            complete: function () {
                                parent.layer.close(index);
                            }
                        });
                    }, 500);
                }
            });

        },
        // 修改内容：formData 唯一数据源；写=刷 DOM，读=返回同一对象
        val: function (filter, formdate) {
            var element = $('div[lay-filter=' + filter + ']');
            var cf = layui.commonForm;
            if (formdate) {
                if (cf) cf.formData = formdate;
                element.data('formData', formdate);
                $.each(formdate, function (key, val) {
                    var $el = element.find('#' + key);
                    if (!$el.length) return;
                    $el.val($.trim(String(val == null ? '' : val)).replace(/&nbsp;/g, ''));
                });
                return false;
            }
            // 读：只返回 formData
            var data = (cf && cf.formData) || element.data('formData') || {};
            if (cf) cf.formData = data;
            element.data('formData', data);
            return data;
        },
        /**
         * @param {String} enCode - 固定为'GetObjectFields'
         * @param {Object} fieldData - {F_EnCode: [...]}, 外部传入，比如 {F_EnCode: ['A','B','C']}
         * @param {String} myFields - 固定为'F_Id'，不过仅用于返回值的字段
         * @returns {Promise<Array>} - 返回F_Id数组
         */
        getMyFieldData: function ({ enCode, fieldData, params, myFields }) {
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: "/Public/GetReferenceListJson",
                    type: "GET",
                    data: { enCode: enCode, param: JSON.stringify(params) },
                    dataType: "json",
                    success: function (res) {
                        var dataArr = res && res.data ? res.data : (Array.isArray(res) ? res : []);
                        var filterKeys = fieldData && typeof fieldData === "object"
                            ? Object.keys(fieldData)
                            : [];
                        var filteredRows = dataArr.filter((item) => {
                            return filterKeys.every((key) => {
                                var filterValuesArr = Array.isArray(fieldData[key]) ? fieldData[key] : [];
                                if (!filterValuesArr.length) return true;
                                return filterValuesArr.indexOf((item[key] || "")) > -1;
                            });
                        })
                        // 只返回目标字段的数组
                        var idArr = filteredRows.map(function (item) { return item[myFields]; });
                        resolve(idArr);
                    },
                    error: function (xhr, status, err) {
                        reject(err);
                    }


                });
            });
        },
        // 仅重载父页面表格数据，不刷新页面、不销毁弹窗
        tableOnlyReload: function () {
            var pWin = obj.parentWindow();
            if (!pWin) return;
            var tableId = pWin.mainTableId || 'currentTableId';
            if (pWin.layui && pWin.layui.commonTable) {
                pWin.layui.commonTable.reloadtable({ elem: tableId, type: 'data' });
            }
        },
        // 仅重载当前页面表格数据
        tableCurrentReload: function () {
            var pWin = obj.currentWindow();
            if (!pWin) return;
            var tableId = pWin.mainTableId || 'currentTableId';
            if (pWin.layui && pWin.layui.commonTable) {
                pWin.layui.commonTable.reloadtable({ elem: tableId, type: 'data' });
            }
        },
        //父窗体刷新（按钮刷新）
        parentreload: function (filter) {
            obj.parentWindow().$('button[lay-filter="' + filter + '"]').click();
        },
        //父窗体
        parentWindow: function () {
            var index = parent.layer.getFrameIndex(window.name);
            if (window.top != null && window.top.hasOwnProperty('iframesList')) {
                return window.top.iframesList[index];
            }
            else {
                return null;
            }
        },
        //当前tab窗体
        currentWindow: function () {
            var iframes = top.$(".layui-show>iframe");
            if (iframes.length > 0) {
                return iframes[0].contentWindow;
            }
            else {
                return window.parent;
            }
        },
        //当前页刷新（按钮刷新）
        reload: function (filter) {
            $('button[lay-filter="' + filter + '"]').click();//按钮刷新
        },
        //下载方法
        download: function (url, data, method) {
            if (url && data) {
                data = typeof data == 'string' ? data : jQuery.param(data);
                var inputs = '';
                $.each(data.split('&'), function () {
                    var pair = this.split('=');
                    inputs += '<input type="hidden" name="' + pair[0] + '" value="' + pair[1] + '" />';
                });
                $('<form action="' + url + '" method="' + (method || 'post') + '">' + inputs + '</form>').appendTo('body').submit().remove();
            };
        },
        //设置Form只读
        setReadOnly: function (filter) {
            var readForm = layui.$('[lay-filter="' + filter + '"]');
            readForm.find('input,textarea,select').prop('disabled', true);
            readForm.find('input,textarea,select').removeAttr('lay-verify');
        },
        //设置Tab只读
        setTabReadOnly: function (filter) {
            var readForm = layui.$('[lay-filter="' + filter + '"]');
            readForm.find('input[type!="radio"],textarea,select').prop('disabled', true);
        },
        //按钮权限(控制js模板,格式必须严格,新)
        // enCode 传了则 F_TableId 必须等于该视图编码；未传则只按按钮 F_EnCode
        authorizeButtonNew: function (innerHTML, enCode) {
            // 四个必定显示的按钮id
            // 修改内容：追加 NF-flowvft/NF-flowdetails——F_IsFlow 模块由框架自动注入的处理/进度行按钮，
            // 不在模块按钮配置表里，不进白名单会被权限裁剪删掉（显示与否由行级 F_Condition 控制）
            var alwaysShowBtnIds = ["NF-pred", "NF-next", "NF-print", "NF-close", "NF-flowvft", "NF-flowdetails"];
            // 行操作权限控制
            var moduleId = location.pathname.replace(/Form([^\/]*)$/, 'Index');
            var returnhtml = '';
            // 没有就全清
            if (!top.clients || !top.clients.authorizeButton) {
                return returnhtml;
            }
            var dataJson = top.clients.authorizeButton[moduleId.split("?")[0]];
            function hasButtonAuth(btnId, requireAuthorizeAttr, attrHtml) {
                if (!btnId) return false;
                if (alwaysShowBtnIds.indexOf(btnId) !== -1) return true;
                if (!dataJson || !Array.isArray(dataJson)) return false;
                if (requireAuthorizeAttr && (!attrHtml || attrHtml.indexOf(' authorize') === -1)) return false;
                for (var j = 0; j < dataJson.length; j++) {
                    if (btnId !== dataJson[j].F_EnCode) continue;
                    if (enCode && dataJson[j].F_TableId !== enCode) continue;
                    return true;
                }
                return false;
            }

            if (innerHTML.indexOf('</button>') > -1) {
                var buttonHumanized = sessionStorage.getItem('iceskycloudButtonHumanized');
                var tempList = innerHTML.split('</button>');
                for (var i = 0; i < tempList.length; i++) {
                    if (tempList[i].indexOf('<button ') > -1) {
                        var itemList = tempList[i].split('<button ');
                        returnhtml = returnhtml + itemList[0];

                        // 严格匹配id="xxx"
                        var btnIdMatch = itemList[1].match(/id="([^"]+)"/);
                        var btnId = btnIdMatch ? btnIdMatch[1] : null;
                        var hasAuth = hasButtonAuth(btnId, true, itemList[1]);

                        if (hasAuth) {
                            var btn = '<button ' + itemList[1] + '</button>';
                            if (!!buttonHumanized) {
                                btn = btn.replace('layui-hide', '');
                            }
                            returnhtml = returnhtml + btn;
                            if (itemList.length > 2) {
                                returnhtml = returnhtml + itemList[2];
                            }
                        }
                        // 否则这个button不渲染
                    } else {
                        returnhtml = returnhtml + tempList[i];
                    }
                }
            }
            else if (innerHTML.indexOf('</a>') > -1) {
                var tempList = innerHTML.split('</a>');
                for (var i = 0; i < tempList.length; i++) {
                    if (tempList[i].indexOf('<a ') > -1) {
                        var itemList = tempList[i].split('<a ');
                        returnhtml = returnhtml + itemList[0];
                        // 新规范：必须有authorize属性且id在dataJson中才显示
                        var aidMatch = itemList[1].match(/id="([^"]+)"/);
                        var aId = aidMatch ? aidMatch[1] : null;
                        var hasAAuth = hasButtonAuth(aId, true, itemList[1]);

                        if (hasAAuth) {
                            returnhtml = returnhtml + '<a ' + itemList[1] + '</a>';
                        }
                        if (itemList.length > 2) {
                            returnhtml = returnhtml + itemList[2];
                        }
                    } else {
                        returnhtml = returnhtml + tempList[i];
                    }
                }
            }

            //去除隐藏
            //returnhtml = returnhtml.replace(/ layui-hide/g, '');
            return returnhtml;
        },
        authorizeTabButton: function (innerHTML) {
            //行操作权限控制
            var moduleId = location.pathname;
            var returnhtml = '';
            //没有就全清
            if (!top.clients || !top.clients.authorizeButton) {
                return returnhtml;
            }
            var dataJson = top.clients.authorizeButton[moduleId.split("?")[0]];
            if (innerHTML.indexOf('</button>') > -1) {
                var buttonHumanized = sessionStorage.getItem('iceskycloudButtonHumanized');
                var tempList = innerHTML.split('</button>');
                for (var i = 0; i < tempList.length; i++) {
                    if (tempList[i].indexOf('<button ') > -1) {
                        var itemList = tempList[i].split('<button ');
                        returnhtml = returnhtml + itemList[0];
                        if (itemList[1].indexOf(' authorize') == -1) {
                            returnhtml = returnhtml + '<button ' + itemList[1] + '</button>';
                        }
                        else if (dataJson != undefined) {
                            $.each(dataJson, function (i) {
                                if (itemList[1].indexOf('id="' + dataJson[i].F_EnCode + '"') > -1) {
                                    returnhtml = returnhtml + '<button ' + itemList[1] + '</button>';
                                    return false;
                                }
                            });
                        }
                        if (!!buttonHumanized) {
                            returnhtml = returnhtml.replace('layui-hide', '');
                        }
                        if (itemList.length > 2) {
                            returnhtml = returnhtml + itemList[2];
                        }
                    }
                    else {
                        returnhtml = returnhtml + tempList[i];
                    }
                }
            }
            else if (innerHTML.indexOf('</a>') > -1) {
                var tempList = innerHTML.split('</a>');
                for (var i = 0; i < tempList.length; i++) {
                    if (tempList[i].indexOf('<a ') > -1) {
                        var itemList = tempList[i].split('<a ');
                        returnhtml = returnhtml + itemList[0];
                        if (itemList[1].indexOf(' authorize') == -1) {
                            returnhtml = returnhtml + '<a ' + itemList[1] + '</a>';
                        }
                        else if (dataJson != undefined) {
                            $.each(dataJson, function (i) {
                                if (itemList[1].indexOf('id="' + dataJson[i].F_EnCode + '"') > -1) {
                                    returnhtml = returnhtml + '<a ' + itemList[1] + '</a>';
                                    return false;
                                }
                            });
                        }
                        if (itemList.length > 2) {
                            returnhtml = returnhtml + itemList[2];
                        }
                    }
                    else {
                        returnhtml = returnhtml + tempList[i];
                    }
                }
            }
            //去除隐藏
            //returnhtml = returnhtml.replace(/ layui-hide/g, '');
            return returnhtml;
        },
        /**
         * 控制当前页按钮的可点击与不可点击效果
         * 传入需要禁用的按钮id数组（如 ['NF-delete','NF-details']），让这些id对应的按钮禁用，其他可用
         * 调用示例：obj.disableButtons(['NF-delete','NF-details']);
         */
        disableButtons: function (btnIdArr) {
            if (!Array.isArray(btnIdArr)) return;
            var keyValue = $.request("keyValue");
            if (!keyValue) {
                var defaultDisabled = ['NF-pred', 'NF-next', 'NF-print'];
                // 合并并去重
                btnIdArr = Array.from(new Set(btnIdArr.concat(defaultDisabled)));
            }
            // 只控制页面上所有 button[id]
            $('button[id]').each(function () {
                var $btn = $(this);
                var id = $btn.attr('id');
                if (id) {
                    if (btnIdArr.indexOf(id) !== -1) {
                        // 如果该按钮的ID在禁用列表中，则禁用
                        $btn.prop('disabled', true);
                        $btn.addClass('layui-btn-disabled');
                    } else {
                        // 其他按钮启用
                        $btn.prop('disabled', false);
                        $btn.removeClass('layui-btn-disabled');
                    }
                }
            });
        },
        /**
         * 将对象或数组中值为""或undefined的字段转换为null（处理最多两级结构）
         * @param {Object|Array|string} data
         * @returns {Object|Array|string}
         */
        emptyTonull: function (data) {
            let jsonData;
            let isStringInput = false;

            // 解析为对象
            if (typeof data === 'string') {
                try {
                    jsonData = JSON.parse(data);
                    isStringInput = true;
                } catch (e) {
                    return data;
                }
            } else if (typeof data === 'object' && data !== null) {
                jsonData = data;
            } else {
                return data;
            }

            // 一级转换（array or object）
            function convertLevel(obj) {
                if (Array.isArray(obj)) {
                    for (let i = 0; i < obj.length; i++) {
                        if (obj[i] === "" || obj[i] === undefined) {
                            obj[i] = null;
                        } else if (typeof obj[i] === "object" && obj[i] !== null) {
                            // 只递归一次（最多两级）
                            convertLevel(obj[i]);
                        }
                    }
                } else if (typeof obj === "object" && obj !== null) {
                    for (let key in obj) {
                        if (!obj.hasOwnProperty(key)) continue;
                        if (obj[key] === "" || obj[key] === undefined) {
                            obj[key] = null;
                        } else if (typeof obj[key] === "object" && obj[key] !== null) {
                            // 只递归一次（最多两级）
                            convertLevel(obj[key]);
                        }
                    }
                }
            }

            // 最多两级，不做无限递归
            convertLevel(jsonData);

            // 处理完后再转换回json
            if (isStringInput) {
                return JSON.stringify(jsonData);
            } else {
                return jsonData;
            }
        },

        /**
         * 将对象或数组中值为null的字段转换为空字符串（处理最多两级结构）
         * @param {Object|Array|string} data
         * @returns {Object|Array|string}
         */
        nullToEmpty: function (data) {
            let jsonData;
            let isStringInput = false;

            // 解析为对象
            if (typeof data === 'string') {
                try {
                    jsonData = JSON.parse(data);
                    isStringInput = true;
                } catch (e) {
                    return data;
                }
            } else if (typeof data === 'object' && data !== null) {
                jsonData = data;
            } else {
                return data;
            }

            // 一级转换（array or object）
            function convertNullLevel(obj) {
                if (Array.isArray(obj)) {
                    for (let i = 0; i < obj.length; i++) {
                        if (obj[i] === null) {
                            obj[i] = "";
                        } else if (typeof obj[i] === "object" && obj[i] !== null) {
                            // 只递归一次（最多两级）
                            convertNullLevel(obj[i]);
                        }
                    }
                } else if (typeof obj === "object" && obj !== null) {
                    for (let key in obj) {
                        if (!obj.hasOwnProperty(key)) continue;
                        if (obj[key] === null) {
                            obj[key] = "";
                        } else if (typeof obj[key] === "object" && obj[key] !== null) {
                            // 只递归一次（最多两级）
                            convertNullLevel(obj[key]);
                        }
                    }
                }
            }

            // 最多两级，不做无限递归
            convertNullLevel(jsonData);

            // 处理完后再转换回json
            if (isStringInput) {
                return JSON.stringify(jsonData);
            } else {
                return jsonData;
            }
        },

        /**
         * 将以 F_ 开头的字段自动生成不带 F_ 前缀的简写字段，或根据 mapFields 映射.
         * @param {Object} obj - 待映射对象
         * @param {Array} fields - 需要映射字段集合（含 F_ 前缀）
         */
        mapFields: function (obj, fields) {
            if (!fields || fields.length === 0) {
                Object.keys(obj).forEach(function (key) {
                    if (key.startsWith('F_')) {
                        var newKey = key.substring(2);
                        if (!(newKey in obj)) {
                            obj[newKey] = obj[key];
                        }
                    }
                });
            } else {
                fields.forEach(function (field) {
                    if (obj.hasOwnProperty(field)) {
                        var newKey = field.replace(/^F_/, '');
                        if (!(newKey in obj)) {
                            obj[newKey] = obj[field];
                        }
                    }
                });
            }
        },
        //权限按钮(控制dom,只控制button,旧)
        authorizeButton: function (id) {
            var moduleId = top.$(".layui-tab-title>.layui-this").attr("lay-id");
            if (!moduleId) {
                moduleId = location.pathname;
            }
            //没有就全清
            if (!top.clients || !top.clients.authorizeButton) {
                $element.find('button[authorize=yes]').attr('authorize', 'no');
                $element.find("[authorize=no]").parents('button').prev('.split').remove();
                $element.find("[authorize=no]").parents('button').remove();
                $element.find('[authorize=no]').remove();
                return false;
            }
            var dataJson = top.clients.authorizeButton[moduleId.split("?")[0]];
            var $element = $('#' + id);
            $element.find('button[authorize=yes]').attr('authorize', 'no');
            if (dataJson != undefined) {
                var buttonHumanized = sessionStorage.getItem('iceskycloudButtonHumanized');
                $.each(dataJson, function (i) {
                    $element.find("#" + dataJson[i].F_EnCode).attr('authorize', 'yes');
                    //去除隐藏
                    if (!!buttonHumanized) {
                        $element.find("#" + dataJson[i].F_EnCode).removeClass('layui-hide');
                    }
                });
            }
            $element.find("[authorize=no]").parents('button').prev('.split').remove();
            $element.find("[authorize=no]").parents('button').remove();
            $element.find('[authorize=no]').remove();
        },
        //权限控制单个按钮，返回是否
        authorizeButtonOne: function (id) {
            var moduleId = top.$(".layui-tab-title>.layui-this").attr("lay-id");
            if (!moduleId) {
                moduleId = location.pathname;
            }
            var isOk = false;
            if (!top.clients || !top.clients.authorizeButton || !top.clients.authorizeButton[moduleId.split("?")[0]]) {
                isOk = false;
            }
            else {
                var dataJson = top.clients.authorizeButton[moduleId.split("?")[0]];

                for (var i = 0; i < dataJson.length; i++) {
                    if (dataJson[i].F_EnCode == id) {
                        isOk = true;
                    }
                }
            }
            if (isOk) {
                $("#" + id).parent().removeClass('layui-hide');
            }
            else {
                $("#" + id).remove();;
                $("#" + id).parent().remove();;
            }
            return isOk;
        },
        //表单权限字段
        authorizeFields: function (filter) {
            var moduleId = top.$(".layui-tab-title>.layui-this").attr("lay-id");
            if (!moduleId) {
                moduleId = location.pathname;
            }
            var element = $('div[lay-filter=' + filter + ']');
            //没有就全清
            if (!top.clients || !top.clients.moduleFields) {
                element.find('input,select,textarea').each(function (r) {
                    $this.parent().parent().remove();
                });
                return false;
            }
            if (!!top.clients.moduleFields[moduleId.split("?")[0]] && top.clients.moduleFields[moduleId.split("?")[0]] == true) {
                var dataJson = top.clients.authorizeFields[moduleId.split("?")[0]];
                element.find('input,select,textarea').each(function (r) {
                    var $this = $(this);
                    var id = $this.attr('id');
                    $this.addClass('layui-hide');
                    $this.attr('authorize', 'no');
                    if (dataJson != undefined) {
                        for (var i = 0; i < dataJson.length; i++) {
                            if (id == dataJson[i].F_EnCode) {
                                $this.parent().parent().removeClass('layui-hide');
                                $this.removeClass('layui-hide');
                                $this.attr('authorize', 'yes');
                                break;
                            }
                        }
                        //dataJson.find(item => {
                        //    if (id == item.F_EnCode) {
                        //        $this.parent().parent().removeClass('layui-hide');
                        //        $this.removeClass('layui-hide');
                        //    }
                        //});
                    }
                });
                // element.find('[authorize=no]').parent().parent().remove(); //wzx 注释
            }
            else {
                element.find('input,select,textarea').each(function (r) {
                    var $this = $(this);
                    $this.parent().parent().removeClass('layui-hide'); //wzx 注释
                });
            }
        },
        //iframe定时器方法
        iframeInterval: function (func, time) {
            console.log("启动定时器", func, time);
            //点击iframe对应的标签则直接执行定时器方法。不过注意，这里我默认只执行最后一个定时器方法，如果有多个定时器请自行更改。
            top.$("li[lay-id='" + $(self.frameElement).attr("src") + "']").unbind('click').click(function () {
                console.log(func, "方法调用");
                func.call();
            });
            return setInterval(function () {
                console.log("定时器调用");
                if ($(self.frameElement.parentElement).hasClass("layui-show")) {
                    //判断所在的页面是否显示
                    console.log(func, "方法调用");
                    console.log("定时器间隔" + time);
                    func.call();
                }
            }, time);
        },
        //ajax封装
        ajax: function (options) {
            var defaults = {
                dataType: "json",
                async: true,
                type: "GET"
            };
            var options = $.extend(defaults, options);
            //ie缓存问题
            options.url = obj.urlAddTime(options.url);
            return $.ajax(options);
        },

        //打开新Tab页签，支持params参数，params内的字段不会拼接到路径上
        openNewTabByIframe: function (options) {
            var defaults = {
                title: "",
                href: "",
                checkOpen: true,
                params: null // 新增 params 字段
            };
            var options = $.extend(defaults, options);

            var baseHref = options.href;
            var tabId = baseHref.split("?")[0];
            if (options.params) {
                top.tabParams = top.tabParams || {};
                top.tabParams[tabId] = options.params;
            }

            if (options.checkOpen && miniTab.check(tabId, true)) {
                obj.modalConfirm("界面已打开，要重置吗？", function (r) {
                    if (r) {
                        parent.layui.element.tabDelete('layuiminiTab', tabId);
                        miniTab.openNewTabByIframe({
                            title: options.title,
                            href: baseHref,
                        });
                        return false;
                    }
                });
                return;
            }

            // 调用底层方法
            miniTab.create({
                tabId: tabId,
                href: baseHref,
                title: options.title,
                isIframe: true
            });
            parent.layui.element.tabChange('layuiminiTab', tabId);
        },
        //刷新tab Iframe
        reloadIframe: function (src, filter) {
            var iframes = top.$('.layui-tab-item>iframe[src="' + src + '"]');
            if (iframes.length > 0) {
                parent.layui.element.tabChange('layuiminiTab', src);
                iframes[0].contentWindow.$('button[lay-filter="' + filter + '"]').click();
            }
        },
        //url参数注入(//ie缓存问题)
        urlAddTime: function (url) {
            if (!!url) {
                if (url.indexOf("?") >= 0) {
                    url = url + '&v=' + moment().format('YYYY-MM-DD HH:mm:ss');
                }
                else {
                    url = url + '?v=' + moment().format('YYYY-MM-DD HH:mm:ss');
                }
                return url;
            }
            else {
                return null;
            }
        },
        //表格权限字段(过滤cols)
        tableAuthorizeFields: function (cols) {
            var moduleId = top.$(".layui-tab-title>.layui-this").attr("lay-id");
            if (!moduleId) {
                moduleId = location.pathname;
            }
            //没有权限就返回无
            if (!top.clients || !top.clients.moduleFields) {
                return [];
            }
            if (!!top.clients.moduleFields[moduleId.split("?")[0]] && top.clients.moduleFields[moduleId.split("?")[0]] == true) {
                var dataJson = top.clients.authorizeFields[moduleId.split("?")[0]];
                var array = [];
                $.each(cols[0], function (i) {
                    //添加非常规列
                    if (!!cols[0][i].type && cols[0][i].type != 'normal') {
                        array.push(cols[0][i]);
                    } else if (!cols[0][i].field && cols[0][i].title == "操作") {
                        array.push(cols[0][i]);
                    }
                    if (!!dataJson) {
                        for (var j = 0; j < dataJson.length; j++) {
                            if (cols[0][i].field == dataJson[j].F_EnCode) {
                                array.push(cols[0][i]);
                                break;
                            }
                        }
                    }
                });
                cols[0] = array;
                //手机端去除固定列
            };
            return obj.checkPhone(cols);
        },
        formAuthorizeFields: function (cols) {
            var moduleId = top.$(".layui-tab-title>.layui-this").attr("lay-id");
            if (!moduleId) {
                moduleId = location.pathname;
            }
            //没有权限就返回无
            if (!top.clients || !top.clients.moduleFields) {
                return [];
            }
            if (!!top.clients.moduleFields[moduleId.split("?")[0]] && top.clients.moduleFields[moduleId.split("?")[0]] == true) {
                var dataJson = top.clients.authorizeFields[moduleId.split("?")[0]];
                var array = [];
                if (!!dataJson) {
                    // 查找dataJson中每一项 是否在cols中存在 存在就返回cols那一项
                    for (var j = 0; j < dataJson.length; j++) {
                        for (var i = 0; i < cols.length; i++) {
                            if (cols[i].F_EnCode == dataJson[j].F_EnCode) {
                                array.push(cols[i]);
                                break;
                            }
                        }
                    }

                }
                cols = array
            };
            return cols
        },
        //form参数过滤方法，值不存在直接删除
        removeEmpty: function (filter, formdate) {
            var element = $('div[lay-filter=' + filter + ']');
            if (!!formdate) {
                for (var key in formdate) {
                    var $id = element.find('#' + key);
                    if (!!$id && formdate[key] != 0 && formdate[key] != false && !formdate[key]) {
                        $id.parent().parent().remove();
                    }
                };
                return false;
            }
        },
        //检查电话号码
        checkPhone: function (cols) {
            var sUserAgent = navigator.userAgent.toLowerCase();
            var bIsIpad = sUserAgent.match(/ipad/i) == "ipad";
            var bIsIphoneOs = sUserAgent.match(/iphone os/i) == "iphone os";
            var bIsMidp = sUserAgent.match(/midp/i) == "midp";
            var bIsUc7 = sUserAgent.match(/rv:1.2.3.4/i) == "rv:1.2.3.4";
            var bIsUc = sUserAgent.match(/ucweb/i) == "ucweb";
            var bIsAndroid = sUserAgent.match(/android/i) == "android";
            var bIsCE = sUserAgent.match(/windows ce/i) == "windows ce";
            var bIsWM = sUserAgent.match(/windows mobile/i) == "windows mobile";
            if (bIsIpad || bIsIphoneOs || bIsMidp || bIsUc7 || bIsUc || bIsAndroid || bIsCE || bIsWM) {
                //跳转移动端页面
                $.each(cols[0], function (i) {
                    delete cols[0][i].fixed;
                });
                return cols;
            } else {
                //跳转pc端页面
                return cols;
            }
        },
        /**
         * 表格按钮（Index / Form 统一）：
         * - toolbar: '#xxx'：页面已有该模板则用手写；没有则按接口自动生成到该 id
         * - toolbar: false / 未传 / 空：不生成顶栏，保持关闭
         * - 行按钮：有 Location=2 则自动生成
         */
        createTableTool: function (tableOpts, index) {
            tableOpts = tableOpts || {};
            var tableId = tableOpts.id || String(tableOpts.elem || '').replace('#', '');
            var formJsonByenCode = history.state?.routeState || {};
            var keyValue = $.request("keyValue");
            var formFlow = $.request("formFlow");
            var btnUrl = window.location.pathname || '';
            var parentloc = window.parent.location.href || '';
            btnUrl = btnUrl.replace(/Form([^\/]*)$/, 'Index');
            // 流程表单：按钮列表按方案 meta.urlAddress 取（与 createTool 一致）
            if (formJsonByenCode && formJsonByenCode.F_SchemeContent) {
                try {
                    var meta = JSON.parse(formJsonByenCode.F_SchemeContent).meta || {};
                    if (meta.urlAddress) btnUrl = String(meta.urlAddress).replace(/Form([^\/]*)$/, 'Index');
                } catch (e) { /* ignore */ }
            }

            if (!obj._moduleBtnListCache) obj._moduleBtnListCache = {};
            if (!obj._moduleBtnListCache[btnUrl]) {
                var list = [];
                obj.ajax({
                    url: '/SystemManage/ModuleButton/GetBtnListJson',
                    data: { url: btnUrl },
                    async: false,
                    success: function (res) {
                        list = Array.isArray(res && res.data) ? res.data.slice() : [];
                    }
                });
                obj._moduleBtnListCache[btnUrl] = list;
            }

            var user = tableOpts.user || {};
            if (!user.id && typeof currentUser !== 'undefined' && currentUser) {
                user = {
                    id: currentUser.F_Id,
                    role: currentUser.F_RoleId,
                    org: currentUser.F_OrganizeId
                };
            }

            // 先只取启用按钮；F_Authorize=0 表示私用（非创建人不可见，不改缓存原数据）
            // 新增（无 keyValue）不判公用/私用
            // 修改内容：F_TableId 主视图过滤挪到所有按钮处理之后，避免注入的流程按钮被提前滤掉
            var btns = (obj._moduleBtnListCache[btnUrl] || []).filter(function (x) {
                return x.F_EnabledMark;
            }).sort(function (a, b) {
                return (a.F_SortCode || 0) - (b.F_SortCode || 0);
            });
            if (keyValue && btns.some(function (btn) { return btn.F_Authorize == 0; })) {
                var row = tableOpts.formData || tableOpts.form || null;
                if (typeof row === 'string') {
                    try { row = JSON.parse(row); } catch (e) { row = null; }
                }
                if (!row) {
                    var creatorVal = $('#F_CreatorUserId').val() || $('input[name="F_CreatorUserId"]').val();
                    if (creatorVal != null && creatorVal !== '') {
                        row = { F_CreatorUserId: creatorVal };
                    }
                }
                var creatorId = row?.F_CreatorUserId ?? row?.form?.F_CreatorUserId ?? null;
                if (creatorId != null && user.id != creatorId) {
                    btns = btns.filter(function (btn) {
                        return btn.F_Authorize === '' || btn.F_Authorize != 0;
                    });
                }
            }

            // 流程：按当前节点 NodeDesignateData.btns 过滤（与 createTool 一致）
            var flowFiltered = filterModuleBtnsByFlow(btns, formJsonByenCode, keyValue, formFlow);
            if (flowFiltered !== null) btns = flowFiltered;

            // 修改内容：F_IsFlow 模块（Index 首页加载数据时）自动注入流程「处理/进度」行按钮：
            // ① 处理 NF-flowvft——行数据 F_MakerList 非空且包含当前登录人 Id（视图需 LEFT JOIN oms_flowinstance 暴露 F_MakerList）；
            // ② 进度 NF-flowdetails——行数据 F_Status 非空且不为 '0'（单据已提交到流程审核中）。
            // 按钮显示与否由 F_Condition 按行判断（laytpl 模板条件）；模块已手配处理/进度行按钮时不重复注入；
            // 点击按 ToDoFlow 同款逻辑：FrmType=2 打开方案表单（formFlow），否则 Verification/Details，实例ID约定字段 F_FlowId
            var moduleFlowInfo = (top.clients && top.clients.GetMainView && top.clients.GetMainView[ModuleEnCode]) || {};
            if (moduleFlowInfo.IsFlow && tableOpts.isEnabled !== false) {
                var hasFlowRowBtn = btns.some(function (b) {
                    return b.F_Location == '2' && (b.F_JsEvent === 'flowvft' || b.F_JsEvent === 'flowdetails'
                        || b.F_FullName === '处理' || b.F_FullName === '进度');
                });
                if (!hasFlowRowBtn) {
                    btns.push({
                        F_EnCode: 'NF-flowdetails', F_FullName: '进度', F_Class: 'layui-btn-warm',
                        F_Location: '2', F_JsEvent: 'flowdetails', F_SortCode: 9999,
                        F_TableId: top.clients.GetMainView[ModuleEnCode].mainTable,
                        F_Condition: "d.F_Status != null && String(d.F_Status) !== '' && String(d.F_Status) !== '0'",
                        F_JsEventCode: "var d = obj.data || {};"
                            + "var instId = d.F_FlowId || d.F_FlowInstanceId || d.F_InstanceId || '';"
                            + "if (instId !== '') {"
                            + "common.modalOpen({ title: '查看进度', url: '/FlowManage/Flowinstance/Details?keyValue=' + instId, width: '800px', height: '600px', btn: [] });"
                            + "} else { common.modalMsg('当前流程已失效，请重新发起！', 'warning'); }"
                    });
                    btns.push({
                        F_EnCode: 'NF-flowvft', F_FullName: '处理', F_Class: '',
                        F_Location: '2', F_JsEvent: 'flowvft', F_SortCode: 9998,
                        F_TableId: top.clients.GetMainView[ModuleEnCode].mainTable,
                        F_Condition: "d.F_MakerList != null && d.F_MakerList != '' && (',' + d.F_MakerList + ',').indexOf(',' + {loginUser} + ',') > -1",
                        // 修改内容：与 ToDoFlow 的处理逻辑完全一致（已处理拦截 → FrmType=2 开方案表单 → 否则 Verification），
                        // 原字符串里的模板串改为 + 拼接（外层是 JS 字符串，内层引号统一用单引号）
                        F_JsEventCode: "if (obj.data.F_FlowFinish != 0 && obj.data.F_FlowFinish != 4) {"
                            + "common.modalMsg('申请已处理，无法处理', 'warning');"
                            + "return false;"
                            + "}"
                            + "if (obj.data.F_FrmType == 2) {"
                            + "const F_SchemeContent = JSON.parse(obj.data.F_SchemeContent);"
                            + "if (!(typeof F_SchemeContent.meta === 'object')) { F_SchemeContent.meta = JSON.parse(F_SchemeContent.meta); }"
                            + "obj.data.F_SchemeContent = JSON.stringify(F_SchemeContent);"
                            + "common.modalOpen({"
                            + "url: F_SchemeContent.meta.url + '?keyValue=' + obj.data.F_FrmId + '&formFlow=true',"
                            + "routeState: obj.data,"
                            + "type: '2'"
                            + "});"
                            + "} else {"
                            + "common.modalOpen({"
                            + "title: '处理流程',"
                            + "url: '/FlowManage/Flowinstance/Verification?keyValue=' + obj.data.F_Id,"
                            + "width: '800px',"
                            + "height: '600px'"
                            + "});"
                            + "}"
                    });
                }
            }

            // 修改内容：主视图 F_TableId 过滤放在授权/流程过滤/注入按钮之后
            btns = btns.filter(function (x) {
                return !tableOpts.enCode || x.F_TableId === tableOpts.enCode;
            });

            var toolbar = '';
            var tablebar = '';
            var event = '';
            // 修改内容：只读不生成/不展示业务按钮（含手写 toolbar）
            if (tableOpts.isEnabled === false) btns = [];
            // 按钮图标：优先用按钮配置的 F_Icon；兼容 layui 图标类名 / unicode / fa 图标；未配置则用默认图标
            function buildBtnIcon(icon, fallback) {
                icon = (icon || '').toString().trim();
                if (!icon) return fallback ? '<i class="layui-icon">' + fallback + '</i>' : '';
                if (/^fa[\s\-]/i.test(icon)) return '<i class="' + icon + '"></i>';           // fa fa-xxx
                if (/^&#x/i.test(icon)) return '<i class="layui-icon">' + icon + '</i>';      // &#xe654;
                if (icon.indexOf('layui-icon') === 0) return '<i class="layui-icon ' + icon + '"></i>'; // layui-icon-xxx
                return '<i class="layui-icon layui-icon-' + icon + '"></i>';                  // 简写兜底
            }
            btns.forEach(function (btn) {
                if (btn.F_Location == '1' || btn.F_Location == '4' || btn.F_Location == '5') {
                    var key = String(btn.F_JsEvent || '') + String(btn.F_EnCode || '');
                    var icon = /delete|del/i.test(key) ? '&#xe640;'
                        : /add|new|create|insert/i.test(key) ? '&#xe642;'
                            : '&#xe654;';
                    toolbar += '<button id="' + btn.F_EnCode + '" name="' + btn.F_EnCode
                        + '" authorize class="layui-btn layui-btn-sm ' + (btn.F_Class || '')
                        + '" lay-event="' + btn.F_JsEvent + '">' + buildBtnIcon(btn.F_Icon, icon)
                        + btn.F_FullName + '</button>';
                }
                if (btn.F_Location == '2') {
                    var rowHtml = '<a id="' + btn.F_EnCode + '" authorize class="layui-btn layui-btn-xs '
                        + (btn.F_Class || '') + '" lay-event="' + btn.F_JsEvent + '">'
                        + buildBtnIcon(btn.F_Icon, '') + btn.F_FullName + '</a>';
                    if (btn.F_Condition !== '' && btn.F_Condition != null) {
                        var cond = String(btn.F_Condition)
                            .replace(/\{loginUser\}/g, "'" + (user.id || '') + "'")
                            .replace(/\{loginRole\}/g, "'" + (user.role || '') + "'")
                            .replace(/\{loginOrg\}/g, "'" + (user.org || '') + "'");
                        btn.F_Condition = cond;
                        rowHtml = '{{# if(' + cond + '){ }}' + rowHtml + '{{#  } }}';
                    }
                    tablebar += rowHtml;
                }
                if (btn.F_JsEventCode) {
                    var code = btn.F_JsEventCode;
                    if (/common\.modalOpen|common\.deleteForm/.test(code)) {
                        code = code.replace(/(common\.(modalOpen|deleteForm)\(\{)([\s\S]*?)(\}\))/, function (m, p1, p2, p3, p4) {
                            if (/url\s*:/.test(p3)) return m;
                            return p1 + 'url:"' + (btn.F_UrlAddress || '') + '",' + p3 + p4;
                        });
                    }
                    event += 'if (obj.event === \'' + btn.F_JsEvent + '\') { ' + code + ' };';
                }
            });
            function ensureTpl(id) {
                var $el = $('#' + id);
                if (!$el.length) {
                    var $main = $('.layuimini-main').first();
                    $el = $('<script type="text/html" id="' + id + '"></script>');
                    if ($main.length) $el.insertAfter($main);
                    else $el.appendTo(document.body);
                }
                return $el;
            }

            // 流程内不再走角色按钮授权裁剪（与 createTool 一致）
            var wrapAuth = function (html) {
                return formFlow ? html : obj.authorizeButtonNew(html, tableOpts.enCode);
            };

            // 1. 顶栏：仅当传入非空字符串选择器时才处理；false / 未传 / 空 → 关闭
            // 修改内容：只读一律关掉顶栏（手写模板也不展示）
            if (tableOpts.isEnabled === false) {
                tableOpts.toolbar = false;
            } else if (typeof tableOpts.toolbar === 'string' && tableOpts.toolbar.trim() !== '') {
                var tplId = tableOpts.toolbar.trim().replace(/^#/, '');
                var $tpl = $('#' + tplId);
                if ($tpl.length) {
                    // 页面已写该模板：优先手写，不覆盖
                    tableOpts.toolbar = '#' + tplId;
                } else if (toolbar) {
                    // 没写：按接口自动生成到该 id
                    ensureTpl(tplId).html(
                        '<div class="layui-btn-container" id="toolbar' + index + '">'
                        + wrapAuth(toolbar) + '</div>'
                    );
                    tableOpts.toolbar = '#' + tplId;
                } else {
                    tableOpts.toolbar = true;
                }
            } else {
                tableOpts.toolbar = false;
            }

            // 2. 行按钮：按表隔离模板 #<表id>Toolbar（有 Location=2 则自动生成），避免同页多表互相覆盖
            if (tablebar) {
                var rowBar = '{{# if(!d._isSubTotal){ }}' + wrapAuth(tablebar) + '{{# } }}';
                ensureTpl(tableOpts.id+'Toolbar').html(rowBar);
                tableOpts.rowToolbar = '#'+tableOpts.id+'Toolbar';
            }

            return { btns: btns, event: event };
        },

        //创建窗体按扭
        /**
         * createTool 方法用于动态生成工具栏按钮，并根据权限及当前用户/数据行信息呈现不同的按钮集合。
         * @param {Object} cols 当前表单的数据列（数据行/表单的数据对象）
         * @param {Object} user 当前用户信息（包含id, role, org）
         * @param {Array} options 工具栏自定义事件参数（如 ['obj', 'common', ...]）
         */
        createTool: function (cols, user, options, printConfig = {}) {
            var isPreview = $.request("isPreview");
            var keyValue = $.request("keyValue")
            var formFlow = $.request("formFlow")
            if (isPreview) {
                $('.layuimini-main1').hide();
                return;
            }
            // 修改内容：有 keyValue 时统一记下上/下一条（流程+普通）
            if (keyValue) obj.rememberPageNav();
            let formJsonByenCode = history.state?.routeState || {}
            var loc = window.location.pathname;
            // 默认空数组，避免后续展开时报 “sortedData is not iterable”
            let sortedData = [];
            // 函数内静态缓存，只初始化一次
            if (typeof window._printConfigCache === "undefined") {
                window._printConfigCache = {};
            }
            // 每次调用更新缓存
            window._printConfigCache = printConfig || {};
                var btnListUrl = loc.replace(/Form([^\/]*)$/, 'Index');
                try {
                    var parentloc = window.parent.location.href || '';
                    if (parentloc.indexOf('/Module') > -1) {
                        btnListUrl = btnListUrl.replace(btnListUrl.split('/')[1], 'Module');
                    }
                } catch (e) { /* cross-origin */ }
                if (formJsonByenCode && formJsonByenCode?.F_SchemeContent) {
                    try {
                        const meta = JSON.parse(formJsonByenCode.F_SchemeContent)?.meta || {};
                        if (meta.urlAddress) btnListUrl = meta.urlAddress;
                    } catch (e) { /* ignore */ }
                }

                if (!obj._moduleBtnListCache) obj._moduleBtnListCache = {};
                if (!obj._moduleBtnListCache[btnListUrl]) {
                    var rawList = [];
                    obj.ajax({
                        url: '/SystemManage/ModuleButton/GetBtnListJson',
                        data: { url: btnListUrl },
                        async: false,
                        success: function (res) {
                            rawList = Array.isArray(res && res.data) ? res.data.slice() : [];
                        }
                    });
                    obj._moduleBtnListCache[btnListUrl] = rawList;
                }

                // 过滤详情按钮；F_Authorize=0 表示同角色非创建人不可见（不改缓存原数据）
                // 新增（无 keyValue）不判公用/私用
                sortedData = (obj._moduleBtnListCache[btnListUrl] || []).slice();
                sortedData = sortedData.filter(function (btn) {
                    return btn.F_Location == '3' || btn.F_EnCode === 'NF-add';
                });
                if (keyValue && sortedData.some(function (btn) { return btn.F_Authorize == 0; })) {
                    var row = typeof cols === 'string' ? JSON.parse(cols) : cols;
                    const creatorId = row?.F_CreatorUserId ?? row?.form?.F_CreatorUserId ?? null;
                    if (creatorId != null && user.id != creatorId) {
                        sortedData = sortedData.filter(function (btn) {
                            return btn.F_Authorize === '' || btn.F_Authorize != 0;
                        });
                    }
                }

                var btnArr = [

                    {
                        F_EnCode: "NF-pred",
                        F_FullName: "上一条",
                        F_JsEvent: "pred",
                        F_JsEventCode: `common.pageNav(-1)`,
                        F_SortCode: 96,
                        F_Split: true,
                        F_EnabledMark: true,
                        F_Condition: ''
                    },
                    {
                        F_EnCode: "NF-next",
                        F_FullName: "下一条",
                        F_JsEvent: "next",
                        F_JsEventCode: `common.pageNav(1)`,
                        F_SortCode: 97,
                        F_Split: false,
                        F_EnabledMark: true,
                        F_Condition: "d.F_CreatorUserId != ''"
                    },
                    {
                        F_EnCode: "NF-print",
                        F_FullName: "打印",
                        F_JsEvent: "print",
                        F_JsEventCode: `common.printMenu()`,
                        F_SortCode: 98,
                        F_Split: true,
                        F_EnabledMark: true,
                        F_Condition: ''
                    },
                    {
                        F_EnCode: "NF-close",
                        F_FullName: "关闭",
                        F_JsEvent: "close",
                        F_JsEventCode: `common.modalConfirm("注：您确定要放弃保存当前的内容吗？", function(r) { if (r) { parent.layer.close(parent.layer.getFrameIndex(window.name)); } });`,
                        F_SortCode: 99,
                        F_Split: false,
                        F_EnabledMark: true,
                        F_Condition: ''
                    },
                ];

                // 流程：按节点允许按钮过滤模块按钮；非流程保留全部
                var flowFiltered = filterModuleBtnsByFlow(sortedData, formJsonByenCode, keyValue, formFlow);
                var moduleBtns = flowFiltered !== null ? flowFiltered : sortedData;
                var mergedBtns = [...moduleBtns, ...btnArr];

                var btnMap = {};
                mergedBtns.forEach(function (btn) {
                    btnMap[btn.F_EnCode] = btn; // F_EnCode 唯一
                });

                formBtns = Object.values(btnMap).sort(function (a, b) {
                    return (a.F_SortCode || 0) - (b.F_SortCode || 0);
                });
                var btns = formBtns;
            // 清空按钮容器（toolbarMain是ID还是标签名，建议加上#）
            $("toolbarMain").empty();
            // 修改内容：动态/常驻拆开；手机折叠到「更多」，电脑平铺；resize 切换
            var keepIds = { 'NF-pred': 1, 'NF-next': 1, 'NF-print': 1, 'NF-close': 1 };
            var keepTool = '', moreTool = '', keepStarted = false;
            for (var i = 0; i < btns.length; i++) {
                var btn = btns[i];
                if (!btn.F_EnabledMark) continue;
                if (!keepIds[btn.F_EnCode]) {
                    moreTool += CreateToolBarTemplet(btn, true);
                } else {
                    keepTool += CreateToolBarTemplet(btn, !keepStarted);
                    keepStarted = true;
                }
            }
            // 常驻按钮
            var authKeep = formFlow ? keepTool : obj.authorizeButtonNew(keepTool);
            // 业务按钮
            var authMore = moreTool ? (formFlow ? moreTool : obj.authorizeButtonNew(moreTool)) : '';
            var switchHtml = `
            <div class="layui-form">
                <input type="checkbox" id="keepOpen" lay-skin="switch" title="普通|快捷" lay-filter="keepOpen">
            </div>`;

            function mountToolbar(keepHtml, moreHtml) {
                // 修改内容：更多操作用普通工具栏按钮 + showPrintMenu
                var morePart = moreHtml
                    ? ('<button type="button" class="layui-btn-sm layui-form-tool toolbar-mobile-more-btn layui-hide" title="更多操作">' +
                        '<i class="layui-icon layui-icon-app"></i></button>' +
                        '<div class="toolbar-mobile-more-source layui-hide"></div>' +
                        '<div style="line-height: 20px" class="layui-btn-group toolbar-extra-group">' + moreHtml + '</div>')
                    : '';
                $('#toolbarMain').html(
                    '<div class="toolbar-btn-groups" style="display:flex;">' + morePart +
                    '<div style="line-height: 20px" class="layui-btn-group toolbar-keep-group">' + (keepHtml || '') + '</div></div>' + switchHtml
                );
                if (getKeepOpen()) $('#keepOpen').prop('checked', true);
                form.render('checkbox');
                form.on('switch(keepOpen)', function (sw) {
                    setKeepOpen(!!sw.elem.checked);
                });
                // 修改内容：手机「更多」点击
                var $moreBtn = $('#toolbarMain .toolbar-mobile-more-btn');
                var $moreSource = $('#toolbarMain .toolbar-mobile-more-source');
                $moreBtn.off('click.toolbarMobileMore').on('click.toolbarMobileMore', function (e) {
                    e.stopPropagation();
                    if (!$moreSource.children().length) return;
                    obj.showPrintMenu({ elem: this, width: '60px', content: $moreSource });
                });
                obj.applyToolbarDeviceLayout();
                $(window).off('resize.toolbarDevice').on('resize.toolbarDevice', function () {
                    obj.applyToolbarDeviceLayout();
                });
                form.render('checkbox');
            }

            laytpl(authKeep || '').render('', function (keepHtml) {
                if (!authMore) {
                    mountToolbar(keepHtml, '');
                    return;
                }
                laytpl(authMore).render('', function (moreHtml) {
                    mountToolbar(keepHtml, moreHtml);
                });
            });

            /**
             * 生成单个按钮的HTML模板
             * @param {Object} btn 按钮配置
             * @param {boolean} [noSplit] 手机「更多」面板内不按 F_Split 拆组
             * @returns {string} 按钮HTML
             */
            function CreateToolBarTemplet(btn, noSplit) {
                // 判断是否需要工具栏分组（F_Split为true则换到新分组）
                var templet = (!noSplit && btn.F_Split ? `</div><div style="line-height: 20px" class="layui-btn-group">` : ``);
                // 带下拉箭头的复合按钮
                if (btn.F_EnCode === "NF-print") {
                    templet += `<button type="button" 
                                onclick="ToolClick('${btn.F_EnCode}')" 
                                class="layui-btn-sm layui-form-tool print-btn" 
                                id="${btn.F_EnCode}" 
                                authorize 
                                lay-event="${btn.F_JsEvent}">${btn.F_FullName}<i class="layui-icon layui-icon-down layui-font-12" style="margin-left:2px"></i></button>`;
                }
                // 普通按钮
                else {
                    templet += `<button type="button" 
                                onclick="ToolClick('${btn.F_EnCode}')" 
                                class="layui-btn-sm layui-form-tool" 
                                id="${btn.F_EnCode}" 
                                authorize 
                                lay-event="${btn.F_JsEvent}">${btn.F_FullName}</button>`;
                }

                // 判断是否配置了显示条件（F_Condition），需进行变量替换
                if (btn.F_Condition !== "" && btn.F_Condition !== null) {
                    var condition = String(btn.F_Condition)
                        .replace(/\{loginUser\}/g, "'" + (user.id || '') + "'")
                        .replace(/\{loginRole\}/g, "'" + (user.role || '') + "'")
                        .replace(/\{loginOrg\}/g, "'" + (user.org || '') + "'");
                    // 用当前表单数据替换d.xxx字段
                    if (cols !== null) {
                        for (var col in cols) {
                            condition = condition.replace("d." + col, `'${cols[col]}'`)
                        }
                    }
                    templet = `
                        {{# if(${condition}){ }}
                            ${templet}
                        {{# } }}
                    `;

                }
                return templet;
            }
        },

        /** 手机：更多进下拉；电脑：更多平铺（用 DOM 判断，不必缓存） */
        applyToolbarDeviceLayout: function () {
            var $moreBtn = $('#toolbarMain .toolbar-mobile-more-btn');
            var $source = $('#toolbarMain .toolbar-mobile-more-source');
            var $extra = $('#toolbarMain .toolbar-extra-group');
            if (!$source.length || !$extra.length) return;
            var isMobile = !!top.layui.miniAdmin.checkMobile();
            // 修改内容：用 extra 是否隐藏判断当前布局，去掉 _toolbarIsMobile
            if (isMobile === $extra.hasClass('layui-hide')) return;
            $('.print-dropdown-menu').each(function () {
                var $host = $(this).find('.print-dropdown-menu-content');
                var back = $(this).data('contentReturnTo');
                if ($host.length && back) $(back).append($host.children());
                $(this).remove();
            });
            if (isMobile) {
                $source.append($extra.children()).addClass('layui-hide');
                $extra.addClass('layui-hide');
                if ($moreBtn.length) $moreBtn.toggleClass('layui-hide', !$source.children().length);
            } else {
                $extra.append($source.children()).toggleClass('layui-hide', !$extra.children().length);
                if ($moreBtn.length) $moreBtn.addClass('layui-hide');
                $source.addClass('layui-hide');
            }
        },

        // 下拉：传 content=容器；传 data=内部列表。style/width/height 改面板
        showPrintMenu: function (options) {
            options = options || {};
            var $elem = $(options.elem);
            var data = options.data || [];
            var content = options.content;
            var useContent = content != null && content !== '';
            var $returnTo = null;
            var $host = null;

            // 关掉旧菜单并还回节点
            $('.print-dropdown-menu').each(function () {
                var back = $(this).data('contentReturnTo');
                if (back) $(back).append($(this).find('.print-dropdown-menu-content').children());
                $(this).remove();
            });

            var boxStyle = (options.style || '') + (options.width ? (';width:' + options.width + ';') : '');
            var $menu = useContent
                ? $('<div class="print-dropdown-menu"><div class="print-dropdown-menu-content"></div></div>')
                : $('<div class="print-dropdown-menu"><div class="print-dropdown-menu-ul-wrap"><ul class="print-dropdown-menu-ul"></ul></div></div>');
            if (boxStyle) $menu.attr('style', boxStyle);
            $menu.appendTo('body');

            if (useContent) {
                $host = $menu.find('.print-dropdown-menu-content');
                if (typeof content === 'string') {
                    $host.html(content);
                } else {
                    $returnTo = $(content);
                    $host.append($returnTo.children());
                    $menu.data('contentReturnTo', $returnTo);
                }
                // 修改内容：支持 height
                if (options.height) $host.css({ maxHeight: options.height, overflowY: 'auto' });
            } else {
                var html = data.map(function (item) {
                    var selected = options.selectedValue !== undefined && item.value == options.selectedValue ? ' selected' : '';
                    var disabled = item.disabled ? ' disabled' : '';
                    var icon = item.icon ? '<i class="layui-icon ' + item.icon + ' icon"></i>' : '';
                    var type = (item.type != null && item.type !== '') ? '<span class="type-label">' + obj.escapeHtml(item.type) + '</span>' : '';
                    return '<li class="print-dropdown-menu-li' + selected + disabled + '" style="' + (item.disabled ? 'color:#aaa;' : '') + '">' +
                        '<div style="display:flex;align-items:center;">' + icon + '<span class="name">' + obj.escapeHtml(item.name) + '</span></div>' + type + '</li>';
                }).join('');
                var $wrap = $menu.find('.print-dropdown-menu-ul-wrap');
                $wrap.find('.print-dropdown-menu-ul').html(html);
                // 修改内容：支持 height（原先固定 200px）
                if (options.height) $wrap.css({ height: options.height, overflowY: 'auto' });
            }

            function closeMenu() {
                if ($returnTo && $host) $returnTo.append($host.children());
                $menu.remove();
                $(document).off('mousedown.printMenu');
            }

            // 定位
            var off = $elem.offset();
            var btnH = $elem.outerHeight();
            var menuH = $menu.outerHeight();
            var menuW = $menu.outerWidth();
            var left = off.left;
            var top = off.top + btnH + 2;
            var winH = $(window).height();
            var scrollTop = $(window).scrollTop();
            if (winH - (off.top - scrollTop + btnH) < menuH && (off.top - scrollTop) > menuH) {
                top = off.top - menuH - 2;
                $menu.addClass('is-up');
            }
            if (left + menuW > $(window).width() - 16) left = Math.max(16, $(window).width() - menuW - 16);
            $menu.css({ left: left, top: top, minWidth: $elem.outerWidth() });

            if (useContent) {
                $menu.on('click', 'button', function () { setTimeout(closeMenu, 0); });
            } else {
                $menu.on('click', '.print-dropdown-menu-li:not(.disabled)', function () {
                    if (typeof options.callback === 'function') {
                        options.callback({ elem: this, data: data[$(this).index()] });
                    }
                    closeMenu();
                });
            }
            $(document).on('mousedown.printMenu', function (e) {
                if (!$menu.is(e.target) && !$menu.has(e.target).length) closeMenu();
            });
            return $menu;
        },
        //窗体工具栏按扭
        clickTools: function (obj) {
            var btn = formBtns.find(function (x) { return x.F_EnCode == obj; });
            if (btn && btn.F_JsEventCode) {
                var code = btn.F_JsEventCode;
                if (/common\.modalOpen|common\.deleteForm/.test(code)) {
                    code = code.replace(/(common\.(modalOpen|deleteForm)\(\{)([\s\S]*?)(\}\))/, function (m, p1, p2, p3, p4) {
                        if (/url\s*:/.test(p3)) return m;
                        return p1 + 'url:"' + (btn.F_UrlAddress || '') + '",' + p3 + p4;
                    });
                }
                return code;
            }
            return '';
        },
        // 创建 js 函数（F_JsEventCode → JsEventCode）
        // 固定可用：obj、common、table、layer、$、form
        // name=JsEventCode 且传入 key 时按表分片合并，避免多次 createtable 互相覆盖
        createFunction: function (name, body, key) {
            if (name === 'JsEventCode') {
                window._JsEventCodeParts = window._JsEventCodeParts || {};
                if (key) {
                    if (body) {
                        window._JsEventCodeParts[key] = body;
                    } else {
                        delete window._JsEventCodeParts[key];
                    }
                    body = Object.keys(window._JsEventCodeParts)
                        .map(function (k) { return window._JsEventCodeParts[k]; })
                        .join('\n');
                } else {
                    window._JsEventCodeParts = body ? { __default__: body } : {};
                }
            }
            var raw = new Function('obj', 'common', 'table', 'layer', '$', 'form', body || '');
            window[name] = function (obj) {
                var L = (typeof layui !== 'undefined') ? layui : {};
                var $jq = L.jquery || L.$ || window.$;
                return raw(obj, L.common, L.table, L.layer, $jq, L.form);
            };
        },
        tabProp: tabProp,
        // 记下上/下一条 F_Id（createTool 里调用）
        rememberPageNav: function () {
            var pWin = obj.parentWindow();
            if (!pWin || !pWin.layui || !pWin.layui.table) return;
            var tableId = pWin.mainTableId || 'currentTableId';
            var rows = pWin.layui.table.cache[tableId] || [];
            var keyValue = $.request('keyValue');
            var idx = rows.findIndex(function (r) {
                return r && (String(r.F_Id) === String(keyValue) || String(r.F_FrmId) === String(keyValue));
            });
            if (idx < 0) return;
            patchOpenTab({
                pageNav: {
                    prevId: rows[idx - 1] && rows[idx - 1].F_Id,
                    nextId: rows[idx + 1] && rows[idx + 1].F_Id,
                    tableId: tableId
                }
            });
        },
        // 修改内容：上/下一条不关弹层重开，改成当前 iframe 换 url 后 reload（routeState 仍带上）
        pageNav: function (step) {
            var nav = ((currentOpenTab().tab || {}).pageNav) || {};
            var targetId = step > 0 ? nav.nextId : nav.prevId;
            if (!targetId) return obj.modalMsg(step > 0 ? "当前已经是最后一条" : "当前已经是第一条", "warning");

            var pWin = obj.parentWindow();
            if (!pWin) return obj.modalMsg("未找到列表页", "warning");

            var url, routeState = null;
            if ($.request('formFlow')) {
                var tableId = nav.tableId || pWin.mainTableId || 'currentTableId';
                var data = (pWin.layui.table.cache[tableId] || [])
                    .find(function (r) { return r && String(r.F_Id) === String(targetId); });
                if (!data) return obj.modalMsg("相邻记录已不在待办列表", "warning");
                var meta = JSON.parse(data.F_SchemeContent).meta;
                if (typeof meta !== 'object') meta = JSON.parse(meta);
                url = meta.url + '?keyValue=' + data.F_FrmId + '&formFlow=true';
                routeState = data;
            } else {
                // 用相对路径，避免带上 localhost
                url = (location.pathname + location.search)
                    .replace(/(keyValue=)[^&]*/, '$1' + targetId)
                    .replace(/([?&]btnId=)NF-edit(?=&|#|$)/, '$1NF-details');
            }
            history.replaceState(routeState ? { routeState: routeState } : (history.state || {}), '', url);
            location.reload();
        },
        //表格单元格自动列宽
        tableResize: function (id) {
            //动态监听表头高度变化，冻结行跟着改变高度
            $("div [lay-id='" + id + "'] .layui-table-header tr").resize(function () {
                $("div [lay-id='" + id + "'] .layui-table-header tr").each(function (index, val) {
                    $($("div [lay-id='" + id + "'] .layui-table-fixed .layui-table-header table tr")[index]).height($(val).height());
                });
            });
            //初始化高度，使得冻结行表头高度一致
            $("div [lay-id='" + id + "'] .layui-table-header  tr").each(function (index, val) {
                $($("div [lay-id='" + id + "'] .layui-table-fixed .layui-table-header table tr")[index]).height($(val).height());
            });
            //动态监听表体高度变化，冻结行跟着改变高度
            $("div [lay-id='" + id + "'] .layui-table-main tr").resize(function () {
                $("div [lay-id='" + id + "'] .layui-table-body tr").each(function (index, val) {
                    $($("div [lay-id='" + id + "'] .layui-table-fixed .layui-table-body table tr")[index]).height($(val).height());
                });
            });
            //初始化高度，使得冻结行表体高度一致
            $("div [lay-id='" + id + "'] .layui-table-main tr").each(function (index, val) {
                $($("div [lay-id='" + id + "'] .layui-table-fixed .layui-table-body table tr")[index]).height($(val).height());
            });

            //初始化滚动条
            $("div [lay-id='" + id + "'] .layui-table-fixed .layui-table-body").animate({ scrollTop: $("div [lay-id='" + id + "'] .layui-table-main").scrollTop() }, 0);
        },

        printMenu: function (printConfig) {
            if (printConfig == undefined) {
                printConfig = window._printConfigCache
            }
            $('.print-dropdown-menu').remove();
            var $btn = $('.print-btn');
            $(document).off('click.printMenu', '.print-btn').on('click.printMenu', '.print-btn', function (e) {
                var $target = $(e.target);
                obj.printList('2', function (res) {
                    const data = res.map((i) => ({ name: i.F_FullName, value: i.F_EnCode, icon: 'layui-icon-file-b', item: i, type: '表单' }));
                    if (!data || !Array.isArray(data) || data.length === 0) {
                        layer.msg('没有可用的打印模板，请先进行模板配置！', { icon: 0 });
                        return;
                    }
                    var printTip = (printConfig && printConfig.tip) ? printConfig.tip : null;
                    if ($target.is('i.layui-icon-down')) {
                        var fakePrintMenuOptions = {
                            data,
                            callback: function (i) {
                                const config = {
                                    tableId: 2,
                                    content: i.data.item.F_PrintContent,
                                    allRows: null,
                                    selectedRows: null,
                                    printConfig
                                }
                                if (typeof config.printConfig.beforeUpdate === 'function') {
                                    const ret = config.printConfig.beforeUpdate(config);
                                    if (ret !== undefined) return;
                                }
                                layer.confirm(printTip ? printTip : '确定打印？', { icon: 3, title: '提示' }, function (index) {
                                    obj.doPrint(config);
                                    layer.close(index);
                                });
                            }
                        };
                        obj.showPrintMenu($.extend({
                            elem: $btn,
                            width: 145 + "px",
                            height: 200,
                        }, fakePrintMenuOptions));
                    } else {
                        const config = {
                            tableId: 2,
                            content: data[0].item.F_PrintContent,
                            allRows: null,
                            selectedRows: null,
                            printConfig
                        }
                        if (typeof config.printConfig.beforeUpdate === 'function') {
                            const ret = config.printConfig.beforeUpdate(config);
                            if (ret !== undefined) return;
                        }
                        layer.confirm(printTip ? printTip : '确定要使用默认模板打印吗？', { icon: 3, title: '提示' }, function (index) {
                            obj.doPrint(config);
                            layer.close(index);
                        });
                    }

                });


            });
        },
        // 获取打印列表（urlOverride 可选：传入模块地址如 '/Module/xxx/Index'，按传入的取，不再从当前页面 URL 推）
        printList: function (type, callback, urlOverride) {
            var parentloc = window.parent.location.href;
            var loc = window.location.pathname;
            if (parentloc.indexOf("/Module") > -1)//判断Index的url是否是公共页面
            {
                loc = loc.replace(loc.split("/")[1], "Module");
            }
            if (urlOverride) {
                loc = urlOverride;
            }
            var requestData = {
                F_Url: loc
            };
            if (type) {
                requestData.F_PrintType = type;
            }

            $.ajax({
                url: '/SystemManage/ModulePrint/GetListJson',
                type: "GET",
                data: requestData,
                dataType: "json",
                success: function (res) {
                    if (typeof callback === 'function') {
                        callback(res);
                    }
                },
                error: function () {
                    if (typeof callback === 'function') {
                        callback([]);
                    }
                }
            });

        },

        /**
         * 获取指定表单内所有输入数据
         */
        getFormPrintData: function (ids) {
            var data = [];
            if (!Array.isArray(ids) || ids.length === 0) return data;
            // 遍历每个id，提取表单数据
            ids.forEach(function (id) {
                obj.ajax({
                    url: '/Public/GetPrintJson',
                    data: { ModuleEnCode: ModuleEnCode, keyValue: id },
                    async: false, // 同步请求，为了后续代码可以直接获取到数据
                    success: function (res) {
                        if (res) {
                            data.push(res);
                        }
                    }
                });
            });
            return data;
        },
        /**
         * 打印功能：根据content模板，自动循环输出数据，替换模板内所有占位符
         * @param {Number} tableId 1=列表 2=表单 其他=标签
         * @param {String} content html模板字符串，带{占位符}
         * @param {Array} allRows 所有数据
         * @param {Array} selectedRows 选中数据
         */
        doPrint: function ({ tableId, content, allRows, selectedRows, printConfig }) {
            var PH_RE = /\{([A-Za-z_][\w]*)\}/g;
            var PH_SKIP = { '0': 1, ROW_NUMBER: 1 };
            var CTX_KEYS = ['RowNumber', 'PrintTime', 'F_loginUser', 'F_loginRole', 'F_loginOrg'];
            var user = (typeof currentUser !== 'undefined' && currentUser) || (top && top.currentUser) || {};
            var printCtx = {
                PrintTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                F_loginUser: user.F_RealName || user.F_Account || '',
                F_loginRole: user.F_RoleName || '',
                F_loginOrg: user.F_OrganizeName || ''
            };

            function cellText(val) {
                if (val && typeof val === 'object' && val.displayValue != null) val = val.displayValue;
                if (val == null || val === '') return '';
                var s = String(val);
                if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]00:00:00/.test(s)) {
                    var m = moment(s);
                    return m.isValid() ? m.format('YYYY-MM-DD') : s;
                }
                return s;
            }
            function scanFields(html) {
                var list = [], seen = {};
                String(html || '').replace(PH_RE, function (_, key) {
                    if (!PH_SKIP[key] && !seen[key]) { seen[key] = 1; list.push(key); }
                });
                return list;
            }
            function fillPh(html, data) {
                data = data || {};
                return String(html || '').replace(PH_RE, function (_, key) { return cellText(data[key]); });
            }
            function clearPh(html) {
                return String(html || '').replace(PH_RE, '');
            }
            function rowData(formData, item, rowNo) {
                return $.extend({}, printCtx, formData || {}, item || {}, { RowNumber: rowNo });
            }
            function listsFromBatch(batch) {
                var list = [];
                for (var key in batch || {}) {
                    if (key !== 'form' && Array.isArray(batch[key])) list.push(batch[key]);
                }
                return list;
            }
            function resolveCodeVal(mergeData, field) {
                if (!mergeData || typeof mergeData !== 'object') return '';
                if (mergeData[field] != null && mergeData[field] !== '') return mergeData[field];
                for (var key in mergeData) {
                    var arr = mergeData[key];
                    if (!Array.isArray(arr)) continue;
                    var found = arr.find(function (item) { return item && item[field] != null && item[field] !== ''; });
                    if (found) return found[field];
                }
                return '';
            }

            /** 模板行 = 第一个含 {字段} 的行；其上表头，其下固定尾 */
            function initTpl($table) {
                var $trs = $table.find('tbody tr');
                if (!$trs.length) $trs = $table.find('tr');
                if (!$trs.length) return null;
                var idx = -1;
                $trs.each(function (i) {
                    if (scanFields(this.outerHTML || '').length) { idx = i; return false; }
                });
                if (idx < 0) return null;
                var $tpl = $trs.eq(idx);
                var $fix = $trs.slice(idx + 1);
                var tplHtml = $tpl.prop('outerHTML');
                var fields = scanFields(tplHtml);
                if (!fields.length) return null;
                var fixHtml = '';
                $fix.each(function () { fixHtml += this.outerHTML || ''; });
                return {
                    $tbody: $table.find('tbody').length ? $table.find('tbody') : $table,
                    $before: $trs.slice(0, idx),
                    $tpl: $tpl,
                    $fix: $fix,
                    fixCount: $fix.length,
                    fixHtml: fixHtml,
                    tplHtml: tplHtml,
                    fields: fields
                };
            }

            /** 按模板字段匹配明细数组；有 F_No 则排序 */
            function matchList(fields, printData) {
                if (!Array.isArray(printData)) return null;
                var keys = (fields || []).filter(function (k) { return CTX_KEYS.indexOf(k) < 0; });
                for (var i = 0; i < printData.length; i++) {
                    var arr = printData[i];
                    if (!Array.isArray(arr) || !arr.length) continue;
                    var first = arr[0];
                    if (keys.length && !keys.some(function (k) { return first.hasOwnProperty(k); })) continue;
                    return ('F_No' in first)
                        ? arr.slice().sort(function (a, b) { return (a.F_No || 0) - (b.F_No || 0); })
                        : arr;
                }
                return null;
            }

            function appendTotalRow($table, fields) {
                var $totalTable = $('.layui-table-total table');
                if (!$totalTable.length) return;
                var totalMap = {};
                $totalTable.find('td').each(function () {
                    var field = $(this).attr('data-field');
                    if (!field) return;
                    var $div = $(this).find('div');
                    totalMap[field] = $div.length ? $div.html() : $(this).html();
                });
                if (!Object.keys(totalMap).length) return;
                var cols = (fields || []).slice();
                var $tbody = $table.find('tbody');
                var $last = $tbody.find('tr').last();
                if (!$last.length) return;
                $last.find('td').each(function () {
                    var field = $(this).attr('data-field');
                    if (field) cols.push(field);
                });
                var $tr = $($.parseHTML($last.prop('outerHTML')));
                $tr.find('td').each(function (i) {
                    if (i === 0) { $(this).html('<div>合计</div>'); return; }
                    var field = cols[i];
                    $(this).html(field && totalMap[field] !== undefined && totalMap[field] != '合计'
                        ? '<div>' + totalMap[field] + '</div>' : '');
                });
                $tbody.append($tr);
            }

            /** 明细表纵向循环，受 max-list-rows 控制 */
            function renderListTable($table, printData, formData) {
                var tpl = initTpl($table);
                if (!tpl) return;
                var list = matchList(tpl.fields, printData);
                var maxTotal = parseInt($table.attr('max-list-rows'), 10) || 0;
                tpl.$tpl.remove();
                tpl.$fix.remove();
                var usable = maxTotal ? (maxTotal - tpl.fixCount) : 0;
                var count = list && list.length ? usable : (usable - 1);
                if (!count) count = list && list.length ? list.length : 0;
                var html = '';
                for (var i = 0; i < count; i++) {
                    html += fillPh(tpl.tplHtml, rowData(formData, list ? list[i] : {}, i + 1));
                }
                tpl.$tbody.append(html + (list ? '' : tpl.tplHtml) + tpl.fixHtml);
                appendTotalRow($table, tpl.fields);
            }

            /** 码单：先下后右填列；max-col-rows / code-sheet-subtotal */
            function renderCodeSheet($table, printData, formData) {
                var tpl = initTpl($table);
                if (!tpl) return;
                var list = matchList(tpl.fields, printData) || [];
                var withSub = $table.attr('code-sheet-subtotal') === 'true';
                var cellAt = function (tr, i) { return $(tr).children('td,th').get(i); };
                var dataRows = [tpl.$tpl[0]];
                tpl.$fix.each(function () { dataRows.push(this); });

                var $cells0 = $(dataRows[0]).children('td,th');
                var startCol = -1, field = '';
                $cells0.each(function (i) {
                    var keys = scanFields(this.innerHTML);
                    if (startCol < 0 && keys.length) { startCol = i; field = keys[0]; }
                });
                if (startCol < 0) return;

                var subTr = null;
                if (withSub) {
                    subTr = dataRows[0].cloneNode(true);
                    $(subTr).children('td,th').each(function (i) {
                        this.innerHTML = (startCol > 0 && i === 0) ? '小计:' : '';
                    });
                    $(dataRows[0].parentNode).append(subTr);
                }

                var drawnCols = $cells0.length - startCol;
                var rowsPerCol = parseInt($table.attr('max-col-rows'), 10);
                if (!rowsPerCol || rowsPerCol < 1) rowsPerCol = Math.max(1, dataRows.length);
                var needCols = list.length ? Math.max(1, Math.ceil(list.length / rowsPerCol)) : Math.max(1, drawnCols);
                var singleCol = needCols <= 1 && drawnCols <= 1 && list.length > 0;
                var fillRows = singleCol ? list.length : rowsPerCol;

                function appendRow() {
                    var tr = dataRows[0].cloneNode(true);
                    $(tr).children('td,th').each(function () { this.innerHTML = clearPh(this.innerHTML); });
                    if (subTr) $(tr).insertBefore(subTr);
                    else $(dataRows[0].parentNode).append(tr);
                    dataRows.push(tr);
                }
                if (singleCol) {
                    while (dataRows.length < list.length) appendRow();
                    while (dataRows.length > list.length) $(dataRows.pop()).remove();
                } else if (needCols > 1) {
                    while (dataRows.length < rowsPerCol) appendRow();
                }

                var sampleCell = $cells0.get(startCol);
                var colgroup = $table.find('colgroup')[0];
                var sampleCol = colgroup && colgroup.children[startCol];
                var sampleW = parseFloat(sampleCell.style.width)
                    || parseFloat(sampleCell.getAttribute('width'))
                    || (sampleCol && (parseFloat(sampleCol.style.width) || parseFloat(sampleCol.getAttribute('width'))))
                    || sampleCell.getBoundingClientRect().width
                    || 40;
                function applyW(el) {
                    if (!el) return;
                    el.style.width = sampleW + 'px';
                    el.removeAttribute('width');
                }
                function appendCol(tr, src) {
                    var cell = (src || sampleCell).cloneNode(true);
                    cell.innerHTML = '';
                    applyW(cell);
                    tr.appendChild(cell);
                }
                while (drawnCols < needCols) {
                    var colIndex = startCol + drawnCols;
                    dataRows.forEach(function (tr) { appendCol(tr); });
                    if (subTr) appendCol(subTr);
                    tpl.$before.each(function () {
                        var cells = $(this).children('td,th');
                        if (cells.length === colIndex) appendCol(this, cells.get(cells.length - 1));
                    });
                    if (colgroup) {
                        var col = document.createElement('col');
                        applyW(col);
                        colgroup.appendChild(col);
                    }
                    var tw = parseFloat($table[0].style.width) || $table[0].getBoundingClientRect().width || 0;
                    if (tw > 0) $table.css('width', (tw + sampleW) + 'px');
                    drawnCols++;
                }

                var colItems = [], n = 0;
                for (var c = 0; c < needCols; c++) {
                    colItems[c] = [];
                    for (var r = 0; r < fillRows; r++) {
                        var cell = cellAt(dataRows[r], startCol + c);
                        if (!cell) continue;
                        var item = list[n];
                        if (item) {
                            cell.innerHTML = fillPh(cell.innerHTML || ('{' + field + '}'), rowData(formData, item, ++n));
                            colItems[c].push(item);
                        } else {
                            cell.innerHTML = clearPh(cell.innerHTML);
                        }
                    }
                }
                for (var rr = fillRows; rr < dataRows.length; rr++) {
                    $(dataRows[rr]).children('td,th').each(function (i) {
                        if (i >= startCol) this.innerHTML = clearPh(this.innerHTML);
                    });
                }
                if (!subTr) return;
                for (var cc = 0; cc < needCols; cc++) {
                    var sumCell = cellAt(subTr, startCol + cc);
                    if (!sumCell || /小计/.test($(sumCell).text() || '')) continue;
                    var sum = 0, cnt = 0, bad = false;
                    (colItems[cc] || []).forEach(function (item) {
                        var v = item[field];
                        if (v && typeof v === 'object') v = v.displayValue != null ? v.displayValue : (v.value != null ? v.value : '');
                        if (v == null || String(v).trim() === '') return;
                        var s = String(v).trim();
                        if (!/^-?\d+(\.\d+)?$/.test(s)) { bad = true; return; }
                        sum += parseFloat(s);
                        cnt++;
                    });
                    sumCell.innerHTML = (!bad && cnt) ? String(Math.round(sum * 1000) / 1000) : '';
                }
            }

            function applyMerge($dom) {
                $dom.find('table').each(function () {
                    var $trs = $(this).find('tbody tr');
                    if ($trs.length <= 1) return;
                    var $heads = $trs.eq(0).find('td');
                    var cols = [];
                    $heads.each(function (i) {
                        if (($(this).html() || '').indexOf('[[MERGE:') >= 0) cols.push(i);
                    });
                    $heads.each(function () {
                        $(this).html(($(this).html() || '').replace(/\[\[MERGE:(.*?)\]\]/g, '$1'));
                    });
                    cols.forEach(function (colIdx) {
                        var $cells = $trs.find('td:nth-child(' + (colIdx + 1) + ')');
                        if ($cells.length <= 1) return;
                        var prev = null, $start = null, span = 1;
                        $cells.each(function (i) {
                            var val = $(this).text().trim();
                            if (val === prev && prev !== null) {
                                $(this).hide();
                                span++;
                            } else {
                                if ($start && span > 1) $start.attr('rowspan', span);
                                prev = val;
                                $start = $(this);
                                span = 1;
                            }
                            if (i === $cells.length - 1 && $start && span > 1) $start.attr('rowspan', span);
                        });
                    });
                });
            }

            function renderTables($dom, printData, formData) {
                $dom.find('table').each(function () {
                    var $table = $(this);
                    if ($table.attr('is-code-sheet') === 'true') renderCodeSheet($table, printData, formData);
                    else if ($table.attr('is-list-table') === 'true') renderListTable($table, printData, formData);
                });
                applyMerge($dom);
            }

            function buildHtml($dom, mergeData) {
                var html = $dom.html();
                if (Array.isArray(mergeData)) {
                    var $wrap = $('<div>').html(html);
                    $wrap.find('img[data-type="barcode"], img[data-type="qrcode"]').each(function (idx) {
                        var $img = $(this), codeField = $img.attr('data-code'), val = '';
                        if (codeField && mergeData[0] && mergeData[0][idx] && mergeData[0][idx][codeField] != null && mergeData[0][idx][codeField] !== '') {
                            $img.attr('data-code', mergeData[0][idx][codeField]);
                        } else {
                            $img.remove();
                        }
                    });
                    return fillPh($wrap.html(), printCtx);
                }
                html = fillPh(html, $.extend({}, printCtx, mergeData));
                return html.replace(/<img\s+[^>]*data-type="(barcode|qrcode)"[^>]*>/gi, function (match) {
                    var m = match.match(/data-code="([^"]+)"/);
                    if (!m) return match;
                    var realVal = resolveCodeVal(mergeData, m[1]);
                    if (realVal === '' || realVal == null) return '';
                    return match.replace('data-code="' + m[1] + '"', 'data-code="' + realVal + '"');
                });
            }

            function renderPage(printData, formData) {
                var data = printData;
                if (data && !Array.isArray(data[0])) data = [data];
                var form = $.extend({}, printCtx, formData || {});
                var $dom = $('<div>').html(content);
                renderTables($dom, data, form);
                return buildHtml($dom, tableId == 2 ? $.extend({}, data, formData || {}) : data);
            }

            function runUpdated(payload) {
                if (typeof printConfig?.updated === 'function') {
                    var ret = printConfig.updated(payload);
                    if (ret !== undefined) return false;
                }
                return true;
            }

            // ---- 数据与入口 ----
            var tableIds = [];
            $('table').each(function () {
                var id = $(this).attr('id');
                if (id && tableIds.indexOf(id) < 0) tableIds.push(id);
            });

            var formData = null;
            function resolveData() {
                if (tableId == 1) {
                    if (selectedRows && selectedRows.length) return selectedRows;
                    if (allRows && allRows.length) return allRows;
                    var cache = table.cache[tableIds[0]];
                    return Array.isArray(cache) && cache.length ? cache : [];
                }
                if (tableId == 2) {
                    var fd = obj.val && obj.val('adminform');
                    var pd = obj.getFormPrintData([fd.F_Id]);
                    var batch = (pd && pd[0]) || {};
                    formData = batch.form || {};
                    return listsFromBatch(batch);
                }
                return [];
            }

            // 列表页批量打表单
            if (window.location.pathname.toLowerCase().indexOf('/index') !== -1 && tableId == 2) {
                if (!selectedRows || !selectedRows.length) {
                    layer.msg('请先勾选要打印的表单列表！', { icon: 0 });
                    return;
                }
                var ids = selectedRows.map(function (x) { return x.F_Id; });
                var cancelled = false;
                var layerIdx = layer.open({
                    type: 1,
                    title: false,
                    content: '<div id="batch-print-progress" style="padding:32px 48px;min-width:280px;font-size:16px;text-align:center;">'
                        + '<div>正在批量打印，当前处理：<span id="batch-print-step">1</span> / <span id="batch-print-total">' + ids.length + '</span></div></div>',
                    cancel: function () {
                        cancelled = true;
                        layer.msg('已取消批量打印', { icon: 0 });
                    }
                });
                layer.style(layerIdx, { borderRadius: '10px' });

                var bag = [], curr = 0;
                (function next() {
                    if (cancelled) return;
                    if (curr === ids.length) {
                        layer.close(layerIdx);
                        var html = '';
                        bag.forEach(function (item, i) {
                            html += renderPage(item.list, item.form);
                            if (i < bag.length - 1) html += '<div style="page-break-after: always;"></div>';
                        });
                        if (!runUpdated(bag)) return;
                        obj.print(html);
                        return;
                    }
                    $('#batch-print-step').text(curr + 1);
                    var batch = (obj.getFormPrintData([ids[curr]]) || [])[0] || {};
                    bag.push({ form: batch.form, list: listsFromBatch(batch) });
                    curr++;
                    setTimeout(next, 0);
                })();
                return;
            }

            var printData = resolveData();
            if (printData && !Array.isArray(printData[0])) printData = [printData];
            var mergeData = tableId == 2 ? $.extend({}, printData, formData) : printData;
            var finalHtml = renderPage(printData, formData);
            if (!runUpdated(mergeData)) return;
            obj.print(finalHtml);
        },

        // 打印函数，接收finalHtml进行打印
        print: function (finalHtml) {
            // ==============================================
            // 关键：用隐藏iframe打印，完全不影响当前页面
            // ==============================================
            let iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            let doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.writeln([
                '<html>',
                '<head>',
                '<meta charset="utf-8">',
                '<title>打印</title>',
                '<style>table{table-layout:fixed;}table td,table th,table td p,table th p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}</style>',
                '</head>',
                `<body>${finalHtml}</body>`,
                '</html>'
            ].join('\n'));
            doc.close();

            // 渲染条码 + 打印
            iframe.onload = function () {
                let win = iframe.contentWindow;
                let docWin = win.document;
                docWin.JsBarcode = window.JsBarcode;
                docWin.QRCode = window.QRCode;

                // 处理一维码img
                let barcodeImgs = docWin.querySelectorAll('img[data-type="barcode"][data-code]');
                let qrcodeImgs = docWin.querySelectorAll('img[data-type="qrcode"][data-code]');

                let barcodePromises = Array.from(barcodeImgs).map(img => {
                    return new Promise((resolve) => {
                        let code = img.getAttribute('data-code');
                        if (code) {
                            // 新建canvas生成码并转为图片
                            let canvas = docWin.createElement('canvas');
                            docWin.JsBarcode(canvas, code, {
                                format: 'CODE128',
                                width: 1,
                                height: 32,
                                displayValue: true
                            });
                            img.onload = () => resolve(); // 确保图片加载完
                            img.onerror = () => resolve(); // 错误也resolve避免阻塞
                            img.src = canvas.toDataURL('image/png');
                        } else {
                            resolve();
                        }
                    });
                });

                let qrcodePromises = Array.from(qrcodeImgs).map(img => {
                    return new Promise((resolve) => {
                        let code = img.getAttribute('data-code');
                        if (code) {
                            // 新建div作为二维码临时容器
                            let tempDiv = docWin.createElement('div');
                            new docWin.QRCode(tempDiv, {
                                text: code,
                                width: 60,
                                height: 60,
                                margin: 1
                            });
                            let checkAndSet = () => {
                                let realCanvas = tempDiv.querySelector('canvas');
                                if (realCanvas) {
                                    img.onload = () => resolve();
                                    img.onerror = () => resolve();
                                    img.src = realCanvas.toDataURL('image/png');
                                } else {
                                    // QRCode渲染有延迟可能还没出来，继续轮询
                                    setTimeout(checkAndSet, 10);
                                }
                            };
                            checkAndSet();
                        } else {
                            resolve();
                        }
                    });
                });

                // 等所有条码和二维码图片都render成图片再打印
                Promise.all([...barcodePromises, ...qrcodePromises]).then(() => {
                    win.print();
                    setTimeout(() => document.body.removeChild(iframe), 600);
                });
            };
        }
    }
    exports("common", obj);
});