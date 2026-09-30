import { Params } from '../params';

import { cloverFrame } from './utils';
import { screwDiameterMax } from './dimensions';

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

  // 让位缺口的大小必须跟螺丝柱一致：螺母模式下柱子要包住螺母，槽也得跟着变大
  const diameterMax = screwDiameterMax(params);
  return translate(
    [wall, wall, height - (insertHeight + sealThickness)],
    cloverFrame(
      width - wall * 2,
      length - wall * 2,
      insertHeight + sealThickness + insertClearance,
      insertThickness + insertClearance * 2,
      diameterMax / 2 + cornerRadius / 4 + wall / 2,
    ),
  );
};

export const waterProofSeal = (params: Params) => {
  const { length, width, wall, sealThickness, insertThickness, insertClearance, cornerRadius } =
    params;
  const diameterMax = screwDiameterMax(params);
  return cloverFrame(
    width - wall * 2 - insertClearance * 2,
    length - wall * 2 - insertClearance * 2,
    sealThickness,
    insertThickness,
    diameterMax / 2 + cornerRadius / 4 + wall / 2,
  );
};
