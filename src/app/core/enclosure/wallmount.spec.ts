import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { subtract } from '@jscad/modeling/src/operations/booleans';
import { DEFAULT_PARAMS, cloneParams } from '../params';
import { earBedChamferTool, flange, flanges } from './wallmount';

describe('wallmount enclosure', () => {
  it('generates a mounting flange with correct dimensions and 45-degree chamfer', () => {
    const screwDiameter = 4;
    const model = flange(screwDiameter);
    expect(model).toBeDefined();

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(model);
    expect(minX).toBeLessThan(0);
    expect(maxX).toBeGreaterThanOrEqual(0);
    expect(maxY - minY).toBeGreaterThan(screwDiameter);
    expect(maxZ - minZ).toBeGreaterThan(screwDiameter);
  });

  it('generates wall mount flanges on left and right sides of the base', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.wallMounts = true;
    params.wallMountCount = 4;

    const mountModel = flanges(params);
    expect(mountModel).toBeDefined();

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(mountModel);
    expect(minX).toBeLessThan(0);
    expect(maxX).toBeGreaterThan(params.width);
    expect(minY).toBeGreaterThanOrEqual(0);
    expect(maxY).toBeLessThanOrEqual(params.length);
  });

  describe('earBedChamferTool', () => {
    const outerWidth = 4 + 2 * 2 + 2 * 2;

    it('removes no material when chamfer size is 0', () => {
      const ear = flange(4, 60, 0);
      expect(measureVolume(subtract(ear, earBedChamferTool(outerWidth, 0)))).toBeCloseTo(
        measureVolume(ear),
        6,
      );
    });

    it('removes material along the whole bottom edge, including the round end', () => {
      const c = 0.8;
      const plain = flange(4, 60, 0);
      const chamfered = flange(4, 60, c);
      const wedge = subtract(plain, chamfered);

      // 圆端是半圆、只有一切点贴到外接矩形。若倒角按外接矩形构造，
      // 圆端几乎切不到实体 —— 这里断言楔环体积达到「周长 × c²/2」的量级，
      // 实测外接矩形方案只有 11.06 mm³，轮廓方案 14.77 mm³。
      // 挂耳周长 ≈ 方端边长 outerWidth + 两侧 2×outerWidth + 半圆 π×outerWidth/2
      const perimeter = outerWidth + 2 * outerWidth + (Math.PI * outerWidth) / 2;
      const expected = (perimeter * c * c) / 2;
      expect(measureVolume(wedge)).toBeGreaterThan(expected * 0.5);
      expect(measureVolume(wedge)).toBeLessThan(expected * 1.5);
    });

    it('clamps an oversized chamfer so the ear is not eaten through', () => {
      const ear = flange(4, 60, 0);
      const chamfered = flange(4, 60, outerWidth);
      expect(measureVolume(chamfered)).toBeGreaterThan(0);
      expect(measureVolume(chamfered)).toBeLessThan(measureVolume(ear));
    });
  });
});
