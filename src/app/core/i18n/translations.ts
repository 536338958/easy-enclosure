export type Locale = 'zh' | 'en';

/** 用户可选的项：跟随系统 + 两种具体语言 */
export type LocalePreference = 'system' | Locale;

export const LOCALES: readonly Locale[] = ['zh', 'en'];

export const LOCALE_PREFERENCES: readonly LocalePreference[] = ['system', 'zh', 'en'];

/**
 * zh / en 两项恒用各自的母语显示，不随界面语言变化（中文 / English）；
 * 「跟随系统」跟随界面语言，见词典里的 `lang.system`。
 */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
};

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
};

export const ZH = {
  'lang.label': '界面语言',
  'lang.system': '跟随系统',
  'lang.zh': '中文',
  'lang.en': 'English',

  'surface.top': '盖板',
  'surface.bottom': '底面',
  'surface.left': '左面',
  'surface.right': '右面',
  'surface.front': '前面',
  'surface.back': '后面',
  'surface.seal': '密封圈',

  'sidebar.quickActions': '快捷操作',
  'sidebar.actions': '操作',
  'sidebar.internal': '内部尺寸',
  'sidebar.wallToWall': '内壁间距',
  'sidebar.screwToScrew': '螺柱间距',
  'sidebar.none': '无',
  'sidebar.params': '参数',
  'sidebar.support': '支持本项目',

  'tools.load': '加载',
  'tools.loadTitle': '从文件加载设置',
  'tools.save': '保存',
  'tools.saveTitle': '保存设置到文件',
  'tools.stl': 'STL',
  'tools.stlTitle': '导出为 STL',
  'tools.closeExport': '关闭导出窗口',
  'tools.exportDesc': '导出完整外壳，或仅导出 PCB 支柱以便快速试装检查。',
  'tools.exportPcbMounts': '导出 PCB 支柱',
  'tools.exportFull': '导出完整外壳',
  'tools.loadParseError': '无法解析该文件，请确认是本工具导出的 JSON 预设。',
  'tools.loadReadError': '文件读取失败，请重试。',

  'funding.sponsor': '赞助开发',
  'funding.coffee': '请我喝杯咖啡',
  'funding.star': '给 easy-enclosure 点个 Star',

  'renderer.generating': '生成中…',
  'renderer.collision': '⚠ PCB 与外壳发生碰撞：',
  'renderer.collisionWalls': '板体/元件超出内腔（撞到侧壁或内隔板）',
  'renderer.collisionCeiling': '元件顶部顶到盖板',

  'params.startOver': '从头开始',
  'params.remove': '移除',

  'params.general': '常规',
  'params.length': '长度',
  'params.lengthHint': '沿 Y 轴（前后）方向的外部尺寸，mm',
  'params.width': '宽度',
  'params.widthHint': '沿 X 轴（左右）方向的外部尺寸，mm',
  'params.height': '高度',
  'params.heightHint': '沿 Z 轴（上下）方向的外部总高，mm',
  'params.floor': '底板厚度',
  'params.floorHint': '基座底板的厚度，mm',
  'params.wall': '壁厚',
  'params.wallHint': '四周侧壁的厚度，mm',
  'params.roof': '盖板厚度',
  'params.roofHint': '顶盖板的厚度，mm',
  'params.cornerRadius': '圆角半径',
  'params.cornerRadiusHint': '四条竖直棱边的圆角半径，mm',

  'params.pcbPreview': 'PCB 预览',
  'params.pcbEnable': '启用预览',
  'params.pcbWidth': '宽度 (mm)',
  'params.pcbWidthHint': 'PCB 沿 X（左右）方向的尺寸，mm',
  'params.pcbLength': '长度 (mm)',
  'params.pcbLengthHint': 'PCB 沿 Y（前后）方向的尺寸，mm',
  'params.pcbThickness': '厚度 (mm)',
  'params.pcbThicknessHint': 'PCB 板本身的厚度，mm',
  'params.pcbComponentHeight': '元件高度 (mm)',
  'params.pcbComponentHeightHint': '板上方元件占用的净空高度，用于碰撞检测，mm',
  'params.offsetXLeft': '左右偏移 X（+ 向左面）',
  'params.offsetXLeftBaseHint': '以底座中心为 0，正值向左面（+X）移动，mm',
  'params.offsetYFront': '前后偏移 Y（+ 向前面）',
  'params.offsetYFrontBaseHint': '以底座中心为 0，正值向前面（+Y）移动，mm',
  'params.pcbPreviewHint':
    'PCB 底面自动落在底面支柱顶部（无支柱时落在内腔地板）。绿色表示未碰撞，红色表示与侧壁、内隔板或盖板发生碰撞。X / Y 以底座中心为原点。',

  'params.lid': '盖板',
  'params.lidInsert': '盖板嵌入边',
  'params.insertThickness': '嵌入边厚度',
  'params.insertThicknessHint': '盖板向下伸入基座的那圈内唇的壁厚，mm',
  'params.insertHeight': '嵌入边高度',
  'params.insertHeightHint': '内唇伸入基座的深度，越大扣合越牢，mm',
  'params.insertClearance': '嵌入间隙',
  'params.insertClearanceHint': '内唇与基座内壁的配合间隙，越大越松，mm',

  'params.snapFit': '卡扣盖 Snap-Fit',
  'params.snapFitEnable': '启用卡扣',
  'params.snapFitPreset': '卡扣数量预设',
  'params.snapFitPreset4': '4 个（长边两端）',
  'params.snapFitPreset6': '6 个（长边×4 + 短边中点×2）',
  'params.snapFitPreset8': '8 个（长短边各 4）',
  'params.snapFitPresetHint': '卡扣的总数与分布位置的预设',
  'params.snapFitEndPercent': '距端部百分比 (%)',
  'params.snapFitEndPercentHint': '卡扣离边两端的距离占该边长的百分比；越小越靠端部、彼此越远',
  'params.snapFitWidth': '卡扣宽度 (mm)',
  'params.snapFitWidthHint': '单个卡扣沿边方向的宽度，mm',
  'params.snapFitDepth': '凸起深度 (mm)',
  'params.snapFitDepthHint': '卡珠凸出墙面的高度（扣合量），mm',
  'params.snapFitHeight': '凸起高度 (mm)',
  'params.snapFitHeightHint': '卡珠沿竖直方向的高度，mm',
  'params.snapFitClearance': '配合间隙 (mm)',
  'params.snapFitClearanceHint': '基座凹槽比卡珠放大的间隙，越大越松，mm',
  'params.snapFitHint':
    '预设决定数量与所在边（长边优先）；距端部百分比越小，同一条边上两卡扣离两端越近、彼此间距越大。切换预设会重置为默认值（4→10%，6/8→20%），之后可自行微调。盖板插入边加圆润凸点、基座内壁开对应凹槽，适合免螺丝闭合；防水模式下建议仍保留螺丝或减小凸起。',

  'params.lidScrews': '盖板螺丝',
  'params.lidScrewsEnable': '启用盖板螺丝',
  'params.lidScrewsHint': '在四角生成螺丝柱，用螺丝把盖板固定到基座上。防水模式下必须开启。',
  'params.lidScrewThrough': '基座孔贯穿底板',
  'params.lidScrewThroughHint':
    '勾选（默认）：基座螺丝孔从底面贯穿到顶面。取消：基座孔不打通，底板整层留作底部余料，孔深＝总厚度−底板厚度，在底板顶面处终止。此开关只影响基座，盖板的孔始终贯穿。',
  'params.lidScrewDiameter': '盖板孔径',
  'params.lidScrewDiameterHint': '盖板一侧的过孔直径（螺丝穿过），mm',
  'params.baseLidScrewDiameter': '底座孔径',
  'params.baseLidScrewDiameterHint': '基座螺丝柱的孔径（自攻咬合，略小），mm',
  'params.lidScrewOffset': '孔位距边',
  'params.lidScrewOffsetHint':
    '螺丝孔中心到相邻两边的距离，mm。0＝自动（由圆角与孔径推算）。与螺丝柱凸出量互不影响：改凸出量只改变内腔角落那块实体的大小，孔位纹丝不动。当前生效 {value} mm。',
  'params.lidScrewProtrusion': '螺丝柱凸出量',
  'params.lidScrewProtrusionHint':
    '开启盖板螺丝后内腔四角凸出的那块实体，向腔内凸出多少，mm。0＝自动（直接取安全区间的最小值，够用即可、尽量少占内腔）；正值按该值凸出，超限自动夹紧。当前生效 {value} mm。只改变这块实体的大小，不影响螺丝孔位置。',

  'params.waterproof': '防水',
  'params.waterproofEnable': '启用防水',
  'params.waterproofHint': '开启后使用双层壁 + 密封圈槽结构，并强制启用盖板螺丝以压紧密封圈。',
  'params.sealThickness': '密封圈厚度',
  'params.sealThicknessHint': '密封圈（O 型条）截面厚度，mm',

  'params.internalWalls': '内隔板',
  'params.internalWallItem': '内隔板 {n}',
  'params.addInternalWall': '添加内隔板',
  'params.offsetXFloorHint': '以底面中心为 0，正值向左面（+X）移动，mm',
  'params.offsetYFloorHint': '以底面中心为 0，正值向前面（+Y）移动，mm',
  'params.wallHeight': '高度',
  'params.wallHeightHint': '隔板从底面向上的高度，mm',
  'params.wallLength': '长度',
  'params.wallLengthHint': '隔板延伸方向的长度（0° 时沿 Y），mm',
  'params.wallThickness': '厚度',
  'params.wallThicknessHint': '隔板的厚度，mm',
  'params.wallRotation': '旋转角度',
  'params.wallRotationHint': '绕竖直轴旋转，0° 沿 Y、90° 沿 X，度',

  'params.pcbMounts': 'PCB 支柱',
  'params.mountFillet': '根部过渡',
  'params.mountFilletHint': '支柱根部与底板的过渡形式，用来降低根部应力集中',
  'params.mountFilletNone': '无',
  'params.mountFilletRound': '圆角',
  'params.mountFilletChamfer': '斜角',
  'params.mountFilletSize': '过渡尺寸 (mm)',
  'params.mountFilletSizeHint':
    '圆角半径 / 斜角尺寸，mm；0＝关闭。会被自动夹到 0.4–1.5mm， 且不超过支柱高度的 40% 与外径的一半。当前生效 {value} mm。',
  'params.mountItem': '支柱 {n}',
  'params.addMount': '添加支柱',
  'params.mountSurface': '所在面',
  'params.mountSurfaceHint': '支柱立在哪个面上',
  'params.offsetHSide': '水平偏移 X（+ 向前面）',
  'params.offsetVSide': '垂直偏移 Y（+ 向上）',
  'params.offsetFaceHint': '以该面中心为 0，正值按标签方向移动，mm',
  'params.mountHeight': '高度',
  'params.mountHeightHint': '支柱高度（决定 PCB 离底面的距离），mm',
  'params.mountOuterDiameter': '外径',
  'params.mountOuterDiameterHint': '支柱柱体的外径，mm',
  'params.mountScrewDiameter': '螺丝孔径',
  'params.mountScrewDiameterHint': '支柱中心自攻螺丝孔直径，mm',

  'params.holes': '开孔',
  'params.holeItem': '开孔 {n}',
  'params.addHole': '添加开孔',
  'params.holeShape': '形状',
  'params.holeShapeHint': '开孔的轮廓形状',
  'params.holeShapeCircle': '圆形',
  'params.holeShapeSquare': '正方形',
  'params.holeShapeRectangle': '长方形',
  'params.holeSurface': '所在面',
  'params.holeSurfaceHint': '开孔开在哪个面上',
  'params.holeWidth': '宽度',
  'params.holeWidthHint': '方/矩形孔的边长（水平方向），mm',
  'params.holeLength': '长度',
  'params.holeLengthHint': '矩形孔的另一边长，mm',
  'params.holeDiameter': '直径',
  'params.holeDiameterHint': '圆孔直径，mm',
  'params.holesHint':
    'X / Y 均以所在面的中心为原点：正值方向见每个输入框的标签，可开启「网格 → 显示坐标轴」对照 X/Y/Z 方向。',

  'params.ventilation': '散热通风',
  'params.ventItem': '通风槽 {n}',
  'params.addVent': '添加通风槽',
  'params.ventSurface': '所在面',
  'params.ventSurfaceHint': '通风槽开在哪个面上',
  'params.ventOrientation': '切槽方向',
  'params.ventOrientationHint': '横切＝槽横向排列；竖切＝槽竖向排列',
  'params.ventOrientationHorizontal': '横切',
  'params.ventOrientationVertical': '竖切',
  'params.ventSlotWidth': '槽宽 (mm)',
  'params.ventSlotWidthHint': '单条槽的宽度（短边），mm',
  'params.ventSlotLength': '槽长 (mm，0=自动)',
  'params.ventSlotLengthHint': '单条槽的长度；0＝按面尺寸自动取 60%，mm',
  'params.ventSlotGap': '槽间距 (mm)',
  'params.ventSlotGapHint': '相邻两条槽之间的间隙，mm',
  'params.ventSlotCount': '槽数量',
  'params.ventSlotCountHint': '这组通风槽的条数',
  'params.ventilationHint':
    '横切/竖切决定槽的长轴方向；X 为该面水平偏移、Y 为竖直或纵向偏移（均以面中心为原点）。可添加多组，分布在不同面。',

  'params.wallMount': '壁挂',
  'params.wallMountEnable': '启用壁挂',
  'params.wallMountHint': '在基座左右两侧伸出带螺丝孔的挂耳，便于把盒子固定到墙面。',
  'params.wallMountCount': '挂耳数量',
  'params.wallMountCountHint': '2＝每侧 1 个（居中）；4＝每侧 2 个（靠两端）',
  'params.wallMountScrewDiameter': '螺丝孔径',
  'params.wallMountScrewDiameterHint': '挂耳上的螺丝孔直径，mm',
  'params.wallMountChamfer': '切角角度 (°)',
  'params.wallMountChamferHint':
    '挂耳外侧斜切角，单位度，默认 60，取值 {min}–{max}。超出范围会被拒绝并保留原值。实测角度越小切掉的实体越多。',
  'params.wallMountChamferError': '切角角度需在 {min}–{max}° 之间，已保持 {current}°。',
  'params.wallMountChamferNotNumber': '请输入数字。',

  'params.chamfer': '倒角',
  'params.baseBedChamfer': '基座底边倒角 (mm)',
  'params.baseBedChamferHint': '基座与打印床接触的底边 45° 倒角，防象脚；0＝关闭，mm',
  'params.lidBedChamfer': '盖板底边倒角 (mm)',
  'params.lidBedChamferHint': '盖板与打印床接触的底边 45° 倒角，防象脚；0＝关闭，mm',
  'params.lidTopChamfer': '嵌入边顶端倒角 (mm)',
  'params.lidTopChamferHint':
    '盖板上那圈插进基座的嵌入边，其顶端外缘的 45° 斜面，便于对准滑入；0＝关闭，mm',
  'params.lidScrewCountersink': '螺丝沉头倒角 (mm)',
  'params.lidScrewCountersinkHint':
    '盖板顶面螺丝孔口的 45° 锥坑，让沉头螺丝的螺帽沉进去、不凸出表面；0＝关闭。取值是径向扩展量、深度与之相等，会被夹到 0.2–2.5mm。仅对盖板螺丝生效。',
  'params.chamferHint':
    '底边倒角在与打印床接触的底边做 45° 倒角，缓解首层「象脚」溢出。基座底边倒角开启时，壁挂挂耳沿自身轮廓同步倒角，与主体底边连续。嵌入边顶端倒角会按嵌入边高度与圆角半径自动限制，不会削穿。',

  'params.display': '显示',
  'params.showBase': '显示基座',
  'params.showLid': '显示盖板',
  'params.showLidBaseHint':
    '单独查看某一部件时隐藏另一件。防水模式下密封圈随盖板一起显隐；PCB 预览与内隔板属于基座。',
  'params.showGrid': '显示网格',
  'params.showAxes': '显示坐标轴',
  'params.showAxesHint':
    '坐标轴以基座角点为原点：X 红（指向左面 +X）、Y 绿（指向前面 +Y）、Z 蓝（指向上 +Z），可对照各偏移参数的方向。',
  'params.gridSpacing': '网格间距 (mm)',
  'params.gridSpacingHint': '底部参考网格的小格边长，mm',
} as const;

export type TranslationKey = keyof typeof ZH;

export const EN: Record<TranslationKey, string> = {
  'lang.label': 'Interface language',
  'lang.system': 'Follow system',
  'lang.zh': '中文',
  'lang.en': 'English',

  'surface.top': 'Lid',
  'surface.bottom': 'Bottom',
  'surface.left': 'Left',
  'surface.right': 'Right',
  'surface.front': 'Front',
  'surface.back': 'Back',
  'surface.seal': 'Seal',

  'sidebar.quickActions': 'Quick actions',
  'sidebar.actions': 'Actions',
  'sidebar.internal': 'Internal size',
  'sidebar.wallToWall': 'Wall to wall',
  'sidebar.screwToScrew': 'Screw to screw',
  'sidebar.none': 'None',
  'sidebar.params': 'Parameters',
  'sidebar.support': 'Support this project',

  'tools.load': 'Load',
  'tools.loadTitle': 'Load settings from a file',
  'tools.save': 'Save',
  'tools.saveTitle': 'Save settings to a file',
  'tools.stl': 'STL',
  'tools.stlTitle': 'Export as STL',
  'tools.closeExport': 'Close export dialog',
  'tools.exportDesc':
    'Export the complete enclosure, or just the PCB mounts for a quick fit check.',
  'tools.exportPcbMounts': 'Export PCB mounts',
  'tools.exportFull': 'Export full enclosure',
  'tools.loadParseError':
    'Could not parse this file. Make sure it is a JSON preset exported by this tool.',
  'tools.loadReadError': 'Failed to read the file. Please try again.',

  'funding.sponsor': 'Sponsor development',
  'funding.coffee': 'Buy me a coffee',
  'funding.star': 'Star easy-enclosure on GitHub',

  'renderer.generating': 'Generating…',
  'renderer.collision': '⚠ PCB collides with the enclosure:',
  'renderer.collisionWalls':
    'Board or components exceed the cavity (hitting a side or internal wall)',
  'renderer.collisionCeiling': 'Component tops hit the lid',

  'params.startOver': 'Start over',
  'params.remove': 'Remove',

  'params.general': 'General',
  'params.length': 'Length',
  'params.lengthHint': 'Outer size along the Y axis (front to back), mm',
  'params.width': 'Width',
  'params.widthHint': 'Outer size along the X axis (left to right), mm',
  'params.height': 'Height',
  'params.heightHint': 'Total outer height along the Z axis (bottom to top), mm',
  'params.floor': 'Floor thickness',
  'params.floorHint': 'Thickness of the base floor, mm',
  'params.wall': 'Wall thickness',
  'params.wallHint': 'Thickness of the four side walls, mm',
  'params.roof': 'Lid thickness',
  'params.roofHint': 'Thickness of the top lid, mm',
  'params.cornerRadius': 'Corner radius',
  'params.cornerRadiusHint': 'Fillet radius of the four vertical edges, mm',

  'params.pcbPreview': 'PCB preview',
  'params.pcbEnable': 'Enable preview',
  'params.pcbWidth': 'Width (mm)',
  'params.pcbWidthHint': 'PCB size along X (left to right), mm',
  'params.pcbLength': 'Length (mm)',
  'params.pcbLengthHint': 'PCB size along Y (front to back), mm',
  'params.pcbThickness': 'Thickness (mm)',
  'params.pcbThicknessHint': 'Thickness of the PCB itself, mm',
  'params.pcbComponentHeight': 'Component height (mm)',
  'params.pcbComponentHeightHint':
    'Clearance taken by components above the board, used for collision checks, mm',
  'params.offsetXLeft': 'X offset (+ toward the left face)',
  'params.offsetXLeftBaseHint':
    '0 is the centre of the base; positive values move toward the left face (+X), mm',
  'params.offsetYFront': 'Y offset (+ toward the front face)',
  'params.offsetYFrontBaseHint':
    '0 is the centre of the base; positive values move toward the front face (+Y), mm',
  'params.pcbPreviewHint':
    'The underside of the PCB automatically rests on top of the floor mounts (or on the cavity floor when there are none). Green means no collision, red means it hits a side wall, an internal wall or the lid. X / Y originate at the centre of the base.',

  'params.lid': 'Lid',
  'params.lidInsert': 'Lid insert lip',
  'params.insertThickness': 'Lip thickness',
  'params.insertThicknessHint':
    'Wall thickness of the inner lip that reaches down into the base, mm',
  'params.insertHeight': 'Lip height',
  'params.insertHeightHint': 'How deep the lip reaches into the base; deeper holds tighter, mm',
  'params.insertClearance': 'Insert clearance',
  'params.insertClearanceHint':
    'Fit gap between the lip and the base inner wall; larger is looser, mm',

  'params.snapFit': 'Snap-fit lid',
  'params.snapFitEnable': 'Enable snap-fit',
  'params.snapFitPreset': 'Snap count preset',
  'params.snapFitPreset4': '4 (both ends of the long sides)',
  'params.snapFitPreset6': '6 (4 on long sides + 2 at short side midpoints)',
  'params.snapFitPreset8': '8 (4 per long and short side)',
  'params.snapFitPresetHint': 'Preset for the number of snaps and where they sit',
  'params.snapFitEndPercent': 'Distance from end (%)',
  'params.snapFitEndPercentHint':
    'Distance of a snap from the two ends of its edge, as a percentage of that edge; smaller means closer to the ends and further apart',
  'params.snapFitWidth': 'Snap width (mm)',
  'params.snapFitWidthHint': 'Width of a single snap along the edge, mm',
  'params.snapFitDepth': 'Bump depth (mm)',
  'params.snapFitDepthHint': 'How far the bump stands out from the wall (engagement), mm',
  'params.snapFitHeight': 'Bump height (mm)',
  'params.snapFitHeightHint': 'Height of the bump in the vertical direction, mm',
  'params.snapFitClearance': 'Fit clearance (mm)',
  'params.snapFitClearanceHint':
    'How much larger the base groove is than the bump; larger is looser, mm',
  'params.snapFitHint':
    'The preset decides how many snaps there are and which edges they sit on (long edges first). A smaller end percentage puts the two snaps of an edge closer to its ends and further apart from each other. Switching presets resets the value to the default (4 → 10%, 6/8 → 20%); you can fine-tune it afterwards. The lid insert gets rounded bumps and the base inner wall gets matching grooves, which suits screw-free closure. In waterproof mode, keep the screws or reduce the bump depth.',

  'params.lidScrews': 'Lid screws',
  'params.lidScrewsEnable': 'Enable lid screws',
  'params.lidScrewsHint':
    'Generates screw posts in the four corners so the lid can be screwed to the base. Required in waterproof mode.',
  'params.lidScrewThrough': 'Base holes through the floor',
  'params.lidScrewThroughHint':
    'Checked (default): the base screw holes run all the way from the bottom face to the top face. Unchecked: the holes stop short, the floor layer is left intact, and the hole depth equals total thickness minus floor thickness, ending at the top of the floor. This switch affects the base only; lid holes are always through-holes.',
  'params.lidScrewDiameter': 'Lid hole diameter',
  'params.lidScrewDiameterHint':
    'Clearance hole diameter on the lid side (screw passes through), mm',
  'params.baseLidScrewDiameter': 'Base hole diameter',
  'params.baseLidScrewDiameterHint':
    'Hole diameter in the base screw posts (self-tapping bite, slightly smaller), mm',
  'params.lidScrewOffset': 'Hole inset from edge',
  'params.lidScrewOffsetHint':
    'Distance from the hole centre to the two adjacent edges, mm. 0 = auto (derived from the corner radius and hole diameter). Independent of the screw post protrusion: changing the protrusion only resizes that corner block, the hole never moves. Currently {value} mm.',
  'params.lidScrewProtrusion': 'Screw post protrusion',
  'params.lidScrewProtrusionHint':
    'How far the block that appears in the four inner corners protrudes into the cavity when lid screws are on, mm. 0 = auto (takes the smallest safe value, just enough and keeps the cavity clear); a positive value protrudes by that amount and is clamped when out of range. Currently {value} mm. It only resizes that block and never moves the screw holes.',

  'params.waterproof': 'Waterproof',
  'params.waterproofEnable': 'Enable waterproof',
  'params.waterproofHint':
    'Switches to a double wall with a seal groove and forces the lid screws on so the seal gets compressed.',
  'params.sealThickness': 'Seal thickness',
  'params.sealThicknessHint': 'Cross-section thickness of the seal (O-ring cord), mm',

  'params.internalWalls': 'Internal walls',
  'params.internalWallItem': 'Internal wall {n}',
  'params.addInternalWall': 'Add internal wall',
  'params.offsetXFloorHint':
    '0 is the centre of the floor; positive values move toward the left face (+X), mm',
  'params.offsetYFloorHint':
    '0 is the centre of the floor; positive values move toward the front face (+Y), mm',
  'params.wallHeight': 'Height',
  'params.wallHeightHint': 'Height of the wall measured from the floor, mm',
  'params.wallLength': 'Length',
  'params.wallLengthHint': 'Length along the wall direction (along Y at 0°), mm',
  'params.wallThickness': 'Thickness',
  'params.wallThicknessHint': 'Thickness of the wall, mm',
  'params.wallRotation': 'Rotation',
  'params.wallRotationHint': 'Rotation about the vertical axis: 0° along Y, 90° along X, degrees',

  'params.pcbMounts': 'PCB mounts',
  'params.mountFillet': 'Base fillet',
  'params.mountFilletHint':
    'Transition between the post root and the floor, used to reduce stress concentration',
  'params.mountFilletNone': 'None',
  'params.mountFilletRound': 'Round',
  'params.mountFilletChamfer': 'Chamfer',
  'params.mountFilletSize': 'Fillet size (mm)',
  'params.mountFilletSizeHint':
    'Fillet radius / chamfer size, mm; 0 = off. It is clamped to 0.4–1.5 mm and never exceeds 40% of the post height or half the outer diameter. Currently {value} mm.',
  'params.mountItem': 'Mount {n}',
  'params.addMount': 'Add mount',
  'params.mountSurface': 'Face',
  'params.mountSurfaceHint': 'Which face the mount stands on',
  'params.offsetHSide': 'X offset (+ toward the front face)',
  'params.offsetVSide': 'Y offset (+ up)',
  'params.offsetFaceHint': '0 is the centre of the face; positive values follow the label, mm',
  'params.mountHeight': 'Height',
  'params.mountHeightHint': 'Post height (sets how far the PCB sits from the floor), mm',
  'params.mountOuterDiameter': 'Outer diameter',
  'params.mountOuterDiameterHint': 'Outer diameter of the post body, mm',
  'params.mountScrewDiameter': 'Screw hole diameter',
  'params.mountScrewDiameterHint': 'Diameter of the self-tapping screw hole in the post centre, mm',

  'params.holes': 'Holes',
  'params.holeItem': 'Hole {n}',
  'params.addHole': 'Add hole',
  'params.holeShape': 'Shape',
  'params.holeShapeHint': 'Outline shape of the hole',
  'params.holeShapeCircle': 'Circle',
  'params.holeShapeSquare': 'Square',
  'params.holeShapeRectangle': 'Rectangle',
  'params.holeSurface': 'Face',
  'params.holeSurfaceHint': 'Which face the hole is cut on',
  'params.holeWidth': 'Width',
  'params.holeWidthHint': 'Edge length of the square / rectangular hole (horizontal), mm',
  'params.holeLength': 'Length',
  'params.holeLengthHint': 'The other edge length of the rectangular hole, mm',
  'params.holeDiameter': 'Diameter',
  'params.holeDiameterHint': 'Diameter of the circular hole, mm',
  'params.holesHint':
    'X / Y are relative to the centre of the face: see each field label for the positive direction, and turn on “Display → Show axes” to compare the X/Y/Z directions.',

  'params.ventilation': 'Ventilation',
  'params.ventItem': 'Vent {n}',
  'params.addVent': 'Add vent',
  'params.ventSurface': 'Face',
  'params.ventSurfaceHint': 'Which face the vent is cut on',
  'params.ventOrientation': 'Slot direction',
  'params.ventOrientationHint': 'Horizontal = slots run across; vertical = slots run lengthwise',
  'params.ventOrientationHorizontal': 'Horizontal',
  'params.ventOrientationVertical': 'Vertical',
  'params.ventSlotWidth': 'Slot width (mm)',
  'params.ventSlotWidthHint': 'Width of a single slot (short edge), mm',
  'params.ventSlotLength': 'Slot length (mm, 0 = auto)',
  'params.ventSlotLengthHint': 'Length of a single slot; 0 = 60% of the face size, mm',
  'params.ventSlotGap': 'Slot gap (mm)',
  'params.ventSlotGapHint': 'Gap between two neighbouring slots, mm',
  'params.ventSlotCount': 'Slot count',
  'params.ventSlotCountHint': 'How many slots this group has',
  'params.ventilationHint':
    'Horizontal/vertical decides the long axis of the slots; X is the horizontal offset on that face and Y the vertical or longitudinal offset (both from the face centre). You can add several groups spread over different faces.',

  'params.wallMount': 'Wall mount',
  'params.wallMountEnable': 'Enable wall mount',
  'params.wallMountHint':
    'Adds tabs with screw holes on the left and right of the base, so the box can be fixed to a wall.',
  'params.wallMountCount': 'Tab count',
  'params.wallMountCountHint': '2 = one per side (centred); 4 = two per side (near the ends)',
  'params.wallMountScrewDiameter': 'Screw hole diameter',
  'params.wallMountScrewDiameterHint': 'Diameter of the screw hole in the tab, mm',
  'params.wallMountChamfer': 'Chamfer angle (°)',
  'params.wallMountChamferHint':
    'Bevel angle on the outer side of the tab, in degrees, default 60, range {min}–{max}. Values outside the range are rejected and the previous value is kept. In practice a smaller angle removes more material.',
  'params.wallMountChamferError': 'Chamfer angle must be between {min}–{max}°, keeping {current}°.',
  'params.wallMountChamferNotNumber': 'Please enter a number.',

  'params.chamfer': 'Chamfers',
  'params.baseBedChamfer': 'Base bed chamfer (mm)',
  'params.baseBedChamferHint':
    '45° chamfer on the base edge touching the print bed, prevents elephant footing; 0 = off, mm',
  'params.lidBedChamfer': 'Lid bed chamfer (mm)',
  'params.lidBedChamferHint':
    '45° chamfer on the lid edge touching the print bed, prevents elephant footing; 0 = off, mm',
  'params.lidTopChamfer': 'Insert lip top chamfer (mm)',
  'params.lidTopChamferHint':
    '45° bevel on the top outer edge of the lid insert lip, making it easier to align and slide in; 0 = off, mm',
  'params.lidScrewCountersink': 'Screw countersink (mm)',
  'params.lidScrewCountersinkHint':
    'A 45° conical recess at the screw hole on the lid top face, so a countersunk head sits flush instead of sticking out; 0 = off. The value is the radial expansion and the depth equals it, clamped to 0.2–2.5 mm. Applies to lid screws only.',
  'params.chamferHint':
    'Bed chamfers cut a 45° bevel along the edge touching the print bed, which reduces first-layer “elephant foot” flare. When the base bed chamfer is on, wall mount tabs are chamfered along their own outline so they stay continuous with the main bed edge. The insert lip top chamfer is automatically limited by the lip height and corner radius, so it cannot cut through.',

  'params.display': 'Display',
  'params.showBase': 'Show base',
  'params.showLid': 'Show lid',
  'params.showLidBaseHint':
    'Hide one part to inspect the other on its own. In waterproof mode the seal follows the lid; the PCB preview and internal walls belong to the base.',
  'params.showGrid': 'Show grid',
  'params.showAxes': 'Show axes',
  'params.showAxesHint':
    'The axes start at the base corner: X red (toward the left face, +X), Y green (toward the front face, +Y), Z blue (up, +Z). Use them to check the direction of each offset parameter.',
  'params.gridSpacing': 'Grid spacing (mm)',
  'params.gridSpacingHint': 'Cell size of the reference grid on the floor, mm',
};

export const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = {
  zh: ZH,
  en: EN,
};
