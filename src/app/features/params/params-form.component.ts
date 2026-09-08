import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import type {
  Hole,
  InternalWall,
  PCBMount,
  PCBPreview,
  Params,
  SnapFit,
  Ventilation,
} from '../../core/params';
import { EnclosureStateService } from '../../core/state/enclosure-state.service';

type Surface = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

@Component({
  selector: 'app-params-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './params-form.component.html',
  styleUrl: './params-form.component.css',
})
export class ParamsFormComponent {
  private readonly state = inject(EnclosureStateService);

  readonly activeTab = signal<number | null>(null);

  readonly surfaces: Surface[] = ['front', 'right', 'back', 'left', 'top', 'bottom'];

  surfaceLabel(surface: Surface): string {
    const labels: Record<Surface, string> = {
      top: '盖板',
      bottom: '底面',
      left: '左面',
      right: '右面',
      front: '前面',
      back: '后面',
    };
    return labels[surface];
  }

  // 面内「水平」偏移标签：前/后面沿宽度(左右)，左/右面沿长度(前后)，顶/底面沿宽度(左右)
  offsetHLabel(surface: Surface): string {
    if (surface === 'left' || surface === 'right') {
      return '水平偏移 X（+ 向前面）';
    }
    return '左右偏移 X（+ 向左面）';
  }

  // 面内「垂直/纵向」偏移标签：墙面为高度方向(上下)，顶/底面为长度方向(前后)
  offsetVLabel(surface: Surface): string {
    if (surface === 'top' || surface === 'bottom') {
      return '前后偏移 Y（+ 向前面）';
    }
    return '垂直偏移 Y（+ 向上）';
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
    // 切换预设时同步更新离端默认百分比（4→10%，6/8→20%）
    const endPercent = preset === 4 ? 10 : 20;
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
