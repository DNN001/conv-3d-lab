/**
 * Conv 3D Lab - Client half.
 *
 * One Web panel for looking at a convolutional network from the inside: the
 * input matrix becomes a stack of channel planes, every convolution/pooling
 * layer hangs behind its predecessor along the flow axis, and a kernel window
 * walks the input in row-major order while the matching cell of the next
 * feature map lights up. Everything on screen is a real number produced by the
 * arithmetic in section 2 - there is no decorative heat map.
 *
 * The scene is projected by hand and painted with the 2D canvas API: no WebGL,
 * no 3D library, no external assets, no network access.
 */
window.__ModuleLoader__.load({
  id: '@local/conv-3d-lab',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;

    const NS = 'conv3d';
    const PANEL_ID = 'conv-3d-lab';

    /* =====================================================================
     * 0. Locale
     * ===================================================================*/

    const DICT_EN = {
      'app.title': 'Conv 3D Lab',
      'app.sub': 'Watch the kernel scan the input and build the next feature map, cell by cell',
      'view.reset': 'Reset view',
      'view.auto': 'Auto rotate',

      'input.title': 'Input matrix',
      'input.size': 'Spatial size',
      'input.channels': 'Channels',
      'input.pattern': 'Content',
      'input.shuffle': 'New sample',
      'pattern.digit': 'Digit strokes',
      'pattern.rings': 'Concentric rings',
      'pattern.gradient': 'Gradient',
      'pattern.checker': 'Checkerboard',
      'pattern.noise': 'Noise',
      'pattern.waves': 'Waves',
      'input.shown': '{c} plane(s) · {s}×{s} cells',

      'net.title': 'Network',
      'net.addConv': '+ Conv',
      'net.addPool': '+ Pool',
      'net.reset': 'Reset',
      'net.preset': 'Preset',
      'net.hint': 'Click a layer to edit it, then scan it.',
      'layer.conv': 'Conv',
      'layer.pool': 'Pool',
      'layer.input': 'Input',
      'layer.shape': '{h}×{w}×{c}',
      'layer.kernel': 'K {kh}×{kw}',
      'layer.stride': 'S {sy}×{sx}',
      'layer.pad': 'P {p}',
      'layer.out': '{n} maps',
      'net.addFlatten': '+ Flatten',
      'net.addDense': '+ Linear',
      'layer.flatten': 'Flatten',
      'layer.dense': 'Linear',
      'layer.vec': '{n}-D vector',
      'ed.units': 'Output units',
      'ed.flattenNote': 'Flattens {c}×{h}×{w} into {n} values in channel → row → column order.',
      'ed.denseIn': 'Fully connected: reads {n} values, writes {u}.',
      'insp.index': 'Index',
      'insp.op.flatten': 'copy of one source value',
      'insp.op.dense': 'Σ input · weight + bias, then {act}',
      'insp.readsAll': 'the whole {n}-value vector',
      'scan.outindex': 'writes {name} unit {i}',
      'scan.title': 'Kernel scan',
      'scan.layer': 'Scanned layer',
      'scan.play': 'Play',
      'scan.pause': 'Pause',
      'scan.prev': 'Previous cell',
      'scan.next': 'Next cell',
      'scan.restart': 'Restart layer',
      'scan.speed': 'Speed',
      'scan.reveal': 'Reveal cell by cell',
      'scan.progress': 'Window {i}/{n}',
      'scan.idle': 'Paused at the start of the layer',
      'scan.done': 'Layer complete',
      'scan.window': 'Window on {name}',
      'scan.outcell': 'Writes {name} cell ({r},{c})',

      'ed.title': 'Layer parameters',
      'ed.empty': 'Select a layer in the network list.',
      'ed.preset': 'Kernel size',
      'ed.custom': 'Custom',
      'ed.kh': 'Kernel H',
      'ed.kw': 'Kernel W',
      'ed.sx': 'Stride X',
      'ed.sy': 'Stride Y',
      'ed.pad': 'Padding',
      'ed.out': 'Output maps',
      'ed.act': 'Activation',
      'ed.mode': 'Pooling',
      'ed.delete': 'Delete layer',
      'ed.formula': 'out = ⌊(in + 2·pad − kernel) / stride⌋ + 1',
      'ed.computed': '{in} → {out} per side',
      'ed.padFrame': 'with padding {p} the window may leave the input',

      'act.relu': 'ReLU',
      'act.tanh': 'Tanh',
      'act.linear': 'Linear',
      'act.sigmoid': 'Sigmoid',
      'pool.max': 'Max',
      'pool.avg': 'Average',

      'insp.title': 'Cell inspector',
      'insp.empty': 'Hover or click any cell in the scene.',
      'insp.layer': 'Layer',
      'insp.channel': 'Channel',
      'insp.cell': 'Cell (row, col)',
      'insp.value': 'Value',
      'insp.receptive': 'Reads',
      'insp.window': 'Window {kh}×{kw} from ({r},{c})',
      'insp.weights': 'Kernel weights',
      'insp.inwin': 'window values',
      'insp.op': 'Operation',
      'insp.op.conv': 'Σ input · weight, then {act}',
      'insp.op.pool': '{mode} over the window',
      'insp.op.input': 'raw pixel value',
      'disp.title': 'Display',
      'disp.labels': 'Layer labels',
      'disp.grid': 'Cell grid',
      'disp.window': 'Scan window',
      'disp.rotate': 'Auto rotate',
      'disp.ray': 'Projection ray',
      'disp.spacing': 'Layer spacing',
      'disp.channelGap': 'Channel spacing',

      'legend.title': 'Reading the scene',
      'legend.input': 'input plane, one per channel',
      'legend.conv': 'convolution result',
      'preset.classic': '3×3 · stride 1 · pad 1 · linear 10',
      'preset.wide': '5×7 · stride 1 · pad 2 · linear 12',
      'preset.broad': '11×11 big kernel · pad 5 · linear 8',
      'preset.stride': '3×3 · stride 3 · no padding · linear 10',
      'preset.single': 'one 3×3 layer · linear 10',
      'legend.flatten': 'flattened vector',
      'legend.dense': 'linear output',      'legend.pool': 'pooling result',
      'legend.window': 'kernel window being scanned',
      'legend.ray': 'where the window writes',
      'legend.scale': 'colour = value low → high',

      'stat.chain': 'Shape flow',
      'stat.params': 'Weights',
      'stat.layers': 'Layers',
      'stat.rf': 'Receptive field',

      'hint.drag': 'Drag to orbit · right-drag to pan · wheel to zoom',
      'hint.keys': 'Space plays, ←/→ steps, R resets the view',
      'a11y.canvas': 'Interactive 3D view of the convolutional network',
      'badge.input': 'input',
    };

    const DICT_ZH = {
      'app.title': 'Conv 3D Lab',
      'app.sub': '看着卷积核扫过输入矩阵，逐格生成下一层特征图',

      'view.reset': '重置视角',
      'view.auto': '自动旋转',

      'input.title': '输入矩阵',
      'input.size': '空间尺寸',
      'input.channels': '通道数',
      'input.pattern': '图像内容',
      'input.shuffle': '换一张',
      'pattern.digit': '数字笔画',
      'pattern.rings': '同心圆环',
      'pattern.gradient': '渐变',
      'pattern.checker': '棋盘格',
      'pattern.noise': '随机噪声',
      'pattern.waves': '条纹波',
      'input.shown': '{c} 个平面 · {s}×{s} 格',

      'net.title': '网络结构',
      'net.addConv': '+ 卷积层',
      'net.addPool': '+ 池化层',
      'net.reset': '重置',
      'net.preset': '预设结构',
      'net.hint': '点击某一层编辑参数，然后扫描它。',
      'layer.conv': '卷积',
      'layer.pool': '池化',
      'layer.input': '输入',
      'layer.shape': '{h}×{w}×{c}',
      'layer.kernel': '核 {kh}×{kw}',
      'layer.stride': '步长 {sy}×{sx}',
      'layer.pad': '填充 {p}',
      'layer.out': '{n} 张特征图',
      'net.addFlatten': '+ 展平层',
      'net.addDense': '+ 线性层',
      'layer.flatten': '展平',
      'layer.dense': '全连接',
      'layer.vec': '{n} 维向量',
      'ed.units': '输出维度',
      'ed.flattenNote': '把 {c}×{h}×{w} 按 通道 → 行 → 列 压平成 {n} 维向量。',
      'ed.denseIn': '全连接：读取 {n} 个值，输出 {u} 维。',
      'insp.index': '序号',
      'insp.op.flatten': '直接复制一个来源数值',
      'insp.op.dense': 'Σ 输入 · 权重 + 偏置，再取 {act}',
      'insp.readsAll': '整个 {n} 维向量',
      'scan.outindex': '写入 {name} 第 {i} 维',
      'scan.title': '卷积核扫描',
      'scan.layer': '扫描层',
      'scan.play': '播放',
      'scan.pause': '暂停',
      'scan.prev': '上一格',
      'scan.next': '下一格',
      'scan.restart': '重扫本层',
      'scan.speed': '速度',
      'scan.reveal': '逐格点亮',
      'scan.progress': '窗口 {i}/{n}',
      'scan.idle': '停在本层起点',
      'scan.done': '本层扫描完成',
      'scan.window': '窗口位于 {name}',
      'scan.outcell': '写入 {name} 的 ({r},{c})',

      'ed.title': '层参数',
      'ed.empty': '先在上方网络结构中选中一层。',
      'ed.preset': '核尺寸',
      'ed.custom': '自定义',
      'ed.kh': '核高',
      'ed.kw': '核宽',
      'ed.sx': '步长 X',
      'ed.sy': '步长 Y',
      'ed.pad': '填充',
      'ed.out': '输出通道',
      'ed.act': '激活函数',
      'ed.mode': '池化方式',
      'ed.delete': '删除此层',
      'ed.formula': 'out = ⌊(in + 2·pad − kernel) / stride⌋ + 1',
      'ed.computed': '每边 {in} → {out}',
      'ed.padFrame': '填充 {p}：窗口可以越过输入边界',

      'act.relu': 'ReLU',
      'act.tanh': 'Tanh',
      'act.linear': '线性',
      'act.sigmoid': 'Sigmoid',
      'pool.max': '最大值',
      'pool.avg': '平均值',

      'insp.title': '格子检视',
      'insp.empty': '把鼠标移到场景中任意格子上，或点击选中它。',
      'insp.layer': '所在层',
      'insp.channel': '通道',
      'insp.cell': '格子（行, 列）',
      'insp.value': '数值',
      'insp.receptive': '读取',
      'insp.window': '来自 ({r},{c}) 的 {kh}×{kw} 窗口',
      'insp.weights': '卷积核权重',
      'insp.inwin': '窗口数值',
      'insp.op': '运算',
      'insp.op.conv': 'Σ 输入 · 权重，再取 {act}',
      'insp.op.pool': '窗口内取 {mode}',
      'insp.op.input': '原始像素值',
      'disp.title': '显示',
      'disp.labels': '层标签',
      'disp.grid': '格线',
      'disp.window': '扫描窗口',
      'disp.rotate': '自动旋转',
      'disp.ray': '映射连线',
      'disp.spacing': '层间距',
      'disp.channelGap': '通道间距',

      'legend.title': '场景怎么看',
      'legend.input': '输入平面，每个通道一张',
      'legend.conv': '卷积结果',
      'preset.classic': '3×3 · 步长 1 · 填充 1 · 全连接 10',
      'preset.wide': '5×7 · 步长 1 · 填充 2 · 全连接 12',
      'preset.broad': '11×11 大核 · 填充 5 · 全连接 8',
      'preset.stride': '3×3 · 步长 3 · 无填充 · 全连接 10',
      'preset.single': '单层 3×3 · 全连接 10',
      'legend.flatten': '展平后的向量',
      'legend.dense': '线性层输出',      'legend.pool': '池化结果',
      'legend.window': '正在扫描的卷积窗口',
      'legend.ray': '窗口写到哪一格',
      'legend.scale': '颜色 = 数值 低 → 高',

      'stat.chain': '尺寸流',
      'stat.params': '权重',
      'stat.layers': '层数',
      'stat.rf': '感受野',

      'hint.drag': '拖拽旋转 · 右键拖拽平移 · 滚轮缩放',
      'hint.keys': '空格播放，←/→ 单步，R 重置视角',
      'a11y.canvas': '卷积网络的可交互三维视图',
      'badge.input': '输入',
    };

    let hostCtx = null;
    let localeFace = null;
    let boundTranslate = null;

    /** The locale service can register after this plugin: resolve it on demand. */
    function ensureLocale() {
      if (localeFace) return;
      if (!hostCtx || typeof hostCtx.get !== 'function') return;
      try {
        const loc = hostCtx.get('locale');
        if (loc) localeFace = loc;
      } catch (e) { /* locale service absent: the built-in dictionaries carry the text */ }
    }

    function activeIsZh() {
      ensureLocale();
      if (!localeFace || typeof localeFace.getLocale !== 'function') return false;
      try {
        const snap = localeFace.getLocale();
        const tag = String((snap && (snap.active || snap.locale)) || '').toLowerCase();
        return tag.indexOf('zh') === 0 || tag.indexOf('cn') === 0;
      } catch (e) {
        return false;
      }
    }

    function translateFrom(dict, key, vars) {
      let text = dict[key];
      if (text == null) text = DICT_EN[key];
      if (text == null) return key;
      if (vars) {
        text = text.replace(/\{(\w+)\}/g, function (m, name) {
          return vars[name] == null ? m : String(vars[name]);
        });
      }
      return text;
    }

    function t(key, vars) {
      ensureLocale();
      if (boundTranslate) {
        try {
          const out = boundTranslate(key, vars);
          if (out != null && out !== key) return out;
        } catch (e) { /* fall through to the local dictionaries */ }
      }
      return translateFrom(activeIsZh() ? DICT_ZH : DICT_EN, key, vars);
    }

    /** Re-render the panel when the active locale or a dictionary changes. */
    function useLocaleTick() {
      const pair = React.useState(0);
      const bump = pair[1];
      React.useEffect(function () {
        ensureLocale();
        if (!localeFace || typeof localeFace.subscribe !== 'function') return undefined;
        return localeFace.subscribe(function () { bump(function (v) { return v + 1; }); });
      }, []);
      return pair[0];
    }

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

    /* =====================================================================
     * 5. Scene layout
     * ===================================================================*/

    const BASE_GAP = 0.62;
    const BASE_CH_GAP = 0.075;

    /**
     * Where every plane sits in world space. X is the flow axis (input left,
     * output right), Y is the row axis, Z the column axis, and a layer's channel
     * planes recede along X inside the layer's own thickness.
     */
    function buildScene(model, opts) {
      const o = opts || {};
      const gap = BASE_GAP * clamp(num(o.spacing, 1), 0.4, 2.6);
      const chGap = BASE_CH_GAP * clamp(num(o.channelGap, 1), 0.4, 2.4);
      const maxCh = clamp(Math.round(num(o.maxChannels, 8)), 1, 12);
      const S = model.input.size;
      const layers = [];
      let x = 0;
      for (let i = 0; i < model.stages.length; i += 1) {
        const st = model.stages[i];
        const c = Math.min(st.c, maxCh);
        const isVec = st.kind === 'flatten' || st.kind === 'dense';
        const edgeY = isVec ? 1.05 : 1.35 * Math.pow(clamp(st.h / S, 0.05, 1), 0.6);
        const edgeZ = isVec ? 1.05 : 1.35 * Math.pow(clamp(st.w / S, 0.05, 1), 0.6);
        const thick = (c - 1) * chGap;
        layers.push({
          index: i, x: x + thick / 2, edgeY: edgeY, edgeZ: edgeZ,
          edge: Math.max(edgeY, edgeZ), h: st.h, w: st.w, c: c,
          chGap: chGap, kind: st.kind, maps: st.maps, norm: st.norm,
          spec: st.spec, label: st.label, shape: st.shape, hidden: st.c - c,
          live: st.live == null ? null : st.live,
        });
        x += thick + gap;
      }
      const first = layers.length ? layers[0].x : 0;
      const last = layers.length ? layers[layers.length - 1].x : 0;
      const shift = (first + last) / 2;
      let radius = 0.8;
      for (let i = 0; i < layers.length; i += 1) {
        const L = layers[i];
        L.x -= shift;
        const r = Math.sqrt(L.x * L.x + 2 * (L.edge * 0.5) * (L.edge * 0.5)) + 0.12;
        if (r > radius) radius = r;
      }
      return { layers: layers, radius: radius, model: model, chain: model.chain };
    }

    /* =====================================================================
     * 6. Renderer: hand-projected perspective scene on a 2D canvas
     * ===================================================================*/

    function dist2(a, b) {
      return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    }

    function withAlpha(hex, alpha) {
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function kindColor(kind) {
      if (kind === 'input') return '#7fd0ff';
      if (kind === 'pool') return '#ffd166';
      if (kind === 'flatten') return '#b39dff';
      if (kind === 'dense') return '#ff8fb8';
      return '#8fe3c6';
    }

    function createRenderer(canvas, hooks) {
      const cb = hooks || {};
      const ctx = canvas.getContext('2d');
      const HOME = { yaw: -0.98, pitch: 0.22, zoom: 1 };
      const st = {
        scene: null,
        opts: { labels: true, grid: true, window: true, ray: true },
        focus: 1,
        playing: false,
        speed: 16,
        reveal: true,
        cursor: 0,
        lastStep: -1,
        autoRotate: false,
        yaw: HOME.yaw,
        pitch: HOME.pitch,
        zoom: HOME.zoom,
        target: { x: 0, y: 0, z: 0 },
        hover: null,
        sel: null,
        W: 1, H: 1, dpr: 1,
        needDraw: true,
        last: 0,
        raf: 0,
        items: null,
        disposed: false,
        drag: null,
        cam: null,
      };

      function resize() {
        const w = Math.max(1, canvas.clientWidth || canvas.width || 1);
        const ht = Math.max(1, canvas.clientHeight || canvas.height || 1);
        const dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
        if (w === st.W && ht === st.H && dpr === st.dpr) return;
        st.W = w; st.H = ht; st.dpr = dpr;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(ht * dpr);
        st.needDraw = true;
      }

      function makeCam() {
        const radius = st.scene ? st.scene.radius : 1.4;
        const focal = Math.min(st.W, st.H) * 0.95;
        return {
          focal: focal,
          dist: (radius * 2.15) / clamp(st.zoom, 0.22, 6),
          cy: Math.cos(st.yaw), sy: Math.sin(st.yaw),
          cp: Math.cos(st.pitch), sp: Math.sin(st.pitch),
          cx: st.W / 2, cyS: st.H / 2,
          target: st.target,
        };
      }

      function project(p, cam) {
        const x = p.x - cam.target.x;
        const y = p.y - cam.target.y;
        const z = p.z - cam.target.z;
        const x1 = x * cam.cy + z * cam.sy;
        const z1 = -x * cam.sy + z * cam.cy;
        const y2 = y * cam.cp - z1 * cam.sp;
        const z2 = y * cam.sp + z1 * cam.cp;
        const depth = cam.dist + z2;
        if (depth < 0.08) return null;
        const s = cam.focal / depth;
        return { x: cam.cx + x1 * s, y: cam.cyS - y2 * s, depth: depth };
      }

      function panBy(dx, dy) {
        const cam = makeCam();
        const k = cam.dist / cam.focal;
        const rx = cam.cy, rz = cam.sy;
        const ux = cam.sy * cam.sp, uy = cam.cp, uz = -cam.cy * cam.sp;
        const ax = dx * k, ay = -dy * k;
        st.target.x -= rx * ax + ux * ay;
        st.target.y -= uy * ay;
        st.target.z -= rz * ax + uz * ay;
        st.needDraw = true;
      }

      function scanInfo() {
        const scene = st.scene;
        if (!scene || scene.layers.length < 2) return null;
        const focus = clamp(st.focus, 1, scene.layers.length - 1);
        const dst = scene.layers[focus];
        const src = scene.layers[focus - 1];
        if (!dst || !dst.spec || !src) return null;
        const spec = dst.spec;
        const total = Math.max(1, dst.live != null ? dst.live : dst.h * dst.w);
        const cur = clamp(st.cursor, 0, total);
        const idx = Math.min(total - 1, Math.floor(cur));
        const idx2 = Math.min(total - 1, Math.floor(cur) + 1);
        const frac = cur - Math.floor(cur);
        const r0 = Math.floor(idx / dst.w), c0 = idx % dst.w;
        const r1 = Math.floor(idx2 / dst.w), c1 = idx2 % dst.w;
        let winRow, winCol, winKh, winKw, srcChannel = null;
        if (spec.type === 'flatten' || spec.type === 'dense') {
          const win = sourceWindowFor(dst, src, r0, c0);
          winRow = win.row; winCol = win.col;
          winKh = win.kh; winKw = win.kw; srcChannel = win.channel;
        } else {
          winRow = lerp(r0, r1, frac) * spec.sy - spec.pad;
          winCol = lerp(c0, c1, frac) * spec.sx - spec.pad;
          winKh = spec.kh; winKw = spec.kw;
        }
        return {
          src: src, dst: dst, spec: spec, total: total, cur: cur,
          idx: idx, frac: frac, row: r0, col: c0,
          row2: r1, col2: c1,
          winRow: winRow, winCol: winCol, winKh: winKh, winKw: winKw,
          srcChannel: srcChannel,
        };
      }

      function draw() {
        const W = st.W, H = st.H;
        ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const bg = ctx.createLinearGradient(0, 0, W * 0.35, H);
        bg.addColorStop(0, '#070b14');
        bg.addColorStop(0.55, '#0a1120');
        bg.addColorStop(1, '#101a2c');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const scene = st.scene;
        if (!scene || !scene.layers.length) return;
        const cam = makeCam();
        st.cam = cam;
        const scan = scanInfo();

        /* spine through the layer centres, behind everything */
        const p0 = project({ x: scene.layers[0].x, y: 0, z: 0 }, cam);
        const p1 = project({ x: scene.layers[scene.layers.length - 1].x, y: 0, z: 0 }, cam);
        if (p0 && p1) {
          ctx.save();
          ctx.setLineDash([6, 8]);
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(140,180,230,0.20)';
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          ctx.restore();
        }

        const items = [];
        for (let li = 0; li < scene.layers.length; li += 1) {
          const L = scene.layers[li];
          for (let ci = 0; ci < L.c; ci += 1) {
            const px = L.x + (ci - (L.c - 1) / 2) * L.chGap;
            const rows = L.h, cols = L.w;
            const cols1 = cols + 1;
            const pts = new Array((rows + 1) * cols1);
            let sum = 0, count = 0, ok = true;
            for (let j = 0; j <= rows && ok; j += 1) {
              const y = L.edgeY * (0.5 - j / rows);
              for (let i = 0; i <= cols; i += 1) {
                const z = L.edgeZ * (-0.5 + i / cols);
                const p = project({ x: px, y: y, z: z }, cam);
                if (!p) { ok = false; break; }
                pts[j * cols1 + i] = p;
                sum += p.depth; count += 1;
              }
            }
            if (!ok || !count) continue;
            items.push({
              layer: L, ci: ci, px: px, pts: pts, rows: rows, cols: cols,
              depth: sum / count,
            });
          }
        }
        items.sort(function (a, b) { return b.depth - a.depth; });
        st.items = items;
        for (let i = 0; i < items.length; i += 1) drawPlane(items[i], cam, scan);
        drawScanOverlay(cam, scan);
        drawPickedWindow(cam);
        if (st.opts.labels) drawLabels(cam, scene);
      }

      function fillQuads(list, color) {
        if (!list || !list.length) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let k = 0; k < list.length; k += 4) {
          ctx.moveTo(list[k].x, list[k].y);
          ctx.lineTo(list[k + 1].x, list[k + 1].y);
          ctx.lineTo(list[k + 2].x, list[k + 2].y);
          ctx.lineTo(list[k + 3].x, list[k + 3].y);
          ctx.closePath();
        }
        ctx.fill();
      }

      function drawPlane(it, cam, scan) {
        const L = it.layer;
        const rows = it.rows, cols = it.cols, pts = it.pts, cols1 = cols + 1;
        const map = L.maps[Math.min(it.ci, L.maps.length - 1)];
        const n0 = L.norm.min, span = (L.norm.max - L.norm.min) || 1;
        const isTarget = !!(scan && scan.dst.index === L.index && st.reveal);
        const buckets = new Array(PALETTE.length);
        let hiddenList = null;
        for (let j = 0; j < rows; j += 1) {
          const rowBase = j * cols1;
          for (let i = 0; i < cols; i += 1) {
            const a = pts[rowBase + i];
            const b = pts[rowBase + i + 1];
            const c = pts[rowBase + cols1 + i + 1];
            const d = pts[rowBase + cols1 + i];
            const cellIdx = j * cols + i;
            if (L.live != null && cellIdx >= L.live) {
              if (!hiddenList) hiddenList = [];
              hiddenList.push(a, b, c, d);
              continue;
            }
            if (isTarget && cellIdx > scan.idx) {
              if (!hiddenList) hiddenList = [];
              hiddenList.push(a, b, c, d);
              continue;
            }
            const v = map ? map[cellIdx] : 0;
            const bi = palIndex((v - n0) / span);
            if (!buckets[bi]) buckets[bi] = [];
            buckets[bi].push(a, b, c, d);
          }
        }
        for (let b = 0; b < buckets.length; b += 1) {
          if (buckets[b]) fillQuads(buckets[b], PALETTE[b]);
        }
        if (hiddenList) fillQuads(hiddenList, EMPTY_CELL);

        const cellW = dist2(pts[0], pts[1]);
        const cellH = dist2(pts[0], pts[cols1]);
        if (st.opts.grid && Math.min(cellW, cellH) > 4.2) {
          ctx.strokeStyle = 'rgba(6,10,18,0.55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let j = 0; j <= rows; j += 1) {
            const a = pts[j * cols1];
            const b = pts[j * cols1 + cols];
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
          for (let i = 0; i <= cols; i += 1) {
            const a = pts[i];
            const b = pts[rows * cols1 + i];
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
          ctx.stroke();
        }

        const hovered = st.hover && st.hover.layer === L.index && st.hover.channel === it.ci;
        const selected = st.sel && st.sel.layer === L.index && st.sel.channel === it.ci;
        const focused = st.focus === L.index;
        if (hovered || selected || focused) {
          const a = pts[0], b = pts[cols], c = pts[rows * cols1 + cols], d = pts[rows * cols1];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.lineTo(d.x, d.y);
          ctx.closePath();
          ctx.lineWidth = hovered || selected ? 2 : 1.2;
          ctx.strokeStyle = kindColor(L.kind);
          ctx.stroke();
        }
      }

      function quadOf(px, yTop, yBot, zLeft, zRight, cam) {
        const a = project({ x: px, y: yTop, z: zLeft }, cam);
        const b = project({ x: px, y: yTop, z: zRight }, cam);
        const c = project({ x: px, y: yBot, z: zRight }, cam);
        const d = project({ x: px, y: yBot, z: zLeft }, cam);
        if (!a || !b || !c || !d) return null;
        return [a, b, c, d];
      }

      function pathQuad(pts) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.lineTo(pts[3].x, pts[3].y);
        ctx.closePath();
      }

      function drawScanOverlay(cam, scan) {
        if (!scan) return;
        const src = scan.src, dst = scan.dst, spec = scan.spec;
        const cellH = src.edgeY / src.h, cellW = src.edgeZ / src.w;

        /* dashed padding frame: the window may step outside the plane */
        if (spec.pad > 0 && st.opts.window) {
          const yTop = src.edgeY * 0.5 + spec.pad * cellH;
          const yBot = -src.edgeY * 0.5 - spec.pad * cellH;
          const zLeft = -src.edgeZ * 0.5 - spec.pad * cellW;
          const zRight = src.edgeZ * 0.5 + spec.pad * cellW;
          const cx = src.x + (0 - (src.c - 1) / 2) * src.chGap;
          const q = quadOf(cx, yTop, yBot, zLeft, zRight, cam);
          if (q) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255,209,102,0.45)';
            pathQuad(q);
            ctx.stroke();
            ctx.restore();
          }
        }

        const yTop = src.edgeY * 0.5 - scan.winRow * cellH;
        const yBot = yTop - scan.winKh * cellH;
        const zLeft = -src.edgeZ * 0.5 + scan.winCol * cellW;
        const zRight = zLeft + scan.winKw * cellW;
        const srcFirst = scan.srcChannel == null ? 0 : scan.srcChannel;
        const srcCount = scan.srcChannel == null ? src.c : 1;

        if (st.opts.window) {
          for (let ci = srcFirst; ci < srcFirst + srcCount; ci += 1) {
            const px = src.x + (ci - (src.c - 1) / 2) * src.chGap;
            const q = quadOf(px, yTop, yBot, zLeft, zRight, cam);
            if (!q) continue;
            pathQuad(q);
            ctx.fillStyle = 'rgba(255,209,102,0.18)';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255,209,102,0.95)';
            ctx.stroke();
          }
        }

        /* the cell of the next layer this window writes */
        const dCellH = dst.edgeY / dst.h, dCellW = dst.edgeZ / dst.w;
        const dTop = dst.edgeY * 0.5 - scan.row * dCellH;
        const dBot = dTop - dCellH;
        const dLeft = -dst.edgeZ * 0.5 + scan.col * dCellW;
        const dRight = dLeft + dCellW;
        const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 140);
        for (let ci = 0; st.opts.window && ci < dst.c; ci += 1) {
          const px = dst.x + (ci - (dst.c - 1) / 2) * dst.chGap;
          const q = quadOf(px, dTop, dBot, dLeft, dRight, cam);
          if (!q) continue;
          pathQuad(q);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.10 + 0.16 * pulse).toFixed(3) + ')';
          ctx.fill();
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = 'rgba(255,255,255,0.92)';
          ctx.stroke();
        }

        if (st.opts.ray) {
          const sy0 = src.edgeY * 0.5 - (scan.winRow + scan.winKh / 2) * cellH;
          const sz0 = -src.edgeZ * 0.5 + (scan.winCol + scan.winKw / 2) * cellW;
          const sMid = project({
            x: src.x + (srcFirst - (src.c - 1) / 2) * src.chGap, y: sy0, z: sz0,
          }, cam);
          if (sMid) {
            ctx.save();
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = 'rgba(255,209,102,0.55)';
            for (let ci = 0; ci < dst.c; ci += 1) {
              const px = dst.x + (ci - (dst.c - 1) / 2) * dst.chGap;
              const dy = dst.edgeY * 0.5 - (scan.row + 0.5) * dCellH;
              const dz = -dst.edgeZ * 0.5 + (scan.col + 0.5) * dCellW;
              const dMid = project({ x: px, y: dy, z: dz }, cam);
              if (!dMid) continue;
              ctx.beginPath();
              ctx.moveTo(sMid.x, sMid.y);
              ctx.lineTo(dMid.x, dMid.y);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      /** The source window behind the hovered / selected cell. */
      function drawPickedWindow(cam) {
        const pick = st.sel || st.hover;
        if (!pick || !st.scene) return;
        const layers = st.scene.layers;
        const dst = layers[pick.layer];
        if (!dst || !dst.spec) return;
        const src = layers[pick.layer - 1];
        if (!src) return;
        const spec = dst.spec;
        const cellH = src.edgeY / src.h, cellW = src.edgeZ / src.w;
        const win = sourceWindowFor(dst, src, pick.row, pick.col);
        if (!win) return;
        const yTop = src.edgeY * 0.5 - win.row * cellH;
        const yBot = yTop - win.kh * cellH;
        const zLeft = -src.edgeZ * 0.5 + win.col * cellW;
        const zRight = zLeft + win.kw * cellW;
        const firstCh = win.channel == null ? 0 : win.channel;
        const chCount = win.channel == null ? src.c : 1;
        for (let ci = firstCh; ci < firstCh + chCount; ci += 1) {
          const px = src.x + (ci - (src.c - 1) / 2) * src.chGap;
          const q = quadOf(px, yTop, yBot, zLeft, zRight, cam);
          if (!q) continue;
          pathQuad(q);
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = 'rgba(129,214,255,0.85)';
          ctx.stroke();
        }
      }

      function drawLabels(cam, scene) {
        ctx.font = '500 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i < scene.layers.length; i += 1) {
          const L = scene.layers[i];
          const y = -L.edgeY * 0.5 - 0.06;
          const p = project({ x: L.x, y: y, z: 0 }, cam);
          if (!p) continue;
          const active = st.focus === L.index;
          const text = L.label;
          const shape = L.shape;
          const w = Math.max(ctx.measureText(text).width, ctx.measureText(shape).width) + 10;
          ctx.fillStyle = active ? 'rgba(37,58,88,0.92)' : 'rgba(14,22,36,0.78)';
          const top = p.y;
          ctx.beginPath();
          const rx = p.x - w / 2, ry = top, rw = w, rh = 26, r = 5;
          ctx.moveTo(rx + r, ry);
          ctx.lineTo(rx + rw - r, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
          ctx.lineTo(rx + rw, ry + rh - r);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
          ctx.lineTo(rx + r, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
          ctx.lineTo(rx, ry + r);
          ctx.quadraticCurveTo(rx, ry, rx + r, ry);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = active ? kindColor(L.kind) : 'rgba(120,150,190,0.28)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = active ? '#eaf3ff' : 'rgba(214,226,242,0.82)';
          ctx.fillText(text, p.x, top + 3);
          ctx.fillStyle = 'rgba(160,182,210,0.85)';
          ctx.font = '400 10px ui-monospace, Menlo, monospace';
          ctx.fillText(shape, p.x, top + 15);
          ctx.font = '500 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
        }
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      /* ---------------- picking ---------------- */

      function inQuad(px, py, a, b, c, d) {
        const cross = function (p, q) {
          return (q.x - p.x) * (py - p.y) - (q.y - p.y) * (px - p.x);
        };
        const c1 = cross(a, b), c2 = cross(b, c), c3 = cross(c, d), c4 = cross(d, a);
        const hasNeg = c1 < 0 || c2 < 0 || c3 < 0 || c4 < 0;
        const hasPos = c1 > 0 || c2 > 0 || c3 > 0 || c4 > 0;
        return !(hasNeg && hasPos);
      }

      function pickAt(px, py) {
        const items = st.items;
        if (!items) return null;
        for (let n = items.length - 1; n >= 0; n -= 1) {
          const it = items[n];
          const pts = it.pts, cols = it.cols, rows = it.rows, cols1 = cols + 1;
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (let k = 0; k < pts.length; k += 1) {
            const p = pts[k];
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          }
          if (px < minX || px > maxX || py < minY || py > maxY) continue;
          for (let j = 0; j < rows; j += 1) {
            for (let i = 0; i < cols; i += 1) {
              const a = pts[j * cols1 + i];
              const b = pts[j * cols1 + i + 1];
              const c = pts[(j + 1) * cols1 + i + 1];
              const d = pts[(j + 1) * cols1 + i];
              if (it.layer.live != null && j * cols + i >= it.layer.live) continue;
              if (inQuad(px, py, a, b, c, d)) {
                return { layer: it.layer.index, channel: it.ci, row: j, col: i };
              }
            }
          }
        }
        return null;
      }

      /* ---------------- loop ---------------- */

      function loop(ts) {
        if (st.disposed) return;
        st.raf = window.requestAnimationFrame(loop);
        const dt = st.last ? Math.min(0.12, (ts - st.last) / 1000) : 0;
        st.last = ts;
        let changed = false;
        const scan = scanInfo();
        if (st.playing && scan) {
          st.cursor += dt * st.speed;
          changed = true;
          if (st.cursor >= scan.total) {
            st.cursor = scan.total;
            if (cb.onAdvance && cb.onAdvance()) {
              st.cursor = 0;
              st.lastStep = -1;
              if (cb.onStep) cb.onStep(0, st.focus);
            } else {
              st.playing = false;
              if (cb.onStep) cb.onStep(scan.total - 1, st.focus);
              if (cb.onFinished) cb.onFinished();
            }
          } else {
            const step = Math.min(scan.total - 1, Math.floor(st.cursor));
            if (step !== st.lastStep) {
              st.lastStep = step;
              if (cb.onStep) cb.onStep(step, st.focus);
            }
          }
        }
        if (st.autoRotate) {
          st.yaw += dt * 0.32;
          changed = true;
        }
        if (changed || st.needDraw) {
          st.needDraw = false;
          draw();
        }
      }

      /* ---------------- events ---------------- */

      const disposers = [];

      function on(target, type, fn, options) {
        target.addEventListener(type, fn, options);
        disposers.push(function () { target.removeEventListener(type, fn, options); });
      }

      function localPoint(ev) {
        const r = canvas.getBoundingClientRect();
        return { x: ev.clientX - r.left, y: ev.clientY - r.top };
      }

      let downAt = null;

      on(canvas, 'pointerdown', function (ev) {
        const p = localPoint(ev);
        st.drag = { x: p.x, y: p.y, mode: (ev.button === 2 || ev.shiftKey) ? 'pan' : 'orbit' };
        downAt = { x: p.x, y: p.y, moved: 0 };
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* capture is best effort */ }
        ev.preventDefault();
      });

      on(canvas, 'pointermove', function (ev) {
        const p = localPoint(ev);
        if (st.drag) {
          const dx = p.x - st.drag.x, dy = p.y - st.drag.y;
          if (downAt) downAt.moved += Math.abs(dx) + Math.abs(dy);
          if (st.drag.mode === 'orbit') {
            st.yaw += dx * 0.0085;
            st.pitch = clamp(st.pitch + dy * 0.0055, -1.15, 1.15);
            st.needDraw = true;
          } else {
            panBy(dx, dy);
          }
          st.drag.x = p.x;
          st.drag.y = p.y;
          return;
        }
        const hit = pickAt(p.x, p.y);
        const same = (!hit && !st.hover) ||
          (hit && st.hover && hit.layer === st.hover.layer &&
            hit.channel === st.hover.channel && hit.row === st.hover.row && hit.col === st.hover.col);
        if (!same) {
          st.hover = hit;
          st.needDraw = true;
          if (cb.onHover) cb.onHover(hit);
        }
      });

      function endDrag(ev) {
        const moved = downAt ? downAt.moved : 99;
        st.drag = null;
        downAt = null;
        if (moved < 5 && ev) {
          const p = localPoint(ev);
          const hit = pickAt(p.x, p.y);
          st.sel = hit;
          st.needDraw = true;
          if (cb.onSelect) cb.onSelect(hit);
        }
      }

      on(canvas, 'pointerup', endDrag);
      on(canvas, 'pointercancel', function () { st.drag = null; downAt = null; });
      on(canvas, 'pointerleave', function () {
        if (st.hover) {
          st.hover = null;
          st.needDraw = true;
          if (cb.onHover) cb.onHover(null);
        }
      });
      on(canvas, 'contextmenu', function (ev) { ev.preventDefault(); });
      on(canvas, 'wheel', function (ev) {
        ev.preventDefault();
        st.zoom = clamp(st.zoom * (1 - ev.deltaY * 0.0013), 0.22, 6);
        st.needDraw = true;
      }, { passive: false });
      on(canvas, 'dblclick', function (ev) {
        const p = localPoint(ev);
        const hit = pickAt(p.x, p.y);
        if (hit) focusLayerAt(hit.layer);
      });
      on(canvas, 'keydown', function (ev) {
        if (ev.key === ' ' || ev.key === 'Spacebar') {
          ev.preventDefault();
          if (cb.onTogglePlay) cb.onTogglePlay();
        } else if (ev.key === 'ArrowRight') {
          ev.preventDefault();
          stepBy(1);
        } else if (ev.key === 'ArrowLeft') {
          ev.preventDefault();
          stepBy(-1);
        } else if (ev.key === 'r' || ev.key === 'R') {
          ev.preventDefault();
          resetView();
        }
      });

      let observer = null;
      if (typeof window.ResizeObserver === 'function') {
        observer = new window.ResizeObserver(function () { resize(); });
        try { observer.observe(canvas); } catch (e) { observer = null; }
      }
      on(window, 'resize', function () { resize(); });

      /* ---------------- public surface ---------------- */

      function setScene(scene) {
        st.scene = scene;
        if (scene && scene.layers.length) {
          st.focus = clamp(st.focus, 1, Math.max(1, scene.layers.length - 1));
        }
        st.needDraw = true;
      }

      function setOpts(opts) {
        st.opts = Object.assign({}, st.opts, opts || {});
        st.needDraw = true;
      }

      function setFocus(index) {
        const i = Math.max(0, Math.round(num(index, 1)));
        if (i === st.focus && st.lastStep >= 0) return;
        st.focus = i;
        st.cursor = 0;
        st.lastStep = -1;
        st.needDraw = true;
        if (cb.onStep) cb.onStep(0, i);
      }

      function setPlaying(on_) {
        const next = !!on_;
        if (next && !st.playing) {
          const scan = scanInfo();
          if (scan && st.cursor >= scan.total) { st.cursor = 0; st.lastStep = -1; }
          st.last = 0;
        }
        st.playing = next;
        st.needDraw = true;
      }

      function setSpeed(v) { st.speed = clamp(num(v, 16), 1, 90); }
      function setReveal(v) { st.reveal = !!v; st.needDraw = true; }
      function setAutoRotate(v) { st.autoRotate = !!v; st.needDraw = true; }

      function stepBy(delta) {
        const scan = scanInfo();
        if (!scan) return;
        st.playing = false;
        const base = Math.floor(clamp(st.cursor, 0, scan.total - 1));
        const next = clamp(base + delta, 0, scan.total - 1);
        st.cursor = next;
        st.lastStep = next;
        st.needDraw = true;
        if (cb.onStep) cb.onStep(next, st.focus);
        if (cb.onPlaying) cb.onPlaying(false);
      }

      function restart() {
        st.cursor = 0;
        st.lastStep = -1;
        st.needDraw = true;
        if (cb.onStep) cb.onStep(0, st.focus);
      }

      function resetView() {
        st.yaw = HOME.yaw;
        st.pitch = HOME.pitch;
        st.zoom = HOME.zoom;
        st.target = { x: 0, y: 0, z: 0 };
        st.needDraw = true;
      }

      function focusLayerAt(index) {
        if (!st.scene) return;
        const L = st.scene.layers[clamp(index, 0, st.scene.layers.length - 1)];
        if (!L) return;
        st.target = { x: L.x, y: 0, z: 0 };
        st.zoom = Math.max(st.zoom, 1.15);
        st.needDraw = true;
      }

      function dispose() {
        st.disposed = true;
        if (st.raf) window.cancelAnimationFrame(st.raf);
        if (observer) { try { observer.disconnect(); } catch (e) { /* already gone */ } }
        for (let i = 0; i < disposers.length; i += 1) {
          try { disposers[i](); } catch (e) { /* listener already removed */ }
        }
        disposers.length = 0;
      }

      resize();
      st.raf = window.requestAnimationFrame(loop);

      return {
        setScene: setScene,
        setOpts: setOpts,
        setFocus: setFocus,
        setPlaying: setPlaying,
        setSpeed: setSpeed,
        setReveal: setReveal,
        setAutoRotate: setAutoRotate,
        stepBy: stepBy,
        restart: restart,
        resetView: resetView,
        focusLayerAt: focusLayerAt,
        dispose: dispose,
        resize: resize,
      };
    }

    /* =====================================================================
     * 7. Panel CSS (host theme tokens only; the canvas is artwork)
     * ===================================================================*/

    const CSS = [
      '.c3-root{position:relative;display:flex;flex-direction:column;height:100%;min-height:320px;',
      'width:100%;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);',
      'font-size:12px;line-height:1.45;isolation:isolate}',

      '.c3-canvas{position:absolute;inset:0;display:block;width:100%;height:100%;cursor:grab;outline:none;',
      'touch-action:none}',
      '.c3-canvas:active{cursor:grabbing}',
      '.c3-canvas:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',

      '.c3-head{position:relative;z-index:3;display:flex;align-items:center;gap:10px;flex-wrap:wrap;',
      'padding:7px 12px;background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.c3-brand{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-brand-primary)}',
      '.c3-title{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.c3-sub{font-size:10.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;',
      'text-overflow:ellipsis;max-width:44vw}',
      '.c3-grow{flex:1 1 auto;min-width:8px}',

      '.c3-body{position:relative;z-index:2;flex:1 1 auto;display:flex;align-items:flex-start;',
      'justify-content:space-between;gap:8px;padding:8px;min-height:0;pointer-events:none}',
      '.c3-col{pointer-events:auto;display:flex;flex-direction:column;gap:8px;width:234px;max-height:100%;',
      'overflow-y:auto;overflow-x:hidden;padding-right:2px;scrollbar-width:thin}',
      '.c3-col::-webkit-scrollbar{width:6px}',
      '.c3-col::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:3px}',

      '.c3-card{flex:0 0 auto;display:flex;flex-direction:column;gap:6px;padding:8px 9px;border-radius:10px;',
      'background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);',
      'box-shadow:0 6px 18px rgba(0,0,0,.18)}',
      '.c3-cardhead{display:flex;align-items:center;justify-content:space-between;gap:6px}',
      '.c3-cardtitle{font-size:11.5px;font-weight:600;letter-spacing:.01em}',
      '.c3-cap{font-size:10px;color:var(--dsw-alias-label-secondary)}',
      '.c3-hint{font-size:10px;color:var(--dsw-alias-label-secondary);line-height:1.5}',

      '.c3-row{display:flex;align-items:center;gap:6px}',
      '.c3-rowwrap{display:flex;flex-wrap:wrap;gap:4px}',
      '.c3-field{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.c3-label{font-size:10px;color:var(--dsw-alias-label-secondary)}',

      '.c3-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:4px 8px;',
      'border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);',
      'color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}',
      '.c3-btn:hover{border-color:var(--dsw-alias-border-l2)}',
      '.c3-btn[data-active="true"]{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}',
      '.c3-btn:disabled{opacity:.45;cursor:default}',
      '.c3-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.c3-btnicon{width:26px;padding:4px 0}',

      '.c3-num{width:100%;min-width:0;padding:3px 5px;border-radius:5px;font:inherit;font-size:11px;',
      'border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);',
      'color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}',
      '.c3-select{width:100%;padding:4px 6px;border-radius:6px;font:inherit;font-size:11px;',
      'border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);',
      'color:var(--dsw-alias-label-primary)}',
      '.c3-grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}',

      '.c3-range{width:100%;height:14px;cursor:pointer;accent-color:var(--dsw-alias-brand-primary)}',
      '.c3-check{display:flex;align-items:center;gap:5px;font-size:10.5px;',
      'color:var(--dsw-alias-label-secondary);cursor:pointer;user-select:none}',
      '.c3-check input{accent-color:var(--dsw-alias-brand-primary);cursor:pointer;margin:0}',

      '.c3-layers{display:flex;flex-direction:column;gap:3px}',
      '.c3-layer{display:flex;flex-direction:column;gap:1px;padding:5px 7px;border-radius:7px;cursor:pointer;',
      'border:1px solid transparent;background:var(--dsw-alias-bg-layer-2);text-align:left;font:inherit;',
      'color:var(--dsw-alias-label-primary)}',
      '.c3-layer:hover{border-color:var(--dsw-alias-border-l2)}',
      '.c3-layer[data-active="true"]{border-color:var(--dsw-alias-brand-primary)}',
      '.c3-layer[data-focus="true"]{box-shadow:inset 2px 0 0 var(--dsw-alias-state-success-primary)}',
      '.c3-ltop{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;font-weight:600}',
      '.c3-lbot{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:9.5px;',
      'color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.c3-dot{width:7px;height:7px;border-radius:2px;flex:0 0 auto}',

      '.c3-kv{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:10.5px;',
      'padding:1px 0}',
      '.c3-kv-k{color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.c3-kv-v{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;text-align:right;',
      'overflow:hidden;text-overflow:ellipsis}',

      '.c3-bar{height:4px;border-radius:2px;overflow:hidden;background:var(--dsw-alias-bg-layer-2)}',
      '.c3-bar>i{display:block;height:100%;background:var(--dsw-alias-brand-primary)}',

      '.c3-map{position:relative;border-radius:4px;overflow:hidden;background:#060a12;',
      'outline:1px solid var(--dsw-alias-border-l1)}',
      '.c3-mapgrid{display:flex;flex-wrap:wrap;gap:6px}',
      '.c3-mapcell{display:flex;flex-direction:column;gap:2px;align-items:center}',
      '.c3-legend{display:flex;flex-direction:column;gap:3px}',
      '.c3-legrow{display:flex;align-items:center;gap:6px;font-size:10.5px;',
      'color:var(--dsw-alias-label-secondary)}',
      '.c3-swatch{width:10px;height:10px;border-radius:2px;flex:0 0 auto}',
      '.c3-scale{height:8px;border-radius:4px;',
      'background:linear-gradient(90deg,#060a12,#2c6a9d,#1ba0ae,#6bd267,#eed83c,#ff8650,#dd2f52)}',

      '.c3-foot{position:relative;z-index:3;display:flex;align-items:center;gap:10px;flex-wrap:wrap;',
      'padding:5px 12px;font-size:10px;color:var(--dsw-alias-label-secondary);',
      'background:var(--dsw-alias-bg-layer-1);border-top:1px solid var(--dsw-alias-border-l1)}',
      '.c3-foot b{color:var(--dsw-alias-label-primary);font-weight:600}',
      '.c3-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}',

      '.c3-tip{position:absolute;z-index:6;pointer-events:none;transform:translate(-50%,-148%);',
      'padding:3px 7px;border-radius:6px;font-size:10px;white-space:nowrap;',
      'background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);',
      'box-shadow:0 6px 16px rgba(0,0,0,.35);color:var(--dsw-alias-label-primary)}',
      '.c3-empty{font-size:10.5px;color:var(--dsw-alias-label-secondary);line-height:1.5}',

      '@media (max-width:940px){.c3-col{width:206px}.c3-sub{display:none}}',
      '@media (max-width:760px){.c3-body{flex-direction:column;overflow-y:auto}',
      '.c3-col{width:100%;max-height:none;overflow:visible}.c3-canvas{position:relative;height:46vh;inset:auto}}',
    ].join('');

    /* =====================================================================
     * 8. Components
     * ===================================================================*/

    function PanelIcon(props) {
      const size = (props && props.size) || 18;
      const active = !!(props && props.active);
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, focusable: 'false', 'aria-hidden': 'true',
        style: { display: 'block', opacity: active ? 1 : 0.86 },
      },
        h('path', { d: 'M3 7.6 8.4 5l5.2 2.6L8.4 10.2Z', fill: 'currentColor' }),
        h('path', { d: 'M8.4 10.2 13.6 7.6v3.6L8.4 13.8Z', fill: 'currentColor', fillOpacity: 0.55 }),
        h('path', { d: 'M9.6 13.4 15 10.8l5.4 2.7L15 16.2Z', fill: 'currentColor', fillOpacity: 0.78 }),
        h('path', { d: 'M15 16.2 20.4 13.5v3.4L15 19.6Z', fill: 'currentColor', fillOpacity: 0.4 }),
        h('path', { d: 'M4.6 17.4h5', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }));
    }

    function weightColor(v) {
      const a = clamp(Math.abs(v), 0, 1);
      if (v >= 0) return 'rgba(255,196,84,' + (0.1 + 0.9 * a).toFixed(3) + ')';
      return 'rgba(86,150,235,' + (0.1 + 0.9 * a).toFixed(3) + ')';
    }

    /** A small fixed-size heat grid: values 0..1 map through `colorFn`. */
    function MiniGrid(props) {
      const cols = Math.max(1, props.cols | 0);
      const rows = Math.max(1, props.rows | 0);
      const cell = props.cell || 12;
      const values = props.values || [];
      const colorFn = props.colorFn || colorFor;
      const nodes = [];
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const value = values[j * cols + i];
          nodes.push(h('i', {
            key: j * cols + i,
            style: {
              position: 'absolute',
              left: (i * cell).toFixed(2) + 'px',
              top: (j * cell).toFixed(2) + 'px',
              width: (cell + 0.5).toFixed(2) + 'px',
              height: (cell + 0.5).toFixed(2) + 'px',
              background: colorFn(value == null ? 0 : value),
            },
          }));
        }
      }
      return h('div', {
        className: 'c3-map',
        style: { width: (cols * cell) + 'px', height: (rows * cell) + 'px' },
      }, nodes);
    }

    function Field(label, node) {
      return h('div', { className: 'c3-field' },
        h('span', { className: 'c3-label' }, label), node);
    }

    function KV(key, value) {
      return h('div', { className: 'c3-kv', key: key },
        h('span', { className: 'c3-kv-k' }, key),
        h('span', { className: 'c3-kv-v' }, value));
    }

    /** One line describing a layer's geometry, used in the network list. */
    function layerDetail(spec) {
      if (!spec) return '';
      if (spec.type === 'flatten') return t('layer.vec', { n: spec.len });
      if (spec.type === 'dense') {
        return t('layer.vec', { n: spec.inLen }) + ' → ' + t('layer.vec', { n: spec.units });
      }
      return t('layer.kernel', { kh: spec.kh, kw: spec.kw }) + ' · ' +
        t('layer.stride', { sy: spec.sy, sx: spec.sx }) + ' · ' +
        t('layer.pad', { p: spec.pad });
    }

    /** The right-hand column of a layer row. */
    function layerTail(spec) {
      if (!spec) return '';
      if (spec.type === 'conv') return t('layer.out', { n: spec.out });
      if (spec.type === 'dense') return t('ed.units') + ' ' + spec.units;
      if (spec.type === 'pool') return t('pool.' + spec.mode);
      return '';
    }

    function Leg(color, text) {
      return h('div', { className: 'c3-legrow', key: text },
        h('span', { className: 'c3-swatch', style: { background: color } }),
        h('span', null, text));
    }

    function Check(label, value, onChange) {
      return h('label', { className: 'c3-check', key: label },
        h('input', {
          type: 'checkbox', checked: !!value,
          onChange: function (e) { onChange(e.target.checked); },
        }),
        label);
    }

    function NumInput(props) {
      return h('input', {
        className: 'c3-num', type: 'number',
        min: props.min, max: props.max, step: props.step || 1,
        value: props.value,
        onChange: function (e) {
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) props.onChange(clamp(n, props.min, props.max));
        },
      });
    }

    function RangeField(label, value, min, max, step, onChange) {
      return h('div', { className: 'c3-field' },
        h('div', { className: 'c3-row' },
          h('span', { className: 'c3-label', style: { flex: '1 1 auto' } }, label),
          h('span', { className: 'c3-cap c3-mono' }, Number(value).toFixed(step < 1 ? 1 : 0))),
        h('input', {
          className: 'c3-range', type: 'range',
          min: min, max: max, step: step, value: value,
          onChange: function (e) { onChange(parseFloat(e.target.value)); },
        }));
    }

    /* =====================================================================
     * 9. The panel
     * ===================================================================*/

    function LabPage() {
      const tick = useLocaleTick();
      const canvasRef = React.useRef(null);
      const apiRef = React.useRef(null);
      const layersRef = React.useRef([]);
      const liveRef = React.useRef({ focus: 1, count: 1 });

      const [presetId, setPresetId] = React.useState(PRESETS[0].id);
      const [inputSpec, setInputSpec] = React.useState({ size: 14, channels: 1, pattern: 'digit', seed: 3 });
      const [layers, setLayers] = React.useState(function () { return cloneLayers(DEFAULT_LAYERS); });
      const [selIdx, setSelIdx] = React.useState(0);
      const [focus, setFocus] = React.useState(1);
      const [playing, setPlaying] = React.useState(false);
      const [speed, setSpeed] = React.useState(16);
      const [reveal, setReveal] = React.useState(true);
      const [stepIdx, setStepIdx] = React.useState(0);
      const [hover, setHover] = React.useState(null);
      const [tipPos, setTipPos] = React.useState(null);
      const [selected, setSelected] = React.useState(null);
      const [disp, setDisp] = React.useState({
        labels: true, grid: true, window: true, ray: true, rotate: false, spacing: 1, channelGap: 1,
      });

      layersRef.current = layers;

      const model = React.useMemo(function () {
        return buildModel(inputSpec, layers);
      }, [inputSpec, layers, tick]);

      const scene = React.useMemo(function () {
        return buildScene(model, { spacing: disp.spacing, channelGap: disp.channelGap });
      }, [model, disp.spacing, disp.channelGap]);

      const stageCount = model.stages.length;
      const effFocus = clamp(focus, 1, Math.max(1, stageCount - 1));
      liveRef.current.focus = effFocus;
      liveRef.current.count = stageCount;

      /* ---------- renderer lifecycle ---------- */
      React.useEffect(function () {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const api = createRenderer(canvas, {
          onHover: function (hit, pos) {
            setHover(hit);
            setTipPos(hit && pos ? pos : null);
          },
          onSelect: function (hit) {
            setSelected(hit);
            if (hit && hit.layer > 0) {
              setSelIdx(clamp(hit.layer - 1, 0, Math.max(0, layersRef.current.length - 1)));
            }
          },
          onStep: function (i) { setStepIdx(i); },
          onAdvance: function () {
            const live = liveRef.current;
            if (live.focus < live.count - 1) {
              setFocus(live.focus + 1);
              return true;
            }
            return false;
          },
          onFinished: function () { setPlaying(false); },
          onPlaying: function (v) { setPlaying(v); },
          onTogglePlay: function () { setPlaying(function (p) { return !p; }); },
        });
        apiRef.current = api;
        return function () {
          api.dispose();
          apiRef.current = null;
        };
      }, []);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setScene(scene);
      }, [scene]);

      React.useEffect(function () {
        if (apiRef.current) {
          apiRef.current.setOpts({
            labels: disp.labels, grid: disp.grid, window: disp.window, ray: disp.ray,
          });
        }
      }, [disp.labels, disp.grid, disp.window, disp.ray]);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setFocus(effFocus);
      }, [effFocus, scene]);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setPlaying(playing);
      }, [playing]);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setSpeed(speed);
      }, [speed]);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setReveal(reveal);
      }, [reveal]);

      React.useEffect(function () {
        if (apiRef.current) apiRef.current.setAutoRotate(disp.rotate);
      }, [disp.rotate]);

      /* ---------- edits ---------- */
      function patchDisp(patch) {
        setDisp(function (d) { return Object.assign({}, d, patch); });
      }

      function patchInput(patch) {
        setInputSpec(function (s) { return Object.assign({}, s, patch); });
      }

      function updateLayer(index, patch) {
        setLayers(function (ls) {
          if (index < 0 || index >= ls.length) return ls;
          const next = ls.slice();
          next[index] = Object.assign({}, ls[index], patch);
          return next;
        });
      }

      function addLayer(kind) {
        if (layers.length >= MAX_LAYERS) return;
        let extra;
        if (kind === 'pool') extra = pool(2, 2, 'max');
        else if (kind === 'flatten') extra = flatten();
        else if (kind === 'dense') extra = dense(10);
        else extra = conv(3, 3, 1, 1, 4);
        const next = layers.concat([extra]);
        setLayers(next);
        setSelIdx(next.length - 1);
        setFocus(next.length);
        setPresetId('');
      }

      function removeLayer(index) {
        if (index < 0 || index >= layers.length) return;
        const next = layers.slice();
        next.splice(index, 1);
        setLayers(next);
        setSelIdx(clamp(index, 0, Math.max(0, next.length - 1)));
        setFocus(function (f) { return clamp(f > index + 1 ? f - 1 : f, 1, Math.max(1, next.length)); });
        setPresetId('');
      }

      function applyPreset(id) {
        const preset = PRESETS.filter(function (p) { return p.id === id; })[0];
        setPresetId(id);
        if (!preset) return;
        setLayers(cloneLayers(preset.layers));
        setSelIdx(0);
        setFocus(1);
        setPlaying(false);
      }

      function resetView() {
        if (apiRef.current) apiRef.current.resetView();
      }

      /* ---------- derived ---------- */
      const clampedSel = clamp(selIdx, 0, Math.max(0, layers.length - 1));
      const selStage = layers.length ? model.stages[clampedSel + 1] : null;
      const selRaw = layers.length ? layers[clampedSel] : null;
      const selSpec = selStage ? selStage.spec : null;
      const focusStage = model.stages[effFocus] || null;
      const srcStage = effFocus > 0 ? model.stages[effFocus - 1] : null;
      const total = focusStage
        ? (focusStage.live != null ? focusStage.live : focusStage.h * focusStage.w)
        : 0;
      const safeStep = clamp(stepIdx, 0, Math.max(0, total - 1));
      const progress = total ? (safeStep + 1) / total : 0;
      const curRow = focusStage ? Math.floor(safeStep / focusStage.w) + 1 : 0;
      const curCol = focusStage ? (safeStep % focusStage.w) + 1 : 0;

      /* ---------- header ---------- */
      const header = h('div', { className: 'c3-head' },
        h('div', { className: 'c3-brand' }, h(PanelIcon, { size: 18, active: true })),
        h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
          h('div', { className: 'c3-title' }, t('app.title')),
          h('div', { className: 'c3-sub' }, t('app.sub'))),
        h('div', { className: 'c3-grow' }),
        h('button', {
          type: 'button', className: 'c3-btn', title: t('hint.drag'), onClick: resetView,
        }, t('view.reset')));

      /* ---------- input card ---------- */
      const inputCard = h('div', { className: 'c3-card' },
        h('div', { className: 'c3-cardhead' },
          h('div', { className: 'c3-cardtitle' }, t('input.title')),
          h('span', { className: 'c3-cap' }, inputSpec.size + '×' + inputSpec.size + '×' + inputSpec.channels)),
        h('div', { className: 'c3-grid2' },
          Field(t('input.size'), h(NumInput, {
            value: inputSpec.size, min: 6, max: 28,
            onChange: function (v) { patchInput({ size: Math.round(v) }); },
          })),
          Field(t('input.channels'), h(NumInput, {
            value: inputSpec.channels, min: 1, max: 6,
            onChange: function (v) { patchInput({ channels: Math.round(v) }); },
          }))),
        Field(t('input.pattern'), h('select', {
          className: 'c3-select', value: inputSpec.pattern,
          onChange: function (e) { patchInput({ pattern: e.target.value }); },
        }, PATTERNS.map(function (p) {
          return h('option', { key: p, value: p }, t('pattern.' + p));
        }))),
        h('div', { className: 'c3-row' },
          h('button', {
            type: 'button', className: 'c3-btn',
            onClick: function () {
              patchInput({ seed: (inputSpec.seed % 9) + 1 });
              setPlaying(false);
            },
          }, t('input.shuffle')),
          h('span', { className: 'c3-cap' }, t('input.shown', {
            c: inputSpec.channels, s: inputSpec.size,
          }))));

      /* ---------- network card ---------- */
      const netCard = h('div', { className: 'c3-card' },
        h('div', { className: 'c3-cardhead' },
          h('div', { className: 'c3-cardtitle' }, t('net.title')),
          h('div', { className: 'c3-rowwrap' },
            h('button', {
              type: 'button', className: 'c3-btn', onClick: function () { addLayer('conv'); },
            }, t('net.addConv')),
            h('button', {
              type: 'button', className: 'c3-btn', onClick: function () { addLayer('pool'); },
            }, t('net.addPool')),
            h('button', {
              type: 'button', className: 'c3-btn', onClick: function () { addLayer('flatten'); },
            }, t('net.addFlatten')),
            h('button', {
              type: 'button', className: 'c3-btn', onClick: function () { addLayer('dense'); },
            }, t('net.addDense')))),
        Field(t('net.preset'), h('select', {
          className: 'c3-select', value: presetId,
          onChange: function (e) { applyPreset(e.target.value); },
        }, [h('option', { key: 'custom', value: '' }, t('ed.custom'))].concat(
          PRESETS.map(function (p) {
            return h('option', { key: p.id, value: p.id }, t('preset.' + p.id));
          })))),
        h('div', { className: 'c3-layers' }, model.stages.map(function (st) {
          if (st.index === 0) {
            return h('div', {
              key: 'input',
              className: 'c3-layer',
              style: { cursor: 'default' },
            },
              h('div', { className: 'c3-ltop' },
                h('span', { className: 'c3-dot', style: { background: kindColor('input') } }),
                h('span', { style: { flex: '1 1 auto' } }, t('layer.input')),
                h('span', { className: 'c3-cap' }, st.shape)),
              h('div', { className: 'c3-lbot' },
                h('span', null, t('pattern.' + inputSpec.pattern)),
                h('span', null, t('badge.input'))));
          }
          const li = st.index - 1;
          const spec = st.spec;
          return h('button', {
            key: 'l' + li,
            type: 'button',
            className: 'c3-layer',
            'data-active': li === clampedSel ? 'true' : 'false',
            'data-focus': st.index === effFocus ? 'true' : 'false',
            onClick: function () { setSelIdx(li); setFocus(st.index); },
          },
            h('div', { className: 'c3-ltop' },
              h('span', { className: 'c3-dot', style: { background: kindColor(st.kind) } }),
              h('span', { style: { flex: '1 1 auto' } }, st.label),
              h('span', { className: 'c3-cap' }, st.shape)),
            h('div', { className: 'c3-lbot' },
              h('span', null, layerDetail(spec)),
              h('span', null, layerTail(spec))));
        })),
        h('div', { className: 'c3-hint' }, t('net.hint')));

      /* ---------- editor card ---------- */
      let editorBody;
      if (!selStage || !selRaw || !selSpec) {
        editorBody = h('div', { className: 'c3-empty' }, t('ed.empty'));
      } else if (selSpec.type === 'flatten' || selSpec.type === 'dense') {
        const isDense = selSpec.type === 'dense';
        editorBody = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          isDense
            ? h('div', { className: 'c3-grid2' },
              Field(t('ed.units'), h(NumInput, {
                value: selRaw.units, min: 1, max: MAX_UNITS,
                onChange: function (v) { updateLayer(clampedSel, { units: Math.round(v) }); },
              })),
              Field(t('ed.act'), h('select', {
                className: 'c3-select', value: selSpec.act,
                onChange: function (e) { updateLayer(clampedSel, { act: e.target.value }); },
              }, ['linear', 'relu', 'tanh', 'sigmoid'].map(function (a) {
                return h('option', { key: a, value: a }, t('act.' + a));
              }))))
            : null,
          h('div', { className: 'c3-hint' }, isDense
            ? t('ed.denseIn', { n: selSpec.inLen, u: selSpec.units })
            : t('ed.flattenNote', {
              c: selSpec.inC, h: selSpec.inH, w: selSpec.inW, n: selSpec.len,
            })),
          h('div', { className: 'c3-kv' },
            h('span', { className: 'c3-kv-k' }, t('ed.computed', {
              in: model.stages[clampedSel].shape, out: selStage.shape,
            })),
            h('span', { className: 'c3-kv-v c3-mono' }, selSpec.oh + '×' + selSpec.ow)),
          h('div', { className: 'c3-row' },
            h('button', {
              type: 'button', className: 'c3-btn',
              onClick: function () { removeLayer(clampedSel); },
            }, t('ed.delete'))));
      } else {
        editorBody = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          h('div', { className: 'c3-rowwrap' }, KERNEL_PRESETS.map(function (k) {
            const active = selSpec.kh === k[0] && selSpec.kw === k[1];
            return h('button', {
              key: k[0] + 'x' + k[1],
              type: 'button',
              className: 'c3-btn',
              'data-active': active ? 'true' : 'false',
              onClick: function () { updateLayer(clampedSel, { kh: k[0], kw: k[1] }); },
            }, k[0] + '×' + k[1]);
          })),
          h('div', { className: 'c3-grid2' },
            Field(t('ed.kh'), h(NumInput, {
              value: selRaw.kh, min: 1, max: 12,
              onChange: function (v) { updateLayer(clampedSel, { kh: Math.round(v) }); },
            })),
            Field(t('ed.kw'), h(NumInput, {
              value: selRaw.kw, min: 1, max: 12,
              onChange: function (v) { updateLayer(clampedSel, { kw: Math.round(v) }); },
            }))),
          h('div', { className: 'c3-grid2' },
            Field(t('ed.sy'), h(NumInput, {
              value: selRaw.sy, min: 1, max: 6,
              onChange: function (v) { updateLayer(clampedSel, { sy: Math.round(v) }); },
            })),
            Field(t('ed.sx'), h(NumInput, {
              value: selRaw.sx, min: 1, max: 6,
              onChange: function (v) { updateLayer(clampedSel, { sx: Math.round(v) }); },
            }))),
          h('div', { className: 'c3-grid2' },
            Field(t('ed.pad'), h(NumInput, {
              value: selRaw.pad, min: 0, max: 10,
              onChange: function (v) { updateLayer(clampedSel, { pad: Math.round(v) }); },
            })),
            selSpec.type === 'conv'
              ? Field(t('ed.out'), h(NumInput, {
                value: selRaw.out, min: 1, max: MAX_OUT_CHANNELS,
                onChange: function (v) { updateLayer(clampedSel, { out: Math.round(v) }); },
              }))
              : Field(t('ed.mode'), h('select', {
                className: 'c3-select', value: selSpec.mode,
                onChange: function (e) { updateLayer(clampedSel, { mode: e.target.value }); },
              },
                h('option', { value: 'max' }, t('pool.max')),
                h('option', { value: 'avg' }, t('pool.avg'))))),
          selSpec.type === 'conv'
            ? Field(t('ed.act'), h('select', {
              className: 'c3-select', value: selSpec.act,
              onChange: function (e) { updateLayer(clampedSel, { act: e.target.value }); },
            }, ['relu', 'tanh', 'linear', 'sigmoid'].map(function (a) {
              return h('option', { key: a, value: a }, t('act.' + a));
            })))
            : null,
          h('div', { className: 'c3-kv' },
            h('span', { className: 'c3-kv-k' }, t('ed.computed', {
              in: model.stages[clampedSel].shape, out: selStage.shape,
            })),
            h('span', { className: 'c3-kv-v c3-mono' }, selSpec.oh + '×' + selSpec.ow)),
          h('div', { className: 'c3-cap c3-mono' }, t('ed.formula')),
          selSpec.pad > 0 ? h('div', { className: 'c3-hint' }, t('ed.padFrame', { p: selSpec.pad })) : null,
          h('div', { className: 'c3-row' },
            h('button', {
              type: 'button', className: 'c3-btn',
              onClick: function () { removeLayer(clampedSel); },
            }, t('ed.delete'))));
      }

      const editorCard = h('div', { className: 'c3-card' },
        h('div', { className: 'c3-cardhead' },
          h('div', { className: 'c3-cardtitle' }, t('ed.title')),
          selStage ? h('span', { className: 'c3-cap c3-mono' }, selStage.shape) : null),
        editorBody);

      /* ---------- scan card ---------- */
      const scanCard = h('div', { className: 'c3-card' },
        h('div', { className: 'c3-cardhead' },
          h('div', { className: 'c3-cardtitle' }, t('scan.title')),
          h('span', { className: 'c3-cap c3-mono' }, total
            ? t('scan.progress', { i: Math.min(safeStep + 1, total), n: total })
            : '-')),
        stageCount > 1 ? Field(t('scan.layer'), h('select', {
          className: 'c3-select', value: String(effFocus),
          onChange: function (e) { setFocus(parseInt(e.target.value, 10) || 1); },
        }, model.stages.slice(1).map(function (st) {
          return h('option', { key: st.index, value: String(st.index) }, st.label + ' · ' + st.shape);
        }))) : null,
        h('div', { className: 'c3-row' },
          h('button', {
            type: 'button', className: 'c3-btn',
            'data-active': playing ? 'true' : 'false',
            onClick: function () { setPlaying(function (p) { return !p; }); },
          }, playing ? t('scan.pause') : t('scan.play')),
          h('button', {
            type: 'button', className: 'c3-btn c3-btnicon', title: t('scan.prev'),
            onClick: function () { if (apiRef.current) apiRef.current.stepBy(-1); },
          }, '‹'),
          h('button', {
            type: 'button', className: 'c3-btn c3-btnicon', title: t('scan.next'),
            onClick: function () { if (apiRef.current) apiRef.current.stepBy(1); },
          }, '›'),
          h('button', {
            type: 'button', className: 'c3-btn',
            onClick: function () { if (apiRef.current) apiRef.current.restart(); },
          }, t('scan.restart'))),
        h('div', { className: 'c3-bar' }, h('i', { style: { width: (progress * 100).toFixed(1) + '%' } })),
        RangeField(t('scan.speed'), speed, 2, 90, 1, function (v) { setSpeed(v); }),
        Check(t('scan.reveal'), reveal, function (v) { setReveal(v); }),
        h('div', { className: 'c3-hint' },
          focusStage && srcStage && total
            ? t('scan.window', { name: srcStage.label }) + ' · ' +
              (focusStage.live != null
                ? t('scan.outindex', { name: focusStage.label, i: safeStep + 1 })
                : t('scan.outcell', { name: focusStage.label, r: curRow, c: curCol }))
            : t('scan.idle')),
        h('div', { className: 'c3-cap' },
          !playing && total && safeStep >= total - 1 ? t('scan.done') : t('hint.keys')));

      /* ---------- inspector card ---------- */
      const target = hover || selected;
      const tStage = target ? model.stages[target.layer] : null;
      let inspBody;
      if (!target || !tStage) {
        inspBody = h('div', { className: 'c3-empty' }, t('insp.empty'));
      } else {
        const isVec = tStage.live != null;
        const chIdx = Math.min(target.channel, tStage.maps.length - 1);
        const map = tStage.maps[chIdx];
        const cellIdx = target.row * tStage.w + target.col;
        const rawValue = map ? map[cellIdx] : NaN;
        const spec = tStage.spec;
        let kernelVals = null;
        let windowVals = null;
        let gridCols = 1;
        let gridRows = 1;
        let receptive = null;
        let opText = t('insp.op.input');
        if (spec && target.layer > 0) {
          const prev = model.stages[target.layer - 1];
          const win = sourceWindowFor(tStage, prev, target.row, target.col);
          const pn0 = prev.norm.min;
          const pspan = (prev.norm.max - prev.norm.min) || 1;
          if (spec.type === 'dense') {
            receptive = t('insp.readsAll', { n: spec.inLen });
          } else if (win) {
            receptive = t('insp.window', {
              kh: win.kh, kw: win.kw, r: win.row + 1, c: win.col + 1,
            });
          }
          if (win && spec.type !== 'dense') {
            const winCh = win.channel == null ? 0 : Math.min(win.channel, prev.c - 1);
            const vals = [];
            for (let ky = 0; ky < win.kh; ky += 1) {
              for (let kx = 0; kx < win.kw; kx += 1) {
                const iy = win.row + ky, ix = win.col + kx;
                const inside = iy >= 0 && iy < prev.h && ix >= 0 && ix < prev.w;
                vals.push(inside ? (prev.maps[winCh][iy * prev.w + ix] - pn0) / pspan : 0);
              }
            }
            windowVals = vals;
            gridCols = win.kw;
            gridRows = win.kh;
          }
          if (spec.type === 'conv' && tStage.bank && tStage.bank[chIdx]) {
            const filter = tStage.bank[chIdx][0];
            let mx = 0;
            for (let k = 0; k < filter.length; k += 1) mx = Math.max(mx, Math.abs(filter[k]));
            const norm = [];
            for (let k = 0; k < filter.length; k += 1) norm.push(mx > 1e-9 ? filter[k] / mx : 0);
            kernelVals = norm;
            opText = t('insp.op.conv', { act: t('act.' + spec.act) });
          } else if (spec.type === 'dense') {
            const rowW = tStage.bank && tStage.bank[chIdx] ? tStage.bank[chIdx].w : null;
            if (rowW) {
              const cells = prev.h * prev.w;
              let mx = 0;
              for (let k = 0; k < Math.min(cells, rowW.length); k += 1) {
                mx = Math.max(mx, Math.abs(rowW[k]));
              }
              const norm = [];
              for (let k = 0; k < cells; k += 1) {
                norm.push(k < rowW.length && mx > 1e-9 ? rowW[k] / mx : 0);
              }
              kernelVals = norm;
              gridCols = prev.w;
              gridRows = prev.h;
            }
            opText = t('insp.op.dense', { act: t('act.' + spec.act) });
          } else if (spec.type === 'flatten') {
            opText = t('insp.op.flatten');
          } else {
            opText = t('insp.op.pool', { mode: t('pool.' + spec.mode) });
          }
        }
        inspBody = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px' } },
          KV(t('insp.layer'), tStage.label + ' · ' + tStage.shape),
          isVec ? null : KV(t('insp.channel'), (chIdx + 1) + ' / ' + tStage.c),
          isVec
            ? KV(t('insp.index'), (cellIdx + 1) + ' / ' + tStage.live)
            : KV(t('insp.cell'), (target.row + 1) + ', ' + (target.col + 1)),
          KV(t('insp.value'), fmtNum(rawValue)),
          receptive ? KV(t('insp.receptive'), receptive) : null,
          KV(t('insp.op'), opText),
          spec && (windowVals || kernelVals) ? h('div', { className: 'c3-mapgrid' },
            windowVals ? h('div', { className: 'c3-mapcell' },
              h('span', { className: 'c3-cap' }, t('insp.inwin')),
              h(MiniGrid, {
                cols: gridCols, rows: gridRows, values: windowVals, cell: 9,
              })) : null,
            kernelVals ? h('div', { className: 'c3-mapcell' },
              h('span', { className: 'c3-cap' }, t('insp.weights')),
              h(MiniGrid, {
                cols: gridCols, rows: gridRows, values: kernelVals,
                colorFn: weightColor, cell: gridCols > 8 ? 6 : 9,
              })) : null) : null);
      }

      const inspCard = h('div', { className: 'c3-card' },
        h('div', { className: 'c3-cardhead' },
          h('div', { className: 'c3-cardtitle' }, t('insp.title'))),
        inspBody);

      /* ---------- display card ---------- */
      const dispCard = h('div', { className: 'c3-card' },
        h('div', { className: 'c3-cardhead' },
          h('div', { className: 'c3-cardtitle' }, t('disp.title')),
          h('span', { className: 'c3-cap' }, t('hint.drag'))),
        h('div', { className: 'c3-rowwrap' },
          Check(t('disp.labels'), disp.labels, function (v) { patchDisp({ labels: v }); }),
          Check(t('disp.grid'), disp.grid, function (v) { patchDisp({ grid: v }); }),
          Check(t('disp.window'), disp.window, function (v) { patchDisp({ window: v }); }),
          Check(t('disp.ray'), disp.ray, function (v) { patchDisp({ ray: v }); }),
          Check(t('disp.rotate'), disp.rotate, function (v) { patchDisp({ rotate: v }); })),
        RangeField(t('disp.spacing'), disp.spacing, 0.4, 2.6, 0.1, function (v) { patchDisp({ spacing: v }); }),
        RangeField(t('disp.channelGap'), disp.channelGap, 0.4, 2.4, 0.1, function (v) { patchDisp({ channelGap: v }); }),
        h('button', { type: 'button', className: 'c3-btn', onClick: resetView }, t('view.reset')));

      /* ---------- legend card ---------- */
      const legendCard = h('div', { className: 'c3-card' },
        h('div', { className: 'c3-cardhead' },
          h('div', { className: 'c3-cardtitle' }, t('legend.title'))),
        h('div', { className: 'c3-legend' },
          Leg('#7fd0ff', t('legend.input')),
          Leg('#8fe3c6', t('legend.conv')),
          Leg('#ffd166', t('legend.pool')),
          Leg('#b39dff', t('legend.flatten')),
          Leg('#ff8fb8', t('legend.dense')),
          Leg('rgba(255,209,102,0.35)', t('legend.window')),
          Leg('#ffffff', t('legend.ray'))),
        h('div', { className: 'c3-scale' }),
        h('div', { className: 'c3-cap' }, t('legend.scale')));

      /* ---------- foot ---------- */
      const foot = h('div', { className: 'c3-foot' },
        h('span', null, h('b', null, t('stat.chain')), ' ', h('span', { className: 'c3-mono' }, model.chain)),
        h('span', null, h('b', null, t('stat.params')), ' ', fmtCount(model.params)),
        h('span', null, h('b', null, t('stat.layers')), ' ', String(model.depth)),
        h('span', null, h('b', null, t('stat.rf')), ' ', model.rf + '×' + model.rf),
        h('span', { className: 'c3-grow' }));

      /* ---------- tooltip ---------- */
      let tip = null;
      if (hover && tipPos) {
        const hl = model.stages[hover.layer];
        const hv = hl && hl.maps[Math.min(hover.channel, hl.maps.length - 1)]
          ? hl.maps[Math.min(hover.channel, hl.maps.length - 1)][hover.row * hl.w + hover.col]
          : NaN;
        tip = h('div', {
          className: 'c3-tip',
          style: { left: tipPos.x + 'px', top: tipPos.y + 'px' },
        }, (hl ? hl.label : '') + ' · ' + (hover.channel + 1) + '/' + (hl ? hl.c : 0) +
          ' · (' + (hover.row + 1) + ',' + (hover.col + 1) + ') · ' + fmtNum(hv));
      }

      return h('div', { className: 'c3-root' },
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h('canvas', {
          className: 'c3-canvas', ref: canvasRef, tabIndex: 0,
          role: 'img', 'aria-label': t('a11y.canvas'),
        }),
        header,
        h('div', { className: 'c3-body' },
          h('div', { className: 'c3-col' }, inputCard, netCard, editorCard),
          h('div', { className: 'c3-col' }, scanCard, inspCard, dispCard, legendCard)),
        foot,
        tip);
    }

    /* =====================================================================
     * 10. Plugin wiring
     * ===================================================================*/

    /**
     * Run `fn` as an owned effect when the context offers one, so unmounting or
     * collapsing the slot disposes the registrations; otherwise run it once.
     */
    function effectOrRun(ctx, fn, label) {
      let ran = false;
      if (ctx && typeof ctx.effect === 'function') {
        try {
          ctx.effect(function () { ran = true; return fn(); }, label);
          return;
        } catch (e) {
          if (ran) return;
        }
      }
      try { fn(); } catch (e) { /* without its slot the panel simply never mounts */ }
    }

    function apply(ctx) {
      hostCtx = ctx;

      const loc = (ctx && typeof ctx.get === 'function') ? ctx.get('locale') : null;
      if (loc) {
        localeFace = loc;
        effectOrRun(ctx, function () {
          const disposers = [];
          try {
            if (typeof loc.register === 'function') disposers.push(loc.register(NS, 'en', DICT_EN));
          } catch (e) { /* the namespace may already be registered */ }
          try {
            if (typeof loc.register === 'function') disposers.push(loc.register(NS, 'zh', DICT_ZH));
          } catch (e) { /* the namespace may already be registered */ }
          try {
            if (typeof loc.bind === 'function') boundTranslate = loc.bind(NS);
          } catch (e) { boundTranslate = null; }
          return function () {
            for (let i = 0; i < disposers.length; i += 1) {
              try { disposers[i](); } catch (e) { /* already disposed */ }
            }
            boundTranslate = null;
          };
        }, 'conv3d:locale');
      }

      const slots = (ctx && typeof ctx.get === 'function') ? ctx.get('slots') : null;
      if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') return;

      effectOrRun(ctx, function () {
        return slots.inject('sidebar.panellist', function () {
          return slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 40,
            label: function () { return t('app.title'); },
          }, PanelIcon);
        });
      }, 'conv3d:panellist');

      effectOrRun(ctx, function () {
        return slots.inject('main', function () {
          return slots.register({ name: 'main', key: PANEL_ID }, LabPage);
        });
      }, 'conv3d:main');
    }

    return {
      inject: ['slots'],
      apply: apply,
      __internals: {
        NS: NS,
        PANEL_ID: PANEL_ID,
        DICT_EN: DICT_EN,
        DICT_ZH: DICT_ZH,
        PALETTE: PALETTE,
        PATTERNS: PATTERNS,
        PRESETS: PRESETS,
        DEFAULT_LAYERS: DEFAULT_LAYERS,
        KERNEL_PRESETS: KERNEL_PRESETS,
        makeInput: makeInput,
        buildModel: buildModel,
        buildScene: buildScene,
        normalizeLayer: normalizeLayer,
        kernelBank: kernelBank,
        applyConv: applyConv,
        applyPool: applyPool,
        sourceWindow: sourceWindow,
        palIndex: palIndex,
        fmtCount: fmtCount,
        cloneLayers: cloneLayers,
        createRenderer: createRenderer,
        LabPage: LabPage,
        conv: conv,
        pool: pool,
        flatten: flatten,
        dense: dense,
        sourceWindowFor: sourceWindowFor,
        flatValue: flatValue,
        vecGrid: vecGrid,
      },
    };
  },
});
