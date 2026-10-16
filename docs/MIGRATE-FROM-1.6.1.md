# 1.4.2 → 1.6.1 搬迁清单

基线：本分支 `restart/v1.4.2`，起点 `588b0d6`（v1.4.2）。
对比对象：`archive/planB-20261013`（1.6.1，即被判定「灾难性 bug 较多」的那条线）。

规模：**58 个文件，+5827 / −3644**。

> **进度（2026-10-14 更新）** — 起点 `588b0d6`，已完成 16 个提交（当前 `ba6e59b`）：
>
> | 轮次 | commit | 内容 | 状态 |
> | --- | --- | --- | --- |
> | 阶段 0 | `80e0acb` | 从 1.4.2 开分支、基线绿灯、抢救 docs 工具 | ✅ |
> | 1 | `cea823b` | 孔深贯穿余量（用户实测空层消失） | ✅ |
> | 2 | `5155110` | STEP 导出模块（FACETED_BREP，已验证闭合结构） | ✅ |
> | 3 | `98b189c` | STEP 接进导出面板（格式选择 + 按钮改「导出」） | ✅ |
> | 4 | `4db44a5` | 导出按钮文案中文「导出」/ EN「EXPORT」 | ✅ |
> | 5 | `0a7d97d` | 线缆夹核心层（clamp.ts + 参数类型） | ✅ |
> | 6 | `80e3bd4` | 参数说明搬进气泡（71 个）+ 0=自动 显示 | ✅ |
> | 7 | `6f9597a` | 线缆夹 UI + 渲染 + 导出（用户实测通过） | ✅ |
> | 8 | `a9f6795` | PCB 碰撞检测接入线缆夹 | ✅ |
> | 9 | `be09972` | 补线缆夹单元测试（clamp.spec.ts，14 例） | ✅ |
> | 10 | `9d2ef94` | 搬入 pcbpreview.spec.ts（16 例）+ 碰撞检测返回重叠体积 | ✅ |
> | 11 | `1f49538` | 修通风「所在面」下拉不选中 + 移除按钮统一成 X | ✅ |
> | 12 | `4ff43c2` | 碰撞提示显示重叠体积（overlapVolume 用到 UI） | ✅ |
> | 13 | `fafa373` | README 根据当前版本重写 | ✅ |
> | 14 | `715a795` + `accb114` | 盖板螺丝沉头窝（无/圆柱窝/45°锥坑）+ 版本迭代 v1.6.1 | ✅ |
> | 15 | `ba6e59b` | 预览支持鼠标中键拖动平移（与上游一致） | ✅ |
> | 16 | `60eb8f2` | 「简易外壳」补齐漏清的 4 项 + 预览区拦右键菜单 | ✅ |
> | 17 | `1211ea2` | 散热通风「开孔范围」（裁剪盒，四模式统一） | ✅ |
> | 发布 | v1.6.1-2 | 版本号迭代 + 推送 + Release | ✅ |
> | 18 | `b13074c` | 开孔「孔型」二选一（透孔 / 不透孔 + 深度） | ✅ |
> | 19 | `67240b0` | 开孔「孔口倒角」（方孔/矩形孔，45° 导入锥） | ✅ |
> | 20 | `3fd72eb` | 倒角性能优化（union 成本减半，HOLE-CHAMFER-PERF.md） | ✅ |
> | 21 | `ef8e9ef` | 圆孔倒角关闭（性能）+ 全流程性能剖析（PERF-ANALYSIS.md） | ✅ |
> | 22 | `b94b54b` | PCB 碰撞延后补算 + 按依赖缓存（性能 D） | ✅ |
> | 23 | `32075c0` | 交互期低段数预览 + 停手精修（性能 B） | ✅ |
> | 24 | `ba9641d` | lid() 热点剖析 + E/A 收益代价对比 | ✅ |
> | 25 | `d05ff7c` | Worker 化 A-1（buildParts 纯函数 + Worker 薄壳 + 服务） | ✅ |
> | 26 | `1adcc8c` | 新起始模型 + v1.6.1-3 发布 + Worker 化 A-2（renderModel 异步化） | ✅ |
> | 发布 | v1.6.1-3 | 推送 + Release（新起始模型截图） | ✅ |
> | 27 | `9c0fb5d` | Worker 化 A-3（导出路径接入 builder + 错误传播） | ✅ |
> | 发布 | v1.6.1-4 | 推送 + Release | ✅ |
> | 28 | `fe54ecb` | 开孔倒角尺寸可调（0.2~2mm，盲孔夹孔深） | ✅ |
> | 29 | `a9f0c11` | 通风范围可视化（半透明橙框） | ✅ |
> | 30 | `4c08757` | 范围框悬浮+高亮+编辑态聚焦（方案 1+2） | ✅ |
> | 31 | `49fc200` | 修范围框与模型错位（漏加展示平移）+ 回归测试 | ✅ |
> | 32 | `9b1e876` | clover2d 内容键缓存（E-①） | ✅ |
> | 33 | `d37227e` | 倒角工具内容键缓存 + 否证 2D 腐蚀化（E-② 转向） | ✅ |
> | 34 | `8588489` | 新起始模型 wall 1 + 通风数量自动适配范围 | ✅ |
> | 发布 | v1.6.1-4 | 推送 + Release | ✅ |
>
> **第 16 轮的全量对比结论**：上游 `main`（`c37a88f`，package.json 同为 1.6.1）自分歧点
> 起的 26 个提交，逐文件核对后**只剩这两处真缺口**，其余要么已搬、要么本分支自带或更强
> （中英双语 i18n、散热通风、可调挂耳倒角 / 螺丝偏移 / 支柱过渡、loading 转圈、
> `SIDE_HOLE_DEPTH_TOLERANCE`）。参差项见下表。
>
> | 差异 | 本分支 | 上游 | 处理 |
> | --- | --- | --- | --- |
> | i18n 中英双语 + 语言切换 | 有 | 无（纯英文） | 保留自有 |
> | 散热通风 `ventilation` | 有 | 无 | 保留自有 |
> | 挂耳倒角角 `wallMountChamferAngle` / 螺丝偏移 / 支柱过渡 `pcbMountFillet` 可调 | 有 | 无或部分已改永久 | 保留自有 |
> | PCB 支柱根部过渡 | 用户可调（none/尺寸） | `outerDiameter/3` 永久启用 | 保留自有 |
> | 开孔偏移语义 | 本地旧语义 | 上游语义 | 用户已决定保留旧语义 |
> | `getSealReliefRadius` clamp | 未搬 | 有 | 已判定不做（未触发就已打穿） |
> | 单测 | 247 例 | 上游删了 7 个 spec | 保留自有 |
>
> **明确不做**：`ventSlotWidth` 的「0=自动」显示（用户 10-14 决定，缺取值函数不值得做）；
> 偏移语义改上游（用户决定保留本地旧语义）；防水槽按 lidScrews 选形状族（UI 不可达）；
> 真等距内缩 / clover 解析式 / 叶加厚（clover 数学死结，已放弃）。
>
> **推送状态**：`main` 与 `restart/v1.4.2` 均已同步到 `0fd8dee`（v1.6.1-4），
> tag `v1.6.1-2`/`v1.6.1-3`/`v1.6.1-4` 与各自 Release 均已发布；
> 回滚点：`backup/v1.6.1-2`、`backup/round22-pcb-defer`、`backup/round32-clover-cache`。

---



> 原则：**只挑真修复与真功能，不搬那条线上已判定失败的几何改动。**
> 1.6.1 相对 1.4.2 并不全是进步 —— 它还**删掉了 7 个测试文件**。

---

## 一、✅ 建议搬（按优先级）

### P0 · STEP 导出（最大的功能增量）

| 文件 | 行数 |
| --- | --- |
| `src/app/core/export/step-serializer.ts` | 350（新增） |
| `src/app/core/export/export-format.ts` | 45（新增） |
| `src/app/core/export/export-format.service.ts` | 67（新增） |
| `step-serializer.spec.ts` / `export-format.service.spec.ts` | 41 / 123（新增） |

- 1.4.2 的 CHANGELOG 明确写着 **「STEP 导出：评估过，暂不实现」**，理由是布尔运算后
  是 polygon soup（约 35% 开放边）、STEP 要求拓扑闭合。
- 1.6.1 把它做出来了。**搬之前必须先验证它是否真的绕开了闭合性问题**
  （导出一个防水壳 → 用 FreeCAD 打开看是不是实体）。这一步没验就搬 = 引入新雷。
- 价值高（CAD 用户刚需），且是**独立模块**，不碰几何，风险隔离。

### P1 · 孔深贯穿余量（改动极小、已实测有效）

`holes.ts` 新增 `SIDE_HOLE_DEPTH_TOLERANCE = 0.2`，孔深改为
`totalWallThickness + SIDE_HOLE_DEPTH_TOLERANCE * 2`（即多穿 0.4mm）。

- 根因：防水开启时壁厚正好 = `totalWallThickness`，孔端面与壁面**严格齐平**，
  是布尔退化情形（表现为「孔没打穿 / 只剩一层膜」）。
- ⭐ **这是本轮唯一被用户切片实测确认有效的修复**：加上之后
  BambuStudio 的「空层 9~12.2」警告消失。
- 改动 = 1 个常量 + 1 处使用。**建议第一个搬。**

### P2 · 新增测试覆盖（但不要跟着删测试）

新增：`pcbpreview.spec.ts`(277)、`ventilation.spec.ts`(160)、`clamp.spec.ts`。

⚠️ 1.6.1 同时**删除**了 7 个文件，其中 5 个是测试：

```
base.spec.ts  clearance.spec.ts  dimensions.spec.ts
internalwalls.spec.ts  lid.spec.ts(−177)  params.spec.ts(−51)
```

- `dimensions.spec.ts` 删除合理（`dimensions.ts` 被合并了）；
- 其余 **不要跟着删** —— 那是 1.6.1 测试覆盖的净损失，不是进步。
  1.4.2 这边的 `base.spec` / `lid.spec` / `params.spec` 要保留。

### P3 · 线缆夹 `clamp.ts`（新增模块）

`src/app/core/enclosure/clamp.ts` + `clamp.spec.ts` —— 1.4.2 没有这个模块。
独立模块，需确认它是否被 `base.ts` / 参数系统引用（若是，则牵一发动全身）。

### P4 · 参数说明气泡 `help-tip.component.ts`（UI 增强）

- 新增组件 224 行，配套 `params-form.component.html` **+1551/−? 的巨量改动**
  （每个参数标签都要挂 `<app-help-tip>`）。
- 本仓库有成熟约定（见 MEMORY.md）：气泡必须 `position: fixed`、
  `{value}` 占位符走 `[hintValue]` 标量 input、不要加常驻文字说明、
  **分区标题不要挂叹号**（用户撤销过）。
- 风险：改动面最大、最易冲突，建议排在功能之后。

---

## 二、⚠️ 需要你拍板（会改变默认产物 / 破坏预设兼容）

| # | 事项 | 1.4.2 | 1.6.1 | 影响 |
| --- | --- | --- | --- | --- |
| 1 | **偏移语义** `internalwalls` | `width/2 + wall.x` | `width/2 − wall.x` | 旧预设的孔/隔板位置**镜像偏移** |
| 2 | `lidScrewHoleType` 默认值 | `through` | `blind` | 默认产物变化 |
| 3 | 通风槽 `angle` 参数 | 无 | 有 | 新参数，旧预设走兜底 |
| 4 | `dimensions.ts` 合并进 `utils` | 独立文件 | `innerWallInset`/`cavityFloorZ` 移入 utils | 纯重构 |

**第 1 项要特别说**：记忆里 2026-10-10 曾拍板「改回上游语义」，但 1.4.2（09-30）
是那之前的版本、用的是本地旧语义。你现在选 1.4.2 作基线，是**保留旧语义**还是
**再改回上游语义**？保留 = 你现有的预设继续可用；改回 = 与上游一致但旧预设失效。

---

## 三、❌ 不要搬（本轮已判定失败的改动）

这一整类来自 1.6.1 的几何"优化"，是本轮 8 次试错被否决的东西：

| 改动 | 为什么不要 |
| --- | --- |
| `utils.ts` 真等距内缩 `Math.max(r - t, 1e-4)` | 「壁厚增大时内腔四角弧度消失」的根因 |
| clover 解析式重写（`cloverOutline2d` / `cloverFrameIso2d`） | 槽连续但非流形 883、内壁弧度与原版不符 |
| 叶加厚 `CLOVER_RIB` | 尖刺 2.08→0.58，但凹口变浅 1.5mm（外形变化），**第 8 次试错，已被否决** |
| clover 切割体外移 0.01mm | BSP 爆炸（盖板体积 16789→4326mm³） |
| `waterproofseal` 按 lidScrews 选形状族 | 只影响「防水 + 关螺丝」—— 该组合被 UI 双向联动锁死，不可达 |
| `getSealReliefRadius` 的 clamp | 同上，且实测该 clamp 未触发就已打穿 |

**核心结论**（务必记住）：clover 花瓣「叶厚 0」是数学死结，等距内缩只有
尖刺 / 断开 / 残鳍 三种结果，**没有第四种**。别再从「内缩方式」上想办法。

---

## 四、建议的搬迁顺序

```
1. 孔深贯穿余量            ← 改动 2 行，已实测有效，立刻见效
2. STEP 导出               ← 独立模块，先验证闭合性再搬
3. clamp 线缆夹            ← 独立模块
4. 新增 spec（pcbpreview / ventilation / clamp）
5. help-tip 参数说明       ← UI 改动最大，放后面
6. 偏移语义等兼容性变更     ← 等你拍板
```

每步一个 commit，跑 `npm run verify` + `npm run build` 后确认。

---

## 五、本分支已有的东西（不用再搬）

1.4.2 已内建，此前以为要从 1.6.1 搬回来的：

`i18n/`（translations 623 行）、`ventilation.ts`、`pcbpreview.ts`、`dinrailmount.ts`、
`showAxes`、`wallMountChamferAngle`、`lidScrewOffset`/`lidScrewProtrusion`、
`screwPostProtrusion`/`sealReliefRadius`（防水槽打穿 1.4.2 **已修过一次**）、
22 个 spec / 183 单测通过。
