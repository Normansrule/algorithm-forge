"""Chapter 12 - Coping with the Limitations of Algorithm Power.

When a problem is Nondeterministic Polynomial-time hard (NP-hard) we can still (Levitin §12.0):
  * search cleverly - backtracking (§12.1) and branch-and-bound (§12.2)
    prune the state-space tree;
  * settle for "good enough" - approximation algorithms (§12.3);
  * approximate numerically - root finding (§12.4).
"""

from __future__ import annotations

import heapq
import itertools
import math
from typing import Callable, Hashable, Sequence

from .ch03_brute_force import tour_cost

# ---------------------------------------------------------------------------
# Backtracking (Levitin §12.1)
# ---------------------------------------------------------------------------


def n_queens(n: int) -> tuple[list[tuple[int, ...]], int]:
    """All ways to place n non-attacking queens; returns (solutions, nodes explored).

    Levitin §12.1. A solution lists the column of the queen in each row.
    Queens are placed row by row; a partial placement that already has an
    attack is not extended (pruned). "Nodes explored" counts every node of
    the state-space tree that was generated, including the root.
    Exponential time in the worst case; Θ(n) space besides the output.
    """
    solutions: list[tuple[int, ...]] = []
    cols: list[int] = []
    used_cols: set[int] = set()
    used_diag: set[int] = set()   # row - col
    used_anti: set[int] = set()   # row + col
    nodes = 1  # the root (empty board)

    def place(row: int) -> None:
        nonlocal nodes
        if row == n:
            solutions.append(tuple(cols))
            return
        for c in range(n):
            nodes += 1
            if c in used_cols or (row - c) in used_diag or (row + c) in used_anti:
                continue  # nonpromising node: prune
            cols.append(c)
            used_cols.add(c)
            used_diag.add(row - c)
            used_anti.add(row + c)
            place(row + 1)
            cols.pop()
            used_cols.remove(c)
            used_diag.remove(row - c)
            used_anti.remove(row + c)

    place(0)
    return solutions, nodes


def subset_sum_backtracking(nums: Sequence[int], target: int) -> tuple[list[list[int]], int]:
    """Every subset of positive nums summing to target; returns (index lists, nodes explored).

    Levitin §12.1 (subset-sum problem). Numbers are processed in increasing
    order; a node is pruned when adding the next number already overshoots,
    or when even taking all remaining numbers cannot reach the target.
    Returned index lists refer to the ORIGINAL positions, sorted.
    Worst case Θ(2^n) nodes; Θ(n) recursion depth.
    """
    if any(x <= 0 for x in nums):
        raise ValueError("this version expects positive numbers")
    order = sorted(range(len(nums)), key=lambda i: nums[i])
    vals = [nums[i] for i in order]
    suffix = [0] * (len(vals) + 1)
    for i in range(len(vals) - 1, -1, -1):
        suffix[i] = suffix[i + 1] + vals[i]
    solutions: list[list[int]] = []
    chosen: list[int] = []
    nodes = 0

    def explore(i: int, s: int) -> None:
        nonlocal nodes
        nodes += 1
        if s == target:
            solutions.append(sorted(order[k] for k in chosen))
            return
        if i == len(vals) or s + vals[i] > target or s + suffix[i] < target:
            return
        chosen.append(i)          # include vals[i]
        explore(i + 1, s + vals[i])
        chosen.pop()
        explore(i + 1, s)         # exclude vals[i]

    explore(0, 0)
    return solutions, nodes


def hamiltonian_circuit(graph: dict[Hashable, Sequence[Hashable]],
                        start: Hashable | None = None) -> tuple[list[Hashable] | None, int]:
    """First Hamiltonian circuit found by backtracking; returns (circuit or None, nodes).

    Levitin §12.1. The circuit starts and ends at ``start`` and visits every
    vertex exactly once in between. Neighbors are tried in list order.
    Exponential worst case; Θ(|V|) space.
    """
    vertices = list(graph)
    if not vertices:
        return None, 0
    start = vertices[0] if start is None else start
    path = [start]
    on_path = {start}
    nodes = 1

    def extend() -> bool:
        nonlocal nodes
        u = path[-1]
        if len(path) == len(vertices):
            return start in graph[u]
        for v in graph[u]:
            if v in on_path:
                continue
            nodes += 1
            path.append(v)
            on_path.add(v)
            if extend():
                return True
            path.pop()
            on_path.remove(v)
        return False

    if len(vertices) >= 3 and extend():
        return path + [start], nodes
    return None, nodes


# ---------------------------------------------------------------------------
# Branch-and-bound (Levitin §12.2)
# ---------------------------------------------------------------------------


def assignment_branch_and_bound(cost: Sequence[Sequence[float]]) -> tuple[float, list[int], int]:
    """Optimal assignment by best-first branch-and-bound; returns (cost, jobs, nodes generated).

    Levitin §12.2. Level i assigns a job to person i. Lower bound = cost so
    far + for every unassigned person, the cheapest job still free. The live
    node with the smallest bound is expanded first; a node whose bound is not
    better than the best complete solution is pruned. jobs[i] is person i's job.
    Worst case O(n! · n^2) (every node, each bound Θ(n^2)); usually far fewer
    nodes than n!.
    """
    n = len(cost)

    def bound(level: int, used: frozenset, so_far: float) -> float:
        lb = so_far
        for person in range(level, n):
            lb += min(cost[person][j] for j in range(n) if j not in used)
        return lb

    tie = itertools.count()
    root_bound = bound(0, frozenset(), 0)
    heap = [(root_bound, next(tie), 0, (), 0.0)]
    nodes = 1
    best, best_jobs = math.inf, []
    while heap:
        lb, _, level, jobs, so_far = heapq.heappop(heap)
        if lb >= best:
            continue
        if level == n:
            best, best_jobs = so_far, list(jobs)
            continue
        used = frozenset(jobs)
        for j in range(n):
            if j in used:
                continue
            nodes += 1
            new_cost = so_far + cost[level][j]
            child_bound = bound(level + 1, used | {j}, new_cost)
            if child_bound < best:
                heapq.heappush(heap, (child_bound, next(tie), level + 1, jobs + (j,), new_cost))
    return best, best_jobs, nodes


def knapsack_branch_and_bound(weights: Sequence[int], values: Sequence[float],
                              capacity: int) -> tuple[float, list[int], int]:
    """0/1 knapsack by best-first branch-and-bound; returns (value, items, nodes generated).

    Levitin §12.2. Items are ordered by value/weight ratio; the upper bound
    of a node is v + (W - w) * (best remaining ratio). Nodes whose bound
    cannot beat the best solution so far are pruned. Worst case Θ(2^n) nodes,
    each O(log(live nodes)) for the heap.
    """
    n = len(weights)
    order = sorted(range(n), key=lambda i: values[i] / weights[i], reverse=True)
    w = [weights[i] for i in order]
    v = [values[i] for i in order]

    def upper_bound(level: int, value: float, weight: float) -> float:
        if level < n:
            return value + (capacity - weight) * v[level] / w[level]
        return value

    tie = itertools.count()
    heap = [(-upper_bound(0, 0, 0), next(tie), 0, 0.0, 0.0, ())]
    nodes = 1
    best, best_items = 0.0, ()
    while heap:
        neg_ub, _, level, value, weight, taken = heapq.heappop(heap)
        if -neg_ub <= best or level == n:
            continue
        # child 1: include item `level`
        if weight + w[level] <= capacity:
            nodes += 1
            nv, nw, nt = value + v[level], weight + w[level], taken + (level,)
            if nv > best:
                best, best_items = nv, nt
            ub = upper_bound(level + 1, nv, nw)
            if ub > best:
                heapq.heappush(heap, (-ub, next(tie), level + 1, nv, nw, nt))
        # child 2: exclude item `level`
        nodes += 1
        ub = upper_bound(level + 1, value, weight)
        if ub > best:
            heapq.heappush(heap, (-ub, next(tie), level + 1, value, weight, taken))
    return best, sorted(order[k] for k in best_items), nodes


# ---------------------------------------------------------------------------
# Approximation algorithms for NP-hard problems (Levitin §12.3)
# ---------------------------------------------------------------------------


def tsp_nearest_neighbor(dist: Sequence[Sequence[float]], start: int = 0) -> tuple[float, list[int]]:
    """Traveling Salesman Problem (TSP) tour that always goes to the nearest unvisited city.

    Levitin §12.3 (nearest-neighbor algorithm). Fast (Θ(n^2)) but its
    accuracy ratio is unbounded in general. Returns (cost, tour).
    """
    n = len(dist)
    tour = [start]
    unvisited = set(range(n)) - {start}
    while unvisited:
        last = tour[-1]
        nxt = min(unvisited, key=lambda c: (dist[last][c], c))
        tour.append(nxt)
        unvisited.remove(nxt)
    tour.append(start)
    return tour_cost(dist, tour), tour


def tsp_twice_around_tree(dist: Sequence[Sequence[float]], start: int = 0) -> tuple[float, list[int]]:
    """TSP tour from a Minimum Spanning Tree (MST): walk around it, skipping repeat visits.

    Levitin §12.3 (twice-around-the-tree). For Euclidean (metric) instances
    the tour is at most twice the optimum. Prim's MST in Θ(n^2), then a
    preorder walk (children in index order). Returns (cost, tour).
    """
    n = len(dist)
    in_tree = [False] * n
    best = [math.inf] * n
    parent = [-1] * n
    best[start] = 0
    children: list[list[int]] = [[] for _ in range(n)]
    for _ in range(n):
        u = min((i for i in range(n) if not in_tree[i]), key=lambda i: (best[i], i))
        in_tree[u] = True
        if parent[u] != -1:
            children[parent[u]].append(u)
        for v in range(n):
            if not in_tree[v] and dist[u][v] < best[v]:
                best[v], parent[v] = dist[u][v], u
    tour: list[int] = []

    def walk(u: int) -> None:
        tour.append(u)
        for c in sorted(children[u]):
            walk(c)

    walk(start)
    tour.append(start)
    return tour_cost(dist, tour), tour


def tsp_two_opt(dist: Sequence[Sequence[float]], tour: Sequence[int]) -> tuple[float, list[int]]:
    """Improve a closed tour with 2-opt moves until no 2-change shortens it.

    Levitin §12.3 (local search heuristics): delete two edges and reconnect
    the two paths the other way (reverse a segment). Each pass is Θ(n^2).
    Returns (cost, tour). Uses a small tolerance to avoid float loops.
    """
    best = list(tour)
    n = len(best) - 1  # number of cities; best[0] == best[-1]
    improved = True
    while improved:
        improved = False
        for i in range(1, n - 1):
            for j in range(i + 1, n):
                a, b = best[i - 1], best[i]
                c, d = best[j], best[j + 1]
                delta = dist[a][c] + dist[b][d] - dist[a][b] - dist[c][d]
                if delta < -1e-12:
                    best[i:j + 1] = reversed(best[i:j + 1])
                    improved = True
    return tour_cost(dist, best), best


def knapsack_greedy_approx(weights: Sequence[int], values: Sequence[float], capacity: int,
                           enhanced: bool = True) -> tuple[float, list[int]]:
    """Greedy 0/1 knapsack: add items by decreasing value/weight while they fit.

    Levitin §12.3 (greedy algorithm for the discrete knapsack problem). Plain
    greedy can be arbitrarily bad; the enhanced version returns the better of
    the greedy set and the single most valuable item that fits, which is at
    least half of the optimum. Θ(n log n). Returns (value, items).
    """
    order = sorted(range(len(weights)), key=lambda i: values[i] / weights[i], reverse=True)
    items, total_w, total_v = [], 0, 0
    for i in order:
        if total_w + weights[i] <= capacity:
            items.append(i)
            total_w += weights[i]
            total_v += values[i]
    if enhanced:
        fits = [i for i in range(len(weights)) if weights[i] <= capacity]
        if fits:
            top = max(fits, key=lambda i: values[i])
            if values[top] > total_v:
                return values[top], [top]
    return total_v, sorted(items)


def knapsack_approximation_scheme(weights: Sequence[int], values: Sequence[float],
                                  capacity: int, k: int) -> tuple[float, list[int]]:
    """Sahni's approximation scheme: try every subset of at most k items, then fill greedily.

    Levitin §12.3. The result is within a factor (1 + 1/k) of the optimum.
    O(k n^(k+1)) time - polynomial for each fixed k.
    """
    n = len(weights)
    order = sorted(range(n), key=lambda i: values[i] / weights[i], reverse=True)
    best, best_items = 0, []
    for size in range(k + 1):
        for subset in itertools.combinations(range(n), size):
            w = sum(weights[i] for i in subset)
            if w > capacity:
                continue
            v = sum(values[i] for i in subset)
            chosen = set(subset)
            for i in order:
                if i not in chosen and w + weights[i] <= capacity:
                    chosen.add(i)
                    w += weights[i]
                    v += values[i]
            if v > best:
                best, best_items = v, sorted(chosen)
    return best, best_items


def first_fit(items: Sequence[float], capacity: float = 1.0) -> list[list[float]]:
    """Bin packing: put each item into the first bin with room, else open a new bin.

    Levitin Exercise 12.3 (first-fit). Uses at most about 1.7 x optimal bins.
    Θ(n^2) with a simple scan. Returns the bins as lists of item sizes.
    """
    bins: list[list[float]] = []
    loads: list[float] = []
    for x in items:
        if x > capacity:
            raise ValueError("an item is larger than the bin capacity")
        for b in range(len(bins)):
            if loads[b] + x <= capacity + 1e-12:
                bins[b].append(x)
                loads[b] += x
                break
        else:
            bins.append([x])
            loads.append(x)
    return bins


def first_fit_decreasing(items: Sequence[float], capacity: float = 1.0) -> list[list[float]]:
    """First-fit after sorting items from largest to smallest (First-Fit Decreasing, FFD).

    Levitin Exercise 12.3. Uses at most 11/9 x (optimal number of bins) + 6/9 bins. Θ(n^2).
    """
    return first_fit(sorted(items, reverse=True), capacity)


# ---------------------------------------------------------------------------
# Solving nonlinear equations (Levitin §12.4)
# ---------------------------------------------------------------------------


def bisection(f: Callable[[float], float], a: float, b: float, tol: float = 1e-10,
              max_iter: int = 200) -> tuple[float, list[tuple[int, float, float, float, float]]]:
    """Root of f in [a, b] (needs f(a), f(b) of opposite signs) by halving the interval.

    Levitin §12.4 (bisection method). Each step halves the bracket, so
    about log2((b - a)/tol) iterations: O(log((b - a)/tol)) evaluations of f. Returns (root, log) where each log row
    is (iteration, a, b, midpoint, f(midpoint)).
    """
    fa, fb = f(a), f(b)
    if fa == 0:
        return a, []
    if fb == 0:
        return b, []
    if fa * fb > 0:
        raise ValueError("f(a) and f(b) must have opposite signs")
    log = []
    x = (a + b) / 2
    for it in range(1, max_iter + 1):
        x = (a + b) / 2
        fx = f(x)
        log.append((it, a, b, x, fx))
        if fx == 0 or (b - a) / 2 < tol:
            break
        if fa * fx < 0:
            b, fb = x, fx
        else:
            a, fa = x, fx
    return x, log


def false_position(f: Callable[[float], float], a: float, b: float, tol: float = 1e-10,
                   max_iter: int = 500) -> tuple[float, list[tuple[int, float, float, float, float]]]:
    """Root of f in [a, b] using the x-intercept of the secant line (regula falsi).

    Levitin §12.4 (method of false position). Log rows are
    (iteration, a, b, x, f(x)); stops when |f(x)| < tol. Usually converges
    faster than bisection; at most O(max_iter) evaluations of f.
    """
    fa, fb = f(a), f(b)
    if fa * fb > 0:
        raise ValueError("f(a) and f(b) must have opposite signs")
    log = []
    x = a
    for it in range(1, max_iter + 1):
        x = (a * fb - b * fa) / (fb - fa)
        fx = f(x)
        log.append((it, a, b, x, fx))
        if abs(fx) < tol:
            break
        if fa * fx < 0:
            b, fb = x, fx
        else:
            a, fa = x, fx
    return x, log


def newton(f: Callable[[float], float], df: Callable[[float], float], x0: float,
           tol: float = 1e-12, max_iter: int = 100) -> tuple[float, list[tuple[int, float, float]]]:
    """Root by Newton's method x_{n+1} = x_n - f(x_n) / f'(x_n).

    Levitin §12.4. Converges quadratically near a simple root when started
    close enough; may diverge otherwise. Log rows are (n, x_n, f(x_n)).
    O(max_iter) evaluations; typically only a handful.
    """
    x = x0
    log = []
    for it in range(max_iter):
        fx = f(x)
        log.append((it, x, fx))
        d = df(x)
        if d == 0:
            raise ZeroDivisionError("derivative is zero; Newton's method cannot continue")
        x_new = x - fx / d
        if abs(x_new - x) < tol:
            log.append((it + 1, x_new, f(x_new)))
            return x_new, log
        x = x_new
    return x, log
