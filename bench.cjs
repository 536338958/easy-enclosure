const { DEFAULT_PARAMS, cloneParams } = require('./.verify-build/params.js');
const { base } = require('./.verify-build/enclosure/base.js');
const { lid } = require('./.verify-build/enclosure/lid.js');

const p = cloneParams(DEFAULT_PARAMS);

let t = process.hrtime.bigint();
base(p);
const tb = Number(process.hrtime.bigint() - t) / 1e6;

t = process.hrtime.bigint();
lid(p);
const tl = Number(process.hrtime.bigint() - t) / 1e6;

console.log(`SEG=${process.env.SEG}  base=${tb.toFixed(1)}ms  lid=${tl.toFixed(1)}ms  合计=${(tb + tl).toFixed(1)}ms`);
