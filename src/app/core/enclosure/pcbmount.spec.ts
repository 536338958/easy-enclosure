import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import { intersect } from '@jscad/modeling/src/operations/booleans';
import { cuboid } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';

import { DEFAULT_PARAMS, cloneParams, type Params, type PCBMount } from '../params';
import { MAX_MOUNT_FILLET, MIN_MOUNT_FILLET, mountFilletSize, pcbMount } from './pcbmount';

const MOUNT: PCBMount = {
  surface: 'bottom',
  x: 0,
  y: 0,
  height: 5,
  outerDiameter: 6,
  screwDiameter: 2,
};

const withFillet = (style: 'none' | 'round' | 'chamfer', size: number): Params => {
  const params = cloneParams(DEFAULT_PARAMS);
  params.pcbMountFillet = { style, size };
  return params;
};

const build = (style: 'none' | 'round' | 'chamfer', size: number) =>
  pcbMount(MOUNT, withFillet(style, size));

const volumeOf = (g: ReturnType<typeof pcbMount>): number => Math.abs(measureVolume(g));

const materialAt = (g: ReturnType<typeof pcbMount>, at: [number, number, number]): number => {
  try {
    return Math.abs(
      measureVolume(intersect(g, translate(at, cuboid({ size: [0.15, 0.15, 0.1] })))),
    );
  } catch {
    return 0;
  }
};

describe('pcbMount', () => {
  it('keeps the post centred on the origin like the old cylinder did', () => {
    const [[, , minZ], [, , maxZ]] = measureBoundingBox(build('none', 0));

    expect(minZ).toBeCloseTo(-MOUNT.height / 2, 6);
    expect(maxZ).toBeCloseTo(MOUNT.height / 2, 6);
  });

  it('produces a hollow post of the requested size', () => {
    const g = build('none', 0);
    const [[minX, minY], [maxX, maxY]] = measureBoundingBox(g);
    const expected = Math.PI * (3 * 3 - 1 * 1) * MOUNT.height;

    expect(minX).toBeCloseTo(-3, 1);
    expect(maxX).toBeCloseTo(3, 1);
    expect(minY).toBeCloseTo(-3, 1);
    expect(maxY).toBeCloseTo(3, 1);
    // 32 段多边形近似圆，体积略小于理论圆柱（约 0.6%）
    expect(volumeOf(g)).toBeGreaterThan(expected * 0.98);
    expect(volumeOf(g)).toBeLessThanOrEqual(expected);
  });

  it('widens the root but not the top when a round fillet is used', () => {
    const plain = build('none', 0);
    const rounded = build('round', 1);

    const [[plainMinX], [plainMaxX]] = measureBoundingBox(plain);
    const [[roundMinX], [roundMaxX]] = measureBoundingBox(rounded);
    const topZ = MOUNT.height / 2 - 0.1;

    // 根部变粗
    expect(roundMaxX - roundMinX).toBeGreaterThan(plainMaxX - plainMinX);
    expect(roundMaxX).toBeCloseTo(4, 1);

    // 顶面仍是原外径：2.5 在柱壁内、3.5 在柱外
    expect(materialAt(rounded, [2.5, 0, topZ])).toBeGreaterThan(0.001);
    expect(materialAt(rounded, [3.5, 0, topZ])).toBeLessThan(0.001);
  });

  it('adds material for both transitions, chamfer costing more than round', () => {
    const plainVol = volumeOf(build('none', 0));
    const roundVol = volumeOf(build('round', 1));
    const chamferVol = volumeOf(build('chamfer', 1));

    expect(roundVol).toBeGreaterThan(plainVol);
    expect(chamferVol).toBeGreaterThan(roundVol);
    // 圆角只多一点点料，不该翻倍
    expect(roundVol).toBeLessThan(plainVol * 1.2);
  });

  it('keeps the screw hole open through the whole post', () => {
    const g = build('round', 1);

    [-2, 0, 2].forEach((z) => {
      expect(materialAt(g, [0, 0, z])).toBeLessThan(0.001);
    });
  });

  describe('mountFilletSize', () => {
    it('is zero when the style is none', () => {
      expect(mountFilletSize(withFillet('none', 1), MOUNT)).toBe(0);
    });

    it('is zero when the size is zero', () => {
      expect(mountFilletSize(withFillet('round', 0), MOUNT)).toBe(0);
    });

    it('clamps a size below the printable minimum up to it', () => {
      expect(mountFilletSize(withFillet('round', 0.1), MOUNT)).toBe(MIN_MOUNT_FILLET);
    });

    it('clamps an oversized value down to the shape limit', () => {
      expect(mountFilletSize(withFillet('round', 99), MOUNT)).toBe(MAX_MOUNT_FILLET);
    });

    it('never exceeds 40 percent of the post height', () => {
      const short = { ...MOUNT, height: 2 };
      expect(mountFilletSize(withFillet('round', 99), short)).toBeLessThanOrEqual(2 * 0.4);
    });

    it('never exceeds half the outer diameter', () => {
      const thin = { ...MOUNT, outerDiameter: 2 };
      expect(mountFilletSize(withFillet('round', 99), thin)).toBeLessThanOrEqual(1);
    });

    it('returns a usable size even for degenerate posts', () => {
      const tiny = { ...MOUNT, height: 0.2, outerDiameter: 0.4 };
      expect(mountFilletSize(withFillet('round', 99), tiny)).toBeGreaterThanOrEqual(
        MIN_MOUNT_FILLET,
      );
    });
  });

  it('does not blow up for a very short post', () => {
    const params = withFillet('round', 1);
    const short: PCBMount = { ...MOUNT, height: 0.5, outerDiameter: 1, screwDiameter: 0.4 };

    expect(() => pcbMount(short, params)).not.toThrow();
  });
});
