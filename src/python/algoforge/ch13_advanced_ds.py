"""Chapter 13 (Beyond Levitin) - Advanced Data Structures.

Structures every senior engineer reaches for: a growable array with amortized
O(1) append, near-constant-time union-find, Fenwick and segment trees for
range queries, a trie for prefixes, and a Least Recently Used (LRU) cache.
References: Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms*, 3rd ed. (CLRS) Ch. 17 and 21; Sedgewick & Wayne, *Algorithms*, 4th ed.
"""

from __future__ import annotations

from typing import Hashable, Iterable, Sequence

from .counters import OpCounter, tick


class DynamicArray:
    """A list that doubles its capacity when full, so append is amortized O(1).

    CLRS §17.4 (dynamic tables); builds on Levitin §1.4 (arrays). ``copies``
    counts element moves during resizing: after n appends it stays below 2n,
    which is the amortized-analysis punchline (aggregate method).
    """

    def __init__(self) -> None:
        self.capacity = 1
        self.n = 0
        self._data: list = [None]
        self.copies = 0

    def __len__(self) -> int:
        return self.n

    def __getitem__(self, i: int):
        if not 0 <= i < self.n:
            raise IndexError("index out of range")
        return self._data[i]

    def __setitem__(self, i: int, value) -> None:
        if not 0 <= i < self.n:
            raise IndexError("index out of range")
        self._data[i] = value

    def _resize(self, new_capacity: int) -> None:
        new = [None] * new_capacity
        for i in range(self.n):
            new[i] = self._data[i]
            self.copies += 1
        self._data = new
        self.capacity = new_capacity

    def append(self, value) -> None:
        """Add value at the end; doubles the capacity first when full. Amortized O(1)."""
        if self.n == self.capacity:
            self._resize(2 * self.capacity)
        self._data[self.n] = value
        self.n += 1

    def pop(self):
        """Remove and return the last value; halves capacity at 1/4 full. Amortized O(1)."""
        if self.n == 0:
            raise IndexError("pop from empty array")
        self.n -= 1
        value = self._data[self.n]
        self._data[self.n] = None
        if 0 < self.n <= self.capacity // 4:
            self._resize(self.capacity // 2)
        return value

    def to_list(self) -> list:
        """Copy of the stored values as a Python list. Θ(n)."""
        return [self._data[i] for i in range(self.n)]


class UnionFind:
    """Disjoint-set forest with union by rank and path compression.

    CLRS Ch. 21; extends Levitin §9.2. Any sequence of m
    operations on n elements takes O(m α(n)) time, where α (inverse Ackermann)
    is at most 4 for any realistic n. ``steps`` counts parent-pointer hops.
    """

    def __init__(self, items: Iterable[Hashable] = ()):
        self.parent: dict[Hashable, Hashable] = {}
        self.rank: dict[Hashable, int] = {}
        self.steps = 0
        self.components = 0
        for x in items:
            self.make_set(x)

    def make_set(self, x: Hashable) -> None:
        """Create the one-element set {x} (ignored if x exists). O(1)."""
        if x not in self.parent:
            self.parent[x] = x
            self.rank[x] = 0
            self.components += 1

    def find(self, x: Hashable) -> Hashable:
        """Root of x's set; every node on the way is re-pointed straight at the root.
        Amortized O(α(n))."""
        root = x
        while self.parent[root] != root:
            self.steps += 1
            root = self.parent[root]
        while self.parent[x] != root:  # path compression
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, x: Hashable, y: Hashable) -> bool:
        """Merge the sets of x and y (shorter tree under taller). False if already joined.
        Amortized O(α(n))."""
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        self.components -= 1
        return True

    def connected(self, x: Hashable, y: Hashable) -> bool:
        """True when x and y are in the same set. Amortized O(α(n))."""
        return self.find(x) == self.find(y)


class FenwickTree:
    """Binary Indexed Tree (Fenwick tree): prefix sums with point updates, both O(log n).

    Fenwick (1994). Node i stores the sum of the last (i & -i) elements up to
    position i (1-based internally). Θ(n) space. Public indices are 0-based.
    """

    def __init__(self, values: Sequence[float] | int):
        if isinstance(values, int):
            values = [0] * values
        self.n = len(values)
        self.tree = [0] * (self.n + 1)
        for i, v in enumerate(values):
            self.add(i, v)

    def add(self, i: int, delta: float) -> None:
        """A[i] += delta. O(log n)."""
        i += 1
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i

    def prefix_sum(self, i: int) -> float:
        """Sum of A[0..i] inclusive (0 when i < 0). O(log n)."""
        i += 1
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & -i
        return total

    def range_sum(self, lo: int, hi: int) -> float:
        """Sum of A[lo..hi] inclusive. O(log n)."""
        return self.prefix_sum(hi) - self.prefix_sum(lo - 1)


class SegmentTree:
    """Segment tree for range sums with point assignment, both O(log n).

    Each node covers a range; its value is the sum of its two halves.
    Iterative bottom-up layout: leaves live at positions n..2n-1. Θ(n) space.
    """

    def __init__(self, values: Sequence[float], counter: OpCounter | None = None):
        self.n = len(values)
        self.counter = counter
        self.tree = [0] * (2 * self.n)
        for i, v in enumerate(values):
            self.tree[self.n + i] = v
        for i in range(self.n - 1, 0, -1):
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]

    def update(self, i: int, value: float) -> None:
        """Set A[i] = value and fix every ancestor. O(log n)."""
        i += self.n
        self.tree[i] = value
        while i > 1:
            i //= 2
            tick(self.counter, "node_updates")
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]

    def query(self, lo: int, hi: int) -> float:
        """Sum of A[lo..hi] inclusive. O(log n) nodes touched."""
        total = 0
        lo += self.n
        hi += self.n + 1  # half-open [lo, hi)
        while lo < hi:
            if lo & 1:
                tick(self.counter, "nodes_visited")
                total += self.tree[lo]
                lo += 1
            if hi & 1:
                hi -= 1
                tick(self.counter, "nodes_visited")
                total += self.tree[hi]
            lo //= 2
            hi //= 2
        return total


class _TrieNode:
    __slots__ = ("children", "is_word")

    def __init__(self) -> None:
        self.children: dict[str, _TrieNode] = {}
        self.is_word = False


class Trie:
    """Prefix tree: each edge is a character, so words sharing a prefix share a path.

    Sedgewick & Wayne §5.2 (tries). Insert and lookup are O(L) for a word of
    length L, independent of how many words are stored.
    """

    def __init__(self, words: Iterable[str] = ()):
        self.root = _TrieNode()
        self.size = 0
        for w in words:
            self.insert(w)

    def insert(self, word: str) -> None:
        """Add word (duplicates ignored). O(L) for a word of length L."""
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, _TrieNode())
        if not node.is_word:
            node.is_word = True
            self.size += 1

    def _walk(self, prefix: str) -> _TrieNode | None:
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def contains(self, word: str) -> bool:
        """True when word was inserted. O(L)."""
        node = self._walk(word)
        return node is not None and node.is_word

    def starts_with(self, prefix: str) -> bool:
        """True when some stored word begins with prefix. O(L)."""
        return self._walk(prefix) is not None

    def words_with_prefix(self, prefix: str) -> list[str]:
        """Every stored word beginning with prefix, in alphabetical order. O(L + output)."""
        node = self._walk(prefix)
        out: list[str] = []

        def collect(n: _TrieNode, path: str) -> None:
            if n.is_word:
                out.append(path)
            for ch in sorted(n.children):
                collect(n.children[ch], path + ch)

        if node is not None:
            collect(node, prefix)
        return out


class _Node:
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key=None, value=None):
        self.key = key
        self.value = value
        self.prev: _Node | None = None
        self.next: _Node | None = None


class LRUCache:
    """Least Recently Used (LRU) cache: a hash map plus a doubly linked list.

    The map finds a key's list node in O(1); the list keeps nodes ordered from
    most to least recently used, so evicting the oldest is O(1) too.
    ``get`` returns None for a missing key.
    """

    def __init__(self, capacity: int):
        if capacity < 1:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self.map: dict[Hashable, _Node] = {}
        self.head = _Node()  # sentinel: head.next is the most recent
        self.tail = _Node()  # sentinel: tail.prev is the least recent
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node: _Node) -> None:
        node.prev.next, node.next.prev = node.next, node.prev  # type: ignore[union-attr]

    def _push_front(self, node: _Node) -> None:
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node  # type: ignore[union-attr]
        self.head.next = node

    def get(self, key: Hashable):
        """Value for key (marking it most recent), or None. O(1)."""
        node = self.map.get(key)
        if node is None:
            return None
        self._unlink(node)
        self._push_front(node)
        return node.value

    def put(self, key: Hashable, value) -> None:
        """Insert or update key; evicts the least recently used key when over capacity. O(1)."""
        node = self.map.get(key)
        if node is not None:
            node.value = value
            self._unlink(node)
            self._push_front(node)
            return
        node = _Node(key, value)
        self.map[key] = node
        self._push_front(node)
        if len(self.map) > self.capacity:
            oldest = self.tail.prev
            assert oldest is not None
            self._unlink(oldest)
            del self.map[oldest.key]

    def keys_most_recent_first(self) -> list:
        """Keys ordered from most to least recently used. Θ(n)."""
        out, node = [], self.head.next
        while node is not self.tail:
            out.append(node.key)  # type: ignore[union-attr]
            node = node.next  # type: ignore[union-attr]
        return out

    def __len__(self) -> int:
        return len(self.map)
