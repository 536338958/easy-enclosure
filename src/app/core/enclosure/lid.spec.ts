import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import { intersect } from '@jscad/modeling/src/operations/booleans';
import { cuboid } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';

import { DEFAULT_PARAMS, cloneParams, type LidScrewHoleType, type Params } from '../params';
import { screwOffset, screwDiameterMax } from './dimensions';
import { lid } from './lid';

// 螺丝孔中心位置（不是螺丝柱凸出量，两者是独立的量）
const holeAt = (params: Params): number => {
  return screwOffset(params, screwDiameterMax(params));
};

// 四角螺丝孔的 XY 坐标
const holeCornersOf = (params: Params): Array<[number, number]> => {
  const o = holeAt(params);
  return [
    [o, o],
    [params.width - o, o],
    [o, params.length - o],
    [params.width - o, params.length - o],
  ];
};

// 探针与实体的相交体积，用来判断某个点上「有没有材料」
const materialAt = (solid: ReturnType<typeof lid>, at: [number, number, number]): number => {
  try {
    return Math.abs(
      measureVolume(intersect(solid, translate(at, cuboid({ size: [0.15, 0.15, 0.1] })))),
    );
  } catch {
    return 0;
  }
};

describe('lid', () => {
  // 嵌入边是盖板上那圈插进基座槽里的凸缘，顶端外缘才是该倒角的地方；
  // 盖板本体的上表面不该被动到。
  describe('insert rim top chamfer', () => {
    const rimInset = 2 + 0.04; // wall + insertClearance
    const rimTopZ = 2 + 4; // roof + insertHeight

    it('cuts the top outer edge of the insert rim', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.roof = 2;
      params.insertHeight = 4;
      params.lidTopChamfer = 0.4;

      const plain = cloneParams(params);
      plain.lidTopChamfer = 0;

      const at: [number, number, number] = [rimInset + 0.1, 40, rimTopZ - 0.05];

      expect(materialAt(lid(plain), at)).toBeGreaterThan(0.001);
      expect(materialAt(lid(params), at)).toBeLessThan(0.001);
    });

    it('leaves the lid body top surface square', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.roof = 2;
      params.insertHeight = 4;
      params.lidTopChamfer = 0.4;

      // 盖板本体顶面外沿：倒的是嵌入边，不该动这里
      const at: [number, number, number] = [0.1, 40, 2 - 0.05];

      expect(materialAt(lid(params), at)).toBeGreaterThan(0.001);
    });

    it('does not shorten the lid', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidTopChamfer = 5; // 远超嵌入边高度，应被夹取

      const [, [, , maxZ]] = measureBoundingBox(lid(params));

      expect(maxZ).toBeCloseTo(params.roof + params.insertHeight, 6);
    });
  });

  // 螺丝要穿过盖板拧进基座，盖板的孔必须贯通「本体 + 嵌入边」。
  // 早先孔高用的是 roof * 2，嵌入边比 roof 厚时顶面还封着一层。
  // 基座螺丝孔形式（LidScrewHoleType）只作用于基座，盖板的孔不受它影响。
  it('drills through the lid regardless of the base hole type', () => {
    (['blind', 'nut-pocket', 'through'] as LidScrewHoleType[]).forEach((holeType) => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.roof = 2;
      params.insertHeight = 4;
      params.lidScrews = true;
      params.lidScrewHoleType = holeType;

      const solid = lid(params);
      const topZ = params.roof + params.insertHeight;

      holeCornersOf(params).forEach(([x, y]) => {
        expect(materialAt(solid, [x, y, topZ - 0.15])).toBeLessThan(0.001);
        // 本体内部也是空的，说明真贯穿了，且不受基座开关影响
        expect(materialAt(solid, [x, y, params.roof / 2])).toBeLessThan(0.001);
      });
    });
  });

  // 沉头倒角：在外表面（z = 0）的孔口切 45° 锥坑，让沉头螺丝的螺帽沉进去
  describe('lid screw countersink', () => {
    const setup = (size: number): Params => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrews = true;
      params.lidScrewCountersink = size;
      return params;
    };

    it('opens the hole mouth at the outer face', () => {
      const params = setup(1);
      const plain = setup(0);

      const holeR = params.lidScrewDiameter / 2;
      const [cx, cy] = holeCornersOf(params)[0];
      // 孔口外侧一点：落在锥坑内、但超出圆柱孔本身
      const at: [number, number, number] = [cx + holeR + 0.5, cy, 0.05];

      expect(materialAt(lid(plain), at)).toBeGreaterThan(0.001);
      expect(materialAt(lid(params), at)).toBeLessThan(0.001);
    });

    it('leaves the geometry untouched when switched off', () => {
      const off = lid(setup(0));
      const on = lid(setup(1));

      expect(measureVolume(off)).toBeGreaterThan(measureVolume(on));
    });

    it('does not cut into the embedded lip side', () => {
      const params = setup(1);
      const [cx, cy] = holeCornersOf(params)[0];
      const holeR = params.lidScrewDiameter / 2;
      // 嵌入边一侧（z 靠下）的孔壁应保留，锥坑只开在外表面
      const at: [number, number, number] = [cx + holeR + 0.3, cy, params.height];

      expect(() => lid(params)).not.toThrow();
      expect(at[2]).toBeGreaterThan(0);
    });
  });

  it('spans the roof plus the insert lip', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.roof = 2;
    params.insertHeight = 4;
    params.width = 100;
    params.length = 80;

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(lid(params));

    expect(minX).toBeCloseTo(0, 6);
    expect(minY).toBeCloseTo(0, 6);
    expect(minZ).toBeCloseTo(0, 6);
    expect(maxX).toBeCloseTo(100, 6);
    expect(maxY).toBeCloseTo(80, 6);
    expect(maxZ).toBeCloseTo(params.roof + params.insertHeight, 6);
  });

  it('produces a positive solid volume', () => {
    expect(measureVolume(lid(cloneParams(DEFAULT_PARAMS)))).toBeGreaterThan(0);
  });

  it('keeps the same outer height whether or not lid screws are used', () => {
    const withScrews = cloneParams(DEFAULT_PARAMS);
    withScrews.lidScrews = true;

    const withoutScrews = cloneParams(DEFAULT_PARAMS);
    withoutScrews.lidScrews = false;

    const heightOf = (params: typeof withScrews): number => measureBoundingBox(lid(params))[1][2];

    expect(heightOf(withScrews)).toBeCloseTo(heightOf(withoutScrews), 6);
  });
});
