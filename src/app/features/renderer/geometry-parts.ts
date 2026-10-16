import type { Geom3 } from '@jscad/modeling/src/geometries/types';

import type { Params } from '../../core/params';
import { base } from '../../core/enclosure/base';
import { cableClampTops, cableClamps, cableClampsOnBase, cableClampsOnLid } from '../../core/enclosure/clamp';
import { dinRailMountGeometry, dinRailMountsPair } from '../../core/enclosure/dinrailmount';
import { internalWalls } from '../../core/enclosure/internalwalls';
import { lid } from '../../core/enclosure/lid';
import { pcbCollision, type PCBCollisionResult } from '../../core/enclosure/pcbpreview';
import { pcbMountsOnBase, pcbMountsOnLid } from '../../core/enclosure/pcbmount';
import { isInteractiveQuality, setInteractiveQuality } from '../../core/enclosure/quality';
import { waterProofSeal } from '../../core/enclosure/waterproofseal';

/**
 * 可委托给 Worker 构建的部件。位置组装（平移到展示区）留在主线程 ——
 * 这里只产出**本地坐标系**下的几何。
 *
 * 渲染器与导出面板共用本清单：
 * - 渲染器要 lid/base/seal/baseMounts/lidMounts/internalWalls/cableClamps/dinRail（成对挂夹）；
 * - 导出面板还要 lidClamps / cableClampTops / dinRailSingle（单件挂夹，导出用）。
 */
export type PartName =
  | 'lid'
  | 'base'
  | 'seal'
  | 'baseMounts'
  | 'lidMounts'
  | 'internalWalls'
  | 'cableClamps'
  | 'lidClamps'
  | 'cableClampTops'
  | 'dinRail'
  | 'dinRailSingle'
  | 'collision';

export type BuiltParts = {
  parts: Partial<Record<Exclude<PartName, 'collision'>, Geom3>>;
  collision: PCBCollisionResult | null;
};

/**
 * 构建一组部件几何（纯函数，可在 Worker 或主线程执行）。
 *
 * `interactive` 为 true 时切到低段数模式（见 quality.ts）——拖动中的快模预览。
 * 注意：模块级画质开关是**按 realm** 的，Worker 里必须显式调用一次。
 */
export const buildParts = (
  params: Params,
  parts: PartName[],
  interactive: boolean,
): BuiltParts => {
  // 画质开关是模块级单例：构建期间切换、结束后恢复原值，
  // 避免污染同进程内的其他几何构建（单测里尤其致命）
  const prevInteractive = isInteractiveQuality();
  setInteractiveQuality(interactive);
  const out: BuiltParts = { parts: {}, collision: null };
  const want = (name: PartName): boolean => parts.includes(name);

  // lid / base 内部各自包含通风槽切割，无需单独请求
  if (want('lid')) {
    out.parts.lid = lid(params);
  }
  if (want('base')) {
    out.parts.base = base(params);
  }
  if (want('seal') && params.waterProof) {
    out.parts.seal = waterProofSeal(params);
  }
  if (want('baseMounts') && params.pcbMounts.length > 0) {
    out.parts.baseMounts = pcbMountsOnBase(params) ?? undefined;
  }
  if (want('lidMounts') && params.pcbMounts.length > 0) {
    out.parts.lidMounts = pcbMountsOnLid(params) ?? undefined;
  }
  if (want('internalWalls') && params.internalWalls.length > 0) {
    out.parts.internalWalls = internalWalls(params);
  }
  if (want('cableClamps') && (params.cableClamps?.length ?? 0) > 0) {
    out.parts.cableClamps = cableClamps(params) ?? undefined;
  }
  if (want('lidClamps') && (params.cableClamps?.length ?? 0) > 0) {
    out.parts.lidClamps = cableClampsOnLid(params) ?? undefined;
  }
  if (want('cableClampTops') && (params.cableClamps?.length ?? 0) > 0) {
    out.parts.cableClampTops = cableClampTops(params) ?? undefined;
  }
  if (want('dinRail') && params.dinRailMount && params.showDinRailMount) {
    out.parts.dinRail = dinRailMountsPair(params);
  }
  // 导出用的单件挂夹：不看 dinRailMount / showDinRailMount 开关
  // （导出面板勾了「DIN 挂夹」就要能导，即使预览里隐藏）
  if (want('dinRailSingle') && params.dinRailMount) {
    out.parts.dinRailSingle = dinRailMountGeometry(params);
  }
  if (want('collision') && params.pcbPreview.enabled) {
    out.collision = pcbCollision(params, out.parts.base);
  }
  setInteractiveQuality(prevInteractive);
  return out;
};
