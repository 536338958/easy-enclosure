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
// 上游基座没有 dimensions.ts：cavityFloorZ 在 pcbpreview（实现已下沉到 utils），
// innerWallInset 在 utils。这里按上游的模块布局取用。
const { cavityFloorZ } = require('./.verify-build/enclosure/pcbpreview.js');
const { innerWallInset, clover } = require('./.verify-build/enclosure/utils.js');

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

console.log('\n=== Bug 1: 挂耳切角角度是否按「度」解释 ===');
// 原来的判据依赖默认 45°。切角改成可配置、默认 60° 之后它失效了：
// 60° 与「45 被当弧度」得到的 58.4° 只差 1.6°，法向量点积 0.9997 会越过
// >0.999 的阈值，把正常的 60° 斜面误判成弧度 bug。
// 改成显式传角度逐个验证：真正能区分度/弧度的是 45（vs 58.4）这类取值。
{
  const along = (deg) => [Math.cos((deg * Math.PI) / 180), 0, -Math.sin((deg * Math.PI) / 180)];
  // 45 若被当弧度解释，等价于 45 rad 对 2π 取模 ≈ 58.4°
  const radBugDeg = ((45 % (Math.PI * 2)) * 180) / Math.PI;

  [45, 60, 70].forEach((angle) => {
    const single = faceNormals(flange(4, angle));
    check(
      `flange(4, ${angle}) 切出 ${angle}° 斜面`,
      hasFaceAlong(single, along(angle)) || hasFaceAlong(single, along(-angle)),
      `法向量 ${single.length} 个`,
    );
    if (Math.abs(angle - radBugDeg) > 2) {
      check(
        `flange(4, ${angle}) 不含 ${radBugDeg.toFixed(1)}° 斜面（度/弧度混淆）`,
        !hasFaceAlong(single, along(radBugDeg)),
      );
    }
  });

  // 45° 是唯一能干净区分「度 vs 弧度」的取值，单独再确认一次
  const at45 = faceNormals(flange(4, 45));
  check(
    `45° 下不存在 ${radBugDeg.toFixed(1)}° 斜面（即 rotateY 走了 degToRad）`,
    !hasFaceAlong(at45, along(radBugDeg)),
    `若为弧度 bug 则会出现 ${radBugDeg.toFixed(1)}°`,
  );

  const params = cloneParams(DEFAULT_PARAMS);
  params.wallMountScrewDiameter = 4;
  const normals = faceNormals(flanges(params));
  check('法向量数量非零', normals.length > 0, `${normals.length} 个面`);

  // 底边倒角是固定 45°，与切角角度无关，应当始终存在
  const bed = faceNormals(flange(4, 60, 0.8));
  check(
    '底边倒角为 45°（与切角角度解耦）',
    hasFaceAlong(bed, [Math.SQRT1_2, 0, Math.SQRT1_2]) ||
      hasFaceAlong(bed, [Math.SQRT1_2, 0, -Math.SQRT1_2]),
  );
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
    check(
      `内隔板底 z 等于 cavityFloorZ (${tag})`,
      near(wallBottom, expected, 1e-6),
      `期望 ${expected.toFixed(4)}, 实测 ${wallBottom.toFixed(4)}`,
    );
    check(`支柱底 z 与内隔板一致 (${tag})`, near(mountBottom, wallBottom, 1e-6));
  });

  const p = cloneParams(DEFAULT_PARAMS);
  p.lidScrews = false;
  p.waterProof = false;
  p.wall = 1.5;
  p.floor = 3;
  check(
    '关闭盖板螺丝时内隔板不再用裸 floor',
    near(cavityFloorZ(p), 1.5, 1e-6),
    `cavityFloorZ=${cavityFloorZ(p)}`,
  );
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
  check(
    '防水 innerWallInset = 2*wall + 2*clearance + insert',
    near(innerWallInset(b), 1 * 2 + 0.04 * 2 + 2, 1e-6),
  );
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
  check(
    'base 包围盒 x∈[0,100]',
    near(lo[0], 0, 1e-6) && near(hi[0], 100, 1e-6),
    `[${lo[0].toFixed(4)}, ${hi[0].toFixed(4)}]`,
  );
  check(
    'base 包围盒 y∈[0,80]',
    near(lo[1], 0, 1e-6) && near(hi[1], 80, 1e-6),
    `[${lo[1].toFixed(4)}, ${hi[1].toFixed(4)}]`,
  );
  check(
    'base 包围盒 z∈[0,30]',
    near(lo[2], 0, 1e-6) && near(hi[2], 30, 1e-6),
    `[${lo[2].toFixed(4)}, ${hi[2].toFixed(4)}]`,
  );

  const vol = measureVolume(solid);
  check('base 体积为正且小于外廓体积', vol > 0 && vol < 100 * 80 * 30, `${vol.toFixed(2)} mm³`);

  const lidSolid = lid(params);
  const [, lidHi] = measureBoundingBox(lidSolid);
  check(
    'lid 顶面 = roof + insertHeight',
    near(lidHi[2], params.roof + params.insertHeight, 1e-6),
    `${lidHi[2].toFixed(4)} vs ${(params.roof + params.insertHeight).toFixed(4)}`,
  );
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
  // 单次计时噪声能到 ±30%，这里取多轮最小值。
  // 计时是机器相关的，只作信息输出、不计入失败（面数才是确定性的）。
  const best = (s) => {
    let r = time(s);
    for (let i = 0; i < 4; i += 1) {
      const t = time(s);
      if (t.ms < r.ms) r = t;
    }
    return r;
  };
  time(48);
  const a = best(48);
  const b = best(100);
  console.log(`  48 段: ${a.ms.toFixed(1)} ms, ${a.faces} 面`);
  console.log(`  100 段: ${b.ms.toFixed(1)} ms, ${b.faces} 面`);
  console.log(
    `  提速约 ${(b.ms / a.ms).toFixed(2)}x，面数减少 ${(100 * (1 - a.faces / b.faces)).toFixed(1)}%`,
  );
  check('降低段数确实减少面数（确定性判据）', a.faces < b.faces, `${a.faces} < ${b.faces}`);
  if (a.ms > b.ms) {
    console.log('  注意：48 段本轮未跑赢 100 段，计时受机器负载影响，仅供参考');
  }
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
