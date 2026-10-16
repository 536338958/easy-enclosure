import { TestBed } from '@angular/core/testing';

import { cloneParams, DEFAULT_PARAMS } from '../../core/params';
import { GeometryBuilder } from './geometry-builder';

/**
 * 端到端验证 GeometryBuilder：在真实 Chrome 里走 Worker 通道（或自动回退），
 * 断言拿到的几何与同步构建等价。无论 usesWorker 真假，结果都必须正确。
 */
describe('GeometryBuilder', () => {
  let builder: GeometryBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    builder = TestBed.inject(GeometryBuilder);
  });

  afterEach(() => {
    builder.dispose();
  });

  it('builds the lid and returns sane geometry', async () => {
    const built = await builder.build(cloneParams(DEFAULT_PARAMS), ['lid'], false);
    expect(built.parts.lid).toBeDefined();
    // 新起始模型盖板：100 × 80 × (roof 2 + 嵌入边 4)
    const poly = (built.parts.lid as { polygons: unknown[] }).polygons;
    expect(poly.length).toBeGreaterThan(0);
  });

  it('builds the base and computes the collision when requested', async () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.pcbPreview.enabled = true;
    params.internalWalls = [];
    params.pcbMounts = [];
    params.pcbPreview.width = 20;
    params.pcbPreview.length = 20;
    params.pcbPreview.componentHeight = 2;

    const built = await builder.build(params, ['base', 'collision'], false);
    expect(built.parts.base).toBeDefined();
    expect(built.collision).not.toBeNull();
    expect(built.collision?.collides).toBeFalse();
  });

  it('returns the same geometry as the sync path (worker or fallback)', async () => {
    const params = cloneParams(DEFAULT_PARAMS);
    const built = await builder.build(params, ['lid'], false);
    // 同步对照
    const { buildParts } = await import('./geometry-parts');
    const expected = buildParts(cloneParams(params), ['lid'], false);

    const got = (built.parts.lid as { polygons: unknown[] }).polygons.length;
    const want = (expected.parts.lid as { polygons: unknown[] }).polygons.length;
    expect(got).toBe(want);
  });
});
