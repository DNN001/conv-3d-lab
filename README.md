# Conv 3D Lab

A Harness Web UI panel that lays an input matrix and its convolution / pooling
layers out in an interactive 3D scene and animates the kernel scanning the
input, cell by cell, while the next feature map is being written.

Installed in the `desktop` profile as `@local/conv-3d-lab`, ordered after
`Transformer 3D Lab` and `Neural Network 3D Lab` in the sidebar panel rail.

- Host half — `index.js` — is empty: everything runs in the browser.
- Client half — `client.js` — registers itself with
  `window.__ModuleLoader__` and claims two slots: `sidebar.panellist` (the icon)
  and `main` (the keyed panel `conv-3d-lab`).
- `client.js` is assembled from `src/*.js` by `node build.mjs`; edit the parts,
  never the artifact.

## What it shows

Everything on screen is a number the panel computed — there is no decorative
heat map.

- **Input matrix** — spatial size 6…28 and 1…6 channels, each channel a plane in
  the 3D stack. Six samples (digit strokes, rings, gradient, checkerboard,
  noise, waves) are generated in the browser; `New sample` cycles them.
- **Layers** — convolution (presets 3×3, 5×7, 11×11, or any kernel up to 12×12),
  pooling (max / average), **flatten** and **linear** (dense). Convolution and
  pooling take their own stride (`Sx`, `Sy`), padding, activation (ReLU / tanh /
  sigmoid / linear) and, for convolution, output channel count. A flatten layer
  turns the last feature-map stack into a 1-D vector in channel → row → column
  order, and a linear layer maps that vector to **any width you type in**
  (1…64 units) with its own activation. Up to 8 layers, editable live;
  parameters that cannot fit the current map are clamped so the network never
  collapses.
- **Vector layers in 3D** — a flatten or linear output is drawn as a compact
  block of cells at the end of the flow axis (violet for flatten, pink for
  linear), sized independently of the spatial maps so the tail of the network
  stays readable. Scanning one of them walks the vector: a flatten cell shows
  the single source cell it copies (in the matching channel plane), and a linear
  unit lights up the whole previous vector, the one it reads.
- **Real arithmetic** — a deterministic, structured filter bank (vertical edge,
  horizontal edge, centre-surround blob, diagonal, sharpen, wave, then
  pseudo-random tail) is normalised so a flat input maps to ≈0.5; channels mix
  with alternating signs. Convolution, padding, stride, pooling and activation
  are computed exactly, and feature maps are coloured from their own value
  range.
- **The scan** — the kernel window glides over the input plane in row-major
  order, following the layer's stride, and may step outside the plane where
  padding applies (a dashed frame marks the padded extent). The window
  highlights the cell it currently writes on every output plane of the next
  layer, and a dashed ray connects window to cell. `Reveal cell by cell` leaves
  the not-yet-computed cells dark, so the feature map visibly grows out of the
  scan.
- **Inspector** — hovering or clicking a cell reads back its layer, channel,
  index and value, the exact source window it came from (padding included), the
  operation, and two small grids: the window's input values and the kernel
  weights that produced it (amber = positive, blue = negative).
- **Interaction** — drag orbits, right-drag (or Shift-drag) pans, wheel zooms,
  double-click flies to a layer, `Space` plays/pauses, `←`/`→` step one cell,
  `R` resets the view. Playback advances to the next layer when a scan finishes.
- **Display** — layer labels, cell grid, scan window, projection ray, auto
  rotate, layer spacing and channel spacing are all switchable.

## Code map

| Part | Contents |
|---|---|
| 0 | Locale dictionaries (en / zh) and `t()` |
| 1 | Number and colour helpers, value ramp |
| 2 | Input samples (seven-segment digits, rings, gradient, checker, noise, waves) |
| 3 | Shape arithmetic (`normalizeLayer`), filter bank, convolution, pooling, flatten, dense, activation |
| 4 | Presets |
| 5 | Scene layout (`buildScene`): flow axis, channel stacking, aspect-correct planes |
| 6 | Renderer (`createRenderer`): perspective projection, painter sorting, batched cell painting, picking, scan overlay, labels, camera |
| 7 | Panel CSS (host theme tokens only; the canvas is artwork) |
| 8-9 | React components and the panel |
| 10 | Locale + slot registration |

Rendering is plain Canvas 2D: cells are projected by hand and painted in one
path per colour bucket per plane, so a 20×20×6 input plus four layers still
paints at 60 fps without WebGL or any third-party library.

## Development checks

```
node build.mjs                      # src/*.js → client.js
node --check client.js
node test/conv-lab.test.mjs         # shape arithmetic, filters, geometry, locale coverage
node test/render-smoke.test.mjs     # renderer + panel execute outside the browser
node test/bundle-check.mjs          # manifest, patch, locales, icon, artifact
```

`conv-lab.test.mjs` recomputes every expected map size from
`⌊(in + 2·pad − kernel) / stride⌋ + 1`, checks the filter bank normalisation and
determinism, verifies padding contributes zeros and pooling picks max/mean,
asserts the scene is monotonic along the flow axis, and proves every translation
key the panel reads exists in both dictionaries.

`render-smoke.test.mjs` drives the real renderer with a recording 2D-context
stub (projection, plane painting, picking, the scan cursor, auto-advance) and
renders the whole panel tree with a React stub, asserting that no raw
translation key reaches the UI. It does not demonstrate what the page looks
like.

## Verification status

- Syntax, manifest, patch, locale resources, icon bytes and all three test
  suites: passing (including flatten ordering, dense widths/parameter counts,
  and the flatten/dense scan walking their own vectors).
- Live Client registration: `sidebar.panellist` and `main` both show the
  `conv-3d-lab` entry as active in the running page.
- Rendered appearance in light/dark themes has **not** been verified: this
  session has no browser control.
