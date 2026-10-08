# 更新日志

本分支（`planB/upstream-base`）的做法是**以上游为主干**：基座直接取自
[bruceborrett/easy-enclosure](https://github.com/bruceborrett/easy-enclosure) 的
`main`（基线 `c37a88f`，2026-10-06），再把此前 fork 上积累的增强**逐项挑选**着搬过来，
而不是整体覆盖。这样上游后续的改进可以持续 `git fetch upstream` 合并进来。

上游是纯英文的，本分支相对上游的改动分两类：

1. **中英双语**（上游完全没有 i18n，纯新增）
2. **几何/参数增强**（fork 上做过、上游没有的功能与修复）

下面按阶段记录。所有尺寸单位均为毫米（mm）。

---

## 当前状态

- 上游基线：`c37a88f`（2026-10-06）
- 本分支 HEAD：`63d3673`（2026-10-09），相对基线 **9 个提交**
- 单元测试：**191 SUCCESS**（上游基线 169）
- 几何验证：`npm run verify` 全部通过

| 命令                        | 作用                                     |
| --------------------------- | ---------------------------------------- |
| `npm test`                  | 单元测试（Karma + ChromeHeadless）        |
| `npm run verify`            | 几何验证：挂耳切角、内腔地板、倒角闭合等 |
| `npm run verify:geometry`   | 只跑几何验证                             |
| `npm run verify:rim-chamfer`| 只跑嵌入边顶端倒角验证                   |
| `npm run bench`             | base() / lid() 单次构建耗时              |

几何验证脚本需要先把 TS 编到 `.verify-build/`（`npm run verify:build` 会带上），
已加入 `.gitignore`。

---

## 阶段 1 · 中英双语体系（`26bf43a`）

上游无 i18n，纯新增，零覆盖风险。

- `core/i18n/i18n.service.ts` —— 语言信号、持久化、`t()` 插值（用 `{name}` 占位符，
  缺变量时原样保留，便于发现漏传）
- `core/i18n/translations.ts` —— 词条表。`TranslationKey` 是**联合类型**，
  模板里 `t('写错的键')` 会在 `ng build` 的模板类型检查阶段直接编译失败
- `shared/language-switcher/` —— 侧边栏顶部的语言下拉（跟随系统 / 中文 / English）
- sidebar 注入 `I18nService` 并暴露 `t()`

测试 169 → 185。

## 阶段 2 · 散热通风槽（`fe662c1`）

上游完全没有 ventilation 概念，纯新增。

- `core/enclosure/ventilation.ts` —— 顶/底面走 `slotZ`、四周墙面走 `slotY`
  （沿 Y 穿透后绕 Z 转 90°）；圆角长槽 = hull 两圆柱
- `ventilationCut(params, 'lid' | 'base')` 按面归属返回切割体，未配置返回 `null`
- 接线：`Params.ventilation`（默认 `[]`）、base/lid 并入各自 subtracts、
  renderer 的 `lidDeps`/`baseDeps` 加 `ventilation`、参数面板新增折叠区块

## 阶段 3 · 三个参数级特性（`f1598b3`）

| 参数                     | 默认  | 说明                                                              |
| ------------------------ | ----- | ----------------------------------------------------------------- |
| `showAxes`               | false | 视口显示 XYZ 坐标轴 gizmo                                          |
| `wallMountChamferAngle`  | 60°   | 挂耳外侧切角角度，取值 45–70。**上游写死 45°，且默认产物会变**      |
| `lidScrewOffset`         | 0     | 螺丝孔中心距相邻两边的距离，0 = 自动                               |

⚠️ `wallMountChamferAngle` 默认 **60°** 与上游写死的 **45°** 不同，默认产物会变。
要回到上游产物，改 `wallmount.ts` 的 `WALL_MOUNT_CHAMFER_DEFAULT` 即可。

## 阶段 4 · 螺丝柱凸出量解耦（`a5f9999`）

**修掉上游的一个结构性隐患**：上游让三个量共用 `getScrewOffset()` ——
① 螺丝孔位 ② 内腔四角柱体（clover）半径 ③ 密封圈让位半径。
螺母模式下 ① 会算到 5.04 而实际柱体只有 3.89，导致防水槽在四角绕行过头被切断
（即 fork v1.4.2 修过的「防水槽被打穿」，上游依然存在）。

- `screws.ts` 新增 `WATERPROOF_PROTRUSION = 3`、`screwPostProtrusion()`、`insertRimRadius()`
- `Params.lidScrewProtrusion`（0 = 自动）
- base 的 clover 半径、lid 的 `cloverFrame` 与顶端倒角轮廓、
  waterproofseal 的 `getSealReliefRadius` 全部改取凸出量；**孔位仍走 `getScrewOffset`**

**没有整体搬 fork 的 `dimensions.ts`** —— 那文件里的 `innerWallInset` /
`cavityFloorZ` / `lidTopChamferSize` / `lidScrewCountersinkSize` 上游在
`utils.ts`、`pcbpreview.ts`、`chamfer.ts` 已有等价实现，整体搬会造成两个事实来源。
只搬上游真正缺的这一块。

测试 185 → 188。

## 阶段 5 · UI 全量中文化（`cc53876` + `3c6b077`）

- `params-form.component.html`（1180 行）12 个折叠区块的全部标签、标题、下拉选项、
  按钮、提示与 tooltip，共 145 处
- `tools.component.html` 导出弹窗、`funding.component.html` 支持入口
- `renderer.component` 此前**根本没注入 `I18nService`**，补上注入、`t()` 与
  `surfaceLabel()`：3D 视口投影的 Front / Back / Left / Right / Lid / Bottom /
  Seal / DIN Mount 八个面名标签也跟着语言切换
- 开孔与 PCB 支柱的「所在面」下拉原本调 `surfaceLabel()` 返回硬编码英文，
  改为走 i18n 的 `ventSurfaceLabel()`

**翻译口径**（两条有意的决定）：

1. **X / Y 不译方向**。这两个标签在不同面上含义不同（顶面是左右/前后，侧面是水平/竖直），
   统一译成中性的「X 偏移 / Y 偏移」，不擅自断言朝哪。要看方向就打开「显示坐标轴」——
   那正是这个功能原来的用途。
2. **措辞不同但语义相同的并入既有键**，不另立条目。如上游的 `Insert Thickness`
   与 fork 的 `Lip thickness` 是同一个参数，共用 `params.insertThickness`。

模板里目前只剩品牌名 `Easy Enclosure`（专有名词，保留）与关闭符号 `×`。

## 阶段 6 · 两处几何修复

### 开孔贯穿余量（`b680eb4`）

侧面与底面的孔深原本直接取 `totalWallThickness`。**防水开启时壁厚正好等于这个值** ——
孔的上下端面与壁的内外表面严格齐平，没有任何余量。这是布尔运算的退化情形：
端面共面时外表面可能被保留下来，表现为「孔没打穿」（只剩一层膜）。
防水关闭时壁厚只有 `wall`、孔深远大于它属于超挖，所以**同样的问题只在启用防水时暴露**。

孔深改为 `totalWallThickness + 0.2 × 2`，两端各多切 0.2mm（外侧切进空气、内侧切进腔内，
都不影响成品）。顶面本就有 `TOP_HOLE_DEPTH_TOLERANCE = 0.2`，这次与它对齐。

### 挂耳底边倒角在圆端断裂（`367d4b3`）

挂耳底边倒角走的是通用工具 `chamferSolidBottom`，它按**外接矩形**构造楔环。
而挂耳是「一端方、一端圆」的 hull —— 圆端只有**一个切点**贴到外接矩形上，
楔环在那里几乎切不到实体，倒角在圆端断开、与方端接不上。

实测（螺丝孔径 3.98、底边倒角 0.8mm），把倒角切掉的实体当楔环取出：

| 方案         | 楔环体积 | 沿底面周边的角度覆盖（36 扇区）  |
| ------------ | -------- | -------------------------------- |
| 外接矩形     | 11.06    | 16 · `###.####......#......#......####.###` |
| 挂耳自身轮廓 | 14.77    | 18 · `########......#......#......########` |

即圆端少了约 1/3 的倒角实体。改为用挂耳自身轮廓（外轮廓与「内缩 c 的轮廓」之间
hull 出楔环）代替外接矩形，沿整条底边连续。`chamferSolidBottom` 未删除 ——
它仍是通用工具且有自身测试，只是不再用于挂耳。

测试 188 → 191。

### 内腔地板基准不一致（`63d3673`）

`internalwalls` 用裸 `floor` 作为隔板底面高度，但 `base` 挖腔有两种方式：

- 启用盖板螺丝：`clover` 平移到 `z = floor` → 地板在 `floor`
- 关闭盖板螺丝：`hollowRoundCube` 内腔平移 `[t, t, t]` → 地板在 `innerWallInset`

`pcbmount` 已按 `cavityFloorZ = lidScrews ? floor : innerWallInset` 走，隔板却不是。
**关闭盖板螺丝时两者对不上**（实测 `wall=1.5 / floor=3`）：

| 组合                          | 基准  | 隔板底 | 结果             |
| ----------------------------- | ----- | ------ | ---------------- |
| `lidScrews=false` 非防水      | 1.500 | 3.000  | 悬空 1.5mm       |
| `lidScrews=false` 防水        | 5.080 | 3.000  | 陷进实体地板 2.08mm |

改为统一走 `cavityFloorZ`。`cavityFloorZ` 原本定义在 `pcbpreview.ts`，而 `pcbpreview`
反过来 import 了 `internalwalls`，直接引入会成环 —— 因此把它下沉到 `utils.ts`
（与 `innerWallInset` 同族），`pcbpreview` 改为 import 后再导出，既有 import 不受影响。

## 阶段 6 · 几何验证脚本（`63d3673`）

从 fork 搬来 `bench.cjs` / `verify-geometry.cjs` / `verify-rim-chamfer.cjs` /
`tsconfig.verify.json`，按上游的模块布局改了依赖路径（上游没有 `dimensions.ts`）：
`cavityFloorZ` → `pcbpreview`、`innerWallInset` / `clover` / frame → `utils`、
倒角工具三件套 → `chamfer`、`insertRimRadius` → `screws`。

两处判据按当前代码修正：

1. **挂耳切角的度/弧度判据**原本依赖默认 45°。默认改为可配置 60° 后它失效 ——
   60° 与「45 被当弧度」的 58.3° 只差 1.7°，法向量点积 0.9997 越过 0.999 阈值，
   会把正常的 60° 斜面误判成 bug。改为显式传 45 / 60 / 70 逐个验证。
2. **小外壳 40×30 的倒角体积比 1.259** 超出 0.9~1.15。对照实验证明偏差只来自
   clover 四角的凹扇形（同一外壳换成凸的圆角矩形是 0.992）：凹角处倒角截面必然
   大于 `c²/2`，而理论值按直边算。因此给凹角且轮廓小的情形放宽上界到 1.35，
   连续性判据（360/360 角度覆盖）保持不变。

性能测试的计时断言改为取 5 轮最小值、且只作信息输出，改用确定性的
「面数确实更少」作为判据 —— 单次计时噪声能到 ±30%。

---

## 尚未处理

- **默认孔型**：沿用上游的 `blind`（未搬 fork 的 `through`）。这是用户已拍板的取舍。
- **fork 独有、上游没有且未搬的**：`verify` 之外的工具脚本、`README.en.md`
- **行为差异待拍板**：偏移符号约定（`+` = `+` 世界轴）
- **长期建议**：i18n 体系值得作为 PR 提给上游。上游有 6 个 merge commit、
  4 位外部贡献者，接受度看起来不低；成了就彻底不用维护 fork。
