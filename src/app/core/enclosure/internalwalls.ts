import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { union } from '@jscad/modeling/src/operations/booleans';
import { rotateZ, translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid } from '@jscad/modeling/src/primitives';

import { InternalWall, Params } from '../params';
import { cavityFloorZ } from './dimensions';

export const internalWall = (wallParams: InternalWall) => {
  const wall = cuboid({
    size: [wallParams.thickness, wallParams.length, wallParams.height],
  });

  return rotateZ((wallParams.rotation * Math.PI) / 180, wall);
};

export const internalWalls = (params: Params) => {
  const { internalWalls, width, length } = params;
  // 与 PCB 支柱、PCB 预览共用同一个内腔地板基准
  const floorZ = cavityFloorZ(params);

  const walls: Geom3[] = [];

  internalWalls.forEach((wall) => {
    const z = floorZ + wall.height / 2;
    // 偏移约定：wall.x = 左右偏移（+ 向 +X=左面），wall.y = 前后偏移（+ 向 +Y=前面）
    walls.push(translate([width / 2 + wall.x, length / 2 + wall.y, z], internalWall(wall)));
  });

  return union(walls);
};
