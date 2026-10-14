// 一次性自检：盖板螺丝沉头窝（counterbore / countersunk）
// 用法：npm run verify:build && node verify-recess.cjs
const load = (p) => {
  const m = require(p);
  return m && m.default ? m.default : m;
};

const measureVolume = load('@jscad/modeling/src/measurements/measureVolume');
const measureBoundingBox = load('@jscad/modeling/src/measurements/measureBoundingBox');
const { intersect } = require('@jscad/modeling/src/operations/booleans');
const { cuboid } = require('@jscad/modeling/src/primitives');
const { translate } = require('@jscad/modeling/src/operations/transforms');

const { DEFAULT_PARAMS } = require('./.verify-build/params.js');
const { lid } = require('./.verify-build/enclosure/lid.js');
const { screwOffset, screwDiameterMax } = require('./.verify-build/enclosure/dimensions.js');

const clone = (p) => JSON.parse(JSON.stringify(p));

// 探针：某点上有没有材料
const materialAt = (solid, at) => {
  try {
    return Math.abs(measureVolume(intersect(solid, translate(at, cuboid({ size: [0.15, 0.15, 0.08] })))));
  } catch {
    return 0;
  }
};

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
};

const base = () => {
  const p = clone(DEFAULT_PARAMS);
  p.lidScrews = true;
  p.waterProof = false;
  p.holes = [];
  return p;
};

const holeXY = (p) => {
  const o = screwOffset(p, screwDiameterMax(p));
  return [o, o];
};

console.log('=== 盖板螺丝沉头窝自检 ===\n');

// 1. 三种形式都能建模，且体积关系正确
console.log('--- 体积关系 ---');
{
  const none = base();
  none.lidScrewRecessType = 'none';

  const cb = base();
  cb.lidScrewRecessType = 'counterbore';
  cb.lidScrewRecessDiameter = 6.2;
  cb.lidScrewRecessDepth = 1.5;

  const cs = base();
  cs.lidScrewRecessType = 'countersunk';
  cs.lidScrewRecessDiameter = 6.2;

  const vNone = measureVolume(lid(none));
  const vCb = measureVolume(lid(cb));
  const vCs = measureVolume(lid(cs));

  console.log(`  none=${vNone.toFixed(1)}  counterbore=${vCb.toFixed(1)}  countersunk=${vCs.toFixed(1)}`);
  check('开窝后体积变小', vCb < vNone && vCs < vNone);
  check('削掉量很小（不是整片切没）', vNone - vCb < vNone * 0.02 && vNone - vCs < vNone * 0.02,
    `Δcb=${(vNone - vCb).toFixed(1)} Δcs=${(vNone - vCs).toFixed(1)}`);
  check('体积仍为正', vCb > 0 && vCs > 0);
}

// 2. 孔口确实张开、且只加宽孔口
console.log('\n--- 孔口形状（counterbore，深 1.5）---');
{
  const p = base();
  p.lidScrewRecessType = 'counterbore';
  p.lidScrewRecessDiameter = 6.2;
  p.lidScrewRecessDepth = 1.5;

  const off = base();
  off.lidScrewRecessType = 'none';

  const [cx, cy] = holeXY(p);
  const holeR = p.lidScrewDiameter / 2;
  const probeR = holeR + 0.8; // 落在窝内、超出螺丝孔本身

  const solid = lid(p);
  const plain = lid(off);

  check('窝内浅处被切空', materialAt(solid, [cx + probeR, cy, 0.05]) < 1e-3);
  check('不开窝时同一点是实心', materialAt(plain, [cx + probeR, cy, 0.05]) > 1e-3);
  // 探针要整体落在盖板本体内（z ∈ [0, roof]），别压到本体与嵌入边的交界处
  check('窝底以下仍是实心（只加宽孔口）', materialAt(solid, [cx + probeR, cy, 1.8]) > 1e-3);
}

// 3. 深度夹紧：不打穿盖板本体
console.log('\n--- 深度夹紧（roof=2.4，请求 99mm）---');
{
  const p = base();
  p.roof = 2.4;
  p.lidScrewRecessType = 'counterbore';
  p.lidScrewRecessDiameter = 6.2;
  p.lidScrewRecessDepth = 99;

  const [cx, cy] = holeXY(p);
  const solid = lid(p);
  const holeR = p.lidScrewDiameter / 2;

  check('不抛错', true);
  check('窝底之下还留一层材料', materialAt(solid, [cx + holeR + 0.8, cy, 2.2]) > 1e-3);
  check('盖板总高不变', Math.abs(measureBoundingBox(solid)[1][2] - (p.roof + p.insertHeight)) < 1e-6);
}

// 4. 锥坑：45°，深度 =（直径 − 孔径）/ 2
console.log('\n--- 锥坑 45° ---');
{
  const p = base();
  p.lidScrewRecessType = 'countersunk';
  p.lidScrewDiameter = 3;
  p.lidScrewRecessDiameter = 7;

  const [cx, cy] = holeXY(p);
  const solid = lid(p);
  const holeR = p.lidScrewDiameter / 2;

  // 深度 2mm：z=0.05 处半径 ~3.5 内应空；z=1.5 处半径 2.0 外应实心
  check('锥坑口部张开', materialAt(solid, [cx + holeR + 1.2, cy, 0.05]) < 1e-3);
  check('锥坑向下收窄（深处孔壁恢复）', materialAt(solid, [cx + holeR + 1.2, cy, 1.6]) > 1e-3);
}

// 5. 四种孔型 × 三种窝形式组合都能建模
console.log('\n--- 孔型 × 窝形式组合（9 组）---');
{
  let built = 0;
  for (const holeType of ['through', 'blind', 'nut-pocket']) {
    for (const recess of ['none', 'counterbore', 'countersunk']) {
      const p = base();
      p.lidScrewHoleType = holeType;
      p.lidScrewRecessType = recess;
      const v = measureVolume(lid(p));
      if (v > 0) built++;
    }
  }
  check('9 组全部产出正体积实体', built === 9, `${built}/9`);
}

// 6. 关掉盖板螺丝时不生成窝
console.log('\n--- 无盖板螺丝 ---');
{
  const p = base();
  p.lidScrews = false;
  p.lidScrewRecessType = 'counterbore';
  const v = measureVolume(lid(p));
  const off = base();
  off.lidScrews = false;
  off.lidScrewRecessType = 'none';
  check('两者体积一致（窝被跳过）', Math.abs(v - measureVolume(lid(off))) < 1e-6);
}

console.log(`\n${failures === 0 ? '全部通过' : failures + ' 项失败'}`);
process.exit(failures === 0 ? 0 : 1);
