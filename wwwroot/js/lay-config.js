/**
 * date:2019/08/16
 * author:Mr.Chung
 * description:此处放layui自定义扩展
 */
var version;
window.rootPath = (function (src) {
    src = document.scripts[document.scripts.length - 1].src;
    //获取版本号
    version = src.substring(src.lastIndexOf("?v=") + 3, src.length);
    return src.substring(0, src.lastIndexOf("/") + 1);
})();

layui.config({
    base: rootPath + "lay-module/",
    version: version
}).extend({
    miniAdmin: "layuimini/miniAdmin", // layuimini后台扩展
    miniMenu: "layuimini/miniMenu", // layuimini菜单扩展
    miniTab: "layuimini/miniTab", // layuimini tab扩展
    miniTheme: "layuimini/miniTheme", // layuimini 主题扩展
    miniTongji: "layuimini/miniTongji", // layuimini 统计扩展
    step: 'step-lay/step', // 分步表单扩展
    tableSelect: 'tableSelect/tableSelect', // table选择扩展
    tableEdit: 'tableSelect/tableEdit', // 旧table编辑扩展
    eipTableEdit: 'tableSelect/eipTableEdit', // 新table编辑扩展
    eipTable: 'tableSelect/eipTable', // 新table编辑组件
    iconPickerFa: 'iconPicker/iconPickerFa', // fa图标选择扩展
    iconPicker: 'iconPicker/iconPicker', // fa图标选择扩展
    echarts: 'echarts/echarts', // echarts图表扩展
    wangEditor: 'wangEditor/wangEditor', // wangEditor富文本扩展
    layarea: 'layarea/layarea', //  省市县区三级联动下拉选择器
    common: 'iceskyCloud/common', //  工具类
    commonDefaults: 'iceskyCloud/commonDefaults', // 公共默认配置
    controls: 'iceskyCloud/controls', // 控件
    commonTable: 'iceskyCloud/commonTable', //  通用table
    commonForm: 'iceskyCloud/commonForm', //  通用表单
    quickSearch: 'tableSearch/quickSearch', //  通用快捷搜索（可独立）
    commonChart: 'iceskyCloud/commonChart', //  通用图表
    imageUpload: 'iceskyCloud/imageUpload', //图片上传
    // iceAiChat: 'iceskyCloud/iceAiChat', // ERP智能助手
    optimizeSelectOption: 'optimizeSelectOption/optimizeSelectOption', //  下拉框遮挡
    dtree: 'dtree/dtree', //  树形扩展
    xmSelect: 'xm-select/xm-select', //select多选扩展
    popupSearch: 'tableSearch/popupSearch', // 新popupSearch搜索扩展
    flowlayout: 'flow/flowlayout', //flow流程插件
    waterflow: 'flow/waterflow',//flow流程插件
    formDesigner: 'formDesigner/formDesigner', //表单设计器
    formField: 'formDesigner/formField', //表单设计器
    formPreview: 'formDesigner/formPreview', //表单设计器
    notice: 'notice/notice', //消息提醒
    // 修改内容：注册 iziToast 弹窗提示模块
    iziToast: 'iziToast/iziToast', // iziToast消息提示
    soulTable: 'soulTable/soulTable',//表格插件
    soulTableSlim: 'soulTable/soulTable.slim',//表格插件
    tableChild: 'soulTable/tableChild',//子表
    tableMerge: 'soulTable/tableMerge',//合并表格
    tableFilter: 'soulTable/tableFilter',//表格过滤
    excel: 'soulTable/excel',//表格导出
    cardTable: 'cardTable/cardTable',//卡片表格
    cron: 'cron/cron',//cron表达式
    numberInput: 'numberInput/numberInput',//数字输入框组件
    searchInput: 'searchInput/searchInput',//标签搜索输入框
    labelGeneration: 'labelGeneration/labelGeneration',//动态标签组件
    HandwrittenSignature: 'HandwrittenSignature/HandwrittenSignature',//签名组件
    // 业务补丁：改 layui 组件写在 js/layui/，不要改 lib/layui-v2.13.9
    // {/} 表示按绝对路径加载，不拼 base（lay-module/）
    iceskyTable: '{/}' + rootPath + 'layui/table',
    iceskyLayui: '{/}' + rootPath + 'layui/index',
});

// 页面 layui.use 到 table 相关模块时，先打补丁再进业务回调
// define() 内部也会走 use，不能再注入，否则会循环依赖
(function () {
    var origUse = layui.use;
    var needPatch = {
        table: 1,
        soulTable: 1,
        soulTableSlim: 1,
        tableFilter: 1,
        commonTable: 1,
        eipTable: 1,
        tableSelect: 1
    };
    layui.use = function (deps, callback, exports, from) {
        if (from !== 'define') {
            var list = typeof deps === 'string' ? [deps] : deps;
            if (layui.type(list) === 'array') {
                var hit = false;
                for (var i = 0; i < list.length; i++) {
                    if (needPatch[list[i]]) {
                        hit = true;
                        break;
                    }
                }
                if (hit && list.indexOf('iceskyLayui') === -1) {
                    deps = list.concat(['iceskyLayui']);
                }
            }
        }
        return origUse.call(this, deps, callback, exports, from);
    };
})();

// 一次性批量加载 moment, qrcode, JsBarcode、全局方法 并挂载到全局
[
    {
        src: rootPath + "lay-module/iceskyCloud/global.js"
    },
    {
        src: rootPath + "lay-module/moment/moment.min.js",
        onload: function () {
            window.moment = window.moment || moment;
        }
    },
    {
        src: rootPath + "lay-module/qrcode/qrcode.min.js",
        onload: function () {
            // 由于 Qrcode 可能为大写名导出
            window.QRCode = window.QRCode || QRCode || qrcode;
        }
    },
    {
        src: rootPath + "lay-module/JsBarcode/JsBarcode.all.min.js",
        onload: function () {
            window.JsBarcode = window.JsBarcode || JsBarcode;
        }
    }
].forEach(function (item) {
    var script = document.createElement('script');
    script.src = item.src;
    if (item.onload) script.onload = item.onload;
    document.head.appendChild(script);
});