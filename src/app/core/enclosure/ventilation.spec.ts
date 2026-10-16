import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';

import { cloneParams, DEFAULT_PARAMS, Ventilation } from '../params';
import { ventRangeBox, ventilationCut } from './ventilation';

/** 构造一组通风参数；覆盖项通过 over 传入 */
const makeParams = (over: Partial<Ventilation> = {}) => {
  const params = cloneParams(DEFAULT_PARAMS);
  params.width = 100;
  params.length = 80;
  params.height = 30;
  params.roof = 6;
  params.floor = 2;
  params.ventilation = [
    {
      surface: 'top',
      slotWidth: 2,
      slotLength: 0,
      slotGap: 3,
      slotCount: 5,
      x: 0,
      y: 0,
      ...over,
    },
  ];
  return params;
};

/** 取几何体的三轴跨度 */
const size = (g: Geom3) => {
  const [[x0, y0, z0], [x1, y1, z1]] = measureBoundingBox(g);
  return { w: x1 - x0, d: y1 - y0, h: z1 - z0 };
};

/** 生成指定面 / 模式的通风切割体 */
const cut = (surface: Ventilation['surface'], over: Partial<Ventilation> = {}): Geom3 => {
  const target = surface === 'top' ? 'lid' : 'base';
  const g = ventilationCut(makeParams({ surface, ...over }), target);
  if (!g) {
    throw new Error(`ventilationCut returned null for surface=${surface}`);
  }
  return g;
};

describe('ventilation', () => {
  it('treats 0° as horizontal slots and 90° as vertical slots', () => {
    const horizontal = size(cut('top', { angle: 0 }));
    const vertical = size(cut('top', { angle: 90 }));

    // 横切：长轴沿宽度(X)，纵向只剩阵列跨度 → 宽 > 深
    expect(horizontal.w).toBeGreaterThan(horizontal.d);
    // 竖切：长轴沿长度(Y)，横向只剩阵列跨度 → 深 > 宽
    expect(vertical.d).toBeGreaterThan(vertical.w);
  });

  it('keeps angled slots inside the face', () => {
    for (const angle of [15, 30, 45, 60, 75, 105, 135]) {
      const s = size(cut('top', { angle }));
      expect(s.w).toBeLessThan(100);
      expect(s.d).toBeLessThan(80);
    }
  });

  it('is symmetric every 180°', () => {
    const zero = size(cut('top', { angle: 0 }));
    const full = size(cut('top', { angle: 180 }));
    expect(full.w).toBeCloseTo(zero.w, 6);
    expect(full.d).toBeCloseTo(zero.d, 6);
  });

  it('builds grids sized by columns x rows', () => {
    const circle = size(cut('top', { mode: 'circleGrid', slotCount: 4, rows: 3 }));
    const square = size(cut('top', { mode: 'squareGrid', slotCount: 4, rows: 3 }));
    const hex = size(cut('top', { mode: 'hexGrid', slotCount: 4, rows: 3 }));

    // 列数 4、行数 3、间距 2+3=5 → 方形网格跨度 ≈ 15+2 / 10+2
    expect(square.w).toBeCloseTo(17, 1);
    expect(square.d).toBeCloseTo(12, 1);
    // 圆孔与方孔的排布一致，跨度接近（圆孔为直径 2，方孔为边长 2）
    expect(circle.w).toBeCloseTo(square.w, 1);
    expect(circle.d).toBeCloseTo(square.d, 1);
    // 蜂窝：奇数行错开半格 → 横向更宽；行距 ×√3/2 → 纵向更窄
    expect(hex.w).toBeGreaterThan(square.w);
    expect(hex.d).toBeLessThan(square.d);
  });

  it('spaces hex holes so every rib has the same width', () => {
    const slotWidth = 2;
    const slotGap = 3;
    // 要让邻居落在「边的法线」方向上，最近邻距离必须是 √3·R + 肋宽（R = 宽度/2）。
    // 用 sw + gap 会把孔拉开 (1-√3/2)·sw，肋就变成两端张口的 V 形。
    const pitch = (Math.sqrt(3) * slotWidth) / 2 + slotGap;

    // 单行：每多一列多一个 pitch（用差分消掉孔自身的横向尺寸）
    const threeCols = size(cut('top', { mode: 'hexGrid', slotCount: 3, rows: 1 }));
    const fiveCols = size(cut('top', { mode: 'hexGrid', slotCount: 5, rows: 1 }));
    expect((fiveCols.w - threeCols.w) / 2).toBeCloseTo(pitch, 6);

    // 单列：每多一行多一个行距 pitch·√3/2（错排三角晶格）
    const threeRows = size(cut('top', { mode: 'hexGrid', slotCount: 1, rows: 3 }));
    const fiveRows = size(cut('top', { mode: 'hexGrid', slotCount: 1, rows: 5 }));
    expect((fiveRows.d - threeRows.d) / 2).toBeCloseTo(pitch * (Math.sqrt(3) / 2), 6);

    // 六边形已转过 30°：纵向是「顶到顶」= 对角 sw，横向是「平边到平边」= √3·R
    const one = size(cut('top', { mode: 'hexGrid', slotCount: 1, rows: 1 }));
    expect(one.d).toBeCloseTo(slotWidth, 6);
    expect(one.w).toBeCloseTo((Math.sqrt(3) * slotWidth) / 2, 6);
  });

  it('lays grid rows across the face, never along the cut axis', () => {
    const grid = { mode: 'hexGrid' as const, slotCount: 4, rows: 3, slotWidth: 2, slotGap: 3 };
    const top = size(cut('top', grid));
    const front = size(cut('front', grid));
    const back = size(cut('back', grid));
    const left = size(cut('left', grid));
    const right = size(cut('right', grid));

    // 前/后：列沿 X（宽度）、行沿 Z（高度），穿透厚度只剩侧壁，远小于行列跨度
    expect(front.d).toBeLessThan(front.h);
    expect(front.w).toBeCloseTo(top.w, 6);
    expect(front.h).toBeCloseTo(top.d, 6);
    expect(back.w).toBeCloseTo(front.w, 6);
    expect(back.h).toBeCloseTo(front.h, 6);

    // 左/右：整体再转 90°，拉伸轴变 X，列落到 Y（长度）、行仍在 Z
    expect(right.w).toBeLessThan(right.d);
    expect(right.d).toBeCloseTo(top.w, 6);
    expect(right.h).toBeCloseTo(top.d, 6);
    expect(left.w).toBeCloseTo(right.w, 6);
    expect(left.h).toBeCloseTo(right.h, 6);

    // 行数只有真的生效才能得到这个跨度；若被堆进穿透轴，纵向会缩到孔径本身
    expect(front.h).toBeGreaterThan(grid.slotWidth);
  });

  it('still honours the legacy orientation field', () => {
    const legacy = size(cut('top', { orientation: 'vertical', angle: undefined }));
    const modern = size(cut('top', { angle: 90 }));
    expect(legacy.w).toBeCloseTo(modern.w, 6);
    expect(legacy.d).toBeCloseTo(modern.d, 6);
  });

  it('clamps out-of-range angles', () => {
    const over = size(cut('top', { angle: 200 }));
    const atMax = size(cut('top', { angle: 180 }));
    const under = size(cut('top', { angle: -30 }));
    const atMin = size(cut('top', { angle: 0 }));

    expect(over.w).toBeCloseTo(atMax.w, 6);
    expect(under.w).toBeCloseTo(atMin.w, 6);
  });

  it('cuts through the wall on vertical faces', () => {
    // 墙面：切割体沿穿透方向(Y)应显著厚于孔径，且高度方向覆盖槽长
    const front = size(cut('front', { angle: 0 }));
    expect(front.d).toBeGreaterThan(2);
    expect(front.h).toBeGreaterThan(2);
  });

  describe('开孔范围（裁剪盒）', () => {
    it('limits the vent to the given range on the top face', () => {
      const free = size(cut('top', { angle: 0, slotLength: 60, slotCount: 10, slotGap: 2 }));
      const clipped = size(cut('top', { angle: 0, slotLength: 60, slotCount: 10, slotGap: 2, rangeWidth: 50, rangeLength: 50 }));

      // 未设范围：槽阵按参数铺开（宽 60、堆叠跨 38）
      expect(free.w).toBeCloseTo(60, 3);
      // 设了 50x50：两个方向的跨度都不得超过 50（+0.02 外扩容差）
      expect(clipped.w).toBeLessThanOrEqual(50.02 + 1e-6);
      expect(clipped.d).toBeLessThanOrEqual(50.02 + 1e-6);
      expect(clipped.w).toBeLessThan(free.w);
    });

    it('trims slots crossing the range edge to a flat end', () => {
      // 单槽 55 长、范围宽 30：槽被裁到 30 以内，端头是平的
      const g = cut('top', { angle: 0, slotLength: 55, slotCount: 1, rangeWidth: 30 });
      const s = size(g);
      expect(s.w).toBeCloseTo(30.02, 1);
    });

    it('keeps behaviour identical when the range is 0', () => {
      const withField = cut('top', { angle: 0, slotCount: 5, rangeWidth: 0, rangeLength: 0 });
      const withoutField = cut('top', { angle: 0, slotCount: 5 });
      expect(size(withField).w).toBeCloseTo(size(withoutField).w, 6);
      expect(size(withField).d).toBeCloseTo(size(withoutField).d, 6);
    });

    it('uses the range for the auto slot length', () => {
      // slotLength=0（自动）＝可用长度 60%：设 30x30 范围后，自动槽长 = 30×0.6 = 18
      const g = cut('top', { angle: 0, slotLength: 0, slotCount: 1, rangeWidth: 30, rangeLength: 30 });
      expect(size(g).w).toBeCloseTo(18, 3);
    });

    it('drops the whole vent when the range falls into a gap', () => {
      // 范围与内容同为中心对称（x/y 一起动），所以空集只发生在：
      // 偶数条槽的中心正好是间隙，且范围比间隙还小 —— 框不到任何开孔
      const params = makeParams({
        surface: 'top',
        slotWidth: 2,
        slotCount: 2,
        slotGap: 3,
        rangeWidth: 0.4,
        rangeLength: 0.4,
      });
      expect(ventilationCut(params, 'lid')).toBeNull();
    });

    it('clips wall vents too', () => {
      const clipped = size(cut('front', { angle: 0, slotLength: 60, slotCount: 8, rangeWidth: 40, rangeLength: 12 }));
      // 前面：水平轴 = 宽（范围 40），竖直轴 = 高（范围 12）
      expect(clipped.w).toBeLessThanOrEqual(40.02 + 1e-6);
      expect(clipped.h).toBeLessThanOrEqual(12.02 + 1e-6);
    });

    it('clips grid modes as well', () => {
      // 圆孔网格 8x8、间距 6 → 跨约 42+6；裁到 24x24 内
      const g = cut('top', { mode: 'circleGrid', slotWidth: 3, slotCount: 8, rows: 8, rangeWidth: 24, rangeLength: 24 });
      const s = size(g);
      expect(s.w).toBeLessThanOrEqual(24.02);
      expect(s.d).toBeLessThanOrEqual(24.02);
    });
  });
});

describe('ventRangeBox（开孔范围预览框）', () => {
  const params = cloneParams(DEFAULT_PARAMS);
  params.width = 100;
  params.length = 80;
  params.height = 30;

  it('returns null when no range is set', () => {
    expect(
      ventRangeBox(params, { surface: 'top', slotWidth: 2, slotLength: 0, slotGap: 2, slotCount: 3, x: 0, y: 0 }),
    ).toBeNull();
  });

  it('builds a top-face range box centred on the face with x/y offsets', () => {
    const item: Ventilation = {
      surface: 'top', slotWidth: 2, slotLength: 0, slotGap: 2, slotCount: 3,
      rangeWidth: 50, rangeLength: 40, x: 10, y: 5,
    };
    const box = ventRangeBox(params, item);
    expect(box).not.toBeNull();
    const [[x0, y0, z0], [x1, y1, z1]] = measureBoundingBox(box as never);
    // 中心 = (50+10, 40+5)，跨 50×40，厚度 = roof；悬浮在盖板上方（z 中心 = roof + 1.5）
    expect((x0 + x1) / 2).toBeCloseTo(60, 3);
    expect((y0 + y1) / 2).toBeCloseTo(45, 3);
    expect(x1 - x0).toBeCloseTo(50, 3);
    expect(y1 - y0).toBeCloseTo(40, 3);
    expect(z1 - z0).toBeCloseTo(params.roof, 3);
    expect((z0 + z1) / 2).toBeCloseTo(params.roof + 1.5, 3);
  });

  it('clamps the range to the face size', () => {
    const box = ventRangeBox(params, {
      surface: 'top', slotWidth: 2, slotLength: 0, slotGap: 2, slotCount: 3,
      rangeWidth: 500, rangeLength: 500, x: 0, y: 0,
    });
    const [[x0, y0], [x1, y1]] = measureBoundingBox(box as never);
    expect(x1 - x0).toBeCloseTo(100, 3);
    expect(y1 - y0).toBeCloseTo(80, 3);
  });

  it('maps the range onto wall bands with the right axes', () => {
    const sideWall =
      params.insertThickness + params.insertClearance * 2 + params.wall * 2 + 2;
    // 前面：水平 = 宽（X），竖直 = 高（Z），厚度沿 Y
    const front = ventRangeBox(params, {
      surface: 'front', slotWidth: 2, slotLength: 0, slotGap: 2, slotCount: 3,
      rangeWidth: 40, rangeLength: 10, x: 0, y: 0,
    });
    const [f0, f1] = measureBoundingBox(front as never);
    expect(f1[0] - f0[0]).toBeCloseTo(40, 3); // X 跨 = 范围水平
    expect(f1[2] - f0[2]).toBeCloseTo(10, 3); // Z 跨 = 范围竖直
    expect(f1[1] - f0[1]).toBeCloseTo(sideWall, 3); // Y 跨 = 穿透厚度
    // 悬浮：沿外法向（+Y）外移 1.5mm，悬在前墙外侧
    expect((f0[1] + f1[1]) / 2).toBeCloseTo(params.length + 1.5, 3);
    // 左面：水平 = 长（Y），竖直 = 高（Z），厚度沿 X
    const left = ventRangeBox(params, {
      surface: 'left', slotWidth: 2, slotLength: 0, slotGap: 2, slotCount: 3,
      rangeWidth: 40, rangeLength: 10, x: 0, y: 0,
    });
    const [l0, l1] = measureBoundingBox(left as never);
    expect(l1[1] - l0[1]).toBeCloseTo(40, 3); // Y 跨 = 范围水平（左面水平 = 长度方向）
    expect(l1[2] - l0[2]).toBeCloseTo(10, 3); // Z 跨 = 范围竖直
    expect(l1[0] - l0[0]).toBeCloseTo(sideWall, 3); // X 跨 = 穿透厚度
  });
});
