import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
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

describe('enclosure utils (2D profile extrusions)', () => {
  it('roundedCube generates 3D geometry with correct bounding box', () => {
    const rc = roundedCube(100, 80, 10, 5);
    expect(rc).toBeDefined();

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(rc);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });

  it('roundedFrame generates 3D frame via 2D extrusion', () => {
    const rf = roundedFrame(100, 80, 10, 2, 5);
    expect(rf).toBeDefined();

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(rf);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });

  it('clover generates 3D geometry with correct dimensions', () => {
    const cl = clover(100, 80, 10, 5);
    expect(cl).toBeDefined();

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(cl);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });

  it('cloverFrame generates 3D frame with correct dimensions', () => {
    const cf = cloverFrame(100, 80, 10, 2, 5);
    expect(cf).toBeDefined();

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(cf);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });

  // 壁厚 ≥ 外形圆角时，内缩后的圆角半径会减到 0 —— 此时必须退成规整矩形，
  // 而不是 hull 出一堆零半径点得到退化/空几何（r=0 曾经让下游 sides 为空）。
  it('roundedCube2d degenerates to a clean rectangle when the radius is fully consumed', () => {
    const rc = roundedCube2d(100, 80, 0);
    expect(rc).toBeDefined();

    const [[minX, minY], [maxX, maxY]] = measureBoundingBox(rc);
    expect(minX).toBeCloseTo(0, 6);
    expect(minY).toBeCloseTo(0, 6);
    expect(maxX).toBeCloseTo(100, 6);
    expect(maxY).toBeCloseTo(80, 6);
    expect((rc as { sides?: unknown[] }).sides?.length ?? 0).toBeGreaterThan(0);
  });

  it('hollowRoundCube generates 3D hollow cube', () => {
    const hrc = hollowRoundCube(100, 80, 10, 2, 5);
    expect(hrc).toBeDefined();

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(hrc);
    expect(minX).toBeCloseTo(0, 1);
    expect(minY).toBeCloseTo(0, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxX).toBeCloseTo(100, 1);
    expect(maxY).toBeCloseTo(80, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });
});
