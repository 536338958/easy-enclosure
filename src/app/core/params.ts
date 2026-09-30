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

export type PCBPreview = {
  enabled: boolean;
  width: number;
  length: number;
  thickness: number;
  componentHeight: number;
  x: number;
  y: number;
};

export type Ventilation = {
  surface: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';
  // 竖切 = 槽沿竖直/纵向；横切 = 槽沿水平/横向
  orientation: 'vertical' | 'horizontal';
  slotWidth: number;
  slotLength: number;
  slotGap: number;
  slotCount: number;
  // 在所在面内的偏移：x = 水平方向，y = 竖直/纵向
  x: number;
  y: number;
};

export type SnapFit = {
  enabled: boolean;
  // 卡扣总数量预设：4 / 6 / 8
  preset: 4 | 6 | 8;
  // 卡扣离每条边两端的距离（占该边长度的百分比）
  endPercent: number;
  width: number;
  depth: number;
  height: number;
  clearance: number;
};

/**
 * PCB 支柱根部的过渡形式，用来降低根部应力集中。
 *
 * - `none`：柱身直接立在板上（直角，应力集中最明显）
 * - `round`：外凸圆角。减应力效果最好，且同样外扩量下比斜角省料
 * - `chamfer`：45° 斜角，效果约等效于 0.6×size 的圆角
 *
 * 两者都是「下大上小」的收缩形态，FDM 打印不会产生悬垂。
 */
export type PcbMountFilletStyle = 'none' | 'round' | 'chamfer';

export type PcbMountFillet = {
  style: PcbMountFilletStyle;
  /**
   * 圆角半径 / 斜角尺寸，mm。0 表示关闭（等同 none）。
   * 实际生效值会被夹到 `[MIN_MOUNT_FILLET, 上限]`。
   */
  size: number;
};

/**
 * 基座螺丝孔的形式。

 * - `through`（本分支默认）：从基座顶面贯穿到底面，与旧版 `lidScrewThrough = true` 一致
 * - `blind`：从基座顶面往下钻 `lidScrewHoleDepth`，**最多钻到地板顶面**，
 *   底板整层留着 —— 孔不穿透，灰尘进不去。上游的盲孔不设这个上限，会从底部打穿
 * - `nut-pocket`：贯穿孔 + 基座底面的六角螺母槽（嵌入螺母，螺丝从盖板拧进来锁紧）
 *
 * 上游默认 `blind`，本分支保留 `through` 以免改变既有预设的默认成品。
 */
export type LidScrewHoleType = 'blind' | 'nut-pocket' | 'through';

/** DIN 导轨（TH35）相对外壳的走向 */
export type DinRailOrientation = 'horizontal' | 'vertical';

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
  showAxes: boolean;
  gridSpacing: number;
  cornerRadius: number;
  holes: Hole[];
  pcbMounts: PCBMount[];
  internalWalls: InternalWall[];
  wallMounts: boolean;
  wallMountCount: number;
  wallMountScrewDiameter: number;
  /**
   * 挂耳外侧切角角度（°）。默认 60，取值范围 45–70。
   * 角度越小切掉的实体越多、挂耳越厚实；越大切掉越少、切面越陡。
   * 仅作为新建 / 重置后的初始值，用户可随时改成区间内的其他角度。
   */
  wallMountChamferAngle: number;
  lidScrews: boolean;
  lidScrewDiameter: number;
  baseLidScrewDiameter: number;
  /**
   * 盖板螺丝孔中心距相邻两边的距离（mm）。默认 0 表示自动（沿用既有公式）。
   * 取值过小会被自动抬升，以保证螺丝孔与外壁之间始终留有最小壁厚（见 MIN_SCREW_WALL）。
   */
  lidScrewOffset: number;
  /**
   * 基座螺丝孔的形式，见 `LidScrewHoleType`。只作用于**基座**，盖板的孔始终贯穿
   * （盖板外表面是 z = 0，螺丝从那一侧拧入）。
   */
  lidScrewHoleType: LidScrewHoleType;
  /**
   * 盲孔深度（mm），仅 `lidScrewHoleType = 'blind'` 时生效。
   * 从基座顶面往下量；实际生效值会被夹到 `height − floor`，不会打通底板。
   */
  lidScrewHoleDepth: number;
  /**
   * 嵌入螺母的对边宽度（mm，即扳手尺寸），仅 `nut-pocket` 时生效。
   * 螺母槽按正六边形外接圆 `nutWidth / √3 × 2` 开挖。
   */
  lidScrewNutWidth: number;
  /** 嵌入螺母槽的深度（mm），仅 `nut-pocket` 时生效。 */
  lidScrewNutDepth: number;
  /**
   * 盖板螺丝孔的沉头倒角（mm）。
   *
   * 在盖板顶面的螺丝孔口切出一个 45° 锥坑，让沉头螺丝的螺帽沉进去、不凸出表面。
   * 取值是锥坑在**径向**的扩展量，深度与之相等（45°）。0＝关闭。
   * 实际生效值会被夹到 `[0.2, min(2.5, 盖板总厚度×0.6)]`。
   */
  lidScrewCountersink: number;
  /**
   * 开启盖板螺丝后，内腔四角会凸出一块实体（螺丝柱）—— 也就是 clover 挖空时
   * 让位缺口使内腔在角落收缩后留下的那块。这个参数控制它**向腔内凸出多少**（mm）。
   *
   * 默认 0 表示**自动**：直接取允许区间的最小值（够用即可，尽量少侵占内腔，
   * 同时保证包住螺丝孔并留足壁厚）—— 也就是「自动夹紧」的结果。
   * 设为正值时按该值凸出，超出允许区间会自动夹到边界。
   * 它只改变这块凸出实体的大小，**不会改变螺丝孔位置**（孔位由 lidScrewOffset 单独控制）。
   */
  lidScrewProtrusion: number;
  pcbPreview: PCBPreview;
  ventilation: Ventilation[];
  snapFit: SnapFit;
  pcbMountFillet: PcbMountFillet;
  baseBedChamfer: number;
  lidBedChamfer: number;
  /**
   * 盖板「嵌入边」顶部边缘倒角尺寸（mm）。
   *
   * 嵌入边是盖板上那一圈插进基座槽里的凸缘（z 从 roof 到 roof + insertHeight）。
   * 这里倒的是它顶端的外缘，不是盖板本体的上表面 —— 嵌入边要滑进基座，
   * 顶端有斜面才好对准。默认 0.4（取值偏小，保证配合精度与外观）；0＝关闭。
   * 实际生效值由 lid.ts 按嵌入边高度与圆角半径夹取，不会削穿。
   */
  lidTopChamfer: number;
  /** 是否生成 DIN 导轨（35mm TH35 / IEC 60715）挂装夹。默认关闭。 */
  dinRailMount: boolean;
  /** 导轨走向：horizontal = 导轨横穿外壳长度方向，vertical = 沿宽度方向 */
  dinRailOrientation: DinRailOrientation;
  /** 单个挂夹的宽度（沿导轨方向的尺寸），mm */
  dinRailMountWidth: number;
  /** 挂夹固定螺丝的直径，mm */
  dinRailScrewDiameter: number;
  /** 是否在预览里显示 DIN 挂夹（关掉只是不显示，导出仍然包含） */
  showDinRailMount: boolean;
};

export const DEFAULT_PARAMS: Params = {
  length: 80,
  width: 100,
  height: 30,
  floor: 2,
  roof: 2,
  wall: 2,
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
  wallMounts: true,
  wallMountCount: 4,
  wallMountScrewDiameter: 3.98,
  lidScrews: true,
  lidScrewDiameter: 2.98,
  baseLidScrewDiameter: 2.88,
  pcbPreview: {
    enabled: false,
    width: 68,
    length: 54,
    thickness: 1.6,
    componentHeight: 8,
    x: 0,
    y: 0,
  },
  ventilation: [],
  snapFit: {
    enabled: false,
    preset: 4,
    endPercent: 20,
    width: 8,
    depth: 0.8,
    height: 1.2,
    clearance: 0.2,
  },
  baseBedChamfer: 0.6,
  lidBedChamfer: 0.6,
  lidTopChamfer: 0.4,
  wallMountChamferAngle: 60,
  lidScrewOffset: 0,
  lidScrewProtrusion: 0,
  lidScrewHoleType: 'through',
  lidScrewHoleDepth: 10,
  lidScrewNutWidth: 5.7,
  lidScrewNutDepth: 2.5,
  pcbMountFillet: { style: 'round', size: 1 },
  lidScrewCountersink: 0,
  dinRailMount: false,
  dinRailOrientation: 'horizontal',
  dinRailMountWidth: 15,
  dinRailScrewDiameter: 3.98,
  showDinRailMount: true,
};

export const cloneParams = (params: Params): Params => {
  return JSON.parse(JSON.stringify(params)) as Params;
};
