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

export const roundedCube2d = (l: number, w: number, r = 8, s = 48) => {
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

export const roundedFrame2d = (l: number, w: number, t: number, r = 8, s = 48) => {
  const outer = roundedCube2d(l, w, r, s);
  const inner = roundedCube2d(l - t * 2, w - t * 2, r, s);
  return subtract(outer, translate([t, t], inner));
};

export const roundedFrame = (l: number, w: number, h: number, t: number, r = 8, s = 48) => {
  return extrudeLinear({ height: h }, roundedFrame2d(l, w, t, r, s));
};

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
