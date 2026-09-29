"""Chapter 5 - Divide-and-Conquer.

Split the instance into several smaller instances of the same problem, solve
them (usually recursively), then combine the answers (Levitin §5.0). The
running time usually satisfies T(n) = a T(n/b) + f(n); the Master Theorem
(``master_theorem`` below) turns that recurrence into a growth class.
"""

from __future__ import annotations

import math
from typing import Sequence

from .counters import OpCounter, tick
from .ch03_brute_force import Point, ccw_order, closest_pair_brute

# ---------------------------------------------------------------------------
# Mergesort (Levitin §5.1)
# ---------------------------------------------------------------------------


def merge(B: Sequence, C: Sequence, counter: OpCounter | None = None) -> list:
    """Merge two sorted sequences into one sorted list (stable).

    Levitin §5.1 (Merge). At most len(B) + len(C) - 1 comparisons: Θ(n)
    time; Θ(n) space for the result.
    """
    out = []
    i = j = 0
    while i < len(B) and j < len(C):
        tick(counter, "comparisons")
        if B[i] <= C[j]:
            out.append(B[i])
            i += 1
        else:
            out.append(C[j])
            j += 1
    out.extend(B[i:])
    out.extend(C[j:])
    return out


def mergesort(A: Sequence, counter: OpCounter | None = None) -> list:
    """Return a sorted copy by top-down mergesort (split in halves, sort, merge).

    Levitin §5.1 (Mergesort). C(n) = 2C(n/2) + n - 1 in the worst case, so
    Θ(n log n) time in every case; Θ(n) extra space. Stable.
    """
    A = list(A)
    if len(A) <= 1:
        return A
    mid = len(A) // 2
    return merge(mergesort(A[:mid], counter), mergesort(A[mid:], counter), counter)


def mergesort_bottom_up(A: Sequence, counter: OpCounter | None = None) -> list:
    """Return a sorted copy by merging runs of width 1, 2, 4, ... (no recursion).

    Levitin §5.1 (nonrecursive/bottom-up mergesort remark). Θ(n log n) time;
    Θ(n) extra space.
    """
    A = list(A)
    width = 1
    n = len(A)
    while width < n:
        merged = []
        for lo in range(0, n, 2 * width):
            merged.extend(merge(A[lo:lo + width], A[lo + width:lo + 2 * width], counter))
        A = merged
        width *= 2
    return A


# ---------------------------------------------------------------------------
# Quicksort (Levitin §5.2)
# ---------------------------------------------------------------------------


def hoare_partition(A: list, lo: int, hi: int, counter: OpCounter | None = None) -> int:
    """Partition A[lo..hi] around pivot p = A[lo] with two scans that meet in the middle.

    Levitin §5.2 (HoarePartition). After the call A[lo..s-1] <= p = A[s] <=
    A[s+1..hi] and s is returned. The left scan is bounded by hi so no
    sentinel is needed. Θ(n) comparisons; O(1) space.
    """
    p = A[lo]
    i, j = lo, hi + 1
    while True:
        i += 1
        while i <= hi:
            tick(counter, "comparisons")
            if A[i] >= p:
                break
            i += 1
        j -= 1
        while True:
            tick(counter, "comparisons")
            if A[j] <= p:
                break
            j -= 1
        if i >= j:
            break
        tick(counter, "swaps")
        A[i], A[j] = A[j], A[i]
    tick(counter, "swaps")
    A[lo], A[j] = A[j], A[lo]
    return j


def quicksort(A: Sequence, counter: OpCounter | None = None) -> list:
    """Return a sorted copy by recursive quicksort with Hoare partitioning.

    Levitin §5.2 (Quicksort). Best/average Θ(n log n); worst Θ(n^2) (for
    example, already-sorted input with first-element pivot). Stack depth
    Θ(log n) average, Θ(n) worst.
    """
    A = list(A)

    def sort(lo: int, hi: int) -> None:
        if lo < hi:
            s = hoare_partition(A, lo, hi, counter)
            sort(lo, s - 1)
            sort(s + 1, hi)

    sort(0, len(A) - 1)
    return A


def quicksort_iterative(A: Sequence, counter: OpCounter | None = None) -> list:
    """Quicksort without recursion: an explicit stack of (lo, hi) ranges.

    Levitin Exercise 5.2 (nonrecursive quicksort). The larger part is pushed
    first so the smaller one is handled next, which keeps the stack O(log n).
    Time same as ``quicksort``.
    """
    A = list(A)
    stack = [(0, len(A) - 1)]
    while stack:
        lo, hi = stack.pop()
        if lo >= hi:
            continue
        s = hoare_partition(A, lo, hi, counter)
        left, right = (lo, s - 1), (s + 1, hi)
        if (left[1] - left[0]) > (right[1] - right[0]):
            stack.append(left)
            stack.append(right)
        else:
            stack.append(right)
            stack.append(left)
    return A


def sorted_union(A: Sequence, B: Sequence) -> list:
    """Union of two sorted sequences, sorted, with no duplicates, in one merge-like pass.

    Levitin Exercise 5.1 (union of sorted lists). Θ(len(A) + len(B)) time;
    output-sized space.
    """
    out: list = []

    def push(x) -> None:
        if not out or out[-1] != x:
            out.append(x)

    i = j = 0
    while i < len(A) and j < len(B):
        if A[i] < B[j]:
            push(A[i])
            i += 1
        elif B[j] < A[i]:
            push(B[j])
            j += 1
        else:
            push(A[i])
            i += 1
            j += 1
    for x in A[i:]:
        push(x)
    for x in B[j:]:
        push(x)
    return out


def count_inversions(A: Sequence) -> int:
    """Number of pairs i < j with A[i] > A[j], counted during mergesort.

    Levitin Exercise 5.1.8 (inversions). When an element of the right half
    is merged first, it forms an inversion with every element left in the left
    half. Θ(n log n) time; Θ(n) space.
    """
    def sort_count(L: list) -> tuple[list, int]:
        if len(L) <= 1:
            return L, 0
        mid = len(L) // 2
        left, a = sort_count(L[:mid])
        right, b = sort_count(L[mid:])
        merged = []
        i = j = 0
        inv = a + b
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                merged.append(left[i])
                i += 1
            else:
                merged.append(right[j])
                inv += len(left) - i
                j += 1
        merged.extend(left[i:])
        merged.extend(right[j:])
        return merged, inv

    return sort_count(list(A))[1]


# ---------------------------------------------------------------------------
# Maximum subarray
# ---------------------------------------------------------------------------


def max_subarray_dc(A: Sequence[float]) -> tuple[float, int, int]:
    """Largest sum of a nonempty contiguous subarray; returns (sum, lo, hi) inclusive.

    Divide-and-conquer: best of left half, right half, and the best subarray
    crossing the middle (Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms*, 3rd ed. (CLRS) §4.1; in the spirit of Levitin §5.0).
    T(n) = 2T(n/2) + Θ(n) = Θ(n log n); Θ(log n) stack.
    """
    if len(A) == 0:
        raise ValueError("max_subarray_dc of an empty sequence")

    def solve(lo: int, hi: int) -> tuple[float, int, int]:
        if lo == hi:
            return A[lo], lo, hi
        mid = (lo + hi) // 2
        left = solve(lo, mid)
        right = solve(mid + 1, hi)
        # best sum ending at mid, extending left
        s, best_l, l_idx = 0, -math.inf, mid
        for i in range(mid, lo - 1, -1):
            s += A[i]
            if s > best_l:
                best_l, l_idx = s, i
        s, best_r, r_idx = 0, -math.inf, mid + 1
        for i in range(mid + 1, hi + 1):
            s += A[i]
            if s > best_r:
                best_r, r_idx = s, i
        cross = (best_l + best_r, l_idx, r_idx)
        return max(left, right, cross, key=lambda t: t[0])

    return solve(0, len(A) - 1)


def kadane(A: Sequence[float]) -> tuple[float, int, int]:
    """Largest nonempty subarray sum in one pass (Kadane's algorithm); returns (sum, lo, hi).

    A dynamic-programming idea: the best subarray ending at i either extends
    the best one ending at i - 1 or starts fresh at i. Θ(n) time; O(1) space.
    """
    if len(A) == 0:
        raise ValueError("kadane of an empty sequence")
    best, best_lo, best_hi = A[0], 0, 0
    current, cur_lo = A[0], 0
    for i in range(1, len(A)):
        if current < 0:
            current, cur_lo = A[i], i
        else:
            current += A[i]
        if current > best:
            best, best_lo, best_hi = current, cur_lo, i
    return best, best_lo, best_hi


# ---------------------------------------------------------------------------
# Binary trees (Levitin §5.3)
# ---------------------------------------------------------------------------


class TreeNode:
    """A binary tree node with a value and optional left/right children."""

    def __init__(self, val, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self) -> str:
        return f"TreeNode({self.val!r})"


def tree_from_list(values: Sequence) -> TreeNode | None:
    """Build a binary tree from a level-order list where None marks a missing child.

    Example: [1, 2, 3, None, 4] makes 1 with children 2 and 3, and 4 as the
    right child of 2. Θ(n) time and space.
    """
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    i = 1
    head = 0
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def preorder(root: TreeNode | None) -> list:
    """Root, then left subtree, then right subtree. Levitin §5.3. Θ(n) time."""
    if root is None:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)


def inorder(root: TreeNode | None) -> list:
    """Left subtree, root, right subtree. Levitin §5.3. Θ(n) time."""
    if root is None:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)


def postorder(root: TreeNode | None) -> list:
    """Left subtree, right subtree, then root. Levitin §5.3. Θ(n) time."""
    if root is None:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]


def tree_height(root: TreeNode | None) -> int:
    """Height = length of the longest root-to-leaf path; the empty tree has height -1.

    Levitin §5.3 (Height). Θ(n) time; Θ(height) stack.
    """
    if root is None:
        return -1
    return max(tree_height(root.left), tree_height(root.right)) + 1


def leaf_count(root: TreeNode | None) -> int:
    """Number of leaves (nodes with no children). Levitin Exercise 5.3. Θ(n) time."""
    if root is None:
        return 0
    if root.left is None and root.right is None:
        return 1
    return leaf_count(root.left) + leaf_count(root.right)


# ---------------------------------------------------------------------------
# Karatsuba and Strassen (Levitin §5.4)
# ---------------------------------------------------------------------------


def karatsuba(x: int, y: int, counter: OpCounter | None = None) -> int:
    """Multiply non-negative integers with three half-size products instead of four.

    Levitin §5.4 (multiplication of large integers): with a = a1*10^m + a0 and
    b = b1*10^m + b0, use c2 = a1*b1, c0 = a0*b0, c1 = (a1+a0)(b1+b0) - (c2+c0).
    M(n) = 3M(n/2) gives n^(log2 3) ≈ n^1.585 single-digit multiplications,
    which is what "digit_multiplications" counts. Θ(log n) stack.
    """
    if x < 0 or y < 0:
        raise ValueError("karatsuba expects non-negative integers")
    if x < 10 or y < 10:
        tick(counter, "digit_multiplications")
        return x * y
    m = max(len(str(x)), len(str(y))) // 2
    power = 10 ** m
    x1, x0 = divmod(x, power)
    y1, y0 = divmod(y, power)
    c2 = karatsuba(x1, y1, counter)
    c0 = karatsuba(x0, y0, counter)
    c1 = karatsuba(x1 + x0, y1 + y0, counter) - (c2 + c0)
    return c2 * power * power + c1 * power + c0


def _mat_add(A, B):
    return [[a + b for a, b in zip(ra, rb)] for ra, rb in zip(A, B)]


def _mat_sub(A, B):
    return [[a - b for a, b in zip(ra, rb)] for ra, rb in zip(A, B)]


def strassen(A: list[list], B: list[list], counter: OpCounter | None = None) -> list[list]:
    """Multiply square matrices with Strassen's seven products per level.

    Levitin §5.4 (Strassen's matrix multiplication). Matrices whose size is
    not a power of 2 are padded with zeros and the answer is cropped.
    M(n) = 7M(n/2) gives n^(log2 7) ≈ n^2.807 scalar multiplications
    ("multiplications"). Θ(n^2) extra space per level.
    """
    n = len(A)
    if n == 0:
        return []
    size = 1
    while size < n:
        size *= 2
    if size != n:
        A = [row + [0] * (size - n) for row in A] + [[0] * size for _ in range(size - n)]
        B = [row + [0] * (size - n) for row in B] + [[0] * size for _ in range(size - n)]
    C = _strassen_pow2(A, B, counter)
    return [row[:n] for row in C[:n]]


def _strassen_pow2(A, B, counter):
    n = len(A)
    if n == 1:
        tick(counter, "multiplications")
        return [[A[0][0] * B[0][0]]]
    h = n // 2

    def quad(M, r, c):
        return [row[c:c + h] for row in M[r:r + h]]

    a00, a01, a10, a11 = quad(A, 0, 0), quad(A, 0, h), quad(A, h, 0), quad(A, h, h)
    b00, b01, b10, b11 = quad(B, 0, 0), quad(B, 0, h), quad(B, h, 0), quad(B, h, h)
    m1 = _strassen_pow2(_mat_add(a00, a11), _mat_add(b00, b11), counter)
    m2 = _strassen_pow2(_mat_add(a10, a11), b00, counter)
    m3 = _strassen_pow2(a00, _mat_sub(b01, b11), counter)
    m4 = _strassen_pow2(a11, _mat_sub(b10, b00), counter)
    m5 = _strassen_pow2(_mat_add(a00, a01), b11, counter)
    m6 = _strassen_pow2(_mat_sub(a10, a00), _mat_add(b00, b01), counter)
    m7 = _strassen_pow2(_mat_sub(a01, a11), _mat_add(b10, b11), counter)
    c00 = _mat_add(_mat_sub(_mat_add(m1, m4), m5), m7)
    c01 = _mat_add(m3, m5)
    c10 = _mat_add(m2, m4)
    c11 = _mat_add(_mat_sub(_mat_add(m1, m3), m2), m6)
    top = [r0 + r1 for r0, r1 in zip(c00, c01)]
    bottom = [r0 + r1 for r0, r1 in zip(c10, c11)]
    return top + bottom


# ---------------------------------------------------------------------------
# Closest pair and quickhull (Levitin §5.5)
# ---------------------------------------------------------------------------


def closest_pair_dc(points: Sequence[Point]) -> tuple[float, Point, Point]:
    """Closest pair of points by divide-and-conquer; returns (distance, p, q).

    Levitin §5.5 (EfficientClosestPair). Split by x at the median, solve both
    halves, then check a vertical strip of width 2d around the split using
    points sorted by y (each needs only a few neighbors).
    T(n) = 2T(n/2) + Θ(n) = Θ(n log n); Θ(n) space.
    """
    if len(points) < 2:
        raise ValueError("need at least two points")
    P = sorted(points)                      # by x (then y)
    Q = sorted(points, key=lambda p: (p[1], p[0]))  # by y

    def solve(P: list[Point], Q: list[Point]) -> tuple[float, Point, Point]:
        n = len(P)
        if n <= 3:
            return closest_pair_brute(P)
        mid = n // 2
        left_P, right_P = P[:mid], P[mid:]
        # Split Q consistently with P, respecting duplicates of the split point.
        left_count: dict[Point, int] = {}
        for p in left_P:
            left_count[p] = left_count.get(p, 0) + 1
        left_Q, right_Q = [], []
        for q in Q:
            if left_count.get(q, 0) > 0:
                left_count[q] -= 1
                left_Q.append(q)
            else:
                right_Q.append(q)
        best = min(solve(left_P, left_Q), solve(right_P, right_Q), key=lambda t: t[0])
        d = best[0]
        mid_x = P[mid][0]
        strip = [q for q in Q if abs(q[0] - mid_x) < d]
        for i in range(len(strip)):
            j = i + 1
            while j < len(strip) and strip[j][1] - strip[i][1] < best[0]:
                dist = math.dist(strip[i], strip[j])
                if dist < best[0]:
                    best = (dist, strip[i], strip[j])
                j += 1
        return best

    return solve(P, Q)


def _side(p: Point, q: Point, r: Point) -> float:
    return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])


def quickhull(points: Sequence[Point]) -> list[Point]:
    """Convex hull vertices (counterclockwise, from the lowest point) by quickhull.

    Levitin §5.5 (quickhull): the leftmost and rightmost points split the set;
    in each half the point farthest from the dividing line is a hull vertex,
    and points inside the triangle are discarded. Average Θ(n log n) on random
    data, worst Θ(n^2). Collinear boundary points are not reported.
    """
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts
    hull: list[Point] = []

    def find_hull(S: list[Point], p: Point, q: Point) -> None:
        # S holds points strictly to the left of directed line p -> q.
        if not S:
            return
        far = max(S, key=lambda r: (_side(p, q, r), -r[0]))
        hull.append(far)
        find_hull([r for r in S if _side(p, far, r) > 0], p, far)
        find_hull([r for r in S if _side(far, q, r) > 0], far, q)

    left, right = pts[0], pts[-1]
    hull.extend([left, right])
    upper = [r for r in pts if _side(left, right, r) > 0]
    lower = [r for r in pts if _side(right, left, r) > 0]
    find_hull(upper, left, right)
    find_hull(lower, right, left)
    if len(hull) == 2 and left == right:
        return [left]
    return ccw_order(hull)


# ---------------------------------------------------------------------------
# Master Theorem (Levitin §5.0, Appendix B)
# ---------------------------------------------------------------------------


def _format_power(exponent: float) -> str:
    if abs(exponent - round(exponent)) < 1e-9:
        e = int(round(exponent))
        if e == 0:
            return "1"
        if e == 1:
            return "n"
        return f"n^{e}"
    return f"n^{exponent:.3f}".rstrip("0").rstrip(".")


def master_theorem(a: float, b: float, d: float) -> str:
    """Growth class of T(n) = a T(n/b) + f(n) with f(n) in Θ(n^d), as a string. O(1).

    Levitin §5.0 (Master Theorem):
      * a < b^d  ->  Θ(n^d)
      * a = b^d  ->  Θ(n^d log n)
      * a > b^d  ->  Θ(n^(log_b a))
    Examples: (2, 2, 1) -> "Θ(n log n)", (1, 2, 0) -> "Θ(log n)",
    (7, 2, 2) -> "Θ(n^2.807)".
    """
    if a < 1 or b <= 1 or d < 0:
        raise ValueError("need a >= 1, b > 1, d >= 0")
    bd = b ** d
    if abs(a - bd) < 1e-9 * max(1.0, bd):
        power = _format_power(d)
        return "Θ(log n)" if power == "1" else f"Θ({power} log n)"
    if a < bd:
        return f"Θ({_format_power(d)})"
    return f"Θ({_format_power(math.log(a, b))})"
