/* =====================================================================
   Algorithm Forge — String Matching (docs/sims/string-match.html)
   Brute force (Levitin §3.2), Horspool and Boyer–Moore (Levitin §7.2),
   Knuth–Morris–Pratt (KMP). Record frames, then play them.
   Part 1 (recorders) also runs in Node for testing.
   ===================================================================== */
(function () {
  "use strict";

  /* ================= Part 1: recorders ================= */
  function parseSpec(spec) {
    const L = {}, lines = [];
    spec.forEach((s) => { const m = /^@(\w+)\|(.*)$/.exec(s); if (m) { L[m[1]] = lines.length; lines.push(m[2]); } else lines.push(s); });
    return { L, lines };
  }
  function hash(s) { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mkAsk(q, correct, pool, why) {
    const c = String(correct);
    const uniq = [...new Set(pool.map(String))].filter((x) => x !== c);
    if (!uniq.length) return null;
    uniq.sort((a, b) => hash(a + q) - hash(b + q));
    const opts = [c, ...uniq.slice(0, 3)];
    if (opts.every((x) => /^-?\d+$/.test(x))) opts.sort((a, b) => a - b);
    return { q, opts, ans: opts.indexOf(c), why };
  }
  function thinAsks(frames, max) {
    const idx = frames.map((f, i) => (f.ask ? i : -1)).filter((i) => i >= 0);
    if (idx.length > max) {
      const keep = new Set(); for (let t = 0; t < max; t++) keep.add(idx[Math.round((t * (idx.length - 1)) / (max - 1))]);
      frames.forEach((f, i) => { if (!keep.has(i)) f.ask = null; });
    }
    return frames;
  }
  function Rec(spec, T, P) {
    const Pm = parseSpec(spec), frames = [], c = { cmp: 0, pre: 0, align: 0 }, matches = [];
    const one = (k) => { if (k == null || typeof k === "number") return k; if (!(k in Pm.L)) throw new Error("no line " + k); return Pm.L[k]; };
    const R = {
      lines: Pm.lines, frames, c, matches, tables: [],
      push(line, text, d) {
        d = d || {};
        frames.push({ line: Array.isArray(line) ? line.map(one) : one(line), text, c: Object.assign({}, c), matches: matches.slice(),
          s: d.s, pst: d.pst || {}, ptr: d.ptr || [], ask: d.ask || null, phase: d.phase || "search",
          tables: R.tables.map((t) => ({ label: t.label, head: t.head.slice(), vals: t.vals.slice(), hl: Object.assign({}, (d.thl || {})[t.label] || {}) })) });
        return frames.length - 1;
      },
    };
    return R;
  }
  const q = (ch) => `'${ch}'`;

  /** Horspool / bad-symbol shift table as {char: shift}; characters not listed shift by m. */
  function shiftTable(P) { const m = P.length, t = {}; for (let j = 0; j < m - 1; j++) t[P[j]] = m - 1 - j; return t; }
  /** Good-suffix shift for k matched characters (1 ≤ k ≤ m; k = m is used after a full match). */
  function goodSuffix(P, k) {
    const m = P.length;
    for (let s = 1; s <= m; s++) {
      let ok = true;
      for (let t = m - k; t < m && ok; t++) if (t - s >= 0 && P[t - s] !== P[t]) ok = false;
      if (ok && k < m) { const b = m - k - 1 - s; if (b >= 0 && P[b] === P[m - k - 1]) ok = false; }
      if (ok) return s;
    }
    return m;
  }
  function lpsTable(P) { const m = P.length, lps = Array(m).fill(0); let len = 0; for (let q2 = 1; q2 < m;) { if (P[q2] === P[len]) lps[q2++] = ++len; else if (len > 0) len = lps[len - 1]; else lps[q2++] = 0; } return lps; }

  const REC = {};

  REC.brute = function (T, P, all) {
    const n = T.length, m = P.length;
    const R = Rec([
      "@start|ALGORITHM BruteForceStringMatch(T[0..n-1], P[0..m-1])",
      "@for|    for i ← 0 to n − m do",
      "@j0|        j ← 0",
      "@while|        while j < m and P[j] = T[i + j] do",
      "@inc|            j ← j + 1",
      "@found|        if j = m then return i" + (all ? "   // (find all: record i, go on)" : ""),
      "@fail|    return −1",
    ], T, P);
    R.push("start", `Brute force: try every alignment i = 0 … n − m = ${n - m}, comparing left to right. Worst case: m(n − m + 1) = ${m * (n - m + 1)} comparisons.`, { s: 0 });
    for (let i = 0; i <= n - m; i++) {
      R.c.align++;
      let cnt = 0; while (cnt < m && P[cnt] === T[i + cnt]) cnt++;
      const used = Math.min(m, cnt + 1);
      R.push(["for", "j0"], `Alignment ${R.c.align}: put P under T[${i}..${i + m - 1}] and start at j = 0.`, { s: i,
        ask: mkAsk(`How many character comparisons will this alignment make?`, used, [1, 2, 3, m, Math.max(1, used - 1), used + 1].filter((x) => x >= 1 && x <= m), cnt === m ? `All ${m} characters match.` : `${cnt} character(s) match, then the ${cnt + 1}${cnt === 0 ? "st" : "th"} comparison fails: ${used} in total.`) });
      const pst = {};
      let j = 0;
      while (j < m) {
        R.c.cmp++;
        if (P[j] === T[i + j]) { pst[j] = "done"; R.push(["while", "inc"], `P[${j}] = ${q(P[j])} matches T[${i + j}] = ${q(T[i + j])}: move on to j = ${j + 1}.`, { s: i, pst: Object.assign({}, pst), ptr: [i + j] }); j++; }
        else { pst[j] = "swap"; R.push("while", `P[${j}] = ${q(P[j])} ≠ T[${i + j}] = ${q(T[i + j])}: mismatch. Shift the pattern one position right.`, { s: i, pst: Object.assign({}, pst), ptr: [i + j] }); break; }
      }
      if (j === m) {
        R.matches.push(i);
        R.push("found", `All ${m} characters match: the pattern occurs at index ${i}.${all ? " Record it and keep going." : ""}`, { s: i, pst });
        if (!all) return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, matches: R.matches };
      }
    }
    R.push("fail", R.matches.length ? `Done: ${R.matches.length} match(es) at ${R.matches.join(", ")}. ${R.c.cmp} comparisons.` : `No alignment matched: return −1 after ${R.c.cmp} comparisons.`, { s: null });
    return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, matches: R.matches };
  };

  function tableCols(P) { return [...new Set(P)].sort(); }

  REC.horspool = function (T, P, all) {
    const n = T.length, m = P.length, cols = tableCols(P);
    const R = Rec([
      "@st|ALGORITHM ShiftTable(P[0..m-1])",
      "@st0|    for every character c do Table[c] ← m",
      "@st1|    for j ← 0 to m − 2 do Table[P[j]] ← m − 1 − j",
      "",
      "@start|ALGORITHM HorspoolMatching(P[0..m-1], T[0..n-1])",
      "@i0|    i ← m − 1          // text index under P's last char",
      "@while|    while i ≤ n − 1 do",
      "@k0|        k ← 0          // characters matched",
      "@inner|        while k ≤ m − 1 and P[m−1−k] = T[i−k] do k ← k + 1",
      "@found|        if k = m then return i − m + 1" + (all ? "  // (all: record)" : ""),
      "@shift|        else i ← i + Table[T[i]]",
      "@fail|    return −1",
    ], T, P);
    const tb = { label: "shift t(c)", head: cols.concat(["other"]), vals: cols.map(() => m).concat([m]) };
    R.tables.push(tb);
    const col = (ch) => { const k = cols.indexOf(ch); return k < 0 ? cols.length : k; };
    R.push(["st", "st0"], `Step 1, input enhancement: build the shift table. Every character starts with shift m = ${m}; any character that is not among the first m − 1 = ${m - 1} pattern characters keeps it.`, { s: 0, phase: "pre" });
    const tab = {};
    for (let j = 0; j < m - 1; j++) {
      const old = tab[P[j]];
      tab[P[j]] = m - 1 - j; R.c.pre++;
      tb.vals[col(P[j])] = m - 1 - j;
      R.push("st1", `P[${j}] = ${q(P[j])} is ${m - 1 - j} position(s) from the last character, so t(${q(P[j])}) = ${m - 1 - j}${old != null ? ` (this overwrites ${old}: we want the rightmost occurrence)` : ""}.`,
        { s: 0, phase: "pre", pst: { [j]: "active", [m - 1]: "pivot" }, thl: { [tb.label]: { [col(P[j])]: "swap" } } });
    }
    R.push(["start", "i0"], `Table ready. Step 2: line the pattern up with the start of the text. i = m − 1 = ${m - 1} is the text position under the pattern's last character.`, { s: 0 });
    let i = m - 1;
    while (i <= n - 1) {
      R.c.align++;
      const s = i - m + 1, pst = {};
      let cnt = 0; while (cnt < m && P[m - 1 - cnt] === T[i - cnt]) cnt++;
      const sh = tab[T[i]] || m;
      R.push(["while", "k0"], `Alignment ${R.c.align}: the pattern covers T[${s}..${i}]. Compare right to left, starting with P[${m - 1}] and T[${i}].`, { s });
      let k = 0, fi = -1;
      while (k <= m - 1) {
        R.c.cmp++;
        const pj = m - 1 - k;
        if (P[pj] === T[i - k]) { pst[pj] = "done"; R.push("inner", `P[${pj}] = ${q(P[pj])} matches T[${i - k}]: k = ${k + 1}.`, { s, pst: Object.assign({}, pst), ptr: [i - k] }); k++; }
        else {
          pst[pj] = "swap";
          fi = R.push("inner", `P[${pj}] = ${q(P[pj])} ≠ T[${i - k}] = ${q(T[i - k])}: mismatch after ${k} match(es).`, { s, pst: Object.assign({}, pst), ptr: [i - k],
            ask: mkAsk(`How far will the pattern shift?`, sh, [1, 2, m, sh + 1, sh - 1, m - 1].filter((x) => x >= 1 && x <= m), `Horspool always looks at the text character under the pattern's LAST position, T[${i}] = ${q(T[i])}, no matter where the mismatch happened: t(${q(T[i])}) = ${sh}.`) });
          break;
        }
      }
      if (k === m) {
        R.matches.push(s);
        R.push("found", `All ${m} characters match: the pattern occurs at index ${s}.${all ? ` Record it; shift by t(${q(T[i])}) = ${sh} and keep going.` : ""}`, { s, pst });
        if (!all) return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, matches: R.matches };
      } else {
        void fi;
        R.push("shift", `Look up the character under the pattern's last position: T[${i}] = ${q(T[i])}. ${tab[T[i]] ? `It appears in P[0..${m - 2}], and its rightmost copy there is ${sh} from the end` : `It is not among the first ${m - 1} pattern characters`}, so shift by t(${q(T[i])}) = ${sh}.`,
          { s, pst, ptr: [i], thl: { [tb.label]: { [col(T[i])]: "active" } } });
      }
      i += sh;
    }
    R.push("fail", R.matches.length ? `The pattern ran past the end of the text. ${R.matches.length} match(es) at ${R.matches.join(", ")}; ${R.c.cmp} comparisons.` : `The pattern ran past the end of the text: no match (return −1). ${R.c.cmp} comparisons.`, { s: null });
    return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, matches: R.matches };
  };

  REC.bm = function (T, P, all) {
    const n = T.length, m = P.length, cols = tableCols(P);
    const R = Rec([
      "@st|ALGORITHM BoyerMoore(P[0..m-1], T[0..n-1])",
      "@t1|    build bad-symbol table t1 (= Horspool's shift table)",
      "@t2|    build good-suffix table d2[1..m−1]",
      "@i0|    i ← m − 1",
      "@while|    while i ≤ n − 1 do",
      "@inner|        k ← 0; while k ≤ m−1 and P[m−1−k] = T[i−k] do k ← k + 1",
      "@found|        if k = m then return i − m + 1" + (all ? "  // (all: record)" : ""),
      "@d1|        d1 ← max(t1(T[i − k]) − k, 1)",
      "@d|        if k = 0 then d ← d1 else d ← max(d1, d2[k])",
      "@shift|        i ← i + d",
      "@fail|    return −1",
    ], T, P);
    const t1 = { label: "bad symbol t1(c)", head: cols.concat(["other"]), vals: cols.map(() => m).concat([m]) };
    const t2 = { label: "good suffix d2[k]", head: Array.from({ length: Math.max(0, m - 1) }, (_, k) => "k=" + (k + 1)), vals: Array(Math.max(0, m - 1)).fill("") };
    R.tables.push(t1, t2);
    const col = (ch) => { const k = cols.indexOf(ch); return k < 0 ? cols.length : k; };
    const tab = shiftTable(P);
    R.push(["st", "t1"], `Boyer–Moore uses two tables. The bad-symbol table t1 is exactly Horspool's shift table: m = ${m} for most characters, smaller for characters in P[0..${m - 2}].`, { s: 0, phase: "pre" });
    for (let j = 0; j < m - 1; j++) {
      t1.vals[col(P[j])] = m - 1 - j; R.c.pre++;
      R.push("t1", `t1(${q(P[j])}) ← ${m - 1 - j} (P[${j}] is ${m - 1 - j} from the end).`, { s: 0, phase: "pre", pst: { [j]: "active" }, thl: { [t1.label]: { [col(P[j])]: "swap" } } });
    }
    const d2 = [null];
    for (let k = 1; k < m; k++) {
      const sh = goodSuffix(P, k);
      d2[k] = sh; t2.vals[k - 1] = sh; R.c.pre++;
      const suf = P.slice(m - k), pst = {};
      for (let t = m - k; t < m; t++) pst[t] = "done";
      if (m - k - 1 >= 0) pst[m - k - 1] = "swap";
      let why;
      if (sh < m && sh <= m - k) why = `another copy of ${q(suf)} sits ${sh} position(s) further left (and is not preceded by ${q(P[m - k - 1])}), so shifting by ${sh} lines it up with the matched text`;
      else if (sh < m) why = `no full copy of ${q(suf)} (with a different character before it) exists, but the prefix ${q(P.slice(0, m - sh))} equals the suffix of the same length, so a shift of ${sh} is the largest safe one`;
      else why = `neither another copy of ${q(suf)} nor a matching prefix exists, so the pattern can jump its whole length`;
      R.push("t2", `k = ${k}: the matched suffix is ${q(suf)}. ${why[0].toUpperCase() + why.slice(1)}. d2[${k}] = ${sh}.`, { s: 0, phase: "pre", pst, thl: { [t2.label]: { [k - 1]: "swap" } } });
    }
    R.push("i0", `Tables ready. Align the pattern with the start of the text: i = ${m - 1}.`, { s: 0 });
    let i = m - 1;
    while (i <= n - 1) {
      R.c.align++;
      const s = i - m + 1, pst = {};
      let cnt = 0; while (cnt < m && P[m - 1 - cnt] === T[i - cnt]) cnt++;
      R.push("while", `Alignment ${R.c.align}: the pattern covers T[${s}..${i}]. Compare right to left.`, { s });
      let k = 0;
      while (k <= m - 1) {
        R.c.cmp++;
        const pj = m - 1 - k;
        if (P[pj] === T[i - k]) { pst[pj] = "done"; R.push("inner", `P[${pj}] = ${q(P[pj])} matches T[${i - k}]: k = ${k + 1}.`, { s, pst: Object.assign({}, pst), ptr: [i - k] }); k++; }
        else break;
      }
      if (k === m) {
        R.matches.push(s);
        const g = goodSuffix(P, m);
        R.push("found", `All ${m} characters match: the pattern occurs at index ${s}.${all ? ` Record it and shift by ${g} (the pattern's shortest self-overlap).` : ""}`, { s, pst });
        if (!all) return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, matches: R.matches };
        i += g; continue;
      }
      const pj = m - 1 - k, c = T[i - k], tc = tab[c] || m;
      pst[pj] = "swap";
      const dd1 = Math.max(tc - k, 1), d = k === 0 ? dd1 : Math.max(dd1, d2[k]);
      R.push("inner", `P[${pj}] = ${q(P[pj])} ≠ T[${i - k}] = ${q(c)}: mismatch after k = ${k} match(es).`, { s, pst: Object.assign({}, pst), ptr: [i - k],
        ask: mkAsk("How far will the pattern shift (d)?", d, [1, 2, m, d + 1, Math.max(1, d - 1), dd1, k ? d2[k] : m].filter((x) => x >= 1 && x <= m), k === 0 ? `No characters matched, so d = d1 = max(t1(${q(c)}) − 0, 1) = ${dd1}.` : `d1 = max(t1(${q(c)}) − ${k}, 1) = max(${tc} − ${k}, 1) = ${dd1} and d2[${k}] = ${d2[k]}, so d = max(${dd1}, ${d2[k]}) = ${d}.`) });
      R.push("d1", `Bad-symbol rule: the mismatched text character is ${q(c)}, t1(${q(c)}) = ${tc}, so d1 = max(${tc} − ${k}, 1) = ${dd1}.`, { s, pst, ptr: [i - k], thl: { [t1.label]: { [col(c)]: "active" } } });
      if (k === 0) R.push(["d", "shift"], `Nothing matched (k = 0), so only the bad-symbol rule applies: shift by d = d1 = ${d}.`, { s, pst, thl: { [t1.label]: { [col(c)]: "active" } } });
      else R.push(["d", "shift"], `Good-suffix rule: ${k} character(s) matched, d2[${k}] = ${d2[k]}. Shift by d = max(d1, d2) = max(${dd1}, ${d2[k]}) = ${d}${d2[k] > dd1 ? " (the good-suffix rule wins this time)" : dd1 > d2[k] ? " (the bad-symbol rule wins this time)" : ""}.`,
        { s, pst, thl: { [t1.label]: { [col(c)]: "active" }, [t2.label]: { [k - 1]: "active" } } });
      i += d;
    }
    R.push("fail", R.matches.length ? `The pattern ran past the end of the text. ${R.matches.length} match(es) at ${R.matches.join(", ")}; ${R.c.cmp} comparisons.` : `The pattern ran past the end of the text: no match (return −1). ${R.c.cmp} comparisons.`, { s: null });
    return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, matches: R.matches };
  };

  REC.kmp = function (T, P, all) {
    const n = T.length, m = P.length;
    const R = Rec([
      "@pt|ALGORITHM PrefixTable(P[0..m-1])   // Longest Proper Prefix-Suffix",
      "@p0|    lps[0] ← 0; len ← 0; q ← 1",
      "@pw|    while q < m do",
      "@pe|        if P[q] = P[len] then len ← len + 1; lps[q] ← len; q ← q + 1",
      "@pb|        else if len > 0 then len ← lps[len − 1]",
      "@pz|        else lps[q] ← 0; q ← q + 1",
      "",
      "@start|ALGORITHM KMPMatch(T[0..n-1], P[0..m-1])",
      "@j0|    j ← 0              // P[0..j−1] is matched",
      "@for|    for i ← 0 to n − 1 do",
      "@back|        while j > 0 and T[i] ≠ P[j] do j ← lps[j − 1]",
      "@eq|        if T[i] = P[j] then j ← j + 1",
      "@found|        if j = m then return i − m + 1" + (all ? "  // (all: j ← lps[j−1])" : ""),
      "@fail|    return −1",
    ], T, P);
    const tb = { label: "lps", head: P.split(""), vals: Array(m).fill("") };
    R.tables.push(tb);
    const lps = Array(m).fill(0);
    tb.vals[0] = 0;
    R.push(["pt", "p0"], `Preprocessing: lps[q] = length of the Longest Proper Prefix of P[0..q] that is also a Suffix of it (LPS). lps[0] = 0 always.`, { s: 0, phase: "pre", thl: { lps: { 0: "swap" } } });
    let len = 0, qq = 1;
    while (qq < m) {
      R.c.pre++;
      if (P[qq] === P[len]) {
        len++; lps[qq] = len; tb.vals[qq] = len;
        R.push(["pw", "pe"], `P[${qq}] = ${q(P[qq])} equals P[${len - 1}]: the border grows to ${len}, so lps[${qq}] = ${len} (${q(P.slice(0, len))} is both a prefix and a suffix of ${q(P.slice(0, qq + 1))}).`, { s: 0, phase: "pre", pst: { [qq]: "done", [len - 1]: "done" }, thl: { lps: { [qq]: "swap" } } });
        qq++;
      } else if (len > 0) {
        const old = len; len = lps[len - 1];
        R.push(["pw", "pb"], `P[${qq}] = ${q(P[qq])} ≠ P[${old}] = ${q(P[old])}: try the next shorter border, len ← lps[${old - 1}] = ${len}.`, { s: 0, phase: "pre", pst: { [qq]: "swap", [old]: "swap" }, thl: { lps: { [old - 1]: "active" } } });
      } else {
        lps[qq] = 0; tb.vals[qq] = 0;
        R.push(["pw", "pz"], `P[${qq}] = ${q(P[qq])} ≠ P[0] = ${q(P[0])} and there is no shorter border: lps[${qq}] = 0.`, { s: 0, phase: "pre", pst: { [qq]: "swap", 0: "swap" }, thl: { lps: { [qq]: "swap" } } });
        qq++;
      }
    }
    R.push(["start", "j0"], `LPS table ready. Now scan the text once, left to right. i never moves backwards; on a mismatch only the pattern slides, by falling back to j = lps[j − 1].`, { s: 0 });
    let j = 0, lastS = -1;
    for (let i = 0; i < n; i++) {
      for (;;) {
        const s = i - j;
        if (s !== lastS) { R.c.align++; lastS = s; }
        R.c.cmp++;
        const pst = {}; for (let t = 0; t < j; t++) pst[t] = "done";
        if (T[i] === P[j]) {
          pst[j] = "done";
          R.push("eq", `T[${i}] = ${q(T[i])} matches P[${j}]: j = ${j + 1}.`, { s, pst, ptr: [i] });
          j++;
          break;
        }
        pst[j] = "swap";
        if (j > 0) {
          const nj = lps[j - 1];
          R.push("back", `T[${i}] = ${q(T[i])} ≠ P[${j}] = ${q(P[j])}. We already know T matches P[0..${j - 1}] = ${q(P.slice(0, j))}; its longest border has length lps[${j - 1}] = ${nj}, so fall back to j = ${nj} (the pattern slides ${j - nj} to the right) and compare T[${i}] again.`,
            { s, pst, ptr: [i], thl: { lps: { [j - 1]: "active" } }, ask: mkAsk(`Mismatch with j = ${j}. What will j fall back to?`, nj, [0, j - 1, j, Math.max(0, nj - 1), nj + 1].filter((x) => x >= 0 && x < m), `j falls back to lps[${j - 1}] = ${nj}: the longest proper prefix of ${q(P.slice(0, j))} that is also its suffix has length ${nj}.`) });
          j = nj;
        } else {
          R.push("eq", `T[${i}] = ${q(T[i])} ≠ P[0] = ${q(P[0])} and j = 0: nothing to fall back to, move on to the next text character.`, { s, pst, ptr: [i] });
          break;
        }
      }
      if (j === m) {
        const s = i - m + 1, pst = {}; for (let t = 0; t < m; t++) pst[t] = "done";
        R.matches.push(s);
        R.push("found", `j = m: the pattern occurs at index ${s}.${all ? ` Record it and continue with j = lps[${m - 1}] = ${lps[m - 1]}.` : ""}`, { s, pst });
        if (!all) return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, matches: R.matches };
        j = lps[m - 1];
      }
    }
    R.push("fail", R.matches.length ? `End of text. ${R.matches.length} match(es) at ${R.matches.join(", ")}; ${R.c.cmp} comparisons.` : `End of text: no match (return −1). ${R.c.cmp} comparisons, never more than 2n = ${2 * n}.`, { s: null });
    return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, matches: R.matches };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { REC, goodSuffix, shiftTable, lpsTable };
  if (typeof document === "undefined") return;

  /* ================= Part 2: browser UI ================= */
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg, W = 760;
  const COL = { compare: "var(--c-compare)", swap: "var(--c-swap)", done: "var(--c-done)", active: "var(--c-active)", pivot: "var(--c-pivot)", dim: "var(--c-dim)" };
  const inkOn = (st) => (st && st !== "dim" ? "#0d1117" : "var(--ink)");
  const NAMES = { brute: "Brute force", horspool: "Horspool", bm: "Boyer–Moore", kmp: "KMP" };
  const ORDER = ["brute", "horspool", "bm", "kmp"];
  const LEGEND = [["done", "matched character"], ["swap", "mismatch"], ["active", "character being placed in a table"], ["pivot", "the pattern's last character (Horspool table)"]];
  const HOW = {
    brute: "The top row is the text T, the row below is the pattern P at its current alignment. Brute force compares left to right and always shifts by exactly one.",
    horspool: "Horspool compares right to left. After a mismatch it looks only at the text character under the pattern's LAST position and shifts by that character's table entry.",
    bm: "Boyer–Moore compares right to left like Horspool. On a mismatch after k matches it computes two shifts, d1 from the bad character and d2 from the good suffix, and takes the larger.",
    kmp: "Knuth–Morris–Pratt (KMP) compares left to right and never moves back in the text. The Longest Proper Prefix-Suffix (LPS) table tells it how far the pattern can slide after a mismatch without missing a match.",
  };
  const PRESETS = {
    book: ["BESS_KNEW_ABOUT_BAOBABS", "BAOBAB", "Levitin's BAOBAB example"],
    barber: ["JIM_SAW_ME_IN_A_BARBERSHOP", "BARBER", "Levitin's BARBER example"],
    worst: ["AAAAAAAAAAAAAAAAAAAAAAAAB", "AAAB", "Worst case for brute force: m(n − m + 1)"],
    zeros: ["0".repeat(40), "10000", "Binary text of zeros (Levitin Exercise 7.2.3 idea)"],
    dna: ["TTATAGATCTCGTATTCTTTTATAGATCTCCTATTCTT", "TCCTATTCTT", "Deoxyribonucleic acid (DNA) search (Levitin Exercise 7.2.2)"],
    kmp: ["ABABDABACDABABCABAB", "ABABCABAB", "A pattern with long borders: good for KMP"],
  };

  let alg = "horspool", T = PRESETS.book[0], P = PRESETS.book[1], all = false;
  const stage = $("stage"), say = Forge.narrate($("say"));
  let code = null, ctr = null;
  const answered = new Set();
  const player = Forge.player($("player"), { frames: [], render });

  function drawRow(g, str, o) {
    const cw = o.cw, fs = Math.min(15, cw * 0.55);
    if (o.label) g.appendChild(S("text", { x: o.x0 - 6, y: o.y + cw * 0.7, "text-anchor": "end", "font-size": 11, "font-weight": 700, fill: "var(--muted)" }, o.label));
    [...str].forEach((ch, k) => {
      const x = o.x0 + (o.off + k) * cw, st = (o.st || {})[k];
      g.appendChild(S("rect", { x: x + 1, y: o.y, width: cw - 2, height: cw * 1.1, rx: 4, fill: st ? COL[st] : o.fill || "var(--panel)", stroke: "var(--line-2)", opacity: o.opacity || 1 }));
      g.appendChild(S("text", { x: x + cw / 2, y: o.y + cw * 0.55 + fs / 2.8, "text-anchor": "middle", "font-size": fs, "font-weight": 700, fill: inkOn(st) }, ch));
      if (o.idx && cw >= 14) g.appendChild(S("text", { x: x + cw / 2, y: o.y - 4, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, String(k)));
    });
  }
  function drawTable(g, t, y) {
    const cols = t.head.length, x0 = 150, cw = Math.max(20, Math.min(46, (W - x0 - 20) / Math.max(1, cols)));
    g.appendChild(S("text", { x: x0 - 8, y: y + 37, "text-anchor": "end", "font-size": 11, "font-weight": 700, fill: "var(--muted)" }, t.label));
    t.head.forEach((h, k) => {
      const x = x0 + k * cw, st = t.hl[k];
      g.appendChild(S("rect", { x, y, width: cw, height: 22, fill: "var(--panel-2)", stroke: "var(--line)" }));
      g.appendChild(S("text", { x: x + cw / 2, y: y + 15, "text-anchor": "middle", "font-size": h.length > 3 ? 9 : 12, "font-weight": 700, fill: "var(--ink-2)" }, h));
      g.appendChild(S("rect", { x, y: y + 22, width: cw, height: 26, fill: st ? COL[st] : "var(--panel)", stroke: "var(--line)" }));
      g.appendChild(S("text", { x: x + cw / 2, y: y + 40, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: inkOn(st) }, String(t.vals[k])));
    });
    return y + 60;
  }
  function render(f, i) {
    stage.innerHTML = "";
    const g = S("g"); stage.appendChild(g);
    const n = T.length, m = P.length, x0 = 30, cw = Math.min(34, (W - 40) / n);
    // earlier matches
    f.matches.forEach((s) => g.appendChild(S("rect", { x: x0 + s * cw, y: 18, width: m * cw, height: 5, rx: 2, fill: "var(--c-done)" })));
    const tst = {};
    if (f.s != null && f.phase !== "pre") Object.keys(f.pst).forEach((k) => (tst[f.s + +k] = f.pst[k]));
    drawRow(g, T, { x0, y: 40, cw, off: 0, st: tst, idx: true, label: "T" });
    (f.ptr || []).forEach((p) => { const cx = x0 + p * cw + cw / 2; g.appendChild(S("path", { d: `M${cx} 36 l-5 -8 h10 z`, fill: "var(--ember)" })); });
    let y = 40 + cw * 1.1 + 18;
    if (f.s != null) {
      drawRow(g, P, { x0, y, cw, off: f.s, st: f.pst, label: "P", fill: "var(--panel-2)" });
      if (f.phase === "pre") g.appendChild(S("text", { x: x0 + (f.s + m) * cw + 8, y: y + cw * 0.7, "font-size": 11, fill: "var(--muted)" }, "← preprocessing the pattern"));
    }
    y += cw * 1.1 + 30;
    f.tables.forEach((t) => { y = drawTable(g, t, y) + 6; });
    stage.setAttribute("viewBox", `0 0 ${W} ${Math.max(y, 150)}`);
    code.highlight(f.line);
    ctr.set({ "character comparisons": f.c.cmp, "alignments tried": f.c.align, "preprocessing steps": f.c.pre });
    say.say(f.text);
    ask(f, i);
    document.querySelectorAll("#summary tr[data-k]").forEach((tr) => tr.classList.toggle("cur", tr.dataset.k === alg));
  }
  function ask(f, i) {
    if (!f.ask || answered.has(i) || !$("predictOn").checked) return;
    player.pause();
    const box = $("predictBox"); box.innerHTML = "";
    box.appendChild(E("div", { class: "ask-q" }, f.ask.q));
    box.appendChild(E("div", { class: "row" }, f.ask.opts.map((o, k) => E("button", { class: "btn sm", onclick: () => answer(i, k) }, o))));
    box.appendChild(E("div", { class: "small muted", style: { marginTop: "6px" } }, "Answer to continue, or just step forward to skip."));
  }
  function answer(i, k) {
    const f = player.frames[i]; if (!f || !f.ask) return;
    answered.add(i);
    const ok = k === f.ask.ans, sc = $("predictScore");
    sc.dataset.n = (+sc.dataset.n || 0) + 1; sc.dataset.ok = (+sc.dataset.ok || 0) + (ok ? 1 : 0);
    sc.textContent = `${sc.dataset.ok} / ${sc.dataset.n} right`;
    const box = $("predictBox"); box.innerHTML = "";
    box.appendChild(E("div", { class: "callout " + (ok ? "ok" : "bad") }, E("b", null, ok ? "Correct. " : `Not quite: the answer is ${f.ask.opts[f.ask.ans]}. `), f.ask.why));
    box.appendChild(E("div", { class: "small muted", style: { marginTop: "6px" } }, "Press ▶ or → to watch it happen."));
  }
  function summary() {
    const body = $("summaryBody"); body.innerHTML = "";
    const n = T.length, m = P.length;
    ORDER.forEach((k) => {
      const r = REC[k](T, P, all);
      body.appendChild(E("tr", { "data-k": k, class: k === alg ? "cur" : "" },
        E("td", { style: { textAlign: "left" } }, E("button", { class: "linkish", onclick: () => pick(k) }, NAMES[k])),
        E("td", null, String(r.c.cmp)), E("td", null, String(r.c.align)), E("td", null, String(r.c.pre)),
        E("td", null, r.matches.length ? r.matches.join(", ") : "none")));
    });
    $("summaryNote").textContent = `n = ${n}, m = ${m}. Brute force's worst case is m(n − m + 1) = ${m * (n - m + 1)} comparisons${all ? "" : " (searching for the first match only)"}.`;
  }
  function load() {
    const res = REC[alg](T, P, all);
    $("codeHost").innerHTML = ""; code = Forge.code($("codeHost"), res.lines);
    $("ctrHost").innerHTML = ""; ctr = Forge.counters($("ctrHost"), { "character comparisons": 0, "alignments tried": 0, "preprocessing steps": 0 });
    answered.clear();
    $("predictBox").textContent = "When a question appears here, answer it before stepping on.";
    $("howAlg").textContent = HOW[alg];
    document.querySelectorAll("#algs button").forEach((b) => { b.classList.toggle("on", b.dataset.k === alg); b.setAttribute("aria-pressed", String(b.dataset.k === alg)); });
    summary();
    player.load(res.frames);
  }
  function pick(k) { alg = k; load(); }
  function clean(s) { return String(s).replace(/ /g, "_"); }
  function setInput(t, p, note) {
    t = clean(t); p = clean(p);
    if (!t.length || !p.length) { $("msg").textContent = "Type a text and a pattern."; return; }
    if (t.length > 48) { t = t.slice(0, 48); note = "The text was cut to 48 characters so it fits on screen."; }
    if (p.length > Math.min(16, t.length)) { $("msg").textContent = "The pattern must be at most 16 characters and no longer than the text."; return; }
    T = t; P = p;
    $("txt").value = T; $("pat").value = P;
    $("msg").textContent = note || "";
    load();
  }
  const algs = $("algs");
  ORDER.forEach((k) => algs.appendChild(E("button", { class: "btn sm", "data-k": k, onclick: () => pick(k) }, NAMES[k])));
  $("load").addEventListener("click", () => setInput($("txt").value, $("pat").value));
  ["txt", "pat"].forEach((id) => $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") setInput($("txt").value, $("pat").value); }));
  $("all").addEventListener("change", () => { all = $("all").checked; load(); });
  document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => { const p = PRESETS[b.dataset.preset]; setInput(p[0], p[1], p[2] + "."); }));
  $("rand").addEventListener("click", () => {
    const alpha = "ABC", n = 30 + Math.floor(Math.random() * 12), m = 3 + Math.floor(Math.random() * 3);
    let t = ""; for (let k = 0; k < n; k++) t += alpha[Math.floor(Math.random() * 3)];
    const p = Math.random() < 0.6 ? t.substr(Math.floor(Math.random() * (n - m)), m) : Array.from({ length: m }, () => alpha[Math.floor(Math.random() * 3)]).join("");
    setInput(t, p, "Random text over the alphabet {A, B, C}.");
  });
  const lg = $("legend");
  LEGEND.forEach(([s, t]) => lg.appendChild(E("span", null, E("i", { style: { background: COL[s] } }), t)));
  lg.appendChild(E("span", null, E("i", { style: { background: "var(--c-done)", height: "4px" } }), "match found earlier"));
  $("txt").value = T; $("pat").value = P;
  const start = new URLSearchParams(location.search).get("alg");
  if (REC[start]) alg = start;
  load();
})();
