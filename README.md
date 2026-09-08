# Easy Enclosure 简易外壳设计器

![](public/screenshot.png)

EasyEnclosure 是一款开源的 3D 建模软件，专门用于设计可 3D 打印的外壳。它力求提供直观的界面和一套简单易用的控件，让即使没有或几乎没有 3D 建模经验的人，也能为自己的电子项目、原型或 DIY 小装置制作定制外壳。

> 本文档为社区汉化版本。英文原版见 [README.en.md](README.en.md)。

### **[立即在线体验](https://bruceborrett.github.io/easy-enclosure/)**

## 主要特性

- 界面友好，简单易上手
- 实时 3D 预览
- 导出为 STL 格式
- 以 JSON 形式保存和加载参数预设

## 技术栈

TypeScript、Angular、JSCAD

## 开发

### 环境要求

- Node.js 20+
- npm 10+

### 安装依赖

```bash
npm install
```

### 本地运行

```bash
npm run dev
```

该命令会从仓库根目录启动 Angular 应用，并根据 `package.json` 同步界面上的版本号徽标。

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

或使用监听模式：

```bash
npm run test:watch
```

### 部署到 GitHub Pages

```bash
npm run deploy
```

部署会发布 `dist/angular-app/browser` 目录。

## 贡献与支持

<a href="https://github.com/sponsors/bruceborrett" target="_blank"><img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%232f5d85" height="50" width="217"></a>
<a href="https://www.buymeacoffee.com/bruceborrett" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-blue.png" alt="Buy Me A Coffee" height="50" width="217" style="border-radius:8px;"></a>

如果你觉得这款软件有用，并希望它能持续开发，欢迎通过 [Buy Me a Coffee 捐赠](https://www.buymeacoffee.com/bruceborrett) 或 [GitHub 赞助](https://github.com/sponsors/bruceborrett) 支持作者。

由于要不断用各种设置组合去测试打印，既耗时又费钱，因此你也可以通过尽可能多地用不同设置进行打印、并反馈你发现的任何问题来提供帮助。

同样欢迎提交 Pull Request！

## 说明

- 所有尺寸单位均为毫米（mm）
- 用于户外的外壳应使用 PETG 耗材打印
- 防水密封圈应使用 TPU 耗材打印
- 开孔处打印时需要添加支撑
- 总高度 = 底座高度 + 壁厚
- 内部高度 = 底座高度 − 壁厚
- 内部宽度 = 宽度 −（壁厚 × 2）
- 内部长度 = 长度 −（壁厚 × 2）
- 螺丝会占用四角的额外空间，在确定长度和宽度时请留意这一点
- PCB 支柱的 X 和 Y 坐标以底座中心为原点计算
