/**
 * 控件模块：字段控件、树表、dtree、悬停提示。
 */
layui.define(['jquery', 'layer', 'common', 'commonDefaults'], function (exports) {
    var $ = layui.$;
    var layer = layui.layer;
    var common = layui.common;
    var commonDefaults = layui.commonDefaults;

        /**
         * 按字段类型创建控件。表单、可编辑表格、通用搜索、连线条件共用。
         * type(template, field, { scene }) 得到类型。
         * render：在 elem 宿主内自己创建控件（input/textarea/date/checkbox/select/tableSelect/imageUpload/searchInput）。
         * 日期类 type 均为 date，模式由 dateType 决定。初始值传 value。
         * config.isRange=true：宿主内画起止两份同类型控件（checkbox/imageUpload/text 除外）；api.isRange，getValue/setValue 用 {from,to}。
         * 返回 api：instance / getValue / setValue / update / input / destroy。
         * 事件：render 上 onInput/onChange/...；config.on 用小写同名。
         */
    var fieldControl = {
            type: function (template, field, options) {
                template = template || {};
                field = field || {};
                var scene = (options && options.scene) || '';
                if (template.length == 'max') return 'textarea';
                if (template.dataname) {
                    var refer = Number(field.F_ReferType);
                    if (refer === 2 || refer === 3) return 'select';
                    if (scene !== 'form' || [0, 1, 4, 5].indexOf(refer) >= 0) return 'tableSelect';
                }
                switch (template.datatype) {
                    case 'date':
                    case 'time':
                    case 'datetime':
                    case 'datetime2':
                    case 'year':
                    case 'month': return 'date';
                    case 'bit': return 'checkbox';
                    case 'image': return 'imageUpload';
                    default: return 'input';
                }
            },
            config: function (type, override, ctx) {
                override = override || {};
                ctx = ctx || {};
                var template = ctx.template || {};
                var field = ctx.field || {};
                var radio = Number(field.F_ReferType) !== 3;
                if (override.radio != null) radio = !!override.radio;
                var inputType = 'text';
                if (['bigint', 'int', 'float', 'decimal'].indexOf(template.datatype) > -1) inputType = 'number';
                if (override.inputType) inputType = override.inputType;
                else if (override.type === 'number' || override.type === 'text') inputType = override.type;
                var base = commonDefaults.take('control', type);
                if (type === 'input') base.inputType = inputType;
                if (type === 'date') {
                    base.dateType = override.dateType || base.dateType || 'date';
                    if (!override.format) base.format = common.formatsDateType(base.dateType);
                }
                if (type === 'select') {
                    base.radio = radio;
                    base.clickClose = override.clickClose != null ? override.clickClose : radio;
                    if (base.toolbar) base.toolbar.show = !radio;
                }
                if (type === 'tableSelect') {
                    var isTreeRef = Number(field.F_ReferType) === 4 || Number(field.F_ReferType) === 5;
                    base.checkedKey = isTreeRef
                        ? (common.tableSelectUtil.fields().id)
                        : (field.F_EnCode || '');
                }
                return $.extend({}, base, override);
            },
            // 默认值
            resolveDefault: function (def, dateType) {
                if (def == null || def === '') return null;
                def = String(def);
                var user = (typeof currentUser !== 'undefined' && currentUser && currentUser.F_Id)
                    ? currentUser
                    : ((typeof top !== 'undefined' && top.currentUser) || {});
                if (def === '{loginUser}') return { value: user.F_Id || '', display: user.F_RealName || user.F_Account || user.F_Id || '' };
                if (def === '{loginRole}') return { value: user.F_RoleId || '', display: user.F_RoleName || user.F_RoleId || '' };
                if (def === '{loginOrg}') return { value: user.F_OrganizeId || '', display: user.F_OrganizeName || user.F_OrganizeId || '' };
                // 当前时间类：优先按字段 dateType/datatype 格式化
                var tokenType = ({
                    '{currentDate}': 'date',
                    '{currentDatetime}': 'datetime',
                    '{currentTime}': 'time',
                    '{currentYear}': 'year',
                    '{currentMonth}': 'month'
                })[def];
                if (tokenType) {
                    var dt = dateType === 'datetime2' ? 'datetime' : (dateType || tokenType);
                    if (['date', 'time', 'datetime', 'year', 'month'].indexOf(dt) < 0) dt = tokenType;
                    var v = moment().format(common.formatsDateType(dt));
                    return { value: v, display: v };
                }
                // 修改内容：含日期格式符时当模板，如 YYYY-MM-DD 7:10:50
                if (/YYYY|MM|DD|HH|mm|ss/.test(def)) {
                    var v = moment().format(def);
                    return { value: v, display: v };
                }
                return { value: def, display: def };
            },

            render: function (opts) {
                opts = opts || {};
                var $host = $(opts.elem);
                var self = this;
                var type = opts.type || self.type(opts.template, opts.field, opts);
                if (!$host.length && !opts.config && type !== 'imageUpload') return null;
        
                var template = opts.template || {};
                var field = opts.field || {};
                var passed = opts.config || {};
                var cfg = self.config(type, passed, { template: template, field: field });
                var hooks = cfg.on || {};
                var rawValue = opts.value;

                // 区间：isRange → 宿主内再画起止两个同类型控件（checkbox/imageUpload/text 不支持）
                if (cfg.isRange && $host.length && type !== 'checkbox' && type !== 'imageUpload' && type !== 'text') {
                    var prevRange = $host.data('fieldControl');
                    if (prevRange && prevRange.destroy) prevRange.destroy();
                    $host.children().not('label.layui-form-label').remove();
                    var $wrap = $('<div class="field-control-range" style="display:flex;align-items:center;flex:1"></div>');
                    var $fromHost = $('<div class="field-control-range-from" style="flex:1"></div>');
                    var $toHost = $('<div class="field-control-range-to" style="flex:1"></div>');
                    $wrap.append($fromHost).append('<span style="padding:0 4px;">~</span>').append($toHost);
                    $host.append($wrap);

                    var rv = (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) ? rawValue : {};
                    var baseId = cfg.id || cfg.name || field.F_EnCode || '';
                    function renderSide(side, $sideHost, val, ph) {
                        // 每侧深拷一份，互不影响；子控件本身不再是区间
                        var sideCfg = $.extend(true, {}, passed);
                        sideCfg.isRange = false;
                        sideCfg.id = baseId ? (baseId + '__' + side) : '';
                        sideCfg.name = baseId ? (baseId + '__' + side) : '';
                        sideCfg.placeholder = ph || '';
                        sideCfg.elem = $sideHost[0];
                        sideCfg.range = false;
                        if (type === 'tableSelect') {
                            var key = val == null || val === '' ? '' : String(val);
                            sideCfg.selected = key ? key.split(',').filter(Boolean) : [];
                        }
                        return self.render({
                            elem: $sideHost,
                            type: type,
                            value: val,
                            field: field,
                            template: template,
                            config: sideCfg
                        });
                    }
                    var fromApi = renderSide('from', $fromHost, rv.from, passed.placeholderFrom || passed.placeholder);
                    var toApi = renderSide('to', $toHost, rv.to, passed.placeholderTo);
                    var rangeApi = {
                        isRange: true,
                        from: fromApi,
                        to: toApi,
                        type: type,
                        getValue: function () {
                            return {
                                from: fromApi.getValue ? fromApi.getValue() : '',
                                to: toApi.getValue ? toApi.getValue() : ''
                            };
                        },
                        setValue: function (v) {
                            v = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
                            if (fromApi.setValue) fromApi.setValue(v.from);
                            if (toApi.setValue) toApi.setValue(v.to);
                            return rangeApi;
                        },
                        destroy: function () {
                            if (fromApi.destroy) fromApi.destroy();
                            if (toApi.destroy) toApi.destroy();
                            $host.children().not('label.layui-form-label').remove();
                            $host.removeData('fieldControl');
                        }
                    };
                    $host.attr('data-fc-type', type).data('fcType', type).data('fieldControl', rangeApi);
                    return rangeApi;
                }

                var value = rawValue == null || Array.isArray(rawValue) ? '' : String(rawValue);
                if (Array.isArray(rawValue)) value = rawValue.join(',');
                var display = value;
                var filledDefault = false;
                if (!value) {
                    var defVal = self.resolveDefault(template.default, cfg.dateType || template.datatype);
                    if (defVal && defVal.value) {
                        value = defVal.value;
                        display = defVal.display || defVal.value;
                        filledDefault = true;
                        if (type === 'tableSelect') {
                            var isTree = !!(cfg.istree || Number(field.F_ReferType) === 4 || Number(field.F_ReferType) === 5);
                            cfg.selected = String(isTree ? value : display).split(',').filter(Boolean);
                        }
                    }
                }
                var state = { value: value, display: display };
                var reuse = $host.is('input,textarea');
                var destroyed = false;
                var inTable = $host.hasClass('cell-keep') || $host.closest('.layui-table-view').length > 0;
        
                // ====== 公共工具（全部内聚在这里，不再散在分支里） ======
                var util = {
                    callHook: function (name, elem, val, evt) {
                        if (typeof hooks[name] === 'function') hooks[name](elem, val, evt);
                        if (name === 'change') return;
                        var optName = 'on' + name.charAt(0).toUpperCase() + name.slice(1);
                        if (typeof opts[optName] === 'function') opts[optName](val, state.display, evt);
                    },
                    notify: function (nextValue, nextDisplay, extra) {
                        extra = extra || {};
                        state.value = nextValue == null ? '' : String(nextValue);
                        state.display = nextDisplay == null ? '' : String(nextDisplay);
                        var el = extra.elem !== undefined ? extra.elem : ($input && $input[0]);
                        // 修改内容：先内部回填，再对外 on.change
                        if (typeof opts.onChange === 'function') opts.onChange(state.value, state.display, extra);
                        util.callHook('change', el, extra.arr ? extra.arr : state.value);
                    },
                    unbindDate: function ($el) {
                        if (!$el || !$el.length || !layui.laydate || !layui.laydate.unbind) return;
                        var id = $el.attr('lay-laydate-id');
                        if (!id) return;
                        try { layui.laydate.unbind(id); } catch (e) { }
                        if ($el[0]) $el[0].eventHandler = false;
                    },
                    makeInput: function (tag) {
                        if (reuse) return $host;
                        var cls = (tag === 'textarea') ? 'layui-textarea' : 'layui-input';
                        var $el = $('<' + (tag || 'input') + ' autocomplete="off" class="' + cls + '">');
                        if (cfg.id) $el.attr('id', cfg.id);
                        if (cfg.name) $el.attr('name', cfg.name);
                        if (cfg.className) $el.addClass(cfg.className);
                        if (cfg.inputStyle) $el.css(cfg.inputStyle);
                        if (!inTable && cfg.required) $el.attr('lay-verify', 'required');
                        if (!inTable && cfg.layVerify) $el.attr('lay-verify', cfg.layVerify);
                        if (cfg.layReqText) $el.attr('lay-reqtext', cfg.layReqText);
                        $el.css({ flex: 1, width: '100%', minWidth: 0 });
                        $host.append($el);
                        return $el;
                    },
                    // 数字按 precision 补小数；空值原样返回
                    formatNum: function (v) {
                        if (v === '' || v == null || (cfg.inputType || 'text') !== 'number') return v;
                        if (cfg.precision === '' || cfg.precision == null || isNaN(Number(cfg.precision))) return v;
                        var n = Number(v);
                        return isNaN(n) ? v : n.toFixed(Number(cfg.precision));
                    }
                };
        
                // ====== 控件策略注册表，每个控件独立实现统一接口 ======
                var strategies = {
                    textarea: {
                        create: function () {
                            var $input = util.makeInput('textarea');
                            $input.prop('disabled', !!cfg.disabled);
                            $input.attr('placeholder', passed.placeholder || cfg.placeholder || '');
                            if (cfg.maxlength) $input.attr('maxlength', cfg.maxlength);
                            if (cfg.rows) $input.attr('rows', cfg.rows);
                            $input.val(display);
                            state.value = $input.val() || display;
                            state.display = state.value;
                            $input.on('input.fieldControl', function (e) {
                                util.callHook('input', this, this.value, e);
                            });
                            ['keydown', 'keypress', 'keyup', 'focus', 'click'].forEach(function (name) {
                                $input.on(name + '.fieldControl', function (e) { util.callHook(name, this, this.value, e); });
                            });
                            $input.on('blur.fieldControl', function (e) {
                                // 与上次提交值不同才 change（和其他控件一致）
                                if (String(this.value) !== String(state.value)) util.notify(this.value, this.value);
                                util.callHook('blur', this, this.value, e);
                            });
                            return { $input: $input, instance: null };
                        },
                        getValue: function (ctx) {
                            return ctx.$input.val() || '';
                        },
                        setValue: function (ctx, v, d) {
                            var text = d ?? v;
                            ctx.$input.val(text);
                            state.value = text == null ? '' : String(text);
                            state.display = state.value;
                        },
                        update: function (ctx, patch) {
                            $.extend(cfg, patch);
                            ctx.$input.prop('disabled', !!cfg.disabled);
                            if (patch.placeholder != null) ctx.$input.attr('placeholder', cfg.placeholder || '');
                        },
                        destroy: function () { }
                    },
                    date: {
                        create: function () {
                            var $input = util.makeInput();
                            $input.prop('readonly', true).css('cursor', 'pointer');
                            $input.prop('disabled', !!cfg.disabled).attr('placeholder', passed.placeholder || cfg.placeholder || '').val(display);
                            var instance = layui.laydate.render($.extend({}, cfg, {
                                elem: $input[0],
                                type: cfg.dateType || 'date',
                                format: String(cfg.format || common.formatsDateType(cfg.dateType || 'date')).replace(/YYYY/g, 'yyyy').replace(/DD/g, 'dd'),
                                value: $input.val() || '',
                                range: cfg.range === true ? '~' : cfg.range,
                                done: function (v) {
                                    $input.val(v);
                                    util.notify(v, v);
                                }
                            }));
                            return { $input: $input, instance: instance };
                        },
                        getValue: function (ctx) {
                            return ctx.$input.val() || '';
                        },
                        setValue: function (ctx, v, d) {
                            ctx.$input.val(d ?? v);
                        },
                        update: function (ctx, patch) {
                            $.extend(cfg, patch);
                            if (patch.dateType && patch.format == null) cfg.format = common.formatsDateType(patch.dateType);
                            ctx.$input.prop('disabled', !!cfg.disabled);
                            if (patch.placeholder != null) ctx.$input.attr('placeholder', cfg.placeholder || '');
                            if (ctx.instance && ctx.instance.reload) {
                                ctx.instance.reload(patch.dateType ? $.extend({}, patch, { type: patch.dateType }) : patch);
                            }
                        },
                        destroy: function (ctx) {
                            util.unbindDate(ctx.$input);
                        }
                    },
                    tableSelect: {
                        create: function () {
                            var $input = util.makeInput();
                            if (!$input.attr('id') && (cfg.id || field.F_EnCode)) $input.attr('id', cfg.id || field.F_EnCode);
                            $input.prop('readonly', !!cfg.readonly || cfg.canInput === false)
                                .prop('disabled', !!cfg.disabled)
                                .attr('placeholder', cfg.placeholder || passed.placeholder || ('请选择' + (field.F_FullName || '')))
                                .css('cursor', 'pointer').val(display);
        
                            var built = cfg.table ? null : common.tableSelectUtil.buildConfig({
                                dataname: template.dataname, referType: field.F_ReferType, paramsStr: template.params, disabled: !!cfg.disabled
                            });
                            var istreeCfg = cfg.istree != null ? cfg.istree : (built && built.istree);
                            var isTree = !!istreeCfg;
                            var idKey = common.tableSelectUtil.fields().id;
                            var userBefore = cfg.beforeRender || (built && built.beforeRender);
                            var tsOpts = $.extend({}, cfg, built || {}, {
                                elem: $input[0],
                                table: cfg.table || (built && built.table),
                                istree: istreeCfg || false,
                                checkedKey: isTree ? (cfg.checkedKey || idKey) : (cfg.checkedKey || field.F_EnCode || cfg.id || ''),
                                searchKey: (cfg.table && cfg.table.searchKey) || (built && built.searchKey) || cfg.searchKey,
                                searchPlaceholder: (cfg.table && cfg.table.searchPlaceholder) || (built && built.searchPlaceholder) || cfg.searchPlaceholder,
                                selected: Array.isArray(cfg.selected) ? cfg.selected.filter(Boolean) : [],
                                beforeRender: function (o) {
                                    if (o && o.table) o.table.params = common.tableSelectUtil.resolveParams(o);
                                    if (typeof userBefore === 'function') return userBefore(o);
                                },
                                done: function (elem, checkStatus) {
                                    var fill = common.tableSelectUtil.resolveFill(checkStatus, field.F_EnCode || cfg.id || '', {
                                        fallbackDisplay: $(elem).val() || ''
                                    });
                                    // ts-selected 已由 selectDone / matchInput 写入
                                    var keys = (instance && instance.getValue) ? instance.getValue() : (($(elem).attr('ts-selected') || '').trim());
                                    if (instance && instance.update) instance.update({ selected: keys, display: fill.displayValue || '' });
                                    util.notify(keys, fill.displayValue || '', {
                                        checkStatus: checkStatus,
                                        arr: (checkStatus && checkStatus.data) || []
                                    });
                                }
                            });
                            var instance = layui.tableSelect.render(tsOpts);
                            $input.data('tableSelect', instance);
                            return { $input: $input, instance: instance, matchOpt: tsOpts };
                        },
                        getValue: function (ctx) {
                            return ctx.instance?.getValue ? String(ctx.instance.getValue() ?? '') : state.value;
                        },
                        setValue: function (ctx, v, d) {
                            if (ctx.instance?.update) ctx.instance.update({ selected: v, display: d });
                        },
                        update: function (ctx, patch) {
                            $.extend(cfg, patch);
                            if (ctx.instance?.update) ctx.instance.update(patch);
                        },
                        destroy: function () { }
                    },
                    select: {
                        create: function () {
                            var pick = reuse || $host.hasClass('field-control-select') ? $host
                                : $('<div class="field-control-select"></div>').css({ flex: 1, width: '100%', minWidth: 0 }).appendTo($host);
                            if (cfg.id) pick.attr('id', cfg.id);
                            if (cfg.className) pick.addClass(cfg.className);
                            pick.addClass('field-control-select');
        
                            var rows = cfg.data || [];
                            if (!rows.length && template.dataname) {
                                rows = common.refSelect(template.dataname, common.buildParams(template.params).params);
                            }
                            cfg.data = rows;
                            function xmOptions(extra) {
                                var xmOpts = $.extend({}, cfg, extra || {});
                                Object.keys(xmOpts).forEach(function (key) {
                                    if (xmOpts[key] == null) delete xmOpts[key];
                                });
                                // cfg.on 是 hooks 对象，不能传给 xm-select，否则选中不回调、formData 不更新
                                if (xmOpts.on && typeof xmOpts.on !== 'function') delete xmOpts.on;
                                if (extra && typeof extra.on === 'function') xmOpts.on = extra.on;
                                return xmOpts;
                            }
                            function onXm(res) {
                                if (typeof cfg.allowChange === 'function' && cfg.allowChange() === false) return;
                                var arr = (res && res.arr) || [];
                                util.notify(
                                    arr.map(function (x) { return x.value; }).filter(function (v) { return v != null && v !== ''; }).join(','),
                                    arr.map(function (x) { return x.name; }).filter(function (v) { return v != null && v !== ''; }).join(','),
                                    { arr: arr }
                                );
                            }
                            var instance = layui.xmSelect.render(xmOptions({ el: pick[0], data: rows, on: onXm }));
                            var $input = pick;
                            // xmSelect.setValue 第三参 listen 默认 false，程序赋值不会触发 on
                            if (value && instance?.setValue) instance.setValue(String(value).split(',').filter(Boolean));
                            if (instance) {
                                state.value = instance.getValue('valueStr') || value;
                                state.display = instance.getValue('nameStr') || display;
                            }
                            if ($input.length) $input.data('xmSelect', instance);
                            if (cfg.open && instance?.opened) setTimeout(function () { instance.opened(); }, 0);
                            return { $input: $input, instance: instance };
                        },
                        getValue: function (ctx) {
                            return ctx.instance?.getValue ? (ctx.instance.getValue('valueStr') || '') : (state.value || '');
                        },
                        setValue: function (ctx, v) {
                            if (!ctx.instance?.setValue) return;
                            var vals = String(v == null ? '' : v).split(',').filter(Boolean).map(function (p) {
                                var hit = (cfg.data || []).find(function (o) {
                                    return String(o.value) === String(p) || String(o.name) === String(p);
                                });
                                return hit ? hit.value : p;
                            }).filter(Boolean);
                            ctx.instance.setValue(vals);
                        },
                        update: function (ctx, patch) {
                            $.extend(cfg, patch);
                            // 修改内容：和 imageUpload 一样，交给实例重绘
                            if (ctx.instance?.update) ctx.instance.update(patch);
                        },
                        destroy: function () { }
                    },
                    checkbox: {
                        create: function () {
                            var checked = value === '1' || value === 'true' || rawValue === 1 || rawValue === true;
                            var $input = $('<input type="checkbox" class="field-control-check">').attr({
                                'lay-skin': cfg.laySkin,
                                'lay-text': cfg.layText,
                                'lay-filter': cfg.filter || 'fieldControlCheck',
                                title: cfg.title || null,
                                id: cfg.id || null,
                                name: cfg.name || null
                            }).prop({ checked: checked, disabled: !!cfg.disabled });
                            if (cfg.className) $input.addClass(cfg.className);
                            $host.append($input);
                            layui.form.render('checkbox');
                            // 修改内容：开关点完值变了就 notify，不再挂全局 form.on
                            $host.off('click.fieldControlCheck').on('click.fieldControlCheck', function () {
                                var v = $input.prop('checked') ? '1' : '0';
                                if (v === state.value) return;
                                util.notify(v, v);
                            });
                            state.value = checked ? '1' : '0';
                            state.display = state.value;
                            return { $input: $input, instance: null };
                        },
                        getValue: function () {
                            return state.value;
                        },
                        setValue: function (ctx, v) {
                            var next = (v === '1' || v === 'true' || v === true) ? '1' : '0';
                            ctx.$input.prop('checked', next === '1');
                            state.value = next;
                            state.display = next;
                            layui.form.render('checkbox');
                        },
                        update: function (ctx, patch) {
                            $.extend(cfg, patch);
                            ctx.$input.prop('disabled', !!cfg.disabled);
                        },
                        destroy: function () { }
                    },
                    searchInput: {
                        create: function () {
                            var $input, instance = null;
                            if (layui.searchInput) {
                                var searchCfg = $.extend({}, cfg, { elem: (cfg.elem || opts.elem) });
                                instance = layui.searchInput.render(searchCfg);
                                $input = $(searchCfg.elem);
                            }
                            return { $input: $input, instance: instance };
                        },
                        getValue: function (ctx) {
                            return ctx.instance?.getValue ? String(ctx.instance.getValue() ?? '') : state.value;
                        },
                        setValue: function (ctx, v) {
                            if (ctx.instance?.setValue) ctx.instance.setValue(v);
                        },
                        update: function (ctx, patch) {
                            $.extend(cfg, patch);
                            if (ctx.instance?.update) ctx.instance.update(patch);
                        },
                        destroy: function () { }
                    },
                    text: {
                        create: function () {
                            var $input = $('<div></div>');
                            if (cfg.id) $input.attr('id', cfg.id);
                            if (cfg.className) $input.addClass(cfg.className);
                            $input.text(display || '');
                            $host.append($input);
                            state.value = display || '';
                            state.display = state.value;
                            return { $input: $input, instance: null };
                        },
                        getValue: function () {
                            return state.value;
                        },
                        setValue: function (ctx, v, d) {
                            ctx.$input.text(d ?? v);
                        },
                        update: function (ctx, patch) {
                            $.extend(cfg, patch);
                            if (patch.className) ctx.$input.removeClass().addClass(patch.className);
                        },
                        destroy: function () { }
                    },
                    imageUpload: {
                        create: function () {
                            var $input = null, instance = null;
                            if (layui.imageUpload) {
                                var imgId = String(cfg.id || '').replace(/^#/, '') || (field.F_EnCode || '');
                                var $imgHidden = $('<input type="hidden">').attr('id', imgId);
                                if (cfg.name) $imgHidden.attr('name', cfg.name);
                                if (!inTable && cfg.layVerify) $imgHidden.attr('lay-verify', cfg.layVerify);
                                if (!inTable && cfg.required) $imgHidden.attr('lay-verify', cfg.layVerify || 'required');
                                var $imgBox = $('<div></div>').attr('id', imgId);
                                $host.append($imgHidden).append($imgBox);
                                $input = $imgHidden;
                                var imageOpts = $.extend({}, cfg, {
                                    id: '#' + imgId,
                                    value: Array.isArray(rawValue) ? rawValue : (value ? value.split(',') : []),
                                    // 修改内容：上传/删除走 notify；表格仍把 {field,value,data} 传给 on.change
                                    on: $.extend({}, hooks, {
                                        change: function (a, b) {
                                            var tableEvt = a && typeof a === 'object' && !a.nodeType && a.field != null;
                                            var next = tableEvt ? (a.value || '') : (b == null ? '' : String(b));
                                            if ($input && $input.length) $input.val(next);
                                            if (tableEvt) util.notify(next, next, { elem: a, arr: a });
                                            else util.notify(next, next);
                                        }
                                    })
                                });
                                if (cfg.tableId && layui.imageUpload.initTableAllImages) layui.imageUpload.initTableAllImages(imageOpts);
                                else if (layui.imageUpload.render) instance = layui.imageUpload.render(imageOpts);
                            }
                            return { $input: $input, instance: instance };
                        },
                        getValue: function (ctx) {
                            return ctx.$input ? ctx.$input.val() : state.value;
                        },
                        setValue: function (ctx, v) {
                            if (ctx.$input) ctx.$input.val(v);
                            if (ctx.instance?.setValue) ctx.instance.setValue(v);
                        },
                        update: function (ctx, patch) {
                            $.extend(cfg, patch);
                            if (ctx.instance?.update) ctx.instance.update(patch);
                        },
                        destroy: function () { }
                    },
                    input: {
                        create: function () {
                            var inputType = cfg.inputType || 'text';
                            var $input = util.makeInput();
                            $input.attr('type', inputType === 'number' ? 'number' : 'text');
                            $input.prop('disabled', !!cfg.disabled).prop('readonly', !!cfg.readonly);
                            $input.attr('placeholder', passed.placeholder || cfg.placeholder || '');
                            if (inputType === 'number') {
                                if (cfg.min != null) $input.attr('min', cfg.min);
                                if (cfg.max != null) $input.attr('max', cfg.max);
                                if (cfg.step != null) $input.attr('step', cfg.step);
                            }
                            $input.val(util.formatNum(display));
                            if (cfg.prefix || cfg.suffix) {
                                if (!$input.parent().hasClass('layui-input-group')) {
                                    $input.wrap('<div class="layui-input-group" style="flex:1"></div>');
                                }
                                if (cfg.prefix && !$input.prev('.layui-input-prefix').length) {
                                    $input.before('<div class="layui-input-prefix" style="width:0">' + cfg.prefix + '</div>');
                                }
                                if (cfg.suffix && !$input.next('.layui-input-suffix').length) {
                                    $input.after('<div class="layui-input-suffix" style="width:0">' + cfg.suffix + '</div>');
                                }
                            }
                            state.value = $input.val();
                            state.display = state.value;

                            function clampNumber(raw) {
                                if (raw === '' || inputType !== 'number') return raw;
                                var n = Number(raw);
                                if (isNaN(n)) return raw;
                                if (cfg.min != null) n = Math.max(Number(cfg.min), n);
                                if (cfg.max != null) n = Math.min(Number(cfg.max), n);
                                return n;
                            }
                            if (cfg.onlyInteger && inputType === 'number') {
                                $input.on('input.fieldControlInteger', function () {
                                    var val = this.value;
                                    var next = val.replace(/[^\d\-]/g, '');
                                    if (next.indexOf('-') > 0) next = next.replace(/-/g, '');
                                    if (val !== next) this.value = next;
                                });
                                $input.on('keypress.fieldControlInteger', function (e) {
                                    var charCode = typeof e.which == 'undefined' ? e.keyCode : e.which;
                                    var charStr = String.fromCharCode(charCode);
                                    if (!/[\d\-]/.test(charStr)) e.preventDefault();
                                    if (charStr === '-' && (this.selectionStart !== 0 || this.value.indexOf('-') !== -1)) e.preventDefault();
                                });
                                $input.on('keydown.fieldControlInteger', function (e) {
                                    if (e.key === '.' || e.key === 'Decimal') e.preventDefault();
                                });
                            }
                            if (inputType === 'number') {
                                $input.on('wheel.fieldControl', function (e) {
                                    if (document.activeElement !== this) return;
                                    var val = parseFloat(this.value);
                                    if (isNaN(val)) val = 0;
                                    val += e.originalEvent.deltaY < 0 ? 1 : -1;
                                    if (cfg.max != null) val = Math.min(val, Number(cfg.max));
                                    if (cfg.min != null) val = Math.max(val, Number(cfg.min));
                                    this.value = util.formatNum(val);
                                    e.preventDefault();
                                });
                            }
                            // 打字走 onInput；失焦时与上次提交值不同才 change
                            $input.on('input.fieldControl', function (e) {
                                util.callHook('input', this, this.value, e);
                            });
                            ['keydown', 'keypress', 'keyup', 'focus', 'click'].forEach(function (name) {
                                $input.on(name + '.fieldControl', function (e) { util.callHook(name, this, this.value, e); });
                            });
                            $input.on('blur.fieldControl', function (e) {
                                var next = util.formatNum(clampNumber(this.value));
                                if (String(next) !== String(this.value)) this.value = next;
                                if (String(this.value) !== String(state.value)) util.notify(this.value, this.value);
                                util.callHook('blur', this, this.value, e);
                            });

                            return { $input: $input, instance: null };
                        },
                        getValue: function (ctx) {
                            return ctx.$input.val() || '';
                        },
                        setValue: function (ctx, v, d) {
                            var text = util.formatNum(d ?? v);
                            ctx.$input.val(text);
                            state.value = text == null ? '' : String(text);
                            state.display = state.value;
                        },
                        update: function (ctx, patch) {
                            $.extend(cfg, patch);
                            ctx.$input.prop('disabled', !!cfg.disabled).prop('readonly', !!cfg.readonly);
                            if (patch.placeholder != null) ctx.$input.attr('placeholder', cfg.placeholder || '');
                            if (ctx.$input.hasClass('cell-keep') && (cfg.disabled || cfg.readonly)) {
                                ctx.$input.css('pointer-events', 'none').hide();
                            }
                        },
                        destroy: function () { }
                    }
                };

                // ====== 清理旧实例（和原来逻辑一致） ======
                if ($host.length && type !== 'searchInput' && !reuse) {
                    var prev = $host.data('fieldControl');
                    if (prev && prev.destroy) prev.destroy();
                    $host.find('[lay-laydate-id]').each(function () { util.unbindDate($(this)); });
                    $host.children().not('label.layui-form-label').remove();
                }
        
                // ====== 分发策略，生成控件 ======
                var strategy = strategies[type];
                if (!strategy) throw new Error('fieldControl 未知控件类型：' + type);
                var ctrl = strategy.create();
                var $input = ctrl.$input;
                var instance = ctrl.instance;
        
                // ====== 非 input/textarea 控件统一绑定通用钩子（原来逻辑） ======
                if ($input && $input.length && type !== 'input' && type !== 'textarea') {
                    ['input', 'click', 'blur', 'keydown', 'keypress', 'keyup', 'focus', 'wheel'].forEach(function (name) {
                        $input.on(name + '.fieldControl', function (e) {
                            var v = this.value != null ? this.value : state.value;
                            util.callHook(name, this, v, e);
                        });
                    });
                }
        
                // ====== 对外API（完全对齐原版返回结构） ======
                var api = {
                    getValue: function () {
                        return strategy.getValue(ctrl);
                    },
                    input: function () { return $input; },
                    instance: instance,
                    type: type,
                    // 只改值，不触发 change；change 由 blur / match / done / 调用方 notify
                    setValue: function (v, d) {
                        var nextVal = Array.isArray(v) ? v.filter(Boolean).join(',') : (v == null ? '' : String(v));
                        var nextDisplay = (d != null && d !== '') ? String(d) : nextVal;
                        var changed = String(state.value || '') !== nextVal;
                        state.value = nextVal;
                        state.display = nextDisplay;
                        strategy.setValue(ctrl, nextVal, nextDisplay);
                        return changed;
                    },
                    notify: function (v, d, extra) {
                        util.notify(v, d, extra);
                        return api;
                    },
                    update: function (patch) {
                        if (!patch) return api;
                        strategy.update(ctrl, patch);
                        if (patch.required != null) {
                            var $el = $input && $input.is('input,textarea,select') ? $input : ($input && $input.find('input').first());
                            if ($el && $el.length) {
                                // if (patch.required) $el.attr('lay-verify', 'required');
                                if (patch.required && !inTable) $el.attr('lay-verify', 'required');
                                else $el.removeAttr('lay-verify');
                            }
                            $host.children('label.layui-form-label').toggleClass('required', !!patch.required);
                        }
                        if (patch.value != null) api.setValue(patch.value, patch.display);
                        return api;
                    },
                    destroy: function () {
                        if (destroyed) return;
                        destroyed = true;
                        strategy.destroy(ctrl);
                        util.unbindDate($input);
                        if ($host.length && !reuse) $host.children().not('label.layui-form-label').remove();
                        if ($host.length) $host.removeData('fieldControl');
                    }
                };
        
                // 标记挂载
                if ($host.length) $host.attr('data-fc-type', type).data('fcType', type).data('fieldControl', api);
                if ($input && $input.length) $input.attr('data-fc-type', type).data('fcType', type);
                if (filledDefault) {
                    var extra = {};
                    if (type === 'tableSelect' && ctrl.matchOpt) {
                        if (ctrl.matchOpt && ctrl.matchOpt.table) {
                            ctrl.matchOpt.table.params = common.tableSelectUtil.resolveParams(ctrl.matchOpt);
                        }
                        var matched = common.tableSelectUtil.matchInput(ctrl.matchOpt, $input, { clearOnMiss: false });
                        var cs = matched && matched.checkStatus;
                        if (cs && !cs.skipped && (cs.data || []).length) {
                            extra.checkStatus = cs;
                            extra.arr = cs.data;
                        }
                    }
                    util.notify(state.value, state.display, extra);
                }
                return api;
            }
    };


    var treeTableControl = {
        TREE_DEFAULTS: commonDefaults.take('tree'),
        _ins: {},
        isLazy: function (tree) {
            return !!(tree && (tree.async?.enable === true || typeof tree.async?.format === 'function'));
        },
        normalizeConfig: function (tree) {
            var lazy = this.isLazy(tree);
            var treeCfg = $.extend(true, {}, this.TREE_DEFAULTS, tree || {});
            treeCfg.data = treeCfg.data || {};
            if (treeCfg.data.rootPid === 0 || treeCfg.data.rootPid == null) {
                treeCfg.data.rootPid = '0';
            }
            if (lazy) {
                treeCfg.data.isSimpleData = false;
                treeCfg.async = treeCfg.async || {};
                treeCfg.async.enable = true;
            } else {
                treeCfg.data.isSimpleData = true;
                if (treeCfg.async) treeCfg.async.enable = false;
            }
            return treeCfg;
        },
        ensureIconStyles: function () {
            if (document.getElementById('icesky-treetable-icons')) return;
            var folderClose = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAE6UlEQVR4Xu2ZPYhcVRiGny9hC0FsTEBCGkFTWIQE/IlpgmKpWAiLyR0XLbYTxEKxkCAEhRCxEOwsjJnJioKIYClWKgqiskIIaCoLYyASVJT87JGspN37LrOXvec777Tzzrnvz7Nn2dnAr6YbiKbTOzwGoHEIDIABaLyBxuP7BjAAjTfQeHzfAAag8QYaj+8bwAA03kDj8X0DGIDGG2g8/lw3QFlhD9fZN7oOF7gYT3NudL5GaGjTAJQP2c1VXgIOExyGkf4/oXCe4I3oeH+EvY/G0qYAKFOWCV4Hdo8mQb+RL7jBE7HE3/3S9hQyAGXGCeDVSiv6lqscief4t1L/g9mWAChTHiD4ZrTXvVbPu9GxrEnbUWkAzPgeOJCglsXo+ChBji2L0AtAmfEgrP/0Z3hdZoF7Y5HLGcJsRQYFgLeAF7fiYSM540x0LI3Ey7bb6AdgytcEh7bd6VYa2MGhOJrmVpurmX4AZlwCds31lPF9+AI32O8/DYUvccqUKwR3jG/DuR29Gd36F1pNv/pvgKwAFK5RuC+e4eeWCWgXgJurFz6LCY8bgA0aSPwr4P/UhVNc43ir3xK2fQPcAr/wO/AewU/Ar6xRqroVdvAnC6zGIlc369sAbLax8er/ofAJOzkVR9e/uZVeBkCqqTrRyeh4RXFtAJSWatQUno0Jp/usG4C+hup9/yJ72BuPcH2jCAag3oEV50vRccYAKFXl1LwdHS8YgJzj9qcqfBoTnjQA/VVlVXwXHfcbgKzz9uf6IToOGoD+orIqDEDWZcVcBkAsKqvMAGRdVsxlAMSissoMQNZlxVwGQCwqq8wAZF1WzGUAxKKyygxA1mXFXAZALCqrzABkXVbMZQDEorLKDEDWZcVcBkAsKqvMAGRdVsxlAMSissoMQNZlxVwGQCwqq8wAZF1WzGUAxKKyygxA1mXFXAZALCqrzABkXVbMZQDEorLKDEDWZcVcBkAsKqvMAGRdVsxlAMSissoMQNZlxVwGQCwqq8wAZF1WzGUAxKKyygxA1mXFXAZALCqrzABkXVbMZQDEorLKDEDWZcVcBkAsKqvMAGRdVsxlAMSissoMQNZlxVwGQCwqq8wAZF1WzGUAxKKyygxA1mXFXAZALCqrzABkXVbMZQDEorLKDEDWZcVcBkAsKqvMAGRdVsxlAMSissoMQNZlxVwGQCwqq8wAZF1WzGUAxKKyygxA1mXFXAZALCqrzABkXVbMZQDEorLKDEDWZcVcBkAsKqvMAGRdVsxlAMSissoMQNZlxVwGQCwqq8wAZF1WzLUFAMy4BOwSH2jZmBoorMaE/RtZij6/ZcoFgrv7dH5/lA38Eh33zAfAjM+BR0cZz6Y2bqDwY0w4MB8AU04SvOyuq2zg4+h4aj4AzvIwha+qjN+66cLzMeGduQC4+eEy4zywr/U+K8t/hQX2xiJ/zQ/ACgdZ40vgtspKaNducCyOsdJXQO9fAbcOKGc5whofENzVd6jf3/YGTkTHccWFDMD6r4LT3MlOloHHCB4CblceYs3gDfxB4TeCcxReiwmr6hM3BYB6qHX1NGAA6tlqEKcGYJBa6znUANSz1SBODcAgtdZzqAGoZ6tBnBqAQWqt51ADUM9Wgzg1AIPUWs+hBqCerQZxagAGqbWeQw1APVsN4tQADFJrPYcagHq2GsTpf+KxwJB5Cd5mAAAAAElFTkSuQmCC';
            var folderOpen = 'data:image/png;base64,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';
            var fileIcon = 'data:image/png;base64,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';
            var style = document.createElement('style');
            style.id = 'icesky-treetable-icons';
            style.textContent = [
                '.layui-table-view .tree-icon-folder,',
                '.layui-table-view .tree-icon-folder-open,',
                '.layui-table-view .tree-icon-file {',
                '  display: inline-block; width: 20px; height: 16px; position: relative;',
                '}',
                '.layui-table-view .tree-icon-folder:after,',
                '.layui-table-view .tree-icon-folder-open:after,',
                '.layui-table-view .tree-icon-file:after {',
                '  content: ""; padding: 2px 10px;',
                '  background-size: cover; background-repeat: no-repeat;',
                '}',
                '.layui-table-view .tree-icon-folder:after { background-image: url("' + folderClose + '"); }',
                '.layui-table-view .tree-icon-folder-open:after { background-image: url("' + folderOpen + '"); }',
                '.layui-table-view .tree-icon-file:after { background-image: url("' + fileIcon + '"); }'
            ].join('\n');
            document.head.appendChild(style);
        },
        removeView: function (id, elem) {
            var $view = $('.layui-table-view[lay-table-id="' + id + '"]');
            if (!$view.length && elem) $view = $(elem).next('.layui-table-view');
            $view.remove();
        },
        wrapDone: function (opts) {
            var soulTable = layui.soulTable;
            var table = layui.table;
            var userDone = opts.done;
            opts.done = function (res, curr, count) {
                if (typeof userDone === 'function') userDone.call(this, res, curr, count);
                if (soulTable && typeof soulTable.render === 'function') soulTable.render(this);
                if (opts.id && table) table.resize(opts.id);
            };
        },
        wrapExpand: function (opts) {
            var soulTable = layui.soulTable;
            opts.tree.callback = opts.tree.callback || {};
            var before = opts.tree.callback.beforeExpand;
            var onExpand = opts.tree.callback.onExpand;
            opts.tree.callback.beforeExpand = function (tableId, trData, expandFlag) {
                if (expandFlag && soulTable && typeof soulTable.syncColWidthsByKey === 'function') {
                    soulTable.syncColWidthsByKey(tableId);
                }
                if (typeof before === 'function') return before.apply(this, arguments);
            };
            opts.tree.callback.onExpand = function (tableId, trData, expandFlag) {
                if (typeof onExpand === 'function') onExpand.apply(this, arguments);
                if (!expandFlag) return;
                if (soulTable && typeof soulTable.syncColWidthsByKey === 'function') {
                    soulTable.syncColWidthsByKey(tableId);
                }
                if (soulTable && typeof soulTable.autoColumnWidth === 'function') {
                    soulTable.autoColumnWidth(tableId, { dblclick: false, growOnly: true, force: false });
                }
                setTimeout(function () {
                    var imgUp = layui.imageUpload;
                    if (imgUp && typeof imgUp.refreshTable === 'function') {
                        imgUp.refreshTable(tableId);
                    }
                }, 0);
            };
        },
        render: function (options) {
            var treeTable = layui.treeTable;
            var opts = $.extend(true, {}, options || {});
            var id = opts.id || String(opts.elem || '').replace('#', '');
            if (!id) {
                console.error('treeTableControl.render: 缺少 id / elem');
                return null;
            }
            opts.id = id;
            opts.elem = opts.elem || ('#' + id);
            opts.tree = this.normalizeConfig(opts.tree);
            opts._useTreeTable = true;
            this.ensureIconStyles();
            this.wrapDone(opts);
            this.wrapExpand(opts);
            if (this._ins[id] && Array.isArray(opts.data)) {
                delete this._ins[id];
                this.removeView(id, opts.elem);
            } else if (this._ins[id]) {
                treeTable.reload(id, opts);
                return this._ins[id];
            }
            this._ins[id] = treeTable.render(opts);
            return this._ins[id];
        },
        has: function (id) {
            return !!(id && this._ins[id]);
        },
        clear: function (id) {
            if (id) delete this._ins[id];
        }
    };


    var dtreeControl = {
        _nodeId: '',
        _whereField: '',
        _context: '',
        getSelection: function () {
            return { nodeId: this._nodeId, whereField: this._whereField, context: this._context };
        },
        buildData: function (rawData) {
            if (!Array.isArray(rawData)) return [];
            var idMap = {};
            rawData.forEach(function (item) {
                if (!item || !item.F_Id) return;
                idMap[item.F_Id] = {
                    id: item.F_Id,
                    title: item.F_FullName || '未命名节点',
                    isLast: true,
                    spread: true,
                    level: Number(item.F_Layers || 1),
                    parentId: item.F_ParentId == null ? '0' : String(item.F_ParentId),
                    basicData: $.extend({}, item),
                    children: []
                };
            });
            var treeData = [];
            Object.keys(idMap).forEach(function (id) {
                var node = idMap[id];
                var parent = idMap[node.parentId];
                if (node.parentId === '0' || !parent) {
                    treeData.push(node);
                } else {
                    parent.children.push(node);
                    parent.isLast = false;
                }
            });
            (function sortTree(list) {
                list.sort(function (a, b) {
                    return Number(a.basicData.F_Sort || 0) - Number(b.basicData.F_Sort || 0);
                });
                list.forEach(function (n) {
                    if (n.children.length) sortTree(n.children);
                });
            })(treeData);
            return treeData;
        },
        render: function (opts) {
            opts = opts || {};
            var dtree = layui.dtree;
            var table = layui.table;
            var dtreeOpts = $.extend(true, {}, opts.dtree || {});
            if (!dtreeOpts.elem) dtreeOpts.elem = '#leftTree';
            dtreeOpts.line = true;
            var tableId = opts.tableId || String(opts.tableElem || '').replace('#', '');
            var $table = $(opts.tableElem);
            if ($table.length && !$table.closest('.dtree-table-flex-wrap').length) {
                var treeId = String(dtreeOpts.elem).replace('#', '');
                var wrapHtml = [
                    '<div class="dtree-table-flex-wrap" style="display:flex">',
                    '<div class="dtree-table-left" style="min-width:220px;border:1px solid #e6e6e6;border-right:none;">',
                    '<ul id="' + treeId + '" style="height:100%;overflow-y:auto;scrollbar-width:none;"></ul>',
                    '</div>',
                    '<div id="tableWrapBox_' + tableId + '" style="flex:1;overflow-y:auto;min-height:0;"></div>',
                    '</div>'
                ].join('');
                $table.before(wrapHtml);
                $table.appendTo('#tableWrapBox_' + tableId);
            }
            if (!dtreeOpts.data) {
                var self = this;
                common.ajax({
                    url: dtreeOpts.url || '/Public/GetTreeList',
                    async: false,
                    data: dtreeOpts.url ? (dtreeOpts.where || {}) : { moduleEnCode: opts.moduleEnCode || '' },
                    success: function (res) {
                        dtreeOpts.data = self.buildData(res);
                    }
                });
            }
            dtreeOpts.id = String(dtreeOpts.elem).replace(/#/g, '');
            dtree.render(dtreeOpts);
            var whereField = dtreeOpts.whereField || 'TreeId';
            var self = this;
            dtree.on("node('" + dtreeOpts.id + "')", function (param) {
                var p = (param && param.param) || {};
                self._whereField = whereField;
                self._nodeId = p.nodeId || '';
                self._text = p.context || p.title || '';
                if (typeof opts.onNode === 'function') {
                    opts.onNode(self._nodeId, whereField, self._text);
                    return;
                }
                var cfg = table.getOptions(tableId) || {};
                table.reload(tableId, {
                    url: '/Public/GetReferenceListJson',
                    where: {
                        param: JSON.stringify({ field: self._nodeId }),
                        enCode: opts.enCode || cfg.enCode
                    },
                    page: { curr: 1 }
                });
            });
        },
        syncHeight: function ($tableView) {
            var $left = $('.dtree-table-left');
            if (!$left.length || !$tableView || !$tableView.length) return;
            $left.height(($tableView.outerHeight() || 0) - 2);
        }
    };

    /**
     * 悬停提示控件。按 selector 顺序对应 data，无需 data-tip / setData。
     * tipControl.render({
     *   elem, selector,
     *   data: [{ title, rows:[{ label, value, color? }] }] 或 function () { return [...] },
     *   onClick?
     * })
     * data 传函数时，每次悬停现取，数据变了不用再通知控件。
     */
    var tipControl = {
        render: function (opts) {
            opts = opts || {};
            var $root = $(opts.elem);
            var selector = opts.selector;
            var tipIdx = null;
            var ns = '.iceTipCtrl' + Date.now();

            function tipOf(el, index) {
                if (typeof opts.data === 'function') {
                    var ret = opts.data(el, index);
                    return Array.isArray(ret) ? ret[index] : ret;
                }
                return (opts.data || [])[index];
            }

            function toHtml(data) {
                if (!data) return '';
                if (typeof data === 'string') return data;
                var title = data.title == null ? '' : String(data.title);
                var rows = data.rows || [];
                var html = '<div style="font-weight:600;margin-bottom:6px">' + title + '</div>';
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i] || {};
                    html += '<div style="' + (i === 0 ? 'border-top:1px solid #e8eef5;padding-top:6px;' : 'padding-top:4px;')
                        + 'white-space:nowrap;display:flex;justify-content:space-between;gap:18px">'
                        + '<span style="color:#8a9bb0">'
                        + (row.color ? '<i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + row.color + ';margin-right:6px"></i>' : '')
                        + (row.label == null ? '' : row.label) + '</span><b>' + (row.value == null ? '' : row.value) + '</b></div>';
                }
                return html;
            }

            function hide() {
                if (tipIdx != null) layer.close(tipIdx);
                tipIdx = null;
            }

            $root.on('mouseenter' + ns, selector, function () {
                var index = $root.find(selector).index(this);
                var html = toHtml(tipOf(this, index));
                if (!html) return;
                tipIdx = layer.tips(html, this, {
                    tips: opts.tips || [1, '#fff'],
                    time: 0,
                    success: function (el) {
                        el.find('.layui-layer-content').css({
                            color: '#334965',
                            padding: '10px 12px',
                            'box-shadow': '0 4px 14px rgba(51,73,101,.15)',
                            border: '1px solid #e8eef5'
                        });
                    }
                });
            }).on('mouseleave' + ns, selector, hide);

            if (typeof opts.onClick === 'function') {
                $root.on('click' + ns, selector, function (e) {
                    opts.onClick.call(this, e, $root.find(selector).index(this));
                });
            }

            return {
                destroy: function () {
                    hide();
                    $root.off(ns);
                }
            };
        }
    };

    var controls = {
        fieldControl,
        treeTableControl,
        dtreeControl,
        tipControl,
    };
    exports('controls', controls);
});
