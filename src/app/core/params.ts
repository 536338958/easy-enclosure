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

export type VentilationMode = 'slot' | 'circleGrid' | 'squareGrid' | 'hexGrid';

/** 合法模式清单，供 normalizeVentilation 校验用 */
export const VENTILATION_MODES: readonly VentilationMode[] = [
  'slot',
  'circleGrid',
  'squareGrid',
  'hexGrid',
];

/**
 * 散热通风（本 fork 独有，上游没有对应模块）。
 *
 * 模式：
 * - slot：长条槽，长轴按 angle 旋转。0° = 横切，90° = 竖切，有效范围 0–180（槽按 180° 对称）
 * - circleGrid / squareGrid / hexGrid：圆孔 / 方孔 / 正六边形孔的网格阵列，
 *   列数用 slotCount，行数用 rows；hexGrid 为六边形孔的蜂窝状交错排列
 *
 * 偏移沿用本分支约定：x = 面内水平偏移，y = 竖直 / 纵向偏移，+ 指向 +世界轴。
 *
 * orientation 是旧版字段，仅为兼容旧预设保留；新代码一律读写 angle。
 */
export type Ventilation = {
  surface: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';
  /** 通风模式；缺省按 'slot' 处理（兼容旧预设） */
  mode?: VentilationMode;
  /** 切槽角度（度，0–180，仅槽模式生效）：0 = 横切，90 = 竖切 */
  angle?: number;
  /** @deprecated 旧版切槽方向，仅用于兼容旧预设，请改用 angle */
  orientation?: 'vertical' | 'horizontal';
  /** 槽宽；网格模式下作为圆孔直径 / 方孔边长 / 六边形对边尺寸 */
  slotWidth: number;
  /** 槽长；0 表示按所在面的 60% 自动取值。网格模式下不使用 */
  slotLength: number;
  /** 槽间距；网格模式下为相邻孔的间隙 */
  slotGap: number;
  /** 槽模式的条数；网格模式的列数 */
  slotCount: number;
  /** 网格模式的行数；缺省按 3 处理 */
  rows?: number;
  // 在所在面内的偏移：x = 水平方向，y = 竖直/纵向
  x: number;
  y: number;
};

/**
 * 把旧预设/缺字段的通风项补齐成完整形态。
 *
 * 向后兼容的关键：`angle` 缺省时从旧的 `orientation` 推导
 * （vertical → 90，horizontal → 0），所以旧 JSON 预设无需迁移。
 */
export const normalizeVentilation = (
  item: Ventilation,
): Required<Pick<Ventilation, 'mode' | 'angle' | 'rows'>> => ({
  mode: VENTILATION_MODES.includes(item.mode as VentilationMode)
    ? (item.mode as VentilationMode)
    : 'slot',
  angle: item.angle ?? (item.orientation === 'vertical' ? 90 : 0),
  rows: Math.max(Math.floor(item.rows ?? 3), 1),
});

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

/**
 * 盖板螺丝孔口的沉头窝形式：
 * - `none`：不开窝，螺丝头部直接压在盖板外表面上
 * - `counterbore`：圆柱沉头窝（平底），把螺栓头/螺帽整颗藏进盖板里
 * - `countersunk`：45° 锥坑，配沉头螺丝，螺帽与表面齐平
 */
export type LidScrewRecessType = 'counterbore' | 'countersunk' | 'none';

/** DIN 导轨（TH35）相对外壳的走向 */
export type DinRailOrientation = 'horizontal' | 'vertical';

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
  showAxes: boolean;
  gridSpacing: number;
  cornerRadius: number;
  holes: Hole[];
  pcbMounts: PCBMount[];
  cableClamps: CableClamp[];
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
   * 盖板螺丝孔口的沉头窝形式，见 `LidScrewRecessType`。`none` 表示不开窝。
   */
  lidScrewRecessType: LidScrewRecessType;
  /**
   * 沉头窝直径（mm）。
   * - `counterbore`：圆柱窝的直径，必须大于螺丝头/螺帽的外接圆才藏得住
   * - `countersunk`：锥坑大端直径；锥坑深度由它与孔径之差算出（固定 45°）
   */
  lidScrewRecessDiameter: number;
  /**
   * 沉头窝深度（mm），仅 `counterbore` 生效（`countersunk` 的深度由直径差决定）。
   * 实际生效值会被夹到 `[0.2, roof − 0.4]`，不会打穿盖板本体。
   */
  lidScrewRecessDepth: number;
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
  lidScrewRecessType: 'none',
  lidScrewRecessDiameter: 6.2,
  lidScrewRecessDepth: 3,
  dinRailMount: false,
  dinRailOrientation: 'horizontal',
  dinRailMountWidth: 15,
  cableClamps: [],
  dinRailScrewDiameter: 3.98,
  showDinRailMount: true,
};

export const cloneParams = (params: Params): Params => {
  return JSON.parse(JSON.stringify(params)) as Params;
};
