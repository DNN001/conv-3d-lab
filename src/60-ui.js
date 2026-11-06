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
