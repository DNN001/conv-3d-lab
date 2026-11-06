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
