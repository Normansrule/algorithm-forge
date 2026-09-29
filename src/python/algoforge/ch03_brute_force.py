"""Chapter 3 - Brute Force and Exhaustive Search.

Brute force means solving a problem straight from its definition (Levitin §3.0).
It is rarely the fastest approach, but it is simple, always applicable, and a
perfect correctness oracle for the cleverer algorithms in later chapters.

Graph convention used here: an adjacency dict ``{vertex: [neighbors...]}``.
For an undirected graph each edge appears in both lists. Vertices are visited
in dict order and neighbors in list order, so traces are reproducible.
"""

from __future__ import annotations

import itertools
import math
from typing import Hashable, Sequence

from .counters import OpCounter, tick

Point = tuple[float, float]

# ---------------------------------------------------------------------------
# Sorting (Levitin §3.1)
# ---------------------------------------------------------------------------


def selection_sort(A: Sequence, counter: OpCounter | None = None) -> list:
    """Return a sorted copy: repeatedly swap the smallest remaining item into place.

    Levitin §3.1 (SelectionSort). Comparisons are always n(n-1)/2, so Θ(n^2)
    time; only n - 1 swaps at most. Space O(n) for the copy (O(1) extra).
    """
    A = list(A)
    n = len(A)
    for i in range(n - 1):
        smallest = i
        for j in range(i + 1, n):
            tick(counter, "comparisons")
            if A[j] < A[smallest]:
                smallest = j
        if smallest != i:
            tick(counter, "swaps")
            A[i], A[smallest] = A[smallest], A[i]
    return A


def bubble_sort(A: Sequence, counter: OpCounter | None = None) -> list:
    """Return a sorted copy by swapping adjacent out-of-order neighbors.

    Levitin §3.1 (BubbleSort). Always n(n-1)/2 comparisons: Θ(n^2) time;
    swaps equal the number of inversions. Space O(n) copy.
    """
    A = list(A)
    n = len(A)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            tick(counter, "comparisons")
            if A[j + 1] < A[j]:
                tick(counter, "swaps")
                A[j], A[j + 1] = A[j + 1], A[j]
    return A


def bubble_sort_early_exit(A: Sequence, counter: OpCounter | None = None) -> list:
    """Bubble sort that stops after a pass with no swaps.

    Levitin Exercise 3.1 (improved bubble sort). Best case (already sorted)
    n - 1 comparisons, Θ(n); worst case still Θ(n^2). Space O(n) copy.
    """
    A = list(A)
    n = len(A)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            tick(counter, "comparisons")
            if A[j + 1] < A[j]:
                tick(counter, "swaps")
                A[j], A[j + 1] = A[j + 1], A[j]
                swapped = True
        if not swapped:
            break
    return A


# ---------------------------------------------------------------------------
# Searching and string matching (Levitin §3.2)
# ---------------------------------------------------------------------------


def sequential_search(A: Sequence, key, counter: OpCounter | None = None) -> int:
    """Return the index of the first element equal to key, or -1.

    Levitin §3.1/§3.2 (SequentialSearch). Worst case n comparisons: Θ(n)
    time; space O(1).
    """
    for i, value in enumerate(A):
        tick(counter, "comparisons")
        if value == key:
            return i
    return -1


def sequential_search_sentinel(A: Sequence, key, counter: OpCounter | None = None) -> int:
    """Sequential search that appends key as a sentinel so the loop needs no bounds check.

    Levitin §3.2 (SequentialSearch2). Still Θ(n) comparisons, but only one
    test per step. Space O(n) for the working copy.
    """
    B = list(A) + [key]
    i = 0
    while True:
        tick(counter, "comparisons")
        if B[i] == key:
            break
        i += 1
    return i if i < len(A) else -1


def brute_force_string_match(text: str, pattern: str, counter: OpCounter | None = None) -> int:
    """Index of the first occurrence of pattern in text, or -1, by trying every shift.

    Levitin §3.2 (BruteForceStringMatch). Worst case m(n - m + 1) character
    comparisons: O(nm) time; space O(1).
    """
    n, m = len(text), len(pattern)
    for i in range(n - m + 1):
        j = 0
        while j < m:
            tick(counter, "comparisons")
            if pattern[j] != text[i + j]:
                break
            j += 1
        if j == m:
            return i
    return -1


def brute_force_string_match_all(text: str, pattern: str) -> list[int]:
    """Every index where pattern occurs in text (overlaps included).

    Levitin §3.2. Time O(nm); space O(number of matches).
    """
    m = len(pattern)
    return [i for i in range(len(text) - m + 1) if text[i:i + m] == pattern]


def count_substrings_brute(text: str, first: str = "A", last: str = "B",
                           counter: OpCounter | None = None) -> int:
    """Count substrings that start with ``first`` and end with ``last`` - check every pair.

    Levitin Exercise 3.2 (substrings starting with A and ending with B).
    Θ(n^2) pair checks; space O(1).
    """
    total = 0
    n = len(text)
    for i in range(n):
        if text[i] != first:
            continue
        for j in range(i + 1, n):
            tick(counter, "comparisons")
            if text[j] == last:
                total += 1
    return total


def count_substrings_one_pass(text: str, first: str = "A", last: str = "B",
                              counter: OpCounter | None = None) -> int:
    """Same count in one left-to-right pass: every ``last`` closes all ``first``s seen so far.

    Levitin Exercise 3.2 (the linear solution). Time Θ(n); space O(1).
    """
    firsts_seen = 0
    total = 0
    for ch in text:
        tick(counter, "comparisons")
        if ch == last:
            total += firsts_seen
        if ch == first:
            firsts_seen += 1
    return total


# ---------------------------------------------------------------------------
# Polynomial evaluation (Levitin Exercise 3.1)
# ---------------------------------------------------------------------------


def poly_eval_naive(coeffs: Sequence[float], x: float, counter: OpCounter | None = None) -> float:
    """Evaluate sum coeffs[i] * x^i, computing each power from scratch.

    Levitin Exercise 3.1 (brute-force polynomial evaluation). coeffs[i] is the
    coefficient of x^i. About n^2/2 multiplications: Θ(n^2) time; O(1) space.
    """
    total = 0
    for i, a in enumerate(coeffs):
        power = 1
        for _ in range(i):
            tick(counter, "multiplications")
            power *= x
        tick(counter, "multiplications")
        total += a * power
    return total


def poly_eval_incremental(coeffs: Sequence[float], x: float, counter: OpCounter | None = None) -> float:
    """Evaluate the polynomial keeping a running power x^i (right-to-left in the book).

    Levitin Exercise 3.1 (the linear improvement). 2n multiplications:
    Θ(n) time; O(1) space. Compare Horner's rule in Chapter 6.
    """
    total = 0
    power = 1
    for i, a in enumerate(coeffs):
        if i > 0:
            tick(counter, "multiplications")
            power *= x
        tick(counter, "multiplications")
        total += a * power
    return total


# ---------------------------------------------------------------------------
# Closest pair and convex hull by brute force (Levitin §3.3)
# ---------------------------------------------------------------------------


def closest_pair_brute(points: Sequence[Point], counter: OpCounter | None = None) -> tuple[float, Point, Point]:
    """Return (distance, p, q) for the closest two points by checking every pair.

    Levitin §3.3 (BruteForceClosestPair). Compares squared distances (no
    square root inside the loop). n(n-1)/2 checks: Θ(n^2) time; O(1) space.
    """
    if len(points) < 2:
        raise ValueError("need at least two points")
    best = math.inf
    best_pair = (points[0], points[1])
    n = len(points)
    for i in range(n - 1):
        for j in range(i + 1, n):
            tick(counter, "distance_computations")
            dx = points[i][0] - points[j][0]
            dy = points[i][1] - points[j][1]
            d2 = dx * dx + dy * dy
            if d2 < best:
                best = d2
                best_pair = (points[i], points[j])
    return math.sqrt(best), best_pair[0], best_pair[1]


def _cross(o: Point, a: Point, b: Point) -> float:
    """Twice the signed area of triangle o-a-b (>0 means a left turn)."""
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def ccw_order(points: Sequence[Point]) -> list[Point]:
    """Order convex-position points counterclockwise, starting at the lowest-leftmost point.

    Helper shared by both convex-hull algorithms so their outputs compare equal.
    Time O(h log h); space O(h).
    """
    pts = list(points)
    if len(pts) <= 2:
        return sorted(pts)
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    pts.sort(key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
    start = min(range(len(pts)), key=lambda i: (pts[i][1], pts[i][0]))
    return pts[start:] + pts[:start]


def convex_hull_brute(points: Sequence[Point]) -> list[Point]:
    """Return the extreme points (hull vertices) in counterclockwise order.

    Levitin §3.3 (brute-force convex hull): segment pq is a hull edge when all
    other points lie on one side of line pq. Points that are collinear with an
    edge must lie between p and q, so only true corners are reported.
    Θ(n^3) time; O(n) space.
    """
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts
    vertices: set[Point] = set()
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            p, q = pts[i], pts[j]
            left = right = False
            ok = True
            for r in pts:
                if r == p or r == q:
                    continue
                s = _cross(p, q, r)
                if s > 0:
                    left = True
                elif s < 0:
                    right = True
                else:  # collinear: must be strictly between p and q
                    if not (min(p[0], q[0]) <= r[0] <= max(p[0], q[0])
                            and min(p[1], q[1]) <= r[1] <= max(p[1], q[1])):
                        ok = False
                if left and right:
                    ok = False
                if not ok:
                    break
            if ok:
                vertices.add(p)
                vertices.add(q)
    return ccw_order(vertices)


# ---------------------------------------------------------------------------
# Exhaustive search (Levitin §3.4)
# ---------------------------------------------------------------------------


def tour_cost(dist: Sequence[Sequence[float]], tour: Sequence[int]) -> float:
    """Total length of a closed tour given as a vertex list (first == last). O(n)."""
    return sum(dist[tour[i]][tour[i + 1]] for i in range(len(tour) - 1))


def tsp_exhaustive(dist: Sequence[Sequence[float]]) -> tuple[float, list[int]]:
    """Shortest Hamiltonian circuit by trying every tour that starts at city 0.

    Levitin §3.4 (Traveling Salesman Problem (TSP) by exhaustive search).
    (n - 1)! tours: Θ(n!) time; O(n) space. Returns (cost, [0, ..., 0]).
    """
    n = len(dist)
    if n == 1:
        return 0, [0, 0]
    best_cost = math.inf
    best_tour: list[int] = []
    for perm in itertools.permutations(range(1, n)):
        tour = [0, *perm, 0]
        cost = tour_cost(dist, tour)
        if cost < best_cost:
            best_cost, best_tour = cost, tour
    return best_cost, best_tour


def knapsack_exhaustive(weights: Sequence[int], values: Sequence[float],
                        capacity: int) -> tuple[float, list[int]]:
    """Best total value and item indices by checking all 2^n subsets.

    Levitin §3.4 (knapsack problem by exhaustive search). Θ(n 2^n) time;
    O(n) space.
    """
    n = len(weights)
    best_value = 0
    best_items: list[int] = []
    for r in range(n + 1):
        for subset in itertools.combinations(range(n), r):
            w = sum(weights[i] for i in subset)
            if w <= capacity:
                v = sum(values[i] for i in subset)
                if v > best_value:
                    best_value, best_items = v, list(subset)
    return best_value, best_items


def assignment_exhaustive(cost: Sequence[Sequence[float]]) -> tuple[float, list[int]]:
    """Cheapest assignment of n people to n jobs by trying all n! permutations.

    Levitin §3.4 (assignment problem). Returns (total, jobs) where jobs[i]
    is the job given to person i. Θ(n * n!) time; O(n) space.
    """
    n = len(cost)
    best = math.inf
    best_perm: list[int] = []
    for perm in itertools.permutations(range(n)):
        total = sum(cost[i][perm[i]] for i in range(n))
        if total < best:
            best, best_perm = total, list(perm)
    return best, best_perm


def partition_exhaustive(nums: Sequence[int]) -> list[int] | None:
    """Indices of a subset whose sum is exactly half the total, or None.

    Levitin Exercise 3.4 (partition problem by exhaustive search).
    Θ(n 2^n) time; O(n) space.
    """
    total = sum(nums)
    if total % 2:
        return None
    half = total // 2
    n = len(nums)
    for r in range(n + 1):
        for subset in itertools.combinations(range(n), r):
            if sum(nums[i] for i in subset) == half:
                return list(subset)
    return None


# ---------------------------------------------------------------------------
# Depth-First Search (DFS) and Breadth-First Search (BFS) (Levitin §3.5)
# ---------------------------------------------------------------------------

Graph = dict[Hashable, list[Hashable]]


def _all_vertices(graph: Graph) -> list[Hashable]:
    """Vertices in dict order, then any that appear only as neighbors."""
    seen = dict.fromkeys(graph)
    for nbrs in graph.values():
        for v in nbrs:
            seen.setdefault(v, None)
    return list(seen)


def dfs(graph: Graph, directed: bool = False) -> dict[str, list]:
    """Depth-First Search (DFS) of the whole graph with edge classification.

    Levitin §3.5. Returns a dict with
      * ``order`` - vertices in the order they were first reached (push order),
      * ``finish`` - vertices in the order they became dead ends (pop order),
      * ``tree_edges`` and ``back_edges`` (and, for directed graphs,
        ``forward_edges`` and ``cross_edges``).
    Time Θ(|V| + |E|) with adjacency lists; space Θ(|V|).
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    vertices = _all_vertices(graph)
    color = {v: WHITE for v in vertices}
    parent: dict[Hashable, Hashable | None] = {}
    pre: dict[Hashable, int] = {}
    result: dict[str, list] = {"order": [], "finish": [], "tree_edges": [], "back_edges": []}
    if directed:
        result["forward_edges"] = []
        result["cross_edges"] = []

    def visit(u: Hashable) -> None:
        color[u] = GRAY
        pre[u] = len(result["order"])
        result["order"].append(u)
        for v in graph.get(u, []):
            if color[v] == WHITE:
                parent[v] = u
                result["tree_edges"].append((u, v))
                visit(v)
            elif directed:
                if color[v] == GRAY:
                    result["back_edges"].append((u, v))
                elif pre[u] < pre[v]:
                    result["forward_edges"].append((u, v))
                else:
                    result["cross_edges"].append((u, v))
            elif color[v] == GRAY and v != parent.get(u):
                # Undirected: record each back edge once, from the descendant.
                result["back_edges"].append((u, v))
        color[u] = BLACK
        result["finish"].append(u)

    for v in vertices:
        if color[v] == WHITE:
            parent[v] = None
            visit(v)
    return result


def bfs(graph: Graph, directed: bool = False) -> dict[str, list]:
    """Breadth-First Search (BFS) of the whole graph with edge classification.

    Levitin §3.5. Returns ``order`` (visit order), ``tree_edges``, and for an
    undirected graph ``cross_edges`` (each listed once); for a directed graph
    the non-tree edges are listed under ``nontree_edges``.
    Time Θ(|V| + |E|); space Θ(|V|) for the queue.
    """
    from collections import deque

    vertices = _all_vertices(graph)
    visited: set[Hashable] = set()
    parent: dict[Hashable, Hashable | None] = {}
    result: dict[str, list] = {"order": [], "tree_edges": []}
    other_key = "nontree_edges" if directed else "cross_edges"
    result[other_key] = []
    seen_undirected: set[frozenset] = set()

    for s in vertices:
        if s in visited:
            continue
        visited.add(s)
        parent[s] = None
        result["order"].append(s)
        queue = deque([s])
        while queue:
            u = queue.popleft()
            for v in graph.get(u, []):
                if v not in visited:
                    visited.add(v)
                    parent[v] = u
                    result["order"].append(v)
                    result["tree_edges"].append((u, v))
                    seen_undirected.add(frozenset((u, v)))
                    queue.append(v)
                elif directed:
                    result[other_key].append((u, v))
                else:
                    key = frozenset((u, v))
                    if key not in seen_undirected:
                        seen_undirected.add(key)
                        result[other_key].append((u, v))
    return result


def connected_components(graph: Graph) -> list[list[Hashable]]:
    """Split an undirected graph into connected components using DFS.

    Levitin §3.5 (checking connectivity / finding components as a DFS
    application). Time Θ(|V| + |E|); space Θ(|V|).
    """
    seen: set[Hashable] = set()
    components = []
    for s in _all_vertices(graph):
        if s in seen:
            continue
        stack = [s]
        seen.add(s)
        comp = []
        while stack:
            u = stack.pop()
            comp.append(u)
            for v in graph.get(u, []):
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
        components.append(comp)
    return components
