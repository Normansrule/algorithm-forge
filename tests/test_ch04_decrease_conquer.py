"""Tests for Chapter 4 - decrease-and-conquer."""

import itertools
import math
import random

import pytest

from algoforge import OpCounter
from algoforge import ch04_decrease_conquer as dc

SORTS = [dc.insertion_sort, dc.insertion_sort_recursive, dc.binary_insertion_sort]


@pytest.mark.parametrize("sort", SORTS)
def test_insertion_sorts(sort):
    rng = random.Random(1)
    for _ in range(200):
        A = [rng.randint(-20, 20) for _ in range(rng.randint(0, 30))]
        assert sort(A) == sorted(A)


def test_insertion_sort_best_and_worst_counts():
    best, worst = OpCounter(), OpCounter()
    dc.insertion_sort(list(range(20)), best)
    dc.insertion_sort(list(range(20, 0, -1)), worst)
    assert best["comparisons"] == 19
    assert worst["comparisons"] == 20 * 19 // 2


def test_binary_insertion_sort_is_stable_and_uses_fewer_comparisons():
    pairs = [(3, "a"), (1, "b"), (3, "c"), (1, "d"), (2, "e")]

    class Key:
        def __init__(self, p):
            self.p = p

        def __lt__(self, other):
            return self.p[0] < other.p[0]

        def __gt__(self, other):
            return self.p[0] > other.p[0]

    out = [k.p for k in dc.binary_insertion_sort([Key(p) for p in pairs])]
    assert out == sorted(pairs, key=lambda p: p[0])
    a, b = OpCounter(), OpCounter()
    data = list(range(200, 0, -1))
    dc.insertion_sort(data, a)
    dc.binary_insertion_sort(data, b)
    assert b["comparisons"] < a["comparisons"] / 10


def is_topological(order, graph):
    pos = {v: i for i, v in enumerate(order)}
    return all(pos[u] < pos[v] for u in graph for v in graph[u])


def test_topological_sort_textbook_style():
    g = {"C1": ["C3"], "C2": ["C3"], "C3": ["C4", "C5"], "C4": ["C5"], "C5": []}
    for algo in (dc.topological_sort_dfs, dc.topological_sort_source_removal):
        order = algo(g)
        assert order is not None and is_topological(order, g) and len(order) == 5
    assert dc.topological_sort_source_removal(g) == ["C1", "C2", "C3", "C4", "C5"]


def test_topological_sort_random_dags_and_cycles():
    rng = random.Random(2)
    for _ in range(100):
        n = rng.randint(1, 10)
        g = {v: [] for v in range(n)}
        for u, v in itertools.combinations(range(n), 2):
            if rng.random() < 0.3:
                g[u].append(v)  # edges only go forward: a DAG
        for algo in (dc.topological_sort_dfs, dc.topological_sort_source_removal):
            order = algo(g)
            assert sorted(order) == list(range(n)) and is_topological(order, g)
        if n >= 2 and any(g.values()):
            u = next(u for u in g if g[u])
            g[g[u][0]].append(u)  # back edge closes a cycle
            assert dc.topological_sort_dfs(g) is None
            assert dc.topological_sort_source_removal(g) is None


def test_topological_sort_vertex_only_as_neighbor():
    assert dc.topological_sort_dfs({"a": ["b"]}) == ["a", "b"]
    assert dc.topological_sort_dfs({"a": ["a"]}) is None


@pytest.mark.parametrize("n", range(1, 7))
def test_permutation_generators(n):
    truth = sorted(itertools.permutations(range(1, n + 1)))
    for algo in (dc.permutations_minimal_change, dc.johnson_trotter):
        perms = algo(n)
        assert sorted(perms) == truth and len(set(perms)) == math.factorial(n)
        for p, q in zip(perms, perms[1:]):  # minimal change: one adjacent swap
            diff = [i for i in range(n) if p[i] != q[i]]
            assert len(diff) == 2 and diff[1] == diff[0] + 1
    assert dc.lexicographic_permutations(n) == truth


def test_johnson_trotter_matches_minimal_change_for_n3():
    expected = [(1, 2, 3), (1, 3, 2), (3, 1, 2), (3, 2, 1), (2, 3, 1), (2, 1, 3)]
    assert dc.johnson_trotter(3) == expected
    assert dc.permutations_minimal_change(3) == [(1, 2, 3), (1, 3, 2), (3, 1, 2), (3, 2, 1), (2, 3, 1), (2, 1, 3)]


def test_power_set():
    for n in range(0, 7):
        subsets = dc.power_set(list(range(n)))
        assert len(subsets) == 2 ** n
        assert {tuple(sorted(s)) for s in subsets} == {
            c for r in range(n + 1) for c in itertools.combinations(range(n), r)}


def test_gray_code():
    assert dc.gray_code(3) == ["000", "001", "011", "010", "110", "111", "101", "100"]
    for n in range(1, 9):
        codes = dc.gray_code(n)
        assert len(set(codes)) == 2 ** n
        for a, b in zip(codes, codes[1:] + codes[:1]):  # cyclic, one bit per step
            assert sum(x != y for x, y in zip(a, b)) == 1


def test_binary_search_both_ways():
    rng = random.Random(3)
    for _ in range(300):
        A = sorted(set(rng.randint(0, 60) for _ in range(rng.randint(0, 25))))
        key = rng.randint(-2, 62)
        expected = A.index(key) if key in A else -1
        assert dc.binary_search(A, key) == expected
        assert dc.binary_search_recursive(A, key) == expected


def test_binary_search_worst_case_count():
    for n in [1, 2, 7, 8, 100, 1000]:
        c = OpCounter()
        dc.binary_search(list(range(n)), n + 5, c)  # unsuccessful, larger than all
        assert c["comparisons"] == math.floor(math.log2(n)) + 1


def test_fake_coin():
    for n in range(1, 60):
        for fake in range(n):
            coins = [10] * n
            coins[fake] = 9
            idx2, w2 = dc.fake_coin_by_2(coins)
            idx3, w3 = dc.fake_coin_by_3(coins)
            assert idx2 == fake and idx3 == fake
            assert w2 <= math.floor(math.log2(n)) if n > 1 else w2 == 0
            assert w3 <= math.ceil(math.log(n, 3)) + 1


def test_russian_peasant_and_exponentiation():
    rng = random.Random(4)
    for _ in range(200):
        n, m = rng.randint(0, 5000), rng.randint(-100, 5000)
        assert dc.russian_peasant(n, m) == n * m
        a, k = rng.randint(-5, 5), rng.randint(0, 40)
        assert dc.exp_by_squaring(a, k) == a ** k
    c = OpCounter()
    dc.exp_by_squaring(3, 1023, c)
    assert c["multiplications"] <= 2 * 10


def test_josephus():
    assert dc.josephus(6) == 5 and dc.josephus(7) == 7 and dc.josephus(40) == 17
    for n in range(1, 200):
        assert dc.josephus(n) == dc.josephus_simulate(n)
        b = bin(n)[2:]
        assert dc.josephus(n) == int(b[1:] + b[0], 2)  # one-bit cyclic left shift


def test_lomuto_partition_and_quickselect():
    rng = random.Random(5)
    for _ in range(200):
        A = [rng.randint(0, 30) for _ in range(rng.randint(1, 25))]
        B = list(A)
        s = dc.lomuto_partition(B, 0, len(B) - 1)
        assert all(x < B[s] for x in B[:s]) and all(x >= B[s] for x in B[s + 1:])
        assert sorted(B) == sorted(A)
        k = rng.randint(1, len(A))
        assert dc.quickselect(A, k) == sorted(A)[k - 1]
    with pytest.raises(ValueError):
        dc.quickselect([1, 2], 3)


def test_interpolation_search():
    rng = random.Random(6)
    for _ in range(300):
        A = sorted(set(rng.randint(0, 500) for _ in range(rng.randint(0, 40))))
        key = rng.choice(A) if A and rng.random() < 0.7 else rng.randint(-5, 505)
        expected = A.index(key) if key in A else -1
        assert dc.interpolation_search(A, key) == expected
    c = OpCounter()
    A = list(range(0, 100000, 7))
    assert dc.interpolation_search(A, 7 * 5000, c) == 5000
    assert c["comparisons"] <= 3


def test_bst_operations():
    rng = random.Random(7)
    for _ in range(100):
        keys = [rng.randint(0, 50) for _ in range(rng.randint(1, 30))]
        root = dc.bst_from_keys(keys)
        assert dc.bst_inorder(root) == sorted(keys)
        assert dc.bst_max(root) == max(keys)
        for probe in range(-1, 52):
            node = dc.bst_search(root, probe)
            assert (node is not None) == (probe in keys)
            if node:
                assert node.key == probe
    with pytest.raises(ValueError):
        dc.bst_max(None)


def nim_is_losing(piles, memo={}):
    piles = tuple(sorted(piles))
    if piles not in memo:
        moves = [piles[:i] + (s,) + piles[i + 1:] for i, p in enumerate(piles) for s in range(p)]
        memo[piles] = all(not nim_is_losing(m) for m in moves)  # no move -> losing
    return memo[piles]


def test_nim_winning_move_vs_game_tree():
    for piles in itertools.product(range(5), repeat=3):
        move = dc.nim_winning_move(list(piles))
        if nim_is_losing(piles):
            assert move is None
        else:
            i, new = move
            after = list(piles)
            assert new < after[i]
            after[i] = new
            assert nim_is_losing(after)


def test_nim_one_pile():
    assert dc.nim_one_pile_winning_move(10, 3) == 2
    assert dc.nim_one_pile_winning_move(8, 3) is None
    for n in range(0, 40):
        take = dc.nim_one_pile_winning_move(n, 4)
        assert (take is None) == (n % 5 == 0)
        if take:
            assert (n - take) % 5 == 0 and 1 <= take <= 4


@pytest.mark.parametrize("algo", [dc.negatives_before_positives_iterative,
                                  dc.negatives_before_positives_recursive])
def test_negatives_before_positives(algo):
    rng = random.Random(8)
    for _ in range(200):
        A = [rng.randint(-10, 10) for _ in range(rng.randint(0, 30))]
        out = algo(A)
        assert sorted(out) == sorted(A)
        k = sum(1 for x in A if x < 0)
        assert all(x < 0 for x in out[:k]) and all(x >= 0 for x in out[k:])
