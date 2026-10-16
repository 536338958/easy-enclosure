import { seg } from './quality';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';

import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import { intersect, union } from '@jscad/modeling/src/operations/booleans';
import { hull } from '@jscad/modeling/src/operations/hulls';
import { rotateX, rotateZ, translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid, cylinder } from '@jscad/modeling/src/primitives';
import { degToRad } from '@jscad/modeling/src/utils';

import { normalizeVentilation, Params, Ventilation, VentilationMode } from '../params';

/** 槽的有效角度：夹紧到 0–180（槽按 180° 对称，超出没有意义） */
const clampAngle = (angle: number): number => {
  if (!Number.isFinite(angle)) {
    return 0;
  }
  return Math.min(Math.max(angle, 0), 180);
};

/**
 * 沿 Z 穿透（用于顶/底面）的圆角长槽。
 * 长轴落在 XY 平面内，angle 以 +X 轴为 0°，逆时针为正。
 */
const slotZ = (slotWidth: number, slotLength: number, depth: number, angle: number): Geom3 => {
  const r = Math.max(slotWidth / 2, 0.2);
  const c = cylinder({ radius: r, height: depth, segments: seg(24) });
  if (slotLength <= slotWidth) {
    return c;
  }
  const d = (slotLength - slotWidth) / 2;
  const t = degToRad(clampAngle(angle));
  const off: [number, number, number] = [d * Math.cos(t), d * Math.sin(t), 0];
  const neg: [number, number, number] = [-off[0], -off[1], -off[2]];
  return hull(translate(neg, c), translate(off, c));
};

/**
 * 沿 Y 穿透（用于四个墙面）的圆角长槽。
 * 长轴落在 XZ 平面内，angle 以 +X 为 0°，90° 为竖直。
 */
const slotY = (slotWidth: number, slotLength: number, depth: number, angle: number): Geom3 => {
  const r = Math.max(slotWidth / 2, 0.2);
  const c = rotateX(degToRad(90), cylinder({ radius: r, height: depth, segments: seg(24) }));
  if (slotLength <= slotWidth) {
    return c;
  }
  const d = (slotLength - slotWidth) / 2;
  const t = degToRad(clampAngle(angle));
  const off: [number, number, number] = [d * Math.cos(t), 0, d * Math.sin(t)];
  const neg: [number, number, number] = [-off[0], -off[1], -off[2]];
  return hull(translate(neg, c), translate(off, c));
};

/**
 * 构造单个通风单元。
 * 一律沿 Z 拉伸、截形落在 XY 平面——阵列和朝向由调用方负责，
 * 这样 gridAlong 的「行」才不会跟着一起被旋转到穿透轴上。
 */
const ventCell = (mode: VentilationMode, size: number, depth: number): Geom3 => {
  if (mode === 'squareGrid') {
    const s = Math.max(size, 0.2);
    return cuboid({ size: [s, s, depth] });
  }
  const r = Math.max(size / 2, 0.2);
  // circleGrid 用 24 段近似圆；hexGrid 用 6 段得到正六棱柱
  const c = cylinder({ radius: r, height: depth, segments: mode === 'hexGrid' ? 6 : 24 });
  // 六棱柱默认顶点落在 0°/60°/…，正好撞上错排阵列的邻居方向，两个孔会「尖对角」，
  // 肋从中心向两侧张口。转 30° 让边的法线对准邻居方向，肋才是两条平行边夹出的等宽带。
  return mode === 'hexGrid' ? rotateZ(degToRad(30), c) : c;
};

/** 把单元沿任意方向阵列，返回以原点为中心的一组单元 */
const arrayAlongDir = (
  slot: Geom3,
  count: number,
  pitch: number,
  dir: [number, number, number],
): Geom3 => {
  const n = Math.max(Math.floor(count), 1);
  const span = (n - 1) * pitch;
  const parts: Geom3[] = [];
  for (let i = 0; i < n; i += 1) {
    const offset = -span / 2 + i * pitch;
    parts.push(translate([dir[0] * offset, dir[1] * offset, dir[2] * offset], slot));
  }
  return parts.length === 1 ? parts[0] : union(parts);
};

/** 把单元铺成二维网格，返回以原点为中心的一组单元 */
const gridAlong = (
  cell: Geom3,
  cols: number,
  rows: number,
  pitch: number,
  stagger: boolean,
): Geom3 => {
  const c = Math.max(Math.floor(cols), 1);
  const r = Math.max(Math.floor(rows), 1);
  // 蜂窝状排列时行距为 pitch·√3/2，且奇数行水平错开半格
  const rowPitch = stagger ? pitch * (Math.sqrt(3) / 2) : pitch;
  const spanX = (c - 1) * pitch;
  const spanY = (r - 1) * rowPitch;
  const parts: Geom3[] = [];
  for (let j = 0; j < r; j += 1) {
    const y = -spanY / 2 + j * rowPitch;
    const shift = stagger && j % 2 === 1 ? pitch / 2 : 0;
    for (let i = 0; i < c; i += 1) {
      const x = -spanX / 2 + i * pitch + shift;
      parts.push(translate([x, y, 0], cell));
    }
  }
  return parts.length === 1 ? parts[0] : union(parts);
};

/** 按模式生成一块通风面板（以原点为中心，穿透方向为 Z） */
const buildPanel = (
  mode: VentilationMode,
  sw: number,
  slotLen: number,
  depth: number,
  pitch: number,
  angle: number,
  cols: number,
  rows: number,
  isFlat: boolean,
): Geom3 => {
  const t = degToRad(clampAngle(angle));
  if (mode === 'slot') {
    const slot = isFlat ? slotZ(sw, slotLen, depth, angle) : slotY(sw, slotLen, depth, angle);
    // 阵列方向取槽长轴的垂直方向，保证相邻槽平行且等距
    const dir: [number, number, number] = isFlat
      ? [-Math.sin(t), Math.cos(t), 0]
      : [-Math.sin(t), 0, Math.cos(t)];
    return arrayAlongDir(slot, cols, pitch, dir);
  }
  // 网格统一在「穿透 Z、阵列 XY」的规范姿态下铺开，最后整体旋转到目标面。
  // 若照旧先旋转单元再铺网格，「行」的位移会落在穿透轴上，多行会重叠成一排。
  const grid = gridAlong(ventCell(mode, sw, depth), cols, rows, pitch, mode === 'hexGrid');
  return isFlat ? grid : rotateX(degToRad(90), grid);
};

/**
 * 开孔范围（裁剪盒）：把面板与范围盒求交，范围外的开孔被裁掉、压线的截成平头。
 *
 * 坐标系与面板的规范姿态一致：布局平面内 X = 面的水平轴、Y = 面的竖直轴，Z = 穿透方向。
 * rangeA/rangeB 任一为 0 表示该轴不限制（盒体在该轴直接取面尺寸再放宽）。
 *
 * 盒体在布局两轴上外扩 0.02mm：槽端/孔缘恰好压在范围边界时，切割面与模型面
 * 会严格共面 —— 这是本项目验证过的布尔残渣来源，外扩一点点打破共面
 * （与 CHAMFER_TOOL_EXPAND 同一招，0.01mm 的边界误差不可感知）。
 * 裁出空面板时返回 null，调用方据此跳过该通风项。
 */
const clipToRange = (
  panel: Geom3,
  rangeA: number,
  rangeB: number,
  fullA: number,
  fullB: number,
  penSize: number,
  isFlat: boolean,
): Geom3 | null => {
  if (rangeA <= 0 && rangeB <= 0) {
    return panel;
  }
  const ax = rangeA > 0 ? rangeA + 0.02 : fullA + 2;
  const by = rangeB > 0 ? rangeB + 0.02 : fullB + 2;
  // flat：布局 XY、穿透 Z；非 flat：布局 XZ（水平 X、竖直 Z）、穿透 Y
  const box = isFlat
    ? cuboid({ size: [ax, by, penSize + 2] })
    : cuboid({ size: [ax, penSize + 2, by] });
  const clipped = intersect(panel, box);
  return measureVolume(clipped) > 1e-6 ? clipped : null;
};

// 为单个通风项生成切割体；若该项不属于当前 target（lid/base）则返回 null
const buildOne = (item: Ventilation, params: Params, target: 'lid' | 'base'): Geom3 | null => {
  const { width, length, height, roof, floor } = params;
  const surface = item.surface;
  const isTop = surface === 'top';
  if (target === 'lid' && !isTop) {
    return null;
  }
  if (target === 'base' && isTop) {
    return null;
  }

  const { mode, angle: rawAngle, rows: rawRows, rangeWidth: rawRW, rangeLength: rawRL } =
    normalizeVentilation(item);
  const angle = clampAngle(rawAngle);
  const cols = Math.max(Math.floor(item.slotCount), 1);
  const rows = Math.max(Math.floor(rawRows), 1);
  const sw = Math.max(item.slotWidth, 0.2);
  const gap = Math.max(item.slotGap, 0);
  // 蜂窝的最近邻距离必须是「√3·R + 肋宽」（R = sw/2，√3·R 是两条平行边的间距）。
  // 若沿用 sw + gap，相邻孔会被拉开 (1-√3/2)·sw，肋就比 slotGap 厚出一截且不均匀。
  // 圆孔/方孔最近邻就是直径方向，sw + gap 正是孔边缘间距，无需变动。
  const pitch = mode === 'hexGrid' ? (Math.sqrt(3) * sw) / 2 + gap : sw + gap;
  const sideWall = params.insertThickness + params.insertClearance * 2 + params.wall * 2 + 2;

  const isFlat = surface === 'top' || surface === 'bottom';
  // 槽长轴所在平面内的两条轴，各自的可用尺寸
  const fullA = isFlat ? width : surface === 'left' || surface === 'right' ? length : width;
  const fullB = isFlat ? length : height;
  // 开孔范围：0 = 该轴不限制；填了则夹到面尺寸内
  const rangeA = rawRW > 0 ? Math.min(rawRW, fullA) : 0;
  const rangeB = rawRL > 0 ? Math.min(rawRL, fullB) : 0;
  const t = degToRad(angle);
  const ca = Math.abs(Math.cos(t));
  const sa = Math.abs(Math.sin(t));
  // 沿槽方向可容纳的最大长度；某方向投影为 0 时该方向不限制。
  // 自动槽长优先取范围给的余量：设了范围，自动长度就按范围算（没设才用整面）
  const spanA = rangeA > 0 ? rangeA : fullA;
  const spanB = rangeB > 0 ? rangeB : fullB;
  const limitA = ca > 1e-6 ? spanA / ca : Infinity;
  const limitB = sa > 1e-6 ? spanB / sa : Infinity;
  const avail = Math.min(limitA, limitB);
  const slotLen = item.slotLength > 0 ? item.slotLength : Math.max(avail * 0.6, sw);

  if (isFlat) {
    const depth = (isTop ? roof : floor) + 2;
    const zc = (isTop ? roof : floor) / 2;
    const panel = buildPanel(mode, sw, slotLen, depth, pitch, angle, cols, rows, true);
    const clipped = clipToRange(panel, rangeA, rangeB, fullA, fullB, depth, true);
    if (!clipped) {
      return null;
    }
    return translate([width / 2 + item.x, length / 2 + item.y, zc], clipped);
  }

  const panel = buildPanel(mode, sw, slotLen, sideWall, pitch, angle, cols, rows, false);
  // 非 flat 的规范姿态：布局 XZ（X = 水平，Z = 竖直），穿透 Y
  const clipped = clipToRange(panel, rangeA, rangeB, fullA, fullB, sideWall, false);
  if (!clipped) {
    return null;
  }

  if (surface === 'front' || surface === 'back') {
    const y = surface === 'front' ? length - sideWall / 2 : sideWall / 2;
    return translate([width / 2 + item.x, y, height / 2 + item.y], clipped);
  }

  // left / right：先在「法向为 Y」的规范平面构建，再绕 Z 旋转 90° 使法向变为 X
  const rotated = rotateZ(degToRad(90), clipped);
  const x = surface === 'left' ? width - sideWall / 2 : sideWall / 2;
  // 旋转后：原 X(水平) → Y(长度方向)。item.x 水平偏移映射到 Y，item.y 竖直偏移映射到 Z
  return translate([x, length / 2 + item.x, height / 2 + item.y], rotated);
};

// 生成用于从模型上「减去」的散热通风切割体（合并所有通风项）。
// target 决定它服务于盖板(lid, 仅 top 面) 还是基座(base, 其余五个面)。
export const ventilationCut = (params: Params, target: 'lid' | 'base'): Geom3 | null => {
  const items = params.ventilation;
  if (!items || items.length === 0) {
    return null;
  }
  const parts: Geom3[] = [];
  items.forEach((item) => {
    const g = buildOne(item, params, target);
    if (g) {
      parts.push(g);
    }
  });
  if (parts.length === 0) {
    return null;
  }
  return parts.length === 1 ? parts[0] : union(parts);
};
