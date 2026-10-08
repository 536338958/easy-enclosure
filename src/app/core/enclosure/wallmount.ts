import { subtract, union } from '@jscad/modeling/src/operations/booleans';
import { hull } from '@jscad/modeling/src/operations/hulls';
import { mirrorX, rotateY, translate } from '@jscad/modeling/src/operations/transforms';
import { cube, cuboid, cylinder } from '@jscad/modeling/src/primitives';
import { degToRad } from '@jscad/modeling/src/utils';

import { Params } from '../params';
import { chamferSolidBottom } from './chamfer';

const SCREWCLEARANCE = 2;
const RIDGEWIDTH = 2;
const FLOOR = 2;

/**
 * 挂耳外侧切角角度（°）的取值范围。
 *
 * - 下限 45：45° 是标准倒角，再小挂耳几乎不被削减、切角失去意义
 * - 上限 70：再大挂耳根部剩余截面过薄，且切面会朝螺丝孔方向推进、削弱孔壁
 *
 * 超出区间的值一律夹取，UI 与几何两侧共用这组常量。
 */
export const WALL_MOUNT_CHAMFER_MIN = 45;
export const WALL_MOUNT_CHAMFER_MAX = 70;
export const WALL_MOUNT_CHAMFER_DEFAULT = 60;

export const flange = (
  screwDiameter: number,
  chamferAngle: number = WALL_MOUNT_CHAMFER_DEFAULT,
) => {
  const angle = Math.min(Math.max(chamferAngle, WALL_MOUNT_CHAMFER_MIN), WALL_MOUNT_CHAMFER_MAX);
  const outerWidth = screwDiameter + SCREWCLEARANCE * 2 + RIDGEWIDTH * 2;
  const innerWidth = screwDiameter + SCREWCLEARANCE * 2;

  const outer = hull(
    cuboid({
      size: [outerWidth / 2, outerWidth, outerWidth],
    }),
    translate(
      [-(outerWidth / 2), 0, 0],
      cylinder({
        height: outerWidth,
        radius: outerWidth / 2,
      }),
    ),
  );

  const inner = hull(
    cuboid({
      size: [innerWidth / 2, innerWidth, innerWidth],
    }),
    translate(
      [-(innerWidth / 2) - SCREWCLEARANCE * 2, 0, 0],
      cylinder({
        height: innerWidth,
        radius: innerWidth / 2,
      }),
    ),
  );

  return subtract(
    outer,
    translate([RIDGEWIDTH, 0, FLOOR], inner),
    // 挂耳外侧切角，角度可配置。rotateY 接受弧度，必须经 degToRad 转换
    translate(
      [-outerWidth, 0, outerWidth],
      rotateY(degToRad(angle), cube({ size: outerWidth * 2 })),
    ),
    translate([-outerWidth / 2, 0, 0], cylinder({ height: outerWidth, radius: screwDiameter / 2 })),
  );
};

export const flanges = (params: Params) => {
  const { length, width, cornerRadius, wallMountScrewDiameter, wallMountCount } = params;
  const outerWidth = wallMountScrewDiameter + SCREWCLEARANCE * 2 + RIDGEWIDTH * 2;
  const cornerSpacing = cornerRadius + outerWidth / 2;
  const z = outerWidth / 2;

  const yPositions = wallMountCount === 2 ? [length / 2] : [cornerSpacing, length - cornerSpacing];

  const ear =
    params.baseBedChamfer > 0
      ? chamferSolidBottom(
          flange(wallMountScrewDiameter, params.wallMountChamferAngle),
          params.baseBedChamfer,
        )
      : flange(wallMountScrewDiameter, params.wallMountChamferAngle);

  const left = yPositions.map((y) => translate([-RIDGEWIDTH, y, z], ear));
  const right = yPositions.map((y) => translate([width + RIDGEWIDTH, y, z], mirrorX(ear)));

  return union(...left, ...right);
};
