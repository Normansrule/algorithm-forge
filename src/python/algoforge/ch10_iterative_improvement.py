"""Chapter 10 - Iterative Improvement.

Start with a feasible solution and repeatedly apply a small change that makes
it better, until no improving change exists (Levitin §10.0). The hard part is
proving that "no local improvement" really means "globally optimal", which
holds for all four problems below.
"""

from __future__ import annotations

from collections import deque
from fractions import Fraction
from typing import Hashable, NamedTuple, Sequence

# ---------------------------------------------------------------------------
# The simplex method (Levitin §10.1)
# ---------------------------------------------------------------------------


class SimplexResult(NamedTuple):
    """Outcome of ``simplex``: status is "optimal" or "unbounded"."""

    status: str
    x: list[Fraction] | None
    value: Fraction | None
    tableaux: list[list[list[Fraction]]]
    pivots: list[tuple[int, int]]


def simplex(c: Sequence[float], A: Sequence[Sequence[float]], b: Sequence[float],
            rule: str = "dantzig", max_iterations: int = 1000) -> SimplexResult:
    """Maximize c·x subject to A x <= b, x >= 0 (with b >= 0) by the tableau simplex method.

    Levitin §10.1. Slack variables make the origin the first basic feasible
    solution. Each iteration: the entering column has a negative entry in the
    objective row ("dantzig" = most negative; "bland" = smallest index, which
    can never cycle); the leaving row wins the minimum-ratio test (ties go to
    the smallest basic variable). Exact ``Fraction`` arithmetic is used and
    every tableau is recorded (the last row is the objective row, the last
    column the right-hand side). Each pivot is Θ(m(n + m)); the number of
    pivots is exponential in the worst case but small in practice.
    """
    m, n = len(A), len(c)
    if any(bi < 0 for bi in b):
        raise ValueError("this simplex version needs b >= 0 (origin must be feasible)")
    T: list[list[Fraction]] = []
    for i in range(m):
        row = [Fraction(v) for v in A[i]] + [Fraction(1 if k == i else 0) for k in range(m)] + [Fraction(b[i])]
        T.append(row)
    T.append([Fraction(-v) for v in c] + [Fraction(0)] * m + [Fraction(0)])
    basis = [n + i for i in range(m)]  # slack variables start in the basis
    tableaux = [[list(r) for r in T]]
    pivots: list[tuple[int, int]] = []
    width = n + m

    for _ in range(max_iterations):
        obj = T[-1]
        negatives = [j for j in range(width) if obj[j] < 0]
        if not negatives:
            x = [Fraction(0)] * (n + m)
            for i, var in enumerate(basis):
                x[var] = T[i][-1]
            return SimplexResult("optimal", x[:n], T[-1][-1], tableaux, pivots)
        if rule == "bland":
            col = negatives[0]
        else:
            col = min(negatives, key=lambda j: (obj[j], j))
        best_row = None
        best_key = None
        for i in range(m):
            if T[i][col] > 0:
                key = (T[i][-1] / T[i][col], basis[i])
                if best_key is None or key < best_key:
                    best_key, best_row = key, i
        if best_row is None:
            return SimplexResult("unbounded", None, None, tableaux, pivots)
        # Pivot: scale the pivot row, then clear the column elsewhere.
        pr = best_row
        pv = T[pr][col]
        T[pr] = [v / pv for v in T[pr]]
        for i in range(m + 1):
            if i != pr and T[i][col] != 0:
                factor = T[i][col]
                T[i] = [a - factor * p for a, p in zip(T[i], T[pr])]
        basis[pr] = col
        pivots.append((pr, col))
        tableaux.append([list(r) for r in T])
    raise RuntimeError("simplex did not finish; try rule='bland'")


# ---------------------------------------------------------------------------
# Maximum flow (Levitin §10.2)
# ---------------------------------------------------------------------------

Capacities = dict[Hashable, dict[Hashable, float]]


class MaxFlowResult(NamedTuple):
    """Maximum flow value, flow on each original edge, and a minimum cut."""

    value: float
    flow: dict[tuple[Hashable, Hashable], float]
    source_side: set
    cut_edges: list[tuple[Hashable, Hashable]]


def max_flow(capacity: Capacities, source: Hashable, sink: Hashable) -> MaxFlowResult:
    """Maximum flow by the shortest-augmenting-path method (Edmonds-Karp).

    Levitin §10.2. Find an augmenting path with the fewest edges by Breadth-
    First Search (BFS) in the residual network, push its bottleneck amount,
    repeat. When no path remains, the vertices still reachable from the
    source form the source side of a minimum cut, and by the Max-Flow Min-Cut
    Theorem its capacity equals the flow value. O(|V| |E|^2) time.
    """
    vertices = set(capacity)
    for u in capacity:
        vertices.update(capacity[u])
    cap: dict[tuple, float] = {}
    neighbors: dict[Hashable, set] = {v: set() for v in vertices}
    for u in capacity:
        for v, c in capacity[u].items():
            cap[(u, v)] = cap.get((u, v), 0) + c
            neighbors[u].add(v)
            neighbors[v].add(u)  # backward residual edge
    f: dict[tuple, float] = {}  # skew-symmetric: f[(v, u)] = -f[(u, v)]

    def residual(u, v) -> float:
        return cap.get((u, v), 0) - f.get((u, v), 0)

    def bfs_parents() -> dict | None:
        parent = {source: None}
        queue = deque([source])
        while queue:
            u = queue.popleft()
            for v in sorted(neighbors[u], key=repr):
                if v not in parent and residual(u, v) > 0:
                    parent[v] = u
                    if v == sink:
                        return parent
                    queue.append(v)
        return None

    value = 0
    while True:
        parent = bfs_parents()
        if parent is None:
            break
        # bottleneck along the path
        push = float("inf")
        v = sink
        while parent[v] is not None:
            u = parent[v]
            push = min(push, residual(u, v))
            v = u
        v = sink
        while parent[v] is not None:
            u = parent[v]
            f[(u, v)] = f.get((u, v), 0) + push
            f[(v, u)] = f.get((v, u), 0) - push
            v = u
        value += push

    # Minimum cut: everything reachable from the source in the residual network.
    reach = {source}
    queue = deque([source])
    while queue:
        u = queue.popleft()
        for v in neighbors[u]:
            if v not in reach and residual(u, v) > 0:
                reach.add(v)
                queue.append(v)
    flow = {(u, v): max(0, f.get((u, v), 0)) for (u, v) in cap}
    cut_edges = sorted(((u, v) for (u, v) in cap if u in reach and v not in reach), key=repr)
    return MaxFlowResult(value, flow, reach, cut_edges)


# ---------------------------------------------------------------------------
# Maximum matching in bipartite graphs (Levitin §10.3)
# ---------------------------------------------------------------------------


def bipartite_max_matching(left: Sequence[Hashable], right: Sequence[Hashable],
                           edges: Sequence[tuple[Hashable, Hashable]]) -> list[tuple[Hashable, Hashable]]:
    """Maximum matching by repeatedly finding augmenting paths with BFS.

    Levitin §10.3. An augmenting path starts at a free left vertex, alternates
    non-matching / matching edges, and ends at a free right vertex; flipping
    its edges grows the matching by one. When no augmenting path exists the
    matching is maximum (Berge's theorem). O(|V| |E|) time.
    Returns (left, right) pairs sorted by left-vertex order.
    """
    adj: dict[Hashable, list[Hashable]] = {u: [] for u in left}
    for u, v in edges:
        adj[u].append(v)
    mate_left: dict[Hashable, Hashable | None] = {u: None for u in left}
    mate_right: dict[Hashable, Hashable | None] = {v: None for v in right}

    def augment_from(start: Hashable) -> bool:
        # BFS over left vertices; label right vertices with the left vertex that reached them.
        came_from: dict[Hashable, Hashable] = {}
        queue = deque([start])
        visited_left = {start}
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                if v in came_from:
                    continue
                came_from[v] = u
                if mate_right[v] is None:  # free right vertex: flip the path
                    while True:
                        u_prev = came_from[v]
                        next_v = mate_left[u_prev]
                        mate_left[u_prev] = v
                        mate_right[v] = u_prev
                        if u_prev == start:
                            return True
                        v = next_v
                w = mate_right[v]
                if w not in visited_left:
                    visited_left.add(w)
                    queue.append(w)
        return False

    improved = True
    while improved:
        improved = False
        for u in left:
            if mate_left[u] is None and augment_from(u):
                improved = True
    return [(u, mate_left[u]) for u in left if mate_left[u] is not None]


# ---------------------------------------------------------------------------
# The stable marriage problem (Levitin §10.4)
# ---------------------------------------------------------------------------


class Proposal(NamedTuple):
    """One step of Gale-Shapley: who proposed to whom, and what happened."""

    man: Hashable
    woman: Hashable
    accepted: bool
    replaced: Hashable | None  # the man she dropped, if any


def gale_shapley(men_prefs: dict[Hashable, Sequence[Hashable]],
                 women_prefs: dict[Hashable, Sequence[Hashable]]) -> tuple[dict, list[Proposal]]:
    """Stable matching by the Gale-Shapley proposal algorithm (men propose).

    Levitin §10.4. A free man proposes to the best woman he has not yet asked;
    she accepts if she is free or prefers him to her current partner (who
    becomes free). The result is stable and man-optimal. Free men are served
    first-in-first-out in dict order. Returns (matching man -> woman,
    proposal log). Θ(n^2) proposals in the worst case.
    """
    rank = {w: {m: i for i, m in enumerate(prefs)} for w, prefs in women_prefs.items()}
    next_choice = {m: 0 for m in men_prefs}
    partner_of_woman: dict[Hashable, Hashable] = {}
    free = deque(men_prefs)
    log: list[Proposal] = []
    while free:
        m = free[0]
        if next_choice[m] >= len(men_prefs[m]):
            free.popleft()  # he has asked everyone (only with incomplete lists)
            continue
        w = men_prefs[m][next_choice[m]]
        next_choice[m] += 1
        current = partner_of_woman.get(w)
        if current is None:
            partner_of_woman[w] = m
            free.popleft()
            log.append(Proposal(m, w, True, None))
        elif rank[w][m] < rank[w][current]:
            partner_of_woman[w] = m
            free.popleft()
            free.append(current)
            log.append(Proposal(m, w, True, current))
        else:
            log.append(Proposal(m, w, False, None))
    matching = {m: w for w, m in partner_of_woman.items()}
    return dict(sorted(matching.items(), key=lambda kv: list(men_prefs).index(kv[0]))), log


def is_stable(matching: dict, men_prefs: dict, women_prefs: dict) -> bool:
    """True when no man and woman both prefer each other to their partners. Θ(n^2)."""
    wife = matching
    husband = {w: m for m, w in matching.items()}
    for m, prefs in men_prefs.items():
        for w in prefs:
            if w == wife.get(m):
                break  # every later woman is worse for m
            h = husband.get(w)
            if h is None or women_prefs[w].index(m) < women_prefs[w].index(h):
                return False
    return True
