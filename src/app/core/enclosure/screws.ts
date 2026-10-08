import { union } from '@jscad/modeling/src/operations/booleans';
import { cylinder, cylinderElliptic } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';
import { Params } from '../params';

export const getScrewDiameterMax = (params: Params): number => {
  const {
    baseLidScrewDiameter,
    lidScrewDiameter,
    lidScrewHoleType,
    lidScrewNutWidth,
    lidScrewRecessType,
    lidScrewRecessDiameter,
  } = params;
  const nutDiameter = lidScrewHoleType === 'nut-pocket' ? (lidScrewNutWidth / Math.sqrt(3)) * 2 : 0;
  const recessDiameter =
    lidScrewRecessType && lidScrewRecessType !== 'none' ? lidScrewRecessDiameter : 0;
  return Math.max(baseLidScrewDiameter, lidScrewDiameter, nutDiameter, recessDiameter);
};

/**
 * 螺丝孔与外壁之间必须保留的最小壁厚（mm）。
 * 孔位夹紧的下界由此推出：孔不能被推到外壁之外，也不能越过基座中线。
 */
export const MIN_SCREW_WALL = 0.6;

/** 孔位下界：孔壁到外壁至少留 MIN_SCREW_WALL，且不被推出基座中线 */
const minScrewOffset = (params: Params, screwDiameter: number): number => {
  const radius = screwDiameter / 2;
  const straight = radius + MIN_SCREW_WALL;
  const R = params.cornerRadius;
  const diagonal = R - (R - radius - MIN_SCREW_WALL) / Math.SQRT2;

  const upper = Math.max(
    Math.min(params.width, params.length) / 2 - radius - MIN_SCREW_WALL,
    straight,
  );
  return Math.min(Math.max(straight, diagonal), upper);
};

/** 孔位上界：还需给圆角本身留出空间；外形过小时退化为下界 */
const maxScrewOffset = (params: Params, screwDiameter: number): number => {
  const radius = screwDiameter / 2;
  const upper =
    Math.min(params.width, params.length) / 2 - params.cornerRadius - radius - MIN_SCREW_WALL;
  return Math.max(upper, minScrewOffset(params, screwDiameter));
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
 * **它与螺丝孔位是两回事**：孔位决定孔打在哪，凸出量决定角落那块实体多大。
 * 上游原本让两者共用 `getScrewOffset()`，螺母模式下该值会算到 5.04 而实际
 * 柱体只有 3.89，密封圈槽在四角绕行过头、直接把槽切断（表现为「防水槽被打穿」）。
 * 这里把凸出量拆成独立量，并让密封圈让位半径与它同源，绕的是同一根柱子。
 *
 * `lidScrewProtrusion = 0`（默认）时：防水取 `WATERPROOF_PROTRUSION`(3mm)，
 * 非防水取允许区间的最小值（够用即可、尽量少占内腔）；给正值则按用户指定，
 * 超出区间会夹到边界。
 */
export const screwPostProtrusion = (params: Params): number => {
  const diameterMax = getScrewDiameterMax(params);
  const lo = minScrewOffset(params, diameterMax);
  const hi = maxScrewOffset(params, diameterMax);
  const upper = Math.max(hi, lo);

  if (params.lidScrewProtrusion > 0) {
    return Math.min(Math.max(params.lidScrewProtrusion, lo), upper);
  }

  const auto = params.waterProof ? WATERPROOF_PROTRUSION : lo;
  return Math.min(Math.max(auto, lo), upper);
};

/**
 * 盖板嵌入边的外形圆角半径：开盖板螺丝时嵌入边走 clover，其外形由螺丝柱
 * 半径决定；否则是普通圆角矩形。嵌入边顶端倒角必须按这个轮廓来，否则斜面对不上边。
 */
export const insertRimRadius = (params: Params): number =>
  params.lidScrews ? screwPostProtrusion(params) : params.cornerRadius;

/**
 * 螺丝孔中心距相邻两边的距离（mm）。
 *
 * `lidScrewOffset = 0` 时走经典公式（与既有默认行为一致）；给正值则按用户
 * 指定值，并夹紧到 [minScrewOffset, maxScrewOffset]，保证孔与外壁之间始终
 * 留有最小壁厚、不会与其他结构干涉。
 */
export const getScrewOffset = (params: Params): number => {
  const diameterMax = getScrewDiameterMax(params);
  const classic = diameterMax / 2 + params.cornerRadius / 4 + params.wall / 2;
  const requested = params.lidScrewOffset > 0 ? params.lidScrewOffset : classic;
  const lo = minScrewOffset(params, diameterMax);
  const hi = maxScrewOffset(params, diameterMax);
  return Math.min(Math.max(requested, lo), hi);
};

export const screws = (
  length: number,
  width: number,
  height: number,
  offset: number,
  diameter: number,
  depth?: number,
) => {
  const tolerance = 0.2;
  const isBlindHole = depth !== undefined && depth > 0;
  const effectiveDepth = isBlindHole ? Math.min(depth, height) : undefined;

  const cylinderHeight = isBlindHole ? effectiveDepth! + tolerance : height + tolerance * 2;
  const zCenter = isBlindHole ? height - (effectiveDepth! - tolerance) / 2 : height / 2;

  const screwCylinder = cylinder({ radius: diameter / 2, height: cylinderHeight });
  return union(
    translate([offset, offset, zCenter], screwCylinder),
    translate([width - offset, offset, zCenter], screwCylinder),
    translate([offset, length - offset, zCenter], screwCylinder),
    translate([width - offset, length - offset, zCenter], screwCylinder),
  );
};

export const nutPockets = (
  length: number,
  width: number,
  offset: number,
  nutWidth: number,
  nutDepth: number,
) => {
  const tolerance = 0.2;
  const radius = nutWidth / Math.sqrt(3);
  const cylinderHeight = nutDepth + tolerance;
  const zCenter = (nutDepth - tolerance) / 2;

  const nutCylinder = cylinder({
    radius,
    height: cylinderHeight,
    segments: 6,
  });

  return union(
    translate([offset, offset, zCenter], nutCylinder),
    translate([width - offset, offset, zCenter], nutCylinder),
    translate([offset, length - offset, zCenter], nutCylinder),
    translate([width - offset, length - offset, zCenter], nutCylinder),
  );
};

export const lidScrewRecesses = (params: Params) => {
  const {
    length,
    width,
    roof,
    lidScrewDiameter,
    lidScrewRecessType,
    lidScrewRecessDiameter,
    lidScrewRecessDepth,
  } = params;
  const tolerance = 0.2;
  const offset = getScrewOffset(params);

  if (lidScrewRecessType === 'counterbore') {
    const effectiveDepth = Math.max(0.2, Math.min(lidScrewRecessDepth, roof - 0.4));
    const height = effectiveDepth + tolerance;
    const zCenter = (effectiveDepth - tolerance) / 2;
    const cb = cylinder({ radius: lidScrewRecessDiameter / 2, height });
    return union(
      translate([offset, offset, zCenter], cb),
      translate([width - offset, offset, zCenter], cb),
      translate([offset, length - offset, zCenter], cb),
      translate([width - offset, length - offset, zCenter], cb),
    );
  }

  if (lidScrewRecessType === 'countersunk') {
    const coneDepth = (lidScrewRecessDiameter - lidScrewDiameter) / 2;
    const totalHeight = coneDepth + tolerance;
    const topRadius = lidScrewRecessDiameter / 2 + tolerance;
    const botRadius = lidScrewDiameter / 2;
    const zCenter = (coneDepth - tolerance) / 2;

    const cs = cylinderElliptic({
      startRadius: [topRadius, topRadius],
      endRadius: [botRadius, botRadius],
      height: totalHeight,
    });
    return union(
      translate([offset, offset, zCenter], cs),
      translate([width - offset, offset, zCenter], cs),
      translate([offset, length - offset, zCenter], cs),
      translate([width - offset, length - offset, zCenter], cs),
    );
  }

  return null;
};
