import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';

import { cloneParams, DEFAULT_PARAMS } from '../../core/params';
import { buildParts, type PartName } from './geometry-parts';

const ALL: PartName[] = [
  'lid',
  'base',
  'seal',
  'baseMounts',
  'lidMounts',
  'internalWalls',
  'cableClamps',
  'dinRail',
  'collision',
];

const size = (g: Geom3) => {
  const [[x0, y0, z0], [x1, y1, z1]] = measureBoundingBox(g);
  return { w: x1 - x0, d: y1 - y0, h: z1 - z0 };
};
const tris = (g: Geom3) => (g as unknown as { polygons: unknown[] }).polygons.length;

describe('buildParts', () => {
  it('builds lid / base / seal with sane bounds for default params', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    const built = buildParts(params, ['lid', 'base', 'seal'], false);

    expect(built.parts.lid).toBeDefined();
    expect(built.parts.base).toBeDefined();
    expect(built.parts.seal).toBeDefined();
    // 盖板：100×80×（roof 2 + 嵌入边 4）
    const lid = size(built.parts.lid as Geom3);
    expect(lid.w).toBeCloseTo(100, 3);
    expect(lid.d).toBeCloseTo(80, 3);
    expect(lid.h).toBeCloseTo(6, 3);
  });

  it('only builds the requested parts', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    const built = buildParts(params, ['lid'], false);

    expect(built.parts.lid).toBeDefined();
    expect(built.parts.base).toBeUndefined();
    expect(built.parts.seal).toBeUndefined();
    expect(built.collision).toBeNull();
  });

  it('halves the segment count in interactive mode', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    const full = buildParts(params, ['lid'], false);
    const quick = buildParts(params, ['lid'], true);

    const fullTris = tris(full.parts.lid as Geom3);
    const quickTris = tris(quick.parts.lid as Geom3);
    expect(quickTris).toBeLessThan(fullTris);
    // 边界尺寸不受画质影响
    expect(size(quick.parts.lid as Geom3).w).toBeCloseTo(size(full.parts.lid as Geom3).w, 3);
  });

  it('skips the seal when waterproof is off', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.waterProof = false;
    const built = buildParts(params, ['seal'], false);
    expect(built.parts.seal).toBeUndefined();
  });

  it('computes the collision result only when requested and enabled', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    // 默认参数自带一道居中隔板 + 四根支柱，小板放正中心必然撞隔板 —— 清空后再测
    params.internalWalls = [];
    params.pcbMounts = [];
    params.pcbPreview.enabled = true;
    params.pcbPreview.width = 20;
    params.pcbPreview.length = 20;
    params.pcbPreview.componentHeight = 2;

    const without = buildParts(params, ['lid'], false);
    expect(without.collision).toBeNull();

    const withBase = buildParts(params, ['base', 'collision'], false);
    expect(withBase.collision).not.toBeNull();
    expect(withBase.collision?.collides).toBeFalse();

    params.pcbPreview.enabled = false;
    const disabled = buildParts(params, ['base', 'collision'], false);
    expect(disabled.collision).toBeNull();
  });

  it('skips optional add-on parts when their arrays are empty', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    // 默认参数自带隔板 / 支柱 / DIN 挂夹，先清空再断言「空数组跳过」
    params.internalWalls = [];
    params.pcbMounts = [];
    params.cableClamps = [];
    params.dinRailMount = false;
    const built = buildParts(params, ALL, false);
    expect(built.parts.baseMounts).toBeUndefined();
    expect(built.parts.lidMounts).toBeUndefined();
    expect(built.parts.internalWalls).toBeUndefined();
    expect(built.parts.cableClamps).toBeUndefined();
    expect(built.parts.dinRail).toBeUndefined();
  });

  it('builds add-on parts when populated', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.pcbMounts = [
      { surface: 'bottom', x: 0, y: 0, height: 5, outerDiameter: 7, screwDiameter: 2.5 },
    ];
    params.internalWalls = [{ x: 10, y: 0, height: 10, length: 20, thickness: 2, rotation: 0 }];
    params.dinRailMount = true;

    const built = buildParts(params, ALL, false);
    expect(built.parts.baseMounts).toBeDefined();
    expect(built.parts.internalWalls).toBeDefined();
    expect(built.parts.dinRail).toBeDefined();
  });
});
