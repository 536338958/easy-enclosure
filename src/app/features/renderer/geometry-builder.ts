import { Injectable } from '@angular/core';

import type { Params } from '../../core/params';
import { buildParts, type BuiltParts, type PartName } from './geometry-parts';
import type { BuildRequest, BuildResponse } from './geometry.worker';

/**
 * 几何构建服务（性能选项 A）。
 *
 * 优先走 Worker（重建期间主线程不冻结）；Worker 不可用（老浏览器 / 单测环境 /
 * 构造失败）时自动回退到主线程同步构建，行为与回退前完全一致。
 *
 * 线程模型：Worker 与主线程各自持有一份模块实例（含 quality.ts 的画质开关），
 * 因此每次请求都显式携带 interactive 标志，由 Worker 侧自行切换。
 */
@Injectable({ providedIn: 'root' })
export class GeometryBuilder {
  private worker: Worker | null = null;
  private workerBroken = false;
  private seq = 0;
  private pending = new Map<
    number,
    { resolve: (value: BuiltParts) => void; reject: (reason: Error) => void }
  >();

  /** 是否具备 Worker 通道（回退时为 false） */
  get usesWorker(): boolean {
    return this.worker !== null;
  }

  /** 惰性创建 Worker；失败一次后本实例永久走同步回退 */
  private ensureWorker(): Worker | null {
    if (this.workerBroken) {
      return null;
    }
    if (this.worker) {
      return this.worker;
    }
    if (typeof Worker === 'undefined') {
      this.workerBroken = true;
      return null;
    }
    try {
      const worker = new Worker(new URL('./geometry.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<BuildResponse>) => {
        const { seq, parts, collision, error } = event.data;
        const entry = this.pending.get(seq);
        this.pending.delete(seq);
        if (!entry) {
          return;
        }
        // Worker 内布尔抛错（参数极端时 JSCAD 失稳）：只拒绝这一个请求，
        // 不标记 workerBroken —— 调用方的 catch 会走主线程同步兜底
        if (error) {
          entry.reject(new Error(error));
          return;
        }
        entry.resolve({
          parts: parts as BuiltParts['parts'],
          collision: collision as BuiltParts['collision'],
        });
      };
      worker.onerror = () => {
        // Worker 出错：拒绝所有在途请求并永久回退（主线程重算）
        const error = new Error('geometry worker failed');
        this.pending.forEach((entry) => entry.reject(error));
        this.pending.clear();
        this.workerBroken = true;
        worker.terminate();
        this.worker = null;
      };
      this.worker = worker;
      return worker;
    } catch {
      this.workerBroken = true;
      return null;
    }
  }

  /**
   * 构建一组部件。Worker 可用时异步返回；否则同步构建并包成 Promise
   * （调用方一律按 Promise 处理）。
   */
  build(params: Params, parts: PartName[], interactive: boolean): Promise<BuiltParts> {
    const worker = this.ensureWorker();
    if (!worker) {
      // 同步回退：构建抛错转为 rejection（保持「永远返回 Promise」的 API 契约）
      try {
        return Promise.resolve(buildParts(params, parts, interactive));
      } catch (e) {
        return Promise.reject(e instanceof Error ? e : new Error(String(e)));
      }
    }
    const seq = ++this.seq;
    const request: BuildRequest = { seq, params, parts, interactive };
    return new Promise<BuiltParts>((resolve, reject) => {
      this.pending.set(seq, { resolve, reject });
      worker.postMessage(request);
    });
  }

  /** 组件销毁时调用：终止 Worker 并拒绝在途请求 */
  dispose(): void {
    this.pending.forEach((entry) => entry.reject(new Error('geometry builder disposed')));
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
  }
}
