import { union } from '@jscad/modeling/src/operations/booleans';

import { cylinder, cylinderElliptic } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';

import { Params } from '../params';
import {
  MIN_SCREW_RECESS_DEPTH,
  MIN_SCREW_RECESS_RESIDUAL,
  screwDiameterMax,
  screwOffset,
} from './dimensions';

// 孔口超出实体表面的余量。让切割体**略微伸出**实体之外，
// 避免切面与实体的顶面/底面共面 —— 共面是 JSCAD 布尔运算产生非流形边的典型原因。
const TOLERANCE = 0.2;

/**
 * 四角螺丝孔的切割体。
 *
 * - `depth` 省略（或 ≥ height）→ 贯穿孔，z 从 −TOLERANCE 到 height + TOLERANCE
 * - `depth < height` → 盲孔，从顶面（z = height）往下钻 `depth`，即 z ∈ [height − depth, height + TOLERANCE]
 */
export const screws = (
  length: number,
  width: number,
  height: number,
  offset: number,
  diameter: number,
  depth?: number,
) => {
  const isBlind = depth !== undefined && depth > 0 && depth < height;
  const cylinderHeight = isBlind ? depth + TOLERANCE : height + TOLERANCE * 2;
  const zCenter = isBlind ? height - (depth - TOLERANCE) / 2 : height / 2;

  const screwCylinder = cylinder({ radius: diameter / 2, height: cylinderHeight });
  return union(
    translate([offset, offset, zCenter], screwCylinder),
    translate([width - offset, offset, zCenter], screwCylinder),
    translate([offset, length - offset, zCenter], screwCylinder),
    translate([width - offset, length - offset, zCenter], screwCylinder),
  );
};

/**
 * 四角的嵌入式螺母槽：从基座**底面**（z = 0）往上挖的正六边形沉孔，
 * z ∈ [−TOLERANCE, nutDepth]。螺丝从盖板一侧拧进来，锁进这颗嵌在底部的螺母。
 *
 * 六边形的对边宽是 `nutWidth`（扳手尺寸），外接圆半径 = `nutWidth / √3`。
 */
export const nutPockets = (
  length: number,
  width: number,
  offset: number,
  nutWidth: number,
  nutDepth: number,
) => {
  const radius = nutWidth / Math.sqrt(3);
  const cylinderHeight = nutDepth + TOLERANCE;
  const zCenter = (nutDepth - TOLERANCE) / 2;

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

/**
 * 盖板螺丝孔口的沉头窝切割体。从盖板减去，即可把螺丝头/螺帽藏进盖板里。
 *
 * 盖板的**外表面是 z = 0**（嵌入边朝 z 增大的方向伸进基座），所以窝口开在
 * z = 0、向 z 增大方向挖。孔位与 `screws()` 的四角孔一致（都走 screwOffset）。
 *
 * - `counterbore`：平底圆柱窝，把螺栓头整颗藏进去；深度由 `lidScrewRecessDepth` 给
 * - `countersunk`：45° 锥坑，配沉头螺丝；深度由窝口直径与孔径之差算出（固定 45°）
 * - `none`（或其他）：返回 `null`，调用方据此跳过
 *
 * 两种窝都让切割体**略微伸出**盖板外表面（−TOLERANCE），避免窝口切面与盖板顶面
 * 共面 —— 共面是 JSCAD 布尔运算产生非流形边的典型原因。
 */
export const lidScrewRecesses = (params: Params) => {
  const { length, width, lidScrewDiameter, lidScrewRecessType } = params;
  const offset = screwOffset(params, screwDiameterMax(params));

  if (lidScrewRecessType === 'counterbore') {
    const { roof, lidScrewRecessDiameter, lidScrewRecessDepth } = params;
    const effectiveDepth = Math.max(
      MIN_SCREW_RECESS_DEPTH,
      Math.min(lidScrewRecessDepth, roof - MIN_SCREW_RECESS_RESIDUAL),
    );
    const height = effectiveDepth + TOLERANCE;
    const zCenter = (effectiveDepth - TOLERANCE) / 2;
    const bore = cylinder({ radius: lidScrewRecessDiameter / 2, height });

    return union(
      translate([offset, offset, zCenter], bore),
      translate([width - offset, offset, zCenter], bore),
      translate([offset, length - offset, zCenter], bore),
      translate([width - offset, length - offset, zCenter], bore),
    );
  }

  if (lidScrewRecessType === 'countersunk') {
    const { lidScrewRecessDiameter } = params;
    // 45° 锥：半径差与深度相等。窝口不大于孔径时退化为最小可打印深度，避免零厚度
    const coneDepth = Math.max(
      MIN_SCREW_RECESS_DEPTH,
      (lidScrewRecessDiameter - lidScrewDiameter) / 2,
    );
    const height = coneDepth + TOLERANCE;
    const zCenter = (coneDepth - TOLERANCE) / 2;
    const cone = cylinderElliptic({
      startRadius: [lidScrewRecessDiameter / 2 + TOLERANCE, lidScrewRecessDiameter / 2 + TOLERANCE],
      endRadius: [lidScrewDiameter / 2, lidScrewDiameter / 2],
      height,
      segments: 32,
    });

    return union(
      translate([offset, offset, zCenter], cone),
      translate([width - offset, offset, zCenter], cone),
      translate([offset, length - offset, zCenter], cone),
      translate([width - offset, length - offset, zCenter], cone),
    );
  }

  return null;
};
