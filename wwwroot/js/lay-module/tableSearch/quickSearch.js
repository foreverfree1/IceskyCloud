// 通用快捷搜索（可独立用，也可被 commonTable 工具栏调用）
layui.define(['jquery', 'common', 'controls', 'layer'], function (exports) {
    var $ = layui.$,
        common = layui.common,
        controls = layui.controls,
        layer = layui.layer;

    var MOD = 'quickSearch';

    function syncAjax(url, data) {
        var result = null;
        common.ajax({
            type: 'GET',
            url: url,
            data: data || {},
            async: false,
            success: function (res) { result = res || []; }
        });
        return result;
    }

    function fieldType(tpl, item) {
        if (tpl && Array.isArray(tpl.data) && tpl.data.length) return 'select';
        return controls.fieldControl.type(tpl, item, { scene: 'table' }) || 'input';
    }

    function tplRequired(tpl) {
        if (!tpl) return false;
        if (tpl.filterverify != null) return tpl.filterverify === true || tpl.filterverify === 'true';
        return !!(tpl.islistaddverify || tpl.isheadupdateverify);
    }

    // 从「常用搜索」方案拉字段；失败返回 []
    function loadPlanFields(moduleEnCode, planUrl) {
        var url = planUrl || (moduleEnCode ? ('/Module/' + moduleEnCode + '/Index') : window.location.pathname);
        var hit = (syncAjax('/SystemManage/ModulePlan/GetListJson', { url: url, page: 1, rows: 9999 }) || [])
            .find(function (p) { return p.F_PlanType == 0; });
        if (!hit) return { fields: [], plan: null };
        var planParam = [];
        try { planParam = JSON.parse(hit.F_PlanParam || '[]') || []; } catch (e) { }
        var fields = planParam.map(function (item) {
            var tpl;
            try { tpl = JSON.parse(item.F_Template || '{}'); } catch (e) { tpl = {}; }
            if (!tpl.filter || !tpl.isstandard) return null;
            var type = fieldType(tpl, item);
            var isNum = type === 'input' && ['bigint', 'int', 'float', 'decimal'].indexOf(tpl.datatype) > -1;
            var range = (type === 'date' || isNum) && tpl.range !== false;
            return {
                id: item.F_EnCode,
                label: item.F_FullName || '',
                type: type,
                width: range && type === 'date' ? 302.5 : 200,
                range: range,
                required: tplRequired(tpl),
                _raw: item,
                _template: tpl
            };
        }).filter(Boolean);
        return { fields: fields, plan: hit };
    }

    // 控件值 → 后端 keyword 数组
    function buildKeyword(fields, controlMap) {
        var keyword = [];
        (fields || []).forEach(function (f) {
            var api = controlMap && controlMap[f.id];
            if (!api || !api.getValue) return;
            var key = f.id;
            if (f._raw && (f._raw.F_ReferType == 4 || f._raw.F_ReferType == 5)) key = key.replace(/^F_/, 'Tree_');
            var val = api.getValue();
            if (api.isRange) {
                if (val && val.from) keyword.push({ field: key, op: '>=', value: val.from, displayValue: val.from });
                if (val && val.to) keyword.push({ field: key, op: '<=', value: val.to, displayValue: val.to });
                return;
            }
            if (val == null || String(val).trim() === '') return;
            var op = (f.type === 'select' || f.type === 'tableSelect' || f.type === 'checkbox') ? 'in' : 'like';
            if (op === 'in') {
                val = String(val).replace(/‵/g, '').split(',').filter(Boolean).map(function (id) {
                    return '‵' + id + '‵';
                }).join(',');
            }
            keyword.push({ field: key, op: op, value: val, displayValue: val });
        });
        return keyword;
    }

    function validateRequired(fields, controlMap, $fields) {
        for (var i = 0; i < (fields || []).length; i++) {
            var f = fields[i];
            if (!f || !f.required) continue;
            var api = controlMap && controlMap[f.id];
            if (!api || !api.getValue) return layer.msg((f.label || '此项') + '不能为空', { icon: 2, time: 1500 }), false;
            var val = api.getValue();
            var empty;
            if (api.isRange) {
                var from = String((val && val.from) || '').trim();
                var to = String((val && val.to) || '').trim();
                empty = !from && !to;
            } else {
                empty = val == null || String(val).trim() === '';
            }
            if (!empty) continue;
            var tip = (f.label || '此项') + (api.isRange ? '至少填一边' : '不能为空');
            var $inp = api.isRange && $fields
                ? $fields.find('[data-field="' + f.id + '"] input').first()
                : (api.input ? api.input() : $());
            if ($inp.length) $inp[0].focus();
            return layer.msg(tip, { icon: 2, time: 1500 }), false;
        }
        return true;
    }

    /**
     * 渲染快捷搜索（只负责字段；显示/提示由外部控制）
     */
    function render(opts) {
        opts = opts || {};
        var $box = $(opts.elem || '#quickSearch');
        if (!$box.length) return null;
        var $fields = $box.find('.quickSearch-fields, #quickSearchFields').first();
        if (!$fields.length) $fields = $box;
        $fields.addClass('quickSearch-fields');

        var plan = null;
        var fields = opts.fields;
        if (!fields || !fields.length) {
            var loaded = loadPlanFields(opts.moduleEnCode, opts.planUrl);
            fields = loaded.fields;
            plan = loaded.plan;
        }

        if (!$box.data('qsActionsHtml')) {
            var $src = $box.find('.quickSearch-actions').first();
            if ($src.length) {
                $box.data('qsActionsHtml', $src.prop('outerHTML'));
                $src.remove();
            }
        }
        if (!fields || !fields.length) {
            $box.find('.quickSearch-actions, .quickSearch-actions-col').remove();
            return null;
        }

        var initialData = $.extend(true, {}, opts.data || {});
        var api = {
            elem: $box,
            fields: fields,
            plan: plan,
            controlMap: {},
            getKeyword: function () { return buildKeyword(fields, api.controlMap); },
            reset: function () {
                Object.keys(api.controlMap).forEach(function (id) {
                    var control = api.controlMap[id];
                    if (!control || !control.setValue) return;
                    control.setValue(Object.prototype.hasOwnProperty.call(initialData, id) ? initialData[id] : '');
                });
                if (typeof opts.onReset === 'function') opts.onReset();
            },
            show: function () { $box.removeClass('layui-hide'); },
            hide: function () { $box.addClass('layui-hide'); }
        };

        api.onSearch = opts.onSearch;
        $box.data('quickSearchApi', api);

        layui.use(['commonForm'], function () {
            layui.commonForm.renderForm({
                elem: $fields,
                fields: fields,
                data: opts.data || {},
                isEnabled: true,
                filter: opts.filter || 'quickSearchForm',
                setCustomConfig: opts.setCustomConfig,
                done: function (map) {
                    api.controlMap = map || {};
                    $box.find('.quickSearch-actions, .quickSearch-actions-col').remove();
                    var html = $box.data('qsActionsHtml');
                    var hasInput = $fields.find('.form-field-col').length > 0;
                    if (html && hasInput) {
                        var $col = $('<div class="form-field-col quickSearch-actions-col" style="display:flex;align-items:center;"></div>').append($(html));
                        var $flex = $fields.find('.form-fields-flex');
                        ($flex.length ? $flex : $fields).append($col);
                    }
                    if (typeof opts.done === 'function') opts.done(api);
                }
            });

            if (!$box.data('qsBound')) {
                $box.on('click', '#quickSearchBtn, .quickSearch-btn-search', function () {
                    var cur = $box.data('quickSearchApi') || api;
                    if (!validateRequired(cur.fields, cur.controlMap, $fields)) return false;
                    if (typeof cur.onSearch === 'function') {
                        return cur.onSearch({ keyword: cur.getKeyword(), plan: cur.plan, controlMap: cur.controlMap, api: cur });
                    }
                }).on('click', '#quickSearchReset, .quickSearch-btn-reset', function () {
                    ($box.data('quickSearchApi') || api).reset();
                });
                $box.data('qsBound', 1);
            }
        });
        return api;
    }

    exports(MOD, {
        render: render,
        loadPlanFields: loadPlanFields,
        buildKeyword: buildKeyword
    });
});