import { TestBed } from '@angular/core/testing';
import JSZip from 'jszip';

import { cloneParams } from '../../core/params';
import { EnclosureStateService } from '../../core/state/enclosure-state.service';
import { ToolsComponent } from './tools.component';

/** saveFile 是私有的，断言时用一个最小结构把它暴露出来，避免 spyOn 推成 never */
type SaveSink = { saveFile: (data: Blob, fileName: string) => void };
const spyOnSave = (target: ToolsComponent) => spyOn(target as unknown as SaveSink, 'saveFile');

describe('ToolsComponent', () => {
  let component: ToolsComponent;
  let state: EnclosureStateService;

  // 用固定内容替换 FileReader，让导入路径可在无浏览器 I/O 的情况下被断言
  const withFileContents = (contents: string, run: () => void): void => {
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;

      readAsText(): void {
        this.result = contents;
        if (this.onload) {
          this.onload.call(
            this as unknown as FileReader,
            new ProgressEvent('load') as ProgressEvent<FileReader>,
          );
        }
      }
    }

    (globalThis as { FileReader: typeof FileReader }).FileReader =
      MockFileReader as unknown as typeof FileReader;
    (window as Window & { FileReader: typeof FileReader }).FileReader =
      MockFileReader as unknown as typeof FileReader;

    try {
      run();
    } finally {
      (globalThis as { FileReader: typeof FileReader }).FileReader = originalFileReader;
      (window as Window & { FileReader: typeof FileReader }).FileReader = originalFileReader;
    }
  };

  const fileInputFor = (): HTMLInputElement => {
    const input = document.createElement('input');
    const file = new File(['{}'], 'params.json', { type: 'application/json' });
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
    } as unknown as FileList;
    Object.defineProperty(input, 'files', { value: fileList });
    return input;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ToolsComponent);
    component = fixture.componentInstance;
    state = TestBed.inject(EnclosureStateService);
    fixture.detectChanges();
  });

  it('opens and closes export modal', () => {
    component.openExportModal();
    expect(component.isExportModalOpen()).toBeTrue();

    component.closeExportModal();
    expect(component.isExportModalOpen()).toBeFalse();
  });

  it('saves params as json file', () => {
    const saveSpy = spyOn(component as any, 'saveFile');

    component.saveParamsFile();

    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.any(Blob),
      jasmine.stringMatching(/^enclosure-\d+\.json$/),
    );
  });

  it('loads params from json and merges with current settings', () => {
    withFileContents('{"length": 145, "waterProof": false}', () => {
      const input = fileInputFor();

      component.loadParamsFile({ target: input } as unknown as Event);

      expect(state.params().length).toBe(145);
      expect(state.params().waterProof).toBeFalse();
      expect(state.params().width).toBe(100);
      expect(input.value).toBe('');
    });
  });

  // 回归：JSON.parse 原先没有 try/catch，导入损坏文件会直接抛异常且界面无任何反馈
  it('reports an error instead of throwing when the json is malformed', () => {
    withFileContents('not json at all', () => {
      const input = fileInputFor();

      expect(() => component.loadParamsFile({ target: input } as unknown as Event)).not.toThrow();
      expect(component.loadError()).toBeTruthy();
      expect(state.params().length).toBe(80);
    });
  });

  it('keeps nested defaults when an older preset omits new fields', () => {
    withFileContents('{"snapFit": {"enabled": true}}', () => {
      const before = cloneParams(state.params()).snapFit;

      component.loadParamsFile({ target: fileInputFor() } as unknown as Event);

      expect(component.loadError()).toBeNull();
      expect(state.params().snapFit.enabled).toBeTrue();
      expect(state.params().snapFit.width).toBe(before.width);
      expect(state.params().snapFit.preset).toBe(before.preset);
    });
  });

  it('saves a single STL when only one part is selected', async () => {
    const saveSpy = spyOnSave(component);

    const simple = cloneParams(state.params());
    simple.pcbMounts = [];
    simple.internalWalls = [];
    simple.waterProof = false;
    state.setParams(simple);

    component.openExportModal();
    component.exportLid.set(false);
    await component.exportSelected();

    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.any(Blob),
      jasmine.stringMatching(/^enclosure-base-\d+\.stl$/),
    );
  });

  it('bundles the whole enclosure into a ZIP when several parts are selected', async () => {
    const saveSpy = spyOnSave(component);
    const closeSpy = spyOn(component, 'closeExportModal');

    const simple = cloneParams(state.params());
    simple.pcbMounts = [];
    simple.internalWalls = [];
    simple.waterProof = true;
    state.setParams(simple);

    await component.exportStl();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [blob, name] = saveSpy.calls.mostRecent().args as unknown as [Blob, string];
    expect(name).toMatch(/^enclosure-\d+\.zip$/);

    const zip = await JSZip.loadAsync(blob);
    const entries = Object.keys(zip.files).join(' ');
    expect(entries).toContain('enclosure-lid-');
    expect(entries).toContain('enclosure-base-');
    expect(entries).toContain('enclosure-waterproof-seal-');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('does not duplicate pcb mounts into the bundle by default', async () => {
    const saveSpy = spyOnSave(component);

    const params = cloneParams(state.params());
    params.pcbMounts = [
      { x: 10, y: 10, height: 8, outerDiameter: 6, screwDiameter: 3, surface: 'bottom' },
    ];
    state.setParams(params);

    await component.exportStl();

    const [blob] = saveSpy.calls.mostRecent().args as unknown as [Blob, string];
    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files).join(' ')).not.toContain('enclosure-pcb-mounts-');
  });

  it('exports only the pcb mounts when that is the sole selection', async () => {
    const saveSpy = spyOnSave(component);

    const params = cloneParams(state.params());
    params.pcbMounts = [
      { x: 10, y: 10, height: 8, outerDiameter: 6, screwDiameter: 3, surface: 'bottom' },
      { x: 20, y: 20, height: 8, outerDiameter: 6, screwDiameter: 3, surface: 'top' },
    ];
    state.setParams(params);

    await component.exportPcbMountsStl();

    const [blob] = saveSpy.calls.mostRecent().args as unknown as [Blob, string];
    const zip = await JSZip.loadAsync(blob);
    const entries = Object.keys(zip.files).join(' ');
    expect(entries).toContain('enclosure-pcb-mounts-base-');
    expect(entries).toContain('enclosure-pcb-mounts-lid-');
    expect(entries).not.toContain('enclosure-waterproof-seal-');
  });

  it('exports the din rail mount on its own when requested', async () => {
    const saveSpy = spyOnSave(component);

    const params = cloneParams(state.params());
    params.dinRailMount = true;
    state.setParams(params);

    await component.exportDinRailStl();

    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.any(Blob),
      jasmine.stringMatching(/^enclosure-din-rail-mount-\d+\.stl$/),
    );
  });

  it('skips pcb mount export when no mounts exist', async () => {
    const saveSpy = spyOnSave(component);

    const params = cloneParams(state.params());
    params.pcbMounts = [];
    state.setParams(params);

    await component.exportPcbMountsStl();

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('migrates a legacy lidScrewThrough preset to lidScrewHoleType', () => {
    withFileContents('{"lidScrewThrough": false}', () => {
      component.loadParamsFile({ target: fileInputFor() } as unknown as Event);

      expect(state.params().lidScrewHoleType).toBe('blind');
      expect(state.params().lidScrewHoleDepth).toBe(state.params().height - state.params().floor);
    });

    withFileContents('{"lidScrewThrough": true}', () => {
      component.loadParamsFile({ target: fileInputFor() } as unknown as Event);

      expect(state.params().lidScrewHoleType).toBe('through');
    });
  });
});
