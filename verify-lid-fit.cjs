// 验证：盖板嵌入边能否装进底壳 —— 干涉与间隙均匀性
//
// 背景（本次小版本修的 bug）：圆角矩形这条嵌入边路径上，外轮廓的圆角半径原来直接用
// cornerRadius、圆心还跟着 rim 往里挪，等于拿一个新圆角矩形当嵌入边，而不是把底壳
// 空腔做真等距内缩。壁厚一旦接近/超过 cornerRadius，底壳内腔四角的圆角已经塌成尖角
// （hollowRoundCube 里是 max(r - t, …)），嵌入边却还是大圆角，角部间隙从
// insertClearance 涨到 0.5~0.9mm，装配时明显对不上。
//
// 判据两条：
//   1. 沿嵌入边外轮廓采样，到「底壳容纳腔轮廓」的有符号距离必须处处为正（不干涉）
//   2. 间隙最大值不许显著超过 insertClearance（否则角部会松一大截）
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

// 底壳侧：嵌入边要插进去的那个空腔。防水时是密封圈槽（外边界在 wall），
// 非防水时是内腔本身（外边界也在 wall，因为 _wall = wall）。
const cavitySides = (p) => {
  const { width: W, length: L, wall } = p;
  if (p.waterProof) {
    const relief = getSealReliefRadius(p);
    const outer = p.lidScrews
      ? clover2d(W - wall * 2, L - wall * 2, relief)
      : roundedCube2d(W - wall * 2, L - wall * 2, Math.max(p.cornerRadius - wall, 0));
    return shift(sidesOf(outer), wall, wall);
  }
  const outer = p.lidScrews
    ? clover2d(W - wall * 2, L - wall * 2, screwPostProtrusion(p))
    : roundedCube2d(W - wall * 2, L - wall * 2, Math.max(p.cornerRadius - wall, 0));
  return shift(sidesOf(outer), wall, wall);
};

const insertSides = (p) => {
  const { width: W, length: L } = p;
  const rim = p.wall + p.insertClearance;
  const outer = p.lidScrews
    ? clover2d(W - rim * 2, L - rim * 2, screwPostProtrusion(p))
    : roundedCube2d(W - rim * 2, L - rim * 2, insertRimRadius(p));
  return shift(sidesOf(outer), rim, rim);
};

const gapRange = (p) => {
  const cav = cavitySides(p);
  const ins = insertSides(p);
  const pts = [];
  ins.forEach(([a, b]) => {
    pts.push(a);
    pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  });
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

console.log('\n=== 嵌入边 / 底壳空腔的装配间隙（目标 = insertClearance） ===');
const ic = DEFAULT_PARAMS.insertClearance;
for (const lidScrews of [true, false]) {
  for (const waterProof of [true, false]) {
    const label = `盖螺丝=${lidScrews ? '开' : '关'} 防水=${waterProof ? '开' : '关'}`;
    // 1 起 —— 参数面板里 wall 的 min 是 1，更小的取值 UI 上不可达。
// 已知边界：wall < ~0.92 时防水槽的让位半径会被「不得啃进内腔」的钳制压到小于
// 螺丝柱凸出量，槽与嵌入边就不同源了（角部间隙会涨到 1mm 量级）。要真正解决得让
// 凸出量本身跟着钳制，那会改默认产物，留待后续。
for (const wall of [1, 1.5, 2, 3, 4, 5, 6]) {
      const p = quiet({ lidScrews, waterProof, wall });
      const { min, max } = gapRange(p);
      const ok = min > -1e-6 && max <= ic + 0.05;
      check(
        `${label} wall=${wall} 间隙 ${min.toFixed(3)}~${max.toFixed(3)}mm`,
        ok,
        ok ? undefined : min <= -1e-6 ? '干涉' : '角部间隙过大',
      );
    }
  }
}

console.log('\n=== 3D 装配干涉（盖板倒扣装入底壳后的相交体积） ===');
for (const c of [
  { wall: 1, waterProof: true, lidScrews: true },
  { wall: 5, waterProof: true, lidScrews: true },
  { wall: 1, waterProof: false, lidScrews: false },
  { wall: 5, waterProof: false, lidScrews: false },
  { wall: 5, waterProof: true, lidScrews: false },
]) {
  const p = quiet(c);
  const solid = intersect(base(p), assembleLid(p, lid(p)));
  const vol = Math.abs(measureVolume(solid));
  check(
    `wall=${c.wall} 防水=${c.waterProof ? '开' : '关'} 盖螺丝=${c.lidScrews ? '开' : '关'}` +
      ` 干涉体积 ${vol.toFixed(3)}mm³`,
    vol < 0.05,
  );
}

console.log(failures === 0 ? '\n全部通过\n' : `\n失败 ${failures} 项\n`);
process.exit(failures === 0 ? 0 : 1);
