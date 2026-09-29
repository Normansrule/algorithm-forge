"""Tests for Chapter 11 - limitations of algorithm power."""

import itertools
import math
import random

import pytest

from algoforge import ch11_limitations as lim


def test_lower_bounds():
    assert [lim.sorting_lower_bound(n) for n in range(1, 8)] == [0, 1, 3, 5, 7, 10, 13]
    for n in range(1, 60):
        assert lim.sorting_lower_bound(n) == math.ceil(math.log2(math.factorial(n)) - 1e-12)
        assert lim.searching_lower_bound(n) == math.floor(math.log2(n)) + 1  # binary search is optimal
    assert lim.ceil_log2(1) == 0 and lim.ceil_log2(1024) == 10 and lim.ceil_log2(1025) == 11
    assert lim.decision_tree_min_height(12 * 2, 3) == 3  # 12-coin puzzle: 24 outcomes, 3 weighings
    assert lim.decision_tree_min_height(1) == 0
    with pytest.raises(ValueError):
        lim.decision_tree_min_height(0)
    with pytest.raises(ValueError):
        lim.ceil_log2(0)


def test_cnf_sat_brute_and_verifier():
    # (x1 or not x2) and (not x1 or x2) and (x2 or x3)
    clauses = [[1, -2], [-1, 2], [2, 3]]
    assignment, tried = lim.cnf_sat_brute(clauses, 3)
    assert assignment is not None and lim.verify_cnf(clauses, assignment)
    unsat = [[1], [-1]]
    assert lim.cnf_sat_brute(unsat, 1) == (None, 2)
    assert not lim.verify_cnf(clauses, {1: True, 2: False, 3: True})


def test_vertex_cover_verifier():
    edges = [(1, 2), (2, 3), (3, 4)]
    assert lim.verify_vertex_cover(edges, [2, 3])
    assert not lim.verify_vertex_cover(edges, [1, 4])
    assert not lim.verify_vertex_cover(edges, [1, 2, 3, 4], k=3)
    assert lim.vertex_cover_brute([1, 2, 3, 4], edges, 2) is not None
    assert lim.vertex_cover_brute([1, 2, 3, 4], edges, 1) is None


def test_3sat_to_vertex_cover_reduction_preserves_answers():
    rng = random.Random(1)
    for _ in range(40):
        n = rng.randint(3, 4)
        m = rng.randint(1, 3)
        clauses = []
        for _ in range(m):
            vars_ = rng.sample(range(1, n + 1), 3)
            clauses.append([v if rng.random() < 0.5 else -v for v in vars_])
        vertices, edges, k = lim.reduce_3sat_to_vertex_cover(clauses, n)
        assert len(vertices) == 2 * n + 3 * m and len(edges) == n + 6 * m and k == n + 2 * m
        satisfiable = lim.cnf_sat_brute(clauses, n)[0] is not None
        has_cover = lim.vertex_cover_brute(vertices, edges, k) is not None
        assert satisfiable == has_cover
    # a known unsatisfiable 3-CNF: all 8 sign patterns on 3 variables
    unsat = [[a * 1, b * 2, c * 3] for a, b, c in itertools.product([1, -1], repeat=3)]
    assert lim.cnf_sat_brute(unsat, 3)[0] is None
    with pytest.raises(ValueError):
        lim.reduce_3sat_to_vertex_cover([[1, 2]], 2)


def test_subset_sum_and_partition_reductions():
    rng = random.Random(2)
    for _ in range(200):
        nums = [rng.randint(0, 12) for _ in range(rng.randint(0, 6))]
        target = rng.randint(-2, sum(nums) + 3)
        ss = lim.subset_sum_brute(nums, target) is not None
        assert lim.partition_brute(lim.subset_sum_to_partition(nums, target)) == ss
        p_nums, p_target = lim.partition_to_subset_sum(nums)
        assert (lim.subset_sum_brute(p_nums, p_target) is not None) == lim.partition_brute(nums)
