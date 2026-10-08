import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import type {
  CableClamp,
  Hole,
  InternalWall,
  PCBMount,
  Params,
  PCBPreview,
  SnapFit,
  Ventilation,
} from '../../core/params';
import { DEFAULT_CABLE_CLAMP, DEFAULT_VENTILATION } from '../../core/params';
import { EnclosureStateService } from '../../core/state/enclosure-state.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/translations';
import { WALL_MOUNT_CHAMFER_MAX, WALL_MOUNT_CHAMFER_MIN } from '../../core/enclosure/wallmount';
import { getScrewOffset } from '../../core/enclosure/screws';

type Surface = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

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

  surfaceLabel(surface: Surface): string {
    if (surface === 'top') {
      return 'Lid';
    }
    return surface[0].toUpperCase() + surface.slice(1);
  }

  t(key: TranslationKey, vars?: Record<string, string | number>): string {
    return this.i18n.t(key, vars);
  }

  readonly chamferAngleMin = WALL_MOUNT_CHAMFER_MIN;
  readonly chamferAngleMax = WALL_MOUNT_CHAMFER_MAX;

  /** 切角角度越界时的提示（null 表示无错误）；模板据此把输入框回退到生效值 */
  readonly chamferAngleErrorState = signal<{
    key: TranslationKey;
    vars: Record<string, string | number>;
  } | null>(null);

  /** 孔位距边的实际生效值（夹紧之后），用于提示文案里的对照 */
  effectiveScrewOffset(): number {
    return Math.round(getScrewOffset(this.params()) * 100) / 100;
  }

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

  /** 所在面的名称（跟随当前语言） */
  ventSurfaceLabel(surface: Surface): string {
    switch (surface) {
      case 'top':
        return this.t('surface.top');
      case 'bottom':
        return this.t('surface.bottom');
      case 'left':
        return this.t('surface.left');
      case 'right':
        return this.t('surface.right');
      case 'front':
        return this.t('surface.front');
      default:
        return this.t('surface.back');
    }
  }

  addVentilation(): void {
    const current = this.params();
    const next: Ventilation = { ...DEFAULT_VENTILATION };
    this.state.patchParams({ ventilation: [...(current.ventilation ?? []), next] });
  }

  removeVentilation(index: number): void {
    const current = this.params();
    this.state.patchParams({
      ventilation: (current.ventilation ?? []).filter((_, i) => i !== index),
    });
  }

  updateVentilation(index: number, patch: Partial<Ventilation>): void {
    const current = this.params();
    this.state.patchParams({
      ventilation: (current.ventilation ?? []).map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
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

  addHole(): void {
    const current = this.params();
    const next: Hole = {
      shape: 'circle',
      surface: 'front',
      diameter: 12.5,
      width: 10,
      length: 10,
      y: current.width / 2,
      x: 6,
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

  addCableClamp(): void {
    const current = this.params();
    const next: CableClamp = {
      ...DEFAULT_CABLE_CLAMP,
    };
    this.state.patchParams({ cableClamps: [...(current.cableClamps ?? []), next] });
  }

  removeCableClamp(index: number): void {
    const current = this.params();
    this.state.patchParams({
      cableClamps: (current.cableClamps ?? []).filter((_, i) => i !== index),
    });
  }

  updateCableClamp(index: number, patch: Partial<CableClamp>): void {
    const current = this.params();
    this.state.patchParams({
      cableClamps: (current.cableClamps ?? []).map((item, i) =>
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

  setStringParam<K extends keyof Params>(key: K, value: Params[K]): void {
    this.state.updateParam(key, value);
  }

  onDinRailMountChange(checked: boolean): void {
    this.state.patchParams({
      dinRailMount: checked,
      wallMounts: checked ? true : this.params().wallMounts,
    });
  }

  parseIntValue(rawValue: string): number {
    return parseInt(rawValue, 10);
  }

  setSnapFitEnabled(enabled: boolean): void {
    const current = this.params();
    this.state.patchParams({
      snapFit: {
        ...current.snapFit,
        enabled,
      },
    });
  }

  setSnapFitPreset(rawValue: string): void {
    const preset = parseInt(rawValue, 10);
    if (preset === 4 || preset === 6 || preset === 8) {
      const current = this.params();
      this.state.patchParams({
        snapFit: {
          ...current.snapFit,
          preset,
        },
      });
    }
  }

  setSnapFitNumber<K extends keyof SnapFit>(key: K, rawValue: string): void {
    if (!rawValue) {
      return;
    }
    const parsed = parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      const current = this.params();
      this.state.patchParams({
        snapFit: {
          ...current.snapFit,
          [key]: parsed,
        },
      });
    }
  }

  setPcbPreviewEnabled(checked: boolean): void {
    const current = this.params();
    this.state.patchParams({
      pcbPreview: {
        ...current.pcbPreview,
        enabled: checked,
      },
    });
  }

  setPcbPreviewNumber<K extends Exclude<keyof PCBPreview, 'enabled'>>(
    key: K,
    rawValue: string,
  ): void {
    if (!rawValue) {
      return;
    }
    const parsed = parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      const current = this.params();
      this.state.patchParams({
        pcbPreview: {
          ...current.pcbPreview,
          [key]: parsed,
        },
      });
    }
  }
}
