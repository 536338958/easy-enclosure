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

    describe('孔口倒角（仅方孔 / 矩形孔，圆孔已按用户决定关闭）', () => {
      const mkChamfer = (over: any) => {
        const params = base();
        params.holes = [{ shape: 'square', surface: 'front', diameter: 8, width: 8, length: 8, x: 0, y: 0, ...over }];
        return holes(params, ['front']);
      };

      it('widens the cutter at the outer surface by the chamfer size', () => {
        const plain = bbox(mkChamfer({}));
        const cham = bbox(mkChamfer({ chamfer: true }));
        // 前面：面内两轴 = X / Z。方孔开口在外壁扩 0.6 → 面内跨 8 + 1.2 = 9.2
        expect(cham.x1 - cham.x0).toBeCloseTo(8 + 1.2, 3);
        expect(cham.z1 - cham.z0).toBeCloseTo(8 + 1.2, 3);
        expect(plain.x1 - plain.x0).toBeCloseTo(8, 3);
      });

      it('keeps the through depth untouched by the chamfer', () => {
        const cham = bbox(mkChamfer({ chamfer: true }));
        expect(cham.y1).toBeCloseTo(80 + 0.2, 6);
        expect(cham.y0).toBeCloseTo(80 - 6.08 - 0.2, 6);
      });

      it('orients the chamfer outward on the left wall too', () => {
        // 左壁外壁 x=width。大口盒体在外侧（x ∈ [100, 100.2]），
        // 小口盒体在内侧（x=99.4 起）——翻转错误时两点结论互换
        const params = base();
        params.waterProof = true;
        params.holes = [
          { shape: 'square', surface: 'left', diameter: 8, width: 8, length: 8, x: 0, y: 0, chamfer: true },
        ];
        const cutter = holes(params, ['left']);
        const inCutter = (x: number, y: number, z: number) => {
          const box = translate([x, y, z], cuboid({ size: [0.04, 0.04, 0.04] }));
          return measureVolume(intersect(cutter, box)) > 0.3 * 0.04 ** 3;
        };
        const cy = params.length / 2;
        const cz = params.height / 2;

        // 大口盒体区域：面内半径 4.4（大口半宽 4.6 以内、小口 4.0 以外）
        expect(inCutter(100.1, cy + 4.4, cz)).toBeTrue();
        // 大口半宽只有 4.6，面内半径 4.8 的点在大口盒体外
        expect(inCutter(100.1, cy + 4.8, cz)).toBeFalse();
        // 贯穿深度不被倒角改变
        const b = bbox(cutter);
        expect(b.x1).toBeCloseTo(100 + 0.2, 6);
        expect(b.x0).toBeCloseTo(100 - 6.08 - 0.2, 6);
      });

      it('honors a per-hole chamfer size', () => {
        // 倒角宽 1.0：面内跨 = 8 + 2×1.0 = 10（外加 0.2 的破共面外伸不计入）
        const cham = bbox(mkChamfer({ chamfer: true, chamferSize: 1 }));
        expect(cham.x1 - cham.x0).toBeCloseTo(8 + 2, 3);
        expect(cham.z1 - cham.z0).toBeCloseTo(8 + 2, 3);
      });

      it('clamps the chamfer size for blind holes so the bottom stays intact', () => {
        // 盲孔深 1、倒角宽 2 → 夹到 1（锥不切穿孔底）
        const params = base();
        params.waterProof = true;
        params.holes = [
          {
            shape: 'square',
            surface: 'front',
            diameter: 8,
            width: 8,
            length: 8,
            x: 0,
            y: 0,
            holeType: 'blind',
            blindDepth: 1,
            chamfer: true,
            chamferSize: 2,
          },
        ];
        const b = bbox(holes(params, ['front']));
        // 锥最深到 y = 80 − 1 = 79（盲孔底），不深入
        expect(b.y0).toBeCloseTo(79, 3);
        expect(b.y1).toBeCloseTo(80 + 0.2, 3);
      });

      it('ignores chamfer on circle holes (disabled for performance)', () => {
        const plain = bbox(mkChamferCircle({}));
        const forced = bbox(mkChamferCircle({ chamfer: true }));
        // 圆孔即使预设里带 chamfer: true 也必须与无倒角逐位一致
        expect(forced.x1 - forced.x0).toBeCloseTo(plain.x1 - plain.x0, 6);
        expect(forced.y1 - forced.y0).toBeCloseTo(plain.y1 - plain.y0, 6);
        expect(forced.z1 - forced.z0).toBeCloseTo(plain.z1 - plain.z0, 6);
      });

      const mkChamferCircle = (over: any) => {
        const params = base();
        params.holes = [{ shape: 'circle', surface: 'front', diameter: 8, width: 8, length: 8, x: 0, y: 0, ...over }];
        return holes(params, ['front']);
      };
    });
  });

  it('creates bottom hole cutters that cleanly span the entire floor thickness', () => {
    // 底面透孔过切（对齐上游 62b0a89）：切割体两端各越界 0.2，不再与基座
    // z=0 底面共面（共面留残膜），也不依赖「壁厚恰好大于地板」才打得穿
    const params = cloneParams(DEFAULT_PARAMS);
    params.floor = 3;
    params.holes = [
      { shape: 'circle', surface: 'bottom', diameter: 10, width: 10, length: 10, x: 0, y: 0 },
    ];

    const bottomHole = holes(params, ['bottom']);
    const [[, , zMin], [, , zMax]] = measureBoundingBox(bottomHole);

    expect(zMin).toBeLessThan(0);
    expect(zMax).toBeGreaterThan(params.floor);
  });

  it('cuts through a floor thicker than the wall without leaving material', () => {
    // 地板 12mm 远厚于壁厚（约 4mm）：旧实现切割体深度取壁厚，会在地板中间
    // 戛然而止——孔根本打不穿；新实现按地板厚度取深
    const params = cloneParams(DEFAULT_PARAMS);
    params.floor = 12;
    params.holes = [
      { shape: 'circle', surface: 'bottom', diameter: 10, width: 10, length: 10, x: 0, y: 0 },
    ];

    const bottomHole = holes(params, ['bottom']);
    const [[, , zMin], [, , zMax]] = measureBoundingBox(bottomHole);

    expect(zMin).toBeLessThan(0);
    expect(zMax).toBeGreaterThan(params.floor);
  });
});
