/* =====================================================================
   Algorithm Forge — simulation kit (forge-kit.js)
   ---------------------------------------------------------------------
   Every simulation follows the same pattern, so learners only have to
   learn the controls once:

     1. RECORD:  run the algorithm once, pushing a "frame" (a plain
                 snapshot object) at every interesting moment.
     2. PLAY:    Forge.player() steps through the frames; your render()
                 function draws frame i. Scrubbing backwards is free
                 because frames are snapshots, not diffs.

   Public API (window.Forge):
     Forge.page({title, chapter, sim})      -> injects top bar + footer
     Forge.el(tag, attrs, ...children)      -> DOM builder
     Forge.svg(tag, attrs, ...children)     -> SVG builder
     Forge.player(host, {frames, render, fps}) -> {load(frames), go(i), play(), pause()}
     Forge.code(host, lines)                -> {highlight(i | [i..])}
     Forge.counters(host, {name: value})    -> {set({name: value})}
     Forge.narrate(host)                    -> {say(html)}
     Forge.bars(svg, arr, opts)             -> draws a bar chart of arr
     Forge.graph(svg, g, opts)              -> draws nodes + edges
     Forge.rng(seed)                        -> deterministic random()
     Forge.randArray(n, lo, hi, seed)
     Forge.tabs(host, [{label, render}])
     Forge.clone(x)                         -> structuredClone fallback
   ===================================================================== */
(function () {
  "use strict";
  const Forge = {};
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- theme ---------- */
  const THEME_KEY = "forge-theme";
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (e) { /* storage blocked */ }
  Forge.toggleTheme = function () {
    const cur = document.documentElement.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = cur === "light" ? "dark" : "light";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent("forge:theme", { detail: next }));
  };
  /** Read a CSS variable (useful when drawing on <canvas>). */
  Forge.css = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  /* ---------- DOM builders ---------- */
  function build(ns, tag, attrs, children) {
    const n = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === "class") n.setAttribute("class", v);
        else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
        else if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      n.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
    }
    return n;
  }
  Forge.el = (tag, attrs, ...kids) => build(null, tag, attrs, kids);
  Forge.svg = (tag, attrs, ...kids) => build(SVGNS, tag, attrs, kids);
  Forge.$ = (sel, root) => (root || document).querySelector(sel);
  Forge.clone = (x) => (typeof structuredClone === "function" ? structuredClone(x) : JSON.parse(JSON.stringify(x)));

  /* ---------- page chrome ---------- */
  const LOGO = `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb07a"/><stop offset="1" stop-color="#ff5d3d"/></linearGradient></defs><rect x="3" y="18" width="6" height="11" rx="1.5" fill="#5ab0ff"/><rect x="11" y="12" width="6" height="17" rx="1.5" fill="#5ab0ff" opacity=".8"/><rect x="19" y="6" width="6" height="23" rx="1.5" fill="url(#fg)"/><path d="M22 2l2 3-2 1-2-1z" fill="#ffd24d"/></svg>`;
  /** Root-relative prefix so the same chrome works from /, /sims/, /arena/. */
  function rootPrefix() {
    const s = document.currentScript || document.querySelector('script[src*="forge-kit.js"]');
    const src = s ? s.getAttribute("src") : "assets/js/forge-kit.js";
    return src.replace(/assets\/js\/forge-kit\.js.*$/, "");
  }
  const ROOT = rootPrefix();
  Forge.root = ROOT;

  Forge.page = function (opts) {
    opts = opts || {};
    const here = location.pathname;
    const norm = (p) => p.replace(/index\.html$/, "");
    const hereN = norm(here);
    const link = (href, label) => {
      const abs = norm(new URL(ROOT + href, location.href).pathname);
      // Home is active only on the home page; section links (sims/, arena/) stay active on their sub-pages
      const active = href === "index.html" ? hereN === abs : (href.endsWith("index.html") ? hereN.startsWith(abs) : hereN === abs);
      return Forge.el("a", { href: ROOT + href, class: active ? "active" : "" }, label);
    };
    const bar = Forge.el("header", { class: "topbar" },
      Forge.el("a", { class: "brand", href: ROOT + "index.html", html: LOGO + "<span>Algorithm Forge</span>" }),
      Forge.el("nav", null,
        link("index.html", "Home"),
        link("path.html", "Learning Path"),
        link("sims/index.html", "Simulations"),
        link("arena/index.html", "Practice Arena"),
        link("cheatsheet.html", "Cheat Sheet")),
      Forge.el("div", { class: "spacer" }),
      opts.chapter ? Forge.el("span", { class: "chip ember" }, opts.chapter) : null,
      Forge.el("button", { class: "btn icon ghost menu-btn", title: "Menu", "aria-label": "Open menu", "aria-expanded": "false",
        onclick: (e) => { const open = bar.classList.toggle("nav-open"); e.currentTarget.setAttribute("aria-expanded", String(open)); e.currentTarget.textContent = open ? "✕" : "☰"; } }, "☰"),
      Forge.el("button", { class: "btn icon ghost", title: "Toggle light/dark", "aria-label": "Toggle theme", onclick: Forge.toggleTheme }, "◐"));
    document.body.prepend(bar);
    if (opts.title) document.title = opts.title + " · Algorithm Forge";
    if (!opts.noFooter) {
      document.body.appendChild(Forge.el("footer", { class: "foot" },
        "Algorithm Forge — learn to build algorithms from scratch. Primary reference: A. Levitin, ",
        Forge.el("i", null, "Introduction to the Design and Analysis of Algorithms"), ", 3rd ed."));
    }
  };

  /* ---------- deterministic RNG (mulberry32) ---------- */
  Forge.rng = function (seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  Forge.randArray = function (n, lo, hi, seed) {
    const r = Forge.rng(seed == null ? Date.now() : seed);
    return Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
  };

  /* ---------- player ---------- */
  Forge.player = function (host, opts) {
    let frames = opts.frames || [];
    let i = 0, timer = null;
    let fps = opts.fps || 3;
    const btn = (label, title, fn) => Forge.el("button", { class: "btn icon", title, "aria-label": title, onclick: fn }, label);
    const playBtn = btn("▶", "Play / pause (space)", () => (timer ? pause() : play()));
    const scrub = Forge.el("input", { type: "range", class: "scrub", min: 0, max: 0, value: 0, "aria-label": "Step", oninput: (e) => go(+e.target.value) });
    const label = Forge.el("span", { class: "step-label" }, "0 / 0");
    const speed = Forge.el("input", { type: "range", min: 1, max: 30, value: fps, title: "Speed", "aria-label": "Speed", style: { width: "90px" }, oninput: (e) => { fps = +e.target.value; if (timer) { pause(); play(); } } });
    const ui = Forge.el("div", { class: "player" },
      btn("⏮", "First step (Home)", () => go(0)),
      btn("◀", "Back one step (←)", () => go(i - 1)),
      playBtn,
      btn("▶|", "Forward one step (→)", () => go(i + 1)),
      btn("⏭", "Last step (End)", () => go(frames.length - 1)),
      scrub, label,
      Forge.el("span", { class: "muted small" }, "speed"), speed);
    host.appendChild(ui);

    function go(k) {
      if (!frames.length) return;
      i = Math.max(0, Math.min(frames.length - 1, k));
      scrub.max = frames.length - 1;
      scrub.value = i;
      label.textContent = `${i + 1} / ${frames.length}`;
      opts.render(frames[i], i, frames);
      if (i === frames.length - 1) pause();
    }
    function play() {
      if (!frames.length) return;
      if (i >= frames.length - 1) go(0);
      playBtn.textContent = "⏸";
      timer = setInterval(() => go(i + 1), 1000 / fps);
    }
    function pause() {
      playBtn.textContent = "▶";
      clearInterval(timer);
      timer = null;
    }
    function load(f) { pause(); frames = f || []; go(0); }
    document.addEventListener("keydown", (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (e.key === "ArrowRight") { go(i + 1); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { go(i - 1); e.preventDefault(); }
      else if (e.key === " ") { timer ? pause() : play(); e.preventDefault(); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(frames.length - 1);
    });
    if (frames.length) setTimeout(() => go(0));
    return { load, go, play, pause, get index() { return i; }, get frames() { return frames; } };
  };

  /* ---------- pseudocode panel ---------- */
  const KW = /\b(ALGORITHM|Algorithm|for|to|downto|do|while|if|then|else|return|and|or|not|repeat|until|each|in|swap|step|break|continue)\b/g;
  function colorize(line) {
    const esc = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const ci = esc.indexOf("//");
    const body = ci >= 0 ? esc.slice(0, ci) : esc;
    const cm = ci >= 0 ? `<span class="cm">${esc.slice(ci)}</span>` : "";
    return body.replace(KW, '<span class="kw">$1</span>').replace(/\b(\d+)\b/g, '<span class="nm">$1</span>') + cm;
  }
  Forge.code = function (host, lines) {
    const box = Forge.el("div", { class: "code", role: "region", "aria-label": "Pseudocode" });
    const rows = lines.map((l) => { const r = Forge.el("span", { class: "ln" }); r.innerHTML = colorize(l) || " "; return r; });
    rows.forEach((r) => box.appendChild(r));
    host.appendChild(box);
    return {
      highlight(which) {
        const set = new Set([].concat(which == null ? [] : which));
        rows.forEach((r, k) => r.classList.toggle("hl", set.has(k)));
      },
      el: box,
    };
  };

  /* ---------- counters ---------- */
  Forge.counters = function (host, init) {
    const box = Forge.el("div", { class: "counters" });
    const cells = {};
    for (const k in init) {
      const v = Forge.el("div", { class: "v" }, String(init[k]));
      cells[k] = v;
      box.appendChild(Forge.el("div", { class: "counter" }, Forge.el("div", { class: "k" }, k), v));
    }
    host.appendChild(box);
    return { set(obj) { for (const k in obj) if (cells[k]) cells[k].textContent = String(obj[k]); } };
  };

  /* ---------- narration ---------- */
  Forge.narrate = function (host) {
    const box = Forge.el("div", { class: "narrate", "aria-live": "polite" });
    host.appendChild(box);
    return { say(html) { box.innerHTML = html || ""; } };
  };

  /* ---------- bar chart ---------- */
  /**
   * Forge.bars(svg, arr, {
   *   state: {index: "compare"|"swap"|"done"|"active"|"pivot"|"dim"},
   *   pointers: [{i, label}],   // arrows under bars (e.g. i, j, l, r)
   *   width, height, showValues
   * })
   */
  Forge.bars = function (svg, arr, o) {
    o = o || {};
    const W = o.width || 760, H = o.height || 300, pad = 24, bottom = o.pointers ? 44 : 24;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const n = arr.length || 1;
    const max = Math.max(1, ...arr.map((x) => Math.abs(+x) || 0));
    const bw = (W - 2 * pad) / n;
    const colors = { compare: "var(--c-compare)", swap: "var(--c-swap)", done: "var(--c-done)", active: "var(--c-active)", pivot: "var(--c-pivot)", dim: "var(--c-dim)" };
    const st = o.state || {};
    arr.forEach((v, k) => {
      const h = Math.max(2, ((H - pad - bottom) * Math.abs(+v || 0)) / max);
      const x = pad + k * bw, y = H - bottom - h;
      const fill = colors[st[k]] || "var(--c-bar)";
      svg.appendChild(Forge.svg("rect", { x: x + bw * 0.08, y, width: Math.max(1, bw * 0.84), height: h, rx: Math.min(4, bw / 4), fill, style: "transition: all .18s" }));
      if ((o.showValues !== false) && bw >= 18) {
        svg.appendChild(Forge.svg("text", { x: x + bw / 2, y: y - 4, "text-anchor": "middle", "font-size": Math.min(13, bw * 0.45), fill: "var(--ink-2)" }, String(v)));
      }
      if (bw >= 18 && o.showIndex !== false) {
        svg.appendChild(Forge.svg("text", { x: x + bw / 2, y: H - bottom + 14, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, String(k)));
      }
    });
    (o.pointers || []).forEach((p, idx) => {
      if (p.i == null || p.i < 0 || p.i > n) return;
      const x = pad + p.i * bw + bw / 2;
      const y = H - 18 + (idx % 2) * 0;
      svg.appendChild(Forge.svg("path", { d: `M${x} ${H - bottom + 18} l-5 8 h10 z`, fill: p.color || "var(--ember)" }));
      svg.appendChild(Forge.svg("text", { x, y: y + 16, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: p.color || "var(--ember)" }, p.label));
    });
    return svg;
  };

  /* ---------- graph drawing ---------- */
  /**
   * g = {nodes:[{id,x,y,label?}], edges:[{u,v,w?,directed?}]}
   * o = {nodeState:{id:"active"|"done"|"compare"|"dim"}, edgeState:{"u-v": "tree"|"back"|"cross"|"active"|"dim"|"done"},
   *      nodeNote:{id:"text under node"}, edgeLabel:{"u-v": "text"}, width, height, r}
   */
  Forge.graph = function (svg, g, o) {
    o = o || {};
    const W = o.width || 760, H = o.height || 420, R = o.r || 20;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const defs = Forge.svg("defs", null);
    ["muted", "ember", "steel", "done"].forEach((c) => {
      const col = { muted: "var(--line-2)", ember: "var(--ember)", steel: "var(--steel)", done: "var(--c-done)" }[c];
      defs.appendChild(Forge.svg("marker", { id: "arr-" + c, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
        Forge.svg("path", { d: "M0 0 L10 5 L0 10 z", fill: col })));
    });
    svg.appendChild(defs);
    const pos = {};
    g.nodes.forEach((nd) => (pos[nd.id] = nd));
    const es = o.edgeState || {}, ns = o.nodeState || {};
    const edgeKey = (e) => (es[e.u + "-" + e.v] !== undefined ? e.u + "-" + e.v : e.v + "-" + e.u);
    g.edges.forEach((e) => {
      const a = pos[e.u], b = pos[e.v];
      if (!a || !b) return;
      const s = es[edgeKey(e)];
      const style = {
        tree: ["var(--ember)", 3.5, "", "ember"], done: ["var(--c-done)", 3.5, "", "done"], active: ["var(--steel)", 3.5, "", "steel"],
        back: ["var(--c-pivot)", 2, "6 5", "muted"], cross: ["var(--c-compare)", 2, "6 5", "muted"], dim: ["var(--c-dim)", 1.5, "", "muted"],
      }[s] || ["var(--line-2)", 2, "", "muted"];
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const x1 = a.x + (dx / L) * R, y1 = a.y + (dy / L) * R, x2 = b.x - (dx / L) * (R + (e.directed ? 3 : 0)), y2 = b.y - (dy / L) * (R + (e.directed ? 3 : 0));
      let d = `M${x1} ${y1} L${x2} ${y2}`;
      if (e.curve) { const mx = (x1 + x2) / 2 - (dy / L) * e.curve, my = (y1 + y2) / 2 + (dx / L) * e.curve; d = `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`; }
      svg.appendChild(Forge.svg("path", { d, stroke: style[0], "stroke-width": style[1], "stroke-dasharray": style[2], fill: "none", "marker-end": e.directed ? `url(#arr-${style[3]})` : null, style: "transition: all .2s" }));
      const lbl = (o.edgeLabel && o.edgeLabel[e.u + "-" + e.v]) != null ? o.edgeLabel[e.u + "-" + e.v] : e.w;
      if (lbl != null) {
        const mx = (a.x + b.x) / 2 - (dy / L) * (e.curve ? e.curve / 2 : 0) , my = (a.y + b.y) / 2 + (dx / L) * (e.curve ? e.curve / 2 : 0);
        svg.appendChild(Forge.svg("rect", { x: mx - 13, y: my - 10, width: 26, height: 18, rx: 5, fill: "var(--panel)", stroke: "var(--line)" }));
        svg.appendChild(Forge.svg("text", { x: mx, y: my + 3, "text-anchor": "middle", "font-size": 11, fill: "var(--ink-2)" }, String(lbl)));
      }
    });
    g.nodes.forEach((nd) => {
      const s = ns[nd.id];
      const fill = { active: "var(--steel)", done: "var(--c-done)", compare: "var(--c-compare)", swap: "var(--c-swap)", pivot: "var(--c-pivot)", dim: "var(--c-dim)", ember: "var(--ember)" }[s] || "var(--panel-2)";
      const ink = s && s !== "dim" ? "#0d1117" : "var(--ink)";
      svg.appendChild(Forge.svg("circle", { cx: nd.x, cy: nd.y, r: R, fill, stroke: s ? fill : "var(--line-2)", "stroke-width": 2, style: "transition: all .2s" }));
      svg.appendChild(Forge.svg("text", { x: nd.x, y: nd.y + 4.5, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: ink }, nd.label != null ? nd.label : nd.id));
      const note = o.nodeNote && o.nodeNote[nd.id];
      if (note != null) svg.appendChild(Forge.svg("text", { x: nd.x, y: nd.y + R + 15, "text-anchor": "middle", "font-size": 11, fill: "var(--ember-2)" }, String(note)));
    });
    return svg;
  };

  /* ---------- tabs ---------- */
  Forge.tabs = function (host, items) {
    const bar = Forge.el("div", { class: "tabs", role: "tablist" });
    const body = Forge.el("div");
    const btns = items.map((it, k) => Forge.el("button", { role: "tab", onclick: () => show(k) }, it.label));
    btns.forEach((b) => bar.appendChild(b));
    host.appendChild(bar);
    host.appendChild(body);
    function show(k) {
      btns.forEach((b, j) => b.classList.toggle("on", j === k));
      body.innerHTML = "";
      items[k].render(body);
    }
    show(0);
    return { show };
  };

  window.Forge = Forge;
})();
