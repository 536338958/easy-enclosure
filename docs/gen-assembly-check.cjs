/**
 * 生成「装配检查」用 STL 对：底壳 + 按真实装配姿态（嵌入边朝下、倒扣装入）摆好的盖板。
 *
 * 用途：Web 界面里盖板是摆在底壳旁边的（renderer SPACING=20），看不到装配关系，
 *       所以干涉只能靠导出 STL 后在切片软件 / 3D 查看器里合装目视。
 *
 * 用法：npm run verify:build && node docs/gen-assembly-check.cjs
 * 输出：docs/assembly-check/<name>-base.stl / -lid.stl
 *
 * 判读：把同名的一对 STL 同时导入，若两者在四角（或整圈嵌入边）互相穿插，
 *       即为 verify-lid-fit 报出的干涉；正常应该是严丝合缝、仅留 0.04mm 缝隙。
 */
const fs = require('fs');
const path = require('path');

const load = (p) => {
  const m = require(p);
  return m && m.default ? m.default : m;
};
const { mirror, translate } = load('@jscad/modeling/src/operations/transforms');
const { serialize } = require('@jscad/stl-serializer');

const { base } = require('../.verify-build/enclosure/base.js');
const { lid } = require('../.verify-build/enclosure/lid.js');
const { DEFAULT_PARAMS, cloneParams } = require('../.verify-build/params.js');

const OUT = path.join(__dirname, 'assembly-check');
fs.mkdirSync(OUT, { recursive: true });

/** 装配姿态：盖板镜像（嵌入边朝下）后抬到底壳顶面 —— 与 verify-lid-fit.cjs 一致 */
const assembled = (params, solid) =>
  translate([0, 0, params.height + params.roof], mirror({ normal: [0, 0, 1] }, solid));

// 前三个是 verify-lid-fit 报出干涉的组合，D 是无干涉的对照组
const cases = [
  { name: 'A-防水-关螺丝-wall3', wall: 3, waterProof: true, lidScrews: false },
  { name: 'B-防水-关螺丝-wall1', wall: 1, waterProof: true, lidScrews: false },
  { name: 'C-非防水-开螺丝-wall3', wall: 3, waterProof: false, lidScrews: true },
  { name: 'D-非防水-关螺丝-wall3', wall: 3, waterProof: false, lidScrews: false },
];

cases.forEach((c) => {
  const p = cloneParams(DEFAULT_PARAMS);
  Object.assign(p, { wall: c.wall, waterProof: c.waterProof, lidScrews: c.lidScrews });
  // 关掉会干扰目视的特征，只保留壳体与嵌入边本体
  p.holes = [];
  p.ventilation = [];
  p.cableClamps = [];
  p.wallMounts = false;
  p.internalWalls = [];
  p.pcbMounts = [];

  const baseSolid = base(p);
  const lidSolid = assembled(p, lid(p));

  const write = (suffix, solid) => {
    // 用 ASCII 模式（与 app 的 STL_FORMAT 一致）：返回值是字符串数组，join 即可。
    // 二进制模式返回 DataView 数组，处理不当会得到 3 字节的废文件。
    const out = serialize({ binary: false }, solid);
    const text = Array.isArray(out) ? out.join('') : String(out);
    const file = path.join(OUT, `${c.name}-${suffix}.stl`);
    fs.writeFileSync(file, text, 'utf8');
    return file;
  };

  const fb = write('base', baseSolid);
  const fl = write('lid', lidSolid);
  console.log(
    `${c.name.padEnd(26)} base=${(fs.statSync(fb).size / 1024).toFixed(0)}KB` +
      `  lid=${(fs.statSync(fl).size / 1024).toFixed(0)}KB`,
  );
});

console.log(`\n输出目录：${OUT}`);
