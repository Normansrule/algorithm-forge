"""Tests for Chapter 5 - divide-and-conquer."""

import itertools
import math
import random

import pytest

from algoforge import OpCounter
from algoforge import ch03_brute_force as bf
from algoforge import ch05_divide_conquer as dq

SORTS = [dq.mergesort, dq.mergesort_bottom_up, dq.quicksort, dq.quicksort_iterative]


@pytest.mark.parametrize("sort", SORTS)
def test_sorts_match_sorted(sort):
    rng = random.Random(1)
    for _ in range(300):
        A = [rng.randint(-15, 15) for _ in range(rng.randint(0, 40))]
        assert sort(A) == sorted(A)
    assert sort([5] * 50) == [5] * 50
    assert sort(list(range(60, 0, -1))) == list(range(1, 61))


def test_mergesort_comparison_bounds():
    for n in [8, 16, 32, 100]:
        c = OpCounter()
        dq.mergesort(random.Random(n).sample(range(1000), n), c)
        assert c["comparisons"] <= n * math.ceil(math.log2(n)) - n + 1


def test_quicksort_worst_case_on_sorted_input():
    c = OpCounter()
    n = 50
    dq.quicksort(list(range(n)), c)
    assert c["comparisons"] >= n * (n - 1) // 2  # Θ(n^2) behavior with first-element pivot


def test_hoare_partition_property():
    rng = random.Random(2)
    for _ in range(300):
        A = [rng.randint(0, 10) for _ in range(rng.randint(1, 20))]
        B = list(A)
        s = dq.hoare_partition(B, 0, len(B) - 1)
        assert all(x <= B[s] for x in B[:s]) and all(x >= B[s] for x in B[s + 1:])
        assert sorted(B) == sorted(A)


def test_merge_is_stable_and_correct():
    assert dq.merge([1, 4, 9], [2, 3, 10, 11]) == [1, 2, 3, 4, 9, 10, 11]


def test_sorted_union():
    rng = random.Random(3)
    for _ in range(300):
        A = sorted(rng.randint(0, 15) for _ in range(rng.randint(0, 10)))
        B = sorted(rng.randint(0, 15) for _ in range(rng.randint(0, 10)))
        assert dq.sorted_union(A, B) == sorted(set(A) | set(B))


def test_count_inversions():
    rng = random.Random(4)
    for _ in range(200):
        A = [rng.randint(0, 20) for _ in range(rng.randint(0, 25))]
        brute = sum(1 for i, j in itertools.combinations(range(len(A)), 2) if A[i] > A[j])
        assert dq.count_inversions(A) == brute


def test_max_subarray_both_ways():
    rng = random.Random(5)
    for _ in range(300):
        A = [rng.randint(-10, 10) for _ in range(rng.randint(1, 25))]
        brute = max(sum(A[i:j + 1]) for i in range(len(A)) for j in range(i, len(A)))
        for algo in (dq.max_subarray_dc, dq.kadane):
            s, lo, hi = algo(A)
            assert s == brute and sum(A[lo:hi + 1]) == s and lo <= hi
    with pytest.raises(ValueError):
        dq.kadane([])


def test_tree_traversals():
    #        a
    #      /   \
    #     b     c
    #    / \     \
    #   d   e     f
    root = dq.tree_from_list(["a", "b", "c", "d", "e", None, "f"])
    assert dq.preorder(root) == list("abdecf")
    assert dq.inorder(root) == list("dbeacf")
    assert dq.postorder(root) == list("debfca")
    assert dq.tree_height(root) == 2
    assert dq.leaf_count(root) == 3
    assert dq.tree_height(None) == -1 and dq.leaf_count(None) == 0
    assert dq.tree_from_list([]) is None


def test_tree_random_shapes():
    rng = random.Random(6)
    for _ in range(100):
        vals = [i if rng.random() < 0.75 else None for i in range(rng.randint(1, 20))]
        root = dq.tree_from_list(vals)
        nodes = dq.preorder(root)
        assert sorted(nodes) == sorted(dq.inorder(root)) == sorted(dq.postorder(root))
        if root:
            assert dq.leaf_count(root) >= 1
            assert dq.tree_height(root) + 1 >= math.ceil(math.log2(len(nodes) + 1))


def test_karatsuba():
    rng = random.Random(7)
    for _ in range(300):
        x, y = rng.randint(0, 10 ** rng.randint(1, 30)), rng.randint(0, 10 ** rng.randint(1, 30))
        assert dq.karatsuba(x, y) == x * y
    assert dq.karatsuba(2135, 4014) == 2135 * 4014
    c = OpCounter()
    dq.karatsuba(int("9" * 64), int("9" * 64), c)
    assert c["digit_multiplications"] < 64 ** 2 / 2  # well below n^2 = 4096


def test_strassen():
    rng = random.Random(8)
    for n in [1, 2, 3, 4, 5, 7, 8]:
        A = [[rng.randint(-5, 5) for _ in range(n)] for _ in range(n)]
        B = [[rng.randint(-5, 5) for _ in range(n)] for _ in range(n)]
        truth = [[sum(A[i][k] * B[k][j] for k in range(n)) for j in range(n)] for i in range(n)]
        assert dq.strassen(A, B) == truth
    c = OpCounter()
    I = [[1 if i == j else 0 for j in range(8)] for i in range(8)]
    dq.strassen(I, I, c)
    assert c["multiplications"] == 7 ** 3  # 343 instead of 512
    assert dq.strassen([], []) == []


def test_closest_pair_dc_matches_brute():
    rng = random.Random(9)
    for _ in range(200):
        pts = [(rng.randint(-30, 30), rng.randint(-30, 30)) for _ in range(rng.randint(2, 40))]
        d, p, q = dq.closest_pair_dc(pts)
        assert math.isclose(d, bf.closest_pair_brute(pts)[0])
        assert math.isclose(math.dist(p, q), d)
    pts = [(rng.random(), rng.random()) for _ in range(500)]
    assert math.isclose(dq.closest_pair_dc(pts)[0], bf.closest_pair_brute(pts)[0])


def test_quickhull_matches_brute_force_hull():
    rng = random.Random(10)
    for _ in range(200):
        pts = [(rng.randint(-8, 8), rng.randint(-8, 8)) for _ in range(rng.randint(1, 30))]
        assert dq.quickhull(pts) == bf.convex_hull_brute(pts)
    assert dq.quickhull([(0, 0), (4, 0), (4, 4), (0, 4), (2, 2), (2, 0)]) == [(0, 0), (4, 0), (4, 4), (0, 4)]


@pytest.mark.parametrize("a,b,d,expected", [
    (2, 2, 1, "Θ(n log n)"),      # mergesort
    (1, 2, 0, "Θ(log n)"),        # binary search
    (2, 2, 0, "Θ(n)"),            # tree traversal
    (4, 2, 1, "Θ(n^2)"),
    (3, 2, 1, "Θ(n^1.585)"),      # Karatsuba
    (7, 2, 2, "Θ(n^2.807)"),      # Strassen
    (2, 2, 2, "Θ(n^2)"),
    (4, 2, 2, "Θ(n^2 log n)"),
    (1, 3, 1, "Θ(n)"),
    (8, 2, 3, "Θ(n^3 log n)"),
])
def test_master_theorem(a, b, d, expected):
    assert dq.master_theorem(a, b, d) == expected


def test_master_theorem_rejects_bad_input():
    with pytest.raises(ValueError):
        dq.master_theorem(0, 2, 1)
