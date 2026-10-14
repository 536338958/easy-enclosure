import { TestBed } from '@angular/core/testing';
import { DEFAULT_CABLE_CLAMP, cloneParams } from '../params';
import { EnclosureStateService } from './enclosure-state.service';

describe('EnclosureStateService', () => {
  let service: EnclosureStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnclosureStateService);
  });

  it('starts with default params', () => {
    expect(service.params().length).toBe(80);
    expect(service.params().waterProof).toBeTrue();
    expect(service.params().holes.length).toBeGreaterThan(0);
  });

  it('supports targeted param updates', () => {
    service.updateParam('length', 120);
    service.patchParams({ width: 95, waterProof: false });

    expect(service.params().length).toBe(120);
    expect(service.params().width).toBe(95);
    expect(service.params().waterProof).toBeFalse();
  });

  it('clones incoming params in setParams', () => {
    const next = cloneParams(service.params());
    next.length = 144;

    service.setParams(next);
    next.length = 33;

    expect(service.params().length).toBe(144);
  });

  it('resets to simple enclosure defaults', () => {
    service.resetToSimpleEnclosure();

    expect(service.params().holes).toEqual([]);
    expect(service.params().pcbMounts).toEqual([]);
    expect(service.params().internalWalls).toEqual([]);
    expect(service.params().waterProof).toBeFalse();
    expect(service.params().wallMounts).toBeFalse();
    expect(service.params().lidScrews).toBeFalse();
  });

  it('clears every optional add-on so the result really is a plain box', () => {
    // 先把所有可选附加件都打开，否则「清空」这条断言在默认状态下永远成立、等于没测
    service.patchParams({
      cableClamps: [{ ...DEFAULT_CABLE_CLAMP }],
      ventilation: [
        {
          surface: 'top',
          mode: 'slot',
          slotWidth: 2,
          slotLength: 0,
          slotGap: 4,
          slotCount: 3,
          x: 0,
          y: 0,
        },
      ],
      dinRailMount: true,
      snapFit: { ...service.params().snapFit, enabled: true },
      pcbPreview: { ...service.params().pcbPreview, enabled: true },
    });

    service.resetToSimpleEnclosure();

    const params = service.params();
    expect(params.cableClamps).toEqual([]);
    expect(params.ventilation).toEqual([]);
    expect(params.dinRailMount).toBeFalse();
    expect(params.snapFit.enabled).toBeFalse();
    expect(params.pcbPreview.enabled).toBeFalse();
  });

  it('keeps snap-fit and PCB preview dimensions when disabling them', () => {
    service.patchParams({
      snapFit: { ...service.params().snapFit, enabled: true, width: 7, endPercent: 35 },
      pcbPreview: { ...service.params().pcbPreview, enabled: true, width: 55 },
    });

    service.resetToSimpleEnclosure();

    // 只关开关、保留用户调过的尺寸，免得重新打开时又要从头调一遍
    expect(service.params().snapFit.enabled).toBeFalse();
    expect(service.params().snapFit.width).toBe(7);
    expect(service.params().snapFit.endPercent).toBe(35);
    expect(service.params().pcbPreview.width).toBe(55);
  });

  it('resets to full defaults', () => {
    service.updateParam('length', 123);
    service.setLoading(true);
    service.resetToDefaults();

    expect(service.params().length).toBe(80);
    expect(service.loading()).toBeFalse();
  });
});
