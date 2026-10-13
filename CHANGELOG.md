# 更新日志

本分支（`planB/upstream-base`）的做法是**以上游为主干**：基座直接取自
[bruceborrett/easy-enclosure](https://github.com/bruceborrett/easy-enclosure) 的
`main`（基线 `c37a88f`，2026-10-06），再把此前 fork 上积累的增强**逐项挑选**着搬过来，
而不是整体覆盖。这样上游后续的改进可以持续 `git fetch upstream` 合并进来。

上游是纯英文的，本分支相对上游的改动分两类：

1. **中英双语**（上游完全没有 i18n，纯新增）
2. **几何/参数增强**（fork 上做过、上游没有的功能与修复）

另需说明：**倒角、高强度 PCB 支柱、PCB 预览、卡扣**这四项最早出自本项目，后被上游取用、
合入其 `main`。本分支的基座同步自上游，因此现在与上游共用同一套实现，代码上一致，
但出处在本项目 —— README 已单列一节标注，不要因为它们存在于上游代码里就当成「继承自上游」。

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
- **长期建议**：i18n 体系值得作为 PR 提给上游。上游有 6 个 merge commit、
  4 位外部贡献者，接受度看起来不低；成了就彻底不用维护 fork。

## 阶段 7 · 开孔偏移对齐上游

偏移符号约定此前列为「待拍板」，现已按上游 easy-enclosure 拍板对齐（`+` = `+` 世界轴）：

- `holes.ts` 偏移从「x/y 对调 + 负号」改回上游语义：
  - `hole.x` = 面内**水平**偏移（前/后面 → 左右 +X；左/右面 → 前后 +Y）
  - `hole.y` = 面内**垂直/纵向**偏移（墙面 → 上下 +Z；顶/底面 → 前后 +Y）
- `addHole()` 新建孔的 x / y 默认值从 `x: 6, y: width/2` 改为 `x: 0, y: 0`。
- 菜单中开孔的 X / Y 偏移标签接入 `offsetHLabel(surface)` / `offsetVLabel(surface)`，
  按所在面动态标注方向（左右 / 前后 / 上下），并加 `offsetFaceHint` 备注
  （「以该面中心为 0，正值按标签方向移动」）。新增 `.hint` 样式（沿用上游）。
- 探针验证：front/top/right 三面 `hole.x`/`hole.y` 正方向均指向 + 世界轴，
  与上游一致。`npm run verify` 全过，app/spec tsc 双清。

## 阶段 8 · 蜂窝网格改为真正的蜂窝排列

对照「六边形孔的蜂窝排列」的几何定义了两处问题，均已修复（`ventilation.ts`）：

1. **肋不是等宽的** —— 六棱柱默认顶点落在 0°/60°/…，而错排阵列的邻居方向也恰好是
   0°/60°/120°，两个孔变成「尖角对着尖角」，中间剩下漏斗形残渣：最窄处 = slotGap，
   向两端张开到 slotGap + R。修复：`rotateZ(30°)` 让边的法线对准邻居方向，
   肋成为两条平行边夹出的等宽带，处处 = slotGap。
2. **最近邻距离不对** —— 蜂窝要求邻居间距 = `√3·R + slotGap`（R = 槽宽 / 2，√3·R 是
   两平行边间距），此前沿用 `slotWidth + slotGap`，孔被拉开 (1-√3/2)·槽宽。
   圆孔 / 方孔的最近邻就是直径方向，`sw + gap` 无误，保持不变。

顺带修掉一个更严重的既有 bug：**墙面网格的行数完全失效**。此前先旋转单元再铺网格，
`gridAlong` 的「行」位移落在了穿透轴上，多行重叠成一排（front 面 rows=3 时纵向只剩
孔径 2 mm）。现改为先在「穿透 Z、阵列 XY」的规范平面铺好，再整体 `rotateX(90°)`
（左/右面再 `rotateZ(90°)`）——这与源码注释里描述的旋转链一致，之前注释与实现不符。

- i18n：英文 `ventSlotWidthHint` 的 across-flats 更正为 across-corners；
  `ventSlotGapHint` 中英文补充「蜂窝网格下为孔壁之间处处相等的肋宽」。
- 测试：新增「最近邻距离 = √3·R + 肋宽」「六边形已转 30°（纵向对角、横向对边）」
  「六个面的行不落在穿透轴上」三条。
- 验证：14 条 Node 等价断言全过（Karma 在沙箱里跑不了，需本地 `npm test`）；
  `npm run verify` 全过，`npm run build` 成功。

## 阶段 9 · 嵌入边与底壳内腔四角失配（壁厚增大时弧度消失）

现象：壁厚调大后，底壳内腔四个角的弧度没了，与盖板嵌入边的形状对不上，盖板装不进去。

### 根因

本地 `utils.ts` 的 `hollowRoundCube` / `roundedFrame2d` 把「内缩」做成了**真等距**
（Minkowski offset）：内腔圆角半径取 `max(r - t, 1e-4)`、圆心与外壳同心。上游是
**同族缩放**：长宽减 `2t`、**圆角半径保持不变**、再平移 `[t, t, t]`。

| 做法 | 直边壁厚 | 角部壁厚 | 内腔圆角半径 |
| --- | --- | --- | --- |
| 真等距（本项目此前） | t | t | `cornerRadius - wall` → wall ≥ 3 时归零 |
| 同族缩放（上游） | t | `t·√2`（更厚） | 恒为 `cornerRadius` |

于是 `wall ≥ cornerRadius`（默认 3）时内腔四角塌成尖角 —— 这就是「弧度消失」。

⚠️ 这个真等距是**本项目自己加的**（`2837cbb` 随同步提交带进来，当时没记 CHANGELOG），
上游 `main` 至今仍是 `roundedCube(l - t*2, w - t*2, h, r)`，半径不减。
附在旁边的注释「圆角处内外轮廓完全重合、壁厚捏到 0」是算错了：两个半径同为 `r` 的
圆弧圆心相距 `(t, t)`，沿 45° 方向量壁厚是 `t·√2 ≈ 1.41t`，**比直边更厚**，不会捏到 0。

### 第一次修法（已作废）

上一版把嵌入边也改成真等距（`rim` 半径 = `cornerRadius - (wall + insertClearance)`），
间隙确实处处回到 0.04mm，代价是嵌入边的四个角随壁厚退化成直角 —— 不优雅，改用
阶段 10 的做法。

## 阶段 10 · 按上游「同族缩放」语义重做装配关系

### 上游是怎么实现装配的

四级同族缩放，每级都只缩长宽、**不缩圆角半径**：

1. **底壳内腔** = 外壳内缩 `wall`（防水时 `_wall = 2·wall + 2·insertClearance + insertThickness`）。
   开盖板螺丝走 `clover(…, screwOffset)`，关螺丝走 `hollowRoundCube(…, cornerRadius)`
2. **盖板嵌入边** = 内腔再内缩 `insertClearance`，形状族与半径**跟内腔取同一个值**
   （clover 取螺丝柱凸出量 / 圆角矩形取 `cornerRadius`）
3. **防水时**：密封圈槽 = 外壳内缩 `wall`，槽宽 `insertThickness + 2·insertClearance`；
   嵌入边落在槽里，槽与密封圈本体同族
4. **导入倒角**：嵌入边顶端 `lidTopChamfer` 用嵌入边自身的外轮廓构造楔环（`topChamferTool`
   的剪切求交，能保住 clover 的凹弧）

结果 —— 直边间隙 = `insertClearance`、角部间隙 = `insertClearance·√2`，**处处为正且与
壁厚无关**，圆角永不退化。解析对比（外壳 100×80，cornerRadius=3，insertClearance=0.04）：

| wall | 真等距：腔角R | 边角R | 间隙 | 同族缩放：腔角R | 边角R | 间隙 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2.00 | 1.96 | 0.040 | 3.00 | 3.00 | 0.040~0.057 |
| 3 | 0.00 | 0.00 | 0.040 | 3.00 | 3.00 | 0.040~0.057 |
| 6 | 0.00 | 0.00 | 0.040 | 3.00 | 3.00 | 0.040~0.057 |

代价只是圆角处壁厚比直边厚 41%，对 3D 打印无害。

### 上游有没有考虑装配余量

考虑了，四处：

| 余量 | 位置 | 默认值 |
| --- | --- | --- |
| `insertClearance` | 嵌入边 ↔ 腔壁（X/Y 双向，角部实际是 ×√2） | 0.04mm |
| `snapFit.clearance` | 卡扣凸珠 ↔ 凹槽：长宽各 `+clr·2`、深度 `depth + clr`、穿透再 `+0.5` | 参数 |
| `lidTopChamfer` | 嵌入边顶端导入倒角，钳制在 `≤ 0.9·insertHeight` 与 `≤ 0.8·insertThickness` | 0.4mm |
| `screws()` 的 `tolerance` | **只在孔长方向**（通孔两端各留 0.2 保证打穿）；径向**没有**余量，孔径就是用户填的直径 | 0.2mm |

Z 方向：盖板板底与底壳顶面是**面接触**，没有垂直余量（靠螺丝/卡扣压紧）。防水时槽深
`insertHeight + sealThickness + insertClearance`，多出的 `insertClearance` 是垂直余量。

### 上游的一处真 bug（本项目保留修正）

防水 + **关闭**盖板螺丝：上游的槽恒为 clover（四角留实体给螺丝柱），但关螺丝时嵌入边是
圆角矩形、角上有料 → 直接撞上。实测 3D 干涉 **370mm³**（与壁厚无关）。所以本项目保留
「槽与嵌入边同族」这条修正，只是半径改按同族语义取 `cornerRadius`（此前取的是
`cornerRadius - wall`，还是真等距思路）。

### 改动

- `utils.ts` —— `hollowRoundCube` / `roundedFrame2d` 恢复同族缩放（半径不减），注释写清
  为什么不能再改回真等距；`roundedCube2d` 保留 `r ≤ 0` 退成矩形的兜底
- `screws.ts` —— `insertRimRadius()` 圆角矩形路径改回 `cornerRadius`
  （此前是 `cornerRadius - (wall + insertClearance)`）
- `lid.ts` —— 嵌入边外轮廓与顶端倒角轮廓跟随（两者必须同源）
- `waterproofseal.ts` —— 槽/密封圈按 `lidScrews` 选形状族，半径走 `insertRimRadius`；
  修掉上面那条 370mm³ 干涉
- `chamfer.spec.ts` —— 注释同步

### 验证

`verify-lid-fit.cjs` 判据重写为四条（`npm run verify:lid-fit`，已并入 `npm run verify`）：

1. 嵌入边外轮廓到容纳腔外轮廓的有符号距离 ∈ `(0, insertClearance·√2 + 0.02]`
   —— 不许干涉，也不许两条轮廓不同源
2. 底壳容纳腔的角部圆弧半径必须等于 `cornerRadius`（wall 1~6）—— 抓「弧度消失」
3. 防水时嵌入边内表面不许啃进槽内侧那道实体墙
4. 3D 装配干涉（盖板倒扣装入）体积 < 0.05mm³

共 28 + 6 + 12 + 12 = 58 条，全过；`npm run verify` 三项与 `npm run build` 均通过。
