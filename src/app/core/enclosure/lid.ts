import { booleans, transforms } from '@jscad/modeling';
import { cloverFrame, roundedCube, roundedFrame } from './utils';
import {
  bottomChamferTool,
  cloverOutline,
  lidTopChamferSize,
  roundedOutline,
  topChamferTool,
} from './chamfer';

import { Params } from '../params';
import {
  getScrewOffset,
  insertRimInset,
  insertRimRadius,
  lidScrewRecesses,
  screwPostProtrusion,
  screws,
} from './screws';
import { subtract } from '@jscad/modeling/src/operations/booleans';
import { holes } from './holes';
import { lidSnapBumps } from './snapfit';
import { ventilationCut } from './ventilation';

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
    lidScrewDiameter,
    lidScrewRecessType,
  } = params;

  const entities = [];
  const subtracts = [];

  entities.push(roundedCube(width, length, roof, cornerRadius));

  if (params.lidScrews) {
    const screwOffset = getScrewOffset(params);
    // 嵌入边四角的让位缺口跟螺丝柱对齐（同源），孔位另行决定
    const postProtrusion = screwPostProtrusion(params);

    entities.push(
      translate(
        [wall + insertClearance, wall + insertClearance, roof],
        cloverFrame(
          width - wall * 2 - insertClearance * 2,
          length - wall * 2 - insertClearance * 2,
          insertHeight,
          insertThickness,
          postProtrusion,
        ),
      ),
    );

    subtracts.push(screws(length, width, roof + insertHeight, screwOffset, lidScrewDiameter));

    if (lidScrewRecessType && lidScrewRecessType !== 'none') {
      const recessCutters = lidScrewRecesses(params);
      if (recessCutters) {
        subtracts.push(recessCutters);
      }
    }
  } else {
    // 嵌入边外轮廓 = 底壳空腔的真等距内缩：长宽减 2×(wall+insertClearance)，
    // 圆角半径同样要减这么多（圆心与外壳保持同心）。用裸 cornerRadius 的话，
    // 壁厚接近/超过 cornerRadius 时腔角已塌成尖角、嵌入边却是大圆角，
    // 角部间隙会从 insertClearance 涨到 0.5~0.9mm。
    const rimInset = insertRimInset(params);
    const rimRadius = insertRimRadius(params);
    entities.push(
      translate(
        [rimInset, rimInset, roof],
        roundedFrame(
          width - rimInset * 2,
          length - rimInset * 2,
          insertHeight,
          insertThickness,
          rimRadius,
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

  const bumps = lidSnapBumps(params);
  if (bumps) {
    entities.push(bumps);
  }

  const vent = ventilationCut(params, 'lid');
  if (vent) {
    subtracts.push(vent);
  }

  let result = subtracts.length > 0 ? subtract(union(entities), union(subtracts)) : union(entities);

  if (params.lidBedChamfer > 0) {
    result = subtract(result, bottomChamferTool(width, length, params.lidBedChamfer, cornerRadius));
  }

  const rimChamfer = lidTopChamferSize(params);
  if (rimChamfer > 0) {
    const rimInset = wall + insertClearance;
    const rimTopZ = roof + insertHeight;
    // 轮廓必须跟嵌入边自身的形状一致：开盖板螺丝时嵌入边走 clover，四角被螺丝柱
    // 让位缺口切掉好几毫米，若按圆角矩形做楔环，角上会切在实体之外、倒角断成四段
    // 两种族共用 insertRimRadius：clover 取螺丝柱凸出量，圆角矩形取
    // cornerRadius - rimInset（圆心与外壳同心，壁厚吃掉多少就减多少）
    const rimRadius = insertRimRadius(params);
    const outline = params.lidScrews ? cloverOutline(rimRadius) : roundedOutline(rimRadius);
    // 让切割体的外立面与嵌入边的外表面错开一点点，避免两者严格共面时 JSCAD 的布尔
    // 减法留下浮点残渣（倒角面上的毛糙薄壁）。
    // ⚠️ 只有凸的圆角矩形能这么干：clover 的让位缺口是**凹**轮廓，外移会让 BSP 分类
    // 失稳、盖板体积直接爆炸（详见 chamfer.ts 中 OutlineBuilder 的注释）。
    const expand = params.lidScrews ? 0 : 0.01;
    result = subtract(
      result,
      translate(
        [rimInset - expand, rimInset - expand, 0],
        topChamferTool(
          width - rimInset * 2,
          length - rimInset * 2,
          rimChamfer,
          rimTopZ,
          outline,
          expand,
        ),
      ),
    );
  }

  return result;
};
