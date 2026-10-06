/* Arena problem-pack manifest. The Arena pages and the grading worker load registry.js, then this file,
   then every pack listed here (a missing or broken pack is skipped, never fatal).
   tools/validate-problems.mjs ignores this file. */
self.FORGE_PACKS = ["exemplars.js", "foundations.js", "brute-force.js",
  "decrease-divide.js", "transform-space.js", "dynamic-programming.js", "greedy-iterative.js", "hard-problems.js",
  "beyond-structures-graphs.js", "beyond-patterns.js", "expert.js", "frontier.js", "systems-frontier.js"];
