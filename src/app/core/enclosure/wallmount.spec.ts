import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';

import { DEFAULT_PARAMS, cloneParams } from '../params';
import { flange, flanges } from './wallmount';

// 收集实体所有面的单位法向量
const faceNormals = (solid: Geom3): number[][] => {
  const normals: number[][] = [];

  solid.polygons.forEach((polygon) => {
    const vertices = polygon.vertices;
    if (vertices.length < 3) {
      return;
    }

    const [a, b, c] = vertices;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(n[0], n[1], n[2]);

    if (length < 1e-9) {
      return;
    }

    normals.push([n[0] / length, n[1] / length, n[2] / length]);
  });

  return normals;
};

const hasFaceAlong = (normals: number[][], target: number[]): boolean =>
  normals.some((n) => Math.abs(n[0] * target[0] + n[1] * target[1] + n[2] * target[2]) > 0.999);

describe('wallmount', () => {
  // 回归：rotateY 接受弧度，原先直接传 45 被当成 45 弧度 ≈ 58.4°，切角并不是设计的 45°。
  // 45° 斜面的法向量落在 (1,0,±1)/√2 上；58.4° 时不会。
  // 显式指定角度，避免默认预设调整时这条跟着失效
  it('cuts the outer ear corner at exactly 45 degrees', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.wallMountScrewDiameter = 4;
    params.wallMountChamferAngle = 45;

    const ears = flanges(params);
    const normals = faceNormals(ears);
    const diagonal = [Math.SQRT1_2, 0, Math.SQRT1_2];
    const antiDiagonal = [Math.SQRT1_2, 0, -Math.SQRT1_2];

    expect(normals.length).toBeGreaterThan(0);
    expect(hasFaceAlong(normals, diagonal) || hasFaceAlong(normals, antiDiagonal)).toBe(true);
  });

  it('does not leave a 58 degree facet behind', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.wallMountScrewDiameter = 4;

    // 45 弧度≡ 58.4°，其法向量约 (0.524, 0, ±0.852)
    const wrongAngle = [Math.cos(45), 0, -Math.sin(45)];
    const normals = faceNormals(flange(params.wallMountScrewDiameter, 45));

    expect(hasFaceAlong(normals, wrongAngle)).toBe(false);
  });

  it('places ears on both sides of the enclosure', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.wallMountCount = 4;
    params.width = 100;
    params.wallMountScrewDiameter = 4;

    const [[minX], [maxX]] = measureBoundingBox(flanges(params));

    expect(minX).toBeLessThan(0);
    expect(maxX).toBeGreaterThan(params.width);
  });

  it('spans further along the length with four mounts than with two', () => {
    const two = cloneParams(DEFAULT_PARAMS);
    two.wallMountCount = 2;
    two.length = 80;
    two.wallMountScrewDiameter = 4;

    const four = cloneParams(DEFAULT_PARAMS);
    four.wallMountCount = 4;
    four.length = 80;
    four.wallMountScrewDiameter = 4;

    const spanOf = (params: typeof four): number => {
      const [[, minY], [, maxY]] = measureBoundingBox(flanges(params));
      return maxY - minY;
    };

    expect(spanOf(four)).toBeGreaterThan(spanOf(two));
  });
});
