import type { Params } from '../params';

/**
 * 从 Params 派生的关键尺寸。
 *
 * 历史上 `waterProof ? wall * 2 + insertClearance * 2 + insertThickness : wall`
 * 这组表达式在 base / pcbmount / pcbpreview / snapfit / sidebar 各写了一遍，
 * 内腔地板高度又在 internalwalls 与 pcbpreview 之间出现了分歧。
 * 所有派生尺寸集中在这里计算，几何模块一律引用，避免基准漂移。
 */

// 内壁内缩量：防水时为「双层壁 + 嵌入边」，否则为单层壁厚
export const innerWallInset = (params: Params): number => {
  const { wall, waterProof, insertThickness, insertClearance } = params;
  return waterProof ? wall * 2 + insertClearance * 2 + insertThickness : wall;
};

/**
 * 内腔地板所在的 Z 高度。
 *
 * 两条生成路径的内腔底并不相同：
 * - lidScrews = true  → 走 clover 挖空，内腔底被抬到 z = floor
 * - lidScrews = false → 走 hollowRoundCube，该函数不消费 floor，内腔底就在 z = wall
 *
 * 内隔板、PCB 支柱、PCB 预览必须共用这一个基准，否则关闭盖板螺丝后会互相错位。
 */
export const cavityFloorZ = (params: Params): number => {
  return params.lidScrews ? params.floor : innerWallInset(params);
};

// 螺丝孔外侧至少保留的壁厚（mm）。低于此值 FDM 打印容易破壁，螺丝也容易顶穿。
export const MIN_SCREW_WALL = 0.6;

/**
 * 参与螺丝孔定位的「最大孔径」。
 *
 * 嵌入螺母比螺丝本身粗不少（M3 螺母对边 5.7mm，外接圆 6.58mm），
 * 而螺丝柱/让位缺口必须能包住螺母，所以螺母模式下要按螺母的外接圆来算，
 * 否则槽开出来比螺母小、装不进去。
 */
export const screwDiameterMax = (params: Params): number => {
  const nutDiameter =
    params.lidScrewHoleType === 'nut-pocket' ? (params.lidScrewNutWidth / Math.sqrt(3)) * 2 : 0;
  return Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter, nutDiameter);
};

/**
 * 盲孔的实际深度（mm）：从基座顶面往下量。
 *
 * 上限取 `height − floor` —— 孔底停在底板顶面，**不打通底板**。
 * 这样外壳底部仍然是完整的，不会从底下进灰进水；想打通请改用 `through`。
 * （上游的盲孔不设这个上限，depth 给大了就会从底部打穿。）
 */
export const lidScrewBlindDepth = (params: Params): number => {
  const upper = Math.max(params.height - params.floor, 0);
  return Math.min(Math.max(params.lidScrewHoleDepth, 0), upper);
};

/** 嵌入螺母槽的实际深度（mm）：夹到 `[0.5, height − floor]`，避免薄壳被挖穿 */
export const lidScrewNutPocketDepth = (params: Params): number => {
  const upper = Math.max(Math.min(params.height - params.floor, params.height), 0.5);
  return Math.min(Math.max(params.lidScrewNutDepth, 0.5), upper);
};

/**
 * 螺丝孔中心距相邻两边的最小安全距离。
 *
 * 直线边处只要求「半径 + 最小壁厚」；但螺丝孔落在圆角区时，外表面是圆弧，
 * 沿对角线方向的厚度衰减更快（外移 1mm 只换来 1/√2 的壁厚），
 * 圆角半径越大越容易把外壁削穿，因此圆角区要额外外移。
 */
export const minScrewOffset = (params: Params, screwDiameter: number): number => {
  const radius = screwDiameter / 2;
  const straight = radius + MIN_SCREW_WALL;
  const R = params.cornerRadius;
  const diagonal = R - (R - radius - MIN_SCREW_WALL) / Math.SQRT2;

  // 再夹一层上限：螺丝孔不能被推到基座中线之外
  const upper = Math.max(
    Math.min(params.width, params.length) / 2 - radius - MIN_SCREW_WALL,
    straight,
  );
  return Math.min(Math.max(straight, diagonal), upper);
};

/**
 * 螺丝柱内缩量的上界：两端螺丝柱不能相遇，也要给圆角和孔壁留出空间。
 * 外形过小时退化为下界，避免出现「上界 < 下界」的空区间。
 */
export const maxScrewOffset = (params: Params, screwDiameter: number): number => {
  const radius = screwDiameter / 2;
  const upper =
    Math.min(params.width, params.length) / 2 - params.cornerRadius - radius - MIN_SCREW_WALL;
  return Math.max(upper, minScrewOffset(params, screwDiameter));
};

/**
 * 盖板「嵌入边」顶端倒角的两种上限系数。
 *
 * - 高度系数 0.9：楔环的竖向深度不得超过嵌入边自身高度，否则会向下啃到盖板本体
 * - 厚度系数 0.8：嵌入边是一圈厚 `insertThickness` 的框，倒角吃掉的是外缘，
 *   顶面宽度会变成 `insertThickness − c`。留 20% 是为了顶端还剩一圈能打出来的顶面，
 *   而不是被削成刀口（早先只按高度夹紧，5mm 的倒角会把嵌入边顶端整圈削掉，
 *   盖板总高实测从 6mm 掉到 5.23mm）
 */
export const LID_TOP_CHAMFER_HEIGHT_RATIO = 0.9;
export const LID_TOP_CHAMFER_THICKNESS_RATIO = 0.8;

/**
 * 盖板嵌入边顶端倒角的实际生效尺寸（mm），0 表示关闭。
 */
export const lidTopChamferSize = (params: Params): number => {
  if (params.lidTopChamfer <= 0) {
    return 0;
  }
  const upper = Math.max(
    Math.min(
      params.insertHeight * LID_TOP_CHAMFER_HEIGHT_RATIO,
      params.insertThickness * LID_TOP_CHAMFER_THICKNESS_RATIO,
    ),
    0,
  );
  return Math.min(params.lidTopChamfer, upper);
};

// 沉头倒角的最小可打印尺寸与合理上限
export const MIN_SCREW_COUNTERSINK = 0.2;
export const MAX_SCREW_COUNTERSINK = 2.5;

/**
 * 盖板螺丝孔沉头倒角的实际生效尺寸（mm），0 表示关闭。
 *
 * 上限取 `min(2.5, 盖板总厚度 × 0.6)`：锥坑不能切得太深，否则会穿透盖板本体、
 * 也会让自攻螺丝失去咬合长度。
 */
export const lidScrewCountersinkSize = (params: Params): number => {
  const size = params.lidScrewCountersink;
  if (size <= 0) {
    return 0;
  }
  const maxByDepth = (params.roof + params.insertHeight) * 0.6;
  const upper = Math.max(Math.min(MAX_SCREW_COUNTERSINK, maxByDepth), MIN_SCREW_COUNTERSINK);
  return Math.min(Math.max(size, MIN_SCREW_COUNTERSINK), upper);
};

// 经典（自动）螺丝孔位置：沿用既有公式，保证默认参数下行为不变
const classicScrewOffset = (params: Params, screwDiameter: number): number =>
  screwDiameter / 2 + params.cornerRadius / 4 + params.wall / 2;

// 统一的夹紧：内缩量与孔位共用同一组边界，外形过小时上界退化为下界
const clampScrew = (params: Params, requested: number, screwDiameter: number): number => {
  const lo = minScrewOffset(params, screwDiameter);
  const hi = maxScrewOffset(params, screwDiameter);
  return Math.min(Math.max(requested, lo), hi);
};

/**
 * 防水开启时螺丝柱凸出量的自动取值（mm）。
 *
 * 防水结构里盖板要压着密封圈拧紧，螺丝柱需要更厚实才咬得住自攻螺丝，
 * 所以自动值比「最小值」更大。用户仍可用 `lidScrewProtrusion` 覆盖。
 */
export const WATERPROOF_PROTRUSION = 3;

/**
 * 螺丝柱向腔内凸出的量（mm）—— 也就是内腔四角那块凸出实体的半径，
 * 对应 clover 让位缺口的大小。
 *
 * `lidScrewProtrusion = 0`（默认，自动）时：防水取 `WATERPROOF_PROTRUSION`(3mm)，
 * 非防水取允许区间的最小值（够用即可、尽量少占内腔）。自动值同样会被夹紧。
 * 自定义为正值时，超出区间会夹到边界。它不参与螺丝孔的定位。
 */
export const screwPostProtrusion = (params: Params): number => {
  // 螺母模式下螺丝柱要包得住螺母，因此按螺母外接圆算（见 screwDiameterMax）
  const diameterMax = screwDiameterMax(params);
  const lo = minScrewOffset(params, diameterMax);
  const hi = maxScrewOffset(params, diameterMax);
  const upper = Math.max(hi, lo);

  if (params.lidScrewProtrusion > 0) {
    // 自定义值优先：超出区间时夹到边界
    return Math.min(Math.max(params.lidScrewProtrusion, lo), upper);
  }

  // 自动取值：
  // - 防水开启 → 3mm。防水时盖板要压着密封圈拧紧，螺丝柱得更厚实才咬得住自攻螺丝
  // - 非防水 → 取允许区间的最小值，够用即可、尽量少占内腔
  const auto = params.waterProof ? WATERPROOF_PROTRUSION : lo;
  return Math.min(Math.max(auto, lo), upper);
};

/**
 * 螺丝孔中心距相邻两边的距离（mm）。
 *
 * `lidScrewOffset = 0` 时走经典公式。**与凸出量彼此独立**：调凸出量只改变
 * 内腔角落那块实体的大小，孔位纹丝不动。两者都会被夹到
 * `[minScrewOffset, maxScrewOffset]`，保证不会与螺丝柱或其他结构干涉。
 */
export const screwOffset = (params: Params, screwDiameter: number): number => {
  const requested =
    params.lidScrewOffset > 0 ? params.lidScrewOffset : classicScrewOffset(params, screwDiameter);
  return clampScrew(params, requested, screwDiameter);
};

/**
 * 盖板嵌入边的外形圆角半径。
 *
 * 开盖板螺丝时嵌入边走 clover，其外形由螺丝柱半径决定；否则是普通圆角矩形。
 * 嵌入边顶端的倒角必须按这个轮廓来，否则斜面会对不上边。
 */
export const insertRimRadius = (params: Params): number =>
  params.lidScrews ? screwPostProtrusion(params) : params.cornerRadius;
