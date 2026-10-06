/* =====================================================================
   Algorithm Forge — Skip list (Ch 18)
   Towers on levels; search path with right/down moves; insert with coin
   flips (seeded random or typed) and pointer splicing; delete; measured
   comparison with balanced / random BSTs.
   The list is stored as a sorted array of {key, h}; the level-i forward
   pointer of a node is "the next node to the right whose height > i".
   ===================================================================== */
(function () {
  "use strict";
  Forge.page({ title: "Skip List", chapter: "Ch 18 · The Frontier" });
  const $ = (id) => document.getElementById(id);
  const S = (tag, a, ...k) => {
    if (tag === "text" && a && a.fill) { a = Object.assign({}, a); a.style = "fill:" + a.fill; delete a.fill; }
    return Forge.svg(tag, a, ...k);
  };
  const COL = FX.COL;
  const say = Forge.narrate($("say"));
  const codes = FX.codeSwitch($("code"));
  let player = null;
  const pred = FX.predict($("pred"), () => player);
  const ctr = Forge.counters($("ctr"), { "n keys": 0, level: 1, "right moves": 0, "down moves": 0, comparisons: 0, "log₂ n": "–", "Pugh bound": "–", "pointers / key": "–" });
  const log2 = (x) => Math.log(x) / Math.LN2;
  const MAXL = 12;

  const LINES = {
    search: [
      "ALGORITHM SkipSearch(L, key)",
      "    x ← L.head",
      "    for i ← L.level − 1 downto 0 do",
      "        while x.next[i].key < key do",
      "            x ← x.next[i]          // move right",
      "        // x.next[i].key ≥ key: move down",
      "    x ← x.next[0]",
      "    if x.key = key then return x",
      "    else return null",
    ],
    insert: [
      "ALGORITHM SkipInsert(L, key)",
      "    x ← L.head",
      "    for i ← L.level − 1 downto 0 do",
      "        while x.next[i].key < key do",
      "            x ← x.next[i]",
      "        update[i] ← x",
      "    if x.next[0].key = key then return",
      "    h ← 1",
      "    while h < MaxLevel and random() < p do",
      "        h ← h + 1               // heads: promote",
      "    if h > L.level then",
      "        for i ← L.level to h − 1 do update[i] ← L.head",
      "        L.level ← h",
      "    y ← new node(key, h)",
      "    for i ← 0 to h − 1 do",
      "        y.next[i] ← update[i].next[i]",
      "        update[i].next[i] ← y",
    ],
    del: [
      "ALGORITHM SkipDelete(L, key)",
      "    x ← L.head",
      "    for i ← L.level − 1 downto 0 do",
      "        while x.next[i].key < key do",
      "            x ← x.next[i]",
      "        update[i] ← x",
      "    x ← x.next[0]",
      "    if x.key = key then",
      "        for i ← 0 to x.height − 1 do",
      "            update[i].next[i] ← x.next[i]",
      "        while L.level > 1 and L.head.next[L.level − 1] = NIL do",
      "            L.level ← L.level − 1",
    ],
  };

  const SL = { p: 0.5, list: [], level: 1, rng: Forge.rng(7) };

  function levelOf(list) { return Math.max(1, ...list.map((x) => x.h)); }
  /** index of the next node right of column c (−1 = head) linked on level l; list.length = NIL */
  function nextAt(list, c, l) {
    for (let j = c + 1; j < list.length; j++) {
      const x = list[j];
      if (x.h > l && (x.ghost ? l < x.spliced : true) && !(x.del && l < x.unlinked)) return j;
    }
    return list.length;
  }
  function ptrs(list) { return list.reduce((s, x) => s + x.h, 0); }
  function baseCtr(extra) {
    const n = SL.list.length;
    const L1p = n > 1 ? Math.log(n) / Math.log(1 / SL.p) : 0;
    return Object.assign({
      "n keys": n, level: SL.level, "right moves": 0, "down moves": 0, comparisons: 0,
      "log₂ n": n ? log2(n).toFixed(2) : "–",
      "Pugh bound": n > 1 ? (L1p / SL.p + 1 / (1 - SL.p)).toFixed(1) : "–",
      "pointers / key": n ? (ptrs(SL.list) / n).toFixed(2) + " ~" + +(1 / (1 - SL.p)).toFixed(2) : "–",
    }, extra);
  }
  function snap(o) {
    return Object.assign({ list: SL.list.map((x) => Object.assign({}, x)), level: SL.level, path: [], boxHL: {}, linkHL: {}, nodeHL: {}, update: {}, ctr: baseCtr() }, o);
  }

  /** shared descent; records frames; returns {c, update, rights, downs, comps, path} */
  function descend(key, frames, op, wantAsk) {
    const list = SL.list, n = list.length;
    let c = -1, rights = 0, downs = 0, comps = 0, asked = !wantAsk;
    const path = [{ c: -1, l: SL.level - 1 }], update = {};
    const kname = (j) => (j >= n ? "NIL (+∞)" : String(list[j].key));
    // during the descent the counters come from the local variables; descend() returns a live record (see the end)
    const cnt = () => ({ "right moves": rights, "down moves": downs, comparisons: comps });
    frames.push(snap({ op, line: 1, path: path.slice(), boxHL: { [`-1:${SL.level - 1}`]: "active" }, ctr: baseCtr(cnt()),
      text: `${op === "search" ? "Search for" : op === "insert" ? "Insert" : "Delete"} <b>${key}</b>. Start at the top of head, on level ${SL.level - 1}, the fastest lane.` }));
    for (let l = SL.level - 1; l >= 0; l--) {
      for (;;) {
        const nx = nextAt(list, c, l);
        const nk = nx < n ? list[nx].key : Infinity;
        comps++;
        const hl = { [`${c}:${l}`]: "active", [`${nx}:${l}`]: "compare" };
        const upd = op === "search" ? {} : Object.assign({}, update);
        let ask = null;
        if (!asked && nx < n) {
          asked = true;
          const right = nk < key;
          ask = {
            q: `On level ${l}, the next key after ${c < 0 ? "head" : list[c].key} is ${nk}. The target is ${key}. Which way?`,
            opts: ["→ move right", "↓ move down"], ans: right ? 0 : 1,
            why: right ? `${nk} < ${key}, so everything up to ${nk} is too small: riding this lane to ${nk} skips the keys in between.` : `${nk} ≥ ${key}: moving right would overshoot the target, so drop to a slower lane that has more keys in between.`,
          };
        }
        if (nk < key) {
          frames.push(snap({ op, line: [3, 4], path: path.slice(), boxHL: hl, linkHL: { [`${c}:${l}`]: "active" }, update: upd, ask, ctr: baseCtr(cnt()),
            text: `Level ${l}: next key ${nk} < ${key} → move right to ${nk}.` }));
          c = nx; rights++;
          path.push({ c, l });
        } else {
          update[l] = c;
          const isIns = op !== "search";
          frames.push(snap({ op, line: isIns ? [3, 5] : [3, 5], path: path.slice(), boxHL: hl, update: op === "search" ? {} : Object.assign({}, update), ask, ctr: baseCtr(cnt()),
            text: `Level ${l}: next is ${kname(nx)} ≥ ${key} → ${l > 0 ? "drop down a level" : "stop: we are at the bottom"}.${isIns ? ` Remember update[${l}] = ${c < 0 ? "head" : list[c].key}.` : ""}` }));
          if (l > 0) { downs++; path.push({ c, l: l - 1 }); }
          break;
        }
      }
    }
    // Return a live record: the counters are read from it, so later d.comps++ (the final equality test) shows up too.
    const d = { c, update, rights, downs, comps, path };
    d.cnt = () => ({ "right moves": d.rights, "down moves": d.downs, comparisons: d.comps });
    return d;
  }

  function recSearch(key, frames, ask) {
    const d = descend(key, frames, "search", ask);
    const list = SL.list, n = list.length;
    const x = nextAt(list, d.c, 0);
    d.comps++;
    const found = x < n && list[x].key === key;
    const lg = n ? log2(n).toFixed(1) : "0";
    frames.push(snap({ op: "search", line: found ? [6, 7] : [6, 8], path: d.path.slice(), boxHL: { [`${x}:0`]: found ? "done" : "compare" }, nodeHL: found ? { [x]: "done" } : {},
      ctr: baseCtr(d.cnt()),
      text: `${found ? `Found <b>${key}</b>.` : `Next key is ${x < n ? list[x].key : "NIL"}, not ${key}: <b>${key}</b> is not in the list.`} Path: ${d.rights} right + ${d.downs} down moves, ${d.comps} comparisons, for n = ${n} (log₂ n ≈ ${lg}). A plain sorted linked list would have walked ${found ? x + 1 : x} nodes.` }));
  }

  /** Typed coin flips: null = random; false = invalid (an error is shown). */
  function takeFlips() {
    const raw = $("flips").value;
    const bad = raw.replace(/[\s,;]/g, "").toUpperCase().replace(/[HT]/g, "");
    if (bad) { showMsg(`Coin flips may only use H (heads: promote) and T (tails: stop); found ${short([...new Set(bad)].join(""))}. Leave the box blank for random flips.`, false, "flips"); return false; }
    const t = raw.toUpperCase().replace(/[^HT]/g, "");
    return t.length ? t : null;
  }
  function recInsert(key, frames, ask, flipsStr) {
    const d = descend(key, frames, "insert", ask);
    const list = SL.list, n = list.length;
    const x = nextAt(list, d.c, 0);
    d.comps++; // line 6: x.next[0].key = key ?
    if (x < n && list[x].key === key) {
      frames.push(snap({ op: "insert", line: 6, path: d.path, boxHL: { [`${x}:0`]: "done" }, ctr: baseCtr(d.cnt()), text: `${key} is already in the list. Nothing to insert.` }));
      return false;
    }
    // coin flips
    const flips = [];
    let h = 1, k = 0, coinAsked = !ask || !!flipsStr;
    const pos = x; // insertion index
    const ghost = { key, h: 1, ghost: true, spliced: 0 };
    list.splice(pos, 0, ghost);
    const shift = (u) => { const o = {}; for (const l in u) o[l] = u[l] >= pos ? u[l] + 1 : u[l]; return o; };
    const upd = shift(d.update);
    const coinText = () => flips.map((f) => `<span class="coin ${f === "H" ? "h" : "t"}">${f}</span>`).join("") + ` → height <b>${h}</b>`;
    const pStr = SL.p === 0.5 ? "1/2" : "1/4";
    frames.push(snap({ op: "insert", line: 7, nodeHL: { [pos]: "pivot" }, update: upd, calc: `coin flips: ${coinText()}`, ctr: baseCtr(d.cnt()),
      ask: coinAsked ? null : { q: `With p = ${pStr}, what is the chance that this new tower ends up with height ≥ 3?`, opts: [pStr, SL.p === 0.5 ? "1/4" : "1/16", "1/3"], ans: 1, why: `It needs two heads in a row: p × p = ${SL.p === 0.5 ? "1/4" : "1/16"}. In general height ≥ k has probability p^(k−1), which is why each level holds about a fraction p of the level below.` },
      text: `Not present: the new key goes right after ${d.c < 0 ? "head" : list[d.c].key} on level 0. Its tower starts at height 1; now flip coins (heads with probability p = ${pStr}).` }));
    for (;;) {
      if (h >= MAXL) break;
      let f;
      if (flipsStr) f = k < flipsStr.length ? flipsStr[k] : "T";
      else f = SL.rng() < SL.p ? "H" : "T";
      k++;
      flips.push(f);
      if (f === "H") { h++; ghost.h = h; }
      frames.push(snap({ op: "insert", line: f === "H" ? [8, 9] : 8, nodeHL: { [pos]: "pivot" }, update: upd, calc: `coin flips: ${coinText()}`, ctr: baseCtr(d.cnt()),
        text: f === "H" ? `Heads → promote: the tower grows to height ${h}.` : `Tails → stop. The new tower has height ${h}${h === 1 ? " (about half of all keys stay at height 1 when p = 1/2)" : ""}.` }));
      if (f === "T") break;
    }
    const calc = `coin flips: ${coinText()}`;
    if (h > SL.level) {
      for (let l = SL.level; l < h; l++) upd[l] = -1;
      frames.push(snap({ op: "insert", line: [10, 11, 12], nodeHL: { [pos]: "pivot" }, update: Object.assign({}, upd), calc, level: h, ctr: baseCtr(d.cnt()),
        text: `Height ${h} is taller than the list (level ${SL.level}). The new top level${h - SL.level > 1 ? "s start" : " starts"} at head, so update[${SL.level}${h - SL.level > 1 ? ".." + (h - 1) : ""}] = head and the list's level becomes ${h}.` }));
      SL.level = h;
    }
    for (let l = 0; l < h; l++) {
      ghost.spliced = l + 1;
      const u = upd[l];
      frames.push(snap({ op: "insert", line: [14, 15, 16], nodeHL: { [pos]: "pivot" }, update: Object.assign({}, upd), calc, ctr: baseCtr(d.cnt()),
        linkHL: { [`${u}:${l}`]: "swap", [`${pos}:${l}`]: "swap" },
        text: `Level ${l}: the new node points to what ${u < 0 ? "head" : list[u].key} pointed to (${(() => { const nx = nextAt(list, pos, l); return nx < list.length ? list[nx].key : "NIL"; })()}), then ${u < 0 ? "head" : list[u].key} points to ${key}. Two pointer writes, no rotations.` }));
    }
    delete ghost.ghost; delete ghost.spliced;
    frames.push(snap({ op: "insert", line: null, nodeHL: { [pos]: "done" }, calc, ctr: baseCtr(d.cnt()),
      text: `Inserted <b>${key}</b> with height ${h}: ${d.rights + d.downs} moves to find the spot, ${2 * h} pointer writes to splice it in. Expected work O(log n), and nothing else in the list moved.` }));
    return true;
  }

  function recDelete(key, frames, ask) {
    const d = descend(key, frames, "del", ask);
    const list = SL.list, n = list.length;
    const x = nextAt(list, d.c, 0);
    d.comps++; // line 7: x.key = key ?
    if (!(x < n && list[x].key === key)) {
      frames.push(snap({ op: "del", line: [6, 7], path: d.path, boxHL: { [`${x}:0`]: "compare" }, ctr: baseCtr(d.cnt()), text: `${key} is not in the list. Nothing to delete.` }));
      return;
    }
    const node = list[x];
    node.del = true; node.unlinked = 0;
    frames.push(snap({ op: "del", line: [6, 7], path: d.path, nodeHL: { [x]: "swap" }, update: Object.assign({}, d.update), ctr: baseCtr(d.cnt()),
      text: `Found ${key}, a tower of height ${node.h}. Each update[i] (purple) currently points to it on level i; reroute them around it.` }));
    for (let l = 0; l < node.h; l++) {
      node.unlinked = l + 1;
      const u = d.update[l];
      frames.push(snap({ op: "del", line: [8, 9], nodeHL: { [x]: "swap" }, update: Object.assign({}, d.update), linkHL: { [`${u}:${l}`]: "swap" }, ctr: baseCtr(d.cnt()),
        text: `Level ${l}: ${u < 0 ? "head" : list[u].key} now points past ${key} to ${(() => { const nx = nextAt(list, x, l); return nx < list.length ? list[nx].key : "NIL"; })()}.` }));
    }
    list.splice(x, 1);
    const before = SL.level;
    SL.level = levelOf(list);
    frames.push(snap({ op: "del", line: [10, 11], ctr: baseCtr(d.cnt()),
      text: `Deleted <b>${key}</b>.${SL.level < before ? ` The top level${before - SL.level > 1 ? "s are" : " is"} now empty, so the list's level drops from ${before} to ${SL.level}.` : ""} Again only the predecessors' pointers changed.` }));
  }

  /* ---------------- drawing ---------------- */
  function draw(f) {
    const svg = $("stage");
    const list = f.list, n = list.length;
    const shown = Math.max(f.level, levelOf(list));
    // phones: a narrower viewBox so the boxes stay readable after scaling
    const compact = (svg.clientWidth || 760) < 560;
    const rowH = 30, bh = 22, top = 24;
    const x0 = compact ? 66 : 90, sw = compact ? 30 : 36;
    const colW = compact ? 36 : Math.min(60, (760 - 150) / Math.max(n, 1));
    const W = compact ? Math.max(360, x0 + n * colW + 60) : 760;
    const bw = Math.max(16, Math.min(compact ? 32 : 40, colW - (compact ? 4 : 8)));
    const H = top + shown * rowH + 44;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    svg.appendChild(S("defs", null, ...["m", "s", "a"].map((k) => S("marker", { id: "sl-" + k, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
      S("path", { d: "M0 0 L10 5 L0 10 z", fill: { m: "var(--line-2)", s: "var(--c-swap)", a: "var(--steel)" }[k] })))));
    const X = (c) => (c < 0 ? x0 - 30 - (compact ? 0 : 20) : c >= n ? x0 + n * colW + 14 + bw / 2 : x0 + c * colW + bw / 2);
    const Y = (l) => top + (shown - 1 - l) * rowH + bh / 2;
    const fsz = bw < 26 ? 9.5 : compact ? 13 : 12;
    // level labels
    for (let l = 0; l < shown; l++) svg.appendChild(S("text", { x: 4, y: Y(l) + 4, "font-size": 9.5, fill: "var(--muted)" }, "L" + l));
    // links
    for (let l = 0; l < shown; l++) {
      if (l >= f.level) continue;
      let c = -1;
      for (;;) {
        const nx = nextAt(list, c, l);
        const st = f.linkHL[`${c}:${l}`];
        const x1 = X(c) + (c < 0 ? sw / 2 : bw / 2), x2 = X(nx) - (nx >= n ? sw / 2 : bw / 2) - 2;
        svg.appendChild(S("line", { x1, y1: Y(l), x2, y2: Y(l), stroke: st === "swap" ? "var(--c-swap)" : st === "active" ? "var(--steel)" : "var(--line-2)", "stroke-width": st ? 3 : 1.5, "marker-end": `url(#sl-${st === "swap" ? "s" : st === "active" ? "a" : "m"})` }));
        if (nx >= n) break;
        c = nx;
      }
    }
    // search path
    if (f.path && f.path.length > 1) {
      svg.appendChild(S("polyline", { points: f.path.map((p) => `${X(p.c)},${Y(p.l)}`).join(" "), fill: "none", stroke: "var(--ember)", "stroke-width": 5, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.6 }));
    }
    // sentinels
    const sentinel = (c, label) => {
      for (let l = 0; l < shown; l++) {
        const st = f.boxHL[`${c}:${l}`] || (f.update && Object.keys(f.update).some((k) => +k === l && f.update[k] === c) ? "pivot" : null);
        const dim = l >= f.level;
        svg.appendChild(S("rect", { x: X(c) - sw / 2, y: Y(l) - bh / 2, width: sw, height: bh, rx: 4, fill: st ? COL[st] : "var(--panel-2)", stroke: st ? COL[st] : "var(--line-2)", opacity: dim ? 0.35 : 1 }));
      }
      svg.appendChild(S("text", { x: X(c), y: Y(0) + bh / 2 + 15, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--muted)" }, label));
    };
    sentinel(-1, "head");
    sentinel(n, "NIL");
    // towers
    list.forEach((nd, c) => {
      const ns = f.nodeHL[c];
      for (let l = 0; l < nd.h; l++) {
        let st = f.boxHL[`${c}:${l}`] || ns || null;
        if (!f.boxHL[`${c}:${l}`] && f.update && f.update[l] === c) st = "pivot";
        const ghostTop = nd.ghost && l >= nd.spliced;
        svg.appendChild(S("rect", { x: X(c) - bw / 2, y: Y(l) - bh / 2, width: bw, height: bh, rx: 4, fill: st ? COL[st] : "var(--panel-2)", stroke: st ? COL[st] : "var(--line-2)", "stroke-dasharray": ghostTop ? "4 3" : null, "fill-opacity": ghostTop ? 0.55 : 1 }));
        if (l === 0 || bw >= 26) svg.appendChild(S("text", { x: X(c), y: Y(l) + 4, "text-anchor": "middle", "font-size": fsz, "font-weight": 700, fill: st ? "#0d1117" : "var(--ink)" }, String(nd.key)));
      }
      svg.appendChild(S("text", { x: X(c), y: Y(0) + bh / 2 + 15, "text-anchor": "middle", "font-size": 9.5, fill: "var(--muted)" }, "h" + nd.h));
    });
  }

  function render(f, i) {
    draw(f);
    codes.show(f.op || "search", LINES[f.op || "search"]).highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    $("calc").innerHTML = f.calc || `n = ${f.list.length}, level = ${f.level}, p = ${SL.p === 0.5 ? "1/2" : "1/4"}; tallest tower ${levelOf(f.list)} vs log<sub>1/p</sub> n ≈ ${f.list.length > 1 ? (Math.log(f.list.length) / Math.log(1 / SL.p)).toFixed(1) : "0"}`;
    pred.update(f, i);
  }
  player = Forge.player($("player"), { frames: [], render, fps: 2 });
  let rz = null;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { const f = player.frames[player.index]; if (f) draw(f); }, 150); });
  function load(frames) { pred.reset(); player.load(frames); }
  function idle(text, op) { return snap({ op: op || "search", line: null, text }); }

  /* ---------------- controls ---------------- */
  /* Inline input messages: errors stop the action; notes explain a harmless adjustment. */
  function showMsg(msg, isNote, fieldId) {
    const e = $("inpErr");
    e.textContent = msg || "";
    e.hidden = !msg;
    e.classList.toggle("note", !!isNote);
    ["key", "flips", "keys"].forEach((id) => $(id).setAttribute("aria-invalid", msg && !isNote && id === fieldId ? "true" : "false"));
    if (msg && !isNote && fieldId) $(fieldId).focus();
  }
  const short = (t) => `“${t.length > 12 ? t.slice(0, 12) + "…" : t}”`;
  const parseKey = () => {
    const t = $("key").value.trim();
    if (!t) { showMsg("Type a key first: a whole number from 0 to 999.", false, "key"); return null; }
    if (!/^[+-]?\d+$/.test(t)) { showMsg(`${short(t)} is not a whole number. Keys are integers from 0 to 999.`, false, "key"); return null; }
    const v = parseInt(t, 10);
    if (v < 0 || v > 999) { showMsg(`${v} is out of range. Keys are integers from 0 to 999.`, false, "key"); return null; }
    showMsg("");
    return v;
  };
  /** Build list: returns the keys or null (after showing an error). */
  function parseKeyList() {
    const s = $("keys").value.trim().replace(/[\s,;]+$/, "");
    if (!s) { showMsg("The key list is empty. Type some integers from 0 to 999, separated by commas.", false, "keys"); return null; }
    const toks = s.split(/\s*[,;]\s*|\s+/);
    const bad = toks.filter((t) => t !== "" && !/^[+-]?\d+$/.test(t));
    const probs = [];
    if (bad.length) probs.push(`Not a whole number: ${bad.slice(0, 3).map(short).join(", ")}${bad.length > 3 ? ` and ${bad.length - 3} more` : ""}. Keys are integers from 0 to 999.`);
    if (toks.some((t) => t === "")) probs.push("Two commas in a row: there is an empty entry; remove the extra comma or put a key there.");
    if (probs.length) { showMsg(probs.join(" "), false, "keys"); return null; }
    const ks = toks.map((t) => parseInt(t, 10));
    const out = ks.filter((k) => k < 0 || k > 999);
    if (out.length) { showMsg(`Out of range: ${out.slice(0, 3).join(", ")}. Keys are integers from 0 to 999.`, false, "keys"); return null; }
    const uniq = [...new Set(ks)];
    const notes = [];
    if (uniq.length < ks.length) notes.push(`${ks.length - uniq.length} duplicate key${ks.length - uniq.length > 1 ? "s" : ""} dropped (a skip list stores each key once)`);
    if (uniq.length > 40) notes.push(`only the first 40 distinct keys are used`);
    showMsg(notes.length ? "Note: " + notes.join("; ") + "." : "", true);
    return ks;
  }
  function reseed() { SL.rng = Forge.rng((+$("seed").value || 1) >>> 0); }
  function randHeight() { let h = 1; while (h < MAXL && SL.rng() < SL.p) h++; return h; }
  function buildFrom(keys, heights) {
    SL.p = +$("p").value;
    reseed();
    const uniq = [...new Set(keys)].filter((k) => k >= 0 && k <= 999).slice(0, 40);
    const hs = new Map();
    uniq.forEach((k, j) => hs.set(k, heights ? heights[j] : randHeight()));
    SL.list = uniq.slice().sort((a, b) => a - b).map((k) => ({ key: k, h: hs.get(k) }));
    SL.level = levelOf(SL.list);
  }
  $("p").onchange = () => {
    SL.p = +$("p").value;
    load([idle(`p = ${SL.p === 0.5 ? "1/2" : "1/4"} now applies to new coin flips. Press Build to regrow every tower with the new p.`)]);
  };
  $("seed").onchange = () => { reseed(); };
  $("build").onclick = () => {
    const keys = parseKeyList();
    if (!keys) return;
    buildFrom(keys);
    load([idle(`Built ${SL.list.length} keys with random heights (p = ${SL.p === 0.5 ? "1/2" : "1/4"}, seed ${$("seed").value}). Total pointers ${ptrs(SL.list)} = ${(ptrs(SL.list) / Math.max(1, SL.list.length)).toFixed(2)} per key (expected ${(1 / (1 - SL.p)).toFixed(2)}).`)]);
  };
  const EX_KEYS = [3, 6, 7, 9, 12, 17, 19, 21, 25, 26], EX_H = [1, 3, 1, 2, 1, 2, 1, 4, 1, 2];
  function example() {
    showMsg("");
    $("p").value = "0.5"; $("keys").value = EX_KEYS.join(", "); $("key").value = "19"; $("flips").value = "HHT";
    buildFrom(EX_KEYS, EX_H);
    load([idle(`Example: 10 keys with fixed tower heights. Level 0 links every key; level 1 has 6, 9, 17, 21, 26; level 2 has 6 and 21; level 3 only 21. Type a key and press Search, Insert or Delete.`)]);
  }
  $("example").onclick = example;
  $("find").onclick = () => { const k = parseKey(); if (k == null) return; const fr = []; recSearch(k, fr, true); load(fr); };
  $("ins").onclick = () => {
    const k = parseKey(); if (k == null) return;
    const flips = takeFlips();
    if (flips === false) return;
    const fr = []; const ok = recInsert(k, fr, true, flips);
    if (ok && flips) $("flips").value = "";
    load(fr);
  };
  $("del").onclick = () => { const k = parseKey(); if (k == null) return; const fr = []; recDelete(k, fr, true); load(fr); };
  $("rand").onclick = () => {
    const fr = [];
    let added = 0, guard = 0;
    while (added < 5 && guard++ < 200 && SL.list.length < 40) {
      const k = Math.floor(Math.random() * 100);
      if (SL.list.some((x) => x.key === k)) continue;
      recInsert(k, fr, false, null); added++;
    }
    load(fr);
  };

  /* ---------------- measured comparison with BSTs ---------------- */
  class Skip {
    constructor(p, seed) { this.p = p; this.r = Forge.rng(seed); this.head = { key: -Infinity, next: Array(32).fill(null) }; this.level = 1; this.ptr = 0; this.n = 0; }
    insert(key) {
      const upd = Array(32); let x = this.head;
      for (let i = this.level - 1; i >= 0; i--) { while (x.next[i] && x.next[i].key < key) x = x.next[i]; upd[i] = x; }
      let h = 1; while (h < 32 && this.r() < this.p) h++;
      if (h > this.level) { for (let i = this.level; i < h; i++) upd[i] = this.head; this.level = h; }
      const y = { key, next: Array(h).fill(null) };
      for (let i = 0; i < h; i++) { y.next[i] = upd[i].next[i]; upd[i].next[i] = y; }
      this.ptr += h; this.n++;
    }
    /** comparisons as in the sim: one per "next.key < key" test (NIL counts) + the final equality test */
    cost(key) {
      let x = this.head, c = 0, steps = 0;
      for (let i = this.level - 1; i >= 0; i--) {
        for (;;) { c++; const nx = x.next[i]; if (nx && nx.key < key) { x = nx; steps++; } else break; }
        if (i > 0) steps++;
      }
      return [c + 1, steps];
    }
  }
  function randomBSTAvg(keys) {
    // insert in the given (random) order; average depth+1 over all keys
    const root = { k: keys[0], l: null, r: null };
    let total = 1;
    for (let i = 1; i < keys.length; i++) {
      let x = root, d = 1;
      for (;;) {
        d++;
        if (keys[i] < x.k) { if (!x.l) { x.l = { k: keys[i], l: null, r: null }; break; } x = x.l; }
        else { if (!x.r) { x.r = { k: keys[i], l: null, r: null }; break; } x = x.r; }
      }
      total += d;
    }
    return total / keys.length;
  }
  function balancedAvg(n) {
    // complete BST: level d holds 2^d nodes (last level partial); comparisons = depth + 1
    let total = 0, left = n, d = 0;
    while (left > 0) { const k = Math.min(left, 1 << d); total += k * (d + 1); left -= k; d++; }
    return total / n;
  }
  $("cmp").onclick = () => {
    $("cmpNote").textContent = "measuring…";
    setTimeout(() => {
      const p = +$("p").value;
      const rows = [16, 64, 256, 1024, 4096, 16384].map((n, j) => {
        const T = 5;  // average over 5 independent builds to smooth out the luck of the coins
        let c = 0, st = 0, lev = 0, ptr = 0, rb = 0;
        for (let t = 0; t < T; t++) {
          const r = Forge.rng(Math.imul(j * 7 + t + 1, 0x9e3779b1) >>> 0);
          const keys = Array.from({ length: n }, (_, i) => i);
          for (let i = n - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [keys[i], keys[k]] = [keys[k], keys[i]]; }
          const sk = new Skip(p, Math.imul(j * 7 + t + 101, 0x85ebca6b) >>> 0);
          keys.forEach((k) => sk.insert(k));
          keys.forEach((k) => { const [a1, b1] = sk.cost(k); c += a1; st += b1; });
          lev += sk.level; ptr += sk.ptr / n; rb += randomBSTAvg(keys);
        }
        const L = Math.log(n) / Math.log(1 / p);
        return { n, sk: c / n / T, steps: st / n / T, bound: L / p + 1 / (1 - p), level: lev / T, ptr: ptr / T, rb: rb / T, bal: balancedAvg(n), lg: log2(n) };
      });
      $("cmpTab").innerHTML = "<tr><th>n</th><th>log₂ n</th><th>skip list: comparisons</th><th>skip list: path moves</th><th>Pugh bound on path</th><th>skip list levels (avg)</th><th>pointers / key</th><th>random BST</th><th>balanced BST</th></tr>" +
        rows.map((r) => `<tr><td>${r.n.toLocaleString()}</td><td>${r.lg.toFixed(1)}</td><td>${r.sk.toFixed(1)}</td><td>${r.steps.toFixed(1)}</td><td>${r.bound.toFixed(1)}</td><td>${r.level.toFixed(1)}</td><td>${r.ptr.toFixed(2)}</td><td>${r.rb.toFixed(1)}</td><td>${r.bal.toFixed(1)}</td></tr>`).join("");
      // chart
      const svg = $("cmpChart"); svg.removeAttribute("hidden"); $("cmpLegend").hidden = false;
      const W = 720, H = 280, Lm = 52, R = 14, T = 14, Bm = 40;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
      const ymax = Math.ceil(Math.max(...rows.map((r) => Math.max(r.sk, r.rb))) / 5) * 5;
      const X = (j) => Lm + (j / (rows.length - 1)) * (W - Lm - R);
      const Yv = (v) => H - Bm - (v / ymax) * (H - Bm - T);
      for (let v = 0; v <= ymax; v += 5) {
        svg.appendChild(S("line", { x1: Lm, x2: W - R, y1: Yv(v), y2: Yv(v), stroke: "var(--line)" }));
        svg.appendChild(S("text", { x: Lm - 6, y: Yv(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, String(v)));
      }
      rows.forEach((r, j) => svg.appendChild(S("text", { x: X(j), y: H - Bm + 16, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, r.n.toLocaleString())));
      svg.appendChild(S("text", { x: (Lm + W - R) / 2, y: H - 6, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, "n (log scale) → average comparisons per successful search"));
      [["sk", "var(--ember)"], ["rb", "var(--c-pivot)"], ["bal", "var(--steel)"]].forEach(([k, col]) => {
        svg.appendChild(S("polyline", { points: rows.map((r, j) => `${X(j)},${Yv(r[k])}`).join(" "), fill: "none", stroke: col, "stroke-width": 2.5 }));
        rows.forEach((r, j) => svg.appendChild(S("circle", { cx: X(j), cy: Yv(r[k]), r: 4, fill: col }, S("title", null, `n = ${r.n}: ${r[k].toFixed(2)}`))));
      });
      $("cmpNote").textContent = `p = ${p === 0.5 ? "1/2" : "1/4"}`;
    }, 20);
  };

  example();
})();
