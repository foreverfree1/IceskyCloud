/**
 *
 * @name:  表格增强插件
 * @author: yelog
 * @link: https://github.com/yelog/layui-soul-table
 * @license: MIT
 * @version: v1.9.0
 */
layui.define(['table', 'tableFilter', 'tableChild', 'tableMerge'], function (exports) {

    var tableFilter = layui.tableFilter,
        tableChild = layui.tableChild,
        tableMerge = layui.tableMerge,
        $ = layui.$,
        table = layui.table,
        HIDE = 'layui-hide',
        tables = {},
        originCols = {},
        autoWidthCols = {},
        defaultConfig = { // 默认配置开关
            fixTotal: false, // 修复合计行固定列问题
            drag: true, // 列拖动
            rowDrag: false, // 行拖动
            autoColumnWidth: true, // 自动列宽
            contextmenu: false, // 右键菜单
            fixResize: true, // 修改有固定列的拖动列宽的位置为左边线
            overflow: false, // 自定义内容超出样式
            fixFixedScroll: true, // 固定列支持鼠标滚轮滚动
            filter: false  // 筛选及记忆相关
        },
        _BODY = $('body'),
        _DOC = $(document);

    // 封装方法
    var mod = {
        render: function (myTable) {
            // 记录表格配置，方便直接通过 tableId 调用方法
            tables[myTable.id] = myTable
            var curConfig = $.extend({}, defaultConfig, myTable);
            if (curConfig.filter && curConfig.filter.cache) {
                var storeKey = location.pathname + location.hash + myTable.id;
                var colsStr = this.deepStringify(myTable.cols);
                // 记录表格列的原始配置
                if (!originCols[myTable.id]) { // 只在第一次 render 时生效
                    originCols[myTable.id] = this.deepClone(myTable.cols)

                    var curTableSession = localStorage.getItem(storeKey);
                    if (curTableSession && colsStr === localStorage.getItem('origin' + storeKey)) {
                        this.updateCols(myTable, this.deepParse(curTableSession));
                    } else {
                        localStorage.setItem('origin' + storeKey, colsStr)
                        localStorage.removeItem(storeKey)
                    }
                }
            } else {
                // 如果没有开启记忆，则清除
                this.clearCache(myTable);
            }


            tableFilter.render(myTable);
            tableChild.render(myTable);
            tableMerge.render(myTable);

            // 初始化暂停配置
            this.suspendConfig[myTable.id] = {
                drag: false,
                rowDrag: false
            }
            // 修复合计栏固定列问题
            if (curConfig.fixTotal) {
                this.fixTotal(myTable)
            }
            if (curConfig.drag) {
                this.drag(myTable, curConfig.drag);
            }
            if (curConfig.rowDrag) {
                this.rowDrag(myTable, curConfig.rowDrag)
            }
            if (curConfig.autoColumnWidth) {
                this.autoColumnWidth(myTable, curConfig.autoColumnWidth)
            }
            // 列宽拖拽后按 key 同步 col.width，避免拖列后按下标写错列
            this.bindResizeSyncByKey(myTable);

            this.contextmenu(myTable, curConfig.contextmenu);

            if (curConfig.fixResize) {
                this.fixResizeRightFixed(myTable);
            }

            if (curConfig.overflow) {
                this.overflow(myTable, curConfig.overflow);
            }

            if (curConfig.fixFixedScroll) {
                this.fixFixedScroll(myTable);
            }
        }
        , config: function (configObj) {
            if (typeof configObj === 'object') {
                $.extend(true, defaultConfig, configObj);
            }
        }
        , updateCols: function (myTable, cols) {
            var i, j, lastKeyMap = {}, columnKey, newCols = [], col = [],
                $table = $(myTable.elem),
                $tableBox = $table.next().children('.layui-table-box'),
                $fixedHead = $tableBox.children('.layui-table-fixed').children('.layui-table-header').children('table'),
                $tableHead = $.merge($tableBox.children('.layui-table-header').children('table'), $fixedHead),
                $noFixedHead = $tableBox.children('.layui-table-header').children('table'),
                $fixedBody = $tableBox.children('.layui-table-fixed').children('.layui-table-body').children('table'),
                $noFixedBody = $tableBox.children('.layui-table-body').children('table'),
                $tableBody = $.merge($tableBox.children('.layui-table-body').children('table'), $fixedBody);

            for (i = 0; i < myTable.cols.length; i++) {
                for (j = 0; j < myTable.cols[i].length; j++) {
                    myTable.cols[i][j]['oldPos'] = i + '-' + j
                    lastKeyMap[myTable.cols[i][j].key] = myTable.cols[i][j]
                }
            }

            for (i = 0; i < cols.length; i++) {
                col = []
                for (j = 0; j < cols[i].length; j++) {
                    columnKey = cols[i][j].key;
                    // 同步列宽
                    if (cols[i][j].width && lastKeyMap[cols[i][j].key] !== cols[i][j].width) {
                        this.getCssRule(myTable, columnKey, function (item) {
                            item.style.width = (cols[i][j].width ? cols[i][j].width : 0) + 'px'
                        })
                    }
                    // 同步隐藏
                    if (lastKeyMap[cols[i][j].key].hide !== cols[i][j].hide) {
                        $tableHead.find('th[data-key="' + columnKey + '"]')[cols[i][j].hide ? 'addClass' : 'removeClass']('layui-hide')
                        $tableBody.find('td[data-key="' + columnKey + '"]')[cols[i][j].hide ? 'addClass' : 'removeClass']('layui-hide')
                    }

                    // 同步顺序
                    if (lastKeyMap[cols[i][j].key].oldPos !== (i + '-' + j) || lastKeyMap[cols[i][j].key].fixed !== cols[i][j].fixed) {
                        myTable.cols = cols;
                        table.reload(myTable.id)
                        return;
                        // 实现不 reload 调整列顺序

                    }
                    lastKeyMap[cols[i][j].key].fixed = cols[i][j].fixed;
                    lastKeyMap[cols[i][j].key].width = cols[i][j].width;
                    lastKeyMap[cols[i][j].key].hide = cols[i][j].hide;
                    col.push(lastKeyMap[cols[i][j].key])
                }
                newCols.push(col)
            }
            $noFixedHead.children().children('tr').each(function () {
                innerHandler(this, 'th')
            })
            $noFixedBody.children().children('tr').each(function () {
                innerHandler(this, 'td')
            })

            function innerHandler(_this, domName) {
                for (i = 0; i < cols.length; i++) {
                    for (j = 0; j < cols[i].length; j++) {
                        // col.key 已是完整 data-key 时不要再拼 index
                        var ck = cols[i][j].key != null ? String(cols[i][j].key) : '';
                        columnKey = ck.split('-').length >= 3 ? ck : (myTable.index + '-' + ck);
                        var curKey = $(_this).children(domName + ':eq(' + j + ')').attr('data-key');
                        if (curKey !== columnKey) {
                            $(_this).children(domName + ':eq(' + j + ')').before($(_this).children(domName + '[data-key="' + columnKey + '"]'))
                            if (cols[i][j].fixed) {
                                var $curRow = (domName === 'th' ? $fixedHead : $fixedBody).children().children(domName === 'th' ? 'tr' : 'tr[data-index="' + $(_this).attr('data-index') + '"]')
                                $curRow.children(domName + '[data-key="' + curKey + '"]').before($curRow.children(domName + '[data-key="' + columnKey + '"]'))
                            }
                        }
                    }
                }
            }

            myTable.cols = newCols;

            table.resize(myTable.id)
        }
        /**
         * excel表格导出
         * @param myTable
         * @param curExcel
         */
        , export: function (myTable, curExcel) {
            tableFilter.export(myTable.config || myTable, curExcel);
        }
        , getCssRule: function (that, key, callback) {
            var style = that.elem.next().find('style')[0]
                , sheet = style.sheet || style.styleSheet || {}
                , rules = sheet.cssRules || sheet.rules;
            layui.each(rules, function (i, item) {
                if (item.selectorText === ('.laytable-cell-' + key)) {
                    return callback(item), true;
                }
            });
        }
        /**
         * 拖列后 cols 下标 ≠ data-key，禁止用下标取列。
         * 优先 field，再 col.key（兼容完整 key 与短 key）。
         */
        , getCol: function (myTable, dataKey, field) {
            var found = null;
            if (field != null && field !== '') {
                layui.each(myTable.cols, function (_, row) {
                    layui.each(row, function (_, col) {
                        if (col && col.field != null && String(col.field) === String(field)) {
                            found = col;
                            return true;
                        }
                    });
                    if (found) return true;
                });
                if (found) return found;
            }
            var key = dataKey != null ? String(dataKey) : '';
            if (!key) return null;
            var shortKey = key.split('-').length >= 3 ? key.split('-').slice(-2).join('-') : key;
            layui.each(myTable.cols, function (_, row) {
                layui.each(row, function (_, col) {
                    if (!col || col.key == null) return;
                    var ck = String(col.key);
                    var ckShort = ck.split('-').length >= 3 ? ck.split('-').slice(-2).join('-') : ck;
                    if (ck === key || ck === shortKey || ckShort === shortKey) {
                        found = col;
                        return true;
                    }
                });
                if (found) return true;
            });
            return found;
        }
        /** CSS/DOM 用的 key：优先 col.key，否则表头 data-key（绝不用新下标拼接） */
        , getColDataKey: function (col, fallbackKey) {
            if (col && col.key != null) return String(col.key);
            return fallbackKey != null ? String(fallbackKey) : '';
        }
        /**
         * 把「当前 DOM/CSS 上的列宽」按 data-key/field 写回正确的 col 对象。
         * 修复：layui 拖拽改宽用 key 下标写 cols[i][j]，拖列后会写到错误列；
         * 展开时 setColsWidth 再按错误 col.width 把第 3 列撑大。
         */
        , syncColWidthsByKey: function (myTable) {
            if (typeof myTable === 'string') myTable = tables[myTable];
            if (!myTable || !myTable.elem) return;
            var _this = this;
            var $ths = $(myTable.elem).next().children('.layui-table-box')
                .children('.layui-table-header').children('table')
                .children('thead').children('tr').children('th[data-key]');
            $ths.each(function () {
                var $th = $(this);
                var dataKey = $th.attr('data-key');
                if (!dataKey) return;
                var field = $th.attr('data-field') || '';
                var col = _this.getCol(myTable, dataKey, field);
                if (!col) return;
                var cssKey = _this.getColDataKey(col, dataKey);
                var w = 0;
                _this.getCssRule(myTable, cssKey, function (item) {
                    w = parseFloat(item.style.width) || 0;
                });
                if (!w && dataKey !== cssKey) {
                    _this.getCssRule(myTable, dataKey, function (item) {
                        w = parseFloat(item.style.width) || 0;
                    });
                }
                if (!w) w = $th.outerWidth() || 0;
                if (w > 0) col.width = w;
            });
        }
        /** 绑定：列宽拖拽结束后按 key 回写 col.width（覆盖 layui 按下标写入） */
        , bindResizeSyncByKey: function (myTable) {
            if (!myTable || !myTable.elem) return;
            var _this = this;
            var $view = $(myTable.elem).next();
            var ns = '.soulSyncWidthByKey';
            $view.off('mouseup' + ns, '.layui-table-header th')
                .on('mouseup' + ns, '.layui-table-header th', function () {
                    setTimeout(function () {
                        _this.syncColWidthsByKey(myTable);
                    }, 0);
                });
        }
        , autoColumnWidth: function (myTable, autoColumnWidthConfig) {
            var _this = this;
            if (typeof myTable === 'object') {
                innerColumnWidth(_this, myTable)
            } else if (typeof myTable === 'string') {
                innerColumnWidth(_this, tables[myTable])
            } else if (typeof myTable === 'undefined') {
                layui.each(tables, function () {
                    innerColumnWidth(_this, this)
                });
            }

            function findCol(myTable, dataKey, field) {
                return _this.getCol(myTable, dataKey, field);
            }

            function innerColumnWidth(_this, myTable) {
                if (!myTable || !myTable.elem) return;
                var $table = $(myTable.elem),
                    th = $table.next().children('.layui-table-box').children('.layui-table-header').children('table').children('thead').children('tr').children('th'),
                    fixTh = $table.next().children('.layui-table-box').children('.layui-table-fixed').children('.layui-table-header').children('table').children('thead').children('tr').children('th'),
                    $tableBodytr = $table.next().children('.layui-table-box').children('.layui-table-body').children('table').children('tbody').children('tr'),
                    $totalTr = $table.next().children('.layui-table-total').find('tr');
                if (typeof autoColumnWidthConfig === 'undefined' || typeof autoColumnWidthConfig.dblclick === 'undefined' || autoColumnWidthConfig.dblclick) {
                    th.add(fixTh).on('dblclick', function (e) {
                        var othis = $(this),
                            pLeft = e.clientX - othis.offset().left,
                            isHandle = othis.parents('.layui-table-fixed-r').length > 0 ? pLeft <= 10 : othis.width() - pLeft <= 10;
                        if (isHandle) {
                            handleColumnWidth(myTable, othis, calcColumnWidth(othis));
                        }
                    })
                }
                // 初始化表格后，自动调整所有列宽
                if (autoColumnWidthConfig) {
                    if (!autoWidthCols[myTable.id]) autoWidthCols[myTable.id] = {};
                    var autoFields = autoWidthCols[myTable.id];
                    var doneKeys = {};
                    var force = !!autoColumnWidthConfig.force;
                    var growOnly = !!autoColumnWidthConfig.growOnly;
                    var onlyFields = Array.isArray(autoColumnWidthConfig.fields) ? autoColumnWidthConfig.fields : null;
                    th.add(fixTh).each(function () {
                        var $th = $(this);
                        var dataKey = $th.attr('data-key');
                        if (!dataKey || doneKeys[dataKey]) return;
                        doneKeys[dataKey] = true;
                        var field = $th.attr('data-field') || '';
                        if (onlyFields && onlyFields.indexOf(field) === -1) return;
                        var col = findCol(myTable, dataKey, field);
                        if (!col || col.autoWidth === false) return;
                        if (!field) field = col.field || '';
                        var memKey = field || ('k:' + _this.getColDataKey(col, dataKey));
                        // 首次：width 为 auto 的字段记入 autoWidthCols；之后每次重载都对已记录字段重算
                        if (col.width == 'auto' || col.width == null || col.width == 0) {
                            if (!Array.isArray(autoColumnWidthConfig.init) || autoColumnWidthConfig.init.indexOf(field) !== -1) {
                                autoFields[memKey] = true;
                            }
                        }
                        if (!autoFields[memKey]) {
                            // 展开加宽树列时：即使未记入 autoFields 也允许按 field 处理
                            if (!(growOnly && onlyFields && onlyFields.indexOf(field) !== -1)) return;
                            autoFields[memKey] = true;
                        }
                        // 已记入 autoWidthCols：每次重载都按当前内容重算；growOnly 时只增不减
                        var existing = parseFloat(col.width) || 0;
                        if (growOnly) {
                            var cssKey = _this.getColDataKey(col, dataKey);
                            var cssW = 0;
                            _this.getCssRule(myTable, cssKey, function (item) {
                                cssW = parseFloat(item.style.width) || 0;
                            });
                            if (!cssW && dataKey !== cssKey) {
                                _this.getCssRule(myTable, dataKey, function (item) {
                                    cssW = parseFloat(item.style.width) || 0;
                                });
                            }
                            var current = Math.max(existing, cssW, $th.outerWidth() || 0);
                            var grown = calcColumnWidth($th) || 0;
                            if (grown > current) {
                                handleColumnWidth(myTable, $th, grown);
                            }
                            return;
                        }
                        // 已记录的自动列：重载后仍按内容更新（勿因上次写入的像素宽而跳过）
                        handleColumnWidth(myTable, $th, calcColumnWidth($th));
                    });
                    if ($probe) {
                        $probe.remove();
                        $probe = null;
                    }
                }
                var $probe;
                function measureInner($el) {
                    var $inner = $el.children('.layui-table-cell');
                    if (!$inner.length) $inner = $el;

                    var isTreeCell = $inner.hasClass('layui-table-tree-item')
                        || $inner.find('.layui-table-tree-flexIcon, .layui-table-tree-nodeIcon').length > 0;
                    var useHtml = isTreeCell
                        || $inner.find('button, .layui-btn, a.layui-btn').length > 0;
                    if (!useHtml) {
                        var dataKey = $el.attr('data-key');
                        if (!dataKey) return;
                        var colCfg = findCol(myTable, dataKey, $el.attr('data-field'));
                        var isToolbar = colCfg && (colCfg.type === 'toolbar' || colCfg.toolbar);
                        var field = $el.attr('data-field') || (colCfg && colCfg.field) || '';
                        var treeName = myTable.tree && myTable.tree.customName && myTable.tree.customName.name;
                        var isTreeColumn = treeName && field && String(field) === String(treeName);
                        if (isToolbar || isTreeColumn) {
                            useHtml = true;
                            isTreeCell = isTreeCell || !!isTreeColumn;
                        }
                    }

                    if (!$probe) {
                        // 不用 layui-table-cell：它的 border-box + padding 会把括号、空格量窄
                        $probe = $('<div></div>').css({
                            position: 'absolute',
                            left: '-99999px',
                            top: 0,
                            width: 'auto',
                            maxWidth: 'none',
                            height: 'auto',
                            overflow: 'visible',
                            whiteSpace: 'nowrap',
                            visibility: 'hidden',
                            display: 'inline-block',
                            boxSizing: 'content-box',
                            padding: 0,
                            margin: 0,
                            border: 'none'
                        });
                        _BODY.append($probe);
                    }
                    var innerEl = $inner[0];
                    if (!innerEl) return 0;
                    var cs = window.getComputedStyle(innerEl);
                    $probe.css({
                        font: cs.font,
                        fontSize: cs.fontSize,
                        fontWeight: cs.fontWeight,
                        fontFamily: cs.fontFamily,
                        letterSpacing: cs.letterSpacing,
                        wordSpacing: cs.wordSpacing
                    });

                    // 树列：文本与图标分开量，避免列已收窄时 HTML outerWidth 失真
                    if (isTreeCell) {
                        // 修改内容：用 find，和上面 isTreeCell 判定一致（图标不一定是直接子节点）
                        var $flex = $inner.find('.layui-table-tree-flexIcon').first();
                        var indent = $flex.length ? (parseFloat($flex[0].style.marginLeft) || 0) : 0;
                        var iconW = 0;
                        if ($flex.length) iconW += 18;
                        if ($inner.find('.layui-table-tree-nodeIcon').length) iconW += 22;
                        var $clone = $inner.clone();
                        $clone.find('.layui-table-tree-flexIcon, .layui-table-tree-nodeIcon').remove();
                        var treeText = String($clone.text() || '').replace(/\s+/g, ' ').trim();
                        $probe.empty().text(treeText);
                        return Math.ceil(($probe.outerWidth() || 0) + iconW + indent + 24);
                    }

                    if (useHtml) {
                        var html = $inner.html();
                        if (html == null || !String(html).replace(/\s/g, '')) return 0;
                        $probe.html(html);
                        return Math.ceil($probe.outerWidth() + 20);
                    }

                    // 普通列：只量纯文本
                    var text = String($inner.text() || '').replace(/\s+/g, ' ').trim();
                    if (!text) return 0;
                    $probe.empty().text(text);

                    var w = $probe.outerWidth() + 20;
                    if (text.indexOf('*') > -1) {
                        w += 4;
                    }
                    var $funnel = $inner.find('.soul-table-filter, .layui-table-sort').first();
                    if ($funnel.length) {
                        w += 25;
                        // form-item 下 .layui-inline 会多出 margin，补上
                        var m = (parseFloat($funnel.css('margin-right')) || 0);
                        if (m) w += m;
                    }
                    return Math.ceil(w);
                }

                function calcColumnWidth(othis) {
                    var key = othis.attr('data-key');
                    if (othis.attr('colspan') > 1) {
                        return;
                    }
                    var headerWidth = measureInner(othis) || 0;
                    var contentWidth = 0;
                    var cells = $tableBodytr.children('td[data-key="' + key + '"]');
                    for (var i = 0, len = cells.length; i < len; i++) {
                        var curWidth = measureInner($(cells[i]));
                        if (curWidth > contentWidth) contentWidth = curWidth;
                    }
                    var maxWidth = Math.max(headerWidth, contentWidth);
                    return maxWidth;
                }

                function handleColumnWidth(myTable, othis, maxWidth) {
                    var dataKey = othis.attr('data-key');
                    if (othis.attr('colspan') > 1 || !maxWidth || dataKey == "normal") {
                        return;
                    }
                    var field = othis.attr('data-field') || '';
                    var col = findCol(myTable, dataKey, field);
                    // 必须用 col.key / 表头 data-key，绝不用 cols 新下标拼 key
                    var cssKey = _this.getColDataKey(col, dataKey);
                    if (!cssKey) return;
                    _this.getCssRule(myTable, cssKey, function (item) {
                        item.style.width = maxWidth + 'px'
                    });
                    if (dataKey && dataKey !== cssKey) {
                        _this.getCssRule(myTable, dataKey, function (item) {
                            item.style.width = maxWidth + 'px'
                        });
                    }
                    if (col) {
                        col.width = maxWidth;
                    }
                }

            }

        }
        /**
         * 左右拖拽调整列顺序、向上拖隐藏列
         * @param myTable
         */
        , drag: function (myTable, dragConfig) {
            if (myTable.cols.length > 1) {
                // 如果是复杂表头，则自动禁用拖动效果
                return;
            }
            var _this = this,
                $table = $(myTable.elem),
                $tableBox = $table.next().children('.layui-table-box'),
                $tableHead = $.merge($tableBox.children('.layui-table-header').children('table'), $tableBox.children('.layui-table-fixed').children('.layui-table-header').children('table')),
                $fixedBody = $tableBox.children('.layui-table-fixed').children('.layui-table-body').children('table'),
                $noFixedBody = $tableBox.children('.layui-table-body').children('table'),
                $tableBody = $.merge($tableBox.children('.layui-table-body').children('table'), $fixedBody),
                $totalTable = $table.next().children('.layui-table-total').children('table'),
                $fixedTotalTable = $table.next().children('.layui-table-total').children('table.layui-table-total-fixed'),
                $noFixedTotalTable = $table.next().children('.layui-table-total').children('table:eq(0)'),
                tableId = myTable.id,
                isSimple = dragConfig === 'simple' || (dragConfig && dragConfig.type === 'simple'), // 是否为简易拖拽
                toolbar = dragConfig && dragConfig.toolbar, // 是否开启工具栏
                isDragging = false, isStart = false;

            if (!$tableHead.attr('drag')) {
                $tableHead.attr('drag', true);
                if (toolbar) {
                    $tableBox.append('<div class="soul-drag-bar"><div data-type="left">左固定</div><div data-type="none">不固定</div><div data-type="right">右固定</div></div>')
                    var $dragBar = $tableBox.children('.soul-drag-bar');
                    $dragBar.children('div').on('mouseenter', function () {
                        $(this).addClass('active')
                    }).on('mouseleave', function () {
                        $(this).removeClass('active')
                    })
                }

                $tableHead.find('th').each(function () {
                    var $this = $(this),
                        field = $this.data('field'),
                        key = $this.attr('data-key') || $this.data('key');
                    if (!key) {
                        return;
                    }

                    var keyStr = String(key),
                        curColumn = null,
                        curKey = keyStr,
                        isInFixed = $this.parents('.layui-table-fixed').length > 0;
                    // 拖列后不能再用下标取 cols，必须按 key / field 找列
                    curColumn = _this.getCol(myTable, keyStr, $this.attr('data-field') || field);
                    if (!curColumn) return;
                    // 绑定鼠标按下事件
                    $(this).find('span:first,.laytable-cell-checkbox')
                        .css('cursor', 'move')
                        .on('mousedown', function (e) {
                            // 暂停或者非鼠标左键都不执行
                            if (_this.suspendConfig[tableId].drag || e.button !== 0) {
                                return;
                            }
                            e.preventDefault();
                            var $cloneHead = $this.clone().css('visibility', 'hidden'),
                                originLeft = $this.position().left,
                                originTop = $this.offset().top,
                                disX = e.clientX - originLeft, // 鼠标距离被移动元素左侧的距离
                                color = $this.parents('tr:eq(0)').css("background-color"),
                                width = $this.width(), moveDistince = 0,
                                $that = $(this),
                                isFixed = curColumn.fixed;
                            isStart = true;
                            //区分click、drag事件


                            // 阻止文本选中
                            _DOC.bind("selectstart", function () {
                                return false;
                            });

                            // 移动事件
                            _BODY.on('mousemove', function (e) {
                                if (isStart && $cloneHead) {
                                    $tableBox.removeClass('no-left-border');
                                    if (!isDragging) {
                                        if (toolbar) {
                                            $dragBar.attr('data-type', isFixed || 'none')
                                            $dragBar.addClass('active')
                                        }

                                        $this.after($cloneHead);
                                        $this.addClass('isDrag').css({
                                            'position': 'absolute',
                                            'z-index': 1,
                                            'border-left': '1px solid #e6e6e6',
                                            'background-color': color,
                                            'width': width + 1
                                        });

                                        if (isSimple) {
                                            //设置蒙板
                                        } else {
                                            (isInFixed ? $fixedBody : $tableBody).find('td[data-key="' + key + '"]').each(function () {
                                                $(this).after($(this).clone().css('visibility', 'hidden').attr('data-clone', ''));
                                                $(this).addClass('isDrag').css({
                                                    'position': 'absolute',
                                                    'z-index': 1,
                                                    'border-left': '1px solid #e6e6e6',
                                                    'background-color': $(this).css('background-color'),
                                                    'width': width + 1
                                                });
                                            })
                                            if ($totalTable.length > 0) {
                                                (isInFixed ? $fixedTotalTable : $totalTable).find('td[data-key="' + key + '"]').each(function () {
                                                    $(this).after($(this).clone().css('visibility', 'hidden').attr('data-clone', ''));
                                                    $(this).addClass('isDrag').css({
                                                        'position': 'absolute',
                                                        'z-index': 1,
                                                        'background-color': $(this).parents('tr:eq(0)').css('background-color'),
                                                        'width': width + 1
                                                    });
                                                })
                                            }
                                        }
                                    }
                                    isDragging = true;
                                    var x, y, i, j, tempCols,
                                        left = e.clientX - disX, // 计算当前被移动列左侧位置应该哪里
                                        $leftTh = $cloneHead.prev().prev(),
                                        hasLeftTh = $leftTh.length > 0,
                                        leftKey = hasLeftTh ? $leftTh.data('key').split('-') : [],
                                        $rightTh = $cloneHead.next().hasClass('layui-table-patch') ? [] : $cloneHead.next(),
                                        hasRightTh = $rightTh.length > 0,
                                        rightKey = hasRightTh ? $rightTh.data('key').split('-') : [],
                                        leftMove = hasLeftTh && ($cloneHead.position().left - left > $leftTh.width() / 2.0),
                                        rightMove = hasRightTh && (left - $cloneHead.position().left > $rightTh.width() / 2.0);
                                    moveDistince = Math.abs($cloneHead.position().left - left); //记录移动距离
                                    // 移动到左右两端、checbox/radio 固定列等停止移动
                                    var leftCol = hasLeftTh ? _this.getCol(myTable, $leftTh.attr('data-key'), $leftTh.attr('data-field')) : null;
                                    var rightCol = hasRightTh ? _this.getCol(myTable, $rightTh.attr('data-key'), $rightTh.attr('data-field')) : null;
                                    if ($cloneHead.position().left - left > 0
                                        ? !hasLeftTh || !!isFixed !== !!(leftCol && leftCol.fixed)
                                        : !hasRightTh || !!isFixed !== !!(rightCol && rightCol.fixed)) {
                                        $this.css('left', $cloneHead.position().left);
                                        $tableBody.find('td[data-key="' + key + '"][data-clone]').each(function (e) {
                                            $(this).prev().css('left', $cloneHead.position().left);
                                        })
                                        if ($totalTable.length > 0) {
                                            $totalTable.find('td[data-key="' + key + '"][data-clone]').each(function (e) {
                                                $(this).prev().css('left', $cloneHead.position().left);
                                            })
                                        }
                                        $tableBox.addClass('no-left-border');
                                        return;
                                    }
                                    $this.css('left', left);

                                    if (leftMove) {
                                        $cloneHead.after($leftTh);

                                        // 更新隐藏列顺序
                                        $('#soul-columns' + tableId + ' li[data-value="' + field + '"]').after($('#soul-columns' + tableId + ' li[data-value="' + field + '"]').prev())

                                        // 更新配置信息
                                        for (i = 0; i < myTable.cols.length; i++) {
                                            for (j = 0; j < myTable.cols[i].length; j++) {
                                                if (myTable.cols[i][j].key === curKey) {
                                                    x = i;
                                                    y = j;
                                                    break;
                                                }
                                            }
                                            if (typeof x !== 'undefined' && typeof y !== 'undefined') {
                                                break;
                                            }
                                        }
                                        tempCols = myTable.cols[x][y - 1];
                                        myTable.cols[x][y - 1] = myTable.cols[x][y];
                                        myTable.cols[x][y] = tempCols;
                                        _this.fixTableRemember(myTable);
                                    } else if (rightMove) {
                                        $cloneHead.prev().before($rightTh);

                                        // 更新隐藏列顺序
                                        $('#soul-columns' + tableId + ' li[data-value="' + field + '"]').before($('#soul-columns' + tableId + ' li[data-value="' + field + '"]').next())

                                        // 更新配置信息
                                        for (i = 0; i < myTable.cols.length; i++) {
                                            for (j = 0; j < myTable.cols[i].length; j++) {
                                                if (myTable.cols[i][j].key === curKey) {
                                                    x = i;
                                                    y = j;
                                                    break;
                                                }
                                            }
                                            if (typeof x !== 'undefined' && typeof y !== 'undefined') {
                                                break;
                                            }
                                        }
                                        tempCols = myTable.cols[x][y + 1];
                                        myTable.cols[x][y + 1] = myTable.cols[x][y];
                                        myTable.cols[x][y] = tempCols;
                                        _this.fixTableRemember(myTable);
                                    }

                                    $tableBody.find('td[data-key="' + key + '"][data-clone]').each(function () {
                                        $(this).prev().css('left', left);

                                        if (leftMove) {
                                            if ($(this).prev().prev().length !== 0) {
                                                $(this).after($(this).prev().prev());
                                            }
                                        } else if (rightMove) {
                                            if ($(this).next().length !== 0) {
                                                $(this).prev().before($(this).next());
                                            }
                                        }
                                    })
                                    if ($totalTable.length > 0) {
                                        $totalTable.find('td[data-key="' + key + '"][data-clone]').each(function () {
                                            $(this).prev().css('left', left);

                                            if (leftMove) {
                                                if ($(this).prev().prev().length !== 0) {
                                                    $(this).after($(this).prev().prev());
                                                }
                                            } else if (rightMove) {
                                                if ($(this).next().length !== 0) {
                                                    $(this).prev().before($(this).next());
                                                }
                                            }
                                        })
                                    }

                                    /* 拖动隐藏列 */
                                    if (e.clientY - originTop < -15) {
                                        if ($('#column-remove').length === 0) {
                                            _BODY.append('<i id="column-remove" class="layui-red layui-icon layui-icon-delete"></i>')
                                        }
                                        $('#column-remove').css({
                                            top: e.clientY - $('#column-remove').height() / 2,
                                            left: e.clientX - $('#column-remove').width() / 2,
                                            'font-size': (originTop - e.clientY) + 'px'
                                        })
                                        $('#column-remove').show();
                                    } else {
                                        $('#column-remove').hide();
                                    }
                                }
                            }).on('mouseup', function () {
                                _DOC.unbind("selectstart");
                                _BODY.off('mousemove').off('mouseup')
                                if (isStart && $cloneHead) {
                                    isStart = false;
                                    if (isDragging) {
                                        if (curColumn.type !== 'checkbox') {
                                            $that.on('click', function (e) {
                                                e.stopPropagation();
                                            });
                                        }

                                        isDragging = false;
                                        $tableBox.removeClass('no-left-border')
                                        $this.removeClass('isDrag').css({
                                            'position': 'relative',
                                            'z-index': 'inherit',
                                            'left': 'inherit',
                                            'border-left': 'inherit',
                                            'width': 'inherit',
                                            'background-color': 'inherit'
                                        });
                                        $this.next().remove();
                                        var prefKey = $this.prev().data('key');
                                        if (isFixed) {
                                            var $noFixedTh = $tableBox.children('.layui-table-header').children('table').find('th[data-key="' + key + '"]');
                                            if (prefKey) {
                                                $noFixedTh.parent().children('th[data-key="' + prefKey + '"]').after($noFixedTh)
                                            } else {
                                                if (isFixed === 'right') {
                                                    if ($this.siblings().length > 0) {
                                                        $tableBox.children('.layui-table-header').children('table').find('th[data-key="' + $this.next().data('key') + '"]').prev().after($noFixedTh);
                                                    }
                                                } else {
                                                    $noFixedTh.parent().prepend('<th class="layui-hide"></th>');
                                                    $noFixedTh.parent().children('th:first').after($noFixedTh);
                                                    $noFixedTh.parent().children('th:first').remove();
                                                }

                                            }
                                        }
                                        if (isSimple) {
                                            $tableBody.find('td[data-key="' + key + '"]').each(function () {
                                                if (prefKey) {
                                                    $(this).parent().children('td[data-key="' + prefKey + '"]').after($(this))
                                                } else {
                                                    if (isFixed === 'right') {
                                                        if ($this.siblings().length > 0) {
                                                            var $preTd = $(this).parent().children('td[data-key="' + $this.next().data('key') + '"]').prev();
                                                            if ($preTd.length > 0) {
                                                                $preTd.after($(this));
                                                            } else {
                                                                $(this).parent().prepend('<td class="layui-hide"></td>');
                                                                $(this).parent().children('td:first').after($(this));
                                                                $(this).parent().children('td:first').remove();
                                                            }
                                                        }
                                                    } else {
                                                        $(this).parent().prepend('<td class="layui-hide"></td>');
                                                        $(this).parent().children('td:first').after($(this));
                                                        $(this).parent().children('td:first').remove();
                                                    }
                                                }
                                            });
                                            if ($totalTable.length > 0) {
                                                $totalTable.find('td[data-key="' + key + '"]').each(function () {
                                                    if (prefKey) {
                                                        $(this).parent().children('td[data-key="' + prefKey + '"]').after($(this))
                                                    } else {
                                                        if (isFixed === 'right') {
                                                            var $preTd = $(this).parent().children('td[data-key="' + $this.next().data('key') + '"]').prev();
                                                            if ($preTd.length > 0) {
                                                                $preTd.after($(this));
                                                            } else {
                                                                $(this).parent().prepend('<td class="layui-hide"></td>');
                                                                $(this).parent().children('td:first').after($(this));
                                                                $(this).parent().children('td:first').remove();
                                                            }
                                                        } else {
                                                            $(this).parent().prepend('<td class="layui-hide"></td>');
                                                            $(this).parent().children('td:first').after($(this));
                                                            $(this).parent().children('td:first').remove();
                                                        }
                                                    }
                                                });
                                            }
                                        } else if (isInFixed) {
                                            $noFixedBody.find('td[data-key="' + key + '"]').each(function () {
                                                if (prefKey) {
                                                    $(this).parent().children('td[data-key="' + prefKey + '"]').after($(this))
                                                } else {
                                                    if (isFixed === 'right') {
                                                        if ($this.siblings().length > 0) {
                                                            var $preTd = $(this).parent().children('td[data-key="' + $this.next().data('key') + '"]').prev();
                                                            if ($preTd.length > 0) {
                                                                $preTd.after($(this));
                                                            } else {
                                                                $(this).parent().prepend('<td class="layui-hide"></td>');
                                                                $(this).parent().children('td:first').after($(this));
                                                                $(this).parent().children('td:first').remove();
                                                            }
                                                        }
                                                    } else {
                                                        $(this).parent().prepend('<td class="layui-hide"></td>');
                                                        $(this).parent().children('td:first').after($(this));
                                                        $(this).parent().children('td:first').remove();
                                                    }
                                                }
                                            });
                                            $fixedBody.find('td[data-key="' + key + '"][data-clone]').each(function () {
                                                $(this).prev().removeClass('isDrag').css({
                                                    'position': 'relative',
                                                    'z-index': 'inherit',
                                                    'left': 'inherit',
                                                    'border-left': 'inherit',
                                                    'width': 'inherit',
                                                    'background-color': 'inherit'
                                                });
                                                $(this).remove();
                                            });
                                            if ($totalTable.length > 0) {
                                                $noFixedTotalTable.find('td[data-key="' + key + '"]').each(function () {
                                                    if (prefKey) {
                                                        $(this).parent().children('td[data-key="' + prefKey + '"]').after($(this))
                                                    } else {
                                                        if (isFixed === 'right') {
                                                            var $preTd = $(this).parent().children('td[data-key="' + $this.next().data('key') + '"]').prev();
                                                            if ($preTd.length > 0) {
                                                                $preTd.after($(this));
                                                            } else {
                                                                $(this).parent().prepend('<td class="layui-hide"></td>');
                                                                $(this).parent().children('td:first').after($(this));
                                                                $(this).parent().children('td:first').remove();
                                                            }
                                                        } else {
                                                            $(this).parent().prepend('<td class="layui-hide"></td>');
                                                            $(this).parent().children('td:first').after($(this));
                                                            $(this).parent().children('td:first').remove();
                                                        }
                                                    }
                                                });
                                                $fixedTotalTable.find('td[data-key="' + key + '"][data-clone]').each(function () {
                                                    $(this).prev().removeClass('isDrag').css({
                                                        'position': 'relative',
                                                        'z-index': 'inherit',
                                                        'left': 'inherit',
                                                        'width': 'inherit',
                                                        'background-color': 'inherit'
                                                    });
                                                    $(this).remove();
                                                });
                                            }
                                        } else {
                                            $tableBody.find('td[data-key="' + key + '"][data-clone]').each(function () {
                                                $(this).prev().removeClass('isDrag').css({
                                                    'position': 'relative',
                                                    'z-index': 'inherit',
                                                    'left': 'inherit',
                                                    'width': 'inherit',
                                                    'background-color': 'inherit'
                                                });
                                                $(this).remove();
                                            });
                                            if ($totalTable.length > 0) {
                                                $totalTable.find('td[data-key="' + key + '"][data-clone]').each(function () {
                                                    $(this).prev().removeClass('isDrag').css({
                                                        'position': 'relative',
                                                        'z-index': 'inherit',
                                                        'left': 'inherit',
                                                        'width': 'inherit',
                                                        'background-color': 'inherit'
                                                    });
                                                    $(this).remove();
                                                });
                                            }
                                        }

                                        $cloneHead = null;

                                        // 处理 toolbar 事件
                                        if (toolbar) {
                                            if ($dragBar.children('.active').length > 0 && $dragBar.children('.active').attr('data-type') !== $dragBar.attr('data-type')) {
                                                var targetFix = $dragBar.children('.active').attr('data-type'),
                                                    i, j, curPos, targetPos;
                                                for (i = 0; i < myTable.cols.length; i++) {
                                                    for (j = 0; j < myTable.cols[i].length; j++) {
                                                        if (targetFix === 'right' || (targetFix === 'none' && $dragBar.attr('data-type') === 'right')) {
                                                            if (typeof targetPos === 'undefined') {
                                                                if (myTable.cols[i][j].fixed === 'right') {
                                                                    targetPos = { x: i, y: j };
                                                                } else if (j === myTable.cols[i].length - 1) {
                                                                    targetPos = { x: i, y: j + 1 };
                                                                }

                                                            }
                                                        } else {
                                                            if (typeof targetPos === 'undefined' && (!myTable.cols[i][j].fixed || myTable.cols[i][j].fixed === 'right')) {
                                                                targetPos = { x: i, y: j };
                                                            }
                                                        }
                                                        if (myTable.cols[i][j].key === curKey) {
                                                            curPos = { x: i, y: j };
                                                        }
                                                    }
                                                }
                                                curColumn['fixed'] = targetFix === 'none' ? false : targetFix;

                                                if (curPos.y !== targetPos.y) {
                                                    myTable.cols[curPos.x].splice(curPos.y, 1);

                                                    if (curPos.y < targetPos.y) {
                                                        targetPos.y -= 1
                                                    }

                                                    myTable.cols[targetPos.x].splice(targetPos.y, 0, curColumn)

                                                    _this.fixTableRemember(myTable);
                                                }
                                                table.reload(tableId)
                                            }
                                            $dragBar.removeClass('active')
                                        }
                                        // 拖列后保留原 data-key/col.key；改宽一律按 key/field，不按下标拼 key

                                    } else {
                                        $that.unbind('click');
                                    }
                                    if ($('#column-remove').is(':visible')) {
                                        $tableHead.find('thead>tr>th[data-key=' + key + ']').addClass(HIDE);
                                        $tableBody.find('tbody>tr>td[data-key="' + key + '"]').addClass(HIDE);
                                        $totalTable.find('tbody>tr>td[data-key="' + key + '"]').addClass(HIDE);
                                        // 同步配置
                                        curColumn['hide'] = true
                                        _this.fixTableRemember(myTable);
                                        // 更新下拉隐藏
                                        $('#soul-columns' + tableId).find('li[data-value="' + field + '"]>input').prop('checked', false);
                                        tableFilter.resize(myTable)
                                    }
                                    $('#column-remove').hide();
                                }
                            })
                        });
                })
            }
        },
        rowDrag: function (myTable, rowDragConfig) {
            var _this = this,
                $table = $(myTable.elem),
                $tableBox = $table.next().children('.layui-table-box'),
                $fixedBody = $tableBox.children('.layui-table-fixed').children('.layui-table-body').children('table'),
                $noFixedBody = $tableBox.children('.layui-table-body').children('table'),
                $tableBody = $.merge($tableBox.children('.layui-table-body').children('table'), $fixedBody),
                tableId = myTable.id,
                isDragging = false,
                trigger = rowDragConfig.trigger || 'row',
                syncNumber = rowDragConfig.numbers !== false,
                numberColumnKey = null, numberStart = 0,
                $trs = trigger === 'row' ? $tableBody.children('tbody').children('tr') : $tableBody.find(trigger),
                i, j;
            if (trigger !== 'row') {
                $tableBody.find(trigger).css('cursor', 'move')
            }
            for (i = 0; i < myTable.cols.length; i++) {
                for (j = 0; j < myTable.cols[i].length; j++) {
                    if (myTable.cols[i][j].type === 'numbers') {
                        // 用 col.key，不用下标拼 key
                        numberColumnKey = myTable.cols[i][j].key || (myTable.index + '-' + i + '-' + j);
                        numberStart = parseInt($noFixedBody.find('td[data-key="' + numberColumnKey + '"]:first').text());
                        break;
                    }
                }
            }
            $trs.on('mousedown', function (e) {
                // 被暂停 或者 不是鼠标左键 则取消拖拽效果
                if (_this.suspendConfig[tableId].rowDrag || e.button !== 0) {
                    return;
                }
                var $this = trigger === 'row' ? $(this) : $(this).parents('tr:eq(0)'),
                    index = parseInt($this.data('index')), // 被拖拽行索引
                    $bodyTr = $noFixedBody.children('tbody').children('tr[data-index=' + index + ']'), // 被拖拽行（非固定列）
                    $cloneTr = $bodyTr.clone().css('visibility', 'hidden'), // 占位行
                    $FixBodyTr = $fixedBody.children('tbody').children('tr[data-index=' + index + ']'), // 被拖拽行（固定列）
                    bodyScrollTop = $tableBox.children('.layui-table-body').scrollTop(), // 记录当前滚动条位置
                    originTop = $this.position().top, // 被拖拽行当前位置
                    disY = e.clientY - originTop; // 鼠标距离被拖拽行上侧的距离

                _BODY.on('mousemove', function (e) {

                    // 刚被拖动
                    if (!isDragging) {
                        isDragging = true;
                        // 设置鼠标样式
                        // $table.next().find('style').append('.layui-table-view .layui-table td{cursor: move;}.layui-table tr{transition: none}')
                        var style = $table.next().find('style')[0],
                            sheet = style.sheet || style.styleSheet || {};
                        _this.addCSSRule(sheet, '.layui-table-view .layui-table td', 'cursor: move')
                        _this.addCSSRule(sheet, '.layui-table tr', 'transition: none')

                        $tableBox.addClass('noselect'); // 禁止选中文本

                        $bodyTr.after($cloneTr);
                        $bodyTr.css({
                            'position': 'absolute',
                            'z-index': 1
                        })

                        $FixBodyTr.each(function () {
                            $(this).after($(this).clone().css('visibility', 'hidden'))
                            $(this).css({
                                'position': 'absolute',
                                'z-index': 102
                            })
                        })
                    }

                    var top = e.clientY - disY + ($tableBox.children('.layui-table-body').scrollTop() - bodyScrollTop), // 计算当前被移动行top位置应该哪里
                        trTop = $cloneTr.position().top, //当前行所在位置
                        $UpTr = $bodyTr.prev(),
                        hasUpTr = $UpTr.length > 0,
                        $downTr = $cloneTr.next(),
                        hasDownTr = $downTr.length > 0,
                        upMove = hasUpTr && (trTop - top > $UpTr.height() / 2.0),
                        downMove = hasDownTr && (top - trTop > $downTr.height() / 2.0);

                    if (trTop - top > 0 ? !hasUpTr : !hasDownTr) {
                        $bodyTr.css('top', trTop);
                        $FixBodyTr.each(function () {
                            $(this).css('top', trTop);
                        })
                        return;
                    }

                    $bodyTr.css('top', top);
                    $FixBodyTr.each(function () {
                        $(this).css('top', top);
                    })

                    if (upMove) {
                        updateDataIndex($bodyTr, -1)
                        $cloneTr.after(updateDataIndex($UpTr, 1));
                        $FixBodyTr.each(function () {
                            updateDataIndex($(this), -1)
                            $(this).next().after(updateDataIndex($(this).prev(), 1));
                        })
                    } else if (downMove) {
                        updateDataIndex($bodyTr, 1).before(updateDataIndex($downTr, -1))
                        $FixBodyTr.each(function () {
                            updateDataIndex($(this), 1);
                            $(this).before(updateDataIndex($(this).next().next(), -1));
                        })
                    }

                    // 同步 data-index
                    function updateDataIndex($el, diff) {
                        var tempIndex = parseInt($el.data('index')) + diff;
                        $el.data('index', tempIndex);
                        $el.attr('data-index', tempIndex);
                        return $el
                    }

                }).on('mouseup', function (e) {
                    _BODY.off('mousemove').off('mouseup');

                    if (isDragging) {
                        isDragging = false;

                        $tableBox.removeClass('noselect'); // 取消禁止选中文本
                        $bodyTr.css({ 'position': 'inherit', 'z-index': 'inherit' });
                        $bodyTr.next().remove();
                        $FixBodyTr.each(function () {
                            $(this).css({ 'position': 'inherit', 'z-index': 'inherit' });
                            $(this).next().remove()
                        })

                        // 恢复样式
                        var style = $table.next().find('style')[0],
                            sheet = style.sheet || style.styleSheet || {},
                            rules = sheet.cssRules || sheet.rules;
                        layui.each(rules, function (i, item) {
                            if (item.selectorText === ('.layui-table-view .layui-table td')) {
                                item.style.cursor = 'default';
                            }
                        });

                        var newIndex = $this.index(),
                            cache = table.cache[tableId];

                        if (newIndex !== index) { // 有位置变动
                            // 如果 before 返回 false，则还原拖拽
                            if (typeof rowDragConfig.before === 'function'
                                && rowDragConfig.before.call(myTable, {
                                    row: cache[index],
                                    newIndex: newIndex,
                                    oldIndex: index,
                                    cache: cache
                                }) === false) {

                                // 同步 data-index
                                function updateDataIndex($el, setIndex) {
                                    $el.data('index', setIndex);
                                    $el.attr('data-index', setIndex);
                                    return $el
                                }

                                // 还原位置和索引
                                if (newIndex < index) {
                                    for (i = newIndex; i < index; i++) {
                                        updateDataIndex($noFixedBody.find('tr[data-index="' + (i + 1) + '"]'), i)
                                        updateDataIndex($fixedBody.find('tr[data-index="' + (i + 1) + '"]'), i)
                                    }
                                    updateDataIndex($bodyTr, index)
                                    $noFixedBody.find('tr[data-index="' + (index - 1) + '"]').after($bodyTr)
                                    $FixBodyTr.each(function () {
                                        updateDataIndex($(this), index)
                                        $(this).parent().children('tr[data-index="' + (index - 1) + '"]').after($(this))
                                    })
                                } else {
                                    for (i = newIndex; i > index; i--) {
                                        updateDataIndex($noFixedBody.find('tr[data-index="' + (i - 1) + '"]'), i)
                                        updateDataIndex($fixedBody.find('tr[data-index="' + (i - 1) + '"]'), i)
                                    }
                                    updateDataIndex($bodyTr, index)
                                    $noFixedBody.find('tr[data-index="' + (index + 1) + '"]').before($bodyTr)
                                    $FixBodyTr.each(function () {
                                        updateDataIndex($(this), index)
                                        $(this).parent().children('tr[data-index="' + (index + 1) + '"]').before($(this))
                                    })
                                }
                                return;
                            }

                            var row = cache.splice(index, 1)[0];
                            cache.splice(newIndex, 0, row);
                            if (numberColumnKey && syncNumber) {
                                // 进行序号重排
                                var sortedIndexs = [newIndex, index].sort()
                                for (i = sortedIndexs[0]; i <= sortedIndexs[1]; i++) {
                                    var curIndex = numberStart + i;
                                    $fixedBody.find('td[data-key="' + numberColumnKey + '"]:eq(' + i + ')').children().html(curIndex)
                                    $noFixedBody.find('td[data-key="' + numberColumnKey + '"]:eq(' + i + ')').children().html(curIndex)
                                    cache[i][table.config.indexName] = curIndex - 1
                                }
                            }
                            if (typeof rowDragConfig.done === 'function') {

                                rowDragConfig.done.call(myTable, {
                                    row: row,
                                    newIndex: newIndex,
                                    oldIndex: index,
                                    cache: cache
                                })
                            }
                        }

                    }
                })
            })
        },
        fixTableRemember: function (myTable, dict) {

            if (typeof myTable.filter === 'undefined' ? (defaultConfig.filter && defaultConfig.filter.cache) : myTable.filter.cache) {
                if (dict && dict.rule) {
                    // selector: .laytable-cell-{index}-{row}-{col} → 用完整 key 匹配 col.key
                    var sel = String(dict.rule.selectorText || '').replace(/^\.laytable-cell-/, '');
                    var fullKey = sel;
                    var shortKey = sel.split('-').length >= 3 ? sel.split('-').slice(-2).join('-') : sel;
                    for (var i = 0; i < myTable.cols.length; i++) {
                        for (var j = 0; j < myTable.cols[i].length; j++) {
                            var ck = myTable.cols[i][j] && myTable.cols[i][j].key != null
                                ? String(myTable.cols[i][j].key) : '';
                            var ckShort = ck.split('-').length >= 3 ? ck.split('-').slice(-2).join('-') : ck;
                            if (ck && (ck === fullKey || ck === shortKey || ckShort === shortKey)) {
                                myTable.cols[i][j].width = dict.rule.style.width.replace('px', '');
                                break;
                            }
                        }
                    }
                }
                var storeKey = location.pathname + location.hash + myTable.id;
                localStorage.setItem(storeKey, this.deepStringify(myTable.cols))
            }
        },
        clearCache: function (myTable) {
            if (!myTable) {
                return;
            }
            var tableId;
            if (typeof myTable === 'object') {
                if (typeof myTable.config !== 'undefined') {
                    tableId = myTable.config.id
                } else {
                    tableId = myTable.id
                }
            } else {
                tableId = myTable
            }
            localStorage.removeItem(location.pathname + location.hash + tableId)
            if (originCols[tableId]) {
                this.updateCols(tables[tableId], this.deepClone(originCols[tableId]))
            }
        },
        overflow: function (myTable, overflowConfig) {
            var options = {};
            if (typeof overflowConfig === 'string') {
                options = {
                    type: overflowConfig
                }
            } else if (typeof overflowConfig === 'object') {
                options = overflowConfig
            } else {
                return;
            }
            var $table = $(myTable.elem),
                layHeader = $table.next().find('.layui-table-header'),
                layBody = $table.next().find('.layui-table-body'),
                layTotal = $table.next().find('.layui-table-total'),
                tooltipIndex,
                hoverTime = options.hoverTime || 0,
                tooltipTimeOut,
                color = options.color || 'white',
                bgColor = options.bgColor || 'black',
                minWidth = options.minWidth || 300,
                maxWidth = options.maxWidth || 300;

            if (options.type === 'tips') {
                layBody.off('mouseenter', 'td').off('mouseleave', 'td').on('mouseenter', 'td', function () {
                    var _this = this;
                    tooltipTimeOut = setTimeout(function () {
                        toopTip.call(_this)
                    }, hoverTime)
                }).on('mouseleave', 'td', function () {
                    toopTip.call(this, 'hide')
                })
                if (options.header) {
                    layHeader.off('mouseenter', 'th').off('mouseleave', 'th').on('mouseenter', 'th', function () {
                        var _this = this;
                        tooltipTimeOut = setTimeout(function () {
                            toopTip.call(_this)
                        }, hoverTime)
                    }).on('mouseleave', 'th', function () {
                        toopTip.call(this, 'hide')
                    })
                }
                if (options.total) {
                    layTotal.off('mouseenter', 'td').off('mouseleave', 'td').on('mouseenter', 'td', function () {
                        var _this = this;
                        tooltipTimeOut = setTimeout(function () {
                            toopTip.call(_this)
                        }, hoverTime)
                    }).on('mouseleave', 'td', function () {
                        toopTip.call(this, 'hide')
                    })
                }

                function toopTip(hide) {
                    clearTimeout(tooltipTimeOut);
                    var othis = $(this)
                        , elemCell = othis.children('.layui-table-cell')
                        , width = elemCell.outerWidth()
                        , layerWidth = width < minWidth ? minWidth : width > maxWidth ? maxWidth : width;
                    if (othis.data('off')) return;

                    if (hide) {
                        layer.close(tooltipIndex)
                    } else if (elemCell.prop('scrollWidth') > width) {
                        tooltipIndex = layer.tips('<span style="color: ' + color + '">' + $(this).text() + '</span>', this, {
                            tips: [1, bgColor],
                            maxWidth: layerWidth,
                            time: 0
                        });
                    }
                }
            } else if (options.type === 'title') {
                layBody.off('mouseenter', 'td').on('mouseenter', 'td', function () {
                    var othis = $(this)
                        , elemCell = othis.children('.layui-table-cell');
                    if (othis.data('off')) return;

                    if (elemCell.prop('scrollWidth') > elemCell.outerWidth()) {
                        elemCell.attr('title', $(this).text())
                    }
                })
                if (options.header) {
                    layHeader.off('mouseenter', 'th').on('mouseenter', 'th', function () {
                        var othis = $(this)
                            , elemCell = othis.children('.layui-table-cell');
                        if (othis.data('off')) return;

                        if (elemCell.prop('scrollWidth') > elemCell.outerWidth()) {
                            elemCell.attr('title', $(this).text())
                        }
                    })
                }
                if (options.total) {
                    layTotal.off('mouseenter', 'td').on('mouseenter', 'td', function () {
                        var othis = $(this)
                            , elemCell = othis.children('.layui-table-cell');
                        if (othis.data('off')) return;

                        if (elemCell.prop('scrollWidth') > elemCell.outerWidth()) {
                            elemCell.attr('title', $(this).text())
                        }
                    })
                }
            }

        },
        // 右键菜单配置
        contextmenu: function (myTable, contextmenuConfig) {
            var $table = $(myTable.elem),
                $tableBox = $table.next().children('.layui-table-box'),
                $tableHead = $.merge($tableBox.children('.layui-table-header').children('table'), $tableBox.children('.layui-table-fixed').children('.layui-table-header').children('table')),
                $fixedBody = $tableBox.children('.layui-table-fixed').children('.layui-table-body').children('table'),
                $tableBody = $.merge($tableBox.children('.layui-table-body').children('table'), $fixedBody),
                $totalTable = $table.next().children('.layui-table-total').children('table'),
                tableId = myTable.id,
                header = contextmenuConfig ? contextmenuConfig.header : '',
                body = contextmenuConfig ? contextmenuConfig.body : '',
                total = contextmenuConfig ? contextmenuConfig.total : '',
                blank = contextmenuConfig ? contextmenuConfig.blank : '',
                options = {
                    header: { box: $tableHead, tag: 'th', opts: header, cols: {} },
                    body: { box: $tableBody, tag: 'td', opts: body, cols: {}, isBody: true },
                    total: { box: $totalTable, tag: 'td', opts: total, cols: {} },
                    blank: { box: $tableBox.children('.layui-table-body'), tag: '', opts: blank, cols: {} }
                },
                hasColsContext = false;

            for (var i = 0; i < myTable.cols.length; i++) {
                for (var j = 0; j < myTable.cols[i].length; j++) {
                    if (myTable.cols[i][j].contextmenu) {
                        hasColsContext = true
                        options.header.cols[myTable.cols[i][j].key] = myTable.cols[i][j].contextmenu.header
                        options.body.cols[myTable.cols[i][j].key] = myTable.cols[i][j].contextmenu.body
                        options.total.cols[myTable.cols[i][j].key] = myTable.cols[i][j].contextmenu.total
                    }
                }
            }

            if (!contextmenuConfig && !hasColsContext) {
                return;
            }


            for (var name in options) {
                (function (name) {
                    var opt = options[name];
                    var $el = opt.tag ? opt.box.find(opt.tag) : opt.box;
                    // 左键点格子直接关菜单（不依赖 document 冒泡）
                    $el.on('mousedown.soulTableCtxCell', function (e) {
                        if (e.button !== 0) return;
                        $('#soul-table-contextmenu-wrapper').remove();
                    });
                    $el.on('contextmenu', function (e) {
                        if (!opt.tag && $(e.target).closest('td,th').length) return;
                        $('#soul-table-contextmenu-wrapper').remove();
                        _BODY.append('<div id="soul-table-contextmenu-wrapper"></div>');
                        var curColsOpts = opt.cols[$(this).data('key')];
                        if (curColsOpts === false) {
                            return false
                        } else if (curColsOpts && curColsOpts.length > 0) {
                            genePanel($('#soul-table-contextmenu-wrapper'), e.pageX, e.pageY, curColsOpts, $(this), opt.box, opt.tag, opt.isBody);
                            return false
                        } else if (opt.opts === false) {
                            return false
                        } else {
                            var menu = typeof opt.opts === 'function' ? opt.opts() : opt.opts;
                            if (menu && menu.length > 0) {
                                genePanel($('#soul-table-contextmenu-wrapper'), e.pageX, e.pageY, menu, $(this), opt.box, opt.tag, opt.isBody);
                                return false
                            }
                        }
                    })
                })(name)
            }

            // 点表格外任意处关闭
            $(document).off('mousedown.soulTableCtx').on('mousedown.soulTableCtx', function (e) {
                if ($(e.target).closest('#soul-table-contextmenu-wrapper').length) return;
                $('#soul-table-contextmenu-wrapper').remove();
            });
            $(window).off('scroll.soulTableCtx').on('scroll.soulTableCtx', function () {
                $('#soul-table-contextmenu-wrapper').remove();
            });

            function genePanel($parent, left, top, options, $this, box, tag, isBody) {
                var html = [], i;

                html.push('<ul class="soul-table-contextmenu">');
                for (i = 0; i < options.length; i++) {
                    if (options[i].type === 'divider' || options[i].divider) {
                        html.push('<li class="soul-contextmenu-divider" data-index="' + i + '"></li>');
                        continue;
                    }
                    var disabled = typeof options[i].disabled === 'function' ? options[i].disabled() : options[i].disabled;
                    html.push('<li data-index="' + i + '" class="' + (disabled ? 'disabled ' : '') + (options[i].children && options[i].children.length > 0 ? 'contextmenu-children' : '') + '">')
                    if (options[i].icon) {
                        html.push('<i class="prefixIcon ' + options[i].icon + '" />')
                    } else {
                        html.push('<i class="prefixIcon" />')
                    }
                    html.push(options[i].name)

                    if (options[i].children && options[i].children.length > 0) {
                        html.push('<i class="endIcon layui-icon layui-icon-right" />')
                    }

                    html.push('</li>')
                }
                html.push('</ul>');
                $parent.append(html.join(''));
                var $curPanel = $parent.children().last();
                if (top + $curPanel.outerHeight() > _BODY.prop('scrollHeight')) {
                    top = top - $curPanel.outerHeight()
                    if (top < 0) {
                        top = 0
                    }
                }
                if ($parent.parent().data('direction') === 'left' && ($parent.offset().left - $curPanel.outerWidth()) > 0) {
                    left = -$curPanel.outerWidth();
                    $curPanel.data('direction', 'left')
                } else if (left + $curPanel.outerWidth() + $parent.offset().left > _BODY.prop('scrollWidth')) {
                    left = left - $curPanel.outerWidth() - $parent.outerWidth()
                    if (left + $parent.offset().left < 0) {
                        left = -$parent.offset().left
                    }
                    $curPanel.data('direction', 'left')
                }
                $curPanel.css({
                    top: top + 'px',
                    left: left + 'px'
                })

                for (i = 0; i < options.length; i++) {
                    if (typeof options[i].click === "function") {
                        (function (i) {
                            $parent.children('.soul-table-contextmenu:last').children('li[data-index="' + i + '"]').on('click', function () {
                                if ($(this).hasClass('disabled')) return;
                                var index = $this.parents('tr:eq(0)').data('index'),
                                    tr = box.find('tr[data-index="' + index + '"]'),
                                    row = layui.table.cache[tableId][index];

                                options[i].click.call(myTable, {
                                    cell: $this,
                                    elem: tag === 'th' ? $this : isBody ? box.children('tbody').children('tr[data-index="' + index + '"]').children('[data-key="' + $this.data('key') + '"]') : box.find('[data-key="' + $this.data('key') + '"]'),
                                    trElem: box.children('tbody').children('tr[data-index="' + index + '"]'),
                                    text: $this.text(),
                                    field: $this.data('field'),
                                    del: !isBody ? '' : function () {
                                        table.cache[tableId][index] = [];
                                        tr.remove();
                                        table.resize(tableId);
                                    },
                                    update: !isBody ? '' : function (fields) {
                                        fields = fields || {};
                                        layui.each(fields, function (key, value) {
                                            if (key in row) {
                                                var templet, td = tr.children('td[data-field="' + key + '"]');
                                                row[key] = value;
                                                table.eachCols(tableId, function (i, item2) {
                                                    if (item2.field == key && item2.templet) {
                                                        templet = item2.templet;
                                                    }
                                                });
                                                td.children('.layui-table-cell').html(function () {
                                                    return templet ? function () {
                                                        return typeof templet === 'function'
                                                            ? templet(row)
                                                            : layui.laytpl($(templet).html() || value).render(row)
                                                    }() : value;
                                                }());
                                                td.data('content', value);
                                            }
                                        });
                                    },
                                    row: isBody ? row : {},
                                })
                                $('#soul-table-contextmenu-wrapper').remove();
                            })
                        })(i)
                    }
                }
                $parent.children('.soul-table-contextmenu:last').children('li').on('mouseenter', function (e) {
                    e.stopPropagation()
                    $(this).siblings('.contextmenu-children').children('ul').remove();
                    if ($(this).hasClass('contextmenu-children')) {
                        genePanel($(this), $(this).outerWidth(), $(this).position().top, options[$(this).data('index')].children, $this, box, tag, isBody)
                    }
                })
            }

        },
        fixTotal: function (myTable) {
            var $table = $(myTable.elem),
                $total = $table.next().children('.layui-table-total'),
                style = $table.next().find('style')[0],
                sheet = style.sheet || style.styleSheet || {};
            if ($total.length > 0) {
                var $tableBox = $table.next().children('.layui-table-box'),
                    $fixedLeft = $tableBox.children('.layui-table-fixed-l').children('.layui-table-body').children('table').children('tbody').children('tr:eq(0)').children('td'),
                    $fixedRight = $tableBox.children('.layui-table-fixed-r').children('.layui-table-body').children('table').children('tbody').children('tr:eq(0)').children('td'),
                    html = [];

                $total.children('.layui-table-total-fixed').remove()

                if ($fixedLeft.length > 0) {
                    this.addCSSRule(sheet, '.layui-table-total-fixed-l .layui-table-patch', 'display: none')
                    $table.next().css('position', 'relative');
                    html.push('<table style="position: absolute;background-color: #fff;left: 0;top: ' + ($total.position().top + 1) + 'px" cellspacing="0" cellpadding="0" border="0" class="layui-table layui-table-total-fixed layui-table-total-fixed-l"><tbody><tr>');
                    $fixedLeft.each(function () {
                        if ($(this).data('key')) {
                            html.push($total.children('table:eq(0)').find('[data-key="' + $(this).data('key') + '"]').prop("outerHTML"))
                        }
                    })
                    html.push('</tr></tbody></table>');
                    $total.append(html.join(''))
                }
                if ($fixedRight.length > 0) {
                    this.addCSSRule(sheet, '.layui-table-total-fixed-r td:first-child', 'border-left:1px solid #e6e6e6')
                    this.addCSSRule(sheet, '.layui-table-total-fixed-r td:last-child', 'border-left: none')
                    $table.next().css('position', 'relative');
                    html = [];
                    html.push('<table style="position: absolute;background-color: #fff;right: 0;top: ' + ($total.position().top + 1) + 'px" cellspacing="0" cellpadding="0" border="0" class="layui-table layui-table-total-fixed layui-table-total-fixed-r"><tbody><tr>');
                    $fixedRight.each(function () {
                        html.push($total.children('table:eq(0)').find('[data-key="' + $(this).data('key') + '"]').prop("outerHTML"))
                    })
                    html.push('</tr></tbody></table>')
                    $total.append(html.join(''))
                }
            }

        },
        fixResizeRightFixed: function (myTable) {
            var _this = this,
                $table = $(myTable.elem),
                $tableBox = $table.next().children('.layui-table-box'),
                $fixedHead = $tableBox.children('.layui-table-fixed-r').children('.layui-table-header').children('table'),
                dict = {}, resizing, ELEM_SORT = 'layui-table-sort',
                ELEM_NO_SORT = 'layui-table-sort-invalid';
            if ($fixedHead.length > 0) {
                $fixedHead.find('th').off('mousemove').on('mousemove', function (e) {
                    var othis = $(this)
                        , oLeft = othis.offset().left
                        , pLeft = e.clientX - oLeft;
                    if (dict.resizeStart) {
                        return;
                    }
                    if (othis.width() - pLeft <= 10) {
                        _BODY.css('cursor', 'initial')
                    }
                    dict.allowResize = pLeft <= 10; //是否处于拖拽允许区域
                    _BODY.css('cursor', (dict.allowResize ? 'col-resize' : ''));
                }).off('mousedown').on('mousedown', function (e) {
                    var othis = $(this);
                    if (dict.allowResize) {
                        othis.find('.' + ELEM_SORT).removeClass(ELEM_SORT).addClass(ELEM_NO_SORT)
                        var key = othis.data('key');
                        e.preventDefault();
                        dict.resizeStart = true; //开始拖拽
                        dict.offset = [e.clientX, e.clientY]; //记录初始坐标

                        _this.getCssRule(myTable, key, function (item) {
                            var width = item.style.width || othis.outerWidth();
                            dict.rule = item;
                            dict.ruleWidth = parseFloat(width);
                            dict.othis = othis;
                            dict.minWidth = othis.data('minwidth') || myTable.cellMinWidth;
                        });
                    }
                });
                //拖拽中
                _DOC.on('mousemove', function (e) {
                    if (dict.resizeStart) {
                        layui.soulTable.fixTableRemember(myTable, dict)
                        e.preventDefault();
                        if (dict.rule) {
                            var setWidth = dict.ruleWidth - e.clientX + dict.offset[0];
                            if (setWidth < dict.minWidth) setWidth = dict.minWidth;
                            dict.rule.style.width = setWidth + 'px';
                        }
                        resizing = 1
                    }
                }).on('mouseup', function (e) {
                    if (dict.resizeStart) {
                        setTimeout(function () {
                            dict.othis.find('.' + ELEM_NO_SORT).removeClass(ELEM_NO_SORT).addClass(ELEM_SORT)
                            _BODY.css('cursor', '');
                            dict = {};
                            _this.scrollPatch(myTable);
                        }, 30)
                    }
                    if (resizing === 2) {
                        resizing = null;
                    }
                });
            }
        },
        fixFixedScroll: function (myTable) {
            var $table = $(myTable.elem),
                layFixed = $table.next().children('.layui-table-box').children('.layui-table-fixed'),
                layMain = $table.next().children('.layui-table-box').children('.layui-table-main');

            layFixed.on('mouseenter', function () {
                $(this).children('.layui-table-body').addClass('soul-fixed-scroll').on('scroll', function () {
                    var scrollTop = $(this).scrollTop()
                    // layFixed.children('.layui-table-body[class!="soul-fixed-scroll"]').scrollTop(scrollTop);
                    layMain.scrollTop(scrollTop);
                })
            }).on('mouseleave', function () {
                $(this).children('.layui-table-body').removeClass('soul-fixed-scroll').off('scroll');
            })
        },
        scrollPatch: function (myTable) {
            var $table = $(myTable.elem),
                layHeader = $table.next().children('.layui-table-box').children('.layui-table-header'),
                layTotal = $table.next().children('.layui-table-total'),
                layMain = $table.next().children('.layui-table-box').children('.layui-table-main'),
                layFixed = $table.next().children('.layui-table-box').children('.layui-table-fixed'),
                layFixRight = $table.next().children('.layui-table-box').children('.layui-table-fixed-r'),
                layMainTable = layMain.children('table'),
                scollWidth = layMain.width() - layMain.prop('clientWidth'),
                scollHeight = layMain.height() - layMain.prop('clientHeight'),
                outWidth = layMainTable.outerWidth() - layMain.width() //表格内容器的超出宽度

                //添加补丁
                , addPatch = function (elem) {
                    if (scollWidth && scollHeight) {
                        elem = elem.eq(0);
                        if (!elem.find('.layui-table-patch')[0]) {
                            var patchElem = $('<th class="layui-table-patch"><div class="layui-table-cell"></div></th>'); //补丁元素
                            patchElem.find('div').css({
                                width: scollWidth
                            });
                            elem.find('tr').append(patchElem);
                        }
                    } else {
                        elem.find('.layui-table-patch').remove();
                    }
                }

            addPatch(layHeader);
            addPatch(layTotal);

            //固定列区域高度
            var mainHeight = layMain.height()
                , fixHeight = mainHeight - scollHeight;
            layFixed.find('.layui-table-body').css('height', layMainTable.height() >= fixHeight ? fixHeight : 'auto');

            //表格宽度小于容器宽度时，隐藏固定列
            layFixRight[outWidth > 0 ? 'removeClass' : 'addClass'](HIDE);

            //操作栏
            layFixRight.css('right', scollWidth - 1);
        },
        /**
         * 一键粘贴
         * @param  {String} text [需要 copy 的属性，默认是 innerText，主要用途例如赋值 a 标签上的 href 链接]
         *
         * range + selection
         *
         * 1.创建一个 range
         * 2.把内容放入 range
         * 3.把 range 放入 selection
         *
         * 注意：参数 attr 不能是自定义属性
         * 注意：对于 user-select: none 的元素无效
         * 注意：当 id 为 false 且 attr 不会空，会直接复制 attr 的内容
         */
        copy: function (text) {
            var target;

            if (text) {
                target = document.createElement('div');
                target.id = 'tempTarget';
                target.style.opacity = '0';
                target.innerText = text;
                document.body.appendChild(target);
            } else {
                target = document.querySelector('#' + id);
            }

            try {
                var range = document.createRange();
                range.selectNode(target);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                document.execCommand('copy');
                window.getSelection().removeAllRanges();
            } catch (e) {
                console.log('复制失败')
            }

            if (text) {
                // remove temp target
                target.parentElement.removeChild(target);
            }
        },
        addCSSRule: function (sheet, selector, rules, index) {
            if ('insertRule' in sheet) {
                sheet.insertRule(selector + '{' + rules + '}', index)
            } else if ('addRule' in sheet) {
                sheet.addRule(selector, rules, index)
            }
        },
        deepStringify: function (obj) {
            var JSON_SERIALIZE_FIX = {
                PREFIX: "[[JSON_FUN_PREFIX_",
                SUFFIX: "_JSON_FUN_SUFFIX]]"
            };
            return JSON.stringify(obj, function (key, value) {
                if (typeof value === 'function') {
                    return JSON_SERIALIZE_FIX.PREFIX + value.toString() + JSON_SERIALIZE_FIX.SUFFIX;
                }
                return value;
            });
        },
        deepParse: function (str) {
            var JSON_SERIALIZE_FIX = {
                PREFIX: "[[JSON_FUN_PREFIX_",
                SUFFIX: "_JSON_FUN_SUFFIX]]"
            };
            return JSON.parse(str, function (key, value) {
                if (typeof value === 'string' &&
                    value.indexOf(JSON_SERIALIZE_FIX.SUFFIX) > 0 && value.indexOf(JSON_SERIALIZE_FIX.PREFIX) === 0) {
                    return eval("(" + value.replace(JSON_SERIALIZE_FIX.PREFIX, "").replace(JSON_SERIALIZE_FIX.SUFFIX, "") + ")");
                }
                return value;
            }) || {};
        },
        clearFilter: function (myTable) {
            tableFilter.clearFilter(myTable);
        },
        cache: tableFilter.cache,
        // 深度克隆-不丢失方法
        deepClone: function (obj) {
            var newObj = Array.isArray(obj) ? [] : {}
            if (obj && typeof obj === "object") {
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        newObj[key] = (obj && typeof obj[key] === 'object') ? this.deepClone(obj[key]) : obj[key];
                    }
                }
            }
            return newObj
        },
        clearOriginCols: function (tableId) {
            if (tableId) {
                delete originCols[tableId]
                delete autoWidthCols[tableId]
            } else {
                originCols = {}
                autoWidthCols = {}
            }
        },
        suspendConfig: {},
        /**
         * 暂停某个特性
         * @param tableId
         * @param type 暂停的类型，支持 'drag' 'rowDrag'
         * @param value true/false
         */
        suspend: function (tableId, type, value) {
            this.suspendConfig[tableId][type] = value
        }
    }

    // 输出
    exports('soulTable', mod);
});
