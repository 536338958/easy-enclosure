import { subtract } from '@jscad/modeling/src/operations/booleans';
import { hull } from '@jscad/modeling/src/operations/hulls';
import { rotateZ, translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid, cylinder } from '@jscad/modeling/src/primitives';
import { degToRad } from '@jscad/modeling/src/utils';
import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';

export const roundedCube = (l: number, w: number, h: number, r = 8, s = 100) => {
  const c = cylinder({
    height: h,
    radius: r,
    segments: s,
    center: [0, 0, h / 2],
  });

  return hull(
    translate([r, r, 0], c),
    translate([l - r, r, 0], c),
    translate([r, w - r, 0], c),
    translate([l - r, w - r, 0], c),
  );
};

export const roundedFrame = (l: number, w: number, h: number, t: number, r = 8, s = 100) => {
  const outer = roundedCube(l, w, h, r, s);
  const inner = roundedCube(l - t * 2, w - t * 2, h, r, s);
  return subtract(outer, translate([t, t, 0], inner));
};

export const hollowRoundCube = (l: number, w: number, h: number, t: number, r = 8, s = 100) => {
  const outer = roundedCube(l, w, h, r, s);
  const inner = roundedCube(l - t * 2, w - t * 2, h, r, s);
  return subtract(outer, translate([t, t, t], inner));
};

const roundedCorner = (r: number, h: number, s = 100) => {
  return subtract(
    cuboid({ size: [r * 2, r * 2, h] }),
    translate([r, r, 0], roundedCube(r, r, h, r, s)),
    translate([r * 2, 0, 0], cuboid({ size: [r * 2, r * 2, h] })),
  );
};

export const clover = (l: number, w: number, h: number, r = 8, s = 100) => {
  const cornersRemoved = subtract(
    roundedCube(l, w, h, r, s),
    translate([0, 0, 0], roundedCube(r, r, h, r, s)),
    translate([l - r, 0, 0], roundedCube(r, r, h, r, s)),
    translate([0, w - r, 0], roundedCube(r, r, h, r, s)),
    translate([l - r, w - r, 0], roundedCube(r, r, h, r, s)),
  );
  const rounded = subtract(
    cornersRemoved,
    translate([0, r * 2, 0], rotateZ(degToRad(0), roundedCorner(r, h * 2, s))),
    translate([r * 2, 0, 0], rotateZ(degToRad(0), roundedCorner(r, h * 2, s))),
    translate([l, r * 2, 0], rotateZ(degToRad(90), roundedCorner(r, h * 2, s))),
    translate([l - r * 2, 0, 0], rotateZ(degToRad(90), roundedCorner(r, h * 2, s))),
    translate([l, w - r * 2, 0], rotateZ(degToRad(180), roundedCorner(r, h * 2, s))),
    translate([l - r * 2, w, 0], rotateZ(degToRad(180), roundedCorner(r, h * 2, s))),
    translate([0, w - r * 2, 0], rotateZ(degToRad(270), roundedCorner(r, h * 2, s))),
    translate([r * 2, w, 0], rotateZ(degToRad(270), roundedCorner(r, h * 2, s))),
  );
  return rounded;
};

export const cloverFrame = (l: number, w: number, h: number, t: number, r = 8, s = 100) => {
  const outer = clover(l, w, h, r, s);
  const inner = clover(l - t * 2, w - t * 2, h, r, s);
  return subtract(outer, translate([t, t, 0], inner));
};

// 底边 45° 倒角切割工具（用于消除 3D 打印首层「象脚」）。
// 返回一个位于 z∈[0, c] 的外沿楔形环，从模型底部减去即可得到倒角。
// 坐标系与 roundedCube 一致：角点在原点，占据 [0,l]×[0,w]。
export const bottomChamferTool = (l: number, w: number, c: number, r = 8, s = 100): Geom3 => {
  const eps = 0.01;
  // 夹取倒角尺寸，避免超过圆角半径或壁厚导致几何异常
  const cc = Math.max(Math.min(c, r * 0.9, l / 2 - 0.5, w / 2 - 0.5), 0);
  if (cc <= 0) {
    // 返回一个不与模型相交的空壳（体积极小），调用方一般会先判断 c>0
    return cuboid({ size: [eps, eps, eps] });
  }
  const innerR = Math.max(r - cc, 0.1);
  const fullSlab = roundedCube(l, w, cc, r, s);
  const bottom = translate([cc, cc, 0], roundedCube(l - cc * 2, w - cc * 2, eps, innerR, s));
  const top = translate([0, 0, cc - eps], roundedCube(l, w, eps, r, s));
  const flare = hull(bottom, top);
  return subtract(fullSlab, flare);
};

// 基座内壁顶端「导入倒角」工具：在内腔开口顶部内缘切出一圈 45° 斜面，
// 使盖板/卡扣盖更容易对准、滑入。返回一个上大下小的锥台，从基座顶部减去即可。
//   l, w    = 基座外形长、宽（与 roundedCube 一致，角点在原点）
//   inset   = 内壁面到外形边缘的距离（即内腔开口的内缩量）
//   c       = 倒角尺寸（斜面在水平/竖直方向的投影长度）
//   topZ    = 内腔顶面所在 z（一般 = height）
//   r       = 外形圆角半径
export const topRimChamferTool = (
  l: number,
  w: number,
  inset: number,
  c: number,
  topZ: number,
  r = 8,
  s = 100,
): Geom3 => {
  const eps = 0.01;
  const openL = l - inset * 2;
  const openW = w - inset * 2;
  // 夹取倒角尺寸：不超过壁厚，也不超过开口半宽
  const cc = Math.max(Math.min(c, Math.max(inset - 0.2, 0), openL / 2 - 0.5, openW / 2 - 0.5), 0);
  if (cc <= 0) {
    return cuboid({ size: [eps, eps, eps] });
  }
  const rIn = Math.max(r - inset, 0.5); // 内腔圆角
  // 下沿：z = topZ - cc，尺寸 = 开口本身（斜面此处刚好贴到内壁面，不切削墙体）
  const bottom = translate([inset, inset, topZ - cc], roundedCube(openL, openW, eps, rIn, s));
  // 上沿：z = topZ，尺寸 = 开口向外扩 cc（在墙顶切出 cc 宽的斜面带）
  const top = translate(
    [inset - cc, inset - cc, topZ - eps],
    roundedCube(openL + cc * 2, openW + cc * 2, eps, rIn + cc, s),
  );
  return hull(bottom, top);
};
// 适用于外形不规则的部件（如壁挂挂耳），使其贴合打印床的底边同样获得倒角。
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
  // 以角点为原点、占据 [0,l]×[0,w]×[0,cc] 的矩形楔环（尖角，无圆角）
  const fullSlab = translate([l / 2, w / 2, cc / 2], cuboid({ size: [l, w, cc] }));
  const bottomInset = translate(
    [l / 2, w / 2, eps / 2],
    cuboid({ size: [Math.max(l - cc * 2, eps), Math.max(w - cc * 2, eps), eps] }),
  );
  const topFull = translate([l / 2, w / 2, cc - eps / 2], cuboid({ size: [l, w, eps] }));
  const tool = subtract(fullSlab, hull(bottomInset, topFull));
  return subtract(solid, translate([min[0], min[1], min[2]], tool));
};
