    /* =====================================================================
     * 1. Numbers, colours, formatting
     * ===================================================================*/

    function num(v, fallback) {
      const n = typeof v === 'number' ? v : parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    }

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function lerp(a, b, k) { return a + (b - a) * k; }

    function hash32(str) {
      let x = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i += 1) {
        x ^= str.charCodeAt(i);
        x = Math.imul(x, 16777619) >>> 0;
      }
      return x >>> 0;
    }

    /** Deterministic 0..1 from an integer seed. */
    function unit(seed) {
      let x = (seed >>> 0) || 0x9e3779b9;
      x ^= x << 13; x >>>= 0;
      x ^= x >>> 17;
      x ^= x << 5; x >>>= 0;
      return x / 4294967296;
    }

    function noiseOf(a, b, c, d) {
      return unit(hash32(String(a) + ':' + String(b) + ':' + String(c) + ':' + String(d))) * 2 - 1;
    }

    /** Value ramp: deep navy (low) through cyan and green to red (high). */
    const PALETTE = [
      '#060a12', '#0a1120', '#101b2e', '#152540', '#1b3050', '#213d62',
      '#274b75', '#2b5a89', '#2c6a9d', '#287cab', '#218eb0', '#1ba0ae',
      '#22b39f', '#43c483', '#6bd267', '#9bdc51', '#c8e23f', '#eed83c',
      '#ffc247', '#ffa64d', '#ff8650', '#ff6455', '#f24651', '#dd2f52',
    ];

    const EMPTY_CELL = '#0c1524';

    function palIndex(v01) {
      const n = PALETTE.length;
      const i = Math.round(clamp(v01, 0, 1) * (n - 1));
      return i < 0 ? 0 : i > n - 1 ? n - 1 : i;
    }

    function colorFor(v01) { return PALETTE[palIndex(v01)]; }

    function fmtNum(v) {
      if (!Number.isFinite(v)) return '-';
      const a = Math.abs(v);
      if (a >= 100) return v.toFixed(0);
      if (a >= 10) return v.toFixed(1);
      return v.toFixed(2);
    }

    function fmtCount(v) {
      if (!Number.isFinite(v)) return '-';
      if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
      if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
      return String(Math.round(v));
    }

    /* =====================================================================
     * 2. Input matrix
     * ===================================================================*/

    const PATTERNS = ['digit', 'rings', 'gradient', 'checker', 'noise', 'waves'];

    /* Seven-segment digit masks: bit 0 = a, 1 = b, 2 = c, 3 = d, 4 = e, 5 = f, 6 = g. */
    const SEG_MASK = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
    const SEG_RECT = [
      [0.28, 0.72, 0.12, 0.19],  // a top
      [0.715, 0.79, 0.20, 0.47], // b upper right
      [0.715, 0.79, 0.53, 0.80], // c lower right
      [0.28, 0.72, 0.81, 0.88],  // d bottom
      [0.21, 0.285, 0.53, 0.80], // e lower left
      [0.21, 0.285, 0.20, 0.47], // f upper left
      [0.28, 0.72, 0.475, 0.525], // g middle
    ];

    function digitValue(u, v, digit) {
      const mask = SEG_MASK[digit % 10];
      let inside = false;
      for (let s = 0; s < SEG_RECT.length; s += 1) {
        if (!(mask & (1 << s))) continue;
        const r = SEG_RECT[s];
        if (u >= r[0] && u <= r[1] && v >= r[2] && v <= r[3]) { inside = true; break; }
      }
      if (inside) return 1;
      const d = Math.sqrt((u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5));
      return 0.06 * (1 - d);
    }

    function patternValue(pattern, u, v, seed, channel) {
      const rot = channel * 0.85;
      const cu = u - 0.5, cv = v - 0.5;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const zoom = 1 + 0.18 * channel;
      let pu = 0.5 + (cu * cs - cv * sn) * zoom;
      let pv = 0.5 + (cu * sn + cv * cs) * zoom;
      pu = clamp(pu, 0, 0.999999);
      pv = clamp(pv, 0, 0.999999);
      switch (pattern) {
        case 'digit':
          return digitValue(pu, pv, (seed + channel * 3) % 10);
        case 'rings': {
          const d = Math.sqrt((pu - 0.5) * (pu - 0.5) + (pv - 0.5) * (pv - 0.5)) * 2;
          return 0.5 + 0.5 * Math.cos(d * 9.5 + channel * 0.9);
        }
        case 'gradient':
          return clamp(pu * 0.72 + (1 - pv) * 0.28, 0, 1);
        case 'checker':
          return ((Math.floor(pu * 4) + Math.floor(pv * 4)) % 2) ? 0.92 : 0.10;
        case 'noise':
          return unit(hash32('n' + seed + '|' + channel + '|' +
            Math.floor(pu * 64) + '|' + Math.floor(pv * 64)));
        case 'waves':
        default:
          return 0.5 + 0.5 * Math.sin(pu * 9 + channel) * Math.cos(pv * 8 - channel);
      }
    }

    function makeInput(spec) {
      const size = clamp(Math.round(num(spec && spec.size, 14)), 6, 28);
      const channels = clamp(Math.round(num(spec && spec.channels, 1)), 1, 6);
      const pattern = PATTERNS.indexOf(spec && spec.pattern) >= 0 ? spec.pattern : 'digit';
      const seed = Math.round(num(spec && spec.seed, 1));
      const maps = [];
      for (let c = 0; c < channels; c += 1) {
        const arr = new Float32Array(size * size);
        for (let j = 0; j < size; j += 1) {
          for (let i = 0; i < size; i += 1) {
            arr[j * size + i] = patternValue(pattern, (i + 0.5) / size, (j + 0.5) / size, seed, c);
          }
        }
        maps.push(arr);
      }
      return { size: size, channels: channels, pattern: pattern, seed: seed, maps: maps };
    }

    /* =====================================================================
     * 3. Layers: kernels, arithmetic, shapes
     * ===================================================================*/

    const KERNEL_PRESETS = [[3, 3], [5, 7], [11, 11]];
    const MAX_OUT_CHANNELS = 8;
    const MAX_UNITS = 64;
    const MAX_LAYERS = 8;
    const LAYER_TYPES = ['conv', 'pool', 'flatten', 'dense'];

    function activate(v, act) {
      switch (act) {
        case 'relu': return v > 0 ? v : 0;
        case 'tanh': return Math.tanh(v);
        case 'sigmoid': return 1 / (1 + Math.exp(-v));
        default: return v;
      }
    }

    function actName(act) {
      return ['relu', 'tanh', 'sigmoid', 'linear'].indexOf(act) >= 0 ? act : null;
    }

    /**
     * Deterministic filter bank. Filters are structured (edge / blob / diagonal /
     * sharpen / wave) and only the tail is pseudo-random, so the maps look like
     * something a trained first layer could produce, plus a per-channel sign and
     * jitter so multi-channel inputs mix instead of adding up.
     */
    function kernelBank(spec, layerIdx, inC, seed) {
      const kh = spec.kh, kw = spec.kw;
      const bank = [];
      for (let oc = 0; oc < spec.out; oc += 1) {
        const filters = [];
        for (let ic = 0; ic < inC; ic += 1) {
          const f = new Float32Array(kh * kw);
          for (let ky = 0; ky < kh; ky += 1) {
            for (let kx = 0; kx < kw; kx += 1) {
              const u = kw > 1 ? (kx / (kw - 1)) - 0.5 : 0;
              const v = kh > 1 ? (ky / (kh - 1)) - 0.5 : 0;
              let w = 0;
              switch (oc % 8) {
                case 0: w = u * 2.2; break;
                case 1: w = v * 2.2; break;
                case 2: w = Math.sqrt(u * u + v * v) < 0.26 ? 1.7 : -0.9; break;
                case 3: w = (u - v) * 1.9; break;
                case 4: w = 0.3 - (Math.abs(u) + Math.abs(v)); break;
                case 5: w = Math.cos(u * 6.2) * Math.cos(v * 5.4); break;
                case 6: w = Math.sin((u + v) * 7.5); break;
                default: w = noiseOf(seed, layerIdx, oc, ky * kw + kx) * 1.6; break;
              }
              const chSign = ic === 0 ? 1 : (ic % 2 === 1 ? -0.55 : 0.35);
              const jitter = 1 + 0.1 * noiseOf(seed + 7, layerIdx, oc * 13 + ic, ky * kw + kx);
              f[ky * kw + kx] = w * chSign * jitter;
            }
          }
          filters.push(f);
        }
        let absSum = 0;
        for (let ic = 0; ic < filters.length; ic += 1) {
          const f = filters[ic];
          for (let k = 0; k < f.length; k += 1) absSum += Math.abs(f[k]);
        }
        if (absSum > 1e-6) {
          const scale = 1 / absSum;
          for (let ic = 0; ic < filters.length; ic += 1) {
            const f = filters[ic];
            for (let k = 0; k < f.length; k += 1) f[k] *= scale;
          }
        }
        bank.push(filters);
      }
      return bank;
    }

    /**
     * Dense weights: each unit is a smooth spatial-frequency probe over the flat
     * vector plus a little noise, L1-normalised so an output reads as a weighted
     * average whose size stays comparable to the feature maps it came from.
     */
    function denseBank(units, inLen, layerIdx, seed) {
      const bank = [];
      const span = Math.max(1, inLen);
      for (let j = 0; j < units; j += 1) {
        const w = new Float32Array(inLen);
        const freq = (j % 8) + 1;
        const phase = noiseOf(seed + 13, layerIdx, j, 1) * Math.PI;
        let absSum = 0;
        for (let i = 0; i < inLen; i += 1) {
          const wave = Math.sin(((i + 0.5) / span) * freq * Math.PI * 2 + phase);
          const v = wave + 0.25 * noiseOf(seed + 3, layerIdx, j, i);
          w[i] = v;
          absSum += Math.abs(v);
        }
        const scale = absSum > 1e-6 ? 1 / absSum : 1;
        for (let i = 0; i < inLen; i += 1) w[i] *= scale;
        bank.push({ w: w, b: 0.05 * noiseOf(seed + 5, layerIdx, j, 97) });
      }
      return bank;
    }

    /** Display grid for a 1-D vector: nearly square, at most one padded row. */
    function vecGrid(len) {
      const n = Math.max(1, Math.round(len));
      const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
      const rows = Math.max(1, Math.ceil(n / cols));
      return { rows: rows, cols: cols };
    }

    function padVec(vec, n) {
      if (vec.length === n) return vec;
      const out = new Float32Array(n);
      out.set(vec.subarray(0, Math.min(vec.length, n)));
      return out;
    }

    /** Element i of a stage read as a flat vector: channel → row → column. */
    function flatValue(stage, i) {
      if (stage.vec) return i >= 0 && i < stage.vec.length ? stage.vec[i] : 0;
      const per = stage.h * stage.w;
      const ch = Math.floor(i / per);
      if (ch < 0 || ch >= stage.c) return 0;
      const rest = i - ch * per;
      if (rest < 0 || rest >= per) return 0;
      return stage.maps[ch][rest];
    }

    function flatLength(stage) {
      return stage.vec ? stage.vec.length : stage.c * stage.h * stage.w;
    }

    /** Effective parameters for `spec` on top of `prev`, always producing >= 1 cell. */
    function normalizeLayer(prev, spec) {
      const type = LAYER_TYPES.indexOf(spec && spec.type) >= 0 ? spec.type : 'conv';
      const given = actName(spec && spec.act);
      const out = {
        type: type,
        kh: clamp(Math.round(num(spec && spec.kh, 3)), 1, 12),
        kw: clamp(Math.round(num(spec && spec.kw, 3)), 1, 12),
        sy: clamp(Math.round(num(spec && spec.sy, 1)), 1, 6),
        sx: clamp(Math.round(num(spec && spec.sx, 1)), 1, 6),
        pad: clamp(Math.round(num(spec && spec.pad, 0)), 0, 10),
        out: clamp(Math.round(num(spec && spec.out, 4)), 1, MAX_OUT_CHANNELS),
        units: clamp(Math.round(num(spec && spec.units, 10)), 1, MAX_UNITS),
        act: given || (type === 'conv' ? 'relu' : 'linear'),
        mode: spec && spec.mode === 'avg' ? 'avg' : 'max',
        notes: [],
      };

      if (type === 'flatten') {
        out.kh = 1; out.kw = 1; out.sy = 1; out.sx = 1; out.pad = 0; out.out = 1;
        out.act = 'linear';
        out.inC = prev.c; out.inH = prev.h; out.inW = prev.w;
        out.len = prev.c * prev.h * prev.w;
        const g = vecGrid(out.len);
        out.oh = g.rows; out.ow = g.cols;
        return out;
      }

      if (type === 'dense') {
        out.kh = 1; out.kw = 1; out.sy = 1; out.sx = 1; out.pad = 0; out.out = 1;
        out.inLen = flatLength(prev);
        const g = vecGrid(out.units);
        out.oh = g.rows; out.ow = g.cols;
        return out;
      }

      if (out.kh > prev.h) { out.kh = prev.h; out.notes.push('kh'); }
      if (out.kw > prev.w) { out.kw = prev.w; out.notes.push('kw'); }
      if (type === 'pool') {
        out.out = prev.c;
        out.act = 'linear';
      }
      let guard = 0;
      while (prev.h + 2 * out.pad - out.kh < 0 && guard < 24) { out.pad += 1; guard += 1; }
      while (prev.w + 2 * out.pad - out.kw < 0 && guard < 48) { out.pad += 1; guard += 1; }
      out.pad = clamp(out.pad, 0, 12);
      out.oh = Math.max(1, Math.floor((prev.h + 2 * out.pad - out.kh) / out.sy) + 1);
      out.ow = Math.max(1, Math.floor((prev.w + 2 * out.pad - out.kw) / out.sx) + 1);
      return out;
    }

    function applyConv(src, spec, bank) {
      const kh = spec.kh, kw = spec.kw, sy = spec.sy, sx = spec.sx, pad = spec.pad;
      const oh = spec.oh, ow = spec.ow;
      const inC = src.c, inH = src.h, inW = src.w;
      const maps = [];
      for (let oc = 0; oc < spec.out; oc += 1) {
        const dst = new Float32Array(oh * ow);
        const filters = bank[oc];
        for (let oy = 0; oy < oh; oy += 1) {
          const baseY = oy * sy - pad;
          for (let ox = 0; ox < ow; ox += 1) {
            const baseX = ox * sx - pad;
            let sum = 0;
            for (let ic = 0; ic < inC; ic += 1) {
              const m = src.maps[ic];
              const f = filters[ic];
              for (let ky = 0; ky < kh; ky += 1) {
                const iy = baseY + ky;
                if (iy < 0 || iy >= inH) continue;
                const row = iy * inW;
                const frow = ky * kw;
                for (let kx = 0; kx < kw; kx += 1) {
                  const ix = baseX + kx;
                  if (ix < 0 || ix >= inW) continue;
                  sum += m[row + ix] * f[frow + kx];
                }
              }
            }
            dst[oy * ow + ox] = activate(sum, spec.act);
          }
        }
        maps.push(dst);
      }
      return { c: spec.out, h: oh, w: ow, maps: maps };
    }

    function applyPool(src, spec) {
      const kh = spec.kh, kw = spec.kw, sy = spec.sy, sx = spec.sx, pad = spec.pad;
      const oh = spec.oh, ow = spec.ow;
      const inH = src.h, inW = src.w;
      const maps = [];
      for (let c = 0; c < src.c; c += 1) {
        const m = src.maps[c];
        const dst = new Float32Array(oh * ow);
        for (let oy = 0; oy < oh; oy += 1) {
          const baseY = oy * sy - pad;
          for (let ox = 0; ox < ow; ox += 1) {
            const baseX = ox * sx - pad;
            let acc = 0, count = 0, best = -Infinity;
            for (let ky = 0; ky < kh; ky += 1) {
              const iy = baseY + ky;
              if (iy < 0 || iy >= inH) continue;
              const row = iy * inW;
              for (let kx = 0; kx < kw; kx += 1) {
                const ix = baseX + kx;
                if (ix < 0 || ix >= inW) continue;
                const v = m[row + ix];
                acc += v;
                if (v > best) best = v;
                count += 1;
              }
            }
            const v = spec.mode === 'avg' ? (count ? acc / count : 0) : (count ? best : 0);
            dst[oy * ow + ox] = v;
          }
        }
        maps.push(dst);
      }
      return { c: src.c, h: oh, w: ow, maps: maps };
    }

    /** Flatten in channel → row → column order, the order a BHWC tensor is flattened. */
    function applyFlatten(src) {
      const len = src.c * src.h * src.w;
      const vec = new Float32Array(len);
      let k = 0;
      for (let ch = 0; ch < src.c; ch += 1) {
        const m = src.maps[ch];
        for (let i = 0; i < m.length; i += 1) { vec[k] = m[i]; k += 1; }
      }
      return { len: len, vec: vec };
    }

    function applyDense(src, spec, bank) {
      const out = new Float32Array(spec.units);
      for (let j = 0; j < spec.units; j += 1) {
        const row = bank[j];
        let sum = row.b;
        for (let i = 0; i < row.w.length; i += 1) sum += flatValue(src, i) * row.w[i];
        out[j] = activate(sum, spec.act);
      }
      return out;
    }

    function normOf(maps, live) {
      let min = Infinity, max = -Infinity;
      for (let c = 0; c < maps.length; c += 1) {
        const m = maps[c];
        const n = (c === 0 && live != null) ? Math.min(live, m.length) : m.length;
        for (let i = 0; i < n; i += 1) {
          const v = m[i];
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
      if (max - min < 1e-9) { max = min + 1; }
      return { min: min, max: max };
    }

    function layerLabel(spec) {
      if (!spec) return t('layer.input');
      if (spec.type === 'pool') return t('layer.pool') + ' ' + spec.kh + '×' + spec.kw;
      if (spec.type === 'flatten') return t('layer.flatten');
      if (spec.type === 'dense') return t('layer.dense') + ' ' + spec.units;
      return t('layer.conv') + ' ' + spec.kh + '×' + spec.kw;
    }

    function buildModel(inputSpec, layerSpecs) {
      const inp = makeInput(inputSpec);
      const stages = [];
      stages.push({
        index: 0, kind: 'input', c: inp.channels, h: inp.size, w: inp.size,
        maps: inp.maps, norm: normOf(inp.maps), spec: null, bank: null, vec: null,
        live: null,
        label: t('layer.input'), shape: inp.size + '×' + inp.size + '×' + inp.channels,
        params: 0, rf: 1, jump: 1,
      });
      let cur = {
        c: inp.channels, h: inp.size, w: inp.size, maps: inp.maps, vec: null,
      };
      let params = 0;
      let jump = 1;
      let rf = 1;
      const list = Array.isArray(layerSpecs) ? layerSpecs.slice(0, MAX_LAYERS) : [];
      for (let i = 0; i < list.length; i += 1) {
        const spec = normalizeLayer(cur, list[i]);
        let maps, vec = null, c, h, w, live = null, bank = null, p = 0;

        if (spec.type === 'flatten') {
          const flat = applyFlatten(cur);
          vec = flat.vec;
          c = 1;
          h = spec.oh;
          w = spec.ow;
          live = flat.len;
          maps = [padVec(vec, h * w)];
        } else if (spec.type === 'dense') {
          bank = denseBank(spec.units, spec.inLen, i, inp.seed);
          vec = applyDense(cur, spec, bank);
          c = 1;
          h = spec.oh;
          w = spec.ow;
          live = spec.units;
          maps = [padVec(vec, h * w)];
          p = spec.units * spec.inLen + spec.units;
        } else if (spec.type === 'pool') {
          const out = applyPool(cur, spec);
          c = out.c; h = out.h; w = out.w; maps = out.maps;
        } else {
          bank = kernelBank(spec, i, cur.c, inp.seed);
          const out = applyConv(cur, spec, bank);
          c = out.c; h = out.h; w = out.w; maps = out.maps;
          p = spec.out * cur.c * spec.kh * spec.kw + spec.out;
        }

        params += p;
        if (spec.type === 'conv' || spec.type === 'pool') {
          rf = rf + (spec.kh - 1) * jump;
          jump = jump * spec.sy;
        }
        stages.push({
          index: i + 1, kind: spec.type, c: c, h: h, w: w,
          maps: maps, norm: normOf(maps, live), spec: spec, bank: bank, vec: vec,
          live: live,
          label: layerLabel(spec),
          shape: live != null ? '[' + live + ']' : (h + '×' + w + '×' + c),
          params: p, rf: rf, jump: jump,
        });
        cur = { c: c, h: h, w: w, maps: maps, vec: vec };
      }
      const chain = stages.map(function (s) { return s.shape; }).join(' → ');
      return {
        input: inp,
        stages: stages,
        chain: chain,
        params: params,
        depth: stages.length - 1,
        rf: rf,
      };
    }

    /** Input window (in source cells, padding included) that writes one output cell. */
    function sourceWindow(spec, oy, ox) {
      return {
        row: oy * spec.sy - spec.pad,
        col: ox * spec.sx - spec.pad,
        kh: spec.kh,
        kw: spec.kw,
      };
    }

    /**
     * Which cells of the previous stage feed one cell of `dst`. `channel` is the
     * single contributing channel for a flatten layer, or null for "all of them"
     * (a convolution window spans every channel; a dense unit reads every value).
     */
    function sourceWindowFor(dst, src, row, col) {
      const spec = dst.spec;
      if (!spec || !src) return null;
      if (spec.type === 'flatten') {
        const idx = row * dst.w + col;
        const per = Math.max(1, src.h * src.w);
        const channel = clamp(Math.floor(idx / per), 0, Math.max(0, src.c - 1));
        const rest = idx - channel * per;
        return {
          row: Math.floor(rest / src.w),
          col: rest % src.w,
          kh: 1,
          kw: 1,
          channel: channel,
          index: idx,
        };
      }
      if (spec.type === 'dense') {
        return { row: 0, col: 0, kh: src.h, kw: src.w, channel: null, index: -1 };
      }
      const win = sourceWindow(spec, row, col);
      win.channel = null;
      win.index = -1;
      return win;
    }

    /* =====================================================================
     * 4. Presets
     * ===================================================================*/

    function conv(kh, kw, sx, pad, out, act) {
      return { type: 'conv', kh: kh, kw: kw, sy: sx, sx: sx, pad: pad, out: out, act: act || 'relu' };
    }

    function pool(k, s, mode) {
      return { type: 'pool', kh: k, kw: k, sy: s, sx: s, pad: 0, mode: mode || 'max' };
    }

    function flatten() {
      return { type: 'flatten' };
    }

    function dense(units, act) {
      return { type: 'dense', units: units, act: act || 'linear' };
    }

    const PRESETS = [
      {
        id: 'classic',
        label: '3×3 · 步长 1 · 填充 1 · 全连接 10',
        layers: [conv(3, 3, 1, 1, 4), pool(2, 2), conv(3, 3, 1, 1, 6), pool(2, 2),
          flatten(), dense(10)],
      },
      {
        id: 'wide',
        label: '5×7 · 步长 1 · 填充 2 · 全连接 12',
        layers: [conv(5, 7, 1, 2, 4), pool(2, 2), conv(3, 3, 1, 1, 4),
          flatten(), dense(12)],
      },
      {
        id: 'broad',
        label: '11×11 · 大核 · 填充 5 · 全连接 8',
        layers: [conv(11, 11, 1, 5, 3), pool(3, 2, 'max'), flatten(), dense(8)],
      },
      {
        id: 'stride',
        label: '3×3 · 步长 3 · 无填充 · 全连接 10',
        layers: [conv(3, 3, 3, 0, 4), conv(3, 3, 2, 1, 6), flatten(), dense(10)],
      },
      {
        id: 'single',
        label: '单层 3×3 · 全连接 10',
        layers: [conv(3, 3, 1, 1, 4), flatten(), dense(10)],
      },
    ];

    function cloneLayers(list) {
      return list.map(function (l) { return Object.assign({}, l); });
    }

    const DEFAULT_LAYERS = cloneLayers(PRESETS[0].layers);
