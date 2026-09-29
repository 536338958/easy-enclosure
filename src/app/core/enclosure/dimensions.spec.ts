import { DEFAULT_PARAMS, cloneParams, type Params } from '../params';
import {
  MIN_SCREW_WALL,
  MAX_SCREW_COUNTERSINK,
  MIN_SCREW_COUNTERSINK,
  cavityFloorZ,
  innerWallInset,
  lidScrewCountersinkSize,
  maxScrewOffset,
  minScrewOffset,
  screwOffset,
  WATERPROOF_PROTRUSION,
  screwPostProtrusion,
} from './dimensions';

describe('dimensions', () => {
  describe('innerWallInset', () => {
    it('equals the plain wall thickness when not waterproof', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.waterProof = false;
      params.wall = 1.5;

      expect(innerWallInset(params)).toBe(1.5);
    });

    it('doubles the wall and adds the insert on both sides when waterproof', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.waterProof = true;
      params.wall = 1;
      params.insertThickness = 2;
      params.insertClearance = 0.04;

      expect(innerWallInset(params)).toBeCloseTo(1 * 2 + 0.04 * 2 + 2, 6);
    });
  });

  describe('cavityFloorZ', () => {
    it('uses the floor thickness when lid screws carve out the cavity', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrews = true;
      params.floor = 3;

      expect(cavityFloorZ(params)).toBe(3);
    });

    // hollowRoundCube 不消费 floor，内腔底直接落在 z = wall。
    // 这条分支曾经被漏掉，导致内隔板与基座地板错位。
    it('falls back to the wall inset when the floor parameter goes unused', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrews = false;
      params.waterProof = false;
      params.wall = 1.5;
      params.floor = 3;

      expect(cavityFloorZ(params)).toBe(1.5);
    });

    it('uses the waterproof wall inset when lid screws are off but waterproofing is on', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrews = false;
      params.waterProof = true;
      params.wall = 1;
      params.insertThickness = 2;
      params.insertClearance = 0.04;
      params.floor = 3;

      expect(cavityFloorZ(params)).toBeCloseTo(innerWallInset(params), 6);
      expect(cavityFloorZ(params)).not.toBe(params.floor);
    });
  });

  describe('screwOffset', () => {
    // 螺丝孔外沿到基座外表面的最小距离。
    // 直线边处就是 offset - r；落在圆角区时外表面是圆弧，沿对角线厚度衰减更快。
    const wallLeftAt = (params: Params, offset: number, screwDiameter: number): number => {
      const radius = screwDiameter / 2;
      const R = params.cornerRadius;
      if (offset >= R) {
        return offset - radius;
      }
      return R - Math.SQRT2 * (R - offset) - radius;
    };

    it('keeps the classic position untouched at default corner radius', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);

      // 默认值下经典公式本身已经满足壁厚，不应被改动。
      // 用参数本身表达期望值，避免默认值调整时测试跟着失效
      expect(screwOffset(params, diameter)).toBeCloseTo(
        diameter / 2 + params.cornerRadius / 4 + params.wall / 2,
        6,
      );
    });

    it('preserves the minimum wall across the whole corner radius range', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);

      for (let r = 1; r <= 40; r += 0.5) {
        params.cornerRadius = r;
        const offset = screwOffset(params, diameter);
        expect(wallLeftAt(params, offset, diameter)).toBeGreaterThanOrEqual(MIN_SCREW_WALL - 1e-9);
      }
    });

    it('lifts an unsafe custom offset back to a safe one', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.cornerRadius = 25;

      // 用户给了一个明显过小的孔位
      params.lidScrewOffset = 1;

      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);
      const offset = screwOffset(params, diameter);

      expect(offset).toBeGreaterThan(1);
      expect(offset).toBeCloseTo(minScrewOffset(params, diameter), 6);
      expect(wallLeftAt(params, offset, diameter)).toBeGreaterThanOrEqual(MIN_SCREW_WALL - 1e-9);
    });

    it('honours a custom offset that is already safe', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrewOffset = 8;

      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);
      expect(screwOffset(params, diameter)).toBe(8);
    });

    // 自动取值随防水状态变化：防水时给足螺丝咬合深度，非防水时够用即可
    it('uses a larger protrusion when waterproofing is on', () => {
      const sealed = cloneParams(DEFAULT_PARAMS);
      sealed.waterProof = true;

      expect(sealed.lidScrewProtrusion).toBe(0);
      expect(screwPostProtrusion(sealed)).toBe(WATERPROOF_PROTRUSION);
    });

    it('falls back to the smallest safe protrusion when not waterproof', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.waterProof = false;
      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);
      const classic = diameter / 2 + params.cornerRadius / 4 + params.wall / 2;

      expect(params.lidScrewProtrusion).toBe(0);
      expect(screwPostProtrusion(params)).toBeCloseTo(minScrewOffset(params, diameter), 6);
      expect(screwPostProtrusion(params)).toBeLessThanOrEqual(classic);
    });

    it('still clamps the waterproof protrusion into the allowed range', () => {
      const tiny = cloneParams(DEFAULT_PARAMS);
      tiny.waterProof = true;
      tiny.width = 20;
      tiny.length = 20;
      tiny.lidScrewProtrusion = 0;

      const diameter = Math.max(tiny.baseLidScrewDiameter, tiny.lidScrewDiameter);
      expect(screwPostProtrusion(tiny)).toBeLessThanOrEqual(maxScrewOffset(tiny, diameter));
    });

    it('clamps an out-of-range protrusion back to the boundary', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);

      // 远小于下界：夹紧到下界
      params.lidScrewProtrusion = 0.1;
      expect(screwPostProtrusion(params)).toBeCloseTo(minScrewOffset(params, diameter), 6);

      // 远大于上界：夹紧到上界，两端凸出块不会相遇
      params.lidScrewProtrusion = 500;
      expect(screwPostProtrusion(params)).toBeCloseTo(maxScrewOffset(params, diameter), 6);
    });

    it('honours a protrusion that is already inside the range', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrewProtrusion = 6;

      expect(screwPostProtrusion(params)).toBe(6);
    });

    // 核心诉求：凸出量只改变内腔角落那块实体的大小，螺丝孔位置必须纹丝不动
    it('does not move the screw hole when the protrusion changes', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);
      const before = screwOffset(params, diameter);

      params.lidScrewProtrusion = 8;

      expect(screwPostProtrusion(params)).toBe(8);
      expect(screwOffset(params, diameter)).toBeCloseTo(before, 6);
    });

    it('keeps the two knobs independent when both are customised', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrewProtrusion = 5;
      params.lidScrewOffset = 7;

      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);

      expect(screwPostProtrusion(params)).toBe(5);
      expect(screwOffset(params, diameter)).toBe(7);
    });

    it('still honours the hole offset when it is the only custom value', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrewOffset = 7;
      params.lidScrewProtrusion = 0;

      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);
      expect(screwOffset(params, diameter)).toBe(7);
    });

    it('never pushes the screw hole past the centre line', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.cornerRadius = 45;
      params.width = 100;
      params.length = 80;

      const diameter = Math.max(params.baseLidScrewDiameter, params.lidScrewDiameter);
      const offset = screwOffset(params, diameter);

      expect(offset).toBeLessThan(Math.min(params.width, params.length) / 2);
    });
  });

  describe('lidScrewCountersinkSize', () => {
    it('is zero when switched off', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrewCountersink = 0;

      expect(lidScrewCountersinkSize(params)).toBe(0);
    });

    it('clamps a value below the printable minimum up to it', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrewCountersink = 0.05;

      expect(lidScrewCountersinkSize(params)).toBe(MIN_SCREW_COUNTERSINK);
    });

    it('clamps an oversized value down to the absolute limit', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.lidScrewCountersink = 99;

      expect(lidScrewCountersinkSize(params)).toBe(MAX_SCREW_COUNTERSINK);
    });

    // 锥坑不能切太深，否则会穿透盖板本体、也让自攻螺丝失去咬合长度
    it('never sinks deeper than 60 percent of the lid thickness', () => {
      const params = cloneParams(DEFAULT_PARAMS);
      params.roof = 1;
      params.insertHeight = 1;
      params.lidScrewCountersink = 99;

      expect(lidScrewCountersinkSize(params)).toBeLessThanOrEqual((1 + 1) * 0.6);
    });
  });
});
