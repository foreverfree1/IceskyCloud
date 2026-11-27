/**
 * layuimini tab 扩展
 * - 打开/关闭页签
 * - 刷新后恢复已打开页签（懒加载 iframe，切到再加载）
 */
layui.define(["element", "layer", "jquery"], function (exports) {
    var element = layui.element,
        layer = layui.layer,
        $ = layui.$;

    var TAB_FILTER = 'layuiminiTab';
    var STORAGE_KEY = 'layuiminiOpenTabs';
    var TITLE_COOKIE = 'layuiminimenu_list';

    var miniTab = {

        // ===================== 存储 =====================

        /** 读标题 cookie：{ url: title } */
        getTitleMap: function () {
            try {
                var prefix = TITLE_COOKIE + '=';
                var list = document.cookie.split(';');
                for (var i = 0; i < list.length; i++) {
                    var c = list[i].trim();
                    if (c.indexOf(prefix) === 0) {
                        return JSON.parse(unescape(c.substring(prefix.length))) || {};
                    }
                }
            } catch (e) { /* ignore */ }
            return {};
        },

        setTitleMap: function (map) {
            var d = new Date();
            d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
            document.cookie = TITLE_COOKIE + '=' + escape(JSON.stringify(map || {}))
                + ';path=/;expires=' + d.toGMTString();
        },

        /** 保存当前打开的页签（刷新可恢复）；保留已有 pageNav */
        saveOpenTabs: function () {
            try {
                var old = {};
                miniTab.loadOpenTabs().forEach(function (t) { if (t) old[t.tabId] = t; });
                var tabs = [];
                top.$('.layuimini-tab .layui-tab-title li').each(function () {
                    var id = $(this).attr('lay-id');
                    if (!id) return;
                    var prev = old[id] || {};
                    tabs.push({
                        tabId: id,
                        href: id,
                        title: $.trim($(this).find('span').not('.layuimini-tab-active').first().text() || ''),
                        pageNav: prev.pageNav
                    });
                });
                top.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
            } catch (e) { /* ignore */ }
        },

        /** 读取待恢复页签列表（仅 sessionStorage；关闭浏览器/重新登录后不会带回历史 tab） */
        loadOpenTabs: function () {
            try {
                return JSON.parse(top.sessionStorage.getItem(STORAGE_KEY) || '[]') || [];
            } catch (e) {
                return [];
            }
        },

        /** 清空页签缓存（退出登录 / 重新登录时调用） */
        clearOpenTabs: function () {
            try {
                top.sessionStorage.removeItem(STORAGE_KEY);
            } catch (e) { /* ignore */ }
            // 顺带清掉旧标题 cookie，避免残留
            document.cookie = TITLE_COOKIE + '=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
        },

        // ===================== 基础操作 =====================

        /** 页签是否已存在 */
        check: function (tabId, isIframe) {
            var $lis = isIframe
                ? parent.layui.$('.layui-tab-title li')
                : $('.layui-tab-title li');
            var exists = false;
            $lis.each(function () {
                if ($(this).attr('lay-id') === tabId) {
                    exists = true;
                    return false;
                }
            });
            return exists;
        },

        change: function (tabId) {
            element.tabChange(TAB_FILTER, tabId);
        },

        /**
         * 新建页签
         * options.lazy = true 时先不加载页面，切过去再加载（防卡顿）
         */
        create: function (options) {
            options = options || {};
            var tabId = options.tabId;
            var href = options.href;
            var title = options.title || tabId;
            var maxTabNum = options.maxTabNum || 20;

            if (top.$('.layuimini-tab .layui-tab-title li').length >= maxTabNum) {
                layer.msg('Tab窗口已达到限定数量，请先关闭部分Tab');
                return false;
            }
            if (!top.$('.layuimini-tab').length) {
                window.open(href, '_blank');
                return;
            }

            var ele = options.isIframe ? parent.layui.element : element;
            var src = options.lazy ? 'about:blank' : href;
            ele.tabAdd(TAB_FILTER, {
                title: '<span class="layuimini-tab-active"></span><span>' + title
                    + '</span><i class="layui-icon layui-unselect layui-tab-close">ဆ</i>',
                content: '<iframe width="100%" height="100%" frameborder="no" scrolling="auto" border="0"'
                    + ' marginwidth="0" marginheight="0" data-src="' + href + '" src="' + src + '"></iframe>',
                id: tabId
            });
            $('.layuimini-menu-left').attr('layuimini-tab-tag', 'add');

            var map = miniTab.getTitleMap();
            if (!map[tabId]) {
                map[tabId] = $.trim(title);
                miniTab.setTitleMap(map);
            }
            if (!options.skipPersist) miniTab.saveOpenTabs();
        },

        /** 删除页签 */
        delete: function (tabId, isParent) {
            $('.layuimini-tab .layui-tab-title .layui-unselect.layui-tab-bar').remove();
            if (isParent) {
                parent.layui.element.tabDelete(TAB_FILTER, tabId);
            } else {
                element.tabDelete(TAB_FILTER, tabId);
            }
            var map = miniTab.getTitleMap();
            delete map[tabId];
            miniTab.setTitleMap(map);
            miniTab.saveOpenTabs();
        },

        /** 没有则创建，再切换 */
        open: function (opts) {
            if (!miniTab.check(opts.tabId, opts.isIframe)) {
                miniTab.create(opts);
            }
            if (opts.isIframe) {
                parent.layui.element.tabChange(TAB_FILTER, opts.tabId);
            } else {
                element.tabChange(TAB_FILTER, opts.tabId);
            }
        },

        /** 当前显示页的 iframe：若是懒加载则真正加载 */
        loadActiveIframe: function () {
            var $iframe = top.$('.layuimini-tab .layui-tab-content .layui-tab-item.layui-show iframe');
            if (!$iframe.length) return;
            var dataSrc = $iframe.attr('data-src') || '';
            var src = $iframe.attr('src') || '';
            if (dataSrc && (!src || src === 'about:blank')) {
                $iframe.attr('src', dataSrc);
            }
        },

        /** 按类型关闭：all / current / other */
        closeByType: function (type, currentTabId) {
            top.$('.layuimini-tab .layui-tab-title li').each(function () {
                if ($(this).attr('id') === 'layuiminiHomeTabId') return;
                var tabId = $(this).attr('lay-id');
                var isCurrent = currentTabId
                    ? (tabId === currentTabId)
                    : $(this).hasClass('layui-this');
                if (type === 'all') {
                    miniTab.delete(tabId);
                } else if (type === 'current' && isCurrent) {
                    miniTab.delete(tabId);
                } else if (type === 'other' && !isCurrent) {
                    miniTab.delete(tabId);
                }
            });
        },

        // ===================== 刷新恢复 =====================

        /** 恢复历史页签（懒加载，不一次性打开全部页面） */
        restoreOpenTabs: function (options) {
            options = options || {};
            var homeHref = (options.homeInfo && options.homeInfo.href) || '';
            var menuList = options.menuList || [];

            miniTab.loadOpenTabs().forEach(function (item) {
                var tabId = item.tabId || item.href;
                if (!tabId || tabId === homeHref || miniTab.check(tabId)) return;

                var title = item.title;
                var menu = miniTab.searchMenu(tabId, menuList);
                if (menu && menu.title) title = menu.title;
                if (!title) title = miniTab.getTitleMap()[tabId] || tabId;

                miniTab.create({
                    tabId: tabId,
                    href: item.href || tabId,
                    title: title,
                    maxTabNum: options.maxTabNum,
                    skipPersist: true,
                    lazy: true
                });
            });

            $('.layuimini-menu-left').attr('layuimini-tab-tag', 'no');
            miniTab.saveOpenTabs();
        },

        // ===================== 初始化 =====================

        render: function (options) {
            options = options || {};
            options.filter = options.filter || TAB_FILTER;
            options.multiModule = options.multiModule || false;
            options.urlHashLocation = options.urlHashLocation || false;
            options.maxTabNum = options.maxTabNum || 20;
            options.menuList = options.menuList || [];
            options.homeInfo = options.homeInfo || {};
            options.listenSwichCallback = options.listenSwichCallback || function () { };

            miniTab.listen(options);
            miniTab.listenRoll();
            miniTab.listenSwitch(options);
            miniTab.restoreOpenTabs(options);
            miniTab.listenHash(options);
        },

        // ===================== iframe 内调用 =====================

        openNewTabByIframe: function (options) {
            var href = options.href || String(new Date().getTime());
            var tabId = href.split('?')[0];
            var loading = parent.layer.load(0, { shade: false, time: 2000 });
            miniTab.open({
                tabId: tabId,
                href: href,
                title: options.title,
                isIframe: true
            });
            parent.layer.close(loading);
        },

        deleteCurrentByIframe: function () {
            var $li = $('.layuimini-tab .layui-tab-title li.layui-this', parent.document);
            if ($li.length) miniTab.delete($li.attr('lay-id'), true);
        },

        // ===================== 右键菜单 =====================

        openTabRignMenu: function (tabId, left) {
            miniTab.closeTabRignMenu();
            var html = ''
                + '<div class="layui-unselect layui-form-select layui-form-selected layuimini-tab-mousedown layui-show" data-tab-id="' + tabId + '" style="left:' + left + 'px!important">'
                + '<dl>'
                + '<dd><a href="javascript:;" data-refresh="刷新"><i class="fa fa-refresh"></i> 刷新当前</a></dd>'
                + '<dd><a href="javascript:;" layuimini-tab-menu-close="current"><i class="fa fa-times"></i> 关闭当前</a></dd>'
                + '<dd><a href="javascript:;" layuimini-tab-menu-close="other"><i class="fa fa-ban"></i> 关闭其他</a></dd>'
                + '<dd><a href="javascript:;" layuimini-tab-menu-close="all"><i class="fa fa-times-circle"></i> 关闭全部</a></dd>'
                + '</dl></div>';
            $('.layuimini-tab .layui-tab-title').after(html);
            $('.layuimini-tab .layui-tab-content').after('<div class="layuimini-tab-make"></div>');
        },

        closeTabRignMenu: function () {
            $('.layuimini-tab-mousedown,.layuimini-tab-make').remove();
        },

        // ===================== 菜单查找 =====================

        searchMenu: function (href, menuList) {
            if (!menuList) return;
            for (var key in menuList) {
                if (!Object.prototype.hasOwnProperty.call(menuList, key)) continue;
                var item = menuList[key];
                if (!item || typeof item !== 'object') continue;
                if (item.href === href) return item;
                if (item.child) {
                    var found = miniTab.searchMenu(href, item.child);
                    if (found) return found;
                }
            }
        },

        // ===================== 事件监听 =====================

        listen: function (options) {
            options = options || {};
            var maxTabNum = options.maxTabNum || 20;

            // 左侧菜单打开
            $('body').on('click', '[layuimini-href]', function () {
                var loading = layer.load(0, { shade: false, time: 2000 });
                var href = $(this).attr('layuimini-href');
                var title = $(this).text();
                var target = $(this).attr('target');

                var $menu = $("[layuimini-href='" + href + "']", '.layuimini-menu-left');
                layer.close(window.openTips);
                if ($menu.length) {
                    $menu.closest('.layui-nav-tree').find('.layui-this').removeClass('layui-this');
                    $menu.parent().addClass('layui-this');
                }

                if (target === '_blank') {
                    layer.close(loading);
                    window.open(href, '_blank');
                    return false;
                }
                if (target === '_open') {
                    layer.close(loading);
                    layer.open({
                        type: 2,
                        title: title,
                        isOutAnim: true,
                        maxmin: true,
                        fix: false,
                        area: ['500px', '500px'],
                        content: href,
                        success: function (layero) {
                            $(layero).addClass('scroll-wrapper');
                        }
                    });
                    return false;
                }

                miniTab.open({
                    tabId: href || String(new Date().getTime()),
                    href: href,
                    title: title,
                    maxTabNum: maxTabNum
                });
                layer.close(loading);
            });

            // iframe 内快捷打开
            $('body').on('click', '[layuimini-content-href]', function () {
                var loading = parent.layer.load(0, { shade: false, time: 2000 });
                var href = $(this).attr('layuimini-content-href');
                if ($(this).attr('target') === '_blank') {
                    parent.layer.close(loading);
                    window.open(href, '_blank');
                    return false;
                }
                miniTab.open({
                    tabId: href || String(new Date().getTime()),
                    href: href,
                    title: $(this).attr('data-title'),
                    isIframe: true,
                    maxTabNum: maxTabNum
                });
                parent.layer.close(loading);
            });

            // 关闭按钮
            $('body').on('click', '.layuimini-tab .layui-tab-title .layui-tab-close', function () {
                var loading = layer.load(0, { shade: false, time: 2000 });
                var tabId = $(this).parent().attr('lay-id');
                if (tabId != null) miniTab.delete(tabId);
                layer.close(loading);
            });

            // 工具栏：关闭当前/其他/全部
            $('body').on('click', '[layuimini-tab-close]', function () {
                var loading = layer.load(0, { shade: false, time: 2000 });
                miniTab.closeByType($(this).attr('layuimini-tab-close'));
                layer.close(loading);
            });

            // 禁用标题栏浏览器右键
            $('.layuimini-tab .layui-tab-title').off('contextmenu').on('contextmenu', function (e) {
                e.preventDefault();
                return false;
            });

            // 自定义右键菜单
            $('body').on('mousedown', '.layuimini-tab .layui-tab-title li', function (e) {
                if (e.which !== 3) return;
                var left = $(this).offset().left - $('.layuimini-tab').offset().left + ($(this).width() / 2);
                miniTab.openTabRignMenu($(this).attr('lay-id'), left);
            });

            $('body').on('click', '.layui-body,.layui-header,.layuimini-menu-left,.layuimini-tab-make', function () {
                miniTab.closeTabRignMenu();
            });

            $('body').on('click', '[layuimini-tab-menu-close]', function () {
                var loading = layer.load(0, { shade: false, time: 2000 });
                miniTab.closeByType(
                    $(this).attr('layuimini-tab-menu-close'),
                    $('.layuimini-tab-mousedown').attr('data-tab-id')
                );
                miniTab.closeTabRignMenu();
                layer.close(loading);
            });
        },

        /** 切换页签 */
        listenSwitch: function (options) {
            options = options || {};
            element.on('tab(' + (options.filter || TAB_FILTER) + ')', function (data) {
                var tabId = $(this).attr('lay-id');

                if (options.urlHashLocation) {
                    location.hash = '/' + tabId;
                }
                if (tabId && options.homeInfo && tabId !== options.homeInfo.href) {
                    var d = new Date();
                    d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
                    document.cookie = 'wc_returnurl=' + tabId + ';path=/;expires=' + d.toGMTString();
                }
                if (typeof options.listenSwichCallback === 'function') {
                    options.listenSwichCallback();
                }

                // 懒加载页签：切过来再加载
                miniTab.loadActiveIframe();
                // 表头宽度异常时刷新；否则尝试 resize 表格
                miniTab.fixActiveTable();

                if ($('.layuimini-menu-left').attr('layuimini-tab-tag') === 'add') {
                    $('.layuimini-menu-left').attr('layuimini-tab-tag', 'no');
                } else {
                    $('[layuimini-href]').parent().removeClass('layui-this');
                    if (options.multiModule) {
                        miniTab.listenSwitchMultiModule(tabId);
                    } else {
                        miniTab.listenSwitchSingleModule(tabId);
                    }
                    miniTab.resizeActiveTables(tabId, data.index);
                }
                miniTab.rollPosition();
            });
        },

        /** 当前 iframe 表头宽度丢失则整页刷新 */
        fixActiveTable: function () {
            var $iframe = $('.layui-tab-content .layui-tab-item.layui-show iframe');
            if (!$iframe.length) return;
            try {
                var win = $iframe[0].contentWindow;
                var tables = win && win.document && win.document.getElementsByTagName('table');
                if (!tables || tables.length < 2) return;
                var thead = tables[1].tHead || tables[1].getElementsByTagName('thead')[0];
                if (!thead || !thead.rows.length) return;
                var ths = Array.prototype.filter.call(
                    thead.rows[0].getElementsByTagName('th'),
                    function (th) { return !th.classList.contains('layui-hide'); }
                );
                var w = ths[1] ? parseInt(ths[1].offsetWidth, 10) : 0;
                if (!w || w < 50) win.location.reload();
            } catch (e) { /* iframe 未就绪 */ }
        },

        /** 对当前 iframe 内 layui table 做 resize */
        resizeActiveTables: function (tabId, frameIndex) {
            try {
                var frame = window.frames[frameIndex];
                if (!frame || !frame.document) return;
                var tables = frame.document.getElementsByTagName('table');
                var $iframe = $('iframe[src^="' + tabId + '"]');
                if (!$iframe.length) return;
                var layuiTable = $iframe[0].contentWindow.layui && $iframe[0].contentWindow.layui.table;
                if (!layuiTable) return;
                for (var i = 0; i < tables.length; i++) {
                    if (tables[i].id) layuiTable.resize(tables[i].id);
                }
            } catch (e) { /* ignore */ }
        },

        /** 根据 hash 打开/定位页签 */
        listenHash: function (options) {
            options = options || {};
            if (!options.urlHashLocation) return;

            var tabId = location.hash.replace(/^#\//, '');
            if (!tabId || (options.homeInfo && tabId === options.homeInfo.href)) return;

            var title = tabId;
            var menu = miniTab.searchMenu(tabId, options.menuList || []);
            if (menu) {
                title = menu.title;
            } else {
                var $quick = $('[layuimini-content-href="' + tabId + '"]');
                if ($quick.length) title = $quick.attr('data-title') || title;
                else title = miniTab.getTitleMap()[tabId] || title;
            }

            miniTab.open({
                tabId: tabId,
                href: tabId,
                title: title,
                maxTabNum: options.maxTabNum || 20
            });
            $('.layuimini-menu-left').attr('layuimini-tab-tag', 'no');
        },

        listenRoll: function () {
            $('.layuimini-tab-roll-left').click(function () { miniTab.rollClick('left'); });
            $('.layuimini-tab-roll-right').click(function () { miniTab.rollClick('right'); });
        },

        listenSwitchSingleModule: function (tabId) {
            $('[layuimini-href]').each(function () {
                if ($(this).attr('layuimini-href') !== tabId) return;
                (function addMenuClass($el, type) {
                    if (type === 1) {
                        $el.addClass('layui-this');
                        if ($el.hasClass('layui-nav-item') && $el.hasClass('layui-this')) {
                            $('.layuimini-header-menu li').attr('class', 'layui-nav-item');
                        } else {
                            addMenuClass($el.parent().parent(), 2);
                        }
                    } else {
                        $el.addClass('layui-nav-itemed');
                        if ($el.hasClass('layui-nav-item') && $el.hasClass('layui-nav-itemed')) {
                            $('.layuimini-header-menu li').attr('class', 'layui-nav-item');
                        } else {
                            addMenuClass($el.parent().parent(), 2);
                        }
                    }
                })($(this).parent(), 1);
                return false;
            });
        },

        listenSwitchMultiModule: function (tabId) {
            $('[layuimini-href]').each(function () {
                if ($(this).attr('layuimini-href') !== tabId) return;
                (function addMenuClass($el, type) {
                    if (type === 1) {
                        $el.addClass('layui-this');
                        if ($el.hasClass('layui-nav-item') && $el.hasClass('layui-this')) {
                            var moduleId = $el.parent().attr('id');
                            $('.layuimini-header-menu li').attr('class', 'layui-nav-item');
                            $('#' + moduleId + 'HeaderId').addClass('layui-this');
                            $('.layuimini-menu-left .layui-nav.layui-nav-tree').attr('class', 'layui-nav layui-nav-tree layui-hide');
                            $('#' + moduleId).attr('class', 'layui-nav layui-nav-tree layui-this');
                        } else {
                            addMenuClass($el.parent().parent(), 2);
                        }
                    } else {
                        $el.addClass('layui-nav-itemed');
                        if ($el.hasClass('layui-nav-item') && $el.hasClass('layui-nav-itemed')) {
                            var moduleId2 = $el.parent().attr('id');
                            $('.layuimini-header-menu li').attr('class', 'layui-nav-item');
                            $('#' + moduleId2 + 'HeaderId').addClass('layui-this');
                            $('.layuimini-menu-left .layui-nav.layui-nav-tree').attr('class', 'layui-nav layui-nav-tree layui-hide');
                            $('#' + moduleId2).attr('class', 'layui-nav layui-nav-tree layui-this');
                        } else {
                            addMenuClass($el.parent().parent(), 2);
                        }
                    }
                })($(this).parent(), 1);
                return false;
            });
        },

        rollPosition: function () {
            var $title = $('.layuimini-tab .layui-tab-title');
            var left = 0;
            $title.children('li').each(function () {
                if ($(this).hasClass('layui-this')) return false;
                left += $(this).outerWidth();
            });
            $title.animate({ scrollLeft: left - $title.width() / 3 }, 200);
        },

        rollClick: function (direction) {
            var $title = $('.layuimini-tab .layui-tab-title');
            var left = $title.scrollLeft();
            $title.animate({
                scrollLeft: direction === 'left' ? left - 450 : left + 450
            }, 200);
        }
    };
    exports('miniTab', miniTab);
});
