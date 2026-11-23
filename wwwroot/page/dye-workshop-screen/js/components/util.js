// 创建的新文件：组件公共工具
(function (global) {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  global.DyeScreenUtil = {
    escapeHtml: escapeHtml
  };
})(window);
