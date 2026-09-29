/* Algorithm Forge — Stable marriage: Gale–Shapley with the ranking matrix (Levitin §10.4).
   Engine is pure and exported for Node tests; UI runs only in the browser. */
(function () {
  "use strict";

  /* ---------------- engine ----------------
     inst = {men:[names], women:[names], mp:[[w index...] per man], wp:[[m index...] per woman]} */
  function rankTables(inst) {
    const n = inst.men.length;
    const mr = inst.mp.map((l) => { const r = Array(n); l.forEach((w, k) => (r[w] = k + 1)); return r; }); // mr[m][w] = rank of w for m
    const wr = inst.wp.map((l) => { const r = Array(n); l.forEach((m, k) => (r[m] = k + 1)); return r; }); // wr[w][m]
    return { mr, wr };
  }

  /** Gale–Shapley. side = "men" (men propose) or "women". Free proposer chosen = first free in list order. */
  function galeShapley(inst, side, opts) {
    opts = opts || {};
    const n = inst.men.length;
    const { mr, wr } = rankTables(inst);
    const P = side === "men" ? inst.men : inst.women, R = side === "men" ? inst.women : inst.men;
    const pPref = side === "men" ? inst.mp : inst.wp;
    const rRank = side === "men" ? wr : mr; // rRank[r][p]
    const next = Array(n).fill(0), mateP = Array(n).fill(-1), mateR = Array(n).fill(-1);
    const rejected = []; // [p, r] pairs that ended in rejection or dumping
    const frames = [];
    const ctr = { proposals: 0, rejections: 0, "free proposers": n };
    const pairs = () => mateP.map((r, p) => (r >= 0 ? (side === "men" ? [p, r] : [r, p]) : null)).filter(Boolean); // [man, woman]
    const push = (line, text, extra) => frames.push(Object.assign({ pairs: pairs(), free: P.filter((_, p) => mateP[p] < 0), rejected: rejected.map((x) => x.slice()), line, text, ctr: Object.assign({}, ctr) }, extra || {}));
    const toMW = (p, r) => (side === "men" ? [p, r] : [r, p]);
    push(1, `Everyone starts free. Free ${side}: ${P.join(", ")}. Each ${side === "men" ? "man" : "woman"} will propose down ${side === "men" ? "his" : "her"} list, best first.`);
    let guard = 0;
    while (guard++ < n * n + 5) {
      const p = mateP.findIndex((r, k) => r < 0 && next[k] < n);
      if (p < 0) break;
      const r = pPref[p][next[p]++];
      ctr.proposals++;
      const cur = mateR[r];
      const accept = cur < 0 || rRank[r][p] < rRank[r][cur];
      const ask = opts.ask === false ? null : {
        q: `${P[p]} proposes to ${R[r]}. Does ${R[r]} accept?`, options: ["accepts", "rejects"], answer: accept ? "accepts" : "rejects",
        explain: cur < 0 ? `${R[r]} is free, so she takes any proposal.`.replace(/she/, side === "men" ? "she" : "he")
          : `${R[r]} ranks ${P[p]} #${rRank[r][p]} and current partner ${P[cur]} #${rRank[r][cur]} — ${accept ? `${P[p]} is better` : `${P[cur]} is better`}.`,
      };
      push(3, `${P[p]} proposes to ${R[r]}, ${pron(side, "his")} #${next[p]} choice${cur < 0 ? "" : ` (${R[r]} is currently with ${P[cur]})`}.`, { prop: toMW(p, r), ask });
      if (cur < 0) {
        mateP[p] = r; mateR[r] = p; ctr["free proposers"]--;
        push([4, 5], `${R[r]} was free, so ${pron(side, "she")} <b>accepts</b>: ${P[p]} and ${R[r]} are now matched.`, { prop: toMW(p, r), resp: "accept" });
      } else if (accept) {
        mateP[cur] = -1; mateP[p] = r; mateR[r] = p; ctr.rejections++;
        rejected.push(toMW(cur, r));
        push([6, 7], `${R[r]} prefers ${P[p]} (#${rRank[r][p]}) to ${P[cur]} (#${rRank[r][cur]}), so ${pron(side, "she")} <b>accepts</b> and ${P[cur]} becomes free again.`, { prop: toMW(p, r), resp: "swap", dumped: toMW(cur, r) });
      } else {
        ctr.rejections++;
        rejected.push(toMW(p, r));
        push([8, 9], `${R[r]} prefers ${P[cur]} (#${rRank[r][cur]}) to ${P[p]} (#${rRank[r][p]}), so ${pron(side, "she")} <b>rejects</b>. ${P[p]} stays free and moves down ${pron(side, "his")} list.`, { prop: toMW(p, r), resp: "reject" });
      }
    }
    const final = pairs();
    push(10, `No ${side === "men" ? "man" : "woman"} is free: return ${final.map(([m, w]) => `(${inst.men[m]}, ${inst.women[w]})`).join(", ")} after ${ctr.proposals} proposals (at most n² = ${n * n}). This matching is stable and <b>${side === "men" ? "man" : "woman"}-optimal</b>.`, { done: true });
    return { frames, pairs: final };
  }
  function pron(side, word) {
    // pronoun for the proposer ("his") or receiver ("she")
    const men = side === "men";
    return { his: men ? "his" : "her", she: men ? "she" : "he" }[word];
  }

  /** Blocking pairs of a complete matching given as wife[m] = w. */
  function blockingPairs(inst, wife) {
    const n = inst.men.length, { mr, wr } = rankTables(inst);
    const husband = Array(n); wife.forEach((w, m) => (husband[w] = m));
    const out = [];
    for (let m = 0; m < n; m++) for (let w = 0; w < n; w++) {
      if (wife[m] === w) continue;
      if (mr[m][w] < mr[m][wife[m]] && wr[w][m] < wr[w][husband[w]]) out.push([m, w]);
    }
    return out;
  }
  function permutations(n) {
    const out = [], a = [...Array(n).keys()];
    (function rec(k) { if (k === n) { out.push(a.slice()); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; rec(k + 1); [a[k], a[i]] = [a[i], a[k]]; } })(0);
    return out.sort((x, y) => x.join() < y.join() ? -1 : 1);
  }

  const Engine = { galeShapley, blockingPairs, permutations, rankTables };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  if (typeof window === "undefined") return;

  /* =====================================================================
     UI
     ===================================================================== */
  const F = window.Forge;
  const $ = (id) => document.getElementById(id);
  F.page({ title: "Stable Marriage", chapter: "Ch 10 · Iterative Improvement" });

  const MEN = ["Bob", "Jim", "Tom", "Dan", "Sam"], WOMEN = ["Ann", "Lea", "Sue", "Eve", "Kim"];
  const PRESETS = {
    course: "Bob: Lea Ann Sue\nJim: Lea Sue Ann\nTom: Sue Lea Ann\nAnn: Jim Tom Bob\nLea: Tom Bob Jim\nSue: Jim Tom Bob",
    cyclic: "Bob: Ann Lea Sue\nJim: Lea Sue Ann\nTom: Sue Ann Lea\nAnn: Jim Tom Bob\nLea: Tom Bob Jim\nSue: Bob Jim Tom",
  };
  const LINES_M = [
    "ALGORITHM StableMarriage(men, women)",
    "    mark every man and woman free",
    "    while some man m is free do",
    "        w ← best woman m hasn't proposed to",
    "        if w is free then",
    "            match m and w",
    "        else if w prefers m to her mate m′ then",
    "            match m and w; m′ becomes free",
    "        else",
    "            w rejects m   // m stays free",
    "    return the n matched pairs",
  ];
  const LINES_W = [
    "ALGORITHM StableMarriage(women, men)",
    "    mark every woman and man free",
    "    while some woman w is free do",
    "        m ← best man w hasn't proposed to",
    "        if m is free then",
    "            match w and m",
    "        else if m prefers w to his mate w′ then",
    "            match w and m; w′ becomes free",
    "        else",
    "            m rejects w   // w stays free",
    "    return the n matched pairs",
  ];

  let inst = null, code = null, lastFrame = null, results = {};
  let build = []; // build[m] = w or -1 (learner's matching)
  const ctr = F.counters($("ctr"), { proposals: 0, rejections: 0, "free proposers": 0 });
  const say = F.narrate($("say"));
  const stage = $("stage");

  /* ---- predict ---- */
  const predictBox = $("predict");
  let askKey = null;
  function showAsk(ask, k) {
    if (!ask) { if (askKey !== null) { predictBox.innerHTML = '<span class="muted small">Before every response you can predict: accept or reject?</span>'; askKey = null; } return; }
    if (askKey === k) return;
    askKey = k;
    predictBox.innerHTML = "";
    const res = F.el("div", { class: "res" }), opts = F.el("div", { class: "opts" });
    ask.options.forEach((o) => opts.appendChild(F.el("button", { class: "btn sm", onclick: (e) => {
      const ok = o === ask.answer;
      opts.querySelectorAll("button").forEach((b) => (b.disabled = true));
      e.target.classList.add(ok ? "steel" : "primary");
      res.innerHTML = `${ok ? "✅ Yes!" : `❌ Not quite — ${ask.answer}.`} ${ask.explain}`;
    } }, o)));
    predictBox.append(F.el("div", { class: "q" }, "🤔 Predict: " + ask.q), opts, res);
    if ($("pausePredict").checked) player.pause();
  }

  /* ---- parsing ---- */
  function parse(text, n) {
    const men = MEN.slice(0, n), women = WOMEN.slice(0, n);
    const mp = Array(n), wp = Array(n);
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^(\w+)\s*:\s*(.*)$/);
      if (!m) throw new Error(`"${line}" should look like "Bob: Lea Ann Sue"`);
      const who = m[1], list = m[2].split(/[\s,]+/).filter(Boolean);
      const isMan = men.includes(who), isWoman = women.includes(who);
      if (!isMan && !isWoman) throw new Error(`unknown name "${who}" (use ${men.join(", ")} / ${women.join(", ")})`);
      const other = isMan ? women : men;
      const idx = list.map((x) => other.indexOf(x));
      if (idx.length !== n || idx.some((k) => k < 0) || new Set(idx).size !== n) throw new Error(`${who}'s list must rank each of ${other.join(", ")} exactly once`);
      (isMan ? mp : wp)[(isMan ? men : women).indexOf(who)] = idx;
    }
    const missing = men.filter((_, k) => !mp[k]).concat(women.filter((_, k) => !wp[k]));
    if (missing.length) throw new Error(`missing a list for ${missing.join(", ")}`);
    return { men, women, mp, wp };
  }
  function toText(I) {
    return I.men.map((m, k) => `${m}: ${I.mp[k].map((w) => I.women[w]).join(" ")}`).concat(I.women.map((w, k) => `${w}: ${I.wp[k].map((m) => I.men[m]).join(" ")}`)).join("\n");
  }

  /* ---- drawing ---- */
  function draw(f) {
    const n = inst.men.length;
    const W = 600, H = 70 + n * 64;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const S = F.svg;
    stage.appendChild(S("defs", null, S("marker", { id: "sm-a", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: "var(--c-compare)" }))));
    const y = (k) => 56 + k * 64;
    const mx = 150, wx = 450, bw = 92, bh = 36;
    stage.appendChild(S("text", { x: mx, y: 26, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)", "font-weight": 700 }, "MEN"));
    stage.appendChild(S("text", { x: wx, y: 26, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)", "font-weight": 700 }, "WOMEN"));
    const menSide = $("side").value === "men";
    f.pairs.forEach(([m, w]) => stage.appendChild(S("line", { x1: mx + bw / 2, y1: y(m), x2: wx - bw / 2, y2: y(w), stroke: "var(--c-done)", "stroke-width": 5, "stroke-linecap": "round" })));
    if (f.dumped) { const [m, w] = f.dumped; stage.appendChild(S("line", { x1: mx + bw / 2, y1: y(m), x2: wx - bw / 2, y2: y(w), stroke: "var(--c-swap)", "stroke-width": 3, "stroke-dasharray": "5 5" })); }
    if (f.prop && !f.resp) {
      const [m, w] = f.prop;
      const [x1, y1, x2, y2] = menSide ? [mx + bw / 2, y(m), wx - bw / 2 - 6, y(w)] : [wx - bw / 2, y(w), mx + bw / 2 + 6, y(m)];
      stage.appendChild(S("path", { d: `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 - 30} ${x2} ${y2}`, stroke: "var(--c-compare)", "stroke-width": 3.5, fill: "none", "stroke-dasharray": "8 5", "marker-end": "url(#sm-a)" }));
    }
    if (f.resp === "reject") {
      const [m, w] = f.prop; const cx = (mx + wx) / 2, cy = (y(m) + y(w)) / 2;
      stage.appendChild(S("line", { x1: mx + bw / 2, y1: y(m), x2: wx - bw / 2, y2: y(w), stroke: "var(--c-swap)", "stroke-width": 2.5, "stroke-dasharray": "3 5" }));
      stage.appendChild(S("text", { x: cx, y: cy + 8, "text-anchor": "middle", "font-size": 26, "font-weight": 800, fill: "var(--c-swap)" }, "✕"));
    }
    const freeNames = new Set(f.free);
    const box = (name, x, yy, isFree, hl) => {
      stage.appendChild(S("rect", { x: x - bw / 2, y: yy - bh / 2, width: bw, height: bh, rx: 10, fill: hl ? "var(--c-compare)" : isFree ? "var(--panel-2)" : "var(--c-done)", stroke: isFree ? "var(--line-2)" : "var(--c-done)", "stroke-width": 2, "stroke-dasharray": isFree ? "5 4" : "" }));
      stage.appendChild(S("text", { x, y: yy + 5, "text-anchor": "middle", "font-size": 15, "font-weight": 800, fill: hl || !isFree ? "#0d1117" : "var(--ink)" }, name));
    };
    const matchedM = new Set(f.pairs.map((p) => p[0])), matchedW = new Set(f.pairs.map((p) => p[1]));
    inst.men.forEach((name, k) => box(name, mx, y(k), !matchedM.has(k), f.prop && !f.resp && f.prop[0] === k));
    inst.women.forEach((name, k) => box(name, wx, y(k), !matchedW.has(k), f.prop && !f.resp && f.prop[1] === k));
    void freeNames;
    // free list
    const fl = $("freelist"); fl.innerHTML = "";
    fl.appendChild(F.el("span", { class: "small muted" }, `Free ${menSide ? "men" : "women"}: `));
    if (!f.free.length) fl.appendChild(F.el("span", { class: "small muted" }, "none"));
    f.free.forEach((p) => fl.appendChild(F.el("span", { class: "chip steel" }, p)));
    drawMatrix($("matrix"), f, null);
  }

  /** Ranking matrix. f = frame (or null); mode "build" makes cells clickable for the blocking-pair checker. */
  function drawMatrix(host, f, buildMode) {
    const n = inst.men.length, { mr, wr } = rankTables(inst);
    host.innerHTML = "";
    const tb = F.el("table", { class: "t rank" }, F.el("tr", null, F.el("th", null, ""), inst.women.map((w) => F.el("th", null, w))));
    const pairSet = new Set((f ? f.pairs : []).map(([m, w]) => m + "," + w));
    const rej = new Set((f ? f.rejected : []).map(([m, w]) => m + "," + w));
    const blocking = buildMode ? new Set(buildMode.blocking.map(([m, w]) => m + "," + w)) : new Set();
    inst.men.forEach((mn, m) => {
      const tr = F.el("tr", null, F.el("th", null, mn));
      inst.women.forEach((wn, w) => {
        const k = m + "," + w;
        const td = F.el("td", null, `${mr[m][w]}, ${wr[w][m]}`);
        if (f && f.prop && f.prop[0] === m && f.prop[1] === w) td.className = "hl";
        else if (pairSet.has(k)) td.classList.add("pair");
        else if (rej.has(k)) td.classList.add("rej");
        if (buildMode) {
          if (build[m] === w) td.classList.add("pair");
          if (blocking.has(k)) td.classList.add("block");
          td.style.cursor = "pointer";
          td.tabIndex = 0;
          td.setAttribute("aria-label", `pair ${mn} with ${wn}`);
          const act = () => { const old = build.indexOf(w); if (old >= 0) build[old] = -1; build[m] = build[m] === w ? -1 : w; checkBuild(); };
          td.addEventListener("click", act);
          td.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
        }
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    host.appendChild(tb);
  }

  /* ---- blocking-pair checker ---- */
  function checkBuild() {
    const n = inst.men.length;
    const out = $("bpResult");
    const unassigned = inst.men.filter((_, m) => build[m] < 0);
    let blocking = [];
    if (!unassigned.length) blocking = blockingPairs(inst, build);
    drawMatrix($("bpMatrix"), null, { blocking });
    const { mr, wr } = rankTables(inst);
    const husband = Array(n); build.forEach((w, m) => { if (w >= 0) husband[w] = m; });
    const cur = build.map((w, m) => (w >= 0 ? `(${inst.men[m]}, ${inst.women[w]})` : null)).filter(Boolean).join(", ");
    if (unassigned.length) {
      out.className = "callout steel";
      out.innerHTML = `Your matching so far: ${cur || "∅"}. Click cells to pair up ${unassigned.join(", ")} too.`;
      return;
    }
    if (!blocking.length) {
      out.className = "callout ok";
      out.innerHTML = `<b>Stable ✔</b> — {${cur}} has no blocking pair: for every unmatched man–woman pair, at least one of them prefers their own partner.`;
    } else {
      out.className = "callout bad";
      out.innerHTML = `<b>Unstable ✘</b> — {${cur}} has ${blocking.length} blocking pair${blocking.length > 1 ? "s" : ""} (red cells):<ul style="margin:6px 0 0">${blocking.map(([m, w]) => `<li>(${inst.men[m]}, ${inst.women[w]}): ${inst.men[m]} ranks ${inst.women[w]} #${mr[m][w]} over his partner ${inst.women[build[m]]} #${mr[m][build[m]]}, and ${inst.women[w]} ranks ${inst.men[m]} #${wr[w][m]} over her partner ${inst.men[husband[w]]} #${wr[w][husband[w]]}.</li>`).join("")}</ul>`;
    }
  }
  function allTable() {
    const host = $("allm"); host.innerHTML = "";
    const n = inst.men.length;
    const perms = permutations(n);
    const tb = F.el("table", { class: "t" }, F.el("tr", null, F.el("th", null, "matching"), F.el("th", null, "blocking pairs"), F.el("th", null, "stable?")));
    let stable = 0;
    perms.forEach((p) => {
      const b = blockingPairs(inst, p);
      if (!b.length) stable++;
      const tr = F.el("tr", null, F.el("td", { style: { textAlign: "left" } }, p.map((w, m) => `(${inst.men[m]}, ${inst.women[w]})`).join(" ")), F.el("td", { style: { textAlign: "left" } }, b.map(([m, w]) => `(${inst.men[m]}, ${inst.women[w]})`).join(" ") || "none"), F.el("td", { class: b.length ? "" : "done" }, b.length ? "✘" : "✔"));
      tr.style.cursor = "pointer";
      tr.title = "load into the checker";
      tr.addEventListener("click", () => { build = p.slice(); checkBuild(); $("bpMatrix").scrollIntoView({ block: "nearest", behavior: "smooth" }); });
      tb.appendChild(tr);
    });
    host.appendChild(F.el("p", { class: "small muted" }, `${perms.length} = ${n}! matchings, ${stable} stable. Click a row to load it into the checker.`));
    host.appendChild(tb);
  }

  function compareText() {
    const a = results.men, b = results.women;
    if (!a || !b) return "";
    const { mr, wr } = rankTables(inst);
    const wifeA = Array(inst.men.length), wifeB = Array(inst.men.length);
    a.forEach(([m, w]) => (wifeA[m] = w)); b.forEach(([m, w]) => (wifeB[m] = w));
    const same = wifeA.every((w, m) => w === wifeB[m]);
    const row = (wife) => inst.men.map((mn, m) => `${mn}–${inst.women[wife[m]]} (${mr[m][wife[m]]}, ${wr[wife[m]][m]})`).join(", ");
    return `<b>Men propose</b> → ${row(wifeA)}.<br><b>Women propose</b> → ${row(wifeB)}.<br>${same ? "Both give the same matching, so this instance has exactly one stable matching." : "Different! Men proposing gives every man his best possible stable partner (and every woman her worst); women proposing flips that. (Cells show man's rank, woman's rank.)"}`;
  }

  function render(f, i) {
    lastFrame = f;
    draw(f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text + (f.done ? `<div class="small" style="margin-top:8px">${compareText()}</div>` : ""));
    showAsk(f.ask, i);
  }
  const player = F.player($("player"), { frames: [], render, fps: 1 });

  function load() {
    $("err").textContent = "";
    const n = +$("n").value;
    try { inst = parse($("prefs").value, n); } catch (e) { $("err").textContent = "⚠ " + e.message; return; }
    const side = $("side").value;
    $("code").innerHTML = "";
    code = F.code($("code"), side === "men" ? LINES_M : LINES_W);
    results.men = galeShapley(inst, "men", { ask: false }).pairs;
    results.women = galeShapley(inst, "women", { ask: false }).pairs;
    const run = galeShapley(inst, side);
    askKey = "x";
    player.load(run.frames);
    build = Array(n).fill(-1);
    checkBuild();
    if ($("allbox").open) allTable();
  }
  function randomPrefs(n) {
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const I = { men: MEN.slice(0, n), women: WOMEN.slice(0, n) };
    I.mp = I.men.map(() => shuffle([...Array(n).keys()]));
    I.wp = I.women.map(() => shuffle([...Array(n).keys()]));
    return toText(I);
  }
  $("preset").onchange = () => { const k = $("preset").value; if (PRESETS[k]) { $("n").value = 3; $("prefs").value = PRESETS[k]; load(); } };
  $("n").onchange = () => { $("preset").value = "random"; $("prefs").value = randomPrefs(+$("n").value); load(); };
  $("rand").onclick = () => { $("preset").value = "random"; $("prefs").value = randomPrefs(+$("n").value); load(); };
  $("load").onclick = load;
  $("side").onchange = load;
  $("useM").onclick = () => { build = Array(inst.men.length).fill(-1); results.men.forEach(([m, w]) => (build[m] = w)); checkBuild(); };
  $("useW").onclick = () => { build = Array(inst.men.length).fill(-1); results.women.forEach(([m, w]) => (build[m] = w)); checkBuild(); };
  $("clearB").onclick = () => { build = Array(inst.men.length).fill(-1); checkBuild(); };
  $("allbox").addEventListener("toggle", () => { if ($("allbox").open) allTable(); });
  $("prefs").value = PRESETS.course;
  load();
})();
