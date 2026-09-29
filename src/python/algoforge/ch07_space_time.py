"""Chapter 7 - Space and Time Trade-Offs.

Spend extra memory to save time (Levitin §7.0):
  * input enhancement - counting sorts, Horspool, Boyer-Moore, Knuth-Morris-Pratt (KMP);
  * prestructuring - hash tables and B-trees.
"""

from __future__ import annotations

from typing import Hashable, NamedTuple, Sequence

from .counters import OpCounter, tick

# ---------------------------------------------------------------------------
# Sorting by counting (Levitin §7.1) and friends
# ---------------------------------------------------------------------------


def comparison_counting_sort(A: Sequence, counter: OpCounter | None = None) -> list:
    """Place each element by counting how many elements are smaller than it.

    Levitin §7.1 (ComparisonCountingSort). Exactly n(n-1)/2 comparisons:
    Θ(n^2) time; Θ(n) extra space. Stable for equal keys.
    """
    n = len(A)
    count = [0] * n
    for i in range(n - 1):
        for j in range(i + 1, n):
            tick(counter, "comparisons")
            if A[i] < A[j]:
                count[j] += 1
            else:
                count[i] += 1
    S = [None] * n
    for i in range(n):
        S[count[i]] = A[i]
    return S


def distribution_counting_sort(A: Sequence[int], low: int | None = None,
                               high: int | None = None) -> list[int]:
    """Sort integers in [low, high] using frequencies and running totals.

    Levitin §7.1 (DistributionCountingSort). Stable. Θ(n + k) time and
    space where k = high - low + 1.
    """
    if not A:
        return []
    low = min(A) if low is None else low
    high = max(A) if high is None else high
    k = high - low + 1
    D = [0] * k
    for x in A:
        D[x - low] += 1
    for j in range(1, k):  # running totals: D[j] = number of elements <= low + j
        D[j] += D[j - 1]
    S = [0] * len(A)
    for x in reversed(A):  # right to left keeps the sort stable
        D[x - low] -= 1
        S[D[x - low]] = x
    return S


def radix_sort_lsd(A: Sequence[int], base: int = 10) -> list[int]:
    """Least Significant Digit (LSD) radix sort for non-negative integers.

    Sorts by the last digit, then the next, ... with a stable counting pass
    each time (Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms*, 3rd ed. (CLRS) §8.3; builds on Levitin §7.1). Θ(d(n + base)) time for
    d-digit numbers; Θ(n + base) space.
    """
    A = list(A)
    if any(x < 0 for x in A):
        raise ValueError("radix_sort_lsd handles non-negative integers only")
    if not A:
        return A
    place = 1
    largest = max(A)
    while largest // place > 0:
        buckets: list[list[int]] = [[] for _ in range(base)]
        for x in A:
            buckets[(x // place) % base].append(x)
        A = [x for bucket in buckets for x in bucket]
        place *= base
    return A


def bucket_sort(A: Sequence[float], num_buckets: int | None = None) -> list[float]:
    """Spread numbers into equal-width buckets, insertion-sort each, concatenate.

    CLRS §8.4 (related to distribution counting, Levitin §7.1). Average
    Θ(n) for uniformly spread data; worst Θ(n^2). Θ(n + buckets) space.
    """
    A = list(A)
    n = len(A)
    if n <= 1:
        return A
    k = num_buckets or n
    lo, hi = min(A), max(A)
    if lo == hi:
        return A
    width = (hi - lo) / k
    buckets: list[list[float]] = [[] for _ in range(k)]
    for x in A:
        idx = min(int((x - lo) / width), k - 1)
        buckets[idx].append(x)
    out = []
    for b in buckets:
        for i in range(1, len(b)):  # insertion sort inside the bucket
            v, j = b[i], i - 1
            while j >= 0 and b[j] > v:
                b[j + 1] = b[j]
                j -= 1
            b[j + 1] = v
        out.extend(b)
    return out


# ---------------------------------------------------------------------------
# String matching with input enhancement (Levitin §7.2)
# ---------------------------------------------------------------------------


def horspool_shift_table(pattern: str) -> dict[str, int]:
    """Shift table for Horspool: distance from each character's rightmost
    occurrence among the first m - 1 pattern characters to the pattern's end.

    Levitin §7.2 (ShiftTable). Characters not in the table shift by m
    (use ``table.get(c, m)``). Θ(m) time; Θ(alphabet) space.
    """
    m = len(pattern)
    table: dict[str, int] = {}
    for j in range(m - 1):
        table[pattern[j]] = m - 1 - j
    return table


def horspool_search(text: str, pattern: str, counter: OpCounter | None = None) -> int:
    """Index of the first occurrence of pattern in text, or -1 (Horspool's algorithm).

    Levitin §7.2 (HorspoolMatching). Compare right to left; on a mismatch
    shift by the table entry of the text character aligned with the pattern's
    LAST character. Worst Θ(nm), average Θ(n) on random text.
    """
    m, n = len(pattern), len(text)
    if m == 0:
        return 0
    table = horspool_shift_table(pattern)
    i = m - 1  # text index aligned with the pattern's last character
    while i <= n - 1:
        k = 0
        while k < m:
            tick(counter, "comparisons")
            if pattern[m - 1 - k] != text[i - k]:
                break
            k += 1
        if k == m:
            return i - m + 1
        i += table.get(text[i], m)
    return -1


def good_suffix_table(pattern: str) -> dict[int, int]:
    """Boyer-Moore good-suffix shifts d2(k) for matched suffix lengths k = 1..m-1.

    Levitin §7.2: d2(k) is the distance to the rightmost other occurrence of
    the k-character suffix that is NOT preceded by the same character as the
    suffix; if none exists, use the longest prefix of length l < k that equals
    a suffix (shift m - l), else shift m. Written from the definition for
    clarity: Θ(m^3) worst case, fine for teaching-size patterns.
    """
    m = len(pattern)
    d2: dict[int, int] = {}
    for k in range(1, m):
        suffix = pattern[m - k:]
        before = pattern[m - k - 1]
        shift = None
        for start in range(m - k - 1, -1, -1):
            if pattern[start:start + k] == suffix and (start == 0 or pattern[start - 1] != before):
                shift = (m - k) - start
                break
        if shift is None:
            shift = m
            for length in range(k - 1, 0, -1):
                if pattern[:length] == pattern[m - length:]:
                    shift = m - length
                    break
        d2[k] = shift
    return d2


def boyer_moore_search(text: str, pattern: str, counter: OpCounter | None = None) -> int:
    """Index of the first occurrence of pattern in text, or -1 (Boyer-Moore).

    Levitin §7.2. After k >= 0 matches and a mismatch on text character c:
    d1 = max(t1(c) - k, 1) (bad-symbol shift); if k > 0 shift by
    max(d1, d2(k)) (good-suffix shift). Worst case O(nm) for this simple
    version; typically sublinear.
    """
    m, n = len(pattern), len(text)
    if m == 0:
        return 0
    t1 = horspool_shift_table(pattern)
    d2 = good_suffix_table(pattern)
    i = m - 1
    while i <= n - 1:
        k = 0
        while k < m:
            tick(counter, "comparisons")
            if pattern[m - 1 - k] != text[i - k]:
                break
            k += 1
        if k == m:
            return i - m + 1
        c = text[i - k]
        d1 = max(t1.get(c, m) - k, 1)
        i += max(d1, d2[k]) if k > 0 else d1
    return -1


def kmp_prefix_function(pattern: str) -> list[int]:
    """Longest Proper Prefix which is also Suffix (LPS) length for each prefix.

    Knuth-Morris-Pratt (KMP) failure table (CLRS §32.4; mentioned in
    Levitin §7.2). Θ(m) time and space.
    """
    lps = [0] * len(pattern)
    k = 0
    for i in range(1, len(pattern)):
        while k > 0 and pattern[i] != pattern[k]:
            k = lps[k - 1]
        if pattern[i] == pattern[k]:
            k += 1
        lps[i] = k
    return lps


def kmp_search_all(text: str, pattern: str, counter: OpCounter | None = None) -> list[int]:
    """Every start index where pattern occurs in text, using the KMP table.

    The text pointer never moves backward, so at most 2n comparisons:
    Θ(n + m) time; Θ(m) space.
    """
    m = len(pattern)
    if m == 0:
        return list(range(len(text) + 1))
    lps = kmp_prefix_function(pattern)
    matches = []
    k = 0
    for i, ch in enumerate(text):
        while True:
            tick(counter, "comparisons")
            if ch == pattern[k]:
                k += 1
                break
            if k == 0:
                break
            k = lps[k - 1]
        if k == m:
            matches.append(i - m + 1)
            k = lps[k - 1]
    return matches


def kmp_search(text: str, pattern: str, counter: OpCounter | None = None) -> int:
    """Index of the first occurrence (or -1) using Knuth-Morris-Pratt (KMP). Θ(n + m)."""
    found = kmp_search_all(text, pattern, counter)
    return found[0] if found else -1


# ---------------------------------------------------------------------------
# Hashing (Levitin §7.3)
# ---------------------------------------------------------------------------


def key_to_int(key: Hashable) -> int:
    """Deterministic non-negative integer code for an int or a string key.

    Strings use a polynomial code sum ord(c) * 31^i (Horner-style), as Levitin
    §7.3 suggests; Python's built-in ``hash`` of strings changes per run, so we
    avoid it. Θ(len(key)).
    """
    if isinstance(key, int):
        return abs(key)
    if isinstance(key, str):
        h = 0
        for ch in key:
            h = (h * 31 + ord(ch)) % (2 ** 61 - 1)
        return h
    raise TypeError("keys must be int or str")


class ProbeResult(NamedTuple):
    """Outcome of a hash-table search: found?, the stored value, key comparisons made."""

    found: bool
    value: object
    probes: int


class SeparateChainingHashTable:
    """Hash table where each of the m cells holds a linked list (here a Python list).

    Levitin §7.3 (open hashing / separate chaining). With load factor
    alpha = n/m, a successful search makes about 1 + alpha/2 comparisons,
    an unsuccessful one about alpha. Θ(n + m) space.
    """

    def __init__(self, size: int = 13):
        self.m = size
        self.buckets: list[list[tuple[Hashable, object]]] = [[] for _ in range(size)]
        self.n = 0

    def _h(self, key: Hashable) -> int:
        return key_to_int(key) % self.m

    @property
    def load_factor(self) -> float:
        """alpha = n / m, the average chain length. O(1)."""
        return self.n / self.m

    def insert(self, key: Hashable, value: object = None) -> int:
        """Insert or update key; return the number of key comparisons (probes).
        Θ(1 + alpha) on average."""
        bucket = self.buckets[self._h(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return i + 1
        bucket.append((key, value))
        self.n += 1
        return len(bucket) - 1

    def search(self, key: Hashable) -> ProbeResult:
        """Look key up; report found?, value, and comparisons made. Θ(1 + alpha) average."""
        probes = 0
        for k, v in self.buckets[self._h(key)]:
            probes += 1
            if k == key:
                return ProbeResult(True, v, probes)
        return ProbeResult(False, None, probes)


class LinearProbingHashTable:
    """Closed hashing: on a collision try the next cell (wrapping around).

    Levitin §7.3 (closed hashing / linear probing). Clusters form as the
    table fills; keep alpha well below 1. Deletion is not supported (it needs
    "lazy" markers). Θ(m) space.
    """

    def __init__(self, size: int = 13):
        self.m = size
        self.keys: list[Hashable | None] = [None] * size
        self.values: list[object] = [None] * size
        self.n = 0

    def _h(self, key: Hashable) -> int:
        return key_to_int(key) % self.m

    def _step(self, key: Hashable) -> int:
        return 1

    @property
    def load_factor(self) -> float:
        """alpha = n / m, the fraction of occupied cells. O(1)."""
        return self.n / self.m

    def insert(self, key: Hashable, value: object = None) -> int:
        """Insert or update key; return the number of cells examined (probes).
        About (1 + 1/(1 - alpha)^2)/2 probes on average; O(m) worst case."""
        i = self._h(key)
        step = self._step(key)
        for probes in range(1, self.m + 1):
            if self.keys[i] is None:
                self.keys[i], self.values[i] = key, value
                self.n += 1
                return probes
            if self.keys[i] == key:
                self.values[i] = value
                return probes
            i = (i + step) % self.m
        raise OverflowError("hash table is full")

    def search(self, key: Hashable) -> ProbeResult:
        """Look key up; stops at an empty cell. Reports cells examined.
        About (1 + 1/(1 - alpha))/2 probes for a hit; O(m) worst case."""
        i = self._h(key)
        step = self._step(key)
        for probes in range(1, self.m + 1):
            if self.keys[i] is None:
                return ProbeResult(False, None, probes)
            if self.keys[i] == key:
                return ProbeResult(True, self.values[i], probes)
            i = (i + step) % self.m
        return ProbeResult(False, None, self.m)


class DoubleHashingHashTable(LinearProbingHashTable):
    """Closed hashing whose probe step comes from a second hash function.

    Levitin §7.3 (double hashing) with s(K) = m - 2 - (K mod (m - 2)).
    Use a prime table size m so every step size visits every cell.
    """

    def __init__(self, size: int = 13):
        if size < 3:
            raise ValueError("size must be at least 3")
        super().__init__(size)

    def _step(self, key: Hashable) -> int:
        return self.m - 2 - key_to_int(key) % (self.m - 2)


# ---------------------------------------------------------------------------
# B-trees (Levitin §7.4)
# ---------------------------------------------------------------------------


class BTreeNode:
    """A B-tree node: sorted keys and (for internal nodes) len(keys) + 1 children."""

    def __init__(self, leaf: bool = True):
        self.keys: list = []
        self.children: list[BTreeNode] = []
        self.leaf = leaf

    def __repr__(self) -> str:
        return f"BTreeNode({self.keys})"


class BTree:
    """A minimal B-tree of order m (each node has at most m children, m - 1 keys).

    Levitin §7.4 describes the variant where records live in the leaves
    (a B+ tree); this teaching version stores keys in every node (as in CLRS
    Ch. 18) and splits overflowing nodes on the way back up. Every leaf is at
    the same depth, so search and insertion take Θ(log n) node visits.
    Order 3 gives exactly a 2-3 tree.
    """

    def __init__(self, order: int = 4):
        if order < 3:
            raise ValueError("order must be at least 3")
        self.order = order
        self.max_keys = order - 1
        self.root = BTreeNode(leaf=True)

    def search(self, key, counter: OpCounter | None = None) -> bool:
        """True when key is stored. Counts node visits as "node_accesses". Θ(log n)."""
        node = self.root
        while True:
            tick(counter, "node_accesses")
            i = 0
            while i < len(node.keys) and key > node.keys[i]:
                i += 1
            if i < len(node.keys) and node.keys[i] == key:
                return True
            if node.leaf:
                return False
            node = node.children[i]

    def insert(self, key) -> None:
        """Insert key (duplicates ignored). A node that overflows to m keys
        splits in two and pushes its middle key up to the parent; if the root
        splits, the tree grows one level taller. Θ(log n) node visits."""
        if self.search(key):
            return
        split = self._insert(self.root, key)
        if split is not None:
            middle, left, right = split
            new_root = BTreeNode(leaf=False)
            new_root.keys = [middle]
            new_root.children = [left, right]
            self.root = new_root

    def _insert(self, node: BTreeNode, key):
        """Insert below node; return (middle, left, right) if node split, else None."""
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        if node.leaf:
            node.keys.insert(i, key)
        else:
            split = self._insert(node.children[i], key)
            if split is None:
                return None
            middle, left, right = split
            node.keys.insert(i, middle)
            node.children[i:i + 1] = [left, right]
        if len(node.keys) <= self.max_keys:
            return None
        mid = len(node.keys) // 2
        left = BTreeNode(leaf=node.leaf)
        right = BTreeNode(leaf=node.leaf)
        left.keys, right.keys = node.keys[:mid], node.keys[mid + 1:]
        if not node.leaf:
            left.children, right.children = node.children[:mid + 1], node.children[mid + 1:]
        return node.keys[mid], left, right

    def inorder(self) -> list:
        """All keys in sorted order. Θ(n)."""
        out: list = []

        def walk(node: BTreeNode) -> None:
            for i, k in enumerate(node.keys):
                if not node.leaf:
                    walk(node.children[i])
                out.append(k)
            if not node.leaf:
                walk(node.children[-1])

        walk(self.root)
        return out

    def height(self) -> int:
        """Edges from root to a leaf. Θ(log n)."""
        h, node = 0, self.root
        while not node.leaf:
            node = node.children[0]
            h += 1
        return h

    def is_valid(self) -> bool:
        """Check ordering, key-count limits and equal leaf depth. Θ(n)."""
        min_keys = (self.order + 1) // 2 - 1  # ceil(m/2) - 1 for non-root nodes
        depths: set[int] = set()

        def check(node: BTreeNode, depth: int, lo, hi, is_root: bool) -> bool:
            if len(node.keys) > self.max_keys or node.keys != sorted(node.keys):
                return False
            if not is_root and len(node.keys) < min_keys:
                return False
            if any((lo is not None and k <= lo) or (hi is not None and k >= hi) for k in node.keys):
                return False
            if node.leaf:
                depths.add(depth)
                return not node.children
            if len(node.children) != len(node.keys) + 1:
                return False
            bounds = [lo] + node.keys + [hi]
            return all(check(c, depth + 1, bounds[j], bounds[j + 1], False)
                       for j, c in enumerate(node.children))

        return check(self.root, 0, None, None, True) and len(depths) <= 1
