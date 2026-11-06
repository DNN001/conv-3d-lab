/**
 * Renderer + panel smoke test for Conv 3D Lab.
 *
 * Runs the canvas renderer against a recording 2D-context stub and renders the
 * panel with a React stub, so the parts the pure model tests cannot reach —
 * projection, plane painting, picking, the scan cursor, and the whole JSX tree —
 * execute at least once outside the browser.
 *
 *   node test/render-smoke.test.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frames = [];
globalThis.window = {
  __ModuleLoader__: { load(def) { captured = def; } },
  devicePixelRatio: 2,
  requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
  cancelAnimationFrame() {},
  addEventListener() {},
  removeEventListener() {},
};
var captured = null;

await import(new URL('../client.js', import.meta.url).href);
if (!captured) throw new Error('module did not register with the loader');

/* ---------- React stub that records the rendered tree ---------- */
const effectQueue = [];
const reactStub = {
  createElement(type, props) {
    const children = [];
    for (let i = 2; i < arguments.length; i += 1) push(children, arguments[i]);
    return { type: type, props: props || {}, children: children };
  },
  useState(initial) { return [typeof initial === 'function' ? initial() : initial, function () {}]; },
  useEffect(fn) { effectQueue.push(fn); },
  useMemo(fn) { return fn(); },
  useRef(v) { return { current: v }; },
};
function push(list, value) {
  if (value == null || value === false || value === true) return;
  if (Array.isArray(value)) { for (const v of value) push(list, v); return; }
  list.push(value);
}

const mod = captured.factory(function (name) {
  if (name === 'react') return reactStub;
  throw new Error('unexpected require: ' + name);
});
const I = mod.__internals;
const fails = [];
function check(name, cond, detail) { if (!cond) fails.push(name + (detail ? ' — ' + detail : '')); }

/* ---------- recording 2D context ---------- */
function makeContext() {
  const calls = { fill: 0, stroke: 0, text: 0, ops: 0 };
  const ctx = {
    canvas: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '', textAlign: 'start',
    textBaseline: 'alphabetic',
    setTransform() { calls.ops += 1; },
    clearRect() { calls.ops += 1; },
    createLinearGradient() { return { addColorStop() {} }; },
    fillRect() { calls.ops += 1; },
    save() { calls.ops += 1; },
    restore() { calls.ops += 1; },
    setLineDash() { calls.ops += 1; },
    beginPath() { calls.ops += 1; },
    closePath() { calls.ops += 1; },
    moveTo() { calls.ops += 1; },
    lineTo() { calls.ops += 1; },
    quadraticCurveTo() { calls.ops += 1; },
    stroke() { calls.stroke += 1; calls.ops += 1; },
    fill() { calls.fill += 1; calls.ops += 1; },
    measureText(text) { return { width: String(text).length * 6 }; },
    fillText() { calls.text += 1; calls.ops += 1; },
    __calls: calls,
  };
  return ctx;
}

function makeCanvas(w, h) {
  const ctx = makeContext();
  const listeners = {};
  const canvas = {
    clientWidth: w,
    clientHeight: h,
    width: w,
    height: h,
    style: {},
    getContext() { return ctx; },
    getBoundingClientRect() { return { left: 0, top: 0, width: w, height: h }; },
    setPointerCapture() {},
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    __ctx: ctx,
    __listeners: listeners,
    __fire(type, ev) { for (const fn of listeners[type] || []) fn(ev); },
  };
  return canvas;
}

/* ---------- 1. the renderer paints a scene ---------- */
const model = I.buildModel({ size: 14, channels: 2, pattern: 'digit', seed: 3 }, I.PRESETS[0].layers);
const scene = I.buildScene(model, { spacing: 1, channelGap: 1 });
const canvas = makeCanvas(900, 620);
const events = { steps: [], hover: 'none', advance: 0, finished: 0, playing: [] };
let advanceAllowed = true;

const api = I.createRenderer(canvas, {
  onStep(i, layer) { events.steps.push([i, layer]); },
  onHover(hit) { events.hover = hit; },
  onAdvance() { events.advance += 1; return advanceAllowed; },
  onFinished() { events.finished += 1; },
  onPlaying(v) { events.playing.push(v); },
});

api.setScene(scene);
api.setOpts({ labels: true, grid: true, window: true, ray: true });
api.setFocus(1);

function tick(ts) {
  const queued = frames.splice(0, frames.length);
  for (const fn of queued) fn(ts);
}

tick(16);
check('canvas sized to the device ratio', canvas.width === 1800 && canvas.height === 1240,
  canvas.width + '×' + canvas.height);
check('a frame painted fills', canvas.__ctx.__calls.fill > 10, String(canvas.__ctx.__calls.fill));
check('labels painted text', canvas.__ctx.__calls.text > 0, String(canvas.__ctx.__calls.text));

/* picking: the centre of the canvas must hit some plane */
canvas.__fire('pointermove', { clientX: 450, clientY: 310 });
check('hover hit a cell', events.hover && typeof events.hover.layer === 'number',
  JSON.stringify(events.hover));
if (events.hover) {
  check('hover cell inside its layer',
    events.hover.row < model.stages[events.hover.layer].h &&
    events.hover.col < model.stages[events.hover.layer].w);
}

/* every pass over the scene must stay finite */
const finite = () => Object.keys(canvas.__ctx.__calls).every((k) => Number.isFinite(canvas.__ctx.__calls[k]));
check('context counters finite', finite());

/* ---------- 2. scan cursor, stepping and auto-advance ---------- */
events.steps.length = 0;
api.stepBy(1);
check('step reports the new cell', events.steps.length === 1 && events.steps[0][0] === 1,
  JSON.stringify(events.steps));

const total = model.stages[1].h * model.stages[1].w;
api.setSpeed(200);
api.setPlaying(true);
let ts = 1000;
for (let i = 0; i < 220; i += 1) { ts += 16; tick(ts); }
check('playing advanced the cursor', events.steps.length > 1, String(events.steps.length));
check('advance asked the panel for the next layer', events.advance > 0, String(events.advance));
check('step index stays inside the map',
  events.steps.every((s) => s[0] >= 0 && s[0] < total), JSON.stringify(events.steps.slice(-3)));

/* the last layer cannot advance further: playback must stop */
advanceAllowed = false;
api.setFocus(scene.layers.length - 1);
api.restart();
api.setPlaying(true);
for (let i = 0; i < 200; i += 1) { ts += 16; tick(ts); }
check('playback stops at the end of the last layer', events.finished > 0, String(events.finished));
api.setPlaying(false);

/* ---------- 3. display options and view controls must not throw ---------- */
api.setOpts({ labels: false, grid: false, window: false, ray: false });
tick(ts += 16);
api.setOpts({ labels: true, grid: true, window: true, ray: true });
api.setAutoRotate(true);
for (let i = 0; i < 5; i += 1) { ts += 16; tick(ts); }
api.setAutoRotate(false);
api.resetView();
api.focusLayerAt(2);
canvas.__fire('wheel', { deltaY: 120, preventDefault() {} });
canvas.__fire('pointerdown', { clientX: 400, clientY: 300, button: 0, pointerId: 1, preventDefault() {} });
canvas.__fire('pointermove', { clientX: 460, clientY: 340 });
canvas.__fire('pointerup', { clientX: 460, clientY: 340 });
canvas.__fire('pointerdown', { clientX: 400, clientY: 300, button: 2, pointerId: 1, preventDefault() {} });
canvas.__fire('pointermove', { clientX: 380, clientY: 260 });
canvas.__fire('pointerup', { clientX: 380, clientY: 260 });
canvas.__fire('keydown', { key: 'ArrowRight', preventDefault() {} });
canvas.__fire('keydown', { key: 'ArrowLeft', preventDefault() {} });
canvas.__fire('keydown', { key: 'r', preventDefault() {} });
canvas.__fire('pointerleave', {});
tick(ts += 16);
check('scene still paints after every interaction', canvas.__ctx.__calls.fill > 10);

/* a scene with every input channel and a big kernel must also paint */
const heavy = I.buildModel({ size: 20, channels: 4, pattern: 'noise', seed: 7 },
  [I.conv(11, 11, 2, 5, 8), I.pool(3, 2, 'avg')]);
api.setScene(I.buildScene(heavy, { spacing: 1.6, channelGap: 1.4 }));
api.setFocus(1);
for (let i = 0; i < 3; i += 1) { ts += 16; tick(ts); }
check('heavy scene paints', canvas.__ctx.__calls.fill > 10);

/* ---------- 3b. the flatten layer scans its own vector ---------- */
const flattenIdx = model.stages.length - 2;
const denseIdx = model.stages.length - 1;
check('preset tail is flatten → dense',
  model.stages[flattenIdx].kind === 'flatten' && model.stages[denseIdx].kind === 'dense',
  model.stages[flattenIdx].kind + '/' + model.stages[denseIdx].kind);
advanceAllowed = false;
api.setScene(scene);
api.setFocus(flattenIdx);
api.setSpeed(90);
api.setPlaying(true);
for (let i = 0; i < 200; i += 1) { ts += 16; tick(ts); }
api.setPlaying(false);
const flatTotal = model.stages[flattenIdx].live;
const flatSteps = events.steps.filter((s) => s[1] === flattenIdx);
check('flatten scan reports its own layer', flatSteps.length > 0, String(flatSteps.length));
check('flatten scan stays inside the vector',
  flatSteps.every((s) => s[0] >= 0 && s[0] < flatTotal), JSON.stringify(flatSteps.slice(-2)));
check('flatten scan reaches the last element',
  flatSteps.some((s) => s[0] === flatTotal - 1), String(flatTotal));

/* the dense layer paints and can be scanned the same way */
api.setFocus(denseIdx);
tick(ts += 16);
canvas.__fire('pointermove', { clientX: 450, clientY: 310 });
check('dense layer paints', canvas.__ctx.__calls.fill > 10);
check('hover survives the vector layers', events.hover == null || typeof events.hover.layer === 'number');

api.dispose();
tick(ts += 16);
check('disposed renderer stops drawing', frames.length === 0, String(frames.length));

/* ---------- 4. the panel renders without throwing ---------- */
const tree = I.LabPage();
check('panel root has the canvas', !!tree && tree.props.className === 'c3-root');
const texts = [];
(function walk(node) {
  if (typeof node === 'string') { texts.push(node); return; }
  if (!node || typeof node !== 'object') return;
  for (const child of node.children || []) walk(child);
})(tree);
check('panel rendered text nodes', texts.length > 30, String(texts.length));
const rawKeys = texts.filter((s) => /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/.test(s));
check('no untranslated key reached the UI', rawKeys.length === 0, rawKeys.join(', '));
check('panel shows the title', texts.indexOf('Conv 3D Lab') >= 0, texts.slice(0, 6).join(' | '));

/* the effect queue holds the renderer wiring and the sync effects */
check('panel queued its effects', effectQueue.length >= 6, String(effectQueue.length));
for (const fn of effectQueue) {
  try { fn(); } catch (e) { check('effect ran cleanly', false, String(e && e.message)); }
}

if (fails.length) {
  console.error('FAILED (' + fails.length + ')');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('ok: renderer painted ' + canvas.__ctx.__calls.fill + ' fills, ' +
  events.steps.length + ' scan steps, ' + texts.length + ' panel text nodes, ' +
  effectQueue.length + ' effects');
