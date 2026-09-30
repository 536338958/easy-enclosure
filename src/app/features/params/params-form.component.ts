import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import type {
  DinRailOrientation,
  Hole,
  InternalWall,
  PCBMount,
  PCBPreview,
  Params,
  SnapFit,
  Ventilation,
} from '../../core/params';
import { EnclosureStateService } from '../../core/state/enclosure-state.service';
import {
  screwDiameterMax,
  screwOffset,
  screwPostProtrusion,
} from '../../core/enclosure/dimensions';
import { mountFilletSize } from '../../core/enclosure/pcbmount';
import { WALL_MOUNT_CHAMFER_MAX, WALL_MOUNT_CHAMFER_MIN } from '../../core/enclosure/wallmount';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/translations';

type Surface = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

/** 错误提示只存 key + 插值变量，切换语言后已显示的提示同样会跟着变 */
type MessageState = { key: TranslationKey; vars: Record<string, string | number> };

@Component({
  selector: 'app-params-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './params-form.component.html',
  styleUrl: './params-form.component.css',
})
export class ParamsFormComponent {
  private readonly state = inject(EnclosureStateService);
  private readonly i18n = inject(I18nService);

  readonly activeTab = signal<number | null>(null);

  readonly surfaces: Surface[] = ['front', 'right', 'back', 'left', 'top', 'bottom'];

  readonly chamferAngleMin = WALL_MOUNT_CHAMFER_MIN;
  readonly chamferAngleMax = WALL_MOUNT_CHAMFER_MAX;

  private readonly chamferAngleErrorState = signal<MessageState | null>(null);
  readonly chamferAngleError = computed(() => {
    const state = this.chamferAngleErrorState();
    return state ? this.i18n.t(state.key, state.vars) : null;
  });

  t(key: TranslationKey, vars?: Record<string, string | number>): string {
    return this.i18n.t(key, vars);
  }

  // 螺丝柱凸出量的实际生效值（自定义值会被夹到允许区间，这里回显结果）
  effectiveScrewProtrusion(): number {
    return Math.round(screwPostProtrusion(this.params()) * 100) / 100;
  }

  // 螺丝孔中心距边距离的实际生效值。默认跟随内缩量，可单独覆盖。
  // 上限用 screwDiameterMax：螺母槽模式下要按螺母外接圆留出余量，否则孔会啃到槽壁
  effectiveScrewOffset(): number {
    const params = this.params();
    return Math.round(screwOffset(params, screwDiameterMax(params)) * 100) / 100;
  }

  /**
   * 挂耳切角角度只接受 45–70°。越界时不写入参数、给出提示，
   * 由模板把输入框回退到当前生效值，做到「阻止提交」。
   */
  setChamferAngle(rawValue: string): void {
    const current = this.params().wallMountChamferAngle;
    const range = { min: this.chamferAngleMin, max: this.chamferAngleMax };

    if (!rawValue) {
      this.chamferAngleErrorState.set(null);
      return;
    }

    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) {
      this.chamferAngleErrorState.set({ key: 'params.wallMountChamferNotNumber', vars: {} });
      return;
    }

    if (parsed < this.chamferAngleMin || parsed > this.chamferAngleMax) {
      this.chamferAngleErrorState.set({
        key: 'params.wallMountChamferError',
        vars: { ...range, current },
      });
      return;
    }

    this.chamferAngleErrorState.set(null);
    this.state.updateParam('wallMountChamferAngle', parsed);
  }

  surfaceLabel(surface: Surface): string {
    return this.t(`surface.${surface}`);
  }

  // 面内「水平」偏移标签：前/后面沿宽度(左右)，左/右面沿长度(前后)，顶/底面沿宽度(左右)
  offsetHLabel(surface: Surface): string {
    if (surface === 'left' || surface === 'right') {
      return this.t('params.offsetHSide');
    }
    return this.t('params.offsetXLeft');
  }

  // 面内「垂直/纵向」偏移标签：墙面为高度方向(上下)，顶/底面为长度方向(前后)
  offsetVLabel(surface: Surface): string {
    if (surface === 'top' || surface === 'bottom') {
      return this.t('params.offsetYFront');
    }
    return this.t('params.offsetVSide');
  }

  params(): Params {
    return this.state.params();
  }

  setActiveTab(tab: number): void {
    this.activeTab.set(this.activeTab() === tab ? null : tab);
  }

  resetToSimpleEnclosure(): void {
    this.state.resetToSimpleEnclosure();
    this.activeTab.set(1);
  }

  setNumberParam<K extends keyof Params>(key: K, rawValue: string): void {
    if (!rawValue) {
      return;
    }
    const parsed = parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      this.state.updateParam(key, parsed as Params[K]);
    }
  }

  setBooleanParam<K extends keyof Params>(key: K, checked: boolean): void {
    this.state.updateParam(key, checked as Params[K]);
  }

  /** 下拉框之类的字符串型参数（几何里用联合类型收窄，这里只做透传） */
  setStringParam<K extends keyof Params>(key: K, rawValue: string): void {
    if (!rawValue) {
      return;
    }
    this.state.updateParam(key, rawValue as Params[K]);
  }

  dinRailOrientations: DinRailOrientation[] = ['horizontal', 'vertical'];

  dinRailOrientationLabel(orientation: DinRailOrientation): string {
    return this.t(`params.dinRailOrientation.${orientation}`);
  }

  // 开启挂夹时顺手把预览显示打开，避免「生成了却看不见」
  onDinRailMountChange(checked: boolean): void {
    this.state.patchParams(
      checked ? { dinRailMount: true, showDinRailMount: true } : { dinRailMount: false },
    );
  }

  addHole(): void {
    const current = this.params();
    const next: Hole = {
      shape: 'circle',
      surface: 'front',
      diameter: 12.5,
      width: 10,
      length: 10,
      y: 0,
      x: 0,
    };
    this.state.patchParams({ holes: [...current.holes, next] });
  }

  removeHole(index: number): void {
    const current = this.params();
    this.state.patchParams({ holes: current.holes.filter((_, i) => i !== index) });
  }

  updateHole(index: number, patch: Partial<Hole>): void {
    const current = this.params();
    this.state.patchParams({
      holes: current.holes.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  addPcbMount(): void {
    const current = this.params();
    const next: PCBMount = {
      surface: 'bottom',
      x: 0,
      y: 0,
      height: 5,
      outerDiameter: 6,
      screwDiameter: 2,
    };
    this.state.patchParams({ pcbMounts: [...current.pcbMounts, next] });
  }

  removePcbMount(index: number): void {
    const current = this.params();
    this.state.patchParams({ pcbMounts: current.pcbMounts.filter((_, i) => i !== index) });
  }

  updatePcbMount(index: number, patch: Partial<PCBMount>): void {
    const current = this.params();
    this.state.patchParams({
      pcbMounts: current.pcbMounts.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  addInternalWall(): void {
    const current = this.params();
    const next: InternalWall = {
      x: 0,
      y: 0,
      height: 10,
      length: 25,
      thickness: 2,
      rotation: 0,
    };
    this.state.patchParams({ internalWalls: [...current.internalWalls, next] });
  }

  removeInternalWall(index: number): void {
    const current = this.params();
    this.state.patchParams({ internalWalls: current.internalWalls.filter((_, i) => i !== index) });
  }

  updateInternalWall(index: number, patch: Partial<InternalWall>): void {
    const current = this.params();
    this.state.patchParams({
      internalWalls: current.internalWalls.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }

  onWaterproofChange(checked: boolean): void {
    this.state.patchParams({
      waterProof: checked,
      lidScrews: checked ? true : this.params().lidScrews,
    });
  }

  onLidScrewsChange(checked: boolean): void {
    this.state.patchParams({
      lidScrews: checked,
      waterProof: checked ? this.params().waterProof : false,
    });
  }

  setPcbPreviewEnabled(checked: boolean): void {
    const current = this.params();
    this.state.patchParams({ pcbPreview: { ...current.pcbPreview, enabled: checked } });
  }

  setPcbPreviewNumber(key: keyof PCBPreview, rawValue: string): void {
    if (!rawValue) {
      return;
    }
    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) {
      return;
    }
    const current = this.params();
    this.state.patchParams({ pcbPreview: { ...current.pcbPreview, [key]: parsed } });
  }

  addVentilation(): void {
    const current = this.params();
    const next: Ventilation = {
      surface: 'top',
      orientation: 'horizontal',
      slotWidth: 2,
      slotLength: 0,
      slotGap: 2,
      slotCount: 8,
      x: 0,
      y: 0,
    };
    this.state.patchParams({ ventilation: [...current.ventilation, next] });
  }

  removeVentilation(index: number): void {
    const current = this.params();
    this.state.patchParams({ ventilation: current.ventilation.filter((_, i) => i !== index) });
  }

  updateVentilation(index: number, patch: Partial<Ventilation>): void {
    const current = this.params();
    this.state.patchParams({
      ventilation: current.ventilation.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }

  setPcbMountFilletStyle(style: string): void {
    if (style !== 'none' && style !== 'round' && style !== 'chamfer') {
      return;
    }
    const current = this.params();
    this.state.patchParams({
      pcbMountFillet: { ...current.pcbMountFillet, style },
    });
  }

  setPcbMountFilletSize(rawValue: string): void {
    if (!rawValue) {
      return;
    }
    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) {
      return;
    }
    const current = this.params();
    this.state.patchParams({
      pcbMountFillet: { ...current.pcbMountFillet, size: Math.max(0, parsed) },
    });
  }

  // 根部过渡的实际生效尺寸：受支柱高度与外径夹紧，取所有支柱里最小的那个
  effectiveMountFillet(): number {
    const params = this.params();
    if (params.pcbMountFillet.style === 'none' || params.pcbMounts.length === 0) {
      return 0;
    }
    const sizes = params.pcbMounts.map((mount) => mountFilletSize(params, mount));
    return Math.round(Math.min(...sizes) * 100) / 100;
  }

  setSnapFitEnabled(checked: boolean): void {
    const current = this.params();
    this.state.patchParams({ snapFit: { ...current.snapFit, enabled: checked } });
  }

  setSnapFitPreset(rawValue: string): void {
    const preset = parseInt(rawValue, 10) as SnapFit['preset'];
    if (preset !== 4 && preset !== 6 && preset !== 8) {
      return;
    }
    const current = this.params();
    // 切换预设时同步更新离端部百分比默认值：4 个卡扣为 20%，6 / 8 个维持 20%
    const endPercent = 20;
    this.state.patchParams({ snapFit: { ...current.snapFit, preset, endPercent } });
  }

  setSnapFitNumber(key: keyof SnapFit, rawValue: string): void {
    if (!rawValue) {
      return;
    }
    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) {
      return;
    }
    const current = this.params();
    this.state.patchParams({ snapFit: { ...current.snapFit, [key]: parsed } });
  }

  parseIntValue(rawValue: string): number {
    return parseInt(rawValue, 10);
  }
}
