# commonTable

基于 Layui Table 的通用表格封装，按模块字段配置（`GetColsJson`）自动生成列、权限按钮、搜索/导入/打印，并支持可编辑子表。

**文件：** `wwwroot/js/lay-module/iceskyCloud/commonTable.js`  
**模块名：** `commonTable`（`layui.use(['commonTable'], …)`）

---

## 依赖

`jquery` · `layer` · `table` · `soulTable` · `common` · `laytpl` · `tabletree` · `popupSearch` · `xmSelect` · `imageUpload` · `eipTableEdit` · `dtree` · `form` · `upload`

---

## 导出方法一览

| 方法 | 说明 |
|------|------|
| `createtable` | **推荐入口**：拉字段、拼列、渲染，并绑定行/工具栏事件 |
| `rendertable` | 底层渲染（合并默认配置 + soulTable + 合计/合并等） |
| `reloadtable` | 按条件刷新表格 |
| `rendertreetable` | 树表渲染 |
| `tableRowClick` | 行选中、按钮显隐、toolbar/tool（`createtable` 会自动调用） |

---

## 1. createtable（推荐）

按 `enCode` 请求字段定义，拼列后渲染，并完成事件绑定。支持单对象或数组（多表批量创建）。

### Index 列表页（非编辑）

```javascript
commonTable.createtable({
    elem: '#currentTableId',
    id: 'currentTableId',
    enCode: 'view_sche_schedule',
    cols: [[{ type: 'checkbox', width: 50, fixed: 'left' }]],
    tableFilter: 'currentTableFilter',

    // 无 data 时按 enCode / 页面路径拼数据源；createtable 会强制 method: 'post'
    type: 'checkbox',          // 'checkbox' | 'radio'
    search: true,
    hideFields: ['F_Id'],
    // 主字段不在字段配置中时，连带隐藏其子字段
    hiddenFields: { mainField: ['subField1', 'subField2'] },

    oneBtnList: ['NF-edit', 'NF-details'],   // 勾选 1 条时显示
    moreBtnList: ['NF-delete'],              // 勾选多条时显示
    user: {
        id: '@ViewData["CurrentUserId"]',
        role: '@ViewData["CurrentRoleId"]',
        org: '@ViewData["CurrentDeptId"]'
    },

    // 左侧树 + 右侧表（可选）
    // dtree: {
    //     elem: '#orgTree',
    //     url: '/xxx/GetTreeJson',
    //     whereField: 'organizeId',
    // },

    // 打印（工具栏 myPrint）
    // printConfig: {
    //     tip: '确认打印？',
    //     beforeUpdate: function (config) { },
    //     updated: function (data) { }
    // },

    done: function (res, curr, count) { },
    clickfunction: function (obj) { },
    onToolbar: function (obj) { },
});
```

### Form 可编辑子表

```javascript
commonTable.createtable({
    elem: '#base_houseinfo_list',
    id: 'base_houseinfo_list',
    enCode: 'base_houseinfo_list',
    cols: [[{ type: 'checkbox', width: 50, fixed: 'left' }]],
    tableFilter: 'colorTableFilter',
    data: listData,
    isEnabled: true,              // false 为只读；无需 isEditTable
    search: false,
    toolbar: '#toolbarDemo',
    defaultToolbar: [],
    limit: 9999,
    page: false,
    height: 'full-185',
    filter: { clearFilter: false },
    hideFields: ['F_Id'],
    hiddenFields: { mainField: ['subField1', 'subField2'] },
    oneBtnList: ['NF-edit', 'NF-details'],
    moreBtnList: ['NF-delete'],
    clickfunction: function (obj) { },
    done: function (res, curr, count) { },
    setCustomConfig: function (col, config) {
        if (!config) return;
        config.on.click = function (obj) { };
        config.on.change = function (obj) { };
        // tableSelect 专属
        config.beforeRender = function (tableOpts) { };       // 返回 false 可阻止打开
        config.beforeKeydownEnter = function (elem, checkStatus) { }; // 返回 false 中断回填
        config.afterKeydownEnter = function (elem, checkStatus) { };
    },
    onToolbar: function (obj) { },   // add / delete / 自定义 lay-event
    onEditTool: function (obj) { },  // 单元格变更或行工具
});
```

### createtable 主要参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `elem` | string | 表格 DOM 选择器，如 `#currentTableId` |
| `id` | string | layui table id（无 `#`） |
| `enCode` | string | 模块/视图编码，用于拉字段与默认数据源 |
| `cols` | array | 初始列（通常先放 checkbox/radio），其余列由字段配置追加 |
| `tableFilter` | string | `lay-filter`，默认 `currentTableFilter` |
| `data` | array | 本地数据；不传则走 url |
| `url` | string | 数据接口；Index 等场景可自动拼 |
| `isEnabled` | boolean | `false` 为只读；未传默认可编辑。**不必再传 `isEditTable`**（createtable/createtreetable 固定可编辑） |
| `excludeEditTypes` | string[] | 禁止的编辑类型；**仅认外部传入**，未传则不禁用。Index 禁 tableSelect 示例：`excludeEditTypes: ['tableSelect']` |
| `type` | string | `checkbox` / `radio` |
| `search` | boolean | 是否显示搜索工具；未传时 Index 默认 `true`，Form 默认 `false` |
| `hideFields` | string[] | 按字段名隐藏列 |
| `hiddenFields` | object | `{ 主字段: [子字段…] }`，主字段不存在时隐藏子字段 |
| `oneBtnList` / `moreBtnList` | string[] | 单选/多选时显示的按钮 `name` |
| `user` | object | 行按钮条件模板占位符替换 |
| `dtree` | object | 左侧树配置：`elem` / `url` / `whereField` |
| `printConfig` | object | 打印：`tip` / `beforeUpdate` / `updated` |
| `setCustomConfig` | function | `(col, config) => {}`，每列生成后钩子 |
| `done` | function | 表格 done |
| `clickfunction` | function | 行点击 / 勾选回调 |
| `onToolbar` | function | 工具栏事件 |
| `onEditTool` | function | 行工具 / 编辑回调 |

### 行为说明

- `createtable` 内部将请求方法强制为 **`post`**（避免筛选条件过长）。
- 非编辑表会拉取模块按钮，生成工具栏与行操作列，并注册 `JsEventCode`。
- `JsEventCode`（网页「执行事件」）固定可用：`obj`、`common`、`table`、`layer`、`$`、`form`，无需再配 `event`。
- 字段模板中的 `datatype` / `dataname` 决定编辑类型：`input` / `date` / `time` / `datetime` / `checkbox` / `tableSelect` / `upload` 等。
- 存在交叉字段（`cross`）时会请求 `GetCrossFields` 并插入关联列。
- 路由中带 `F_ActivityId` 时会禁止表格编辑并隐藏工具栏。

---

## 2. rendertable

底层渲染。一般由 `createtable` 调用；也可自行准备好 `cols` 后单独使用。

```javascript
commonTable.rendertable(options, GetColsJson, function (res, curr, count) { });
```

| 参数 | 说明 |
|------|------|
| `options` | 同 layui.table，并与内置 `COMMON_TABLE_DEFAULTS` 合并 |
| `GetColsJson` | 字段配置数组（合计、合并、复杂表头依赖） |
| `callback` | 可选，在用户 `done` **之前**执行 |

内置能力摘要：

- soulTable（溢出 tip、右键复制/导出、列宽等）
- 报表模式：小计行、合并单元格、隐藏分页
- 合计行、复杂表头（`F_Template.coltitle`）
- 高度自适应（非报表且未指定 `height`）
- Index 主视图自定义搜索模板（`CUSTOM_TABLE_SEARCH`）

---

## 3. reloadtable

```javascript
commonTable.reloadtable({
    elem: 'currentTableId',  // table id，不要带 #
    page: true,              // true：使用分页配置；false：关闭分页
    curr: 1,
    where: {},               // 会自动追加 time
    type: 'data',            // 'data' 只重载数据（默认）；'all' 整表重载
});
```

树表：

```javascript
commonTable.reloadtreetable({
    ...options,
    type: 'data', // 'data' 只重载数据（默认）；'all' 清实例后整表重渲染
});
```

---

## 4. rendertreetable

```javascript
commonTable.rendertreetable({
    elem: '#currentTableId',
    id: 'currentTableId',
    url: '/xxx',
    cols: [[{ field: 'name', title: '名称' }]],
    search: true,
    done: function (res, curr, count) { },
});
```

树相关默认：`treeIdName: 'F_Id'` · `treePidName: 'F_ParentId'` · `treeColIndex: 1` · `treeSpid: 0`

---

## 5. tableRowClick

`createtable` 末尾会自动调用；一般无需手写。

```javascript
commonTable.tableRowClick(
    type,           // 'checkbox' | 'radio'
    tableFilter,    // lay-filter
    tableId,        // 表格 id（无 #）
    oneList,        // 单选显示按钮 name[]
    moreList,       // 多选显示按钮 name[]
    clickfunction,
    tableOptions,   // 完整 options（cols、printConfig、isEnabled 等）
    onToolbar,
    onEditTool
);
```

职责包括：

- 行点击模拟勾选
- 勾选数量控制工具栏按钮显隐
- 工具栏：打印 `myPrint`、导入 `myImport`、业务 `JsEventCode`
- 编辑表：`eipTableEdit` 单元格变更回填（含多选、交叉字段）

---

## 页面 HTML 约定（Index）

```html
<script type="text/html" id="toolbarDemo">
    <div class="layui-btn-container" id="toolbar"></div>
</script>
<script type="text/html" id="currentTableBar"></script>
<table id="currentTableId" lay-filter="currentTableFilter"></table>
```

---

## 缓存

使用 `window._tableCommonCache`：

- 模块树 `GetTreeGridJson`（按 URL 判断是否分页/报表等）
- 按 `enCode` 缓存 `GetColsJson`

---

## 与 commonForm 的配合

表单页可通过 `commonForm.createForm({ createtable: […] })` 在表头渲染完成后自动创建子表，子表参数与本文 `createtable` 一致。详见 [commonForm.md](./commonForm.md)。
