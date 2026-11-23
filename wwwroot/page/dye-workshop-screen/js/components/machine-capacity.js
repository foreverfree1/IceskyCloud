// 创建的新文件：克重/吨位组件
// 用法：
//   MachineCapacity.render({ text: '2T 1000KG' })
//   MachineCapacity.mount(el, { text: '2T 1000KG' })
(function (global) {
  'use strict';

  var esc = function (s) {
    return (global.DyeScreenUtil && global.DyeScreenUtil.escapeHtml)
      ? global.DyeScreenUtil.escapeHtml(s)
      : String(s == null ? '' : s);
  };

  /**
   * @param {Object} opts
   * @param {string} opts.text  克重文案，如 2T 1000KG
   * @returns {string} HTML
   */
  function render(opts) {
    opts = opts || {};
    var text = opts.text == null ? '' : String(opts.text);
    return (
      '<div class="machine__cap">' +
      '<span class="machine__cap-text">' + esc(text) + '</span>' +
      '</div>'
    );
  }

  function mount(el, opts) {
    if (!el) return;
    el.innerHTML = render(opts);
  }

  global.MachineCapacity = {
    render: render,
    mount: mount
  };
})(window);
