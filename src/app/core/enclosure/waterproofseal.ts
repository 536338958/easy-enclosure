import { Params } from '../params';

import { cloverFrame, roundedFrame } from './utils';
import { screwPostProtrusion } from './screws';

import { translate } from '@jscad/modeling/src/operations/transforms';

/**
 * 密封圈槽的外形圆角半径（圆角矩形路径用）。
 * 槽的外边界是「外壳内缩 wall」，圆角半径与圆心都要跟着内缩走。
 */
const sealRimRadius = (params: Params): number =>
  Math.max(params.cornerRadius - params.wall, 0);

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

  // 槽的形状必须与被它容纳的嵌入边同族：开盖板螺丝时嵌入边是 clover，槽也要是
  // clover（四角绕开螺丝柱）；否则嵌入边是圆角矩形，槽用 clover 会在四角多挖出
  // 一块没人填的让位缺口。
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
        sealRimRadius(params),
      );
  return translate([wall, wall, height - (insertHeight + sealThickness)], frame);
};

export const waterProofSeal = (params: Params) => {
  const { length, width, wall, sealThickness, insertThickness, insertClearance } = params;
  // 密封圈本体是槽外边界内缩 insertClearance，形状族与槽保持一致
  const l = width - wall * 2 - insertClearance * 2;
  const w = length - wall * 2 - insertClearance * 2;
  return params.lidScrews
    ? cloverFrame(l, w, sealThickness, insertThickness, getSealReliefRadius(params))
    : roundedFrame(
        l,
        w,
        sealThickness,
        insertThickness,
        Math.max(sealRimRadius(params) - insertClearance, 0),
      );
};
