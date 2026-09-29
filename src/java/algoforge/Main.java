package algoforge;

import java.util.Arrays;
import java.util.List;

/** A short showcase of the Algorithm Forge Java code. Run: {@code java -cp out algoforge.Main}. */
public final class Main {

    private Main() { }

    public static void main(String[] args) {
        banner("Sorting (Levitin Ch. 3-6): same input, different amounts of work");
        int[] input = {42, 7, 19, 3, 88, 25, 61, 7, 50, 14};
        System.out.println("input:          " + Arrays.toString(input));
        runSort("selection sort", input, Sorting::selectionSort);
        runSort("bubble sort", input, Sorting::bubbleSort);
        runSort("insertion sort", input, Sorting::insertionSort);
        runSort("mergesort", input, Sorting::mergeSort);
        runSort("quicksort", input, Sorting::quickSort);
        runSort("heapsort", input, Sorting::heapSort);

        banner("Searching (Levitin Ch. 3-4)");
        int[] sorted = {3, 7, 14, 19, 25, 42, 50, 61, 88};
        System.out.println("array:                 " + Arrays.toString(sorted));
        System.out.println("sequential search 50 -> index " + Searching.sequentialSearch(sorted, 50));
        System.out.println("binary search 50     -> index " + Searching.binarySearch(sorted, 50));
        System.out.println("interpolation 50     -> index " + Searching.interpolationSearch(sorted, 50));
        System.out.println("binary search 51     -> index " + Searching.binarySearch(sorted, 51) + " (absent)");
        System.out.println("3rd smallest of input (quickselect) = " + Searching.quickselect(input, 3));

        banner("Recursion (Levitin Ch. 1, 2, 4)");
        System.out.println("gcd(60, 24) = " + Recursion.gcd(60, 24));
        System.out.println("10! = " + Recursion.factorial(10));
        System.out.println("Hanoi with 3 disks: " + Recursion.hanoi(3, 'A', 'C', 'B'));
        System.out.println("F(30): recursive " + Recursion.fibRecursive(30)
                + ", iterative " + Recursion.fibIterative(30) + ", matrix " + Recursion.fibMatrix(30));
        System.out.println("binary digits of 1000 = " + Recursion.binaryDigits(1000));
        System.out.println("3^13 by squaring = " + Recursion.power(3, 13));

        banner("Graphs (Levitin Ch. 3, 4, 9)");
        List<List<Integer>> dag = Graphs.emptyGraph(5);
        dag.get(0).add(2);
        dag.get(1).add(2);
        dag.get(2).add(3);
        dag.get(2).add(4);
        dag.get(3).add(4);
        System.out.println("DFS push/pop orders: " + Graphs.dfs(dag));
        System.out.println("BFS order: " + Graphs.bfs(dag));
        System.out.println("topological sort (DFS):            " + Graphs.topoSortDfs(dag));
        System.out.println("topological sort (source removal): " + Graphs.topoSortSourceRemoval(dag));
        List<Graphs.Edge> edges = List.of(
                new Graphs.Edge(0, 1, 4), new Graphs.Edge(0, 2, 1), new Graphs.Edge(2, 1, 2),
                new Graphs.Edge(1, 3, 5), new Graphs.Edge(2, 3, 8), new Graphs.Edge(3, 4, 3));
        List<List<Graphs.Edge>> g = Graphs.undirected(5, edges);
        Graphs.ShortestPaths sp = Graphs.dijkstra(g, 0);
        System.out.println("Dijkstra distances from 0: " + Arrays.toString(sp.dist())
                + ", path to 4: " + Graphs.path(sp, 0, 4));
        System.out.println("Prim MST weight:    " + Graphs.prim(g, 0).weight());
        System.out.println("Kruskal MST weight: " + Graphs.kruskal(5, edges).weight());

        banner("Dynamic programming (Levitin Ch. 8)");
        DynamicProgramming.Choice row = DynamicProgramming.coinRow(new int[] {4, 9, 3, 7, 8, 2});
        System.out.println("coin-row {4,9,3,7,8,2}: best " + row.value() + " using indices " + row.indices());
        DynamicProgramming.Choice ks = DynamicProgramming.knapsack(
                new int[] {3, 4, 2, 5}, new int[] {30, 50, 15, 60}, 8);
        System.out.println("knapsack (W = 8): best " + ks.value() + " using items " + ks.indices());
        System.out.println("LCS(\"ALGORITHM\", \"LOGARITHM\") = \""
                + DynamicProgramming.lcs("ALGORITHM", "LOGARITHM") + "\"");
        int inf = DynamicProgramming.INF;
        int[][] w = {{0, 5, inf, 9}, {inf, 0, 2, inf}, {inf, inf, 0, 3}, {1, inf, inf, 0}};
        System.out.println("Floyd distances: " + Arrays.deepToString(DynamicProgramming.floyd(w)));
        boolean[][] adj = {{false, true, false}, {false, false, true}, {false, false, false}};
        System.out.println("Warshall closure: " + Arrays.deepToString(DynamicProgramming.warshall(adj)));
    }

    private interface CountingSort {
        void sort(int[] a, Sorting.Counter c);
    }

    private static void runSort(String name, int[] input, CountingSort sorter) {
        int[] copy = input.clone();
        Sorting.Counter c = new Sorting.Counter();
        sorter.sort(copy, c);
        System.out.printf("%-15s %s   (%s)%n", name + ":", Arrays.toString(copy), c);
    }

    private static void banner(String title) {
        System.out.println();
        System.out.println("== " + title + " ==");
    }
}
