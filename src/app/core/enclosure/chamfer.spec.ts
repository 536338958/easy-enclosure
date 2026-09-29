import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';

import { DEFAULT_PARAMS, cloneParams, type Params } from '../params';
import { insertRimRadius, lidTopChamferSize } from './dimensions';
import { cloverOutline, roundedOutline, topChamferTool } from './utils';

/**
 * 把实体的所有顶点投影到 XY，按相对自身包围盒中心的角度分箱，返回命中的箱数。
 *
 * JSCAD 2.13 的 translate/transform 是**惰性**的（只改 transforms 矩阵、不动 vertices），
 * 所以中心点也必须从 vertices 算 —— 不能混用 measureBoundingBox 的结果。
 * 由于待应用的只是纯平移，顶点之间的相对关系不受影响，这样算出来的角度是可靠的。
 */
const angleBinsCovered = (solid: Geom3, bins = 360): number => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  solid.polygons.forEach((polygon) => {
    polygon.vertices.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  });
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const hit = new Array<boolean>(bins).fill(false);
  solid.polygons.forEach((polygon) => {
    const v = polygon.vertices;
    for (let i = 0; i < v.length; i += 1) {
      const a = v[i];
      const b = v[(i + 1) % v.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // 沿每条边按 0.2mm 步长插点：只取顶点的话，长直边上的顶点太稀疏会漏箱
      const steps = Math.max(1, Math.min(4000, Math.ceil(length / 0.2)));
      for (let k = 0; k <= steps; k += 1) {
        const t = k / steps;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        let angle = Math.atan2(y - cy, x - cx);
        if (angle < 0) angle += Math.PI * 2;
        hit[Math.min(bins - 1, Math.floor((angle / (Math.PI * 2)) * bins))] = true;
      }
    }
  });
  return hit.filter(Boolean).length;
};

const zExtent = (solid: Geom3): number => {
  let min = Infinity;
  let max = -Infinity;
  solid.polygons.forEach((polygon) => {
    polygon.vertices.forEach(([, , z]) => {
      min = Math.min(min, z);
      max = Math.max(max, z);
    });
  });
  return max - min;
};

describe('topChamferTool（顶面边缘倒角）', () => {
  const params = cloneParams(DEFAULT_PARAMS);
  const rimInset = params.wall + params.insertClearance;
  const l = params.width - rimInset * 2;
  const w = params.length - rimInset * 2;
  const rimTopZ = params.roof + params.insertHeight;

  const build = (c: number, p: Params = params): Geom3 => {
    const radius = insertRimRadius(p);
    const outline = p.lidScrews ? cloverOutline(radius) : roundedOutline(p.cornerRadius);
    return topChamferTool(l, w, c, rimTopZ, outline);
  };

  it('clover 嵌入边（开启盖板螺丝）的倒角沿整圈闭合', () => {
    // 回归：早先按圆角矩形轮廓放样，而 clover 角部有深约 2.5mm 的内凹扇形
    // （比同尺寸圆角矩形内缩约 6mm），楔环在那里完全切不到实体，倒角断成四段
    expect(angleBinsCovered(build(0.4))).toBe(360);
  });

  it('圆角矩形嵌入边（关闭盖板螺丝）的倒角沿整圈闭合', () => {
    const off = cloneParams(DEFAULT_PARAMS);
    off.lidScrews = false;
    expect(angleBinsCovered(build(0.4, off))).toBe(360);
  });

  it('倒角尺寸放大后仍然整圈闭合', () => {
    expect(angleBinsCovered(build(1.2))).toBe(360);
  });

  it('螺丝柱凸出量改变（轮廓半径变化）后倒角依然闭合', () => {
    const small = cloneParams(DEFAULT_PARAMS);
    small.lidScrewProtrusion = 0.8;
    expect(insertRimRadius(small)).toBeLessThan(insertRimRadius(params));
    expect(angleBinsCovered(build(0.4, small))).toBe(360);
  });

  it('楔环高度等于倒角尺寸（45° 斜面）', () => {
    expect(zExtent(build(0.4))).toBeCloseTo(0.4, 2);
    expect(zExtent(build(1.2))).toBeCloseTo(1.2, 2);
  });

  it('体积随倒角尺寸平方增长（45° 楔环横截面积 ∝ c²）', () => {
    const v1 = measureVolume(build(0.4));
    const v2 = measureVolume(build(0.8));
    expect(v1).toBeGreaterThan(0);
    expect(v2 / v1).toBeGreaterThan(3.6);
    expect(v2 / v1).toBeLessThan(4.4);
  });

  it('倒角尺寸为 0 时不产生任何切削', () => {
    expect(measureVolume(build(0))).toBeLessThan(0.01);
  });
});

describe('lidTopChamferSize（嵌入边顶端倒角的夹紧）', () => {
  const sizeWith = (over: Partial<Params>): number => {
    const p = cloneParams(DEFAULT_PARAMS);
    Object.assign(p, over);
    return lidTopChamferSize(p);
  };

  it('关闭时返回 0', () => {
    expect(sizeWith({ lidTopChamfer: 0 })).toBe(0);
  });

  it('不超过嵌入边高度的 90%', () => {
    expect(sizeWith({ lidTopChamfer: 99, insertHeight: 4, insertThickness: 99 })).toBeCloseTo(
      3.6,
      6,
    );
  });

  it('不超过嵌入边厚度的 80%（顶端要留一圈可打印的顶面）', () => {
    expect(sizeWith({ lidTopChamfer: 99, insertHeight: 99, insertThickness: 2 })).toBeCloseTo(
      1.6,
      6,
    );
  });

  it('默认值 0.4 不受夹紧影响', () => {
    expect(sizeWith({ lidTopChamfer: DEFAULT_PARAMS.lidTopChamfer })).toBe(
      DEFAULT_PARAMS.lidTopChamfer,
    );
  });
});
