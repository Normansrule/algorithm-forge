/* Algorithm Atlas — development fixture.
   atlas.js loads this file ONLY when docs/atlas/atlas-data.js is missing or failed to define self.FORGE_ATLAS,
   so the page always renders. It holds three small families in the same schema as atlas-data.js and
   deliberately leaves some optional fields out (a missing year, no frontier rung, unparseable bounds)
   to keep the page honest about partial data. The real, fully cited data lives in atlas-data.js. */
self.FORGE_ATLAS_FIXTURE = {
  updated: "fixture",
  stages: [
    { id: "first", label: "First idea" },
    { id: "classic", label: "Classic" },
    { id: "advanced", label: "Advanced" },
    { id: "production", label: "In production" },
    { id: "frontier", label: "Research frontier" }
  ],
  families: [
    {
      id: "sorting", title: "Sorting", glyph: "sort",
      question: "How do we put n items in order with as little work as possible?",
      blurb: "Sorting is the warm-up for almost every other algorithm: searching, deduplicating and merging all get easier once data is in order.",
      rungs: [
        {
          name: "Selection sort", year: null, stage: "first",
          time: "Θ(n²)", space: "Θ(1)",
          idea: "Find the smallest remaining item and swap it to the front; repeat for the rest.",
          limit: "It always makes about n²/2 comparisons, even when the input is already sorted.",
          links: { lesson: "lessons/03-brute-force/README.md", sim: "sims/sorting-studio.html", arena: ["selection-sort"], book: "Levitin §3.1" },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., §3.1, 2012.", url: "" }]
        },
        {
          name: "Merge sort", year: 1945, stage: "classic",
          time: "Θ(n log n)", space: "Θ(n)",
          idea: "Split the array in half, sort each half, then merge the two sorted halves in one pass.",
          limit: "It needs a second array as large as the input, which hurts cache use and memory.",
          usedIn: "External sorting of files that do not fit in memory.",
          links: { lesson: "lessons/05-divide-and-conquer/README.md", sim: "sims/sorting-studio.html", arena: ["merge-sort"], book: "Levitin §5.1" },
          refs: [{ text: "D. E. Knuth, The Art of Computer Programming, Vol. 3: Sorting and Searching, 2nd ed., §5.2.4, 1998 (credits J. von Neumann, 1945).", url: "" }]
        },
        {
          name: "Quicksort", year: 1962, stage: "advanced",
          time: "Θ(n log n) expected, Θ(n²) worst", space: "Θ(log n) expected",
          idea: "Partition around a pivot so smaller items go left and larger go right, then sort each side in place.",
          limit: "Bad pivots on adversarial input fall back to quadratic time.",
          links: { lesson: "lessons/05-divide-and-conquer/README.md", sim: "sims/sorting-studio.html", arena: ["quicksort-hoare"], book: "Levitin §5.2" },
          refs: [{ text: "C. A. R. Hoare, “Quicksort,” The Computer Journal 5(1):10–16, 1962.", url: "" }]
        },
        {
          name: "Introsort", year: 1997, stage: "advanced",
          time: "O(n log n) worst", space: "O(log n)",
          idea: "Run quicksort but watch the recursion depth; if it grows too deep, switch to heapsort for that part.",
          limit: "It ignores runs that are already sorted in real data.",
          usedIn: "std::sort in common C++ standard libraries.",
          links: { arena: [] },
          refs: [{ text: "D. R. Musser, “Introspective Sorting and Selection Algorithms,” Software: Practice and Experience 27(8):983–993, 1997.", url: "" }]
        },
        {
          name: "Pattern-defeating quicksort (pdqsort)", year: 2021, stage: "production",
          time: "O(n log n) worst", space: "O(log n)",
          idea: "Introsort plus detectors for common patterns (sorted, reversed, many equal keys) that finish those cases in linear time.",
          limit: "Comparison sorts cannot beat about n log₂ n comparisons; the remaining gains are constant factors.",
          usedIn: "Unstable sorts in the Rust and Go standard libraries.",
          refs: [{ text: "O. R. L. Peters, “Pattern-defeating Quicksort,” arXiv:2106.05123, 2021.", url: "https://arxiv.org/abs/2106.05123" }]
        },
        {
          name: "Machine-discovered sorting kernels", year: 2023, stage: "frontier",
          time: "fixed small sizes (3 to 5 items)",
          idea: "Reinforcement learning searched assembly programs and found shorter instruction sequences for sorting tiny arrays.",
          limit: "The wins are for small fixed sizes inside a larger sort, not a new asymptotic bound.",
          usedIn: "Merged into the LLVM libc++ sort routines.",
          refs: [{ text: "D. J. Mankowitz et al., “Faster sorting algorithms discovered using deep reinforcement learning,” Nature 618:257–263, 2023.", url: "" }]
        }
      ]
    },
    {
      id: "shortest-paths", title: "Shortest paths", glyph: "graph",
      question: "What is the cheapest route from one source to every other vertex?",
      blurb: "Route planners, network routers and game characters all ask this question millions of times a second.",
      rungs: [
        {
          name: "Breadth-First Search (BFS)", year: 1959, stage: "first",
          time: "Θ(V + E)", space: "Θ(V)",
          idea: "Explore the graph in rings: every vertex one edge away, then two, and so on.",
          limit: "It only measures hops, so it cannot handle edges with different weights.",
          links: { lesson: "lessons/03-brute-force/README.md", sim: "sims/graph-traversal.html", arena: ["bfs-order", "grid-shortest-path-bfs"], book: "Levitin §3.5" },
          refs: [{ text: "E. F. Moore, “The shortest path through a maze,” Proc. International Symposium on the Theory of Switching, 1959.", url: "" }]
        },
        {
          name: "Dijkstra's algorithm (array)", year: 1959, stage: "classic",
          time: "Θ(V²)", space: "Θ(V)",
          idea: "Repeatedly settle the closest unsettled vertex and relax its outgoing edges.",
          limit: "Scanning every vertex to find the closest one is wasteful on sparse graphs.",
          links: { lesson: "lessons/09-greedy/README.md", sim: "sims/greedy-graphs.html", arena: ["dijkstra-distances", "dijkstra-path"], book: "Levitin §9.3" },
          refs: [{ text: "E. W. Dijkstra, “A note on two problems in connexion with graphs,” Numerische Mathematik 1:269–271, 1959.", url: "" }]
        },
        {
          name: "Dijkstra with a binary heap", year: 1977, stage: "advanced",
          time: "O((V + E) log V)", space: "Θ(V)",
          idea: "Keep tentative distances in a priority queue so the closest vertex comes out in logarithmic time.",
          limit: "Every edge relaxation may cost a log V heap update.",
          usedIn: "The default in most graph libraries.",
          links: { sim: "sims/heap-lab.html", arena: ["network-delay-heap"] },
          refs: [{ text: "D. B. Johnson, “Efficient algorithms for shortest paths in sparse networks,” Journal of the ACM 24(1):1–13, 1977.", url: "" }]
        },
        {
          name: "Dijkstra with a Fibonacci heap", year: 1987, stage: "advanced",
          time: "O(E + V log V)", space: "Θ(V)",
          idea: "A heap with constant amortized decrease-key makes edge relaxations cheap.",
          limit: "Sorting the vertices by distance seemed to force the V log V term.",
          refs: [{ text: "M. L. Fredman and R. E. Tarjan, “Fibonacci heaps and their uses in improved network optimization algorithms,” Journal of the ACM 34(3):596–615, 1987.", url: "" }]
        },
        {
          name: "Contraction hierarchies", year: 2008, stage: "production",
          time: "preprocessing, then very fast queries",
          idea: "Precompute shortcut edges by contracting unimportant vertices, then search upward from both ends.",
          limit: "Needs a static graph and heavy preprocessing.",
          usedIn: "Open-source road routing engines.",
          refs: [{ text: "R. Geisberger, P. Sanders, D. Schultes and D. Delling, “Contraction Hierarchies: Faster and Simpler Hierarchical Routing in Road Networks,” WEA 2008, LNCS 5038.", url: "" }]
        },
        {
          name: "Breaking the sorting barrier", year: 2025, stage: "frontier",
          time: "O(m log^{2/3} n)", space: "O(m)",
          idea: "Mix Dijkstra-style settling with Bellman–Ford-style relaxation rounds so the frontier never has to be fully sorted.",
          limit: "The constants are large; it is a theoretical milestone, not yet a library default.",
          refs: [{ text: "R. Duan, J. Mao, X. Mao, X. Shu and L. Yin, “Breaking the Sorting Barrier for Directed Single-Source Shortest Paths,” STOC 2025 (deterministic, comparison-addition model).", url: "" }]
        }
      ]
    },
    {
      id: "string-matching", title: "String matching", glyph: "string",
      question: "Where does a pattern of length m occur inside a text of length n?",
      blurb: "Every find bar, grep command and virus scanner runs one of these.",
      rungs: [
        {
          name: "Brute-force matching", year: null, stage: "first",
          time: "Θ(nm) worst", space: "Θ(1)",
          idea: "Line the pattern up at every position and compare character by character.",
          limit: "After a mismatch it forgets everything it just learned about the text.",
          links: { lesson: "lessons/03-brute-force/README.md", sim: "sims/string-match.html", arena: ["brute-force-string-match"], book: "Levitin §3.2" }
        },
        {
          name: "Knuth–Morris–Pratt (KMP)", year: 1977, stage: "classic",
          time: "Θ(n + m)", space: "Θ(m)",
          idea: "A prefix table tells you how far the pattern can safely slide after a mismatch, so the text pointer never moves back.",
          limit: "It still looks at every text character at least once.",
          links: { lesson: "lessons/07-space-time-tradeoffs/README.md", sim: "sims/string-match.html", arena: ["kmp-prefix-table", "kmp-search"] },
          refs: [{ text: "D. E. Knuth, J. H. Morris and V. R. Pratt, “Fast pattern matching in strings,” SIAM Journal on Computing 6(2):323–350, 1977.", url: "" }]
        },
        {
          name: "Boyer–Moore", year: 1977, stage: "advanced",
          time: "O(n / m) best, O(nm) worst", space: "Θ(m + σ)",
          idea: "Compare from the right end of the pattern; a mismatched character often lets you skip a whole pattern length.",
          limit: "The worst case is still slow without extra rules, and the tables cost memory.",
          links: { lesson: "lessons/07-space-time-tradeoffs/README.md", sim: "sims/string-match.html", arena: ["horspool-search"], book: "Levitin §7.2" },
          refs: [{ text: "R. S. Boyer and J. S. Moore, “A fast string searching algorithm,” Communications of the ACM 20(10):762–772, 1977.", url: "" }]
        },
        {
          name: "Two-way matching", year: 1991, stage: "production",
          time: "O(n + m)", space: "O(1)",
          idea: "Split the pattern at a critical factorization and scan the two halves in opposite directions.",
          limit: "It answers a single pattern; many patterns at once need an automaton.",
          usedIn: "Substring search in the GNU C library.",
          refs: [{ text: "M. Crochemore and D. Perrin, “Two-way string-matching,” Journal of the ACM 38(3):651–675, 1991.", url: "" }]
        }
      ]
    }
  ]
};
