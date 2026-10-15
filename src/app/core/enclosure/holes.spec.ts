import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { DEFAULT_PARAMS, cloneParams } from '../params';
import { holes } from './holes';

describe('holes', () => {
  it('creates top hole cutters that span the full lid thickness', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.roof = 6;
    params.insertHeight = 2;
    params.holes = [
      {
        shape: 'circle',
        surface: 'top',
        diameter: 10,
        width: 10,
        length: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[, , zMin], [, , zMax]] = measureBoundingBox(topHole);

    expect(zMin).toBe(0);
    expect(zMax).toBeGreaterThan(params.roof + params.insertHeight);
  });

  describe('不透孔（blind，深度由外壁向内）', () => {
    const base = () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.holes = [];
      return params;
    };
    const bbox = (g: ReturnType<typeof holes>) => {
      const [[x0, y0, z0], [x1, y1, z1]] = measureBoundingBox(g);
      return { x0, y0, z0, x1, y1, z1 };
    };

    it('cuts a front blind hole from the outer surface inward by the set depth', () => {
      const params = base();
      params.waterProof = true;
      params.holes = [
        { shape: 'circle', surface: 'front', diameter: 8, width: 8, length: 8, x: 0, y: 0, holeType: 'blind', blindDepth: 3 },
      ];
      // 前面外壁在 y = length = 80；切割体应从 y=80 向内 3mm、向外伸出 0.2 破共面
      const b = bbox(holes(params, ['front']));
      expect(b.y1).toBeCloseTo(80 + 0.2, 6);
      expect(b.y0).toBeCloseTo(80 - 3, 6);
      // 不打穿：孔底(y0)仍在壁内（防水壁厚 6.08，内表面在 73.92）
      expect(b.y0).toBeGreaterThan(80 - (2 + 0.08 + 4));
    });

    it('clamps the depth so a blind hole never breaks through', () => {
      const params = base();
      params.waterProof = true;
      params.holes = [
        { shape: 'circle', surface: 'front', diameter: 8, width: 8, length: 8, x: 0, y: 0, holeType: 'blind', blindDepth: 100 },
      ];
      const b = bbox(holes(params, ['front']));
      // 夹到 壁厚−0.4 = 5.68
      expect(b.y0).toBeCloseTo(80 - (2 + 0.08 + 4 - 0.4), 3);
      expect(b.y0).toBeGreaterThan(80 - (2 + 0.08 + 4));
    });

    it('defaults the depth to half the wall when unset', () => {
      const params = base();
      params.waterProof = true;
      params.holes = [
        { shape: 'circle', surface: 'front', diameter: 8, width: 8, length: 8, x: 0, y: 0, holeType: 'blind' },
      ];
      const b = bbox(holes(params, ['front']));
      expect(b.y0).toBeCloseTo(80 - (2 + 0.08 + 4) / 2, 3);
    });

    it('measures a bottom blind hole from z=0 (outer) inward', () => {
      const params = base();
      params.floor = 2;
      params.holes = [
        { shape: 'circle', surface: 'bottom', diameter: 8, width: 8, length: 8, x: 0, y: 0, holeType: 'blind', blindDepth: 1 },
      ];
      const b = bbox(holes(params, ['bottom']));
      expect(b.z0).toBeCloseTo(-0.2, 6);
      expect(b.z1).toBeCloseTo(1, 6);
      // 不打穿底板（底板顶面 z=2）
      expect(b.z1).toBeLessThan(2);
    });

    it('keeps a lid top blind hole inside the roof', () => {
      const params = base();
      params.roof = 6;
      params.holes = [
        { shape: 'circle', surface: 'top', diameter: 8, width: 8, length: 8, x: 0, y: 0, holeType: 'blind', blindDepth: 2 },
      ];
      const b = bbox(holes(params, ['top']));
      expect(b.z0).toBeCloseTo(-0.2, 6);
      expect(b.z1).toBeCloseTo(2, 6);
      expect(b.z1).toBeLessThan(6);
    });

    it('keeps through holes unchanged when holeType is absent', () => {
      const params = base();
      params.waterProof = true;
      params.holes = [
        { shape: 'circle', surface: 'front', diameter: 8, width: 8, length: 8, x: 0, y: 0 },
      ];
      const b = bbox(holes(params, ['front']));
      const total = 2 + 0.08 + 4;
      // 透孔：两端各多 0.2 余量
      expect(b.y0).toBeCloseTo(80 - total - 0.2, 6);
      expect(b.y1).toBeCloseTo(80 + 0.2, 6);
    });
  });
});
