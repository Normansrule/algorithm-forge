/* Problem registry — every file in arena/problems/ calls ForgeProblems.add({...}).
   Loaded by the Arena pages, the grading Web Worker, and tools/validate-problems.mjs. */
(function (root) {
  "use strict";
  const list = [];
  const byId = {};
  const LEVELS = [
    { n: 0, name: "Foundations", blurb: "Loops, arrays, counting — your first algorithms (Ch 1–2)." },
    { n: 1, name: "Brute Force & Analysis", blurb: "Straightforward solutions and how to count their cost (Ch 2–3)." },
    { n: 2, name: "Decrease & Divide", blurb: "Shrink the problem, split the problem (Ch 4–5)." },
    { n: 3, name: "Transform & Space-Time", blurb: "Presort, heaps, hashing, smarter string search (Ch 6–7)." },
    { n: 4, name: "Dynamic Programming, Greedy & Iterative Improvement", blurb: "Tables, greedy choices, flows and matchings (Ch 8–10)." },
    { n: 5, name: "Hard Problems & Senior Patterns", blurb: "Backtracking, approximation, Nondeterministic Polynomial (NP)-hard problems, and the patterns senior engineers reach for (Ch 11–17)." },
    { n: 6, name: "Expert: Algorithm Designer", blurb: "The hardest set: bitmask Dynamic Programming, linear-time string algorithms, graph cut structure, branch-and-bound, cache design (Ch 12–17)." },
  ];
  const CHAPTERS = {
    1: "Introduction", 2: "Analysis Framework", 3: "Brute Force & Exhaustive Search", 4: "Decrease-and-Conquer",
    5: "Divide-and-Conquer", 6: "Transform-and-Conquer", 7: "Space-Time Tradeoffs", 8: "Dynamic Programming",
    9: "Greedy Technique", 10: "Iterative Improvement", 11: "Limitations of Algorithm Power", 12: "Coping with Limitations",
    13: "Advanced Data Structures", 14: "Advanced Graphs", 15: "DP & Interview Patterns", 16: "Randomized, Amortized & Streaming", 17: "Senior Engineer Playbook",
  };
  root.ForgeProblems = {
    LEVELS, CHAPTERS, list,
    add(p) {
      if (!p || !p.id) throw new Error("problem needs an id");
      if (byId[p.id]) throw new Error("duplicate problem id " + p.id);
      p.order = p.order != null ? p.order : list.length;
      list.push(p);
      byId[p.id] = p;
    },
    get(id) { return byId[id]; },
    sorted() { return list.slice().sort((a, b) => a.level - b.level || (a.difficulty || 1) - (b.difficulty || 1) || a.order - b.order); },
  };
})(typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this);
