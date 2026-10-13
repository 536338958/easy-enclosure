import { subtract } from '@jscad/modeling/src/operations/booleans';
import { extrudeLinear } from '@jscad/modeling/src/operations/extrusions';
import { hull } from '@jscad/modeling/src/operations/hulls';
import { rotateZ, translate } from '@jscad/modeling/src/operations/transforms';
import { circle, rectangle } from '@jscad/modeling/src/primitives';
import { degToRad } from '@jscad/modeling/src/utils';

export const innerWallInset = (params: {
  wall: number;
  waterProof: boolean;
  insertThickness: number;
  insertClearance: number;
}): number => {
  const { wall, waterProof, insertThickness, insertClearance } = params;
  return waterProof ? wall * 2 + insertClearance * 2 + insertThickness : wall;
};

/**
 * 内腔地板所在高度 z —— 腔内所有立式结构（内隔板、PCB 支柱…）的共同落座基准。
 *
 * 与 base() 的两种挖腔方式一一对应，必须与它保持同源：
 * - 启用盖板螺丝：base 用 clover(...) 平移到 z = floor 挖腔 → 地板在 floor
 * - 关闭盖板螺丝：base 走 hollowRoundCube，内腔平移到 [_wall, _wall, _wall]
 *   → 地板在 innerWallInset（防水时还要含嵌入边与间隙）
 *
 * 放在 utils 而非 pcbpreview，是因为 internalwalls 要用它、而 pcbpreview 反过来
 * import 了 internalwalls —— 留在 pcbpreview 会形成循环依赖。
 */
export const cavityFloorZ = (params: {
  wall: number;
  waterProof: boolean;
  insertThickness: number;
  insertClearance: number;
  lidScrews: boolean;
  floor: number;
}): number => (params.lidScrews ? params.floor : innerWallInset(params));

/**
 * 半径为 0 时 hull of zero-radius circles 会得到退化/空几何，直接退成矩形。
 * 上游原版内缩时圆角半径恒不衰减，正常走不到这里；保留作兜底（cornerRadius 取极小值时）。
 */
export const roundedCube2d = (l: number, w: number, r = 8, s = 48) => {
  if (r <= 0) {
    // 注意 center：hull 版占据 [0,l]×[0,w]，rectangle 默认以原点为中心，必须对齐
    return rectangle({ size: [l, w], center: [l / 2, w / 2] });
  }
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

export const roundedCube = (l: number, w: number, h: number, r = 8, s = 48) => {
  return extrudeLinear({ height: h }, roundedCube2d(l, w, r, s));
};

/**
 * ⚠️ 这里是「同族缩放」，不是真等距（Minkowski）偏移 —— 与内腔/嵌入边的装配关系
 * 直接相关，改动前先看 hollowRoundCube 的注释。
 */
export const roundedFrame2d = (l: number, w: number, t: number, r = 8, s = 48) => {
  const outer = roundedCube2d(l, w, r, s);
  const inner = roundedCube2d(l - t * 2, w - t * 2, r, s);
  return subtract(outer, translate([t, t], inner));
};

export const roundedFrame = (l: number, w: number, h: number, t: number, r = 8, s = 48) => {
  return extrudeLinear({ height: h }, roundedFrame2d(l, w, t, r, s));
};

/**
 * 挖腔：**同族缩放**，不是真等距偏移。
 *
 * 内腔 = 外轮廓长宽各减 2t、圆角半径**保持不变**，再平移 [t, t, t]。
 * 于是：直边处壁厚 = t；圆角处内外两个圆弧半径同为 r、圆心相距 (t, t)，
 * 沿 45° 方向量壁厚 = t·√2（角上更厚，不是更薄）。
 *
 * 这个「半径不衰减」不是偷懒，是装配关系的根基 —— 盖板嵌入边是同一个族的
 * 「长宽减 2·(wall + insertClearance)、半径同样不变」的副本，于是：
 *
 *   直边间隙 = insertClearance，角部间隙 = insertClearance·√2
 *
 * 间隙恒为正、圆角恒不消失，**与壁厚取值无关**。若改成真等距（内外同心、
 * 半径 r - t），壁厚 ≥ cornerRadius 时内腔圆角会被吃成 0、四角塌成尖角，
 * 而嵌入边若不同步退化就装不进去，同步退化则嵌入边也变成直角 —— 两头都不对。
 *
 * 代价只是圆角处壁厚比直边厚 41%，对 3D 打印完全无害。
 */
export const hollowRoundCube = (l: number, w: number, h: number, t: number, r = 8, s = 48) => {
  const outer = roundedCube(l, w, h, r, s);
  const inner = roundedCube(l - t * 2, w - t * 2, h, r, s);
  return subtract(outer, translate([t, t, t], inner));
};

const roundedCorner2d = (r: number, s = 48) => {
  return subtract(
    rectangle({ size: [r * 2, r * 2] }),
    translate([r, r], roundedCube2d(r, r, r, s)),
    translate([r * 2, 0], rectangle({ size: [r * 2, r * 2] })),
  );
};

export const clover2d = (l: number, w: number, r = 8, s = 48) => {
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

export const clover = (l: number, w: number, h: number, r = 8, s = 48) => {
  return extrudeLinear({ height: h }, clover2d(l, w, r, s));
};

export const cloverFrame2d = (l: number, w: number, t: number, r = 8, s = 48) => {
  const outer = clover2d(l, w, r, s);
  // 注意：这里不能像 roundedFrame2d 那样用 expand 真等距偏移——clover2d 的四角是
  // 内凹圆弧（凹轮廓），expand 负 delta 会产生未闭合/自交轮廓，导致 extrudeLinear
  // 抛「geometry is not closed」。因此暂时沿用「缩小长宽 + 平移」。
  // TODO: 凹弧处壁厚仍会不均匀（凹弧内缩时半径未相应增大），lidScrews=true 且大倒角
  // 时顶环在凹弧 S 弯处可能收窄出残鳍，需专门用 true offset（凹弧半径 r+t）修复。
  const inner = clover2d(l - t * 2, w - t * 2, r, s);
  return subtract(outer, translate([t, t], inner));
};

export const cloverFrame = (l: number, w: number, h: number, t: number, r = 8, s = 48) => {
  return extrudeLinear({ height: h }, cloverFrame2d(l, w, t, r, s));
};

export {
  bottomChamferTool,
  chamferSolidBottom,
  cloverOutline,
  lidTopChamferSize,
  roundedOutline,
  topChamferTool,
  type OutlineBuilder,
} from './chamfer';
