import { rotate, translate } from '@jscad/modeling/src/operations/transforms';
import { degToRad } from '@jscad/modeling/src/utils';
import { cuboid, cylinder } from '@jscad/modeling/src/primitives';
import { union } from '@jscad/modeling/src/operations/booleans';

import { Params } from '../params';
import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { Vec3 } from '@jscad/modeling/src/maths/types';
import { Surface, SURFACES } from '.';

const TOP_HOLE_DEPTH_TOLERANCE = 0.2;

/**
 * 侧面 / 底面开孔的贯穿余量（mm），孔深在此之上两端各多切这么多。
 *
 * 防水开启时壁厚正好等于 `totalWallThickness`，若孔深也取同一个值，孔的上下端面
 * 会与壁的内外表面**严格齐平**——这是布尔运算的退化情形，端面共面时外表面有可能
 * 保留下来（表现为「孔没打穿」，只剩一层膜）。防水关闭时壁厚只有 wall、
 * 孔深远大于它，是超挖，所以反而看不出问题。
 *
 * 往两端各多切一点：外侧切到空气里、内侧切进腔内，都不影响成品，但能保证孔
 * 在任何参数组合下都真正贯穿。顶面同理，见 TOP_HOLE_DEPTH_TOLERANCE。
 */
const SIDE_HOLE_DEPTH_TOLERANCE = 0.2;

export const holes = (
  params: Params,
  surfacesFilter: Surface[] = ['bottom', 'left', 'right', 'back', 'front'],
) => {
  const {
    length,
    width,
    height,
    roof,
    wall,
    insertHeight,
    insertThickness,
    insertClearance,
    holes: holeParams,
  } = params;

  let result: Geom3[] = [];
  SURFACES.forEach((surface) => {
    const surfaceHoles = holeParams.filter((spec) => {
      if (surfacesFilter.includes(surface) && spec.surface === surface) {
        return spec;
      } else {
        return false;
      }
    });

    surfaceHoles.forEach((hole, i) => {
      let x: number;
      let y: number;
      let z: number;
      let rot: Vec3;

      const totalWallThickness = insertThickness + insertClearance * 2 + wall * 2;
      // 两端各留一点余量，避免防水开启时孔端面与壁面齐平而打不穿
      let holeDepth = totalWallThickness + SIDE_HOLE_DEPTH_TOLERANCE * 2;

      if (surface === 'front') {
        y = length - totalWallThickness / 2;
        x = width / 2 - hole.y;
        z = height / 2 + hole.x;
        rot = [degToRad(90), 0, 0];
      } else if (surface === 'right') {
        x = totalWallThickness / 2;
        y = length / 2 - hole.y;
        z = height / 2 + hole.x;
        if (hole.shape === 'circle') {
          rot = [0, degToRad(90), 0];
        } else {
          rot = [degToRad(90), 0, degToRad(90)];
        }
      } else if (surface === 'back') {
        y = totalWallThickness / 2;
        x = width / 2 - hole.y;
        z = height / 2 + hole.x;
        rot = [degToRad(90), 0, 0];
      } else if (surface === 'left') {
        x = width - totalWallThickness / 2;
        y = length / 2 - hole.y;
        z = height / 2 + hole.x;
        if (hole.shape === 'circle') {
          rot = [0, degToRad(90), 0];
        } else {
          rot = [degToRad(90), 0, degToRad(90)];
        }
      } else if (surface === 'bottom' || surface === 'top') {
        y = length / 2 - hole.x;
        x = width / 2 - hole.y;
        z = 0;
        if (surface === 'top') {
          holeDepth = roof + insertHeight + TOP_HOLE_DEPTH_TOLERANCE;
          z = holeDepth / 2;
        }
        rot = [0, 0, 0];
      } else {
        throw new Error(`Invalid surface: ${surface}`);
      }

      if (hole.shape === 'square') {
        result.push(
          translate(
            [x, y, z],
            rotate(
              rot,
              cuboid({
                size: [hole.width, hole.width, holeDepth],
              }),
            ),
          ),
        );
      } else if (hole.shape === 'rectangle') {
        result.push(
          translate(
            [x, y, z],
            rotate(
              rot,
              cuboid({
                size: [hole.width, hole.length, holeDepth],
              }),
            ),
          ),
        );
      } else if (hole.shape === 'circle') {
        result.push(
          translate(
            [x, y, z],
            rotate(
              rot,
              cylinder({
                radius: hole.diameter / 2,
                height: holeDepth,
              }),
            ),
          ),
        );
      }
    });
  });

  return union(result);
};
