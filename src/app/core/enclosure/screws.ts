import { union } from '@jscad/modeling/src/operations/booleans';

import { cylinder, cylinderElliptic } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';

export const screws = (
  length: number,
  width: number,
  height: number,
  offset: number,
  diameter: number,
) => {
  return union(
    translate([offset, offset, height / 2], cylinder({ radius: diameter / 2, height: height })),
    translate(
      [width - offset, offset, height / 2],
      cylinder({ radius: diameter / 2, height: height }),
    ),
    translate(
      [offset, length - offset, height / 2],
      cylinder({ radius: diameter / 2, height: height }),
    ),
    translate(
      [width - offset, length - offset, height / 2],
      cylinder({ radius: diameter / 2, height: height }),
    ),
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
