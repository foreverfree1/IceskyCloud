// 创建的新文件：样布任务卡片组件
// 用法：
//   TaskCard.render({
//     cardNo: 'H18186217',
//     swatchColor: '#6b2d6b',
//     fields: {
//       batchCardNo: 'H1818622/H1818623',
//       starStatus: '*****',
//       customer: '666',
//       productName: '819',
//       color: 'H1NTR010480/15#咖啡E',
//       shade: '浅中',
//       pieces: '40',
//       weight: '1295.6KG',
//       theoryTime: '20260411/12:00',
//       actualTime: '20260411/12:00',
//       overtime: '20260411/12:00',
//       step: '等待染色'
//     }
//   })
//   TaskCard.render(null)  // 空卡占位
//   TaskCard.mount(el, data)
(function (global) {
  'use strict';

  var esc = function (s) {
    return (global.DyeScreenUtil && global.DyeScreenUtil.escapeHtml)
      ? global.DyeScreenUtil.escapeHtml(s)
      : String(s == null ? '' : s);
  };

  // 默认行配置：key 对应 fields 里的字段名
  var DEFAULT_ROWS = [
    { key: 'batchCardNo', label: '拼缸卡号' },
    { key: 'starStatus', label: '状态' },
    { key: 'customer', label: '客户' },
    { key: 'productName', label: '品名' },
    { key: 'color', label: '颜色', italic: true },
    { key: 'shade', label: '深浅度色相' },
    { key: 'pieces', label: '匹数' },
    { key: 'weight', label: '重量' },
    { key: 'theoryTime', label: '理论时间' },
    { key: 'actualTime', label: '实际时间' },
    { key: 'overtime', label: '超时时间' },
    { key: 'step', label: '当前步骤' }
  ];

  function renderRows(fields, rows) {
    fields = fields || {};
    rows = rows || DEFAULT_ROWS;
    return rows.map(function (item) {
      var val = fields[item.key];
      var text = val == null || val === '' ? '--' : val;
      var valueClass = 'row__value' + (item.italic ? ' row__value--italic' : '');
      return (
        '<div class="row">' +
        '<span class="row__dot"></span>' +
        '<span class="row__label">' + esc(item.label) + '</span>' +
        '<span class="' + valueClass + '" title="' + esc(text) + '">' + esc(text) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  /**
   * @param {Object|null} data  传 null / undefined 渲染空卡
   * @param {string} [data.cardNo]       顶栏卡号
   * @param {string} [data.swatchColor]  样布色块颜色
   * @param {Object} [data.fields]       行字段对象
   * @param {Array}  [data.rows]         可选，自定义行配置 [{key,label,italic?}]
   * @returns {string} HTML
   */
  function render(data) {
    if (!data) {
      return '<div class="card card--empty"><div class="card__body"></div></div>';
    }
    var fields = data.fields || {};
    // 兼容：卡号可写在 data.cardNo，也可写在 fields.cardNo
    var cardNo = data.cardNo || fields.cardNo || '--';
    var color = data.swatchColor || '#555';
    return (
      '<div class="card">' +
      '<div class="card__head">' +
      '<span class="card__no">卡号：' + esc(cardNo) + '</span>' +
      '<span class="card__swatch" style="background:' + esc(color) + '" title="样布色"></span>' +
      '</div>' +
      '<div class="card__body">' +
      '<div class="card__rows">' + renderRows(fields, data.rows) + '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function mount(el, data) {
    if (!el) return;
    el.innerHTML = render(data);
  }

  global.TaskCard = {
    render: render,
    mount: mount,
    DEFAULT_ROWS: DEFAULT_ROWS
  };
})(window);
