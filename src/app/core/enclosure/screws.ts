import { union } from '@jscad/modeling/src/operations/booleans';

import { cylinder, cylinderElliptic } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';

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
 * 螺丝孔的沉头倒角：在每个孔口生成一个 45° 圆锥坑，从盖板减去即可
 * 让沉头螺丝的螺帽沉进去、不凸出表面。
 *
 * 盖板的**外表面是 z = 0**（嵌入边朝 z 增大的方向伸进基座），所以锥坑的
 * 大端开在 z = 0、小端收到孔径，坑占据 z ∈ [0, depth]。
 *
 * `spread` 是径向扩展量，`depth` 是锥坑深度；45° 时两者相等。
 */
export const screwCountersinks = (
  length: number,
  width: number,
  offset: number,
  holeDiameter: number,
  spread: number,
  depth: number,
) => {
  const inner = holeDiameter / 2;
  const outer = inner + spread;
  const cone = () =>
    cylinderElliptic({
      height: depth,
      startRadius: [outer, outer],
      endRadius: [inner, inner],
      segments: 32,
    });

  return union(
    translate([offset, offset, depth / 2], cone()),
    translate([width - offset, offset, depth / 2], cone()),
    translate([offset, length - offset, depth / 2], cone()),
    translate([width - offset, length - offset, depth / 2], cone()),
  );
};
