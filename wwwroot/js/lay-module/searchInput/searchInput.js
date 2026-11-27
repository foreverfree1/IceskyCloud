/*
 * Name: searchInput
 * Author: rutine@163.com
 * Project: https://github.com/rutine/searchInput
 * render 返回实例：getValue() / setValue(v) / update(patch)
 */
(function (define) {
  define(['jquery'], function ($) {
    "use strict";

    class Class {
      options = {
        elem: '.search-tag-input',
        data: [],
        width: '', // 输入框宽度，数字按 px，也可传 '240px'、'50%'
        height: '', // 输入框高度，写法同 width
        searchBtn: false, // 为 true 时在输入框旁显示搜索按钮
        keyNum: {
          remove: 8, //删除按键编号 默认，BackSpace 键
          create: 13 //创建按键编号 默认，Enter 键
        }
      };

      get elem() {
        return $(this.options.elem);
      }
      get copyData() {
        return [...this.options.data];
      }
      constructor(options) {
        this.render(options);
      }

      render(options) {
        this.init(options);
        this.on();
      }

      init(options) {
        var that = this;
        var select = '';
        this.options = $.extend(this.options, options);
        !this.elem.attr('placeholder') && this.elem.attr('placeholder', '请输入关键词');

        select += '<div class="search-tag-select">';
        select += '<dl class="layui-anim layui-anim-upbit">';
        select += this.options.title ? '<dt>' + this.options.title + '</dt>' : '';
        $.each(this.options.data, function (index, item) {
          select += '<dd lay-value="' + item.field + '">' + item.name + '</dd>';
        });
        select += '</dl>';
        select += '</div>';

        this.elem.after(select);
        // 修改内容：按钮插在输入框后面，并记住这个按钮，避免后面绑错
        if (this.options.searchBtn) {
          this.$btn = $('<button type="button" class="layui-btn layui-btn-primary search-tag-btn"><i class="layui-icon">&#xe615;</i> 搜 索</button>');
          this.elem.parent().after(this.$btn);
        }
        this.applySize();
      }

      // 数字补 px，字符串原样用
      sizeCss(val) {
        if (val == null || val === '') return '';
        return /^\d+(\.\d+)?$/.test(String(val)) ? val + 'px' : String(val);
      }

      // 外部传入的宽高写到容器上，没传就用样式表里的默认值
      applySize() {
        var $box = this.elem.parent();
        var width = this.sizeCss(this.options.width);
        var height = this.sizeCss(this.options.height);
        if (width) $box.css('--search-input-width', width);
        if (height) {
          $box.css('--search-input-height', height);
          $box.next('.search-tag-btn').css({ height: height, lineHeight: height });
        }
      }

      on() {
        var that = this;

        this.elem.parent().on('click', function (event) {
          // 修改内容：点搜索按钮、下拉项时不在这里处理
          if ($(event.target).closest('.search-tag-btn, .search-tag-select').length) return;

          // 点输入文字区域只聚焦；点边框、空白和字段标签则打开选择框
          if (event.target !== that.elem[0]) {
            event.preventDefault();
            that.selectTag(false);
          }
          that.elem.focus();
        });
        // 修改内容：直接绑在创建出来的按钮上，点击一定进 doSearch
        if (this.$btn && this.$btn.length) {
          this.$btn.on('click', function (event) {
            event.preventDefault();
            that.doSearch('click');
          });
        }
        this.elem.on('change', function (event) {
          if (that.elem.val().trim()) {
            that.selectTag(true);
          }
        });
        this.elem.parent().on('click', 'span span', function (event) {
          event.preventDefault();
          that.selectTag(false);
        });
        this.elem.parent().on('click', 'dd', function (event) {
          event.preventDefault();
          that.createTag($(this).text());
          that.elem.attr('name', $(this).attr('lay-value')).focus();
          that.markCurrent();
          that.closeSelect();
        });
        // 修改内容：点选择框和输入框以外的地方就收起
        if (!$(document).data('searchInput-outside')) {
          $(document).on('mousedown.searchInput', function (event) {
            if ($(event.target).closest('.search-tag-container, .search-tag-select').length) return;
            $('.search-tag-select').removeClass('search-tag-selected');
          });
          $(document).data('searchInput-outside', 1);
        }
        this.elem.keydown(function (event) {
          var keyNum = (event.keyCode ? event.keyCode : event.which);
          var inputValue = that.elem.val().trim();
          if (keyNum === that.options.keyNum.create) {
            event.preventDefault();
            // 修改内容：已经选了字段时，回车直接搜索；否则仍弹出字段列表
            if (that.elem.parent().find('span.search-tag').length) {
              that.doSearch('enter');
              return;
            }
            if (inputValue) that.selectTag(true);
          }
        });
      }

      selectTag(check) {
        if (check && this.elem.parent().find('span.search-tag').length) {
          return false;
        }
        var $select = this.elem.parent().find('.search-tag-select');
        if ($select.hasClass('search-tag-selected')) {
          return true;
        }

        $select.addClass('search-tag-selected');
        this.markCurrent();
        return true;
      }

      closeSelect() {
        this.elem.parent().find('.search-tag-select').removeClass('search-tag-selected');
      }

      // 高亮当前字段，标题不算选中项
      markCurrent() {
        var name = this.elem.attr('name');
        var text = $.trim(this.elem.parent().find('span.search-tag span').first().text());
        var $dds = this.elem.parent().find('.search-tag-select dd').removeClass('search-tag-this');
        var $cur = $dds.filter(function () { return $(this).attr('lay-value') === String(name == null ? '' : name); });
        if (!$cur.length && text) {
          $cur = $dds.filter(function () { return $(this).text() === text; });
        }
        $cur.first().addClass('search-tag-this');
      }

      createTag(value) {
        if (this.options.beforeCreate && typeof this.options.beforeCreate === 'function') {
          var modifiedValue = this.options.beforeCreate(this.copyData, value);
          if (typeof modifiedValue == 'string' && modifiedValue) {
            value = modifiedValue;
          } else {
            value = '';
          }
        }

        if (value) {
          this.removeTag(this.elem.parent().find('span.search-tag'));
          this.elem.before('<span class="search-tag search-anim-fadein search-bg-green"><span>' + value + '</span></span>');
          this.onChange(value, 'create');
        }
      }

      removeTag(target) {
        target && target.remove();
      }

      onChange(value, type) {
        this.options.onChange && typeof this.options.onChange === 'function' && this.options.onChange(this.copyData, value, type);
      }

      // 搜索：trigger 为 enter（回车）或 click（点搜索按钮）
      doSearch(trigger) {
        if (typeof this.options.onSearch !== 'function') return;
        var keyword = $.trim(this.elem.val());

        this.elem.parent().find('.search-tag-select').removeClass('search-tag-selected');
        this.options.onSearch(this.elem.attr('name') || '', keyword, trigger || '');
      }

      getData() {
        return this.copyData;
      }

      clearTag() {
        this.elem.prevAll('span.search-tag').remove();
      }

      getValue() {
        return $.trim(this.elem.val() || '');
      }

      setValue(v) {
        this.elem.val(v == null ? '' : String(v));
        return this;
      }

      update(patch) {
        if (!patch) return this;
        $.extend(this.options, patch);
        if (patch.placeholder != null) this.elem.attr('placeholder', patch.placeholder);
        if (patch.width != null || patch.height != null) this.applySize();
        if (patch.name != null) this.elem.attr('name', patch.name);
        if (patch.data) {
          var $dl = this.elem.parent().find('.search-tag-select dl');
          var html = this.options.title ? '<dt>' + this.options.title + '</dt>' : '';
          $.each(this.options.data, function (index, item) {
            html += '<dd lay-value="' + item.field + '">' + item.name + '</dd>';
          });
          $dl.html(html);
        }
        if (patch.value != null) this.setValue(patch.value);
        return this;
      }
    }

    return {
      render(options) {
        return new Class(options);
      }
    }
  });
}(typeof define === 'function' && define.amd ? define : function (deps, factory) {
  var MOD_NAME = 'searchInput';
  if (typeof module !== 'undefined' && module.exports) { //Node
    module.exports = factory(require('jquery'));
  } else if (window.layui && layui.define) {
    layui.define('jquery', function (exports) { //layui加载
      // 组件自己带上样式，页面不用再写 link
      var filePath = layui.cache.modules[MOD_NAME].substr(0, layui.cache.modules[MOD_NAME].lastIndexOf('/'));
      layui.link(filePath + '/searchInput.css');
      exports(MOD_NAME, factory(layui.jquery));
    });
  } else {
    window[MOD_NAME] = factory(window.jQuery);
  }
}));