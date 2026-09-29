package algoforge;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.PriorityQueue;

/**
 * Graph algorithms on vertices 0..n-1.
 *
 * <p>Unweighted graphs are adjacency lists {@code List<List<Integer>>}; weighted graphs are
 * {@code List<List<Edge>>} (use {@link #undirected} or {@link #directed} to build them from an edge
 * list). Neighbors are visited in list order, so results match hand traces.</p>
 */
public final class Graphs {

    private Graphs() { }

    /** A weighted edge from {@code from} to {@code to}. */
    public record Edge(int from, int to, int weight) { }

    /** Depth-First Search (DFS) orders: push order (first visit) and pop order (dead ends). */
    public record Traversal(List<Integer> pushOrder, List<Integer> popOrder) { }

    /** Result of Dijkstra's algorithm: distances (Integer.MAX_VALUE = unreachable) and parents (-1 = none). */
    public record ShortestPaths(int[] dist, int[] parent) { }

    /** A Minimum Spanning Tree (MST) or forest: total weight and the chosen edges. */
    public record SpanningTree(long weight, List<Edge> edges) { }

    // ------------------------------------------------------------------ builders

    /** Empty adjacency lists for n vertices. Θ(n). */
    public static List<List<Integer>> emptyGraph(int n) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            g.add(new ArrayList<>());
        }
        return g;
    }

    /** Weighted adjacency lists where every edge appears in both directions. Θ(n + m). */
    public static List<List<Edge>> undirected(int n, List<Edge> edges) {
        List<List<Edge>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            g.add(new ArrayList<>());
        }
        for (Edge e : edges) {
            g.get(e.from()).add(e);
            g.get(e.to()).add(new Edge(e.to(), e.from(), e.weight()));
        }
        return g;
    }

    /** Weighted adjacency lists for a directed graph. Θ(n + m). */
    public static List<List<Edge>> directed(int n, List<Edge> edges) {
        List<List<Edge>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            g.add(new ArrayList<>());
        }
        for (Edge e : edges) {
            g.get(e.from()).add(e);
        }
        return g;
    }

    // ------------------------------------------------------------------ DFS and BFS (Levitin §3.5)

    /** Depth-First Search (DFS) of every component (Levitin §3.5). Θ(|V| + |E|). */
    public static Traversal dfs(List<List<Integer>> g) {
        int n = g.size();
        boolean[] seen = new boolean[n];
        List<Integer> push = new ArrayList<>();
        List<Integer> pop = new ArrayList<>();
        for (int s = 0; s < n; s++) {
            if (!seen[s]) {
                dfsVisit(g, s, seen, push, pop);
            }
        }
        return new Traversal(push, pop);
    }

    private static void dfsVisit(List<List<Integer>> g, int u, boolean[] seen,
                                 List<Integer> push, List<Integer> pop) {
        seen[u] = true;
        push.add(u);
        for (int v : g.get(u)) {
            if (!seen[v]) {
                dfsVisit(g, v, seen, push, pop);
            }
        }
        pop.add(u);
    }

    /** Breadth-First Search (BFS) visit order over every component (Levitin §3.5). Θ(|V| + |E|). */
    public static List<Integer> bfs(List<List<Integer>> g) {
        int n = g.size();
        boolean[] seen = new boolean[n];
        List<Integer> order = new ArrayList<>();
        Deque<Integer> queue = new ArrayDeque<>();
        for (int s = 0; s < n; s++) {
            if (seen[s]) {
                continue;
            }
            seen[s] = true;
            queue.add(s);
            while (!queue.isEmpty()) {
                int u = queue.poll();
                order.add(u);
                for (int v : g.get(u)) {
                    if (!seen[v]) {
                        seen[v] = true;
                        queue.add(v);
                    }
                }
            }
        }
        return order;
    }

    // ------------------------------------------------------------------ topological sorting (Levitin §4.2)

    /**
     * Topological order of a Directed Acyclic Graph (DAG) by reversing the DFS pop order
     * (Levitin §4.2). Returns null if a back edge reveals a cycle. Θ(|V| + |E|).
     */
    public static List<Integer> topoSortDfs(List<List<Integer>> g) {
        int n = g.size();
        int[] state = new int[n];   // 0 = unvisited, 1 = on the stack, 2 = finished
        List<Integer> pop = new ArrayList<>();
        for (int s = 0; s < n; s++) {
            if (state[s] == 0 && !topoVisit(g, s, state, pop)) {
                return null;
            }
        }
        Collections.reverse(pop);
        return pop;
    }

    private static boolean topoVisit(List<List<Integer>> g, int u, int[] state, List<Integer> pop) {
        state[u] = 1;
        for (int v : g.get(u)) {
            if (state[v] == 1) {
                return false;             // back edge: cycle
            }
            if (state[v] == 0 && !topoVisit(g, v, state, pop)) {
                return false;
            }
        }
        state[u] = 2;
        pop.add(u);
        return true;
    }

    /**
     * Topological order by repeatedly removing a source, a vertex with no incoming edges
     * (Levitin §4.2). Returns null when the digraph has a cycle. Θ(|V| + |E|).
     */
    public static List<Integer> topoSortSourceRemoval(List<List<Integer>> g) {
        int n = g.size();
        int[] indegree = new int[n];
        for (List<Integer> nbrs : g) {
            for (int v : nbrs) {
                indegree[v]++;
            }
        }
        Deque<Integer> sources = new ArrayDeque<>();
        for (int v = 0; v < n; v++) {
            if (indegree[v] == 0) {
                sources.add(v);
            }
        }
        List<Integer> order = new ArrayList<>();
        while (!sources.isEmpty()) {
            int u = sources.poll();
            order.add(u);
            for (int v : g.get(u)) {
                if (--indegree[v] == 0) {
                    sources.add(v);
                }
            }
        }
        return order.size() == n ? order : null;
    }

    // ------------------------------------------------------------------ Dijkstra (Levitin §9.3)

    /**
     * Single-source shortest paths for non-negative weights (Levitin §9.3), using a binary heap
     * with lazy deletion. Θ((|V| + |E|) log |V|).
     */
    public static ShortestPaths dijkstra(List<List<Edge>> g, int source) {
        int n = g.size();
        int[] dist = new int[n];
        int[] parent = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        Arrays.fill(parent, -1);
        boolean[] done = new boolean[n];
        dist[source] = 0;
        PriorityQueue<int[]> heap = new PriorityQueue<>(Comparator.<int[]>comparingInt(x -> x[0])
                .thenComparingInt(x -> x[1]));
        heap.add(new int[] {0, source});
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            int u = top[1];
            if (done[u]) {
                continue;
            }
            done[u] = true;
            for (Edge e : g.get(u)) {
                if (e.weight() < 0) {
                    throw new IllegalArgumentException("Dijkstra needs non-negative weights");
                }
                int candidate = dist[u] + e.weight();
                if (candidate < dist[e.to()]) {
                    dist[e.to()] = candidate;
                    parent[e.to()] = u;
                    heap.add(new int[] {candidate, e.to()});
                }
            }
        }
        return new ShortestPaths(dist, parent);
    }

    /** The vertex list source..target by following parent links (empty if unreachable). Θ(path). */
    public static List<Integer> path(ShortestPaths sp, int source, int target) {
        List<Integer> p = new ArrayList<>();
        if (sp.dist()[target] == Integer.MAX_VALUE) {
            return p;
        }
        for (int v = target; v != -1; v = sp.parent()[v]) {
            p.add(v);
        }
        Collections.reverse(p);
        return p;
    }

    // ------------------------------------------------------------------ Prim (Levitin §9.1)

    /**
     * Minimum Spanning Tree (MST) of the component containing {@code start} by Prim's algorithm
     * (Levitin §9.1): repeatedly attach the cheapest edge leaving the tree. Θ(|E| log |V|).
     */
    public static SpanningTree prim(List<List<Edge>> g, int start) {
        int n = g.size();
        boolean[] inTree = new boolean[n];
        PriorityQueue<Edge> heap = new PriorityQueue<>(
                Comparator.comparingInt(Edge::weight).thenComparingInt(Edge::from).thenComparingInt(Edge::to));
        List<Edge> tree = new ArrayList<>();
        long total = 0;
        inTree[start] = true;
        heap.addAll(g.get(start));
        while (!heap.isEmpty()) {
            Edge e = heap.poll();
            if (inTree[e.to()]) {
                continue;
            }
            inTree[e.to()] = true;
            tree.add(e);
            total += e.weight();
            for (Edge next : g.get(e.to())) {
                if (!inTree[next.to()]) {
                    heap.add(next);
                }
            }
        }
        return new SpanningTree(total, tree);
    }

    // ------------------------------------------------------------------ Kruskal (Levitin §9.2)

    /**
     * Minimum spanning forest by Kruskal's algorithm (Levitin §9.2): scan edges by weight and keep
     * those that join two different trees (checked with union-find). Θ(|E| log |E|).
     */
    public static SpanningTree kruskal(int n, List<Edge> edges) {
        List<Edge> sorted = new ArrayList<>(edges);
        sorted.sort(Comparator.comparingInt(Edge::weight));
        UnionFind uf = new UnionFind(n);
        List<Edge> tree = new ArrayList<>();
        long total = 0;
        for (Edge e : sorted) {
            if (uf.union(e.from(), e.to())) {
                tree.add(e);
                total += e.weight();
                if (tree.size() == n - 1) {
                    break;
                }
            }
        }
        return new SpanningTree(total, tree);
    }

    /** Disjoint subsets with union by size and path compression (Levitin §9.2). Near O(1) per operation. */
    public static final class UnionFind {
        private final int[] parent;
        private final int[] size;

        /** n singleton subsets {0}, {1}, ..., {n-1}. */
        public UnionFind(int n) {
            parent = new int[n];
            size = new int[n];
            for (int i = 0; i < n; i++) {
                parent[i] = i;
                size[i] = 1;
            }
        }

        /** Representative of x's subset. */
        public int find(int x) {
            int root = x;
            while (parent[root] != root) {
                root = parent[root];
            }
            while (parent[x] != root) {        // path compression
                int next = parent[x];
                parent[x] = root;
                x = next;
            }
            return root;
        }

        /** Merge the subsets of x and y; false if they were already the same subset. */
        public boolean union(int x, int y) {
            int rx = find(x);
            int ry = find(y);
            if (rx == ry) {
                return false;
            }
            if (size[rx] < size[ry]) {
                int t = rx;
                rx = ry;
                ry = t;
            }
            parent[ry] = rx;
            size[rx] += size[ry];
            return true;
        }
    }
}
