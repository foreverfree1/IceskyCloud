/**
 * IceskyCloud · layui table 补丁
 * 修改时间：2026.8.24
 *
 * 官方源码不要改（wwwroot/lib/layui-v2.13.9）。
 * 这里只做三件事：筛选列勾选、复杂表头收起、合并格显隐。
 */
layui.define(['table', 'form', 'util'], function (exports) {
  var $ = layui.$;
  var table = layui.table;
  var form = layui.form;
  var util = layui.util;

  var HIDE = 'layui-hide';
  var VIEW = 'layui-table-view';
  var TOOL_PANEL = 'layui-table-tool-panel';

  /** 表格容器：排序重渲后旧节点会失效，必须现查 */
  function findView(id, config) {
    var $view = $('.' + VIEW + '[lay-table-id="' + id + '"]');
    if ($view.length) return $view;
    if (config && config.elem) return $(config.elem).next('.' + VIEW);
    return $();
  }

  /** data-key 形如 2-0-3，排序后前缀会变，后两段（行列）不变 */
  function keyTail(key) {
    var parts = String(key == null ? '' : key).split('-');
    return parts.length >= 2 ? parts.slice(-2).join('-') : '';
  }

  /** 按 key（含旧 key）或 field 找格子 */
  function findCells($root, key, field) {
    var $els = key ? $root.find('[data-key="' + key + '"]') : $();
    var tail = keyTail(key);
    if (!$els.length && tail) $els = $root.find('[data-key$="-' + tail + '"]');
    if (!$els.length && field) $els = $root.find('[data-field="' + field + '"]');
    return $els;
  }

  var api = {
    // ---------- 实例 ----------
    refresh: function () {
      var $view = findView(this.id, this.config);
      if ($view.length) this.elem = $view;
      var config = table.getOptions(this.id);
      if (config) {
        this.config = config;
        this.index = config.index;
      }
      return this;
    },

    col: function (key) {
      try {
        var parts = String(key).split('-');
        return this.config.cols[parts[1]][parts[2]] || {};
      } catch (e) {
        return {};
      }
    },

    eachCols: function (callback) {
      table.eachCols(null, callback, this.config.cols);
      return this;
    },

    eachConfigCol: function (callback) {
      var that = this;
      layui.each(that.config.cols, function (i, row) {
        layui.each(row, function (j, item) {
          if (item) callback.call(that, item);
        });
      });
    },

    isFilterCol: function (col) {
      return !!(col && col.field && col.type === 'normal');
    },

    // ---------- 找列（排序后 key 会变，优先用 field） ----------
    keyByField: function (field) {
      var found = '';
      if (!field) return found;
      this.eachCols(function (i, col) {
        if (col && col.field === field && col.key) found = col.key;
      });
      return found;
    },

    sameKey: function (a, b) {
      if (a == null || b == null) return false;
      a = String(a);
      b = String(b);
      return a === b || (this.index + '-' + a) === b || a === (this.index + '-' + b);
    },

    resolveKey: function (key, field) {
      var byField = this.keyByField(field);
      if (byField) return byField;

      var col = this.col(key);
      if (col && col.key) return key;

      var found = key;
      var tail = keyTail(key);
      this.eachConfigCol(function (item) {
        if (!item.key) return;
        if (this.sameKey(item.key, key)) found = item.key;
        else if (tail && String(item.key).slice(-(tail.length + 1)) === '-' + tail) found = item.key;
      });
      return found;
    },

    findHeaderTh: function (key, field) {
      this.refresh();
      var $head = this.elem.find('.layui-table-box > .layui-table-header');
      if (!$head.length) $head = this.elem.find('.layui-table-header').first();
      var $th = findCells($head, key, field).filter('th').first();
      return $th.length ? $th : this.elem.find('th[data-key="' + key + '"]').first();
    },

    // ---------- 显隐 ----------
    /** 以表头 DOM 为准；找不到就当显示，避免勾选全空 */
    isColHidden: function (key, field) {
      var $th = this.findHeaderTh(key, field);
      return $th.length ? $th.hasClass(HIDE) : false;
    },

    setColVisible: function (key, hide, field) {
      this.refresh();
      var $els = findCells(this.elem, key, field);
      if (hide) $els.addClass(HIDE);
      else $els.not('.soul-merge-hide').removeClass(HIDE);
      this.elem.find('td.soul-merge-hide').addClass(HIDE);
    },

    setColHide: function (key, hide, field) {
      this.refresh();
      key = this.resolveKey(key, field);
      var col = this.col(key);
      if (col && col.key) {
        col.hide = hide;
      } else {
        this.eachConfigCol(function (item) {
          if (this.sameKey(item.key, key)) item.hide = hide;
        });
      }
      this.setColVisible(key, hide, field || (col && col.field));
    },

    // ---------- 复杂表头：子列全藏时收起父表头 ----------
    applyGroupTh: function ($th, visibleCount) {
      if (!$th || !$th.length) return;
      $th.attr('colspan', visibleCount || 1);
      $th[visibleCount ? 'removeClass' : 'addClass'](HIDE);
    },

    syncGroupHeadersFromDom: function () {
      var that = this;
      that.elem.find('.layui-table-header table').each(function () {
        var $head = $(this);
        $head.find('th[data-key]').each(function () {
          var $th = $(this);
          var $children = $head.find('th[data-parentkey="' + $th.attr('data-key') + '"]');
          if (!$children.length) return;
          var visibleCount = $children.filter(function () {
            return !$(this).hasClass(HIDE);
          }).length;
          that.applyGroupTh($th, visibleCount);
        });
      });
    },

    syncGroupHeadersFromCols: function () {
      var that = this;
      var cols = that.config.cols;
      if (!cols || cols.length < 2) return;

      layui.each(cols, function (rowIndex, row) {
        if (rowIndex === cols.length - 1) return;
        var nextRow = cols[rowIndex + 1] || [];
        var cursor = 0;

        layui.each(row, function (i, parent) {
          if (!parent || !(parent.colGroup || parent.colspan > 1)) return;

          var kids = [];
          layui.each(nextRow, function (k, child) {
            if (child && child.parentKey === parent.key) kids.push(child);
          });
          if (!kids.length) {
            var n = parseInt(parent.colspan, 10) || 1;
            while (kids.length < n && cursor < nextRow.length) kids.push(nextRow[cursor++]);
          }

          var visibleCount = 0;
          layui.each(kids, function (k, child) {
            if (child && !child.hide) visibleCount++;
          });
          parent.hide = visibleCount < 1;
          parent.colspan2 = visibleCount;
          that.applyGroupTh(that.elem.find('th[data-key="' + parent.key + '"]'), visibleCount);
        });
      });
    },

    syncGroupHeaders: function () {
      this.syncGroupHeadersFromDom();
      this.syncGroupHeadersFromCols();
    },

    afterColVisibleChange: function () {
      this.syncGroupHeaders();
      table.resize(this.id);
      this.syncGroupHeaders();
    },

    // ---------- 筛选面板 ----------
    setCheckboxSkin: function ($input, checked) {
      $input.prop('checked', checked);
      $input.next('.layui-form-checkbox')[checked ? 'addClass' : 'removeClass']('layui-form-checked');
    },

    syncCheckAll: function ($items, $all) {
      var allOn = $items.length > 0 && $items.filter(':not(:checked)').length === 0;
      this.setCheckboxSkin($all, allOn);
    },

    panelItems: function () {
      return $('.' + TOOL_PANEL + ' li input[data-key!="all"]');
    },

    panelCheckAll: function () {
      return $('.' + TOOL_PANEL + ' li input[data-key="all"]');
    },

    /** 工具栏筛选列 HTML，勾选看表头实际显隐 */
    buildColsFilterHtml: function () {
      var that = this;
      var allChecked = true;
      var lis = [];

      that.eachCols(function (i, item) {
        if (!that.isFilterCol(item)) return;
        var isHide = that.isColHidden(item.key, item.field);
        var realCol = that.col(item.key);
        if (realCol && realCol.key) realCol.hide = isHide;
        if (isHide) allChecked = false;

        var title = util.escape($('<div>' + (item.fieldTitle || item.title || item.field) + '</div>').text());
        lis.push(
          '<li><input type="checkbox" name="' + item.field +
          '" data-key="' + item.key +
          '" data-parentkey="' + (item.parentKey || '') +
          '" lay-skin="primary" ' + (isHide ? '' : 'checked') +
          ' title="' + title +
          '" lay-filter="LAY_TABLE_TOOL_COLS"></li>'
        );
      });

      lis.unshift(
        '<li><input type="checkbox" name="all" data-key="all" data-parentkey lay-skin="primary" ' +
        (allChecked ? 'checked' : '') + ' title="全选/不选" lay-filter="LAY_TABLE_TOOL_COLS"></li>'
      );
      return lis.join('');
    },

    setOneFilterCol: function (key, checked, field) {
      this.setColHide(key, !checked, field);
      this.syncCheckAll(this.panelItems().not(':disabled'), this.panelCheckAll());
    },

    setAllFilterCols: function (checked) {
      var that = this;
      that.eachCols(function (i, col) {
        if (that.isFilterCol(col)) that.setColHide(col.key, !checked, col.field);
      });
      that.panelItems().each(function () {
        that.setCheckboxSkin($(this), checked);
      });
    }
  };

  table.getThisTable = function (id) {
    var config = table.getOptions(id);
    if (!config) return null;
    var that = Object.create(api);
    that.id = id;
    that.config = config;
    that.index = config.index;
    that.elem = findView(id, config);
    return that;
  };

  // ---------- 挂到官方 table：工具栏筛选列 ----------
  function bindToolColsOnce() {
    if (table._iceskyColsBound) return;
    table._iceskyColsBound = true;
    form.on('checkbox(LAY_TABLE_TOOL_COLS)', function (evt) {
      var $input = $(evt.elem);
      var id = $input.closest('.' + VIEW).attr('lay-table-id');
      var that = id ? table.getThisTable(id) : null;
      if (!that) return;
      var key = $input.attr('data-key') || $input.data('key');
      if (key === 'all') that.setAllFilterCols(this.checked);
      else that.setOneFilterCol(key, this.checked, $input.attr('name'));
      that.afterColVisibleChange();
    });
  }

  function hookToolbar(id) {
    var options = table.getOptions(id);
    if (!options || !options.defaultToolbar) return;
    layui.each(options.defaultToolbar, function (i, item) {
      if (!item || item.layEvent !== 'LAYTABLE_COLS') return;
      var next = $.extend({}, item);
      next.onClick = function (obj) {
        var tid = (obj.config && obj.config.id) || id;
        var that = table.getThisTable(tid);
        if (!that) return;
        obj.openPanel({
          list: that.buildColsFilterHtml(),
          done: bindToolColsOnce
        });
      };
      options.defaultToolbar[i] = next;
    });
  }

  function hookSplitBtns(id) {
    var options = table.getOptions(id);
    var $self = findView(id, options).find('.layui-table-tool-self');
    $self.find('.layui-table-tool-split').remove();
    layui.each(options && options.defaultToolbar, function (i, item) {
      if (!item || !item.split) return;
      var $host = $self.children('[lay-event="' + item.layEvent + '"]');
      if (!$host.length) return;
      $host.after($('<div class="layui-inline layui-table-tool-split"><i class="layui-icon ' + (item.split.icon || 'layui-icon-down') + '"></i></div>').on('click', function (e) {
        e.stopPropagation();
        item.split.onClick && item.split.onClick({ elem: this, config: options });
      }));
    });
  }

  function afterTableReady(id) {
    if (!id) return;
    hookToolbar(id);
    setTimeout(function () {
      hookToolbar(id);
      hookSplitBtns(id);
    }, 0);
  }

  function wrap(name) {
    var orig = table[name];
    if (!orig) return;
    table[name] = function (first) {
      var ins = orig.apply(this, arguments);
      var id = name === 'render'
        ? ((first && first.id) || (ins && ins.config && ins.config.id))
        : first;
      afterTableReady(id);
      return ins;
    };
  }

  wrap('render');
  wrap('reload');
  wrap('reloadData');

  table.hideCol = function (id, cols) {
    var that = table.getThisTable(id);
    if (!that) return;

    if (layui.type(cols) === 'boolean') {
      that.eachCols(function (i, item) {
        if (that.col(item.key).hide != cols) that.setColHide(item.key, cols, item.field);
      });
    } else {
      cols = layui.isArray(cols) ? cols : [cols];
      layui.each(cols, function (i, item) {
        that.eachCols(function (j, col) {
          if (item.field === col.field && 'hide' in item && that.col(col.key).hide != item.hide) {
            that.setColHide(col.key, !!item.hide, col.field);
          }
        });
      });
    }
    $('.' + TOOL_PANEL).remove();
    that.afterColVisibleChange();
  };

  exports('iceskyTable', table);
});
