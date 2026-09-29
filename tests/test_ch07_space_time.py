"""Tests for Chapter 7 - space and time trade-offs."""

import random

import pytest

from algoforge import OpCounter
from algoforge import ch07_space_time as st


def test_counting_sorts():
    assert st.comparison_counting_sort([62, 31, 84, 96, 19, 47]) == [19, 31, 47, 62, 84, 96]
    assert st.distribution_counting_sort([13, 11, 12, 13, 12, 12], 11, 13) == [11, 12, 12, 12, 13, 13]
    rng = random.Random(1)
    for _ in range(200):
        A = [rng.randint(-10, 30) for _ in range(rng.randint(0, 40))]
        assert st.comparison_counting_sort(A) == sorted(A)
        assert st.distribution_counting_sort(A) == sorted(A)
        B = [abs(x) * rng.randint(1, 999) for x in A]
        assert st.radix_sort_lsd(B) == sorted(B)
        assert st.radix_sort_lsd(B, base=2) == sorted(B)
        F = [rng.uniform(-5, 5) for _ in range(rng.randint(0, 40))]
        assert st.bucket_sort(F) == sorted(F)
        assert st.bucket_sort(F, num_buckets=3) == sorted(F)
    assert st.bucket_sort([2.0, 2.0]) == [2.0, 2.0]
    with pytest.raises(ValueError):
        st.radix_sort_lsd([-1])


def test_comparison_counting_sort_count():
    c = OpCounter()
    st.comparison_counting_sort(list(range(12)), c)
    assert c["comparisons"] == 12 * 11 // 2


def test_horspool_shift_table_and_search():
    table = st.horspool_shift_table("BARBER")
    assert table == {"B": 2, "A": 4, "R": 3, "E": 1}
    assert table.get("Z", 6) == 6
    assert st.horspool_search("MEET_THE_BARBER_AT_NOON", "BARBER") == "MEET_THE_BARBER_AT_NOON".find("BARBER")


def test_good_suffix_tables():
    assert st.good_suffix_table("BAOBAB") == {1: 2, 2: 5, 3: 5, 4: 5, 5: 5}
    assert st.good_suffix_table("ABCBAB") == {1: 2, 2: 4, 3: 4, 4: 4, 5: 4}


def test_kmp_prefix_function():
    assert st.kmp_prefix_function("ABABCABAB") == [0, 0, 1, 2, 0, 1, 2, 3, 4]
    assert st.kmp_prefix_function("AAAA") == [0, 1, 2, 3]


@pytest.mark.parametrize("alphabet", ["ab", "abc", "ACGT"])
def test_string_matchers_agree_with_str_find(alphabet):
    rng = random.Random(len(alphabet))
    for _ in range(500):
        text = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 40)))
        pat = "".join(rng.choice(alphabet) for _ in range(rng.randint(1, 6)))
        expected = text.find(pat)
        assert st.horspool_search(text, pat) == expected
        assert st.boyer_moore_search(text, pat) == expected
        assert st.kmp_search(text, pat) == expected
        assert st.kmp_search_all(text, pat) == [
            i for i in range(len(text) - len(pat) + 1) if text.startswith(pat, i)]


def test_boyer_moore_saves_comparisons_on_long_text():
    text = "ABCDEFGHIJ" * 200 + "BAOBAB"
    a, b = OpCounter(), OpCounter()
    assert st.boyer_moore_search(text, "BAOBAB", a) == len(text) - 6
    st.kmp_search(text, "BAOBAB", b)
    assert a["comparisons"] < b["comparisons"] / 2
    assert st.kmp_search_all("aaa", "") == [0, 1, 2, 3]


def test_separate_chaining():
    t = st.SeparateChainingHashTable(13)
    words = "A FOOL AND HIS MONEY ARE SOON PARTED".split()
    for i, w in enumerate(words):
        t.insert(w, i)
    for i, w in enumerate(words):
        r = t.search(w)
        assert r.found and r.value == i and r.probes >= 1
    miss = t.search("KID")
    assert not miss.found and miss.value is None
    t.insert("FOOL", 99)
    assert t.search("FOOL").value == 99 and t.n == len(words)
    assert t.load_factor == len(words) / 13


@pytest.mark.parametrize("cls", [st.LinearProbingHashTable, st.DoubleHashingHashTable])
def test_closed_hashing_against_dict(cls):
    rng = random.Random(2)
    for _ in range(50):
        t = cls(31)
        truth = {}
        for _ in range(rng.randint(0, 25)):
            k = rng.randint(0, 200)
            v = rng.random()
            t.insert(k, v)
            truth[k] = v
        for k in range(0, 201):
            r = t.search(k)
            assert r.found == (k in truth)
            if r.found:
                assert r.value == truth[k]
            assert 1 <= r.probes <= 31
    full = cls(5)
    for k in range(5):
        full.insert(k)
    with pytest.raises(OverflowError):
        full.insert(99)
    assert not full.search(99).found


def test_linear_probing_cluster_probes():
    t = st.LinearProbingHashTable(10)
    assert [t.insert(k) for k in [0, 10, 20, 30]] == [1, 2, 3, 4]  # all hash to cell 0
    assert t.search(30).probes == 4


def test_double_hashing_step_formula():
    t = st.DoubleHashingHashTable(13)
    assert t._step(5) == 13 - 2 - 5 % 11
    assert all(1 <= t._step(k) <= 11 for k in range(100))
    with pytest.raises(ValueError):
        st.DoubleHashingHashTable(2)


def test_key_to_int_deterministic():
    assert st.key_to_int("AB") == 65 * 31 + 66
    assert st.key_to_int(-7) == 7
    with pytest.raises(TypeError):
        st.key_to_int(3.5)


@pytest.mark.parametrize("order", [3, 4, 5, 6])
def test_btree_random(order):
    rng = random.Random(order)
    for _ in range(40):
        t = st.BTree(order)
        keys = [rng.randint(0, 300) for _ in range(rng.randint(0, 120))]
        for k in keys:
            t.insert(k)
            assert t.is_valid()
        assert t.inorder() == sorted(set(keys))
        for probe in range(-1, 302, 5):
            assert t.search(probe) == (probe in keys)


def test_btree_height_is_logarithmic():
    t = st.BTree(4)
    for k in range(1000):
        t.insert(k)
    assert t.is_valid()
    assert t.height() <= 9  # log base ceil(4/2)=2 of 1000 is about 10
    c = OpCounter()
    t.search(777, c)
    assert 1 <= c["node_accesses"] <= t.height() + 1
    with pytest.raises(ValueError):
        st.BTree(2)
