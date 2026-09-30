import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import { intersect } from '@jscad/modeling/src/operations/booleans';
import { translate } from '@jscad/modeling/src/operations/transforms';

import { DEFAULT_PARAMS, cloneParams, type Params } from '../params';
import { innerWallInset, screwPostProtrusion, sealReliefRadius } from './dimensions';
import { clover, roundedCube } from './utils';
import { waterProofSeal, waterProofSealCutout } from './waterproofseal';

describe('sealReliefRadius（密封圈槽四角让位半径）', () => {
  it('与螺丝柱凸出量同源：三种孔型下都相等', () => {
    for (const holeType of ['through', 'blind', 'nut-pocket'] as const) {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrewHoleType = holeType;
      expect(sealReliefRadius(params)).toBe(screwPostProtrusion(params));
    }
  });

  it('用户自定义凸出量时同样跟随', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrewProtrusion = 5;
    expect(sealReliefRadius(params)).toBe(screwPostProtrusion(params));
  });

  it('螺母模式的让位半径必须大于贯穿模式（螺母外接圆更大）', () => {
    const through = cloneParams(DEFAULT_PARAMS);
    through.lidScrewHoleType = 'through';
    const nut = cloneParams(DEFAULT_PARAMS);
    nut.lidScrewHoleType = 'nut-pocket';
    expect(sealReliefRadius(nut)).toBeGreaterThan(sealReliefRadius(through));
  });
});

/**
 * 回归：螺母模式下密封圈槽曾在四角「绕行过头」，把槽与内腔之间的壁打穿。
 *
 * 根因：让位半径抄了孔位公式（螺母模式算出 5.04），而螺丝柱凸出量只有 3.89，
 * 槽在四角越过螺丝柱边界切进内腔。修复后两者同源，交集必须为空。
 * 旧公式下该交集体积 ≈ 22 mm³。
 */
describe('waterProofSealCutout（密封圈槽不切入内腔）', () => {
  const cavityVoid = (params: Params) => {
    // 与 base.ts 一致：内腔 = 圆角矩形减去 clover（四角留下螺丝柱）
    const inset = innerWallInset(params);
    const { width, length, height, cornerRadius } = params;
    return intersect(
      roundedCube(width, length, height, cornerRadius),
      translate(
        [inset, inset, 0],
        clover(width - inset * 2, length - inset * 2, height, screwPostProtrusion(params)),
      ),
    );
  };

  it('默认参数（螺母槽）下槽体与内腔不相交', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrewHoleType = 'nut-pocket';
    const overlap = intersect(waterProofSealCutout(params), cavityVoid(params));
    expect(measureVolume(overlap)).toBeLessThan(0.01);
  });

  it('贯穿模式下同样不相交', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrewHoleType = 'through';
    const overlap = intersect(waterProofSealCutout(params), cavityVoid(params));
    expect(measureVolume(overlap)).toBeLessThan(0.01);
  });

  it('密封圈实体本身也不进入内腔', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrewHoleType = 'nut-pocket';
    // 密封圈几何是局部坐标（角点在原点），实际装配时嵌入基座槽内：
    // 槽体开在 [wall, wall]，密封圈外缘留出 clearance 居中放置
    const placed = translate(
      [
        params.wall + params.insertClearance,
        params.wall + params.insertClearance,
        params.height - (params.insertHeight + params.sealThickness + params.insertClearance),
      ],
      waterProofSeal(params),
    );
    const overlap = intersect(placed, cavityVoid(params));
    expect(measureVolume(overlap)).toBeLessThan(0.01);
  });
});
