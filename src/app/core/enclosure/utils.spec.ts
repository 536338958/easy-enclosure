import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import measureArea from '@jscad/modeling/src/measurements/measureArea';
import {
  roundedCube,
  roundedCube2d,
  roundedFrame,
  roundedFrame2d,
  clover,
  clover2d,
  cloverFrame,
  cloverFrame2d,
  hollowRoundCube,
} from './utils';

describe('enclosure utils（2D 剖面挤出）', () => {
  // 圆角矩形 2D 面积的解析解：外接矩形减去四个角上的「方减圆」缺口
  const roundedRectArea = (l: number, w: number, r: number) => l * w - (4 - Math.PI) * r * r;

  it('roundedCube 的包围盒与输入尺寸一致，且占据 z∈[0,h]', () => {
    const rc = roundedCube(100, 80, 10, 5);

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(rc);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });

  it('roundedCube 的体积等于 2D 剖面面积乘高（剖面没有被挤出扭曲）', () => {
    const [l, w, h, r] = [100, 80, 10, 5];
    const volume = measureVolume(roundedCube(l, w, h, r));

    // 48 段多边形逼近圆弧，实测比解析解小约 0.1%，1% 容差足够区分「剖面错了」
    expect(volume).toBeGreaterThan(roundedRectArea(l, w, r) * h * 0.99);
    expect(volume).toBeLessThanOrEqual(roundedRectArea(l, w, r) * h);
  });

  it('roundedCube2d 的面积符合圆角矩形解析解', () => {
    const area = measureArea(roundedCube2d(100, 80, 5));
    expect(area).toBeCloseTo(roundedRectArea(100, 80, 5), 0);
  });

  it('roundedFrame 是外轮廓减内轮廓，包围盒不变', () => {
    const rf = roundedFrame(100, 80, 10, 2, 5);

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(rf);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });

  it('roundedFrame2d 的面积等于外圈减内圈', () => {
    const outer = measureArea(roundedCube2d(100, 80, 5));
    const inner = measureArea(roundedCube2d(96, 76, 5));
    expect(measureArea(roundedFrame2d(100, 80, 2, 5))).toBeCloseTo(outer - inner, 0);
  });

  it('clover 的包围盒与输入尺寸一致', () => {
    const cl = clover(100, 80, 10, 5);

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(cl);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });

  it('clover 比同尺寸 roundedCube 更瘦（四角被螺丝柱让位缺口切掉）', () => {
    const [l, w, h, r] = [100, 80, 10, 5];
    expect(measureVolume(clover(l, w, h, r))).toBeLessThan(measureVolume(roundedCube(l, w, h, r)));
  });

  it('clover2d 的面积小于同尺寸 roundedCube2d', () => {
    expect(measureArea(clover2d(100, 80, 5))).toBeLessThan(measureArea(roundedCube2d(100, 80, 5)));
  });

  it('cloverFrame 的包围盒与输入尺寸一致', () => {
    const cf = cloverFrame(100, 80, 10, 2, 5);

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(cf);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });

  it('cloverFrame2d 的面积等于外圈减内圈', () => {
    const outer = measureArea(clover2d(100, 80, 5));
    const inner = measureArea(clover2d(96, 76, 5));
    expect(measureArea(cloverFrame2d(100, 80, 2, 5))).toBeCloseTo(outer - inner, 0);
  });

  it('hollowRoundCube 的包围盒与输入尺寸一致', () => {
    const hrc = hollowRoundCube(100, 80, 10, 2, 5);

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(hrc);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });
});
