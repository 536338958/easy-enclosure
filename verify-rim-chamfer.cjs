// 验证「嵌入边顶端倒角」：
//  1) 楔环（倒角切掉的那圈实体）沿整条周边闭合 —— 按角度分箱，所有箱子都要有楔环
//  2) 楔环体积 ≈ 周长 × c²/2（45° 倒角的理论横截面积），校核倒角宽度是否达标
// 走的是 utils.topChamferTool 的真实实现。
// 注意 JSCAD 2.13 的 translate/transform 是惰性的，读 polygons 前必须 applyTransforms。
const load = (p) => {
  const m = require(p);
  return m && m.default ? m.default : m;
};
const { subtract } = require('@jscad/modeling/src/operations/booleans');
const { translate } = require('@jscad/modeling/src/operations/transforms');
const applyTransforms = load('@jscad/modeling/src/geometries/geom3/applyTransforms');
const measureVolume = load('@jscad/modeling/src/measurements/measureVolume');

const { DEFAULT_PARAMS, cloneParams } = require('./.verify-build/params.js');
const {
  cloverFrame,
  roundedFrame,
  topChamferTool,
  cloverOutline,
  roundedOutline,
} = require('./.verify-build/enclosure/utils.js');
const { insertRimRadius, lidTopChamferSize } = require('./.verify-build/enclosure/dimensions.js');
const { lid } = require('./.verify-build/enclosure/lid.js');

const BINS = 360;
const key = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`;

// 取某一 z 平面上的边界边（只出现一次的边）
const boundaryEdges = (solid, z, tol = 0.02) => {
  const edges = new Map();
  applyTransforms(solid).polygons.forEach((poly) => {
    const v = poly.vertices;
    const zs = v.map((p) => p[2]);
    if (Math.abs(Math.max(...zs) - z) > tol || Math.abs(Math.min(...zs) - z) > tol) return;
    for (let i = 0; i < v.length; i++) {
      const a = v[i];
      const b = v[(i + 1) % v.length];
      const ka = key(a);
      const kb = key(b);
      if (ka === kb) continue;
      const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const e = edges.get(k);
      if (e) e.n += 1;
      else edges.set(k, { n: 1, a, b });
    }
  });
  const out = [];
  edges.forEach((e) => {
    if (e.n === 1) out.push([e.a, e.b]);
  });
  return out;
};

// 楔环的角度覆盖：沿楔环每条边插点，投影到 XY 分箱
const angleCoverage = (solid, cx, cy) => {
  const hit = new Array(BINS).fill(false);
  applyTransforms(solid).polygons.forEach((poly) => {
    const v = poly.vertices;
    for (let i = 0; i < v.length; i++) {
      const a = v[i];
      const b = v[(i + 1) % v.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(1, Math.min(4000, Math.ceil(len / 0.2)));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        let ang = Math.atan2(y - cy, x - cx);
        if (ang < 0) ang += Math.PI * 2;
        hit[Math.min(BINS - 1, Math.floor((ang / (Math.PI * 2)) * BINS))] = true;
      }
    }
  });
  return hit;
};

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures += 1;
};

const run = (label, params) => {
  const rimInset = params.wall + params.insertClearance;
  const l = params.width - rimInset * 2;
  const w = params.length - rimInset * 2;
  const rimRadius = insertRimRadius(params);
  const rimTopZ = params.roof + params.insertHeight;
  // 与 lid.ts 一致：先按高度 / 厚度夹紧，再交给工具
  const c = lidTopChamferSize(params);

  const rimBody = params.lidScrews
    ? cloverFrame(l, w, params.insertHeight, params.insertThickness, rimRadius)
    : roundedFrame(l, w, params.insertHeight, params.insertThickness, params.cornerRadius);

  const outline = params.lidScrews ? cloverOutline(rimRadius) : roundedOutline(params.cornerRadius);

  console.log(`\n=== ${label} ===`);
  const t0 = Date.now();
  const tool = translate(
    [rimInset, rimInset, 0],
    topChamferTool(l, w, c, rimTopZ, outline),
  );
  const tTool = Date.now() - t0;

  if (c <= 0) {
    check('c=0 时工具为空（不切任何东西）', measureVolume(tool) < 0.01, `体积=${measureVolume(tool).toExponential(2)}`);
    return;
  }

  // 外周长：用轮廓柱体（实心，顶面只有一圈边界）。高度取 1 避免退化
  const prism = outline(l, w, 1);
  const edges = boundaryEdges(prism, 1);
  const perimeter = edges.reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);

  const vol = measureVolume(tool);
  const expected = (perimeter * c * c) / 2;
  const ratio = vol / expected;

  const hit = angleCoverage(tool, params.width / 2, params.length / 2);
  const missingBins = [];
  let ms = -1;
  for (let i = 0; i < BINS; i++) {
    if (!hit[i]) {
      if (ms < 0) ms = i;
    } else if (ms >= 0) {
      missingBins.push([ms, i - 1]);
      ms = -1;
    }
  }
  if (ms >= 0) missingBins.push([ms, BINS - 1]);

  console.log(
    `  c=${c}  lidScrews=${params.lidScrews}  轮廓半径=${rimRadius.toFixed(2)}  周长=${perimeter.toFixed(1)}mm  建工具 ${tTool}ms`,
  );
  console.log(`  楔环体积=${vol.toFixed(2)}mm³  理论=${expected.toFixed(2)}mm³  比值=${ratio.toFixed(3)}`);
  check(
    '楔环沿整圈闭合（360 个角度箱全部覆盖）',
    missingBins.length === 0,
    missingBins.length
      ? missingBins.map(([s, e]) => `${s}~${e}°`).join(', ')
      : '360/360',
  );
  check('倒角宽度达到设计值（体积比值 0.9~1.15）', ratio >= 0.9 && ratio <= 1.15, `${ratio.toFixed(3)}`);
  return { tool, rimBody, rimInset, rimTopZ };
};

run('默认参数 / 盖板螺丝开（clover 嵌入边）', cloneParams(DEFAULT_PARAMS));
const d12 = cloneParams(DEFAULT_PARAMS);
d12.lidTopChamfer = 1.2;
run('倒角放大到 1.2', d12);
const dOff = cloneParams(DEFAULT_PARAMS);
dOff.lidScrews = false;
run('盖板螺丝关（圆角矩形嵌入边）', dOff);
const dSmall = cloneParams(DEFAULT_PARAMS);
dSmall.lidScrewProtrusion = 0.8;
run('螺丝柱凸出量 0.8', dSmall);
const dNoWp = cloneParams(DEFAULT_PARAMS);
dNoWp.waterProof = false;
run('防水关闭（凸出量自动取最小值）', dNoWp);
const dSmallBox = cloneParams(DEFAULT_PARAMS);
dSmallBox.width = 40;
dSmallBox.length = 30;
dSmallBox.cornerRadius = 2;
run('小外壳 40×30（边界情形）', dSmallBox);
const dHuge = cloneParams(DEFAULT_PARAMS);
dHuge.lidTopChamfer = 5;
run('倒角 5mm（超额，应被夹到 1.6）', dHuge);
// 超额倒角不得把盖板整体削矮
{
  const mbb = load('@jscad/modeling/src/measurements/measureBoundingBox');
  const [, [, , maxZ]] = mbb(lid(dHuge));
  console.log('\n=== 超额倒角不得削矮盖板 ===');
  check(
    '盖板总高仍为 roof+insertHeight',
    Math.abs(maxZ - (dHuge.roof + dHuge.insertHeight)) < 1e-6,
    `maxZ=${maxZ.toFixed(4)}  期望=${(dHuge.roof + dHuge.insertHeight).toFixed(4)}`,
  );
}
const dZero = cloneParams(DEFAULT_PARAMS);
dZero.lidTopChamfer = 0;
run('倒角关闭（c=0）', dZero);

const t0 = Date.now();
for (let i = 0; i < 5; i++) lid(cloneParams(DEFAULT_PARAMS));
console.log(`\nlid() 端到端平均耗时：${((Date.now() - t0) / 5).toFixed(1)} ms`);

console.log(`\n${failures === 0 ? '全部通过' : failures + ' 项失败'}`);
process.exit(failures === 0 ? 0 : 1);
