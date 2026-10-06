/* Algorithm Atlas — evolution ladders from the classic algorithm to the cutting edge. Every claim cited.
   Data for docs/atlas.html (rendered by docs/atlas/atlas.js). Schema: see the header of atlas.js.
   Rules followed here:
   - Each rung's time bound states its model when it matters (comparison-addition, expected, amortized,
     randomized, deterministic, m^{1+o(1)}, ...), and matches the cited source.
   - A reference carries a URL only when the page (DOI, arXiv, official site) was checked to exist and to match.
   - "year" is the year of the FIRST publication of the idea: conference paper, technical report, preprint or released
     code, whichever came first (later journal versions are listed in refs). null when it has no clear origin.
   - Within a family, rungs are ordered so that their stages never go backwards (first → classic → advanced →
     production → frontier); years may go backwards when an older idea reached a later stage.
   Last verified: October 2026. */
self.FORGE_ATLAS = {
  updated: "2026-10",
  stages: [
    { id: "first", label: "First idea" },
    { id: "classic", label: "Classic" },
    { id: "advanced", label: "Advanced" },
    { id: "production", label: "In production" },
    { id: "frontier", label: "Research frontier" }
  ],
  families: [
    /* ------------------------------------------------------------------ 1 */
    {
      id: "searching-sorted", title: "Searching a sorted collection", glyph: "search",
      question: "Where is key K in a sorted collection, and how few probes do we need to find it?",
      blurb: "Every database index, file system and autocomplete box answers this question millions of times a second. The ladder shows how using more about the data, and about the memory hierarchy, beats plain halving.",
      rungs: [
        {
          name: "Sequential search", year: null, stage: "first",
          time: "Θ(n) worst case", space: "Θ(1)",
          idea: "Look at the items one by one until you meet K or run out.",
          limit: "It ignores the fact that the data is sorted: a million items can cost a million comparisons.",
          links: { lesson: "lessons/03-brute-force/README.md", arena: ["sequential-search-sentinel"], book: "Levitin §3.2" },
          refs: [{ text: "D. E. Knuth, The Art of Computer Programming, Vol. 3: Sorting and Searching, 2nd ed., Addison-Wesley, 1998, §6.1.", url: "" }]
        },
        {
          name: "Binary search", year: 1946, stage: "classic",
          time: "Θ(log n)", space: "Θ(1)",
          idea: "Compare K with the middle item and throw away the half that cannot contain it.",
          limit: "It never looks at how big the keys are, only at their order, and on disk every probe can be a slow random read.",
          usedIn: "Standard library calls such as C++ lower_bound, Java Arrays.binarySearch and Python bisect.",
          links: { lesson: "lessons/04-decrease-and-conquer/README.md", sim: "sims/search-lab.html", arena: ["binary-search", "binary-search-first"], book: "Levitin §4.4" },
          refs: [{ text: "D. E. Knuth, The Art of Computer Programming, Vol. 3, 2nd ed., 1998, §6.2.1 (history: first described in print by J. Mauchly, 1946).", url: "" }]
        },
        {
          name: "Interpolation search", year: 1957, stage: "advanced",
          time: "Θ(log log n) expected", space: "Θ(1)",
          model: "Keys drawn independently and uniformly at random; the worst case is Θ(n).",
          idea: "Guess where K should be from its value, like opening a phone book near the back for a name starting with W, then repeat on the smaller range.",
          limit: "Skewed key distributions make the guesses bad, and the worst case falls back to linear time.",
          links: { lesson: "lessons/04-decrease-and-conquer/README.md", sim: "sims/search-lab.html", arena: ["interpolation-search"], book: "Levitin §4.5" },
          refs: [
            { text: "W. W. Peterson, “Addressing for random-access storage,” IBM Journal of Research and Development 1(2), 1957 (first description of interpolation search).", url: "" },
            { text: "Y. Perl, A. Itai and H. Avni, “Interpolation search—a log log N search,” Communications of the ACM 21(7), 1978 (the Θ(log log n) expected-time analysis).", url: "" }
          ]
        },
        {
          name: "Exponential (galloping) search", year: 1976, stage: "advanced",
          time: "O(log k) where k is the position of K", space: "Θ(1)",
          idea: "Probe positions 1, 2, 4, 8, … until you pass K, then binary-search inside the last gap. The cost depends on where K is, not on n.",
          limit: "Still one probe at a time in Random-Access Memory (RAM); it does not help when the data lives on disk.",
          usedIn: "The “galloping mode” that Timsort uses when one run wins many merge steps in a row.",
          links: { lesson: "lessons/04-decrease-and-conquer/README.md" },
          refs: [
            { text: "J. L. Bentley and A. C.-C. Yao, “An almost optimal algorithm for unbounded searching,” Information Processing Letters 5, 1976, pp. 82–87.", url: "" },
            { text: "T. Peters, “listsort.txt” (Timsort design notes, galloping mode), CPython source.", url: "https://github.com/python/cpython/blob/main/Objects/listsort.txt" }
          ]
        },
        {
          name: "B-trees in databases", year: 1972, stage: "production",
          time: "Θ(log_B n) block reads", space: "Θ(n)",
          model: "External-memory model: a block holds B keys and reading a block is the unit of cost.",
          idea: "Make each node one disk block holding hundreds of sorted keys, so the tree is only three or four levels deep even for billions of keys.",
          limit: "Every lookup still walks a fixed comparison path; it does not exploit regularities in the key values.",
          usedIn: "The default index of relational databases (PostgreSQL's default index type is a B-tree) and many file systems.",
          links: { lesson: "lessons/07-space-time-tradeoffs/README.md", sim: "sims/b-tree.html", book: "Levitin §7.4" },
          refs: [
            { text: "R. Bayer and E. McCreight, “Organization and maintenance of large ordered indexes,” Acta Informatica 1(3), 1972.", url: "" },
            { text: "D. Comer, “The ubiquitous B-tree,” ACM Computing Surveys 11(2), 1979.", url: "" }
          ]
        },
        {
          name: "Learned index", year: 2017, stage: "frontier",
          time: "Predict, then search a small error window", space: "Often far smaller than a B-tree",
          model: "Empirical result; the original paper gives no worst-case guarantee.",
          idea: "A sorted array's position-of-key function is a cumulative distribution. Train a small model (a hierarchy of tiny models) to predict the position, then fix the guess with a short local search.",
          limit: "Without guarantees, an unlucky key distribution or many inserts can make the model's error window large.",
          usedIn: "Research systems; the paper reports up to 70% faster lookups than cache-optimized B-trees with an order of magnitude less memory on real datasets.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "T. Kraska, A. Beutel, E. H. Chi, J. Dean and N. Polyzotis, “The Case for Learned Index Structures,” arXiv:1712.01208, 2017; SIGMOD 2018.", url: "https://research.google/pubs/the-case-for-learned-index-structures/" }]
        },
        {
          name: "PGM-index (learned, with guarantees)", year: 2020, stage: "frontier",
          time: "O(log_B n) block reads per query (static case)", space: "Depends on how linear the key distribution is",
          model: "External-memory model; a chosen error bound ε fixes the size of each local search.",
          idea: "Cover the sorted keys with the fewest straight-line segments whose prediction error is at most ε, then index the segments recursively the same way.",
          limit: "Gains shrink when keys are irregular; updates need extra machinery.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "P. Ferragina and G. Vinciguerra, “The PGM-index: a fully-dynamic compressed learned index with provable worst-case bounds,” Proceedings of the VLDB Endowment 13(8), 2020.", url: "https://pgm.di.unipi.it/" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 2 */
    {
      id: "ordered-dictionaries", title: "Ordered dictionaries (sorted sets that change)", glyph: "tree",
      question: "How do we keep a set of keys in sorted order while keys are inserted and deleted all the time?",
      blurb: "Leaderboards, in-memory database tables and timers all need a sorted set that changes. Each rung trades simplicity, worst-case guarantees and cache or disk friendliness differently.",
      rungs: [
        {
          name: "Sorted array with insertion", year: null, stage: "first",
          time: "Θ(log n) search, Θ(n) insert or delete", space: "Θ(n)",
          idea: "Keep the array sorted; binary-search to find a key, and shift everything after it to insert or delete.",
          limit: "Each update moves up to n items, so a stream of inserts costs Θ(n²) in total.",
          links: { lesson: "lessons/04-decrease-and-conquer/README.md", arena: ["binary-search", "insertion-sort"] },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., Pearson, 2012, §4.1 and §4.4.", url: "" }]
        },
        {
          name: "Binary search tree (BST)", year: 1962, stage: "classic",
          time: "Θ(log n) average, Θ(n) worst case per operation", space: "Θ(n)",
          idea: "Store keys in a tree where everything left of a node is smaller and everything right is larger; search, insert and delete each follow one root-to-leaf path.",
          limit: "Sorted insertions build a tree that is just a long chain.",
          links: { lesson: "lessons/06-transform-and-conquer/README.md", sim: "sims/search-trees.html", arena: ["bst-insert-inorder", "bst-max-key"], book: "Levitin §5.3" },
          refs: [{ text: "T. N. Hibbard, “Some combinatorial properties of certain trees with applications to searching and sorting,” Journal of the ACM 9(1), 1962.", url: "" }]
        },
        {
          name: "Balanced trees (AVL, red–black)", year: 1962, stage: "advanced",
          time: "Θ(log n) worst case per operation", space: "Θ(n)",
          idea: "Repair the shape with local rotations after each update so the height stays O(log n). AVL trees (Adelson-Velsky–Landis, 1962) bound height differences; red–black trees (1978) use node colors and fewer rotations.",
          limit: "Pointer-heavy nodes scatter across memory, and rotations make lock-free concurrent versions hard.",
          usedIn: "Java's TreeMap is a red–black tree; common C++ std::map implementations are too.",
          links: { lesson: "lessons/06-transform-and-conquer/README.md", sim: "sims/search-trees.html", arena: ["avl-is-balanced"], book: "Levitin §6.3" },
          refs: [
            { text: "G. M. Adelson-Velsky and E. M. Landis, “An algorithm for the organization of information,” Soviet Mathematics Doklady 3, 1962.", url: "" },
            { text: "L. J. Guibas and R. Sedgewick, “A dichromatic framework for balanced trees,” FOCS 1978.", url: "" }
          ]
        },
        {
          name: "Skip list", year: 1989, stage: "production",
          time: "O(log n) expected per operation", space: "O(n) expected",
          idea: "A sorted linked list plus “express lanes”: each node is promoted to the next level with probability 1/2, so a search drops down a level whenever it would overshoot. Coin flips replace rotations.",
          limit: "Bounds are only expected, and every level is still pointer chasing in RAM; data on disk needs something else.",
          usedIn: "Redis sorted sets (a skip list plus a hash table) and the in-memory table of LevelDB.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/skip-list.html" },
          refs: [
            { text: "W. Pugh, “Skip lists: a probabilistic alternative to balanced trees,” Communications of the ACM 33(6), 1990 (first described in a 1989 University of Maryland technical report).", url: "https://doi.org/10.1145/78973.78977" },
            { text: "Redis source, src/t_zset.c (sorted sets: “almost a C translation” of Pugh's skip list).", url: "https://github.com/redis/redis/blob/unstable/src/t_zset.c" }
          ]
        },
        {
          name: "Log-Structured Merge (LSM) tree", year: 1996, stage: "production",
          time: "Batched sequential writes; reads check several levels", space: "Θ(n) plus temporary duplicates",
          idea: "Buffer writes in a sorted in-memory table, flush it to disk as an immutable sorted file, and merge files in the background (compaction). Bloom filters let reads skip most files.",
          limit: "Reads and space pay for the write speed: the same key can sit in several levels until compaction removes old versions.",
          usedIn: "Write-heavy storage engines such as LevelDB and RocksDB.",
          links: { lesson: "lessons/17-senior-engineer-playbook/README.md", arena: ["lsm-compaction-merge"] },
          refs: [{ text: "P. O'Neil, E. Cheng, D. Gawlick and E. O'Neil, “The log-structured merge-tree (LSM-tree),” Acta Informatica 33(4), 1996.", url: "" }]
        },
        {
          name: "Zip trees", year: 2018, stage: "frontier",
          time: "O(log n) expected per operation", space: "Θ(n); a rank needs only O(log log n) bits",
          model: "Randomized; ranks drawn from a geometric distribution.",
          idea: "A binary search tree whose nodes carry random geometric ranks and are heap-ordered by rank. Insert and delete “unzip” and “zip” a path instead of rotating. Zip trees turn out to be the same structure as skip lists, drawn as a tree.",
          limit: "New and simple, but not yet a common library choice.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: ["sims/skip-list.html", "sims/search-trees.html"] },
          refs: [{ text: "R. E. Tarjan, C. C. Levy and S. Timmel, “Zip Trees,” arXiv:1806.06726, 2018; WADS 2019.", url: "https://arxiv.org/abs/1806.06726" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 3 */
    {
      id: "sorting", title: "Sorting", glyph: "sort",
      question: "How do we put n items in order with as little work as possible on real data?",
      blurb: "Comparison sorting has a proven floor of about n log₂ n comparisons in the worst case, so the modern story is about adapting to real inputs: runs that are already sorted, repeated keys and the cost of branches and caches.",
      rungs: [
        {
          name: "Insertion sort (and other quadratic sorts)", year: null, stage: "first",
          time: "Θ(n²) worst case, Θ(n) on sorted input", space: "Θ(1)",
          idea: "Take the next item and slide it left into place among the items already sorted.",
          limit: "Quadratic on random or reversed data; only good for tiny or nearly sorted arrays.",
          usedIn: "The small-subarray finishing step inside quicksort, introsort and Timsort.",
          links: { lesson: "lessons/04-decrease-and-conquer/README.md", sim: "sims/sorting-studio.html", arena: ["insertion-sort", "selection-sort", "bubble-sort-early-exit"], book: "Levitin §4.1" },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., 2012, §3.1 and §4.1.", url: "" }]
        },
        {
          name: "Mergesort", year: 1945, stage: "classic",
          time: "Θ(n log n)", space: "Θ(n)",
          idea: "Sort each half recursively, then merge the two sorted halves in one linear pass.",
          limit: "Needs an extra array as large as the input and does the same work even when the input is already sorted.",
          links: { lesson: "lessons/05-divide-and-conquer/README.md", sim: "sims/sorting-studio.html", arena: ["merge-sort", "count-inversions"], book: "Levitin §5.1" },
          refs: [{ text: "D. E. Knuth, The Art of Computer Programming, Vol. 3, 2nd ed., 1998, §5.2.4 (credits J. von Neumann, 1945).", url: "" }]
        },
        {
          name: "Quicksort", year: 1962, stage: "classic",
          time: "Θ(n log n) average, Θ(n²) worst case", space: "Θ(log n) stack on average",
          idea: "Partition around a pivot so smaller items go left and larger go right, then sort each side in place.",
          limit: "Bad pivots (for example on sorted input with a first-element pivot) make it quadratic.",
          links: { lesson: "lessons/05-divide-and-conquer/README.md", sim: "sims/sorting-studio.html", arena: ["quicksort-hoare"], book: "Levitin §5.2" },
          refs: [{ text: "C. A. R. Hoare, “Quicksort,” The Computer Journal 5(1), 1962.", url: "" }]
        },
        {
          name: "Introsort", year: 1997, stage: "advanced",
          time: "O(n log n) worst case", space: "O(log n)",
          idea: "Run quicksort, but if the recursion gets deeper than about 2 log₂ n, switch that part to heapsort; finish small parts with insertion sort.",
          limit: "Not stable, and blind to runs that are already sorted in real data.",
          usedIn: "std::sort in common C++ standard libraries.",
          links: { lesson: "lessons/06-transform-and-conquer/README.md", sim: "sims/heap-lab.html", arena: ["heapsort", "heap-bottom-up"], book: "Levitin §6.4" },
          refs: [{ text: "D. R. Musser, “Introspective Sorting and Selection Algorithms,” Software: Practice and Experience 27(8), 1997.", url: "" }]
        },
        {
          name: "Timsort", year: 2002, stage: "production",
          time: "O(n log n) worst case; O(n) on one sorted run", space: "O(n)",
          idea: "Find the runs that are already ascending (or strictly descending, then reversed), extend short runs with insertion sort, and merge runs with a stack-based rule plus galloping when one run keeps winning.",
          limit: "Its original merge rule had subtle cases (a stack-size invariant was found broken by formal verification in 2015) and is not provably close to optimal for every run pattern.",
          usedIn: "Python's list.sort from 2.3 to 3.10, Java's sort for object arrays since Java SE 7, Android, and V8's Array.prototype.sort from V8 7.0 (2018) until V8 moved to the powersort merge policy.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/sorting-evolution.html" },
          refs: [
            { text: "T. Peters, “listsort.txt” (design notes for timsort), CPython source, 2002.", url: "https://github.com/python/cpython/blob/main/Objects/listsort.txt" },
            { text: "V8 blog, “Getting things sorted in V8” (Timsort in V8 7.0), 2018.", url: "https://v8.dev/blog/array-sort" }
          ]
        },
        {
          name: "Pattern-defeating quicksort (pdqsort)", year: 2015, stage: "production",
          time: "O(n log n) worst case; O(nk) with k distinct keys", space: "O(log n)",
          idea: "Introsort plus pattern detectors: cheap checks for sorted or reversed stretches, a three-way split when many keys are equal, and shuffling pivots when partitions look unbalanced.",
          limit: "Unstable; and no comparison sort beats about n log₂ n comparisons on random data, so the remaining gains are constant factors such as branch-free partitioning.",
          usedIn: "Go's sort package since Go 1.19; Rust's sort_unstable was a port of pdqsort until Rust 1.81 replaced it with ipnsort, its successor.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/sorting-evolution.html" },
          refs: [
            { text: "O. R. L. Peters, pdqsort source code (C++), released 2015; the year shown is the code release.", url: "https://github.com/orlp/pdqsort" },
            { text: "O. R. L. Peters, “Pattern-defeating Quicksort,” arXiv:2106.05123, 2021 (the paper).", url: "https://arxiv.org/abs/2106.05123" },
            { text: "Go 1.19 release notes: “The sorting algorithm has been rewritten to use pattern-defeating quicksort.”", url: "https://tip.golang.org/doc/go1.19" },
            { text: "Rust 1.81.0 release notes: sort implementations replaced with stable driftsort and unstable ipnsort.", url: "https://releases.rs/docs/1.81.0/" }
          ]
        },
        {
          name: "Powersort", year: 2018, stage: "frontier",
          time: "O(n + nH) comparisons", space: "O(n)",
          model: "Comparison model. H ≤ log₂(number of runs) is the entropy of the run lengths, so the bound adapts to the existing runs; it is provably near-optimal.",
          idea: "Decide the merge order from the runs' positions alone: give each boundary between two runs a “power” (how deep it would sit in a perfectly balanced tree over the array) and merge whenever the stack's top boundary is more powerful than the new one.",
          limit: "Still a comparison sort: on random data with no runs it costs the usual n log₂ n.",
          usedIn: "CPython's list.sort since Python 3.11 (Timsort with the powersort merge policy), PyPy, NumPy, and V8's current Array.prototype.sort source (array-sort.tq implements PowerSort).",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/sorting-evolution.html" },
          refs: [
            { text: "J. I. Munro and S. Wild, “Nearly-Optimal Mergesorts: Fast, Practical Sorting Methods That Optimally Adapt to Existing Runs,” ESA 2018, LIPIcs 112.", url: "https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ESA.2018.63" },
            { text: "Powersort project page (adoption in CPython 3.11 and other libraries).", url: "https://powersort.github.io/" },
            { text: "V8 source, third_party/v8/builtins/array-sort.tq (“a stable, adaptive merge sort variant called PowerSort”).", url: "https://github.com/v8/v8/blob/main/third_party/v8/builtins/array-sort.tq" }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------------ 4 */
    {
      id: "shortest-paths", title: "Shortest paths", glyph: "graph",
      question: "What is the cheapest route from a source vertex to every other vertex?",
      blurb: "Single-Source Shortest Paths (SSSP) powers route planners, network routing and countless reductions. For decades Dijkstra's O(m + n log n) looked like the end of the road on sparse directed graphs with real weights; in 2025 it fell in the comparison-addition model (integer-weight algorithms, Thorup 1999 and 2004, and an undirected real-weight algorithm, Duan et al. 2023, had beaten it earlier in their own settings).",
      rungs: [
        {
          name: "Breadth-First Search (BFS)", year: 1959, stage: "first",
          time: "Θ(V + E)", space: "Θ(V)",
          idea: "Explore the graph in waves: every vertex at distance 1, then distance 2, and so on, using a queue.",
          limit: "Only correct when every edge has the same weight.",
          links: { lesson: "lessons/03-brute-force/README.md", sim: "sims/graph-traversal.html", arena: ["bfs-order", "grid-shortest-path-bfs", "zero-one-bfs"], book: "Levitin §3.5" },
          refs: [{ text: "E. F. Moore, “The shortest path through a maze,” Proceedings of the International Symposium on the Theory of Switching, Harvard University Press, 1959.", url: "" }]
        },
        {
          name: "Dijkstra's algorithm (binary heap)", year: 1959, stage: "classic",
          time: "O((V + E) log V)", space: "Θ(V)",
          idea: "Repeatedly settle the unsettled vertex with the smallest tentative distance and relax its outgoing edges; a priority queue finds that vertex quickly.",
          limit: "Needs non-negative weights, and the heap pays log V per operation.",
          links: { lesson: "lessons/09-greedy/README.md", sim: ["sims/greedy-graphs.html", "sims/shortest-path-frontier.html"], arena: ["dijkstra-distances", "dijkstra-path", "network-delay-heap"], book: "Levitin §9.3" },
          refs: [{ text: "E. W. Dijkstra, “A note on two problems in connexion with graphs,” Numerische Mathematik 1, 1959.", url: "" }]
        },
        {
          name: "Dijkstra with a Fibonacci heap", year: 1984, stage: "advanced",
          time: "O(E + V log V)", space: "Θ(V)",
          model: "Comparison-addition model; heap bounds are amortized.",
          idea: "A heap whose decrease-key costs O(1) amortized removes the log factor from the E edge relaxations.",
          limit: "The V log V term is the “sorting barrier”: Dijkstra outputs vertices in sorted distance order, which seems to require sorting.",
          links: { lesson: "lessons/14-advanced-graphs/README.md", sim: "sims/heap-lab.html" },
          refs: [{ text: "M. L. Fredman and R. E. Tarjan, “Fibonacci heaps and their uses in improved network optimization algorithms,” FOCS 1984; Journal of the ACM 34(3), 1987.", url: "https://doi.org/10.1145/28869.28874" }]
        },
        {
          name: "Goal-directed search and preprocessing (A*, contraction hierarchies)", year: 2008, stage: "production",
          time: "Dijkstra's worst case; tiny searches after preprocessing", space: "Θ(V + E) plus shortcut edges",
          idea: "A* (1968) steers the search toward the target with a lower-bound estimate. Contraction hierarchies (2008) rank vertices by importance, add shortcut edges, and answer a query with two small searches that only climb in rank.",
          limit: "Built for one source and one target on a fixed road network; preprocessing must be redone when the graph changes a lot.",
          usedIn: "Road routing engines; the Open Source Routing Machine (OSRM) offers contraction hierarchies and multi-level Dijkstra.",
          links: { lesson: "lessons/14-advanced-graphs/README.md", sim: "sims/shortest-paths-plus.html" },
          refs: [
            { text: "P. E. Hart, N. J. Nilsson and B. Raphael, “A formal basis for the heuristic determination of minimum cost paths,” IEEE Transactions on Systems Science and Cybernetics 4(2), 1968.", url: "" },
            { text: "R. Geisberger, P. Sanders, D. Schultes and D. Delling, “Contraction Hierarchies: Faster and Simpler Hierarchical Routing in Road Networks,” WEA 2008.", url: "https://doi.org/10.1007/978-3-540-68552-4_24" },
            { text: "Open Source Routing Machine (OSRM) documentation.", url: "https://github.com/Project-OSRM/osrm-backend" }
          ]
        },
        {
          name: "Negative weights in near-linear time", year: 2022, stage: "frontier",
          time: "O(m log⁸ n log W)", space: "O(m)",
          model: "Randomized; integer edge weights that are at least −W.",
          idea: "Decompose the graph into pieces with few negative edges on any shortest path, fix the pieces recursively, and use potentials (as in Johnson's reweighting) so Dijkstra can finish. Purely combinatorial tools beat Bellman–Ford's O(mn).",
          limit: "Large polylog factors (log⁸ n); Bellman–Ford is still simpler for small graphs.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/shortest-paths-plus.html", arena: ["bellman-ford"] },
          refs: [{ text: "A. Bernstein, D. Nanongkai and C. Wulff-Nilsen, “Negative-Weight Single-Source Shortest Paths in Near-linear Time,” FOCS 2022 (Best Paper Award).", url: "https://arxiv.org/abs/2203.03456" }]
        },
        {
          name: "Negative weights, six log factors fewer", year: 2023, stage: "frontier",
          time: "O(m log² n log(nW) log log n)", space: "O(m)",
          model: "Randomized (Las Vegas); integer edge weights that are at least −W. The current best bound for this problem.",
          idea: "Keep the 2022 recipe (decompose, fix pieces recursively, reweight with potentials, finish with Dijkstra) but make every layer cheaper, removing about six logarithmic factors.",
          limit: "Still several log factors from linear, and far more intricate than Bellman–Ford.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/shortest-paths-plus.html", arena: ["bellman-ford"] },
          refs: [{ text: "K. Bringmann, A. Cassis and N. Fischer, “Negative-Weight Single-Source Shortest Paths in Near-Linear Time: Now Faster!,” FOCS 2023.", url: "https://arxiv.org/abs/2304.05279" }]
        },
        {
          name: "Universally optimal Dijkstra", year: 2023, stage: "frontier",
          time: "O(m + n log n), optimal on every graph", space: "O(m + n)",
          model: "Comparison-addition model; the task is to output the vertices sorted by distance.",
          idea: "Use a heap with the working-set property: deleting an item costs time logarithmic only in the number of items inserted after it. Then Dijkstra is as fast as any algorithm can be on each fixed graph, not just in the worst case.",
          limit: "Optimal for listing vertices in distance order; it says nothing about computing distances without the order.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/heap-lab.html" },
          refs: [{ text: "B. Haeupler, R. Hladík, V. Rozhoň, R. E. Tarjan and J. Tětek, “Universal Optimality of Dijkstra via Beyond-Worst-Case Heaps,” arXiv:2311.11793, 2023; FOCS 2024 (Best Paper Award).", url: "https://arxiv.org/abs/2311.11793" }]
        },
        {
          name: "Breaking the sorting barrier", year: 2025, stage: "frontier",
          time: "O(m log^{2/3} n)", space: "O(m)",
          model: "Deterministic; comparison-addition model; directed graphs with real non-negative weights.",
          idea: "Do not keep the whole frontier sorted. Divide distances into bands; inside a band run a few Bellman–Ford-style relaxation rounds to find a small set of “pivot” vertices that root large shortest-path trees, and recurse only on those, with a data structure that inserts and extracts in batches.",
          limit: "Faster than Dijkstra only on sparse graphs, with large constants; it does not output vertices in sorted order.",
          links: { sim: "sims/shortest-path-frontier.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "R. Duan, J. Mao, X. Mao, X. Shu and L. Yin, “Breaking the Sorting Barrier for Directed Single-Source Shortest Paths,” STOC 2025 (Best Paper Award).", url: "https://doi.org/10.1145/3717823.3718179" },
            { text: "arXiv version: arXiv:2504.17033.", url: "https://arxiv.org/abs/2504.17033" }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------------ 5 */
    {
      id: "minimum-spanning-tree", title: "Minimum spanning tree", glyph: "graph",
      question: "What is the cheapest set of edges that connects every vertex?",
      blurb: "Minimum Spanning Trees (MSTs) appear in network design, clustering and as building blocks for approximation algorithms. Randomized linear time has been known since 1995; whether a deterministic linear-time algorithm exists is still open.",
      rungs: [
        {
          name: "Try every spanning tree", year: null, stage: "first",
          time: "Ω(n^{n-2}) trees on a complete graph", space: "Θ(n)",
          idea: "List every spanning tree and keep the cheapest. Cayley's formula says a complete graph on n vertices has n^{n−2} of them.",
          limit: "Hopeless beyond about ten vertices.",
          links: { lesson: "lessons/03-brute-force/README.md", sim: "sims/exhaustive-search.html" },
          refs: [{ text: "A. Cayley, “A theorem on trees,” Quarterly Journal of Pure and Applied Mathematics 23, 1889.", url: "" }]
        },
        {
          name: "Prim's and Kruskal's algorithms", year: 1956, stage: "classic",
          time: "O(E log V)", space: "Θ(V + E)",
          idea: "Both are greedy and rely on the cut property. Kruskal (1956) adds the cheapest edge that does not close a cycle, using union-find; Prim (1957; Jarník 1930) grows one tree from a start vertex with a priority queue.",
          limit: "The log factor comes from sorting edges or from the heap.",
          links: { lesson: "lessons/09-greedy/README.md", sim: ["sims/greedy-graphs.html", "sims/union-find.html"], arena: ["prim-mst-weight", "kruskal-mst-edges", "quick-union-find", "union-find-ops"], book: "Levitin §9.1–9.2" },
          refs: [
            { text: "J. B. Kruskal, “On the shortest spanning subtree of a graph and the traveling salesman problem,” Proceedings of the American Mathematical Society 7(1), 1956.", url: "" },
            { text: "R. C. Prim, “Shortest connection networks and some generalizations,” Bell System Technical Journal 36(6), 1957.", url: "" }
          ]
        },
        {
          name: "Borůvka's algorithm", year: 1926, stage: "advanced",
          time: "O(E log V)", space: "Θ(V + E)",
          idea: "In each round, every component picks its cheapest outgoing edge, all at once; the number of components at least halves every round. The oldest MST algorithm, and the natural parallel one.",
          limit: "Same log factor; its value is as a building block that shrinks the graph fast.",
          usedIn: "Parallel and distributed MST codes, and as a step inside the faster algorithms below.",
          links: { lesson: "lessons/13-advanced-data-structures/README.md", sim: "sims/mst-modern.html" },
          refs: [{ text: "O. Borůvka, “O jistém problému minimálním” (On a certain minimal problem), Práce Moravské Přírodovědecké Společnosti 3, 1926.", url: "" }]
        },
        {
          name: "Randomized linear time (Karger–Klein–Tarjan)", year: 1993, stage: "advanced",
          time: "O(E) expected", space: "O(E)",
          model: "Randomized; comparison-based.",
          idea: "Run two Borůvka rounds, then solve a random half of the edges recursively; a linear-time verification step discards every edge that the sample's forest proves cannot be in the MST, and recurse on the few that remain.",
          limit: "Linear only in expectation; it needs random bits.",
          links: { sim: "sims/mst-modern.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "P. N. Klein and R. E. Tarjan, “A Randomized Linear-Time Algorithm for Finding Minimum Spanning Trees,” Brown University Technical Report CS-93-49, 1993; STOC 1994.", url: "https://cs.brown.edu/research/pubs/techreports/reports/CS-93-49.html" },
            { text: "D. R. Karger, P. N. Klein and R. E. Tarjan, “A randomized linear-time algorithm to find minimum spanning trees,” Journal of the ACM 42(2), 1995.", url: "" }
          ]
        },
        {
          name: "Chazelle's soft-heap algorithm", year: 2000, stage: "frontier",
          time: "O(E α(E, V))", space: "O(E)",
          model: "Deterministic; comparison-based. α is the inverse Ackermann function, at most 4 for any realistic input.",
          idea: "A soft heap is allowed to corrupt (raise) a controlled fraction of keys, which makes it faster; the MST algorithm tolerates and later repairs those errors.",
          limit: "Within an α factor of linear, but not proven optimal.",
          links: { sim: "sims/mst-modern.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "B. Chazelle, “A minimum spanning tree algorithm with inverse-Ackermann type complexity,” Journal of the ACM 47(6), 2000.", url: "https://doi.org/10.1145/355541.355562" }]
        },
        {
          name: "Optimal MST (Pettie–Ramachandran)", year: 1999, stage: "frontier",
          time: "O(T*(m, n))", space: "O(m)",
          model: "Deterministic; comparison-based. T*(m, n) is the decision-tree complexity: the optimal number of edge-weight comparisons.",
          idea: "Precompute optimal decision trees for all tiny graphs, then reduce the big graph to many tiny ones. The algorithm is provably optimal, yet nobody knows its exact running time: it lies between Ω(m) and O(m α(m, n)).",
          limit: "Open problem: is there a deterministic linear-time MST algorithm?",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "S. Pettie and V. Ramachandran, “An optimal minimum spanning tree algorithm,” University of Texas at Austin Technical Report TR-99-17, 1999; ICALP 2000; Journal of the ACM 49(1), 2002.", url: "https://doi.org/10.1145/505241.505243" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 6 */
    {
      id: "maximum-flow", title: "Maximum flow", glyph: "flow",
      question: "How much can flow from a source s to a sink t through a network of pipes with capacities?",
      blurb: "Max flow and its dual, min cut, model matching, scheduling, image segmentation and network reliability. In 2022 it became solvable in almost-linear time: m^{1+o(1)}.",
      rungs: [
        {
          name: "Ford–Fulkerson (augmenting paths)", year: 1956, stage: "first",
          time: "O(E · |f*|)", space: "Θ(V + E)",
          model: "Integer capacities; |f*| is the value of the maximum flow.",
          idea: "While the residual network has a path from s to t, push as much flow along it as its tightest edge allows. Max-flow equals min-cut when no path is left.",
          limit: "With bad path choices the number of augmentations can be huge (and with irrational capacities it may not even terminate).",
          links: { lesson: "lessons/10-iterative-improvement/README.md", sim: "sims/max-flow.html", arena: ["min-cut-capacity"], book: "Levitin §10.2" },
          refs: [{ text: "L. R. Ford and D. R. Fulkerson, “Maximal flow through a network,” Canadian Journal of Mathematics 8, 1956.", url: "" }]
        },
        {
          name: "Edmonds–Karp (shortest augmenting path)", year: 1972, stage: "classic",
          time: "O(V E²)", space: "Θ(V + E)",
          idea: "Always augment along a shortest path (fewest edges), found by Breadth-First Search (BFS). Path lengths never decrease, which bounds the number of augmentations by O(VE).",
          limit: "Each augmentation runs a fresh BFS from scratch.",
          links: { lesson: "lessons/10-iterative-improvement/README.md", sim: "sims/max-flow.html", arena: ["max-flow-sap", "bipartite-matching-size"], book: "Levitin §10.2" },
          refs: [{ text: "J. Edmonds and R. M. Karp, “Theoretical improvements in algorithmic efficiency for network flow problems,” Journal of the ACM 19(2), 1972.", url: "" }]
        },
        {
          name: "Dinic's blocking flows", year: 1970, stage: "advanced",
          time: "O(V² E)", space: "Θ(V + E)",
          idea: "Build the BFS level graph once, then push a blocking flow through it using many augmenting paths before rebuilding.",
          limit: "Still far from linear on general graphs.",
          usedIn: "A favourite in programming contests; on unit-capacity bipartite graphs it matches Hopcroft–Karp.",
          links: { lesson: "lessons/10-iterative-improvement/README.md", sim: "sims/flow-modern.html" },
          refs: [{ text: "E. A. Dinic, “Algorithm for solution of a problem of maximum flow in a network with power estimation,” Soviet Mathematics Doklady 11, 1970.", url: "" }]
        },
        {
          name: "Goldberg–Rao", year: 1997, stage: "advanced",
          time: "O(min(n^{2/3}, m^{1/2}) · m · log(n²/m) · log U)", space: "O(m)",
          model: "Integer capacities at most U.",
          idea: "Use a length function that treats edges with large residual capacity as free, so blocking flows make faster progress than the “flow decomposition” argument allows.",
          limit: "For general integer capacities, nothing beat it on sparse graphs (about m^{1.5}) until Gao, Liu and Peng in 2021, and only by m^{1/328}; for unit capacities, Mądry broke the m^{1.5} barrier in 2013. Its bound also did not make practical codes faster.",
          links: { sim: "sims/flow-modern.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "A. V. Goldberg and S. Rao, “Beyond the flow decomposition barrier,” FOCS 1997; Journal of the ACM 45(5), 1998.", url: "https://doi.org/10.1145/290179.290181" },
            { text: "A. Mądry, “Navigating Central Path with Electrical Flows: from Flows to Matchings, and Back,” FOCS 2013 (unit capacities, Õ(m^{10/7})).", url: "" },
            { text: "Y. Gao, Y. P. Liu and R. Peng, “Fully Dynamic Electrical Flows: Sparse Maxflow Faster Than Goldberg–Rao,” FOCS 2021 (Õ(m^{3/2 − 1/328} log U)).", url: "https://arxiv.org/abs/2101.07233" }
          ]
        },
        {
          name: "Push–relabel", year: 1986, stage: "production",
          time: "O(V² E) generic; O(V³) first-in first-out", space: "Θ(V + E)",
          idea: "Let vertices hold excess flow and push it “downhill” toward t according to height labels, relabeling a vertex when it is stuck. Works locally, with no global path search.",
          limit: "Theory bounds stay superlinear; practical speed comes from heuristics such as global relabeling.",
          usedIn: "Fast exact max-flow codes in graph libraries; image segmentation often uses the Boykov–Kolmogorov augmenting-path code instead.",
          links: { lesson: "lessons/10-iterative-improvement/README.md", sim: "sims/flow-modern.html" },
          refs: [
            { text: "A. V. Goldberg and R. E. Tarjan, “A new approach to the maximum-flow problem,” Princeton technical report and STOC 1986; Journal of the ACM 35(4), 1988.", url: "https://www.cs.princeton.edu/research/techreps/578" },
            { text: "Y. Boykov and V. Kolmogorov, “An Experimental Comparison of Min-Cut/Max-Flow Algorithms for Energy Minimization in Vision,” IEEE Transactions on Pattern Analysis and Machine Intelligence 26(9), 2004.", url: "https://doi.org/10.1109/TPAMI.2004.60" }
          ]
        },
        {
          name: "Almost-linear max flow", year: 2022, stage: "frontier",
          time: "m^{1+o(1)}", space: "m^{1+o(1)}",
          model: "Randomized; integer capacities and costs bounded by a polynomial in m. Also solves minimum-cost flow.",
          idea: "An interior-point method reduces the problem to about m^{1+o(1)} steps, each needing an approximate “minimum-ratio cycle”; a new dynamic data structure (built on low-stretch trees) finds each cycle in m^{o(1)} amortized time.",
          limit: "The o(1) hides large factors, so it is not yet faster in practice.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/flow-modern.html" },
          refs: [{ text: "L. Chen, R. Kyng, Y. P. Liu, R. Peng, M. Probst Gutenberg and S. Sachdeva, “Maximum Flow and Minimum-Cost Flow in Almost-Linear Time,” FOCS 2022 (Best Paper Award).", url: "https://arxiv.org/abs/2203.00671" }]
        },
        {
          name: "Deterministic almost-linear min-cost flow", year: 2023, stage: "frontier",
          time: "m^{1+o(1)}", space: "m^{1+o(1)}",
          model: "Deterministic; directed graphs with polynomially bounded integer capacities and costs.",
          idea: "Replace the randomized pieces of the 2022 data structure with deterministic ones, so exact max flow and min-cost flow need no random bits.",
          limit: "Still a theoretical result; the race now is for simpler and practical versions.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "J. van den Brand, L. Chen, R. Kyng, Y. P. Liu, R. Peng, M. Probst Gutenberg, S. Sachdeva and A. Sidford, “A Deterministic Almost-Linear Time Algorithm for Minimum-Cost Flow,” FOCS 2023.", url: "https://arxiv.org/abs/2309.16629" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 7 */
    {
      id: "string-indexing", title: "String matching and text indexing", glyph: "string",
      question: "Where does a pattern of length m occur in a text of length n, and can we preprocess a huge text so every query is fast?",
      blurb: "From the find box in an editor to aligning billions of DNA reads against a genome, the ladder moves from scanning the text for each query to compressed indexes that answer a query in time proportional to the pattern.",
      rungs: [
        {
          name: "Brute-force matching", year: null, stage: "first",
          time: "Θ(nm) worst case", space: "Θ(1)",
          idea: "Try every alignment of the pattern against the text and compare character by character.",
          limit: "Repeats work after every mismatch.",
          links: { lesson: "lessons/03-brute-force/README.md", sim: "sims/string-match.html", arena: ["brute-force-string-match", "all-match-positions"], book: "Levitin §3.2" },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., 2012, §3.2.", url: "" }]
        },
        {
          name: "Knuth–Morris–Pratt (KMP) and Boyer–Moore", year: 1977, stage: "classic",
          time: "Θ(n + m) for KMP", space: "Θ(m)",
          idea: "Preprocess the pattern. KMP's prefix table says how far to shift without re-reading text; Boyer–Moore compares right to left and often skips whole pattern lengths.",
          limit: "Every query still scans the whole text: no good for many queries on a fixed, huge text.",
          links: { lesson: "lessons/07-space-time-tradeoffs/README.md", sim: "sims/string-match.html", arena: ["kmp-prefix-table", "kmp-search", "horspool-search", "horspool-shift-table"], book: "Levitin §7.2" },
          refs: [
            { text: "D. E. Knuth, J. H. Morris and V. R. Pratt, “Fast pattern matching in strings,” SIAM Journal on Computing 6(2), 1977.", url: "" },
            { text: "R. S. Boyer and J S. Moore, “A fast string searching algorithm,” Communications of the ACM 20(10), 1977.", url: "" }
          ]
        },
        {
          name: "Suffix tree", year: 1973, stage: "advanced",
          time: "Θ(n) build; O(m + occ) query", space: "Θ(n) words, with a large constant",
          model: "Constant-size alphabet; occ = number of occurrences.",
          idea: "A compressed trie of all suffixes of the text: every occurrence of a pattern is a path from the root. Weiner (1973) built it in linear time; Ukkonen (1995) gave a simpler online construction.",
          limit: "Implementations often need more than 10 bytes per text character: too big for large genomes in RAM.",
          links: { lesson: "lessons/13-advanced-data-structures/README.md", sim: "sims/trie.html", arena: ["aho-corasick-counts"] },
          refs: [
            { text: "P. Weiner, “Linear pattern matching algorithms,” 14th Annual Symposium on Switching and Automata Theory (SWAT), 1973.", url: "" },
            { text: "E. Ukkonen, “On-line construction of suffix trees,” Algorithmica 14(3), 1995.", url: "" }
          ]
        },
        {
          name: "Suffix array", year: 1990, stage: "advanced",
          time: "O(n log n) build; O(m log n) query", space: "Θ(n) words",
          idea: "Just the starting positions of all suffixes in sorted order; binary search finds the block of suffixes that start with the pattern. Add the Longest Common Prefix (LCP) array for many more queries.",
          limit: "Still n machine words (4–8 bytes per character), plus the text itself.",
          links: { sim: "sims/suffix-structures.html", lesson: "lessons/15-dp-and-interview-patterns/README.md", arena: ["suffix-array-lrs", "z-function"] },
          refs: [{ text: "U. Manber and G. Myers, “Suffix arrays: a new method for on-line string searches,” SODA 1990; SIAM Journal on Computing 22(5), 1993.", url: "" }]
        },
        {
          name: "Linear-time construction by induced sorting (SA-IS)", year: 2009, stage: "production",
          time: "Θ(n)", space: "Θ(n) words",
          idea: "Classify each suffix as S-type or L-type, sort only the few “leftmost S” suffixes (recursively), and induce the order of all the others in two linear scans.",
          limit: "The index is still uncompressed.",
          usedIn: "The basis of fast suffix-array libraries.",
          links: { sim: "sims/suffix-structures.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "G. Nong, S. Zhang and W. H. Chan, “Linear suffix array construction by almost pure induced-sorting,” Data Compression Conference (DCC) 2009.", url: "" }]
        },
        {
          name: "Burrows–Wheeler Transform (BWT) and FM-index", year: 2000, stage: "production",
          time: "O(m) to count occurrences", space: "Close to the compressed size of the text",
          model: "Constant-size alphabet.",
          idea: "The BWT (1994) permutes the text so equal contexts cluster and compress well; the FM-index (2000) adds rank tables so a pattern can be searched backward, one character at a time, directly in the compressed text.",
          limit: "Space grows with the text even when the collection is highly repetitive (thousands of nearly identical genomes).",
          usedIn: "DNA read aligners such as BWA and Bowtie; the bzip2 compressor uses the BWT.",
          links: { sim: "sims/suffix-structures.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "M. Burrows and D. J. Wheeler, “A block-sorting lossless data compression algorithm,” Digital Equipment Corporation SRC Research Report 124, 1994.", url: "" },
            { text: "P. Ferragina and G. Manzini, “Opportunistic data structures with applications,” FOCS 2000.", url: "" },
            { text: "H. Li and R. Durbin, “Fast and accurate short read alignment with Burrows–Wheeler transform,” Bioinformatics 25, 2009.", url: "https://bio-bwa.sourceforge.net/" },
            { text: "B. Langmead, C. Trapnell, M. Pop and S. L. Salzberg, “Ultrafast and memory-efficient alignment of short DNA sequences to the human genome,” Genome Biology 10(3), 2009.", url: "" }
          ]
        },
        {
          name: "Run-length BWT indexes (r-index)", year: 2018, stage: "frontier",
          time: "Fast counting and locating of occurrences", space: "O(r) words, where r is the number of runs in the BWT",
          idea: "In repetitive collections the BWT is made of few long runs of equal letters. Store only O(r) values, one per run, and still locate every occurrence; r can be thousands of times smaller than n.",
          limit: "Pays off only on highly repetitive data.",
          usedIn: "Pangenome indexing research.",
          links: { sim: "sims/suffix-structures.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "T. Gagie, G. Navarro and N. Prezza, “Optimal-Time Text Indexing in BWT-runs Bounded Space,” SODA 2018.", url: "https://arxiv.org/abs/1705.10382" },
            { text: "T. Gagie, G. Navarro and N. Prezza, “Fully Functional Suffix Trees and Optimal Text Searching in BWT-Runs Bounded Space,” Journal of the ACM 67(1), 2020.", url: "https://doi.org/10.1145/3375890" }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------------ 8 */
    {
      id: "hash-tables", title: "Hash tables", glyph: "hash",
      question: "How do we store keys so that insert, delete and lookup take constant time?",
      blurb: "Hash tables are probably the most used data structure in software. Seventy years in, both the engineering (cache lines, vector instructions) and the theory (a 2024 result overturned a 1985 conjecture) are still moving.",
      rungs: [
        {
          name: "Unsorted list", year: null, stage: "first",
          time: "Θ(n) per lookup", space: "Θ(n)",
          idea: "Append keys to a list and scan it to find one.",
          limit: "Linear time per lookup.",
          links: { lesson: "lessons/03-brute-force/README.md", arena: ["count-occurrences"] },
          refs: [{ text: "D. E. Knuth, The Art of Computer Programming, Vol. 3, 2nd ed., 1998, §6.1.", url: "" }]
        },
        {
          name: "Separate chaining", year: 1953, stage: "classic",
          time: "Θ(1 + n/m) expected per operation with m buckets", space: "Θ(n + m)",
          model: "Hash values behave like uniformly random bucket choices.",
          idea: "Hash the key to one of m buckets, each holding a linked list; keep n/m bounded by growing the table.",
          limit: "Linked nodes scatter across memory, and each node costs a pointer.",
          links: { lesson: "lessons/07-space-time-tradeoffs/README.md", sim: "sims/hashing.html", arena: ["open-hashing-chains", "two-sum-hash"], book: "Levitin §7.3" },
          refs: [{ text: "D. E. Knuth, The Art of Computer Programming, Vol. 3, 2nd ed., 1998, §6.4 (history: H. P. Luhn, 1953).", url: "" }]
        },
        {
          name: "Linear probing (open addressing)", year: 1957, stage: "classic",
          time: "≈ ½(1 + 1/(1 − α)²) probes per miss at load α", space: "Θ(m)",
          model: "Hash values behave like random choices; Knuth analysed linear probing exactly in 1963.",
          idea: "Store keys in the array itself; on a collision, try the next slot, then the next. Consecutive probes hit the same cache lines.",
          limit: "Clusters grow, and probe counts blow up as the table gets nearly full.",
          links: { lesson: "lessons/07-space-time-tradeoffs/README.md", sim: "sims/hashing.html", arena: ["linear-probing-table"], book: "Levitin §7.3" },
          refs: [
            { text: "W. W. Peterson, “Addressing for random-access storage,” IBM Journal of Research and Development 1(2), 1957.", url: "" },
            { text: "D. E. Knuth, The Art of Computer Programming, Vol. 3, 2nd ed., 1998, §6.4 (analysis of linear probing).", url: "" }
          ]
        },
        {
          name: "Robin Hood hashing", year: 1985, stage: "advanced",
          time: "Θ(1) expected; low variance of probe lengths", space: "Θ(m)",
          idea: "During insertion, a key that has travelled far from its home slot may evict a key that is closer to home (“take from the rich”), which evens out probe lengths.",
          limit: "Insertions move keys around, and lookups still walk one slot at a time.",
          links: { lesson: "lessons/07-space-time-tradeoffs/README.md", sim: "sims/hashing.html" },
          refs: [{ text: "P. Celis, P.-Å. Larson and J. I. Munro, “Robin Hood hashing (preliminary report),” FOCS 1985.", url: "" }]
        },
        {
          name: "Cuckoo hashing", year: 2001, stage: "advanced",
          time: "O(1) worst-case lookup", space: "Θ(n)",
          model: "Randomized hash functions; insertion is O(1) expected amortized, and a rare failed insertion triggers a rehash.",
          idea: "Give every key two possible homes (one per table). Lookup checks just those two. Insertion kicks out the occupant, which moves to its other home, possibly kicking out another, like a cuckoo chick.",
          limit: "With two tables of one slot per bucket it must stay below 50% full; insert chains can get long near the limit.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/cuckoo-filters.html" },
          refs: [{ text: "R. Pagh and F. F. Rodler, “Cuckoo hashing,” ESA 2001; Journal of Algorithms 51(2), 2004.", url: "https://doi.org/10.1016/j.jalgor.2003.12.002" }]
        },
        {
          name: "SwissTable (metadata bytes + SIMD probing)", year: 2017, stage: "production",
          time: "O(1) expected; 16 slots per vector compare", space: "Θ(m) plus one control byte per slot",
          idea: "Open addressing with a separate array of one-byte tags (7 bits of the hash plus a full/empty/deleted marker). A Single Instruction, Multiple Data (SIMD) comparison checks 16 tags at once, so long probe sequences cost only a few instructions.",
          limit: "Engineering, not new asymptotics: the probe theory is still that of uniform probing.",
          usedIn: "Abseil's flat_hash_map (Google), Rust's standard HashMap since Rust 1.36 (via hashbrown), and Go's built-in map since Go 1.24.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/hashing.html" },
          refs: [
            { text: "M. Kulukundis, “Designing a Fast, Efficient, Cache-friendly Hash Table, Step by Step,” CppCon 2017 talk.", url: "" },
            { text: "Abseil, “Swiss Tables Design Notes.”", url: "https://abseil.io/about/design/swisstables" },
            { text: "hashbrown: a Rust port of SwissTable, adopted by the Rust standard library in 1.36.", url: "https://github.com/rust-lang/hashbrown" },
            { text: "Go 1.24 release notes: new built-in map implementation based on Swiss Tables.", url: "https://go.dev/doc/go1.24" }
          ]
        },
        {
          name: "Optimal open addressing without reordering", year: 2024, stage: "frontier",
          time: "Elastic hashing: O(1) amortized expected, O(log δ⁻¹) worst-case expected probes", space: "Θ(m)",
          model: "Open addressing in which keys never move after insertion, at load factor 1 − δ. Elastic hashing (non-greedy) matches the Ω(log δ⁻¹) worst-case lower bound for every such scheme. Funnel hashing (greedy: each key takes the first free slot it probes) gets O(log² δ⁻¹) worst-case expected probes, optimal among greedy schemes.",
          idea: "Split the table into geometrically shrinking sub-arrays and decide how hard to try in each before moving on. Funnel hashing beats uniform probing's Θ(δ⁻¹) while staying greedy, which disproves Yao's 1985 conjecture that uniform probing is essentially optimal among greedy schemes; elastic hashing goes further by sometimes skipping a free slot.",
          limit: "A theoretical design; its practical value against SwissTable-style engineering is still being explored.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "M. Farach-Colton, A. Krapivin and W. Kuszmaul, “Optimal Bounds for Open Addressing Without Reordering,” FOCS 2024; arXiv:2501.02305, 2025.", url: "https://arxiv.org/abs/2501.02305" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 9 */
    {
      id: "membership-filters", title: "Approximate membership filters", glyph: "filter",
      question: "Is x in the set? Answer in a few bits per item, allowing a small false-positive rate ε but never a false negative.",
      blurb: "Filters sit in front of slow storage (disks, networks) to skip lookups that would find nothing. The information-theoretic floor is log₂(1/ε) bits per key; the ladder is the race toward it.",
      rungs: [
        {
          name: "Sorted array + binary search", year: null, stage: "first",
          time: "Θ(log n) per query", space: "Every full key",
          idea: "Store the keys sorted and binary-search; exact answers.",
          limit: "Stores whole keys; far too big to keep in fast memory for billions of items.",
          links: { lesson: "lessons/04-decrease-and-conquer/README.md", sim: "sims/search-lab.html", arena: ["binary-search"] },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., 2012, §4.4.", url: "" }]
        },
        {
          name: "Hash set", year: 1953, stage: "classic",
          time: "Θ(1) expected per query", space: "Every full key plus table overhead",
          idea: "Exact membership in constant expected time.",
          limit: "Still stores every key; exactness costs memory.",
          links: { lesson: "lessons/07-space-time-tradeoffs/README.md", sim: "sims/hashing.html", arena: ["two-sum-hash"] },
          refs: [{ text: "D. E. Knuth, The Art of Computer Programming, Vol. 3, 2nd ed., 1998, §6.4.", url: "" }]
        },
        {
          name: "Bloom filter", year: 1970, stage: "classic",
          time: "O(k) probes for k hash functions", space: "About 1.44 log₂(1/ε) bits per key at the best k",
          idea: "Set k hashed bits per key in one bit array; a query says “maybe” only if all k bits are set.",
          limit: "No deletions, k random memory accesses per query, and 44% more space than the lower bound.",
          usedIn: "Storage engines skip disk reads with them; browsers, caches and networks use them everywhere.",
          links: { lesson: "lessons/16-randomized-amortized-streaming/README.md", sim: "sims/bloom-filter.html" },
          refs: [{ text: "B. H. Bloom, “Space/time trade-offs in hash coding with allowable errors,” Communications of the ACM 13(7), 1970.", url: "" }]
        },
        {
          name: "Cuckoo filter", year: 2014, stage: "advanced",
          time: "O(1): two buckets per query", space: "Less than a space-optimized Bloom filter when ε < 3%",
          idea: "Store short fingerprints in a cuckoo hash table; partial-key cuckoo hashing computes a fingerprint's other bucket from the fingerprint alone, so entries can move and be deleted.",
          limit: "Insertions can fail when the table is nearly full; fingerprint length must grow slowly with table size.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/cuckoo-filters.html" },
          refs: [{ text: "B. Fan, D. G. Andersen, M. Kaminsky and M. D. Mitzenmacher, “Cuckoo Filter: Practically Better Than Bloom,” CoNEXT 2014.", url: "https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf" }]
        },
        {
          name: "Xor filter", year: 2019, stage: "advanced",
          time: "O(1): three memory accesses per query", space: "About 1.23 log₂(1/ε) bits per key (23% over the lower bound)",
          idea: "For a fixed set, solve for a table so that the xor of three hashed table entries equals the key's fingerprint; built by repeatedly peeling keys that touch a slot no other key uses.",
          limit: "Static: the whole filter is rebuilt when the set changes.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/cuckoo-filters.html" },
          refs: [{ text: "T. M. Graf and D. Lemire, “Xor Filters: Faster and Smaller Than Bloom and Cuckoo Filters,” arXiv:1912.08258, 2019; ACM Journal of Experimental Algorithmics 25, 2020.", url: "https://arxiv.org/abs/1912.08258" }]
        },
        {
          name: "Ribbon filter", year: 2020, stage: "production",
          time: "O(1) query", space: "Close to the lower bound, for any ε",
          idea: "Give each key a short band of random coefficients and solve the resulting nearly-diagonal linear system over the two-element field GF(2) (bits, with xor as addition) by fast banded Gaussian elimination; the solution is the filter.",
          limit: "Static, like the xor filter.",
          usedIn: "RocksDB (an experimental Ribbon filter option arrived in version 6.15.0, November 2020).",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "P. C. Dillinger and S. Walzer, “Ribbon filter: practically smaller than Bloom and Xor,” arXiv:2103.02515, 2021 (the code shipped first, in RocksDB 6.15.0, 2020).", url: "https://arxiv.org/abs/2103.02515" }]
        },
        {
          name: "Binary fuse filter", year: 2022, stage: "frontier",
          time: "O(1): three memory accesses per query", space: "Within 13% of the lower bound (8% for a slower variant)",
          idea: "Like the xor filter, but each key's three slots fall into nearby, overlapping segments, which makes peeling succeed at much higher load; construction is more than twice as fast as for xor filters.",
          limit: "Static; dynamic filters near the bound remain an active research area.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/cuckoo-filters.html" },
          refs: [{ text: "T. M. Graf and D. Lemire, “Binary Fuse Filters: Fast and Smaller Than Xor Filters,” ACM Journal of Experimental Algorithmics 27, 2022.", url: "https://arxiv.org/abs/2201.01174" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: "vector-search", title: "Nearest-neighbor and vector search", glyph: "vector",
      question: "Given a query vector, which of n stored vectors (in hundreds of dimensions) are closest?",
      blurb: "Search engines, recommendation systems and retrieval for Large Language Models (LLMs) all embed items as vectors and ask for nearest neighbors. Exact answers in high dimensions cost almost a full scan, so practice moved to Approximate Nearest Neighbor (ANN) search.",
      rungs: [
        {
          name: "Brute-force scan", year: null, stage: "first",
          time: "Θ(n · d) per query in d dimensions", space: "Θ(n · d)",
          idea: "Compute the distance to every stored vector and keep the best k.",
          limit: "A billion 768-dimensional vectors means about a trillion multiply-adds per query.",
          usedIn: "Still the right answer for small collections, and the ground truth for measuring recall.",
          links: { lesson: "lessons/03-brute-force/README.md", sim: "sims/vector-search.html", arena: ["closest-pair-brute"] },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., 2012, §3.3 (closest pair by brute force).", url: "" }]
        },
        {
          name: "k-d tree", year: 1975, stage: "classic",
          time: "Fast for small d; near a full scan for large d", space: "Θ(n)",
          idea: "Split space by one coordinate at a time, alternating coordinates, and prune subtrees that are farther than the best match so far.",
          limit: "The curse of dimensionality: beyond a few dozen dimensions pruning almost never happens.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/vector-search.html" },
          refs: [{ text: "J. L. Bentley, “Multidimensional binary search trees used for associative searching,” Communications of the ACM 18(9), 1975.", url: "https://doi.org/10.1145/361002.361007" }]
        },
        {
          name: "Locality-Sensitive Hashing (LSH)", year: 1998, stage: "advanced",
          time: "n^ρ query time, ρ < 1", space: "n^{1+ρ} for the hash tables",
          model: "Provable guarantees for approximate neighbors (within a factor c of the true distance).",
          idea: "Use hash functions that send close vectors to the same bucket more often than far ones; look only in the query's buckets across several tables.",
          limit: "Needs many tables (memory) for good recall; graph indexes usually beat it in practice.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/vector-search.html" },
          refs: [{ text: "P. Indyk and R. Motwani, “Approximate nearest neighbors: towards removing the curse of dimensionality,” STOC 1998.", url: "" }]
        },
        {
          name: "Product Quantization (PQ)", year: 2011, stage: "production",
          time: "Θ(n · M) table lookups for M sub-vectors", space: "A few bytes per vector",
          idea: "Cut each vector into sub-vectors and replace each sub-vector by the id of its nearest centroid from a small codebook; distances become sums of precomputed table entries.",
          limit: "Lossy: distances are estimates with no worst-case error bound, so results need re-ranking.",
          usedIn: "Compressed indexes in libraries such as Faiss.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/vector-search.html" },
          refs: [
            { text: "H. Jégou, M. Douze and C. Schmid, “Product quantization for nearest neighbor search,” IEEE Transactions on Pattern Analysis and Machine Intelligence 33(1), 2011.", url: "" },
            { text: "J. Johnson, M. Douze and H. Jégou, “Billion-scale similarity search with GPUs,” IEEE Transactions on Big Data 7, 2021.", url: "" }
          ]
        },
        {
          name: "Hierarchical Navigable Small World (HNSW) graphs", year: 2016, stage: "production",
          time: "Empirically logarithmic query cost", space: "Θ(n · M) edges for M links per node",
          model: "Empirical: excellent recall versus speed on benchmarks, no worst-case guarantee.",
          idea: "Build a proximity graph and search it greedily, moving to whichever neighbor is closer to the query. Like a skip list, each node joins higher, sparser layers with exponentially decreasing probability, so the search takes long hops first and short ones last.",
          limit: "The graph and full vectors must sit in RAM, which caps one machine at a few hundred million vectors.",
          usedIn: "The default ANN index in many vector databases and libraries; for example, pgvector for PostgreSQL offers HNSW and IVFFlat indexes.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: ["sims/vector-search.html", "sims/skip-list.html"] },
          refs: [
            { text: "Y. A. Malkov and D. A. Yashunin, “Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs,” arXiv:1603.09320 (2016); IEEE Transactions on Pattern Analysis and Machine Intelligence 42(4), 2020.", url: "https://arxiv.org/abs/1603.09320" },
            { text: "pgvector documentation (index types: HNSW, IVFFlat).", url: "https://github.com/pgvector/pgvector" }
          ]
        },
        {
          name: "DiskANN (graph index on SSD)", year: 2019, stage: "production",
          time: "> 5000 queries/s at < 3 ms mean latency", space: "64 GB RAM plus an SSD for 10⁹ points",
          model: "Reported on the billion-point SIFT1B benchmark at ≥ 95% 1-recall@1.",
          idea: "The Vamana graph keeps long-range edges so searches need few hops; vectors and graph live on a Solid-State Drive (SSD), while compressed PQ codes in RAM steer the search.",
          limit: "Updates and filtered queries (“nearest red shoes”) are harder than plain search.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/vector-search.html" },
          refs: [{ text: "S. Jayaram Subramanya, Devvrit, R. Kadekodi, R. Krishnaswamy and H. V. Simhadri, “DiskANN: Fast Accurate Billion-point Nearest Neighbor Search on a Single Node,” NeurIPS 2019.", url: "https://www.microsoft.com/en-us/research/publication/diskann-fast-accurate-billion-point-nearest-neighbor-search-on-a-single-node/" }]
        },
        {
          name: "RaBitQ (quantization with error bounds)", year: 2024, stage: "frontier",
          time: "Bitwise distance estimates", space: "D bits per D-dimensional vector (plus small corrections)",
          model: "Randomized; the distance estimator is unbiased with a proven error bound.",
          idea: "Randomly rotate the space, keep one bit per coordinate, and estimate distances with an unbiased estimator whose error is provably small, so the system knows which candidates need exact re-ranking.",
          limit: "New; integration into large production systems is ongoing.",
          links: { lesson: "lessons/18-the-frontier/README.md", sim: "sims/vector-search.html" },
          refs: [{ text: "J. Gao and C. Long, “RaBitQ: Quantizing High-Dimensional Vectors with a Theoretical Error Bound for Approximate Nearest Neighbor Search,” SIGMOD 2024.", url: "https://arxiv.org/abs/2405.12497" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 11 */
    {
      id: "matrix-multiplication", title: "Matrix multiplication", glyph: "matrix",
      question: "How fast can we multiply two n × n matrices? The exponent ω, the best possible power of n, is one of the great open numbers of computer science.",
      blurb: "Everyone believes ω might be 2, but the best proven bounds creep down by tiny amounts using the same family of ideas (the laser method). Meanwhile practical libraries still run the cubic algorithm, extremely well tuned.",
      rungs: [
        {
          name: "Definition-based multiplication", year: null, stage: "first",
          time: "Θ(n³)", space: "Θ(n²)",
          idea: "Each of the n² output entries is a dot product of a row and a column: n multiplications each.",
          limit: "Cubic growth: doubling n makes the work eight times larger.",
          links: { lesson: "lessons/02-analysis-framework/README.md", sim: "sims/karatsuba-strassen.html", arena: ["matrix-multiply", "count-paths-length-k"], book: "Levitin §2.3" },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., 2012, §2.3.", url: "" }]
        },
        {
          name: "Strassen's algorithm", year: 1969, stage: "classic",
          time: "Θ(n^{log₂7}) ≈ O(n^2.81)", space: "Θ(n²)",
          idea: "Multiply 2 × 2 block matrices with 7 block products instead of 8, using extra additions, and recurse.",
          limit: "Worse numerical stability and big constants; only pays off for large matrices.",
          links: { lesson: "lessons/05-divide-and-conquer/README.md", sim: "sims/karatsuba-strassen.html", book: "Levitin §5.4" },
          refs: [{ text: "V. Strassen, “Gaussian elimination is not optimal,” Numerische Mathematik 13, 1969.", url: "" }]
        },
        {
          name: "Coppersmith–Winograd", year: 1990, stage: "advanced",
          time: "O(n^2.375477)", space: "Θ(n²)",
          idea: "Bound ω through the rank of a carefully built tensor and its large powers (the “laser method”), rather than through one explicit recursive formula.",
          limit: "A galactic algorithm: the constants are astronomically large, so nobody runs it.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "D. Coppersmith and S. Winograd, “Matrix multiplication via arithmetic progressions,” Journal of Symbolic Computation 9(3), 1990.", url: "" }]
        },
        {
          name: "Tuned cubic kernels (BLAS, GPUs)", year: 2008, stage: "production",
          time: "Θ(n³), cache-blocked", space: "Θ(n²)",
          idea: "Keep the cubic count but move data cleverly: pack blocks so they stay in cache and registers, and use vector units and Graphics Processing Units (GPUs). The constant factor, not the exponent, decides speed in practice.",
          limit: "Cannot beat n³ multiply-adds; it only reaches the hardware's peak.",
          usedIn: "Basic Linear Algebra Subprograms (BLAS) libraries behind NumPy, MATLAB and deep-learning frameworks.",
          links: { lesson: "lessons/17-senior-engineer-playbook/README.md" },
          refs: [{ text: "K. Goto and R. A. van de Geijn, “Anatomy of high-performance matrix multiplication,” ACM Transactions on Mathematical Software 34(3), 2008.", url: "" }]
        },
        {
          name: "Refined laser method", year: 2024, stage: "frontier",
          time: "O(n^2.371552)", space: "Θ(n²)",
          idea: "A decade of sharper analyses of the same tensor: Le Gall 2014 (ω < 2.3728639), Alman and Vassilevska Williams 2021 (ω < 2.3728596), Duan, Wu and Zhou 2023 (ω < 2.371866, “asymmetric hashing”), then Vassilevska Williams, Xu, Xu and Zhou (ω < 2.371552).",
          limit: "Each step is tiny, and the method is known to have limits of its own.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "R. Duan, H. Wu and R. Zhou, “Faster Matrix Multiplication via Asymmetric Hashing,” FOCS 2023.", url: "https://arxiv.org/abs/2210.10173" },
            { text: "V. Vassilevska Williams, Y. Xu, Z. Xu and R. Zhou, “New Bounds for Matrix Multiplication: from Alpha to Omega,” SODA 2024.", url: "https://arxiv.org/abs/2307.07970" }
          ]
        },
        {
          name: "More asymmetry", year: 2025, stage: "frontier",
          time: "O(n^2.371339)", space: "Θ(n²)",
          idea: "Let pieces of the tensor share variable blocks in two of the three dimensions instead of one, which loosens the analysis further.",
          limit: "Still galactic; ω = 2 remains open.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "J. Alman, R. Duan, V. Vassilevska Williams, Y. Xu, Z. Xu and R. Zhou, “More Asymmetry Yields Faster Matrix Multiplication,” SODA 2025.", url: "https://arxiv.org/abs/2404.16349" }]
        },
        {
          name: "Optimization-assisted laser method (preprint)", year: 2026, stage: "frontier",
          time: "O(n^2.371177)", space: "Θ(n²)",
          model: "Preprint (August 2026), not yet peer reviewed at the time of writing.",
          idea: "Recast the analysis as a numerical optimization problem, solve it with gradient methods and the AlphaEvolve system, and reach a deeper level of the recursion than before.",
          limit: "Pending peer review; the improvement over 2.371339 is about 0.00016.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "E. Dupont, M. Eisenberger, B. Kozlovskii, A. Mehrabian, F. J. R. Ruiz, A. See, R. Zhou, J. Alman, V. Vassilevska Williams and M. Balog, “Improving the matrix multiplication exponent with modern optimization and AlphaEvolve,” arXiv:2608.16884, 2026.", url: "https://arxiv.org/abs/2608.16884" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 12 */
    {
      id: "integer-multiplication", title: "Multiplying large integers", glyph: "number",
      question: "How fast can we multiply two n-digit (or n-bit) integers?",
      blurb: "Cryptography, computer algebra and record computations of π all multiply huge numbers. The schoolbook n² method stood until 1960; in 2019 the conjectured optimum n log n was reached.",
      rungs: [
        {
          name: "Schoolbook multiplication", year: null, stage: "first",
          time: "Θ(n²) digit operations", space: "Θ(n)",
          idea: "Multiply every digit of one number by every digit of the other and add the shifted rows.",
          limit: "Quadratic; Kolmogorov conjectured in the 1950s that this was optimal.",
          links: { lesson: "lessons/05-divide-and-conquer/README.md", sim: "sims/karatsuba-strassen.html", arena: ["russian-peasant"], book: "Levitin §5.4" },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., 2012, §5.4.", url: "" }]
        },
        {
          name: "Karatsuba's algorithm", year: 1962, stage: "classic",
          time: "Θ(n^{log₂3}) ≈ O(n^1.585)", space: "Θ(n)",
          idea: "Split each number in half; three half-size products are enough instead of four, because (a + b)(c + d) − ac − bd gives the middle term.",
          limit: "The exponent 1.585 is still far above 1.",
          links: { lesson: "lessons/05-divide-and-conquer/README.md", sim: "sims/karatsuba-strassen.html", arena: ["karatsuba-multiply"], book: "Levitin §5.4" },
          refs: [{ text: "A. Karatsuba and Yu. Ofman, “Multiplication of multidigit numbers on automata,” Doklady Akademii Nauk SSSR 145, 1962 (English: Soviet Physics Doklady 7, 1963).", url: "" }]
        },
        {
          name: "Toom–Cook", year: 1963, stage: "advanced",
          time: "Θ(n^{log₃5}) ≈ O(n^1.465) for 3-way splitting", space: "Θ(n)",
          idea: "Split into k parts, view them as polynomial coefficients, evaluate at 2k − 1 points, multiply the values, and interpolate back.",
          limit: "Larger k lowers the exponent but the evaluation and interpolation overhead grows.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "A. L. Toom, “The complexity of a scheme of functional elements realizing the multiplication of integers,” Soviet Mathematics Doklady 3, 1963.", url: "" },
            { text: "S. A. Cook, On the Minimum Computation Time of Functions, PhD thesis, Harvard University, 1966.", url: "" }
          ]
        },
        {
          name: "Schönhage–Strassen (FFT)", year: 1971, stage: "advanced",
          time: "O(n log n log log n) bit operations", space: "O(n)",
          model: "Multitape Turing machine (bit complexity).",
          idea: "Multiplying numbers is a convolution of their digit sequences; the Fast Fourier Transform (FFT) computes convolutions in O(n log n) arithmetic steps, done exactly over a ring of integers modulo 2^k + 1.",
          limit: "The log log n factor comes from recursion on the coefficient sizes.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "A. Schönhage and V. Strassen, “Schnelle Multiplikation großer Zahlen” (Fast multiplication of large numbers), Computing 7, 1971.", url: "" }]
        },
        {
          name: "GNU Multiple Precision (GMP) in practice", year: null, stage: "production",
          time: "Picks the algorithm by size", space: "O(n)",
          idea: "No single algorithm wins at every size: GMP uses basecase, Karatsuba, Toom-3, Toom-4, Toom-6.5, Toom-8.5 and an FFT method, each above a tuned size threshold.",
          limit: "Thresholds are machine-dependent and tuned empirically.",
          usedIn: "GMP underlies many computer-algebra systems and arbitrary-precision libraries.",
          links: { lesson: "lessons/17-senior-engineer-playbook/README.md" },
          refs: [{ text: "GNU MP manual, “Multiplication Algorithms.”", url: "https://gmplib.org/manual/Multiplication-Algorithms" }]
        },
        {
          name: "Fürer's algorithm", year: 2007, stage: "frontier",
          time: "O(n log n · 2^{O(log* n)}) bit operations", space: "O(n)",
          model: "Multitape Turing machine.",
          idea: "Use FFTs over a ring with very convenient roots of unity, so the recursion costs much less than Schönhage–Strassen's log log n factor.",
          limit: "Only better for astronomically large numbers.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "M. Fürer, “Faster integer multiplication,” STOC 2007; SIAM Journal on Computing 39(3), 2009.", url: "https://doi.org/10.1137/070711761" }]
        },
        {
          name: "Harvey–van der Hoeven", year: 2019, stage: "frontier",
          time: "O(n log n) bit operations", space: "O(n)",
          model: "Multitape Turing machine; widely conjectured to be optimal.",
          idea: "Turn one huge one-dimensional FFT into a multidimensional one with carefully chosen sizes (via Gaussian resampling), so the recursion overhead disappears entirely.",
          limit: "A galactic algorithm: it only wins for numbers far larger than anything that fits in a computer.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "D. Harvey and J. van der Hoeven, “Integer multiplication in time O(n log n),” Annals of Mathematics 193(2), 2021 (preprint 2019).", url: "https://www.texmacs.org/joris/nlogn/nlogn-abs.html" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 13 */
    {
      id: "distinct-counting", title: "Counting distinct items in a stream", glyph: "stream",
      question: "How many different items appeared in a stream of billions, if we may keep only a few kilobytes?",
      blurb: "Unique visitors, distinct Internet Protocol (IP) addresses and query planning all need distinct counts. Exact answers need memory proportional to the answer; sketches trade a small, quantified error for kilobytes.",
      rungs: [
        {
          name: "Exact set (hash set or sort)", year: null, stage: "first",
          time: "Θ(N) expected for N stream items", space: "Θ(n) for n distinct items",
          idea: "Remember every distinct item seen, in a hash set (or sort and count).",
          limit: "Memory grows with the answer: a billion distinct IDs need gigabytes.",
          links: { sim: "sims/streaming-sketches.html", lesson: "lessons/06-transform-and-conquer/README.md", arena: ["element-uniqueness-brute", "presort-uniqueness"] },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., 2012, §6.1.", url: "" }]
        },
        {
          name: "Flajolet–Martin probabilistic counting", year: 1983, stage: "classic",
          time: "O(1) per item", space: "O(log n) bits per sketch",
          idea: "Hash every item to random bits; a hash ending in k zero bits shows up about once per 2^k distinct items, so the patterns of trailing zeros seen estimate log₂ of the count. Duplicates hash the same, so they change nothing.",
          limit: "One sketch is noisy; averaging many costs time.",
          links: { lesson: "lessons/16-randomized-amortized-streaming/README.md" },
          refs: [{ text: "P. Flajolet and G. N. Martin, “Probabilistic counting,” FOCS 1983; “Probabilistic counting algorithms for data base applications,” Journal of Computer and System Sciences 31(2), 1985.", url: "" }]
        },
        {
          name: "LogLog", year: 2003, stage: "advanced",
          time: "O(1) per item", space: "m small registers; standard error about 1.30/√m",
          idea: "Split the stream into m buckets by a few hash bits; each register keeps the maximum position of the first 1-bit; combine registers with a geometric mean.",
          limit: "The geometric mean is sensitive to outlier registers.",
          links: { lesson: "lessons/16-randomized-amortized-streaming/README.md" },
          refs: [{ text: "M. Durand and P. Flajolet, “Loglog counting of large cardinalities,” ESA 2003.", url: "" }]
        },
        {
          name: "HyperLogLog (HLL)", year: 2007, stage: "production",
          time: "O(1) per item", space: "m registers of about 6 bits; standard error about 1.04/√m",
          idea: "LogLog with a harmonic mean, which tames outliers: cardinalities beyond 10⁹ with about 2% error in 1.5 KB. Two sketches merge by taking register-wise maxima.",
          limit: "Biased for small counts, and 32-bit hashes collide at huge counts.",
          usedIn: "Redis HyperLogLog sketches (PFADD, PFCOUNT) and many analytics systems.",
          links: { sim: "sims/streaming-sketches.html", lesson: "lessons/16-randomized-amortized-streaming/README.md", arena: ["hyperloglog-estimate"] },
          refs: [
            { text: "P. Flajolet, É. Fusy, O. Gandouet and F. Meunier, “HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm,” AofA 2007, DMTCS Proceedings.", url: "https://dmtcs.episciences.org/3545" },
            { text: "Redis documentation, “HyperLogLog.”", url: "https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/" }
          ]
        },
        {
          name: "HyperLogLog++", year: 2013, stage: "production",
          time: "O(1) per item", space: "Sparse representation for small counts, then HLL registers",
          idea: "Engineering for production: 64-bit hashes, an empirical bias correction for mid-range counts, and a sparse encoding that saves memory while the count is small.",
          limit: "Still about 1.04/√m relative error; not mergeable with exact subtraction (intersections are hard).",
          usedIn: "Google BigQuery's HyperLogLog++ functions.",
          links: { sim: "sims/streaming-sketches.html", lesson: "lessons/16-randomized-amortized-streaming/README.md", arena: ["hyperloglog-estimate"] },
          refs: [
            { text: "S. Heule, M. Nunkesser and A. Hall, “HyperLogLog in Practice: Algorithmic Engineering of a State of The Art Cardinality Estimation Algorithm,” EDBT 2013.", url: "https://research.google/pubs/hyperloglog-in-practice-algorithmic-engineering-of-a-state-of-the-art-cardinality-estimation-algorithm/" },
            { text: "Google BigQuery documentation, “HyperLogLog++ functions.”", url: "https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/hll_functions" }
          ]
        },
        {
          name: "Optimal distinct elements (Kane–Nelson–Woodruff)", year: 2010, stage: "frontier",
          time: "O(1) worst-case update and query", space: "O(ε⁻² + log n) bits",
          model: "(1 ± ε)-approximation with constant success probability; matches the known lower bound.",
          idea: "Combine a rough constant-factor estimate with a carefully compressed array of small counters, so no space is wasted on either part.",
          limit: "Optimal in theory, but more complex than HyperLogLog, which dominates practice.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "D. M. Kane, J. Nelson and D. P. Woodruff, “An optimal algorithm for the distinct elements problem,” PODS 2010.", url: "" }]
        },
        {
          name: "CVM: counting by sampling", year: 2022, stage: "frontier",
          time: "O(1) amortized expected per item", space: "O(ε⁻² · log n · (log m + log(1/δ))) bits for a stream of m items",
          model: "(1 ± ε)-approximation with probability at least 1 − δ; needs only random coin flips, no hash functions.",
          idea: "Keep a buffer of items, each kept with probability p. When the buffer fills, flip a coin for every item to evict about half, and halve p. At the end, the estimate is (buffer size) / p.",
          limit: "Considerably more memory than HyperLogLog: it stores sampled items (about log n bits each) in a buffer of ⌈12 ε⁻² log(8m/δ)⌉ slots, not tiny registers. Its appeal is simplicity and a short proof.",
          links: { sim: "sims/streaming-sketches.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "S. Chakraborty, N. V. Vinodchandran and K. S. Meel, “Distinct Elements in Streams: An Algorithm for the (Text) Book,” ESA 2022, LIPIcs 244.", url: "https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ESA.2022.34" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 14 */
    {
      id: "traveling-salesman", title: "Traveling Salesman Problem (TSP)", glyph: "geometry",
      question: "What is the shortest tour that visits every city exactly once and returns home?",
      blurb: "TSP is NP-hard, so the ladder splits: exact algorithms that are exponential, approximation algorithms with proven ratios for metric distances, and heuristics that are excellent in practice. The 1976 ratio of 1.5 was finally beaten in 2021.",
      rungs: [
        {
          name: "Exhaustive search", year: null, stage: "first",
          time: "Θ(n!)", space: "Θ(n)",
          idea: "Try every ordering of the cities and keep the shortest tour.",
          limit: "20 cities already give about 6 × 10¹⁶ different tours (start fixed, direction ignored).",
          links: { lesson: "lessons/03-brute-force/README.md", sim: "sims/exhaustive-search.html", arena: ["tsp-exhaustive"], book: "Levitin §3.4" },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., 2012, §3.4.", url: "" }]
        },
        {
          name: "Held–Karp dynamic programming", year: 1962, stage: "classic",
          time: "Θ(n² 2^n)", space: "Θ(n 2^n)",
          idea: "Best path that starts at city 1, visits exactly the set S and ends at city j: compute it for growing sets S from smaller ones.",
          limit: "Still exponential; memory runs out around 30 cities.",
          links: { lesson: "lessons/15-dp-and-interview-patterns/README.md", arena: ["held-karp-tsp"] },
          refs: [{ text: "M. Held and R. M. Karp, “A dynamic programming approach to sequencing problems,” Journal of the Society for Industrial and Applied Mathematics 10(1), 1962.", url: "" }]
        },
        {
          name: "Twice-around-the-tree (2-approximation)", year: 1977, stage: "classic",
          time: "O(n²) on a complete graph", space: "O(n²)",
          model: "Metric distances (triangle inequality). The nearest-neighbor heuristic, by contrast, has no constant ratio.",
          idea: "A Minimum Spanning Tree (MST) costs less than the best tour; walk around the tree and skip repeated cities. Shortcuts never lengthen the walk, so the tour is at most twice optimal.",
          limit: "A factor of 2 is a lot.",
          links: { lesson: "lessons/12-coping-with-limitations/README.md", sim: "sims/tsp-approx.html", arena: ["tsp-nearest-neighbor", "tsp-twice-around-tree"], book: "Levitin §12.3" },
          refs: [{ text: "D. J. Rosenkrantz, R. E. Stearns and P. M. Lewis II, “An analysis of several heuristics for the traveling salesman problem,” SIAM Journal on Computing 6(3), 1977.", url: "" }]
        },
        {
          name: "Christofides–Serdyukov (1.5-approximation)", year: 1976, stage: "advanced",
          time: "O(n³), dominated by minimum-weight perfect matching", space: "O(n²)",
          model: "Metric distances.",
          idea: "Instead of doubling the MST, add a cheapest perfect matching on the tree's odd-degree vertices; the matching costs at most half a tour, so the Euler tour after shortcuts costs at most 1.5 × optimal. Found independently by Christofides and by Serdyukov in 1976.",
          limit: "For 45 years nobody could prove anything better than 1.5 for general metrics.",
          links: { lesson: "lessons/12-coping-with-limitations/README.md", sim: "sims/tsp-approx.html", book: "Levitin §12.3" },
          refs: [
            { text: "N. Christofides, “Worst-case analysis of a new heuristic for the travelling salesman problem,” Report 388, Graduate School of Industrial Administration, Carnegie Mellon University, 1976.", url: "" },
            { text: "R. van Bevern and V. A. Slugina, “A historical note on the 3/2-approximation algorithm for the metric traveling salesman problem,” Historia Mathematica 53, 2020 (on Serdyukov's independent discovery).", url: "https://www.sciencedirect.com/science/article/pii/S0315086020300240" }
          ]
        },
        {
          name: "Lin–Kernighan–Helsgaun heuristic and Concorde", year: 2000, stage: "production",
          time: "No guarantee; near-optimal in practice", space: "O(n) to O(n²)",
          idea: "LKH improves a tour with deep sequences of edge exchanges guided by a lower-bound structure; the Concorde solver proves optimality with linear programming and cutting planes (branch-and-cut).",
          limit: "Heuristics give no certificate; exact solving can still blow up.",
          usedIn: "Concorde has solved every TSPLIB benchmark instance optimally, the largest with 85,900 cities.",
          links: { lesson: "lessons/12-coping-with-limitations/README.md", sim: "sims/branch-and-bound.html" },
          refs: [
            { text: "K. Helsgaun, “An effective implementation of the Lin–Kernighan traveling salesman heuristic,” European Journal of Operational Research 126(1), 2000.", url: "" },
            { text: "D. Applegate, R. Bixby, V. Chvátal and W. Cook, Concorde TSP Solver.", url: "https://www.math.uwaterloo.ca/tsp/concorde.html" }
          ]
        },
        {
          name: "Slightly better than 1.5", year: 2021, stage: "frontier",
          time: "Polynomial time", space: "Polynomial",
          model: "Randomized; metric distances; approximation ratio 3/2 − ε for some ε > 10⁻³⁶.",
          idea: "Sample a random spanning tree from the “max-entropy” distribution guided by the linear-programming relaxation, then fix odd degrees as Christofides does; the randomness makes the expected matching cost strictly less than half the optimum.",
          limit: "The improvement is astronomically small; its importance is that the 1.5 barrier was not fundamental.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "A. R. Karlin, N. Klein and S. Oveis Gharan, “A (Slightly) Improved Approximation Algorithm for Metric TSP,” STOC 2021.", url: "https://doi.org/10.1145/3406325.3451009" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 15 */
    {
      id: "linear-programming", title: "Linear Programming (LP)", glyph: "optimize",
      question: "Maximize a linear objective subject to linear inequality constraints.",
      blurb: "LP schedules airlines, routes goods and sits inside branch-and-bound for harder problems. The algorithm that works best in practice (simplex) has exponential worst cases, and the polynomial ones took decades to become practical.",
      rungs: [
        {
          name: "Check every vertex", year: null, stage: "first",
          time: "Up to C(n, m) vertices", space: "Polynomial",
          model: "n variables and m equality constraints in standard form.",
          idea: "An optimum, if one exists, sits at a vertex (extreme point) of the feasible region, so evaluate all vertices.",
          limit: "The number of vertices grows exponentially.",
          links: { lesson: "lessons/10-iterative-improvement/README.md", book: "Levitin §10.1" },
          refs: [{ text: "A. Levitin, Introduction to the Design and Analysis of Algorithms, 3rd ed., 2012, §10.1 (extreme point theorem).", url: "" }]
        },
        {
          name: "Simplex method", year: 1947, stage: "classic",
          time: "Exponential worst case; fast in practice", space: "Polynomial",
          idea: "Walk from vertex to adjacent vertex, always improving the objective, until no neighbor is better. Smoothed analysis (Spielman–Teng, 2004) explains why it is fast: tiny random perturbations make the expected number of steps polynomial.",
          limit: "Some inputs force exponentially many steps for common pivot rules.",
          usedIn: "Dual simplex is a workhorse inside commercial and open-source solvers.",
          links: { lesson: "lessons/10-iterative-improvement/README.md", sim: "sims/simplex.html", arena: ["simplex-max-2var"], book: "Levitin §10.1" },
          refs: [
            { text: "G. B. Dantzig, “Maximization of a linear function of variables subject to linear inequalities,” in Activity Analysis of Production and Allocation, Wiley, 1951 (method devised in 1947).", url: "" },
            { text: "V. Klee and G. J. Minty, “How good is the simplex algorithm?,” in Inequalities III, Academic Press, 1972.", url: "" },
            { text: "D. A. Spielman and S.-H. Teng, “Smoothed analysis of algorithms: Why the simplex algorithm usually takes polynomial time,” Journal of the ACM 51(3), 2004.", url: "" }
          ]
        },
        {
          name: "Ellipsoid method", year: 1979, stage: "advanced",
          time: "Polynomial in the input size", space: "Polynomial",
          idea: "Enclose the feasible region in an ellipsoid and shrink it around a violated constraint, step by step. The first proof that LP is solvable in polynomial time.",
          limit: "Very slow in practice; its lasting value is in theory (it only needs a separation oracle).",
          links: { lesson: "lessons/11-limitations/README.md" },
          refs: [{ text: "L. G. Khachiyan, “A polynomial algorithm in linear programming,” Soviet Mathematics Doklady 20, 1979.", url: "" }]
        },
        {
          name: "Interior-point methods", year: 1984, stage: "production",
          time: "O(n^{3.5} L) arithmetic operations", space: "Polynomial",
          model: "Karmarkar's bound; L is the number of bits in the input.",
          idea: "Move through the inside of the feasible region along a “central path”, using Newton steps on a barrier function that keeps you away from the walls.",
          limit: "Each step solves a large linear system, which limits the size of problems that fit.",
          usedIn: "Barrier solvers in commercial and open-source LP software.",
          links: { lesson: "lessons/10-iterative-improvement/README.md" },
          refs: [{ text: "N. Karmarkar, “A new polynomial-time algorithm for linear programming,” Combinatorica 4(4), 1984.", url: "" }]
        },
        {
          name: "First-order LP at scale (PDLP)", year: 2021, stage: "production",
          time: "Each iteration is a few matrix-vector products", space: "Linear in the number of nonzeros",
          idea: "Primal-dual hybrid gradient with diagonal preconditioning and adaptive restarts: no matrix factorizations, so it scales to huge sparse problems and runs on GPUs.",
          limit: "Converges slowly to very high accuracy on some hard instances.",
          usedIn: "Google's open-source OR-Tools; variants in COPT, FICO Xpress, HiGHS and NVIDIA cuOpt.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "D. Applegate, M. Díaz, O. Hinder, H. Lu, M. Lubin, B. O'Donoghue and W. Schudy, “Practical Large-Scale Linear Programming using Primal-Dual Hybrid Gradient,” NeurIPS 2021.", url: "https://papers.nips.cc/paper_files/paper/2021/hash/a8fbbd3b11424ce032ba813493d95ad7-Abstract.html" },
            { text: "D. Applegate et al., “PDLP: A Practical First-Order Method for Large-Scale Linear Programming,” arXiv:2501.07018, 2025 (lists the solvers that adopted it).", url: "https://arxiv.org/abs/2501.07018" }
          ]
        },
        {
          name: "LP in matrix-multiplication time", year: 2019, stage: "frontier",
          time: "Õ(n^ω log(n/δ))", space: "Polynomial",
          model: "Randomized. The full bound is Õ((n^ω + n^{2.5 − α/2} + n^{2+1/6}) log(n/δ)), which equals Õ(n^ω log(n/δ)) for today's ω and α; δ is the accuracy and n the number of variables.",
          idea: "An interior-point method that changes the central-path system only a little each step, so a clever data structure updates the inverse lazily instead of recomputing it. Solving an LP becomes about as hard as one linear system.",
          limit: "Theory only; practical solvers still use simplex, barrier and first-order methods.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "M. B. Cohen, Y. T. Lee and Z. Song, “Solving Linear Programs in the Current Matrix Multiplication Time,” STOC 2019.", url: "https://arxiv.org/abs/1810.07896" }]
        }
      ]
    },

    /* ------------------------------------------------------------------ 16 */
    {
      id: "consensus", title: "Consensus and replicated logs", glyph: "graph",
      question: "How can several servers agree on one ordered log of commands, even when some of them crash?",
      blurb: "Every highly available database, lock service and cluster manager keeps a replicated log. A famous impossibility result (Fischer, Lynch and Paterson, 1985) says no deterministic protocol can guarantee to reach agreement in a fully asynchronous network with even one crash, so practical protocols are always safe and make progress when the network behaves.",
      rungs: [
        {
          name: "One server with a Write-Ahead Log (WAL)", year: 1978, stage: "first",
          time: "One disk write per command", space: "The log",
          idea: "Append each command to a log on disk before applying it; after a crash, replay the log to rebuild the state.",
          limit: "Durable but not available: when the single server is down, everything is down.",
          links: { lesson: "lessons/17-senior-engineer-playbook/README.md", arena: ["wal-recovery-undo-redo"] },
          refs: [
            { text: "J. Gray, “Notes on Data Base Operating Systems,” in R. Bayer, R. M. Graham and G. Seegmüller (eds.), Operating Systems, LNCS 60, Springer, 1978 (defines the write-ahead log protocol).", url: "" },
            { text: "B. G. Lindsay, “Jim Gray at IBM: the transaction processing revolution,” ACM SIGMOD Record 37(2), 2008 (history: “Jim Gray defined the Write Ahead Log (WAL) protocol”).", url: "https://sigmodrecord.org/publications/sigmodRecord/0806/p38.lindsay.pdf" },
            { text: "C. Mohan, D. Haderle, B. Lindsay, H. Pirahesh and P. Schwarz, “ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging,” ACM Transactions on Database Systems 17(1), 1992 (the standard modern formulation).", url: "" }
          ]
        },
        {
          name: "Two-Phase Commit (2PC)", year: 1978, stage: "classic",
          time: "Two message rounds per transaction", space: "A log at every participant",
          idea: "A coordinator asks every participant to prepare; only if all vote yes does it tell them to commit.",
          limit: "Blocking: if the coordinator crashes at the wrong moment, participants wait, unable to decide.",
          links: { lesson: "lessons/17-senior-engineer-playbook/README.md" },
          refs: [
            { text: "J. Gray, “Notes on Data Base Operating Systems,” in R. Bayer, R. M. Graham and G. Seegmüller (eds.), Operating Systems, LNCS 60, Springer, 1978.", url: "" },
            { text: "M. J. Fischer, N. A. Lynch and M. S. Paterson, “Impossibility of distributed consensus with one faulty process,” Journal of the ACM 32(2), 1985.", url: "" }
          ]
        },
        {
          name: "Paxos", year: 1989, stage: "advanced",
          time: "Two round trips per decision; one with a stable leader", space: "A log at every replica",
          idea: "Any two majorities of 2f + 1 servers overlap, so a value accepted by a majority can never be lost. Proposals carry ballot numbers, and a new proposer must first learn and respect any value that might already have been chosen. Safe under any crash pattern with message delays; tolerates f crashes.",
          limit: "Notoriously hard to understand and to turn into a complete system (leader election, log compaction, membership changes).",
          links: { sim: "sims/raft-consensus.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "L. Lamport, “The Part-Time Parliament,” Digital Equipment Corporation Systems Research Center (DEC SRC) Research Report 49, September 1989; ACM Transactions on Computer Systems 16(2), 1998.", url: "https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf" }]
        },
        {
          name: "Paxos in production (Chubby)", year: 2006, stage: "production",
          time: "One round trip to a majority per command", space: "Replicated log and snapshots",
          idea: "A lock service and small file store replicated over five servers with Paxos, giving many other systems a reliable place for leader election and configuration.",
          limit: "Turning the Paxos paper into a production system took substantial engineering, described in “Paxos Made Live” (2007).",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "M. Burrows, “The Chubby lock service for loosely-coupled distributed systems,” OSDI 2006.", url: "https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/" },
            { text: "T. D. Chandra, R. Griesemer and J. Redstone, “Paxos made live: an engineering perspective,” PODC 2007.", url: "" }
          ]
        },
        {
          name: "Raft", year: 2014, stage: "production",
          time: "One round trip from the leader to a majority per command", space: "Replicated log and snapshots",
          idea: "Designed for understandability: a strong leader, randomized election timeouts, and a log-matching rule (each append names the index and term of the entry before it, so followers reject gaps and conflicts). Equivalent to Paxos in fault tolerance and performance.",
          limit: "Every write goes through one leader, which caps throughput and adds a round trip for distant clients.",
          usedIn: "etcd (the store behind Kubernetes clusters) “uses the Raft consensus algorithm to manage a highly-available replicated log.”",
          links: { sim: "sims/raft-consensus.html", lesson: "lessons/18-the-frontier/README.md" },
          refs: [
            { text: "D. Ongaro and J. Ousterhout, “In Search of an Understandable Consensus Algorithm,” USENIX ATC 2014.", url: "https://www.usenix.org/conference/atc14/technical-sessions/presentation/ongaro" },
            { text: "The Raft Consensus Algorithm (official site with visualization and implementations).", url: "https://raft.github.io/" },
            { text: "etcd README.", url: "https://github.com/etcd-io/etcd" }
          ]
        },
        {
          name: "Flexible Paxos", year: 2016, stage: "frontier",
          time: "Multi-Paxos messages, smaller write quorums", space: "Replicated log",
          idea: "Majorities everywhere are more than necessary: only the leader-election quorums must intersect the replication quorums. Replication can use small quorums (fast) if elections use correspondingly large ones (rare).",
          limit: "Choosing quorums is a new design dimension with its own failure trade-offs.",
          links: { lesson: "lessons/18-the-frontier/README.md" },
          refs: [{ text: "H. Howard, D. Malkhi and A. Spiegelman, “Flexible Paxos: Quorum intersection revisited,” OPODIS 2016.", url: "https://arxiv.org/pdf/1608.06696" }]
        }
      ]
    }
  ]
};
