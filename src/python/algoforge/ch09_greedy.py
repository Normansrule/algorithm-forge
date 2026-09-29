"""Chapter 9 - Greedy Technique.

Build a solution one piece at a time, always taking the choice that looks best
right now; the choice must be feasible, locally optimal and irrevocable
(Levitin §9.0). Greedy is optimal only for problems with the right structure,
so each optimal algorithm below comes with a proof in the book.

Weighted graph convention: adjacency dict ``{u: [(v, weight), ...]}``; for an
undirected graph list every edge in both directions (``edges_to_adjacency``
does this for you).
"""

from __future__ import annotations

import heapq
import itertools
import math
from typing import Hashable, Sequence

from .counters import OpCounter, tick

WeightedGraph = dict[Hashable, list[tuple[Hashable, float]]]
Edge = tuple[Hashable, Hashable, float]


def edges_to_adjacency(edges: Sequence[Edge], directed: bool = False) -> WeightedGraph:
    """Turn an edge list [(u, v, w), ...] into a weighted adjacency dict. Θ(|E|)."""
    graph: WeightedGraph = {}
    for u, v, w in edges:
        graph.setdefault(u, []).append((v, w))
        graph.setdefault(v, [])
        if not directed:
            graph[v].append((u, w))
    return graph


# ---------------------------------------------------------------------------
# Simple greedy choices
# ---------------------------------------------------------------------------


def greedy_change(denominations: Sequence[int], amount: int) -> list[int] | None:
    """Make change using as many of the largest coin as possible, then the next...

    Levitin §9.0 (change-making). Optimal for "canonical" systems like United States (US)
    coins, but NOT in general (for {1, 3, 4} and 6 it gives 4+1+1, not 3+3).
    Returns the coin list, or None if exact change is impossible this way.
    Θ(m log m) for m denominations (sorting) plus the output.
    """
    coins = []
    for d in sorted(denominations, reverse=True):
        count, amount = divmod(amount, d)
        coins.extend([d] * count)
    return coins if amount == 0 else None


def activity_selection(intervals: Sequence[tuple[float, float]]) -> list[int]:
    """Largest set of non-overlapping activities: repeatedly take the one that ends first.

    Levitin Exercise 9.1 (activity selection / interval scheduling).
    An activity (s, f) is compatible when s >= the last chosen finish time.
    Returns chosen indices in finishing order. Θ(n log n) time; Θ(n) space.
    """
    order = sorted(range(len(intervals)), key=lambda i: (intervals[i][1], intervals[i][0]))
    chosen = []
    last_finish = -math.inf
    for i in order:
        start, finish = intervals[i]
        if start >= last_finish:
            chosen.append(i)
            last_finish = finish
    return chosen


def fractional_knapsack(weights: Sequence[float], values: Sequence[float],
                        capacity: float) -> tuple[float, list[float]]:
    """Best value when items may be split: take items by value/weight ratio, highest first.

    Levitin §12.3 (continuous knapsack, solved exactly by greedy). Returns
    (value, fraction of each item taken). Θ(n log n) time; Θ(n) space.
    """
    n = len(weights)
    fractions = [0.0] * n
    order = sorted(range(n), key=lambda i: values[i] / weights[i], reverse=True)
    remaining = capacity
    total = 0.0
    for i in order:
        if remaining <= 0:
            break
        take = min(1.0, remaining / weights[i])
        fractions[i] = take
        total += take * values[i]
        remaining -= take * weights[i]
    return total, fractions


# ---------------------------------------------------------------------------
# Minimum Spanning Tree (MST): Prim (Levitin §9.1) and Kruskal (Levitin §9.2)
# ---------------------------------------------------------------------------


def prim(graph: WeightedGraph, start: Hashable | None = None,
         counter: OpCounter | None = None) -> tuple[float, list[Edge]]:
    """Minimum Spanning Tree (MST) grown from one vertex by always adding the cheapest fringe edge.

    Levitin §9.1 (Prim). Uses a binary min-heap with lazy deletion of stale
    entries. Returns (total weight, tree edges (u, v, w) in the order added).
    Only the start vertex's connected component is spanned.
    Θ(|E| log |V|) time; Θ(|E|) space.
    """
    if not graph:
        return 0, []
    start = next(iter(graph)) if start is None else start
    in_tree = {start}
    tie = itertools.count()
    heap = [(w, next(tie), start, v) for v, w in graph[start]]
    heapq.heapify(heap)
    tree: list[Edge] = []
    total = 0.0
    while heap:
        w, _, u, v = heapq.heappop(heap)
        tick(counter, "heap_pops")
        if v in in_tree:
            continue
        in_tree.add(v)
        tree.append((u, v, w))
        total += w
        for x, wx in graph[v]:
            if x not in in_tree:
                heapq.heappush(heap, (wx, next(tie), v, x))
    return total, tree


class UnionFind:
    """Disjoint subsets with union by size (quick union), as used by Kruskal.

    Levitin §9.2 (disjoint subsets and union-find algorithms). find is
    O(log n) with union by size; union is O(1) after the two finds.
    (Chapter 13 adds path compression for nearly O(1) operations.)
    """

    def __init__(self, items=()):
        self.parent: dict[Hashable, Hashable] = {}
        self.size: dict[Hashable, int] = {}
        for x in items:
            self.make_set(x)

    def make_set(self, x: Hashable) -> None:
        """Create the one-element subset {x} (ignored if x exists). O(1)."""
        if x not in self.parent:
            self.parent[x] = x
            self.size[x] = 1

    def find(self, x: Hashable) -> Hashable:
        """Representative (root) of the subset containing x. O(log n)."""
        while self.parent[x] != x:
            x = self.parent[x]
        return x

    def union(self, x: Hashable, y: Hashable) -> bool:
        """Merge the subsets of x and y; return False if they were already together. O(log n)."""
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        self.size[rx] += self.size[ry]
        return True


def kruskal(vertices: Sequence[Hashable], edges: Sequence[Edge],
            counter: OpCounter | None = None) -> tuple[float, list[Edge]]:
    """Minimum Spanning Tree (MST) by scanning edges in weight order, skipping cycle-makers.

    Levitin §9.2 (Kruskal). Union-find detects whether an edge joins two
    different trees. For a disconnected graph this gives a minimum spanning
    forest. Θ(|E| log |E|) time; Θ(|V| + |E|) space.
    """
    uf = UnionFind(vertices)
    tree: list[Edge] = []
    total = 0.0
    for u, v, w in sorted(edges, key=lambda e: e[2]):
        tick(counter, "edges_examined")
        if uf.union(u, v):
            tree.append((u, v, w))
            total += w
            if len(tree) == len(vertices) - 1:
                break
    return total, tree


# ---------------------------------------------------------------------------
# Dijkstra's algorithm (Levitin §9.3)
# ---------------------------------------------------------------------------


def dijkstra(graph: WeightedGraph, source: Hashable,
             counter: OpCounter | None = None) -> tuple[dict[Hashable, float], dict[Hashable, Hashable | None]]:
    """Single-source shortest paths for non-negative edge weights.

    Levitin §9.3 (Dijkstra). Repeatedly finalize the closest unfinished
    vertex, then relax its outgoing edges. Returns (dist, parent); unreachable
    vertices have dist = math.inf and parent None.
    Θ((|V| + |E|) log |V|) with a binary heap; Θ(|V| + |E|) space.
    """
    vertices = set(graph)
    for nbrs in graph.values():
        vertices.update(v for v, _ in nbrs)
    dist = {v: math.inf for v in vertices}
    parent: dict[Hashable, Hashable | None] = {v: None for v in vertices}
    dist[source] = 0
    tie = itertools.count()
    heap = [(0, next(tie), source)]
    done: set[Hashable] = set()
    while heap:
        d, _, u = heapq.heappop(heap)
        if u in done:
            continue
        done.add(u)
        for v, w in graph.get(u, []):
            if w < 0:
                raise ValueError("Dijkstra requires non-negative weights")
            tick(counter, "relaxations")
            if d + w < dist[v]:
                dist[v] = d + w
                parent[v] = u
                heapq.heappush(heap, (dist[v], next(tie), v))
    return dist, parent


def reconstruct_path(parent: dict[Hashable, Hashable | None], target: Hashable) -> list[Hashable]:
    """Follow parent links back from target to the source; returns source..target. Θ(path)."""
    path = [target]
    while parent.get(path[-1]) is not None:
        path.append(parent[path[-1]])
    return path[::-1]


# ---------------------------------------------------------------------------
# Huffman trees and codes (Levitin §9.4)
# ---------------------------------------------------------------------------


def huffman_codes(frequencies: dict[Hashable, float]) -> dict[Hashable, str]:
    """Optimal prefix-free binary code: repeatedly merge the two lightest trees.

    Levitin §9.4 (Huffman's algorithm). Deterministic tie-breaking: symbols
    enter the heap in sorted order, merged trees get increasing sequence
    numbers, and the first tree popped becomes the left (bit 0) child.
    A single symbol gets the code "0". Θ(n log n) time; Θ(n) space.
    """
    if not frequencies:
        return {}
    if len(frequencies) == 1:
        return {next(iter(frequencies)): "0"}
    seq = itertools.count()
    heap: list[tuple[float, int, object]] = []
    for sym in sorted(frequencies, key=repr):
        heap.append((frequencies[sym], next(seq), ("leaf", sym)))
    heapq.heapify(heap)
    while len(heap) > 1:
        w1, _, t1 = heapq.heappop(heap)
        w2, _, t2 = heapq.heappop(heap)
        heapq.heappush(heap, (w1 + w2, next(seq), ("node", t1, t2)))
    codes: dict[Hashable, str] = {}

    def walk(tree, prefix: str) -> None:
        if tree[0] == "leaf":
            codes[tree[1]] = prefix
        else:
            walk(tree[1], prefix + "0")
            walk(tree[2], prefix + "1")

    walk(heap[0][2], "")
    return codes


def average_code_length(frequencies: dict[Hashable, float], codes: dict[Hashable, str]) -> float:
    """Expected bits per symbol: sum f_i * len(code_i) / sum f_i. Levitin §9.4. Θ(n)."""
    total = sum(frequencies.values())
    return sum(frequencies[s] * len(codes[s]) for s in frequencies) / total


def huffman_encode(text: str, codes: dict[Hashable, str]) -> str:
    """Concatenate the codewords of each character. Θ(output length)."""
    return "".join(codes[ch] for ch in text)


def huffman_decode(bits: str, codes: dict[Hashable, str]) -> list:
    """Decode a bit string with a prefix-free code (reads bit by bit). Θ(len(bits))."""
    reverse = {c: s for s, c in codes.items()}
    out, current = [], ""
    for b in bits:
        current += b
        if current in reverse:
            out.append(reverse[current])
            current = ""
    if current:
        raise ValueError("bit string ends in the middle of a codeword")
    return out
