/* =====================================================================
   Algorithm Forge — sorting-evolution core (no DOM)
   ---------------------------------------------------------------------
   Instrumented implementations used by sims/sorting-evolution.html:

     insertionSort, mergeSort, quickSortFirst (first-element pivot),
     timsort (classic: natural runs, minrun, binary insertion sort,
              run-stack invariants, merge_lo / merge_hi with galloping),
     powersort (the same Timsort machinery with the Powersort merge policy
              of Munro & Wild, ESA 2018, as used by CPython since 3.11:
              each run boundary gets a "node power" and the stack merges
              while the power under the top exceeds the new boundary's),
     introsort (median-of-3 Hoare quicksort + depth limit -> heapsort),
     pdqsort  (pattern-defeating quicksort, after Orson Peters' pdqsort.h)

   Every algorithm has the signature  algo(A, S, E, cfg)
     A   : array of numbers, sorted IN PLACE
     S   : stats object; S.cmp counts key comparisons, S.wr counts writes
           into A (temp-buffer writes are not counted). Algorithms add
           their own fields (runs, merges, gallops, partitions, ...).
     E   : optional emitter E(payload) called at interesting moments
           (null in the race, so counting is identical but fast)
     cfg : algorithm parameters (thresholds), see DEFAULTS below.

   All key comparisons go through lt(), so S.cmp is exact for the code
   as written here.
   ===================================================================== */
(function (root) {
  "use strict";

  const DEFAULTS = {
    timsort: { minMerge: 64, minGallop: 7 },          // CPython classic values
    powersort: { minMerge: 64, minGallop: 7, policy: "powersort" }, // CPython 3.11–3.14 (same minrun rule as classic)
    introsort: { cutoff: 16, depthFactor: 2 },        // GCC std::sort style
    pdqsort: { insertion: 24, ninther: 128, partialLimit: 8 }, // pdqsort.h
  };
  const TEACH = {
    timsort: { minMerge: 8, minGallop: 7 },
    powersort: { minMerge: 8, minGallop: 7, policy: "powersort" },
    introsort: { cutoff: 6, depthFactor: 2 },
    pdqsort: { insertion: 8, ninther: 128, partialLimit: 8 },
  };

  function mkLt(S) { return (a, b) => { S.cmp++; return a < b; }; }
  function plural(k, w) { return k + " " + w + (k === 1 ? "" : "s"); }
  function floorLog2(n) { let l = 0; while ((n >>= 1)) l++; return l; }

  /* ------------------------------------------------------------------ */
  /* Insertion sort (Levitin §4.1): one comparison per A[j] > v test     */
  function insertionSort(A, S) {
    const lt = mkLt(S);
    for (let i = 1; i < A.length; i++) {
      const v = A[i];
      let j = i - 1;
      while (j >= 0 && lt(v, A[j])) { A[j + 1] = A[j]; S.wr++; j--; }
      A[j + 1] = v; S.wr++;
    }
    return A;
  }

  /* Top-down mergesort (Levitin §5.1) */
  function mergeSort(A, S) {
    const lt = mkLt(S);
    const tmp = new Array(A.length);
    (function sort(lo, hi) { // [lo, hi)
      if (hi - lo < 2) return;
      const mid = (lo + hi) >> 1;
      sort(lo, mid); sort(mid, hi);
      for (let k = lo; k < hi; k++) tmp[k] = A[k];
      let i = lo, j = mid, k = lo;
      while (i < mid && j < hi) { if (lt(tmp[j], tmp[i])) A[k++] = tmp[j++]; else A[k++] = tmp[i++]; S.wr++; }
      while (i < mid) { A[k++] = tmp[i++]; S.wr++; }
      while (j < hi) { A[k++] = tmp[j++]; S.wr++; }
    })(0, A.length);
    return A;
  }

  /* Quicksort, first element as pivot, Hoare partition (Levitin §5.2).
     The i-scan is bounded by r (bound checks are not key comparisons). */
  function quickSortFirst(A, S) {
    const lt = mkLt(S);
    const stack = [[0, A.length - 1]];
    while (stack.length) {
      const [l, r] = stack.pop();
      if (l >= r) continue;
      const p = A[l];
      let i = l, j = r + 1;
      for (;;) {
        do { i++; } while (i <= r && lt(A[i], p));
        do { j--; } while (lt(p, A[j]));
        if (i >= j) break;
        const t = A[i]; A[i] = A[j]; A[j] = t; S.wr += 2;
      }
      const t = A[l]; A[l] = A[j]; A[j] = t; S.wr += 2;
      stack.push([l, j - 1], [j + 1, r]);
    }
    return A;
  }

  /* Heapsort on A[lo..hi) (bottom-up heap construction, Levitin §6.4) */
  function heapSortRange(A, lo, hi, S, E) {
    const lt = mkLt(S);
    const n = hi - lo;
    const at = (k) => A[lo + k];
    const sw = (a, b) => { const t = A[lo + a]; A[lo + a] = A[lo + b]; A[lo + b] = t; S.wr += 2; };
    function sift(k, size) {
      for (;;) {
        let c = 2 * k + 1;
        if (c >= size) return;
        if (c + 1 < size && lt(at(c), at(c + 1))) c++;
        if (!lt(at(k), at(c))) return;
        sw(k, c); k = c;
      }
    }
    for (let k = (n >> 1) - 1; k >= 0; k--) sift(k, n);
    if (E) E({ kind: "heap", line: "heap", text: `Built a max-heap on A[${lo}..${hi - 1}] — the largest value now sits at A[${lo}].`, range: [lo, hi], state: { [lo]: "pivot" } });
    for (let end = n - 1; end > 0; end--) {
      sw(0, end);
      sift(0, end);
      if (E && (end === n - 1 || end % 4 === 0 || end === 1)) E({ kind: "heap", line: "heap", text: `Heapsort: moved the current maximum to A[${lo + end}] and re-heapified the rest.`, range: [lo, hi], doneRange: [lo + end, hi] });
    }
    return A;
  }

  /* ------------------------------------------------------------------ */
  /* Powersort node power (CPython Objects/listobject.c, powerloop()).
     Two adjacent runs: the left starts at s1 with length n1, the right has
     length n2 (it starts at s1 + n1); n is the whole array's length. Their
     midpoints, as fractions of n, are a = (s1 + n1/2)/n and
     b = (s1 + n1 + n2/2)/n. The power is the least L such that the interval
     (a, b] contains a fraction J / 2^L, i.e. the position of the first
     binary digit where a and b differ. It is the depth of the boundary in a
     perfectly balanced merge tree over [0, 1]. Pure integer arithmetic
     (2a and 2b are integers), and no key comparisons. */
  function nodePower(s1, n1, n2, n) {
    let a = 2 * s1 + n1, b = a + n1 + n2, result = 0;
    for (;;) {
      ++result;
      if (a >= n) { a -= n; b -= n; }      // both binary digits are 1
      else if (b >= n) break;              // a's digit is 0, b's is 1: they differ here
      a *= 2; b *= 2;                      // both digits 0: look at the next one
    }
    return result;
  }

  /* ------------------------------------------------------------------ */
  /* Timsort (classic CPython listsort / Java TimSort structure).
     cfg.policy = "powersort" swaps the run-stack invariants for the
     Powersort merge policy (found_new_run() in CPython 3.11+); everything
     else (runs, minrun, galloping merges, the final collapse) is shared.  */
  function timsort(A, S, E, cfg) {
    cfg = Object.assign({}, DEFAULTS.timsort, cfg || {});
    const POWER = cfg.policy === "powersort";
    const lt = mkLt(S);
    const n = A.length;
    const MIN_GALLOP = cfg.minGallop;
    let minGallop = MIN_GALLOP;
    const stack = [];
    S.runs = 0; S.merges = 0; S.gallops = 0; S.mergeCost = 0; S.stack = stack; S.minGallop = minGallop; S.tmp = null; S.policy = POWER ? "powersort" : "classic";
    const mergeLog = Array.isArray(S.mergeLog) ? S.mergeLog : null;
    const set = (i, v) => { A[i] = v; S.wr++; };
    const emit = E ? (p) => { S.minGallop = minGallop; E(p); } : null;
    if (n < 2) return A;

    function minrunFor(m) { let r = 0; while (m >= cfg.minMerge) { r |= m & 1; m >>= 1; } return m + r; }
    const minrun = minrunFor(n);
    S.minrun = minrun;
    if (emit) emit({ line: 1, text: `n = ${n}. MinRun rule: keep halving n until it drops below ${cfg.minMerge}, adding 1 if any bit was shifted out → <b>minrun = ${minrun}</b>. Runs shorter than that get extended.` });

    /* gallop_left: first k with key <= a[base+k]  (a[k-1] < key <= a[k]) */
    function gallopLeft(key, a, base, len, hint) {
      let lastofs = 0, ofs = 1, k;
      if (lt(a[base + hint], key)) {
        const maxofs = len - hint;
        while (ofs < maxofs) { if (lt(a[base + hint + ofs], key)) { lastofs = ofs; ofs = (ofs << 1) + 1; } else break; }
        if (ofs > maxofs) ofs = maxofs;
        lastofs += hint; ofs += hint;
      } else {
        const maxofs = hint + 1;
        while (ofs < maxofs) { if (lt(a[base + hint - ofs], key)) break; lastofs = ofs; ofs = (ofs << 1) + 1; }
        if (ofs > maxofs) ofs = maxofs;
        k = lastofs; lastofs = hint - ofs; ofs = hint - k;
      }
      lastofs++;
      while (lastofs < ofs) { const m = lastofs + ((ofs - lastofs) >> 1); if (lt(a[base + m], key)) lastofs = m + 1; else ofs = m; }
      return ofs;
    }
    /* gallop_right: first k with key < a[base+k]  (a[k-1] <= key < a[k]) */
    function gallopRight(key, a, base, len, hint) {
      let lastofs = 0, ofs = 1, k;
      if (lt(key, a[base + hint])) {
        const maxofs = hint + 1;
        while (ofs < maxofs) { if (lt(key, a[base + hint - ofs])) { lastofs = ofs; ofs = (ofs << 1) + 1; } else break; }
        if (ofs > maxofs) ofs = maxofs;
        k = lastofs; lastofs = hint - ofs; ofs = hint - k;
      } else {
        const maxofs = len - hint;
        while (ofs < maxofs) { if (lt(key, a[base + hint + ofs])) break; lastofs = ofs; ofs = (ofs << 1) + 1; }
        if (ofs > maxofs) ofs = maxofs;
        lastofs += hint; ofs += hint;
      }
      lastofs++;
      while (lastofs < ofs) { const m = lastofs + ((ofs - lastofs) >> 1); if (lt(key, a[base + m])) ofs = m; else lastofs = m + 1; }
      return ofs;
    }

    function binarySort(lo, hi, start) {
      if (start === lo) start++;
      for (; start < hi; start++) {
        const pivot = A[start];
        let l = lo, r = start;
        const c0 = S.cmp;
        while (l < r) { const p = l + ((r - l) >> 1); if (lt(pivot, A[p])) r = p; else l = p + 1; }
        for (let p = start; p > l; p--) set(p, A[p - 1]);
        set(l, pivot);
        if (emit) emit({ line: 7, text: `Binary insertion: ${pivot} found its slot at index ${l} with ${S.cmp - c0} comparison${S.cmp - c0 === 1 ? "" : "s"} (binary search), then slid in.`, state: { [l]: "swap" }, span: [lo, start + 1], ptr: [{ i: l, label: "ins" }] });
      }
    }

    /* merge with galloping: copy shorter run to tmp */
    function mergeLo(pa0, na, pb, nb) {
      const tmp = A.slice(pa0, pa0 + na);
      let pa = 0, dest = pa0;
      S.tmp = { vals: tmp, from: 0, side: "A", origin: pa0 };
      const view = (txt, line, st, extra) => { if (emit) { S.tmp.from = pa; emit(Object.assign({ line, text: txt, state: st || {}, span: [pa0, pb + nb], holes: [dest, pb], ptr: [{ i: dest, label: "dest" }, { i: pb, label: "B" }] }, extra || {})); } };
      view(`merge_lo: the left run (${na}) is not longer than the right (${nb}), so copy it to a temp buffer and fill from the left.`, 17);
      set(dest++, A[pb++]); nb--;
      view(`The first element of the right run is known to be smallest (we trimmed the left run's prefix), so it goes first — no comparison needed.`, 17, { [dest - 1]: "swap" });
      let done = false, copyB = false;
      if (nb === 0) done = true; else if (na === 1) copyB = true;
      outer: while (!done && !copyB) {
        let acount = 0, bcount = 0;
        for (;;) {
          const c = lt(A[pb], tmp[pa]);
          if (c) {
            set(dest++, A[pb++]); bcount++; acount = 0; nb--;
            view(`Compare: right ${A[dest - 1]} &lt; temp ${tmp[pa]} → take from the right run. Right-run win streak: ${bcount} (gallop at ${minGallop}).`, 17, { [dest - 1]: "swap" });
            if (nb === 0) { done = true; break outer; }
            if (bcount >= minGallop) break;
          } else {
            set(dest++, tmp[pa++]); acount++; bcount = 0; na--;
            view(`Compare: temp ${A[dest - 1]} ≤ right ${A[pb]} → take from the temp (left) run. Left-run win streak: ${acount} (gallop at ${minGallop}).`, 17, { [dest - 1]: "swap" });
            if (na === 1) { copyB = true; break outer; }
            if (acount >= minGallop) break;
          }
        }
        minGallop++;
        S.gallops++;
        view(`<b>Galloping mode!</b> One run won ${minGallop - 1} times in a row, so the data looks clumpy. Instead of one-by-one, search ahead exponentially (1, 3, 7, 15, …) for where the streak ends.`, 18, {}, { ask: S.gallops === 1 ? { q: "Galloping looks ahead at offsets 1, 3, 7, 15, … To find the end of a block of 10 winners, how many probes before the binary search starts?", opts: ["2", "4", "10"], ans: 1, why: "Offsets 1, 3, 7 are still winners, 15 overshoots: 4 probes bracket the end between 7 and 15, then a short binary search pins it down. One-by-one would need 10." } : null });
        do {
          minGallop -= minGallop > 1 ? 1 : 0;
          const c0 = S.cmp;
          let k = gallopRight(A[pb], tmp, pa, na, 0);
          acount = k;
          if (k) {
            for (let t = 0; t < k; t++) set(dest++, tmp[pa++]);
            na -= k;
            view(`Gallop found ${k} temp element${k > 1 ? "s" : ""} ≤ ${A[pb]} using ${plural(S.cmp - c0, "comparison")} and copied them as one block.`, 20, rangeState(dest - k, dest, "swap"));
            if (na === 1) { copyB = true; break outer; }
            if (na === 0) { done = true; break outer; }
          }
          set(dest++, A[pb++]); nb--;
          if (nb === 0) { done = true; break outer; }
          const c1 = S.cmp;
          k = gallopLeft(tmp[pa], A, pb, nb, 0);
          bcount = k;
          if (k) {
            for (let t = 0; t < k; t++) set(dest++, A[pb++]);
            nb -= k;
            view(`Gallop found ${k} right-run element${k > 1 ? "s" : ""} &lt; ${tmp[pa]} using ${plural(S.cmp - c1, "comparison")} and moved them as one block.`, 20, rangeState(dest - k, dest, "swap"));
            if (nb === 0) { done = true; break outer; }
          }
          set(dest++, tmp[pa++]); na--;
          if (na === 1) { copyB = true; break outer; }
        } while (acount >= MIN_GALLOP || bcount >= MIN_GALLOP);
        minGallop++;
        view(`Both block searches found fewer than ${MIN_GALLOP} elements, so galloping isn't paying off: back to one-at-a-time, and minGallop rises to ${minGallop} (harder to re-enter).`, 17);
      }
      if (copyB) {
        for (let t = 0; t < nb; t++) set(dest++, A[pb++]);
        set(dest, tmp[pa]);
        pa++;
        view(`Only one temp element is left, and it is larger than everything remaining on the right (that's what the suffix trim guaranteed): slide the rest of the right run over and drop it at the end.`, 17, { [dest]: "swap" });
      } else if (na) {
        for (let t = 0; t < na; t++) set(dest++, tmp[pa++]);
        view(`The right run is used up; copy the ${na} remaining temp element${na > 1 ? "s" : ""} into place.`, 17, rangeState(dest - na, dest, "swap"));
      }
      S.tmp = null;
    }

    function mergeHi(pa0, na, pb0, nb) {
      const tmp = A.slice(pb0, pb0 + nb);
      let dest = pb0 + nb - 1, pa = pa0 + na - 1, pb = nb - 1;
      S.tmp = { vals: tmp, to: nb, side: "B", origin: pb0 };
      const view = (txt, line, st, extra) => { if (emit) { S.tmp.to = pb + 1; emit(Object.assign({ line, text: txt, state: st || {}, span: [pa0, pb0 + nb], holes: [pa + 1, dest + 1], ptr: [{ i: dest, label: "dest" }, { i: pa, label: "A" }] }, extra || {})); } };
      view(`merge_hi: the right run (${nb}) is shorter than the left (${na}), so copy the right run to temp and fill from the right end backwards.`, 17);
      set(dest--, A[pa--]); na--;
      view(`The last element of the left run is known to be the largest (we trimmed the right run's suffix), so it goes to the far right — no comparison needed.`, 17, { [dest + 1]: "swap" });
      let done = false, copyA = false;
      if (na === 0) done = true; else if (nb === 1) copyA = true;
      outer: while (!done && !copyA) {
        let acount = 0, bcount = 0;
        for (;;) {
          const c = lt(tmp[pb], A[pa]);
          if (c) {
            set(dest--, A[pa--]); acount++; bcount = 0; na--;
            view(`Compare from the right: temp ${tmp[pb]} &lt; left ${A[dest + 1]} → the left run's ${A[dest + 1]} goes last. Left win streak: ${acount} (gallop at ${minGallop}).`, 17, { [dest + 1]: "swap" });
            if (na === 0) { done = true; break outer; }
            if (acount >= minGallop) break;
          } else {
            set(dest--, tmp[pb--]); bcount++; acount = 0; nb--;
            view(`Compare from the right: temp ${A[dest + 1]} ≥ left ${A[pa]} → the temp element goes last. Temp win streak: ${bcount} (gallop at ${minGallop}).`, 17, { [dest + 1]: "swap" });
            if (nb === 1) { copyA = true; break outer; }
            if (bcount >= minGallop) break;
          }
        }
        minGallop++;
        S.gallops++;
        view(`<b>Galloping mode!</b> One run won ${minGallop - 1} times in a row. Search exponentially (1, 3, 7, …) from the right end for where the streak stops.`, 18, {}, { ask: S.gallops === 1 ? { q: "Galloping looks ahead at offsets 1, 3, 7, 15, … To find the end of a block of 10 winners, how many probes before the binary search starts?", opts: ["2", "4", "10"], ans: 1, why: "Offsets 1, 3, 7 are still winners, 15 overshoots: 4 probes bracket the end between 7 and 15, then a short binary search pins it down." } : null });
        do {
          minGallop -= minGallop > 1 ? 1 : 0;
          const c0 = S.cmp;
          let k = gallopRight(tmp[pb], A, pa0, na, na - 1);
          k = na - k;
          acount = k;
          if (k) {
            for (let t = 0; t < k; t++) set(dest--, A[pa--]);
            na -= k;
            view(`Gallop found ${k} left-run element${k > 1 ? "s" : ""} &gt; ${tmp[pb]} using ${plural(S.cmp - c0, "comparison")}; moved them as one block.`, 20, rangeState(dest + 1, dest + 1 + k, "swap"));
            if (na === 0) { done = true; break outer; }
          }
          set(dest--, tmp[pb--]); nb--;
          if (nb === 1) { copyA = true; break outer; }
          const c1 = S.cmp;
          k = gallopLeft(A[pa], tmp, 0, nb, nb - 1);
          k = nb - k;
          bcount = k;
          if (k) {
            for (let t = 0; t < k; t++) set(dest--, tmp[pb--]);
            nb -= k;
            view(`Gallop found ${k} temp element${k > 1 ? "s" : ""} ≥ ${A[pa]} using ${plural(S.cmp - c1, "comparison")}; copied them as one block.`, 20, rangeState(dest + 1, dest + 1 + k, "swap"));
            if (nb === 1) { copyA = true; break outer; }
            if (nb === 0) { done = true; break outer; }
          }
          set(dest--, A[pa--]); na--;
          if (na === 0) { done = true; break outer; }
        } while (acount >= MIN_GALLOP || bcount >= MIN_GALLOP);
        minGallop++;
        view(`Galloping stopped paying off: back to one-at-a-time; minGallop is now ${minGallop}.`, 17);
      }
      if (copyA) {
        for (let t = 0; t < na; t++) set(dest--, A[pa--]);
        set(dest, tmp[pb]);
        pb--;
        view(`One temp element is left and it is smaller than everything remaining on the left (the prefix trim guaranteed it): slide the left run over and drop it at the front.`, 17, { [dest]: "swap" });
      } else if (nb > 0) {
        for (let t = nb - 1; t >= 0; t--) set(dest--, tmp[pb--]);
        view(`The left run is used up; copy the remaining temp elements to the front of the merge area.`, 17, rangeState(dest + 1, dest + 1 + nb, "swap"));
      }
      S.tmp = null;
    }

    function rangeState(a, b, s) { const o = {}; for (let k = a; k < b; k++) o[k] = s; return o; }

    function mergeAt(i, why, ln) {
      ln = ln || 9;
      const a = stack[i], b = stack[i + 1];
      const baseA = a.base, lenA0 = a.len, baseB = b.base, lenB0 = b.len;
      if (emit) emit({ line: ln, text: `${why} Merge runs of length ${lenA0} and ${lenB0}.`, span: [baseA, baseB + lenB0], merging: [i, i + 1] });
      // Powersort: the merged run's right boundary is b's right boundary, so it inherits b's power
      // (CPython stores a different, never-read value here; behaviour is identical because the top
      // run's power is always overwritten in found_new_run and powers are ignored in the final collapse)
      stack[i] = { base: baseA, len: lenA0 + lenB0, id: a.id, power: b.power };
      stack.splice(i + 1, 1);
      S.merges++;
      S.mergeCost += lenA0 + lenB0;
      if (mergeLog) mergeLog.push([baseA, lenA0, lenB0]);
      const c0 = S.cmp;
      const k = gallopRight(A[baseB], A, baseA, lenA0, 0);
      let pa = baseA + k, na = lenA0 - k;
      if (emit) emit({ line: 15, text: k === 0 ? `Trim: a gallop search (${plural(S.cmp - c0, "comparison")}) checks the start of the left run: nothing there is ≤ ${A[baseB]} (the right run's first), so nothing to trim.` : `Trim: a gallop search (${plural(S.cmp - c0, "comparison")}) shows the first ${k} element${k === 1 ? "" : "s"} of the left run ${k === 1 ? "is" : "are"} ≤ ${A[baseB]} (the right run's first) — already in place.`, span: [baseA, baseB + lenB0], state: rangeState(baseA, pa, "done") });
      if (na === 0) { if (emit) emit({ line: 15, text: `The whole left run was already ≤ the right run: the merge costs nothing more.`, span: [baseA, baseB + lenB0] }); return; }
      const c1 = S.cmp;
      const nb = gallopLeft(A[pa + na - 1], A, baseB, lenB0, lenB0 - 1);
      if (emit) emit({ line: 16, text: lenB0 - nb === 0 ? `Trim: another gallop (${plural(S.cmp - c1, "comparison")}) checks the end of the right run: nothing there is ≥ ${A[pa + na - 1]} (the left run's last), so nothing to trim.` : `Trim: another gallop (${plural(S.cmp - c1, "comparison")}) shows the last ${lenB0 - nb} element${lenB0 - nb === 1 ? "" : "s"} of the right run ${lenB0 - nb === 1 ? "is" : "are"} ≥ ${A[pa + na - 1]} (the left run's last) — already in place.`, span: [baseA, baseB + lenB0], state: Object.assign(rangeState(baseA, pa, "done"), rangeState(baseB + nb, baseB + lenB0, "done")) });
      if (nb === 0) return;
      if (na <= nb) mergeLo(pa, na, baseB, nb); else mergeHi(pa, na, baseB, nb);
      if (emit) emit({ line: ln, text: `Merged into one run of length ${lenA0 + lenB0}.`, span: [baseA, baseB + lenB0] });
    }

    function mergeCollapse() {
      while (stack.length > 1) {
        let m = stack.length - 2;
        const L = (q) => stack[q].len;
        if ((m > 0 && L(m - 1) <= L(m) + L(m + 1)) || (m > 1 && L(m - 2) <= L(m - 1) + L(m))) {
          const which = L(m - 1) < L(m + 1) ? "X+Y" : "Y+Z";
          const why = m > 0 && L(m - 1) <= L(m) + L(m + 1)
            ? `Invariant broken: |X| = ${L(m - 1)} ≤ |Y| + |Z| = ${L(m)} + ${L(m + 1)}.`
            : `Invariant broken one level deeper: ${L(m - 2)} ≤ ${L(m - 1)} + ${L(m)}.`;
          if (L(m - 1) < L(m + 1)) m--;
          mergeAt(m, why + ` Merge ${which} (always merge Y with the smaller neighbour).`);
        } else if (L(m) <= L(m + 1)) {
          mergeAt(m, `Invariant broken: |Y| = ${L(m)} ≤ |Z| = ${L(m + 1)}.`);
        } else break;
      }
    }

    let lo = 0, rem = n;
    while (rem > 0) {
      let runLen, desc = false;
      const c0 = S.cmp;
      if (rem === 1) runLen = 1;
      else {
        runLen = 2;
        if (lt(A[lo + 1], A[lo])) {
          desc = true;
          while (lo + runLen < n && lt(A[lo + runLen], A[lo + runLen - 1])) runLen++;
        } else {
          while (lo + runLen < n && !lt(A[lo + runLen], A[lo + runLen - 1])) runLen++;
        }
      }
      S.runs++;
      if (emit && S.runs === 2 && rem > 2) {
        const opts = [...new Set([2, runLen, Math.min(rem, runLen + 3)])].sort((x, y) => x - y);
        emit({ line: 4, text: `Look for the next natural run, starting at index ${lo}: the values ${A[lo]}, ${A[lo + 1]}, … — how far does the trend continue?`, span: [lo, lo + 1],
          ask: { q: `A run starts at index ${lo} (values ${A[lo]}, ${A[lo + 1]}, …). How long will it be?`, opts: opts.map(String), ans: opts.indexOf(runLen), why: `Keep going while each next value is ${desc ? "strictly smaller" : "not smaller"} than the previous one: ${runLen} elements.` } });
      }
      if (emit) emit({
        line: 4, text: `CountRun from index ${lo}: found a natural <b>${desc ? "strictly descending" : "ascending"}</b> run of length ${runLen} using ${plural(S.cmp - c0, "comparison")}.`,
        span: [lo, lo + runLen], fresh: true,
      });
      if (desc) {
        for (let a = lo, b = lo + runLen - 1; a < b; a++, b--) { const t = A[a]; set(a, A[b]); set(b, t); }
        if (emit) emit({ line: 5, text: `Reversed it in place, so it is ascending now. Strictly descending only: reversing equal elements would break stability.`, span: [lo, lo + runLen], state: rangeState(lo, lo + runLen, "swap") });
      }
      if (runLen < minrun) {
        const force = Math.min(minrun, rem);
        if (emit) emit({ line: 6, text: `Run length ${runLen} &lt; minrun ${minrun}: extend it to ${force} elements with binary insertion sort (cheap on a few elements, and it keeps run lengths balanced).`, span: [lo, lo + force] });
        binarySort(lo, lo + force, lo + runLen);
        runLen = force;
      }
      if (POWER) foundNewRun(lo, runLen);
      else {
        stack.push({ base: lo, len: runLen, id: S.runs });
        if (emit) emit({ line: 8, text: `Push run [${lo}..${lo + runLen - 1}] (length ${runLen}) onto the run stack.`, span: [lo, lo + runLen], ask: stack.length >= 2 && S.runs === 3 ? predictMerge() : null });
        mergeCollapse();
      }
      lo += runLen; rem -= runLen;
    }
    while (stack.length > 1) { // merge_force_collapse (unchanged in CPython 3.11+)
      let m = stack.length - 2;
      if (m > 0 && stack[m - 1].len < stack[m + 1].len) m--;
      mergeAt(m, `End of input: collapse the stack, top first.`, 11);
    }
    if (emit) emit({ line: 12, text: `Sorted! ${S.runs} natural run${S.runs === 1 ? "" : "s"}, ${S.merges} merge${S.merges === 1 ? "" : "s"} (merge cost ${S.mergeCost}: elements moved through merges), ${S.gallops} gallop phase${S.gallops === 1 ? "" : "s"}, ${S.cmp} comparisons in total.`, span: [0, n], final: true });
    return A;

    /* Powersort policy, after found_new_run() in CPython 3.11+:
       compute the power of the boundary between the top run and the new
       run, merge while the boundary under the top has a GREATER power,
       record the new power on the (possibly merged) top run, then push. */
    function foundNewRun(s2, n2) {
      if (stack.length) {
        const top = stack[stack.length - 1];
        const s1 = top.base, n1 = top.len;
        const P = nodePower(s1, n1, n2, n);
        if (emit) {
          const a = (s1 + n1 / 2) / n, b = (s2 + n2 / 2) / n;
          emit({ line: 8, text: `Node power of the boundary at index ${s2}: midpoints of the top run and the new run sit at ${fmtFrac(a)} and ${fmtFrac(b)} of the array. In binary they are ${binDigits(a, P)} and ${binDigits(b, P)}: the first differing digit is digit ${P}, so <b>power = ${P}</b> — the depth of this boundary in a perfectly balanced merge tree. No key comparisons.`,
            span: [s1, s2 + n2], power: { at: s2, P }, ask: S.runs === 3 && stack.length >= 2 ? predictPower(P) : null });
        }
        while (stack.length > 1 && stack[stack.length - 2].power > P) {
          const q = stack[stack.length - 2].power;
          mergeAt(stack.length - 2, `The boundary under the top run has power ${q} &gt; ${P}: it is deeper in the ideal tree, so it must be merged before the new, shallower boundary.`, 9);
        }
        stack[stack.length - 1].power = P;
        if (emit && stack.length > 1) emit({ line: 9, text: `Next boundary down has power ${stack[stack.length - 2].power} &lt; ${P}: stop merging. Powers now strictly increase from the bottom of the stack to the top.`, span: [stack[stack.length - 1].base, s2 + n2] });
      }
      stack.push({ base: s2, len: n2, id: S.runs });
      if (emit) emit({ line: 10, text: stack.length === 1 ? `Push the first run [${s2}..${s2 + n2 - 1}] (length ${n2}). There is no boundary yet, so no power to compute.` : `Push run [${s2}..${s2 + n2 - 1}] (length ${n2}); the boundary below it remembers power ${stack[stack.length - 2].power}.`, span: [s2, s2 + n2] });
    }
    function fmtFrac(x) { return x.toFixed(3).replace(/0+$/, "").replace(/\.$/, ""); }
    function binDigits(x, P) { let out = "0."; for (let k = 0; k < P; k++) { x *= 2; const d = x >= 1 ? 1 : 0; out += d; x -= d; } return out + "…"; }
    function predictPower(P) {
      const q = stack[stack.length - 2].power;
      const ans = q > P ? 0 : 1;
      return { q: `The new boundary has power ${P}. The boundary under the top run has power ${q}. What happens next?`, opts: ["Merge the top two runs first", "Just push the new run"], ans, why: ans === 0 ? `${q} &gt; ${P}: the older boundary is deeper in the ideal merge tree, so its two runs must be merged before anything crosses the new, shallower boundary.` : `${q} ≤ ${P}: the older boundary is shallower, so it waits; the new run is pushed and the powers keep increasing toward the top.` };
    }

    function predictMerge() {
      const L = stack.map((r) => r.len);
      const k = L.length;
      let ans = 0;
      const m = k - 2;
      if ((m > 0 && L[m - 1] <= L[m] + L[m + 1]) || (m > 1 && L[m - 2] <= L[m - 1] + L[m])) ans = L[m - 1] < L[m + 1] ? 2 : 1;
      else if (L[m] <= L[m + 1]) ans = 1;
      else ans = 0;
      return { q: `Run stack (bottom → top): [${L.join(", ")}]. Rules: |X| &gt; |Y| + |Z| and |Y| &gt; |Z| (Z on top). What happens next?`, opts: ["Nothing — rules hold", "Merge Y + Z", "Merge X + Y"], ans, why: ans === 0 ? "Both rules hold, so Timsort leaves the stack alone and looks for the next run." : ans === 1 ? "A rule is broken, and Y's smaller neighbour is Z, so the top two runs merge." : "A rule is broken and X is smaller than Z, so Y merges with X (balanced merges are cheaper)." };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Introsort: median-of-3 + Hoare partition, depth limit -> heapsort   */
  function introsort(A, S, E, cfg) {
    cfg = Object.assign({}, DEFAULTS.introsort, cfg || {});
    const lt = mkLt(S);
    const n = A.length;
    S.partitions = 0; S.fallbacks = 0; S.depth = 0;
    const sw = (a, b) => { const t = A[a]; A[a] = A[b]; A[b] = t; S.wr += 2; };
    const limit = cfg.depthLimit != null ? cfg.depthLimit : cfg.depthFactor * floorLog2(Math.max(1, n));
    S.depth = limit;
    if (E) E({ line: 1, text: `n = ${n}: depth limit = ${cfg.depthLimit != null ? "forced to " + limit : "2⌊log₂ n⌋ = " + limit}. Every partition level spends one unit; at 0 we switch to heapsort.`, range: [0, n] });

    function insertion(lo, hi) {
      for (let i = lo + 1; i < hi; i++) {
        const v = A[i];
        let j = i - 1;
        while (j >= lo && lt(v, A[j])) { A[j + 1] = A[j]; S.wr++; j--; }
        A[j + 1] = v; S.wr++;
      }
      if (E && hi - lo > 0) E({ line: 12, text: `Small piece (${hi - lo} ≤ cutoff ${cfg.cutoff}): insertion sort finishes it — fast on tiny ranges.`, range: [lo, hi], doneRange: [lo, hi] });
    }
    function loop(lo, hi, depth) { // [lo, hi)
      while (hi - lo > cfg.cutoff) {
        if (depth === 0) {
          if (E && S.fallbacks === 0) E({ line: 5, text: `Range A[${lo}..${hi - 1}] still has ${hi - lo} elements, but the depth counter is already 0.`, range: [lo, hi], depth,
            ask: { q: "The depth counter is 0 but this range is still bigger than the cutoff. What does introsort do?", opts: ["Keep partitioning", "Heapsort this range", "Insertion sort this range"], ans: 1, why: "Introsort never lets quicksort go deeper than its budget. Normally that only happens after lopsided splits; then heapsort, O(n log n) in the worst case, caps the damage." } });
          S.fallbacks++;
          if (E) E({ line: 6, text: `<b>Depth limit reached</b> on A[${lo}..${hi - 1}]. ${cfg.depthLimit != null ? "(We forced a tiny budget.) " : "Quicksort has been splitting badly. "}Switch to heapsort for this range: guaranteed O(n log n).`, range: [lo, hi], depth });
          heapSortRange(A, lo, hi, S, E ? (p) => E(Object.assign({}, p, { line: 6, depth })) : null);
          if (E) E({ line: 6, text: `Heapsort finished A[${lo}..${hi - 1}].`, range: [lo, hi], doneRange: [lo, hi], depth });
          return;
        }
        depth--;
        S.partitions++;
        const mid = lo + ((hi - lo) >> 1), r = hi - 1;
        // sort3 on lo, mid, r
        if (lt(A[mid], A[lo])) sw(mid, lo);
        if (lt(A[r], A[mid])) { sw(r, mid); if (lt(A[mid], A[lo])) sw(mid, lo); }
        sw(lo, mid);
        const p = A[lo];
        if (E) E({ line: 8, text: `Median of first, middle and last = <b>${p}</b> becomes the pivot (moved to A[${lo}]). Depth left: ${depth}.`, range: [lo, hi], state: { [lo]: "pivot" }, depth });
        let i = lo, j = hi;
        for (;;) {
          do { i++; } while (lt(A[i], p));
          do { j--; } while (lt(p, A[j]));
          if (i >= j) break;
          sw(i, j);
          if (E) E({ line: 9, text: `i stopped at ${A[j]} ≥ pivot, j stopped at ${A[i]} ≤ pivot: swap them.`, range: [lo, hi], state: { [lo]: "pivot", [i]: "swap", [j]: "swap" }, ptr: [{ i, label: "i" }, { i: j, label: "j" }], depth });
        }
        sw(lo, j);
        if (E) E({ line: 9, text: `Scans crossed: put the pivot ${p} at index ${j}, its final place. Left part ${j - lo}, right part ${hi - j - 1}.`, range: [lo, hi], state: { [j]: "pivot" }, done1: j, depth });
        loop(j + 1, hi, depth);
        hi = j;
      }
      insertion(lo, hi);
    }
    loop(0, n, limit);
    if (E) E({ line: 0, text: `Sorted with ${S.cmp} comparisons, ${S.partitions} partitions and ${S.fallbacks} heapsort fallback${S.fallbacks === 1 ? "" : "s"}.`, range: [0, n], doneRange: [0, n], final: true });
    return A;
  }

  /* ------------------------------------------------------------------ */
  /* pdqsort (after pdqsort.h, non-branchless partition)                 */
  function pdqsort(A, S, E, cfg) {
    cfg = Object.assign({}, DEFAULTS.pdqsort, cfg || {});
    const lt = mkLt(S);
    const n = A.length;
    S.partitions = 0; S.fallbacks = 0; S.badPartitions = 0; S.earlyExits = 0; S.equalSkips = 0;
    const sw = (a, b) => { const t = A[a]; A[a] = A[b]; A[b] = t; S.wr += 2; };
    const sort2 = (a, b) => { if (lt(A[b], A[a])) sw(a, b); };
    const sort3 = (a, b, c) => { sort2(a, b); sort2(b, c); sort2(a, b); };
    if (n < 2) return A;
    const bad0 = cfg.badLimit != null ? cfg.badLimit : floorLog2(n);
    S.bad = bad0;
    if (E) E({ line: 0, text: `n = ${n}: badAllowed = ${cfg.badLimit != null ? "forced to " + bad0 : "⌊log₂ n⌋ = " + bad0}. That many bad (very lopsided) partitions are forgiven before switching to heapsort.`, range: [0, n] });

    function insertion(b, e, guarded) {
      if (b === e) return;
      for (let cur = b + 1; cur < e; cur++) {
        let sift = cur, s1 = cur - 1;
        if (lt(A[sift], A[s1])) {
          const tmp = A[sift];
          if (guarded) { do { A[sift--] = A[s1]; S.wr++; } while (sift !== b && lt(tmp, A[--s1])); }
          else { do { A[sift--] = A[s1]; S.wr++; } while (lt(tmp, A[--s1])); }
          A[sift] = tmp; S.wr++;
        }
      }
    }
    function partialInsertion(b, e) {
      if (b === e) return true;
      let limit = 0;
      for (let cur = b + 1; cur < e; cur++) {
        let sift = cur, s1 = cur - 1;
        if (lt(A[sift], A[s1])) {
          const tmp = A[sift];
          do { A[sift--] = A[s1]; S.wr++; } while (sift !== b && lt(tmp, A[--s1]));
          A[sift] = tmp; S.wr++;
          limit += cur - sift;
        }
        if (limit > cfg.partialLimit) return false;
      }
      return true;
    }
    function partitionRight(b, e) {
      const pivot = A[b];
      let first = b, last = e;
      while (lt(A[++first], pivot));
      if (first - 1 === b) { while (first < last && !lt(A[--last], pivot)); }
      else { while (!lt(A[--last], pivot)); }
      const already = first >= last;
      while (first < last) {
        sw(first, last);
        if (E) E({ line: 7, text: `PartitionRight: ${A[last]} ≥ pivot was on the left and ${A[first]} &lt; pivot on the right — swap.`, range: [b, e], state: { [b]: "pivot", [first]: "swap", [last]: "swap" }, ptr: [{ i: first, label: "i" }, { i: last, label: "j" }] });
        while (lt(A[++first], pivot));
        while (!lt(A[--last], pivot));
      }
      const pos = first - 1;
      A[b] = A[pos]; A[pos] = pivot; S.wr += 2;
      return [pos, already];
    }
    function partitionLeft(b, e) {
      const pivot = A[b];
      let first = b, last = e;
      while (lt(pivot, A[--last]));
      if (last + 1 === e) { while (first < last && !lt(pivot, A[++first])); }
      else { while (!lt(pivot, A[++first])); }
      while (first < last) {
        sw(first, last);
        while (lt(pivot, A[--last]));
        while (!lt(pivot, A[++first]));
      }
      const pos = last;
      A[b] = A[pos]; A[pos] = pivot; S.wr += 2;
      return pos;
    }
    function loop(b, e, bad, leftmost) {
      for (;;) {
        const size = e - b;
        if (size < cfg.insertion) {
          insertion(b, e, leftmost);
          if (E) E({ line: 2, text: `Range of ${size} &lt; ${cfg.insertion}: insertion sort${leftmost ? "" : " (unguarded: the element just left of the range is a smaller pivot, so it acts as a sentinel)"}.`, range: [b, e], doneRange: [b, e], bad });
          return;
        }
        const s2 = size >> 1;
        if (size > cfg.ninther) {
          sort3(b, b + s2, e - 1); sort3(b + 1, b + (s2 - 1), e - 2); sort3(b + 2, b + (s2 + 1), e - 3); sort3(b + (s2 - 1), b + s2, b + (s2 + 1));
          sw(b, b + s2);
        } else sort3(b + s2, b, e - 1);
        S.partitions++;
        if (E) E({ line: 3, text: `Pivot = ${size > cfg.ninther ? "pseudomedian of 9 (\"ninther\")" : "median of middle, first and last"} = <b>${A[b]}</b>, placed at A[${b}].`, range: [b, e], state: { [b]: "pivot" }, bad });
        if (!leftmost && !lt(A[b - 1], A[b])) {
          S.equalSkips++;
          const pos = partitionLeft(b, e);
          if (E) E({ line: 5, text: `<b>Many equal keys:</b> the pivot ${A[pos]} equals the previous pivot A[${b - 1}], so no element here is smaller. PartitionLeft gathers all elements equal to ${A[pos]} on the left (indices ${b}..${pos}) — they are done, never touched again.`, range: [b, e], doneRange: [b, pos + 1], bad });
          b = pos + 1;
          continue;
        }
        const [pos, already] = partitionRight(b, e);
        const ls = pos - b, rs = e - (pos + 1);
        const unbalanced = ls < (size >> 3) || rs < (size >> 3);
        if (E) E({ line: 7, text: `Pivot ${A[pos]} lands at index ${pos}: left ${ls}, right ${rs}.${already ? " <b>No swaps were needed</b> — this range was already partitioned." : ""}`, range: [b, e], state: { [pos]: "pivot" }, done1: pos, bad,
          ask: already && !unbalanced && S.earlyExits === 0 && !loop.asked ? (loop.asked = true, { q: "No swaps were needed — this range may already be sorted. What does pdqsort try next?", opts: ["Recurse as usual", "A partial insertion sort that gives up after 8 moves", "Heapsort"], ans: 1, why: "If the data is (nearly) sorted, a capped insertion sort on both sides finishes it in linear time; if it needs more than 8 moves it gives up and quicksort continues." }) : null });
        if (unbalanced) {
          S.badPartitions++;
          if (--bad === 0) {
            S.fallbacks++;
            if (E) E({ line: 10, text: `Bad partition #${S.badPartitions} (a side is smaller than size/8 = ${size >> 3}) and badAllowed hit 0: switch to heapsort for O(n log n) worst case.`, range: [b, e], bad });
            heapSortRange(A, b, e, S, E ? (p) => E(Object.assign({}, p, { line: 10, bad })) : null);
            if (E) E({ line: 10, text: `Heapsort finished A[${b}..${e - 1}].`, range: [b, e], doneRange: [b, e], bad });
            return;
          }
          if (ls >= cfg.insertion) {
            sw(b, b + (ls >> 2)); sw(pos - 1, pos - (ls >> 2));
            if (ls > cfg.ninther) { sw(b + 1, b + ((ls >> 2) + 1)); sw(b + 2, b + ((ls >> 2) + 2)); sw(pos - 2, pos - ((ls >> 2) + 1)); sw(pos - 3, pos - ((ls >> 2) + 2)); }
          }
          if (rs >= cfg.insertion) {
            sw(pos + 1, pos + (1 + (rs >> 2))); sw(e - 1, e - (rs >> 2));
            if (rs > cfg.ninther) { sw(pos + 2, pos + (2 + (rs >> 2))); sw(pos + 3, pos + (3 + (rs >> 2))); sw(e - 2, e - (1 + (rs >> 2))); sw(e - 3, e - (2 + (rs >> 2))); }
          }
          if (E) E({ line: 11, text: `<b>Bad partition</b> (a side is smaller than size/8 = ${size >> 3}). badAllowed → ${bad}. Swap a few elements at the quarter points to break up whatever pattern fooled the pivot choice.`, range: [b, e], state: { [pos]: "pivot" }, bad });
        } else if (already) {
          const c0 = S.cmp;
          const okL = partialInsertion(b, pos);
          const okR = okL && partialInsertion(pos + 1, e);
          if (okL && okR) {
            S.earlyExits++;
            if (E) E({ line: 14, text: `Partial insertion sort fixed both sides with ≤ ${cfg.partialLimit} moves per side (${plural(S.cmp - c0, "comparison")}): the range A[${b}..${e - 1}] is sorted. Done early!`, range: [b, e], doneRange: [b, e], bad });
            return;
          }
          if (E) E({ line: 13, text: `Partial insertion sort gave up (more than ${cfg.partialLimit} moves): not sorted enough. Continue with quicksort.`, range: [b, e], state: { [pos]: "pivot" }, bad });
        }
        loop(b, pos, bad, leftmost);
        b = pos + 1; leftmost = false;
      }
    }
    loop.asked = false;
    loop(0, n, bad0, true);
    if (E) E({ line: 0, text: `Sorted with ${S.cmp} comparisons: ${S.partitions} pivots, ${S.badPartitions} bad partitions, ${S.earlyExits} early exits, ${S.equalSkips} equal-key skips, ${S.fallbacks} heapsort fallbacks.`, range: [0, n], doneRange: [0, n], final: true });
    return A;
  }

  /* ------------------------------------------------------------------ */
  /* Input shapes (deterministic for a given seed)                       */
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const SHAPES = [
    { id: "random", label: "Random" },
    { id: "sorted", label: "Sorted" },
    { id: "reversed", label: "Reversed" },
    { id: "sawtooth", label: "Sawtooth" },
    { id: "organ", label: "Organ pipe" },
    { id: "few", label: "Few unique" },
    { id: "mostly", label: "Mostly sorted" },
    { id: "uneven", label: "Uneven runs" },
  ];
  function makeShape(id, n, seed) {
    const r = rng(seed);
    const perm = () => { const a = Array.from({ length: n }, (_, i) => i + 1); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    switch (id) {
      case "sorted": return Array.from({ length: n }, (_, i) => i + 1);
      case "reversed": return Array.from({ length: n }, (_, i) => n - i);
      case "sawtooth": { const teeth = Math.max(2, Math.round(Math.sqrt(n) / 2)); const w = Math.ceil(n / teeth); const base = perm(); const out = []; for (let t = 0; t < teeth; t++) out.push(...base.slice(t * w, (t + 1) * w).sort((x, y) => x - y)); return out; }
      case "organ": { const h = Math.ceil(n / 2); return Array.from({ length: n }, (_, i) => (i < h ? 2 * i + 1 : 2 * (n - i))); }
      case "few": return Array.from({ length: n }, () => 1 + Math.floor(r() * 4));
      case "uneven": { // four sorted runs of very different lengths: 45%, 38%, 13%, 4% of n (random values)
        const cut = [0, Math.round(n * 0.45), Math.round(n * 0.83), Math.round(n * 0.96), n];
        const out = [];
        for (let q = 0; q < 4; q++) out.push(...Array.from({ length: cut[q + 1] - cut[q] }, () => 1 + Math.floor(r() * n)).sort((x, y) => x - y));
        return out;
      }
      case "mostly": { const a = Array.from({ length: n }, (_, i) => i + 1); const k = Math.max(1, Math.round(n * 0.03)); for (let t = 0; t < k; t++) { const i = Math.floor(r() * n), j = Math.floor(r() * n); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
      default: return perm();
    }
  }

  function powersort(A, S, E, cfg) { return timsort(A, S, E, Object.assign({}, DEFAULTS.powersort, cfg || {}, { policy: "powersort" })); }

  const ALGOS = [
    { id: "insertion", label: "Insertion sort", run: (A, S) => insertionSort(A, S) },
    { id: "merge", label: "Mergesort", run: (A, S) => mergeSort(A, S) },
    { id: "quick", label: "Quicksort (first pivot)", run: (A, S) => quickSortFirst(A, S) },
    { id: "tim", label: "Timsort", run: (A, S, E, c) => timsort(A, S, E, c) },
    { id: "power", label: "Powersort", run: (A, S, E, c) => powersort(A, S, E, c) },
    { id: "intro", label: "Introsort", run: (A, S, E, c) => introsort(A, S, E, c) },
    { id: "pdq", label: "pdqsort", run: (A, S, E, c) => pdqsort(A, S, E, c) },
  ];

  /** Race: comparisons per algorithm per shape, library constants. */
  function race(n, seed) {
    const rows = [];
    for (const sh of SHAPES) {
      const input = makeShape(sh.id, n, seed);
      const ref = input.slice().sort((x, y) => x - y);
      const row = { shape: sh.id, label: sh.label, cmp: {} };
      for (const al of ALGOS) {
        const A = input.slice(), S = { cmp: 0, wr: 0 };
        al.run(A, S, null, DEFAULTS[{ tim: "timsort", power: "powersort", intro: "introsort", pdq: "pdqsort" }[al.id]]);
        for (let k = 0; k < n; k++) if (A[k] !== ref[k]) throw new Error(al.id + " failed on " + sh.id);
        row.cmp[al.id] = S.cmp;
      }
      rows.push(row);
    }
    return rows;
  }

  const API = { DEFAULTS, TEACH, insertionSort, mergeSort, quickSortFirst, heapSortRange, timsort, powersort, nodePower, introsort, pdqsort, SHAPES, ALGOS, makeShape, race, rng, floorLog2 };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.SortCore = API;
})(typeof window !== "undefined" ? window : globalThis);
