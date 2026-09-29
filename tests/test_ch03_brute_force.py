"""Tests for Chapter 3 - brute force and exhaustive search."""

import itertools
import math
import random

import pytest

from algoforge import OpCounter
from algoforge import ch03_brute_force as bf

SORTS = [bf.selection_sort, bf.bubble_sort, bf.bubble_sort_early_exit]


def random_lists(seed, count=150, max_len=25):
    rng = random.Random(seed)
    for _ in range(count):
        yield [rng.randint(-50, 50) for _ in range(rng.randint(0, max_len))]


@pytest.mark.parametrize("sort", SORTS)
def test_sorts_match_sorted(sort):
    for A in random_lists(3):
        original = list(A)
        assert sort(A) == sorted(A)
        assert A == original  # input untouched


def test_selection_sort_counts():
    c = OpCounter()
    bf.selection_sort(list(range(10, 0, -1)), c)
    assert c["comparisons"] == 45
    assert c["swaps"] <= 9


def test_bubble_sort_swaps_equal_inversions():
    rng = random.Random(4)
    for _ in range(50):
        A = [rng.randint(0, 30) for _ in range(15)]
        inversions = sum(1 for i in range(len(A)) for j in range(i + 1, len(A)) if A[i] > A[j])
        c = OpCounter()
        bf.bubble_sort(A, c)
        assert c["swaps"] == inversions
        assert c["comparisons"] == 15 * 14 // 2


def test_bubble_early_exit_best_case_linear():
    c = OpCounter()
    bf.bubble_sort_early_exit(list(range(100)), c)
    assert c["comparisons"] == 99


def test_sequential_search_variants():
    rng = random.Random(5)
    for _ in range(200):
        A = [rng.randint(0, 10) for _ in range(rng.randint(0, 12))]
        key = rng.randint(0, 12)
        expected = A.index(key) if key in A else -1
        assert bf.sequential_search(A, key) == expected
        assert bf.sequential_search_sentinel(A, key) == expected


def test_string_matching():
    assert bf.brute_force_string_match("NOBODY_NOTICED_HIM", "NOT") == 7
    assert bf.brute_force_string_match("abc", "abcd") == -1
    assert bf.brute_force_string_match("abc", "") == 0
    rng = random.Random(6)
    for _ in range(300):
        text = "".join(rng.choice("ab") for _ in range(rng.randint(0, 20)))
        pat = "".join(rng.choice("ab") for _ in range(rng.randint(1, 4)))
        assert bf.brute_force_string_match(text, pat) == text.find(pat)
        assert bf.brute_force_string_match_all(text, pat) == [
            i for i in range(len(text) - len(pat) + 1) if text.startswith(pat, i)]


def test_string_match_worst_case_count():
    c = OpCounter()
    n, m = 30, 5
    bf.brute_force_string_match("a" * n, "a" * (m - 1) + "b", c)
    assert c["comparisons"] == m * (n - m + 1)


def test_count_substrings():
    assert bf.count_substrings_brute("CABAAXBYA") == 4
    assert bf.count_substrings_one_pass("CABAAXBYA") == 4
    rng = random.Random(7)
    for _ in range(300):
        s = "".join(rng.choice("ABX") for _ in range(rng.randint(0, 25)))
        truth = sum(1 for i in range(len(s)) for j in range(i + 1, len(s)) if s[i] == "A" and s[j] == "B")
        assert bf.count_substrings_brute(s) == truth == bf.count_substrings_one_pass(s)


def test_polynomial_evaluation():
    rng = random.Random(8)
    for _ in range(100):
        coeffs = [rng.randint(-5, 5) for _ in range(rng.randint(1, 8))]
        x = rng.randint(-3, 3)
        truth = sum(a * x ** i for i, a in enumerate(coeffs))
        assert bf.poly_eval_naive(coeffs, x) == truth
        assert bf.poly_eval_incremental(coeffs, x) == truth
    a, b = OpCounter(), OpCounter()
    bf.poly_eval_naive([1] * 11, 2, a)
    bf.poly_eval_incremental([1] * 11, 2, b)
    assert a["multiplications"] == 10 * 11 // 2 + 11
    assert b["multiplications"] == 2 * 10 + 1


def random_points(rng, n, lo=-20, hi=20):
    return [(rng.randint(lo, hi), rng.randint(lo, hi)) for _ in range(n)]


def test_closest_pair_brute():
    d, p, q = bf.closest_pair_brute([(0, 0), (5, 5), (1, 1), (9, 0)])
    assert math.isclose(d, math.sqrt(2)) and {p, q} == {(0, 0), (1, 1)}
    with pytest.raises(ValueError):
        bf.closest_pair_brute([(0, 0)])


def hull_oracle(points):
    """Andrew's monotone chain - an independent hull oracle (vertices only)."""
    pts = sorted(set(points))
    if len(pts) <= 2:
        return set(pts)

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return set(lower[:-1] + upper[:-1])


def test_convex_hull_brute_matches_oracle():
    rng = random.Random(9)
    for _ in range(150):
        pts = random_points(rng, rng.randint(1, 15), -6, 6)
        hull = bf.convex_hull_brute(pts)
        assert set(hull) == hull_oracle(pts)
    square = [(0, 0), (2, 0), (2, 2), (0, 2), (1, 1), (1, 0)]
    assert bf.convex_hull_brute(square) == [(0, 0), (2, 0), (2, 2), (0, 2)]  # counterclockwise
    assert bf.convex_hull_brute([(0, 0), (1, 1), (2, 2)]) == [(0, 0), (2, 2)]


def test_tsp_exhaustive():
    # Classic 4-city instance: optimal tour length 11
    D = [[0, 2, 5, 7], [2, 0, 8, 3], [5, 8, 0, 1], [7, 3, 1, 0]]
    cost, tour = bf.tsp_exhaustive(D)
    assert cost == 11 and tour[0] == tour[-1] == 0 and sorted(tour[:-1]) == [0, 1, 2, 3]
    assert bf.tour_cost(D, tour) == cost


def test_knapsack_exhaustive():
    value, items = bf.knapsack_exhaustive([7, 3, 4, 5], [42, 12, 40, 25], 10)
    assert value == 65 and sorted(items) == [2, 3]


def test_assignment_exhaustive():
    C = [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]]
    cost, jobs = bf.assignment_exhaustive(C)
    assert cost == 13 and jobs == [1, 0, 2, 3]


def test_partition_exhaustive():
    rng = random.Random(10)
    for _ in range(100):
        nums = [rng.randint(1, 12) for _ in range(rng.randint(0, 8))]
        sub = bf.partition_exhaustive(nums)
        if sub is None:
            total = sum(nums)
            assert total % 2 or not any(
                sum(c) * 2 == total for r in range(len(nums) + 1) for c in itertools.combinations(nums, r))
        else:
            assert 2 * sum(nums[i] for i in sub) == sum(nums)


# ---------------------------------------------------------------- DFS / BFS
UNDIRECTED = {
    "a": ["c", "d", "e"], "b": ["e", "f"], "c": ["a", "d", "f"], "d": ["a", "c"],
    "e": ["a", "b", "f"], "f": ["b", "c", "e"], "g": ["h", "j"], "h": ["g", "i"],
    "i": ["h", "j"], "j": ["g", "i"],
}


def test_dfs_undirected_orders_and_edges():
    r = bf.dfs(UNDIRECTED)
    assert r["order"] == ["a", "c", "d", "f", "b", "e", "g", "h", "i", "j"]
    assert r["finish"] == ["d", "e", "b", "f", "c", "a", "j", "i", "h", "g"]
    assert len(r["tree_edges"]) == 10 - 2  # |V| - number of components
    edge_count = sum(len(v) for v in UNDIRECTED.values()) // 2
    assert len(r["tree_edges"]) + len(r["back_edges"]) == edge_count
    assert ("d", "a") in r["back_edges"] and ("j", "g") in r["back_edges"]


def test_bfs_undirected_orders_and_edges():
    r = bf.bfs(UNDIRECTED)
    assert r["order"] == ["a", "c", "d", "e", "f", "b", "g", "h", "j", "i"]
    edge_count = sum(len(v) for v in UNDIRECTED.values()) // 2
    assert len(r["tree_edges"]) + len(r["cross_edges"]) == edge_count


def test_dfs_directed_classification():
    g = {1: [2, 3], 2: [4], 3: [4], 4: [1], 5: [4]}
    r = bf.dfs(g, directed=True)
    assert r["tree_edges"] == [(1, 2), (2, 4), (1, 3)]
    assert r["back_edges"] == [(4, 1)]
    assert r["cross_edges"] == [(3, 4), (5, 4)]
    g2 = {1: [2, 3], 2: [3], 3: []}
    assert bf.dfs(g2, directed=True)["forward_edges"] == [(1, 3)]
    assert len(bf.bfs(g, directed=True)["nontree_edges"]) == 6 - 3  # 3 tree edges


def test_dfs_random_graph_edge_accounting():
    rng = random.Random(11)
    for _ in range(50):
        n = rng.randint(1, 12)
        g = {v: [] for v in range(n)}
        for u, v in itertools.combinations(range(n), 2):
            if rng.random() < 0.3:
                g[u].append(v)
                g[v].append(u)
        m = sum(len(x) for x in g.values()) // 2
        comps = bf.connected_components(g)
        d = bf.dfs(g)
        b = bf.bfs(g)
        assert sorted(d["order"]) == list(range(n)) == sorted(b["order"])
        assert len(d["tree_edges"]) == n - len(comps) == len(b["tree_edges"])
        assert len(d["tree_edges"]) + len(d["back_edges"]) == m
        assert len(b["tree_edges"]) + len(b["cross_edges"]) == m
        assert sorted(v for c in comps for v in c) == list(range(n))


def test_connected_components():
    comps = bf.connected_components(UNDIRECTED)
    assert [sorted(c) for c in comps] == [list("abcdef"), list("ghij")]
