// 修改内容：列数随勾选自适应；每列固定 3 张卡（不足补空）
(function () {
  'use strict';

  var SLOT_COUNT = 3; // 一列固定 3 行
  var REFRESH_MS = 30000;
  var STORAGE_KEY = 'dyeWorkshopScreen.selectedCardNos';
  var WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  var SWATCH_COLORS = [
    '#6b2d6b', '#1a4a8a', '#8a3a1a', '#2d6b4a',
    '#8a1a4a', '#4a2d8a', '#1a6b6b', '#6b6b1a'
  ];

  // 最近一次全量数据，供设置弹窗与筛选使用
  var latestData = { machines: [] };
  // null = 尚未配置（默认全显）；数组 = 用户勾选的卡号
  var selectedCardNos = loadSelected();

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function formatClock(d) {
    return (
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' | ' + WEEKDAYS[d.getDay()] + ' | ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
    );
  }

  function setRem() {
    var w = document.documentElement.clientWidth || 1920;
    document.documentElement.style.fontSize = Math.round(w / 20) + 'px';
  }

  function escapeHtml(str) {
    return (window.DyeScreenUtil && window.DyeScreenUtil.escapeHtml)
      ? window.DyeScreenUtil.escapeHtml(str)
      : String(str == null ? '' : str);
  }

  function loadSelected() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch (e) {
      return null;
    }
  }

  function saveSelected(list) {
    selectedCardNos = list;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  function getCardNo(slot) {
    return slot && slot.fields && slot.fields.cardNo ? String(slot.fields.cardNo) : '';
  }

  // 收集全部可选卡号（给设置弹窗）
  function collectCardItems(data) {
    var items = [];
    var machines = (data && data.machines) || [];
    machines.forEach(function (m) {
      (m.slots || []).forEach(function (slot) {
        if (!slot) return;
        var no = getCardNo(slot);
        if (!no) return;
        items.push({
          cardNo: no,
          machineId: m.id,
          machineName: m.name
        });
      });
    });
    return items;
  }

  // 按勾选过滤：列数随有卡机台变化；渲染时每列再固定补齐 3 行
  function filterMachines(machines) {
    var list = machines || [];
    // 未配置过 → 全显
    if (!selectedCardNos) return list.map(cloneMachineWithSlots);

    var allow = {};
    selectedCardNos.forEach(function (no) { allow[no] = true; });

    return list.map(function (m) {
      var slots = (m.slots || []).filter(function (s) {
        return s && allow[getCardNo(s)];
      });
      return {
        id: m.id,
        name: m.name,
        capacity: m.capacity,
        slots: slots
      };
    }).filter(function (m) {
      return m.slots.length > 0;
    });
  }

  function cloneMachineWithSlots(m) {
    return {
      id: m.id,
      name: m.name,
      capacity: m.capacity,
      slots: (m.slots || []).filter(Boolean)
    };
  }

  // 修改内容：固定补齐/截断为 3 行
  function normalizeSlots(slots) {
    var list = Array.isArray(slots) ? slots.filter(Boolean).slice(0, SLOT_COUNT) : [];
    while (list.length < SLOT_COUNT) list.push(null);
    return list;
  }

  function toCardData(slot, colorSeed) {
    if (!slot) return null;
    var fields = slot.fields || {};
    return {
      cardNo: fields.cardNo,
      swatchColor: slot.swatchColor || SWATCH_COLORS[colorSeed % SWATCH_COLORS.length],
      fields: fields
    };
  }

  function renderColumn(machine, colorSeed) {
    // 修改内容：每列固定 3 张，不足补空卡
    var slots = normalizeSlots(machine.slots);
    var cards = slots.map(function (s, i) {
      return window.TaskCard.render(toCardData(s, colorSeed + i));
    }).join('');

    return (
      '<section class="machine" data-id="' + escapeHtml(machine.id) + '">' +
      window.MachineTitle.render({ name: machine.name }) +
      window.MachineCapacity.render({ text: machine.capacity || '' }) +
      '<div class="machine__slots">' + cards + '</div>' +
      '</section>'
    );
  }

  function renderBoard(data) {
    latestData = data || { machines: [] };
    var machines = filterMachines(latestData.machines);
    var board = document.getElementById('board');
    // 列数 = 有卡片的机台数（自适应，不再写死 9）
    var cols = Math.max(machines.length, 1);
    board.style.setProperty('--cols', String(cols));
    // 修改内容：卡片字号改回固定，不再按列数缩放
    // applyCardScaleByCols(board, cols);

    if (!machines.length) {
      board.innerHTML =
        '<div class="board-empty">暂无展示卡片，请点击右上角设置勾选卡号</div>';
      return;
    }

    board.innerHTML = machines.map(function (m, i) {
      return renderColumn(m, i * 2);
    }).join('');
  }

  // 修改内容：字号改回 CSS 固定值，以下函数不再调用
  // function applyCardScaleByCols(board, cols) { ... }

  function openSettings() {
    var items = collectCardItems(latestData);
    // 弹窗默认勾选：已配置用已配置；未配置则全勾
    var selected = selectedCardNos
      ? selectedCardNos.slice()
      : items.map(function (it) { return it.cardNo; });

    window.SettingsPanel.open({
      items: items,
      selected: selected,
      onConfirm: function (cardNos) {
        saveSelected(cardNos);
        renderBoard(latestData);
      }
    });
  }

  function mockData() {
    // 修改内容：每台机固定 3 张卡（个别槽可空，渲染时仍占位）
    var steps = ['等待染色', '等待进布', '染色中', '已完成'];
    var names = [
      '[207 2p#气液缸]', '[211 2p#染色机]', '[215 2p#气液缸]',
      '[219 1p#染色机]', '[223 2p#气液缸]', '[227 2p#染色机]',
      '[231 1p#气液缸]', '[235 2p#染色机]', '[239 2p#气液缸]'
    ];
    var caps = ['2T 1000KG', '4T 2000KG', '2T 1000KG', '1T 500KG', '2T 1000KG', '4T 2000KG', '1T 500KG', '2T 1000KG', '2T 1000KG'];
    var colorTexts = [
      'H1NTR010480/15#咖啡E',
      'H2BLU020110/08#藏青A',
      'H3WHT030220/01#米白B',
      'H4GRN040330/22#墨绿C'
    ];
    var shades = ['浅中', '中深', '浅', '深'];
    var machines = names.map(function (name, i) {
      var slots = [];
      for (var s = 0; s < SLOT_COUNT; s++) {
        if (i === 4 && s === 2) {
          slots.push(null);
          continue;
        }
        var no = 18186217 + i * 10 + s;
        var t = '2026' + pad((i % 9) + 1) + pad((s % 27) + 1) + '/12:00';
        slots.push({
          statusCode: ['wait', 'run', 'dye', 'done'][(i + s) % 4],
          swatchColor: SWATCH_COLORS[(i + s) % SWATCH_COLORS.length],
          fields: {
            cardNo: 'H' + no,
            batchCardNo: 'H' + no + '/H' + (no + 1) + '/H' + (no + 1),
            starStatus: '*****',
            customer: String(600 + i * 10 + s),
            productName: String(800 + i + s),
            color: colorTexts[(i + s) % colorTexts.length],
            shade: shades[(i + s) % shades.length],
            pieces: String(20 + i * 2 + s),
            weight: (800 + i * 55.6 + s * 12).toFixed(1) + 'KG',
            theoryTime: t,
            actualTime: t,
            overtime: t,
            step: steps[(i + s) % steps.length]
          }
        });
      }
      return {
        id: 'M' + (207 + i * 4),
        name: name,
        capacity: caps[i],
        slots: slots
      };
    });
    return { machines: machines };
  }

  function fetchScreenData() {
    return Promise.resolve(mockData());
  }

  function tickClock() {
    var el = document.getElementById('clock');
    if (el) el.textContent = formatClock(new Date());
  }

  function refresh() {
    fetchScreenData().then(renderBoard).catch(function (err) {
      console.error('大屏数据加载失败', err);
    });
  }

  function init() {
    setRem();
    window.addEventListener('resize', setRem);
    tickClock();
    setInterval(tickClock, 1000);
    refresh();
    setInterval(refresh, REFRESH_MS);

    var btn = document.getElementById('btnSettings');
    if (btn) {
      btn.addEventListener('click', openSettings);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
