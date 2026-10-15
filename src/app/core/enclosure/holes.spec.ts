import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import { intersect } from '@jscad/modeling/src/operations/booleans';
import { cuboid } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';
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

    // 回归：right 的切割体在 x≈0 一侧、left 在 x≈width 一侧（与透孔同面）
    it('places left/right blind holes on the same wall as through holes', () => {
      const mk = (surface: 'left' | 'right') => {
        const params = base();
        params.waterProof = true;
        params.holes = [
          { shape: 'circle', surface, diameter: 8, width: 8, length: 8, x: 0, y: 0, holeType: 'blind', blindDepth: 3 },
        ];
        return bbox(holes(params, [surface]));
      };
      const right = mk('right');
      // right 外壁 x=0：盲孔从 x=0 向内 3mm、向外 0.2
      expect(right.x0).toBeCloseTo(-0.2, 6);
      expect(right.x1).toBeCloseTo(3, 6);
      const left = mk('left');
      // left 外壁 x=width=100
      expect(left.x0).toBeCloseTo(100 - 3, 6);
      expect(left.x1).toBeCloseTo(100 + 0.2, 6);
    });

    describe('孔口倒角', () => {
      const mkChamfer = (over: any) => {
        const params = base();
        params.holes = [{ shape: 'circle', surface: 'front', diameter: 8, width: 8, length: 8, x: 0, y: 0, ...over }];
        return holes(params, ['front']);
      };

      it('widens the cutter at the outer surface by the chamfer size', () => {
        const plain = bbox(mkChamfer({}));
        const cham = bbox(mkChamfer({ chamfer: true }));
        // 前面：面内两轴 = X / Z。锥体沿 45° 向外延伸 0.2mm 破共面，
        // 最外端半径 = r + 0.6 + 0.2 = 4.8 → 包围盒跨 9.6
        expect(cham.x1 - cham.x0).toBeCloseTo(8 + 1.6, 3);
        expect(cham.z1 - cham.z0).toBeCloseTo(8 + 1.6, 3);
        expect(plain.x1 - plain.x0).toBeCloseTo(8, 3);
      });

      it('keeps the through depth untouched by the chamfer', () => {
        const cham = bbox(mkChamfer({ chamfer: true }));
        expect(cham.y1).toBeCloseTo(80 + 0.2, 6);
        expect(cham.y0).toBeCloseTo(80 - 6.08 - 0.2, 6);
      });

      it('orients the cone outward on the left wall too', () => {
        // 左壁外壁 x=width。锥体沿 45° 从外壁(x=100, 半径 r+0.6) 向内收拢到
        // x=99.4 (半径 r)，并反向延伸到 x=100.2 (半径 r+0.8)。
        // 在 x=99.7 处锥半径 = 4.3：半径 4.2 的点必须在切割体内（锥向朝内）；
        // 在 x=99.9 处锥半径 = 4.5：半径 4.6 的点必须在锥外（锥向错误时这两点结论互换）
        const params = base();
        params.waterProof = true;
        params.holes = [
          { shape: 'circle', surface: 'left', diameter: 8, width: 8, length: 8, x: 0, y: 0, chamfer: true },
        ];
        const cutter = holes(params, ['left']);
        const inCutter = (x: number, y: number, z: number) => {
          const box = translate([x, y, z], cuboid({ size: [0.04, 0.04, 0.04] }));
          return measureVolume(intersect(cutter, box)) > 0.3 * 0.04 ** 3;
        };
        const cy = params.length / 2;
        const cz = params.height / 2;

        expect(inCutter(99.7, cy + 4.2, cz)).toBeTrue();
        expect(inCutter(99.9, cy + 4.6, cz)).toBeFalse();
        // 贯穿深度不被倒角改变
        const b = bbox(cutter);
        expect(b.x1).toBeCloseTo(100 + 0.2, 6);
        expect(b.x0).toBeCloseTo(100 - 6.08 - 0.2, 6);
      });
    });
  });
});
