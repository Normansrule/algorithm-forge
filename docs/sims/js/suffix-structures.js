/* Algorithm Forge — Suffix structures (UI). Algorithms live in suffix-structures-core.js. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg, SC = window.SuffixCore;
  Forge.page({ title: "Suffix Structures", chapter: "Ch 18 · The Frontier" });

  const COL = { compare: "var(--c-compare)", swap: "var(--c-swap)", done: "var(--c-done)", active: "var(--c-active)", pivot: "var(--c-pivot)", dim: "var(--c-dim)", ember: "var(--ember)" };
  const ink = (s) => (s && s !== "dim" ? "#0d1117" : "var(--ink)");
  const PRESETS = {
    banana: ["banana", "ana"],
    miss: ["mississippi", "ssi"],
    dna: ["GATTACAGATTACAGATTACA", "TTAC"],
    abra: ["abracadabra", "abra"],
  };
  const LEGENDS = {
    sa: [["var(--steel-soft);border:1px solid var(--steel)", "prefix the ranks already decide"], ["var(--c-pivot)", "still tied (same rank)"], ["var(--c-active)", "row getting its new rank"], ["var(--c-compare)", "row above (compared pair)"]],
    lcp: [["var(--c-active)", "suffix i (its row)"], ["var(--c-compare)", "row above in sorted order"], ["var(--c-pivot)", "known to match (carried in h)"], ["var(--c-done)", "matched"], ["var(--c-swap)", "mismatch"]],
    bwt: [["var(--steel)", "F (first column)"], ["var(--ember)", "L = BWT (last column)"], ["var(--c-active)", "current row r"], ["transparent;border:2.5px solid var(--c-compare)", "earlier copies of L[r] (its rank)"], ["var(--c-done)", "text rebuilt so far"]],
    fm: [["var(--steel-soft);border:1px solid var(--steel)", "interval [sp, ep]"], ["var(--c-compare)", "L equals the next pattern character"], ["var(--c-done)", "pattern part matched / occurrences"], ["var(--c-active)", "next pattern character"]],
  };
  const CTR0 = {
    sa: { round: 0, "k (chars ranked)": 1, "pair comparisons": 0, "distinct ranks": 0, "round bound ⌈log₂ n⌉": 0 },
    lcp: { i: "–", h: 0, "char comparisons": 0, "bound 2n": 0, "chars skipped via h": 0 },
    bwt: { n: 0, "BWT runs r": "–", "LF steps": 0, "chars rebuilt": 0 },
    fm: { "pattern index k": "–", "Occ queries": 0, "rows in [sp, ep]": 0, matches: "–" },
  };

  const st = { mode: "sa", T: "banana$", P: "ana", rec: null };
  const stage = $("stage");
  const codeSw = FX.codeSwitch($("code"));
  let code = null, ctr = null;
  const say = Forge.narrate($("say"));
  const predict = FX.predict($("predictHost"), () => player);
  const W = 760;

  /* ---------------- record ---------------- */
  function record() {
    const T = st.T;
    if (st.mode === "sa") return SC.recSA(T);
    if (st.mode === "lcp") return SC.recLCP(T);
    if (st.mode === "bwt") return SC.recBWT(T);
    return SC.recFM(T, st.P || "a");
  }

  /* ---------------- render ---------------- */
  function cell(g, x, y, w, h, ch, state, o) {
    o = o || {};
    g.appendChild(S("rect", { x: x + 1, y: y + 1, width: w - 2, height: h - 2, rx: 3, fill: state ? COL[state] : o.fill || "var(--panel)", stroke: o.stroke || "var(--line-2)", "stroke-width": o.sw || 1, opacity: o.op != null ? o.op : 1 }));
    g.appendChild(S("text", { x: x + w / 2, y: y + h / 2 + Math.min(13, w * 0.56) * 0.36, "text-anchor": "middle", "font-size": Math.min(14, w * 0.6), "font-weight": 700, "font-family": "var(--mono)", fill: state ? ink(state) : o.ink || "var(--ink)", opacity: o.op != null ? Math.max(0.35, o.op) : 1 }, ch));
  }
  function txt(g, x, y, s, o) { g.appendChild(S("text", Object.assign({ x, y, "font-size": 11, fill: "var(--muted)" }, o || {}), String(s))); }

  function render(f, i) {
    const T = st.T, n = T.length, mode = st.mode;
    stage.innerHTML = "";
    const g = S("g"); stage.appendChild(g);
    const under = S("g"), over = S("g");
    // ---- top strip: text (or rebuilt text) ----
    const tw = Math.min(28, (W - 60) / n), tx0 = 44;
    let y = 22;
    const rebuilding = mode === "bwt" && f.rebuilt;
    txt(g, tx0 - 8, y + tw * 0.7, rebuilding ? "T?" : "T", { "text-anchor": "end", "font-weight": 700, "font-size": 12 });
    for (let k = 0; k < n; k++) {
      let ch = T[k], s = null;
      if (rebuilding) { ch = f.rebuilt[k] == null ? "?" : f.rebuilt[k]; s = f.rebuilt[k] == null ? null : (f.newPos === k ? "active" : "done"); }
      if (f.tpos && f.tpos[k]) s = f.tpos[k];
      if (f.tposAll && f.tposAll[k]) s = f.tposAll[k];
      cell(g, tx0 + k * tw, y, tw, tw, ch, s, { op: rebuilding && f.rebuilt[k] == null ? 0.5 : 1 });
      txt(g, tx0 + k * tw + tw / 2, y - 4, k, { "text-anchor": "middle", "font-size": 9 });
    }
    if (rebuilding) txt(g, tx0 + n * tw + 8, y + tw * 0.7, "rebuilt from L, right to left", { "font-size": 11 });
    y += tw + 10;
    // ---- pattern strip (FM) ----
    if (mode === "fm") {
      const P = f.pat || "";
      txt(g, tx0 - 8, y + tw * 0.7, "P", { "text-anchor": "end", "font-weight": 700, "font-size": 12 });
      [...P].forEach((ch, k) => cell(g, tx0 + k * tw, y, tw, tw, ch, k === f.pcur && !f.final ? "active" : k >= f.pdone ? "done" : null));
      txt(g, tx0 + P.length * tw + 8, y + tw * 0.7, "read right to left", { "font-size": 11 });
      y += tw + 10;
    }
    y += 16;
    // ---- matrix layout ----
    const order = f.order, rot = !!f.rot;
    const rh = 22;
    const leftW = 72;                          // r + i/SA columns
    let rightW = 0;
    if (mode === "sa") rightW = 150;
    if (mode === "lcp") rightW = 56;
    if (mode === "bwt" && f.showRuns) rightW = 60;
    if (mode === "fm") rightW = 46;
    const cx0 = 8 + leftW;
    const cw = Math.min(26, (W - cx0 - rightW - 10) / n);
    const top = y + 6;
    // headers
    txt(g, 18, top - 6, "r", { "text-anchor": "middle", "font-weight": 700 });
    txt(g, 54, top - 6, mode === "sa" && !f.final ? "i" : "SA[r]", { "text-anchor": "middle", "font-weight": 700 });
    txt(g, cx0, top - 6, rot ? "sorted rotations" : (mode === "sa" && f.prefix === 0 ? "suffixes in text order" : mode === "sa" && !f.final ? "suffixes (current order)" : "sorted suffixes"), { "font-weight": 700 });
    if (rot && f.colF) txt(g, cx0 + cw / 2, top - 18, "F", { "text-anchor": "middle", "font-weight": 800, "font-size": 13, fill: "var(--steel)" });
    if (rot && f.colL) txt(g, cx0 + (n - 1) * cw + cw / 2, top - 18, "L", { "text-anchor": "middle", "font-weight": 800, "font-size": 13, fill: "var(--ember)" });
    const rx = cx0 + n * cw + 10;
    if (mode === "sa") { txt(g, rx + 46, top - 6, f.pairs ? "(rank[i], rank[i+k])" : "", { "text-anchor": "middle", "font-weight": 700, "font-size": 10 }); txt(g, rx + 124, top - 6, f.newRank ? "new rank" : "rank", { "text-anchor": "middle", "font-weight": 700 }); }
    if (mode === "lcp") txt(g, rx + 22, top - 6, "LCP[r]", { "text-anchor": "middle", "font-weight": 700 });
    if (mode === "fm") txt(g, rx + 20, top - 6, "", {});
    g.appendChild(under);
    // tie groups (SA)
    let ranks = null;
    if (mode === "sa") {
      if (f.newRank) ranks = order.map((_, r) => (r in f.newRank ? f.newRank[r] : null));
      else if (f.rank) ranks = f.rank;
    }
    if (ranks) {
      let a = 0;
      while (a < n) {
        let b = a;
        while (b + 1 < n && ranks[a] != null && ranks[b + 1] === ranks[a]) b++;
        if (b > a) under.appendChild(S("rect", { x: cx0 - 7, y: top + a * rh + 3, width: 4, height: (b - a + 1) * rh - 6, rx: 2, fill: "var(--c-pivot)" }));
        a = b + 1;
      }
    }
    // band (FM)
    if (f.prevBand) under.appendChild(S("rect", { x: 4, y: top + f.prevBand[0] * rh, width: cx0 + n * cw - 2, height: (f.prevBand[1] - f.prevBand[0] + 1) * rh, fill: "none", stroke: "var(--muted)", "stroke-dasharray": "5 4", "stroke-width": 1.5, rx: 6 }));
    if (f.band) under.appendChild(S("rect", { x: 4, y: top + f.band[0] * rh, width: cx0 + n * cw + (mode === "fm" ? rightW : 0) - 2, height: (f.band[1] - f.band[0] + 1) * rh, fill: "var(--steel-soft)", stroke: "var(--steel)", "stroke-width": 2, rx: 6 }));
    // rows
    order.forEach((s, r) => {
      const ry = top + r * rh;
      const isCur = f.cur === r, isPrev = f.prev === r;
      if (isCur || isPrev) under.appendChild(S("rect", { x: 4, y: ry, width: cx0 + n * cw - 2, height: rh, rx: 5, fill: isCur ? "color-mix(in srgb, var(--c-active) 22%, transparent)" : "color-mix(in srgb, var(--c-compare) 22%, transparent)" }));
      txt(g, 18, ry + 15, r, { "text-anchor": "middle", "font-size": 11, "font-family": "var(--mono)" });
      txt(g, 54, ry + 15, s, { "text-anchor": "middle", "font-size": 12, "font-weight": 700, "font-family": "var(--mono)", fill: f.saHl && f.band && r >= f.band[0] && r <= f.band[1] ? "var(--c-done)" : "var(--ink-2)" });
      const len = rot ? n : n - s;
      for (let k = 0; k < len; k++) {
        const ch = T[(s + k) % n];
        let state = null, o = {};
        if (mode === "sa") {
          if (k < Math.min(f.prefix, len)) o = { fill: "var(--steel-soft)", stroke: "var(--steel)" };
        } else if (mode === "lcp") {
          if (isCur && f.cellA && f.cellA[k]) state = f.cellA[k];
          if (isPrev && f.cellB && f.cellB[k]) state = f.cellB[k];
          if (f.lrs && (r === f.lrs.r || r === f.lrs.r - 1) && k < f.lrs.len) state = "done";
        } else {
          const isF = k === 0, isL = k === n - 1;
          if (f.onlyFL && !isF && !isL) o = { op: 0.28 };
          if (isF && f.colF) o = { fill: "var(--steel-soft)", stroke: "var(--steel)" };
          if (isL && f.colL) o = { fill: "var(--ember-soft)", stroke: "var(--ember)" };
          if (isL && f.Lmark && f.Lmark[r]) state = "compare";
          if (isL && f.cur === r && f.arrow) state = "active";
          if (isF && f.arrow && f.arrow[1] === r) state = "active";
          if (mode === "fm" && f.band && r >= f.band[0] && r <= f.band[1] && k < (f.pat.length - f.pdone)) { state = "done"; o = {}; }
        }
        cell(g, cx0 + k * cw, ry + 1, cw, rh - 2, ch, state, o);
        if (rot && k === n - 1 && f.ringL && f.ringL[r]) over.appendChild(S("rect", { x: cx0 + k * cw - 1, y: ry - 1, width: cw + 2, height: rh + 2, rx: 5, fill: "none", stroke: "var(--c-compare)", "stroke-width": 2.5 }));
      }
      // right columns
      if (mode === "sa") {
        if (f.pairs) { const p = f.pairs[r]; txt(g, rx + 46, ry + 15, `(${p[0]}, ${p[1]})`, { "text-anchor": "middle", "font-size": 12, "font-family": "var(--mono)", fill: "var(--ink-2)" }); }
        let v = null, hot = false;
        if (f.newRank) { if (r in f.newRank) { v = f.newRank[r]; hot = r === f.cur; } }
        else if (f.rank && !f.oldRank) v = f.rank[r];
        else if (f.rank && f.oldRank) v = "…";
        if (v != null) txt(g, rx + 124, ry + 15, v, { "text-anchor": "middle", "font-size": 12, "font-weight": 700, "font-family": "var(--mono)", fill: hot ? "var(--c-active)" : "var(--ink)" });
      }
      if (mode === "lcp" && f.lcp) {
        const v = f.lcp[r];
        if (v != null) {
          if (f.hlL === r) under.appendChild(S("rect", { x: rx + 6, y: ry + 2, width: 32, height: rh - 4, rx: 4, fill: f.final ? "var(--c-done)" : "var(--c-swap)" }));
          txt(g, rx + 22, ry + 15, v, { "text-anchor": "middle", "font-size": 12, "font-weight": 700, "font-family": "var(--mono)", fill: f.hlL === r ? "#0d1117" : "var(--ink)" });
        }
      }
    });
    // runs (BWT)
    if (mode === "bwt" && f.showRuns) {
      const L = order.map((s) => T[(s + n - 1) % n]);
      let a = 0, alt = 0;
      while (a < n) {
        let b = a; while (b + 1 < n && L[b + 1] === L[a]) b++;
        const col = alt++ % 2 ? "var(--steel)" : "var(--ember)";
        over.appendChild(S("rect", { x: rx, y: top + a * rh + 3, width: 5, height: (b - a + 1) * rh - 6, rx: 2, fill: col }));
        if (b > a) txt(over, rx + 10, top + ((a + b + 1) / 2) * rh + 4, `${L[a]}×${b - a + 1}`, { "font-size": 11, "font-weight": 700, fill: col, "font-family": "var(--mono)" });
        a = b + 1;
      }
    }
    // LF arrows (BWT inversion, FM)
    const arrow = (a, b, col) => {
      const x1 = cx0 + (n - 1) * cw + cw / 2, y1 = top + a * rh + rh / 2, x2 = cx0 + cw, y2 = top + b * rh + rh / 2;
      const mx = (x1 + x2) / 2;
      over.appendChild(S("path", { d: `M${x1 - cw / 2} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 + 2} ${y2}`, fill: "none", stroke: col, "stroke-width": 2.2, "marker-end": "url(#lfArr)" }));
    };
    const defs = S("defs", null, S("marker", { id: "lfArr", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: "var(--c-active)" })));
    stage.appendChild(defs);
    if (f.arrow) arrow(f.arrow[0], f.arrow[1], "var(--c-active)");
    (f.lfArrows || []).forEach(([a, b]) => arrow(a, b, "var(--c-active)"));
    g.appendChild(over);
    // C table
    let yb = top + n * rh + 14;
    if (f.Ctab) {
      const keys = Object.keys(f.Ctab).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const c2 = Math.min(40, (W - 80) / keys.length);
      txt(g, 8, yb + 30, "C[c]", { "font-weight": 700, "font-size": 12 });
      keys.forEach((c, k) => {
        const x = 70 + k * c2, hot = mode === "fm" && f.pcur != null && f.pat[f.pcur] === c && !f.final;
        g.appendChild(S("rect", { x, y: yb, width: c2, height: 20, fill: "var(--panel-2)", stroke: "var(--line)" }));
        txt(g, x + c2 / 2, yb + 14, c, { "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "var(--ink-2)", "font-family": "var(--mono)" });
        g.appendChild(S("rect", { x, y: yb + 20, width: c2, height: 22, fill: hot ? COL.active : "var(--panel)", stroke: "var(--line)" }));
        txt(g, x + c2 / 2, yb + 35, f.Ctab[c], { "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: hot ? "#0d1117" : "var(--ink)", "font-family": "var(--mono)" });
      });
      yb += 50;
    }
    stage.setAttribute("viewBox", `0 0 ${W} ${yb + 6}`);
    // panels
    code.highlight(f.line);
    say.say(f.text);
    const c = f.c;
    if (mode === "sa") ctr.set({ round: c.round, "k (chars ranked)": f.final ? "≥ n" : f.prefix, "pair comparisons": c.cmp, "distinct ranks": c.distinct, "round bound ⌈log₂ n⌉": Math.ceil(Math.log2(n)) });
    else if (mode === "lcp") ctr.set({ i: c.i, h: c.h, "char comparisons": c.cmp, "bound 2n": 2 * n, "chars skipped via h": c.skipped });
    else if (mode === "bwt") ctr.set({ n, "BWT runs r": c.runs, "LF steps": c.occ, "chars rebuilt": f.rebuilt ? c.recovered : 0 });
    else ctr.set({ "pattern index k": c.k, "Occ queries": c.occ, "rows in [sp, ep]": f.band ? f.band[1] - f.band[0] + 1 : (f.final || c.matches === 0 ? 0 : c.rows), matches: c.matches });
    predict.update(f, i);
  }

  /* ---------------- index table ---------------- */
  function indexTable() {
    const T = st.T, n = T.length;
    const { SA } = SC.suffixArray(T), { LCP } = SC.kasai(T, SA), L = SC.bwtFromSA(T, SA), R = SC.runs(L);
    const tb = $("idx"); tb.innerHTML = "";
    const mx = Math.max(...LCP);
    tb.appendChild(E("tr", null, ["r", "SA[r]", "suffix T[SA[r]..]", "LCP[r]", "F", "L (BWT)"].map((h) => E("th", null, h))));
    SA.forEach((s, r) => tb.appendChild(E("tr", null, E("td", null, r), E("td", null, s), E("td", { class: "suf" }, T.slice(s)), E("td", { class: LCP[r] === mx && mx > 0 ? "hot" : "" }, LCP[r]), E("td", null, T[s]), E("td", null, L[r]))));
    const bs = SC.backwardSearch(L, SA, st.P || "a");
    $("idxNote").innerHTML = `n = ${n}. BWT L = <span class="kv">${L}</span> with r = ${R.length} runs. Longest repeated substring: ${mx > 0 ? `<span class="kv">"${T.substr(SA[LCP.indexOf(mx)], mx)}"</span> (largest LCP, ${mx})` : "none"}. Pattern <span class="kv">"${st.P}"</span> occurs ${bs.count} time${bs.count === 1 ? "" : "s"}${bs.count ? ` at ${bs.positions.join(", ")}` : ""}.`;
  }

  /* ---------------- wiring ---------------- */
  function setupPanels() {
    $("code").innerHTML = "";
    codeSw.clear();
    code = codeSw.show(st.mode, SC.SPEC[st.mode].map((l) => l.replace(/^@\w+\|/, "")));
    $("ctr").innerHTML = "";
    ctr = Forge.counters($("ctr"), CTR0[st.mode]);
    const lg = $("legend"); lg.innerHTML = "";
    LEGENDS[st.mode].forEach(([c, t]) => lg.appendChild(E("span", null, E("i", { style: "background:" + c }), t)));
  }
  const player = Forge.player($("player"), { frames: [], render });
  function reload() {
    setupPanels();
    predict.reset();
    st.rec = record();
    player.load(st.rec.frames);
    indexTable();
  }
  function setInput(t, p, note) {
    const nz = SC.normalize(t, 24);
    if (nz.text.length < 2) { $("msg").textContent = "Type at least one character."; return; }
    st.T = nz.text;
    let P = String(p == null ? st.P : p).replace(/\s/g, "_").replace(/[^A-Za-z0-9_]/g, "").slice(0, 12);
    if (!P) P = st.T[0];
    st.P = P;
    $("txt").value = st.T.slice(0, -1); $("pat").value = st.P;
    $("msg").textContent = [nz.note, note].filter(Boolean).join(" ");
    reload();
  }
  document.querySelectorAll(".modes .btn").forEach((b) => (b.onclick = () => {
    st.mode = b.dataset.mode;
    document.querySelectorAll(".modes .btn").forEach((o) => { o.classList.toggle("on", o === b); o.setAttribute("aria-selected", String(o === b)); });
    reload();
  }));
  $("load").onclick = () => setInput($("txt").value, $("pat").value);
  ["txt", "pat"].forEach((id) => $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") setInput($("txt").value, $("pat").value); }));
  document.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => { const p = PRESETS[b.dataset.preset]; setInput(p[0], p[1]); }));
  let rseed = 7;
  $("rand").onclick = () => {
    const r = Forge.rng(rseed++ * 7919), alpha = r() < 0.5 ? "ACGT" : "abn";
    const n = 8 + Math.floor(r() * 12);
    let t = ""; for (let k = 0; k < n; k++) t += alpha[Math.floor(r() * alpha.length)];
    const a = Math.floor(r() * (n - 3));
    setInput(t, t.substr(a, 2 + Math.floor(r() * 2)), `Random text over {${alpha.split("").join(", ")}}.`);
  };
  const q = new URLSearchParams(location.search);
  if (q.get("mode") && SC.SPEC[q.get("mode")]) document.querySelector(`.modes .btn[data-mode="${q.get("mode")}"]`).classList.add("pending");
  setInput(PRESETS.banana[0], PRESETS.banana[1]);
  const pend = document.querySelector(".modes .btn.pending");
  if (pend) { pend.classList.remove("pending"); pend.click(); }
})();
