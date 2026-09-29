"""Tests for Chapter 15 (patterns) and Chapter 16 (randomized, amortized, streaming)."""

import itertools
import math
import random
from collections import Counter

import pytest

from algoforge import OpCounter
from algoforge import ch08_dynamic_programming as dp
from algoforge import ch15_patterns as pt
from algoforge import ch16_randomized as rz


# ---------------------------------------------------------------- chapter 15
def test_two_sum_sorted():
    assert pt.two_sum_sorted([1, 3, 4, 6, 9], 10) in {(0, 4), (2, 3)}
    rng = random.Random(1)
    for _ in range(300):
        A = sorted(rng.randint(-20, 20) for _ in range(rng.randint(0, 15)))
        t = rng.randint(-40, 40)
        res = pt.two_sum_sorted(A, t)
        exists = any(A[i] + A[j] == t for i, j in itertools.combinations(range(len(A)), 2))
        assert (res is not None) == exists
        if res:
            i, j = res
            assert i < j and A[i] + A[j] == t


def test_longest_substring_without_repeat():
    assert pt.longest_substring_without_repeat("abcabcbb") == (3, "abc")
    assert pt.longest_substring_without_repeat("") == (0, "")
    rng = random.Random(2)
    for _ in range(200):
        s = "".join(rng.choice("abcd") for _ in range(rng.randint(0, 15)))
        best = max((j - i for i in range(len(s)) for j in range(i + 1, len(s) + 1)
                    if len(set(s[i:j])) == j - i), default=0)
        length, sub = pt.longest_substring_without_repeat(s)
        assert length == best == len(sub) and sub in s and len(set(sub)) == len(sub)


def test_sliding_window_max():
    rng = random.Random(3)
    for _ in range(200):
        A = [rng.randint(-9, 9) for _ in range(rng.randint(1, 20))]
        k = rng.randint(1, len(A))
        assert pt.sliding_window_max(A, k) == [max(A[i:i + k]) for i in range(len(A) - k + 1)]
    with pytest.raises(ValueError):
        pt.sliding_window_max([1], 0)


def test_next_greater_element():
    assert pt.next_greater_element([2, 1, 2, 4, 3]) == [4, 2, 4, None, None]
    rng = random.Random(4)
    for _ in range(200):
        A = [rng.randint(0, 9) for _ in range(rng.randint(0, 15))]
        expected = [next((y for y in A[i + 1:] if y > x), None) for i, x in enumerate(A)]
        assert pt.next_greater_element(A) == expected


def test_prefix_sums():
    rng = random.Random(5)
    A = [rng.randint(-5, 5) for _ in range(30)]
    ps = pt.PrefixSums(A)
    for lo in range(30):
        for hi in range(lo, 30):
            assert ps.range_sum(lo, hi) == sum(A[lo:hi + 1])


def test_ship_within_days_vs_linear_scan():
    assert pt.ship_within_days([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5) == 15
    rng = random.Random(6)
    for _ in range(100):
        W = [rng.randint(1, 10) for _ in range(rng.randint(1, 12))]
        D = rng.randint(1, len(W))

        def feasible(cap):
            days, load = 1, 0
            for w in W:
                if load + w > cap:
                    days, load = days + 1, 0
                load += w
            return days <= D

        assert pt.ship_within_days(W, D) == next(c for c in range(max(W), sum(W) + 1) if feasible(c))


def test_merge_intervals():
    assert pt.merge_intervals([(1, 3), (2, 6), (8, 10), (15, 18)]) == [(1, 6), (8, 10), (15, 18)]
    assert pt.merge_intervals([(1, 4), (4, 5)]) == [(1, 5)]
    rng = random.Random(7)
    for _ in range(200):
        iv = []
        for _ in range(rng.randint(0, 8)):
            a = rng.randint(0, 30)
            iv.append((a, a + rng.randint(0, 5)))
        merged = pt.merge_intervals(iv)
        covered = {x for a, b in iv for x in range(a, b + 1)}
        assert {x for a, b in merged for x in range(a, b + 1)} == covered
        assert all(b1 < a2 for (a1, b1), (a2, b2) in zip(merged, merged[1:]))


def test_lis_quadratic_and_house_robber():
    rng = random.Random(8)
    for _ in range(200):
        A = [rng.randint(0, 20) for _ in range(rng.randint(0, 15))]
        assert pt.lis_quadratic(A) == dp.lis_nlogn(A)[0]
        B = [rng.randint(0, 20) for _ in range(rng.randint(0, 15))]
        assert pt.house_robber(B) == dp.coin_row(B)[0]


# ---------------------------------------------------------------- chapter 16
def test_randomized_quicksort():
    rng = random.Random(9)
    for _ in range(200):
        A = [rng.randint(-10, 10) for _ in range(rng.randint(0, 40))]
        assert rz.randomized_quicksort(A, random.Random(1)) == sorted(A)
    n = 2000
    c = OpCounter()
    rz.randomized_quicksort(list(range(n)), random.Random(2), c)  # sorted input is no longer bad
    assert c["comparisons"] < 3 * n * math.log2(n)
    assert rz.randomized_quicksort([7] * 1000, random.Random(3)) == [7] * 1000


def test_fisher_yates_uniform():
    counts = Counter(tuple(rz.fisher_yates_shuffle([1, 2, 3], random.Random(s))) for s in range(6000))
    assert len(counts) == 6
    assert all(800 < v < 1200 for v in counts.values())  # about 1000 each
    assert sorted(rz.fisher_yates_shuffle(range(50), random.Random(0))) == list(range(50))


def test_reservoir_sampling_uniform():
    hits = Counter()
    for s in range(4000):
        hits.update(rz.reservoir_sample(range(10), 3, random.Random(s)))
    assert all(1000 < hits[i] < 1400 for i in range(10))  # expected 1200 each
    assert rz.reservoir_sample(range(2), 5, random.Random(0)) == [0, 1]


def test_bloom_filter_no_false_negatives():
    bf = rz.BloomFilter.for_capacity(500, 0.01)
    words = [f"word{i}" for i in range(500)]
    for w in words:
        bf.add(w)
    assert all(bf.might_contain(w) for w in words)
    false_pos = sum(bf.might_contain(f"other{i}") for i in range(5000)) / 5000
    assert false_pos < 0.03
    assert 0.005 < bf.expected_false_positive_rate() < 0.02
    with pytest.raises(ValueError):
        rz.BloomFilter(0, 1)


def test_count_min_sketch_never_underestimates():
    rng = random.Random(10)
    cms = rz.CountMinSketch(width=50, depth=4)
    truth = Counter()
    for _ in range(3000):
        item = rng.randint(0, 200) if rng.random() < 0.7 else rng.randint(0, 5)
        cms.add(item)
        truth[item] += 1
    for item in range(0, 201):
        est = cms.estimate(item)
        assert est >= truth[item]
        assert est - truth[item] <= 3000 * math.e / 50 * 2  # generous eps * N bound


def test_miller_rabin_vs_sieve():
    def is_prime(n):
        return n >= 2 and all(n % d for d in range(2, math.isqrt(n) + 1))

    for n in range(-5, 5000):
        assert rz.miller_rabin(n) == is_prime(n)
    carmichael = [561, 1105, 1729, 2465, 2821, 6601, 8911]
    assert not any(rz.miller_rabin(n) for n in carmichael)
    assert rz.miller_rabin(2 ** 61 - 1) and not rz.miller_rabin(2 ** 61 + 1)
    assert rz.miller_rabin(1_000_000_007, rng=random.Random(1))
    assert not rz.miller_rabin(1_000_000_007 * 998_244_353, rng=random.Random(1))
