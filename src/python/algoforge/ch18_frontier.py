"""Chapter 18 (Beyond Levitin) - The Frontier: from the classic algorithm to the cutting edge.

Working, tested versions of the algorithms in Lesson 18 and the Algorithm
Atlas. Each one extends a classic from the book:

- adaptive sorting: Timsort-style runs + galloping merge, Powersort's merge
  policy, pattern-defeating quicksort (pdqsort);
- ordered dictionaries: skip list, zip tree, learned index (ShrinkingCone);
- hashing and filters: cuckoo hash table, cuckoo filter, xor filter;
- streaming sketches: HyperLogLog, CVM distinct elements, Count-Min with
  conservative update, Misra-Gries heavy hitters, MinHash + Locality-Sensitive
  Hashing (LSH) banding;
- vector search: a small Hierarchical Navigable Small World (HNSW) index;
- parallel and algebraic building blocks: Blelloch scan, Number-Theoretic
  Transform (NTT) polynomial multiplication;
- string indexing: suffix array (prefix doubling), Kasai's Longest Common
  Prefix (LCP) array, Burrows-Wheeler Transform (BWT), FM-index;
- graphs: Dinic and push-relabel maximum flow, Boruvka's Minimum Spanning Tree
  (MST), Delta-stepping Single-Source Shortest Paths (SSSP), and the FindPivots
  sub-step of Duan et al. (2025).

Each docstring cites the paper (with its year) and states the complexity and
the model. Randomized structures take an optional ``random.Random`` (or a
seed) so runs are reproducible.
"""

from __future__ import annotations

import bisect
import hashlib
import heapq
import math
import operator
import random
from collections import deque
from fractions import Fraction
from functools import lru_cache
from typing import Callable, Hashable, Iterable, Sequence

from .ch10_iterative_improvement import MaxFlowResult
from .ch13_advanced_ds import UnionFind
from .counters import OpCounter, tick


def _hash64(item: Hashable, seed: int = 0) -> int:
    """A deterministic 64-bit hash of ``repr(item)`` (BLAKE2b), independent of PYTHONHASHSEED."""
    data = f"{seed}:{item!r}".encode()
    return int.from_bytes(hashlib.blake2b(data, digest_size=8).digest(), "big")


def _identity(x):
    return x


_MISSING = object()  # sentinel default that no stored value can equal


# ===========================================================================
# Part A1 - Adaptive sorting
# ===========================================================================


def _count_run(A: list, lo: int, hi: int, key: Callable, counter: OpCounter | None) -> int:
    """End (exclusive) of the natural run starting at lo; a STRICTLY descending run is reversed
    in place (strict, so reversing never swaps equal keys and stability is kept)."""
    if lo + 1 >= hi:
        return hi
    end = lo + 2
    tick(counter, "comparisons")
    if key(A[lo + 1]) < key(A[lo]):
        while end < hi:
            tick(counter, "comparisons")
            if not key(A[end]) < key(A[end - 1]):
                break
            end += 1
        A[lo:end] = A[lo:end][::-1]
    else:
        while end < hi:
            tick(counter, "comparisons")
            if key(A[end]) < key(A[end - 1]):
                break
            end += 1
    return end


def natural_runs(A: Sequence, key: Callable | None = None) -> list[list]:
    """Split a sequence into maximal sorted runs (strictly descending runs come out reversed).

    The first step of Timsort (Peters, 2002) and Powersort (Munro & Wild,
    2018): real inputs often consist of a few long runs, and merging r runs
    costs O(n log r) instead of O(n log n). Θ(n) comparisons.
    """
    key = key or _identity
    A = list(A)
    runs, lo = [], 0
    while lo < len(A):
        end = _count_run(A, lo, len(A), key, None)
        runs.append(A[lo:end])
        lo = end
    return runs


def _gallop(A: Sequence, lo: int, hi: int, goes_before: Callable, counter: OpCounter | None) -> int:
    """First index i in [lo, hi] where goes_before(A[i]) is False (A[lo:hi] is "sorted" for the predicate).

    Exponential search (Bentley & Yao, 1976): probe lo, lo+1, lo+3, lo+7, ...
    until the predicate fails, then binary-search the last gap. Finding a
    boundary at distance d costs O(log d) comparisons instead of O(d).
    """
    left, right, step = lo, hi, 1
    while True:
        probe = lo + step - 1
        if probe >= hi:
            break
        tick(counter, "comparisons")
        if not goes_before(A[probe]):
            right = probe
            break
        left = probe + 1
        step *= 2
    while left < right:
        mid = (left + right) // 2
        tick(counter, "comparisons")
        if goes_before(A[mid]):
            left = mid + 1
        else:
            right = mid
    return left


def galloping_merge(left: Sequence, right: Sequence, key: Callable | None = None,
                    min_gallop: int = 7, counter: OpCounter | None = None) -> list:
    """Stable merge of two sorted lists that switches to galloping when one side keeps winning.

    Timsort's merge (Peters, 2002, CPython ``listsort.txt``), extending the
    merge of Levitin §5.1, simplified to a fixed ``min_gallop``. After
    ``min_gallop`` wins in a row from one run, an exponential search finds how
    many MORE elements that run wins, and they are copied as a block. On ties
    the left run goes first (stability). O(len(left) + len(right)) worst case,
    and O(log n) comparisons to merge a run that lies entirely before the
    other. Ticks "comparisons".
    """
    key = key or _identity
    out: list = []
    i = j = 0
    left_wins = right_wins = 0
    while i < len(left) and j < len(right):
        tick(counter, "comparisons")
        if key(right[j]) < key(left[i]):
            out.append(right[j])
            j += 1
            right_wins, left_wins = right_wins + 1, 0
            if right_wins >= min_gallop:  # right keeps winning: find how many more are < left[i]
                k = key(left[i])
                end = _gallop(right, j, len(right), lambda x: key(x) < k, counter)
                out.extend(right[j:end])
                j, right_wins = end, 0
        else:
            out.append(left[i])
            i += 1
            left_wins, right_wins = left_wins + 1, 0
            if left_wins >= min_gallop:  # left keeps winning: everything <= right[j] goes first
                k = key(right[j])
                end = _gallop(left, i, len(left), lambda x: key(x) <= k, counter)
                out.extend(left[i:end])
                i, left_wins = end, 0
    out.extend(left[i:])
    out.extend(right[j:])
    return out


def min_run_length(n: int) -> int:
    """Timsort's minimum run length: n itself when n < 64, else a number in 32..64.

    Peters (2002), CPython ``listsort.txt``: take the 6 most significant bits of n
    and add 1 if any remaining bit is set, so n / minrun is (close to) a power
    of two and the final merges are balanced. O(log n).
    """
    extra = 0
    while n >= 64:
        extra |= n & 1
        n >>= 1
    return n + extra


def _binary_insertion_sort(A: list, lo: int, hi: int, start: int, key: Callable,
                           counter: OpCounter | None) -> None:
    """Stable binary insertion sort of A[lo:hi], knowing A[lo:start] is already sorted."""
    for i in range(max(start, lo + 1), hi):
        x = A[i]
        k = key(x)
        pos = _gallop(A, lo, i, lambda y: key(y) <= k, counter)  # after equal keys: stable
        A[pos + 1:i + 1] = A[pos:i]
        A[pos] = x


def timsort(A: Sequence, key: Callable | None = None, min_gallop: int = 7,
            counter: OpCounter | None = None) -> list:
    """Return a sorted copy using Timsort's structure: natural runs, minrun, a run stack, galloping merges.

    Peters (2002), CPython ``listsort.txt``, with the corrected stack rule of
    de Gouw, Rot, de Boer, Bubel & Hähnle, "OpenJDK's
    java.utils.Collection.sort() is broken" (CAV 2015); extends mergesort
    (Levitin §5.1). Short runs are extended to ``min_run_length(n)`` by binary
    insertion sort. Stable. O(n log n) worst case, O(n) on sorted or
    reverse-sorted input. Ticks "comparisons".
    """
    key = key or _identity
    A = list(A)
    n = len(A)
    minrun = min_run_length(n)
    stack: list[list[int]] = []  # [start, length] of pending runs

    def merge_at(i: int) -> None:
        s1, l1 = stack[i]
        s2, l2 = stack[i + 1]
        A[s1:s2 + l2] = galloping_merge(A[s1:s2], A[s2:s2 + l2], key, min_gallop, counter)
        stack[i] = [s1, l1 + l2]
        del stack[i + 1]

    def merge_collapse() -> None:
        while len(stack) > 1:
            m = len(stack) - 2
            L = [length for _, length in stack]
            if (m > 0 and L[m - 1] <= L[m] + L[m + 1]) or (m > 1 and L[m - 2] <= L[m - 1] + L[m]):
                if L[m - 1] < L[m + 1]:
                    m -= 1
                merge_at(m)
            elif L[m] <= L[m + 1]:
                merge_at(m)
            else:
                break

    lo = 0
    while lo < n:
        end = _count_run(A, lo, n, key, counter)
        if end - lo < minrun:
            forced = min(lo + minrun, n)
            _binary_insertion_sort(A, lo, forced, end, key, counter)
            end = forced
        stack.append([lo, end - lo])
        merge_collapse()
        lo = end
    while len(stack) > 1:  # force-collapse what is left
        m = len(stack) - 2
        if m > 0 and stack[m - 1][1] < stack[m + 1][1]:
            m -= 1
        merge_at(m)
    return A


def node_power(s1: int, n1: int, n2: int, n: int) -> int:
    """Powersort's "power" of the boundary between neighbouring runs [s1, s1+n1) and [s1+n1, s1+n1+n2).

    Munro & Wild, "Nearly-optimal mergesorts" (ESA 2018). Picture a perfectly
    balanced binary tree over positions 0..n; the power is the depth at which
    the two runs' midpoints first fall into different halves. Integer
    arithmetic only (midpoints scaled by 2n). O(log n).
    """
    a = 2 * s1 + n1  # midpoint of run 1 is a / (2n)
    b = 2 * s1 + 2 * n1 + n2  # midpoint of run 2 is b / (2n)
    k = 0
    while True:
        k += 1
        a, b = 2 * a, 2 * b
        if a // (2 * n) != b // (2 * n):
            return k


def powersort(A: Sequence, key: Callable | None = None, min_gallop: int = 7,
              counter: OpCounter | None = None) -> list:
    """Return a sorted copy by Powersort: natural runs merged by the node-power policy.

    Munro & Wild (ESA 2018); the merge policy of CPython's ``list.sort`` since
    3.11; extends bottom-up mergesort (Levitin §5.1). Pending runs sit on a
    stack with the power of the boundary to their right; before pushing a
    boundary of power p, merge while the top power is greater than p. Stable.
    O(n + n H) comparisons, where H <= log2 r is the entropy of the run
    lengths, so O(n log n) worst case and O(n) when sorted. Ticks
    "comparisons".
    """
    key = key or _identity
    A = list(A)
    n = len(A)
    if n < 2:
        return A
    stack: list[tuple[int, int, int]] = []  # (start, length, power of the boundary to its right)
    s = 0
    length = _count_run(A, 0, n, key, counter)
    while s + length < n:
        s2 = s + length
        length2 = _count_run(A, s2, n, key, counter) - s2
        p = node_power(s, length, length2, n)
        while stack and stack[-1][2] > p:
            s0, l0, _ = stack.pop()
            A[s0:s + length] = galloping_merge(A[s0:s], A[s:s + length], key, min_gallop, counter)
            s, length = s0, l0 + length
        stack.append((s, length, p))
        s, length = s2, length2
    while stack:
        s0, l0, _ = stack.pop()
        A[s0:s + length] = galloping_merge(A[s0:s], A[s:s + length], key, min_gallop, counter)
        s, length = s0, l0 + length
    return A


_PDQ_INSERTION = 24  # below this size, insertion sort
_PDQ_NINTHER = 128  # above this size, Tukey's ninther pivot
_PDQ_PARTIAL_LIMIT = 8  # element moves allowed in a "is it nearly sorted?" insertion sort


def pdqsort(A: Sequence, key: Callable | None = None, max_bad: int | None = None,
            counter: OpCounter | None = None) -> list:
    """Return a sorted copy by pattern-defeating quicksort (pdqsort).

    Peters, "Pattern-defeating quicksort" (arXiv:2106.05123, 2021), extending
    quicksort (Levitin §5.2); introsort is Musser (1997), the ninther is
    Bentley & McIlroy (1993). Ingredients:
    - insertion sort for ranges under 24 elements;
    - pivot = median of three, or Tukey's ninther (median of three medians)
      above 128 elements;
    - if the pivot equals the element just left of the range (a previous
      pivot), put all equal keys on the left and skip them: many duplicates
      cost O(n k) for k distinct keys;
    - a partition that needed no swaps triggers a bounded insertion sort that
      finishes already-sorted inputs in O(n);
    - a lopsided partition (a side under 1/8) shuffles a few elements, and
      after ``max_bad`` of them (default floor(log2 n)) the range is finished
      by heapsort, which caps the worst case at O(n log n).
    Not stable. O(n log n) worst case. Ticks "comparisons" and
    "heapsort_fallbacks".
    """
    key = key or _identity
    A = list(A)
    n = len(A)

    def less(x, y) -> bool:
        tick(counter, "comparisons")
        return key(x) < key(y)

    def swap(i: int, j: int) -> None:
        A[i], A[j] = A[j], A[i]

    def sort3(i: int, j: int, k: int) -> None:  # afterwards A[i] <= A[j] <= A[k]
        if less(A[j], A[i]):
            swap(i, j)
        if less(A[k], A[j]):
            swap(j, k)
            if less(A[j], A[i]):
                swap(i, j)

    def insertion_sort(lo: int, hi: int) -> None:
        for i in range(lo + 1, hi):
            x, j = A[i], i
            while j > lo and less(x, A[j - 1]):
                A[j] = A[j - 1]
                j -= 1
            A[j] = x

    def partial_insertion_sort(lo: int, hi: int) -> bool:
        moves = 0
        for i in range(lo + 1, hi):
            x, j = A[i], i
            while j > lo and less(x, A[j - 1]):
                A[j] = A[j - 1]
                j -= 1
            A[j] = x
            moves += i - j
            if moves > _PDQ_PARTIAL_LIMIT:
                return False
        return True

    def heapsort(lo: int, hi: int) -> None:
        tick(counter, "heapsort_fallbacks")
        size = hi - lo

        def sift_down(root: int, end: int) -> None:
            while 2 * root + 1 < end:
                child = 2 * root + 1
                if child + 1 < end and less(A[lo + child], A[lo + child + 1]):
                    child += 1
                if not less(A[lo + root], A[lo + child]):
                    return
                swap(lo + root, lo + child)
                root = child

        for start in range(size // 2 - 1, -1, -1):
            sift_down(start, size)
        for end in range(size - 1, 0, -1):
            swap(lo, lo + end)
            sift_down(0, end)

    def partition_right(lo: int, hi: int) -> tuple[int, bool]:
        """Pivot A[lo]; afterwards A[lo:p] < pivot <= A[p+1:hi]. Also: were no swaps needed?"""
        pivot = A[lo]
        i = lo + 1
        while i < hi and less(A[i], pivot):
            i += 1
        j = hi - 1
        while j >= i and not less(A[j], pivot):
            j -= 1
        already_partitioned = i > j
        while i < j:
            swap(i, j)
            i += 1
            while less(A[i], pivot):  # stops at j at the latest
                i += 1
            j -= 1
            while not less(A[j], pivot):  # stops at the old i at the latest
                j -= 1
        p = i - 1
        swap(lo, p)
        return p, already_partitioned

    def partition_left(lo: int, hi: int) -> int:
        """Pivot A[lo]; afterwards A[lo:p+1] == pivot (all <= it) and A[p+1:hi] > pivot."""
        pivot = A[lo]
        j = hi - 1
        while j > lo and less(pivot, A[j]):
            j -= 1
        i = lo + 1
        while i <= j and not less(pivot, A[i]):
            i += 1
        while i < j:
            swap(i, j)
            j -= 1
            while less(pivot, A[j]):
                j -= 1
            i += 1
            while not less(pivot, A[i]):
                i += 1
        swap(lo, j)
        return j

    def loop(lo: int, hi: int, bad_allowed: int, leftmost: bool) -> None:
        while True:
            size = hi - lo
            if size < _PDQ_INSERTION:
                insertion_sort(lo, hi)
                return
            mid = lo + size // 2
            if size > _PDQ_NINTHER:  # Tukey's ninther, moved to A[lo]
                sort3(lo, mid, hi - 1)
                sort3(lo + 1, mid - 1, hi - 2)
                sort3(lo + 2, mid + 1, hi - 3)
                sort3(mid - 1, mid, mid + 1)
                swap(lo, mid)
            else:  # median of three, moved to A[lo]
                sort3(mid, lo, hi - 1)
            if not leftmost and not less(A[lo - 1], A[lo]):
                # A[lo - 1] is an earlier pivot <= everything here, so it EQUALS this pivot
                lo = partition_left(lo, hi) + 1
                continue
            p, already_partitioned = partition_right(lo, hi)
            left_size, right_size = p - lo, hi - p - 1
            if left_size < size // 8 or right_size < size // 8:
                bad_allowed -= 1
                if bad_allowed <= 0:
                    heapsort(lo, hi)
                    return
                if left_size >= _PDQ_INSERTION:  # break up the pattern that fooled the pivot
                    swap(lo, lo + left_size // 4)
                    swap(p - 1, p - left_size // 4)
                if right_size >= _PDQ_INSERTION:
                    swap(p + 1, p + 1 + right_size // 4)
                    swap(hi - 1, hi - right_size // 4)
            elif (already_partitioned and partial_insertion_sort(lo, p)
                  and partial_insertion_sort(p + 1, hi)):
                return  # the range was (almost) sorted already
            loop(lo, p, bad_allowed, leftmost)  # recurse left, loop on the right
            lo, leftmost = p + 1, False

    if n > 1:
        loop(0, n, max_bad if max_bad is not None else n.bit_length() - 1, True)
    return A


# ===========================================================================
# Part A2 - Ordered dictionaries: skip list, zip tree, learned index
# ===========================================================================


class _SkipNode:
    __slots__ = ("key", "next")

    def __init__(self, key, height: int):
        self.key = key
        self.next: list = [None] * height


class SkipList:
    """Sorted set as a skip list: a sorted linked list plus random "express lanes".

    Pugh, "Skip lists: a probabilistic alternative to balanced trees" (1990).
    Each node gets height h with probability p^(h-1) (1 - p); a search runs
    along the top lane and drops a level whenever the next step would
    overshoot. O(log n) expected time per search, insert and delete; O(n)
    expected space. ``steps`` counts forward pointer moves.
    """

    def __init__(self, p: float = 0.5, max_height: int = 32, rng: random.Random | None = None):
        self.p = p
        self.max_height = max_height
        self.rng = rng or random.Random()
        self.head = _SkipNode(None, max_height)
        self.height = 1
        self.n = 0
        self.steps = 0

    def _random_height(self) -> int:
        h = 1
        while h < self.max_height and self.rng.random() < self.p:
            h += 1
        return h

    def _predecessors(self, key) -> list:
        """For every level, the last node whose key is < key."""
        update = [self.head] * self.max_height
        node = self.head
        for level in range(self.height - 1, -1, -1):
            while node.next[level] is not None and node.next[level].key < key:
                node = node.next[level]
                self.steps += 1
            update[level] = node
        return update

    def contains(self, key) -> bool:
        """True when key is stored. O(log n) expected."""
        node = self._predecessors(key)[0].next[0]
        return node is not None and node.key == key

    def insert(self, key) -> bool:
        """Add key; False if it was already present. O(log n) expected."""
        update = self._predecessors(key)
        nxt = update[0].next[0]
        if nxt is not None and nxt.key == key:
            return False
        h = self._random_height()
        self.height = max(self.height, h)
        node = _SkipNode(key, h)
        for level in range(h):
            node.next[level] = update[level].next[level]
            update[level].next[level] = node
        self.n += 1
        return True

    def delete(self, key) -> bool:
        """Remove key; False if it was absent. O(log n) expected."""
        update = self._predecessors(key)
        node = update[0].next[0]
        if node is None or node.key != key:
            return False
        for level in range(len(node.next)):
            if update[level].next[level] is node:
                update[level].next[level] = node.next[level]
        while self.height > 1 and self.head.next[self.height - 1] is None:
            self.height -= 1
        self.n -= 1
        return True

    def __iter__(self):
        node = self.head.next[0]
        while node is not None:
            yield node.key
            node = node.next[0]

    def __len__(self) -> int:
        return self.n

    def level_sizes(self) -> list[int]:
        """Number of nodes on each level, bottom first (about n p^level expected)."""
        sizes = []
        for level in range(self.height):
            count, node = 0, self.head.next[level]
            while node is not None:
                count += 1
                node = node.next[level]
            sizes.append(count)
        return sizes


class ZipNode:
    """A zip-tree node: key, random rank, children (Tarjan, Levy & Timmel, 2019). O(1) space."""

    __slots__ = ("key", "rank", "left", "right")

    def __init__(self, key, rank: int):
        self.key = key
        self.rank = rank
        self.left: ZipNode | None = None
        self.right: ZipNode | None = None


class ZipTree:
    """Zip tree: a binary search tree heap-ordered by random geometric ranks (a skip list drawn as a tree).

    Tarjan, Levy & Timmel, "Zip trees" (WADS 2019; ACM Transactions on
    Algorithms 2021); a randomized binary search tree (Levitin §4.5). Rank k
    has probability 1/2^(k+1). A parent's rank is greater than its left
    child's and at least its right child's (ties go to the smaller key), so
    the shape is determined by the (key, rank) pairs alone. Insertion "unzips" a search path, deletion "zips" two paths.
    O(log n) expected time; expected depth at most 1.5 log2 n + O(1).
    """

    def __init__(self, rng: random.Random | None = None):
        self.rng = rng or random.Random()
        self.root: ZipNode | None = None
        self.n = 0

    def random_rank(self) -> int:
        """Number of heads before the first tail of a fair coin."""
        r = 0
        while self.rng.random() < 0.5:
            r += 1
        return r

    def insert(self, key, rank: int | None = None) -> None:
        """Insert a new key (must be absent); rank drawn at random unless given. O(depth)."""
        x = ZipNode(key, self.random_rank() if rank is None else rank)

        def ins(t: ZipNode | None) -> ZipNode:
            if t is None:
                return x
            if key < t.key:
                if ins(t.left) is x:
                    if x.rank < t.rank:
                        t.left = x
                    else:  # x rises above t: t's left becomes x's right part
                        t.left, x.right = x.right, t
                        return x
            else:
                if ins(t.right) is x:
                    if x.rank <= t.rank:
                        t.right = x
                    else:
                        t.right, x.left = x.left, t
                        return x
            return t

        self.root = ins(self.root)
        self.n += 1

    @staticmethod
    def _zip(x: ZipNode | None, y: ZipNode | None) -> ZipNode | None:
        """Merge two trees, all keys of x smaller than those of y; the higher rank goes on top (ties: x)."""
        if x is None:
            return y
        if y is None:
            return x
        if x.rank < y.rank:
            y.left = ZipTree._zip(x, y.left)
            return y
        x.right = ZipTree._zip(x.right, y)
        return x

    def delete(self, key) -> bool:
        """Remove key: its node is replaced by zip(left, right). False if absent. O(depth)."""
        def dele(t: ZipNode | None) -> ZipNode | None:
            if t is None:
                raise KeyError(key)
            if key == t.key:
                return ZipTree._zip(t.left, t.right)
            if key < t.key:
                t.left = dele(t.left)
            else:
                t.right = dele(t.right)
            return t

        try:
            self.root = dele(self.root)
        except KeyError:
            return False
        self.n -= 1
        return True

    def contains(self, key) -> bool:
        """Ordinary binary-search-tree lookup. O(depth)."""
        t = self.root
        while t is not None:
            if key == t.key:
                return True
            t = t.left if key < t.key else t.right
        return False

    def preorder(self) -> list:
        """(key, rank) pairs in preorder: node, left subtree, right subtree. Θ(n)."""
        out, stack = [], [self.root]
        while stack:
            t = stack.pop()
            if t is not None:
                out.append((t.key, t.rank))
                stack.append(t.right)
                stack.append(t.left)
        return out

    def inorder(self) -> list:
        """Keys in sorted order. Θ(n)."""
        out, stack, t = [], [], self.root
        while stack or t is not None:
            while t is not None:
                stack.append(t)
                t = t.left
            t = stack.pop()
            out.append(t.key)
            t = t.right
        return out

    def depth(self) -> int:
        """Number of nodes on the longest root-to-leaf path (0 when empty). Θ(n)."""
        def d(t: ZipNode | None) -> int:
            return 0 if t is None else 1 + max(d(t.left), d(t.right))
        return d(self.root)

    def is_valid(self) -> bool:
        """Binary-search-tree order plus the rank rule at every node. Θ(n)."""
        def ok(t: ZipNode | None, lo, hi) -> bool:
            if t is None:
                return True
            if (lo is not None and not lo < t.key) or (hi is not None and not t.key < hi):
                return False
            if t.left is not None and not t.left.rank < t.rank:
                return False
            if t.right is not None and not t.right.rank <= t.rank:
                return False
            return ok(t.left, lo, t.key) and ok(t.right, t.key, hi)
        return ok(self.root, None, None)

    def __len__(self) -> int:
        return self.n


def shrinking_cone_segments(keys: Sequence[int], eps: int) -> list[tuple[int, int]]:
    """Cover sorted distinct keys with segments [a, b] whose line predicts every position within eps.

    ShrinkingCone, from Galakatos, Markovitch, Binnig, Fonseca & Kraska,
    "FITing-Tree: a data-aware index structure" (SIGMOD 2019). A segment's
    lines pass through its first point (K[a], a); keep the cone [lo, hi] of
    slopes that still fit every point within eps. A point outside the cone
    starts a new segment. Each segment then uses the line through its first and
    last points (always inside the final cone). Greedy, not optimal: the
    PGM-index (Ferragina & Vinciguerra, 2020) finds the fewest segments.
    Θ(n) time, exact rational arithmetic.
    """
    n = len(keys)
    if n == 0:
        return []
    segments = []
    s = 0
    lo, hi = Fraction(0), None  # None = +infinity
    for i in range(1, n):
        d = keys[i] - keys[s]
        if d <= 0:
            raise ValueError("keys must be strictly increasing")
        slope = Fraction(i - s, 1) / d
        if lo <= slope and (hi is None or slope <= hi):
            up = Fraction(i + eps - s, 1) / d
            hi = up if hi is None else min(hi, up)
            lo = max(lo, Fraction(i - eps - s, 1) / d)
        else:
            segments.append((s, i - 1))
            s, lo, hi = i, Fraction(0), None
    segments.append((s, n - 1))
    return segments


class LearnedIndex:
    """Learned index: piecewise-linear "key -> position" model with error eps, plus a bounded search.

    Kraska, Beutel, Chi, Dean & Polyzotis, "The case for learned index
    structures" (SIGMOD 2018), with ShrinkingCone segments (2019); the
    grown-up cousin of interpolation search (Levitin §4.5). A lookup
    finds the segment by binary search over the segment starts, predicts a
    position, and binary-searches only the 2 eps + 1 slots around it.
    O(log s + log eps) per lookup for s segments; Θ(n) build.
    """

    def __init__(self, keys: Sequence[int], eps: int = 2):
        if eps < 0:
            raise ValueError("eps must be non-negative")
        self.keys = list(keys)
        self.eps = eps
        self.segments = shrinking_cone_segments(self.keys, eps)
        self.starts = [self.keys[a] for a, _ in self.segments]

    def predict(self, q) -> Fraction:
        """Model's (fractional) position for q."""
        a, b = self.segments[max(0, bisect.bisect_right(self.starts, q) - 1)]
        if a == b:
            return Fraction(a)
        return a + Fraction(q - self.keys[a]) * (b - a) / (self.keys[b] - self.keys[a])

    def window(self, q) -> tuple[int, int]:
        """Positions [lo, hi] that must contain q if it is stored (within eps of the prediction, clamped)."""
        a, b = self.segments[max(0, bisect.bisect_right(self.starts, q) - 1)]
        pred = self.predict(q)
        lo = max(a, math.ceil(pred - self.eps))
        hi = min(b, math.floor(pred + self.eps))
        return lo, hi

    def lookup(self, q, counter: OpCounter | None = None) -> int:
        """Index of q in the keys, or -1. Ticks "comparisons" inside the window."""
        if not self.keys or q < self.keys[0] or q > self.keys[-1]:
            return -1
        lo, hi = self.window(q)
        while lo <= hi:
            mid = (lo + hi) // 2
            tick(counter, "comparisons")
            if self.keys[mid] == q:
                return mid
            if self.keys[mid] < q:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1


# ===========================================================================
# Part A3 - Hashing and filters
# ===========================================================================


class CuckooHashTable:
    """Dictionary with two possible homes per key: lookups probe at most 2 slots, always.

    Pagh & Rodler, "Cuckoo hashing" (ESA 2001; Journal of Algorithms 2004), a
    form of closed hashing (Levitin §7.3). Insertion puts the key in its first
    home; an occupant is kicked to ITS other home, possibly kicking another,
    and so on. After ``max_kicks`` the table is rebuilt with new hash seeds
    (and grown when over 45% full). O(1) worst-case lookup and delete; O(1)
    expected amortized insert. ``kicks`` and ``rehashes`` count the work.
    """

    def __init__(self, capacity: int = 8, rng: random.Random | None = None, max_kicks: int = 32):
        self.rng = rng or random.Random()
        self.m = max(2, capacity)
        self.max_kicks = max_kicks
        self.n = 0
        self.kicks = 0
        self.rehashes = 0
        self._new_tables()

    def _new_tables(self) -> None:
        self.seeds = (self.rng.getrandbits(32), self.rng.getrandbits(32))
        self.tables: list[list] = [[None] * self.m, [None] * self.m]

    def _slot(self, t: int, key) -> int:
        return _hash64(key, self.seeds[t]) % self.m

    def get(self, key, default=None):
        """Value stored for key (probes exactly two slots). O(1) worst case."""
        for t in (0, 1):
            entry = self.tables[t][self._slot(t, key)]
            if entry is not None and entry[0] == key:
                return entry[1]
        return default

    def __contains__(self, key) -> bool:
        """True when key is stored (two probes). O(1) worst case."""
        return self.get(key, _MISSING) is not _MISSING

    def put(self, key, value=True) -> None:
        """Insert or update key. O(1) expected amortized."""
        for t in (0, 1):
            i = self._slot(t, key)
            entry = self.tables[t][i]
            if entry is not None and entry[0] == key:
                self.tables[t][i] = (key, value)
                return
        if self.n + 1 > 0.45 * 2 * self.m:  # keep the load below about 45%
            self._rebuild(2 * self.m)
        homeless = self._place((key, value))
        if homeless is not None:  # an eviction chain got too long: new hash functions
            self._rebuild(self.m, extra=homeless)
        self.n += 1

    def _place(self, entry: tuple):
        """Kick entries along their alternate homes; return the homeless entry, or None on success."""
        t = 0
        for _ in range(self.max_kicks):
            i = self._slot(t, entry[0])
            entry, self.tables[t][i] = self.tables[t][i], entry
            if entry is None:
                return None
            self.kicks += 1
            t = 1 - t  # the evicted entry moves to its home in the other table
        return entry

    def _rebuild(self, new_m: int, extra: tuple | None = None) -> None:
        """Re-insert everything (plus ``extra``) with fresh seeds; grow after repeated failures."""
        items = [e for table in self.tables for e in table if e is not None]
        if extra is not None:
            items.append(extra)
        self.m = new_m
        failures = 0
        while True:
            self.rehashes += 1
            self._new_tables()
            if all(self._place(e) is None for e in items):
                return
            failures += 1
            if failures % 4 == 0:
                self.m *= 2

    def delete(self, key) -> bool:
        """Remove key; False if absent. O(1) worst case."""
        for t in (0, 1):
            i = self._slot(t, key)
            entry = self.tables[t][i]
            if entry is not None and entry[0] == key:
                self.tables[t][i] = None
                self.n -= 1
                return True
        return False

    def __len__(self) -> int:
        return self.n

    def keys(self) -> list:
        """Every stored key (table order). Θ(m)."""
        return [e[0] for table in self.tables for e in table if e is not None]


class CuckooFilter:
    """Approximate set with deletions: short fingerprints stored in a cuckoo table of buckets.

    Fan, Andersen, Kaminsky & Mitzenmacher, "Cuckoo filter: practically better
    than Bloom" (CoNEXT 2014). An item's fingerprint f (``fingerprint_bits``
    bits, never 0) may live in bucket i1 = h(x) or i2 = i1 XOR h(f), with XOR
    the bitwise exclusive or ("partial-key cuckoo hashing": either bucket and
    the fingerprint give the other). No false negatives; false-positive rate
    about 2 b / 2^f for b slots per bucket. O(1) lookup and delete, O(1)
    expected insert. When the table is full, the last homeless fingerprint is
    kept in ``victim`` so nothing is ever lost, and further inserts are
    refused.
    """

    def __init__(self, capacity: int, bucket_size: int = 4, fingerprint_bits: int = 8,
                 max_kicks: int = 500, rng: random.Random | None = None):
        self.rng = rng or random.Random()
        self.b = bucket_size
        self.f = fingerprint_bits
        buckets = max(1, math.ceil(capacity / bucket_size / 0.95))
        self.m = 1 << (buckets - 1).bit_length()  # a power of two, so XOR stays in range
        self.buckets: list[list[int]] = [[] for _ in range(self.m)]
        self.max_kicks = max_kicks
        self.count = 0
        self.victim: tuple[int, int] | None = None
        self.seed = self.rng.getrandbits(32)

    def _fingerprint(self, item) -> int:
        return _hash64(item, self.seed) % ((1 << self.f) - 1) + 1

    def _index(self, item) -> int:
        return _hash64(item, self.seed + 1) & (self.m - 1)

    def _alt_index(self, i: int, fp: int) -> int:
        return (i ^ _hash64(fp, self.seed + 2)) & (self.m - 1)

    def insert(self, item) -> bool:
        """Add item; False when the filter is full (then nothing already stored is lost)."""
        if self.victim is not None:
            return False
        fp = self._fingerprint(item)
        i1 = self._index(item)
        i2 = self._alt_index(i1, fp)
        for i in (i1, i2):
            if len(self.buckets[i]) < self.b:
                self.buckets[i].append(fp)
                self.count += 1
                return True
        self._kick_into(self.rng.choice((i1, i2)), fp)
        return True  # stored (possibly in the victim slot, which means the filter is now full)

    def _kick_into(self, i: int, fp: int) -> None:
        """Cuckoo eviction walk starting at bucket i (both homes are full); park the last homeless
        fingerprint in ``victim`` if the walk is too long."""
        self.count += 1
        for _ in range(self.max_kicks):
            if len(self.buckets[i]) < self.b:
                self.buckets[i].append(fp)
                return
            slot = self.rng.randrange(len(self.buckets[i]))
            fp, self.buckets[i][slot] = self.buckets[i][slot], fp  # swap with a random occupant
            i = self._alt_index(i, fp)  # the evicted fingerprint moves to its other bucket
        if len(self.buckets[i]) < self.b:
            self.buckets[i].append(fp)
        else:
            self.victim = (i, fp)

    def contains(self, item) -> bool:
        """False = definitely absent; True = probably present. O(b)."""
        fp = self._fingerprint(item)
        i1 = self._index(item)
        i2 = self._alt_index(i1, fp)
        if fp in self.buckets[i1] or fp in self.buckets[i2]:
            return True
        return self.victim is not None and self.victim[1] == fp and self.victim[0] in (i1, i2)

    def delete(self, item) -> bool:
        """Remove one copy of an item that WAS inserted (deleting others can cause false negatives)."""
        fp = self._fingerprint(item)
        i1 = self._index(item)
        i2 = self._alt_index(i1, fp)
        for i in (i1, i2):
            if fp in self.buckets[i]:
                self.buckets[i].remove(fp)
                self.count -= 1
                if self.victim is not None:  # room again: re-insert the victim
                    vi, vfp = self.victim
                    self.victim = None
                    self.count -= 1
                    self._kick_into(vi, vfp)
                return True
        if self.victim is not None and self.victim[1] == fp and self.victim[0] in (i1, i2):
            self.victim = None
            self.count -= 1
            return True
        return False

    def load_factor(self) -> float:
        """Fraction of the m · b fingerprint slots in use. O(1)."""
        return self.count / (self.m * self.b)

    def expected_false_positive_rate(self) -> float:
        """About 1 - (1 - 1/(2^f - 1))^(2 b load): two buckets of b slots each, filled to ``load``."""
        return 1 - (1 - 1 / ((1 << self.f) - 1)) ** (2 * self.b * self.load_factor())


class XorFilter:
    """Static approximate set: three table cells per key combine by exclusive or (XOR) to its fingerprint.

    Graf & Lemire, "Xor filters: faster and smaller than Bloom and cuckoo
    filters" (ACM Journal of Experimental Algorithmics, 2020). The table has
    about 1.23 n cells in three segments; each key hashes to one cell per
    segment. Construction PEELS: repeatedly remove a key that is the only one
    using some cell, remembering that cell; then fill cells in reverse peeling
    order. Fails (and retries with a new seed) with small probability.
    False-positive rate 2^-f, about 1.23 f bits per key; exactly 3 memory reads
    per lookup. Θ(n) expected construction.
    """

    def __init__(self, keys: Iterable[Hashable], fingerprint_bits: int = 8,
                 rng: random.Random | None = None, max_attempts: int = 64):
        self.rng = rng or random.Random()
        self.f = fingerprint_bits
        self.keys = list(dict.fromkeys(keys))  # duplicates would never peel
        n = len(self.keys)
        self.segment = (math.floor(1.23 * n) + 32) // 3
        self.size = 3 * self.segment
        self.attempts = 0
        for _ in range(max_attempts):
            self.attempts += 1
            self.seed = self.rng.getrandbits(32)
            order = self._peel()
            if order is not None:
                self.order = order
                self._assign(order)
                return
        raise RuntimeError("xor filter construction failed; try more attempts")

    def _cells(self, key) -> tuple[int, int, int]:
        h = _hash64(key, self.seed)
        s = self.segment
        return (h % s, s + (h >> 21) % s, 2 * s + (h >> 42) % s)

    def _fingerprint(self, key) -> int:
        return _hash64(key, self.seed + 1) & ((1 << self.f) - 1)

    def _peel(self) -> list[tuple[int, int]] | None:
        """Peeling order as (key index, its own cell), or None when the 3-hypergraph has a 2-core."""
        count = [0] * self.size
        xor_of_keys = [0] * self.size  # XOR of the indices of the keys using the cell
        cells = [self._cells(k) for k in self.keys]
        for idx, cs in enumerate(cells):
            for c in cs:
                count[c] += 1
                xor_of_keys[c] ^= idx
        queue = deque(c for c in range(self.size) if count[c] == 1)
        order = []
        while queue:
            c = queue.popleft()
            if count[c] != 1:
                continue
            idx = xor_of_keys[c]  # the only key left in this cell
            order.append((idx, c))
            for other in cells[idx]:
                count[other] -= 1
                xor_of_keys[other] ^= idx
                if count[other] == 1:
                    queue.append(other)
        return order if len(order) == len(self.keys) else None

    def _assign(self, order: list[tuple[int, int]]) -> None:
        self.table = [0] * self.size
        for idx, own in reversed(order):
            key = self.keys[idx]
            value = self._fingerprint(key)
            for c in self._cells(key):
                if c != own:
                    value ^= self.table[c]
            self.table[own] = value

    def contains(self, key) -> bool:
        """False = definitely absent; True = probably present. O(1): three reads."""
        c0, c1, c2 = self._cells(key)
        return self._fingerprint(key) == self.table[c0] ^ self.table[c1] ^ self.table[c2]

    def bits_per_key(self) -> float:
        """Table bits divided by the number of keys (about 1.23 · fingerprint_bits). O(1)."""
        return self.size * self.f / max(1, len(self.keys))


# ===========================================================================
# Part A4 - Streaming sketches
# ===========================================================================


class HyperLogLog:
    """Distinct-count estimate from m = 2^p tiny registers (about 6 bits each).

    Flajolet, Fusy, Gandouet & Meunier, "HyperLogLog: the analysis of a
    near-optimal cardinality estimation algorithm" (AofA 2007). The first p
    hash bits choose a register; the register keeps the largest "position of
    the first 1-bit" seen in the remaining bits. The estimate is
    alpha_m m^2 / sum 2^(-register), with the paper's small-range correction
    (linear counting). Standard error about 1.04 / sqrt(m). O(1) per add,
    O(m) per estimate; ``merge`` is a register-wise maximum.
    """

    def __init__(self, p: int = 10, seed: int = 0):
        if not 4 <= p <= 18:
            raise ValueError("p must be in 4..18")
        self.p = p
        self.m = 1 << p
        self.seed = seed
        self.registers = bytearray(self.m)

    def add(self, item: Hashable) -> None:
        """Record one occurrence of item (duplicates change nothing). O(1)."""
        x = _hash64(item, self.seed)
        index = x >> (64 - self.p)
        rest = x & ((1 << (64 - self.p)) - 1)
        rank = (64 - self.p) - rest.bit_length() + 1  # position of the leftmost 1-bit
        if rank > self.registers[index]:
            self.registers[index] = rank

    def estimate(self) -> float:
        """Estimated number of distinct items added so far. O(m)."""
        m = self.m
        alpha = {16: 0.673, 32: 0.697, 64: 0.709}.get(m, 0.7213 / (1 + 1.079 / m))
        raw = alpha * m * m / sum(2.0 ** -r for r in self.registers)
        zeros = self.registers.count(0)
        if raw <= 2.5 * m and zeros:
            return m * math.log(m / zeros)  # linear counting for small cardinalities
        return raw

    def merge(self, other: "HyperLogLog") -> None:
        """Absorb another sketch with the same p and seed: the union's sketch."""
        if (other.p, other.seed) != (self.p, self.seed):
            raise ValueError("sketches must share p and seed")
        self.registers = bytearray(max(a, b) for a, b in zip(self.registers, other.registers))

    def standard_error(self) -> float:
        """Relative standard error 1.04 / sqrt(m) from the paper. O(1)."""
        return 1.04 / math.sqrt(self.m)


def cvm_threshold(eps: float, delta: float, stream_length: int) -> int:
    """Buffer size ceil(12 / eps^2 · log2(8 m / delta)) for CVM (Chakraborty et al., 2022, Theorem 2).

    The paper writes "log"; base 2 is used here, which only makes the buffer
    larger (safer). O(1).
    """
    return math.ceil(12 / eps ** 2 * math.log2(8 * stream_length / delta))


def cvm_estimate(stream: Iterable[Hashable], thresh: int, rng: random.Random | None = None) -> float | None:
    """Estimate the number of distinct items with no hashing at all, storing at most ``thresh`` items.

    Chakraborty, Vinodchandran & Meel, "Distinct elements in streams: an
    algorithm for the (text) book" (ESA 2022), Algorithm 1. Keep a buffer X and
    a probability p = 1. For each item: forget it, then keep it with
    probability p. When X fills up, throw each element out with probability
    1/2 and halve p. Every distinct item seen is in X with probability p, so
    |X| / p estimates the count. Returns None for the (rare) failure symbol.
    With ``thresh = cvm_threshold(eps, delta, m)`` the answer is within a
    factor 1 +- eps with probability at least 1 - delta. O(1) expected per item.
    """
    rng = rng or random.Random()
    p = 1.0
    X: dict = {}  # insertion-ordered, so runs are reproducible for a given rng
    for a in stream:
        X.pop(a, None)
        if rng.random() < p:
            X[a] = True
        if len(X) == thresh:
            X = {x: True for x in X if rng.random() >= 0.5}
            p /= 2
            if len(X) == thresh:
                return None
    return len(X) / p


class CountMinSketch:
    """Count-Min sketch with optional conservative update: frequency estimates that never undercount.

    Cormode & Muthukrishnan, "An improved data stream summary: the Count-Min
    sketch and its applications" (2005); conservative update from Estan &
    Varghese, "New directions in traffic measurement and accounting" (SIGCOMM
    2002): raise each of the item's counters only up to (current estimate +
    count), which never hurts and often helps a lot. With width
    ceil(e / eps) and depth ceil(ln(1 / delta)) the estimate exceeds the true
    count by more than eps · N with probability at most delta. O(depth) per
    operation.
    """

    def __init__(self, width: int, depth: int, conservative: bool = False, seed: int = 0):
        self.width, self.depth = width, depth
        self.conservative = conservative
        self.seed = seed
        self.table = [[0] * width for _ in range(depth)]
        self.total = 0

    @classmethod
    def for_error(cls, eps: float, delta: float, conservative: bool = False,
                  seed: int = 0) -> "CountMinSketch":
        """Size the sketch: width ceil(e / eps), depth ceil(ln(1 / delta)). O(width · depth)."""
        return cls(math.ceil(math.e / eps), math.ceil(math.log(1 / delta)), conservative, seed)

    def _cells(self, item) -> list[int]:
        return [_hash64(item, self.seed * 1000 + row) % self.width for row in range(self.depth)]

    def add(self, item: Hashable, count: int = 1) -> None:
        """Record ``count`` (>= 0) more occurrences of item. O(depth)."""
        if count < 0:
            raise ValueError("Count-Min supports non-negative updates only")
        self.total += count
        cells = self._cells(item)
        if self.conservative:
            target = min(self.table[r][c] for r, c in enumerate(cells)) + count
            for r, c in enumerate(cells):
                self.table[r][c] = max(self.table[r][c], target)
        else:
            for r, c in enumerate(cells):
                self.table[r][c] += count

    def estimate(self, item: Hashable) -> int:
        """Upper estimate of item's count (never too small). O(depth)."""
        return min(self.table[r][c] for r, c in enumerate(self._cells(item)))


def misra_gries(stream: Iterable[Hashable], k: int) -> dict:
    """Heavy-hitter counters: at most k - 1 of them, each undercounting by at most N / k.

    Misra & Gries, "Finding repeated elements" (Science of Computer Programming,
    1982). A new item takes a free counter; when none is free, every counter
    drops by one (an item and k - 1 others "cancel"). Guarantee for every x:
    f(x) - N/k <= counters.get(x, 0) <= f(x), so every item with f(x) > N/k
    survives. O(k) worst case per item, O(1) amortized; O(k) space.
    """
    if k < 2:
        raise ValueError("k must be at least 2")
    counters: dict = {}
    for x in stream:
        if x in counters:
            counters[x] += 1
        elif len(counters) < k - 1:
            counters[x] = 1
        else:
            for y in list(counters):
                counters[y] -= 1
                if counters[y] == 0:
                    del counters[y]
    return counters


_MERSENNE61 = (1 << 61) - 1


@lru_cache(maxsize=64)
def _minhash_coefficients(num_hashes: int, seed: int) -> tuple:
    """(a, b) pairs of the hash functions h(x) = (a x + b) mod (2^61 - 1), cached per (num_hashes, seed)."""
    rng = random.Random(seed)
    return tuple((rng.randrange(1, _MERSENNE61), rng.randrange(0, _MERSENNE61)) for _ in range(num_hashes))


def jaccard(A: Iterable, B: Iterable) -> float:
    """Jaccard similarity |A n B| / |A u B| (1.0 for two empty sets).

    Jaccard (1901); the quantity MinHash estimates (Broder, 1997). Θ(|A| + |B|).
    """
    A, B = set(A), set(B)
    return 1.0 if not A and not B else len(A & B) / len(A | B)


def minhash_signature(items: Iterable[Hashable], num_hashes: int = 128, seed: int = 0) -> list[int]:
    """MinHash signature: for each of num_hashes random hash functions, the minimum over the set.

    Broder, "On the resemblance and containment of documents" (1997). For one
    random hash function, Pr[min h(A) = min h(B)] = Jaccard(A, B), so the
    fraction of equal signature entries estimates the similarity with standard
    deviation about sqrt(J(1 - J) / num_hashes). Hashes are
    h(x) = (a x + b) mod (2^61 - 1). Θ(|items| · num_hashes).
    """
    base = [_hash64(x) % _MERSENNE61 for x in set(items)]
    if not base:
        raise ValueError("MinHash of an empty set is undefined")
    coefficients = _minhash_coefficients(num_hashes, seed)
    return [min((a * x + b) % _MERSENNE61 for x in base) for a, b in coefficients]


def minhash_similarity(sig1: Sequence[int], sig2: Sequence[int]) -> float:
    """Fraction of positions where two signatures agree: an unbiased Jaccard estimate (Broder, 1997). Θ(len)."""
    if len(sig1) != len(sig2):
        raise ValueError("signatures must have the same length")
    return sum(x == y for x, y in zip(sig1, sig2)) / len(sig1)


def lsh_candidate_pairs(signatures: dict, bands: int, rows: int) -> set[tuple]:
    """Locality-Sensitive Hashing (LSH) banding: pairs that agree on all rows of at least one band.

    Indyk & Motwani (STOC 1998); banding as in Leskovec, Rajaraman & Ullman,
    *Mining of Massive Datasets* (2nd ed., 2014), Ch. 3. Each band of
    ``rows`` signature entries is hashed into buckets; items sharing a bucket in any band become
    candidates. A pair with similarity s is a candidate with probability
    1 - (1 - s^rows)^bands (``lsh_candidate_probability``): an S-curve.
    Θ(items · bands) plus the output.
    """
    pairs: set[tuple] = set()
    for band in range(bands):
        buckets: dict = {}
        for name, sig in signatures.items():
            if len(sig) < bands * rows:
                raise ValueError("signatures are shorter than bands * rows")
            buckets.setdefault(tuple(sig[band * rows:(band + 1) * rows]), []).append(name)
        for names in buckets.values():
            names = sorted(names, key=repr)
            for i in range(len(names)):
                for j in range(i + 1, len(names)):
                    pairs.add((names[i], names[j]))
    return pairs


def lsh_candidate_probability(s: float, bands: int, rows: int) -> float:
    """Probability 1 - (1 - s^rows)^bands that a pair with similarity s becomes a candidate.

    Leskovec, Rajaraman & Ullman, *Mining of Massive Datasets* (2nd ed., 2014), Ch. 3. O(1).
    """
    return 1 - (1 - s ** rows) ** bands


# ===========================================================================
# Part A5 - Vector search
# ===========================================================================


def squared_distance(a: Sequence[float], b: Sequence[float]) -> float:
    """Squared Euclidean distance (enough for comparing distances; Lesson 18, Card 4). Θ(d)."""
    return sum((x - y) * (x - y) for x, y in zip(a, b))


def brute_force_knn(points: Sequence[Sequence[float]], q: Sequence[float], k: int) -> list[int]:
    """Indices of the k nearest points (ties by index): the exact brute-force oracle (Levitin §3.3 style).

    Θ(n d + n log n).
    """
    return sorted(range(len(points)), key=lambda i: (squared_distance(points[i], q), i))[:k]


class HNSW:
    """Hierarchical Navigable Small World (HNSW) graph for approximate nearest neighbours (small and readable).

    Malkov & Yashunin, "Efficient and robust approximate nearest neighbor search
    using Hierarchical Navigable Small World graphs" (arXiv 2016; IEEE
    Transactions on Pattern Analysis and Machine Intelligence 2020),
    Algorithms 1-2 with the simple neighbour selection. Each point joins
    layers 0..L with L = floor(-ln(U) / ln(M)), like skip-list heights; a query
    walks greedily down the sparse upper layers, then runs a beam search with
    ``ef`` candidates on layer 0. Approximate: measure recall against
    ``brute_force_knn``. The paper reports roughly O(log n) query cost
    (empirical, not a worst-case bound); building costs one search per insert.
    """

    def __init__(self, M: int = 8, ef_construction: int = 64, rng: random.Random | None = None):
        self.M = M
        self.M0 = 2 * M  # layer 0 keeps more links
        self.ef_construction = ef_construction
        self.rng = rng or random.Random()
        self.mL = 1 / math.log(M)
        self.points: list[Sequence[float]] = []
        self.links: list[list[list[int]]] = []  # links[node][layer] = neighbour ids
        self.entry: int | None = None
        self.top = -1
        self.distance_evaluations = 0

    def _dist(self, q, i: int) -> float:
        self.distance_evaluations += 1
        return squared_distance(q, self.points[i])

    def _search_layer(self, q, entry_points: list[int], ef: int,
                      layer: int) -> list[tuple[float, int]]:
        """Beam search on one layer (the paper's SEARCH-LAYER); returns up to ef (distance, id), closest first."""
        visited = set(entry_points)
        candidates = [(self._dist(q, e), e) for e in entry_points]
        heapq.heapify(candidates)  # closest first
        best = [(-d, e) for d, e in candidates]  # max-heap of the ef best found
        heapq.heapify(best)
        while len(best) > ef:
            heapq.heappop(best)
        while candidates:
            d, c = heapq.heappop(candidates)
            if d > -best[0][0]:
                break  # the closest candidate is farther than the worst result: done
            for e in self.links[c][layer]:
                if e in visited:
                    continue
                visited.add(e)
                de = self._dist(q, e)
                if len(best) < ef or de < -best[0][0]:
                    heapq.heappush(candidates, (de, e))
                    heapq.heappush(best, (-de, e))
                    if len(best) > ef:
                        heapq.heappop(best)
        return sorted((-nd, e) for nd, e in best)

    def add(self, vector: Sequence[float]) -> int:
        """Insert a point; returns its id. O(log n) expected layers, each a beam search."""
        node = len(self.points)
        self.points.append(tuple(vector))
        level = int(-math.log(1.0 - self.rng.random()) * self.mL)
        self.links.append([[] for _ in range(level + 1)])
        if self.entry is None:
            self.entry, self.top = node, level
            return node
        eps = [self.entry]
        for layer in range(self.top, level, -1):  # greedy descent through the upper layers
            eps = [self._search_layer(vector, eps, 1, layer)[0][1]]
        for layer in range(min(level, self.top), -1, -1):
            found = self._search_layer(vector, eps, self.ef_construction, layer)
            limit = self.M0 if layer == 0 else self.M
            for _, nb in found[:self.M]:
                self.links[node][layer].append(nb)
                self.links[nb][layer].append(node)
                if len(self.links[nb][layer]) > limit:  # keep only nb's closest links
                    p = self.points[nb]
                    self.links[nb][layer] = sorted(
                        self.links[nb][layer],
                        key=lambda x: (squared_distance(p, self.points[x]), x))[:limit]
            eps = [e for _, e in found]
        if level > self.top:
            self.entry, self.top = node, level
        return node

    def search(self, q: Sequence[float], k: int = 1, ef: int | None = None) -> list[int]:
        """Ids of (approximately) the k nearest points, closest first."""
        if self.entry is None:
            return []
        ef = max(ef or self.ef_construction, k)
        ep = [self.entry]
        for layer in range(self.top, 0, -1):
            ep = [self._search_layer(q, ep, 1, layer)[0][1]]
        return [e for _, e in self._search_layer(q, ep, ef, 0)[:k]]


def recall_at_k(found: Sequence, truth: Sequence) -> float:
    """Fraction of the true k nearest neighbours that were returned.

    The standard quality measure for Approximate Nearest Neighbour (ANN) search
    (Malkov & Yashunin, 2016). Θ(k).
    """
    return len(set(found) & set(truth)) / len(truth) if truth else 1.0


# ===========================================================================
# Part A6 - Parallel and algebraic building blocks
# ===========================================================================


def blelloch_scan(A: Sequence, op: Callable = operator.add, identity=0,
                  counter: OpCounter | None = None) -> list:
    """Exclusive prefix scan [id, a0, a0+a1, ...] by Blelloch's work-efficient up-sweep / down-sweep.

    Blelloch, "Prefix sums and their applications" (1990). The input is padded
    to a power of two m. Up-sweep builds partial sums in a balanced tree;
    down-sweep pushes prefixes back down. Every level's operations are
    independent, so on a parallel machine the span is 2 log2 m steps while the
    work stays below 2m: Θ(n) work, Θ(log n) span. ``op`` must be associative
    (not necessarily commutative). Ticks "work" (op applications) and "span" (levels).
    """
    n = len(A)
    if n == 0:
        return []
    m = 1
    while m < n:
        m *= 2
    T = list(A) + [identity] * (m - n)
    step = 1
    while step < m:  # up-sweep (reduce)
        tick(counter, "span")
        for i in range(2 * step - 1, m, 2 * step):
            T[i] = op(T[i - step], T[i])
            tick(counter, "work")
        step *= 2
    T[m - 1] = identity
    step = m // 2
    while step >= 1:  # down-sweep
        tick(counter, "span")
        for i in range(2 * step - 1, m, 2 * step):
            left = T[i - step]
            T[i - step] = T[i]  # left child gets the prefix of everything before it
            T[i] = op(T[i], left)  # right child: that prefix plus the left subtree
            tick(counter, "work")
        step //= 2
    return T[:n]


NTT_MOD = 998244353  # = 119 · 2^23 + 1, a prime with primitive root 3
NTT_ROOT = 3


def ntt(a: Sequence[int], invert: bool = False, mod: int = NTT_MOD, root: int = NTT_ROOT) -> list[int]:
    """Number-Theoretic Transform: the Fast Fourier Transform (FFT) with integers mod a prime.

    Pollard, "The fast Fourier transform in a finite field" (1971); iterative
    Cooley-Tukey (1965) as in Cormen, Leiserson, Rivest and Stein,
    *Introduction to Algorithms*, 3rd ed. (CLRS) §30.3. Exact arithmetic, no
    rounding. len(a) must be a power of two dividing mod - 1.
    Θ(n log n) multiplications mod p.
    """
    n = len(a)
    if n & (n - 1) or (mod - 1) % max(n, 1):
        raise ValueError("length must be a power of two dividing mod - 1")
    a = [x % mod for x in a]
    j = 0
    for i in range(1, n):  # bit-reversal permutation
        bit = n >> 1
        while j & bit:
            j ^= bit
            bit >>= 1
        j |= bit
        if i < j:
            a[i], a[j] = a[j], a[i]
    length = 2
    while length <= n:
        w_len = pow(root, (mod - 1) // length, mod)
        if invert:
            w_len = pow(w_len, mod - 2, mod)
        for start in range(0, n, length):
            w = 1
            for k in range(start, start + length // 2):
                u, v = a[k], a[k + length // 2] * w % mod
                a[k], a[k + length // 2] = (u + v) % mod, (u - v) % mod
                w = w * w_len % mod
        length *= 2
    if invert:
        n_inv = pow(n, mod - 2, mod)
        a = [x * n_inv % mod for x in a]
    return a


def ntt_multiply(p: Sequence[int], q: Sequence[int], mod: int = NTT_MOD) -> list[int]:
    """Coefficients (lowest degree first) of p · q mod ``mod``, by transform, pointwise product, inverse.

    The convolution theorem (CLRS §30.2-30.3). If the true coefficients are
    below mod they come out exactly. Θ(n log n) instead of the schoolbook Θ(n^2).
    """
    if not p or not q:
        return []
    size = len(p) + len(q) - 1
    n = 1
    while n < size:
        n *= 2
    fp = ntt(list(p) + [0] * (n - len(p)), mod=mod)
    fq = ntt(list(q) + [0] * (n - len(q)), mod=mod)
    return ntt([x * y % mod for x, y in zip(fp, fq)], invert=True, mod=mod)[:size]


# ===========================================================================
# Part A7 - String indexing
# ===========================================================================


def suffix_array(s: Sequence) -> list[int]:
    """Start positions of the suffixes of s in sorted order, by prefix doubling.

    Manber & Myers, "Suffix arrays: a new method for on-line string searches"
    (SIAM Journal on Computing, 1993). Round k sorts suffixes by their first
    2^k symbols, using the ranks of round k - 1 as a pair of keys; at most
    log2 n rounds. O(n log^2 n) here with a comparison sort per round (radix
    sort gives O(n log n); SA-IS (Nong, Zhang & Chan, 2009) gives O(n)).
    """
    n = len(s)
    alphabet = {c: r for r, c in enumerate(sorted(set(s)))}
    rank = [alphabet[c] for c in s]  # ranks >= 0, so -1 can mean "past the end"
    sa = list(range(n))
    k = 1
    while True:
        def pair(i: int) -> tuple:
            return (rank[i], rank[i + k] if i + k < n else -1)
        sa.sort(key=pair)
        new_rank = [0] * n
        for j in range(1, n):
            new_rank[sa[j]] = new_rank[sa[j - 1]] + (pair(sa[j]) != pair(sa[j - 1]))
        rank = new_rank
        if n == 0 or rank[sa[-1]] == n - 1 or k >= n:
            return sa
        k *= 2


def lcp_array(s: Sequence, sa: Sequence[int]) -> list[int]:
    """lcp[i] = length of the longest common prefix of suffixes sa[i-1] and sa[i] (lcp[0] = 0).

    Kasai, Lee, Arimura, Arikawa & Park, "Linear-time longest-common-prefix
    computation in suffix arrays and its applications" (CPM 2001). Visit
    suffixes in TEXT order: the LCP drops by at most 1 from one to the next,
    so the total work is Θ(n).
    """
    n = len(s)
    rank = [0] * n
    for i, p in enumerate(sa):
        rank[p] = i
    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1
        else:
            h = 0
    return lcp


def bwt(text: str, sentinel: str = "\0") -> str:
    """Burrows-Wheeler Transform: last column of the sorted rotations of text + sentinel.

    Burrows & Wheeler, "A block-sorting lossless data compression algorithm"
    (Digital Equipment Corporation Systems Research Center (DEC SRC)
    Research Report 124, 1994). With a unique smallest sentinel the
    sorted rotations are the sorted suffixes, so L[i] = T[sa[i] - 1].
    O(n log^2 n) via ``suffix_array``.
    """
    if sentinel in text:
        raise ValueError("the sentinel must not occur in the text")
    t = text + sentinel
    return "".join(t[i - 1] for i in suffix_array(t))


def inverse_bwt(last: str, sentinel: str = "\0") -> str:
    """Recover the text from its BWT with the Last-to-First (LF) mapping.

    Burrows & Wheeler (1994): the i-th occurrence of a character in the last
    column is the i-th occurrence in the first column, so walking LF from the
    sentinel's row spells the text backwards. Θ(n log n) for the sort.
    """
    n = len(last)
    order = sorted(range(n), key=lambda i: (last[i], i))  # stable: the F column with ranks
    lf = [0] * n
    for f_pos, l_pos in enumerate(order):
        lf[l_pos] = f_pos
    out = []
    row = lf[last.index(sentinel)]  # the rotation that starts with the sentinel
    for _ in range(n - 1):
        out.append(last[row])
        row = lf[row]
    return "".join(reversed(out))


class FMIndex:
    """FM-index: count and locate pattern occurrences using only the BWT and rank tables.

    Ferragina & Manzini, "Opportunistic data structures with applications"
    (FOCS 2000). Backward search processes the pattern from its last
    character: the sorted-suffix interval [lo, hi) of suffixes starting with
    the pattern's tail shrinks by c: lo = C[c] + occ(c, lo), hi = C[c] + occ(c, hi).
    O(m) per count for a pattern of length m (here occ is a full prefix-count
    table, Θ(n σ) space; real FM-indexes sample it and compress the BWT).
    """

    def __init__(self, text: str, sentinel: str = "\0"):
        self.text = text
        self.sentinel = sentinel
        t = text + sentinel
        self.sa = suffix_array(t)
        self.last = "".join(t[i - 1] for i in self.sa)
        alphabet = sorted(set(t))
        self.C: dict[str, int] = {}
        total = 0
        for c in alphabet:
            self.C[c] = total
            total += t.count(c)
        self.occ = {c: [0] * (len(t) + 1) for c in alphabet}
        for i, ch in enumerate(self.last):
            for c in alphabet:
                self.occ[c][i + 1] = self.occ[c][i] + (ch == c)

    def _interval(self, pattern: str) -> tuple[int, int]:
        lo, hi = 0, len(self.last)
        for c in reversed(pattern):
            if c not in self.C:
                return 0, 0
            lo = self.C[c] + self.occ[c][lo]
            hi = self.C[c] + self.occ[c][hi]
            if lo >= hi:
                return 0, 0
        return lo, hi

    def count(self, pattern: str) -> int:
        """Number of (possibly overlapping) occurrences of pattern. O(len(pattern))."""
        if pattern == "":
            return len(self.text) + 1
        lo, hi = self._interval(pattern)
        return hi - lo

    def locate(self, pattern: str) -> list[int]:
        """Sorted start positions of pattern in the text (via the suffix array)."""
        lo, hi = self._interval(pattern)
        return sorted(self.sa[lo:hi])


# ===========================================================================
# Part B - Graphs: maximum flow, MST, shortest paths
# ===========================================================================
# Capacities use the format of ch10_iterative_improvement.max_flow:
# {u: {v: capacity}}. Weighted graphs use ch09's {u: [(v, w), ...]}.


class _FlowNetwork:
    """Residual network as parallel edge arrays; edge e and e ^ 1 are each other's reverse."""

    def __init__(self, capacity: dict):
        names = set(capacity)
        for u in capacity:
            names.update(capacity[u])
        self.names = sorted(names, key=repr)
        self.id = {v: i for i, v in enumerate(self.names)}
        self.n = len(self.names)
        self.adj: list[list[int]] = [[] for _ in range(self.n)]
        self.to: list[int] = []
        self.cap: list[float] = []
        self.original: list[tuple] = []  # (u, v) for each forward edge e (even e)
        for u in capacity:
            for v, c in capacity[u].items():
                self._add(self.id[u], self.id[v], c)
                self.original.append((u, v))

    def _add(self, u: int, v: int, c: float) -> None:
        self.adj[u].append(len(self.to))
        self.to.append(v)
        self.cap.append(c)
        self.adj[v].append(len(self.to))
        self.to.append(u)
        self.cap.append(0)

    def result(self, s: int, value: float, initial_cap: list[float]) -> MaxFlowResult:
        reach = {s}
        queue = deque([s])
        while queue:
            u = queue.popleft()
            for e in self.adj[u]:
                if self.cap[e] > 0 and self.to[e] not in reach:
                    reach.add(self.to[e])
                    queue.append(self.to[e])
        flow: dict = {}
        cut = []
        for k, (u, v) in enumerate(self.original):
            e = 2 * k
            flow[(u, v)] = flow.get((u, v), 0) + (initial_cap[e] - self.cap[e])
            if self.id[u] in reach and self.id[v] not in reach:
                cut.append((u, v))
        source_side = {self.names[i] for i in reach}
        return MaxFlowResult(value, flow, source_side, sorted(set(cut), key=repr))


def dinic_max_flow(capacity: dict, source: Hashable, sink: Hashable,
                   counter: OpCounter | None = None) -> MaxFlowResult:
    """Maximum flow by Dinic's algorithm: BFS level graph, then a blocking flow of shortest paths.

    Dinic (1970); improves the shortest-augmenting-path method of Levitin
    §10.2. Each phase strictly increases the source-sink distance in the
    residual network, so there are at most |V| - 1 phases; a blocking flow
    (DFS with a "current edge" pointer per vertex) costs O(|V| |E|).
    O(|V|^2 |E|) overall; O(|E| sqrt(|V|)) on unit-capacity bipartite graphs.
    Ticks "phases" and "augmentations".
    """
    net = _FlowNetwork(capacity)
    initial = list(net.cap)
    s, t = net.id[source], net.id[sink]
    value = 0
    while True:
        level = [-1] * net.n
        level[s] = 0
        queue = deque([s])
        while queue:
            u = queue.popleft()
            for e in net.adj[u]:
                if net.cap[e] > 0 and level[net.to[e]] < 0:
                    level[net.to[e]] = level[u] + 1
                    queue.append(net.to[e])
        if level[t] < 0:
            break
        tick(counter, "phases")
        pointer = [0] * net.n

        def push(u: int, limit: float) -> float:
            if u == t:
                return limit
            while pointer[u] < len(net.adj[u]):
                e = net.adj[u][pointer[u]]
                v = net.to[e]
                if net.cap[e] > 0 and level[v] == level[u] + 1:
                    pushed = push(v, min(limit, net.cap[e]))
                    if pushed > 0:
                        net.cap[e] -= pushed
                        net.cap[e ^ 1] += pushed
                        return pushed
                pointer[u] += 1  # this edge is saturated or leads to a dead end
            return 0

        while True:
            pushed = push(s, math.inf)
            if pushed == 0:
                break
            tick(counter, "augmentations")
            value += pushed
    return net.result(s, value, initial)


def push_relabel_max_flow(capacity: dict, source: Hashable, sink: Hashable,
                          counter: OpCounter | None = None) -> MaxFlowResult:
    """Maximum flow by FIFO push-relabel: move excess "downhill" along residual edges, raising heights when stuck.

    Goldberg & Tarjan, "A new approach to the maximum-flow problem" (Journal of
    the ACM, 1988); same problem as Levitin §10.2, no augmenting paths. Start
    with source height |V| and every source edge saturated. An active vertex
    (with excess) pushes along an admissible edge (height exactly one lower);
    if none exists it is relabelled to one more than its lowest residual
    neighbour. Heights never exceed 2|V| - 1, which bounds the work: O(|V|^3)
    with a First-In First-Out (FIFO) queue. Ticks "pushes" and "relabels".
    """
    net = _FlowNetwork(capacity)
    initial = list(net.cap)
    s, t = net.id[source], net.id[sink]
    n = net.n
    height = [0] * n
    excess = [0] * n
    height[s] = n
    for e in net.adj[s]:  # saturate every edge out of the source
        c = net.cap[e]
        if c > 0:
            net.cap[e] -= c
            net.cap[e ^ 1] += c
            excess[net.to[e]] += c
            excess[s] -= c
    active = deque(v for v in range(n) if v not in (s, t) and excess[v] > 0)
    in_queue = set(active)
    pointer = [0] * n
    while active:
        u = active.popleft()
        in_queue.discard(u)
        while excess[u] > 0:  # discharge u
            if pointer[u] == len(net.adj[u]):
                tick(counter, "relabels")
                height[u] = 1 + min(height[net.to[e]] for e in net.adj[u] if net.cap[e] > 0)
                pointer[u] = 0
                continue
            e = net.adj[u][pointer[u]]
            v = net.to[e]
            if net.cap[e] > 0 and height[u] == height[v] + 1:
                amount = min(excess[u], net.cap[e])
                tick(counter, "pushes")
                net.cap[e] -= amount
                net.cap[e ^ 1] += amount
                excess[u] -= amount
                excess[v] += amount
                if v not in (s, t) and v not in in_queue:
                    active.append(v)
                    in_queue.add(v)
            else:
                pointer[u] += 1
    return net.result(s, excess[t], initial)


def boruvka_mst(vertices: Sequence[Hashable], edges: Sequence[tuple],
                counter: OpCounter | None = None) -> tuple[float, list[tuple]]:
    """Minimum Spanning Tree (MST) (a forest if disconnected) by Boruvka's rounds of cheapest outgoing edges.

    Boruvka (1926), the oldest MST algorithm (compare Prim and Kruskal,
    Levitin §9.1-§9.2) and the core of the randomized linear-time one
    (Karger, Klein & Tarjan, 1995). In each round every component picks its
    cheapest outgoing edge (ties broken by edge index, so no cycle can form)
    and all picks are added at once. The number of
    components at least halves per round, so O(|E| log |V|) time. Easy to
    parallelize. Ticks "rounds".
    """
    uf = UnionFind(vertices)
    total, tree = 0, []
    while True:
        cheapest: dict = {}
        for idx, (u, v, w) in enumerate(edges):
            ru, rv = uf.find(u), uf.find(v)
            if ru == rv:
                continue
            for r in (ru, rv):
                if r not in cheapest or (w, idx) < (edges[cheapest[r]][2], cheapest[r]):
                    cheapest[r] = idx
        if not cheapest:
            return total, tree
        tick(counter, "rounds")
        for idx in sorted(set(cheapest.values())):
            u, v, w = edges[idx]
            if uf.union(u, v):
                total += w
                tree.append((u, v, w))


def delta_stepping(graph: dict, source: Hashable, delta: float,
                   counter: OpCounter | None = None) -> dict:
    """Single-Source Shortest Paths (SSSP) for non-negative weights by Delta-stepping.

    Meyer & Sanders, "Delta-stepping: a parallelizable shortest path
    algorithm" (Journal of Algorithms, 2003): Dijkstra (Levitin §9.3) with
    buckets instead of a heap. Tentative distances live in buckets of width
    delta. The smallest non-empty bucket is settled by
    repeatedly relaxing its LIGHT edges (weight <= delta), which may re-insert
    vertices into the same bucket; HEAVY edges are relaxed once afterwards.
    Each bucket is a batch of independent relaxations (parallel work). Tiny
    delta behaves like Dijkstra, huge delta like Bellman-Ford. Returns dist
    (math.inf when unreachable). With random edge weights the paper proves
    O(|V| + |E| + d L) average-case sequential time (d = maximum degree, L =
    largest shortest-path distance). Ticks "relaxations".
    """
    if delta <= 0:
        raise ValueError("delta must be positive")
    vertices = set(graph)
    for u in graph:
        vertices.update(v for v, _ in graph[u])
    dist = {v: math.inf for v in vertices}
    buckets: dict[int, set] = {}

    def relax(v: Hashable, d: float) -> None:
        tick(counter, "relaxations")
        if d < dist[v]:
            if dist[v] < math.inf:
                buckets[int(dist[v] // delta)].discard(v)
            dist[v] = d
            buckets.setdefault(int(d // delta), set()).add(v)

    relax(source, 0)
    while True:
        nonempty = [i for i, b in buckets.items() if b]
        if not nonempty:
            return dist
        i = min(nonempty)
        settled: set = set()
        while buckets.get(i):  # light edges can refill bucket i: repeat until it stays empty
            frontier = buckets[i]
            buckets[i] = set()
            settled |= frontier
            requests = [(v, dist[u] + w) for u in frontier for v, w in graph.get(u, []) if w <= delta]
            for v, d in requests:
                relax(v, d)
        heavy = [(v, dist[u] + w) for u in settled for v, w in graph.get(u, []) if w > delta]
        for v, d in heavy:
            relax(v, d)


def find_pivots(graph: dict, S: Sequence[Hashable], d: dict, B: float, k: int) -> tuple[list, list, dict]:
    """The FindPivots SUB-STEP of the 2025 shortest-path algorithm (not the whole algorithm).

    Duan, Mao, Mao, Shu & Yin, "Breaking the sorting barrier for directed
    single-source shortest paths" (STOC 2025, arXiv:2504.17033), Algorithm 1.
    The full algorithm runs in O(m log^(2/3) n) in the comparison-addition
    model by recursing with a batched data structure; this function is only
    its pivot-finding step. From the frontier S (complete vertices), run k
    rounds of Bellman-Ford-style relaxation (test d[u] + w <= d[v], with
    equality) restricted to distances below B, collecting the reached set W.
    If W grows beyond k |S|, return P = S. Otherwise build the forest F of tight
    edges (d[v] = d[u] + w) inside W; the pivots are the vertices of S that
    root trees with at least k vertices, so |P| <= |W| / k (Lemma 3.2).
    Vertices in small trees are already complete. ``graph`` = {u: [(v, w)]}
    with comparable vertex names; ``d`` = current estimates (missing = inf).
    Returns (sorted P, sorted W, updated copy of d). O(k |W| + edges out of W).
    """
    d = dict(d)
    inf = math.inf
    W = set(S)
    layer = sorted(S)
    for _ in range(k):
        nxt = set()
        for u in layer:
            du = d.get(u, inf)
            if du == inf:
                continue  # nothing to relax from a vertex that has no estimate yet
            for v, w in graph.get(u, []):
                if du + w <= d.get(v, inf):  # <= (with equality), as in the paper
                    d[v] = du + w
                    if du + w < B:
                        nxt.add(v)
        W |= nxt
        layer = sorted(nxt)
        if len(W) > k * len(S):
            return sorted(S), sorted(W), d
    parent: dict = {}  # tight-edge forest: the first tight in-edge found for each vertex
    for u in sorted(W):
        for v, w in graph.get(u, []):
            if v in W and v not in parent and v != u and d[v] == d[u] + w:
                parent[v] = u
    children: dict = {}
    for v, u in parent.items():
        children.setdefault(u, []).append(v)

    def tree_size(root: Hashable) -> int:
        size, stack = 0, [root]
        while stack:
            x = stack.pop()
            size += 1
            stack.extend(children.get(x, []))
        return size

    P = [u for u in sorted(S) if u not in parent and tree_size(u) >= k]
    return P, sorted(W), d
