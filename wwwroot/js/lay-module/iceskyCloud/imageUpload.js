/**
 * 【普通页面上传】
 * imageUpload.render({ id: '#F_SamplePhotoUrl', url: '/FileManage/Uploadfile/Upload', maxCount: 10 });
 * render 返回实例：getValue() / setValue(v) / update(patch)
 *
 * 【表格上传】
 * imageUpload.autoSetUploadColumn(cols[0]);
 * imageUpload.initTableAllImages({ id: '#F_Photo', tableId: 'currentTableId', ... });
 * imageUpload.initTableAllImages / refreshTable：只处理 :empty 上传格（树展开后调 refreshTable 补绑）
 * auto:false（默认）选完只预览，保存时 submitAll 再上传；选完/删除都会回写当前值
 * auto:true 选完即上传；成功/删除后调 on.change（表单: elem,value；表格: {field,value,data}）
 *
 * 【统一提交】
 * imageUpload.submitAll().then(res => { ... }); // auto:false 时把 pending 上传并回写
 */

const store = {
    records: new Map(),   // key -> { type:'form'|'table', images:[] }
    pending: new Map(),   // key -> [{ file, base64, url, fileType }]
    uploaders: new Map()  // '#row_xxx' -> layui upload 实例
};

const imgItemHtml = (cfg, img) => {
    const attr = cfg.field.startsWith('table_upload_') ? 'data-name' : 'name';
    return `
      <span style="display:inline-block;position:relative;margin-right:4px;">
        <input type="hidden" ${attr}="${cfg.field}" value="${img}"/>
        <img class="upload-img" width="${cfg.width}" height="${cfg.height}" src="${img}" style="cursor:pointer"/>
        <i class="layui-icon layui-icon-close ${cfg.readonly ? 'layui-hide' : ''}"
           style="position:absolute;right:-5px;top:-5px;font-size:12px;color:#FF5722;background:#fff;border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.2);cursor:pointer;z-index:10;"></i>
      </span>`;
};

const uploadTpl = (cfg, imgs) => {
    let html = '';
    imgs.forEach(img => { html += imgItemHtml(cfg, img); });
    if (!cfg.readonly && imgs.length < cfg.maxCount) {
        html += `<i id="row_${cfg.field}" class="layui-icon layui-icon-upload-drag" style="margin-right:4px;font-size:${Math.min(cfg.width, cfg.height)}px;color:#16baaa;cursor:pointer;vertical-align:middle;"></i>`;
    }
    return html;
};

layui.define(['jquery', 'layer', 'table', 'upload', 'soulTable'], exports => {
    const $ = layui.$, layer = layui.layer, table = layui.table, soulTable = layui.soulTable, upload = layui.upload;

    const parseRes = res => {
        try { return typeof res === 'string' ? JSON.parse(res) : res; } catch (e) { return res; }
    };

    const destroyUploader = key => {
        if (!store.uploaders.has(key)) return;
        const $el = $(key);
        $el.off('click dragover dragleave drop upload.start upload.over upload.leave upload.drop');
        $el.next('.layui-upload-file').remove();
        $el.removeData('layui_upload_index');
        store.uploaders.delete(key);
    };

    const getRowId = (field, containerId) => {
        const prefix = `table_upload_${field}_`;
        return containerId.startsWith(prefix) ? containerId.slice(prefix.length) : '';
    };

    const childRows = r => r.children || r.child || r.LAY_DATA_CHILDREN;

    const eachRow = (rows, fn) => {
        if (!Array.isArray(rows)) return;
        rows.forEach(r => {
            if (!r) return;
            fn(r);
            eachRow(childRows(r), fn);
        });
    };

    const buildRowMap = (tableId) => {
        const map = new Map();
        eachRow(table.cache[tableId] || [], r => {
            if (r.F_Id != null && r.F_Id !== '') map.set(String(r.F_Id), r);
        });
        return map;
    };

    const tableView = (tableId) =>
        $(`#${tableId},[lay-filter="${tableId}"]`).first().next('.layui-table-view');

    // 按 cache 中的 F_Id 清无效行（树表缩起时 DOM 可能无子行，不能按 DOM 清）
    const cleanupTable = (tableId, field) => {
        const validIds = new Set(buildRowMap(tableId).keys());
        if (!validIds.size) {
            tableView(tableId).find(`.table-upload-container[id^="table_upload_${field}_"]`).each(function () {
                const rowId = getRowId(field, $(this).attr('id'));
                if (rowId) validIds.add(rowId);
            });
        }
        const prefix = `${tableId}|${field}|`;
        [...store.records.keys()].forEach(k => {
            if (k.startsWith(prefix) && !validIds.has(k.slice(prefix.length))) {
                store.records.delete(k);
                store.pending.delete(k);
            }
        });
        const containerPrefix = `table_upload_${field}_`;
        [...store.uploaders.keys()].forEach(k => {
            const idx = k.indexOf(containerPrefix);
            if (idx === -1) return;
            if (!validIds.has(k.slice(idx + containerPrefix.length))) destroyUploader(k);
        });
    };

    const uploadFile = (file, url, fileType) => new Promise(resolve => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('filetype', fileType);
        const load = layer.load();
        $.ajax({
            url, type: 'POST', data: fd, processData: false, contentType: false,
            success(res) {
                layer.close(load);
                res = parseRes(res);
                resolve(res);
            },
            error() { layer.close(load); layer.msg('上传异常'); resolve(null); }
        });
    });

    const instances = new Map();

    const asImages = value => {
        if (Array.isArray(value)) return value.filter(Boolean);
        var s = String(value || '');
        if (!s) return [];
        var out = [];
        var re = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+|[^,]+/g;
        var m;
        while ((m = re.exec(s))) out.push(m[0]);
        return out;
    };

    const setValue = (id, value) => {
        const field = String(id || '').replace(/^#/, '');
        const inst = instances.get(field);
        if (inst) inst.setValue(value);
    };

    const render = options => {
        const opt = $.extend({
            id: '', url: '/FileManage/Uploadfile/Upload', fileType: 1, maxCount: 1, auto: false,
            readonly: false, size: 5 * 1024 * 1024, value: [], width: 25, height: 25,
            isTable: false, rowId: 0, tableField: '', tableId: '', on: null
        }, options);

        const $box = $(`div${opt.id}`);
        if (!$box.length) return;

        const field = opt.id.replace('#', '');
        let images = Array.isArray(opt.value) ? [...opt.value] : [];
        const cfg = { field, maxCount: opt.maxCount, readonly: opt.readonly, width: opt.width, height: opt.height, isTable: opt.isTable, tableId: opt.tableId, tableField: opt.tableField, rowId: opt.rowId };
        const btnKey = `#row_${field}`;
        const storeKey = opt.isTable ? `${opt.tableId}|${opt.tableField}|${opt.rowId}` : field;
        const recordType = opt.isTable ? 'table' : 'form';
        const immediate = opt.auto === true;

        store.records.set(storeKey, { type: recordType, images });
        if (!store.pending.has(storeKey)) store.pending.set(storeKey, []);

        const sync = () => { store.records.get(storeKey).images = images; };

        /** 服务器地址（去掉未上传完的 base64） */
        const serverValue = () => images.filter(x => x && !String(x).startsWith('data:image')).join(',');

        /** 当前画面上的值，给 formData 双向绑定 */
        const currentValue = () => images.filter(Boolean).join(',');

        const emitChange = () => {
            const value = currentValue();
            if (opt.isTable) {
                // 不预先写 cache，交给 eipTableEdit.commitCell 统一写回并判断是否触发 onEditTool
                const row = buildRowMap(opt.tableId).get(String(opt.rowId)) || { F_Id: opt.rowId };
                if (typeof opt.on?.change === 'function') opt.on.change({ field: opt.tableField, value, data: row });
            } else {
                const $input = $(`input#${field}`);
                if ($input.length) $input.val(value).trigger('change');
                if (typeof opt.on?.change === 'function') opt.on.change($input[0] || $box[0], value);
            }
        };

        const paint = () => {
            destroyUploader(btnKey);
            $box.html(uploadTpl(cfg, images));
            sync();
            if (cfg.readonly || images.length >= cfg.maxCount || !$(btnKey).length) return;

            const inst = upload.render({
                elem: btnKey,
                url: opt.url,
                accept: 'images',
                acceptMime: 'image/*',
                auto: false,
                drag: true,
                data: { filetype: opt.fileType },
                size: Math.ceil(opt.size / 1024),
                choose(obj) {
                    if (images.length >= cfg.maxCount) return layer.msg(`最多上传 ${cfg.maxCount} 张`);
                    obj.preview((index, file, result) => {
                        images.push(result);
                        sync();
                        if (immediate) {
                            layer.load();
                            obj.upload(index, file);
                            const $btn = $box.find(btnKey);
                            $btn.before(imgItemHtml(cfg, result));
                            if (images.length >= cfg.maxCount) $btn.hide();
                        } else {
                            store.pending.get(storeKey).push({ file, base64: result, url: opt.url, fileType: opt.fileType });
                            paint();
                            emitChange();
                        }
                    });
                },
                done(res) {
                    layer.closeAll('loading');
                    res = parseRes(res);
                    if (res?.code === 0 && res.data?.[0]?.src) {
                        const idx = images.findIndex(x => x.startsWith('data:image'));
                        if (idx > -1) images[idx] = res.data[0].src;
                        sync();
                        paint();
                        if (immediate) emitChange();
                    } else {
                        layer.msg('上传失败');
                    }
                },
                error() { layer.closeAll('loading'); layer.msg('上传异常'); }
            });
            $('div' + options.id).find('input.layui-upload-file').removeAttr('name');
            store.uploaders.set(btnKey, inst);
        };
        paint();
        $box.off('click.upload').on('click.upload', '.upload-img', e => {
            const src = $(e.currentTarget).attr('src');
            src && layer.photos({ photos: { data: [{ src }] }, shade: 0.6, footer: false });
        }).on('click.upload', '.layui-icon-close', e => {
            const val = $(e.currentTarget).prevAll('input[type=hidden]').val();
            const idx = images.indexOf(val);
            if (idx === -1) return;
            store.pending.set(storeKey, store.pending.get(storeKey).filter(p => p.base64 !== val));
            images.splice(idx, 1);
            paint();
            emitChange();
        });
        const $targetInput = $(`input#${field}`);
        $targetInput.off('change.upload').on('change.upload', () => {
            var next = asImages($targetInput.val());
            if (next.join(',') === images.join(',')) return;
            images = next;
            store.pending.set(storeKey, []);
            sync();
            paint();
        });

        const api = {
            getValue: function () {
                return currentValue();
            },
            setValue: function (v) {
                images = asImages(v);
                store.pending.set(storeKey, []);
                sync();
                paint();
                if ($targetInput.length) $targetInput.val(images.join(','));
                emitChange();
                return api;
            },
            update: function (patch) {
                if (!patch) return api;
                $.extend(opt, patch);
                if (patch.maxCount != null) cfg.maxCount = patch.maxCount;
                // 修改内容：和其它控件一样，update({ disabled: true }) 也能禁用
                if (patch.disabled != null) cfg.readonly = !!patch.disabled;
                if (patch.readonly != null) cfg.readonly = patch.readonly;
                if (patch.width != null) cfg.width = patch.width;
                if (patch.height != null) cfg.height = patch.height;
                if (patch.value != null) api.setValue(patch.value);
                else paint();
                return api;
            }
        };
        instances.set(field, api);
        $box.data('fieldControl', api);
        $box.closest('td').data('fieldControl', api);
        return api;
    };

    const autoSetUploadColumn = cols => {
        (cols || []).forEach((col, idx) => {
            if (col?.config?.type === 'imageUpload') {
                col.templet = d => {
                    const rowKey = d.F_Id ?? d.LAY_INDEX ?? idx;
                    return `<div id="table_upload_${col.field}_${rowKey}" class="table-upload-container"></div>`;
                };
            }
        });
    };

    // tableId -> Map<field, config>
    const tableImageConfigs = new Map();

    const initOne = (config, field, $el, rowMap) => {
        if (!$el.length || !$el.is(':empty')) return;
        const id = $el.attr('id');
        if (!id) return;
        const rowId = getRowId(field, id);
        const cached = store.records.get(`${config.tableId}|${field}|${rowId}`)?.images;
        const raw = (rowMap.get(String(rowId)) || {})[field] || '';
        const value = cached?.length ? cached : asImages(raw);
        render({
            id: `#${id}`,
            url: config.url || '/FileManage/Uploadfile/Upload',
            fileType: config.fileType || 1,
            auto: config.auto,
            readonly: config.readonly,
            maxCount: config.maxCount || 1,
            width: config.width || 25,
            height: config.height || 25,
            isTable: true,
            rowId, tableField: field, tableId: config.tableId,
            on: config.on,
            value
        });
    };

    /** 绑定指定字段（或全部已登记字段）的空上传格 */
    const bindEmpty = (tableId, fields) => {
        const fieldMap = tableImageConfigs.get(tableId);
        if (!fieldMap) return;
        const rowMap = buildRowMap(tableId);
        const $view = tableView(tableId);
        (fields || [...fieldMap.keys()]).forEach(field => {
            const config = fieldMap.get(field);
            if (!config) return;
            $view.find(`.table-upload-container[id^="table_upload_${field}_"]:empty`).each(function () {
                initOne(config, field, $(this), rowMap);
            });
        });
    };

    const initTableAllImages = config => {
        const field = (config.id || '').replace('#', '');
        if (!config.tableId || !field) return;
        cleanupTable(config.tableId, field);
        if (!tableImageConfigs.has(config.tableId)) tableImageConfigs.set(config.tableId, new Map());
        tableImageConfigs.get(config.tableId).set(field, $.extend({}, config));
        bindEmpty(config.tableId, [field]);
    };

    /** 树表展开 / 重绘后补绑空上传格 */
    const refreshTable = tableId => bindEmpty(tableId);


    function parseTableImageKey(key) {
        if (!key) return null;
        // 按 | 分割成三段
        const arr = key.split('|');
        // 必须严格3段才合法
        if (arr.length !== 3) return null;
        const [tableId, field, F_Id] = arr;
        // 空值校验
        if (!tableId || !field || !F_Id) return null;
        return { tableId, field, F_Id };
    }


    const submitAll = async (postData = {}, subTables = []) => {
        if (!store.pending.size) return true;
        for (const [key, list] of store.pending) {
            for (const item of list) {
                const res = await uploadFile(item.file, item.url, item.fileType);
                if (res.code != 0) {
                    const fileName = item.file?.name || "未知图片";
                    layer.msg(`图片【${fileName}】${res.msg}`, { icon: 2 });
                    return false;
                }
                const newSrc = res.data[0].src;
                const rec = store.records.get(key);
                const idx = rec?.images.indexOf(item.base64);
                if (idx > -1) rec.images[idx] = newSrc;

                // 同步 DOM 中 input 的 value 和 img 的 src
                let $box;
                if (rec?.type === 'form') {
                    $box = $(`div#${key}`);
                } else {
                    const info = parseTableImageKey(key);
                    if (info) $box = $(`#table_upload_${info.field}_${info.F_Id}`);
                }
                if ($box?.length) {
                    $box.find('input[type="hidden"]').filter((_, el) => el.value === item.base64).val(newSrc);
                    $box.find('img.upload-img').filter((_, el) => el.getAttribute('src') === item.base64).attr('src', newSrc);
                }

            }
        }

        store.records.forEach((data, key) => {
            const imgs = data.images.filter(x => x && !x.startsWith('data:image'));
            if (data.type === 'form') {
                if (Object.prototype.hasOwnProperty.call(postData, key)) {
                    postData[key] = imgs.join(',');
                }
            } else {
                const info = parseTableImageKey(key);
                if (!info) return;
                const { tableId, field, F_Id } = info;

                // 根据 subTables 的 cacheId 匹配 tableId，取对应 postKey
                const cacheId = subTables.find(s => s.cacheId === tableId)?.cacheId;
                if (!cacheId) return;

                const rows = postData[cacheId];
                if (!rows || !Array.isArray(rows)) return;

                const targetRow = rows.find(item => item.F_Id == F_Id);
                if (!targetRow) return;

                targetRow[field] = imgs.join(',');

            }
        });

        // 成功返回 true
        return true;
    };


    exports('imageUpload', { render, setValue, autoSetUploadColumn, initTableAllImages, refreshTable, submitAll });
});
