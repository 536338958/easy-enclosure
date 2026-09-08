# Easy Enclosure 简易外壳设计器

![](public/screenshot.png)

EasyEnclosure 是一款开源的 3D 建模软件，专门用于设计可 3D 打印的外壳。它力求提供直观的界面和一套简单易用的控件，让即使没有或几乎没有 3D 建模经验的人，也能为自己的电子项目、原型或 DIY 小装置制作定制外壳。

> 本仓库为社区汉化增强版，基于 [bruceborrett/easy-enclosure](https://github.com/bruceborrett/easy-enclosure) 二次开发。英文原版说明见 [README.en.md](README.en.md)。

### **[立即在线体验 · Easy Enclosure — 简易外壳设计器](https://536338958.github.io/easy-enclosure/)**

## 主要特性

基础功能：

- 界面友好，简单易上手，**全中文界面**
- 实时 3D 预览
- 导出为 STL 格式
- 以 JSON 形式保存和加载参数预设
- 圆形 / 方形 / 长方形开孔，可放置于任意面
- 防水结构（双层壁 + 密封圈槽）
- 盖板螺丝固定与壁挂挂耳

本汉化增强版新增：

- **全参数中文说明**：每个参数下方均标注含义、单位与方向，降低上手门槛
- **偏移方向规范化**：所有开孔 / 支柱 / 隔板 / 通风槽的 X / Y 偏移统一约定，`+` 始终指向 +世界轴，配合坐标轴一目了然
- **XYZ 坐标轴显示**：网格中可开启坐标轴（X 红 / Y 绿 / Z 蓝），直观对照各偏移方向
- **PCB 支柱与内隔板**：自定义位置、高度、螺丝孔，划分内部空间
- **PCB 预览 + 实时碰撞检测**：放入虚拟 PCB，与侧壁 / 隔板 / 盖板发生碰撞时红色高亮，无碰撞为绿色
- **多组散热通风槽**：支持竖切 / 横切方向、任意面、XY 定位，可添加多组
- **卡扣盖 Snap-Fit**：4 / 6 / 8 个卡扣预设，距端部百分比可调，实现免螺丝闭合
- **基座内壁顶端导入倒角**：开口内缘切一圈 45° 斜面，卡扣盖 / 嵌入边更易对准卡入
- **底边倒角**：基座与盖板底边 45° 倒角，缓解首层「象脚」，并同步应用到壁挂挂耳

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

本仓库已内置 GitHub Actions 自动部署工作流（`.github/workflows/deploy-pages.yml`）：将代码推送到默认分支后，在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**，即可由 GitHub 自动构建并发布，无需在本机执行构建。工作流会按仓库名自动设置 `base-href`。详细图文步骤见 [部署到GitHubPages.md](部署到GitHubPages.md)。

也可以在本机手动构建并发布：

```bash
npm run deploy
```

部署会发布 `dist/angular-app/browser` 目录。

## 贡献与支持

<a href="https://github.com/sponsors/bruceborrett" target="_blank"><img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%232f5d85" height="50" width="217"></a>
<a href="https://www.buymeacoffee.com/bruceborrett" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-blue.png" alt="Buy Me A Coffee" height="50" width="217" style="border-radius:8px;"></a>

本项目基于 [bruceborrett/easy-enclosure](https://github.com/bruceborrett/easy-enclosure) 开发。如果你觉得这款软件有用，欢迎通过 [Buy Me a Coffee 捐赠](https://www.buymeacoffee.com/bruceborrett) 或 [GitHub 赞助](https://github.com/sponsors/bruceborrett) 支持原作者的持续开发。

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
- 开孔 / PCB 支柱 / 内隔板 / PCB 预览的 X、Y 偏移均以所在面（或底座）中心为原点，正方向见界面上各输入框标签，可开启「网格 → 显示坐标轴」对照
