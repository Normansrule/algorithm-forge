/* =====================================================================
   Algorithm Forge — hub data + helpers (forge-hub.js)
   ---------------------------------------------------------------------
   Shared by the landing page, the Learning Path, the simulation
   gallery and the quiz. Load AFTER forge-kit.js.

     ForgeHub.CHAPTERS        Ch 0–17: title, hook, lesson folder, level, sims
     ForgeHub.SIMS            every planned simulation: title, blurb, glyph()
     ForgeHub.LEVELS          Levels 0–6 with "what you can do after"
     ForgeHub.WEEKS           suggested week-by-week plan (CSC 501 order)
     ForgeHub.lessonUrl(ch)   GitHub URL of a chapter's lesson
     ForgeHub.progress()      reads localStorage "forge-arena-v1" safely
     ForgeHub.loadProblems()  Promise<ForgeProblems|null> — loads the
                              Arena registry + manifest + packs, tolerating
                              missing files
   ===================================================================== */
(function () {
  "use strict";
  const Hub = {};
  const REPO = "https://github.com/Normansrule/algorithm-forge/blob/main/";
  Hub.REPO = REPO;

  /* ---------- chapters ---------- */
  // sims: [id, focus?] — focus is the chapter-specific angle for sims shared across chapters
  Hub.CHAPTERS = [
    { n: 0, title: "Start Here", folder: "00-start-here", level: 0,
      hook: "How to learn here: the Build Card method, Forge Pseudocode, and picking your way in.", sims: [] },
    { n: 1, title: "Introduction", folder: "01-introduction", level: 0,
      hook: "What an algorithm really is, told through Euclid's 2,300-year-old greatest common divisor.",
      sims: [["euclid-gcd"]] },
    { n: 2, title: "Analysis Framework", folder: "02-analysis-framework", level: 0,
      hook: "Count the basic operation; turn loops into sums and recursion into recurrences.",
      sims: [["growth-rates"], ["recurrence-lab"], ["empirical-lab"], ["hanoi", "Count the moves: M(n) = 2M(n−1) + 1 solved by backward substitution."], ["fibonacci"]] },
    { n: 3, title: "Brute Force & Exhaustive Search", folder: "03-brute-force", level: 1,
      hook: "Do exactly what the definition says, then measure what it costs.",
      sims: [["sorting-studio", "Selection sort and bubble sort: n(n−1)/2 comparisons, visible bar by bar."],
             ["string-match", "Brute-force matching: slide the pattern one position at a time."],
             ["closest-pair-hull", "Brute force: check every pair of points, every candidate hull edge."],
             ["exhaustive-search"], ["graph-traversal"]] },
    { n: 4, title: "Decrease-and-Conquer", folder: "04-decrease-and-conquer", level: 2,
      hook: "Shrink the problem by one, by half, or by a variable amount — then extend the answer.",
      sims: [["search-lab"], ["topo-sort"], ["combinatorics"], ["nim"]] },
    { n: 5, title: "Divide-and-Conquer", folder: "05-divide-and-conquer", level: 2,
      hook: "Split, solve, stitch — and read the cost straight off the Master Theorem.",
      sims: [["sorting-studio", "Mergesort and quicksort: watch n log n happen, and quicksort's bad pivots."],
             ["tree-traversals"], ["karatsuba-strassen"],
             ["closest-pair-hull", "Divide-and-conquer closest pair and QuickHull."],
             ["hanoi", "Recursion you can see: move n − 1, move 1, move n − 1."]] },
    { n: 6, title: "Transform-and-Conquer", folder: "06-transform-and-conquer", level: 3,
      hook: "Change the problem's shape until it becomes easy: presort, balance, heapify.",
      sims: [["heap-lab"], ["search-trees"], ["gaussian"], ["horner-binexp"]] },
    { n: 7, title: "Space-Time Tradeoffs", folder: "07-space-time-tradeoffs", level: 3,
      hook: "Spend memory to buy speed: counting sorts, shift tables, hashing, B-trees.",
      sims: [["sorting-studio", "Counting, radix and bucket sort — sorting without comparing keys."],
             ["string-match", "Horspool, Boyer–Moore and Knuth–Morris–Pratt (KMP): precompute a table, skip ahead."],
             ["hashing"], ["b-tree"]] },
    { n: 8, title: "Dynamic Programming (DP)", folder: "08-dynamic-programming", level: 4,
      hook: "Solve every overlapping subproblem once, write it in a table, never recompute.",
      sims: [["dp-studio"], ["optimal-bst"], ["warshall-floyd"]] },
    { n: 9, title: "Greedy Technique", folder: "09-greedy", level: 4,
      hook: "Grab the best-looking piece every time — and prove it never backfires.",
      sims: [["greedy-graphs"], ["huffman"], ["greedy-choices"]] },
    { n: 10, title: "Iterative Improvement", folder: "10-iterative-improvement", level: 4,
      hook: "Start feasible, keep improving, prove you're done: simplex, flows, matchings.",
      sims: [["simplex"], ["max-flow"], ["bipartite-matching"], ["stable-marriage"]] },
    { n: 11, title: "Limitations of Algorithm Power", folder: "11-limitations", level: 5,
      hook: "Lower bounds, decision trees, and deterministic Polynomial time (P) versus Nondeterministic Polynomial time (NP).",
      sims: [["decision-trees"], ["p-np"]] },
    { n: 12, title: "Coping with Limitations", folder: "12-coping-with-limitations", level: 5,
      hook: "When exact is too slow: backtracking, branch-and-bound, approximation, root finding.",
      sims: [["backtracking"], ["branch-and-bound"], ["tsp-approx"], ["bin-packing"], ["root-finding"]] },
    { n: 13, title: "Advanced Data Structures", folder: "13-advanced-data-structures", level: 5, beyond: true,
      hook: "Union–find, Fenwick and segment trees, tries, skip lists, caches, storage engines.",
      sims: [["union-find"], ["segment-tree"], ["trie"]] },
    { n: 14, title: "Advanced Graphs", folder: "14-advanced-graphs", level: 5, beyond: true,
      hook: "Negative edges, heuristics, components, bridges — modeling real problems as graphs.",
      sims: [["shortest-paths-plus"], ["scc"]] },
    { n: 15, title: "DP & Interview Patterns", folder: "15-dp-and-interview-patterns", level: 5, beyond: true,
      hook: "Recognize the pattern in seconds: two pointers, sliding window, monotonic stack, and more.",
      sims: [["patterns"]] },
    { n: 16, title: "Randomized, Amortized & Streaming", folder: "16-randomized-amortized-streaming", level: 5, beyond: true,
      hook: "Why array doubling is cheap on average, and how sketches count billions in kilobytes.",
      sims: [["amortized"], ["bloom-filter"]] },
    { n: 17, title: "Senior Engineer Playbook", folder: "17-senior-engineer-playbook", level: 5, beyond: true,
      hook: "Clarify, estimate, choose, prove, test, ship — the process behind every good design.", sims: [] },
  ];
  Hub.lessonUrl = (ch) => REPO + "lessons/" + Hub.CHAPTERS[ch].folder + "/README.md";

  /* ---------- levels ---------- */
  Hub.LEVELS = [
    { n: 0, name: "Foundations", chapters: [0, 1, 2],
      can: "You can write an algorithm precisely, choose its basic operation and count how often it runs — the habit behind every performance review of code." },
    { n: 1, name: "Brute Force & Analysis", chapters: [2, 3],
      can: "You can solve almost anything the honest way and predict its cost before running it — the baseline and test oracle senior engineers write first." },
    { n: 2, name: "Decrease & Divide", chapters: [4, 5],
      can: "You can shrink and split problems (binary search, mergesort, quicksort) and solve their recurrences with the Master Theorem." },
    { n: 3, name: "Transform & Space-Time", chapters: [6, 7],
      can: "You can reason about presorting, heaps, balanced trees, hashing and string search like a backend engineer." },
    { n: 4, name: "Dynamic Programming, Greedy & Iterative Improvement", chapters: [8, 9, 10],
      can: "You can turn exponential recursions into tables, prove when greedy is safe, and model problems as flows and matchings — an algorithm designer's toolkit." },
    { n: 5, name: "Hard Problems & Senior Patterns", chapters: [11, 12, 13, 14, 15, 16, 17],
      can: "You can recognize intractable problems, prove lower bounds, and still ship great answers — plus the patterns and process senior engineers use daily." },
    { n: 6, name: "Expert: Algorithm Designer", chapters: [12, 13, 14, 15, 16, 17],
      can: "You can design the algorithm nobody handed you: exponential-to-polynomial rewrites, linear-time string and graph algorithms, cut structure, and data-structure design under real constraints." },
  ];

  /* ---------- week-by-week plan (lecture N covers chapter N) ---------- */
  Hub.WEEKS = [
    { w: "1", lec: "Lecture 1", ch: [1], goal: "Say what an algorithm is; trace Euclid's algorithm; know the basic data structures." },
    { w: "2", lec: "Lecture 2 (part 1)", ch: [2], goal: "Input size, basic operation, best/worst/average case; O, Ω and Θ." },
    { w: "3", lec: "Lecture 2 (part 2)", ch: [2], goal: "Sums for loops, recurrences for recursion; run the empirical-analysis lab.", extra: ["Assignment 1", "practice/assignments/assignment-1.md"] },
    { w: "4", lec: "Lecture 3", ch: [3], goal: "Selection/bubble sort, string matching, exhaustive search, Depth-First Search (DFS) and Breadth-First Search (BFS)." },
    { w: "5", lec: "Lecture 4", ch: [4], goal: "Insertion sort, topological sort, generating permutations and subsets, binary search.", extra: ["Assignment 2", "practice/assignments/assignment-2.md"] },
    { w: "6", lec: "Lecture 5", ch: [5], goal: "Master Theorem; mergesort, quicksort, tree traversals, Karatsuba, closest pair." },
    { w: "7", lec: "Midterm 1 review", ch: [1, 2, 3, 4, 5], review: true, goal: "Timed practice exam; redo every missed question from a blank page.", extra: ["Midterm 1 review", "practice/midterm-1/README.md"] },
    { w: "8", lec: "Lecture 6", ch: [6], goal: "Presorting, Gaussian elimination, balanced search trees, heaps, Horner's rule." },
    { w: "9", lec: "Lecture 7", ch: [7], goal: "Counting sorts, Horspool and Boyer–Moore, hashing, B-trees." },
    { w: "10", lec: "Lecture 8", ch: [8], goal: "Coin-row, knapsack and memory functions, optimal search trees, Warshall and Floyd." },
    { w: "11", lec: "Lecture 9", ch: [9], goal: "Prim, Kruskal, Dijkstra, Huffman codes — and when greedy is optimal." },
    { w: "12", lec: "Lecture 10", ch: [10], goal: "Simplex, maximum flow, bipartite matching, stable marriage." },
    { w: "13", lec: "Lecture 11", ch: [11], goal: "Lower-bound arguments, decision trees, P, NP and NP-completeness." },
    { w: "14", lec: "Lecture 12", ch: [12], goal: "Backtracking, branch-and-bound, approximation algorithms, root finding." },
    { w: "15", lec: "Final review", ch: [6, 7, 8, 9, 10, 11, 12], review: true, goal: "Mixed quizzes across all chapters; one Arena problem per strategy." },
    { w: "16+", lec: "Beyond 1", ch: [13], beyond: true, goal: "Union–find, Fenwick and segment trees, tries, caches." },
    { w: "17+", lec: "Beyond 2", ch: [14], beyond: true, goal: "Bellman–Ford, A*, strongly connected components, bridges." },
    { w: "18+", lec: "Beyond 3", ch: [15], beyond: true, goal: "Interview patterns and the dynamic-programming pipeline." },
    { w: "19+", lec: "Beyond 4", ch: [16], beyond: true, goal: "Amortized analysis, randomized algorithms, streaming sketches." },
    { w: "20+", lec: "Beyond 5", ch: [17], beyond: true, goal: "The senior engineer's process: clarify, estimate, prove, test, ship." },
  ];

  /* ---------- tiny SVG glyph builders (viewBox 0 0 96 56) ---------- */
  const COL = { b: "var(--c-bar)", c: "var(--c-compare)", s: "var(--c-swap)", d: "var(--c-done)", a: "var(--c-active)",
    p: "var(--c-pivot)", m: "var(--c-dim)", e: "var(--ember)", t: "var(--steel)", l: "var(--line-2)", i: "var(--ink-2)", n: "var(--panel-2)" };
  const col = (k) => COL[k] || k || COL.b;
  function bars(vals, st, x0, x1, base, top) {
    x0 = x0 == null ? 10 : x0; x1 = x1 == null ? 86 : x1; base = base == null ? 50 : base; top = top == null ? 8 : top;
    const n = vals.length, w = (x1 - x0) / n, mx = Math.max(...vals);
    return vals.map((v, k) => {
      const h = ((base - top) * v) / mx;
      return `<rect x="${(x0 + k * w + w * 0.12).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(w * 0.76).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${col((st || "")[k])}"/>`;
    }).join("");
  }
  function graph(nodes, edges, r) {
    r = r || 4.5;
    const e = edges.map(([a, b, k, dir]) => {
      const A = nodes[a], B = nodes[b];
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
      const x2 = B[0] - (dx / L) * (r + (dir ? 1.5 : 0)), y2 = B[1] - (dy / L) * (r + (dir ? 1.5 : 0));
      const c = k ? col(k) : COL.l;
      const head = dir ? `<path d="M${x2} ${y2} l${(-dx / L * 4 - dy / L * 2.2).toFixed(2)} ${(-dy / L * 4 + dx / L * 2.2).toFixed(2)} l${(dy / L * 4.4).toFixed(2)} ${(-dx / L * 4.4).toFixed(2)}z" fill="${c}"/>` : "";
      return `<line x1="${A[0]}" y1="${A[1]}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="${k ? 2.2 : 1.4}"/>` + head;
    }).join("");
    const v = nodes.map(([x, y, k]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${k ? col(k) : COL.n}" stroke="${k ? col(k) : COL.l}" stroke-width="1.4"/>`).join("");
    return e + v;
  }
  function cells(vals, x, y, w, h, st, fs) {
    fs = fs || 7;
    return vals.map((v, k) => {
      const c = (st || "")[k];
      const fill = c && c !== " " ? col(c) : COL.n;
      return `<rect x="${x + k * w}" y="${y}" width="${w - 1}" height="${h}" rx="1.5" fill="${fill}" stroke="${COL.l}" stroke-width=".8"/>` +
        (v === "" ? "" : `<text x="${x + k * w + (w - 1) / 2}" y="${y + h / 2 + fs * 0.36}" text-anchor="middle" font-size="${fs}" font-family="var(--mono)" font-weight="700" fill="${c && c !== " " && c !== "m" ? "#0d1117" : "var(--ink)"}">${v}</text>`);
    }).join("");
  }
  const txt = (x, y, s, fs, c, anchor) => `<text x="${x}" y="${y}" font-size="${fs || 7}" font-family="var(--mono)" font-weight="700" text-anchor="${anchor || "middle"}" fill="${col(c || "i")}">${s}</text>`;
  function grid(r, c, x, y, sz, fn) {
    let s = "";
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
      const k = fn ? fn(i, j) : "";
      s += `<rect x="${x + j * sz}" y="${y + i * sz}" width="${sz - 1}" height="${sz - 1}" rx="1" fill="${k ? col(k) : COL.n}" stroke="${COL.l}" stroke-width=".6"/>`;
    }
    return s;
  }
  // binary tree: levels of node states, e.g. ["a","bd","bbdm"]; x-span 8..88, y from 8 step dy
  function btree(levels, opt) {
    opt = opt || {};
    const x0 = opt.x0 || 8, x1 = opt.x1 || 88, y0 = opt.y0 || 8, dy = opt.dy || 14, r = opt.r || 4.2;
    const pos = levels.map((row, d) => { const cnt = 2 ** d, w = (x1 - x0) / cnt; return Array.from(row).map((k, i) => [x0 + w * (i + 0.5), y0 + d * dy, k]); });
    let e = "", v = "";
    pos.forEach((row, d) => row.forEach(([x, y, k], i) => {
      if (k === " " || k === ".") return;
      if (d > 0) { const P = pos[d - 1][i >> 1]; if (P && P[2] !== " ") e += `<line x1="${P[0]}" y1="${P[1]}" x2="${x}" y2="${y}" stroke="${opt.edge && opt.edge(d, i) ? col(opt.edge(d, i)) : COL.l}" stroke-width="1.4"/>`; }
      v += `<circle cx="${x}" cy="${y}" r="${r}" fill="${k === "o" ? COL.n : col(k)}" stroke="${k === "o" ? COL.l : col(k)}" stroke-width="1.2"/>`;
      if (opt.label) { const L = opt.label(d, i); if (L != null) v += txt(x, y + 2.4, L, 6, k === "o" ? "i" : "#0d1117"); }
    }));
    return e + v;
  }

  /* ---------- simulations catalog ---------- */
  const S = {};
  function sim(id, title, blurb, glyph) { S[id] = { id, title, blurb, glyph }; }

  sim("euclid-gcd", "Euclid's Algorithm", "Greatest Common Divisor (GCD) three ways — Euclid, consecutive integers, prime factors — plus the sieve of Eratosthenes.",
    () => `<rect x="8" y="10" width="80" height="32" fill="none" stroke="${COL.l}"/>` +
      `<rect x="8" y="10" width="32" height="32" fill="${COL.t}" opacity=".85"/><rect x="40" y="10" width="32" height="32" fill="${COL.t}" opacity=".6"/>` +
      `<rect x="72" y="10" width="16" height="16" fill="${COL.e}"/><rect x="72" y="26" width="16" height="16" fill="${COL.e}" opacity=".7"/>` + txt(48, 52, "gcd(60,24)=12", 7));
  sim("growth-rates", "Growth Rates", "Plot log n, n, n log n, n², 2ⁿ and n! side by side and feel why the order of growth wins in the end.",
    () => `<path d="M8 50 H90 M8 50 V6" stroke="${COL.l}" stroke-width="1.2" fill="none"/>` +
      `<path d="M8 48 C30 42 60 40 90 38" stroke="${COL.d}" stroke-width="2" fill="none"/>` +
      `<path d="M8 50 L90 26" stroke="${COL.t}" stroke-width="2" fill="none"/>` +
      `<path d="M8 50 Q60 44 90 10" stroke="${COL.c}" stroke-width="2" fill="none"/>` +
      `<path d="M8 50 Q56 50 64 6" stroke="${COL.s}" stroke-width="2" fill="none"/>`);
  sim("recurrence-lab", "Recurrence Lab", "Unroll a recurrence by backward substitution, draw its recursion tree, and check the Master Theorem case.",
    () => btree(["e", "tt", "cccc", "dddddddd"], { dy: 12, r: 3.6 }) + txt(92, 10, "n", 6, "e", "end") + txt(92, 22, "n", 6, "t", "end") + txt(92, 34, "n", 6, "c", "end"));
  sim("empirical-lab", "Empirical Lab", "Run an algorithm on growing inputs, count operations, and fit the curve on a log–log plot.",
    () => `<path d="M8 50 H90 M8 50 V6" stroke="${COL.l}" stroke-width="1.2" fill="none"/><path d="M10 48 L88 10" stroke="${COL.e}" stroke-width="1.6" stroke-dasharray="4 3"/>` +
      [[14, 44], [22, 41], [30, 38], [38, 33], [46, 30], [54, 27], [62, 22], [70, 19], [78, 15], [86, 12]].map(([x, y], k) => `<circle cx="${x}" cy="${y + (k % 2 ? 2 : -1)}" r="2.3" fill="${COL.t}"/>`).join(""));
  sim("hanoi", "Tower of Hanoi", "Move the tower one disk at a time and watch 2ⁿ − 1 moves unfold from a three-line recursion.",
    () => `<path d="M6 50 H90" stroke="${COL.l}" stroke-width="2"/>` + [20, 48, 76].map((x) => `<rect x="${x - 1}" y="14" width="2" height="36" fill="${COL.l}"/>`).join("") +
      `<rect x="6" y="44" width="28" height="6" rx="2" fill="${COL.t}"/><rect x="10" y="38" width="20" height="6" rx="2" fill="${COL.p}"/>` +
      `<rect x="41" y="44" width="14" height="6" rx="2" fill="${COL.c}"/><rect x="71" y="44" width="10" height="6" rx="2" fill="${COL.e}"/>`);
  sim("fibonacci", "Fibonacci Four Ways", "Naive recursion vs. memo vs. loop vs. matrix power — see the same subproblem solved again and again.",
    () => btree(["t", "tt", "tsst", "ss.s...."], { dy: 13, r: 4, label: (d, i) => ["5", ["4", "3"][i], ["3", "2", "2", "1"][i], ["2", "1", "", "1"][i]][d] }));
  sim("sorting-studio", "Sorting Studio", "Every sort in the course on your own array, with comparisons and swaps counted live.",
    () => bars([5, 9, 3, 7, 2, 8, 4, 6], "bbcbsbdd"));
  sim("string-match", "String Match", "Slide a pattern over a text and count character comparisons, from brute force to shift tables.",
    () => cells(["B", "A", "R", "B", "E", "R", "S"], 6, 10, 12, 12, "   dddd ", 7) + cells(["B", "E", "R"], 42, 30, 12, 12, "ddd", 7) + `<path d="M24 38 h14" stroke="${COL.e}" stroke-width="2"/><path d="M38 38 l-4 -3 v6z" fill="${COL.e}"/>`);
  sim("closest-pair-hull", "Closest Pair & Convex Hull", "Find the two nearest points and wrap the outer fence — by brute force and by divide-and-conquer.",
    () => `<path d="M12 40 L30 10 L70 8 L88 30 L66 50 L22 50 Z" fill="${COL.t}" fill-opacity=".12" stroke="${COL.t}" stroke-width="1.6"/>` +
      [[12, 40], [30, 10], [70, 8], [88, 30], [66, 50], [22, 50], [40, 30], [58, 26], [50, 38], [46, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="${COL.i}"/>`).join("") +
      `<line x1="58" y1="26" x2="50" y2="38" stroke="${COL.s}" stroke-width="2"/><circle cx="58" cy="26" r="3" fill="${COL.s}"/><circle cx="50" cy="38" r="3" fill="${COL.s}"/>`);
  sim("exhaustive-search", "Exhaustive Search", "Traveling Salesman Problem (TSP), knapsack and assignment by trying every candidate — and watching n! explode.",
    () => { let s = ""; const L1 = [20, 48, 76]; L1.forEach((x, i) => { s += `<line x1="48" y1="8" x2="${x}" y2="24" stroke="${COL.l}" stroke-width="1.3"/>`; [x - 7, x + 7].forEach((x2, j) => { s += `<line x1="${x}" y1="24" x2="${x2}" y2="40" stroke="${COL.l}" stroke-width="1.3"/><circle cx="${x2}" cy="40" r="3.4" fill="${i === 1 && j === 0 ? COL.d : COL.c}"/><line x1="${x2}" y1="40" x2="${x2}" y2="50" stroke="${COL.l}"/>`; }); s += `<circle cx="${x}" cy="24" r="3.8" fill="${COL.t}"/>`; }); return s + `<circle cx="48" cy="8" r="4.2" fill="${COL.e}"/>`; });
  sim("graph-traversal", "Graph Traversal", "Depth-First Search (DFS) and Breadth-First Search (BFS) forests with tree, back and cross edges labeled.",
    () => graph([[16, 28, "e"], [38, 12, "t"], [38, 44, "t"], [62, 12, "d"], [62, 44, "d"], [84, 28, "d"]],
      [[0, 1, "e"], [0, 2, "e"], [1, 3, "e"], [2, 4, "e"], [3, 5, "e"], [1, 2], [4, 5]]));
  sim("search-lab", "Search Lab", "Binary and interpolation search, quickselect, fake-coin, Russian peasant multiplication, exponentiation by squaring.",
    () => cells([3, 8, 14, 21, 27, 33, 40, 52], 4, 16, 11, 14, "mmmmacbb", 6) + txt(42, 42, "m", 8, "c") + txt(64, 42, "", 8) + `<path d="M42 32 l-3 5 h6z" fill="${COL.c}"/>` + txt(51, 52, "half gone each step", 6, "i"));
  sim("topo-sort", "Topological Sort", "Order the tasks of a Directed Acyclic Graph (DAG) by DFS finishing times or by removing sources.",
    () => graph([[10, 28, "d"], [32, 12, "d"], [32, 44, "a"], [58, 28], [84, 16], [84, 42]],
      [[0, 1, "d", 1], [0, 2, "d", 1], [1, 3, 0, 1], [2, 3, 0, 1], [3, 4, 0, 1], [3, 5, 0, 1]]));
  sim("combinatorics", "Combinatorics", "Generate permutations (Johnson–Trotter, lexicographic) and subsets (binary counting, Gray code).",
    () => ["000", "001", "011", "010", "110", "111"].map((b, r) => cells(b.split(""), r < 3 ? 8 : 54, 6 + (r % 3) * 15, 11, 12, b.replace(/0/g, " ").replace(/1/g, "t"), 7)).join("") + `<path d="M46 28 h4" stroke="${COL.l}"/>`);
  sim("nim", "Nim", "Play one-pile and multi-pile Nim against the computer, and learn the binary digital-sum trick that always wins.",
    () => [[18, 4], [44, 2], [70, 3]].map(([x, k]) => Array.from({ length: k }, (_, j) => `<circle cx="${x}" cy="${46 - j * 10}" r="5" fill="${j === k - 1 && x === 44 ? COL.s : COL.c}"/>`).join("")).join("") + `<path d="M6 52 H90" stroke="${COL.l}" stroke-width="1.5"/>`);
  sim("tree-traversals", "Tree Traversals", "Preorder, inorder and postorder walks of a binary tree, plus height and leaf counting by recursion.",
    () => btree(["d", "dd", "dda.", ""], { dy: 16, y0: 10, r: 5, label: (d, i) => [["1"], ["2", "5"], ["3", "4", "6", ""]][d][i] }));
  sim("karatsuba-strassen", "Karatsuba & Strassen", "Multiply big numbers with 3 half-size products instead of 4, and matrices with 7 instead of 8.",
    () => grid(2, 2, 8, 10, 17, (i, j) => (i + j) % 2 ? "t" : "e") + txt(50, 30, "×", 12, "i") + grid(2, 2, 58, 10, 17, (i, j) => (i + j) % 2 ? "p" : "d") + txt(48, 53, "7 products, not 8", 6.5));
  sim("heap-lab", "Heap Lab", "Build a heap bottom-up, insert, delete the root, and run heapsort — tree and array views in sync.",
    () => btree(["s", "cb", "bbbb"], { dy: 11, y0: 7, r: 4 }) + cells(["", "", "", "", "", "", ""], 13, 40, 10, 10, "scbbbbb"));
  sim("search-trees", "Search Trees", "Binary Search Tree (BST) insertion, Adelson-Velsky–Landis (AVL) rotations and 2-3 tree splits, step by step.",
    () => btree(["s", "a.", "a...", ""], { x0: 0, x1: 44, dy: 14, y0: 10, r: 4.2 }) + `<path d="M44 28 h10" stroke="${COL.e}" stroke-width="2"/><path d="M56 28 l-4 -3 v6z" fill="${COL.e}"/>` + btree(["d", "dd", ""], { x0: 56, x1: 96, dy: 16, y0: 14, r: 4.2 }));
  sim("gaussian", "Gaussian Elimination", "Reduce a system of equations to upper-triangular form and back-substitute, with partial pivoting.",
    () => grid(4, 4, 22, 5, 11.5, (i, j) => (j < i ? "m" : i === j ? "e" : "t")) + `<rect x="70" y="5" width="11" height="45" rx="1" fill="${COL.d}" opacity=".85"/>`);
  sim("horner-binexp", "Horner & Binary Exponentiation", "Evaluate a polynomial with n multiplications, and compute aⁿ by scanning n's bits.",
    () => cells(["1", "1", "0", "1"], 10, 8, 14, 14, "ee e", 8) + txt(78, 19, "n=13", 7) + bars([1, 2, 4, 8], "tttt", 10, 66, 52, 26) + txt(80, 48, "a¹³", 9, "d"));
  sim("hashing", "Hashing Lab", "Open hashing with chains vs. closed hashing with linear probing; watch the load factor change everything.",
    () =>
      [0, 1, 2, 3, 4].map((r) => `<rect x="8" y="${6 + r * 9.6}" width="12" height="8.4" rx="1.5" fill="${COL.n}" stroke="${COL.l}" stroke-width=".8"/>`).join("") +
      [[0, 2], [2, 3], [3, 1]].map(([r, k]) => Array.from({ length: k }, (_, j) => `<line x1="${20 + j * 18}" y1="${10.2 + r * 9.6}" x2="${26 + j * 18}" y2="${10.2 + r * 9.6}" stroke="${COL.l}"/><rect x="${26 + j * 18}" y="${6.5 + r * 9.6}" width="12" height="7.4" rx="1.5" fill="${j === k - 1 && r === 2 ? COL.c : COL.t}"/>`).join("")).join(""));
  sim("b-tree", "B-Tree", "Insert keys into a B-tree and watch full nodes split and push a key upward — the index behind every database.",
    () => cells(["", ""], 36, 6, 12, 10, "ee") + [[6, "ttt"], [38, "tt"], [66, "ttd"]].map(([x, s]) => cells(Array(s.length).fill(""), x, 36, 8, 10, s)).join("") +
      [[42, 10], [48, 42], [54, 72]].map(([x1, x2]) => `<line x1="${x1}" y1="16" x2="${x2 + 6}" y2="36" stroke="${COL.l}" stroke-width="1.2"/>`).join(""));
  sim("dp-studio", "DP Studio", "DP tables filled cell by cell: coin-row, change-making, knapsack, binomial, Longest Common Subsequence (LCS) and edit distance.",
    () => grid(4, 7, 10, 5, 11, (i, j) => (i < 2 || (i === 2 && j < 4) ? "d" : i === 2 && j === 4 ? "e" : i === 1 && (j === 4 || j === 2) ? "t" : "")) + txt(48, 53, "", 6));
  sim("optimal-bst", "Optimal BST", "Build the cheapest binary search tree for known search probabilities with a diagonal-by-diagonal table.",
    () => { let t = ""; for (let i = 0; i < 5; i++) for (let j = i; j < 5; j++) t += `<rect x="${14 + j * 10}" y="${3 + i * 10}" width="9" height="9" rx="1" fill="${j - i < 2 ? COL.d : j - i === 2 ? COL.e : COL.n}" stroke="${COL.l}" stroke-width=".6"/>`; return t + btree(["p", "pp"], { x0: 70, x1: 96, dy: 12, y0: 18, r: 3.5 }); });
  sim("warshall-floyd", "Warshall & Floyd", "Transitive closure and all-pairs shortest paths: one matrix, updated once per intermediate vertex k.",
    () => grid(5, 5, 24, 2, 10.4, (i, j) => (i === 2 && j === 2 ? "e" : i === 2 || j === 2 ? "c" : i === 0 && j === 4 ? "s" : "")) + txt(84, 30, "k", 9, "e"));
  sim("greedy-graphs", "Greedy Graphs", "Prim and Kruskal build a Minimum Spanning Tree (MST); Dijkstra grows shortest paths. Union–find included.",
    () => graph([[12, 14, "d"], [40, 8, "d"], [70, 14, "d"], [18, 44, "d"], [50, 36, "d"], [84, 44, "a"]],
      [[0, 1, "d"], [1, 2, "d"], [0, 3, "d"], [1, 4, "d"], [2, 4], [3, 4], [4, 5, "a"], [2, 5]]));
  sim("huffman", "Huffman Coding", "Merge the two rarest symbols again and again to build an optimal prefix-free code.",
    () => btree(["e", "dt", "..dd"], { dy: 16, y0: 8, r: 4.5 }) + txt(32, 17, "0", 6.5, "e") + txt(64, 17, "1", 6.5, "e") + txt(57, 33, "0", 6.5, "e") + txt(79, 33, "1", 6.5, "e") + txt(28, 38, "A", 7));
  sim("greedy-choices", "Greedy Choices", "Change-making, activity selection and fractional knapsack — where greedy is optimal, and where it fails.",
    () => [[6, 30, 0, "d"], [20, 44, 1, "m"], [36, 58, 0, "d"], [48, 76, 1, "m"], [62, 88, 0, "d"], [8, 50, 2, "m"]].map(([a, b, r, k]) => `<rect x="${a}" y="${10 + r * 14}" width="${b - a}" height="9" rx="4.5" fill="${col(k)}"/>`).join("") + `<path d="M4 50 H92" stroke="${COL.l}"/>`);
  sim("simplex", "Simplex Method", "Walk from corner to corner of the feasible region, improving the objective with every pivot.",
    () => `<path d="M10 50 H90 M10 50 V4" stroke="${COL.l}" fill="none"/><path d="M10 50 L10 22 L34 12 L66 22 L80 50 Z" fill="${COL.t}" fill-opacity=".15" stroke="${COL.t}" stroke-width="1.5"/>` +
      `<path d="M12 48 L12 24 L33 14 L64 22" stroke="${COL.e}" stroke-width="2" fill="none" stroke-dasharray="3 2"/>` + [[10, 50], [10, 22], [34, 12], [80, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${COL.i}"/>`).join("") + `<circle cx="66" cy="22" r="3.6" fill="${COL.d}"/>`);
  sim("max-flow", "Maximum Flow", "Augmenting paths through a network, residual edges, and the minimum cut that proves optimality.",
    () => graph([[8, 28, "e"], [36, 10], [36, 46], [64, 10], [64, 46], [90, 28, "d"]],
      [[0, 1, "t", 1], [0, 2, "t", 1], [1, 3, "t", 1], [2, 4, 0, 1], [2, 3, "t", 1], [3, 5, "t", 1], [4, 5, 0, 1]]) + `<path d="M50 2 V54" stroke="${COL.s}" stroke-dasharray="3 2" stroke-width="1.4"/>`);
  sim("bipartite-matching", "Bipartite Matching", "Grow a maximum matching with augmenting paths that alternate between free and matched edges.",
    () => graph([[20, 8, "t"], [20, 28, "t"], [20, 48, "t"], [76, 8, "p"], [76, 28, "p"], [76, 48, "p"]],
      [[0, 3, "d"], [0, 4], [1, 3], [1, 5, "d"], [2, 4, "d"], [2, 5]]));
  sim("stable-marriage", "Stable Marriage", "Gale–Shapley proposals round by round until no pair would rather run off together.",
    () => graph([[18, 10, "t"], [18, 28, "t"], [18, 46, "t"], [78, 10, "s"], [78, 28, "s"], [78, 46, "s"]],
      [[0, 4, "d"], [1, 3, "d"], [2, 5, "d"], [1, 4]]));
  sim("decision-trees", "Decision Trees", "Every comparison sort is a tree of questions — count its leaves to get the ⌈log₂ n!⌉ lower bound.",
    () => btree(["c", "cc", "dddd"], { dy: 18, y0: 8, r: 4.5 }).replace(/<circle cx="48" cy="8" r="4.5"[^>]*\/>/, `<rect x="43" y="3" width="10" height="10" transform="rotate(45 48 8)" fill="${COL.c}"/>`));
  sim("p-np", "P vs NP", "Brute-force a satisfiability formula vs. verify a certificate instantly — and see how reductions connect problems.",
    () => `<ellipse cx="48" cy="28" rx="42" ry="24" fill="${COL.t}" fill-opacity=".14" stroke="${COL.t}" stroke-width="1.4"/><ellipse cx="34" cy="30" rx="18" ry="13" fill="${COL.d}" fill-opacity=".25" stroke="${COL.d}" stroke-width="1.4"/><ellipse cx="74" cy="28" rx="11" ry="14" fill="${COL.s}" fill-opacity=".22" stroke="${COL.s}" stroke-width="1.4"/>` + txt(34, 33, "P", 9, "d") + txt(74, 31, "hard", 6.5, "s") + txt(52, 12, "NP", 7, "t"));
  sim("backtracking", "Backtracking", "n-Queens, subset-sum and Hamiltonian circuits: build a partial solution, and back up the moment it can't work.",
    () => grid(4, 4, 26, 3, 12.5, (i, j) => ((i + j) % 2 ? "m" : "")) + [[0, 1], [1, 3], [2, 0], [3, 2]].map(([r, c]) => `<circle cx="${26 + c * 12.5 + 5.7}" cy="${3 + r * 12.5 + 5.7}" r="4" fill="${COL.e}"/>`).join(""));
  sim("branch-and-bound", "Branch-and-Bound", "Explore the most promising node first and prune every branch whose bound can't beat the best so far.",
    () => btree(["t", "tm", "dt..", ""], { dy: 16, y0: 8, r: 4.5 }) + `<path d="M66 18 l8 8 M74 18 l-8 8" stroke="${COL.s}" stroke-width="2"/>`);
  sim("tsp-approx", "TSP Approximation", "Nearest-neighbor and twice-around-the-tree tours compared with the optimum.",
    () => `<path d="M14 40 L30 12 L58 8 L84 22 L74 48 L40 46 Z" fill="none" stroke="${COL.e}" stroke-width="1.8"/><path d="M14 40 L40 46 M30 12 L40 46 M58 8 L84 22 M40 46 L74 48 M58 8 L40 46" stroke="${COL.t}" stroke-dasharray="3 2" stroke-width="1.2"/>` +
      [[14, 40], [30, 12], [58, 8], [84, 22], [74, 48], [40, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${COL.i}"/>`).join(""));
  sim("bin-packing", "Bin Packing", "First-fit and first-fit-decreasing pack items into as few bins as possible — with a proven worst case.",
    () => [10, 34, 58].map((x, b) => `<path d="M${x} 8 V50 H${x + 20} V8" fill="none" stroke="${COL.l}" stroke-width="1.5"/>` + [[16, 12, 0], [14, 8, 10], [10, 18, 0]][b].reduce((acc, h, k, arr) => { const y = 50 - arr.slice(0, k).reduce((s, v) => s + v, 0) - h; return h ? acc + `<rect x="${x + 2}" y="${y + 0.5}" width="16" height="${h - 1}" rx="1.5" fill="${["t", "c", "p"][(b + k) % 3] ? col(["t", "c", "p"][(b + k) % 3]) : ""}"/>` : acc; }, "")).join("") + `<rect x="82" y="30" width="10" height="20" rx="1.5" fill="${COL.s}"/>`);
  sim("root-finding", "Root Finding", "Bisection, false position and Newton's method closing in on where a curve crosses zero.",
    () => `<path d="M6 28 H92" stroke="${COL.l}"/><path d="M8 48 C30 44 40 30 52 24 S80 8 90 6" stroke="${COL.t}" stroke-width="2" fill="none"/>` +
      `<path d="M20 20 V36 M76 20 V36" stroke="${COL.e}" stroke-width="1.6"/><path d="M48 22 V34" stroke="${COL.c}" stroke-width="1.6"/><circle cx="47" cy="28" r="2.6" fill="${COL.d}"/>`);
  sim("union-find", "Union–Find", "Disjoint sets with union by rank and path compression — nearly constant time per operation.",
    () => graph([[20, 10, "e"], [10, 30], [30, 30], [30, 48], [66, 10, "e"], [56, 32], [76, 32], [86, 48]],
      [[1, 0, 0, 1], [2, 0, 0, 1], [3, 2, 0, 1], [5, 4, 0, 1], [6, 4, 0, 1], [7, 6, 0, 1]], 4.2));
  sim("segment-tree", "Segment Tree", "Range-sum and range-minimum queries in O(log n): each node owns a segment of the array.",
    () => [[0, 1], [1, 2], [2, 4]].map(([d, k]) => Array.from({ length: k }, (_, i) => `<rect x="${8 + i * (80 / k) + 1}" y="${6 + d * 13}" width="${80 / k - 2}" height="9" rx="2" fill="${(d === 1 && i === 0) || (d === 2 && i === 2) ? COL.e : COL.t}" opacity="${d === 0 ? 0.6 : 0.85}"/>`).join("")).join("") + cells(Array(8).fill(""), 8, 45, 10, 8, "eeee cc "));
  sim("trie", "Trie", "Insert words letter by letter and answer prefix queries — the structure behind autocomplete.",
    () => graph([[48, 6, "e"], [26, 22, "t"], [70, 22, "t"], [16, 38, "t"], [36, 38, "d"], [70, 38, "d"], [16, 52, "d"]], [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [3, 6]], 4) +
      [[26, 22, "c"], [70, 22, "t"], [16, 38, "a"], [36, 38, "r"], [70, 38, "o"]].map(([x, y, s]) => txt(x, y + 2.4, s, 6, "#0d1117")).join(""));
  sim("shortest-paths-plus", "Shortest Paths Plus", "Bellman–Ford handles negative edges; A* uses a heuristic to head straight for the goal.",
    () => grid(4, 8, 8, 4, 10, (i, j) => ((j === 3 && i < 3) ? "m" : (i === 3 && j < 7) || (j === 7 && i > 0) ? "" : "")) +
      `<path d="M13 9 V39 H83 V9" stroke="${COL.e}" stroke-width="2.2" fill="none"/><circle cx="13" cy="9" r="3" fill="${COL.d}"/><circle cx="83" cy="9" r="3" fill="${COL.s}"/>`);
  sim("scc", "Strongly Connected Components", "Kosaraju's two passes and Tarjan's low-links find the Strongly Connected Components (SCCs) of a directed graph.",
    () => `<ellipse cx="26" cy="28" rx="20" ry="22" fill="${COL.t}" fill-opacity=".14"/><ellipse cx="72" cy="28" rx="20" ry="22" fill="${COL.p}" fill-opacity=".16"/>` +
      graph([[18, 14, "t"], [34, 28, "t"], [18, 42, "t"], [64, 14, "p"], [80, 28, "p"], [64, 42, "p"]],
        [[0, 1, 0, 1], [1, 2, 0, 1], [2, 0, 0, 1], [1, 3, "e", 1], [3, 4, 0, 1], [4, 5, 0, 1], [5, 3, 0, 1]], 4.2));
  sim("patterns", "Interview Patterns", "Two pointers, sliding window, monotonic stack, prefix sums and binary search on the answer — animated.",
    () => cells([2, 7, 1, 8, 2, 8, 1, 8], 4, 18, 11, 13, "  ttt   ", 6.5) + `<rect x="25" y="15" width="34" height="19" rx="3" fill="none" stroke="${COL.e}" stroke-width="1.8"/>` +
      `<path d="M26 42 l-3 5 h6z M58 42 l-3 5 h6z" fill="${COL.e}"/>` + txt(26, 54, "L", 6, "e") + txt(58, 54, "R", 6, "e"));
  sim("amortized", "Amortized Analysis", "Append to a doubling array and track the potential: rare expensive copies, O(1) per append on average.",
    () => [1, 2, 4, 8].map((k, r) => cells(Array(k).fill(""), 6, 4 + r * 12.5, 10, 9, (r === 3 ? "ddddd" : "dddddddd").slice(0, k).padEnd(k, " "))).join(""));
  sim("bloom-filter", "Bloom Filter", "Hash each key to a few bits: never a false 'no', occasionally a false 'yes' — in a tiny amount of memory.",
    () => cells(Array(10).fill(""), 3, 38, 9, 10, " e  e   e ", 6) + `<circle cx="42" cy="10" r="6" fill="${COL.t}"/>` +
      [7.5, 34.5, 70.5].map((x) => `<path d="M42 16 L${x} 36" stroke="${COL.e}" stroke-width="1.3"/>`).join(""));

  Hub.SIMS = S;
  Hub.simGlyph = function (id) {
    const s = S[id];
    return `<svg viewBox="0 0 96 56" class="glyph" role="img" aria-label="${s ? s.title : id} icon">${s ? s.glyph() : ""}</svg>`;
  };

  /* ---------- progress (Arena localStorage) ---------- */
  Hub.progress = function () {
    let data = null;
    try { data = JSON.parse(localStorage.getItem("forge-arena-v1") || "null"); } catch (e) { data = null; }
    const probs = data && typeof data === "object" && data.problems && typeof data.problems === "object" ? data.problems : {};
    const out = { solved: new Set(), attempted: new Set(), modes: { blocks: 0, pseudo: 0, js: 0, python: 0 }, hints: 0, revealed: 0, raw: probs, last: null };
    for (const id in probs) {
      const p = probs[id] || {};
      const s = (p.solved && typeof p.solved === "object") ? p.solved : {};
      const any = p.status === "solved" || Object.keys(s).some((k) => s[k]);
      if (any) out.solved.add(id);
      else if (p.status === "attempted" || p.attempts > 0) out.attempted.add(id);
      for (const m in out.modes) if (s[m]) out.modes[m]++;
      out.hints += +p.hintsUsed || 0;
      if (p.revealed) out.revealed++;
      const t = Date.parse(p.firstSolved || "") || (typeof p.firstSolved === "number" ? p.firstSolved : 0);
      if (any && t && (!out.last || t > out.last.t)) out.last = { id, t };
    }
    return out;
  };

  /* ---------- problem bank loader ---------- */
  let loading = null;
  Hub.loadProblems = function () {
    if (loading) return loading;
    const base = (window.Forge ? Forge.root : "") + "arena/problems/";
    const load = (src) => new Promise((res) => {
      const s = document.createElement("script");
      s.src = base + src; s.async = false;
      s.onload = () => res(true); s.onerror = () => res(false);
      document.head.appendChild(s);
    });
    loading = (async () => {
      try {
        if (!window.ForgeProblems && !(await load("registry.js"))) return null;
        if (!window.FORGE_PACKS) await load("index.js");
        const packs = Array.isArray(window.FORGE_PACKS) && window.FORGE_PACKS.length ? window.FORGE_PACKS : ["exemplars.js"];
        await Promise.all(packs.map((p) => load(typeof p === "string" ? p : p.file)));
        return window.ForgeProblems || null;
      } catch (e) { return window.ForgeProblems || null; }
    })();
    return loading;
  };

  /** Count problems per chapter / level, and how many the learner solved. */
  Hub.tally = function (FP, prog) {
    const byCh = {}, byLevel = {};
    let total = 0, solved = 0;
    const list = FP && FP.list ? FP.list : [];
    list.forEach((p) => {
      const s = prog.solved.has(p.id) ? 1 : 0;
      total++; solved += s;
      const c = (byCh[p.chapter] = byCh[p.chapter] || { total: 0, solved: 0 }); c.total++; c.solved += s;
      const l = (byLevel[p.level] = byLevel[p.level] || { total: 0, solved: 0 }); l.total++; l.solved += s;
    });
    return { byCh, byLevel, total, solved };
  };

  window.ForgeHub = Hub;
})();
