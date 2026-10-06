/* =====================================================================
   Algorithm Forge — Cuckoo hashing and modern filters (Ch 18)
   Part A: cuckoo hashing (two tables, kick-out chain, cycle → rehash)
   Part B: Bloom filter vs cuckoo filter (fingerprints, buckets of 4,
           partial-key cuckoo hashing, delete, measured FP rate)
   Part C: xor filter construction by peeling
   Record-then-play: every operation records frames, Forge.player plays.
   ===================================================================== */
(function () {
  "use strict";
  Forge.page({ title: "Cuckoo Hashing and Modern Filters", chapter: "Ch 18 · The Frontier" });
  const $ = (id) => document.getElementById(id);
  const E = Forge.el;
  // .stage text { fill: var(--ink) } in forge.css beats a fill attribute, so text colour goes through style
  const S = (tag, a, ...k) => {
    if (tag === "text" && a && a.fill) { a = Object.assign({}, a); a.style = "fill:" + a.fill + (a.style ? ";" + a.style : ""); delete a.fill; }
    return Forge.svg(tag, a, ...k);
  };
  const COL = FX.COL;
  const say = Forge.narrate($("say"));
  const codes = FX.codeSwitch($("code"));
  let player = null;
  const pred = FX.predict($("pred"), () => player);
  let ctr = null, ctrKey = "";
  function counters(key, obj) {
    if (ctrKey !== key) { $("ctr").innerHTML = ""; ctr = Forge.counters($("ctr"), obj); ctrKey = key; }
    ctr.set(obj);
  }
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------------- hashing helpers ---------------- */
  function fmix32(h) {
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16; return h >>> 0;
  }
  function hash32(str, seed) {
    let h = (0x811c9dc5 ^ seed) >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return fmix32((h ^ Math.imul(seed | 0, 0x9e3779b1)) >>> 0);
  }
  const bin = (v, w) => (v >>> 0).toString(2).padStart(w, "0");
  const log2 = (x) => Math.log(x) / Math.LN2;
  function nextPrime(x) {
    const isP = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
    while (!isP(x)) x++;
    return x;
  }
  function markerDefs(svg, id, color) {
    svg.appendChild(S("defs", null, S("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
      S("path", { d: "M0 0 L10 5 L0 10 z", fill: color }))));
  }

  /* =====================================================================
     PART A — cuckoo hashing
     ===================================================================== */
  const P31 = 2147483647;
  const A = { m: 11, fam: null, T: null, totalKicks: 0, rehashes: 0, seed: 0, maxLoop: 10 };
  const LINES_A = [
    "ALGORITHM CuckooInsert(x)",
    "    if Lookup(x) then return",
    "    for loop ← 1 to MaxLoop do",
    "        if state seen before then break // cycle",
    "        swap x and T1[h1(x)]",
    "        if x = null then return",
    "        swap x and T2[h2(x)]",
    "        if x = null then return",
    "    Rehash()   // new random h1, h2",
    "    CuckooInsert(x)",
    "",
    "ALGORITHM Lookup(x)",
    "    return x in T1[h1(x)] or T2[h2(x)]",
    "",
    "ALGORITHM Delete(x)",
    "    if T1[h1(x)] = x then empty it",
    "    else if T2[h2(x)] = x then empty it",
  ];
  function aReset(m) { A.m = m; A.fam = null; A.T = [Array(m).fill(null), Array(m).fill(null)]; A.totalKicks = 0; A.rehashes = 0; }
  function aH(t, K, fam, m) {
    fam = fam === undefined ? A.fam : fam; m = m || A.m;
    if (!fam) return t === 0 ? K % m : Math.floor(K / m) % m;
    const [a, b] = fam[t];
    return ((a * K + b) % P31) % m;
  }
  function newFam(seed) {
    const r = Forge.rng(seed * 7919 + 13);
    const one = () => [1 + Math.floor(r() * (P31 - 2)), Math.floor(r() * P31)];
    return [one(), one()];
  }
  function famText(fam, m) {
    if (!fam) return `h1(K) = K mod ${m}   ·   h2(K) = ⌊K / ${m}⌋ mod ${m}`;
    return `h1(K) = ((${fam[0][0]}·K + ${fam[0][1]}) mod p) mod ${m}   ·   h2(K) = ((${fam[1][0]}·K + ${fam[1][1]}) mod p) mod ${m},  p = 2³¹ − 1`;
  }
  function parseKey(txt) {
    const t = String(txt).trim();
    if (!t) return null;
    if (/^\d+$/.test(t) && +t <= 999999) return { label: String(+t), K: +t };
    return { label: t.slice(0, 9), K: hash32(t.toLowerCase(), 7) % 1000003 };
  }
  const aN = () => A.T[0].filter(Boolean).length + A.T[1].filter(Boolean).length;
  function aCtr(kicks) {
    const n = aN();
    return { n, "load factor": (n / (2 * A.m)).toFixed(2), "kicks (this op)": kicks, "total kicks": A.totalKicks, rehashes: A.rehashes };
  }
  function snapA(kicks, o) {
    return Object.assign({ mode: "A", m: A.m, fam: A.fam, T: [A.T[0].slice(), A.T[1].slice()], ctr: aCtr(kicks), hl: {}, path: [], hand: null }, o);
  }
  function stateKey(x) {
    return A.T[0].map((v) => (v ? v.K : "")).join(",") + "|" + A.T[1].map((v) => (v ? v.K : "")).join(",") + "|" + x.K;
  }
  function calcA(item) {
    const fam = famText(A.fam, A.m);
    if (!item) return fam;
    return `${fam}<br><b>${esc(item.label)}</b>${String(item.K) !== item.label ? ` (K = ${item.K})` : ""}: h1 = <b>${aH(0, item.K)}</b>, h2 = <b>${aH(1, item.K)}</b>`;
  }

  /** silent insert used by rehash and the experiment; returns kicks or -1 */
  function placeSilent(T, fam, m, item, maxLoop) {
    let x = item, kicks = 0;
    for (let loop = 0; loop < maxLoop; loop++) {
      for (let t = 0; t < 2; t++) {
        const i = aH(t, x.K, fam, m);
        const prev = T[t][i];
        T[t][i] = x;
        if (!prev) return kicks;
        kicks++;
        x = prev;
      }
    }
    return -1;
  }

  function aInsert(item, frames, ask) {
    let kicks = 0;
    const push = (o) => frames.push(snapA(kicks, o));
    const h1 = aH(0, item.K), h2 = aH(1, item.K);
    const there = (A.T[0][h1] && A.T[0][h1].K === item.K) ? [0, h1] : (A.T[1][h2] && A.T[1][h2].K === item.K) ? [1, h2] : null;
    push({
      line: 1, calc: calcA(item), hand: item, hl: { ["0:" + h1]: "compare", ["1:" + h2]: "compare" },
      text: there ? `<b>${esc(item.label)}</b> is already in T${there[0] + 1}[${there[1]}]. Nothing to do.`
        : `Insert <b>${esc(item.label)}</b>. It has exactly two possible homes: T1[${h1}] and T2[${h2}]. Lookup checks both; it isn't stored yet.`,
    });
    if (there) return;
    let x = item, from = null, asked = !ask;
    const seen = new Set(), path = [];
    for (let loop = 1; loop <= A.maxLoop; loop++) {
      const key = stateKey(x);
      if (seen.has(key)) {
        push({
          line: 3, calc: calcA(x), hand: x, path: path.slice(),
          hl: { ["0:" + aH(0, x.K)]: "swap", ["1:" + aH(1, x.K)]: "swap" },
          text: `<b>Cycle.</b> ${esc(x.label)} is in hand again and both tables look exactly as they did ${kicks - [...seen].indexOf(key) * 2} kicks ago. Kicking on would replay the same moves forever, so we stop and rehash.`,
        });
        return aRehash(x, frames, kicks, "cycle");
      }
      seen.add(key);
      for (let t = 0; t < 2; t++) {
        const i = aH(t, x.K);
        const prev = A.T[t][i];
        A.T[t][i] = x;
        path.push({ from, to: { t, i } });
        from = { t, i };
        if (!prev) {
          push({
            line: [4 + 2 * t, 5 + 2 * t], calc: calcA(x), path: path.slice(), hl: { [t + ":" + i]: "done" },
            text: `${esc(x.label)} moves into T${t + 1}[${i}], its h${t + 1} home, which was empty. Done${kicks ? ` after ${kicks} kick${kicks > 1 ? "s" : ""}` : " with no kicks"}.`,
          });
          return;
        }
        kicks++; A.totalKicks++;
        const nt = 1 - t, ni = aH(nt, prev.K);
        let q = null;
        if (!asked) {
          asked = true;
          const opts = [`T${nt + 1}[${ni}]`, `T${t + 1}[${(i + 1) % A.m}]`, `T${t + 1}[${i}] again`];
          const order = [(kicks + 1) % 3, (kicks + 2) % 3, kicks % 3];
          q = {
            q: `${esc(prev.label)} was just kicked out of T${t + 1}[${i}]. Where does it go next?`,
            opts: order.map((k) => opts[k]), ans: order.indexOf(0),
            why: `Every key has exactly two homes. ${esc(prev.label)} was evicted from its T${t + 1} home, so it flies to its T${nt + 1} home, h${nt + 1}(${esc(prev.label)}) = ${ni}. No probing for "the next free cell" like linear probing.`,
          };
        }
        push({
          line: 4 + 2 * t, calc: calcA(prev), hand: prev, path: path.slice(),
          hl: { [t + ":" + i]: "swap", [nt + ":" + ni]: "active" }, ask: q,
          text: `${esc(x.label)} takes T${t + 1}[${i}] and kicks out <b>${esc(prev.label)}</b> (kick ${kicks}). ${esc(prev.label)} is now in hand; its other home is T${nt + 1}[${ni}].`,
        });
        x = prev;
      }
    }
    push({
      line: 8, calc: calcA(x), hand: x, path: path.slice(),
      text: `MaxLoop = ${A.maxLoop} rounds are used up and ${esc(x.label)} still has no home. These hash functions have had their chance: rehash.`,
    });
    return aRehash(x, frames, kicks, "maxloop");
  }

  function aRehash(x, frames, kicks, why) {
    const keys = [...A.T[0], ...A.T[1]].filter(Boolean).concat([x]);
    const n = keys.length;
    let m = A.m, grew = false;
    if (n >= m) { m = nextPrime(2 * m + 1); grew = true; }
    frames.push(snapA(kicks, {
      line: 8, calc: calcA(x), hand: x,
      text: `<b>Rehash.</b> Throw away h1, h2 and draw a fresh random pair from a universal family ((a·K + b) mod p) mod m.${grew ? ` The load would reach α = ${n}/${2 * A.m} ≥ 1/2, so the tables also grow to m = ${m} each.` : ` α = ${n}/${2 * A.m} is below 1/2, so the size stays m = ${m}.`} Then re-insert all ${n} keys.`,
    }));
    let tries = 0, total = 0, T;
    for (;;) {
      tries++; A.seed++;
      const fam = newFam(A.seed);
      T = [Array(m).fill(null), Array(m).fill(null)];
      total = 0;
      let ok = true;
      for (const k of keys) {
        const r = placeSilent(T, fam, m, k, Math.max(50, A.maxLoop));
        if (r < 0) { ok = false; break; }
        total += r;
      }
      if (ok) { A.fam = fam; break; }
      if (tries % 5 === 0) m = nextPrime(2 * m + 1);
    }
    A.m = m; A.T = T; A.rehashes += tries; A.totalKicks += total;
    frames.push(snapA(kicks + total, {
      line: 9, calc: calcA(x), hl: { ["0:" + aH(0, x.K)]: "done", ["1:" + aH(1, x.K)]: "done" },
      text: `With the new functions all ${n} keys fit (${total} kick${total === 1 ? "" : "s"} during re-insertion${tries > 1 ? `, ${tries} tries` : ""}). ${esc(x.label)} now lives in ${A.T[0][aH(0, x.K)] && A.T[0][aH(0, x.K)].K === x.K ? "T1[" + aH(0, x.K) + "]" : "T2[" + aH(1, x.K) + "]"}. Rehashing costs Θ(n), but with random functions and α < 1/2 it is rare, so inserts stay O(1) expected (amortized).`,
    }));
  }

  function aLookup(item, frames) {
    const h1 = aH(0, item.K), h2 = aH(1, item.K);
    const in1 = A.T[0][h1] && A.T[0][h1].K === item.K, in2 = A.T[1][h2] && A.T[1][h2].K === item.K;
    frames.push(snapA(0, { line: [11, 12], calc: calcA(item), hl: { ["0:" + h1]: in1 ? "done" : "compare", ["1:" + h2]: in2 ? "done" : "compare" },
      text: in1 || in2 ? `Found <b>${esc(item.label)}</b> in ${in1 ? "T1[" + h1 + "]" : "T2[" + h2 + "]"}. ${in1 ? "1 probe" : "2 probes"}, and never more than 2.`
        : `Not in T1[${h1}] and not in T2[${h2}], so <b>${esc(item.label)}</b> is definitely absent. 2 probes: a cuckoo table never has to search further.` }));
  }
  function aDelete(item, frames) {
    const h1 = aH(0, item.K), h2 = aH(1, item.K);
    let line = 15, where = null;
    if (A.T[0][h1] && A.T[0][h1].K === item.K) { A.T[0][h1] = null; where = "T1[" + h1 + "]"; }
    else if (A.T[1][h2] && A.T[1][h2].K === item.K) { A.T[1][h2] = null; where = "T2[" + h2 + "]"; line = 16; }
    frames.push(snapA(0, { line: [14, line], calc: calcA(item), hl: { ["0:" + h1]: "compare", ["1:" + h2]: "compare" },
      text: where ? `Deleted <b>${esc(item.label)}</b> from ${where}. No tombstones needed: lookups only ever look at the two homes, so an empty cell can't cut a search short.`
        : `<b>${esc(item.label)}</b> is in neither home, so there is nothing to delete.` }));
  }

  function drawA(f) {
    const host = $("stageHost");
    let svg = host.querySelector("svg.stA");
    if (!svg) { host.innerHTML = ""; svg = S("svg", { class: "stage stA", role: "img", "aria-label": "Two cuckoo hash tables T1 and T2 with the kick-out chain" }); host.appendChild(svg); }
    const m = f.m, rowH = m > 15 ? 22 : 28, top = 74, W = 520, cw = 150, X = [50, 320];
    const H = top + m * rowH + 14;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    markerDefs(svg, "ckA", "var(--ember)");
    svg.appendChild(S("text", { x: X[0] + cw / 2, y: top - 10, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--ink-2)" }, "T1 · h1"));
    svg.appendChild(S("text", { x: X[1] + cw / 2, y: top - 10, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--ink-2)" }, "T2 · h2"));
    const cy = (i) => top + i * rowH + (rowH - 4) / 2;
    for (let t = 0; t < 2; t++) {
      for (let i = 0; i < m; i++) {
        const st = f.hl[t + ":" + i];
        const it = f.T[t][i];
        const y = top + i * rowH;
        svg.appendChild(S("rect", { x: X[t], y, width: cw, height: rowH - 4, rx: 6, fill: st ? COL[st] : (it ? "var(--panel-2)" : "var(--bg)"), stroke: st ? COL[st] : "var(--line-2)", "stroke-width": 1.5 }));
        svg.appendChild(S("text", { x: t === 0 ? X[0] - 8 : X[1] + cw + 8, y: cy(i) + 4, "text-anchor": t === 0 ? "end" : "start", "font-size": 11, fill: "var(--muted)" }, String(i)));
        if (it) {
          const ink = st && st !== "dim" ? "#0d1117" : "var(--ink)";
          svg.appendChild(S("text", { x: X[t] + 10, y: cy(i) + 4.5, "font-size": 13, "font-weight": 700, fill: ink }, it.label));
          const alt = t === 0 ? `→T2[${aH(1, it.K, f.fam, m)}]` : `→T1[${aH(0, it.K, f.fam, m)}]`;
          svg.appendChild(S("text", { x: X[t] + cw - 8, y: cy(i) + 4, "text-anchor": "end", "font-size": 10, fill: st ? "#0d1117" : "var(--muted)" }, alt));
        }
      }
    }
    // hand box
    const hx = W / 2, hy = 22;
    if (f.hand) {
      svg.appendChild(S("rect", { x: hx - 62, y: hy - 15, width: 124, height: 28, rx: 14, fill: "var(--c-pivot)" }));
      svg.appendChild(S("text", { x: hx, y: hy + 4, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "#0d1117" }, "in hand: " + f.hand.label));
    }
    // kick chain arrows (last 8 shown, older faded)
    const path = f.path || [];
    const start = Math.max(0, path.length - 8);
    path.forEach((p, k) => {
      if (k < start) return;
      const op = k === path.length - 1 ? 1 : 0.35 + 0.5 * (k - start) / Math.max(1, path.length - start);
      const y2 = cy(p.to.i);
      let d;
      if (!p.from) {
        const x2 = p.to.t === 0 ? X[0] + cw : X[1];
        d = `M${hx} ${hy + 14} C${hx} ${(hy + y2) / 2}, ${hx} ${y2}, ${x2 + (p.to.t === 0 ? 6 : -6)} ${y2}`;
      } else {
        const y1 = cy(p.from.i);
        const x1 = p.from.t === 0 ? X[0] + cw : X[1], x2 = p.to.t === 0 ? X[0] + cw + 6 : X[1] - 6;
        const mx = (x1 + x2) / 2 + (p.from.t === 0 ? -12 : 12);
        d = `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      }
      svg.appendChild(S("path", { d, fill: "none", stroke: "var(--ember)", "stroke-width": 2.2, opacity: op, "marker-end": "url(#ckA)", "stroke-dasharray": p.from ? null : "5 4" }));
    });
  }

  /* =====================================================================
     PART B — Bloom filter vs cuckoo filter
     ===================================================================== */
  const MAXK = 500;
  const BF = { B: 16, f: 8, k: 4, m: 512, items: [], buckets: null, owners: null, victim: null, bloom: null, rng: null, cfLost: [], deleted: new Set() };
  const LINES_B = [
    "ALGORITHM CuckooFilterInsert(x)",
    "    f ← fingerprint(x)     // f bits, never 0",
    "    i1 ← hash(x) mod B",
    "    i2 ← i1 xor (hash(f) mod B)",
    "    if bucket[i1] has room then add f; return",
    "    if bucket[i2] has room then add f; return",
    "    i ← i1 or i2, at random",
    "    for kick ← 1 to MaxKicks do   // 500",
    "        swap f, random entry of bucket[i]",
    "        i ← i xor (hash(f) mod B)",
    "        if bucket[i] has room then add f; return",
    "    put f in the victim stash   // full",
    "",
    "ALGORITHM CuckooFilterLookup(x)",
    "    compute f, i1, i2 as above",
    "    return f in bucket[i1] or bucket[i2]",
    "",
    "ALGORITHM CuckooFilterDelete(x)",
    "    // only for items that were inserted",
    "    remove one copy of f from i1 or i2",
    "",
    "// Bloom: insert sets bits g1(x)..gk(x)",
  ];
  const fpOf = (x, f) => (hash32(x, 0x5f3759df) % ((1 << f) - 1)) + 1;
  const idx1 = (x, B) => hash32(x, 0x1234567) & (B - 1);
  const hfp = (fp, B) => fmix32((Math.imul(fp, 0x9e3779b1) ^ 0x7f4a7c15) >>> 0) & (B - 1);
  function bloomPos(x, m, k) {
    const a = hash32(x, 101), b = (hash32(x, 202) | 1) >>> 0;
    const out = [];
    for (let i = 0; i < k; i++) out.push((a + i * b) % m);
    return out;
  }
  const norm = (s) => String(s).trim().toLowerCase().slice(0, 16);
  function bRebuild() {
    BF.m = 4 * BF.B * BF.f;
    BF.buckets = Array.from({ length: BF.B }, () => [0, 0, 0, 0]);
    BF.owners = Array.from({ length: BF.B }, () => [null, null, null, null]);
    BF.victim = null; BF.bloom = new Uint8Array(BF.m); BF.rng = Forge.rng(424242); BF.cfLost = []; BF.deleted = new Set();
    const items = BF.items; BF.items = [];
    items.forEach((x) => bInsert(x, null));
  }
  function bCtr(kicks) {
    const n = BF.items.length, used = BF.buckets.reduce((s, b) => s + b.filter(Boolean).length, 0) + (BF.victim ? 1 : 0);
    const ones = BF.bloom.reduce((s, v) => s + v, 0);
    return { "items n": n, "cuckoo load": (used / (4 * BF.B)).toFixed(2), "bits / item": n ? (BF.m / n).toFixed(1) : "–", "kicks (this op)": kicks, "Bloom bits set": `${ones}/${BF.m}` };
  }
  function snapB(kicks, o) {
    return Object.assign({
      mode: "B", B: BF.B, f: BF.f, k: BF.k, m: BF.m,
      buckets: BF.buckets.map((b) => b.slice()), owners: BF.owners.map((b) => b.slice()), victim: BF.victim && Object.assign({}, BF.victim),
      bloom: BF.bloom.slice(), ctr: bCtr(kicks), hlB: {}, hlS: {}, hlBit: {}, hand: null,
    }, o);
  }
  function bCalc(x, fp, i1, h, i2, pos) {
    const w = log2(BF.B);
    return `"${esc(x)}": f = <b>${fp}</b> (${bin(fp, BF.f)}), i1 = <b>${i1}</b> (${bin(i1, w)}), hash(f) mod B = ${bin(h, w)}, i2 = i1 xor hash(f) = <b>${i2}</b> (${bin(i2, w)})` +
      `<br>Bloom bits g1..g${BF.k} = ${pos.join(", ")}`;
  }
  function freeSlot(b) { return BF.buckets[b].indexOf(0); }

  /** insert into both filters; frames may be null (silent) */
  function bInsert(x, frames, ask) {
    const B = BF.B, w = log2(B);
    const fp = fpOf(x, BF.f), i1 = idx1(x, B), h = hfp(fp, B), i2 = i1 ^ h;
    const pos = bloomPos(x, BF.m, BF.k);
    let kicks = 0;
    const push = (o) => frames && frames.push(snapB(kicks, o));
    const calc = bCalc(x, fp, i1, h, i2, pos);
    if (BF.items.includes(x)) { push({ line: 0, calc, text: `"${esc(x)}" is already in the set. (A real filter can't tell; inserting it twice would store a second copy.)` }); return; }
    if (BF.victim) {
      push({ line: 11, calc, text: `The cuckoo filter is full: its victim stash already holds a homeless fingerprint. Real libraries report "not enough space" here; time to build a bigger filter.` });
      return;
    }
    const bitsC = {}; pos.forEach((p) => (bitsC[p] = "compare"));
    let q = null;
    if (ask && frames) {
      const wrongSum = (i1 + h) % B, wrongAnd = i1 & h;
      const cand = [i2, wrongSum === i2 ? (i2 + 1) % B : wrongSum, wrongAnd === i2 || wrongAnd === wrongSum ? (i2 + 3) % B : wrongAnd];
      const order = [(fp % 3), (fp + 1) % 3, (fp + 2) % 3];
      q = {
        q: `i1 = ${bin(i1, w)} and hash(f) mod B = ${bin(h, w)}. What is the second bucket i2 = i1 xor hash(f)?`,
        opts: order.map((k) => `${cand[k]} (${bin(cand[k], w)})`), ans: order.indexOf(0),
        why: `Xor compares bit by bit: 1 where the bits differ, 0 where they match. ${bin(i1, w)} xor ${bin(h, w)} = ${bin(i2, w)} = ${i2}. And xor undoes itself: i2 xor hash(f) gives back i1, so a fingerprint can always find its other bucket.`,
      };
    }
    push({ line: [1, 2, 3], calc, hlB: { [i1]: "compare", [i2]: "compare" }, hlBit: bitsC, ask: q,
      text: `Insert "<b>${esc(x)}</b>". Cuckoo filter: keep only its ${BF.f}-bit fingerprint f = ${fp}; candidate buckets i1 = ${i1} and i2 = ${i2}. Bloom filter: ${BF.k} bit positions.` });
    // Bloom: set bits
    const bitsS = {};
    pos.forEach((p) => { bitsS[p] = BF.bloom[p] ? "compare" : "swap"; BF.bloom[p] = 1; });
    BF.items.push(x); BF.deleted.delete(x);
    for (const [b, ln] of [[i1, 4], [i2, 5]]) {
      const s = freeSlot(b);
      if (s >= 0) {
        BF.buckets[b][s] = fp; BF.owners[b][s] = x;
        push({ line: ln, calc, hlB: { [b]: "done" }, hlS: { [b + ":" + s]: "swap" }, hlBit: bitsS,
          text: `Bucket ${b} has a free slot, so f = ${fp} goes into slot ${s}. Bloom: bits ${pos.join(", ")} are now 1 (red = newly set, yellow = already 1).` });
        return;
      }
    }
    let i = BF.rng() < 0.5 ? i1 : i2, cur = { fp, owner: x };
    push({ line: 6, calc, hlB: { [i1]: "swap", [i2]: "swap" }, hlBit: bitsS, hand: cur,
      text: `Both buckets ${i1} and ${i2} are full (4 of 4). Pick one at random (bucket ${i}) and start kicking. Bloom is already done: it never moves anything.` });
    for (let kick = 1; kick <= MAXK; kick++) {
      kicks++;
      const s = Math.floor(BF.rng() * 4);
      const ev = { fp: BF.buckets[i][s], owner: BF.owners[i][s] };
      BF.buckets[i][s] = cur.fp; BF.owners[i][s] = cur.owner;
      const hh = hfp(ev.fp, B), ni = i ^ hh;
      if (kick <= 25) push({ line: [8, 9], calc, hlB: { [i]: "swap", [ni]: "active" }, hlS: { [i + ":" + s]: "swap" }, hand: ev,
        text: `Kick ${kick}: f = ${cur.fp} takes slot ${s} of bucket ${i}, evicting fingerprint ${ev.fp} (we know it came from "${esc(ev.owner)}"; the filter itself has no idea). Its other bucket is ${i} xor hash(${ev.fp}) = ${bin(i, w)} xor ${bin(hh, w)} = <b>${ni}</b>.` });
      cur = ev; i = ni;
      const fs = freeSlot(i);
      if (fs >= 0) {
        BF.buckets[i][fs] = cur.fp; BF.owners[i][fs] = cur.owner;
        push({ line: 10, calc, hlB: { [i]: "done" }, hlS: { [i + ":" + fs]: "swap" },
          text: `Bucket ${i} has room: fingerprint ${cur.fp} settles in slot ${fs}. Insert finished after ${kicks} kick${kicks > 1 ? "s" : ""}.` });
        return;
      }
    }
    BF.victim = { fp: cur.fp, owner: cur.owner, i };
    push({ line: 11, calc, hand: cur, text: `${MAXK} kicks without finding room: the filter is full. The last homeless fingerprint (${cur.fp}) goes into a one-entry victim stash so no item is lost; further inserts are refused.` });
  }

  function cfHas(fp, i1, i2) {
    for (const b of [i1, i2]) { const s = BF.buckets[b].indexOf(fp); if (s >= 0) return { b, s }; }
    if (BF.victim && BF.victim.fp === fp && (BF.victim.i === i1 || BF.victim.i === i2)) return { b: -1, s: -1 };
    return null;
  }
  const qHistory = [];
  function bLookup(x, frames, record) {
    const B = BF.B;
    const fp = fpOf(x, BF.f), i1 = idx1(x, B), h = hfp(fp, B), i2 = i1 ^ h;
    const pos = bloomPos(x, BF.m, BF.k), calc = bCalc(x, fp, i1, h, i2, pos);
    const member = BF.items.includes(x);
    const bitsC = {}; pos.forEach((p) => (bitsC[p] = "compare"));
    frames.push(snapB(0, { line: [13, 14], calc, hlB: { [i1]: "compare", [i2]: "compare" }, hlBit: bitsC,
      text: `Look up "<b>${esc(x)}</b>": the cuckoo filter checks the 8 slots of buckets ${i1} and ${i2} for f = ${fp}; the Bloom filter checks bits ${pos.join(", ")}.` }));
    const hit = cfHas(fp, i1, i2);
    const zero = pos.find((p) => !BF.bloom[p]);
    const bHit = zero === undefined;
    const verdict = (yes) => (yes ? (member ? '<span class="ok-t">maybe (true)</span>' : '<span class="bad-t">maybe: FALSE POSITIVE</span>') : (member ? '<span class="bad-t">no: FALSE NEGATIVE</span>' : '<span class="ok-t">definitely not</span>'));
    const hlS = {}, hlBit = {};
    if (hit && hit.b >= 0) hlS[hit.b + ":" + hit.s] = member ? "done" : "swap";
    pos.forEach((p) => (hlBit[p] = BF.bloom[p] ? (bHit ? (member ? "done" : "swap") : "compare") : "active"));
    let why = "";
    if (hit && !member) {
      const own = hit.b >= 0 ? BF.owners[hit.b][hit.s] : BF.victim.owner;
      why = ` The cuckoo match is fingerprint ${fp} stored by "${esc(own)}": two different items, same ${BF.f}-bit fingerprint, overlapping buckets.`;
    }
    if (!hit && member) why = ` "${esc(x)}" was inserted, but its fingerprint was deleted on someone else's behalf. That is why deletes must only be for inserted items.`;
    if (bHit && !member) why += BF.deleted.has(x) ? ` Bloom: "${esc(x)}" was deleted, but its own bits are still on; a Bloom filter can't forget.` : ` Bloom: every probed bit was switched on by other items.`;
    if (!bHit && member) why += ` Bloom: bit ${zero} was cleared by a forced delete of another item that shared it.`;
    frames.push(snapB(0, { line: 15, calc, hlB: { [i1]: "compare", [i2]: "compare" }, hlS, hlBit,
      text: `Cuckoo filter: ${verdict(!!hit)}. Bloom filter: ${verdict(bHit)}${!bHit ? ` (bit ${zero} is 0)` : ""}.${why}` }));
    if (record) {
      qHistory.unshift({ x, member, c: !!hit, b: bHit });
    }
  }
  function bDelete(x, frames) {
    const B = BF.B;
    const fp = fpOf(x, BF.f), i1 = idx1(x, B), h = hfp(fp, B), i2 = i1 ^ h;
    const pos = bloomPos(x, BF.m, BF.k), calc = bCalc(x, fp, i1, h, i2, pos);
    const member = BF.items.includes(x);
    let where = null;
    // prefer the copy this item stored (same fingerprint copies are interchangeable for lookups)
    outer: for (const pass of [0, 1]) {
      for (const b of [i1, i2]) {
        for (let s = 0; s < 4; s++) {
          if (BF.buckets[b][s] === fp && (pass === 1 || BF.owners[b][s] === x)) { where = { b, s, owner: BF.owners[b][s] }; break outer; }
        }
      }
    }
    if (!where && BF.victim && BF.victim.fp === fp && (BF.victim.i === i1 || BF.victim.i === i2)) where = { b: -1, s: -1, owner: BF.victim.owner };
    const hlS = {};
    let text;
    if (where) {
      if (where.b >= 0) { BF.buckets[where.b][where.s] = 0; BF.owners[where.b][where.s] = null; hlS[where.b + ":" + where.s] = "swap"; }
      else BF.victim = null;
      if (member) { BF.items.splice(BF.items.indexOf(x), 1); BF.deleted.add(x); }
      if (where.owner !== x) BF.cfLost.push(where.owner);
      text = `Cuckoo filter: removed one copy of f = ${fp} from ${where.b >= 0 ? "bucket " + where.b : "the victim stash"}.` +
        (member ? ` "${esc(x)}" is gone; a lookup now says no.` : ` <span class="bad-t">But "${esc(x)}" was never inserted:</span> that fingerprint belonged to "${esc(where.owner)}", which is now a false negative.`);
    } else {
      if (member) BF.items.splice(BF.items.indexOf(x), 1);
      text = `Cuckoo filter: f = ${fp} is in neither bucket ${i1} nor ${i2}, nothing to remove.`;
    }
    const hlBit = {};
    if ($("bForce").checked) {
      pos.forEach((p) => { hlBit[p] = "swap"; BF.bloom[p] = 0; });
      text += ` Bloom filter (forced): bits ${pos.join(", ")} cleared. Any other item that shared one of them now gets a wrong "definitely not".`;
    } else {
      const sharers = BF.items.filter((y) => bloomPos(y, BF.m, BF.k).some((p) => pos.includes(p)));
      pos.forEach((p) => (hlBit[p] = "compare"));
      text += ` Bloom filter: can't delete. Its bits ${pos.join(", ")} may also belong to other items${sharers.length ? ` (here: ${sharers.slice(0, 3).map((s) => '"' + esc(s) + '"').join(", ")})` : ""}; clearing them would create false negatives. ${member ? `So "${esc(x)}" stays a permanent false positive in the Bloom filter.` : ""}`;
    }
    frames.push(snapB(0, { line: [17, 19], calc, hlB: { [i1]: "compare", [i2]: "compare" }, hlS, hlBit, text }));
  }

  function drawChips() {
    const box = $("bChips");
    box.innerHTML = "";
    if (!BF.items.length) { box.appendChild(E("span", { class: "small muted" }, "none yet")); return; }
    BF.items.forEach((x) => box.appendChild(E("button", { class: "chip", type: "button", onclick: () => { $("bItem").value = x; run((fr) => bLookup(x, fr, true)); } }, x)));
  }

  function drawB(f) {
    const host = $("stageHost");
    let wrap = host.querySelector(".twin");
    if (!wrap) {
      host.innerHTML = "";
      wrap = E("div", { class: "twin" },
        E("div", null, E("h3", null, "Cuckoo filter · B × 4 fingerprints"), S("svg", { class: "stage stCF", role: "img", "aria-label": "Cuckoo filter buckets" })),
        E("div", null, E("h3", null, "Bloom filter · same number of bits"), S("svg", { class: "stage stBL", role: "img", "aria-label": "Bloom filter bit array" })));
      host.appendChild(wrap);
    }
    const cf = wrap.querySelector(".stCF"), bl = wrap.querySelector(".stBL");
    // cuckoo filter buckets
    const B = f.B, cols = B > 16 ? 2 : 1, rows = Math.ceil(B / cols), rowH = 24, W = 380;
    const slotW = cols === 2 ? 36 : 60, lab = 30, bw = lab + 4 * slotW, top = 40;
    const H = top + rows * rowH + 34;
    cf.setAttribute("viewBox", `0 0 ${W} ${H}`);
    cf.innerHTML = "";
    const gx = cols === 2 ? 4 : (W - bw) / 2;
    if (f.hand) {
      cf.appendChild(S("rect", { x: W / 2 - 80, y: 6, width: 160, height: 24, rx: 12, fill: "var(--c-pivot)" }));
      cf.appendChild(S("text", { x: W / 2, y: 22, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "#0d1117" }, "in hand: f = " + f.hand.fp));
    }
    for (let b = 0; b < B; b++) {
      const c = Math.floor(b / rows), r = b % rows;
      const x0 = gx + c * (bw + 12), y0 = top + r * rowH;
      const bs = f.hlB[b];
      cf.appendChild(S("text", { x: x0 + lab - 6, y: y0 + 15, "text-anchor": "end", "font-size": 11, "font-weight": bs ? 700 : 400, fill: bs ? COL[bs] : "var(--muted)" }, String(b)));
      cf.appendChild(S("rect", { x: x0 + lab - 2, y: y0 - 1, width: 4 * slotW + 4, height: rowH - 2, rx: 5, fill: "none", stroke: bs ? COL[bs] : "transparent", "stroke-width": 2 }));
      for (let s = 0; s < 4; s++) {
        const v = f.buckets[b][s], st = f.hlS[b + ":" + s];
        cf.appendChild(S("rect", { x: x0 + lab + s * slotW, y: y0 + 1, width: slotW - 3, height: rowH - 6, rx: 4, fill: st ? COL[st] : (v ? "var(--panel-2)" : "var(--bg)"), stroke: st ? COL[st] : "var(--line-2)" }));
        if (v) cf.appendChild(S("text", { x: x0 + lab + s * slotW + (slotW - 3) / 2, y: y0 + 15, "text-anchor": "middle", "font-size": cols === 2 ? 10 : 11.5, "font-weight": 600, fill: st ? "#0d1117" : "var(--ink)" }, String(v)));
      }
    }
    cf.appendChild(S("text", { x: 8, y: H - 10, "font-size": 11, fill: f.victim ? "var(--c-swap)" : "var(--muted)" }, f.victim ? `victim stash: f = ${f.victim.fp} (filter is full)` : "victim stash: empty"));
    // Bloom bits
    const m = f.m, bc = 32, cs = (W - 16) / bc, brow = Math.ceil(m / bc), BH = 10 + brow * cs + 10;
    bl.setAttribute("viewBox", `0 0 ${W} ${BH}`);
    bl.innerHTML = "";
    for (let p = 0; p < m; p++) {
      const x = 8 + (p % bc) * cs, y = 10 + Math.floor(p / bc) * cs;
      const st = f.hlBit[p];
      const fill = st ? COL[st] : (f.bloom[p] ? "var(--c-bar)" : "var(--bg)");
      bl.appendChild(S("rect", { x: x + 0.6, y: y + 0.6, width: cs - 1.2, height: cs - 1.2, rx: 1.5, fill, stroke: st ? "var(--ink)" : "var(--line)", "stroke-width": st ? 1.2 : 0.6 }));
    }
  }

  /* ---------- Part B measurement at scale ---------- */
  function measureOnce(f) {
    const Bn = 1024, slots = 4 * Bn, m = slots * f;
    const bk = Array.from({ length: Bn }, () => [0, 0, 0, 0]);
    const rng = Forge.rng(9001 + f);
    let n = 0, failed = false;
    const items = [];
    while (n < Math.floor(slots * 0.95) && !failed) {
      const x = "x" + n + "_" + f;
      const fp = fpOf(x, f), i1 = idx1(x, Bn), i2 = i1 ^ hfp(fp, Bn);
      let s = bk[i1].indexOf(0);
      if (s >= 0) bk[i1][s] = fp;
      else if ((s = bk[i2].indexOf(0)) >= 0) bk[i2][s] = fp;
      else {
        let i = rng() < 0.5 ? i1 : i2, cur = fp, placed = false;
        for (let k = 0; k < MAXK; k++) {
          const ss = Math.floor(rng() * 4);
          const ev = bk[i][ss]; bk[i][ss] = cur; cur = ev;
          i ^= hfp(cur, Bn);
          const fs = bk[i].indexOf(0);
          if (fs >= 0) { bk[i][fs] = cur; placed = true; break; }
        }
        if (!placed) { failed = true; break; } // victim would hold cur; stop at the first failure
      }
      items.push(x); n++;
    }
    const alpha = n / slots;
    const kOpt = Math.max(1, Math.round((m / n) * Math.LN2));
    const bloom = new Uint8Array(m);
    items.forEach((x) => bloomPos(x, m, kOpt).forEach((p) => (bloom[p] = 1)));
    const Q = 50000;
    let fpC = 0, fpB = 0;
    for (let q = 0; q < Q; q++) {
      const y = "q" + q + "_" + f;
      const fp = fpOf(y, f), i1 = idx1(y, Bn), i2 = i1 ^ hfp(fp, Bn);
      if (bk[i1].includes(fp) || bk[i2].includes(fp)) fpC++;
      if (bloomPos(y, m, kOpt).every((p) => bloom[p])) fpB++;
    }
    const thC = 1 - Math.pow(1 - 1 / ((1 << f) - 1), 8 * alpha);
    const thB = Math.pow(1 - Math.exp((-kOpt * n) / m), kOpt);
    return { f, n, alpha, m, bpi: m / n, kOpt, mC: fpC / Q, mB: fpB / Q, thC, thB, failed };
  }
  const pct = (x) => (x === 0 ? "0" : x < 0.001 ? (x * 100).toFixed(4) + "%" : (x * 100).toFixed(2) + "%");
  function measTable(rows) {
    const t = $("measTab");
    t.innerHTML = "<tr><th>f</th><th>items n</th><th>load α</th><th>bits / item</th><th>Bloom k</th><th>cuckoo FP measured</th><th>cuckoo FP theory</th><th>Bloom FP measured</th><th>Bloom FP theory</th><th>bits/item Bloom would need for the cuckoo's ε</th></tr>" +
      rows.map((r) => {
        const eps = Math.max(r.thC, 1e-12);
        return `<tr><td>${r.f}</td><td>${r.n}</td><td>${r.alpha.toFixed(3)}</td><td>${r.bpi.toFixed(2)}</td><td>${r.kOpt}</td><td>${pct(r.mC)}</td><td>${pct(r.thC)}</td><td>${pct(r.mB)}</td><td>${pct(r.thB)}</td><td>${(1.44 * log2(1 / eps)).toFixed(1)}</td></tr>`;
      }).join("");
  }
  function measChart(rows) {
    const svg = $("measChart");
    svg.removeAttribute("hidden"); $("measLegend").hidden = false;
    const W = 720, H = 300, L = 64, R = 16, T = 14, Bm = 40;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
    const xs = rows.map((r) => r.bpi), x0 = Math.floor(Math.min(...xs)) - 1, x1 = Math.ceil(Math.max(...xs)) + 1;
    const ys = rows.flatMap((r) => [r.mC, r.mB, r.thC, r.thB]).filter((v) => v > 0);
    const yLo = Math.floor(Math.log10(Math.min(...ys, 1e-4))), yHi = 0;
    const X = (v) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
    const Y = (v) => T + ((yHi - Math.log10(Math.max(v, Math.pow(10, yLo)))) / (yHi - yLo)) * (H - T - Bm);
    for (let e = yLo; e <= yHi; e++) {
      svg.appendChild(S("line", { x1: L, x2: W - R, y1: Y(Math.pow(10, e)), y2: Y(Math.pow(10, e)), stroke: "var(--line)" }));
      svg.appendChild(S("text", { x: L - 6, y: Y(Math.pow(10, e)) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, e === 0 ? "100%" : e >= -2 ? Math.pow(10, e + 2) + "%" : "1e" + e));
    }
    for (let v = Math.ceil(x0); v <= x1; v += 2) {
      svg.appendChild(S("text", { x: X(v), y: H - Bm + 16, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, String(v)));
    }
    svg.appendChild(S("text", { x: (L + W - R) / 2, y: H - 6, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, "bits per item"));
    svg.appendChild(S("text", { x: 14, y: (T + H - Bm) / 2, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)", transform: `rotate(-90 14 ${(T + H - Bm) / 2})` }, "false-positive rate (log)"));
    const line = (key, col) => svg.appendChild(S("polyline", { points: rows.map((r) => `${X(r.bpi)},${Y(r[key])}`).join(" "), fill: "none", stroke: col, "stroke-width": 2 }));
    line("thB", "var(--steel)"); line("thC", "var(--ember)");
    rows.forEach((r) => {
      svg.appendChild(S("circle", { cx: X(r.bpi), cy: Y(r.mB), r: 4.5, fill: "var(--steel)" }, S("title", null, `Bloom, ${r.bpi.toFixed(2)} bits/item: ${pct(r.mB)} measured`)));
      svg.appendChild(S("circle", { cx: X(r.bpi), cy: Y(r.mC), r: 4.5, fill: "var(--ember)" }, S("title", null, `cuckoo f=${r.f}, ${r.bpi.toFixed(2)} bits/item: ${pct(r.mC)} measured`)));
    });
  }

  /* =====================================================================
     PART C — xor filter by peeling
     ===================================================================== */
  const XF = { built: null, seed: 1, tests: 0, fps: 0 };
  const LINES_C = [
    "ALGORITHM XorBuild(S)   // B[0..c-1], 3 segments",
    "    for each x in S do add x to its 3 cells",
    "    Q ← cells holding exactly one key",
    "    while Q is not empty do",
    "        i ← dequeue(Q)",
    "        if cell i holds exactly one key x then",
    "            push (x, i) onto stack",
    "            remove x from its 3 cells",
    "            enqueue cells left with one key",
    "    if size(stack) < n then retry with new seeds",
    "    B ← array(c, 0)",
    "    while stack is not empty do",
    "        (x, i) ← pop(stack)",
    "        B[i] ← fp(x) xor (xor of x's 3 cells)",
    "    return B",
    "",
    "ALGORITHM XorContains(B, x)",
    "    return fp(x) = B[h0] xor B[h1] xor B[h2]",
  ];
  const xPos = (x, j, s, seed) => j * s + (hash32(x, seed * 31 + j * 977 + 5) % s);
  const xFp = (x, seed) => hash32(x, seed * 131 + 0xabc) & 0xff;
  const hx2 = (v) => v.toString(16).toUpperCase().padStart(2, "0");
  const b8 = (v) => bin(v, 8);
  function xSize(n) { const s = Math.max(2, Math.ceil((1.23 * n) / 3) + 1); return { s, c: 3 * s }; }

  function xBuild(keys, frames) {
    const n = keys.length, { s, c } = xSize(n);
    let animatedFails = 0;
    for (let attempt = 0; attempt < 60; attempt++) {
      const seed = XF.seed + attempt;
      const H = keys.map((x) => [0, 1, 2].map((j) => xPos(x, j, s, seed)));
      const fp = keys.map((x) => xFp(x, seed));
      const cells = Array.from({ length: c }, () => new Set());
      H.forEach((hs, k) => hs.forEach((i) => cells[i].add(k)));
      const anim = animatedFails < 2;
      const peeled = [], stack = [];
      const snap = (o) => Object.assign({
        mode: "C", keys, s, c, H, fp, seed, counts: cells.map((st) => st.size), peeled: peeled.slice(), stack: stack.slice(),
        B: null, assigned: [], hlCell: {}, hlKey: {}, attempt: attempt + 1,
        ctr: { "keys n": n, "cells c": c, "bits / key": ((8 * c) / n).toFixed(1), peeled: peeled.length, "stack size": stack.length, attempt: attempt + 1 },
      }, o);
      const Q = [];
      cells.forEach((st, i) => { if (st.size === 1) Q.push(i); });
      if (anim) {
        frames.push(snap({ line: 1, text: `Attempt ${attempt + 1} (seed ${seed}). Each of the ${n} keys picks one cell in each of the 3 segments (c = 3 × ${s} = ${c} cells). The small number above a cell counts the keys that touch it.` }));
        const hc = {}; Q.forEach((i) => (hc[i] = "compare"));
        frames.push(snap({ line: 2, hlCell: hc, queue: Q.slice(), text: Q.length ? `Cells ${Q.join(", ")} are touched by exactly one key: start the queue with them.` : "No cell is touched by just one key: peeling can't even start." }));
      }
      while (Q.length) {
        const i = Q.shift();
        if (cells[i].size !== 1) {
          if (anim) frames.push(snap({ line: [4, 5], hlCell: { [i]: "dim" }, queue: Q.slice(), text: `Dequeue cell ${i}: it no longer holds exactly one key (its key was already peeled elsewhere). Skip it.` }));
          continue;
        }
        const k = [...cells[i]][0];
        stack.push([k, i]); peeled.push(k);
        const newly = [];
        H[k].forEach((j) => { cells[j].delete(k); if (cells[j].size === 1) { Q.push(j); newly.push(j); } });
        if (anim) {
          const hc = { [i]: "swap" }; newly.forEach((j) => (hc[j] = "compare"));
          frames.push(snap({ line: [6, 7, 8], hlCell: hc, hlKey: { [k]: "swap" }, queue: Q.slice(),
            text: `Cell ${i} belongs to <b>${esc(keys[k])}</b> alone, so peel it: push (${esc(keys[k])}, ${i}) on the stack and remove ${esc(keys[k])} from cells ${H[k].join(", ")}.${newly.length ? ` Now cell${newly.length > 1 ? "s" : ""} ${newly.join(", ")} ${newly.length > 1 ? "are" : "is"} down to one key: enqueue.` : ""}` }));
        }
      }
      if (stack.length < n) {
        if (anim) {
          animatedFails++;
          const hc = {}; cells.forEach((st, i) => { if (st.size >= 2) hc[i] = "swap"; });
          frames.push(snap({ line: 9, hlCell: hc, text: `<b>Stuck.</b> ${n - stack.length} keys remain and every cell they touch is shared by 2 or more of them (a "2-core"). No cell can be peeled. Pick new hash seeds and start over. (With c ≈ 1.23n + 32, this is rare for large n.)` }));
        }
        continue;
      }
      // assignment in reverse order
      const B = Array(c).fill(0);
      const assigned = [];
      const askFirst = {
        q: `Peeling is done; the stack holds ${n} keys (first peeled: ${esc(keys[stack[0][0]])}, last peeled: ${esc(keys[stack[n - 1][0]])}). Which key gets its cell value first?`,
        opts: [esc(keys[stack[0][0]]) + " (first peeled)", esc(keys[stack[n - 1][0]]) + " (last peeled)", "any order works"], ans: 1,
        why: `A stack is last-in, first-out, so the last key peeled is assigned first. That order is the whole trick: when a key is assigned, the keys peeled before it haven't been assigned yet, so its private cell i is still free to choose.`,
      };
      frames.push(snap({ line: [9, 10], B: B.slice(), assigned: [], ask: askFirst, text: `All ${n} keys peeled. Now create B (all zeros) and pop the stack: each key, in reverse peeling order, sets its own cell so that the xor of its 3 cells equals its 8-bit fingerprint.` }));
      while (stack.length) {
        const [k, i] = stack.pop();
        const others = H[k].filter((j) => j !== i);
        const v = fp[k] ^ B[others[0]] ^ B[others[1]];
        B[i] = v; assigned.push(i);
        frames.push(snap({ line: [12, 13], B: B.slice(), assigned: assigned.slice(), hlCell: { [i]: "swap", [others[0]]: "compare", [others[1]]: "compare" }, hlKey: { [k]: "active" },
          text: `Pop (${esc(keys[k])}, ${i}). fp(${esc(keys[k])}) = ${b8(fp[k])}; its other cells hold ${b8(B[others[0]])} and ${b8(B[others[1]])}. B[${i}] ← ${b8(fp[k])} xor ${b8(B[others[0]])} xor ${b8(B[others[1]])} = <b>${b8(v)}</b> (0x${hx2(v)}).` }));
      }
      XF.built = { keys, s, c, H, fp, seed, B };
      frames.push(snap({ line: 14, B: B.slice(), assigned: assigned.slice(), hlKey: Object.fromEntries(keys.map((_, k) => [k, "done"])),
        text: `Built in ${attempt + 1} attempt${attempt ? "s" : ""}. Every key now satisfies fp(x) = B[h0] xor B[h1] xor B[h2], because later assignments never touch a cell an earlier-assigned key relies on. Space: ${c} cells × 8 bits = ${((8 * c) / n).toFixed(1)} bits per key here (about 9.84 for large n).` }));
      return;
    }
    frames.push({ mode: "C", keys, s, c, H: [], fp: [], counts: [], peeled: [], stack: [], B: null, assigned: [], hlCell: {}, hlKey: {}, line: 9, ctr: {}, text: "Couldn't build after 60 seeds — try different keys." });
  }
  function xLookup(q, frames) {
    const X = XF.built;
    if (!X) return;
    const hs = [0, 1, 2].map((j) => xPos(q, j, X.s, X.seed)), f = xFp(q, X.seed);
    const v = X.B[hs[0]] ^ X.B[hs[1]] ^ X.B[hs[2]];
    const member = X.keys.includes(q);
    const hc = {}; hs.forEach((i) => (hc[i] = v === f ? (member ? "done" : "swap") : "active"));
    frames.push({
      mode: "C", keys: X.keys, s: X.s, c: X.c, H: X.H, fp: X.fp, seed: X.seed, counts: Array(X.c).fill(0), peeled: [], stack: [], B: X.B.slice(), assigned: X.B.map((_, i) => i),
      hlCell: hc, hlKey: member ? { [X.keys.indexOf(q)]: "active" } : {}, query: { q, hs }, line: [16, 17],
      ctr: { "keys n": X.keys.length, "cells c": X.c, "bits / key": ((8 * X.c) / X.keys.length).toFixed(1), "lookups tested": XF.tests, "false positives": XF.fps, "expected rate": "1/256" },
      text: `"<b>${esc(q)}</b>" → cells ${hs.join(", ")}. ${b8(X.B[hs[0]])} xor ${b8(X.B[hs[1]])} xor ${b8(X.B[hs[2]])} = ${b8(v)}; fp = ${b8(f)}. ` +
        (v === f ? (member ? '<span class="ok-t">Match: in the set.</span>' : '<span class="bad-t">Match, but it was never inserted: a false positive (chance 1/256 with 8-bit fingerprints).</span>') : '<span class="ok-t">No match: definitely not in the set.</span>') +
        " Three memory reads, no matter how many keys.",
    });
  }

  function drawC(f) {
    const host = $("stageHost");
    let svg = host.querySelector("svg.stC");
    if (!svg) { host.innerHTML = ""; svg = S("svg", { class: "stage stC", role: "img", "aria-label": "Xor filter: keys connected to three cells each" }); host.appendChild(svg); }
    const W = 600, n = f.keys.length, c = f.c;
    const cw = Math.min(40, (W - 40) / c), cx0 = (W - cw * c) / 2, cy = 196, ch = 34;
    const kw = Math.min(64, (W - 20) / n - 6), ky = 44;
    const kx = (k) => 10 + ((W - 20) / n) * (k + 0.5);
    const cellX = (i) => cx0 + i * cw + cw / 2;
    const H = 300;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
    const peeled = new Set(f.peeled);
    // segment bands
    for (let j = 0; j < 3; j++) {
      const x = cx0 + j * f.s * cw;
      svg.appendChild(S("rect", { x: x + 1, y: cy + ch + 6, width: f.s * cw - 2, height: 18, rx: 4, fill: "var(--panel-2)", stroke: "var(--line)" }));
      svg.appendChild(S("text", { x: x + (f.s * cw) / 2, y: cy + ch + 19, "text-anchor": "middle", "font-size": 10.5, fill: "var(--muted)" }, `segment ${j} (h${j})`));
    }
    // edges
    if (f.H.length) f.H.forEach((hs, k) => {
      const ks = f.hlKey[k], isQ = false;
      hs.forEach((i) => {
        const dim = peeled.has(k) && !f.B;
        const col = ks === "swap" ? "var(--c-swap)" : ks === "active" ? "var(--c-active)" : dim ? "var(--line)" : "var(--line-2)";
        svg.appendChild(S("line", { x1: kx(k), y1: ky + 14, x2: cellX(i), y2: cy, stroke: col, "stroke-width": ks ? 2.5 : 1.3, "stroke-dasharray": dim && !ks ? "3 4" : null, opacity: f.query ? 0.25 : 1 }));
      });
    });
    if (f.query) {
      svg.appendChild(S("rect", { x: W / 2 - 60, y: 120, width: 120, height: 26, rx: 13, fill: "var(--c-pivot)" }));
      svg.appendChild(S("text", { x: W / 2, y: 137, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "#0d1117" }, "query: " + f.query.q));
      f.query.hs.forEach((i) => svg.appendChild(S("line", { x1: W / 2, y1: 146, x2: cellX(i), y2: cy, stroke: "var(--c-pivot)", "stroke-width": 2.5 })));
    }
    // keys
    f.keys.forEach((x, k) => {
      const ks = f.hlKey[k];
      const dim = peeled.has(k) && !f.B && !ks;
      svg.appendChild(S("rect", { x: kx(k) - kw / 2, y: ky - 14, width: kw, height: 28, rx: 8, fill: ks ? COL[ks] : dim ? "var(--c-dim)" : "var(--panel-2)", stroke: ks ? COL[ks] : dim ? "var(--c-dim)" : "var(--ember)", opacity: dim ? 0.55 : 1 }));
      svg.appendChild(S("text", { x: kx(k), y: ky + 4.5, "text-anchor": "middle", "font-size": kw < 46 ? 10.5 : 12.5, "font-weight": 700, fill: ks ? "#0d1117" : "var(--ink)" }, x.length > 7 ? x.slice(0, 6) + "…" : x));
      if (f.fp.length) svg.appendChild(S("text", { x: kx(k), y: ky - 19, "text-anchor": "middle", "font-size": 9.5, fill: "var(--muted)" }, "fp " + hx2(f.fp[k])));
    });
    // cells
    const asg = new Set(f.assigned);
    for (let i = 0; i < c; i++) {
      const st = f.hlCell[i];
      const x = cx0 + i * cw;
      svg.appendChild(S("rect", { x: x + 1.5, y: cy, width: cw - 3, height: ch, rx: 5, fill: st ? COL[st] : asg.has(i) ? "var(--panel-2)" : "var(--bg)", stroke: st ? COL[st] : "var(--line-2)" }));
      const val = f.B ? hx2(f.B[i]) : "";
      if (val) svg.appendChild(S("text", { x: x + cw / 2, y: cy + ch / 2 + 4.5, "text-anchor": "middle", "font-size": cw < 30 ? 10 : 12, "font-weight": 700, fill: st && st !== "dim" ? "#0d1117" : asg.has(i) ? "var(--ink)" : "var(--muted)" }, val));
      svg.appendChild(S("text", { x: x + cw / 2, y: cy + ch + 40, "text-anchor": "middle", "font-size": 9.5, fill: "var(--muted)" }, String(i)));
      if (!f.B && f.counts.length) svg.appendChild(S("text", { x: x + cw / 2, y: cy - 6, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: f.counts[i] === 1 ? "var(--c-compare)" : f.counts[i] ? "var(--ink-2)" : "var(--muted)" }, String(f.counts[i])));
    }
    // stack
    const st = f.stack.map(([k, i]) => `${f.keys[k]}@${i}`).join("  ");
    svg.appendChild(S("text", { x: 10, y: H - 8, "font-size": 11.5, fill: "var(--ember-2)" }, f.stack.length ? "stack (bottom → top): " + st : f.B ? "" : "stack: empty"));
  }

  /* =====================================================================
     shared: mode switching, render, controls
     ===================================================================== */
  const LEG = {
    A: `<span><i style="background:var(--c-compare)"></i>probed home</span><span><i style="background:var(--c-swap)"></i>key kicked out of this cell</span><span><i style="background:var(--c-active)"></i>evicted key's other home</span><span><i style="background:var(--c-done)"></i>placed / found</span><span><i style="background:var(--c-pivot)"></i>key in hand</span><span><i style="background:var(--ember)"></i>kick-out chain</span>`,
    B: `<span><i style="background:var(--c-compare)"></i>candidate bucket / probed bit already 1</span><span><i style="background:var(--c-swap)"></i>written / evicted / false positive</span><span><i style="background:var(--c-active)"></i>next bucket / 0 bit: definitely absent</span><span><i style="background:var(--c-done)"></i>placed / true match</span><span><i style="background:var(--c-bar)"></i>Bloom bit = 1</span><span><i style="background:var(--c-pivot)"></i>fingerprint in hand</span>`,
    C: `<span><i style="background:var(--c-compare)"></i>cell with exactly one key / other two cells</span><span><i style="background:var(--c-swap)"></i>peeled cell / value just written</span><span><i style="background:var(--c-active)"></i>key being assigned / no match</span><span><i style="background:var(--c-done)"></i>key satisfied / match</span><span><i style="background:var(--c-dim)"></i>peeled key</span><span><i style="background:var(--c-pivot)"></i>query</span>`,
  };
  const LINES = { A: LINES_A, B: LINES_B, C: LINES_C };
  let mode = "A";
  const lastFrames = { A: null, B: null, C: null };

  function render(f, i) {
    if (!f) return;
    if (f.mode === "A") drawA(f); else if (f.mode === "B") drawB(f); else drawC(f);
    codes.show(f.mode, LINES[f.mode]).highlight(f.line);
    counters(f.mode, f.ctr);
    say.say(f.text);
    $("calc").innerHTML = f.calc || (f.mode === "A" ? famText(f.fam, f.m) : f.mode === "C" ? (f.queue ? `queue: [${f.queue.join(", ")}]` : `n = ${f.keys.length} keys, c = ${f.c} cells (3 segments of ${f.s}); fingerprints are 8 bits`) : `B = ${f.B} buckets × 4 slots × ${f.f} bits = ${f.m} bits; Bloom filter: m = ${f.m} bits, k = ${f.k}`);
    pred.update(f, i);
  }
  player = Forge.player($("player"), { frames: [], render, fps: 2 });

  function load(frames) {
    pred.reset();
    lastFrames[mode] = frames;
    player.load(frames);
  }
  function run(fn) { const fr = []; fn(fr); if (fr.length) load(fr); }

  function setMode(md, quiet) {
    mode = md;
    ["A", "B", "C"].forEach((k) => {
      $("ctl" + k).hidden = k !== md;
      $("mode" + k).classList.toggle("on", k === md);
      $("mode" + k).setAttribute("aria-pressed", String(k === md));
    });
    $("expA").hidden = md !== "A";
    $("measB").hidden = md !== "B";
    $("legend").innerHTML = LEG[md];
    $("stageHost").innerHTML = "";
    if (!quiet) { try { history.replaceState(null, "", "#" + { A: "cuckoo-hashing", B: "bloom-vs-cuckoo", C: "xor-filter" }[md]); } catch (e) { /* ignore */ } }
    if (lastFrames[md]) { pred.reset(); player.load(lastFrames[md]); }
    else if (md === "A") aExample();
    else if (md === "B") bStart();
    else cBuild();
  }
  ["A", "B", "C"].forEach((k) => ($("mode" + k).onclick = () => setMode(k)));

  /* ---- Part A controls ---- */
  function aIdle(text) {
    return snapA(0, { line: null, calc: calcA(null), text });
  }
  function aBuildFrom(list, m) {
    A.maxLoop = Math.max(1, Math.min(50, +$("aLoop").value || 10));
    aReset(m);
    const frames = [];
    list.forEach((it) => { const fr = []; aInsert(it, fr, false); });
    frames.push(aIdle(`Built ${aN()} keys into two tables of m = ${A.m} (${A.totalKicks} kicks so far). Now type a key and press Insert, Lookup or Delete.`));
    load(frames);
  }
  function aExample() {
    $("aKeys").value = "20, 21, 65, 54, 64, 11, 31"; $("aM").value = 11; $("aKey").value = "32"; $("aLoop").value = 10;
    A.maxLoop = 10;
    aReset(11);
    const frames = [];
    [20, 21, 65, 54, 64, 11, 31].forEach((K) => { const fr = []; aInsert({ label: String(K), K }, fr, false); });
    frames.push(aIdle(`Classic example: 7 keys in two tables of 11 cells with h1(K) = K mod 11 and h2(K) = ⌊K/11⌋ mod 11 (load α = 7/22 ≈ 0.32). Press Insert to add 32 and watch the kick-out chain.`));
    load(frames);
  }
  $("aExample").onclick = aExample;
  $("aBuild").onclick = () => {
    const list = $("aKeys").value.split(/[,;\s]+/).map(parseKey).filter(Boolean).slice(0, 40);
    aBuildFrom(list, Math.max(5, Math.min(23, +$("aM").value || 11)));
  };
  const aKeyNow = () => parseKey($("aKey").value);
  $("aIns").onclick = () => { const k = aKeyNow(); if (!k) return; A.maxLoop = Math.max(1, Math.min(50, +$("aLoop").value || 10)); run((fr) => aInsert(k, fr, true)); };
  $("aFind").onclick = () => { const k = aKeyNow(); if (k) run((fr) => aLookup(k, fr)); };
  $("aDel").onclick = () => { const k = aKeyNow(); if (k) run((fr) => aDelete(k, fr)); };
  $("aRand").onclick = () => {
    A.maxLoop = Math.max(1, Math.min(50, +$("aLoop").value || 10));
    const fr = [];
    for (let j = 0; j < 5; j++) { const K = 1 + Math.floor(Math.random() * 999); aInsert({ label: String(K), K }, fr, j === 0); }
    load(fr);
  };

  /* ---- Part A experiment ---- */
  $("expRun").onclick = () => {
    const m = +$("expM").value, trials = 30;
    const bins = Array.from({ length: 10 }, () => [0, 0]);
    const loads = [];
    for (let t = 0; t < trials; t++) {
      const fam = newFam(5000 + t * 17 + m);
      const T = [Array(m).fill(null), Array(m).fill(null)];
      const r = Forge.rng(77 + t);
      const used = new Set();
      let n = 0;
      for (;;) {
        let K; do { K = Math.floor(r() * 1000000); } while (used.has(K));
        used.add(K);
        const kicks = placeSilent(T, fam, m, { label: "", K }, 500);
        if (kicks < 0) break;
        const a = n / (2 * m), b = Math.min(9, Math.floor(a / 0.05));
        bins[b][0] += kicks; bins[b][1]++;
        n++;
        if (n >= 2 * m) break;
      }
      loads.push(n / (2 * m));
    }
    const avg = loads.reduce((s, v) => s + v, 0) / trials;
    $("expOut").innerHTML = `Average load factor at the first failed insertion: <b>${avg.toFixed(3)}</b> (lowest ${Math.min(...loads).toFixed(3)}, highest ${Math.max(...loads).toFixed(3)}) over ${trials} runs with m = ${m}. Theory: two-table cuckoo hashing succeeds with high probability while α stays a bit below 1/2; the threshold is exactly 1/2 as m grows, and small tables scatter around it.`;
    const svg = $("expChart"); svg.removeAttribute("hidden");
    const W = 640, H = 220, L = 50, R = 12, T = 12, Bm = 36;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
    const vals = bins.map(([s, c]) => (c ? s / c : 0));
    const mx = Math.max(1, ...vals);
    const bw = (W - L - R) / 10;
    for (let g = 0; g <= 4; g++) {
      const v = (mx * g) / 4, y = H - Bm - ((H - Bm - T) * g) / 4;
      svg.appendChild(S("line", { x1: L, x2: W - R, y1: y, y2: y, stroke: "var(--line)" }));
      svg.appendChild(S("text", { x: L - 6, y: y + 4, "text-anchor": "end", "font-size": 10, fill: "var(--muted)" }, v.toFixed(1)));
    }
    vals.forEach((v, b) => {
      const h = ((H - Bm - T) * v) / mx;
      svg.appendChild(S("rect", { x: L + b * bw + 4, y: H - Bm - h, width: bw - 8, height: Math.max(0, h), rx: 3, fill: b >= 9 ? "var(--c-swap)" : "var(--ember)" }, S("title", null, `α ${(b * 0.05).toFixed(2)}–${((b + 1) * 0.05).toFixed(2)}: ${v.toFixed(2)} kicks per insert`)));
      svg.appendChild(S("text", { x: L + b * bw + bw / 2, y: H - Bm + 14, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, b === 9 ? "0.45+" : (b * 0.05).toFixed(2)));
    });
    svg.appendChild(S("text", { x: (L + W - R) / 2, y: H - 4, "text-anchor": "middle", "font-size": 11, fill: "var(--ink-2)" }, "load factor α when the key was inserted → average kicks per insert"));
  };

  /* ---- Part B controls ---- */
  function bIdle(text) { return snapB(0, { line: null, text }); }
  function bStart() {
    BF.B = +$("bB").value; BF.f = Math.max(4, Math.min(12, +$("bF").value || 8)); BF.k = Math.max(1, Math.min(10, +$("bK").value || 4));
    bRebuild(); drawChips();
    load([bIdle(`Two empty filters with the same memory: ${BF.m} bits. Type an item and press Insert (try "apple").`)]);
  }
  function bSettings() {
    BF.B = +$("bB").value; BF.f = Math.max(4, Math.min(12, +$("bF").value || 8)); BF.k = Math.max(1, Math.min(10, +$("bK").value || 4));
    bRebuild(); drawChips();
    load([bIdle(`Rebuilt both filters from the ${BF.items.length} inserted items: B = ${BF.B}, f = ${BF.f}, so m = ${BF.m} bits each; Bloom k = ${BF.k}.`)]);
  }
  ["bB", "bF", "bK"].forEach((id) => ($(id).onchange = bSettings));
  const bItem = () => norm($("bItem").value);
  $("bIns").onclick = () => { const x = bItem(); if (!x) return; run((fr) => bInsert(x, fr, true)); drawChips(); };
  $("bFind").onclick = () => { const x = bItem(); if (x) run((fr) => bLookup(x, fr, true)); };
  $("bDel").onclick = () => { const x = bItem(); if (!x) return; run((fr) => bDelete(x, fr)); drawChips(); };
  $("bReset").onclick = () => { BF.items = []; bStart(); };
  const WORDS = ["pear", "plum", "kiwi", "lime", "fig", "date", "grape", "mango", "melon", "peach", "lemon", "berry", "olive", "guava", "papaya", "cherry", "quince", "apricot", "banana", "orange", "nectar", "almond", "cashew", "walnut", "pecan", "hazel", "acorn", "maple", "cedar", "birch", "aspen", "willow", "spruce", "larch", "elm", "oak", "ash", "yew", "pine", "fir"];
  $("bRand").onclick = () => {
    const fr = [];
    let added = 0, guard = 0;
    while (added < 8 && guard++ < 200) {
      const w = WORDS[Math.floor(Math.random() * WORDS.length)] + (Math.random() < 0.5 ? "" : Math.floor(Math.random() * 90 + 10));
      if (BF.items.includes(w)) continue;
      if (BF.victim) break;
      bInsert(w, fr, false); added++;
    }
    if (fr.length) load(fr);
    drawChips();
  };
  $("measRun").onclick = () => {
    $("measNote").textContent = "measuring…";
    setTimeout(() => { const r = measureOnce(BF.f); measTable([r]); $("measNote").textContent = r.failed ? `first insertion failure at load ${r.alpha.toFixed(3)}` : "stopped at 95% load"; }, 20);
  };
  $("measSweep").onclick = () => {
    $("measNote").textContent = "measuring f = 4 … 16…";
    setTimeout(() => {
      const rows = [4, 6, 8, 10, 12, 14, 16].map(measureOnce);
      measTable(rows); measChart(rows);
      $("measNote").textContent = "done";
    }, 20);
  };

  /* ---- Part C controls ---- */
  function cKeys() {
    const ks = [...new Set($("cKeys").value.split(/[,;\s]+/).map(norm).filter(Boolean))].slice(0, 10);
    return ks.length >= 2 ? ks : ["ant", "bee"];
  }
  function cBuild() {
    XF.tests = 0; XF.fps = 0;
    run((fr) => xBuild(cKeys(), fr));
  }
  $("cBuild").onclick = cBuild;
  const ANIMALS = ["ant", "bee", "cat", "dog", "eel", "fox", "gnu", "hen", "ibis", "jay", "koi", "lynx", "mole", "newt", "owl", "pig", "quail", "ram", "seal", "toad", "urchin", "vole", "wasp", "yak", "zebu"];
  $("cRand").onclick = () => {
    const n = 5 + Math.floor(Math.random() * 5);
    const pool = ANIMALS.slice().sort(() => Math.random() - 0.5).slice(0, n);
    $("cKeys").value = pool.join(", ");
    XF.seed = 1 + Math.floor(Math.random() * 1000);
    cBuild();
  };
  $("cFind").onclick = () => { const q = norm($("cQ").value); if (q && XF.built) run((fr) => xLookup(q, fr)); };
  $("cTest").onclick = () => {
    const X = XF.built; if (!X) return;
    for (let t = 0; t < 10000; t++) {
      const q = "nm" + XF.tests + "#";
      XF.tests++;
      if (X.keys.includes(q)) continue;
      const hs = [0, 1, 2].map((j) => xPos(q, j, X.s, X.seed));
      if ((X.B[hs[0]] ^ X.B[hs[1]] ^ X.B[hs[2]]) === xFp(q, X.seed)) XF.fps++;
    }
    const fr = [];
    xLookup(norm($("cQ").value) || "cat", fr);
    fr[0].text = `Tested ${XF.tests.toLocaleString()} keys that were never inserted: <b>${XF.fps}</b> false positives = ${pct(XF.fps / XF.tests)}. Expected with 8-bit fingerprints: 1/256 ≈ 0.39%. (Shown below: the current query.) ` + fr[0].text;
    load(fr);
  };

  /* ---- start ---- */
  const startMode = { "#bloom-vs-cuckoo": "B", "#xor-filter": "C" }[location.hash] || "A";
  setMode(startMode, true);
})();
