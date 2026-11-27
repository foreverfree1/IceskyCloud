/**
 * tableSelect 表格选择器模块
 *
 * 点击触发元素弹出表格/树表面板，支持搜索、单选/多选；确定后回调 done。
 * 回车/失焦精确匹配由 Host 调 common.tableSelectUtil.matchInput。
 *
 * ========== 仅支持以下配置 ==========
 * @param {string|Element|jQuery} opt.elem
 * @param {string}  [opt.searchKey='keyword']
 * @param {string}  [opt.searchPlaceholder]
 * @param {string}  [opt.checkedKey]          选中唯一键（默认 elem.id / td[data-field]；树表建议显式传）
 * @param {boolean} [opt.sameApi]             true → tableSelectUtil.resolveSelectCols 拼列
 * @param {Array}   [opt.selected]            默认选中 id，写入 ts-selected
 * @param {boolean|Object} [opt.istree]       树表；对象时可带 customName 等
 * @param {Object}  opt.table                 url / cols / params / page / height / …
 * @param {boolean} [opt.canInput]            是否允许手输（匹配由上层绑定）
 *
 * ========== 仅支持以下回调 ==========
 * @param {Function} [opt.beforeRender]       打开面板前；返回 false 取消。params 等请在此由 Host 准备好
 * @param {Function} [opt.setCustomConfig]    渲染前改表格配置；返回 false 取消
 * @param {Function} [opt.done]               确定；checkStatus 含 data / checkedKey / isTree
 * @param {Function} [opt.onClose]            面板关闭
 *
 * 实例：getValue / setValue / update
 */

// ========== 以下为源码实现 ==========
layui.define(['table', 'jquery', 'form', 'soulTable', 'common', 'treeTable', 'commonDefaults', 'controls'], function (exports) {
    "use strict";

    var MOD_NAME = 'tableSelect',
        $ = layui.jquery,
        table = layui.table,
        form = layui.form,
        soulTable = layui.soulTable,
        common = layui.common,
        commonDefaults = layui.commonDefaults,
        controls = layui.controls,
        treeTable = layui.treeTable;

    /** @constructor tableSelect */
    var tableSelect = function () {
        this.v = '1.1.0';
    };

    /** 接口返回 → 行数组 */
    function normalizeListData(response, parseData) {
        if (typeof parseData === 'function') {
            var parsed = parseData(response) || {};
            return Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);
        }
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
    }

    /** 表格扁平数据：树表 getData，否则 cache */
    function getFlatTableData(tableId) {
        if (typeof treeTable.getData === 'function') {
            try {
                var flat = treeTable.getData(tableId, true);
                if (Array.isArray(flat) && flat.length) return flat;
            } catch (e) { /* ignore */ }
        }
        return table.cache[tableId] || [];
    }

    /** 对象数组按字段去重 */
    function uniqueObjArray(arr, type) {
        if (!arr || !arr.length) return arr || [];
        var newArr = [], seen = {};
        for (var i = 0; i < arr.length; i++) {
            var item = arr[i];
            var k = type ? item[type] : item;
            if (seen[k]) continue;
            seen[k] = true;
            newArr.push(item);
        }
        return newArr;
    }

    /**
     * 绑定选择器：注册点击开面板；选择结果走 done。
     * 回车/失焦匹配由 Host 调 common.tableSelectUtil.matchInput。
     * @param {Object} opt 见文件头配置说明
     */
    tableSelect.prototype.render = function (opt) {
        var elem = $(opt.elem); // 兼容：字符串选择器 / DOM / jQuery
        var tableDone = opt.table.done || function () { };

        // ---------- 默认值 ----------
        opt.searchKey = opt.searchKey || 'keyword';
        opt.searchPlaceholder = opt.searchPlaceholder || '关键词搜索';
        opt.table.page = opt.table.page || false;
        opt.table.height = opt.table.height || 315;
        opt.sameApi = opt.sameApi || false;

        /** @type {string} 当前面板唯一键字段（树表打开后可能改为 tree.customName.id） */
        var checkedKey;
        /** @type {boolean} 本次面板是否按树表渲染（有数据且 istree 有效时） */
        var isTree;

        // ==================== 点击打开面板 ====================
        elem.off('click.tableSelect').on('click.tableSelect', function (e) {
            checkedKey = opt.istree
                ? (opt.checkedKey || (opt.istree !== true && opt.istree.customName && opt.istree.customName.id))
                : (opt.checkedKey || $(this).attr('id') || $(this).closest('td').attr('data-field'));
            e.stopPropagation();

            // 同时只允许一个面板
            if ($('div.tableSelect').length >= 1) {
                return false;
            }

            if (typeof opt.beforeRender === 'function') {
                var brRet = opt.beforeRender(opt);
                if (brRet === false) {
                    return;
                }
            }

            // ---------- 面板初始位置：下方放不下则放到上方 ----------
            var elemOffset = elem.offset();
            var panelHeight = 345; // 约 table.height(315) + 工具栏
            var elemBottom = elemOffset.top + elem.outerHeight();
            var enoughSpaceBelow = (elemBottom - $(window).scrollTop() + panelHeight) <= $(window).height();
            var t = Math.max(enoughSpaceBelow ? elemBottom : (elemOffset.top - panelHeight), 5) + 'px';
            var l = Math.max(elemOffset.left, 5) + 'px';

            var tableName = "tableSelect_table_" + new Date().getTime();
            var tableHeight = opt.table.height || 315;
            var tableBox = $([
                '<div class="tableSelect layui-form layui-anim layui-anim-upbit" lay-filter="' + tableName + '" style="left:' + l + ';top:' + t + ';border:1px solid #d2d2d2;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.12);padding:10px 10px 0;position:absolute;z-index:66666666;margin:5px 0;border-radius:2px;width:500px;height:' + (tableHeight + 50) + 'px;">',
                '<div class="tableSelect-content">',
                '<div class="tableSelectBar" style="margin-bottom:5px;overflow:hidden;">',
                '<form class="layui-form" action="" style="display:inline-block;margin:0;">',
                '<input style="display:inline-block;width:190px;height:30px;vertical-align:middle;margin-right:-1px;border:1px solid #C9C9C9;" type="text" name="' + opt.searchKey + '" placeholder="' + opt.searchPlaceholder + '" autocomplete="off" class="layui-input">',
                '<button type="button" class="layui-btn layui-btn-sm layui-btn-primary tableSelect_btn_search" style="height:28px;vertical-align:middle;"><i class="layui-icon layui-icon-search"></i></button>',
                '</form>',
                '<button style="float:right;" class="layui-btn layui-btn-sm tableSelect_btn_select">确定<span></span></button>',
                '<button style="float:right;margin-right:6px;" class="layui-btn layui-btn-danger layui-btn-sm tableSelect_btn_close">关闭<span></span></button>',
                '<button style="float:right;" class="layui-btn layui-btn-primary layui-btn-sm tableSelect_btn_clear">清空<span></span></button>',
                '</div>',
                '<div class="tableSelect-table-wrap" style="position:relative;height:' + tableHeight + 'px;">',
                '<div class="tableSelect-loading" style="position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:2px;">',
                '<i class="layui-icon layui-icon-loading layui-anim layui-anim-rotate layui-anim-loop" style="font-size:30px;color:#1E9FFF;"></i>',
                '</div>',
                '<table id="' + tableName + '" lay-filter="' + tableName + '"></table>',
                '</div></div></div>'
            ].join(''));
            $('body').append(tableBox);

            function clampPanelInViewport() {
                var m = 10, $w = $(window);
                var minT = $w.scrollTop() + m, minL = $w.scrollLeft() + m;
                var maxT = minT + $w.height() - tableBox.outerHeight() - m * 2;
                var maxL = minL + $w.width() - tableBox.outerWidth() - m * 2;
                var top = parseFloat(tableBox.css('top')) || 0;
                var left = parseFloat(tableBox.css('left')) || 0;
                tableBox.css({
                    top: Math.min(Math.max(top, minT), Math.max(minT, maxT)) + 'px',
                    left: Math.min(Math.max(left, minL), Math.max(minL, maxL)) + 'px'
                });
            }
            clampPanelInViewport();

            // ---------- 面板拖拽（松手后再钳位） ----------
            (function () {
                var $bar = tableBox.find('.tableSelectBar');
                $bar.css({ cursor: 'move', userSelect: 'none' });
                $bar.off('mousedown.tableSelectDrag').on('mousedown.tableSelectDrag', function (e) {
                    if ($(e.target).closest('input, button, a, textarea, select, .layui-btn').length) return;
                    e.preventDefault();
                    var startX = e.clientX;
                    var startY = e.clientY;
                    var startLeft = parseFloat(tableBox.css('left'));
                    var startTop = parseFloat(tableBox.css('top'));
                    if (isNaN(startLeft)) startLeft = tableBox.offset().left;
                    if (isNaN(startTop)) startTop = tableBox.offset().top;
                    tableBox.css({ bottom: 'auto', right: 'auto', margin: 0 });
                    function onMove(ev) {
                        tableBox.css({
                            left: (startLeft + ev.clientX - startX) + 'px',
                            top: (startTop + ev.clientY - startY) + 'px'
                        });
                    }
                    function onUp() {
                        $(document).off('mousemove.tableSelectDrag mouseup.tableSelectDrag');
                        clampPanelInViewport();
                    }
                    $(document).on('mousemove.tableSelectDrag', onMove).on('mouseup.tableSelectDrag', onUp);
                });
            })();

            /** 跨页/跨次勾选累积（多选）；打开时由 setChecked 按 ts-selected 灌入 */
            var checkedData = [];

            // ---------- 表格视图 / 勾选状态 ----------

            /** 定位当前面板对应的 .layui-table-view（兼容 lay-id / lay-table-id） */
            function getTableView() {
                var $view = $('div[lay-table-id="' + tableName + '"]');
                if (!$view.length) {
                    $view = $('#' + tableName).next('.layui-table-view');
                }
                return $view;
            }

            /** 当前勾选状态：树表走 treeTable，普通表走 table */
            function getActiveCheckStatus() {
                return (isTree ? treeTable.checkStatus(tableName) : table.checkStatus(tableName)) || { data: [] };
            }

            /** 当前表数据缓存（树表为扁平全量） */
            function getActiveCache() {
                return isTree ? getFlatTableData(tableName) : (table.cache[tableName] || []);
            }

            /**
             * 同步某一行勾选 UI 与 LAY_CHECKED。
             * 树表用 LAY_DATA_INDEX / setRowChecked；失败则回退改 DOM。
             * @param {number|string|Object} index 行下标或带 LAY_DATA_INDEX 的对象
             * @param {boolean} checked
             */
            function syncRowCheck(index, checked) {
                if (isTree) {
                    var layIndex = index;
                    if (index != null && typeof index === 'object') {
                        layIndex = index.LAY_DATA_INDEX != null ? index.LAY_DATA_INDEX : index;
                    }
                    if (layIndex == null || layIndex === '') return;
                    try {
                        treeTable.setRowChecked(tableName, {
                            index: String(layIndex),
                            checked: !!checked
                        });
                    } catch (e) {
                        getTableView().find('tr[lay-data-index="' + layIndex + '"]')
                            .find('input[name="layTableCheckbox"], input[type="checkbox"]').prop('checked', !!checked);
                    }
                    return;
                }
                var flat = getActiveCache();
                var $row = getTableView().find('tr[data-index="' + index + '"]');
                $row.find('input[type="checkbox"], input[type="radio"]').prop('checked', !!checked);
                if (flat && flat[index]) flat[index].LAY_CHECKED = !!checked;
                if (table.cache[tableName] && table.cache[tableName][index]) {
                    table.cache[tableName][index].LAY_CHECKED = !!checked;
                }
            }

            /**
             * 按唯一键把接口数据并入 checkedData（type==='clear' 时不回填，只刷新按钮数）。
             * 已选 id 只认 ts-selected（api.getValue），不用展示名。
             */
            function setChecked(res, type) {
                if (type != 'clear') {
                    var currentCellValue = api.getValue();
                    if (currentCellValue) {
                        var valueArr = currentCellValue.split(',').map(function (v) { return v.trim(); }).filter(Boolean);
                        for (var i = 0; i < res.length; i++) {
                            var rowValue = res[i][checkedKey];
                            var alreadyChecked = checkedData.some(function (item) {
                                return String(item[checkedKey]) === String(rowValue);
                            });
                            var matched = valueArr.some(function (v) {
                                return rowValue != null && rowValue !== '' && String(rowValue) === v;
                            });
                            if (matched && !alreadyChecked) {
                                checkedData.push(res[i]);
                            }
                        }
                    }
                }
                updateButton(checkedData.length);
            }

            /** 表格 done 后：按已有 checkedData（来自 ts-selected / 用户勾选）勾 UI */
            function defaultChecked(res, curr, count) {
                if (checkedData.length === 0) return;
                // 树表：按 LAY_DATA_INDEX / getNodeById 勾选
                if (isTree) {
                    for (var tk = 0; tk < checkedData.length; tk++) {
                        var row = checkedData[tk];
                        var layIndex = row && row.LAY_DATA_INDEX;
                        if (layIndex == null) {
                            for (var ri = 0; ri < res.data.length; ri++) {
                                if (String(res.data[ri][checkedKey]) === String(row[checkedKey])) {
                                    layIndex = res.data[ri].LAY_DATA_INDEX;
                                    break;
                                }
                            }
                        }
                        if (layIndex == null && row && row[checkedKey] != null) {
                            try {
                                var node = treeTable.getNodeById && treeTable.getNodeById(tableName, row[checkedKey]);
                                if (node) {
                                    layIndex = node.dataIndex != null ? node.dataIndex
                                        : (node.data && node.data.LAY_DATA_INDEX);
                                }
                            } catch (e) { /* ignore */ }
                        }
                        if (layIndex != null && layIndex !== '') {
                            syncRowCheck(layIndex, true);
                        }
                    }
                    checkedData = uniqueObjArray((getActiveCheckStatus().data || []).concat(checkedData), checkedKey);
                    updateButton(checkedData.length);
                    return;
                }
                // 普通表：按下标勾选并重渲染 form
                var checkIndexes = [];
                for (var i = 0; i < res.data.length; i++) {
                    for (var j = 0; j < checkedData.length; j++) {
                        if (res.data[i][checkedKey] == checkedData[j][checkedKey]) {
                            checkIndexes.push(i);
                            break;
                        }
                    }
                }
                if (checkIndexes.length > 0) {
                    for (var k = 0; k < checkIndexes.length; k++) {
                        syncRowCheck(checkIndexes[k], true);
                    }
                    form.render('radio', tableName);
                    form.render('checkbox', tableName);
                }
                updateButton(checkedData.length)
            }

            /** 更新「确定」按钮上的已选数量 */
            function updateButton(n) {
                tableBox.find('.tableSelect_btn_select span').html(n === 0 ? '' : '(' + n + ')')
            }
            function setPanelLoading(show) {
                tableBox.find('.tableSelect-table-wrap .tableSelect-loading')[show ? 'show' : 'hide']();
            }

            /** 请求并渲染（init / search / clear） */
            function loadAndRender(options) {
                options = options || {};
                var searchVal = options.searchVal || '';
                var putCheckedOnTop = !!options.putCheckedOnTop;
                var mode = options.mode || 'init';

                if (!opt.table.url) {
                    console.error('tableSelect 缺少 table.url');
                    return;
                }

                var cols = (opt.sameApi && common.tableSelectUtil && common.tableSelectUtil.resolveSelectCols)
                    ? common.tableSelectUtil.resolveSelectCols(opt)
                    : $.extend(true, [], opt.table.cols || [[]]);
                var where = (opt.table.params && typeof opt.table.params === 'object')
                    ? $.extend({}, opt.table.params)
                    : {};
                where[opt.searchKey] = searchVal || '';
                setPanelLoading(true);

                common.ajax({
                    url: opt.table.url,
                    data: { param: JSON.stringify(where) },
                    success: function (response) {
                        var tableData = normalizeListData(response, opt.table.parseData);
                        var treeCfg = null;
                        if (opt.istree) {
                            var override = opt.istree === true ? {} : opt.istree;
                            if (typeof override === 'object') {
                                treeCfg = $.extend(true, {}, commonDefaults.take('treePanel'), override);
                                if (controls.treeTableControl && controls.treeTableControl.normalizeConfig) {
                                    treeCfg = controls.treeTableControl.normalizeConfig(treeCfg);
                                }
                            }
                        }
                        isTree = !!treeCfg && Array.isArray(tableData) && tableData.length > 0;
                        if (!isTree) treeCfg = null;
                        if (isTree) {
                            // 标题字段：显式 customName.name 不改；否则按数据/触发字段回退
                            if (treeCfg.customName) {
                                var nameLocked = opt.istree !== true && opt.istree.customName && opt.istree.customName.name;
                                if (!nameLocked) {
                                    var sample = null;
                                    for (var si = 0; si < tableData.length; si++) {
                                        if (tableData[si] && typeof tableData[si] === 'object') { sample = tableData[si]; break; }
                                    }
                                    var preferName = treeCfg.customName.name;
                                    if (!sample || !preferName || !Object.prototype.hasOwnProperty.call(sample, preferName)) {
                                        var $e = $(opt.elem);
                                        var $td = $e.closest('td[data-field]');
                                        var nameField = $td.length ? ($td.attr('data-field') || '') : ($e.attr('id') || '');
                                        if (nameField) treeCfg.customName.name = nameField;
                                    }
                                }
                            }
                            checkedKey = opt.checkedKey || (treeCfg.customName && treeCfg.customName.id);
                            var pidName = treeCfg.customName.pid;
                            if (treeCfg.data.rootPid === 0) treeCfg.data.rootPid = '0';
                            var rootPid = treeCfg.data.rootPid;
                            tableData = tableData.map(function (row) {
                                var copy = $.extend({}, row);
                                var pid = copy[pidName];
                                if (pid == null || pid === '' || pid === 0 || pid === '0') copy[pidName] = rootPid;
                                return copy;
                            });
                        }

                        setChecked(tableData, mode === 'clear' ? 'clear' : mode);

                        if (!isTree && putCheckedOnTop && checkedData.length && checkedKey) {
                            var checkedMap = new Map();
                            checkedData.forEach(function (item) { checkedMap.set(item[checkedKey], item); });
                            tableData = checkedData.concat(tableData.filter(function (item) {
                                return !checkedMap.has(item[checkedKey]);
                            }));
                        }

                        var tableConfig = {
                            elem: "#" + tableName,
                            id: tableName,
                            cols: cols,
                            data: tableData || [],
                            page: treeCfg ? false : opt.table.page,
                            height: opt.table.height,
                            limit: treeCfg ? 99999 : (opt.table.limit || 10),
                            filter: {
                                show: { column: false, data: true, condition: true, editCondition: false, excel: false, clearCache: false },
                                bottom: false
                            },
                            done: function (res, curr, count) {
                                var doneRes = res;
                                if (isTree) {
                                    var flat = getFlatTableData(tableName);
                                    doneRes = $.extend({}, res || {}, { data: flat, count: flat.length });
                                }
                                defaultChecked(doneRes, curr, count);
                                tableDone(doneRes, curr, count);
                                if (!isTree) soulTable.render(this);
                                setPanelLoading(false);
                            }
                        };
                        if (treeCfg) tableConfig.tree = treeCfg;
                        if (typeof opt.setCustomConfig === 'function') {
                            var nextConfig = opt.setCustomConfig(tableConfig);
                            if (nextConfig === false) {
                                setPanelLoading(false);
                                return;
                            }
                            if (nextConfig && typeof nextConfig === 'object') tableConfig = nextConfig;
                        }
                        if (isTree) controls.treeTableControl.render(tableConfig);
                        else table.render(tableConfig);
                        // 首次：按树/表绑；有 checkbox/radio 列才绑对应勾选事件
                        if (mode === 'init') {
                            var api = isTree ? treeTable : table;
                            var col0 = cols[0] || cols || [];
                            var hasCheckbox = col0.some(function (c) { return c && c.type === 'checkbox'; });
                            var hasRadio = col0.some(function (c) { return c && c.type === 'radio'; });
                            if (hasCheckbox) api.on('checkbox(' + tableName + ')', onCheckboxSelect);
                            else if (hasRadio) api.on('radio(' + tableName + ')', onRadioSelect);
                            api.on('rowDouble(' + tableName + ')', onRowDoubleSelect);
                        }
                    },
                    error: function () {
                        setPanelLoading(false);
                        layer.msg('数据加载失败', { icon: 2 });
                    }
                });
            }

            function searchLoad(keyword) {
                updateButton(0);
                loadAndRender({ searchVal: keyword || '', putCheckedOnTop: true, mode: 'search' });
            }

            function clearLoad() {
                checkedData = [];
                updateButton(0);
                tableBox.find('input[name="' + opt.searchKey + '"]').val('');
                loadAndRender({ searchVal: '', putCheckedOnTop: false, mode: 'clear' });
            }

            // ---------- 行选（init 渲染后按 isTree 绑一次） ----------
            function onRadioSelect() {
                var status = getActiveCheckStatus();
                if (checkedKey) checkedData = status.data || [];
                updateButton((status.data || []).length);
            }
            function onCheckboxSelect(obj) {
                if (!checkedKey) {
                    updateButton(getActiveCheckStatus().data.length);
                    return;
                }
                if (isTree) {
                    if (obj.type === 'all') {
                        checkedData = obj.checked
                            ? uniqueObjArray((getActiveCheckStatus().data || []).concat(getActiveCache()), checkedKey)
                            : [];
                    } else if (obj.checked) {
                        checkedData.push(obj.data);
                        checkedData = uniqueObjArray(checkedData, checkedKey);
                    } else if (obj.data) {
                        var unId = obj.data[checkedKey];
                        checkedData = checkedData.filter(function (item) {
                            return String(item[checkedKey]) !== String(unId);
                        });
                    }
                    updateButton(checkedData.length);
                    return;
                }
                if (obj.type == 'all') {
                    checkedData = obj.checked ? checkedData.concat(getActiveCache()) : [];
                } else if (obj.checked) {
                    checkedData.push(obj.data);
                } else {
                    checkedData = checkedData.filter(function (item) {
                        return item[checkedKey] !== obj.data[checkedKey];
                    });
                }
                checkedData = uniqueObjArray(checkedData, checkedKey);
                updateButton(checkedData.length);
            }
            function onRowDoubleSelect(obj) {
                selectDone({ data: [obj.data], checkedKey: checkedKey, isTree: isTree });
            }

            tableBox.find('.tableSelect_btn_search').on('click', function (e) {
                e.preventDefault();
                searchLoad(tableBox.find('input[name="' + opt.searchKey + '"]').val());
                return false;
            });
            tableBox.find('input[name="' + opt.searchKey + '"]').on('keydown', function (e) {
                if (e.keyCode === 13) {
                    e.preventDefault();
                    searchLoad($(this).val());
                    return false;
                }
            });

            loadAndRender({ searchVal: '', putCheckedOnTop: false, mode: 'init' });

            // ---------- 确定 / 清空 / 关闭 ----------
            tableBox.find('.tableSelect_btn_select').on('click', function () {
                var checkStatus = getActiveCheckStatus() || { data: [] };
                // 勾选过程已写入 checkedData，确定时直接用（树/表统一）
                if (checkedData.length) checkStatus.data = checkedData;
                checkStatus.checkedKey = checkedKey;
                checkStatus.isTree = isTree;
                selectDone(checkStatus);
            });

            tableBox.find('.tableSelect_btn_clear').on('click', clearLoad);

            /** 关闭面板：解绑拖拽、清 cache、清树表实例 */
            function cleanupTableSelect() {
                $(document).off('mousemove.tableSelectDrag mouseup.tableSelectDrag');
                tableBox.remove();
                delete table.cache[tableName];
                if (isTree) controls.treeTableControl.clear(tableName);
                checkedData = [];
                elem.off('keydown.tableSelectPanel');
            }

            /** 触发 opt.onClose */
            function handleOnClose() {
                if (typeof opt.onClose === 'function') opt.onClose(elem);
            }

            tableBox.find('.tableSelect_btn_close').on('click', function () {
                cleanupTableSelect();
                handleOnClose();
            });

            /**
             * 面板选择完成：写 ts-selected → done → 关闭。
             * @param {{ data: Array, checkedKey?: string, isTree?: boolean }} checkStatus
             */
            function selectDone(checkStatus) {
                if (checkedKey) {
                    var selected = [];
                    for (var i = 0; i < checkStatus.data.length; i++) {
                        var id = checkStatus.data[i][checkedKey];
                        if (id != null && id !== '') selected.push(id);
                    }
                    api.update({ selected: selected, display: elem.val() });
                }
                checkStatus.checkedKey = checkedKey;
                checkStatus.isTree = isTree;
                if (typeof opt.done === 'function') opt.done(elem, checkStatus);
                cleanupTableSelect();
                handleOnClose();
            }

            // 点击面板外关闭（忽略触发元素、面板本身、soulTable 下拉）
            $(document).off('mouseup.tableSelect').on('mouseup.tableSelect', function (e) {
                var $target = $(e.target);
                var isClickSelf = elem.is($target) || elem.has($target).length > 0;
                var isClickTableSelect = tableBox.is($target) || tableBox.has($target).length > 0;
                var isClickSoulMenu = $target.closest('[id^="soul-"], [class*="soul-"], .layui-table-tool-panel, .layui-form-select').length > 0;
                if (!isClickSelf && !isClickTableSelect && !isClickSoulMenu) {
                    cleanupTableSelect();
                    handleOnClose();
                }
            });

        }); // end click → 打开面板

        var api = {
            getValue: function () {
                return (elem.attr('ts-selected') || '').trim();
            },
            setValue: function (v, d) {
                var patch = { selected: v };
                if (d != null) patch.display = d;
                return api.update(patch);
            },
            update: function (patch) {
                if (!patch) return api;
                $.extend(true, opt, patch);
                if (patch.selected != null || patch.display != null || patch.value != null) {
                    var raw = patch.selected != null ? patch.selected : (patch.value != null ? patch.value : api.getValue());
                    var keys = Array.isArray(raw) ? raw.filter(Boolean).join(',') : (raw == null ? '' : String(raw));
                    // 修改内容：无 keys 时清输入框，避免只清 ts-selected 残留展示
                    var text = patch.display != null ? String(patch.display) : (keys ? (elem.val() || keys) : '');
                    // var text = patch.display != null ? String(patch.display) : (elem.val() || keys);
                    // 原生改展示：树表名称不要经 $.fn.val 写进 formData
                    elem.each(function () { this.value = text; });
                    opt.selected = keys ? keys.split(',').filter(Boolean) : [];
                    if (keys) elem.attr('ts-selected', keys);
                    else elem.removeAttr('ts-selected');
                }
                if (patch.disabled != null) elem.prop('disabled', !!patch.disabled);
                if (patch.readonly != null) elem.prop('readonly', !!patch.readonly);
                if (patch.placeholder != null) elem.attr('placeholder', patch.placeholder);
                return api;
            }
        };
        if (opt.selected && opt.selected.length) api.update({ selected: opt.selected, display: elem.val() });
        return api;
    };

    /**
     * 隐藏并移除页面上所有选择面板（不触发 onClose / 不清树实例缓存以外的逻辑）。
     * @param {Object} [opt] 未使用
     */
    tableSelect.prototype.hide = function (opt) {
        $('.tableSelect').remove();
    };

    // 单例导出
    var tableSelect = new tableSelect();
    exports(MOD_NAME, tableSelect);
});
