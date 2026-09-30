import { subtract, union } from '@jscad/modeling/src/operations/booleans';
import { rotateX, rotateZ, translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid, cylinder } from '@jscad/modeling/src/primitives';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';

import { Params } from '../params';

// 螺丝孔两侧的让位量（单边）与卡爪凸筋宽度
const SCREWCLEARANCE = 2;
const RIDGEWIDTH = 2;

// 标准 35mm DIN 导轨（TH35 / IEC 60715）尺寸
const DIN_RAIL_WIDTH = 35.0; // 导轨总宽
const DIN_RAIL_DEPTH = 7.5; // 导轨厚度（卡入深度）

/** 挂夹总高与顶板厚度 */
const MOUNT_TOTAL_HEIGHT = 16;
const TOP_PLATE_THICKNESS = 4;

/**
 * 计算挂夹上螺丝孔的间距与位置，使其与外壳的壁挂挂耳对齐
 * （孔位沿用壁挂挂耳的那套几何，装上去才对得上）。
 */
export const calculateDinRailHoles = (
  params: Params,
): {
  spacing: number;
  positions: number[];
  outerWidth: number;
  totalLength: number;
} => {
  const {
    length,
    width,
    cornerRadius,
    wallMountScrewDiameter,
    wallMountCount,
    dinRailOrientation,
  } = params;

  const outerWidth = wallMountScrewDiameter + SCREWCLEARANCE * 2 + RIDGEWIDTH * 2;
  const cornerSpacing = cornerRadius + outerWidth / 2;

  if (dinRailOrientation === 'vertical') {
    // 导轨竖着走，挂夹横跨外壳宽度
    const spacing = width + 2 * RIDGEWIDTH + outerWidth;
    const totalLength = Math.max(50, spacing + outerWidth * 2);
    return {
      spacing,
      positions: [-spacing / 2, spacing / 2],
      outerWidth,
      totalLength,
    };
  }

  // 导轨横着走（默认）：挂夹沿外壳长度方向排布
  if (wallMountCount === 2) {
    const totalLength = Math.max(50, 40 + outerWidth * 2);
    return {
      spacing: 0,
      positions: [0],
      outerWidth,
      totalLength,
    };
  }

  // 4 个挂耳：外侧两孔间距 = 长度 − 两端各让出一个拐角间距
  const spacing = Math.max(0, length - cornerSpacing * 2);
  const totalLength = Math.max(50, spacing + outerWidth * 2);
  return {
    spacing,
    positions: [-spacing / 2, 0, spacing / 2],
    outerWidth,
    totalLength,
  };
};

/**
 * 单个 DIN 导轨挂夹（35mm TH35）。结构：
 * - 一侧是固定卡勾，另一侧是带导入斜面的悬臂弹性卡扣
 * - 底部有一字螺丝刀撬开的释放槽
 * - 顶板螺丝孔与外壳壁挂挂耳对齐
 * - 两端挖空减料（桁架式镂空）
 */
export const dinRailMount = (params: Params): Geom3 => {
  const { dinRailMountWidth, dinRailScrewDiameter, wallMountScrewDiameter } = params;

  const screwDiameter = dinRailScrewDiameter || wallMountScrewDiameter || 3.98;
  const { positions, totalLength } = calculateDinRailHoles(params);

  const mountWidth = Math.max(10, dinRailMountWidth);
  const clipLength = Math.max(totalLength, 52);
  const totalHeight = MOUNT_TOTAL_HEIGHT;
  const topPlateThickness = TOP_PLATE_THICKNESS;
  const railChannelDepth = DIN_RAIL_DEPTH + 0.3; // 7.8mm 卡槽深度

  // 1. 挂夹本体
  const bodyBlock = cuboid({
    size: [mountWidth, clipLength, totalHeight],
    center: [0, 0, totalHeight / 2],
  });

  const cuts: Geom3[] = [];

  // 2. 35mm 导轨中央卡槽
  const halfRail = DIN_RAIL_WIDTH / 2 + 0.2;
  cuts.push(
    cuboid({
      size: [mountWidth + 4, halfRail * 2, railChannelDepth],
      center: [0, 0, railChannelDepth / 2],
    }),
  );

  // 3. 悬臂卡扣的让位缝：卡扣臂外侧留一条竖缝，卡入时它能向外让开
  const flexSlotThickness = 1.8;
  const flexSlotHeight = totalHeight - topPlateThickness + 1;
  cuts.push(
    cuboid({
      size: [mountWidth + 4, flexSlotThickness, flexSlotHeight],
      center: [0, halfRail + 3.2, flexSlotHeight / 2],
    }),
  );

  // 4. 卡扣底部的螺丝刀释放槽
  cuts.push(
    cuboid({
      size: [mountWidth - 4, 3, 4],
      center: [0, halfRail + 4.5, 2],
    }),
  );

  // 5. 卡扣的导入斜面（45° 切口，往导轨上按的时候顺滑卡入）
  cuts.push(
    translate([0, halfRail, 0], rotateX(Math.PI / 4, cuboid({ size: [mountWidth + 4, 3, 3] }))),
  );

  // 6. 卡槽两端之外的减料镂空
  const outerSpan = (clipLength - DIN_RAIL_WIDTH) / 2;
  if (outerSpan > 12) {
    const pocketLength = outerSpan - 8;
    const pocketHeight = totalHeight - topPlateThickness - 2;

    cuts.push(
      cuboid({
        size: [mountWidth - 4, pocketLength, pocketHeight],
        center: [0, -halfRail - 4 - pocketLength / 2, pocketHeight / 2 + 1],
      }),
    );

    cuts.push(
      cuboid({
        size: [mountWidth - 4, pocketLength, pocketHeight],
        center: [0, halfRail + 6 + pocketLength / 2, pocketHeight / 2 + 1],
      }),
    );
  }

  // 7. 顶板的固定螺丝孔 + 底部螺母/螺帽沉孔
  for (const y of positions) {
    cuts.push(
      cylinder({
        height: totalHeight + 4,
        radius: screwDiameter / 2,
        center: [0, y, totalHeight / 2],
        segments: 32,
      }),
    );

    const nutRadius = (screwDiameter * 1.8) / 2;
    cuts.push(
      cylinder({
        height: totalHeight - topPlateThickness,
        radius: nutRadius,
        center: [0, y, (totalHeight - topPlateThickness) / 2],
        segments: 6,
      }),
    );
  }

  // 8. 固定侧的卡勾（伸进导轨翻边下面）
  const hookTooth = cuboid({
    size: [mountWidth, 2.4, 2.0],
    center: [0, -halfRail + 1.2, railChannelDepth - 1.0],
  });

  // 9. 弹性侧的卡扣齿
  const latchTooth = cuboid({
    size: [mountWidth, 1.8, 1.8],
    center: [0, halfRail - 0.9, railChannelDepth - 0.9],
  });

  const mainSolid = union(bodyBlock, hookTooth, latchTooth);
  return subtract(mainSolid, cuts);
};

/** 打印用的一对挂夹（并排摆放） */
export const dinRailMountsPair = (params: Params): Geom3 => {
  const { dinRailMountWidth, dinRailOrientation } = params;
  const mountWidth = Math.max(10, dinRailMountWidth);
  const PAIR_GAP = 8;

  if (dinRailOrientation === 'vertical') {
    const singleMount = rotateZ(Math.PI / 2, dinRailMount(params));
    const yOffset = (mountWidth + PAIR_GAP) / 2;
    return union(translate([0, yOffset, 0], singleMount), translate([0, -yOffset, 0], singleMount));
  }

  const singleMount = dinRailMount(params);
  const xOffset = (mountWidth + PAIR_GAP) / 2;
  return union(translate([-xOffset, 0, 0], singleMount), translate([xOffset, 0, 0], singleMount));
};

/** 单个挂夹（STL 导出用） */
export const dinRailMountGeometry = (params: Params): Geom3 => dinRailMount(params);
