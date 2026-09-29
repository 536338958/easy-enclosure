import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { cuboid } from '@jscad/modeling/src/primitives';
import { translate } from '@jscad/modeling/src/operations/transforms';

import { DEFAULT_PARAMS, cloneParams, type Params } from '../../core/params';
import { EnclosureStateService } from '../../core/state/enclosure-state.service';
import { RendererComponent } from './renderer.component';

describe('RendererComponent', () => {
  let component: RendererComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RendererComponent],
    }).compileComponents();
  });

  it('renders updated params from state and clears loading after render cycle', fakeAsync(() => {
    const fixture = TestBed.createComponent(RendererComponent);
    component = fixture.componentInstance;

    const renderModelSpy = spyOn(component as any, 'renderModel').and.returnValue(
      Promise.resolve(),
    );

    fixture.detectChanges();
    tick(260);
    flushMicrotasks();

    renderModelSpy.calls.reset();

    const localState = fixture.debugElement.injector.get(EnclosureStateService);
    localState.updateParam('length', 123);
    (component as any).scheduleModelRender(localState.params());

    tick(260);
    flushMicrotasks();

    expect(renderModelSpy).toHaveBeenCalled();
    expect(localState.loading()).toBeFalse();
  }));

  describe('buildGridEntity', () => {
    it('returns null when showGrid is false', () => {
      const fixture = TestBed.createComponent(RendererComponent);
      component = fixture.componentInstance;
      const result = (component as any).buildGridEntity(
        {
          ...DEFAULT_PARAMS,
          showGrid: false,
          gridSpacing: 10,
        },
        [
          [-50, -40, 0],
          [50, 40, 30],
        ],
      );
      expect(result).toBeNull();
    });

    it('returns null when gridSpacing is 0', () => {
      const fixture = TestBed.createComponent(RendererComponent);
      component = fixture.componentInstance;
      const result = (component as any).buildGridEntity(
        {
          ...DEFAULT_PARAMS,
          showGrid: true,
          gridSpacing: 0,
        },
        [
          [-50, -40, 0],
          [50, 40, 30],
        ],
      );
      expect(result).toBeNull();
    });

    it('returns a drawGrid entity centered on measured bounds', () => {
      const fixture = TestBed.createComponent(RendererComponent);
      component = fixture.componentInstance;
      const bounds = [
        [-180, -60, 0],
        [140, 90, 30],
      ];
      const result = (component as any).buildGridEntity(
        {
          ...DEFAULT_PARAMS,
          showGrid: true,
          gridSpacing: 10,
        },
        bounds,
      );

      expect(result).not.toBeNull();
      expect(result.visuals.drawCmd).toBe('drawGrid');
      expect(result.visuals.show).toBe(true);
      expect(result.visuals.fadeOut).toBe(true);
      expect(result.ticks[1]).toBe(10);
      expect(result.ticks[0]).toBe(50);
      expect(result.model).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -20, 15, 0, 1]);
      expect(result.fadeCenter).toEqual([-20, 15]);

      // 以下断言的是契约而非具体数值：网格外扩多少属于可调的视觉参数，
      // 把 size / fadeDistance 写成魔数只会让每次调整都误报失败。
      const spanX = bounds[1][0] - bounds[0][0];
      const spanY = bounds[1][1] - bounds[0][1];
      const [sizeY, sizeX] = result.size;

      // 网格必须完整覆盖模型，且对齐到主格间距的整数倍
      expect(sizeX).toBeGreaterThanOrEqual(spanX);
      expect(sizeY).toBeGreaterThanOrEqual(spanY);
      expect(sizeX % 50).toBe(0);
      expect(sizeY % 50).toBe(0);

      // drawGrid 把 size[0] 当 Y 跨度、size[1] 当 X 跨度，与直觉顺序相反
      expect(sizeX).toBeGreaterThan(sizeY);

      expect(result.fadeDistance).toBeCloseTo(Math.max(sizeX, sizeY) * 0.5, 6);
    });
  });

  describe('part visibility', () => {
    const buildParams = (over: Partial<Params>): Params => {
      const params = cloneParams(DEFAULT_PARAMS);
      return {
        ...params,
        waterProof: false,
        pcbMounts: [],
        internalWalls: [],
        pcbPreview: { ...params.pcbPreview, enabled: false },
        ...over,
      };
    };

    // renderModel 正常路径要初始化 WebGL 渲染器。这里预置 renderer / renderOptions
    // 走「已初始化」分支，并直接给基座、盖板塞两个已知位置的立方体，
    // 于是只验证组装阶段的显隐，不触发真实几何计算。
    const renderParts = async (
      component: RendererComponent,
      params: Params,
    ): Promise<[number, number]> => {
      (component as any).renderer = () => {};
      (component as any).renderOptions = { camera: {}, drawCommands: {}, entities: [] };
      (component as any).lidModel = cuboid({ size: [10, 10, 10] });
      (component as any).baseModel = translate([100, 0, 0], cuboid({ size: [10, 10, 10] }));
      (component as any).sealModel = null;
      (component as any).baseMountsModel = null;
      (component as any).lidMountsModel = null;
      (component as any).internalWallsModel = null;

      await (component as any).renderModel(params, []);

      const [min, max] = measureBoundingBox((component as any).model);
      return [min[0], max[0]];
    };

    it('shows both parts by default', async () => {
      const fixture = TestBed.createComponent(RendererComponent);
      const [minX, maxX] = await renderParts(fixture.componentInstance, buildParams({}));

      expect(minX).toBeCloseTo(-5, 6);
      expect(maxX).toBeCloseTo(105, 6);
    });

    it('omits the base when showBase is false', async () => {
      const fixture = TestBed.createComponent(RendererComponent);
      const [minX, maxX] = await renderParts(
        fixture.componentInstance,
        buildParams({ showBase: false }),
      );

      expect(minX).toBeCloseTo(-5, 6);
      expect(maxX).toBeCloseTo(5, 6);
    });

    it('omits the lid when showLid is false', async () => {
      const fixture = TestBed.createComponent(RendererComponent);
      const [minX, maxX] = await renderParts(
        fixture.componentInstance,
        buildParams({ showLid: false }),
      );

      expect(minX).toBeCloseTo(95, 6);
      expect(maxX).toBeCloseTo(105, 6);
    });

    it('clears the model instead of keeping the previous frame when both are hidden', async () => {
      const fixture = TestBed.createComponent(RendererComponent);

      // 关掉网格，否则清空后画面里还会剩一个网格实体
      await renderParts(
        fixture.componentInstance,
        buildParams({ showLid: false, showBase: false, showGrid: false }),
      );

      expect((fixture.componentInstance as any).model).toBeNull();
      expect((fixture.componentInstance as any).renderOptions.entities).toEqual([]);
    });
  });
});
