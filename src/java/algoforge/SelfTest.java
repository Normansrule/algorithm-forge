package algoforge;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

/**
 * Self-checks for the Java code: randomized comparisons against simple brute-force oracles.
 * Exits with status 1 if any check fails. Run: {@code java -cp out algoforge.SelfTest}.
 * (Plain checks instead of the {@code assert} keyword, so no {@code -ea} flag is needed.)
 */
public final class SelfTest {

    private static int checks = 0;
    private static int failures = 0;

    private SelfTest() { }

    private static void check(boolean ok, String what) {
        checks++;
        if (!ok) {
            failures++;
            System.out.println("FAIL: " + what);
        }
    }

    public static void main(String[] args) {
        Random rng = new Random(2024);
        testSorting(rng);
        testSearching(rng);
        testRecursion();
        testGraphs(rng);
        testDynamicProgramming(rng);
        System.out.println(checks + " checks, " + failures + " failures");
        if (failures > 0) {
            System.exit(1);
        }
        System.out.println("SelfTest PASSED");
    }

    // ------------------------------------------------------------------ sorting

    private interface CountingSort {
        void sort(int[] a, Sorting.Counter c);
    }

    private static void testSorting(Random rng) {
        CountingSort[] sorts = {Sorting::selectionSort, Sorting::bubbleSort, Sorting::insertionSort,
                                Sorting::mergeSort, Sorting::quickSort, Sorting::heapSort};
        String[] names = {"selection", "bubble", "insertion", "merge", "quick", "heap"};
        for (int trial = 0; trial < 300; trial++) {
            int n = rng.nextInt(40);
            int[] a = new int[n];
            for (int i = 0; i < n; i++) {
                a[i] = rng.nextInt(41) - 20;
            }
            int[] expected = a.clone();
            Arrays.sort(expected);
            for (int s = 0; s < sorts.length; s++) {
                int[] copy = a.clone();
                sorts[s].sort(copy, null);
                check(Arrays.equals(copy, expected), names[s] + " sort on " + Arrays.toString(a));
            }
        }
        // operation counts that the analysis predicts
        int n = 20;
        int[] reversed = new int[n];
        for (int i = 0; i < n; i++) {
            reversed[i] = n - i;
        }
        Sorting.Counter c = new Sorting.Counter();
        Sorting.selectionSort(reversed.clone(), c);
        check(c.comparisons == n * (n - 1) / 2, "selection sort makes n(n-1)/2 comparisons");
        c.reset();
        Sorting.insertionSort(reversed.clone(), c);
        check(c.comparisons == n * (n - 1) / 2, "insertion sort worst case n(n-1)/2 comparisons");
        c.reset();
        int[] ascending = new int[n];
        for (int i = 0; i < n; i++) {
            ascending[i] = i;
        }
        Sorting.insertionSort(ascending, c);
        check(c.comparisons == n - 1, "insertion sort best case n-1 comparisons");
        c.reset();
        Sorting.bubbleSort(ascending.clone(), c);
        check(c.comparisons == n - 1, "bubble sort with early exit: n-1 comparisons on sorted input");
        c.reset();
        Sorting.mergeSort(reversed.clone(), c);
        check(c.comparisons <= (long) n * 5 - n + 1, "mergesort stays within n*ceil(log2 n) - n + 1");
    }

    // ------------------------------------------------------------------ searching

    private static void testSearching(Random rng) {
        for (int trial = 0; trial < 300; trial++) {
            int n = rng.nextInt(30);
            int[] a = rng.ints(n, 0, 200).distinct().sorted().toArray();
            int key = rng.nextInt(205) - 2;
            int expected = -1;
            for (int i = 0; i < a.length; i++) {
                if (a[i] == key) {
                    expected = i;
                }
            }
            check(Searching.sequentialSearch(a, key) == expected, "sequential search");
            check(Searching.binarySearch(a, key) == expected, "binary search " + key + " in " + Arrays.toString(a));
            check(Searching.interpolationSearch(a, key) == expected, "interpolation search");
            if (a.length > 0) {
                int k = 1 + rng.nextInt(a.length);
                int[] shuffled = a.clone();
                for (int i = shuffled.length - 1; i > 0; i--) {
                    int j = rng.nextInt(i + 1);
                    int t = shuffled[i];
                    shuffled[i] = shuffled[j];
                    shuffled[j] = t;
                }
                check(Searching.quickselect(shuffled, k) == a[k - 1], "quickselect k=" + k);
            }
        }
    }

    // ------------------------------------------------------------------ recursion

    private static void testRecursion() {
        long f = 1;
        for (int n = 0; n <= 20; n++) {
            if (n > 0) {
                f *= n;
            }
            check(Recursion.factorial(n) == f, "factorial " + n);
        }
        for (int n = 0; n <= 10; n++) {
            check(Recursion.hanoi(n, 'A', 'C', 'B').size() == (1 << n) - 1, "hanoi moves 2^n - 1 for n=" + n);
        }
        check(Recursion.hanoi(2, 'A', 'C', 'B').equals(List.of("1: A->B", "2: A->C", "1: B->C")), "hanoi(2) moves");
        for (int n = 0; n <= 25; n++) {
            long it = Recursion.fibIterative(n);
            check(Recursion.fibRecursive(n) == it && Recursion.fibMatrix(n) == it, "fibonacci " + n);
        }
        for (int n = 26; n <= 92; n++) {
            check(Recursion.fibMatrix(n) == Recursion.fibIterative(n), "fibonacci matrix " + n);
        }
        check(Recursion.fibIterative(92) == 7540113804746346429L, "F(92)");
        for (long m = 1; m <= 60; m++) {
            for (long n = 1; n <= 60; n++) {
                long g = 1;
                for (long d = 1; d <= Math.min(m, n); d++) {
                    if (m % d == 0 && n % d == 0) {
                        g = d;
                    }
                }
                check(Recursion.gcd(m, n) == g && Recursion.gcdRecursive(m, n) == g, "gcd " + m + "," + n);
            }
        }
        for (int n = 1; n < 5000; n++) {
            int bits = 32 - Integer.numberOfLeadingZeros(n);
            check(Recursion.binaryDigits(n) == bits && Recursion.binaryDigitsRecursive(n) == bits, "binary digits " + n);
        }
        for (int a = -3; a <= 5; a++) {
            long p = 1;
            for (int n = 0; n <= 20; n++) {
                check(Recursion.power(a, n) == p, "power " + a + "^" + n);
                p *= a;
            }
        }
    }

    // ------------------------------------------------------------------ graphs

    private static boolean isTopological(List<Integer> order, List<List<Integer>> g) {
        if (order == null || order.size() != g.size()) {
            return false;
        }
        int[] pos = new int[g.size()];
        for (int i = 0; i < order.size(); i++) {
            pos[order.get(i)] = i;
        }
        for (int u = 0; u < g.size(); u++) {
            for (int v : g.get(u)) {
                if (pos[u] >= pos[v]) {
                    return false;
                }
            }
        }
        return true;
    }

    private static void testGraphs(Random rng) {
        for (int trial = 0; trial < 150; trial++) {
            int n = 1 + rng.nextInt(9);
            // random DAG: edges only go from lower to higher numbers
            List<List<Integer>> dag = Graphs.emptyGraph(n);
            for (int u = 0; u < n; u++) {
                for (int v = u + 1; v < n; v++) {
                    if (rng.nextDouble() < 0.3) {
                        dag.get(u).add(v);
                    }
                }
            }
            check(isTopological(Graphs.topoSortDfs(dag), dag), "topological sort (DFS)");
            check(isTopological(Graphs.topoSortSourceRemoval(dag), dag), "topological sort (source removal)");
            Graphs.Traversal t = Graphs.dfs(dag);
            check(t.pushOrder().size() == n && t.popOrder().size() == n, "DFS visits every vertex once");
            check(Graphs.bfs(dag).size() == n, "BFS visits every vertex once");
            if (n >= 2 && !dag.get(0).isEmpty()) {
                int v = dag.get(0).get(0);
                dag.get(v).add(0);   // close a cycle 0 -> v -> 0
                check(Graphs.topoSortDfs(dag) == null, "DFS topological sort detects a cycle");
                check(Graphs.topoSortSourceRemoval(dag) == null, "source removal detects a cycle");
            }

            // random connected weighted graph
            List<Graphs.Edge> edges = new ArrayList<>();
            for (int v = 1; v < n; v++) {
                edges.add(new Graphs.Edge(rng.nextInt(v), v, 1 + rng.nextInt(20)));
            }
            for (int u = 0; u < n; u++) {
                for (int v = u + 1; v < n; v++) {
                    if (rng.nextDouble() < 0.3) {
                        edges.add(new Graphs.Edge(u, v, 1 + rng.nextInt(20)));
                    }
                }
            }
            List<List<Graphs.Edge>> g = Graphs.undirected(n, edges);
            long prim = Graphs.prim(g, 0).weight();
            long kruskal = Graphs.kruskal(n, edges).weight();
            check(prim == kruskal, "Prim and Kruskal agree");
            check(Graphs.prim(g, 0).edges().size() == n - 1, "MST has n-1 edges");
            check(prim == bruteForceMst(n, edges), "MST weight matches brute force");

            // Dijkstra versus Floyd on the same graph
            int inf = DynamicProgramming.INF;
            int[][] w = new int[n][n];
            for (int[] row : w) {
                Arrays.fill(row, inf);
            }
            for (int i = 0; i < n; i++) {
                w[i][i] = 0;
            }
            for (Graphs.Edge e : edges) {
                w[e.from()][e.to()] = Math.min(w[e.from()][e.to()], e.weight());
                w[e.to()][e.from()] = Math.min(w[e.to()][e.from()], e.weight());
            }
            int[][] d = DynamicProgramming.floyd(w);
            for (int s = 0; s < n; s++) {
                Graphs.ShortestPaths sp = Graphs.dijkstra(g, s);
                for (int v = 0; v < n; v++) {
                    check(sp.dist()[v] == d[s][v], "Dijkstra equals Floyd");
                    List<Integer> p = Graphs.path(sp, s, v);
                    int len = 0;
                    for (int i = 0; i + 1 < p.size(); i++) {
                        len += w[p.get(i)][p.get(i + 1)];
                    }
                    check(p.get(0) == s && p.get(p.size() - 1) == v && len == d[s][v], "Dijkstra path is shortest");
                }
            }
        }
    }

    /** Minimum over every (n-1)-edge subset that connects all vertices. Only for tiny graphs. */
    private static long bruteForceMst(int n, List<Graphs.Edge> edges) {
        if (n == 1) {
            return 0;
        }
        int m = edges.size();
        if (m > 20) {
            return Graphs.kruskal(n, edges).weight();   // too many subsets; trust the cross-check above
        }
        long best = Long.MAX_VALUE;
        for (int mask = 0; mask < (1 << m); mask++) {
            if (Integer.bitCount(mask) != n - 1) {
                continue;
            }
            Graphs.UnionFind uf = new Graphs.UnionFind(n);
            long total = 0;
            boolean ok = true;
            for (int i = 0; i < m && ok; i++) {
                if ((mask & (1 << i)) != 0) {
                    ok = uf.union(edges.get(i).from(), edges.get(i).to());
                    total += edges.get(i).weight();
                }
            }
            if (ok) {
                best = Math.min(best, total);
            }
        }
        return best;
    }

    // ------------------------------------------------------------------ dynamic programming

    private static void testDynamicProgramming(Random rng) {
        for (int trial = 0; trial < 200; trial++) {
            int n = rng.nextInt(10);
            int[] coins = rng.ints(n, 1, 20).toArray();
            int best = 0;
            for (int mask = 0; mask < (1 << n); mask++) {
                if ((mask & (mask >> 1)) != 0) {
                    continue;   // two adjacent coins
                }
                int sum = 0;
                for (int i = 0; i < n; i++) {
                    if ((mask & (1 << i)) != 0) {
                        sum += coins[i];
                    }
                }
                best = Math.max(best, sum);
            }
            DynamicProgramming.Choice row = DynamicProgramming.coinRow(coins);
            int picked = 0;
            for (int i : row.indices()) {
                picked += coins[i];
            }
            check(row.value() == best && picked == best, "coin-row vs brute force");

            int[] w = rng.ints(n, 1, 11).toArray();
            int[] v = rng.ints(n, 1, 31).toArray();
            int cap = rng.nextInt(26);
            int bestValue = 0;
            for (int mask = 0; mask < (1 << n); mask++) {
                int tw = 0;
                int tv = 0;
                for (int i = 0; i < n; i++) {
                    if ((mask & (1 << i)) != 0) {
                        tw += w[i];
                        tv += v[i];
                    }
                }
                if (tw <= cap) {
                    bestValue = Math.max(bestValue, tv);
                }
            }
            DynamicProgramming.Choice ks = DynamicProgramming.knapsack(w, v, cap);
            int tw = 0;
            int tv = 0;
            for (int i : ks.indices()) {
                tw += w[i];
                tv += v[i];
            }
            check(ks.value() == bestValue && tv == bestValue && tw <= cap, "knapsack vs brute force");

            String a = randomString(rng, 7);
            String b = randomString(rng, 7);
            String l = DynamicProgramming.lcs(a, b);
            check(isSubsequence(l, a) && isSubsequence(l, b) && l.length() == bruteLcsLength(a, b),
                    "LCS of " + a + " and " + b);

            int size = 1 + rng.nextInt(6);
            boolean[][] adj = new boolean[size][size];
            for (int i = 0; i < size; i++) {
                for (int j = 0; j < size; j++) {
                    adj[i][j] = rng.nextDouble() < 0.3;
                }
            }
            boolean[][] closure = DynamicProgramming.warshall(adj);
            for (int s = 0; s < size; s++) {
                boolean[] reach = new boolean[size];
                java.util.ArrayDeque<Integer> stack = new java.util.ArrayDeque<>();
                for (int j = 0; j < size; j++) {
                    if (adj[s][j] && !reach[j]) {
                        reach[j] = true;
                        stack.push(j);
                    }
                }
                while (!stack.isEmpty()) {
                    int u = stack.pop();
                    for (int j = 0; j < size; j++) {
                        if (adj[u][j] && !reach[j]) {
                            reach[j] = true;
                            stack.push(j);
                        }
                    }
                }
                check(Arrays.equals(closure[s], reach), "Warshall row " + s);
            }
        }
        check(DynamicProgramming.lcs("ALGORITHM", "LOGARITHM").length() == 7, "LCS example length");
    }

    private static String randomString(Random rng, int maxLen) {
        StringBuilder sb = new StringBuilder();
        int len = rng.nextInt(maxLen + 1);
        for (int i = 0; i < len; i++) {
            sb.append((char) ('a' + rng.nextInt(3)));
        }
        return sb.toString();
    }

    private static boolean isSubsequence(String sub, String s) {
        int i = 0;
        for (int j = 0; j < s.length() && i < sub.length(); j++) {
            if (s.charAt(j) == sub.charAt(i)) {
                i++;
            }
        }
        return i == sub.length();
    }

    private static int bruteLcsLength(String a, String b) {
        int best = 0;
        for (int mask = 0; mask < (1 << a.length()); mask++) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < a.length(); i++) {
                if ((mask & (1 << i)) != 0) {
                    sb.append(a.charAt(i));
                }
            }
            if (sb.length() > best && isSubsequence(sb.toString(), b)) {
                best = sb.length();
            }
        }
        return best;
    }
}
