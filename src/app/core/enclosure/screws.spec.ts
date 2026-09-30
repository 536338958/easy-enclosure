import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { DEFAULT_PARAMS, cloneParams } from '../params';
import { screws, nutPockets } from './screws';
import { lidScrewBlindDepth, screwDiameterMax, screwOffset } from './dimensions';
import { base } from './base';
import { lid } from './lid';

describe('screws（螺丝孔与螺母槽）', () => {
  it('普通螺丝的最大孔径就是两种螺丝孔里较大的那个', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrewHoleType = 'blind';
    params.lidScrewDiameter = 3.0;
    params.baseLidScrewDiameter = 2.8;

    expect(screwDiameterMax(params)).toBe(3.0);
  });

  it('螺母模式按螺母外接圆算最大孔径，孔位随之一起外移', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrewHoleType = 'blind';
    const plainOffset = screwOffset(params, screwDiameterMax(params));

    params.lidScrewHoleType = 'nut-pocket';
    params.lidScrewNutWidth = 5.7;
    const expectedNutDiameter = (5.7 / Math.sqrt(3)) * 2;
    expect(screwDiameterMax(params)).toBeCloseTo(expectedNutDiameter, 4);
    expect(screwOffset(params, screwDiameterMax(params))).toBeGreaterThan(plainOffset);
  });

  it('盲孔切割体从顶面往下钻指定深度，且略微伸出顶面', () => {
    const height = 30;
    const depth = 10;
    const cutters = screws(100, 80, height, 6, 3, depth);
    const [, , zMin] = measureBoundingBox(cutters)[0];
    const [, , zMax] = measureBoundingBox(cutters)[1];

    expect(zMin).toBeCloseTo(height - depth, 1);
    expect(zMax).toBeGreaterThanOrEqual(height);
  });

  it('省略深度时是贯穿孔，两端都略微伸出实体', () => {
    const height = 30;
    const cutters = screws(100, 80, height, 6, 3);
    const [, , zMin] = measureBoundingBox(cutters)[0];
    const [, , zMax] = measureBoundingBox(cutters)[1];

    expect(zMin).toBeLessThanOrEqual(0);
    expect(zMax).toBeGreaterThanOrEqual(height);
  });

  it('螺母槽开在基座底面，向上挖到指定深度', () => {
    const nutDepth = 2.5;
    const pockets = nutPockets(100, 80, 8, 5.7, nutDepth);
    const [, , zMin] = measureBoundingBox(pockets)[0];
    const [, , zMax] = measureBoundingBox(pockets)[1];

    expect(zMin).toBeLessThanOrEqual(0);
    expect(zMax).toBeCloseTo(nutDepth, 1);
  });

  it('盲孔深度被夹到「不打通底板」', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.height = 30;
    params.floor = 2;
    params.lidScrewHoleDepth = 100;
    expect(lidScrewBlindDepth(params)).toBe(28);

    params.lidScrewHoleDepth = -5;
    expect(lidScrewBlindDepth(params)).toBe(0);
  });

  it('盲孔模式下基座底板保持完整（包围盒仍是 0 ~ height）', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrews = true;
    params.lidScrewHoleType = 'blind';
    params.lidScrewHoleDepth = 8;

    const baseModel = base(params);
    const [, , zMin] = measureBoundingBox(baseModel)[0];
    const [, , zMax] = measureBoundingBox(baseModel)[1];

    // 布尔运算会留下 ~1e-16 的浮点残差，用近似比较
    expect(zMin).toBeCloseTo(0, 6);
    expect(zMax).toBeCloseTo(params.height, 6);
  });

  it('三种孔型都能生成基座与盖板', () => {
    for (const holeType of ['blind', 'nut-pocket', 'through'] as const) {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrews = true;
      params.lidScrewHoleType = holeType;

      expect(base(params)).toBeDefined();
      expect(lid(params)).toBeDefined();
    }
  });
});
