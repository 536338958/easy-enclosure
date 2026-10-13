// 验证：盖板嵌入边能否装进底壳 —— 干涉、间隙、以及角部弧度不退化
//
// 装配关系（上游原版的设计，本项目同步）：
//   底壳内腔  = 外壳「同族缩放」：长宽减 2·wall，圆角半径**保持不变**
//   嵌入边外廓 = 内腔「同族缩放」：长宽再减 2·insertClearance，半径仍保持不变
//
// 于是直边间隙 = insertClearance、角部间隙 = insertClearance·√2，处处为正，
// 且**与壁厚无关** —— 这是判据 1、2 的来源。
//
// 反面教材：若把内缩做成真等距（内外同心、半径 r - t），壁厚 ≥ cornerRadius 时
// 内腔圆角会被吃成 0、四角塌成尖角（判据 3 抓这个），嵌入边不同步退化就装不进去，
// 同步退化则嵌入边也变成直角 —— 两头都不对，别再改回去。
//
// 判据四条：
//   1. 沿嵌入边外轮廓采样，到「底壳容纳腔外轮廓」的有符号距离必须处处为正（不干涉）
//   2. 间隙不超过 insertClearance·√2 + 容差（角部按设计就该是这个值，再大就说明
//      两条轮廓不同源了）
//   3. 底壳容纳腔的角部圆弧半径必须等于 cornerRadius —— 不随壁厚衰减
//   4. 防水时还要查内圈：嵌入边的内表面不许啃进槽内侧的那道实体墙
const load = (p) => {
  const m = require(p);
  return m && m.default ? m.default : m;
};
const measureVolume = load('@jscad/modeling/src/measurements/measureVolume');
const { intersect } = load('@jscad/modeling/src/operations/booleans');
const { mirror, translate } = load('@jscad/modeling/src/operations/transforms');

const { clover2d, roundedCube2d } = require('./.verify-build/enclosure/utils.js');
const { screwPostProtrusion, insertRimRadius } = require('./.verify-build/enclosure/screws.js');
const { getSealReliefRadius } = require('./.verify-build/enclosure/waterproofseal.js');
const { base } = require('./.verify-build/enclosure/base.js');
const { lid } = require('./.verify-build/enclosure/lid.js');
const { DEFAULT_PARAMS, cloneParams } = require('./.verify-build/params.js');

let failures = 0;
const check = (name, ok, detail) => {
  if (ok) {
    console.log(`  PASS  ${name}${detail ? '  (' + detail + ')' : ''}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? '  (' + detail + ')' : ''}`);
  }
};

const sidesOf = (g) => (Array.isArray(g) ? g : [g]).flatMap((x) => x.sides || []);
const shift = (s, dx, dy) => s.map(([a, b]) => [[a[0] + dx, a[1] + dy], [b[0] + dx, b[1] + dy]]);

const inside = (sides, x, y) => {
  let c = 0;
  for (const [a, b] of sides) {
    const [x1, y1] = a;
    const [x2, y2] = b;
    if (y1 === y2) continue;
    if (y < Math.min(y1, y2) || y >= Math.max(y1, y2)) continue;
    const t = (y - y1) / (y2 - y1);
    if (x1 + t * (x2 - x1) > x) c += 1;
  }
  return c % 2 === 1;
};

const distToSeg = (px, py, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
};

const signedDist = (sides, px, py) => {
  let d = Infinity;
  for (const [a, b] of sides) d = Math.min(d, distToSeg(px, py, a, b));
  return inside(sides, px, py) ? d : -d;
};

const verticesOf = (sides) => {
  const pts = [];
  sides.forEach(([a, b]) => {
    pts.push(a);
    pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  });
  return pts;
};

// 从矩形尖角点沿 45° 方向量到边界的距离 → 反推圆角半径 R = d / (√2 - 1)
const cornerRadiusOf = (sides, cx, cy) => {
  const step = 0.002;
  for (let t = 0; t < 60; t += step) {
    const x = cx + t * Math.SQRT1_2;
    const y = cy + t * Math.SQRT1_2;
    if (inside(sides, x, y)) {
      return Math.hypot(x - cx, y - cy) / (Math.SQRT2 - 1);
    }
  }
  return NaN;
};

// 底壳侧：嵌入边要插进去的那个空腔的外边界。
// 防水时是密封圈槽（外边界在 wall），非防水时是内腔本身（外边界也在 wall）。
const cavityOuterSides = (p) => {
  const { width: W, length: L, wall } = p;
  const outer = p.lidScrews
    ? clover2d(W - wall * 2, L - wall * 2, screwPostProtrusion(p))
    : roundedCube2d(W - wall * 2, L - wall * 2, p.cornerRadius);
  return shift(sidesOf(outer), wall, wall);
};

// 防水槽的内边界 —— 它内侧还有一道 wall 厚的实体墙，嵌入边不许啃进去
const grooveInnerSides = (p) => {
  const { width: W, length: L, wall, insertThickness, insertClearance } = p;
  const tg = insertThickness + insertClearance * 2;
  const inner = p.lidScrews
    ? clover2d(W - wall * 2 - tg * 2, L - wall * 2 - tg * 2, getSealReliefRadius(p))
    : roundedCube2d(W - wall * 2 - tg * 2, L - wall * 2 - tg * 2, insertRimRadius(p));
  return shift(sidesOf(inner), wall + tg, wall + tg);
};

const insertOuterSides = (p) => {
  const { width: W, length: L } = p;
  const rim = p.wall + p.insertClearance;
  const outer = p.lidScrews
    ? clover2d(W - rim * 2, L - rim * 2, screwPostProtrusion(p))
    : roundedCube2d(W - rim * 2, L - rim * 2, insertRimRadius(p));
  return shift(sidesOf(outer), rim, rim);
};

// 嵌入边的内表面（外表面再内缩一个 insertThickness，与 roundedFrame/cloverFrame 一致）
const insertInnerSides = (p) => {
  const { width: W, length: L, insertThickness } = p;
  const rim = p.wall + p.insertClearance + insertThickness;
  const r = insertRimRadius(p);
  const inner = p.lidScrews
    ? clover2d(W - rim * 2, L - rim * 2, r)
    : roundedCube2d(W - rim * 2, L - rim * 2, r);
  return shift(sidesOf(inner), rim, rim);
};

const gapRange = (p) => {
  const cav = cavityOuterSides(p);
  const pts = verticesOf(insertOuterSides(p));
  let min = Infinity;
  let max = -Infinity;
  for (const [x, y] of pts) {
    const d = signedDist(cav, x, y);
    min = Math.min(min, d);
    max = Math.max(max, d);
  }
  return { min, max };
};

// 装配：lid 建模时嵌入边朝 +Z，实际是倒扣装进去的 —— 镜像后抬到底壳顶面
const assembleLid = (p, lidSolid) =>
  translate([0, 0, p.height + p.roof], mirror({ normal: [0, 0, 1] }, lidSolid));

const quiet = (over) => {
  const p = cloneParams(DEFAULT_PARAMS);
  Object.assign(p, over);
  p.holes = [];
  p.ventilation = [];
  p.cableClamps = [];
  p.wallMounts = false;
  p.internalWalls = [];
  p.pcbMounts = [];
  return p;
};

const ic = DEFAULT_PARAMS.insertClearance;
const maxGap = ic * Math.SQRT2; // 角部按设计就该是这个值

console.log('\n=== 嵌入边 / 底壳空腔的装配间隙（直边 = insertClearance，角部 = ×√2） ===');
console.log(`目标区间 0 ~ ${maxGap.toFixed(3)}mm`);
for (const lidScrews of [true, false]) {
  for (const waterProof of [true, false]) {
    const label = `盖螺丝=${lidScrews ? '开' : '关'} 防水=${waterProof ? '开' : '关'}`;
    // 1 起 —— 参数面板里 wall 的 min 是 1，更小的取值 UI 上不可达。
    for (const wall of [1, 1.5, 2, 3, 4, 5, 6]) {
      const p = quiet({ lidScrews, waterProof, wall });
      const { min, max } = gapRange(p);
      const ok = min > -1e-6 && max <= maxGap + 0.02;
      check(
        `${label} wall=${wall} 间隙 ${min.toFixed(3)}~${max.toFixed(3)}mm`,
        ok,
        ok ? undefined : min <= -1e-6 ? '干涉' : '角部间隙过大（两条轮廓不同源）',
      );
    }
  }
}

console.log('\n=== 底壳空腔角部圆弧半径（应恒为 cornerRadius，不随壁厚衰减） ===');
for (const wall of [1, 2, 3, 4, 5, 6]) {
  const p = quiet({ lidScrews: false, waterProof: false, wall });
  const r = cornerRadiusOf(cavityOuterSides(p), wall, wall);
  const ok = Math.abs(r - p.cornerRadius) < 0.05;
  check(
    `wall=${wall} 腔角半径 ${r.toFixed(3)}mm（期望 ${p.cornerRadius}）`,
    ok,
    ok ? undefined : '角部弧度被壁厚吃掉了',
  );
}

console.log('\n=== 防水槽内侧：嵌入边内表面不许啃进槽内侧的实体墙 ===');
for (const lidScrews of [true, false]) {
  for (const wall of [1, 2, 3, 4, 5, 6]) {
    const p = quiet({ lidScrews, waterProof: true, wall });
    const inner = grooveInnerSides(p);
    let min = Infinity;
    for (const [x, y] of verticesOf(insertInnerSides(p))) {
      // 正值 = 在实体墙之外（安全），负值 = 啃进去了
      min = Math.min(min, -signedDist(inner, x, y));
    }
    check(
      `盖螺丝=${lidScrews ? '开' : '关'} wall=${wall} 余量 ${min.toFixed(3)}mm`,
      min > -1e-6,
      min > -1e-6 ? undefined : '啃进槽内侧实体墙',
    );
  }
}

console.log('\n=== 3D 装配干涉（盖板倒扣装入底壳后的相交体积） ===');
for (const lidScrews of [true, false]) {
  for (const waterProof of [true, false]) {
    for (const wall of [1, 3, 5]) {
      const p = quiet({ lidScrews, waterProof, wall });
      const solid = intersect(base(p), assembleLid(p, lid(p)));
      const vol = Math.abs(measureVolume(solid));
      check(
        `wall=${wall} 防水=${waterProof ? '开' : '关'} 盖螺丝=${lidScrews ? '开' : '关'}` +
          ` 干涉体积 ${vol.toFixed(3)}mm³`,
        vol < 0.05,
      );
    }
  }
}

console.log(failures === 0 ? '\n全部通过\n' : `\n失败 ${failures} 项\n`);
process.exit(failures === 0 ? 0 : 1);
