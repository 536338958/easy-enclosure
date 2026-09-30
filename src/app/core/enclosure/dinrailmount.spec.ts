import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { DEFAULT_PARAMS, cloneParams } from '../params';
import {
  calculateDinRailHoles,
  dinRailMount,
  dinRailMountGeometry,
  dinRailMountsPair,
} from './dinrailmount';

describe('dinrailmount', () => {
  it('4 个挂耳时按拐角间距算出三个孔位', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.length = 80;
    params.cornerRadius = 3;
    params.wallMountScrewDiameter = 4;
    params.wallMountCount = 4;
    params.dinRailOrientation = 'horizontal';

    const result = calculateDinRailHoles(params);
    // outerWidth = 4 + 2×2 + 2×2 = 12
    // cornerSpacing = 3 + 12/2 = 9
    // spacing = 80 − 2×9 = 62
    expect(result.outerWidth).toBe(12);
    expect(result.spacing).toBe(62);
    expect(result.positions).toEqual([-31, 0, 31]);
    expect(result.totalLength).toBeGreaterThanOrEqual(62 + 24);
  });

  it('2 个挂耳时只用中间一个孔', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.wallMountCount = 2;
    params.dinRailOrientation = 'horizontal';

    const result = calculateDinRailHoles(params);
    expect(result.spacing).toBe(0);
    expect(result.positions).toEqual([0]);
  });

  it('导轨竖放时孔位跨外壳宽度分布', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.width = 100;
    params.wallMountScrewDiameter = 4;
    params.dinRailOrientation = 'vertical';

    const result = calculateDinRailHoles(params);
    // outerWidth = 12；spacing = 100 + 2×2 + 12 = 116
    expect(result.spacing).toBe(116);
    expect(result.positions).toEqual([-58, 58]);
  });

  it('单个挂夹的尺寸符合输入宽度与固定总高', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.dinRailMount = true;
    params.dinRailMountWidth = 15;

    const mount = dinRailMount(params);
    expect(mount).toBeDefined();

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(mount);
    expect(maxX - minX).toBeCloseTo(15, 0);
    expect(maxY - minY).toBeGreaterThan(50);
    expect(maxZ - minZ).toBeCloseTo(16, 0);
    expect(minZ).toBeCloseTo(0, 5);
  });

  it('横放时一对挂夹沿 X 并排（宽 15 × 2 + 8 间隙）', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.dinRailMount = true;
    params.dinRailMountWidth = 15;
    params.width = 100;
    params.wallMountScrewDiameter = 4;

    const pair = dinRailMountsPair(params);
    const [[minX], [maxX]] = measureBoundingBox(pair);
    expect(maxX - minX).toBeCloseTo(38, 0);
  });

  it('竖放时一对挂夹沿 Y 并排', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.dinRailMount = true;
    params.dinRailMountWidth = 15;
    params.length = 80;
    params.cornerRadius = 3;
    params.wallMountScrewDiameter = 4;
    params.wallMountCount = 4;
    params.dinRailOrientation = 'vertical';

    const pair = dinRailMountsPair(params);
    const [[, minY], [, maxY]] = measureBoundingBox(pair);
    expect(maxY - minY).toBeCloseTo(38, 0);
  });

  it('dinRailMountGeometry 导出单个挂夹', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.dinRailMount = true;

    const result = dinRailMountGeometry(params);
    const [[minX], [maxX]] = measureBoundingBox(result);
    expect(maxX - minX).toBeCloseTo(15, 0);
  });
});
