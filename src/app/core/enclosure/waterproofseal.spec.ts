import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import { intersect } from '@jscad/modeling/src/operations/booleans';
import { translate } from '@jscad/modeling/src/operations/transforms';
import { DEFAULT_PARAMS, cloneParams } from '../params';
import { clover, roundedCube } from './utils';
import { getScrewOffset, screwPostProtrusion } from './screws';
import { getSealReliefRadius, waterProofSeal, waterProofSealCutout } from './waterproofseal';

describe('waterproof seal enclosure', () => {
  it('clamps seal relief radius to prevent breaching the inner cavity wall', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrews = true;
    params.lidScrewHoleType = 'nut-pocket';
    params.lidScrewNutWidth = 6.0;

    const relief = getSealReliefRadius(params);
    const maxAllowedRelief = params.insertThickness + params.insertClearance * 2 + params.wall;

    expect(relief).toBeLessThanOrEqual(maxAllowedRelief);
  });

  // 回归：密封圈槽的让位半径必须与螺丝柱凸出量同源。
  // 早先它用的是螺丝孔位 getScrewOffset()，螺母模式下会算出 5.04 而实际柱子只有
  // 3.89，槽在四角绕行过头、把槽切断（表现为「防水槽被打穿」）。
  it('derives the seal relief radius from the screw post, not from the screw hole offset', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrews = true;
    params.lidScrewHoleType = 'nut-pocket';
    params.lidScrewNutWidth = 6.0;

    const maxAllowedRelief = params.insertThickness + params.insertClearance * 2 + params.wall;
    // 让位半径以螺丝柱凸出量为准，同时受「不得啃进内腔」的夹紧
    expect(getSealReliefRadius(params)).toBeCloseTo(
      Math.min(screwPostProtrusion(params), maxAllowedRelief),
      6,
    );

    // 关键回归：挪动孔位完全不影响让位半径 —— 旧实现里它是跟着孔位走的，
    // 螺母模式下孔位算到 5.04 而柱子只有 3.89，槽在四角绕行过头被切断
    const moved = cloneParams(params);
    moved.lidScrewOffset = 6;
    expect(getScrewOffset(moved)).toBeGreaterThan(getScrewOffset(params));
    expect(getSealReliefRadius(moved)).toBeCloseTo(getSealReliefRadius(params), 6);
  });

  it('keeps corner screw posts from swallowing more cavity than needed', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrews = true;
    params.lidScrewHoleType = 'nut-pocket';
    params.lidScrewNutWidth = 6.0;

    // 柱子走凸出量，孔位另算；螺母模式下孔位明显比柱子更靠外
    expect(screwPostProtrusion(params)).toBeLessThan(getScrewOffset(params));
  });

  it('honours a custom screw post protrusion without moving the screw holes', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrews = true;
    params.lidScrewProtrusion = 5;

    const holeOffsetBefore = getScrewOffset(params);
    expect(screwPostProtrusion(params)).toBe(5);
    expect(getScrewOffset(params)).toBeCloseTo(holeOffsetBefore, 6);
  });

  it('generates seal ring and cutout geometry matching the enclosure perimeter', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.waterProof = true;
    params.lidScrews = true;

    const sealRing = waterProofSeal(params);
    const cutout = waterProofSealCutout(params);

    expect(sealRing).toBeDefined();
    expect(cutout).toBeDefined();

    const [[ringMinX, ringMinY], [ringMaxX, ringMaxY]] = measureBoundingBox(sealRing);
    expect(ringMinX).toBeCloseTo(0, 1);
    expect(ringMinY).toBeCloseTo(0, 1);
    expect(ringMaxX).toBeLessThanOrEqual(params.width);
    expect(ringMaxY).toBeLessThanOrEqual(params.length);
  });

  it('does not breach the inner cavity wall under captive nut pocket mode', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.waterProof = true;
    params.lidScrews = true;
    params.lidScrewHoleType = 'nut-pocket';
    params.lidScrewNutWidth = 5.7;

    const cutout = waterProofSealCutout(params);

    const _wall = params.wall * 2 + params.insertClearance * 2 + params.insertThickness;
    const cavity = translate(
      [_wall, _wall, params.floor],
      clover(
        params.width - _wall * 2,
        params.length - _wall * 2,
        params.height,
        getSealReliefRadius(params),
      ),
    );

    const overlap = intersect(cutout, cavity);
    expect(measureVolume(overlap)).toBeLessThan(0.01);
  });
});
