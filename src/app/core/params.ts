import type { Surface } from './enclosure';

export type Hole = {
  shape: 'circle' | 'square' | 'rectangle';
  diameter: number;
  width: number;
  length: number;
  surface: Surface;
  x: number;
  y: number;
};

export type PCBMount = {
  surface: Surface;
  x: number;
  y: number;
  height: number;
  outerDiameter: number;
  screwDiameter: number;
};

export type InternalWall = {
  x: number;
  y: number;
  height: number;
  length: number;
  thickness: number;
  rotation: number;
};

export type LidScrewHoleType = 'blind' | 'nut-pocket' | 'through';
export type LidScrewRecessType = 'none' | 'counterbore' | 'countersunk';

export type SnapFitPreset = 4 | 6 | 8;

export type SnapFit = {
  enabled: boolean;
  preset: SnapFitPreset;
  endPercent: number;
  width: number;
  depth: number;
  height: number;
  clearance: number;
};

export type PCBPreview = {
  enabled: boolean;
  width: number;
  length: number;
  thickness: number;
  componentHeight: number;
  x: number;
  y: number;
};

/**
 * 散热通风槽（本 fork 独有，上游没有对应模块）。
 * - vertical：槽的长轴沿竖直 / 纵向
 * - horizontal：槽的长轴沿水平 / 横向
 * 偏移沿用本分支约定：x = 面内水平偏移，y = 竖直 / 纵向偏移，+ 指向 +世界轴。
 */
export type Ventilation = {
  surface: Surface;
  orientation: 'vertical' | 'horizontal';
  slotWidth: number;
  /** 0 表示按所在面的 60% 自动取值 */
  slotLength: number;
  slotGap: number;
  slotCount: number;
  x: number;
  y: number;
};

export const DEFAULT_VENTILATION: Ventilation = {
  surface: 'top',
  orientation: 'horizontal',
  slotWidth: 2,
  slotLength: 0,
  slotGap: 3,
  slotCount: 5,
  x: 0,
  y: 0,
};

export type CableClamp = {
  surface?: Surface;
  x: number;
  y: number;
  length: number;
  wallHeight: number;
  wallThickness: number;
  mountScrewDiameter: number;
  mountOuterDiameter: number;
  mountHeight: number;
  rotation: number;
  topHeight: number;
  topScrewDiameter: number;
  ridges?: boolean;
  ridgeCount?: number;
};

export const DEFAULT_CABLE_CLAMP: CableClamp = {
  surface: 'bottom',
  x: 0,
  y: 0,
  length: 15,
  wallHeight: 5,
  wallThickness: 5,
  mountScrewDiameter: 2,
  mountOuterDiameter: 6,
  mountHeight: 8,
  rotation: 0,
  topHeight: 2.5,
  topScrewDiameter: 2.6,
  ridges: true,
  ridgeCount: 2,
};

export type Params = {
  length: number;
  width: number;
  height: number;
  floor: number;
  roof: number;
  wall: number;
  waterProof: boolean;
  sealThickness: number;
  insertThickness: number;
  insertHeight: number;
  insertClearance: number;
  showLid: boolean;
  showBase: boolean;
  showGrid: boolean;
  /** 在基座角点画 XYZ 坐标轴（X 红 / Y 绿 / Z 蓝），用于对照各偏移方向 */
  showAxes: boolean;
  gridSpacing: number;
  cornerRadius: number;
  holes: Hole[];
  pcbMounts: PCBMount[];
  internalWalls: InternalWall[];
  /** 散热通风槽（fork 独有，上游无此模块） */
  ventilation: Ventilation[];
  cableClamps: CableClamp[];
  wallMounts: boolean;
  wallMountCount: number;
  wallMountScrewDiameter: number;
  /**
   * 挂耳外侧切角角度（°），取值 45–70。
   * 角度越小切掉的实体越多、挂耳越厚实；越大切掉越少、切面越陡。
   */
  wallMountChamferAngle: number;
  lidScrews: boolean;
  lidScrewDiameter: number;
  baseLidScrewDiameter: number;
  lidScrewHoleType: LidScrewHoleType;
  lidScrewHoleDepth: number;
  lidScrewNutWidth: number;
  lidScrewNutDepth: number;
  lidScrewRecessType: LidScrewRecessType;
  lidScrewRecessDiameter: number;
  lidScrewRecessDepth: number;
  /**
   * 盖板螺丝孔中心距相邻两边的距离（mm）。0 表示自动（沿用既有公式），
   * 正值按用户给定值，并夹紧到保证螺丝孔与外壁之间留有最小壁厚的区间内。
   */
  lidScrewOffset: number;
  dinRailMount: boolean;
  dinRailOrientation: 'horizontal' | 'vertical';
  dinRailMountWidth: number;
  dinRailScrewDiameter: number;
  showDinRailMount: boolean;
  snapFit: SnapFit;
  pcbPreview: PCBPreview;
  baseBedChamfer: number;
  lidBedChamfer: number;
  lidTopChamfer: number;
};

export const DEFAULT_PARAMS: Params = {
  length: 80,
  width: 100,
  height: 30,
  floor: 2,
  roof: 2,
  wall: 1,
  waterProof: true,
  sealThickness: 2,
  insertThickness: 2,
  insertHeight: 4,
  insertClearance: 0.04,
  showLid: true,
  showBase: true,
  showGrid: true,
  showAxes: false,
  gridSpacing: 10,
  cornerRadius: 3,
  holes: [
    {
      shape: 'circle',
      surface: 'front',
      diameter: 12.5,
      width: 10,
      length: 10,
      x: 0,
      y: 0,
    },
    {
      shape: 'square',
      surface: 'left',
      diameter: 10,
      width: 12,
      length: 10,
      x: 0,
      y: 0,
    },
    {
      shape: 'rectangle',
      surface: 'back',
      width: 40,
      length: 6,
      diameter: 10,
      x: 0,
      y: 0,
    },
    {
      shape: 'square',
      surface: 'right',
      width: 12.5,
      length: 10,
      diameter: 10,
      x: 0,
      y: 0,
    },
    {
      shape: 'square',
      surface: 'top',
      width: 30,
      length: 10,
      diameter: 10,
      x: 0,
      y: 0,
    },
  ],
  pcbMounts: [
    {
      surface: 'bottom',
      x: 30,
      y: 24,
      height: 5,
      outerDiameter: 6,
      screwDiameter: 2,
    },
    {
      surface: 'bottom',
      x: -30,
      y: 24,
      height: 5,
      outerDiameter: 6,
      screwDiameter: 2,
    },
    {
      surface: 'bottom',
      x: -30,
      y: -24,
      height: 5,
      outerDiameter: 6,
      screwDiameter: 2,
    },
    {
      surface: 'bottom',
      x: 30,
      y: -24,
      height: 5,
      outerDiameter: 6,
      screwDiameter: 2,
    },
  ],
  internalWalls: [
    {
      x: 0,
      y: 0,
      height: 10,
      length: 25,
      thickness: 2,
      rotation: 0,
    },
  ],
  ventilation: [],
  cableClamps: [],
  wallMounts: true,
  wallMountCount: 4,
  wallMountScrewDiameter: 3.98,
  wallMountChamferAngle: 60,
  lidScrews: true,
  lidScrewDiameter: 2.98,
  baseLidScrewDiameter: 2.88,
  lidScrewHoleType: 'blind',
  lidScrewHoleDepth: 10,
  lidScrewNutWidth: 5.7,
  lidScrewNutDepth: 2.5,
  lidScrewRecessType: 'none',
  lidScrewRecessDiameter: 6.2,
  lidScrewRecessDepth: 3.0,
  lidScrewOffset: 0,
  dinRailMount: false,
  dinRailOrientation: 'horizontal',
  dinRailMountWidth: 15,
  dinRailScrewDiameter: 3.98,
  showDinRailMount: true,
  snapFit: {
    enabled: false,
    preset: 4,
    endPercent: 20,
    width: 8,
    depth: 0.8,
    height: 1.2,
    clearance: 0.15,
  },
  pcbPreview: {
    enabled: false,
    width: 68,
    length: 54,
    thickness: 1.6,
    componentHeight: 8,
    x: 0,
    y: 0,
  },
  baseBedChamfer: 0.6,
  lidBedChamfer: 0.6,
  lidTopChamfer: 0.4,
};

export const cloneParams = (params: Params): Params => {
  return JSON.parse(JSON.stringify(params)) as Params;
};
