/**
 * eipTableEdit — 表格单元格就地编辑
 * 列 config.type：input | textarea | select | date | tableSelect
 *
 * eipTableEdit.aopObj(cols, tableId)
 * aop.on(event, callback)
 * eipTableEdit.setCell / mount / syncCell / syncColumn / syncTable
 * eipTableEdit.valid / validTable
 */
layui.define(['laydate', 'table', 'layer', 'tableSelect', 'common', 'controls', 'form', 'xmSelect'], function (exports) {
    'use strict';

    var moduleName = 'eipTableEdit';
    var $ = layui.$;
    var table = layui.table;
    var layer = layui.layer;
    var tableSelect = layui.tableSelect;
    var common = layui.common;
    var controls = layui.controls;

    /* ============================================================
     * 1. 规则与常量
     * ============================================================ */
    var HOST_RE = /^(input|textarea|date|select|tableSelect)$/;
    var REQUIRED_MSG = '必填项不能为空';
    var RULES = {
        required: [/[\S]+/, REQUIRED_MSG],
        phone: [/^1[34578]\d{9}$/, '请输入正确的手机号'],
        email: [/^([a-zA-Z0-9_\.\-])+@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/, '邮箱格式不正确'],
        url: [/(^#)|(^http(s*):\/\/[^\s]+\.[^\s]+)/, '链接格式不正确'],
        number: [/(^[-+]?\d+$)|(^[-+]?\d+\.\d+$)/, '只能填写数字'],
        onlyInteger: [/^[-+]?\d+$/, '不能有小数'],
        date: [/^(\d{4})[-\/](\d{1}|0\d{1}|1[0-2])([-\/](\d{1}|0\d{1}|[1-2][0-9]|3[0-1]))*$/, '日期格式不正确'],
        datetime: [/^(\d{4})[-\/](\d{1}|0\d{1}|1[0-2])[-\/](\d{1}|0\d{1}|[1-2][0-9]|3[0-1])\s+\d{1,2}:\d{2}(:\d{2})?$/, '日期时间格式不正确'],
        time: [/^\d{1,2}:\d{2}(:\d{2})?$/, '时间格式不正确'],
        year: [/^\d{4}$/, '年份格式不正确'],
        month: [/^(\d{4})[-\/](\d{1}|0\d{1}|1[0-2])$/, '年月格式不正确'],
        identity: [/(^\d{15}$)|(^\d{17}(x|X|\d)$)/, '请输入正确的身份证号'],
        select: [null, '未找到匹配项'],
        tableSelect: [null, '未找到匹配项']
    };

    var tableInstances = {};
    var lastVerifyCell = null;

    /* ============================================================
     * 2. 一个格子的生命周期
     *    openCell → renderHost → (用户编辑) → commitCell → closeCell
     * ============================================================ */

    // 2.1 点开一个格子：先准备数据，最后再打开
    function openCell(td, obj, aop) {
        layer.closeAll('tips');
        editor.close();
        editor.leaveStat = false;

        var $td = $(td).closest('td[data-field]');
        if (!$td.length) $td = $(td);
        var field = $td.data('field') || obj.field;
        var config = aop.config.colsConfig[field];
        obj.field = field;
        var cfg = config && resolveConfig(config, $td[0]);
        var api = $td.data('fieldControl');
        var $ctrl = api && api.input && api.input();
        var ctrlLocked = !!($ctrl && $ctrl.length && $ctrl.prop('disabled'));
        if (!cfg || !HOST_RE.test(cfg.type) || cfg.disabled || cfg.readonly || ctrlLocked) {
            if (obj.event !== 'cellEdit' && typeof aop.config.callback === 'function') aop.config.callback.call(td, obj);
            return;
        }

        // 先跑 on.click（联动下拉在这里写 config.data）
        if (config.on && typeof config.on.click === 'function' && config.on.click.call(td, obj) === false) return;
        // 再按最新配置解析，确保选项已就绪
        cfg = resolveConfig(config, $td[0]);

        var $view = $td.closest('.layui-table-view');
        lastVerifyCell = {
            aop: aop,
            config: cfg,
            td: $td[0],
            rowIndex: $td.closest('tr').attr('data-index'),
            tableId: $view.attr('lay-table-id') || ''
        };

        $td.data('field', field);
        var type = cfg.type;
        api = renderHost($td, type, obj.data[field], cfg);
        var $host = $td.data('cellHost');
        if (!$host || !$host.length) return;

        var $cell = $td.children('.layui-table-cell');
        var shown = $cell.children('.cell-text').length ? $cell.children('.cell-text').text() : $cell.text();
        // select 格子上是名称，setValue 要的是 value，不能用格子文字去赋
        if (type !== 'select' && api && String(api.getValue() || '') !== String(shown || '')) api.setValue(shown);
        editor.leaveStat = false;
        $host.css('pointer-events', 'auto').show();
        // 数据都好了，最后再打开
        if (type === 'select') {
            editor.xmSelectIns = api && api.instance;
            if (editor.xmSelectIns && editor.xmSelectIns.opened) editor.xmSelectIns.opened();
        } else {
            $host.focus();
            if (type === 'date' || type === 'tableSelect') $host.trigger('click');
        }
    }

    // 2.2 渲染控件：缓存命中 setValue，否则建 host + 调 controls.fieldControl.render（mount 只渲染不显示）
    function renderHost($td, type, value, cfg) {
        var text = value && typeof value === 'object'
            ? String(value.displayValue || value.value || '')
            : (value == null ? '' : String(value));
        var api = $td.data('fieldControl');
        if (api) {
            if (type === 'select' && cfg) api.update({ data: cfg.data || [] });
            api.setValue(text);
            return api;
        }

        var $cell = $td.children('.layui-table-cell');
        if (!$cell.children('.cell-text').length) $cell.wrapInner('<span class="cell-text"></span>');
        // 编辑框挂在 td 上，不进 .layui-table-cell，业务对格子 .text() 清不掉 input
        var $host = type === 'select'
            ? $('<div class="field-control-select cell-keep"></div>').hide().appendTo($td)
            : $('<input class="layui-input eip-table-edit cell-keep" autocomplete="off">').val(text).hide().appendTo($td);
        var col = $.extend({}, cfg);
        // change 只从 commitCell 抛出，避免 notify 内 callHook 再打一次
        col.on = $.extend({}, col.on || {}, { change: null });
        if (type === 'select') {
            col.data = col.data || [];
            col.tips = false;
            col.name = '';
        }
        if (type === 'tableSelect') col.selected = ($td.attr('data-content') || '').split(',').filter(Boolean);

        api = controls.fieldControl.render({
            elem: $host,
            type: type,
            value: text,
            template: col._template,
            config: col,
            onChange: function (v, display, extra) {
                extra = extra || {};
                if (type === 'tableSelect') {
                    var field = $td.data('field');
                    // 无 checkStatus：按 input 当前值匹配后提交
                    if (!extra.checkStatus) {
                        var $in = (api && api.input && api.input()) || $host;
                        var attempted = String($in.val() || display || v || '').trim();
                        if (col.table) col.table.params = common.tableSelectUtil.resolveParams(col);
                        var matched = common.tableSelectUtil.matchInput(col, $in, { clearOnMiss: true });
                        extra.checkStatus = (matched && matched.checkStatus) || { data: [] };
                        extra.checkStatus.attempted = attempted;
                        extra.checkStatus.trigger = 'paste';
                        v = $in.attr('ts-selected') || '';
                        display = $in.val() || '';
                        extra.arr = extra.checkStatus.data || [];
                    }
                    var result = common.tableSelectUtil.resolveFill(extra.checkStatus, field, {
                        cross: col._cross || [],
                        fallbackDisplay: display || '',
                        prevFilledKeys: $td.data('tsFilledKeys') || []
                    });
                    var $view = $td.closest('.layui-table-view');
                    var rowUpdate = {};
                    Object.keys(result.patch || {}).forEach(function (key) {
                        if ($view.find('td[data-field="' + key + '"]').length) rowUpdate[key] = result.patch[key];
                    });
                    if (result.empty) {
                        $td.removeAttr('data-content').removeData('tsFilledKeys');
                        col.selected = [];
                        if (extra.checkStatus.attempted) {
                            Validator.verify(extra.checkStatus.attempted, { type: 'tableSelect', required: false, matched: false }, $td[0]);
                        }
                    } else {
                        $td.attr('data-content', v);
                        $td.data('tsFilledKeys', Object.keys(result.patch || {}));
                    }
                    commitCell($td, {
                        rowUpdate: rowUpdate,
                        displayValue: rowUpdate[field],
                        selectedData: result.data || extra.arr || [],
                        isEnter: extra.checkStatus.trigger === 'enter'
                    });
                    // 面板选中 / 回车 / 粘贴后关掉编辑框
                    editor.close();
                    return;
                }
                commitCell($td, v);
                if (extra.from === 'wheel') return;
                if (type === 'date' || (type === 'select' && col.radio !== false)) editor.close();
            }
        });
        $td.data({ fieldControl: api, cellHost: $host, cellType: type });
        if (type === 'tableSelect') bindTableSelect($host, col, api);
        if (api && api.instance) {
            var key = type === 'select' ? 'xmSelect' : type === 'tableSelect' ? 'tableSelect' : '';
            if (key) {
                $td.data(key, api.instance);
                $host.data(key, api.instance);
            }
        }
        $host.on('click', function (e) {
            if ($host.css('display') === 'none') return;
            layui.stope(e);
        }).hover(function () { editor.leaveStat = false; }, function () { editor.leaveStat = true; });
        return api;
    }

    // 2.3 提交：写回缓存/单元格，并触发 on.change
    function commitCell($td, value) {
        var field = $td.data('field') || $td.attr('data-field');
        var $view = $td.closest('.layui-table-view'), tableId = $view.attr('lay-table-id');
        var aop = $view.data('eipAop') || tableInstances[tableId];
        var colCfg = ((aop && aop.config.colsConfig) || {})[field];
        if (colCfg && value != null && value !== '' && typeof value !== 'object') {
            var api = $td.data('fieldControl');
            // 数字列用 number/onlyInteger；日期列按 dateType（date/time/datetime/year/month）校验
            var ruleType = colCfg.inputType === 'number'
                ? (colCfg.verify && colCfg.verify.type === 'onlyInteger' ? 'onlyInteger' : 'number')
                : (RULES[colCfg.type] ? colCfg.type : null);
            if (ruleType === 'date') {
                var dt = colCfg.dateType === 'datetime2' ? 'datetime' : (colCfg.dateType || 'date');
                ruleType = RULES[dt] ? dt : 'date';
            }
            var verify = ruleType
                ? { type: ruleType, data: colCfg.data || [], required: false }
                : (colCfg.verify ? $.extend({}, colCfg.verify, { required: false }) : null);
            if (verify && !Validator.verify(value, verify, $td[0])) {
                value = '';
                if (api && api.setValue) api.setValue('');
            } else if (ruleType === 'select' && colCfg.data) {
                var hit = colCfg.data.find(function (o) {
                    return String(o.value) === String(value) || String(o.name) === String(value);
                });
                if (hit) value = hit.value;
            }
        }
        var index = $td.closest('tr').attr('data-index');
        var row = (table.cache[tableId] || [])[index] || {};
        var patch = (value && typeof value === 'object' && value.rowUpdate) ? value.rowUpdate : {};
        if (!(value && typeof value === 'object' && value.rowUpdate)) patch[field] = value;
        // 值没变不写回、不触发 onEditTool
        var changed = Object.keys(patch).some(function (k) {
            return String(row[k] == null ? '' : row[k]) !== String(patch[k] == null ? '' : patch[k]);
        });
        if (!changed) return; 
        setCell($td, patch);
        if (!aop) return;
        var $tr = $view.find('tr[data-index="' + index + '"]');
        var obj = {
            config: table.getOptions(tableId) || {},
            data: row,
            dataCache: row,
            event: 'cellEdit',
            field: field,
            index: index == null ? 0 : +index,
            tr: $tr,
            value: value,
            update: function (fields) {
                fields = fields || {};
                Object.keys(fields).forEach(function (k) { row[k] = fields[k]; });
                setCell($td, fields);
            },
            del: function () {
                table.cache[tableId][index] = [];
                $tr.remove();
                table.resize(tableId);
            },
            getCol: function () { return colCfg; },
            setRowChecked: function () { }
        };
        if (colCfg && colCfg.on && colCfg.on.change && colCfg.type !== 'imageUpload') colCfg.on.change.call($td[0], obj);
        if (aop.config.callback) aop.config.callback.call($td[0], obj);
    }

    // 2.4 关闭：关 UI + 校验上一格
    var editor = {
        leaveStat: false,
        xmSelectIns: null,
        close: function () {
            var verifyCell = lastVerifyCell;
            lastVerifyCell = null;

            $('.tableSelect').remove();
            if (this.xmSelectIns && typeof this.xmSelectIns.closed === 'function') this.xmSelectIns.closed();
            this.xmSelectIns = null;
            $('.cell-keep').css('pointer-events', 'none').hide();
            this.leaveStat = false;

            if (!verifyCell || !verifyCell.config || !verifyCell.config.verify) return;
            var $td = $(verifyCell.td);
            var api = $td.data('fieldControl');
            var val = (api && api.getValue && api.getValue())
                || $td.find('input.eip-table-edit').val()
                || $td.find('.cell-text').text()
                || '';
            layer.closeAll('tips');
            if ($td.length && document.body.contains($td[0])) {
                Validator.verify(val, verifyCell.config.verify, $td[0]);
                return;
            }
            var empty = isEmptyValue(val) || !String(toVerifyText(val) || '').trim();
            var required = verifyCell.config.verify.required === true
                || verifyCell.config.verify.type === 'required'
                || !verifyCell.config.verify.type;
            if (required && empty) layer.msg(verifyCell.config.verify.msg || REQUIRED_MSG, { icon: 2, time: 1500 });
        }
    };

    // 点外部前：tableSelect 先匹配再关格
    function flushThenClose() {
        var $host = $('.layui-table-view .cell-keep:visible').first();
        var flush = $host.data('tsFlush');
        if (typeof flush === 'function') {
            $('.tableSelect').remove();
            flush();
        }
        editor.close();
    }

    $(document).off('mousedown.eipTableEdit').on('mousedown.eipTableEdit', function (e) {
        if ($(e.target).closest('.tableSelect, .layui-laydate, xm-select, .xm-select, .xm-body, .cell-keep, .eip-table-edit').length) return;
        flushThenClose();
    });
    $(window).off('blur.eipTableEdit').on('blur.eipTableEdit', function () {
        flushThenClose();
    });

    /* ============================================================
     * 3. 零件库（生命周期用到的工具，按需查）
     * ============================================================ */

    // 3.1 配置合并（列 + 行/格 rowConfig）
    function resolveConfig(config, td) {
        var index = String($(td).closest('tr').attr('data-index'));
        var patch = (config && config.rowConfig && config.rowConfig[index]) || {};
        var edit = $.extend({}, config, patch);
        // 列禁用 || 行/格禁用（rowConfig.disabled=false 不能盖掉列上的 true）
        edit.disabled = !!(config && config.disabled) || !!patch.disabled;
        edit.readonly = !!(config && config.readonly) || !!patch.readonly;
        edit.required = !!(config && config.required) || !!patch.required;
        if (edit.required) edit.verify = $.extend({}, edit.verify || { type: 'required' }, { required: true });
        else if (config.required === false || patch.required === false) edit.verify = null;
        if (patch.dateType && patch.format == null) edit.format = common.formatsDateType(patch.dateType);
        if (edit.type === 'select') edit.data = patch.data || config.data || [];
        return edit;
    }

    // 3.2 DOM
    function setCell($td, patch) {
        var $view = $td.closest('.layui-table-view');
        var tableId = $view.attr('lay-table-id');
        var index = $td.closest('tr').attr('data-index');
        var row = (table.cache[tableId] || [])[index];
        var colsConfig = (($view.data('eipAop') || {}).config || {}).colsConfig || {};
        Object.keys(patch || {}).forEach(function (field) {
            var val = patch[field];
            var text = val && typeof val === 'object'
                ? String(val.displayValue || val.value || '')
                : (val == null ? '' : String(val));
            var cfg = colsConfig[field];
            if (cfg && cfg.type === 'select' && val != null && val !== '' && cfg.data && cfg.data.length) {
                var name = String(val).split(',').filter(Boolean).map(function (p) {
                    var x = cfg.data.find(function (o) {
                        return String(o.value) === String(p) || String(o.name) === String(p);
                    });
                    return x ? x.name : p;
                }).join(',');
                if (name) text = name;
            }
            if (row) row[field] = val;
            var $el = $view.find('tr[data-index="' + index + '"] td[data-field="' + field + '"]');
            if (!$el.length) return;
            if (cfg && cfg.type === 'imageUpload') {
                var $img = $el.find('.table-upload-container');
                if ($img.length && layui.imageUpload) layui.imageUpload.setValue($img.attr('id'), val);
                return;
            }
            var $cell = $el.children('.layui-table-cell');
            if ($cell.length && !$cell.children('.cell-text').length) $cell.wrapInner('<span class="cell-text"></span>');
            $el.find('.cell-text').text(text);
        });
    }

    function bindTableSelect($host, col, api) {
        if (col.canInput === false) return;
        function match(trigger) {
            var attempted = String($host.val() || '').trim();
            if (col.table) col.table.params = common.tableSelectUtil.resolveParams(col);
            var result = common.tableSelectUtil.matchInput(col, $host, { clearOnMiss: trigger === 'enter' || trigger === 'blur' });
            if (!result) return;
            var checkStatus = result.checkStatus || { data: [] };
            if (checkStatus.skipped) return;
            checkStatus.trigger = trigger;
            checkStatus.attempted = attempted;
            if (!common.tableSelectUtil.hooks('before', trigger, col, result.$input, checkStatus)) return;
            if (api && api.notify) {
                api.notify(result.$input.attr('ts-selected') || '', result.$input.val() || '', {
                    checkStatus: checkStatus,
                    arr: checkStatus.data || []
                });
            }
            common.tableSelectUtil.hooks('after', trigger, col, result.$input, checkStatus);
        }
        common.tableSelectUtil.bindMatch($host, match, 'tsCellMatch');
        $host.data('tsFlush', function () { match('blur'); });
    }

    // 3.3 校验
    var Validator = {
        tips: function (msg, td) {
            var el = td && td.jquery ? td[0] : td;
            if (!el || !document.body.contains(el)) {
                layer.msg(msg, { icon: 2, time: 1500 });
                return false;
            }
            var off = $(el).offset();
            if (!off || (($(el).outerWidth() || 0) < 1 && ($(el).outerHeight() || 0) < 1)) {
                layer.msg(msg, { icon: 2, time: 1500 });
                return false;
            }
            layer.tips(
                '<span>' + msg + '</span><a class="close-tip" style="color:#fff;cursor:pointer;position:absolute;top:-4px;right:3px;font-size:8px">✕</a>',
                el,
                {
                    tipsMore: true,
                    time: 1500,
                    success: function (layero, index) {
                        $(layero).find('.close-tip').on('click', function () { layer.close(index); });
                    }
                }
            );
            return false;
        },
        verify: function (data, verify, td) {
            if (!verify) return true;
            if (typeof verify === 'string') verify = { type: verify };

            var type = verify.type;
            var required = verify.required === true || type === 'required' || !type;
            var text = toVerifyText(data);
            var empty = isEmptyValue(data) || text.trim() === '';

            if (required && empty) {
                return Validator.tips(verify.msg || (RULES.required && RULES.required[1]) || REQUIRED_MSG, td);
            }
            if (empty) return true;
            if (type === 'required') return true;

            var ruleType = type === 'onlyInteger' ? 'onlyInteger' : type;
            var rule = ruleType ? RULES[ruleType] : null;
            var verifyMsg = verify.msg || (rule && rule[1]) || '格式不正确';

            if (type === 'onlyInteger') {
                var numberRule = RULES.number;
                if (numberRule && numberRule[0] && !numberRule[0].test(text)) {
                    return Validator.tips(verify.msg || numberRule[1] || '只能填写数字', td);
                }
            }
            if (type === 'select') {
                var list = verify.data || [];
                if (list.length && !list.some(function (o) {
                    return String(o.value) === text || String(o.name) === text;
                })) return Validator.tips(verifyMsg, td);
                return true;
            }
            if (type === 'tableSelect') {
                if (verify.matched === false) return Validator.tips(verifyMsg, td);
                return true;
            }

            if (verify.regx) {
                var ok = false;
                if (typeof verify.regx === 'function') ok = !!verify.regx(data);
                else if (typeof verify.regx === 'string') ok = new RegExp(verify.regx).test(text);
                else if (verify.regx.test) ok = verify.regx.test(text);
                if (!ok) return Validator.tips(verifyMsg, td);
                return true;
            }

            if (rule && rule[0] && !rule[0].test(text)) return Validator.tips(verifyMsg, td);
            return true;
        },
        submitValidate: function (aop, options) {
            var failedTds = [];
            if (!options || !options.data || !options.elem) return failedTds;

            var $view = $('div[lay-table-id="' + String(options.elem).replace(/^#/, '') + '"]').first();

            var rows = options.data;
            var indexes = options.rowIndex == null
                ? rows.map(function (_, i) { return i; })
                : [options.rowIndex];
            indexes.forEach(function (rowIndex) {
                var item = rows[rowIndex];
                if (!item) return;
                for (var field in aop.config.colsConfig) {
                    var config = aop.config.colsConfig[field];
                    if (!config) continue;

                    var $td = $view.find('tr[data-index="' + rowIndex + '"] td[data-field="' + field + '"]').first();
                    if (!$td.length) {
                        var $mainBody = $view.children('.layui-table-box').children('.layui-table-body');
                        if (!$mainBody.length) $mainBody = $view.find('.layui-table-box > .layui-table-body').first();
                        $td = $mainBody.find('tr').eq(rowIndex).find('td[data-field="' + field + '"]');
                    }
                    if (!$td.length) continue;
                    var cfg = resolveConfig(config, $td[0]);
                    if (!cfg.verify) continue;
                    if (!Validator.verify(item[field], cfg.verify, $td[0])) failedTds.push($td[0]);
                }
            });
            return failedTds;
        }
    };

    // 3.4 值工具
    function isEmptyValue(data) {
        if (data == null) return true;
        if (typeof data === 'string') return data.trim() === '';
        if (typeof data === 'number') return isNaN(data);
        if (typeof data === 'boolean') return false;
        if (Array.isArray(data)) {
            return data.length === 0 || data.every(function (item) { return isEmptyValue(item); });
        }
        if (typeof data === 'object') {
            if ('displayValue' in data) return isEmptyValue(data.displayValue);
            if ('name' in data || 'value' in data) return isEmptyValue(data.name) && isEmptyValue(data.value);
            if ('selectedData' in data) return isEmptyValue(data.selectedData);
            var keys = Object.keys(data);
            if (!keys.length) return true;
            return keys.every(function (k) { return isEmptyValue(data[k]); });
        }
        return false;
    }

    function toVerifyText(data) {
        if (data == null) return '';
        if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') return String(data);
        if (Array.isArray(data)) {
            return data.map(function (item) { return toVerifyText(item); }).filter(Boolean).join(',');
        }
        if (typeof data === 'object') {
            if (data.displayValue != null) return String(data.displayValue);
            if (data.name != null && data.name !== '') return String(data.name);
            if (data.value != null && data.value !== '') return String(data.value);
            if (Array.isArray(data.selectedData)) return toVerifyText(data.selectedData);
        }
        return '';
    }

    /* ============================================================
     * 4. AOP：把生命周期挂到 layui tool 事件
     * ============================================================ */
    function AopEvent(cols) {
        this.config = { colsConfig: {} };
        (cols || []).forEach(function (ite) {
            (ite || []).forEach(function (item) {
                if (item && item.config) this.config.colsConfig[item.field] = item.config;
            }, this);
        }, this);
    }

    AopEvent.prototype.on = function (event, callback, opts) {
        var self = this;
        self.config.callback = callback;
        opts = opts || {};
        var bindOn = (opts.useTreeTable && layui.treeTable && typeof layui.treeTable.on === 'function')
            ? layui.treeTable.on.bind(layui.treeTable)
            : table.on.bind(table);
        bindOn(event, function (obj) {
            openCell(this, obj, self);
        });
    };

    AopEvent.prototype.verify = function (data, verify, td) {
        return Validator.verify(data, verify, td);
    };

    AopEvent.prototype.submitValidate = function (options) {
        return Validator.submitValidate(this, options);
    };

    /* ============================================================
     * 5. 对外 API
     * ============================================================ */
    function validOne(id) {
        var aop = tableInstances[id];
        var allData = table.cache[id];
        if (!aop || !allData || !allData.length) return [];
        // 修改内容：整行交给 submitValidate，按格子 resolveConfig，支持行/格动态必填
        return aop.submitValidate({ elem: '#' + id, data: allData }) || [];
    }

    var active = {
        aopObj: function (cols, id) {
            var aop = new AopEvent(cols);
            tableInstances[id] = aop;
            var $view = $('div[lay-table-id="' + id + '"]').first();
            if ($view.length) $view.data('eipAop', aop);
            else setTimeout(function () { $('div[lay-table-id="' + id + '"]').first().data('eipAop', aop); }, 0);
            return aop;
        },
        setCell: setCell,
        // 图片等非就地编辑：找到格子后走 commitCell
        emitCell: function (tableId, p) {
            if (!p || p.field == null) return;
            var $td = $('#table_upload_' + p.field + '_' + (p.data && p.data.F_Id != null ? p.data.F_Id : '')).closest('td');
            if ($td.length) commitCell($td, p.value == null ? '' : p.value);
        },
        mount: function (tableId, cols) {
            var cache = table.cache[tableId] || [];
            var $view = $('div[lay-table-id="' + tableId + '"]').first();
            if (tableInstances[tableId]) $view.data('eipAop', tableInstances[tableId]);
            var $body = $view.find('.layui-table-box > .layui-table-body');
            if (!$body.length) $body = $view.find('.layui-table-body').first();
            (cols || []).forEach(function (row) {
                (Array.isArray(row) ? row : [row]).forEach(function (col) {
                    var type = col.config && col.config.type;
                    if (!HOST_RE.test(type || '')) return;
                    var bag = col.controlMap && col.controlMap[col.field];
                    if (bag) Object.keys(bag).forEach(function (k) { if (/^\d+$/.test(k)) bag[k] = null; });
                    $body.find('td[data-field="' + col.field + '"]').each(function () {
                        var $td = $(this);
                        if ($td.closest('.layui-table-fixed').length) return;
                        var index = $td.closest('tr').attr('data-index');
                        $td.data('field', col.field);
                        var api = renderHost($td, type, cache[index] && cache[index][col.field], resolveConfig(col.config, this));
                        if (bag && index != null && api) bag[index] = api;
                    });
                });
            });
        },
        syncCell: function (tableId, field, index, config) {
            var rows = config && config.rowConfig;
            var patch = (rows && (rows[index] || rows[String(index)])) || {};
            var locked = !!(config && (config.disabled || config.readonly)) || !!(patch.disabled || patch.readonly);
            var $td = $('div[lay-table-id="' + tableId + '"]').first().find('tr[data-index="' + index + '"] td[data-field="' + field + '"]');
            $td.find('.table-upload-container .layui-icon-upload-drag, .table-upload-container .layui-icon-close').toggle(!locked);
            var type = config && config.type;
            var cursor = 'default';
            if (!locked && type === 'select') cursor = config.search ? 'text' : 'pointer';
            else if (!locked && (type === 'input' || type === 'textarea')) cursor = 'text';
            else if (!locked && (type === 'date' || type === 'tableSelect' || type === 'imageUpload')) cursor = 'pointer';
            $td.find('.layui-table-cell').css('cursor', cursor);
            var api = $td.data('fieldControl');
            if (api && api.update) api.update({ disabled: locked, readonly: locked });
        },
        syncColumn: function (tableId, field, config) {
            var seen = {};
            $('div[lay-table-id="' + tableId + '"]').first().find('td[data-field="' + field + '"]').each(function () {
                var index = $(this).closest('tr').attr('data-index');
                if (index == null || seen[index]) return;
                seen[index] = true;
                active.syncCell(tableId, field, index, config);
            });
        },
        syncTable: function (tableId, cols) {
            (cols || []).forEach(function (col) {
                if (!col.field || !col.config || !col.config.rowConfig) return;
                Object.keys(col.config.rowConfig).forEach(function (index) {
                    active.syncCell(tableId, col.field, index, col.config);
                });
            });
        },
        valid: function () {
            var first = null;
            layer.closeAll('tips');
            for (var id in tableInstances) {
                var failed = validOne(id);
                if (failed[0] && !first) first = failed[0];
            }
            if (first && first.scrollIntoView) first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            return !first;
        },
        validTable: function (tableId) {
            layer.closeAll('tips');
            var failed = validOne(tableId);
            if (failed[0] && failed[0].scrollIntoView) failed[0].scrollIntoView({ block: 'nearest', inline: 'nearest' });
            return !failed.length;
        }
    };

    common.bindFocusNav({ elem: document, type: 'table' });
    exports(moduleName, active);
});
