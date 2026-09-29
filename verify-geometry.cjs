const load = (p) => {
  const m = require(p);
  return m && m.default ? m.default : m;
};

const measureBoundingBox = load('@jscad/modeling/src/measurements/measureBoundingBox');
const measureVolume = load('@jscad/modeling/src/measurements/measureVolume');

const { DEFAULT_PARAMS, cloneParams } = require('./.verify-build/params.js');
const { base } = require('./.verify-build/enclosure/base.js');
const { lid } = require('./.verify-build/enclosure/lid.js');
const { internalWalls } = require('./.verify-build/enclosure/internalwalls.js');
const { pcbMountsOnBase } = require('./.verify-build/enclosure/pcbmount.js');
const { flange, flanges } = require('./.verify-build/enclosure/wallmount.js');
const { cavityFloorZ, innerWallInset } = require('./.verify-build/enclosure/dimensions.js');
const { clover } = require('./.verify-build/enclosure/utils.js');

let failures = 0;
const check = (name, ok, detail) => {
  if (ok) {
    console.log(`  PASS  ${name}${detail ? '  (' + detail + ')' : ''}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? '  (' + detail + ')' : ''}`);
  }
};
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

const oneWall = (h) => [{ x: 0, y: 0, height: h, length: 25, thickness: 2, rotation: 0 }];

const faceNormals = (solid) => {
  const out = [];
  solid.polygons.forEach((polygon) => {
    const v = polygon.vertices;
    if (v.length < 3) return;
    const [a, b, c] = v;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len < 1e-9) return;
    out.push([n[0] / len, n[1] / len, n[2] / len]);
  });
  return out;
};
const hasFaceAlong = (normals, t) =>
  normals.some((n) => Math.abs(n[0] * t[0] + n[1] * t[1] + n[2] * t[2]) > 0.999);

console.log('\n=== Bug 1: 挂耳切角是否为 45° ===');
{
  const params = cloneParams(DEFAULT_PARAMS);
  params.wallMountScrewDiameter = 4;
  const normals = faceNormals(flanges(params));
  const d1 = [Math.SQRT1_2, 0, Math.SQRT1_2];
  const d2 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
  const wrong = [Math.cos(45), 0, -Math.sin(45)];

  check('存在 45° 斜面', hasFaceAlong(normals, d1) || hasFaceAlong(normals, d2));
  check('不存在 58.4° 斜面（45 弧度）', !hasFaceAlong(normals, wrong));
  check('法向量数量非零', normals.length > 0, `${normals.length} 个面`);

  const single = faceNormals(flange(4));
  check('单个挂耳同样含 45° 斜面', hasFaceAlong(single, d1) || hasFaceAlong(single, d2));
}

console.log('\n=== Bug 2: 内腔地板基准一致性 ===');
{
  const combos = [];
  [true, false].forEach((lidScrews) =>
    [true, false].forEach((waterProof) => combos.push({ lidScrews, waterProof })),
  );

  combos.forEach(({ lidScrews, waterProof }) => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrews = lidScrews;
    params.waterProof = waterProof;
    params.floor = 3;
    params.wall = 1.5;
    params.internalWalls = oneWall(10);
    params.pcbMounts = [
      { surface: 'bottom', x: 0, y: 0, height: 5, outerDiameter: 6, screwDiameter: 2 },
    ];

    const expected = cavityFloorZ(params);
    const wallBottom = measureBoundingBox(internalWalls(params))[0][2];
    const mountBottom = measureBoundingBox(pcbMountsOnBase(params))[0][2];

    const tag = `lidScrews=${lidScrews} waterProof=${waterProof}`;
    check(`内隔板底 z 等于 cavityFloorZ (${tag})`, near(wallBottom, expected, 1e-6),
      `期望 ${expected.toFixed(4)}, 实测 ${wallBottom.toFixed(4)}`);
    check(`支柱底 z 与内隔板一致 (${tag})`, near(mountBottom, wallBottom, 1e-6));
  });

  const p = cloneParams(DEFAULT_PARAMS);
  p.lidScrews = false;
  p.waterProof = false;
  p.wall = 1.5;
  p.floor = 3;
  check('关闭盖板螺丝时内隔板不再用裸 floor', near(cavityFloorZ(p), 1.5, 1e-6),
    `cavityFloorZ=${cavityFloorZ(p)}`);
}

console.log('\n=== dimensions 派生值 ===');
{
  const a = cloneParams(DEFAULT_PARAMS);
  a.waterProof = false;
  a.wall = 1.5;
  check('非防水 innerWallInset = wall', near(innerWallInset(a), 1.5));

  const b = cloneParams(DEFAULT_PARAMS);
  b.waterProof = true;
  b.wall = 1;
  b.insertThickness = 2;
  b.insertClearance = 0.04;
  check('防水 innerWallInset = 2*wall + 2*clearance + insert',
    near(innerWallInset(b), 1 * 2 + 0.04 * 2 + 2, 1e-6));
}

console.log('\n=== base / lid 冒烟 ===');
{
  const params = cloneParams(DEFAULT_PARAMS);
  params.wallMounts = false;
  params.width = 100;
  params.length = 80;
  params.height = 30;

  const solid = base(params);
  const [lo, hi] = measureBoundingBox(solid);
  check('base 包围盒 x∈[0,100]', near(lo[0], 0, 1e-6) && near(hi[0], 100, 1e-6),
    `[${lo[0].toFixed(4)}, ${hi[0].toFixed(4)}]`);
  check('base 包围盒 y∈[0,80]', near(lo[1], 0, 1e-6) && near(hi[1], 80, 1e-6),
    `[${lo[1].toFixed(4)}, ${hi[1].toFixed(4)}]`);
  check('base 包围盒 z∈[0,30]', near(lo[2], 0, 1e-6) && near(hi[2], 30, 1e-6),
    `[${lo[2].toFixed(4)}, ${hi[2].toFixed(4)}]`);

  const vol = measureVolume(solid);
  check('base 体积为正且小于外廓体积', vol > 0 && vol < 100 * 80 * 30, `${vol.toFixed(2)} mm³`);

  const lidSolid = lid(params);
  const [, lidHi] = measureBoundingBox(lidSolid);
  check('lid 顶面 = roof + insertHeight',
    near(lidHi[2], params.roof + params.insertHeight, 1e-6),
    `${lidHi[2].toFixed(4)} vs ${(params.roof + params.insertHeight).toFixed(4)}`);
  check('lid 体积为正', measureVolume(lidSolid) > 0);

  const plain = cloneParams(DEFAULT_PARAMS);
  plain.wallMounts = false;
  plain.waterProof = false;
  const sealed = cloneParams(DEFAULT_PARAMS);
  sealed.wallMounts = false;
  sealed.waterProof = true;
  check('防水基座用料更多', measureVolume(base(sealed)) > measureVolume(base(plain)));
}

console.log('\n=== 性能：clover 细分段数对比 ===');
{
  const args = [100 - 4, 80 - 4, 30, 3];
  const time = (s) => {
    const t0 = process.hrtime.bigint();
    const g = clover(args[0], args[1], args[2], args[3], s);
    const t1 = process.hrtime.bigint();
    return { ms: Number(t1 - t0) / 1e6, faces: g.polygons.length };
  };
  time(48);
  const a = time(48);
  const b = time(100);
  console.log(`  48 段: ${a.ms.toFixed(1)} ms, ${a.faces} 面`);
  console.log(`  100 段: ${b.ms.toFixed(1)} ms, ${b.faces} 面`);
  console.log(`  提速约 ${(b.ms / a.ms).toFixed(2)}x，面数减少 ${(100 * (1 - a.faces / b.faces)).toFixed(1)}%`);
  check('降低段数确实更快', a.ms <= b.ms);
}

console.log('\n=== 性能：base / lid 全量构建 ===');
{
  const params = cloneParams(DEFAULT_PARAMS);
  const t0 = process.hrtime.bigint();
  base(params);
  const t1 = process.hrtime.bigint();
  lid(params);
  const t2 = process.hrtime.bigint();
  console.log(`  base(): ${(Number(t1 - t0) / 1e6).toFixed(1)} ms`);
  console.log(`  lid():  ${(Number(t2 - t1) / 1e6).toFixed(1)} ms`);
}

console.log(`\n${failures === 0 ? '全部通过' : failures + ' 项失败'}\n`);
process.exit(failures === 0 ? 0 : 1);
