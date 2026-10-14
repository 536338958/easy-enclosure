import { Injectable, computed, signal } from '@angular/core';
import { DEFAULT_PARAMS, Params, cloneParams } from '../params';

@Injectable({ providedIn: 'root' })
export class EnclosureStateService {
  private readonly defaults = cloneParams(DEFAULT_PARAMS);

  readonly params = signal<Params>(cloneParams(this.defaults));
  readonly loading = signal(false);

  readonly holeCount = computed(() => this.params().holes.length);

  setLoading(isLoading: boolean): void {
    this.loading.set(isLoading);
  }

  setParams(next: Params): void {
    this.params.set(cloneParams(next));
  }

  patchParams(patch: Partial<Params>): void {
    this.params.update((current) => ({
      ...current,
      ...patch,
    }));
  }

  updateParam<K extends keyof Params>(key: K, value: Params[K]): void {
    this.params.update((current) => ({
      ...current,
      [key]: value,
    }));
  }

  resetToDefaults(): void {
    this.params.set(cloneParams(this.defaults));
    this.loading.set(false);
  }

  /**
   * 「简易外壳」：只保留一个空盒子，清掉所有可选附加件。
   *
   * 与上游 1.6.1 对齐 —— 上游会一并清掉 cableClamps / dinRailMount / snapFit /
   * pcbPreview，本分支之前漏了这四项，点了按钮之后线缆夹、DIN 挂夹、卡扣、PCB 预览
   * 还留在模型上，跟「简易」两个字对不上。
   * `ventilation`（散热通风）是本分支自有的附加件，同样该清。
   *
   * snapFit / pcbPreview 是对象，只关 `enabled`、保留里面的尺寸设置，
   * 免得用户重新打开时又要从头调一遍。
   */
  resetToSimpleEnclosure(): void {
    this.params.update((current) => ({
      ...current,
      holes: [],
      pcbMounts: [],
      internalWalls: [],
      cableClamps: [],
      ventilation: [],
      waterProof: false,
      wallMounts: false,
      lidScrews: false,
      dinRailMount: false,
      snapFit: {
        ...current.snapFit,
        enabled: false,
      },
      pcbPreview: {
        ...current.pcbPreview,
        enabled: false,
      },
    }));
  }
}
