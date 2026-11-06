/**
 * Development harness for Conv 3D Lab.
 *
 * Loads the Client factory outside the browser (fake module loader + React
 * stub) and exercises the pure model code: shape inference with stride and
 * padding, filter normalisation, scene geometry, and locale coverage of every
 * key the panel reads.
 *
 *   node test/conv-lab.test.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let captured = null;
globalThis.window = {
  __ModuleLoader__: { load(def) { captured = def; } },
  devicePixelRatio: 1,
  requestAnimationFrame() { return 0; },
  cancelAnimationFrame() {},
};

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
await import(new URL('../client.js', import.meta.url).href);
if (!captured) throw new Error('module did not register with the loader');
if (captured.id !== '@local/conv-3d-lab') throw new Error('unexpected module id ' + captured.id);

const reactStub = {
  createElement() { return null; },
  useState(v) { return [typeof v === 'function' ? v() : v, function () {}]; },
  useEffect() {},
  useMemo(fn) { return fn(); },
  useRef(v) { return { current: v }; },
};

const mod = captured.factory(function (name) {
  if (name === 'react') return reactStub;
  throw new Error('unexpected require: ' + name);
});
if (typeof mod.apply !== 'function') throw new Error('apply missing');
const I = mod.__internals;

const fails = [];
function check(name, cond, detail) {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''));
}
function eq(name, actual, expected) {
  check(name, actual === expected, 'got ' + actual + ', want ' + expected);
}

const INPUT = { size: 14, channels: 1, pattern: 'digit', seed: 3 };

/* ---------- 1. shape arithmetic matches the formula ---------- */
function expectOut(size, k, s, p) { return Math.floor((size + 2 * p - k) / s) + 1; }

const CASES = [
  { spec: I.conv(3, 3, 1, 1, 4), size: 14, k: 3, s: 1, p: 1 },
  { spec: I.conv(5, 7, 1, 2, 4), size: 14, k: 5, kw: 7, s: 1, p: 2 },
  { spec: I.conv(11, 11, 1, 5, 3), size: 14, k: 11, s: 1, p: 5 },
  { spec: I.conv(3, 3, 3, 0, 4), size: 14, k: 3, s: 3, p: 0 },
  { spec: I.conv(3, 3, 2, 1, 6), size: 7, k: 3, s: 2, p: 1 },
  { spec: I.pool(2, 2, 'max'), size: 14, k: 2, s: 2, p: 0 },
  { spec: I.pool(3, 2, 'max'), size: 14, k: 3, s: 2, p: 0 },
];

for (const c of CASES) {
  const model = I.buildModel(Object.assign({}, INPUT, { size: c.size }), [c.spec]);
  const stage = model.stages[1];
  eq('shape ' + JSON.stringify(c.spec) + ' @' + c.size, stage.h, expectOut(c.size, c.k, c.s, c.p));
  eq('shape w ' + JSON.stringify(c.spec), stage.w, expectOut(c.size, c.kw || c.k, c.s, c.p));
  check('finite maps', Array.from(stage.maps).every((m) => Array.from(m).every(Number.isFinite)));
}

/* ---------- 2. presets all build a coherent chain ---------- */
for (const preset of I.PRESETS) {
  const model = I.buildModel(INPUT, preset.layers);
  eq('preset ' + preset.id + ' stage count', model.stages.length, preset.layers.length + 1);
  check('preset ' + preset.id + ' chain', model.chain.indexOf(' → ') > 0, model.chain);
  check('preset ' + preset.id + ' params', model.params > 0, String(model.params));
  check('preset ' + preset.id + ' rf grows', model.rf >= 1, String(model.rf));
  for (let i = 1; i < model.stages.length; i += 1) {
    const st = model.stages[i];
    eq('preset ' + preset.id + ' ch ' + i, st.c, st.maps.length);
    eq('preset ' + preset.id + ' cells ' + i, st.maps[0].length, st.h * st.w);
    check('preset ' + preset.id + ' cells>=1 ' + i, st.h >= 1 && st.w >= 1, st.shape);
  }
}

/* ---------- 3. layer parameters and clamping ---------- */
const prev = { c: 1, h: 8, w: 8 };
const kBig = I.normalizeLayer(prev, I.conv(11, 11, 1, 0, 4));
check('kernel clamped to the input', kBig.kh <= 8 && kBig.kw <= 8, kBig.kh + '×' + kBig.kw);
const noFit = I.normalizeLayer(prev, { type: 'conv', kh: 5, kw: 5, sy: 4, sx: 4, pad: 0, out: 2 });
check('stride still yields one cell', noFit.oh >= 1 && noFit.ow >= 1, noFit.oh + '×' + noFit.ow);
const padFix = I.normalizeLayer({ c: 1, h: 4, w: 4 }, { type: 'conv', kh: 4, kw: 4, sy: 1, sx: 1, pad: 0, out: 1 });
eq('padding keeps the map alive', padFix.pad, 0);
eq('4×4 kernel on 4×4 input', padFix.oh, 1);

/* ---------- 4. filter bank normalisation and determinism ---------- */
const bank = I.kernelBank({ kh: 3, kw: 3, out: 4 }, 0, 3, 3);
eq('bank size', bank.length, 4);
for (const filters of bank) {
  eq('bank channels', filters.length, 3);
  let sum = 0;
  for (const f of filters) for (const v of f) sum += Math.abs(v);
  check('filter |w| sums to 1', Math.abs(sum - 1) < 1e-6, String(sum));
}
const bankAgain = I.kernelBank({ kh: 3, kw: 3, out: 4 }, 0, 3, 3);
check('bank is deterministic', bank[0][0][0] === bankAgain[0][0][0]);

/* ---------- 5. convolution arithmetic on a known input ---------- */
/* 3×3 input, one channel, a 3×3 kernel of all 1/9 → the output is the mean. */
const flat = {
  c: 1, h: 3, w: 3,
  maps: [Float32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9])],
};
const meanSpec = I.normalizeLayer(flat, { type: 'conv', kh: 3, kw: 3, sy: 1, sx: 1, pad: 0, out: 1, act: 'linear' });
const meanBank = [[Float32Array.from([1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9])]];
const convOut = I.applyConv(flat, meanSpec, meanBank);
eq('conv output size', convOut.h, 1);
check('conv mean of 1..9', Math.abs(convOut.maps[0][0] - 5) < 1e-6, String(convOut.maps[0][0]));

/* max pooling picks the maximum, average pooling the mean */
const pooled = I.applyPool(flat, I.normalizeLayer(flat, { type: 'pool', kh: 3, kw: 3, sy: 3, sx: 3, pad: 0, mode: 'max' }));
eq('pool output size', pooled.h, 1);
eq('max pool value', pooled.maps[0][0], 9);
const avgPool = I.applyPool(flat, I.normalizeLayer(flat, { type: 'pool', kh: 3, kw: 3, sy: 3, sx: 3, pad: 0, mode: 'avg' }));
check('avg pool value', Math.abs(avgPool.maps[0][0] - 5) < 1e-6, String(avgPool.maps[0][0]));

/* padding contributes zeros */
const padded = I.normalizeLayer({ c: 1, h: 3, w: 3 }, { type: 'conv', kh: 3, kw: 3, sy: 1, sx: 1, pad: 1, out: 1, act: 'linear' });
const one = [[Float32Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0])]];
const padSrc = { c: 1, h: 3, w: 3, maps: [Float32Array.from([1, 1, 1, 1, 1, 1, 1, 1, 1])] };
const padOut = I.applyConv(padSrc, padded, one);
eq('padded output size', padOut.h, 3);
eq('corner cell reads padding only', padOut.maps[0][0], 0);
eq('centre cell reads one pixel', padOut.maps[0][4], 1);

/* ---------- 6. source window maps an output cell back to the input ---------- */
const w0 = I.sourceWindow({ kh: 3, kw: 3, sy: 1, sx: 1, pad: 1 }, 0, 0);
eq('window row with padding', w0.row, -1);
const w1 = I.sourceWindow({ kh: 5, kw: 7, sy: 2, sx: 3, pad: 2 }, 3, 2);
eq('window row with stride', w1.row, 4);
eq('window col with stride', w1.col, 4);
eq('window kernel', w1.kh + 'x' + w1.kw, '5x7');

/* ---------- 6b. flatten and the linear head ---------- */
const flatModel = I.buildModel(INPUT, [I.conv(3, 3, 1, 1, 2), I.flatten(), I.dense(7)]);
eq('flatten + dense stage count', flatModel.stages.length, 4);
const convStage = flatModel.stages[1];
const flatStage = flatModel.stages[2];
const denseStage = flatModel.stages[3];
eq('flatten length', flatStage.live, convStage.c * convStage.h * convStage.w);
eq('flatten vector length', flatStage.vec.length, flatStage.live);
check('flatten packs channel → row → column', (function () {
  const per = convStage.h * convStage.w;
  for (let c = 0; c < convStage.c; c += 1) {
    for (let k = 0; k < per; k += 1) {
      if (Math.abs(flatStage.vec[c * per + k] - convStage.maps[c][k]) > 1e-6) return false;
    }
  }
  return true;
})());
check('flatten grid holds the vector', flatStage.h * flatStage.w >= flatStage.live,
  flatStage.shape);
eq('dense output length', denseStage.live, 7);
eq('dense vector length', denseStage.vec.length, 7);
eq('dense parameters', denseStage.params, 7 * flatStage.live + 7);
check('dense values finite', Array.from(denseStage.vec).every(Number.isFinite));
check('dense units differ', (function () {
  const a = Array.from(denseStage.vec);
  return Math.max.apply(null, a) - Math.min.apply(null, a) > 1e-4;
})(), Array.from(denseStage.vec).map((v) => v.toFixed(2)).join(','));
check('vector shaped label', denseStage.shape === '[7]', denseStage.shape);
check('chain shows vectors', flatModel.chain.indexOf('[') > 0, flatModel.chain);
check('dense is not free', flatModel.params > 7 * flatStage.live);

/* a dense layer straight after a spatial layer reads it as if flattened */
const implicit = I.buildModel(INPUT, [I.conv(3, 3, 1, 1, 2), I.dense(4)]);
eq('implicit dense input length', implicit.stages[2].spec.inLen,
  implicit.stages[1].c * implicit.stages[1].h * implicit.stages[1].w);
eq('implicit dense units', implicit.stages[2].live, 4);

/* flatten: one output index reads exactly one source cell, in order */
const fw = I.sourceWindowFor(flatStage, convStage, 0, 3);
eq('flatten window is one cell', fw.kh + 'x' + fw.kw, '1x1');
eq('flatten window channel', fw.channel, Math.floor(3 / (convStage.h * convStage.w)));
eq('flatten window index', fw.index, 3);

/* dense: a unit reads the whole previous plane */
const dw = I.sourceWindowFor(denseStage, flatStage, 0, 2);
eq('dense window spans the plane', dw.kh + 'x' + dw.kw, flatStage.h + 'x' + flatStage.w);
eq('dense window spans channels', dw.channel, null);

/* the same seed rebuilds the same numbers */
const again = I.buildModel(INPUT, [I.conv(3, 3, 1, 1, 2), I.flatten(), I.dense(7)]);
eq('dense deterministic', again.stages[3].vec[0], denseStage.vec[0]);
eq('dense params deterministic', again.stages[3].params, denseStage.params);

/* every preset ends with flatten → linear */
for (const preset of I.PRESETS) {
  const last = preset.layers[preset.layers.length - 1];
  const before = preset.layers[preset.layers.length - 2];
  eq('preset ' + preset.id + ' ends with dense', last.type, 'dense');
  eq('preset ' + preset.id + ' flattens before it', before.type, 'flatten');
}

/* ---------- 7. scene geometry ---------- */
for (const preset of I.PRESETS) {
  const model = I.buildModel(INPUT, preset.layers);
  const scene = I.buildScene(model, { spacing: 1, channelGap: 1 });
  eq('scene ' + preset.id + ' layers', scene.layers.length, model.stages.length);
  check('scene ' + preset.id + ' radius', Number.isFinite(scene.radius) && scene.radius > 0);
  for (let i = 1; i < scene.layers.length; i += 1) {
    check('scene ' + preset.id + ' monotonic x', scene.layers[i].x > scene.layers[i - 1].x,
      scene.layers[i - 1].x + ' → ' + scene.layers[i].x);
    const prevL = scene.layers[i - 1], curL = scene.layers[i];
    const vecPair = prevL.kind === 'flatten' || prevL.kind === 'dense' ||
      curL.kind === 'flatten' || curL.kind === 'dense';
    if (!vecPair) {
      check('scene ' + preset.id + ' edge shrinks', curL.edge <= prevL.edge + 1e-9);
    }
  }
  check('scene ' + preset.id + ' planes', scene.layers.every((L) => L.c >= 1 && L.chGap > 0));
}

/* spacing must widen the scene without changing the layer count */
const m14 = I.buildModel(INPUT, I.PRESETS[0].layers);
const tight = I.buildScene(m14, { spacing: 0.5, channelGap: 1 });
const wide = I.buildScene(m14, { spacing: 2, channelGap: 1 });
check('spacing widens the scene',
  (wide.layers[wide.layers.length - 1].x - wide.layers[0].x) >
  (tight.layers[tight.layers.length - 1].x - tight.layers[0].x));

/* ---------- 8. input patterns stay inside [0, 1] ---------- */
for (const pattern of I.PATTERNS) {
  for (const channels of [1, 3, 6]) {
    const inp = I.makeInput({ size: 12, channels: channels, pattern: pattern, seed: 4 });
    eq('input maps ' + pattern + '/' + channels, inp.maps.length, channels);
    let ok = true;
    for (const m of inp.maps) for (const v of m) if (!(v >= 0 && v <= 1)) ok = false;
    check('input range ' + pattern + '/' + channels, ok);
  }
}

/* ---------- 9. every t() key exists in both dictionaries ---------- */
const srcDir = join(root, 'src');
const sources = readdirSync(srcDir).filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(srcDir, f), 'utf8')).join('\n');
const keys = new Set();
for (const m of sources.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
check('panel reads some translations', keys.size > 60, String(keys.size));
for (const key of keys) {
  if (key.endsWith('.')) continue;
  for (const dict of [I.DICT_EN, I.DICT_ZH]) {
    check('missing key ' + key, Object.prototype.hasOwnProperty.call(dict, key), 'not in dictionary');
  }
}
/* dynamic keys built by concatenation */
for (const suffix of I.PATTERNS) {
  check('en pattern.' + suffix, !!I.DICT_EN['pattern.' + suffix]);
  check('zh pattern.' + suffix, !!I.DICT_ZH['pattern.' + suffix]);
}
for (const suffix of ['relu', 'tanh', 'linear', 'sigmoid']) {
  check('en act.' + suffix, !!I.DICT_EN['act.' + suffix]);
  check('zh act.' + suffix, !!I.DICT_ZH['act.' + suffix]);
}
for (const suffix of ['max', 'avg']) {
  check('en pool.' + suffix, !!I.DICT_EN['pool.' + suffix]);
  check('zh pool.' + suffix, !!I.DICT_ZH['pool.' + suffix]);
}


/* ---------- 10. locales are balanced ---------- */
const enKeys = Object.keys(I.DICT_EN).sort();
const zhKeys = Object.keys(I.DICT_ZH).sort();
check('locale key sets match', enKeys.join('|') === zhKeys.join('|'),
  'en=' + enKeys.length + ' zh=' + zhKeys.length);
for (const key of enKeys) {
  check('non-empty ' + key, I.DICT_EN[key].length > 0);
  check('translated ' + key, I.DICT_ZH[key].length > 0);
}

if (fails.length) {
  console.error('FAILED (' + fails.length + ')');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('ok: ' + keys.size + ' translation keys, ' + I.PRESETS.length + ' presets, ' +
  I.PATTERNS.length + ' input patterns, all checks passed');
