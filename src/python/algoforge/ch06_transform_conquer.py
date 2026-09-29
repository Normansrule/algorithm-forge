"""Chapter 6 - Transform-and-Conquer.

First transform the instance into something easier, then solve it
(Levitin §6.0). Three flavors:
  * instance simplification - presorting, Gaussian elimination, balanced trees;
  * representation change - heaps, Horner's rule, 2-3 trees;
  * problem reduction - lcm via gcd, counting paths via matrix powers.
"""

from __future__ import annotations

from typing import Sequence

from .counters import OpCounter, tick
from .ch01_intro import gcd_euclid

# ---------------------------------------------------------------------------
# Presorting (Levitin §6.1)
# ---------------------------------------------------------------------------


def presort_unique(A: Sequence, counter: OpCounter | None = None) -> bool:
    """True when all elements are distinct: sort first, then compare neighbors.

    Levitin §6.1 (PresortElementUniqueness). Θ(n log n) for sorting plus
    n - 1 neighbor comparisons; Θ(n) space for the sorted copy.
    """
    B = sorted(A)
    for i in range(len(B) - 1):
        tick(counter, "comparisons")
        if B[i] == B[i + 1]:
            return False
    return True


def presort_mode(A: Sequence) -> tuple[object, int]:
    """Most frequent value and its count; ties go to the smallest value.

    Levitin §6.1 (PresortMode): after sorting, equal values sit in runs, so
    one scan finds the longest run. Θ(n log n) time; Θ(n) space.
    """
    if len(A) == 0:
        raise ValueError("presort_mode of an empty sequence")
    B = sorted(A)
    i = 0
    mode, freq = B[0], 0
    while i < len(B):
        run_length = 1
        while i + run_length < len(B) and B[i + run_length] == B[i]:
            run_length += 1
        if run_length > freq:
            mode, freq = B[i], run_length
        i += run_length
    return mode, freq


# ---------------------------------------------------------------------------
# Gaussian elimination (Levitin §6.2)
# ---------------------------------------------------------------------------


def gaussian_elimination(A: Sequence[Sequence[float]], b: Sequence[float],
                         partial_pivoting: bool = True,
                         counter: OpCounter | None = None) -> list[list[float]]:
    """Reduce the augmented matrix [A | b] to upper-triangular form.

    Levitin §6.2 (ForwardElimination / BetterForwardElimination). With
    partial pivoting, the row with the largest |pivot| is swapped up to reduce
    round-off error. Works with ``fractions.Fraction`` entries for exact math.
    About n^3/3 multiplications: Θ(n^3) time; Θ(n^2) space (a copy).
    Raises ValueError if the matrix is singular.
    """
    n = len(A)
    M = [list(A[i]) + [b[i]] for i in range(n)]
    for i in range(n):
        pivot_row = i
        if partial_pivoting:
            for r in range(i + 1, n):
                if abs(M[r][i]) > abs(M[pivot_row][i]):
                    pivot_row = r
        else:
            while pivot_row < n and M[pivot_row][i] == 0:
                pivot_row += 1
            if pivot_row == n:
                raise ValueError("matrix is singular")
        if abs(M[pivot_row][i]) < 1e-12:
            raise ValueError("matrix is singular")
        M[i], M[pivot_row] = M[pivot_row], M[i]
        for j in range(i + 1, n):
            factor = M[j][i] / M[i][i]
            for k in range(i, n + 1):
                tick(counter, "multiplications")
                M[j][k] = M[j][k] - M[i][k] * factor
    return M


def back_substitution(U: Sequence[Sequence[float]]) -> list[float]:
    """Solve an upper-triangular augmented system from the last row up.

    Levitin §6.2 (backward substitution). Θ(n^2) time; Θ(n) space.
    """
    n = len(U)
    x = [0] * n
    for i in range(n - 1, -1, -1):
        s = U[i][n]
        for j in range(i + 1, n):
            s -= U[i][j] * x[j]
        x[i] = s / U[i][i]
    return x


def solve_linear_system(A: Sequence[Sequence[float]], b: Sequence[float],
                        partial_pivoting: bool = True) -> list[float]:
    """Solve Ax = b by Gaussian elimination followed by back substitution.

    Levitin §6.2. Θ(n^3) time; Θ(n^2) space.
    """
    return back_substitution(gaussian_elimination(A, b, partial_pivoting))


# ---------------------------------------------------------------------------
# Balanced search trees: Adelson-Velsky and Landis (AVL) trees and 2-3 trees (Levitin §6.3)
# ---------------------------------------------------------------------------


class AVLNode:
    """Node of an AVL tree: key, children, height (a single node has height 0)."""

    def __init__(self, key):
        self.key = key
        self.left: AVLNode | None = None
        self.right: AVLNode | None = None
        self.height = 0  # a single node has height 0

    def __repr__(self) -> str:
        return f"AVLNode({self.key!r})"


def avl_height(node: AVLNode | None) -> int:
    """Height of an AVL subtree; the empty tree has height -1. O(1)."""
    return node.height if node is not None else -1


def _update(node: AVLNode) -> None:
    node.height = 1 + max(avl_height(node.left), avl_height(node.right))


def _balance(node: AVLNode) -> int:
    return avl_height(node.left) - avl_height(node.right)


def _rotate_right(r: AVLNode) -> AVLNode:
    c = r.left
    assert c is not None
    r.left = c.right
    c.right = r
    _update(r)
    _update(c)
    return c


def _rotate_left(r: AVLNode) -> AVLNode:
    c = r.right
    assert c is not None
    r.right = c.left
    c.left = r
    _update(r)
    _update(c)
    return c


def avl_insert(root: AVLNode | None, key, rotations: list[str] | None = None) -> AVLNode:
    """Insert key into an AVL tree and rebalance; return the new root.

    Levitin §6.3 (AVL trees). After a normal BST insertion, the lowest node
    whose balance factor became +2 or -2 is fixed by one of four rotations:
    "R" (single right), "L" (single left), "LR" (double left-right),
    "RL" (double right-left). Each rotation used is appended to ``rotations``.
    Θ(log n) time; Θ(log n) stack. Duplicate keys go to the right.
    """
    if root is None:
        return AVLNode(key)
    if key < root.key:
        root.left = avl_insert(root.left, key, rotations)
    else:
        root.right = avl_insert(root.right, key, rotations)
    _update(root)
    bf = _balance(root)
    if bf > 1:  # left-heavy
        if _balance(root.left) >= 0:
            if rotations is not None:
                rotations.append("R")
            return _rotate_right(root)
        if rotations is not None:
            rotations.append("LR")
        root.left = _rotate_left(root.left)
        return _rotate_right(root)
    if bf < -1:  # right-heavy
        if _balance(root.right) <= 0:
            if rotations is not None:
                rotations.append("L")
            return _rotate_left(root)
        if rotations is not None:
            rotations.append("RL")
        root.right = _rotate_right(root.right)
        return _rotate_left(root)
    return root


def avl_inorder(root: AVLNode | None) -> list:
    """Keys of the AVL tree in sorted order. Θ(n)."""
    if root is None:
        return []
    return avl_inorder(root.left) + [root.key] + avl_inorder(root.right)


def is_avl(root: AVLNode | None) -> bool:
    """Check the Binary Search Tree (BST) order, stored heights, and |balance| <= 1 everywhere. Θ(n)."""
    def check(node, lo, hi) -> int | None:
        if node is None:
            return -1
        if (lo is not None and node.key < lo) or (hi is not None and node.key > hi):
            return None
        hl = check(node.left, lo, node.key)
        hr = check(node.right, node.key, hi)
        if hl is None or hr is None or abs(hl - hr) > 1:
            return None
        h = 1 + max(hl, hr)
        return h if h == node.height else None

    return check(root, None, None) is not None


class TwoThreeNode:
    """Node of a 2-3 tree: 1 key and 2 children (2-node) or 2 keys and 3 children (3-node)."""

    def __init__(self, keys: list, children: list["TwoThreeNode"] | None = None):
        self.keys = keys
        self.children = children or []

    def is_leaf(self) -> bool:
        """True when the node has no children. O(1)."""
        return not self.children

    def __repr__(self) -> str:
        return f"TwoThreeNode({self.keys})"


class TwoThreeTree:
    """A 2-3 tree: every leaf at the same depth, nodes hold 1 or 2 sorted keys.

    Levitin §6.3 (2-3 trees). Insert into a leaf; a leaf that overflows to 3
    keys splits, sending its middle key up (which may split the parent too,
    growing the tree from the root). Search/insert Θ(log n).
    """

    def __init__(self) -> None:
        self.root: TwoThreeNode | None = None
        self.size = 0

    def search(self, key, counter: OpCounter | None = None) -> bool:
        """Return True when key is stored. Θ(log n) key comparisons."""
        node = self.root
        while node is not None:
            i = 0
            while i < len(node.keys):
                tick(counter, "comparisons")
                if key == node.keys[i]:
                    return True
                if key < node.keys[i]:
                    break
                i += 1
            if node.is_leaf():
                return False
            node = node.children[i]
        return False

    def insert(self, key) -> None:
        """Insert key (duplicates are ignored). Θ(log n)."""
        if self.search(key):
            return
        self.size += 1
        if self.root is None:
            self.root = TwoThreeNode([key])
            return
        split = self._insert(self.root, key)
        if split is not None:  # the root split: tree grows by one level
            middle, left, right = split
            self.root = TwoThreeNode([middle], [left, right])

    def _insert(self, node: TwoThreeNode, key):
        """Insert below node; return (middle, left, right) if node split, else None."""
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        if node.is_leaf():
            node.keys.insert(i, key)
        else:
            split = self._insert(node.children[i], key)
            if split is None:
                return None
            middle, left, right = split
            node.keys.insert(i, middle)
            node.children[i:i + 1] = [left, right]
        if len(node.keys) <= 2:
            return None
        # Overflow: 3 keys -> split into two 2-nodes, promote the middle key.
        left = TwoThreeNode([node.keys[0]], node.children[:2])
        right = TwoThreeNode([node.keys[2]], node.children[2:])
        return node.keys[1], left, right

    def inorder(self) -> list:
        """All keys in sorted order. Θ(n)."""
        out: list = []

        def walk(node: TwoThreeNode | None) -> None:
            if node is None:
                return
            if node.is_leaf():
                out.extend(node.keys)
                return
            for i, k in enumerate(node.keys):
                walk(node.children[i])
                out.append(k)
            walk(node.children[-1])

        walk(self.root)
        return out

    def height(self) -> int:
        """Number of edges from root to any leaf (-1 for the empty tree). Θ(log n)."""
        h, node = -1, self.root
        while node is not None:
            h += 1
            node = node.children[0] if node.children else None
        return h

    def levels(self) -> list[list[list]]:
        """Keys grouped by level, e.g. [[[5]], [[2], [8, 9]]] - handy for drawing. Θ(n)."""
        out = []
        level = [self.root] if self.root else []
        while level:
            out.append([list(n.keys) for n in level])
            level = [c for n in level for c in n.children]
        return out

    def is_valid(self) -> bool:
        """Check key counts, child counts, ordering and equal leaf depth. Θ(n)."""
        leaf_depths: set[int] = set()

        def check(node: TwoThreeNode, depth: int, lo, hi) -> bool:
            if not 1 <= len(node.keys) <= 2 or node.keys != sorted(node.keys):
                return False
            if any((lo is not None and k <= lo) or (hi is not None and k >= hi) for k in node.keys):
                return False
            if node.is_leaf():
                leaf_depths.add(depth)
                return True
            if len(node.children) != len(node.keys) + 1:
                return False
            bounds = [lo] + node.keys + [hi]
            return all(check(c, depth + 1, bounds[i], bounds[i + 1]) for i, c in enumerate(node.children))

        if self.root is None:
            return True
        return check(self.root, 0, None, None) and len(leaf_depths) == 1


# ---------------------------------------------------------------------------
# Heaps and heapsort (Levitin §6.4). Max-heaps stored 0-based:
# the children of H[i] are H[2i+1] and H[2i+2]. (Levitin uses 1-based H[1..n].)
# ---------------------------------------------------------------------------


def _sift_down(H: list, i: int, n: int, counter: OpCounter | None) -> None:
    v = H[i]
    while 2 * i + 1 < n:
        j = 2 * i + 1
        if j + 1 < n:
            tick(counter, "comparisons")
            if H[j + 1] > H[j]:
                j += 1
        tick(counter, "comparisons")
        if v >= H[j]:
            break
        H[i] = H[j]
        i = j
    H[i] = v


def heap_bottom_up(A: Sequence, counter: OpCounter | None = None) -> list:
    """Build a max-heap by sifting down every parent, from the last one to the root.

    Levitin §6.4 (HeapBottomUp). At most 2(n - log2(n + 1)) comparisons:
    Θ(n) time; Θ(n) space for the copy.
    """
    H = list(A)
    for i in range(len(H) // 2 - 1, -1, -1):
        _sift_down(H, i, len(H), counter)
    return H


def heap_insert(H: list, key, counter: OpCounter | None = None) -> None:
    """Insert key into max-heap H in place by sifting it up. Levitin §6.4. Θ(log n)."""
    H.append(key)
    i = len(H) - 1
    while i > 0:
        parent = (i - 1) // 2
        tick(counter, "comparisons")
        if H[parent] >= H[i]:
            break
        H[parent], H[i] = H[i], H[parent]
        i = parent


def heap_top_down(A: Sequence, counter: OpCounter | None = None) -> list:
    """Build a max-heap by inserting keys one at a time.

    Levitin §6.4 (top-down heap construction). Θ(n log n) worst case.
    """
    H: list = []
    for x in A:
        heap_insert(H, x, counter)
    return H


def heap_delete_max(H: list, counter: OpCounter | None = None):
    """Remove and return the root of max-heap H (in place).

    Levitin §6.4 (maximum key deletion): swap root with last leaf, shrink,
    then sift the new root down. Θ(log n).
    """
    if not H:
        raise IndexError("delete from an empty heap")
    top = H[0]
    last = H.pop()
    if H:
        H[0] = last
        _sift_down(H, 0, len(H), counter)
    return top


def is_max_heap(H: Sequence) -> bool:
    """True when every parent is >= its children (parental dominance). Θ(n)."""
    return all(H[(i - 1) // 2] >= H[i] for i in range(1, len(H)))


def heapsort(A: Sequence, counter: OpCounter | None = None) -> list:
    """Return a sorted copy: build a heap, then delete the maximum n - 1 times.

    Levitin §6.4 (heapsort). Θ(n log n) in every case; O(1) extra space
    beyond the copy (sorting happens inside the heap array).
    """
    H = heap_bottom_up(A, counter)
    for end in range(len(H) - 1, 0, -1):
        H[0], H[end] = H[end], H[0]
        _sift_down(H, 0, end, counter)
    return H


# ---------------------------------------------------------------------------
# Horner's rule and binary exponentiation (Levitin §6.5).
# Coefficient lists are LOWEST degree first: coeffs[i] multiplies x^i.
# ---------------------------------------------------------------------------


def horner(coeffs: Sequence[float], x: float, counter: OpCounter | None = None) -> float:
    """Evaluate a polynomial as (...((a_n x + a_{n-1}) x + ...) x + a_0.

    Levitin §6.5 (Horner). Exactly n multiplications and n additions:
    Θ(n) time; O(1) space.
    """
    if not coeffs:
        return 0
    p = coeffs[-1]
    for a in reversed(coeffs[:-1]):
        tick(counter, "multiplications")
        p = x * p + a
    return p


def synthetic_division(coeffs: Sequence[float], c: float) -> tuple[list[float], float]:
    """Divide p(x) by (x - c); return (quotient coefficients, remainder = p(c)).

    Levitin §6.5 (Horner's intermediate values are the quotient's
    coefficients). Lowest-degree-first lists. Θ(n) time.
    """
    if not coeffs:
        return [], 0
    values = [coeffs[-1]]
    for a in reversed(coeffs[:-1]):
        values.append(values[-1] * c + a)
    remainder = values.pop()
    return list(reversed(values)), remainder


def binary_exp_left_to_right(a, n: int, counter: OpCounter | None = None):
    """a^n scanning n's bits from the most significant: square, and multiply by a on a 1.

    Levitin §6.5 (LeftRightBinaryExponentiation). Between b - 1 and 2(b - 1)
    multiplications for b = number of bits: Θ(log n).
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    if n == 0:
        return 1
    bits = bin(n)[2:]
    product = a
    for bit in bits[1:]:
        tick(counter, "multiplications")
        product = product * product
        if bit == "1":
            tick(counter, "multiplications")
            product = product * a
    return product


def binary_exp_right_to_left(a, n: int, counter: OpCounter | None = None):
    """a^n scanning bits from the least significant: keep a, a^2, a^4, ... on the side.

    Levitin §6.5 (RightLeftBinaryExponentiation). Θ(log n) multiplications.
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    result = 1
    term = a
    first = True
    while n > 0:
        if not first:
            tick(counter, "multiplications")
            term = term * term
        first = False
        if n % 2 == 1:
            tick(counter, "multiplications")
            result = result * term
        n //= 2
    return result


# ---------------------------------------------------------------------------
# Problem reduction (Levitin §6.6)
# ---------------------------------------------------------------------------


def lcm(m: int, n: int) -> int:
    """Least common multiple via lcm(m, n) = m * n / gcd(m, n).

    Levitin §6.6 (reducing lcm to gcd). Θ(log min(m, n)) from Euclid.
    """
    if m <= 0 or n <= 0:
        raise ValueError("lcm expects positive integers")
    return m // gcd_euclid(m, n) * n


def count_paths(adjacency: Sequence[Sequence[int]], k: int) -> list[list[int]]:
    """Matrix whose (i, j) entry is the number of paths of length k from i to j.

    Levitin §6.6 (counting paths in a graph = k-th power of the adjacency
    matrix). Uses repeated squaring: Θ(n^3 log k) time; Θ(n^2) space.
    """
    n = len(adjacency)
    result = [[1 if i == j else 0 for j in range(n)] for i in range(n)]
    base = [list(row) for row in adjacency]

    def mult(X, Y):
        return [[sum(X[i][t] * Y[t][j] for t in range(n)) for j in range(n)] for i in range(n)]

    while k > 0:
        if k % 2 == 1:
            result = mult(result, base)
        base = mult(base, base)
        k //= 2
    return result


def pairs_sum_multiple_of_60(nums: Sequence[int]) -> int:
    """Count pairs i < j with (nums[i] + nums[j]) divisible by 60, in one pass.

    Course Lecture 6 exercise (transform by remainders): a value with
    remainder r pairs with every earlier value of remainder (60 - r) mod 60.
    Θ(n) time; O(60) space.
    """
    seen = [0] * 60
    pairs = 0
    for x in nums:
        r = x % 60
        pairs += seen[(60 - r) % 60]
        seen[r] += 1
    return pairs


def min_max(A: Sequence, counter: OpCounter | None = None) -> tuple[object, object, int]:
    """Smallest and largest elements using at most ceil(3n/2) - 2 comparisons.

    Levitin Exercise 5.1 / 2.3 (min-max by pairs): compare the two elements
    of each pair, then the smaller against the minimum and the larger against
    the maximum - 3 comparisons per 2 elements. Returns (min, max, comparisons).
    Θ(n) time; O(1) space.
    """
    n = len(A)
    if n == 0:
        raise ValueError("min_max of an empty sequence")
    comparisons = 0

    def less(x, y) -> bool:
        nonlocal comparisons
        comparisons += 1
        tick(counter, "comparisons")
        return x < y

    if n % 2 == 1:
        lo = hi = A[0]
        start = 1
    else:
        if less(A[1], A[0]):
            lo, hi = A[1], A[0]
        else:
            lo, hi = A[0], A[1]
        start = 2
    for i in range(start, n, 2):
        a, b = A[i], A[i + 1]
        if less(b, a):
            a, b = b, a
        if less(a, lo):
            lo = a
        if less(hi, b):
            hi = b
    return lo, hi, comparisons
