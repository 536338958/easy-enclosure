import { Params } from '../params';

import { cloverFrame } from './utils';
import { sealReliefRadius } from './dimensions';

import { translate } from '@jscad/modeling/src/operations/transforms';

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
    cornerRadius,
  } = params;

  // 让位缺口必须跟螺丝柱一致（同源），否则槽的绕行范围和柱子对不上
  const relief = sealReliefRadius(params);
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
  const { length, width, wall, sealThickness, insertThickness, insertClearance, cornerRadius } =
    params;
  // 密封圈要嵌进槽里，让位半径必须与槽完全一致，否则装不进去
  const relief = sealReliefRadius(params);
  return cloverFrame(
    width - wall * 2 - insertClearance * 2,
    length - wall * 2 - insertClearance * 2,
    sealThickness,
    insertThickness,
    relief,
  );
};
