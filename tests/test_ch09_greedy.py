"""Tests for Chapter 9 - greedy technique."""

import itertools
import math
import random

import pytest

from algoforge import OpCounter
from algoforge import ch09_greedy as gr
from algoforge import ch08_dynamic_programming as dp


def test_greedy_change():
    assert gr.greedy_change([25, 10, 5, 1], 48) == [25, 10, 10, 1, 1, 1]
    assert gr.greedy_change([4, 3, 1], 6) == [4, 1, 1]  # not optimal (3 + 3 is)
    assert gr.greedy_change([5, 10], 3) is None
    rng = random.Random(1)
    for _ in range(100):  # US coins are canonical: greedy == DP
        amount = rng.randint(0, 200)
        assert len(gr.greedy_change([1, 5, 10, 25], amount)) == dp.change_making([1, 5, 10, 25], amount)[0]


def test_activity_selection_vs_brute():
    rng = random.Random(2)
    for _ in range(150):
        n = rng.randint(0, 9)
        acts = []
        for _ in range(n):
            s = rng.randint(0, 20)
            acts.append((s, s + rng.randint(1, 6)))
        chosen = gr.activity_selection(acts)
        picked = sorted(acts[i] for i in chosen)
        assert all(a[1] <= b[0] for a, b in zip(picked, picked[1:]))
        best = 0
        for r in range(n + 1):
            for sub in itertools.combinations(sorted(acts), r):
                if all(a[1] <= b[0] for a, b in zip(sub, sub[1:])):
                    best = max(best, r)
        assert len(chosen) == best


def test_fractional_knapsack():
    value, fractions = gr.fractional_knapsack([10, 20, 30], [60, 100, 120], 50)
    assert value == 240 and fractions == [1.0, 1.0, pytest.approx(2 / 3)]
    rng = random.Random(3)
    for _ in range(100):
        n = rng.randint(1, 7)
        w = [rng.randint(1, 10) for _ in range(n)]
        v = [rng.randint(1, 30) for _ in range(n)]
        W = rng.randint(0, 40)
        value, fr = gr.fractional_knapsack(w, v, W)
        assert sum(f * wi for f, wi in zip(fr, w)) <= W + 1e-9
        assert value >= dp.knapsack_dp(w, v, W)[0] - 1e-9  # relaxation is never worse


def spanning_tree_brute(vertices, edges):
    """Minimum total weight over all (|V|-1)-edge subsets that form a spanning tree."""
    best = math.inf
    n = len(vertices)
    for sub in itertools.combinations(edges, n - 1):
        uf = gr.UnionFind(vertices)
        if all(uf.union(u, v) for u, v, _ in sub):
            best = min(best, sum(w for _, _, w in sub))
    return best


def random_connected_graph(rng, n, p=0.5):
    edges = [(i, rng.randrange(i), rng.randint(1, 9)) for i in range(1, n)]  # a random tree
    have = {(max(u, v), min(u, v)) for u, v, _ in edges}
    for u, v in itertools.combinations(range(n), 2):
        if (v, u) not in have and rng.random() < p:
            edges.append((u, v, rng.randint(1, 9)))
    return edges


def test_prim_and_kruskal_vs_brute_force():
    edges = [("a", "b", 3), ("a", "e", 6), ("a", "f", 5), ("b", "c", 1), ("b", "f", 4),
             ("c", "d", 6), ("c", "f", 4), ("d", "e", 8), ("d", "f", 5), ("e", "f", 2)]
    g = gr.edges_to_adjacency(edges)
    assert gr.prim(g, "a")[0] == 15
    assert gr.kruskal(list("abcdef"), edges)[0] == 15
    rng = random.Random(4)
    for _ in range(80):
        n = rng.randint(1, 7)
        edges = random_connected_graph(rng, n)
        g = gr.edges_to_adjacency(edges)
        g.setdefault(0, [])
        truth = spanning_tree_brute(list(range(n)), edges) if n > 1 else 0
        total_p, tree_p = gr.prim(g, 0)
        total_k, tree_k = gr.kruskal(list(range(n)), edges)
        assert total_p == truth == total_k
        assert len(tree_p) == len(tree_k) == n - 1


def test_kruskal_forest_on_disconnected_graph():
    total, tree = gr.kruskal([1, 2, 3, 4], [(1, 2, 5), (3, 4, 1)])
    assert total == 6 and len(tree) == 2
    assert gr.prim({}, None) == (0, [])


def test_union_find_by_size():
    uf = gr.UnionFind(range(6))
    assert uf.union(0, 1) and uf.union(2, 3) and uf.union(1, 3)
    assert not uf.union(0, 2)
    assert uf.find(0) == uf.find(3) != uf.find(4)
    assert uf.size[uf.find(0)] == 4


def test_dijkstra_vs_bellman_ford_relaxation():
    edges = [("a", "b", 3), ("a", "d", 7), ("b", "c", 4), ("b", "d", 2), ("c", "d", 5),
             ("c", "e", 6), ("d", "e", 4)]
    dist, parent = gr.dijkstra(gr.edges_to_adjacency(edges), "a")
    assert dist == {"a": 0, "b": 3, "c": 7, "d": 5, "e": 9}
    assert gr.reconstruct_path(parent, "e") == ["a", "b", "d", "e"]
    rng = random.Random(5)
    for _ in range(100):
        n = rng.randint(1, 9)
        directed = rng.random() < 0.5
        edges = [(u, v, rng.randint(0, 12)) for u in range(n) for v in range(n)
                 if u != v and rng.random() < 0.3]
        g = gr.edges_to_adjacency(edges, directed=directed)
        g.setdefault(0, [])
        dist, parent = gr.dijkstra(g, 0)
        truth = {v: math.inf for v in g}
        truth[0] = 0
        all_edges = edges + ([] if directed else [(v, u, w) for u, v, w in edges])
        for _ in range(n):
            for u, v, w in all_edges:
                truth[v] = min(truth[v], truth[u] + w)
        assert dist == truth
        for v in g:
            if dist[v] < math.inf:
                path = gr.reconstruct_path(parent, v)
                assert path[0] == 0 and path[-1] == v
    with pytest.raises(ValueError):
        gr.dijkstra({0: [(1, -1)], 1: []}, 0)


def optimal_prefix_code_cost(weights):
    """Brute-force optimum: try every way to merge (full binary trees) - tiny inputs only."""
    best = math.inf

    def search(items, cost):
        nonlocal best
        if len(items) == 1:
            best = min(best, cost)
            return
        for i, j in itertools.combinations(range(len(items)), 2):
            merged = items[i] + items[j]
            rest = [x for k, x in enumerate(items) if k not in (i, j)]
            search(rest + [merged], cost + merged)  # each merge adds one bit to every leaf below

    search(list(weights), 0)
    return best


def test_huffman_codes():
    freqs = {"A": 35, "B": 10, "C": 20, "D": 20, "_": 15}
    codes = gr.huffman_codes(freqs)
    assert math.isclose(gr.average_code_length(freqs, codes), 2.25)
    text = "ABACAB_D"
    assert gr.huffman_decode(gr.huffman_encode(text, codes), codes) == list(text)
    assert gr.huffman_codes({"x": 5}) == {"x": "0"}
    assert gr.huffman_codes({}) == {}
    assert gr.huffman_codes(freqs) == codes  # deterministic
    with pytest.raises(ValueError):
        gr.huffman_decode("1", {"a": "10", "b": "0"})


def test_huffman_optimal_and_prefix_free_vs_brute_force():
    rng = random.Random(6)
    for _ in range(60):
        n = rng.randint(2, 6)
        freqs = {chr(97 + i): rng.randint(1, 20) for i in range(n)}
        codes = gr.huffman_codes(freqs)
        words = list(codes.values())
        assert not any(a != b and b.startswith(a) for a in words for b in words)  # prefix-free
        total_bits = sum(freqs[s] * len(codes[s]) for s in freqs)
        assert total_bits == optimal_prefix_code_cost(freqs.values())
