import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { union } from '@jscad/modeling/src/operations/booleans';
import { rotateZ, translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid } from '@jscad/modeling/src/primitives';

import { InternalWall, Params } from '../params';
import { cavityFloorZ } from './utils';

export const internalWall = (wallParams: InternalWall) => {
  const wall = cuboid({
    size: [wallParams.thickness, wallParams.length, wallParams.height],
  });

  return rotateZ((wallParams.rotation * Math.PI) / 180, wall);
};

export const internalWalls = (params: Params) => {
  const { internalWalls, width, length } = params;
  // 落座基准必须是 cavityFloorZ 而不是裸 floor：关闭盖板螺丝时 base 走
  // hollowRoundCube，内腔地板在 innerWallInset 而非 floor。用裸 floor 会让隔板
  // 在非防水时悬空、防水时陷进实体地板（实测 wall=1.5/floor=3 时差 1.5 / 2.08mm），
  // 且与 PCB 支柱的落座面对不上。
  const baseFloor = cavityFloorZ(params);

  const walls: Geom3[] = [];

  internalWalls.forEach((wall) => {
    const z = baseFloor + wall.height / 2;
    walls.push(translate([width / 2 - wall.x, length / 2 - wall.y, z], internalWall(wall)));
  });

  return union(walls);
};
