/**
 * IceskyCloud · layui 组件补丁入口
 * 修改时间：2026.8.22
 *
 * 官方组件仍用 wwwroot/lib/layui-v2.13.9，升级框架时不要改官方源码。
 * 业务补丁写在 wwwroot/js/layui/ 下，按组件拆文件。
 */
layui.define(['iceskyTable'], function (exports) {
  exports('iceskyLayui', {
    patched: ['table']
  });
});
