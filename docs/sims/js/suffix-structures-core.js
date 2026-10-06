/* =====================================================================
   Algorithm Forge — Suffix structures core (docs/sims/suffix-structures.html)
   Suffix array by prefix doubling, LCP array by Kasai et al., the
   Burrows–Wheeler Transform (BWT) with LF-mapping inversion, and FM-index
   backward search. Each recorder returns {lines, frames, result}.
   Pure functions: also loaded by Node for brute-force cross-checks.
   ===================================================================== */
(function (root) {
  "use strict";

  /* ---------- helpers ---------- */
  function parseSpec(spec) {
    const L = {}, lines = [];
    spec.forEach((s) => { const m = /^@(\w+)\|(.*)$/.exec(s); if (m) { L[m[1]] = lines.length; lines.push(m[2]); } else lines.push(s); });
    return { L, lines };
  }
  function Rec(spec) {
    const P = parseSpec(spec), frames = [], c = {};
    const one = (k) => { if (k == null || typeof k === "number") return k; if (!(k in P.L)) throw new Error("no line " + k); return P.L[k]; };
    return {
      lines: P.lines, frames, c,
      push(line, text, d) {
        const f = Object.assign({ line: Array.isArray(line) ? line.map(one) : one(line), text, c: Object.assign({}, c) }, d || {});
        frames.push(f);
        return f;
      },
    };
  }
  const chCmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const show = (ch) => (ch === "$" ? "$" : `'${ch}'`);
  const plural = (k, w, ws) => `${k} ${k === 1 ? w : ws || w + "s"}`;
  const ord = (k) => k + (k % 100 >= 11 && k % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] || "th");
  function hashStr(s) { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; }
  /** A multiple-choice ask with the correct value and up to 3 distractors (numbers sorted). */
  function mkAsk(q, correct, pool, why) {
    const c = String(correct);
    const uniq = [...new Set(pool.map(String))].filter((x) => x !== c);
    if (!uniq.length) return null;
    uniq.sort((a, b) => hashStr(a + q) - hashStr(b + q));
    const opts = [c, ...uniq.slice(0, 3)];
    if (opts.every((x) => /^-?\d+$/.test(x))) opts.sort((a, b) => a - b);
    return { q, opts, ans: opts.indexOf(c), why };
  }
  function keepAsks(frames, max) {
    const idx = frames.map((f, i) => (f.ask ? i : -1)).filter((i) => i >= 0);
    if (idx.length > max) {
      const keep = new Set();
      for (let t = 0; t < max; t++) keep.add(idx[Math.round((t * (idx.length - 1)) / Math.max(1, max - 1))]);
      frames.forEach((f, i) => { if (!keep.has(i)) delete f.ask; });
    }
    return frames;
  }
  /** Stable merge sort that counts comparisons. */
  function msort(a, cmp, cnt) {
    if (a.length < 2) return a.slice();
    const mid = a.length >> 1, l = msort(a.slice(0, mid), cmp, cnt), r = msort(a.slice(mid), cmp, cnt), out = [];
    let i = 0, j = 0;
    while (i < l.length && j < r.length) { cnt.n++; if (cmp(r[j], l[i]) < 0) out.push(r[j++]); else out.push(l[i++]); }
    while (i < l.length) out.push(l[i++]);
    while (j < r.length) out.push(r[j++]);
    return out;
  }

  /** Normalise user text: spaces → _, drop characters other than letters/digits/_, one $ at the end. */
  function normalize(s, max) {
    max = max || 24;
    let t = String(s).replace(/\s/g, "_").replace(/[^A-Za-z0-9_]/g, "");
    let note = "";
    if (t.length > max - 1) { t = t.slice(0, max - 1); note = `Cut to ${max - 1} characters (plus $) so every row fits.`; }
    return { text: t + "$", note };
  }

  /* ---------- plain algorithms ---------- */
  function suffixArray(T) {
    const n = T.length, cnt = { n: 0 };
    let SA = msort([...Array(n).keys()], (a, b) => chCmp(T[a], T[b]), cnt);
    let rank = Array(n);
    rank[SA[0]] = 0;
    for (let r = 1; r < n; r++) rank[SA[r]] = rank[SA[r - 1]] + (T[SA[r]] === T[SA[r - 1]] ? 0 : 1);
    let k = 1, rounds = 0;
    while (rank[SA[n - 1]] < n - 1) {
      rounds++;
      const key = (i) => [rank[i], i + k < n ? rank[i + k] : -1];
      const cmp = (a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1]; };
      SA = msort(SA, cmp, cnt);
      const nr = Array(n); nr[SA[0]] = 0;
      for (let r = 1; r < n; r++) nr[SA[r]] = nr[SA[r - 1]] + (cmp(SA[r], SA[r - 1]) === 0 ? 0 : 1);
      rank = nr; k *= 2;
    }
    return { SA, rounds, comparisons: cnt.n };
  }
  function kasai(T, SA) {
    const n = T.length, rank = Array(n), LCP = Array(n).fill(0);
    let h = 0, cmps = 0;
    for (let r = 0; r < n; r++) rank[SA[r]] = r;
    for (let i = 0; i < n; i++) {
      if (rank[i] > 0) {
        const j = SA[rank[i] - 1];
        while (i + h < n && j + h < n) { cmps++; if (T[i + h] === T[j + h]) h++; else break; }
        LCP[rank[i]] = h;
        if (h > 0) h--;
      } else h = 0;
    }
    return { LCP, comparisons: cmps };
  }
  function bwtFromSA(T, SA) { const n = T.length; return SA.map((s) => T[(s + n - 1) % n]).join(""); }
  function countTable(L) {
    const chars = [...new Set(L)].sort(chCmp), C = {};
    let acc = 0;
    chars.forEach((c) => { C[c] = acc; acc += [...L].filter((x) => x === c).length; });
    return { chars, C };
  }
  /** Occ(c, i) = number of c in L[0..i-1]. */
  function occ(L, c, i) { let k = 0; for (let t = 0; t < i; t++) if (L[t] === c) k++; return k; }
  function inverseBWT(L) {
    const n = L.length, { C } = countTable(L), T = Array(n);
    let r = 0; T[n - 1] = "$";
    for (let k = n - 2; k >= 0; k--) { const c = L[r]; T[k] = c; r = C[c] + occ(L, c, r); }
    return T.join("");
  }
  function runs(L) {
    const out = [];
    for (let k = 0; k < L.length; k++) { if (out.length && out[out.length - 1].c === L[k]) out[out.length - 1].len++; else out.push({ c: L[k], len: 1, at: k }); }
    return out;
  }
  function backwardSearch(L, SA, P) {
    const n = L.length, { C } = countTable(L);
    let sp = 0, ep = n - 1, occQ = 0;
    for (let k = P.length - 1; k >= 0; k--) {
      const c = P[k];
      if (!(c in C)) return { count: 0, sp: 1, ep: 0, positions: [], occQ };
      sp = C[c] + occ(L, c, sp); ep = C[c] + occ(L, c, ep + 1) - 1; occQ += 2;
      if (sp > ep) return { count: 0, sp, ep, positions: [], occQ };
    }
    return { count: ep - sp + 1, sp, ep, positions: SA.slice(sp, ep + 1).sort((a, b) => a - b), occQ };
  }

  /* ---------- pseudocode listings ---------- */
  const SPEC = {
    sa: [
      "@h|ALGORITHM SuffixArrayDoubling(T[0..n-1])",
      "    // T ends with a unique smallest $",
      "@r0|    sort starts 0..n − 1 by first character",
      "@rk0|    rank[i] ← # distinct chars smaller than T[i]",
      "@k1|    k ← 1",
      "@loop|    while two suffixes share a rank do",
      "@key|        key(i) ← (rank[i], rank[i + k])",
      "@sort|        sort SA by key    // 2k chars decided",
      "@nr0|        nr[SA[0]] ← 0",
      "@nrl|        for r ← 1 to n − 1 do",
      "@same|            if key(SA[r]) = key(SA[r − 1]) then",
      "@sameb|                nr[SA[r]] ← nr[SA[r − 1]]",
      "@diff|            else nr[SA[r]] ← nr[SA[r − 1]] + 1",
      "@dbl|        rank ← nr; k ← 2k",
      "@ret|    return SA",
    ],
    lcp: [
      "@h|ALGORITHM KasaiLCP(T[0..n-1], SA[0..n-1])",
      "@inv|    for r ← 0 to n − 1 do rank[SA[r]] ← r",
      "@h0|    h ← 0; LCP[0] ← 0",
      "@for|    for i ← 0 to n − 1 do      // text order",
      "@if|        if rank[i] > 0 then",
      "@j|            j ← SA[rank[i] − 1]   // row above",
      "@wh|            while T[i + h] = T[j + h] do h ← h + 1",
      "@set|            LCP[rank[i]] ← h",
      "@dec|            if h > 0 then h ← h − 1",
      "@else|        else h ← 0",
      "@ret|    return LCP",
    ],
    bwt: [
      "@h|ALGORITHM BWT(T[0..n-1])",
      "@rot|    M ← the n rotations of T",
      "@sort|    sort the rows of M      // row r starts at SA[r]",
      "@last|    for r ← 0 to n − 1 do L[r] ← last char of row r",
      "@ret|    return L                // L[r] = T[SA[r] − 1]",
      "",
      "@ih|ALGORITHM InverseBWT(L[0..n-1])",
      "@C|    C[c] ← # characters in L smaller than c",
      "@init|    r ← 0; T[n − 1] ← $     // row 0 starts with $",
      "@ifor|    for k ← n − 2 downto 0 do",
      "@take|        T[k] ← L[r]",
      "@lf|        r ← C[L[r]] + Occ(L[r], r)   // LF(r)",
      "@iret|    return T",
    ],
    fm: [
      "@h|ALGORITHM BackwardSearch(P[0..m-1])",
      "    // L = BWT(T); Occ(c, i) = # of c in L[0..i−1]",
      "@init|    sp ← 0; ep ← n − 1      // all rows",
      "@for|    for k ← m − 1 downto 0 do",
      "@c|        c ← P[k]",
      "@sp|        sp ← C[c] + Occ(c, sp)",
      "@ep|        ep ← C[c] + Occ(c, ep + 1) − 1",
      "@empty|        if sp > ep then return 0",
      "@ret|    return ep − sp + 1      // rows sp..ep",
      "@loc|    // positions: SA[sp], …, SA[ep]",
    ],
  };

  /* ---------- (a) suffix array by prefix doubling ---------- */
  function recSA(T) {
    const n = T.length, R = Rec(SPEC.sa), cnt = { n: 0 };
    const maxRounds = Math.ceil(Math.log2(n));
    R.c.round = 0; R.c.k = 1; R.c.cmp = 0; R.c.distinct = 0;
    const snap = (SA, rank, extra) => Object.assign({ order: SA.slice(), rank: rank ? SA.map((s) => rank[s]) : null }, extra || {});
    let SA = [...Array(n).keys()];
    R.push("h", `The text has n = ${n} characters, so it has ${n} suffixes; row r shows the suffix that starts at position i. A suffix array is the list of starts in sorted order. Sorting the suffixes as strings could cost O(n) per comparison, so instead we sort on short prefixes and <b>double</b> their length each round.`, snap(SA, null, { prefix: 0 }));
    SA = msort(SA, (a, b) => chCmp(T[a], T[b]), cnt); R.c.cmp = cnt.n;
    let rank = Array(n);
    rank[SA[0]] = 0;
    for (let r = 1; r < n; r++) rank[SA[r]] = rank[SA[r - 1]] + (T[SA[r]] === T[SA[r - 1]] ? 0 : 1);
    R.c.distinct = rank[SA[n - 1]] + 1;
    R.push(["r0", "rk0"], `Round 0: sort by the first character only (${cnt.n} comparisons) and give each suffix a rank: equal first characters get equal ranks. ${R.c.distinct} distinct ranks so far; the purple bars mark rows that are still tied.`, snap(SA, rank, { prefix: 1 }));
    let k = 1;
    while (rank[SA[n - 1]] < n - 1) {
      R.c.round++; R.c.k = k;
      const kr = rank.slice();
      const key = (i) => [kr[i], i + k < n ? kr[i + k] : -1];
      const cmp = (a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1]; };
      const pairs = (S) => S.map((s) => key(s));
      // will this be the last round?
      const trial = msort(SA, cmp, { n: 0 });
      let dis = 1; for (let r = 1; r < n; r++) if (cmp(trial[r], trial[r - 1])) dis++;
      const last = dis === n;
      R.push(["loop", "key"], `Round ${R.c.round} (k = ${k}): rank[i] already orders suffixes by their first ${k} character${k > 1 ? "s" : ""}. Pair it with rank[i + ${k}], the rank of the next ${k} characters, and the pair orders them by their first ${2 * k}. No characters are compared: only ranks.`,
        snap(SA, rank, { prefix: k, pairs: pairs(SA), ask: { q: `Round ${R.c.round}: after sorting by these pairs, will every suffix have its own rank (so this is the last round)?`, opts: ["Yes, all distinct", "No, some still tie"], ans: last ? 0 : 1, why: last ? `Every pair is different, so all ${n} ranks become distinct.` : `Only ${dis} different pairs for ${n} suffixes: some suffixes share their first ${2 * k} characters, so another round is needed.` } }));
      const before = cnt.n;
      SA = msort(SA, cmp, cnt); R.c.cmp = cnt.n;
      R.push("sort", `Sort the rows by their pairs (${cnt.n - before} pair comparisons with merge sort; a radix sort on the two ranks would do it in O(n)). Rows are now ordered by their first ${2 * k} characters.`, snap(SA, rank, { prefix: 2 * k, pairs: pairs(SA), oldRank: true }));
      const nr = Array(n); nr[SA[0]] = 0;
      const shown = {};
      shown[0] = 0;
      R.push("nr0", `Give new ranks (nr) from the top. Row 0 (suffix ${SA[0]}) gets rank 0.`, snap(SA, null, { prefix: 2 * k, pairs: pairs(SA), newRank: Object.assign({}, shown), cur: 0 }));
      for (let r = 1; r < n; r++) {
        const same = cmp(SA[r], SA[r - 1]) === 0;
        nr[SA[r]] = nr[SA[r - 1]] + (same ? 0 : 1);
        shown[r] = nr[SA[r]];
        if (n <= 14 || !same || r === n - 1 || r % 3 === 0) {
          R.push(same ? ["nrl", "same", "sameb"] : ["nrl", "same", "diff"], same ? `Row ${r}: pair (${key(SA[r]).join(", ")}) equals the pair above, so suffix ${SA[r]} keeps sharing rank ${nr[SA[r]]}: its first ${2 * k} characters equal the row above.` : `Row ${r}: pair (${key(SA[r]).join(", ")}) differs from (${key(SA[r - 1]).join(", ")}) above, so suffix ${SA[r]} gets a new rank ${nr[SA[r]]}.`,
            snap(SA, null, { prefix: 2 * k, pairs: pairs(SA), newRank: Object.assign({}, shown), cur: r, prev: r - 1 }));
        }
      }
      rank = nr; k *= 2;
      R.c.distinct = rank[SA[n - 1]] + 1; R.c.k = k;
      R.push("dbl", R.c.distinct === n ? `All ${n} ranks are distinct: the order is final after ${R.c.round} doubling round${R.c.round > 1 ? "s" : ""} (the bound is ⌈log₂ ${n}⌉ = ${maxRounds}).` : `${R.c.distinct} distinct ranks out of ${n}. Some suffixes still share their first ${k} characters: double k to ${k} and go again.`, snap(SA, rank, { prefix: k }));
    }
    R.push("ret", `Suffix array SA = [${SA.join(", ")}]. ${R.c.round} doubling round${R.c.round === 1 ? "" : "s"} (at most ⌈log₂ n⌉ = ${maxRounds}) × one sort each. With a comparison sort that is O(n log² n); sorting the rank pairs by radix sort makes each round O(n) and the whole build O(n log n).`, snap(SA, rank, { prefix: n, final: true }));
    return { lines: R.lines, frames: keepAsks(R.frames, 3), result: { SA, rounds: R.c.round, comparisons: cnt.n } };
  }

  /* ---------- (b) LCP by Kasai ---------- */
  function recLCP(T) {
    const n = T.length, R = Rec(SPEC.lcp);
    const { SA } = suffixArray(T);
    const rank = Array(n); for (let r = 0; r < n; r++) rank[SA[r]] = r;
    const LCP = Array(n).fill(null);
    R.c.i = "–"; R.c.h = 0; R.c.cmp = 0; R.c.skipped = 0;
    const base = (extra) => Object.assign({ order: SA, lcp: LCP.slice() }, extra || {});
    R.push(["h", "inv"], `Start from the finished suffix array. LCP[r] will be the length of the Longest Common Prefix of row r and the row above it. Comparing every pair of neighbours from scratch could cost Θ(n²) character comparisons; Kasai's trick visits the suffixes in <b>text</b> order instead.`, base());
    LCP[0] = 0;
    R.push("h0", `LCP[0] = 0 (there is no row above row 0). h will carry knowledge from one suffix to the next.`, base());
    let h = 0, asks = 0;
    for (let i = 0; i < n; i++) {
      R.c.i = i;
      if (rank[i] === 0) { h = 0; R.c.h = 0; R.push(["for", "else"], `i = ${i}: suffix ${i} is "$", the top row, with nothing above it. Set h = 0.`, base({ cur: rank[i], tpos: { [i]: "active" } })); continue; }
      const r = rank[i], j = SA[r - 1], h0 = h;
      R.c.skipped += h0;
      let hEnd = h0; while (i + hEnd < n && j + hEnd < n && T[i + hEnd] === T[j + hEnd]) hEnd++;
      const known = {}; for (let t = 0; t < h0; t++) known[t] = "pivot";
      let ask = null;
      if (asks < 6 && hEnd - h0 >= 0) {
        asks++;
        ask = mkAsk(`Suffix ${i} sits in row ${r}; the row above holds suffix ${j}. The first ${h0} character${h0 === 1 ? " is" : "s are"} already known to match. What will LCP[${r}] be?`, hEnd, [h0, h0 + 1, h0 + 2, hEnd + 1, Math.max(0, hEnd - 1), 0], `Compare from offset ${h0}: ${hEnd - h0} more character${hEnd - h0 === 1 ? "" : "s"} match, then they differ. LCP[${r}] = ${hEnd}.`);
      }
      R.push(["for", "if", "j"], `i = ${i}: suffix ${i} is in row rank[${i}] = ${r}; the row above holds j = SA[${r - 1}] = ${j}. ${h0 > 0 ? `<b>We already know the first ${h0} character${h0 > 1 ? "s" : ""} match</b> (purple): suffix ${i - 1} shared ${h0 + 1} with its neighbour, and chopping one character off both keeps ${h0} in common. Start comparing at offset ${h0}.` : "h = 0, so compare from the first character."}`,
        base({ cur: r, prev: r - 1, cellA: Object.assign({}, known), cellB: Object.assign({}, known), tpos: { [i]: "active", [j]: "compare" }, ask }));
      const A = Object.assign({}, known), B = Object.assign({}, known);
      while (i + h < n && j + h < n) {
        R.c.cmp++;
        const eq = T[i + h] === T[j + h];
        A[h] = B[h] = eq ? "done" : "swap";
        const txt = eq ? `T[${i + h}] = T[${j + h}] = ${show(T[i + h])}: match, h = ${h + 1}.` : `T[${i + h}] = ${show(T[i + h])} ≠ T[${j + h}] = ${show(T[j + h])}: stop.`;
        if (eq) { h++; R.c.h = h; }
        R.push("wh", txt, base({ cur: r, prev: r - 1, cellA: Object.assign({}, A), cellB: Object.assign({}, B), tpos: { [i]: "active", [j]: "compare" } }));
        if (!eq) break;
      }
      LCP[r] = h;
      R.push("set", `LCP[${r}] = ${h}: rows ${r - 1} and ${r} share their first ${h} character${h === 1 ? "" : "s"}.`, base({ cur: r, prev: r - 1, cellA: A, cellB: B, hlL: r, tpos: { [i]: "active", [j]: "compare" } }));
      if (h > 0) { h--; R.c.h = h; R.push("dec", `h = ${h}: the next suffix, ${i + 1}, is this one minus its first character, so it shares at least ${h} with some suffix above it. h never drops by more than 1 per step.`, base({ cur: r, hlL: r })); }
    }
    const mx = Math.max(...LCP), at = LCP.indexOf(mx);
    R.push("ret", `LCP = [${LCP.join(", ")}]. ${R.c.cmp} character comparisons in total, at most 2n = ${2 * n}: h rises by at most n overall and falls by at most 1 per step, and each i ends with at most one mismatch. ${mx > 0 ? `The largest value, ${mx}, gives the longest repeated substring "${T.substr(SA[at], mx)}".` : ""}`, base({ hlL: at, final: true, lrs: mx > 0 ? { r: at, len: mx } : null }));
    return { lines: R.lines, frames: keepAsks(R.frames, 3), result: { SA, LCP, comparisons: R.c.cmp } };
  }

  /* ---------- (c) BWT and its inversion ---------- */
  function recBWT(T) {
    const n = T.length, R = Rec(SPEC.bwt);
    const { SA } = suffixArray(T);
    const L = bwtFromSA(T, SA), RU = runs(L);
    R.c.n = n; R.c.runs = "–"; R.c.occ = 0; R.c.recovered = 0;
    const ident = [...Array(n).keys()];
    R.push(["h", "rot"], `Write all ${n} rotations of T: row i starts at position i and wraps around the end. (Because $ is unique and smallest, sorting rotations gives the same order as sorting suffixes.)`, { order: ident, rot: true });
    R.push("sort", `Sort the rows. Row r now starts at SA[r]; the first column F is just the characters of T in sorted order.`, { order: SA, rot: true, colF: true });
    R.push(["last", "ret"], `The last column L is the BWT: "${L}". Each L[r] is the character that comes just <b>before</b> row r's suffix in T. Similar contexts sort together, so equal characters cluster into runs.`, { order: SA, rot: true, colF: true, colL: true });
    R.c.runs = RU.length;
    R.push("ret", `L has r = ${RU.length} run${RU.length > 1 ? "s" : ""} of equal characters in n = ${n} positions (run-length code: ${RU.map((x) => x.c + (x.len > 1 ? "×" + x.len : "")).join(" ")}). The more repetitive the text, the fewer and longer the runs, which is why compressors such as bzip2 use the BWT and why the r-index stores only O(r) values.`, { order: SA, rot: true, colF: true, colL: true, showRuns: true });
    // inversion
    const { chars, C } = countTable(L);
    R.push(["ih", "C"], `Now forget T: can we rebuild it from L alone? Sorting L gives F. C[c] counts characters smaller than c: ${chars.map((c) => `C[${c}] = ${C[c]}`).join(", ")}. So the rows whose F is c are rows C[c] … C[c] + (count of c) − 1.`, { order: SA, rot: true, colF: true, colL: true, onlyFL: true, Ctab: C, rebuilt: Array(n).fill(null) });
    const Tr = Array(n).fill(null); Tr[n - 1] = "$";
    let r = 0;
    R.c.recovered = 1;
    R.push("init", `Row 0 is the rotation that starts with $, so T ends with $. Its last character L[0] = ${show(L[0])} is the character just before $ in T.`, { order: SA, rot: true, colF: true, colL: true, onlyFL: true, Ctab: C, rebuilt: Tr.slice(), cur: 0 });
    let asks = 0;
    for (let k = n - 2; k >= 0; k--) {
      const c = L[r], o = occ(L, c, r), nr = C[c] + o;
      Tr[k] = c; R.c.recovered++;
      const before = {}; for (let t = 0; t < r; t++) if (L[t] === c) before[t] = true;
      let ask = null;
      if (asks < 4 && k <= n - 3) {
        asks++;
        const cnt = [...L].filter((x) => x === c).length;
        const pool = []; for (let t = 0; t < cnt; t++) pool.push(C[c] + t);
        pool.push(r, Math.max(0, nr - 1), Math.min(n - 1, nr + 1));
        ask = mkAsk(`L[${r}] = ${show(c)} is the ${ord(o + 1)} ${show(c)} in L (counting from the top). Which row of F holds that same ${show(c)}, the row we jump to next?`, nr, pool, `The k-th ${show(c)} in L and the k-th ${show(c)} in F are the same character of T: LF(${r}) = C[${c}] + Occ(${c}, ${r}) = ${C[c]} + ${o} = ${nr}.`);
      }
      R.push(["ifor", "take"], `k = ${k}: row ${r}'s last character is the one just before row ${r}'s first character in T, so T[${k}] = L[${r}] = ${show(c)}. To continue we need the row that <i>starts</i> with this very ${show(c)}. The ringed cells are the ${o} ${show(c)}'s above it in L.`, { order: SA, rot: true, colF: true, colL: true, onlyFL: true, Ctab: C, rebuilt: Tr.slice(), cur: r, ringL: before, newPos: k, ask, Lmark: { [r]: true } });
      R.c.occ++;
      R.push("lf", `It is the ${ord(o + 1)} ${show(c)} in L (Occ(${c}, ${r}) = ${o}), so it is also the ${ord(o + 1)} ${show(c)} in F: equal characters keep their relative order, because both columns sort them by the text that follows. LF(${r}) = C[${c}] + ${o} = ${nr}. Jump to row ${nr}.`, { order: SA, rot: true, colF: true, colL: true, onlyFL: true, Ctab: C, rebuilt: Tr.slice(), cur: r, arrow: [r, nr], ringL: before, newPos: k });
      r = nr;
    }
    R.push("iret", `Rebuilt T = "${Tr.join("")}" from L alone, right to left, with ${n - 1} LF steps. The transform is reversible, so it is a real compression step, not a lossy summary.`, { order: SA, rot: true, colF: true, colL: true, onlyFL: true, Ctab: C, rebuilt: Tr.slice(), final: true });
    return { lines: R.lines, frames: keepAsks(R.frames, 3), result: { SA, L, runs: RU.length, inverse: Tr.join("") } };
  }

  /* ---------- (d) FM-index backward search ---------- */
  function recFM(T, P) {
    const n = T.length, R = Rec(SPEC.fm);
    const { SA } = suffixArray(T);
    const L = bwtFromSA(T, SA), { chars, C } = countTable(L);
    R.c.k = "–"; R.c.occ = 0; R.c.rows = n; R.c.matches = "–";
    const m = P.length;
    const base = (extra) => Object.assign({ order: SA, rot: true, colF: true, colL: true, onlyFL: true, showSA: true, Ctab: C, pat: P }, extra || {});
    R.push(["h"], `The FM-index keeps only L = "${L}", the table C (${chars.map((c) => `C[${c}] = ${C[c]}`).join(", ")}), a way to answer Occ(c, i) quickly, and a sample of the suffix array. Search for P = "${P}" <b>backward</b>, from its last character to its first.`, base({ band: null, pdone: m }));
    let sp = 0, ep = n - 1;
    R.push("init", `Start with every row: [sp, ep] = [0, ${n - 1}]. Each row is a rotation, so every row "starts with" the empty string.`, base({ band: [sp, ep], pdone: m }));
    let found = true, asks = 0;
    for (let k = m - 1; k >= 0; k--) {
      const c = P[k];
      R.c.k = k;
      const inband = {}; for (let t = sp; t <= ep; t++) if (L[t] === c) inband[t] = true;
      const has = c in C;
      const osp = has ? occ(L, c, sp) : 0, oep = has ? occ(L, c, ep + 1) : 0;
      const nsp = has ? C[c] + osp : 0, nep = has ? C[c] + oep - 1 : -1;
      const cntNew = has ? Math.max(0, nep - nsp + 1) : 0;
      let ask = null;
      if (asks < 3) {
        asks++;
        ask = mkAsk(`Rows ${sp}–${ep} start with "${P.slice(k + 1)}". How many of them have ${show(c)} in the L column, i.e. how many rows will start with "${P.slice(k)}"?`, cntNew, [0, 1, 2, 3, ep - sp + 1, cntNew + 1], `Count the ${show(c)}'s in L between rows ${sp} and ${ep}: ${cntNew}. Each one is a place where ${show(c)} comes just before "${P.slice(k + 1) || "(empty)"}" in T.`);
      }
      R.push(["for", "c"], `k = ${k}: prepend c = ${show(c)}. Rows ${sp}–${ep} start with "${P.slice(k + 1) || "(nothing yet)"}". Those whose L is ${show(c)} (yellow) are exactly the places where ${show(c)} precedes that string in T.`, base({ band: [sp, ep], Lmark: inband, pdone: k + 1, pcur: k, ask }));
      if (!has) {
        R.c.occ += 2;
        R.push(["sp", "ep", "empty"], `${show(c)} never occurs in the text (it has no C entry), so the interval becomes empty: P does not occur.`, base({ band: null, pdone: k, pcur: k }));
        found = false; sp = 1; ep = 0; break;
      }
      R.c.occ += 2;
      R.push(["sp", "ep"], `sp = C[${c}] + Occ(${c}, ${sp}) = ${C[c]} + ${osp} = ${nsp};  ep = C[${c}] + Occ(${c}, ${ep + 1}) − 1 = ${C[c]} + ${oep} − 1 = ${nep}. ${cntNew > 0 ? `The LF-mapping sends those ${cntNew} L-characters to rows ${nsp}–${nep} of F, which start with "${P.slice(k)}".` : "No such character inside the interval."}`, base({ band: cntNew > 0 ? [nsp, nep] : null, prevBand: [sp, ep], Lmark: inband, pdone: k, pcur: k, lfArrows: Object.keys(inband).map((t) => [+t, C[c] + occ(L, c, +t)]) }));
      sp = nsp; ep = nep; R.c.rows = Math.max(0, ep - sp + 1);
      if (sp > ep) {
        R.push("empty", `sp = ${sp} > ep = ${ep}: the interval is empty, so "${P.slice(k)}" (and therefore P) does not occur in T. Return 0 after only ${m - k} of ${m} characters.`, base({ band: null, pdone: k }));
        found = false; break;
      }
    }
    let positions = [];
    if (found) {
      positions = SA.slice(sp, ep + 1).slice().sort((a, b) => a - b);
      R.c.matches = ep - sp + 1;
      const tpos = {}; positions.forEach((p) => { for (let t = 0; t < m; t++) tpos[p + t] = "done"; });
      R.push(["ret", "loc"], `Done: ${ep - sp + 1} row${ep > sp ? "s" : ""} (${sp}–${ep}) start with "${P}", so P occurs ${ep - sp + 1} time${ep > sp ? "s" : ""}. Read the positions off the suffix array: SA[${sp}..${ep}] = ${SA.slice(sp, ep + 1).join(", ")}. That took ${R.c.occ} Occ queries, 2 per pattern character, whatever the length of T.`, base({ band: [sp, ep], pdone: 0, final: true, tposAll: tpos, saHl: true }));
    } else {
      R.c.matches = 0;
      R.push("empty", `No occurrence. Backward search can stop as soon as the interval is empty.`, base({ band: null, pdone: 0, final: true }));
    }
    return { lines: R.lines, frames: keepAsks(R.frames, 3), result: { count: found ? ep - sp + 1 : 0, positions, occQ: R.c.occ, L } };
  }

  const API = { normalize, suffixArray, kasai, bwtFromSA, inverseBWT, runs, countTable, occ, backwardSearch, recSA, recLCP, recBWT, recFM, SPEC };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.SuffixCore = API;
})(typeof window !== "undefined" ? window : globalThis);
