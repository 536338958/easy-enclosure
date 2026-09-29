import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { geom2 } from '@jscad/modeling/src/geometries';
import { union } from '@jscad/modeling/src/operations/booleans';
import { extrudeRotate } from '@jscad/modeling/src/operations/extrusions';
import { rotateX, rotateY, translate } from '@jscad/modeling/src/operations/transforms';
import { degToRad } from '@jscad/modeling/src/utils';
import { Surface } from '.';
import { type Params, type PCBMount, type PcbMountFilletStyle } from '../params';
import { cavityFloorZ, innerWallInset } from './dimensions';

// 根部过渡的最小可打印尺寸：再小 FDM 打不出来，减应力效果也可忽略
export const MIN_MOUNT_FILLET = 0.4;
// 合理性上限：再大减应力收益已饱和，而底部外径持续增大
export const MAX_MOUNT_FILLET = 1.5;

/**
 * 计算某根支柱根部过渡的实际生效尺寸（mm），0 表示不做过渡。
 *
 * 上限取 `min(0.4×支柱高度, 0.5×外径, 1.5)`：
 * - 不超过柱高的 40%，保证柱身还有足够长度
 * - 不超过外径的一半，避免柱子变成锥形
 * - 1.5mm 之后减应力收益饱和
 */
export const mountFilletSize = (params: Params, mount: PCBMount): number => {
  const { style, size } = params.pcbMountFillet;
  if (style === 'none' || size <= 0) {
    return 0;
  }
  const upper = Math.max(
    Math.min(mount.height * 0.4, mount.outerDiameter * 0.5, MAX_MOUNT_FILLET),
    MIN_MOUNT_FILLET,
  );
  return Math.min(Math.max(size, MIN_MOUNT_FILLET), upper);
};

/**
 * 单根 PCB 支柱。
 *
 * 用旋转挤出生成：剖面是「内孔壁 → 底部过渡 → 柱身外壁」的闭合轮廓，
 * 绕 Z 轴旋一圈得到空心柱。这样根部过渡能和柱体一次成形，不必再做布尔减。
 * 剖面在 XZ 平面，x = 半径、y = 高度。
 */
export const pcbMount = (mountParams: PCBMount, params: Params): Geom3 => {
  const h = mountParams.height;
  const ro = Math.max(mountParams.outerDiameter / 2, 0.01);
  const ri = Math.min(Math.max(mountParams.screwDiameter / 2, 0.01), ro - 0.01);
  const fillet = mountFilletSize(params, mountParams);
  const style: PcbMountFilletStyle = params.pcbMountFillet.style;

  const points: Array<[number, number]> = [[ri, 0]];

  if (fillet > 0) {
    // 两种过渡的底部外扩量相同，区别只在轮廓：
    // 圆角走 1/4 圆弧（内凹，省料且减应力更好），斜角走 45° 直线
    points.push([ro + fillet, 0]);

    if (style === 'chamfer') {
      points.push([ro, fillet]);
    } else {
      const cx = ro + fillet;
      const cy = fillet;
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const t = (-90 - (90 * i) / steps) * (Math.PI / 180);
        points.push([cx + fillet * Math.cos(t), cy + fillet * Math.sin(t)]);
      }
      points.push([ro, fillet]);
    }
  } else {
    points.push([ro, 0]);
  }

  points.push([ro, h], [ri, h]);

  // 旋转挤出得到的是 z ∈ [0, h]，而调用方按「柱体中心在原点」摆放
  // （translate 到 baseFloor + height/2），所以这里要移回中心，保持契约一致
  return translate([0, 0, -h / 2], extrudeRotate({ segments: 32 }, geom2.fromPoints(points)));
};

const placeBaseMount = (mount: PCBMount, params: Params): Geom3 => {
  const { length, width, height } = params;
  const surface: Surface = mount.surface ?? 'bottom';
  const mountBody = pcbMount(mount, params);
  const innerWall = innerWallInset(params);
  const baseFloor = cavityFloorZ(params);
  // 统一偏移约定：mount.x = 面内水平偏移（+ 向 +X=左面 / 左右面时 + 向 +Y=前面），
  //   mount.y = 底面时纵向（+ 向 +Y=前面）；墙面时垂直（+ 向上）
  const bottomX = width / 2 + mount.x;
  const bottomY = length / 2 + mount.y;
  const wallX = width / 2 + mount.x;
  const wallY = length / 2 + mount.x;
  const wallZ = height / 2 + mount.y;

  if (surface === 'bottom') {
    return translate([bottomX, bottomY, baseFloor + mount.height / 2], mountBody);
  }

  if (surface === 'front') {
    return translate(
      [wallX, length - innerWall - mount.height / 2, wallZ],
      rotateX(degToRad(-90), mountBody),
    );
  }

  if (surface === 'back') {
    return translate(
      [wallX, innerWall + mount.height / 2, wallZ],
      rotateX(degToRad(90), mountBody),
    );
  }

  if (surface === 'right') {
    return translate(
      [innerWall + mount.height / 2, wallY, wallZ],
      rotateY(degToRad(-90), mountBody),
    );
  }

  return translate(
    [width - innerWall - mount.height / 2, wallY, wallZ],
    rotateY(degToRad(90), mountBody),
  );
};

const placeLidMount = (mount: PCBMount, params: Params): Geom3 => {
  const { length, width, roof } = params;
  return translate(
    [width / 2 + mount.x, length / 2 + mount.y, roof + mount.height / 2],
    pcbMount(mount, params),
  );
};

const buildMountUnion = (mounts: Geom3[]): Geom3 | null => {
  if (mounts.length === 0) {
    return null;
  }

  return mounts.length === 1 ? mounts[0] : union(mounts);
};

export const pcbMountsOnBase = (params: Params): Geom3 | null => {
  const mounts = params.pcbMounts
    .filter((mount) => (mount.surface ?? 'bottom') !== 'top')
    .map((mount) => placeBaseMount(mount, params));

  return buildMountUnion(mounts);
};

export const pcbMountsOnLid = (params: Params): Geom3 | null => {
  const mounts = params.pcbMounts
    .filter((mount) => (mount.surface ?? 'bottom') === 'top')
    .map((mount) => placeLidMount(mount, params));

  return buildMountUnion(mounts);
};

export const pcbMounts = (params: Params): Geom3 | null => {
  const baseMounts = pcbMountsOnBase(params);
  const lidMounts = pcbMountsOnLid(params);
  const mounts = [baseMounts, lidMounts].filter((item): item is Geom3 => item !== null);

  if (mounts.length === 0) {
    return null;
  }

  return mounts.length === 1 ? mounts[0] : union(mounts);
};
