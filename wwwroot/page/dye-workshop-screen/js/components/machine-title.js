// 创建的新文件：机台标题组件
// 用法：
//   MachineTitle.render({ name: '[207 2p#气液缸]' })
//   MachineTitle.mount(document.getElementById('box'), { name: '...' })
(function (global) {
  'use strict';

  var esc = function (s) {
    return (global.DyeScreenUtil && global.DyeScreenUtil.escapeHtml)
      ? global.DyeScreenUtil.escapeHtml(s)
      : String(s == null ? '' : s);
  };

  // 两侧装饰条（与样式 .deco 配套）
  function decoHtml(side) {
    return (
      '<div class="deco deco--' + side + '" aria-hidden="true">' +
      '<div class="deco__bars"><i class="deco__bar"></i><i class="deco__bar"></i><i class="deco__bar"></i></div>' +
      '<div class="deco__arrow"><span class="deco__outline"></span><span class="deco__tip"></span></div>' +
      '</div>'
    );
  }

  /**
   * @param {Object} opts
   * @param {string} opts.name  机台名称，如 [207 2p#气液缸]
   * @returns {string} HTML
   */
  function render(opts) {
    opts = opts || {};
    var name = opts.name == null ? '' : String(opts.name);
    return (
      '<div class="machine__head">' +
      decoHtml('left') +
      '<div class="machine__name" title="' + esc(name) + '">' + esc(name) + '</div>' +
      decoHtml('right') +
      '</div>'
    );
  }

  /** 直接渲染到目标节点 */
  function mount(el, opts) {
    if (!el) return;
    el.innerHTML = render(opts);
  }

  global.MachineTitle = {
    render: render,
    mount: mount
  };
})(window);
