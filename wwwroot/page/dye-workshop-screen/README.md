# 染色车间大屏

静态资源目录（CSS/JS/可选静态入口）。

## 访问方式

| 方式 | 地址 |
|------|------|
| MVC 路由（推荐，挂菜单） | `/DyeWorkshopScreen/Index` |
| 静态页 | `/page/dye-workshop-screen/index.html` |

菜单 `F_UrlAddress` 填：`/DyeWorkshopScreen/Index`

## 目录

```
wwwroot/page/dye-workshop-screen/
  index.html
  css/screen.css
  js/screen.js
  js/bg-fx.js
  js/components/
    util.js              # 公共转义
    machine-title.js     # 机台标题
    machine-capacity.js  # 克重
    task-card.js         # 样布任务卡
Views/DyeWorkshopScreen/Index.cshtml
Controllers/DyeWorkshopScreenController.cs
```

## 设置：自定义显示卡号

点击右上角齿轮 → 按机台分组勾选卡号 → 确定。

- **列数**：有展示卡片的机台数（随勾选自适应）
- **每列卡片数**：固定 3 行（不足补空卡，超出截断）
- 选择结果保存在浏览器 `localStorage`（键名 `dyeWorkshopScreen.selectedCardNos`）

```js
SettingsPanel.open({
  items: [{ cardNo: 'H18186217', machineName: '[207 2p#气液缸]', machineId: 'M207' }],
  selected: ['H18186217'],
  onConfirm: function (cardNos) { console.log(cardNos); }
})
```
