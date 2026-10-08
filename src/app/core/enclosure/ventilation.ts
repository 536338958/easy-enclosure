import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { union } from '@jscad/modeling/src/operations/booleans';
import { hull } from '@jscad/modeling/src/operations/hulls';
import { rotateX, rotateZ, translate } from '@jscad/modeling/src/operations/transforms';
import { cylinder } from '@jscad/modeling/src/primitives';
import { degToRad } from '@jscad/modeling/src/utils';

import { Params, Ventilation } from '../params';

// 单个圆角散热槽：沿 Z 拉伸 depth，长轴在 X 或 Y（用于顶/底面）
const slotZ = (
  slotWidth: number,
  slotLength: number,
  depth: number,
  longAxis: 'x' | 'y',
): Geom3 => {
  const r = Math.max(slotWidth / 2, 0.2);
  const c = cylinder({ radius: r, height: depth, segments: 24 });
  if (slotLength <= slotWidth) {
    return c;
  }
  const d = (slotLength - slotWidth) / 2;
  const off: [number, number, number] = longAxis === 'x' ? [d, 0, 0] : [0, d, 0];
  const neg: [number, number, number] = [-off[0], -off[1], -off[2]];
  return hull(translate(neg, c), translate(off, c));
};

// 单个圆角散热槽：沿 Y 拉伸 depth（即穿透 ±Y 的墙），长轴在 X（水平）或 Z（竖直）
const slotY = (
  slotWidth: number,
  slotLength: number,
  depth: number,
  longAxis: 'x' | 'z',
): Geom3 => {
  const r = Math.max(slotWidth / 2, 0.2);
  // 圆柱默认轴沿 Z，旋转 90° 使其轴沿 Y（拉伸方向为 Y）
  const c = rotateX(degToRad(90), cylinder({ radius: r, height: depth, segments: 24 }));
  if (slotLength <= slotWidth) {
    return c;
  }
  const d = (slotLength - slotWidth) / 2;
  const off: [number, number, number] = longAxis === 'x' ? [d, 0, 0] : [0, 0, d];
  const neg: [number, number, number] = [-off[0], -off[1], -off[2]];
  return hull(translate(neg, c), translate(off, c));
};

// 把单槽沿某个轴阵列，返回以原点为中心的一组槽
const arrayAlong = (slot: Geom3, count: number, pitch: number, axis: 'x' | 'y' | 'z'): Geom3 => {
  const n = Math.max(Math.floor(count), 1);
  const span = (n - 1) * pitch;
  const parts: Geom3[] = [];
  for (let i = 0; i < n; i++) {
    const offset = -span / 2 + i * pitch;
    const t: [number, number, number] =
      axis === 'x' ? [offset, 0, 0] : axis === 'y' ? [0, offset, 0] : [0, 0, offset];
    parts.push(translate(t, slot));
  }
  return parts.length === 1 ? parts[0] : union(parts);
};

// 为单个通风槽项生成切割体；若该项不属于当前 target（lid/base）则返回 null
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

  const sw = item.slotWidth;
  const pitch = sw + item.slotGap;
  const vertical = item.orientation === 'vertical';
  const sideWall = params.insertThickness + params.insertClearance * 2 + params.wall * 2 + 2;
  const auto = (full: number) => Math.max(full * 0.6, sw);
  const L = (full: number) => (item.slotLength > 0 ? item.slotLength : auto(full));

  if (surface === 'top' || surface === 'bottom') {
    const depth = (surface === 'top' ? roof : floor) + 2;
    const zc = (surface === 'top' ? roof : floor) / 2;
    let panel: Geom3;
    if (vertical) {
      // 竖切：槽长轴沿 Y（纵向），沿 X 阵列
      panel = arrayAlong(slotZ(sw, L(length), depth, 'y'), item.slotCount, pitch, 'x');
    } else {
      // 横切：槽长轴沿 X（横向），沿 Y 阵列
      panel = arrayAlong(slotZ(sw, L(width), depth, 'x'), item.slotCount, pitch, 'y');
    }
    return translate([width / 2 + item.x, length / 2 + item.y, zc], panel);
  }

  if (surface === 'front' || surface === 'back') {
    // 墙面横跨 X(宽)×Z(高)，穿透方向为 Y
    let panel: Geom3;
    if (vertical) {
      // 竖切：槽长轴沿 Z（竖直），沿 X 阵列
      panel = arrayAlong(slotY(sw, L(height), sideWall, 'z'), item.slotCount, pitch, 'x');
    } else {
      // 横切：槽长轴沿 X（水平），沿 Z 竖直堆叠
      panel = arrayAlong(slotY(sw, L(width), sideWall, 'x'), item.slotCount, pitch, 'z');
    }
    const y = surface === 'front' ? length - sideWall / 2 : sideWall / 2;
    return translate([width / 2 + item.x, y, height / 2 + item.y], panel);
  }

  // left / right：墙面横跨 Y(长)×Z(高)，穿透方向为 X
  // 先在「法向为 Y」的规范平面构建，再绕 Z 旋转 90° 使法向变为 X
  let panel: Geom3;
  if (vertical) {
    // 竖切：槽长轴沿 Z（竖直）
    panel = arrayAlong(slotY(sw, L(height), sideWall, 'z'), item.slotCount, pitch, 'x');
  } else {
    // 横切：槽长轴沿水平（旋转后沿 Y=长度方向），竖直堆叠
    panel = arrayAlong(slotY(sw, L(length), sideWall, 'x'), item.slotCount, pitch, 'z');
  }
  const rotated = rotateZ(degToRad(90), panel);
  const x = surface === 'left' ? width - sideWall / 2 : sideWall / 2;
  // 旋转后：原 X(水平) → Y(长度方向)。item.x 水平偏移映射到 Y，item.y 竖直偏移映射到 Z
  return translate([x, length / 2 + item.x, height / 2 + item.y], rotated);
};

// 生成用于从模型上「减去」的散热槽切割体（合并所有通风槽项）。
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
