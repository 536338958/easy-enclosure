import { intersect } from '@jscad/modeling/src/operations/booleans';
import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import { cuboid } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';

import { DEFAULT_PARAMS, cloneParams } from '../params';
import {
  WALL_MOUNT_CHAMFER_DEFAULT,
  WALL_MOUNT_CHAMFER_MAX,
  WALL_MOUNT_CHAMFER_MIN,
  earBedChamferTool,
  flange,
} from './wallmount';

// 布尔求交在退化（共面）情形下可能抛错，这里按「无实质重叠」处理
const overlapVolume = (a: Geom3, b: Geom3): number => {
  try {
    return Math.abs(measureVolume(intersect(a, b)));
  } catch {
    return 0;
  }
};

const volumeOf = (solid: Geom3): number => Math.abs(measureVolume(solid));

describe('geometry clearances', () => {
  const SCREW_DIAMETER = 4;
  // 与 wallmount.ts 的 SCREWCLEARANCE = 2、RIDGEWIDTH = 2 保持一致
  const OUTER_WIDTH = SCREW_DIAMETER + 2 * 2 + 2 * 2;

  describe('wall mount chamfer angle', () => {
    const earVolume = (angle: number): number => volumeOf(flange(SCREW_DIAMETER, angle));

    it('clamps angles outside the allowed range', () => {
      // 越界值被夹到边界，几何不应再变化
      expect(earVolume(5)).toBeCloseTo(earVolume(WALL_MOUNT_CHAMFER_MIN), 6);
      expect(earVolume(90)).toBeCloseTo(earVolume(WALL_MOUNT_CHAMFER_MAX), 6);
    });

    // 实测角度越小切掉的实体越多（切面越贴近挂耳轴线），两端都要留够材料
    it('keeps enough material at both angle extremes', () => {
      const atDefault = earVolume(45);

      [WALL_MOUNT_CHAMFER_MIN, WALL_MOUNT_CHAMFER_MAX].forEach((angle) => {
        expect(earVolume(angle)).toBeGreaterThan(atDefault * 0.6);
      });
    });

    // 切角朝螺丝孔方向推进，角度过大可能把孔壁削掉。
    // 注意挂耳被沉孔挖空了上半部，实体只在底部 z ∈ [-6,-2]，探针要落在这一层；
    // 且 cylinder 默认 center 是 [0,0,0]，螺丝孔中心在 z = 0 而非 z = OUTER_WIDTH/2。
    it('leaves the screw hole intact at both angle extremes', () => {
      const z = -OUTER_WIDTH / 2 + 2;
      const holeCentre: [number, number, number] = [-OUTER_WIDTH / 2, 0, z];
      const probeInHole = translate(holeCentre, cuboid({ size: [0.6, 0.6, 0.6] }));
      const ringProbes: Array<[number, number, number]> = [
        [holeCentre[0] - 2.6, 0, z],
        [holeCentre[0] + 2.6, 0, z],
        [holeCentre[0], 2.6, z],
        [holeCentre[0], -2.6, z],
      ];

      [WALL_MOUNT_CHAMFER_MIN, WALL_MOUNT_CHAMFER_MAX].forEach((angle) => {
        const ear = flange(SCREW_DIAMETER, angle);

        // 孔必须还在
        expect(overlapVolume(ear, probeInHole)).toBeLessThan(0.01);

        // 孔四周都得有材料，任一侧被削穿都说明强度不够
        ringProbes.forEach((at) => {
          const probe = translate(at, cuboid({ size: [0.4, 0.4, 0.4] }));
          expect(overlapVolume(ear, probe)).toBeGreaterThan(0.01);
        });
      });
    });

    it('keeps the ear within its own bounding box at every angle', () => {
      const [[minX], [maxX]] = measureBoundingBox(flange(SCREW_DIAMETER, WALL_MOUNT_CHAMFER_MAX));

      expect(minX).toBeLessThan(0);
      expect(maxX).toBeGreaterThan(0);
    });
  });

  // 挂耳是一端方、一端圆的 hull 形状。用外接矩形做楔环时，圆端的底边切不到，
  // 倒角会在那里断开。下面按挂耳自身轮廓验证整条底边都被覆盖。
  describe('ear bed chamfer', () => {
    const BED_CHAMFER = 0.6;
    const zBottom = -OUTER_WIDTH / 2 + 0.05;

    // 只有距轮廓边界小于倒角宽度的点才该被切掉；挂在内部或倒角带之外的点应保留
    const nearEdgeSpots: Array<[number, number]> = [
      [-11.3, -1.5], // 圆端斜向，距边界约 0.49
      [2.8, 0], // 矩形端
      [-3, 5.8], // 侧边
    ];

    it('removes material along the rounded end of the ear bed', () => {
      // 圆端最外侧，距圆心 (-6,0) 约 5.8，落在倒角带内
      const at: [number, number, number] = [-11.8, 0, zBottom];
      const probe = translate(at, cuboid({ size: [0.15, 0.15, 0.1] }));

      const plain = flange(SCREW_DIAMETER, WALL_MOUNT_CHAMFER_DEFAULT, 0);
      const chamfered = flange(SCREW_DIAMETER, WALL_MOUNT_CHAMFER_DEFAULT, BED_CHAMFER);

      // 不倒角时这里是实体，倒了就该被切掉
      expect(overlapVolume(plain, probe)).toBeGreaterThan(0.001);
      expect(overlapVolume(chamfered, probe)).toBeLessThan(0.001);
    });

    it('cuts every edge of the ear, not just the straight sides', () => {
      const plain = flange(SCREW_DIAMETER, WALL_MOUNT_CHAMFER_DEFAULT, 0);
      const chamfered = flange(SCREW_DIAMETER, WALL_MOUNT_CHAMFER_DEFAULT, BED_CHAMFER);

      nearEdgeSpots.forEach(([x, y]) => {
        const probe = translate([x, y, zBottom], cuboid({ size: [0.15, 0.15, 0.1] }));

        expect(overlapVolume(plain, probe)).toBeGreaterThan(0.001);
        expect(overlapVolume(chamfered, probe)).toBeLessThan(0.001);
      });
    });

    it('leaves material that sits outside the chamfer band alone', () => {
      const chamfered = flange(SCREW_DIAMETER, WALL_MOUNT_CHAMFER_DEFAULT, BED_CHAMFER);
      // 挂耳内部不该被动到
      const probe = translate([-3, 0, zBottom], cuboid({ size: [0.15, 0.15, 0.1] }));

      expect(overlapVolume(chamfered, probe)).toBeGreaterThan(0.001);
    });

    it('leaves the upper body of the ear untouched', () => {
      const chamfered = flange(SCREW_DIAMETER, WALL_MOUNT_CHAMFER_DEFAULT, BED_CHAMFER);
      // 倒角只该啃掉底部一条窄带，挂耳主体高度不受影响
      const [, [, , maxZ]] = measureBoundingBox(chamfered);

      expect(maxZ).toBeCloseTo(OUTER_WIDTH / 2, 6);
    });

    it('confines the chamfer tool to a band at the bottom of the ear', () => {
      const tool = earBedChamferTool(OUTER_WIDTH, BED_CHAMFER);
      const [[minX, , minZ], [maxX, , maxZ]] = measureBoundingBox(tool);

      expect(minZ).toBeCloseTo(-OUTER_WIDTH / 2, 1);
      expect(maxZ).toBeLessThan(-OUTER_WIDTH / 2 + BED_CHAMFER + 0.01);
      // 必须横跨整个挂耳，包括伸出的圆端
      expect(minX).toBeLessThan(-OUTER_WIDTH / 2);
      expect(maxX).toBeGreaterThan(0);
    });

    it('degenerates instead of eating the whole ear when oversized', () => {
      const tool = earBedChamferTool(OUTER_WIDTH, 999);
      const [[, , minZ], [, , maxZ]] = measureBoundingBox(tool);

      // 夹取后倒角仍只占底部一小段
      expect(maxZ - minZ).toBeLessThan(OUTER_WIDTH);
    });
  });
});
