import { rotate, translate } from '@jscad/modeling/src/operations/transforms';
import { degToRad } from '@jscad/modeling/src/utils';
import { cuboid, cylinder } from '@jscad/modeling/src/primitives';
import { intersect, union } from '@jscad/modeling/src/operations/booleans';
import { hull } from '@jscad/modeling/src/operations/hulls';

import { Params } from '../params';
import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { Vec3 } from '@jscad/modeling/src/maths/types';
import { cavityFloorZ } from './dimensions';
import { Surface, SURFACES } from '.';

const TOP_HOLE_DEPTH_TOLERANCE = 0.2;

/**
 * 侧面 / 底面开孔的贯穿余量（mm），孔深在壁厚之上两端各多切这么多。
 *
 * 防水开启时壁厚正好等于 `totalWallThickness`，若孔深也取同一个值，孔的上下端面
 * 会与壁的内外表面**严格齐平** —— 这是布尔运算的退化情形，端面共面时外表面有
 * 可能保留下来（表现为「孔没打穿」，只剩一层膜）。防水关闭时壁厚只有 wall、
 * 孔深远大于它，属于超挖，所以反而看不出问题。
 *
 * 往两端各多切一点：外侧切到空气里、内侧切进腔内，都不影响成品，但能保证孔在
 * 任何参数组合下都真正贯穿。顶面同理，见 TOP_HOLE_DEPTH_TOLERANCE。
 *
 * ⭐ 经用户切片实测：加此余量后 BambuStudio 的「空层 9~12.2」警告消失。
 */
const SIDE_HOLE_DEPTH_TOLERANCE = 0.2;

// —— 不透孔（blind）——
// 盲孔切割体从外壁向外多伸这么多，打破与外壁面的共面（共面留残渣，本项目血泪规则）
const HOLE_BLIND_TOLERANCE = 0.2;
// 盲孔深度的下限（太浅打不出来）
const HOLE_BLIND_MIN_DEPTH = 0.2;
// 盲孔底最少保留的壁厚，保证孔底不打穿
const HOLE_BLIND_RESIDUAL = 0.4;
// 孔口 45° 导入倒角的宽度（mm）
const HOLE_CHAMFER_SIZE = 0.6;

export const holes = (
  params: Params,
  surfacesFilter: Surface[] = ['bottom', 'left', 'right', 'back', 'front'],
) => {
  const {
    length,
    width,
    height,
    roof,
    floor,
    wall,
    insertHeight,
    insertThickness,
    insertClearance,
    waterProof,
    holes: holeParams,
  } = params;

  let result: Geom3[] = [];
  SURFACES.forEach((surface) => {
    const surfaceHoles = holeParams.filter((spec) => {
      if (surfacesFilter.includes(surface) && spec.surface === surface) {
        return spec;
      } else {
        return false;
      }
    });

    surfaceHoles.forEach((hole, i) => {
      let x: number;
      let y: number;
      let z: number;
      let rot: Vec3;

      const totalWallThickness = insertThickness + insertClearance * 2 + wall * 2;
      // 两端各留一点余量，避免防水开启时孔端面与壁面齐平而打不穿
      let holeDepth = totalWallThickness + SIDE_HOLE_DEPTH_TOLERANCE * 2;

      // 不透孔：由外壁向内只钻 blindDepth。
      // 各面的「外壁」：前→y=length、后→y=0、右→x=width、左→x=0、底→z=0、盖板顶→z=0。
      // 深度夹紧到 [0.2, 壁厚−0.4]，保证孔底留在壁内不打穿；壁厚太薄时退化为壁厚的一半。
      const isBlind = (hole.holeType ?? 'through') === 'blind';
      let blindDepth = 0;
      if (isBlind) {
        const maxDepth =
          surface === 'top'
            ? roof
            : surface === 'bottom'
              ? floor
              : params.waterProof
                ? totalWallThickness
                : wall;
        const hi = maxDepth - HOLE_BLIND_RESIDUAL;
        const req = hole.blindDepth ?? Math.max(maxDepth / 2, HOLE_BLIND_MIN_DEPTH);
        blindDepth =
          hi >= HOLE_BLIND_MIN_DEPTH
            ? Math.min(Math.max(req, HOLE_BLIND_MIN_DEPTH), hi)
            : Math.max(maxDepth / 2, HOLE_BLIND_MIN_DEPTH);
      }

      // 统一偏移约定（与通风槽一致）：
      //   hole.x = 面内「水平」偏移，+ 指向 +世界轴（前/后面→+X=左面；左/右面→+Y=前面）
      //   hole.y = 面内「垂直/纵向」偏移（墙面→+Z 向上；顶/底面→+Y 向前面）
      if (surface === 'front') {
        y = length - totalWallThickness / 2;
        x = width / 2 + hole.x;
        z = height / 2 + hole.y;
        rot = [degToRad(90), 0, 0];
      } else if (surface === 'right') {
        x = totalWallThickness / 2;
        y = length / 2 + hole.x;
        z = height / 2 + hole.y;
        if (hole.shape === 'circle') {
          rot = [0, degToRad(90), 0];
        } else {
          rot = [degToRad(90), 0, degToRad(90)];
        }
      } else if (surface === 'back') {
        y = totalWallThickness / 2;
        x = width / 2 + hole.x;
        z = height / 2 + hole.y;
        rot = [degToRad(90), 0, 0];
      } else if (surface === 'left') {
        x = width - totalWallThickness / 2;
        y = length / 2 + hole.x;
        z = height / 2 + hole.y;
        if (hole.shape === 'circle') {
          rot = [0, degToRad(90), 0];
        } else {
          rot = [degToRad(90), 0, degToRad(90)];
        }
      } else if (surface === 'bottom' || surface === 'top') {
        x = width / 2 + hole.x;
        y = length / 2 + hole.y;
        z = 0;
        if (surface === 'top') {
          holeDepth = roof + insertHeight + TOP_HOLE_DEPTH_TOLERANCE;
          z = holeDepth / 2;
        } else if (!isBlind) {
          // 底面透孔：按底板真实厚度取深并在 z 向居中（上游 62b0a89 同修）。
          // 底板厚度两条路径不同：lidScrews=true → floor；false → innerWallInset
          //（内腔底在 z=_wall，floor 不生效）——必须用 cavityFloorZ，
          // 否则 lidScrews=false 时底板（约 6mm）比切割体（floor+0.4）厚，孔打不穿。
          // 旧实现 z=0 起切还有共面残膜风险；盲孔走下方独立定位，不在此列。
          const slab = cavityFloorZ(params);
          holeDepth = slab + SIDE_HOLE_DEPTH_TOLERANCE * 2;
          z = slab / 2;
        }
        rot = [0, 0, 0];
      } else {
        throw new Error(`Invalid surface: ${surface}`);
      }

      // 不透孔：覆盖切割深度与穿透轴上的定位 —— 切割体从外壁向外伸 TOL、
      // 向内只到 blindDepth，孔底（平底）留在壁内。
      // 注意左右面的几何归属与透孔一致：right 的切割体在 x≈0 一侧、left 在 x≈width 一侧
      if (isBlind) {
        holeDepth = blindDepth + HOLE_BLIND_TOLERANCE;
        if (surface === 'front') {
          y = length + (HOLE_BLIND_TOLERANCE - blindDepth) / 2;
        } else if (surface === 'back') {
          y = (blindDepth - HOLE_BLIND_TOLERANCE) / 2;
        } else if (surface === 'right') {
          x = (blindDepth - HOLE_BLIND_TOLERANCE) / 2;
        } else if (surface === 'left') {
          x = width + (HOLE_BLIND_TOLERANCE - blindDepth) / 2;
        } else {
          // bottom / top：外壁都在 z = 0
          z = (blindDepth - HOLE_BLIND_TOLERANCE) / 2;
        }
      }

      // 孔口倒角：45° 导入锥，在外壁孔口扩一圈（宽 HOLE_CHAMFER_SIZE）。
      // ⚠️ 仅方孔 / 矩形孔支持：圆孔的倒角锥是 24 段级曲面，每个要多 ~110 三角形，
      // holes() 的 union 成本随总三角形数近似平方增长，实测 12 个圆孔倒角就让
      // base() 重建 +60%（见 docs/HOLE-CHAMFER-PERF.md）——圆孔倒角已按用户决定关闭。
      // 规范姿态：孔轴沿 Z、外壁在 z=0、材料在 +Z。
      // 用单个 cylinderElliptic 直锥：45° 线穿过 (z=0, r+c) 与 (z=c, r)，
      // 并沿 45° 继续向外伸 TOL 到空气里（破共面，且锥面在 z=0 处半径恰为 r+c）。
      // back / left 的旋转把规范 +Z 映向「朝外」，锥体需翻转（大口仍朝外）。
      // 段数 16：0.6mm 宽的装饰性倒角上弦高误差 <0.08mm 不可见，
      // 但能让倒角锥的三角形数（进而 holes() 的 union 成本）降 ~1/3 —— 见 docs/HOLE-CHAMFER-PERF.md
      if (hole.chamfer && hole.shape !== 'circle' && hole.shape !== 'double-d') {
        // 倒角宽度按孔设置（缺省 0.6），夹紧 [0.2, 2]；
        // 盲孔再夹到孔深以内 —— 锥体切穿盲孔底等于把孔加深
        const c = Math.min(
          Math.max(hole.chamferSize ?? HOLE_CHAMFER_SIZE, HOLE_BLIND_MIN_DEPTH),
          isBlind ? Math.max(blindDepth, HOLE_BLIND_MIN_DEPTH) : 2,
        );
        let outer: [number, number, number];
        if (surface === 'front') {
          outer = [x, length, z];
        } else if (surface === 'back') {
          outer = [x, 0, z];
        } else if (surface === 'right') {
          outer = [0, y, z];
        } else if (surface === 'left') {
          outer = [width, y, z];
        } else {
          outer = [x, y, 0];
        }
        const bigEndAtMinusZ = surface !== 'back' && surface !== 'left';
        const zBig = bigEndAtMinusZ ? -HOLE_BLIND_TOLERANCE / 2 : HOLE_BLIND_TOLERANCE / 2;
        const zSmall = bigEndAtMinusZ ? c - 0.01 : -(c - 0.01);
        const inPlane = hole.shape === 'rectangle' ? hole.length : hole.width;
        const ch = hull(
          translate(
            [0, 0, zBig],
            cuboid({ size: [hole.width + 2 * c, inPlane + 2 * c, HOLE_BLIND_TOLERANCE] }),
          ),
          translate([0, 0, zSmall], cuboid({ size: [hole.width, inPlane, 0.02] })),
        );
        result.push(translate(outer, rotate(rot, ch)));
      }

      if (hole.shape === 'square') {
        result.push(
          translate(
            [x, y, z],
            rotate(
              rot,
              cuboid({
                size: [hole.width, hole.width, holeDepth],
              }),
            ),
          ),
        );
      } else if (hole.shape === 'rectangle') {
        result.push(
          translate(
            [x, y, z],
            rotate(
              rot,
              cuboid({
                size: [hole.width, hole.length, holeDepth],
              }),
            ),
          ),
        );
      } else if (hole.shape === 'circle') {
        result.push(
          translate(
            [x, y, z],
            rotate(
              rot,
              cylinder({
                radius: hole.diameter / 2,
                height: holeDepth,
              }),
            ),
          ),
        );
      } else if (hole.shape === 'double-d') {
        // Double D 防旋转孔（对齐上游 a16d265）：圆柱 ∩ 扁方盒 = 两条平行切边。
        // flatWidth ≥ diameter 时退化为整圆（与上游一致）；rotation 绕孔轴转切边方向。
        const diameter = Math.max(0.1, hole.diameter);
        const radius = diameter / 2;
        const flatW =
          hole.flatWidth !== undefined && hole.flatWidth > 0
            ? Math.min(hole.flatWidth, diameter)
            : diameter * 0.9;
        let cutter = cylinder({
          radius,
          height: holeDepth,
        });
        if (flatW < diameter) {
          const flatBox = cuboid({
            size: [diameter * 2, flatW, holeDepth + 2],
          });
          cutter = intersect(cutter, flatBox);
        }
        if (hole.rotation) {
          cutter = rotate([0, 0, degToRad(hole.rotation)], cutter);
        }
        result.push(translate([x, y, z], rotate(rot, cutter)));
      }
    });
  });

  return union(result);
};
