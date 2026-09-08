import { booleans } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { Params } from '../params';

import { holes } from './holes';
import { flanges } from './wallmount';
import { bottomChamferTool, clover, hollowRoundCube, roundedCube, topRimChamferTool } from './utils';
import { waterProofSealCutout } from './waterproofseal';
import { screws } from './screws';
import { ventilationCut } from './ventilation';
import { baseSnapPockets } from './snapfit';
import { translate } from '@jscad/modeling/src/operations/transforms';

const { subtract, union } = booleans;

export const base = (params: Params) => {
  const {
    length,
    width,
    height,
    wall,
    floor,
    cornerRadius,
    insertThickness,
    insertClearance,
    lidScrewDiameter,
    baseLidScrewDiameter,
  } = params;

  const body = [];
  const subtracts = [];

  let _wall = wall;
  if (params.waterProof) {
    _wall = wall * 2 + insertClearance * 2 + insertThickness;
  }

  if (params.lidScrews) {
    let diameterMax = Math.max(baseLidScrewDiameter, lidScrewDiameter);
    body.push(
      subtract(
        roundedCube(width, length, height, cornerRadius),
        translate(
          [_wall, _wall, floor],
          clover(
            width - _wall * 2,
            length - _wall * 2,
            height,
            diameterMax / 2 + cornerRadius / 4 + wall / 2,
          ),
        ),
      ),
    );
    let screwOffset = diameterMax / 2 + cornerRadius / 4 + wall / 2;
    subtracts.push(screws(length, width, height, screwOffset, baseLidScrewDiameter));
  } else {
    body.push(hollowRoundCube(width, length, height, _wall, cornerRadius));
  }

  if (params.wallMounts) {
    body.push(flanges(params));
  }

  if (params.waterProof) {
    subtracts.push(waterProofSealCutout(params));
  }

  const holeCount = params.holes.filter((v, i) => {
    return ['front', 'back', 'left', 'right', 'bottom'].includes(v.surface);
  }).length;

  if (holeCount > 0) {
    subtracts.push(holes(params));
  }

  if (subtracts.length > 0) {
    return finish(subtract(union(body), union(subtracts)), params);
  } else {
    return finish(union(body), params);
  }
};

// 统一应用「散热槽 / 底边倒角 / 卡扣凹槽」等后处理
const finish = (solid: Geom3, params: Params): Geom3 => {
  const {
    width,
    length,
    height,
    wall,
    cornerRadius,
    waterProof,
    insertThickness,
    insertClearance,
    baseBedChamfer,
    baseRimChamfer,
  } = params;
  let result = solid;

  const vent = ventilationCut(params, 'base');
  if (vent) {
    result = subtract(result, vent);
  }

  const pockets = baseSnapPockets(params);
  if (pockets) {
    result = subtract(result, pockets);
  }

  if (baseBedChamfer > 0) {
    result = subtract(result, bottomChamferTool(width, length, baseBedChamfer, cornerRadius));
  }

  // 内壁顶端导入倒角：内壁内缩量随是否防水而不同
  if (baseRimChamfer > 0) {
    const innerInset = waterProof ? wall * 2 + insertClearance * 2 + insertThickness : wall;
    result = subtract(
      result,
      topRimChamferTool(width, length, innerInset, baseRimChamfer, height, cornerRadius),
    );
  }

  return result;
};
