/**
 * 扩展的table控件，主要扩展了以下功能：
 * 1，表头edit属性，除了layui table原来的选项text、textarea以外，新增如下选项：
 *      1) date 日期选择器
 *      2) select 下拉框
 *      3) number 数字输入框
 */
layui.define(['table', 'laydate', 'dropdown', 'layer'], function (exports) {
    "use strict";

    // 支持的扩展编辑类型
    const EDIT_EXTEND_TYPES = ['date', 'select'];
    // 在原有的text类型上的扩展
    const EDIT_TEXT_EXTEND_TYPES = ['number'];

    var $ = layui.$;
    var table = layui.table;
    var laydate = layui.laydate;
    var dropdown = layui.dropdown;
    var layer = layui.layer;
    var hint = layui.hint();

    // api
    var eipTable = {
        config: {},
        // 事件
        on: table.on,
        // 遍历字段
        eachCols: table.eachCols,
        index: table.index,
        set: function (options) {
            var that = this;
            that.config = $.extend({}, that.config, options);
            return that;
        },
        init: table.init,
        renderData: table.renderData,
        updateRow: table.updateRow,
        checkStatus: table.checkStatus,
        setRowChecked: table.setRowChecked,
        getData: table.getData,
        cache: table.cache,
        resize: table.resize,
        exportFile: table.exportFile,
        getOptions: table.getOptions,
        hideCol: table.hideCol,
    };

    // 操作当前实例
    var thisEipTable = function () {
        var that = this;
        var options = that.config
        var id = options.id || options.index;

        return {
            config: options,
            reload: function (options, deep) {
                that.reload.call(that, options, deep);
            },
            reloadData: function (options, deep) {
                eipTable.reloadData(id, options, deep);
            }
        }
    }

    /**
     * 获取当前实例
     * @param {string} id 表格id
     * @returns {Class}
     */
    var getThisTable = function (id) {
        var that = thisEipTable.that[id];
        if (!that) hint.error(id ? ('The eipTable instance with ID \'' + id + '\' not found') : 'ID argument required');
        return that || null;
    }

    // 字符
    var MOD_NAME = 'eipTable';
    var MOD_TABLE_NAME = 'table';

    /**
     * 构造器
     * @class
     */
    var Class = function (options) {
        var that = this;
        that.index = ++eipTable.index;
        that.config = $.extend(true, {}, that.config, eipTable.config, options);
        // 初始化
        that.init();
        // 渲染表格
        that.render();
    };

    // 初始默认配置
    Class.prototype.config = {
    };
    
    // table渲染前，对扩展的edit类型的列进行处理
    var processBeforeTableRender = {};
    // 下拉框
    processBeforeTableRender.select = function (item) {
            // 利用表头属性的templet，选择某一个下拉项后，显示相应的text值
            // 对于已经在表头的属性中指定了templet，则以指定的templet为准，不进行扩展
            var orgiTemplet = item.templet;
            if (!orgiTemplet) {
                item.templet = function (row) {
                    var selectOptions = item.edit.options || [];
                    var selectedOption = selectOptions.find(function (option) {
                        return option.value === row[item.field];
                    });
                    return selectedOption ? selectedOption.text : '';
                };
            }
    };
    // 日期时间选择
    processBeforeTableRender.date = function (item) {
        // do nothing
    };
    // 数字输入
    processBeforeTableRender.number = function(item) {

    }

    // table 渲染后，对扩展的edit类型的列进行处理
    var processAfterTableDone = {};
    // 下拉框
    processAfterTableDone.select = function (item, tableId) {
        // 渲染下拉框
        var selectOptions = item.edit.options || [];
        var dropdownConfig = selectOptions.map(function (option) {
            return {
                id: option.value,
                title: option.text
            };
        });
        return dropdown.render({
            elem: 'div[lay-table-id="' + tableId + '"] td[data-field="' + item.field +  '"]',
            data: dropdownConfig,
            click: function(obj){
                var rows = table.cache[tableId];
                var td = $(this.elem);
                var tr = td.closest('tr');
                var index = tr.data('index');
                var oldValue = rows[index][item.field] || '';
                var value = obj.id;
                //事件回调的参数对象
                var params = commonMember.call(td[0], tableId, {
                    value: value,
                    field: item.field,
                    oldValue: oldValue,
                    td: td,
                    getCol: function(){ // 获取当前列的表头配置信息
                        return item;
                    }
                });
                
                // 更新缓存中的值
                var obj = {}; //变更的键值
                obj[item.field] = value;
                params.update(obj);

                // 执行 API 编辑事件
                var filter = getThisTable(tableId).config.elem.attr('lay-filter');
                layui.event.call(td[0], MOD_TABLE_NAME, 'edit('+ filter +')', params);
            }
        });
    };
    // 日期
    processAfterTableDone.date = function (item, tableId) {
        // 遍历该列的所有数据行，设置lay-date值，日期控件显示时，会取该值
        var rows = table.cache[tableId];
        var tdElems = $(`div[lay-table-id="${tableId}"] td[data-field="${item.field}"]`);
        tdElems.each(function (i, elem) {
            var index = $(elem).closest('tr').data('index');
            var value = rows[index][item.field] || '';
            $(elem).attr('lay-date', value);
        });
        // 组装渲染日期控件的参数
        var dateOptions = {
            elem: `div[lay-table-id="${tableId}"] td[data-field="${item.field}"]`,
            done: function (value, date, endDate) {
                var td = $(this.elem);
                var tr = td.closest('tr');
                var index = tr.data('index');
                var oldValue = rows[index][item.field] || '';
                //事件回调的参数对象
                var params = commonMember.call(td[0], tableId, {
                    value: value,
                    field: item.field,
                    oldValue: oldValue,
                    td: td,
                    getCol: function(){ // 获取当前列的表头配置信息
                        return item;
                    }
                });
                
                // 更新缓存中的值
                var obj = {}; //变更的键值
                obj[item.field] = value;
                params.update(obj);

                // 执行 API 编辑事件
                var filter = getThisTable(tableId).config.elem.attr('lay-filter');
                layui.event.call(td[0], MOD_TABLE_NAME, 'edit('+ filter +')', params);
            },
        };
        var dateOptions = $.extend({}, item.edit.options, dateOptions);
        return laydate.render(dateOptions);
    };
    // 输入输入
    processAfterTableDone.number = function (item, tableId) {
        var editTrigger = getThisTable(tableId).config.editTrigger || 'click';
        // 设置数字输入的检查
        $(`div[lay-table-id="${tableId}"] td[data-field="${item.field}"]`).on(editTrigger, function(e){
            var thisTd = $(this);
            setTimeout(() => {
                // 整数位默认10位
                var precision = 10;
                // 未指定小数位时，默认为整数
                var scale = 0;
                var max = '';
                var min = '';
                if (item.edit.options) {
                    item.edit.options.precision && (precision = item.edit.options.precision);
                    item.edit.options.scale && (scale = item.edit.options.scale);
                    if (typeof item.edit.options.max !== 'undefined') {
                        max = item.edit.options.max;
                    }
                    if (typeof item.edit.options.min !== 'undefined') {
                        min = item.edit.options.min;
                    }
                }
                // 详细的类型
                var subType = 'number';
                // 带有小数
                if (scale > 0) {
                    subType = (min !== '' && min >= 0) ? 'float' : 'floatSigned';
                }
                var editElem = $(`div[lay-table-id="${tableId}"] td[data-field="${item.field}"] .layui-table-edit`);
                editElem.data('oldvalue', editElem.val());
                // 监听input控件的输入事件,检查输入的是否是数字
                editElem.on('onkeypress', function(e){
                    keyPress(e, subType);
                }).on('onkeyup input', function(e){
                    changeText($(this), subType);
                }).on('change', function(e) {
                    var value = this.value;
                    var oldvalue = editElem.data('oldvalue');
                    if (value === "") return true;
                    if (!checkNumber(value, precision, scale)) {
                        var str = scale == "0" ? '请输入整数，最多' + precision + '位' : '请输入数字，整数位最多' + precision + '位，小数位最多' + scale + '位';
                        layer.tips(str, thisTd, {tips: '1'});
                        editElem.val(oldvalue);
                        return false;
                    }
                    var num = Number(value);
                    if (max !== "" && num > max) {
                        layer.tips('输入数字超过了最大值，最大值为' + max, thisTd, {tips: '1'});
                        editElem.val(oldvalue);
                        return false;
                    }
                    if (min !== "" && num < min) {
                        layer.tips('输入数字小于指定的最小值，最小值为' + min, thisTd, {tips: '1'});
                        editElem.val(oldvalue);
                        return false;
                    }
                    editElem.data('oldvalue', value);
                    return true;
                });
            }, 50);
        });
        // 检查数字格式
        function checkNumber(val, precision, scale) {
            let pattern = "^([\\+|\\-]?[0-9]{1," + precision + "})$|(^[\\+|\\-]?[0-9]{1," + precision + "}";
            // 精度小于等于0时，作为整数检查
            if (scale > 0) {
                pattern += "\\.[0-9]{1," + scale +"}";
            }
            pattern += ")$";
            let reg = new RegExp(pattern);
            return reg.test(val);
        }
        // Input输入限制
        function keyPress(e, type) {
            var event = e;
            var keyCode = event.which || event.keyCode;
            if (keyCode >= 37 && keyCode <= 40) {
                event.returnValue = true;
            } else if (type == 'number' || type == 'bank') {
                event.returnValue = (keyCode >= 48 && keyCode <= 57);
            } else if (type == 'float') {
                event.returnValue = ((keyCode >= 48 && keyCode <= 57) || keyCode == 46);
            } else if (type == 'floatSigned') {
                event.returnValue = ((keyCode >= 48 && keyCode <= 57) || keyCode == 46 || keyCode == 45);
            } else if (type == 'mobile' || type == 'phone') {
                event.returnValue = ((keyCode >= 48 && keyCode <= 57) || keyCode == 189);
            } else if (type == 'idcard') {
                event.returnValue = ((keyCode >= 48 && keyCode <= 57) || keyCode == 88);
            } else {
                event.returnValue = true;
            }
        }
        // Input文本过滤
        function changeText(dom, type) {
            var that = $(dom);
            var value = that.val();
            var newval = '';
            if (type == 'number') {
                // 替换非数字、减号
                newval = value.replace(/[^\d\-]/g, "");
                // 减号只出现在开头
                newval = newval.replace(/^\-/, "$#$").replace(/\-/g, "").replace("$#$", "-");
            } else if (type == 'bank') {
                newval = value.replace(/\D/g, '');
            } else if (type == 'float') {
                // 先把非数字的都替换掉，除了数字和.
                newval = value.replace(/[^\d.]/g, "");
                // 必须保证第一个为数字而不是.
                newval = newval.replace(/^\./g, "");
                // 保证只有出现一个.而没有多个.
                newval = newval.replace(/\.{2,}/g, ".");
                // 保证.只出现一次，而不能出现两次以上
                newval = newval.replace(".", "$#$").replace(/\./g, "").replace("$#$", ".");
            } else if (type == 'floatSigned') {
                // 替换非数字、点号、减号
                newval = value.replace(/[^\d.\-]/g, "");
                // 必须保证第一个为数字而不是.
                newval = newval.replace(/^\./g, "");
                // 保证只有出现一个.而没有多个.
                newval = newval.replace(/\.{2,}/g, ".");
                // 保证.只出现一次，而不能出现两次以上
                newval = newval.replace(".", "$#$").replace(/\./g, "").replace("$#$", ".");
                // 减号只出现在开头
                newval = newval.replace(/^\-/, "$#$").replace(/\-/g, "").replace("$#$", "-");
            } else if (type == 'ip') {
                // 先把非数字的都替换掉，除了数字和.
                newval = value.replace(/[^\d.]/g, "");
                // 必须保证第一个为数字而不是.
                newval = newval.replace(/^\./g, "");
                // 保证只有出现一个.而没有多个.
                newval = newval.replace(/\.{2,}/g, ".");
            } else if (type == 'mobile' || type == 'phone') {
                newval = value.replace(/[^\d-]/g, "");
            } else if (type == 'half') {
                newval = value.replace(/[^\x00-\xff]/g, '');
            } else if (type == 'char') {
                newval = value.replace(/[^a-zA-Z]/g, '');
            } else if (type == 'charnum') {
                newval = value.replace(/[^a-zA-Z0-9]/g, '');
            } else if (type == 'idcard') {
                newval = value.replace(/[^\dX]/g, "");
            } else {
                return;
            }
            if (newval === value) {
                return;
            }
            that.val(newval);
        }
    }

    // 数据行中的事件返回的公共对象成员
    var commonMember = function(talbeId, sets){
        var othis = $(this);
        var tr = othis.closest('tr');
        var index = tr.data('index');
        var data = table.cache[talbeId] || [];
        var options = getThisTable(talbeId).config;
    
        data = data[index] || {};
    
        // 事件返回的公共成员
        var obj = {
            tr: tr, // 行元素
            config: options,
            data: table.clearCacheKey(data), // 当前行数据
            dataCache: data, // 当前行缓存中的数据
            index: index,
            del: function () { // 删除行数据
                table.cache[talbeId][index] = [];
                tr.remove();
                getThisTable(talbeId).scrollPatch();
            },
            update: function (fields, related) { // 修改行数据
                fields = fields || {};
                table.updateRow(talbeId, {
                    index: index,
                    data: fields,
                    related: related
                });
                // 更新当前行数据后，重新生成一下obj.data数据对象，以保证obj.data是最新数据
                obj.data = table.clearCacheKey(data);
            },
            // 设置行选中状态
            setRowChecked: function (opts) {
                table.setRowChecked(tableId, $.extend({
                    index: index
                }, opts));
            }
        };
        return $.extend(obj, sets);
    };      
    // 更新表格配置
    var updateOptions = function (id, options, reload) {
        var done = options.done;

        // 在表格渲染后，对扩展的edit类型进行处理
        if (!reload || (reload && done && !done.mod)) {
            options.done = function () {
                var args = arguments;
                var doneThat = this;
                // 遍历表头，如果有edit属性，则判断edit属性的值是否是扩展类型，如果是，则对扩展类型的列进行处理
                eachCols1(function (i, item) {
                    var editType = getColEditType(item);
                    if (!editType) {
                        return;
                    }
                    if (EDIT_EXTEND_TYPES.indexOf(editType) > -1) {
                        processAfterTableDone[editType](item, id);
                        // 设置td的data-edit-ext属性
                        $(`div[lay-table-id="${id}"] td[data-field="${item.field}"]`).attr('data-edit-ext', editType);
                    } else if (EDIT_TEXT_EXTEND_TYPES.indexOf(editType) > -1) {
                        processAfterTableDone[editType](item, id);
                    }
                }, options.cols);

                // 调用原有的done函数
                if (layui.type(done) === 'function') {
                    return done.apply(doneThat, args);
                }
            };
            options.done.mod = true;
        }
    }

    // 获取原始表格配置信息
    Class.prototype.getOptions = function () {
        var that = this;
        if (that.tableIns) {
            return table.getOptions(that.tableIns.config.id); // 获取表格的实时配置信息
        } else {
            return that.config;
        }
    };

    // 取得表头定义edit属性的type值
    function getColEditType(col) {
        var editType = col.edit;
        if (typeof editType === 'function') {
            // 暂不支持function类型
            editType = 'function';
        } else if (typeof editType === 'object' && editType.type) {
            editType = editType.type;
        }
        return editType;
    }

    // 因为table原有的遍历表头结构函数，无法在遍历时对表进行修改，所以重新定义一个函数，可以在遍历时对表头的属性进行修改
    function eachCols1(callback, cols) {
        var arrs = [], index = 0;

        //重新整理表头结构
        layui.each(cols, function (i1, item1) {
            if (i1) return true; // 只需遍历第一层
            layui.each(item1, function (i2, item2) {
                eachChildCols(index, cols, i1, item2);
                if (item2.PARENT_COL_INDEX) return; //如果是子列，则不进行追加，因为已经存储在父列中
                arrs.push(item2)
            });
        });

        //重新遍历列，如果有子列，则进入递归
        var eachArrs = function (obj) {
            layui.each(obj || arrs, function (i, item) {
                if (item.CHILD_COLS) return eachArrs(item.CHILD_COLS);
                typeof callback === 'function' && callback(i, item);
            });
        };

        eachArrs();
    };
    function eachChildCols(index, cols, i1, item2) {
        //如果是组合列，则捕获对应的子列
        if (item2.colGroup) {
            var childIndex = 0;
            index++;
            item2.CHILD_COLS = [];
            // 找到它的子列所在cols的下标
            var i2 = i1 + (parseInt(item2.rowspan) || 1);
            layui.each(cols[i2], function (i22, item22) {
                if (item22.parentKey) { // 如果字段信息中包含了parentKey和key信息
                    if (item22.parentKey === item2.key) {
                        item22.PARENT_COL_INDEX = index;
                        item2.CHILD_COLS.push(item22);
                        eachChildCols(index, cols, i2, item22);
                    }
                } else {
                    // 没有key信息以colspan数量所谓判断标准
                    //如果子列已经被标注为{PARENT_COL_INDEX}，或者子列累计 colspan 数等于父列定义的 colspan，则跳出当前子列循环
                    if (item22.PARENT_COL_INDEX || (childIndex >= 1 && childIndex == (item2.colspan || 1))) return;
                    item22.PARENT_COL_INDEX = index;
                    item2.CHILD_COLS.push(item22);
                    childIndex = childIndex + (parseInt(item22.colspan > 1 ? item22.colspan : 1));
                    eachChildCols(index, cols, i2, item22);
                }
            });
        }
    };

    // 去掉配置信息中影响原始表格渲染的参数
    Class.prototype.getRawOptions = function () {
        var that = this;
        var options = that.config;
        var rawOptions = $.extend(true, {}, options);

        // 去掉配置信息中影响原始表格渲染的参数
        eachCols1(function (i, item) {
            var editType = getColEditType(item);
            if (!editType) {
                return;
            }
            if (EDIT_EXTEND_TYPES.indexOf(editType) > -1) {
                delete item.edit;
            } else if (EDIT_TEXT_EXTEND_TYPES.indexOf(editType) > -1) {
                item.edit = 'text';
            }
        }, rawOptions.cols);

        return rawOptions;
    };

    // 初始化
    Class.prototype.init = function() {
        var that = this;
        var options = that.config;

        // 遍历表头属性，如果有edit属性，则判断edit属性的值是否是扩展类型，如果是，则对扩展类型的列进行处理
        eachCols1(function (i, item) {
            var editType = getColEditType(item);
            if (!editType) {
                return;
            }
            if (EDIT_EXTEND_TYPES.indexOf(editType) > -1 || EDIT_TEXT_EXTEND_TYPES.indexOf(editType) > -1) {
                processBeforeTableRender[editType](item);
            }
        }, options.cols);
        
        // 如果指定了edit表头属性，且指定的属性值是扩展属性值的场合，删除edit表头属性
        var tableOptions = that.getRawOptions();
        // 先初始一个空的表格以便拿到对应的表格实例信息
        var tableIns = table.render($.extend({}, tableOptions, {
            data: [],
            url: '',
            done: null
        }));
        var id = tableIns.config.id;
        thisEipTable.that[id] = that; // 记录当前实例对象
        that.tableIns = tableIns;

        // 更新表格配置信息
        updateOptions(id, options);
    }

   	// 表格渲染
    Class.prototype.render = function (type) {
        var that = this;
        // 如果指定了edit表头属性，且指定的属性值是扩展属性值的场合，删除edit表头属性
        var tableOptions = that.getRawOptions();
        that.tableIns = table[type === 'reloadData' ? 'reloadData' : 'reload'](that.tableIns.config.id, $.extend(true, {}, tableOptions));
        that.config = that.tableIns.config;
    };

    // 表格重载
    Class.prototype.reload = function (options, deep, type) {
        var that = this;

        options = options || {};
        delete that.haveInit;

        // 防止数组深度合并
        layui.each(options, function (key, item) {
            if (layui.type(item) === 'array') delete that.config[key];
        });

        // 对参数进行深度或浅扩展
        that.config = $.extend(deep, {}, that.config, options);

        // 根据需要处理options中的一些参数
        updateOptions(that.getOptions().id, options, type || true);

        // 执行渲染
        that.render(type);
    };

    // 记录所有实例
    thisEipTable.that = {}; // 记录所有实例对象

    // 重载
    eipTable.reload = function (id, options, deep, type) {
        var that = getThisTable(id);
        if (!that) return;
        that.reload(options, deep, type);
        return thisEipTable.call(that);
    };

    // 仅重载数据
    eipTable.reloadData = function () {
        var args = $.extend(true, [], arguments);
        args[3] = 'reloadData';

        return eipTable.reload.apply(null, args);
    };

    // 核心入口
    eipTable.render = function (options) {
        var inst = new Class(options);
        return thisEipTable.call(inst);
    };

    exports(MOD_NAME, eipTable);
});