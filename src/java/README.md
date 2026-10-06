# ☕ Algorithm Forge in Java

Core algorithms from Levitin's *Introduction to the Design and Analysis of Algorithms* (3rd ed.), written in
plain Java 17 — no Maven, no Gradle, no libraries. Every class lives in the `algoforge` package, and each
method's Javadoc gives the Levitin section and its running time.

These files mirror the tested Python library in [`../python`](../python/README.md). Use whichever language
your project or interview needs; the algorithms and their names line up.

## Compile and run (Ubuntu, macOS, Windows Subsystem for Linux (WSL))

You need a Java Development Kit (JDK) 17 or newer: `sudo apt install openjdk-17-jdk` on Ubuntu, then check with
`javac -version`.

From the repository root:

```bash
# compile everything under src/java into ./out
javac -d out $(find src/java -name '*.java')

# the showcase: sorts with operation counts, searches, recursion, graphs, dynamic programming
java -cp out algoforge.Main

# the self-test: about 24,000 randomized checks against brute-force answers; exits with status 1 on failure
java -cp out algoforge.SelfTest
```

On a newer JDK you can add `--release 17` to `javac` to be sure the code stays Java 17 compatible.
To compile only this package: `javac -d out src/java/algoforge/*.java`.

## What is inside

| File | Algorithms | Levitin |
|---|---|---|
| `Sorting.java` | selection sort, bubble sort (early exit), insertion sort, mergesort, quicksort (Hoare partition), heapsort — each with an optional `Sorting.Counter` for comparisons and swaps | §3.1, §4.1, §5.1, §5.2, §6.4 |
| `Searching.java` | sequential search, binary search, interpolation search, quickselect (Lomuto partition) | §3.2, §4.4, §4.5 |
| `Recursion.java` | factorial, Tower of Hanoi move list, Fibonacci (recursive, iterative, matrix power), Euclid's greatest common divisor (gcd) iterative and recursive, binary digit count both ways, power by squaring | §1.1, §2.3–2.5, §4.4 |
| `Graphs.java` | Depth-First Search (DFS) push/pop orders, Breadth-First Search (BFS), topological sort (DFS-based and source removal; `null` on a cycle), Dijkstra with path reconstruction, Prim, Kruskal with union-find | §3.5, §4.2, §9.1–9.3 |
| `DynamicProgramming.java` | coin-row (with chosen coins), 0/1 knapsack (with chosen items), Longest Common Subsequence (LCS), Floyd, Warshall | §8.1, §8.2, §8.4 |
| `Main.java` | a small printed tour of everything above | — |
| `SelfTest.java` | randomized checks: every sort against `Arrays.sort`, searches against a linear scan, Prim = Kruskal = brute-force Minimum Spanning Tree (MST), Dijkstra = Floyd, knapsack/coin-row/LCS against exhaustive search, Warshall against DFS reachability, and the operation counts predicted by the analysis | — |

## Counting operations

```java
int[] data = {5, 1, 4, 2, 3};
Sorting.Counter c = new Sorting.Counter();
Sorting.insertionSort(data, c);
System.out.println(c);          // comparisons=9, swaps=6  (6 shifts = 6 inversions)
```

`Sorting.Counter` has public `comparisons` and `swaps` fields and a `reset()` method. The empirical
analysis project that times these sorts on growing inputs lives in its own folder under `src/java/`.

## Conventions

- Sorts work **in place** on `int[]` and put the array in nondecreasing order.
- Searches return the index of the key, or `-1` when it is absent.
- Graph vertices are `0..n-1`. Unweighted graphs are `List<List<Integer>>` (build with `Graphs.emptyGraph(n)`);
  weighted graphs are `List<List<Graphs.Edge>>` (build with `Graphs.undirected(n, edges)` or `Graphs.directed(n, edges)`).
- `DynamicProgramming.INF` marks "no edge" for Floyd; Dijkstra reports unreachable vertices as `Integer.MAX_VALUE`.
