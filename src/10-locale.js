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
