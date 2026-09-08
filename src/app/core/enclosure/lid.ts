import { booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { bottomChamferTool, cloverFrame, roundedCube, roundedFrame } from './utils';

import { Params } from '../params';
import { screws } from './screws';
import { subtract } from '@jscad/modeling/src/operations/booleans';
import { holes } from './holes';
import { ventilationCut } from './ventilation';
import { lidSnapBumps } from './snapfit';

const { union } = booleans;
const { translate } = transforms;

export const lid = (params: Params) => {
  const {
    length,
    width,
    wall,
    roof,
    cornerRadius,
    insertThickness,
    insertHeight,
    insertClearance,
    baseLidScrewDiameter,
    lidScrewDiameter,
  } = params;

  const entities = [];
  const subtracts = [];

  entities.push(roundedCube(width, length, roof, cornerRadius));

  if (params.lidScrews) {
    let diameterMax = Math.max(baseLidScrewDiameter, lidScrewDiameter);
    entities.push(
      translate(
        [wall + insertClearance, wall + insertClearance, roof],
        cloverFrame(
          width - wall * 2 - insertClearance * 2,
          length - wall * 2 - insertClearance * 2,
          insertHeight,
          insertThickness,
          diameterMax / 2 + cornerRadius / 4 + wall / 2,
        ),
      ),
    );
    let screwOffset = diameterMax / 2 + cornerRadius / 4 + wall / 2;
    subtracts.push(screws(length, width, roof * 2, screwOffset, lidScrewDiameter));
  } else {
    entities.push(
      translate(
        [wall + insertClearance, wall + insertClearance, roof],
        roundedFrame(
          width - wall * 2 - insertClearance * 2,
          length - wall * 2 - insertClearance * 2,
          insertHeight,
          insertThickness,
          cornerRadius,
        ),
      ),
    );
  }

  const holeCount = params.holes.filter((v, i) => {
    return v.surface === 'top';
  }).length;

  if (holeCount > 0) {
    subtracts.push(holes(params, ['top']));
  }

  let result: Geom3;
  if (subtracts.length > 0) {
    result = subtract(union(entities), union(subtracts));
  } else {
    result = union(entities);
  }

  // 顶面散热槽
  const vent = ventilationCut(params, 'lid');
  if (vent) {
    result = subtract(result, vent);
  }

  // 盖板底面倒角（首层防象脚）
  if (params.lidBedChamfer > 0) {
    result = subtract(
      result,
      bottomChamferTool(width, length, params.lidBedChamfer, cornerRadius),
    );
  }

  // 卡扣凸起（在最后并入，避免被螺孔/开孔切掉）
  const bumps = lidSnapBumps(params);
  if (bumps) {
    result = union(result, bumps);
  }

  return result;
};
