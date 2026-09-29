import { subtract, union } from '@jscad/modeling/src/operations/booleans';
import { hull } from '@jscad/modeling/src/operations/hulls';
import { mirrorX, rotateY, translate } from '@jscad/modeling/src/operations/transforms';
import { cube, cuboid, cylinder } from '@jscad/modeling/src/primitives';
import { degToRad } from '@jscad/modeling/src/utils';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';

import { Params } from '../params';

const SCREWCLEARANCE = 2;
const RIDGEWIDTH = 2;
const FLOOR = 2;

/**
 * 挂耳外侧切角角度（°）的取值范围。
 *
 * - 下限 45：45° 是标准倒角，再小挂耳几乎不被削减、切角失去意义（实测角度越小
 *   切掉的实体反而越多，20° 时材料最薄），因此不再开放更小的角度
 * - 上限 70：再大挂耳根部剩余截面过薄，且切面会朝螺丝孔方向推进、削弱孔壁
 *
 * 默认值 45、单位「度」，UI 与几何两侧都以此为准，超出区间的值一律夹取。
 */
export const WALL_MOUNT_CHAMFER_MIN = 45;
export const WALL_MOUNT_CHAMFER_MAX = 70;
// 与 DEFAULT_PARAMS.wallMountChamferAngle 保持一致：只作为初始 / 重置后的默认值，
// 用户可在 45–70 之间自由修改
export const WALL_MOUNT_CHAMFER_DEFAULT = 60;

/**
 * 挂耳的 2D 轮廓沿 Z 拉伸成柱体：一端矩形、一端圆，与 flange 里 outer 的 hull 一致。
 * inset > 0 得到向内收缩一圈的版本，用来构造底边倒角的楔环。
 */
const earProfile = (outerWidth: number, inset: number, h: number): Geom3 =>
  hull(
    cuboid({
      size: [Math.max(outerWidth / 2 - inset * 2, 0.1), Math.max(outerWidth - inset * 2, 0.1), h],
    }),
    translate(
      [-(outerWidth / 2), 0, 0],
      cylinder({ height: h, radius: Math.max(outerWidth / 2 - inset, 0.1) }),
    ),
  );

/**
 * 挂耳底边 45° 倒角工具。
 *
 * 挂耳是一端方、一端圆的 hull 形状，用外接矩形做楔环在圆端会切不到或切过头，
 * 底边倒角因此断裂、与主体底边接不上。这里改用挂耳自身的轮廓：外轮廓与
 * 「内缩 c 的轮廓」之间 hull 出楔环，沿整条底边连续、无遗漏。
 */
export const earBedChamferTool = (outerWidth: number, c: number): Geom3 => {
  const eps = 0.01;
  // 倒角不得吃掉整个挂耳厚度
  const cc = Math.max(Math.min(c, outerWidth / 2 - 0.5), 0);
  if (cc <= 0) {
    return cuboid({ size: [eps, eps, eps] });
  }
  const z0 = -outerWidth / 2;
  const fullSlab = translate([0, 0, z0 + cc / 2], earProfile(outerWidth, 0, cc));
  const bottom = translate([0, 0, z0 + eps / 2], earProfile(outerWidth, cc, eps));
  const top = translate([0, 0, z0 + cc - eps / 2], earProfile(outerWidth, 0, eps));
  return subtract(fullSlab, hull(bottom, top));
};

export const flange = (
  screwDiameter: number,
  chamferAngle: number = WALL_MOUNT_CHAMFER_DEFAULT,
  // 底边倒角尺寸（mm），0＝不倒角。沿用基座的 baseBedChamfer，保持整体一致
  bedChamfer = 0,
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

  const cut = subtract(
    outer,
    translate([RIDGEWIDTH, 0, FLOOR], inner),
    // 挂耳外侧切角，角度可配置。rotateY 接受弧度，必须经 degToRad 转换
    translate(
      [-outerWidth, 0, outerWidth],
      rotateY(degToRad(angle), cube({ size: outerWidth * 2 })),
    ),
    translate([-outerWidth / 2, 0, 0], cylinder({ height: outerWidth, radius: screwDiameter / 2 })),
  );

  // 底边倒角放在最后，这样它覆盖的是切角之后的真实底边
  return bedChamfer > 0 ? subtract(cut, earBedChamferTool(outerWidth, bedChamfer)) : cut;
};

export const flanges = (params: Params) => {
  const { length, width, cornerRadius, wallMountScrewDiameter, wallMountCount, baseBedChamfer } =
    params;
  const outerWidth = wallMountScrewDiameter + SCREWCLEARANCE * 2 + RIDGEWIDTH * 2;
  const cornerSpacing = cornerRadius + outerWidth / 2;
  const z = outerWidth / 2;

  const yPositions = wallMountCount === 2 ? [length / 2] : [cornerSpacing, length - cornerSpacing];

  // 单个挂耳（局部坐标，底面在 z = -outerWidth/2）。
  // 底边倒角交给 flange 内部处理，那里用的是挂耳自身轮廓，倒角才连续
  const ear = flange(wallMountScrewDiameter, params.wallMountChamferAngle, baseBedChamfer);

  const left = yPositions.map((y) => translate([-RIDGEWIDTH, y, z], ear));
  const right = yPositions.map((y) => translate([width + RIDGEWIDTH, y, z], mirrorX(ear)));

  return union(...left, ...right);
};
