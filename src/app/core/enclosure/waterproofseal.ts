import { Params } from '../params';

import { cloverFrame } from './utils';
import { screwPostProtrusion } from './screws';

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

  const relief = getSealReliefRadius(params);
  return translate(
    [wall, wall, height - (insertHeight + sealThickness)],
    cloverFrame(
      width - wall * 2,
      length - wall * 2,
      insertHeight + sealThickness + insertClearance,
      insertThickness + insertClearance * 2,
      relief,
    ),
  );
};

export const waterProofSeal = (params: Params) => {
  const { length, width, wall, sealThickness, insertThickness, insertClearance } = params;
  const relief = getSealReliefRadius(params);
  return cloverFrame(
    width - wall * 2 - insertClearance * 2,
    length - wall * 2 - insertClearance * 2,
    sealThickness,
    insertThickness,
    relief,
  );
};
