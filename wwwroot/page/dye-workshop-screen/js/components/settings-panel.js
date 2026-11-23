// 创建的新文件：设置弹窗 — 勾选要显示的卡号
// 用法：
//   SettingsPanel.open({
//     items: [{ cardNo, machineName, machineId }],
//     selected: ['H18186217', ...],
//     onConfirm: function (cardNos) { ... }
//   })
(function (global) {
  'use strict';

  var esc = function (s) {
    return (global.DyeScreenUtil && global.DyeScreenUtil.escapeHtml)
      ? global.DyeScreenUtil.escapeHtml(s)
      : String(s == null ? '' : s);
  };

  var rootEl = null;
  var pendingConfirm = null;

  function ensureDom() {
    if (rootEl) return rootEl;
    rootEl = document.createElement('div');
    rootEl.className = 'settings-mask';
    rootEl.id = 'settingsMask';
    rootEl.hidden = true;
    rootEl.innerHTML =
      '<div class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">' +
      '  <div class="settings-dialog__head">' +
      '    <h3 id="settingsTitle" class="settings-dialog__title">显示卡号设置</h3>' +
      '    <button type="button" class="settings-dialog__close" data-act="close" aria-label="关闭">×</button>' +
      '  </div>' +
      '  <div class="settings-dialog__toolbar">' +
      '    <label class="settings-check settings-check--all">' +
      '      <input type="checkbox" id="settingsCheckAll" />' +
      '      <span>全选</span>' +
      '    </label>' +
      '    <span class="settings-dialog__hint" id="settingsCount"></span>' +
      '  </div>' +
      '  <div class="settings-dialog__body" id="settingsList"></div>' +
      '  <div class="settings-dialog__foot">' +
      '    <button type="button" class="settings-btn settings-btn--ghost" data-act="close">取消</button>' +
      '    <button type="button" class="settings-btn settings-btn--primary" data-act="ok">确定</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(rootEl);

    rootEl.addEventListener('click', function (e) {
      var t = e.target;
      if (t === rootEl) {
        close();
        return;
      }
      var act = t.getAttribute && t.getAttribute('data-act');
      if (!act && t.closest) {
        var btn = t.closest('[data-act]');
        act = btn && btn.getAttribute('data-act');
      }
      if (act === 'close') close();
      if (act === 'ok') confirm();
    });

    var checkAll = rootEl.querySelector('#settingsCheckAll');
    checkAll.addEventListener('change', function () {
      var boxes = rootEl.querySelectorAll('.settings-item__input');
      for (var i = 0; i < boxes.length; i++) {
        boxes[i].checked = checkAll.checked;
      }
      // 修改内容：同步每列（机台）全选状态
      syncGroupChecks();
      updateCount();
    });

    rootEl.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.classList) return;

      // 修改内容：某一列机台的全选
      if (t.classList.contains('settings-group__check')) {
        var group = t.closest('.settings-group');
        if (!group) return;
        var boxes = group.querySelectorAll('.settings-item__input');
        for (var i = 0; i < boxes.length; i++) {
          boxes[i].checked = t.checked;
        }
        t.indeterminate = false;
        syncCheckAll();
        updateCount();
        return;
      }

      if (t.classList.contains('settings-item__input')) {
        syncGroupChecks();
        syncCheckAll();
        updateCount();
      }
    });

    return rootEl;
  }

  function updateCount() {
    var boxes = rootEl.querySelectorAll('.settings-item__input');
    var n = 0;
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) n++;
    }
    var tip = rootEl.querySelector('#settingsCount');
    if (tip) tip.textContent = '已选 ' + n + ' / ' + boxes.length;
  }

  function syncCheckAll() {
    var boxes = rootEl.querySelectorAll('.settings-item__input');
    var checkAll = rootEl.querySelector('#settingsCheckAll');
    if (!boxes.length) {
      checkAll.checked = false;
      checkAll.indeterminate = false;
      return;
    }
    var n = 0;
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) n++;
    }
    checkAll.checked = n === boxes.length;
    checkAll.indeterminate = n > 0 && n < boxes.length;
  }

  // 修改内容：根据组内卡号勾选情况，同步每列「全选」勾选框
  function syncGroupChecks() {
    var groups = rootEl.querySelectorAll('.settings-group');
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var groupCheck = group.querySelector('.settings-group__check');
      var boxes = group.querySelectorAll('.settings-item__input');
      if (!groupCheck || !boxes.length) continue;
      var n = 0;
      for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].checked) n++;
      }
      groupCheck.checked = n === boxes.length;
      groupCheck.indeterminate = n > 0 && n < boxes.length;
    }
  }

  function buildList(items, selectedSet) {
    // 按机台分组，方便对照勾选
    var groups = {};
    var order = [];
    items.forEach(function (it) {
      var key = it.machineId || it.machineName || '_';
      if (!groups[key]) {
        groups[key] = { name: it.machineName || key, list: [] };
        order.push(key);
      }
      groups[key].list.push(it);
    });

    return order.map(function (key) {
      var g = groups[key];
      var rows = g.list.map(function (it) {
        var checked = selectedSet[it.cardNo] ? ' checked' : '';
        return (
          '<label class="settings-item">' +
          '<input class="settings-item__input" type="checkbox" value="' + esc(it.cardNo) + '"' + checked + ' />' +
          '<span class="settings-item__no">' + esc(it.cardNo) + '</span>' +
          '</label>'
        );
      }).join('');
      // 修改内容：每列（机台）标题旁增加全选
      return (
        '<div class="settings-group" data-machine="' + esc(key) + '">' +
        '<div class="settings-group__head">' +
        '<span class="settings-group__name">' + esc(g.name) + '</span>' +
        '<label class="settings-check settings-check--group">' +
        '<input class="settings-group__check" type="checkbox" />' +
        '<span>全选</span>' +
        '</label>' +
        '</div>' +
        '<div class="settings-group__list">' + rows + '</div>' +
        '</div>'
      );
    }).join('');
  }

  /**
   * @param {Object} opts
   * @param {Array<{cardNo,machineName?,machineId?}>} opts.items
   * @param {string[]} opts.selected  当前勾选的卡号
   * @param {Function} opts.onConfirm function(string[] cardNos)
   */
  function open(opts) {
    opts = opts || {};
    ensureDom();
    pendingConfirm = opts.onConfirm || null;
    var items = opts.items || [];
    var selected = opts.selected || [];
    var selectedSet = {};
    selected.forEach(function (no) { selectedSet[no] = true; });

    rootEl.querySelector('#settingsList').innerHTML = items.length
      ? buildList(items, selectedSet)
      : '<div class="settings-empty">暂无可选卡号</div>';

    syncGroupChecks();
    syncCheckAll();
    updateCount();
    rootEl.hidden = false;
  }

  function close() {
    if (!rootEl) return;
    rootEl.hidden = true;
    pendingConfirm = null;
  }

  function confirm() {
    if (!rootEl) return;
    var boxes = rootEl.querySelectorAll('.settings-item__input');
    var picked = [];
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) picked.push(boxes[i].value);
    }
    var cb = pendingConfirm;
    close();
    if (typeof cb === 'function') cb(picked);
  }

  global.SettingsPanel = {
    open: open,
    close: close
  };
})(window);
