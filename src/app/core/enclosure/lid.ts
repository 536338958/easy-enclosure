import { booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import {
  bottomChamferTool,
  cloverFrame,
  cloverOutline,
  roundedCube,
  roundedFrame,
  roundedOutline,
  topChamferTool,
} from './utils';

import { Params } from '../params';
import { screws, screwCountersinks } from './screws';
import {
  insertRimRadius,
  lidScrewCountersinkSize,
  lidTopChamferSize,
  screwOffset,
  screwPostProtrusion,
} from './dimensions';
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

  // 嵌入边相对盖板外形的内缩量：它要插进基座顶部的槽里
  const rimInset = wall + insertClearance;
  // 嵌入边顶面所在 z
  const rimTopZ = roof + insertHeight;

  entities.push(roundedCube(width, length, roof, cornerRadius));

  if (params.lidScrews) {
    let diameterMax = Math.max(baseLidScrewDiameter, lidScrewDiameter);
    // 螺丝柱（内腔四角凸出的那块实体）用凸出量，螺丝孔位置单独用孔位参数
    const postProtrusion = screwPostProtrusion(params);
    const screwCentre = screwOffset(params, diameterMax);
    entities.push(
      translate(
        [rimInset, rimInset, roof],
        cloverFrame(
          width - rimInset * 2,
          length - rimInset * 2,
          insertHeight,
          insertThickness,
          postProtrusion,
        ),
      ),
    );
    // 孔必须贯穿整个盖板（本体 roof + 嵌入边 insertHeight）。
    // 早先这里传的是 roof * 2，嵌入边比 roof 厚时顶面还封着一层，螺丝插不进去。
    // 「孔贯穿底板」开关只作用于基座，盖板的孔不受它影响
    subtracts.push(screws(length, width, rimTopZ, screwCentre, lidScrewDiameter));

    // 沉头倒角：在外表面（z = 0）的孔口切 45° 锥坑，让沉头螺丝的螺帽沉进去、不凸出
    const countersink = lidScrewCountersinkSize(params);
    if (countersink > 0) {
      subtracts.push(
        screwCountersinks(length, width, screwCentre, lidScrewDiameter, countersink, countersink),
      );
    }
  } else {
    entities.push(
      translate(
        [rimInset, rimInset, roof],
        roundedFrame(
          width - rimInset * 2,
          length - rimInset * 2,
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
    result = subtract(result, bottomChamferTool(width, length, params.lidBedChamfer, cornerRadius));
  }

  // 盖板嵌入边顶部边缘倒角：在嵌入边的顶面（z = roof + insertHeight）外缘切一圈 45° 斜面，
  // 让嵌入边更容易对准、滑进基座顶部的槽。
  // 注意倒的是「嵌入边」的顶端，不是盖板本体的顶面。
  const rimChamfer = lidTopChamferSize(params);
  if (rimChamfer > 0) {
    // 轮廓必须跟嵌入边自身的形状一致：开盖板螺丝时嵌入边走 clover，四角被螺丝柱
    // 让位缺口切掉好几毫米，若按圆角矩形做楔环，角上会切在实体之外、倒角断成四段
    const rimRadius = insertRimRadius(params);
    const outline = params.lidScrews
      ? cloverOutline(rimRadius)
      : roundedOutline(params.cornerRadius);
    // 尺寸上限（高度 / 厚度）统一由 lidTopChamferSize 夹取，这里不再重复夹紧
    result = subtract(
      result,
      translate(
        [rimInset, rimInset, 0],
        topChamferTool(width - rimInset * 2, length - rimInset * 2, rimChamfer, rimTopZ, outline),
      ),
    );
  }

  // 卡扣凸起（在最后并入，避免被螺孔/开孔切掉）
  const bumps = lidSnapBumps(params);
  if (bumps) {
    result = union(result, bumps);
  }

  return result;
};
