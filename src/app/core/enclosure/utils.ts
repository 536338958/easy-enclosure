import { subtract, intersect } from '@jscad/modeling/src/operations/booleans';
import { extrudeLinear } from '@jscad/modeling/src/operations/extrusions';
import { hull } from '@jscad/modeling/src/operations/hulls';
import { rotateZ, transform, translate } from '@jscad/modeling/src/operations/transforms';
import type Mat4 from '@jscad/modeling/src/maths/mat4/type';
import { circle, cuboid, rectangle } from '@jscad/modeling/src/primitives';
import { degToRad } from '@jscad/modeling/src/utils';
import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';

/**
 * 圆角/圆弧的默认细分段数。
 *
 * 本机圆角半径多在 3mm 量级，48 段的弦高误差 < 0.02mm（100 段约 0.005mm），
 * 两者都远低于 FDM 打印精度，肉眼与切片结果均不可分辨。
 * 但 JSCAD 的布尔运算开销随面数超线性增长，clover 一条链上就有 20+ 个圆弧，
 * 降到 48 段能省掉一半以上的重建耗时。
 */
const DEFAULT_SEGMENTS = 48;

/**
 * 所有实体轮廓一律走「2D 剖面 → 线性挤出」。
 *
 * 早先是直接用 3D 圆柱/长方体做 hull：两个圆柱的侧面在接缝处只是**贴合**而非
 * **共享顶点**，布尔运算后极易留下非流形边（切片软件会报破面/自交）。
 * 2D 剖面只有一层多边形环，挤出后侧壁天然是完整闭合的环，接缝问题从根上消失，
 * 而且挤出比 3D hull 快得多。
 */

export const roundedCube2d = (l: number, w: number, r = 8, s = DEFAULT_SEGMENTS) => {
  const c = circle({
    radius: r,
    segments: s,
  });

  return hull(
    translate([r, r], c),
    translate([l - r, r], c),
    translate([r, w - r], c),
    translate([l - r, w - r], c),
  );
};

export const roundedCube = (l: number, w: number, h: number, r = 8, s = DEFAULT_SEGMENTS) => {
  return extrudeLinear({ height: h }, roundedCube2d(l, w, r, s));
};

export const roundedFrame2d = (l: number, w: number, t: number, r = 8, s = DEFAULT_SEGMENTS) => {
  const outer = roundedCube2d(l, w, r, s);
  const inner = roundedCube2d(l - t * 2, w - t * 2, r, s);
  return subtract(outer, translate([t, t], inner));
};

export const roundedFrame = (
  l: number,
  w: number,
  h: number,
  t: number,
  r = 8,
  s = DEFAULT_SEGMENTS,
) => {
  return extrudeLinear({ height: h }, roundedFrame2d(l, w, t, r, s));
};

export const hollowRoundCube = (
  l: number,
  w: number,
  h: number,
  t: number,
  r = 8,
  s = DEFAULT_SEGMENTS,
) => {
  const outer = roundedCube(l, w, h, r, s);
  const inner = roundedCube(l - t * 2, w - t * 2, h, r, s);
  return subtract(outer, translate([t, t, t], inner));
};

/** 2D 的「圆角外补角」：边长 2r 的正方形挖掉一个半径 r 的圆角，剩下的尖角块 */
const roundedCorner2d = (r: number, s = DEFAULT_SEGMENTS) => {
  return subtract(
    rectangle({ size: [r * 2, r * 2] }),
    translate([r, r], roundedCube2d(r, r, r, s)),
    translate([r * 2, 0], rectangle({ size: [r * 2, r * 2] })),
  );
};

export const clover2d = (l: number, w: number, r = 8, s = DEFAULT_SEGMENTS) => {
  const cornersRemoved = subtract(
    roundedCube2d(l, w, r, s),
    translate([0, 0], roundedCube2d(r, r, r, s)),
    translate([l - r, 0], roundedCube2d(r, r, r, s)),
    translate([0, w - r], roundedCube2d(r, r, r, s)),
    translate([l - r, w - r], roundedCube2d(r, r, r, s)),
  );
  const rc = roundedCorner2d(r, s);
  const rounded = subtract(
    cornersRemoved,
    translate([0, r * 2], rotateZ(degToRad(0), rc)),
    translate([r * 2, 0], rotateZ(degToRad(0), rc)),
    translate([l, r * 2], rotateZ(degToRad(90), rc)),
    translate([l - r * 2, 0], rotateZ(degToRad(90), rc)),
    translate([l, w - r * 2], rotateZ(degToRad(180), rc)),
    translate([l - r * 2, w], rotateZ(degToRad(180), rc)),
    translate([0, w - r * 2], rotateZ(degToRad(270), rc)),
    translate([r * 2, w], rotateZ(degToRad(270), rc)),
  );
  return rounded;
};

export const clover = (l: number, w: number, h: number, r = 8, s = DEFAULT_SEGMENTS) => {
  return extrudeLinear({ height: h }, clover2d(l, w, r, s));
};

export const cloverFrame2d = (l: number, w: number, t: number, r = 8, s = DEFAULT_SEGMENTS) => {
  const outer = clover2d(l, w, r, s);
  const inner = clover2d(l - t * 2, w - t * 2, r, s);
  return subtract(outer, translate([t, t], inner));
};

export const cloverFrame = (
  l: number,
  w: number,
  h: number,
  t: number,
  r = 8,
  s = DEFAULT_SEGMENTS,
) => {
  return extrudeLinear({ height: h }, cloverFrame2d(l, w, t, r, s));
};

// 底边 45° 倒角切割工具（用于消除 3D 打印首层「象脚」）。
// 返回一个位于 z∈[0, c] 的外沿楔形环，从模型底部减去即可得到倒角。
// 坐标系与 roundedCube 一致：角点在原点，占据 [0,l]×[0,w]。
export const bottomChamferTool = (
  l: number,
  w: number,
  c: number,
  r = 8,
  s = DEFAULT_SEGMENTS,
): Geom3 => {
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

/**
 * 顶面 45° 倒角所用的剪切方向数。
 *
 * 8 个方向把「腐蚀圆盘」近似成八边形：倒角宽度在 0.92c~1.0c 之间波动（±4%），
 * 肉眼与切片都分辨不出；再往上加方向只是线性增加求交次数。
 */
const CHAMFER_DIRECTIONS = 8;

/**
 * 截面轮廓生成器：给定外形尺寸（l×w）与高度 h，返回局部坐标下的柱体
 * （角点在原点、占据 [0,l]×[0,w]、z∈[0,h]），也就是部件的真实外轮廓。
 *
 * 倒角工具必须按部件的真实轮廓来做 —— 用外接矩形 / 圆角矩形近似的话，
 * 两种轮廓相差几毫米的地方楔环会切在实体之外，倒角就断成了几段。
 */
export type OutlineBuilder = (l: number, w: number, h: number) => Geom3;

/** 圆角矩形轮廓 */
export const roundedOutline =
  (r: number, s = DEFAULT_SEGMENTS): OutlineBuilder =>
  (l, w, h) =>
    roundedCube(l, w, h, r, s);

/** clover 轮廓：开启盖板螺丝后嵌入边的外形（四角被螺丝柱让位缺口大幅切掉） */
export const cloverOutline =
  (r: number, s = DEFAULT_SEGMENTS): OutlineBuilder =>
  (l, w, h) =>
    clover(l, w, h, r, s);

/**
 * 随高度线性剪切的 4×4 矩阵（列主序，与 JSCAD mat4 一致）。
 *
 * 把 (x, y, z) 映射为 (x − z·ux, y − z·uy, z)：柱体底面（z = 0）不动，
 * 顶面（z = h）整体平移 (−ux·h, −uy·h)。
 */
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

/**
 * 顶面边缘 45° 倒角切割工具。
 *
 * 返回一个位于 z∈[topZ−c, topZ] 的外沿楔环：楔形朝上，
 * z = topZ 处切掉 c 宽的一圈、z = topZ−c 处不切削，
 * 于是顶面上留下向内倾斜的一圈斜面。
 *
 * 做法：把轮廓柱体沿 N 个方向「随高度剪切」再求交 —— 顶面偏移 c、底面不偏移，
 * 求交得到的正是「顶面向内收缩 c、底面不动」的放样体，从柱体里减掉它即得楔环。
 *
 * 早先用的是 `hull(底片, 顶片内缩)`，但 hull 是**凸包**，会把轮廓上的凹陷填平：
 * clover 嵌入边的角部有一个深约 2.5mm、弧长约 12mm 的内凹扇形（实测比同尺寸
 * 圆角矩形内缩 6mm），楔环在那里完全切不到实体，倒角断成四段（每角缺约 10°）。
 * 剪切求交不要求轮廓凸，因此圆角矩形、clover 乃至任意轮廓都能得到整圈连续的倒角。
 *
 * 调用方负责先按部件自身条件夹紧倒角尺寸（见 `dimensions.ts` 的 `lidTopChamferSize`）；
 * 这里只做「不得超过顶面高度 / 半宽」这类纯几何兜底。
 */
export const topChamferTool = (
  l: number,
  w: number,
  c: number,
  topZ: number,
  outline: OutlineBuilder,
): Geom3 => {
  const eps = 0.01;
  const cc = Math.max(Math.min(c, topZ * 0.9, l / 2 - 0.5, w / 2 - 0.5), 0);
  if (cc <= 0) {
    return cuboid({ size: [eps, eps, eps] });
  }
  const slabZ = topZ - cc;
  const slab = outline(l, w, cc);
  let keep: Geom3 | null = null;
  for (let i = 0; i < CHAMFER_DIRECTIONS; i += 1) {
    const angle = (i / CHAMFER_DIRECTIONS) * Math.PI * 2;
    const sheared = transform(shearMatrix(Math.cos(angle), Math.sin(angle)), slab);
    keep = keep ? intersect(keep, sheared) : sheared;
  }
  return translate([0, 0, slabZ], subtract(slab, keep as Geom3));
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
