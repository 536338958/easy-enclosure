import { booleans } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { Params } from '../params';

import { holes } from './holes';
import { flanges } from './wallmount';
import { bottomChamferTool, clover, hollowRoundCube, roundedCube } from './utils';
import { waterProofSealCutout } from './waterproofseal';
import { screws } from './screws';
import { ventilationCut } from './ventilation';
import { baseSnapPockets } from './snapfit';
import { innerWallInset, screwOffset, screwPostProtrusion } from './dimensions';
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
    lidScrewDiameter,
    baseLidScrewDiameter,
  } = params;

  const body = [];
  const subtracts = [];

  const _wall = innerWallInset(params);

  if (params.lidScrews) {
    let diameterMax = Math.max(baseLidScrewDiameter, lidScrewDiameter);
    // 螺丝柱（内腔四角凸出的那块实体）用凸出量，螺丝孔位置单独用孔位参数，两者互不影响
    const postProtrusion = screwPostProtrusion(params);
    const screwCentre = screwOffset(params, diameterMax);
    body.push(
      subtract(
        roundedCube(width, length, height, cornerRadius),
        translate(
          [_wall, _wall, floor],
          clover(width - _wall * 2, length - _wall * 2, height, postProtrusion),
        ),
      ),
    );
    // 基座螺丝孔深度取决于「是否穿孔」（该开关只作用于基座，盖板始终贯穿）：
    // - 穿孔（默认）：从基座底面贯穿到顶面
    // - 不穿孔：基座底板（厚 floor）整层留作底部余料，
    //   孔深 = 总厚度 − 底板厚度 = height − floor，在底板顶面（z = floor）处终止
    if (params.lidScrewThrough) {
      subtracts.push(screws(length, width, height, screwCentre, baseLidScrewDiameter));
    } else if (height > floor) {
      subtracts.push(
        translate(
          [0, 0, floor],
          screws(length, width, height - floor, screwCentre, baseLidScrewDiameter),
        ),
      );
    }
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
  const { width, length, cornerRadius, baseBedChamfer } = params;
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

  return result;
};
