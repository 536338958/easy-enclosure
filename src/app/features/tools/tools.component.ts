import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { union } from '@jscad/modeling/src/operations/booleans';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

import {
  STL_FORMAT,
  type ExportFormatDefinition,
  type ExportFormatId,
} from '../../core/export/export-format';
import { ExportFormatService } from '../../core/export/export-format.service';

import { GeometryBuilder } from '../renderer/geometry-builder';
import type { BuiltParts, PartName } from '../renderer/geometry-parts';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/translations';
import type { Params } from '../../core/params';
import { EnclosureStateService } from '../../core/state/enclosure-state.service';
import { ActionButtonComponent } from '../../shared/action-button/action-button.component';

@Component({
  selector: 'app-tools',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActionButtonComponent],
  templateUrl: './tools.component.html',
})
export class ToolsComponent {
  @ViewChild('fileInput')
  fileInput?: ElementRef<HTMLInputElement>;

  @ViewChild('exportDialog')
  exportDialog?: ElementRef<HTMLDialogElement>;

  private readonly state = inject(EnclosureStateService);
  private readonly i18n = inject(I18nService);
  private readonly exportFormatService = inject(ExportFormatService);
  // 几何构建委托给 GeometryBuilder（worker 优先，自动回退同步）
  private readonly geometry = inject(GeometryBuilder);

  readonly isExportModalOpen = signal(false);
  readonly isExporting = signal(false);

  // 导出格式（stl / step）统一走 ExportFormatService 序列化
  readonly supportedFormats = this.exportFormatService.formats;
  readonly exportFormat = signal<ExportFormatId>('stl');
  readonly selectedFormat = computed<ExportFormatDefinition>(
    () =>
      this.exportFormatService.getFormat(this.exportFormat()) ??
      this.supportedFormats()[0] ??
      STL_FORMAT,
  );

  setExportFormat(format: ExportFormatId): void {
    if (this.exportFormatService.getFormat(format)) {
      this.exportFormat.set(format);
    }
  }

  // 存的是文案 key 而不是成品字符串：切换语言时已显示的错误提示要跟着变
  private readonly loadErrorKey = signal<TranslationKey | null>(null);
  readonly loadError = computed(() => {
    const key = this.loadErrorKey();
    return key ? this.i18n.t(key) : null;
  });

  // 只有当前参数下真实存在的部件才给勾选
  readonly hasSeal = computed(() => this.state.params().waterProof);
  readonly hasDinRailMount = computed(() => this.state.params().dinRailMount);
  readonly hasPcbMounts = computed(() => this.state.params().pcbMounts.length > 0);
  readonly hasCableClamps = computed(() => (this.state.params().cableClamps?.length ?? 0) > 0);

  readonly exportBase = signal(true);
  readonly exportLid = signal(true);
  readonly exportSeal = signal(true);
  // 支柱已经并进基座 / 盖板里了，默认不再单独导出一份
  readonly exportPcbMounts = signal(false);
  readonly exportDinRail = signal(true);
  readonly exportCableClamps = signal(true);

  readonly selectedCount = computed(() => {
    let count = 0;
    if (this.exportBase()) count++;
    if (this.exportLid()) count++;
    if (this.hasSeal() && this.exportSeal()) count++;
    if (this.hasPcbMounts() && this.exportPcbMounts()) count++;
    if (this.hasDinRailMount() && this.exportDinRail()) count++;
    if (this.hasCableClamps() && this.exportCableClamps()) count++;
    return count;
  });

  // PCB 支柱会拆成「基座支柱」与「盖板支柱」两个文件，所以文件数 ≠ 勾选项数
  readonly willExportZip = computed(() => this.expectedFileCount() > 1);

  readonly downloadButtonKey = computed<TranslationKey>(() => {
    if (this.selectedCount() === 0) {
      return 'tools.download';
    }
    return this.willExportZip() ? 'tools.downloadZip' : 'tools.downloadStl';
  });

  t(key: TranslationKey): string {
    return this.i18n.t(key);
  }

  openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  openExportModal(): void {
    this.selectDefaults();
    this.isExportModalOpen.set(true);
    const dialog = this.exportDialog?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  closeExportModal(): void {
    this.isExportModalOpen.set(false);
    const dialog = this.exportDialog?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
  }

  saveParamsFile(): void {
    const tsStr = this.formattedTimestamp();
    const data = JSON.stringify(this.state.params(), null, 2);
    const textFile = new Blob([data], { type: 'text/plain' });
    this.saveFile(textFile, `enclosure-${tsStr}.json`);
  }

  loadParamsFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
      this.loadErrorKey.set(null);
      try {
        const data = JSON.parse(fileReader.result as string) as Partial<Params> & {
          lidScrewThrough?: boolean;
          lidScrewCountersink?: number;
        };
        const current = this.state.params();
        // 嵌套对象要逐层合并：旧版预设里没有 snapFit / pcbPreview 的新字段，
        // 直接整块覆盖会把它们抹成 undefined，进而让几何函数读到 NaN。
        const merged: Params = {
          ...current,
          ...data,
          snapFit: { ...current.snapFit, ...(data.snapFit ?? {}) },
          pcbPreview: { ...current.pcbPreview, ...(data.pcbPreview ?? {}) },
        };
        // 兼容 v1.4 及更早的预设：那时用布尔量 lidScrewThrough 控制基座孔是否贯穿，
        // 现在换成 lidScrewHoleType。老预设没带新字段时按老开关的语义迁移过去。
        if (data.lidScrewHoleType === undefined && data.lidScrewThrough !== undefined) {
          merged.lidScrewHoleType = data.lidScrewThrough ? 'through' : 'blind';
          if (!data.lidScrewThrough) {
            merged.lidScrewHoleDepth = Math.max(merged.height - merged.floor, 0);
          }
        }
        // 兼容 v1.4 及更早的预设：那时用单个数值 lidScrewCountersink 表示 45° 锥坑的
        // 径向扩展量（深度与之相等），现在换成「形式 + 直径 + 深度」三个字段。
        // 老预设没带新字段时按老语义迁移：锥坑的大端直径 = 孔径 + 2×扩展量。
        if (data.lidScrewRecessType === undefined && (data.lidScrewCountersink ?? 0) > 0) {
          const spread = data.lidScrewCountersink as number;
          merged.lidScrewRecessType = 'countersunk';
          merged.lidScrewRecessDiameter = merged.lidScrewDiameter + spread * 2;
          merged.lidScrewRecessDepth = spread;
        }
        this.state.setParams(merged);
      } catch {
        this.loadErrorKey.set('tools.loadParseError');
      }
    };
    fileReader.onerror = () => {
      this.loadErrorKey.set('tools.loadReadError');
    };
    fileReader.readAsText(input.files[0], 'UTF-8');

    input.value = '';
  }

  /** 默认勾选基座 / 盖板 / 密封圈（挂夹），支柱不单独导出 */
  private selectDefaults(): void {
    this.exportBase.set(true);
    this.exportLid.set(true);
    this.exportSeal.set(true);
    this.exportPcbMounts.set(false);
    this.exportDinRail.set(true);
    this.exportCableClamps.set(true);
  }

  /** 完整外壳：沿用勾选面板的默认组合 */
  exportStl(): Promise<void> {
    this.selectDefaults();
    return this.exportSelected();
  }

  /** 只导出 PCB 支柱（快速试装检查用） */
  exportPcbMountsStl(): Promise<void> {
    this.exportBase.set(false);
    this.exportLid.set(false);
    this.exportSeal.set(false);
    this.exportDinRail.set(false);
    // 线缆夹也要清掉：否则「只导出支柱」会夹带压条，产出 ZIP 而不是单个 STL
    this.exportCableClamps.set(false);
    this.exportPcbMounts.set(true);
    return this.exportSelected();
  }

  /** 只导出 DIN 导轨挂夹 */
  exportDinRailStl(): Promise<void> {
    this.exportBase.set(false);
    this.exportLid.set(false);
    this.exportSeal.set(false);
    this.exportPcbMounts.set(false);
    this.exportCableClamps.set(false);
    this.exportDinRail.set(true);
    return this.exportSelected();
  }

  async exportSelected(): Promise<void> {
    if (this.selectedCount() === 0 || this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    try {
      const tsStr = this.formattedTimestamp();
      const ext = this.selectedFormat().extension;
      const currentParams = this.state.params();
      const files: { name: string; blob: Blob }[] = [];

      // 几何构建委托给 GeometryBuilder（worker 优先）：base()/lid() 等布尔运算
      // 不再阻塞主线程；序列化与部件 union 仍在主线程完成。
      // 勾选即请求 —— 一次 build 拿齐全部所需部件
      const wanted: PartName[] = [];
      if (this.exportBase()) {
        wanted.push('base', 'baseMounts', 'internalWalls', 'cableClamps');
      }
      if (this.exportLid()) {
        wanted.push('lid', 'lidMounts', 'lidClamps');
      }
      if (this.hasSeal() && this.exportSeal()) {
        wanted.push('seal');
      }
      if (this.hasPcbMounts() && this.exportPcbMounts()) {
        wanted.push('baseMounts', 'lidMounts');
      }
      if (this.hasDinRailMount() && this.exportDinRail()) {
        wanted.push('dinRailSingle');
      }
      if (this.hasCableClamps() && this.exportCableClamps()) {
        wanted.push('cableClampTops');
      }
      const built: BuiltParts = await this.geometry.build(currentParams, wanted, false);

      if (this.exportBase()) {
        const baseParts: Geom3[] = [built.parts.base as Geom3];
        if (built.parts.baseMounts) {
          baseParts.push(built.parts.baseMounts);
        }
        if (built.parts.internalWalls) {
          baseParts.push(built.parts.internalWalls);
        }
        if (built.parts.cableClamps) {
          baseParts.push(built.parts.cableClamps);
        }

        files.push({
          name: `enclosure-base-${tsStr}.${ext}`,
          blob: this.geometryToBlob(baseParts.length > 1 ? union(baseParts) : baseParts[0]),
        });
      }

      if (this.exportLid()) {
        const lidParts: Geom3[] = [built.parts.lid as Geom3];
        if (built.parts.lidMounts) lidParts.push(built.parts.lidMounts);
        if (built.parts.lidClamps) lidParts.push(built.parts.lidClamps);
        const lidGeometry = lidParts.length > 1 ? union(lidParts) : lidParts[0];
        files.push({
          name: `enclosure-lid-${tsStr}.${ext}`,
          blob: this.geometryToBlob(lidGeometry),
        });
      }

      if (this.hasSeal() && this.exportSeal()) {
        files.push({
          name: `enclosure-waterproof-seal-${tsStr}.${ext}`,
          blob: this.geometryToBlob(built.parts.seal as Geom3),
        });
      }

      if (this.hasPcbMounts() && this.exportPcbMounts()) {
        if (built.parts.baseMounts) {
          files.push({
            name: `enclosure-pcb-mounts-base-${tsStr}.${ext}`,
            blob: this.geometryToBlob(built.parts.baseMounts),
          });
        }

        if (built.parts.lidMounts) {
          files.push({
            name: `enclosure-pcb-mounts-lid-${tsStr}.${ext}`,
            blob: this.geometryToBlob(built.parts.lidMounts),
          });
        }
      }

      if (this.hasDinRailMount() && this.exportDinRail()) {
        files.push({
          name: `enclosure-din-rail-mount-${tsStr}.${ext}`,
          blob: this.geometryToBlob(built.parts.dinRailSingle as Geom3),
        });
      }

      if (this.hasCableClamps() && this.exportCableClamps() && built.parts.cableClampTops) {
        files.push({
          name: `enclosure-cable-clamp-straps-${tsStr}.${ext}`,
          blob: this.geometryToBlob(
            built.parts.cableClampTops,
            `enclosure-cable-clamp-straps-${tsStr}`,
          ),
        });
      }

      if (files.length === 1) {
        this.saveFile(files[0].blob, files[0].name);
      } else if (files.length > 1) {
        const zip = new JSZip();
        for (const file of files) {
          zip.file(file.name, file.blob);
        }
        this.saveFile(await zip.generateAsync({ type: 'blob' }), `enclosure-${tsStr}.zip`);
      }

      this.closeExportModal();
    } finally {
      this.isExporting.set(false);
    }
  }

  private expectedFileCount(): number {
    let fileCount = 0;
    if (this.exportBase()) fileCount++;
    if (this.exportLid()) fileCount++;
    if (this.hasSeal() && this.exportSeal()) fileCount++;
    if (this.hasDinRailMount() && this.exportDinRail()) fileCount++;
    if (this.hasCableClamps() && this.exportCableClamps()) fileCount++;
    if (this.hasPcbMounts() && this.exportPcbMounts()) {
      const params = this.state.params();
      const hasBaseMounts = params.pcbMounts.some((m) => (m.surface ?? 'bottom') !== 'top');
      const hasLidMounts = params.pcbMounts.some((m) => (m.surface ?? 'bottom') === 'top');
      if (hasBaseMounts) fileCount++;
      if (hasLidMounts) fileCount++;
    }
    return fileCount;
  }

  private geometryToBlob(geometry: Geom3, name = 'enclosure'): Blob {
    const format = this.selectedFormat();
    return this.exportFormatService.serialize(format.id, geometry, { name });
  }

  private saveFile(data: Blob, fileName: string): void {
    saveAs(data, fileName);
  }

  private formattedTimestamp(): string {
    const ts = new Date();
    const y = ts.getFullYear();
    const m = ts.getMonth() + 1;
    const d = ts.getDate();
    const h = ts.getHours();
    const mm = ts.getMinutes();
    const s = ts.getSeconds();
    return `${y}${m}${d}${h}${mm}${s}`;
  }
}
