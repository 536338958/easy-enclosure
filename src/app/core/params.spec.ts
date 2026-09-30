import { DEFAULT_PARAMS } from './params';
import {
  WALL_MOUNT_CHAMFER_DEFAULT,
  WALL_MOUNT_CHAMFER_MAX,
  WALL_MOUNT_CHAMFER_MIN,
} from './enclosure/wallmount';

// 这些断言把「单位 / 取值边界 / 默认值」钉在一处：
// UI 的 min/max、几何侧的 clamp、默认预设三者共用同一组常量，改任一侧都会在这里报错。
describe('params defaults', () => {
  it('ships with a small lid top edge chamfer', () => {
    expect(DEFAULT_PARAMS.lidTopChamfer).toBe(0.4);
  });

  it('uses a 2mm wall by default', () => {
    expect(DEFAULT_PARAMS.wall).toBe(2);
  });

  it('defaults the four bump snap preset to a 20 percent end offset', () => {
    expect(DEFAULT_PARAMS.snapFit.preset).toBe(4);
    expect(DEFAULT_PARAMS.snapFit.endPercent).toBe(20);
  });

  it('defaults the wall mount chamfer angle to 60 degrees', () => {
    expect(DEFAULT_PARAMS.wallMountChamferAngle).toBe(60);
    // 几何侧的默认值常量必须与预设同步，否则「重置」和「未传参调用」会给出不同结果
    expect(DEFAULT_PARAMS.wallMountChamferAngle).toBe(WALL_MOUNT_CHAMFER_DEFAULT);
  });

  it('defaults the base lid screw hole to drilling through', () => {
    // 与上游默认的 'blind' 不同：保留贯穿以免改变既有预设的默认成品
    expect(DEFAULT_PARAMS.lidScrewHoleType).toBe('through');
  });

  it('defaults the pcb mount root transition to a 1mm round fillet', () => {
    expect(DEFAULT_PARAMS.pcbMountFillet.style).toBe('round');
    expect(DEFAULT_PARAMS.pcbMountFillet.size).toBe(1);
  });

  it('restricts the wall mount chamfer angle to 45-70 degrees', () => {
    expect(WALL_MOUNT_CHAMFER_MIN).toBe(45);
    expect(WALL_MOUNT_CHAMFER_MAX).toBe(70);
  });

  it('keeps every chamfer angle default inside the allowed range', () => {
    [WALL_MOUNT_CHAMFER_DEFAULT, DEFAULT_PARAMS.wallMountChamferAngle].forEach((angle) => {
      expect(angle).toBeGreaterThanOrEqual(WALL_MOUNT_CHAMFER_MIN);
      expect(angle).toBeLessThanOrEqual(WALL_MOUNT_CHAMFER_MAX);
    });
  });
});
