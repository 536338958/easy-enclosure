/// <reference lib="webworker" />

/**
 * 几何构建 Worker（性能选项 A）：把 base()/lid() 等布尔运算从主线程搬走，
 * 重建期间 UI 不冻结。Worker 只做薄壳 —— 全部逻辑在同目录的 geometry-parts.ts
 * （纯函数，单测直接打它，不依赖 Worker 环境）。
 */
import { buildParts, type PartName } from './geometry-parts';

export interface BuildRequest {
  seq: number;
  params: unknown;
  parts: PartName[];
  interactive: boolean;
}

export interface BuildResponse {
  seq: number;
  parts: unknown;
  collision: unknown;
}

self.onmessage = (event: MessageEvent<BuildRequest>) => {
  const { seq, params, parts, interactive } = event.data;
  const built = buildParts(params as Parameters<typeof buildParts>[0], parts, interactive);
  const response: BuildResponse = {
    seq,
    parts: built.parts,
    collision: built.collision,
  };
  (self as unknown as Worker).postMessage(response);
};
