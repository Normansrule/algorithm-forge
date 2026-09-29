"""Chapter 14 (Beyond Levitin) - Advanced Graph Algorithms.

Negative edge weights (Bellman-Ford), heuristic search (A*), Strongly
Connected Components (SCC), bridges and articulation points, and longest paths
in a Directed Acyclic Graph (DAG). References: Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms*, 3rd ed. (CLRS) Ch. 22-24; Sedgewick & Wayne, *Algorithms*, 4th ed., Ch. 4.
"""

from __future__ import annotations

import heapq
import itertools
import math
from typing import Hashable, Sequence

from .ch04_decrease_conquer import topological_sort_dfs

Edge = tuple[Hashable, Hashable, float]


def bellman_ford(vertices: Sequence[Hashable], edges: Sequence[Edge], source: Hashable
                 ) -> tuple[dict[Hashable, float], dict[Hashable, Hashable | None], bool]:
    """Single-source shortest paths that allow negative weights; detects negative cycles.

    CLRS §24.1. Relax every edge |V| - 1 times (a shortest path has at most
    |V| - 1 edges); if a further pass still improves a distance, a negative
    cycle is reachable from the source. Returns (dist, parent,
    has_negative_cycle). Θ(|V| |E|) time; Θ(|V|) space.
    """
    dist = {v: math.inf for v in vertices}
    parent: dict[Hashable, Hashable | None] = {v: None for v in vertices}
    dist[source] = 0
    for _ in range(len(vertices) - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
                changed = True
        if not changed:
            break
    has_negative_cycle = any(dist[u] + w < dist[v] for u, v, w in edges)
    return dist, parent, has_negative_cycle


def a_star_grid(grid: Sequence[Sequence[int]] | Sequence[str], start: tuple[int, int],
                goal: tuple[int, int]) -> tuple[list[tuple[int, int]] | None, int]:
    """Shortest 4-directional path on a grid with A* search and the Manhattan heuristic.

    Hart, Nilsson & Raphael (1968). Priority = steps so far (g) + Manhattan
    distance to the goal (h). Because h never overestimates, the first time
    the goal is popped its path is shortest. Walls are 1 (or '#').
    Returns (path of (row, col) cells or None, nodes expanded).
    O(E log V) time on the grid graph.
    """
    rows, cols = len(grid), len(grid[0])

    def blocked(r: int, c: int) -> bool:
        cell = grid[r][c]
        return cell == 1 or cell == "#"

    def h(cell: tuple[int, int]) -> int:
        return abs(cell[0] - goal[0]) + abs(cell[1] - goal[1])

    if blocked(*start) or blocked(*goal):
        return None, 0
    tie = itertools.count()
    heap = [(h(start), next(tie), 0, start)]
    g = {start: 0}
    parent: dict[tuple[int, int], tuple[int, int] | None] = {start: None}
    closed: set[tuple[int, int]] = set()
    expanded = 0
    while heap:
        _, _, cost, cell = heapq.heappop(heap)
        if cell in closed:
            continue
        closed.add(cell)
        expanded += 1
        if cell == goal:
            path = [cell]
            while parent[path[-1]] is not None:
                path.append(parent[path[-1]])  # type: ignore[arg-type]
            return path[::-1], expanded
        r, c = cell
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and not blocked(nr, nc):
                nxt = (nr, nc)
                if cost + 1 < g.get(nxt, math.inf):
                    g[nxt] = cost + 1
                    parent[nxt] = cell
                    heapq.heappush(heap, (cost + 1 + h(nxt), next(tie), cost + 1, nxt))
    return None, expanded


def _vertices(graph: dict[Hashable, Sequence[Hashable]]) -> list[Hashable]:
    seen = dict.fromkeys(graph)
    for nbrs in graph.values():
        for v in nbrs:
            seen.setdefault(v, None)
    return list(seen)


def kosaraju_scc(graph: dict[Hashable, Sequence[Hashable]]) -> list[list[Hashable]]:
    """Strongly Connected Components (SCC) of a digraph by Kosaraju's two-pass algorithm.

    CLRS §22.5. Pass 1: Depth-First Search (DFS) records finishing order.
    Pass 2: DFS on the reversed graph in decreasing finish time; each tree is
    one component. Θ(|V| + |E|) time and space. (Iterative, no recursion limit.)
    """
    vertices = _vertices(graph)
    visited: set[Hashable] = set()
    finish: list[Hashable] = []
    for s in vertices:
        if s in visited:
            continue
        visited.add(s)
        stack = [(s, iter(graph.get(s, [])))]
        while stack:
            u, it = stack[-1]
            advanced = False
            for v in it:
                if v not in visited:
                    visited.add(v)
                    stack.append((v, iter(graph.get(v, []))))
                    advanced = True
                    break
            if not advanced:
                stack.pop()
                finish.append(u)
    reverse: dict[Hashable, list[Hashable]] = {v: [] for v in vertices}
    for u in graph:
        for v in graph[u]:
            reverse[v].append(u)
    assigned: set[Hashable] = set()
    components = []
    for s in reversed(finish):
        if s in assigned:
            continue
        comp = []
        stack2 = [s]
        assigned.add(s)
        while stack2:
            u = stack2.pop()
            comp.append(u)
            for v in reverse[u]:
                if v not in assigned:
                    assigned.add(v)
                    stack2.append(v)
        components.append(comp)
    return components


def bridges_and_articulation_points(graph: dict[Hashable, Sequence[Hashable]]
                                    ) -> tuple[list[tuple[Hashable, Hashable]], set[Hashable]]:
    """Bridges (edges whose removal disconnects) and articulation points of an undirected graph.

    Tarjan (1974), CLRS Problem 22-2. DFS assigns discovery times; low[u] is
    the earliest discovery time reachable from u's subtree using one back
    edge. Tree edge (u, v) is a bridge iff low[v] > disc[u]; non-root u is an
    articulation point iff some child v has low[v] >= disc[u]; the root is
    one iff it has two or more DFS children. Θ(|V| + |E|).
    Assumes a simple graph (no parallel edges).
    """
    disc: dict[Hashable, int] = {}
    low: dict[Hashable, int] = {}
    bridges: list[tuple[Hashable, Hashable]] = []
    points: set[Hashable] = set()
    timer = itertools.count()

    def visit(u: Hashable, parent: Hashable | None) -> None:
        disc[u] = low[u] = next(timer)
        children = 0
        for v in graph.get(u, []):
            if v not in disc:
                children += 1
                visit(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > disc[u]:
                    bridges.append((u, v))
                if parent is not None and low[v] >= disc[u]:
                    points.add(u)
            elif v != parent:
                low[u] = min(low[u], disc[v])
        if parent is None and children >= 2:
            points.add(u)

    for s in _vertices(graph):
        if s not in disc:
            visit(s, None)
    return bridges, points


def dag_longest_path(graph: dict[Hashable, Sequence[tuple[Hashable, float]]],
                     source: Hashable | None = None) -> tuple[float, list[Hashable]]:
    """Longest (heaviest) path in a weighted Directed Acyclic Graph (DAG).

    CLRS §24.2 idea (critical path method): process vertices in topological
    order and relax edges with max instead of min. With ``source`` given, only
    paths starting there count; otherwise any start is allowed.
    Returns (length, path). Θ(|V| + |E|). Raises ValueError on a cycle.
    """
    plain = {u: [v for v, _ in nbrs] for u, nbrs in graph.items()}
    order = topological_sort_dfs(plain)
    if order is None:
        raise ValueError("graph has a cycle")
    best: dict[Hashable, float] = {}
    parent: dict[Hashable, Hashable | None] = {}
    for v in order:
        if source is None:
            best[v], parent[v] = 0, None
        else:
            best[v], parent[v] = (0 if v == source else -math.inf), None
    for u in order:
        if best[u] == -math.inf:
            continue
        for v, w in graph.get(u, []):
            if best[u] + w > best[v]:
                best[v] = best[u] + w
                parent[v] = u
    end = max(order, key=lambda v: best[v])
    path = [end]
    while parent[path[-1]] is not None:
        path.append(parent[path[-1]])  # type: ignore[arg-type]
    return best[end], path[::-1]
