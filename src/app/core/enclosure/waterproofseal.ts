import { Params } from '../params';

import { cloverFrame, roundedFrame } from './utils';
import { insertRimRadius, screwPostProtrusion } from './screws';

import { translate } from '@jscad/modeling/src/operations/transforms';

export const getSealReliefRadius = (params: Params): number => {
  const { wall, insertThickness, insertClearance } = params;
  // 让位半径必须与螺丝柱的凸出量同源 —— 密封圈槽在四角绕的就是同一根柱子。
  // 早先这里用的是螺丝孔位 getScrewOffset()：贯穿模式下 3.24 与柱子 3.00 只差
  // 0.24 看不出问题，但螺母模式下它算出 5.04、柱子只有 3.89，槽在四角绕行过头，
  // 直接把槽切断（表现为「防水槽被打穿」）。
  const screwPost = screwPostProtrusion(params);
  // Ensure the seal channel corner cutout does not cut through into the inner cavity.
  // The cavity begins at `_wall = wall * 2 + insertClearance * 2 + insertThickness`.
  // To ensure the cutout (which starts at `wall`) never breaches the cavity wall,
  // the relief radius is clamped to never exceed `_wall - wall`.
  const maxAllowedRelief = insertThickness + insertClearance * 2 + wall;
  return Math.min(screwPost, maxAllowedRelief);
};

export const waterProofSealCutout = (params: Params) => {
  const {
    length,
    width,
    height,
    wall,
    insertThickness,
    insertHeight,
    sealThickness,
    insertClearance,
  } = params;

  // ⚠️ 对上游的**有意偏离**：上游的槽恒为 clover（四角让位给螺丝柱，角上留实体）。
  // 但关闭盖板螺丝时嵌入边是圆角矩形、四角是有料的 —— 角上那块实体会跟嵌入边的
  // 角撞上（实测干涉体积 370mm³，与壁厚无关）。所以槽必须与嵌入边同族：
  // 开螺丝 → clover，关螺丝 → 圆角矩形。
  // 半径走 insertRimRadius：clover 取螺丝柱凸出量，圆角矩形取 cornerRadius，
  // 与内腔/嵌入边同源，角上间隙才处处为 insertClearance。
  const frame = params.lidScrews
    ? cloverFrame(
        width - wall * 2,
        length - wall * 2,
        insertHeight + sealThickness + insertClearance,
        insertThickness + insertClearance * 2,
        getSealReliefRadius(params),
      )
    : roundedFrame(
        width - wall * 2,
        length - wall * 2,
        insertHeight + sealThickness + insertClearance,
        insertThickness + insertClearance * 2,
        insertRimRadius(params),
      );
  return translate([wall, wall, height - (insertHeight + sealThickness)], frame);
};

export const waterProofSeal = (params: Params) => {
  const { length, width, wall, sealThickness, insertThickness, insertClearance } = params;
  // 密封圈本体 = 槽外边界内缩 insertClearance，形状族与槽保持一致（同上）
  const l = width - wall * 2 - insertClearance * 2;
  const w = length - wall * 2 - insertClearance * 2;
  return params.lidScrews
    ? cloverFrame(l, w, sealThickness, insertThickness, getSealReliefRadius(params))
    : roundedFrame(l, w, sealThickness, insertThickness, insertRimRadius(params));
};
