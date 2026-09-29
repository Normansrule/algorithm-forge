/* =====================================================================
   Algorithm Forge — small helpers shared by the Chapter 1–2 simulations
   (euclid-gcd, growth-rates, recurrence-lab, empirical-lab, hanoi, fibonacci).
   The main kit (forge-kit.js) has no line/scatter chart and no "predict"
   widget, so they live here. Everything uses the design-system CSS variables.

   F12.fmt(v)                 -> readable number (commas, or a × 10^k)
   F12.sup(k)                 -> superscript digits for exponents
   F12.dur(seconds)           -> "3.2 µs", "11.6 days", "3 × 10^9 years"
   F12.plot(svg, opts)        -> axes + grid + lines/dots + direct labels + hover tooltip
   F12.predict(host, opts)    -> "🤔 Predict" card (buttons or number box, then reveal)
   ===================================================================== */
(function () {
  "use strict";
  const F12 = {};
  const S = (t, a, ...k) => Forge.svg(t, a, ...k);

  const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", ".": "·" };
  F12.sup = (k) => String(k).split("").map((c) => SUP[c] || c).join("");

  /** Readable number: 1,234,567 · 0.25 · 3.04 × 10¹⁸. Accepts BigInt too. */
  F12.fmt = function (v, digits) {
    digits = digits == null ? 3 : digits;
    if (typeof v === "bigint") {
      const s = v.toString();
      if (s.length <= 16) return BigInt(s).toLocaleString("en-US");
      return `${s[0]}.${s.slice(1, 4)} × 10${F12.sup(s.length - 1)}`;
    }
    if (v == null || Number.isNaN(v)) return "—";
    if (!Number.isFinite(v)) return v > 0 ? "∞" : "−∞";
    const a = Math.abs(v);
    if (a === 0) return "0";
    if (a < 1e-3 || a >= 1e15) {
      const e = Math.floor(Math.log10(a));
      const m = v / Math.pow(10, e);
      return `${m.toFixed(Math.max(0, digits - 1)).replace(/\.?0+$/, "")} × 10${F12.sup(e)}`;
    }
    if (Number.isInteger(v)) return v.toLocaleString("en-US");
    if (a >= 1000) return Math.round(v).toLocaleString("en-US");
    return (+v.toPrecision(digits + 1)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  /** Compact axis label: 2.5M, 300k, 1.2B. */
  F12.compact = function (v) {
    const a = Math.abs(v);
    if (a >= 1e15 || (a > 0 && a < 1e-3)) return F12.fmt(v, 2);
    if (a >= 1e12) return +(v / 1e12).toPrecision(3) + "T";
    if (a >= 1e9) return +(v / 1e9).toPrecision(3) + "B";
    if (a >= 1e6) return +(v / 1e6).toPrecision(3) + "M";
    if (a >= 1e4) return +(v / 1e3).toPrecision(3) + "k";
    return F12.fmt(v);
  };
  /** Format a number known only by its base-10 logarithm (for n!, 2^n at huge n). */
  F12.fmtLog10 = function (L) {
    if (!Number.isFinite(L)) return L > 0 ? "∞" : "0";
    if (L < 15) return F12.fmt(Math.pow(10, L));
    const e = Math.floor(L), m = Math.pow(10, L - e);
    return `${m.toFixed(2)} × 10${F12.sup(e)}`;
  };

  /** Human duration from seconds (log10 input allowed via dur.log). */
  F12.durLog10 = function (L) {
    // L = log10(seconds)
    if (L === -Infinity) return "0 s";
    const s = Math.pow(10, L);
    const p2 = (v) => (+v.toPrecision(2)).toLocaleString("en-US");
    if (L < -6) return p2(s * 1e9) + " ns";
    if (L < -3) return p2(s * 1e6) + " µs";
    if (L < 0) return p2(s * 1e3) + " ms";
    if (s < 60) return p2(s) + " s";
    if (s < 3600) return p2(s / 60) + " min";
    if (s < 86400) return p2(s / 3600) + " hours";
    if (s < 3.156e7) return p2(s / 86400) + " days";
    const yL = L - Math.log10(3.156e7);
    if (yL < 6) return p2(Math.pow(10, yL)) + " years";
    const e = Math.floor(yL);
    return `${Math.pow(10, yL - e).toFixed(1)} × 10${F12.sup(e)} years`;
  };
  F12.dur = (sec) => F12.durLog10(sec <= 0 ? -Infinity : Math.log10(sec));

  /* ------------------------------------------------------------------
     Plot. opts = {
       W, H, m: {l, r, t, b},
       x: {min, max, log, label, fmt, ticks: [..]},
       y: {min, max, log, label, fmt, ticks: [..]},
       series: [{name, color, pts: [[x, y], ...], type: "line"|"dots", dash, width, r, endLabel}],
       hlines: [{y, color, dash, label}],
       hover: true, note: "text top-left"
     }
     ------------------------------------------------------------------ */
  let clipSeq = 0;
  function niceStep(span, count) {
    const raw = span / count, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }
  function linTicks(min, max, count) {
    if (max <= min) return [min];
    const st = niceStep(max - min, count || 5), out = [];
    for (let v = Math.ceil(min / st) * st; v <= max + st * 1e-9; v += st) out.push(+v.toPrecision(12));
    return out;
  }
  function logTicks(lmin, lmax) {
    const lo = Math.ceil(lmin - 1e-9), hi = Math.floor(lmax + 1e-9), span = hi - lo;
    const every = span <= 8 ? 1 : Math.ceil(span / 7);
    const out = [];
    for (let e = lo; e <= hi; e++) if ((e - lo) % every === 0) out.push(e);
    return out; // exponents
  }
  F12.plot = function (svg, o) {
    const W = o.W || 760, H = o.H || 380, m = Object.assign({ l: 64, r: 20, t: 16, b: 46 }, o.m || {});
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const X = o.x, Y = o.y;
    const tx = (v) => (X.log ? Math.log10(v) : v), ty = (v) => (Y.log ? Math.log10(v) : v);
    const x0 = X.log ? Math.log10(X.min) : X.min, x1 = X.log ? Math.log10(X.max) : X.max;
    const y0 = Y.log ? Math.log10(Y.min) : Y.min, y1 = Y.log ? Math.log10(Y.max) : Y.max;
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const sx = (v) => m.l + ((tx(v) - x0) / (x1 - x0 || 1)) * pw;
    const syRaw = (tv) => m.t + ph - ((tv - y0) / (y1 - y0 || 1)) * ph;
    const sy = (v) => Math.max(-1e5, Math.min(1e5, syRaw(ty(v))));
    const fx = X.fmt || F12.compact, fy = Y.fmt || F12.compact, tipY = Y.tipFmt || F12.fmt, tipX = X.tipFmt || F12.fmt;
    const id = "f12clip" + ++clipSeq;
    svg.appendChild(S("defs", null, S("clipPath", { id }, S("rect", { x: m.l, y: m.t - 2, width: pw, height: ph + 4 }))));
    // grid + ticks
    const g = S("g", null);
    const yt = Y.ticks ? Y.ticks.map(ty) : Y.log ? logTicks(y0, y1) : linTicks(y0, y1, o.yCount || 5);
    yt.forEach((tv) => {
      const y = syRaw(tv);
      if (y < m.t - 1 || y > m.t + ph + 1) return;
      g.appendChild(S("line", { x1: m.l, x2: m.l + pw, y1: y, y2: y, stroke: "var(--line)", "stroke-width": 1 }));
      g.appendChild(S("text", { x: m.l - 7, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, Y.log ? "10" + F12.sup(tv) : fy(tv)));
    });
    const xt = X.ticks ? X.ticks.map(tx) : X.log ? logTicks(x0, x1) : linTicks(x0, x1, o.xCount || 6);
    xt.forEach((tv) => {
      const x = m.l + ((tv - x0) / (x1 - x0 || 1)) * pw;
      if (x < m.l - 1 || x > m.l + pw + 1) return;
      g.appendChild(S("line", { x1: x, x2: x, y1: m.t + ph, y2: m.t + ph + 5, stroke: "var(--line-2)" }));
      g.appendChild(S("text", { x, y: m.t + ph + 18, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, X.log ? "10" + F12.sup(tv) : fx(tv)));
    });
    g.appendChild(S("line", { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, stroke: "var(--line-2)", "stroke-width": 1.2 }));
    g.appendChild(S("line", { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ph, stroke: "var(--line-2)", "stroke-width": 1.2 }));
    if (X.label) g.appendChild(S("text", { x: m.l + pw / 2, y: H - 8, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, X.label));
    if (Y.label) g.appendChild(S("text", { x: 14, y: m.t + ph / 2, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)", transform: `rotate(-90 14 ${m.t + ph / 2})` }, Y.label));
    svg.appendChild(g);
    // reference lines
    const data = S("g", { "clip-path": `url(#${id})` });
    (o.hlines || []).forEach((h) => {
      const y = sy(h.y);
      data.appendChild(S("line", { x1: m.l, x2: m.l + pw, y1: y, y2: y, stroke: h.color || "var(--muted)", "stroke-width": 1.5, "stroke-dasharray": h.dash || "5 4" }));
      if (h.label) data.appendChild(S("text", { x: m.l + 6, y: y - 5, "font-size": 11, fill: "var(--ink-2)" }, h.label));
    });
    // series
    const ok = (p) => p && Number.isFinite(p[1]) && Number.isFinite(p[0]) && (!Y.log || p[1] > 0) && (!X.log || p[0] > 0);
    const ends = [];
    (o.series || []).forEach((s) => {
      const pts = s.pts.filter(ok);
      if (!pts.length) return;
      if (s.type === "dots") {
        pts.forEach((p) => data.appendChild(S("circle", { cx: sx(p[0]), cy: sy(p[1]), r: s.r || 3.2, fill: s.color, "fill-opacity": s.opacity || 0.75, stroke: "var(--bg-2)", "stroke-width": 1 })));
      } else {
        const d = pts.map((p, k) => (k ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1)).join(" ");
        data.appendChild(S("path", { d, fill: "none", stroke: s.color, "stroke-width": s.width || 2.2, "stroke-dasharray": s.dash || null, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      }
      if (s.endLabel !== false && s.name) {
        // last point that is inside the plot area
        let last = null;
        for (const p of pts) { const y = sy(p[1]); if (y >= m.t && y <= m.t + ph) last = p; }
        if (last) ends.push({ s, x: sx(last[0]), y: sy(last[1]) });
      }
    });
    svg.appendChild(data);
    // direct labels (nudged apart)
    ends.sort((a, b) => a.y - b.y);
    for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
    const yMaxLbl = m.t + ph - 6;
    if (ends.length && ends[ends.length - 1].y > yMaxLbl) {
      ends[ends.length - 1].y = yMaxLbl;
      for (let k = ends.length - 2; k >= 0; k--) if (ends[k + 1].y - ends[k].y < 14) ends[k].y = ends[k + 1].y - 14;
    }
    ends.forEach((e) => {
      const right = e.x > m.l + pw - 90;
      const lx = right ? e.x - 6 : e.x + 6;
      svg.appendChild(S("rect", { x: right ? lx - 3 - e.s.name.length * 6.8 - 12 : lx - 2, y: e.y - 9, width: e.s.name.length * 6.8 + 16, height: 16, rx: 4, fill: "var(--bg-2)", opacity: 0.85 }));
      svg.appendChild(S("rect", { x: right ? lx - e.s.name.length * 6.8 - 12 : lx, y: e.y - 2, width: 8, height: 3, rx: 1.5, fill: e.s.color }));
      svg.appendChild(S("text", { x: right ? lx : lx + 11, y: e.y + 3.5, "text-anchor": right ? "end" : "start", "font-size": 11, fill: "var(--ink-2)" }, e.s.name));
    });
    if (o.note) svg.appendChild(S("text", { x: m.l + 8, y: m.t + 14, "font-size": 11.5, fill: "var(--muted)" }, o.note));
    // hover layer
    if (o.hover !== false) {
      const hov = S("g", { "pointer-events": "none", style: "display:none" });
      const vline = S("line", { y1: m.t, y2: m.t + ph, stroke: "var(--muted)", "stroke-dasharray": "3 3" });
      const box = S("rect", { rx: 6, fill: "var(--panel)", stroke: "var(--line-2)" });
      const txt = S("text", { "font-size": 11.5 });
      hov.append(vline, box, txt);
      const hit = S("rect", { x: m.l, y: m.t, width: pw, height: ph, fill: "transparent", style: "cursor:crosshair" });
      svg.append(hit, hov);
      const toData = (evt) => {
        const r = svg.getBoundingClientRect();
        return { px: ((evt.clientX - r.left) / r.width) * W, py: ((evt.clientY - r.top) / r.height) * H };
      };
      hit.addEventListener("pointerleave", () => (hov.style.display = "none"));
      hit.addEventListener("pointermove", (evt) => {
        const { px, py } = toData(evt);
        const rows = [];
        let head = null, cx = px;
        const lines = (o.series || []).filter((s) => s.type !== "dots");
        const dots = (o.series || []).filter((s) => s.type === "dots");
        if (lines.length) {
          lines.forEach((s) => {
            let best = null, bd = Infinity;
            s.pts.filter(ok).forEach((p) => { const d = Math.abs(sx(p[0]) - px); if (d < bd) { bd = d; best = p; } });
            if (best && bd < 40) { rows.push({ c: s.color, t: `${s.name}: ${(s.fmtY || tipY)(best[1])}` }); if (!head) { head = `${X.name || "n"} = ${tipX(best[0])}`; cx = sx(best[0]); } }
          });
        }
        if (dots.length) {
          let best = null, bd = 22, bs = null;
          dots.forEach((s) => s.pts.filter(ok).forEach((p) => { const d = Math.hypot(sx(p[0]) - px, sy(p[1]) - py); if (d < bd) { bd = d; best = p; bs = s; } }));
          if (best) { head = `${X.name || "n"} = ${tipX(best[0])}`; cx = sx(best[0]); rows.unshift({ c: bs.color, t: `${bs.name}: ${(bs.fmtY || tipY)(best[1])}` }); }
        }
        if (!rows.length) { hov.style.display = "none"; return; }
        hov.style.display = "";
        vline.setAttribute("x1", cx); vline.setAttribute("x2", cx);
        txt.innerHTML = "";
        const all = [{ t: head, c: null }].concat(rows.slice(0, 9));
        const wmax = Math.max(...all.map((r) => r.t.length)) * 6.7 + 26;
        const bx = cx + 12 + wmax > W - 4 ? cx - 12 - wmax : cx + 12;
        const by = Math.max(m.t, Math.min(py - 10, m.t + ph - all.length * 16 - 10));
        box.setAttribute("x", bx); box.setAttribute("y", by); box.setAttribute("width", wmax); box.setAttribute("height", all.length * 16 + 8);
        all.forEach((r, k) => {
          if (r.c) txt.appendChild(S("rect", { x: bx + 8, y: by + 9 + k * 16, width: 8, height: 8, rx: 2, fill: r.c }));
          txt.appendChild(S("text", { x: bx + (r.c ? 21 : 8), y: by + 17 + k * 16, fill: r.c ? "var(--ink-2)" : "var(--ink)", "font-weight": r.c ? 400 : 700 }, r.t));
        });
      });
    }
    return { sx, sy, m, pw, ph };
  };

  /* ------------------------------------------------------------------
     Predict card. opts = {prompt, choices: [..] | null, answer, explain,
     numeric: bool, check: (userValue) => bool (optional), onReveal}
     ------------------------------------------------------------------ */
  F12.predict = function (host, o) {
    host.innerHTML = "";
    const E = Forge.el;
    const out = E("div", { class: "small", style: { marginTop: "8px" } });
    const done = (val) => {
      const right = o.check ? o.check(val) : String(val).trim() === String(o.answer);
      out.innerHTML = (right ? `<b style="color:var(--ok)">✔ Yes!</b> ` : `<b style="color:var(--bad)">✘ Not quite.</b> The answer is <b>${o.answer}</b>. `) + (o.explain || "");
      host.querySelectorAll("button").forEach((b) => (b.disabled = true));
      if (o.onReveal) o.onReveal(right);
    };
    let body;
    if (o.choices) {
      body = E("div", { class: "row", style: { marginTop: "6px" } }, o.choices.map((c) => E("button", { class: "btn sm", onclick: () => done(c) }, String(c))));
    } else {
      const inp = E("input", { type: o.numeric === false ? "text" : "number", "aria-label": "Your prediction", style: { width: "150px" }, onkeydown: (e) => { if (e.key === "Enter") done(inp.value); } });
      body = E("div", { class: "row", style: { marginTop: "6px" } }, inp, E("button", { class: "btn sm primary", onclick: () => done(inp.value) }, "Check"));
    }
    host.appendChild(E("div", { class: "callout steel" }, E("b", null, "🤔 Predict: "), E("span", { html: o.prompt }), body, out));
  };

  window.F12 = F12;
})();
