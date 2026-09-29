"""Chapter 4 - Decrease-and-Conquer.

Solve a problem by relating it to ONE smaller instance of itself (Levitin §4.0):
  * decrease by a constant (usually 1): insertion sort, topological sort,
    generating permutations and subsets;
  * decrease by a constant factor (usually half): binary search, fake coin,
    Russian peasant multiplication, Josephus problem;
  * variable-size decrease: Euclid's gcd, quickselect, interpolation search,
    Binary Search Tree (BST) operations, the game of Nim.
"""

from __future__ import annotations

from collections import deque
from typing import Hashable, Iterable, Sequence

from .counters import OpCounter, tick

# ---------------------------------------------------------------------------
# Insertion sort (Levitin §4.1)
# ---------------------------------------------------------------------------


def insertion_sort(A: Sequence, counter: OpCounter | None = None) -> list:
    """Return a sorted copy: insert each element into the sorted part on its left.

    Levitin §4.1 (InsertionSort). Worst case n(n-1)/2 comparisons Θ(n^2);
    best case (sorted input) n - 1 comparisons Θ(n). Space O(n) copy.
    """
    A = list(A)
    for i in range(1, len(A)):
        v = A[i]
        j = i - 1
        while j >= 0:
            tick(counter, "comparisons")
            if A[j] > v:
                tick(counter, "shifts")
                A[j + 1] = A[j]
                j -= 1
            else:
                break
        A[j + 1] = v
    return A


def insertion_sort_recursive(A: Sequence, counter: OpCounter | None = None) -> list:
    """Insertion sort written as true decrease-by-one: sort A[0..n-2], then insert A[n-1].

    Levitin §4.1 (top-down view). Same Θ(n^2) comparisons as the iterative
    version; recursion depth n, so space Θ(n).
    """
    A = list(A)

    def sort_prefix(n: int) -> None:
        if n <= 1:
            return
        sort_prefix(n - 1)
        v = A[n - 1]
        j = n - 2
        while j >= 0:
            tick(counter, "comparisons")
            if A[j] > v:
                A[j + 1] = A[j]
                j -= 1
            else:
                break
        A[j + 1] = v

    sort_prefix(len(A))
    return A


def binary_insertion_sort(A: Sequence, counter: OpCounter | None = None) -> list:
    """Insertion sort that finds each insertion point by binary search.

    Levitin Exercise 4.1 (binary insertion sort). Comparisons drop to
    Θ(n log n) but shifting elements is still Θ(n^2) in the worst case.
    Stable: equal keys keep their order. Space O(n) copy.
    """
    A = list(A)
    for i in range(1, len(A)):
        v = A[i]
        lo, hi = 0, i  # find first position in A[0..i-1] whose value is > v
        while lo < hi:
            mid = (lo + hi) // 2
            tick(counter, "comparisons")
            if A[mid] > v:
                hi = mid
            else:
                lo = mid + 1
        A[lo + 1:i + 1] = A[lo:i]
        A[lo] = v
    return A


# ---------------------------------------------------------------------------
# Topological sorting (Levitin §4.2)
# ---------------------------------------------------------------------------


def _vertices(graph: dict[Hashable, list[Hashable]]) -> list[Hashable]:
    seen = dict.fromkeys(graph)
    for nbrs in graph.values():
        for v in nbrs:
            seen.setdefault(v, None)
    return list(seen)


def topological_sort_dfs(graph: dict[Hashable, list[Hashable]]) -> list[Hashable] | None:
    """Topological order of a Directed Acyclic Graph (DAG) via Depth-First Search (DFS) pop order, reversed.

    Levitin §4.2 (DFS-based algorithm). Returns None when a back edge shows
    the digraph has a cycle. Time Θ(|V| + |E|); space Θ(|V|).
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {v: WHITE for v in _vertices(graph)}
    popped: list[Hashable] = []
    has_cycle = False

    def visit(u: Hashable) -> None:
        nonlocal has_cycle
        color[u] = GRAY
        for v in graph.get(u, []):
            if color[v] == GRAY:
                has_cycle = True
            elif color[v] == WHITE:
                visit(v)
        color[u] = BLACK
        popped.append(u)

    for v in color:
        if color[v] == WHITE:
            visit(v)
    return None if has_cycle else popped[::-1]


def topological_sort_source_removal(graph: dict[Hashable, list[Hashable]]) -> list[Hashable] | None:
    """Topological order by repeatedly deleting a source (a vertex with no incoming edges).

    Levitin §4.2 (source-removal algorithm, also called Kahn's algorithm).
    Sources are taken first-in-first-out in vertex order. Returns None if the
    digraph has a cycle. Time Θ(|V| + |E|); space Θ(|V|).
    """
    vertices = _vertices(graph)
    indegree = {v: 0 for v in vertices}
    for u in graph:
        for v in graph[u]:
            indegree[v] += 1
    queue = deque(v for v in vertices if indegree[v] == 0)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in graph.get(u, []):
            indegree[v] -= 1
            if indegree[v] == 0:
                queue.append(v)
    return order if len(order) == len(vertices) else None


# ---------------------------------------------------------------------------
# Generating combinatorial objects (Levitin §4.3)
# ---------------------------------------------------------------------------


def permutations_minimal_change(n: int) -> list[tuple[int, ...]]:
    """Permutations of 1..n built bottom-up by inserting n into each permutation of 1..n-1.

    Levitin §4.3 (minimal-change decrease-by-one method). The new element
    sweeps right-to-left, then left-to-right, alternately, so consecutive
    permutations differ by swapping two adjacent elements.
    Time Θ(n!·n); space Θ(n!·n) for the output.
    """
    if n < 1:
        return [()]
    perms: list[tuple[int, ...]] = [(1,)]
    for k in range(2, n + 1):
        new_perms = []
        right_to_left = True
        for p in perms:
            positions = range(len(p), -1, -1) if right_to_left else range(len(p) + 1)
            for pos in positions:
                new_perms.append(p[:pos] + (k,) + p[pos:])
            right_to_left = not right_to_left
        perms = new_perms
    return perms


def johnson_trotter(n: int) -> list[tuple[int, ...]]:
    """Permutations of 1..n by the Johnson-Trotter algorithm (largest mobile element).

    Levitin §4.3. Each element carries an arrow; an element is mobile if its
    arrow points to a smaller neighbor. Swap the largest mobile element in its
    arrow's direction, then flip arrows of all larger elements.
    Time Θ(n!·n); space Θ(n) plus the output.
    """
    if n < 1:
        return [()]
    perm = list(range(1, n + 1))
    direction = [-1] * n  # -1 = arrow points left, +1 = right (parallel to perm)
    result = [tuple(perm)]
    while True:
        largest_idx = -1
        for i in range(n):
            j = i + direction[i]
            if 0 <= j < n and perm[j] < perm[i]:
                if largest_idx == -1 or perm[i] > perm[largest_idx]:
                    largest_idx = i
        if largest_idx == -1:
            return result
        k = perm[largest_idx]
        j = largest_idx + direction[largest_idx]
        perm[largest_idx], perm[j] = perm[j], perm[largest_idx]
        direction[largest_idx], direction[j] = direction[j], direction[largest_idx]
        for i in range(n):
            if perm[i] > k:
                direction[i] = -direction[i]
        result.append(tuple(perm))


def lexicographic_permutations(n: int) -> list[tuple[int, ...]]:
    """Permutations of 1..n in lexicographic (dictionary) order.

    Levitin §4.3 (LexicographicPermute): find the longest decreasing suffix,
    swap its left neighbor with the smallest larger element in the suffix,
    then reverse the suffix. Time Θ(n!·n); space Θ(n) plus the output.
    """
    perm = list(range(1, n + 1))
    result = [tuple(perm)]
    while True:
        i = n - 2
        while i >= 0 and perm[i] >= perm[i + 1]:
            i -= 1
        if i < 0:
            return result
        j = n - 1
        while perm[j] <= perm[i]:
            j -= 1
        perm[i], perm[j] = perm[j], perm[i]
        perm[i + 1:] = reversed(perm[i + 1:])
        result.append(tuple(perm))


def power_set(items: Sequence) -> list[list]:
    """All subsets of items, by decrease-by-one: subsets without the last item, then with it.

    Levitin §4.3 (generating subsets). Time Θ(n·2^n); space Θ(n·2^n) output.
    """
    subsets: list[list] = [[]]
    for x in items:
        subsets = subsets + [s + [x] for s in subsets]
    return subsets


def gray_code(n: int) -> list[str]:
    """Binary reflected Gray code of order n: consecutive strings differ in one bit.

    Levitin §4.3 (binary reflected Gray code (BRGC)). Recursively: prefix 0 to the order n-1 list, then
    prefix 1 to that list reversed. Time Θ(n·2^n); space Θ(n·2^n).
    """
    if n == 0:
        return [""]
    if n == 1:
        return ["0", "1"]
    smaller = gray_code(n - 1)
    return ["0" + s for s in smaller] + ["1" + s for s in reversed(smaller)]


# ---------------------------------------------------------------------------
# Decrease by a constant factor (Levitin §4.4)
# ---------------------------------------------------------------------------


def binary_search(A: Sequence, key, counter: OpCounter | None = None) -> int:
    """Index of key in the sorted sequence A, or -1 (iterative).

    Levitin §4.4 (BinarySearch). Worst case floor(log2 n) + 1 three-way
    comparisons: Θ(log n) time; O(1) space.
    """
    lo, hi = 0, len(A) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        tick(counter, "comparisons")
        if key == A[mid]:
            return mid
        if key < A[mid]:
            hi = mid - 1
        else:
            lo = mid + 1
    return -1


def binary_search_recursive(A: Sequence, key, counter: OpCounter | None = None) -> int:
    """Recursive binary search; same answer as ``binary_search``.

    Levitin §4.4 (recurrence C(n) = C(floor(n/2)) + 1). Θ(log n) time and
    Θ(log n) stack space.
    """
    def search(lo: int, hi: int) -> int:
        if lo > hi:
            return -1
        mid = (lo + hi) // 2
        tick(counter, "comparisons")
        if key == A[mid]:
            return mid
        if key < A[mid]:
            return search(lo, mid - 1)
        return search(mid + 1, hi)

    return search(0, len(A) - 1)


def fake_coin_by_2(coins: Sequence[float]) -> tuple[int, int]:
    """Find the single lighter coin by splitting the pile in two; return (index, weighings).

    Levitin §4.4 (fake-coin problem). With an odd pile one coin is set aside.
    W(n) = W(floor(n/2)) + 1, so floor(log2 n) weighings: Θ(log n); O(1) space.
    """
    lo, hi = 0, len(coins)  # candidates are coins[lo:hi]
    weighings = 0
    while hi - lo > 1:
        half = (hi - lo) // 2
        left = sum(coins[lo:lo + half])
        right = sum(coins[lo + half:lo + 2 * half])
        weighings += 1
        if left < right:
            hi = lo + half
        elif right < left:
            lo, hi = lo + half, lo + 2 * half
        else:  # both halves genuine: the set-aside coin is fake
            lo = lo + 2 * half
    return lo, weighings


def fake_coin_by_3(coins: Sequence[float]) -> tuple[int, int]:
    """Find the lighter coin by splitting into three piles; return (index, weighings).

    Levitin Exercise 4.4 (fake coin, divide into three). Two equal piles of
    size ceil(n/3) go on the scale. About log3 n weighings: Θ(log n).
    """
    lo, hi = 0, len(coins)
    weighings = 0
    while hi - lo > 1:
        size = hi - lo
        k = -(-size // 3)  # ceil(size / 3)
        if 2 * k > size:  # size == 2 (k == 1 works) or tiny piles
            k = size // 2
        a = sum(coins[lo:lo + k])
        b = sum(coins[lo + k:lo + 2 * k])
        weighings += 1
        if a < b:
            hi = lo + k
        elif b < a:
            lo, hi = lo + k, lo + 2 * k
        else:
            lo = lo + 2 * k
    return lo, weighings


def russian_peasant(n: int, m: int, counter: OpCounter | None = None) -> int:
    """Multiply n * m by halving n and doubling m (add m when n is odd).

    Levitin §4.4 (Russian peasant multiplication). Θ(log n) halvings;
    O(1) space. n must be non-negative.
    """
    if n < 0:
        raise ValueError("russian_peasant expects n >= 0")
    total = 0
    while n > 0:
        tick(counter, "halvings")
        if n % 2 == 1:
            tick(counter, "additions")
            total += m
        n //= 2
        m *= 2
    return total


def exp_by_squaring(a, n: int, counter: OpCounter | None = None):
    """Compute a^n with a^n = (a^(n/2))^2 (times a when n is odd), recursively.

    Levitin §4.4 (decrease-by-half exponentiation). Θ(log n) multiplications;
    Θ(log n) stack space.
    """
    if n < 0:
        raise ValueError("exp_by_squaring expects n >= 0")
    if n == 0:
        return 1
    half = exp_by_squaring(a, n // 2, counter)
    tick(counter, "multiplications")
    result = half * half
    if n % 2 == 1:
        tick(counter, "multiplications")
        result = result * a
    return result


def josephus(n: int) -> int:
    """Survivor J(n) of the Josephus problem (every second person eliminated).

    Levitin §4.4: J(2k) = 2J(k) - 1, J(2k+1) = 2J(k) + 1, J(1) = 1.
    Equivalent to a one-bit cyclic left shift of n's binary form.
    Θ(log n) time and stack space.
    """
    if n < 1:
        raise ValueError("josephus expects n >= 1")
    if n == 1:
        return 1
    if n % 2 == 0:
        return 2 * josephus(n // 2) - 1
    return 2 * josephus(n // 2) + 1


def josephus_simulate(n: int, step: int = 2) -> int:
    """Survivor by simulating the circle (every ``step``-th person eliminated).

    Levitin §4.4 (direct simulation, useful as a check). Θ(n^2) with a list.
    """
    people = list(range(1, n + 1))
    idx = 0
    while len(people) > 1:
        idx = (idx + step - 1) % len(people)
        people.pop(idx)
    return people[0]


# ---------------------------------------------------------------------------
# Variable-size decrease (Levitin §4.5)
# ---------------------------------------------------------------------------


def lomuto_partition(A: list, lo: int, hi: int, counter: OpCounter | None = None) -> int:
    """Partition A[lo..hi] in place around pivot A[lo]; return the pivot's final index.

    Levitin §4.5 (LomutoPartition). Afterwards A[lo..s-1] < pivot <= A[s+1..hi].
    hi - lo comparisons: Θ(n) time; O(1) space.
    """
    p = A[lo]
    s = lo
    for i in range(lo + 1, hi + 1):
        tick(counter, "comparisons")
        if A[i] < p:
            s += 1
            A[s], A[i] = A[i], A[s]
    A[lo], A[s] = A[s], A[lo]
    return s


def quickselect(A: Sequence, k: int, counter: OpCounter | None = None):
    """Return the k-th smallest element (k = 1 is the minimum) using Lomuto partitions.

    Levitin §4.5 (Quickselect). Average Θ(n), worst Θ(n^2) comparisons.
    Works on a copy; space O(n) copy, O(1) extra (iterative).
    """
    if not 1 <= k <= len(A):
        raise ValueError("k must be between 1 and len(A)")
    A = list(A)
    lo, hi = 0, len(A) - 1
    target = k - 1
    while True:
        s = lomuto_partition(A, lo, hi, counter)
        if s == target:
            return A[s]
        if s > target:
            hi = s - 1
        else:
            lo = s + 1


def interpolation_search(A: Sequence[float], key: float, counter: OpCounter | None = None) -> int:
    """Index of key in sorted numeric A, probing where key "should" be by linear interpolation.

    Levitin §4.5 (interpolation search). Average about log log n + 1
    comparisons on uniform data; worst case Θ(n). O(1) space.
    """
    lo, hi = 0, len(A) - 1
    while lo <= hi and A[lo] <= key <= A[hi]:
        if A[hi] == A[lo]:
            pos = lo
        else:
            pos = lo + int((key - A[lo]) * (hi - lo) // (A[hi] - A[lo]))
        tick(counter, "comparisons")
        if A[pos] == key:
            return pos
        if A[pos] < key:
            lo = pos + 1
        else:
            hi = pos - 1
    return -1


class BSTNode:
    """A node of a Binary Search Tree (BST): key, left subtree, right subtree."""

    def __init__(self, key, left: "BSTNode | None" = None, right: "BSTNode | None" = None):
        self.key = key
        self.left = left
        self.right = right

    def __repr__(self) -> str:
        return f"BSTNode({self.key!r})"


def bst_insert(root: BSTNode | None, key) -> BSTNode:
    """Insert key into the BST (duplicates go right); return the (possibly new) root.

    Levitin §4.5 (BST insertion as variable-size decrease). Time Θ(height):
    Θ(log n) average, Θ(n) worst; O(1) extra space (iterative).
    """
    new = BSTNode(key)
    if root is None:
        return new
    node = root
    while True:
        if key < node.key:
            if node.left is None:
                node.left = new
                return root
            node = node.left
        else:
            if node.right is None:
                node.right = new
                return root
            node = node.right


def bst_search(root: BSTNode | None, key, counter: OpCounter | None = None) -> BSTNode | None:
    """Return the node holding key, or None.

    Levitin §4.5 (BST search). Time Θ(height); O(1) space.
    """
    node = root
    while node is not None:
        tick(counter, "comparisons")
        if key == node.key:
            return node
        node = node.left if key < node.key else node.right
    return None


def bst_max(root: BSTNode | None):
    """Largest key in a nonempty BST: keep going right. Levitin Exercise 4.5. Θ(height)."""
    if root is None:
        raise ValueError("empty tree has no maximum")
    node = root
    while node.right is not None:
        node = node.right
    return node.key


def bst_from_keys(keys: Iterable) -> BSTNode | None:
    """Build a BST by inserting keys in the given order. Θ(n·height)."""
    root = None
    for k in keys:
        root = bst_insert(root, k)
    return root


def bst_inorder(root: BSTNode | None) -> list:
    """Keys of a BST in sorted order (inorder traversal). Θ(n)."""
    out: list = []
    stack: list[BSTNode] = []
    node = root
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        out.append(node.key)
        node = node.right
    return out


def nim_winning_move(piles: Sequence[int]) -> tuple[int, int] | None:
    """For multi-pile Nim, return (pile index, new pile size) that wins, or None if losing.

    Levitin §4.5 (game of Nim): a position is losing exactly when the
    binary digital sum, i.e. the bitwise exclusive or (XOR), of the pile sizes is 0. Move to make it 0.
    Θ(number of piles) time; O(1) space.
    """
    x = 0
    for p in piles:
        x ^= p
    if x == 0:
        return None
    for i, p in enumerate(piles):
        target = p ^ x
        if target < p:
            return i, target
    return None  # unreachable when x != 0


def nim_one_pile_winning_move(n: int, m: int) -> int | None:
    """One-pile Nim (take 1..m chips, last to take wins): how many to take, or None.

    Levitin §4.5: n is a losing position exactly when n is a multiple of
    m + 1, so take n mod (m + 1) chips. Θ(1).
    """
    r = n % (m + 1)
    return r if r != 0 else None


def negatives_before_positives_iterative(A: Sequence[float]) -> list[float]:
    """Rearrange so every negative number comes before every non-negative one (two pointers).

    Levitin Exercise 5.2.8 (a partition-like rearrangement). Θ(n) time;
    O(n) for the copy, O(1) extra.
    """
    A = list(A)
    i, j = 0, len(A) - 1
    while i <= j:
        if A[i] < 0:
            i += 1
        elif A[j] >= 0:
            j -= 1
        else:
            A[i], A[j] = A[j], A[i]
            i += 1
            j -= 1
    return A


def negatives_before_positives_recursive(A: Sequence[float]) -> list[float]:
    """Same rearrangement by decrease-by-one recursion on the unsettled middle range.

    Levitin Exercise 5.2.8. Θ(n) time; Θ(n) stack depth in the worst case.
    """
    A = list(A)

    def settle(i: int, j: int) -> None:
        if i >= j:
            return
        if A[i] < 0:
            settle(i + 1, j)
        elif A[j] >= 0:
            settle(i, j - 1)
        else:
            A[i], A[j] = A[j], A[i]
            settle(i + 1, j - 1)

    settle(0, len(A) - 1)
    return A
