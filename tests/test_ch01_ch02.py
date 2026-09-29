"""Tests for counters, Chapter 1 (introduction) and Chapter 2 (analysis framework)."""

import math
import random

import pytest

from algoforge import OpCounter
from algoforge import ch01_intro as c1
from algoforge import ch02_analysis as c2
from algoforge.counters import tick


# ---------------------------------------------------------------- counters
def test_opcounter_basics():
    c = OpCounter()
    c.tick("comparisons")
    c.tick("comparisons", 4)
    c.tick("swaps")
    assert c["comparisons"] == 5
    assert c.get("missing") == 0
    assert c.total() == 6
    snap = c.snapshot()
    c.reset()
    assert c.total() == 0 and snap == {"comparisons": 5, "swaps": 1}
    assert repr(snap) and "OpCounter(" in repr(c)
    tick(None, "x")  # no-op, must not raise


# ---------------------------------------------------------------- chapter 1
def test_gcd_classic_example():
    assert c1.gcd_euclid(60, 24) == 12
    assert c1.gcd_consecutive_integer(60, 24) == 12
    assert c1.gcd_middle_school(60, 24) == 12


@pytest.mark.parametrize("seed", range(5))
def test_gcd_three_ways_agree_with_math_gcd(seed):
    rng = random.Random(seed)
    for _ in range(100):
        m, n = rng.randint(1, 2000), rng.randint(1, 2000)
        g = math.gcd(m, n)
        assert c1.gcd_euclid(m, n) == g
        assert c1.gcd_consecutive_integer(m, n) == g
        assert c1.gcd_middle_school(m, n) == g


def test_gcd_edge_cases():
    assert c1.gcd_euclid(0, 7) == 7
    assert c1.gcd_euclid(7, 0) == 7
    with pytest.raises(ValueError):
        c1.gcd_euclid(0, 0)
    with pytest.raises(ValueError):
        c1.gcd_consecutive_integer(0, 5)
    with pytest.raises(ValueError):
        c1.gcd_middle_school(0, 5)


def test_euclid_is_much_faster_than_consecutive_checking():
    a, b = OpCounter(), OpCounter()
    c1.gcd_euclid(987, 610, a)  # consecutive Fibonacci numbers: Euclid's worst case
    c1.gcd_consecutive_integer(987, 610, b)
    assert a["divisions"] == 14
    assert b["divisions"] > 600


def test_sieve_matches_trial_division():
    def is_prime(k):
        return k >= 2 and all(k % d for d in range(2, int(k ** 0.5) + 1))

    for n in [0, 1, 2, 3, 10, 25, 100, 997]:
        assert c1.sieve_of_eratosthenes(n) == [k for k in range(n + 1) if is_prime(k)]


def test_prime_factors():
    assert c1.prime_factors(60) == [2, 2, 3, 5]
    assert c1.prime_factors(1) == []
    assert c1.prime_factors(97) == [97]
    for n in range(2, 500):
        assert math.prod(c1.prime_factors(n)) == n


def test_integer_sqrt():
    for n in range(0, 2000):
        assert c1.integer_sqrt(n) == math.isqrt(n)
    with pytest.raises(ValueError):
        c1.integer_sqrt(-1)


def test_locker_doors_are_perfect_squares():
    for n in [1, 2, 10, 50, 100]:
        assert c1.locker_doors(n) == [k * k for k in range(1, math.isqrt(n) + 1)]


# ---------------------------------------------------------------- chapter 2
def test_max_element_and_counts():
    c = OpCounter()
    assert c2.max_element([3, 9, 2, 9, 1], c) == 9
    assert c["comparisons"] == 4
    with pytest.raises(ValueError):
        c2.max_element([])


def test_unique_elements():
    rng = random.Random(1)
    for _ in range(200):
        A = [rng.randint(0, 20) for _ in range(rng.randint(0, 10))]
        assert c2.unique_elements(A) == (len(set(A)) == len(A))
    c = OpCounter()
    c2.unique_elements(list(range(10)), c)
    assert c["comparisons"] == 45  # worst case n(n-1)/2


def test_matrix_multiply():
    A = [[1, 2], [3, 4], [5, 6]]
    B = [[7, 8, 9], [10, 11, 12]]
    assert c2.matrix_multiply(A, B) == [[27, 30, 33], [61, 68, 75], [95, 106, 117]]
    c = OpCounter()
    I = [[1 if i == j else 0 for j in range(4)] for i in range(4)]
    assert c2.matrix_multiply(I, I, c) == I
    assert c["multiplications"] == 64
    with pytest.raises(ValueError):
        c2.matrix_multiply([[1, 2]], [[1, 2]])


def test_binary_digits_both_ways():
    for n in range(1, 3000):
        assert c2.binary_digits(n) == n.bit_length()
        assert c2.binary_digits_recursive(n) == n.bit_length()
    c = OpCounter()
    c2.binary_digits_recursive(1000, c)
    assert c["additions"] == math.floor(math.log2(1000))


def test_factorial():
    for n in range(0, 20):
        c = OpCounter()
        assert c2.factorial(n, c) == math.factorial(n)
        assert c["multiplications"] == n


def test_hanoi_moves_are_legal_and_minimal():
    for n in range(0, 9):
        moves = c2.hanoi_moves(n)
        assert len(moves) == 2 ** n - 1
        pegs = {"A": list(range(n, 0, -1)), "B": [], "C": []}
        for disk, src, dst in moves:
            assert pegs[src][-1] == disk
            assert not pegs[dst] or pegs[dst][-1] > disk
            pegs[dst].append(pegs[src].pop())
        assert pegs["C"] == list(range(n, 0, -1))


def test_fibonacci_four_ways():
    expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
    for n, f in enumerate(expected):
        assert c2.fib_recursive(n) == f
        assert c2.fib_iterative(n) == f
        assert c2.fib_formula(n) == f
        assert c2.fib_matrix(n) == f
    for n in range(0, 71):
        assert c2.fib_formula(n) == c2.fib_iterative(n) == c2.fib_matrix(n)
    assert c2.fib_matrix(300) == c2.fib_iterative(300)
    with pytest.raises(ValueError):
        c2.fib_formula(71)


def test_fib_recursive_addition_count():
    for n in range(1, 18):
        c = OpCounter()
        c2.fib_recursive(n, c)
        assert c["additions"] == c2.fib_iterative(n + 1) - 1  # A(n) = F(n+1) - 1


def test_fib_matrix_is_logarithmic():
    c = OpCounter()
    c2.fib_matrix(1024, c)
    assert c["matrix_multiplications"] <= 2 * 11


def test_measure_and_count_table():
    result, counts = c2.measure(c2.max_element, [1, 5, 2])
    assert result == 5 and counts == {"comparisons": 2}
    table = c2.count_table(c2.unique_elements, lambda n: (list(range(n)),), [10, 20, 40], "comparisons")
    assert table == [(10, 45), (20, 190), (40, 780)]
    ratios = c2.growth_ratios(table)
    assert all(3.5 < r < 4.5 for r in ratios)  # quadratic: doubling n -> about 4x


def test_time_function_returns_rows():
    rows = c2.time_function(sorted, lambda n: (list(range(n, 0, -1)),), [10, 100], repeats=2)
    assert [n for n, _ in rows] == [10, 100]
    assert all(t >= 0 for _, t in rows)


def test_recurrence_helpers():
    assert c2.evaluate_recurrence(lambda n, T: 2 * T(n - 1) + 1, {1: 1}, 10) == 1023
    assert c2.evaluate_recurrence(lambda n, T: T(n // 2) + 1, {1: 0}, 1024) == 10
    table = c2.recurrence_table(lambda n, T: T(n - 1) + n, {0: 0}, [1, 2, 3, 10])
    assert table == [(1, 1), (2, 3), (3, 6), (10, 55)]
