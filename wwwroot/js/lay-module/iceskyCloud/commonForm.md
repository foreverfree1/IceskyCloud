# commonForm

基于字段配置（`GetColsJson`）自动生成表单布局与控件，支持联动下拉、tableSelect、图片上传、交叉字段，并可一键挂载 `commonTable` 子表。

**文件：** `wwwroot/js/lay-module/iceskyCloud/commonForm.js`  
**模块名：** `commonForm`（`layui.use(['commonForm'], …)`）

---

## 依赖

`jquery` · `form` · `laydate` · `common` · `imageUpload` · `tableSelect` · `eipTableEdit` · `xmSelect` · `table` · `commonTable`

---

## 页面结构约定

```html
<div class="layui-form layuimini-form" lay-filter="adminform">
    <div class="form-fields"></div>
</div>
```

- 表单 `lay-filter` 固定为 **`adminform`**（`common.val` / 赋值依赖）。
- 动态字段容器由 `elem` 指定（常用 `.form-fields`）。

---

## 导出 API 一览

| 成员 | 说明 |
|------|------|
| `createForm` | **推荐入口**：拉字段、排版、渲染控件、赋值，可选创建子表 |
| `formSubmit` | 提交前校验、图片上传、组装表头+子表数据 |
| `setFormData` | 写入表单数据（含交叉字段预处理） |
| `autoSplitRows` | 按栅格宽度拆行（`createForm` 内部使用） |
| `renderItem` | 单个控件 HTML（内部） |
| `afterRender` | 控件初始化：laydate / xmSelect / tableSelect / 图片等（内部） |
| `formData` | 当前表单数据对象 |

---

## 1. createForm（推荐）

```javascript
commonForm.createForm({
    elem: '.form-fields',
    enCode: 'sap_register',
    data: formData,                    // 可不传：有 keyValue 时自动 GetFormsJson
    createtable: tableOptsList,        // 可选：子表配置，同 commonTable.createtable
    isEnabled: true,

    // 主字段不在字段配置中时，连带隐藏其子字段
    hiddenFields: {
        'F_ContactPerson': ['F_ContactPhone', 'F_ContactAddress'],
        '123': ['F_RatingRemark', 'F_InvoiceBank']
    },

    // 接口数据加载后（可改 options.data / 子表 data）
    afterLoadData: function (data, options, tableList) { },

    printConfig: {
        tip: '确认打印？',
        beforeUpdate: function (config) { },
        updated: function (data) { }
    },

    setCustomConfig: function (item, col) {
        col.on.change = function (elem, value) { };
        col.on.blur = function (elem, value) { };
        col.on.click = function (elem, value) { };
        // tableSelect
        col.beforeRender = function (tableOpts) { };
        col.beforeKeydownEnter = function (elem, checkStatus) { };
        col.afterKeydownEnter = function (elem, checkStatus) { };
    },

    done: function () {
        // 控件渲染完成后的业务初始化
    }
});
```

### 主要参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `elem` | string | 字段容器选择器，必填 |
| `enCode` | string | 模块编码，用于 `GetColsJson`，必填 |
| `data` | object | 表头数据；编辑页未传时走 `/Public/GetFormsJson` |
| `createtable` | object \| array | 子表配置，传给 `commonTable.createtable` |
| `isEnabled` | boolean | 是否可编辑，默认 `true` |
| `hiddenFields` | object | `{ 主字段: [子字段…] }`，主字段不存在则隐藏子字段 |
| `afterLoadData` | function | `(data, options, tableList) => {}`，数据加载后钩子 |
| `printConfig` | object | 交给 `common.createTool` 的打印配置 |
| `setCustomConfig` | function | `(item, col) => {}`，每个控件初始化前可改配置/事件 |
| `done` | function | 表单 HTML 与控件初始化完成后回调 |

### 执行流程（简述）

1. URL 存在 `keyValue` → 按需请求 `/Public/GetFormsJson`（表头 + 未传 `data` 的子表），调用 `afterLoadData`，再 `common.createTool` 生成页头按钮。
2. 无 `keyValue`（新增）→ 直接 `createTool`。
3. `init(enCode)` 缓存并读取字段配置。
4. 若路由带工作流 `F_ActivityId`，按 `CanWriteFormItemIds` 控制可写字段。
5. `autoSplitRows` → 拼 HTML → `setFormData` → `afterRender` → `done` → `form.render()`。
6. 若配置了 `createtable`，再创建子表。

---

## 2. 字段类型与控件

由 `F_Template` + ` F_ReferType` 决定：

| 条件 | 控件类型 |
|------|----------|
| `length == 'max'` | `textarea` |
| 有 `dataname` 且 ` F_ReferType` 为 0/1 | `tableSelect` |
| 有 `dataname` 且 ` F_ReferType` 为 2/3 | `select`（xmSelect；3 为多选） |
| `date` / `time` / `datetime` | laydate |
| `image` | imageUpload |
| `int` / `decimal` / `float` 等 | input（数字） |
| 其它字符串类型 | input |

### 新增 / 编辑 / 只读显隐规则

| 场景 | 必填 | 禁用 | 隐藏 |
|------|------|------|------|
| 可编辑 + 新增（无 keyValue） | `isheadaddverify` | `isheadedit` | 非 `ishead` |
| 可编辑 + 编辑（有 keyValue） | `isheadupdateverify` | `isheadupdateedit` | 非 `isheadupdate` |
| 只读（`isEnabled === false`） | 同编辑态校验标记 | 同编辑态禁用标记 | 同编辑态隐藏 |

栅格宽度取自 `F_Template.headwidth`（默认 3，一行合计超过 12 自动换行）。

### 交叉字段（cross）

模板中配置 `cross` 时，会请求 `GetCrossFields`，在主字段后插入只读关联输入框；`setFormData` 时若有 `_objectname`，再请求 `/Public/GetFormJson` 回填交叉值。

### select 联动

`F_Template.params` 为逗号分隔的父字段名：

- 初始化 / 打开下拉时按父字段当前值请求 `/Public/GetReferenceListJson`
- 父字段变更时清空已注册的子 select

### tableSelect 回填

选中或回车确认后：

- 写回主字段
- 按 `_cross` 写回交叉字段
- 按选中行其它键尝试匹配同 id 控件并赋值  
钩子：`beforeRender` / `beforeKeydownEnter` / `afterKeydownEnter` / `on.change`

### setCustomConfig 中的 col

不同控件类型的 `col` 结构略有差异，共同点：

```javascript
col.on.change / col.on.blur / col.on.click
```

- **input / textarea**：可改 `disabled`、数字 `min`/`max`/`precision`、前后缀等  
- **date***：可改 laydate 配置（`format`、`type` 等）  
- **image**：可改 `maxCount`、`readonly`、`url` 等  
- **select**：`col.xmConfig` 为 xmSelect 完整配置  
- **tableSelect**：含 `table`、`selected`、回车钩子等  

---

## 3. formSubmit

在 `form.on('submit(…)')` 或自定义提交逻辑中调用，组装待提交数据（**本身不发起最终保存请求**，通过 `beforeRequest` 把 `postData` 交给业务）。

```javascript
commonForm.formSubmit({
    formData: data,                 // 一般为 layui form 的 submit 回调 data
    keepFields: {
        form: ['F_SomeHidden'],     // 表头：postData 没有则从页面 input 补
        currentTableId: ['F_Extra'] // 子表：按 table id 强制保留字段
    },
    customValidates: function (postData) {
        // 返回 false 中断提交
    },
    beforeRequest: function (postData) {
        // 在此发起 ajax 保存等
    }
});
```

### 处理顺序

1. 收集页面所有带 `id` 的 `table` 作为子表  
2. `eipTableEdit.valid()` 子表编辑校验  
3. 取 `formData.field` 作为表头 `postData`  
4. `keepFields.form` 补字段  
5. 写入各子表 `table.cache`  
6. `customValidates`  
7. `imageUpload.submitAll` 上传并回写  
8. 子表行只保留：可见且带 `name` 的列 + `F_Id` + `keepFields[tableId]`  
9. 调用 `beforeRequest(postData)`

返回 `false` 表示校验/上传失败已中断。

---

## 4. setFormData

```javascript
commonForm.setFormData(data, elem, rows);
```

- 处理交叉字段接口回填  
- `common.val('adminform', data)`  
- 再按容器内 `[id]` 写值  

一般由 `createForm` 调用；外部若自行改数据后重刷控件，需注意与 xmSelect / 图片组件的同步。

---

## 缓存

使用 `window._formCommonCache`：

- 按 `enCode` 缓存 `GetColsJson`（同页多次 `createForm` 不重复请求字段）

---

## 与 commonTable 的配合

```javascript
commonForm.createForm({
    elem: '.form-fields',
    enCode: 'xxx',
    createtable: [
        {
            elem: '#detail_list',
            id: 'detail_list',
            enCode: 'detail_list',
            cols: [[{ type: 'checkbox', width: 50, fixed: 'left' }]],
            tableFilter: 'detailFilter',
            isEditTable: true,
            isEnabled: true,
            // data 可不传：有 keyValue 时由 GetFormsJson 按 enCode 注入
        }
    ],
    done: function () { }
});
```

子表完整参数见 [commonTable.md](./commonTable.md)。


---

## 常见注意点

1. **`elem` + `enCode` 缺一不可**，否则 `createForm` 直接 return。  
2. 编辑页依赖 URL 参数 **`keyValue`**。  
3. 子表 `data`：自己处理好的可直接传；否则交给 `GetFormsJson` 的 `dataname`。  
4. 工作流页面通过 `history.state.routeState` 控制可写字段与只读。  
5. `formSubmit` 只组装数据；真正的保存请求写在 `beforeRequest`（或业务后续逻辑）里。  
6. 与 `commonTable` 配合时（`createForm` 传入 `createtable`），页面上不必再写 `createTool`，工具栏由内部挂载。
