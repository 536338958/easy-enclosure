import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import { intersect } from '@jscad/modeling/src/operations/booleans';
import { cuboid } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';

import { DEFAULT_PARAMS, cloneParams, type Params } from '../params';
import { screwOffset } from './dimensions';
import { base } from './base';

const materialAt = (solid: ReturnType<typeof base>, at: [number, number, number]): number => {
  try {
    return Math.abs(
      measureVolume(intersect(solid, translate(at, cuboid({ size: [0.15, 0.15, 0.1] })))),
    );
  } catch {
    return 0;
  }
};

const holeCornersOf = (params: Params): Array<[number, number]> => {
  const diameterMax = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);
  const o = screwOffset(params, diameterMax);
  return [
    [o, o],
    [params.width - o, o],
    [o, params.length - o],
    [params.width - o, params.length - o],
  ];
};

describe('base', () => {
  it('spans the requested footprint when wall mounts are off', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.wallMounts = false;
    params.width = 100;
    params.length = 80;
    params.height = 30;

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measureBoundingBox(base(params));

    expect(minX).toBeCloseTo(0, 6);
    expect(minY).toBeCloseTo(0, 6);
    expect(minZ).toBeCloseTo(0, 6);
    expect(maxX).toBeCloseTo(100, 6);
    expect(maxY).toBeCloseTo(80, 6);
    expect(maxZ).toBeCloseTo(30, 6);
  });

  it('is a hollow shell rather than a solid block', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.wallMounts = false;

    const volume = measureVolume(base(params));
    const boundingVolume = params.width * params.length * params.height;

    expect(volume).toBeGreaterThan(0);
    expect(volume).toBeLessThan(boundingVolume);
  });

  // 防水时内壁加厚，实体部分应比非防水更重
  it('uses more material when waterproofing is on', () => {
    const plain = cloneParams(DEFAULT_PARAMS);
    plain.wallMounts = false;
    plain.waterProof = false;

    const sealed = cloneParams(DEFAULT_PARAMS);
    sealed.wallMounts = false;
    sealed.waterProof = true;

    expect(measureVolume(base(sealed))).toBeGreaterThan(measureVolume(base(plain)));
  });

  // 凸出量控制内腔四角那块实体的大小：调大它，实体变多（内腔被侵占更多）
  it('grows the inner corner posts with the protrusion', () => {
    const small = cloneParams(DEFAULT_PARAMS);
    small.wallMounts = false;
    small.lidScrewProtrusion = 2;

    const large = cloneParams(DEFAULT_PARAMS);
    large.wallMounts = false;
    large.lidScrewProtrusion = 6;

    expect(measureVolume(base(large))).toBeGreaterThan(measureVolume(base(small)));
  });

  // 「孔贯穿底板」只作用于基座：勾选贯穿、取消则底板整层留作余料
  describe('base screw hole depth', () => {
    const setup = (through: boolean): Params => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.wallMounts = false;
      params.height = 30;
      params.floor = 2;
      params.lidScrews = true;
      params.lidScrewThrough = through;
      return params;
    };

    it('drills through the floor when the switch is on', () => {
      const params = setup(true);
      const solid = base(params);

      holeCornersOf(params).forEach(([x, y]) => {
        // 底板内部也应是空的，说明孔真的贯穿了
        expect(materialAt(solid, [x, y, params.floor / 2])).toBeLessThan(0.001);
      });
    });

    it('stops the hole at the floor when the switch is off', () => {
      const params = setup(false);
      const solid = base(params);

      holeCornersOf(params).forEach(([x, y]) => {
        // 底板整层保留 —— 底部余料
        expect(materialAt(solid, [x, y, params.floor / 2])).toBeGreaterThan(0.001);
        // 底板之上仍是孔
        expect(materialAt(solid, [x, y, params.floor + 5])).toBeLessThan(0.001);
      });
    });

    it('leaves the base taller in material when the hole stops short', () => {
      const through = base(setup(true));
      const stopped = base(setup(false));

      // 不打通就多留一层底板材料
      expect(measureVolume(stopped)).toBeGreaterThan(measureVolume(through));
    });
  });
});
