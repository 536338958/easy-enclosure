import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type Mat4 from '@jscad/modeling/src/maths/mat4/type';
import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { intersect, subtract } from '@jscad/modeling/src/operations/booleans';
import { hull } from '@jscad/modeling/src/operations/hulls';
import { transform, translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid } from '@jscad/modeling/src/primitives';

import type { Params } from '../params';
import { clover, roundedCube } from './utils';

export const LID_TOP_CHAMFER_HEIGHT_RATIO = 0.9;
export const LID_TOP_CHAMFER_THICKNESS_RATIO = 0.8;

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

export const bottomChamferTool = (l: number, w: number, c: number, r = 8, s = 48): Geom3 => {
  const eps = 0.01;
  const cc = Math.max(Math.min(c, r * 0.9, l / 2 - 0.5, w / 2 - 0.5), 0);
  if (cc <= 0) {
    return cuboid({ size: [eps, eps, eps] });
  }
  const innerR = Math.max(r - cc, 0.1);
  const fullSlab = roundedCube(l, w, cc, r, s);
  const bottom = translate([cc, cc, 0], roundedCube(l - cc * 2, w - cc * 2, eps, innerR, s));
  const top = translate([0, 0, cc - eps], roundedCube(l, w, eps, r, s));
  const flare = hull(bottom, top);
  return subtract(fullSlab, flare);
};

export const CHAMFER_DIRECTIONS = 8;

/**
 * 生成倒角切割体的柱体。
 *
 * `expand` 是要求把这个柱体向外放大的量（mm）。调用方用它把切割体的外立面推到被切
 * 对象的外表面之外，打破两者的严格共面 —— 共面会让 JSCAD 的布尔减法留下浮点残渣，
 * 也就是模型上那层毛糙薄壁。
 *
 * ⚠️ 凹轮廓（clover 的四叶草让位缺口）**不能外移**：实测外移 0.01 后，90 组参数里
 * 有 14 组的盖板体积直接爆炸（默认参数下 16789 → 4326mm³，表现为「盖板只剩下一点点」）。
 * 原因是外移后切割体外墙与被切件外墙变成**近共面** —— 这个距离远大于布尔容差、又远
 * 小于任何特征尺寸，JSCAD 的 BSP 在这一带分类不稳定，会整片丢面。失效呈混沌分布，
 * 单点验证发现不了，只能扫包络。所以 lid.ts 里 clover 传 0、圆角矩形传 0.01。
 */
export type OutlineBuilder = (l: number, w: number, h: number) => Geom3;

export const roundedOutline =
  (r: number, s = 48): OutlineBuilder =>
  (l, w, h) =>
    roundedCube(l, w, h, r, s);

export const cloverOutline =
  (r: number, s = 48): OutlineBuilder =>
  (l, w, h) =>
    clover(l, w, h, r, s);

// Maps (x, y, z) to (x - z*ux, y - z*uy, z) to shear the top face relative to z = 0.
const shearMatrix = (ux: number, uy: number): Mat4 => [
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  -ux,
  -uy,
  1,
  0,
  0,
  0,
  0,
  1,
];

// Linear shear intersection preserves non-convex contours (e.g. concave clover scallops) that hull bridges over.
export const topChamferTool = (
  l: number,
  w: number,
  c: number,
  topZ: number,
  outline: OutlineBuilder,
  expand = 0,
): Geom3 => {
  const eps = 0.01;
  const cc = Math.max(Math.min(c, topZ * 0.9, l / 2 - 0.5, w / 2 - 0.5), 0);
  if (cc <= 0) {
    return cuboid({ size: [eps, eps, eps] });
  }
  const slabZ = topZ - cc;
  // 切割体的外立面必须与嵌入边的外表面错开一点点：两者若严格共面，JSCAD 的布尔减法
  // 会在共面处留下浮点残渣，表现为倒角面上的毛糙薄壁。
  const slab = outline(l + 2 * expand, w + 2 * expand, cc);
  let keep: Geom3 | null = null;
  for (let i = 0; i < CHAMFER_DIRECTIONS; i += 1) {
    const angle = (i / CHAMFER_DIRECTIONS) * Math.PI * 2;
    const sheared = transform(shearMatrix(Math.cos(angle), Math.sin(angle)), slab);
    keep = keep ? intersect(keep, sheared) : sheared;
  }
  return translate([0, 0, slabZ], subtract(slab, keep as Geom3));
};

export const chamferSolidBottom = (solid: Geom3, c: number): Geom3 => {
  if (c <= 0) {
    return solid;
  }
  const eps = 0.01;
  const [min, max] = measureBoundingBox(solid);
  const l = max[0] - min[0];
  const w = max[1] - min[1];
  const cc = Math.max(Math.min(c, l / 2 - 0.5, w / 2 - 0.5), 0);
  if (cc <= 0) {
    return solid;
  }
  const fullSlab = translate([l / 2, w / 2, cc / 2], cuboid({ size: [l, w, cc] }));
  const bottomInset = translate(
    [l / 2, w / 2, eps / 2],
    cuboid({ size: [Math.max(l - cc * 2, eps), Math.max(w - cc * 2, eps), eps] }),
  );
  const topFull = translate([l / 2, w / 2, cc - eps / 2], cuboid({ size: [l, w, eps] }));
  const tool = subtract(fullSlab, hull(bottomInset, topFull));
  return subtract(solid, translate([min[0], min[1], min[2]], tool));
};
