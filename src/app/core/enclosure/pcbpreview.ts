import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { intersect, union } from '@jscad/modeling/src/operations/booleans';
import { translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid } from '@jscad/modeling/src/primitives';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';

import { Params } from '../params';
import { base } from './base';
import { internalWalls } from './internalwalls';

// 计算基座内腔地板的 Z 高度（PCB 支柱的底部就落在这个平面上）
const cavityFloorZ = (params: Params): number => {
  const { wall, floor, waterProof, insertThickness, insertClearance, lidScrews } = params;
  const innerWall = waterProof ? wall * 2 + insertClearance * 2 + insertThickness : wall;
  return lidScrews ? floor : innerWall;
};

// PCB 底面所在的 Z 高度：自动落在底面支柱顶部；若没有底面支柱，则落在内腔地板上
export const pcbRestZ = (params: Params): number => {
  const floorZ = cavityFloorZ(params);
  const bottomMounts = params.pcbMounts.filter((m) => (m.surface ?? 'bottom') === 'bottom');
  if (bottomMounts.length === 0) {
    return floorZ;
  }
  const maxHeight = bottomMounts.reduce((acc, m) => Math.max(acc, m.height), 0);
  return floorZ + maxHeight;
};

// PCB 板中心在基座本地坐标系下的位置（与支柱/内隔板一致：以基座中心为原点）
const pcbCenterXY = (params: Params): [number, number] => {
  const { width, length, pcbPreview } = params;
  // 偏移约定：pcbPreview.x = 左右偏移（+ 向 +X=左面），pcbPreview.y = 前后偏移（+ 向 +Y=前面）
  return [width / 2 + pcbPreview.x, length / 2 + pcbPreview.y];
};

// PCB 板实体（本地坐标，未整体平移）
export const pcbBoard = (params: Params): Geom3 => {
  const { pcbPreview } = params;
  const [cx, cy] = pcbCenterXY(params);
  const restZ = pcbRestZ(params);
  return translate(
    [cx, cy, restZ + pcbPreview.thickness / 2],
    cuboid({ size: [pcbPreview.width, pcbPreview.length, pcbPreview.thickness] }),
  );
};

// 元件净空区（板上方的元件高度盒子），仅用于碰撞与可视化
export const pcbComponentZone = (params: Params): Geom3 | null => {
  const { pcbPreview } = params;
  if (pcbPreview.componentHeight <= 0) {
    return null;
  }
  const [cx, cy] = pcbCenterXY(params);
  const restZ = pcbRestZ(params);
  return translate(
    [cx, cy, restZ + pcbPreview.thickness + pcbPreview.componentHeight / 2],
    cuboid({ size: [pcbPreview.width, pcbPreview.length, pcbPreview.componentHeight] }),
  );
};

export type PCBCollisionResult = {
  collides: boolean;
  hitsWalls: boolean;
  hitsCeiling: boolean;
};

// 稍微收缩板体，避免“正好贴合”被误判为碰撞
const shrink = (params: Params): number => 0.3;

const erodedOccupied = (params: Params): Geom3 => {
  const { pcbPreview } = params;
  const [cx, cy] = pcbCenterXY(params);
  const restZ = pcbRestZ(params);
  const s = shrink(params);

  const w = Math.max(pcbPreview.width - s * 2, 0.1);
  const l = Math.max(pcbPreview.length - s * 2, 0.1);
  const parts: Geom3[] = [];

  const boardT = Math.max(pcbPreview.thickness - s * 2, 0.1);
  parts.push(
    translate(
      [cx, cy, restZ + pcbPreview.thickness / 2],
      cuboid({ size: [w, l, boardT] }),
    ),
  );

  if (pcbPreview.componentHeight > s * 2) {
    const zoneH = pcbPreview.componentHeight - s * 2;
    parts.push(
      translate(
        [cx, cy, restZ + pcbPreview.thickness + pcbPreview.componentHeight / 2],
        cuboid({ size: [w, l, zoneH] }),
      ),
    );
  }

  return parts.length === 1 ? parts[0] : union(parts);
};

// 碰撞检测：
// - 与基座壁/内隔板的碰撞用布尔求交后测体积判断
// - 与盖板顶棚的碰撞用解析法（板顶 + 元件高度是否超过总高度）
export const pcbCollision = (params: Params): PCBCollisionResult => {
  if (!params.pcbPreview.enabled) {
    return { collides: false, hitsWalls: false, hitsCeiling: false };
  }

  const occupied = erodedOccupied(params);

  const obstacles: Geom3[] = [base(params)];
  if (params.internalWalls.length > 0) {
    obstacles.push(internalWalls(params));
  }

  let hitsWalls = false;
  try {
    const overlap = intersect(occupied, union(obstacles));
    hitsWalls = measureVolume(overlap) > 1;
  } catch {
    hitsWalls = false;
  }

  // 顶棚：盖板装上后中央区域的天花板在 z = height 处
  const restZ = pcbRestZ(params);
  const topZ = restZ + params.pcbPreview.thickness + params.pcbPreview.componentHeight;
  const hitsCeiling = topZ > params.height + 1e-6;

  return { collides: hitsWalls || hitsCeiling, hitsWalls, hitsCeiling };
};
