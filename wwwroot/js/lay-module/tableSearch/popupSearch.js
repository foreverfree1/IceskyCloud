// 字段值约定：value=提交/查询（tableSelect 取 ts-selected），displayValue=界面展示，selectedData=勾选行（可选）。
// laydate / tableSelect / xmSelect 声明依赖，供 fieldControl 内部使用
layui.define(['laydate', 'laytpl', 'layer', 'form', 'tableSelect', 'xmSelect', 'common', 'controls'], function (exports) {
  "use strict";
  const MOD_NAME = 'popupSearch';
  const $ = layui.$;
  const laytpl = layui.laytpl;
  const layer = layui.layer;
  const form = layui.form;
  const common = layui.common;
  const controls = layui.controls;

  // 修改内容：操作符只留包含（in）/ 排除（not in）/ 类似（like）/ 不似（not like）
  const OP_MAP = [
    { value: 'like', text: '类似' },
    { value: 'not like', text: '不似' },
    { value: 'in', text: '包含' },
    { value: 'not in', text: '排除' }
  ];
  // 修改内容：下拉、开关这类字段是精确值匹配，类似 / 不似都没意义，操作符只留包含 / 排除
  const EXACT_FIELD_TYPES = ['select', 'tableSelect', 'checkbox'];

  function toEnComma(s) {
    return String(s == null ? '' : s).replace(/[，、]/g, ',');
  }
  function findOp(value, ops) {
    ops = ops && ops.length ? ops : OP_MAP;
    return ops.find(function (op) { return op.value === value; }) || ops[0];
  }
  function opPlaceholder(field, op) {
    if (field && (field.type === 'select' || field.type === 'tableSelect')) return '请选择';
    if (op === 'in' || op === 'not in') return findOp(op).text + '多个请用逗号隔开';
    // 只有文本框才提示模糊匹配
    if (((field && field.type) || 'input') === 'input' && (!field || field.inputType !== 'number')) return '可使用模糊条件匹配';
    return '';
  }
  function rangePlaceholder(field, side) {
    if (field.type === 'number' || field.inputType === 'number') return side === 'to' ? '最大值' : '最小值';
    var unit = (field.dateType === 'time' || field.dateType === 'datetime') ? '时间' : '日期';
    return (side === 'to' ? '结束' : '开始') + unit;
  }

  // 修改内容：日期、数字用两个框做区间，不需要操作符
  function isRangeField(field) {
    if (!field || field.range === false) return false;
    var can = field.type === 'date' || field.type === 'number' || field.inputType === 'number';
    return can && (field.template || {}).range !== false;
  }
  function syncAjax(url, data, type) {
    var result = null;
    common.ajax({
      type: type || 'GET',
      url: url,
      data: data,
      async: false,
      success: function (res) { result = res || []; }
    });
    return result;
  }

  function createDialogState(options) {
    return {
      id: 'search-dialog-' + Date.now() + Math.floor(Math.random() * 10000),
      fields: [],
      defaultValues: options.defaultValues || {},
      options: options,
      controls: {},
      tableSelectIns: {}
    };
  }

  /** 回显文案：优先 displayValue；tableSelect 其次 selectedData */
  function pickDisplayText(defaultVal, field) {
    defaultVal = defaultVal || {};
    if (defaultVal.displayValue != null && defaultVal.displayValue !== '') return String(defaultVal.displayValue);
    if (field && field.type === 'tableSelect') {
      var sd = Array.isArray(defaultVal.selectedData) ? defaultVal.selectedData : [];
      if (sd.length) {
        return sd.map(function (row) {
          return row.F_FullName || (field && row[field.name]);
        }).filter(Boolean).join(',');
      }
      return '';
    }
    if (defaultVal.value != null && defaultVal.value !== '') return String(defaultVal.value);
    return '';
  }

  function buildFields(rawFields, defaultValues) {
    return rawFields.map(function (field) {
      var range = isRangeField(field);
      var ops = range ? [] : OP_MAP;
      // 修改内容：精确值字段把“类似”和“不似”一起去掉，只留“包含 / 排除”
      if (!range && EXACT_FIELD_TYPES.indexOf(field.type) > -1) {
        ops = OP_MAP.filter(function (op) { return op.value !== 'like' && op.value !== 'not like'; });
      }
      var op = ops.length ? findOp((defaultValues[field.name] || {}).op, ops) : null;
      return Object.assign({}, field, {
        type: field.type || 'input',
        required: field.required || false,
        layVerify: field.layVerify || (field.required ? 'required' : ''),
        layReqText: field.layReqText || '',
        layAffix: field.layAffix || '',
        ops: ops,
        selectedOp: op ? op.value : '',
        selectedOpText: op ? op.text : '',
        range: range
      });
    });
  }

  function getControlInput(dialogState, fieldName) {
    var api = dialogState.controls && dialogState.controls[fieldName];
    if (api && api.input) {
      var $el = api.input();
      if ($el && $el.length) return $el;
    }
    return $('#' + dialogState.id).find('input[name="' + fieldName + '"]');
  }

  /** 他人公共方案：锁「公共/私有」 */
  function lockSavePlan(dialogState, F_Id) {
    var planHistory = dialogState.options.items.F_PlanHistory
      ? JSON.parse(dialogState.options.items.F_PlanHistory) : [];
    var planItem = F_Id && planHistory.find(function (item) { return item.F_Id == F_Id; });
    var lock = !!(planItem && planItem.F_IsPublic == 1 && planItem.F_CreatorUserId != currentUser.F_Id);
    var $save = $('#' + dialogState.id).find('input[name="saveplan"]');
    $save.prop('disabled', lock);
    if (lock) $save.prop('checked', false);
    form.render('radio', dialogState.id);
  }

  /** 收集 { op, value, displayValue, selectedData? } */
  function getAllValues(layero, dialogState) {
    var values = {};
    dialogState.fields.forEach(function (field) {
      var name = field.name;
      var op = layero.find('input[name="op_' + name + '"]').val() || (field.ops[0] && field.ops[0].value) || '';
      var api = dialogState.controls[name];
      var $input = getControlInput(dialogState, name);

      // 区间字段：控件 getValue → { from, to }
      if (field.range && api && api.isRange) {
        var rangeVal = api.getValue ? (api.getValue() || {}) : {};
        values[name] = { op: '', isRange: true, from: rangeVal.from || '', to: rangeVal.to || '' };
        return;
      }

      if (field.type === 'checkbox') {
        var checked = api && api.getValue
          ? (api.getValue() === '1' || api.getValue() === 1)
          : $input.prop('checked');
        var bit = checked ? 1 : 0;
        values[name] = { op: op, value: bit, displayValue: bit };
        return;
      }

      if (field.type === 'tableSelect') {
        var displayValue = $input.val() || '';
        var value = ($input.attr('ts-selected') || (api && api.getValue ? api.getValue() : '') || '').trim();
        var selectedData = [];
        if (dialogState.tableSelectIns[name] && dialogState.tableSelectIns[name].data && dialogState.tableSelectIns[name].data.length) {
          selectedData = dialogState.tableSelectIns[name].data;
        } else if (dialogState.defaultValues[name] && Array.isArray(dialogState.defaultValues[name].selectedData)) {
          selectedData = dialogState.defaultValues[name].selectedData;
        }
        values[name] = { op: op, value: value, displayValue: displayValue, selectedData: selectedData };
      } else if (field.type === 'select') {
        var selVal = api && api.getValue ? (api.getValue() || '') : '';
        var selText = '';
        if (api && api.instance && api.instance.getValue) {
          selText = api.instance.getValue('nameStr') || '';
        }
        values[name] = { op: op, value: selVal, displayValue: selText || selVal };
      } else {
        var text = (api && api.getValue ? api.getValue() : ($input.val() || '')) || '';
        values[name] = { op: op, value: text, displayValue: text };
      }
      if ((op === 'in' || op === 'not in') && values[name] && typeof values[name].value === 'string') {
        values[name].value = toEnComma(values[name].value);
        values[name].displayValue = toEnComma(values[name].displayValue);
      }
    });
    return values;
  }

  function bindOpDropdown(container, dialogState) {
    container.on('click', '.soul-drop-select', function (e) {
      e.stopPropagation();
      var idx = $(this).data('idx');
      var $dropdown = $('#soul-bf-type-' + idx);
      $('.soul-bf-type').not($dropdown).hide();
      if (!$dropdown.data('appended-to-body')) {
        $('body').append($dropdown);
        $dropdown.data('appended-to-body', true).attr('data-popupsearch-owner', dialogState.id);
      }
      var offset = $(this).offset();
      $dropdown.css({
        position: 'absolute',
        top: offset.top + $(this).outerHeight(),
        // 修改内容：操作符下拉整体左移 20px（原 50）
        left: offset.left + 30,
        zIndex: 19999999,
        display: 'block'
      }).show();
    });

    $(document).off('click.popupsearch-dropdown-li').on('click.popupsearch-dropdown-li', '.soul-bf-type li', function (e) {
      e.stopPropagation();
      var $li = $(this);
      var value = $li.attr('data-value');
      if (value == null) value = '';
      var $dropdown = $li.closest('.soul-bf-type');
      var ownerId = $dropdown.attr('data-popupsearch-owner');
      var $owner = $('#' + ownerId);
      var $parent = $li.closest('.layui-deeppink');
      if (!$parent.length && $owner.length) {
        $parent = $owner.find('.soul-drop-select[data-idx="' + $dropdown.attr('id').replace('soul-bf-type-', '') + '"]').closest('.layui-deeppink');
      }
      $parent.find('input[type="hidden"]').val(value);
      $parent.find('.soul-drop-select').html($li.text());
      $li.addClass('ts-selected').siblings().removeClass('ts-selected');
      $dropdown.hide();
      var fieldName = ($parent.find('input[type="hidden"]').attr('name') || '').replace(/^op_/, '');
      var field = (dialogState.fields || []).find(function (f) { return f.name === fieldName; });
      $parent.closest('.layui-popupsearch-block').find('.field-control-host input')
        .attr('placeholder', opPlaceholder(field, value));
    });

    $(document).off('click.popupsearch-drop').on('click.popupsearch-drop', function () {
      $('.soul-bf-type').hide();
    });
    $(document)
      .off('click.popupsearch-type').on('click.popupsearch-type', '.soul-bf-type', function (e) { e.stopPropagation(); })
      .off('mousedown.popupsearch-type').on('mousedown.popupsearch-type', '.soul-bf-type', function (e) { e.stopPropagation(); });
  }

  var CLASS_MAP = {
    tableSelect: 'popupsearch-inp popupsearch-table-select-inp',
    checkbox: 'layui-switch popupsearch-checkbox',
    date: 'date-input popupsearch-date-inp',
    input: 'popupsearch-inp'
  };

  /** 用 fieldControl 在 host 里创建控件（单多选/树由 F_ReferType 内部判断；区间走 config.isRange） */
  function renderFieldControls(layero, dialogState) {
    dialogState.controls = {};
    dialogState.fields.forEach(function (field) {
      var $host = layero.find('.field-control-host[data-field="' + field.name + '"]');
      if (!$host.length) return;
      var defaultVal = dialogState.defaultValues[field.name] || {};
      var shown = pickDisplayText(defaultVal, field);
      var submit = defaultVal.value == null ? '' : String(defaultVal.value).replace(/‵/g, '');
      var type = field.type === 'number' ? 'input' : (field.type || 'input');
      var cfg = {
        id: field.name,
        name: field.name,
        className: CLASS_MAP[type] || CLASS_MAP.input,
        dateType: field.dateType,
        required: field.range ? false : field.required,
        layVerify: field.range ? (field.required ? 'rangeOne' : '') : field.layVerify,
        layReqText: field.range ? (field.layReqText || field.label + '至少填一边') : field.layReqText,
        layAffix: field.layAffix,
        inputType: field.inputType,
        placeholder: opPlaceholder(field, field.selectedOp)
      };
      // 数字按模板 digits 失焦补小数（与快捷搜索 / 表单一致）
      var digits = field.template && field.template.digits;
      if ((field.inputType === 'number' || field.type === 'number')
        && digits != null && digits !== '' && !isNaN(Number(digits))) {
        cfg.precision = Number(digits);
      }
      if (field.range) {
        cfg.isRange = true;
        cfg.placeholderFrom = rangePlaceholder(field, 'from');
        cfg.placeholderTo = rangePlaceholder(field, 'to');
      }
      if (field.data || field.options) cfg.data = field.data || field.options;
      if (field.table) cfg.table = field.table;
      if (field.istree != null) cfg.istree = field.istree;
      if (field.sameApi != null) cfg.sameApi = field.sameApi;
      if (type === 'tableSelect') {
        cfg.selected = String(submit || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        cfg.canInput = false;
        cfg.readonly = true;
      }
      if (type === 'select') cfg.tips = '请选择';
      var value = field.range
        ? { from: defaultVal.from || '', to: defaultVal.to || '' }
        : ((type === 'tableSelect' || type === 'checkbox' || type === 'select') ? submit : shown);
      var api = controls.fieldControl.render({
        elem: $host,
        type: type,
        value: value,
        field: {
          F_EnCode: field.name,
          F_FullName: field.label,
          F_ReferType: field.referType
        },
        template: field.template,
        config: cfg,
        onChange: function (val, display, extra) {
          if (extra && extra.checkStatus) dialogState.tableSelectIns[field.name] = extra.checkStatus;
        }
      });
      dialogState.controls[field.name] = api;
      if (!field.range && (type === 'tableSelect' || type === 'select') && api && (submit || shown)) {
        api.setValue(submit, shown);
      }
    });
  }

  /** 方案回填单个字段 */
  function applySchemeField(layero, dialogState, item, schemeId) {
    var domField = item.field.indexOf('Tree_') === 0 ? item.field.replace('Tree_', 'F_') : item.field;
    var fieldCfg = (dialogState.fields || []).find(function (f) { return f.name === domField; }) || {};
    var api = dialogState.controls[domField];
    var displayText = String(item.displayValue != null ? item.displayValue : '').trim();
    var submitVal = String(item.value != null ? item.value : '').split('‵').join('').trim();

    // 修改内容：区间字段按 >= 回填左框、<= 回填右框
    if (fieldCfg.range && api && api.isRange) {
      if (item.op === '>=' && api.from && api.from.setValue) api.from.setValue(submitVal || displayText);
      if (item.op === '<=' && api.to && api.to.setValue) api.to.setValue(submitVal || displayText);
      return;
    }

    if (api && api.setValue) {
      if (fieldCfg.type === 'tableSelect' || fieldCfg.type === 'select') {
        api.setValue(submitVal, displayText);
      } else if (fieldCfg.type === 'checkbox') {
        api.setValue(submitVal !== '' ? submitVal : displayText);
      } else {
        api.setValue(displayText || submitVal);
      }
    } else {
      var $input = layero.find("input[name='" + domField + "']");
      $input.val(displayText);
      if (fieldCfg.type === 'tableSelect') {
        if (submitVal) $input.attr('ts-selected', submitVal);
        else $input.removeAttr('ts-selected');
      }
    }

    var $op = layero.find("input[name='op_" + domField + "']");
    var matchedOp = findOp(item.op, fieldCfg.ops);
    $op.val(matchedOp.value);
    $op.next().text(matchedOp.text || '');
    getControlInput(dialogState, domField).attr('placeholder', opPlaceholder(fieldCfg, matchedOp.value));
    lockSavePlan(dialogState, schemeId);
  }

  function resetDialog(layero, dialogState) {
    dialogState.tableSelectIns = {};
    layero.find('#schemeInput').val('').removeAttr('data-value').removeAttr('lay-verify').attr('placeholder', '请选择历史搜索方案');
    layero.find('#lbl_scheme').removeClass('required');
    layero.find('input[name="saveplan"]').prop({ checked: false, disabled: false });
    form.render('radio', dialogState.id);
    layero.find('input[name="saveplan"]').each(function () {
      $(this).next('.layui-form-radio').attr('title', $(this).attr('data-tip') || '');
    });
    (dialogState.fields || []).forEach(function (field) {
      var api = dialogState.controls[field.name];
      if (field.range) {
        if (api && api.setValue) api.setValue({ from: '', to: '' });
        return;
      }
      var first = field.ops && field.ops[0];
      if (first) {
        field.selectedOp = first.value;
        field.selectedOpText = first.text;
        var $op = layero.find('input[name="op_' + field.name + '"]');
        $op.val(first.value);
        $op.next().text(first.text);
      }
      if (api && api.setValue) api.setValue('');
      getControlInput(dialogState, field.name).val('').removeAttr('ts-selected')
        .attr('placeholder', opPlaceholder(field, field.selectedOp));
    });
  }

  var opDropdownTpl = `
    <div style="position:relative;cursor: pointer" class="layui-deeppink">
      <input type="hidden" name="op_{{= field.name }}" value="{{= field.selectedOp }}">
      <div class="soul-drop-select layui-unselect popupsearch-op-select"
        style="text-align: right;margin-right: 10px;width: 25px;"
        data-idx="{{= index }}">{{= field.selectedOpText }}</div>
      <div class="soul-bf-type fadeInUp animated" id="soul-bf-type-{{= index }}"
        style="display:none;left:30px;min-width:50px;" data-popupsearch-owner="{{= d.id }}"><ul>
        {{# layui.each(field.ops, function(opIndex, op){ }}
        <li class="{{= (op.value === field.selectedOp ? "ts-selected" : "") }}"
            data-value="{{= op.value }}" style="cursor:pointer;padding:5px 10px;">{{= op.text }}</li>
        {{# }); }}
      </ul></div>
    </div>
  `;

  var tplContent = `
    <div id="{{ d.id }}" class="search-dialog layui-popupsearch-dialog" style="padding:20px 24px 0;">
      {{# if(d.planTips){ }}
      <div class="popupsearch-tip" style="
        margin:0 -10px 10px;padding:2px 8px 2px 12px;display:flex;align-items:center;gap:10px;
        border-radius:10px;background:linear-gradient(135deg, rgba(255,244,232,.95) 0%, rgba(232,244,255,.95) 55%, rgba(245,232,255,.9) 100%);
        border:1px solid rgba(255,183,120,.45);box-shadow:0 6px 18px rgba(120,90,60,.08), inset 0 1px 0 rgba(255,255,255,.75);">
        <span style="flex-shrink:0;width:16px;height:16px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
          background:linear-gradient(145deg,#ffb347,#ff7e5f);color:#fff;font-size:16px;box-shadow:0 2px 8px rgba(255,126,95,.35);">
          <i class="layui-icon layui-icon-tips" style="font-size:14px;"></i>
        </span>
        <div style="flex:1;min-width:0;color:#5a4636;font-size:12.5px;">
          <div style="letter-spacing:.5px;color:#3d2f24;">{{= d.planTips }}</div>
        </div>
        <i class="layui-icon layui-icon-close popupsearch-tip-close" title="关闭提示"
          style="flex-shrink:0;cursor:pointer;color:#b8a090;font-size:14px;transition:color .2s;"></i>
      </div>
      {{# } }}
      <form class="layui-form layui-popupsearch-form" lay-filter="{{ d.id }}" autocomplete="off">
        <div class="layui-form-item layui-popupsearch-form-item">
          <label id="lbl_scheme" class="layui-form-label" style="font-weight:600;">历史搜索方案</label>
          <div class="layui-popupsearch-block popupsearch-scheme-row">
            <div class="popupsearch-scheme-main">
              <div style="width:25px;margin-right:10px;flex-shrink:0;"></div>
              <div class="popupsearch-scheme-input-wrap">
                <input type="text" class="layui-input popupsearch-scheme-input"
                  id="schemeInput" placeholder="请选择历史搜索方案" style="padding-right:30px;">
                <i class="layui-icon layui-icon-down popupsearch-scheme-arrow"
                  style="position:absolute;right:10px;top:50%;margin-top:-7px;font-size:14px;color:#c2c2c2;cursor:pointer;"></i>
                <div class="popupsearch-scheme-panel" id="schemePanel"
                  style="display:none;position:absolute;top:38px;left:0;right:0;background:#fff;border:1px solid #e6e6e6;border-radius:4px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.15);max-height:220px;overflow-y:auto;">
                  {{# layui.each(d.schemes || [], function(i, s){ }}
                  <div class="popupsearch-scheme-item" data-value="{{= s.F_Id }}"
                    style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;cursor:pointer;border-bottom:1px solid #f2f2f2;">
                    <span class="popupsearch-scheme-text">{{= s.F_SearchName }}</span>
                    <i class="layui-icon layui-icon-close-fill popupsearch-scheme-del"
                      data-value="{{= s.value }}" title="删除该方案"
                      style="color:#c2c2c2;font-size:16px;flex-shrink:0;"></i>
                  </div>
                  {{# }); }}
                  {{# if(!(d.schemes && d.schemes.length)){ }}
                  <div class="popupsearch-scheme-empty" style="padding:10px;text-align:center;color:#999;">暂无方案</div>
                  {{# } }}
                </div>
              </div>
            </div>
            <div class="popupsearch-scheme-radios">
              <input type="radio" name="saveplan" lay-filter="saveplan" lay-skin="primary" title="公共" data-tip="公共搜索方案">
              <input type="radio" name="saveplan" lay-filter="saveplan" lay-skin="primary" title="私有" data-tip="私有搜索方案">
            </div>
          </div>
        </div>
        {{# layui.each(d.fields, function(index, field){ }}
        <div class="layui-form-item layui-popupsearch-form-item">
          <label class="layui-form-label{{ field.required ? ' required' : '' }}" style="font-weight:600;">{{= field.label }}</label>
          <div class="layui-popupsearch-block" style="display:flex;align-items:center;position:relative;">
            {{# if(field.range){ }}
            <div style="width:25px;margin-right:10px;flex-shrink:0;"></div>
            {{# } else { }}
            ${opDropdownTpl}
            {{# } }}
            <div class="field-control-host" data-field="{{= field.name }}" style="flex:1;min-width:0;"></div>
          </div>
        </div>
        {{# }); }}
      </form>
    </div>`;

  form.verify({
    rangeOne: function (value, item) {
      var $host = $(item).closest('.field-control-host');
      var fromVal = $host.find('.field-control-range-from input').val();
      var toVal = $host.find('.field-control-range-to input').val();
      if (!String(fromVal || '').trim() && !String(toVal || '').trim()) {
        return $(item).attr('lay-reqtext') || '必填项不能为空';
      }
    }
  });

  layui.form.on('radio(saveplan)', function () {
    $('#schemeInput').attr('lay-verify', 'required').attr('placeholder', '请输入搜索方案名称');
    $('#lbl_scheme').addClass('required');
  });

  $(document).on('blur', '#schemeInput', function () {
    if (!PopupSearch.dialogState) return;
    lockSavePlan(PopupSearch.dialogState, $(this).attr('data-value') || '');
  });

  $(document).on('input', '#schemeInput', function () {
    var $input = $(this);
    $input.removeAttr('data-value');
    var name = ($input.val() || '').trim();
    if (!name || !PopupSearch.dialogState) return;
    var items = PopupSearch.dialogState.options && PopupSearch.dialogState.options.items;
    var history = items && items.F_PlanHistory ? JSON.parse(items.F_PlanHistory) : [];
    var matched = history.find(function (item) { return item.F_SearchName === name; });
    if (matched && matched.F_Id) $input.attr('data-value', matched.F_Id);
  });

  var PopupSearch = {
    data: null,
    dialogState: null,
    render: function (options) {
      var self = this;
      self.data = options = options || {};
      self.dialogState = createDialogState(options);
      self.dialogState.fields = buildFields(options.fields || [], options.defaultValues || {});
      self.dialogState.schemes = options.items.F_PlanHistory ? JSON.parse(options.items.F_PlanHistory) : [];

      if (!self.dialogState.fields.length) {
        layer.msg('没有可用的查询字段项，请先进行查询字段配置！', { icon: 0 });
        return;
      }

      var html = laytpl(tplContent).render({
        id: self.dialogState.id,
        fields: self.dialogState.fields,
        schemes: self.dialogState.schemes.filter(function (s) {
          return s.F_IsPublic == 1 || s.F_CreatorUserId == currentUser.F_Id;
        }),
        planTips: (options.items && options.items.F_PlanTitps) || ''
      });

      var area = options.area || ['600px', '400px'];
      var isMobile = !!(top.layui && top.layui.miniAdmin && top.layui.miniAdmin.checkMobile && top.layui.miniAdmin.checkMobile());
      if (isMobile) area = ['100%', '100%'];
      var index = layer.open({
        type: 1,
        area: area,
        title: options.title || false,
        closeBtn: isMobile ? 0 : 1,
        content: html,
        btn: ['重置', self.dialogState.options.items.F_ButtonName, '取消'],
        success: function (layero) {
          var dialogState = self.dialogState;
          form.render(null, dialogState.id);
          bindOpDropdown(layero, dialogState);
          renderFieldControls(layero, dialogState);
          // 包含、排除时会把中文逗号 ， 和顿号 、 自动换成英文逗号
          layero.on('input', '.field-control-host input', function () {
            var op = $(this).closest('.layui-popupsearch-block').find('input[name^="op_"]').val();
            if (op !== 'in' && op !== 'not in') return;
            var n = toEnComma(this.value);
            if (n !== this.value) this.value = n;
          });

          layero.find('.popupsearch-tip-close').on('click', function (e) {
            e.stopPropagation();
            $(this).closest('.popupsearch-tip').slideUp(180, function () { $(this).remove(); });
          }).on('mouseenter', function () {
            $(this).css('color', '#ff7e5f');
          }).on('mouseleave', function () {
            $(this).css('color', '#b8a090');
          });

          var $schemeInput = layero.find('.popupsearch-scheme-input');
          var $schemePanel = layero.find('.popupsearch-scheme-panel');
          var schemes = dialogState.schemes;

          $schemeInput.on('click', function (e) { e.stopPropagation(); $schemePanel.toggle(); });
          layero.find('.popupsearch-scheme-arrow').on('click', function (e) {
            e.stopPropagation();
            $schemePanel.toggle();
          });
          $schemePanel.on('click', function (e) { e.stopPropagation(); });

          $schemePanel.on('click', '.popupsearch-scheme-item', function () {
            var value = $(this).data('value');
            $schemeInput.val($(this).find('.popupsearch-scheme-text').text()).attr('data-value', value);
            $schemePanel.hide();
            var selected = schemes.filter(function (p) { return p.F_Id == value; })[0];
            if (!selected || !selected.F_PlanFields) return;
            JSON.parse(selected.F_PlanFields).forEach(function (item) {
              applySchemeField(layero, dialogState, item, value);
            });
          });

          $schemePanel.on('click', '.popupsearch-scheme-del', function (e) {
            e.stopPropagation();
            var $item = $(this).closest('.popupsearch-scheme-item');
            var value = $item.data('value');
            var idx = schemes.findIndex(function (p) { return p.F_Id == value; });
            if (schemes[idx].F_CreatorUserId != currentUser.F_Id && schemes[idx].F_IsPublic == 1) {
              common.modalMsg('只有创建人才能删除该历史记录！', 'warnning');
              return;
            }
            common.modalConfirm('注：您确定要删除该历史记录吗？', function (r) {
              if (!r) return;
              if (idx > -1) schemes.splice(idx, 1);
              var F_PlanHistory = schemes.map(function (p) {
                return {
                  F_Id: p.F_Id,
                  F_SearchName: p.F_SearchName,
                  F_IsPublic: p.F_IsPublic,
                  F_PlanFields: p.F_PlanFields
                };
              });
              syncAjax('/SystemManage/ModulePlan/SubmitForm', {
                keyValue: options.items.F_Id,
                F_PlanHistory: JSON.stringify(F_PlanHistory)
              }, 'Post');
              dialogState.options.items.F_PlanHistory = JSON.stringify(F_PlanHistory);
              $item.remove();
            });
          });

          $(document).off('click.popupsearch-scheme').on('click.popupsearch-scheme', function () {
            $schemePanel.hide();
          });

          layero.find('input[name="saveplan"]').each(function () {
            $(this).next('.layui-form-radio').attr('title', $(this).attr('data-tip') || '');
          });

          form.render('checkbox', dialogState.id);
          var $as = layero.find('.layui-layer-btn a');
          $as.eq(0).removeClass('layui-layer-btn0').css({ backgroundColor: '#16b777', borderColor: '#16b777', color: '#fff' });
          $as.eq(1).addClass('layui-layer-btn0');
        },
        yes: function (index, layero) {
          resetDialog(layero, self.dialogState);
          return false;
        },
        btn2: function (index, layero) {
          var verifyElems = layero.find('form').find('[lay-verify]').filter(function () {
            return !$(this).is(':disabled');
          });
          if (!form.validate(verifyElems)) return false;
          if (typeof options.onSearch === 'function'
            && options.onSearch(getAllValues(layero, self.dialogState), self.dialogState.options.items, index) === false) {
            return false;
          }
        },
        btn3: function (index) {
          layer.close(index);
          if (typeof options.onCancel === 'function') options.onCancel();
          return false;
        },
        end: function () {
          var controls = self.dialogState && self.dialogState.controls;
          if (controls) {
            Object.keys(controls).forEach(function (key) {
              var c = controls[key];
              if (c && c.destroy) c.destroy();
            });
            self.dialogState.controls = {};
          }
          $('.soul-bf-type').remove();
          self.destroyListeners();
        }
      });

      if (!isMobile) layer.style(index, { borderRadius: '10px' });
    },
    destroyListeners: function () {
      $(document)
        .off('click.popupsearch-drop')
        .off('click.popupsearch-dropdown-li')
        .off('click.popupsearch-type')
        .off('mousedown.popupsearch-type')
        .off('click.popupsearch-scheme');
    }
  };

  exports(MOD_NAME, {
    render: PopupSearch.render.bind(PopupSearch)
  });
});
