import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { union } from '@jscad/modeling/src/operations/booleans';
import { rotateX, rotateY, scale, translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid, cylinder } from '@jscad/modeling/src/primitives';
import { degToRad } from '@jscad/modeling/src/utils';

import { Params } from '../params';

// 卡扣沿插入深度方向的相对位置（0=贴近盖顶，1=插入边尖端）
const ENGAGE_RATIO = 0.6;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

type WallId = 'front' | 'back' | 'left' | 'right';

// 每面的一组卡扣布置：所在墙、沿墙方向('x'=沿宽/沿墙长, 'y')、以及沿墙的中心坐标数组
type Placement = { wall: WallId; along: 'x' | 'y'; positions: number[] };

// 圆润凸起（卡珠）。along 决定卡珠轴向：
//  'x' → 轴沿 X、外凸沿 ±Y（用于前/后墙）
//  'y' → 轴沿 Y、外凸沿 ±X（用于左/右墙）
const bead = (depth: number, height: number, barWidth: number, along: 'x' | 'y'): Geom3 => {
  const cyl = cylinder({ radius: depth, height: barWidth, segments: 24 });
  const base = along === 'x' ? rotateY(degToRad(90), cyl) : rotateX(degToRad(90), cyl);
  const kz = height / (2 * depth);
  return scale([1, 1, kz], base);
};

// 计算所有卡扣布置。预设 4/6/8 决定数量与所在边，endPercent 决定离两端距离。
const computePlacements = (params: Params): Placement[] => {
  const { snapFit, width: W, length: L, wall, insertClearance, cornerRadius } = params;
  const preset = snapFit.preset;
  const p = snapFit.endPercent / 100;
  const a = wall + insertClearance;
  const margin = a + cornerRadius + snapFit.width / 2 + 1;

  type WallDef = { wall: WallId; along: 'x' | 'y'; D: number };
  // 较长边 vs 较短边：墙的「长度」= 该墙所跨的尺寸
  let longWalls: WallDef[];
  let shortWalls: WallDef[];
  if (W >= L) {
    // 前/后墙跨 X(宽)=较长；左/右墙跨 Y(长)=较短
    longWalls = [
      { wall: 'front', along: 'x', D: W },
      { wall: 'back', along: 'x', D: W },
    ];
    shortWalls = [
      { wall: 'left', along: 'y', D: L },
      { wall: 'right', along: 'y', D: L },
    ];
  } else {
    longWalls = [
      { wall: 'left', along: 'y', D: L },
      { wall: 'right', along: 'y', D: L },
    ];
    shortWalls = [
      { wall: 'front', along: 'x', D: W },
      { wall: 'back', along: 'x', D: W },
    ];
  }

  const result: Placement[] = [];
  const add = (w: WallDef, mode: 'ends' | 'middle') => {
    const u0 = margin;
    const u1 = w.D - margin;
    const mid = (u0 + u1) / 2;
    let positions: number[];
    if (mode === 'middle' || u1 <= u0) {
      positions = [mid];
    } else {
      const lo = clamp(p * w.D, u0, u1);
      const hi = clamp(w.D - p * w.D, u0, u1);
      positions = [lo, hi];
    }
    result.push({ wall: w.wall, along: w.along, positions });
  };

  longWalls.forEach((w) => add(w, 'ends'));
  if (preset === 6) {
    shortWalls.forEach((w) => add(w, 'middle'));
  } else if (preset === 8) {
    shortWalls.forEach((w) => add(w, 'ends'));
  }
  return result;
};

// 盖板插入边上的卡扣凸起
export const lidSnapBumps = (params: Params): Geom3 | null => {
  const { snapFit, length, width, wall, roof, insertHeight, insertClearance } = params;
  if (!snapFit.enabled) {
    return null;
  }
  const a = wall + insertClearance;
  const z = roof + insertHeight * ENGAGE_RATIO;
  const placements = computePlacements(params);

  const parts: Geom3[] = [];
  placements.forEach(({ wall: w, along, positions }) => {
    positions.forEach((pos) => {
      const b = bead(snapFit.depth, snapFit.height, snapFit.width, along);
      let center: [number, number, number];
      if (w === 'front') center = [pos, length - a, z];
      else if (w === 'back') center = [pos, a, z];
      else if (w === 'left') center = [width - a, pos, z];
      else center = [a, pos, z]; // right
      parts.push(translate(center, b));
    });
  });

  return parts.length > 0 ? union(parts) : null;
};

// 基座内壁上与卡扣凸起对应的凹槽
export const baseSnapPockets = (params: Params): Geom3 | null => {
  const {
    snapFit,
    length,
    width,
    height,
    wall,
    waterProof,
    insertThickness,
    insertClearance,
    insertHeight,
  } = params;
  if (!snapFit.enabled) {
    return null;
  }

  const innerWall = waterProof ? wall * 2 + insertClearance * 2 + insertThickness : wall;
  const z = height - insertHeight * ENGAGE_RATIO;

  const clr = snapFit.clearance;
  const sAlong = snapFit.width + clr * 2; // 沿墙方向尺寸
  const sz = snapFit.height + clr * 2; // 竖直尺寸
  const groove = snapFit.depth + clr; // 凹槽切入墙体的深度
  const sThru = groove + 0.5; // 穿墙方向尺寸（额外 0.5mm 咬入内腔）

  const placements = computePlacements(params);
  const parts: Geom3[] = [];
  placements.forEach(({ wall: w, positions }) => {
    positions.forEach((pos) => {
      let center: [number, number, number];
      let size: [number, number, number];
      if (w === 'front') {
        center = [pos, length - innerWall + groove / 2, z];
        size = [sAlong, sThru, sz];
      } else if (w === 'back') {
        center = [pos, innerWall - groove / 2, z];
        size = [sAlong, sThru, sz];
      } else if (w === 'left') {
        center = [width - innerWall + groove / 2, pos, z];
        size = [sThru, sAlong, sz];
      } else {
        // right
        center = [innerWall - groove / 2, pos, z];
        size = [sThru, sAlong, sz];
      }
      parts.push(translate(center, cuboid({ size })));
    });
  });

  return parts.length > 0 ? union(parts) : null;
};
