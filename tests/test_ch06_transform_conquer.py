"""Tests for Chapter 6 - transform-and-conquer."""

import itertools
import math
import random
from collections import Counter
from fractions import Fraction

import pytest

from algoforge import OpCounter
from algoforge import ch06_transform_conquer as tc


def test_presort_unique_and_mode():
    rng = random.Random(1)
    for _ in range(300):
        A = [rng.randint(0, 15) for _ in range(rng.randint(1, 20))]
        assert tc.presort_unique(A) == (len(set(A)) == len(A))
        counts = Counter(A)
        top = max(counts.values())
        assert tc.presort_mode(A) == (min(k for k, v in counts.items() if v == top), top)
    with pytest.raises(ValueError):
        tc.presort_mode([])


def test_gaussian_elimination_exact_fractions():
    A = [[2, -1, 1], [4, 1, -1], [1, 1, 1]]
    b = [1, 5, 0]
    for pivot in (True, False):
        x = tc.solve_linear_system([[Fraction(v) for v in r] for r in A], [Fraction(v) for v in b], pivot)
        assert x == [Fraction(1), Fraction(0), Fraction(-1)]


def test_gaussian_elimination_random_systems():
    rng = random.Random(2)
    for _ in range(100):
        n = rng.randint(1, 6)
        x_true = [rng.randint(-5, 5) for _ in range(n)]
        while True:
            A = [[rng.randint(-9, 9) for _ in range(n)] for _ in range(n)]
            try:
                x = tc.solve_linear_system([[Fraction(v) for v in r] for r in A],
                                           [sum(A[i][j] * x_true[j] for j in range(n)) for i in range(n)])
                break
            except ValueError:
                continue  # singular: draw again
        assert x == x_true
        xf = tc.solve_linear_system(A, [sum(A[i][j] * x_true[j] for j in range(n)) for i in range(n)])
        assert all(math.isclose(a, b, abs_tol=1e-7) for a, b in zip(xf, x_true))


def test_gaussian_elimination_upper_triangular_and_singular():
    U = tc.gaussian_elimination([[1.0, 2.0], [3.0, 4.0]], [5.0, 6.0])
    assert U[1][0] == 0
    with pytest.raises(ValueError):
        tc.solve_linear_system([[1, 2], [2, 4]], [3, 6])
    with pytest.raises(ValueError):
        tc.solve_linear_system([[1, 2], [2, 4]], [3, 6], partial_pivoting=False)


def test_avl_insert_rotations():
    for keys, rotation in [([3, 2, 1], "R"), ([1, 2, 3], "L"), ([3, 1, 2], "LR"), ([1, 3, 2], "RL")]:
        log = []
        root = None
        for k in keys:
            root = tc.avl_insert(root, k, log)
        assert log == [rotation]
        assert root.key == 2 and tc.is_avl(root)


def test_avl_random_insertions_stay_balanced():
    rng = random.Random(3)
    for _ in range(100):
        keys = [rng.randint(0, 100) for _ in range(rng.randint(1, 60))]
        root = None
        for k in keys:
            root = tc.avl_insert(root, k)
            assert tc.is_avl(root)
        assert tc.avl_inorder(root) == sorted(keys)
        n = len(keys)
        assert tc.avl_height(root) <= 1.4405 * math.log2(n + 2) - 1.3277 + 1e-9  # AVL height bound
    root = None
    for k in range(1, 1024):
        root = tc.avl_insert(root, k)
    assert tc.avl_height(root) == 9  # sorted input still gives a perfectly balanced tree


def test_two_three_tree():
    t = tc.TwoThreeTree()
    for k in [9, 5, 8, 3, 2, 4, 7]:  # a classic insertion sequence
        t.insert(k)
        assert t.is_valid()
    assert t.levels() == [[[5]], [[3], [8]], [[2], [4], [7], [9]]]
    assert t.inorder() == [2, 3, 4, 5, 7, 8, 9]
    assert t.search(7) and not t.search(6)
    t.insert(7)  # duplicate ignored
    assert t.size == 7


def test_two_three_tree_random():
    rng = random.Random(4)
    for _ in range(100):
        t = tc.TwoThreeTree()
        keys = [rng.randint(0, 200) for _ in range(rng.randint(0, 80))]
        for k in keys:
            t.insert(k)
            assert t.is_valid()
        assert t.inorder() == sorted(set(keys))
        n = len(set(keys))
        if n:
            assert math.log(n + 1, 3) - 1 - 1e-9 <= t.height() <= math.log2(n + 1) - 1 + 1e-9
        for probe in range(-1, 202, 7):
            assert t.search(probe) == (probe in keys)


def test_heap_construction_and_operations():
    rng = random.Random(5)
    for _ in range(200):
        A = [rng.randint(0, 50) for _ in range(rng.randint(0, 40))]
        H1 = tc.heap_bottom_up(A)
        H2 = tc.heap_top_down(A)
        assert tc.is_max_heap(H1) and tc.is_max_heap(H2)
        assert sorted(H1) == sorted(A) == sorted(H2)
        out = []
        while H1:
            out.append(tc.heap_delete_max(H1))
            assert tc.is_max_heap(H1)
        assert out == sorted(A, reverse=True)
        assert tc.heapsort(A) == sorted(A)
    with pytest.raises(IndexError):
        tc.heap_delete_max([])


def test_heap_bottom_up_linear_comparisons():
    for n in [15, 127, 1023]:  # full trees: Levitin's exact worst-case bound
        c = OpCounter()
        tc.heap_bottom_up(list(range(n)), c)  # increasing input is the worst case for a max-heap
        assert c["comparisons"] == 2 * (n - math.log2(n + 1))
    for n in [10, 100, 1000]:
        c = OpCounter()
        tc.heap_bottom_up(list(range(n)), c)
        assert c["comparisons"] <= 2 * n


def test_horner_and_synthetic_division():
    # p(x) = 2x^4 - x^3 + 3x^2 + x - 5, lowest degree first
    p = [-5, 1, 3, -1, 2]
    c = OpCounter()
    assert tc.horner(p, 3, c) == 160 and c["multiplications"] == 4
    q, r = tc.synthetic_division(p, 3)
    assert q == [55, 18, 5, 2] and r == 160
    rng = random.Random(6)
    for _ in range(200):
        coeffs = [rng.randint(-9, 9) for _ in range(rng.randint(1, 8))]
        x = rng.randint(-4, 4)
        truth = sum(a * x ** i for i, a in enumerate(coeffs))
        assert tc.horner(coeffs, x) == truth
        q, r = tc.synthetic_division(coeffs, x)
        assert r == truth
        # check p(t) = (t - x) q(t) + r at a few points
        for t in range(-3, 4):
            qt = sum(a * t ** i for i, a in enumerate(q))
            assert sum(a * t ** i for i, a in enumerate(coeffs)) == (t - x) * qt + r
    assert tc.horner([], 5) == 0


def test_binary_exponentiation():
    for a in range(-3, 6):
        for n in range(0, 70):
            assert tc.binary_exp_left_to_right(a, n) == a ** n
            assert tc.binary_exp_right_to_left(a, n) == a ** n
    for n in [13, 255, 1024]:
        b = n.bit_length()
        ones = bin(n).count("1")
        c1, c2 = OpCounter(), OpCounter()
        tc.binary_exp_left_to_right(2, n, c1)
        tc.binary_exp_right_to_left(2, n, c2)
        assert c1["multiplications"] == (b - 1) + (ones - 1)
        assert b - 1 <= c2["multiplications"] <= 2 * b


def test_lcm():
    assert tc.lcm(24, 60) == 120 and tc.lcm(11, 5) == 55
    for m, n in itertools.product(range(1, 40), repeat=2):
        assert tc.lcm(m, n) == m * n // math.gcd(m, n)


def test_count_paths_vs_brute_force_walks():
    rng = random.Random(7)
    for _ in range(40):
        n = rng.randint(1, 5)
        adj = [[1 if i != j and rng.random() < 0.5 else 0 for j in range(n)] for i in range(n)]
        for k in range(0, 5):
            M = tc.count_paths(adj, k)
            for i in range(n):
                for j in range(n):
                    walks = sum(1 for mid in itertools.product(range(n), repeat=max(k - 1, 0))
                                if k > 0 and all(adj[a][b] for a, b in zip((i,) + mid, mid + (j,))))
                    if k == 0:
                        walks = 1 if i == j else 0
                    assert M[i][j] == walks


def test_pairs_sum_multiple_of_60():
    assert tc.pairs_sum_multiple_of_60([30, 20, 150, 100, 40]) == 3
    rng = random.Random(8)
    for _ in range(200):
        A = [rng.randint(0, 500) for _ in range(rng.randint(0, 40))]
        brute = sum(1 for i, j in itertools.combinations(range(len(A)), 2) if (A[i] + A[j]) % 60 == 0)
        assert tc.pairs_sum_multiple_of_60(A) == brute


def test_min_max_comparisons():
    rng = random.Random(9)
    for n in range(1, 60):
        A = [rng.randint(-100, 100) for _ in range(n)]
        lo, hi, comps = tc.min_max(A)
        assert (lo, hi) == (min(A), max(A))
        assert comps <= math.ceil(3 * n / 2) - 2 if n > 1 else comps == 0
    with pytest.raises(ValueError):
        tc.min_max([])
