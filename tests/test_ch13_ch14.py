"""Tests for Chapter 13 (advanced data structures) and Chapter 14 (advanced graphs)."""

import itertools
import math
import random
from collections import deque

import pytest

from algoforge import OpCounter
from algoforge import ch03_brute_force as bf
from algoforge import ch13_advanced_ds as ds
from algoforge import ch14_advanced_graphs as ag


# ---------------------------------------------------------------- chapter 13
def test_dynamic_array_amortized_copies():
    arr = ds.DynamicArray()
    for i in range(1000):
        arr.append(i)
        assert arr.copies < 2 * len(arr)
    assert len(arr) == 1000 and arr.capacity == 1024 and arr[999] == 999
    arr[0] = -1
    assert arr.to_list()[:2] == [-1, 1]
    for i in range(999, 0, -1):
        assert arr.pop() == i
    assert len(arr) == 1 and arr.capacity <= 4
    assert arr.pop() == -1
    with pytest.raises(IndexError):
        arr.pop()
    with pytest.raises(IndexError):
        arr[0]


def test_union_find_rank_path_compression_vs_naive():
    rng = random.Random(1)
    uf = ds.UnionFind(range(50))
    label = list(range(50))
    for _ in range(300):
        a, b = rng.randrange(50), rng.randrange(50)
        merged = uf.union(a, b)
        assert merged == (label[a] != label[b])
        if merged:
            old, new = label[b], label[a]
            label = [new if x == old else x for x in label]
        x, y = rng.randrange(50), rng.randrange(50)
        assert uf.connected(x, y) == (label[x] == label[y])
    assert uf.components == len(set(label))
    assert max(uf.rank.values()) <= math.log2(50)


def test_fenwick_and_segment_tree_vs_list():
    rng = random.Random(2)
    for _ in range(40):
        n = rng.randint(1, 40)
        A = [rng.randint(-10, 10) for _ in range(n)]
        fw = ds.FenwickTree(A)
        c = OpCounter()
        sg = ds.SegmentTree(A, c)
        for _ in range(60):
            if rng.random() < 0.4:
                i, val = rng.randrange(n), rng.randint(-10, 10)
                fw.add(i, val - A[i])
                sg.update(i, val)
                A[i] = val
            else:
                lo = rng.randrange(n)
                hi = rng.randrange(lo, n)
                assert fw.range_sum(lo, hi) == sum(A[lo:hi + 1]) == sg.query(lo, hi)
                assert fw.prefix_sum(hi) == sum(A[:hi + 1])
    assert ds.FenwickTree(5).prefix_sum(4) == 0


def test_trie():
    t = ds.Trie(["car", "cart", "care", "cat", "dog"])
    assert t.contains("car") and not t.contains("ca")
    assert t.starts_with("ca") and not t.starts_with("cow")
    assert t.words_with_prefix("car") == ["car", "care", "cart"]
    assert t.words_with_prefix("z") == []
    t.insert("car")
    assert t.size == 5
    rng = random.Random(3)
    words = {"".join(rng.choice("ab") for _ in range(rng.randint(0, 5))) for _ in range(30)}
    t2 = ds.Trie(words)
    for p in ["", "a", "ab", "ba", "bbb"]:
        assert t2.words_with_prefix(p) == sorted(w for w in words if w.startswith(p))


def test_lru_cache_vs_reference():
    cache = ds.LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    assert cache.get("a") == 1
    cache.put("c", 3)  # evicts b (least recently used)
    assert cache.get("b") is None and cache.keys_most_recent_first() == ["c", "a"]
    rng = random.Random(4)
    for cap in [1, 2, 3, 5]:
        lru = ds.LRUCache(cap)
        ref = []  # list of (key, value), most recent last
        for _ in range(300):
            k = rng.randint(0, 7)
            if rng.random() < 0.5:
                v = rng.random()
                ref = [(a, b) for a, b in ref if a != k] + [(k, v)]
                ref = ref[-cap:]
                lru.put(k, v)
            else:
                hit = [b for a, b in ref if a == k]
                assert lru.get(k) == (hit[0] if hit else None)
                if hit:
                    ref = [(a, b) for a, b in ref if a != k] + [(k, hit[0])]
            assert len(lru) == len(ref)
    with pytest.raises(ValueError):
        ds.LRUCache(0)


# ---------------------------------------------------------------- chapter 14
def test_bellman_ford_vs_floyd_style_relaxation():
    V = ["s", "a", "b", "c"]
    E = [("s", "a", 4), ("s", "b", 5), ("a", "c", -3), ("b", "a", -2), ("c", "b", 6)]
    dist, parent, neg = ag.bellman_ford(V, E, "s")
    assert not neg and dist == {"s": 0, "a": 3, "b": 5, "c": 0}
    _, _, neg = ag.bellman_ford(V, E + [("c", "s", -1)], "s")
    assert neg
    rng = random.Random(5)
    for _ in range(100):
        n = rng.randint(1, 6)
        E = [(u, v, rng.randint(-2, 9)) for u in range(n) for v in range(n) if u != v and rng.random() < 0.35]
        dist, parent, neg = ag.bellman_ford(list(range(n)), E, 0)
        # brute force: relax 2n times; still changing after n-1 rounds means a negative cycle
        d = [math.inf] * n
        d[0] = 0
        history = []
        for _ in range(2 * n):
            for u, v, w in E:
                if d[u] + w < d[v]:
                    d[v] = d[u] + w
            history.append(list(d))
        brute_neg = history[max(n - 2, 0)] != history[-1]
        assert neg == brute_neg
        if not neg:
            assert [dist[v] for v in range(n)] == d


def bfs_grid_distance(grid, start, goal):
    rows, cols = len(grid), len(grid[0])
    dist = {start: 0}
    q = deque([start])
    while q:
        r, c = q.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0 and (nr, nc) not in dist:
                dist[(nr, nc)] = dist[(r, c)] + 1
                q.append((nr, nc))
    return dist.get(goal)


def test_a_star_grid_vs_bfs():
    maze = ["....#", ".##.#", "...#.", "#....", "....."]
    path, expanded = ag.a_star_grid(maze, (0, 0), (4, 4))
    assert path[0] == (0, 0) and path[-1] == (4, 4) and len(path) - 1 == 8
    rng = random.Random(6)
    for _ in range(150):
        rows, cols = rng.randint(1, 8), rng.randint(1, 8)
        grid = [[1 if rng.random() < 0.25 else 0 for _ in range(cols)] for _ in range(rows)]
        grid[0][0] = grid[rows - 1][cols - 1] = 0
        path, _ = ag.a_star_grid(grid, (0, 0), (rows - 1, cols - 1))
        d = bfs_grid_distance(grid, (0, 0), (rows - 1, cols - 1))
        if d is None:
            assert path is None
        else:
            assert len(path) - 1 == d
            assert all(abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1 for a, b in zip(path, path[1:]))
            assert all(grid[r][c] == 0 for r, c in path)
    assert ag.a_star_grid([[1]], (0, 0), (0, 0)) == (None, 0)


def test_kosaraju_scc_vs_mutual_reachability():
    g = {1: [2], 2: [3], 3: [1, 4], 4: [5], 5: [6], 6: [4], 7: [6]}
    assert sorted(sorted(c) for c in ag.kosaraju_scc(g)) == [[1, 2, 3], [4, 5, 6], [7]]
    rng = random.Random(7)
    for _ in range(100):
        n = rng.randint(1, 8)
        g = {u: [v for v in range(n) if rng.random() < 0.25] for u in range(n)}
        reach = {u: set() for u in range(n)}
        for s in range(n):
            stack, seen = [s], {s}
            while stack:
                u = stack.pop()
                for v in g[u]:
                    if v not in seen:
                        seen.add(v)
                        stack.append(v)
            reach[s] = seen
        truth = {frozenset(v for v in range(n) if v in reach[u] and u in reach[v]) for u in range(n)}
        assert {frozenset(c) for c in ag.kosaraju_scc(g)} == truth


def test_bridges_and_articulation_points_vs_brute():
    rng = random.Random(8)
    for _ in range(100):
        n = rng.randint(1, 8)
        edges = [(u, v) for u, v in itertools.combinations(range(n), 2) if rng.random() < 0.35]
        g = {v: [] for v in range(n)}
        for u, v in edges:
            g[u].append(v)
            g[v].append(u)
        base = len(bf.connected_components(g))
        bridges, points = ag.bridges_and_articulation_points(g)
        truth_bridges = set()
        for u, v in edges:
            h = {x: [y for y in g[x] if {x, y} != {u, v}] for x in g}
            if len(bf.connected_components(h)) > base:
                truth_bridges.add(frozenset((u, v)))
        truth_points = set()
        for x in range(n):
            h = {a: [b for b in g[a] if b != x] for a in g if a != x}
            if len(bf.connected_components(h)) > base - (0 if g[x] else 1):
                truth_points.add(x)
        assert {frozenset(b) for b in bridges} == truth_bridges
        assert points == truth_points


def test_dag_longest_path():
    g = {"s": [("a", 3), ("b", 2)], "a": [("c", 4)], "b": [("c", 1), ("d", 7)], "c": [("t", 2)],
         "d": [("t", 1)], "t": []}
    assert ag.dag_longest_path(g, "s") == (10, ["s", "b", "d", "t"])
    assert ag.dag_longest_path(g)[0] == 10
    rng = random.Random(9)
    for _ in range(80):
        n = rng.randint(1, 7)
        g = {u: [(v, rng.randint(-3, 9)) for v in range(u + 1, n) if rng.random() < 0.4] for u in range(n)}
        best = 0
        for r in range(2, n + 1):  # brute force over every vertex sequence that is a path
            for seq in itertools.combinations(range(n), r):
                total, ok = 0, True
                for a, b in zip(seq, seq[1:]):
                    w = dict(g[a]).get(b)
                    if w is None:
                        ok = False
                        break
                    total += w
                if ok:
                    best = max(best, total)
        length, path = ag.dag_longest_path(g)
        assert length == best
    with pytest.raises(ValueError):
        ag.dag_longest_path({1: [(2, 1)], 2: [(1, 1)]})
