/*
================================================================================
commonChart 使用说明（导出方法：render）

layui.use(['commonChart'], function () {
    var chart = layui.commonChart.render({
        elem: '#chart',
        type: 'line',            // line | bar | pie
        title: '入库趋势',
        xAxis: ['1月', '2月'],
        series: [{ name: '入库', data: [10, 20] }]
    });
    // 饼图：data: [{ name: 'A', value: 10 }]
    // 完整配置：option: { ...echarts option }
    // 返回 api：instance / setOption / setData / resize / destroy
});
================================================================================
*/
layui.define(['jquery', 'echarts'], function (exports) {
    var $ = layui.$;
    var echarts = layui.echarts;

    var commonChart = {
        _cache: {},
        _resized: false,
        palettes: ['#2289ed', '#14ac9b', '#c58a36', '#7e65ca', '#d97363', '#4b87ca'],
        domOf: function (elem) {
            if (!elem) return null;
            if (typeof elem === 'string') return document.querySelector(elem);
            return elem.jquery ? elem[0] : elem;
        },
        buildOption: function (opts) {
            if (opts.option) return $.extend(true, {}, opts.option);
            var type = opts.type || 'line';
            var option = {
                color: this.palettes,
                tooltip: { trigger: type === 'pie' ? 'item' : 'axis' },
                grid: { left: 48, right: 20, top: opts.title ? 40 : 24, bottom: 32 }
            };
            if (opts.title) option.title = { text: opts.title, left: 0, textStyle: { fontSize: 14, fontWeight: 600, color: '#334965' } };
            if (type === 'pie') {
                var pieData = opts.data || [];
                option.legend = { bottom: 0, data: pieData.map(function (d) { return d.name; }) };
                option.series = [{
                    type: 'pie',
                    name: opts.title || '',
                    radius: opts.radius || ['42%', '68%'],
                    center: ['50%', '46%'],
                    data: pieData,
                    label: { formatter: '{b} {d}%' }
                }];
                return option;
            }
            var seriesList = (opts.series || []).map(function (s) {
                return $.extend({
                    type: type,
                    name: s.name || '',
                    data: s.data || [],
                    smooth: type === 'line' && opts.smooth !== false,
                    barMaxWidth: 28
                }, s);
            });
            option.legend = { data: seriesList.map(function (s) { return s.name; }) };
            if (opts.horizontal) {
                option.xAxis = { type: 'value' };
                option.yAxis = { type: 'category', data: opts.xAxis || [] };
            } else {
                option.xAxis = { type: 'category', data: opts.xAxis || [], boundaryGap: type === 'bar' };
                option.yAxis = { type: 'value' };
            }
            option.series = seriesList;
            return option;
        },
        bindResize: function () {
            if (this._resized) return;
            this._resized = true;
            var self = this;
            window.addEventListener('resize', function () {
                Object.keys(self._cache).forEach(function (k) {
                    if (self._cache[k] && self._cache[k].instance) self._cache[k].instance.resize();
                });
            });
        },
        render: function (opts) {
            opts = opts || {};
            var dom = this.domOf(opts.elem);
            if (!dom) return null;
            if (opts.height) $(dom).css('height', typeof opts.height === 'number' ? opts.height + 'px' : opts.height);
            if (!dom.style.height && !$(dom).height()) $(dom).css('height', '260px');
            if (!dom.id) dom.id = 'commonChart_' + Date.now();
            var key = '#' + dom.id;
            if (this._cache[key] && this._cache[key].instance) this._cache[key].instance.dispose();
            var instance = echarts.init(dom, opts.theme || undefined);
            instance.setOption(this.buildOption(opts), true);
            if (typeof opts.onClick === 'function') instance.on('click', opts.onClick);
            this.bindResize();
            var self = this;
            var api = {
                instance: instance,
                setOption: function (option, notMerge) {
                    instance.setOption(option, notMerge !== false);
                },
                setData: function (data) {
                    var next = $.extend({}, opts);
                    if ((opts.type || 'line') === 'pie' || Array.isArray(data)) next.data = data;
                    else {
                        if (data.xAxis) next.xAxis = data.xAxis;
                        if (data.series) next.series = data.series;
                    }
                    opts = next;
                    instance.setOption(self.buildOption(next), true);
                },
                resize: function () { instance.resize(); },
                destroy: function () {
                    instance.dispose();
                    delete self._cache[key];
                }
            };
            this._cache[key] = api;
            return api;
        }
    };

    exports('commonChart', commonChart);
});
