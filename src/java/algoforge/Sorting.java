package algoforge;

/**
 * Classic comparison sorts on {@code int[]} arrays, sorted in place into nondecreasing order.
 *
 * <p>Every method has an overload that takes a {@link Counter}, so you can measure the basic
 * operation (key comparisons) and the number of swaps / element moves, exactly as Levitin §2.1
 * recommends. The plain overloads simply pass {@code null}.</p>
 */
public final class Sorting {

    private Sorting() { }

    /** Tallies of basic operations. Fields are public on purpose: this is a teaching tool. */
    public static final class Counter {
        /** Key comparisons (the basic operation of comparison sorts). */
        public long comparisons;
        /** Swaps or element moves (writes). */
        public long swaps;

        /** Set both tallies back to zero. */
        public void reset() {
            comparisons = 0;
            swaps = 0;
        }

        @Override
        public String toString() {
            return "comparisons=" + comparisons + ", swaps=" + swaps;
        }
    }

    private static boolean less(int x, int y, Counter c) {
        if (c != null) {
            c.comparisons++;
        }
        return x < y;
    }

    private static void swap(int[] a, int i, int j, Counter c) {
        if (c != null) {
            c.swaps++;
        }
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }

    // ------------------------------------------------------------------ selection sort

    /** Selection sort (Levitin §3.1). Always n(n-1)/2 comparisons: Θ(n^2); at most n-1 swaps. */
    public static void selectionSort(int[] a) {
        selectionSort(a, null);
    }

    /** Selection sort with operation counting. Θ(n^2) time, O(1) extra space. */
    public static void selectionSort(int[] a, Counter c) {
        int n = a.length;
        for (int i = 0; i < n - 1; i++) {
            int min = i;
            for (int j = i + 1; j < n; j++) {
                if (less(a[j], a[min], c)) {
                    min = j;
                }
            }
            if (min != i) {
                swap(a, i, min, c);
            }
        }
    }

    // ------------------------------------------------------------------ bubble sort

    /** Bubble sort (Levitin §3.1) with the early-exit improvement. Worst Θ(n^2), best Θ(n). */
    public static void bubbleSort(int[] a) {
        bubbleSort(a, null);
    }

    /** Bubble sort with operation counting; stops after a pass with no swaps. O(1) extra space. */
    public static void bubbleSort(int[] a, Counter c) {
        int n = a.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - 1 - i; j++) {
                if (less(a[j + 1], a[j], c)) {
                    swap(a, j, j + 1, c);
                    swapped = true;
                }
            }
            if (!swapped) {
                return;
            }
        }
    }

    // ------------------------------------------------------------------ insertion sort

    /** Insertion sort (Levitin §4.1). Worst Θ(n^2), best (sorted input) n-1 comparisons. */
    public static void insertionSort(int[] a) {
        insertionSort(a, null);
    }

    /** Insertion sort with operation counting ("swaps" counts element shifts). Stable. */
    public static void insertionSort(int[] a, Counter c) {
        for (int i = 1; i < a.length; i++) {
            int v = a[i];
            int j = i - 1;
            while (j >= 0 && less(v, a[j], c)) {
                a[j + 1] = a[j];
                if (c != null) {
                    c.swaps++;
                }
                j--;
            }
            a[j + 1] = v;
        }
    }

    // ------------------------------------------------------------------ mergesort

    /** Top-down mergesort (Levitin §5.1). Θ(n log n) in every case; Θ(n) extra space; stable. */
    public static void mergeSort(int[] a) {
        mergeSort(a, null);
    }

    /** Mergesort with operation counting ("swaps" counts writes back into the array). */
    public static void mergeSort(int[] a, Counter c) {
        if (a.length > 1) {
            mergeSort(a, new int[a.length], 0, a.length - 1, c);
        }
    }

    private static void mergeSort(int[] a, int[] tmp, int lo, int hi, Counter c) {
        if (lo >= hi) {
            return;
        }
        int mid = (lo + hi) >>> 1;
        mergeSort(a, tmp, lo, mid, c);
        mergeSort(a, tmp, mid + 1, hi, c);
        int i = lo;
        int j = mid + 1;
        int k = lo;
        while (i <= mid && j <= hi) {
            // take from the left run on ties to stay stable
            tmp[k++] = less(a[j], a[i], c) ? a[j++] : a[i++];
        }
        while (i <= mid) {
            tmp[k++] = a[i++];
        }
        while (j <= hi) {
            tmp[k++] = a[j++];
        }
        for (k = lo; k <= hi; k++) {
            a[k] = tmp[k];
            if (c != null) {
                c.swaps++;
            }
        }
    }

    // ------------------------------------------------------------------ quicksort

    /** Quicksort with Hoare partitioning (Levitin §5.2). Average Θ(n log n), worst Θ(n^2). */
    public static void quickSort(int[] a) {
        quickSort(a, null);
    }

    /** Quicksort with operation counting. Recursion depth Θ(log n) average, Θ(n) worst. */
    public static void quickSort(int[] a, Counter c) {
        quickSort(a, 0, a.length - 1, c);
    }

    private static void quickSort(int[] a, int lo, int hi, Counter c) {
        while (lo < hi) {
            int s = hoarePartition(a, lo, hi, c);
            // recurse on the smaller side, loop on the larger one: O(log n) stack
            if (s - lo < hi - s) {
                quickSort(a, lo, s - 1, c);
                lo = s + 1;
            } else {
                quickSort(a, s + 1, hi, c);
                hi = s - 1;
            }
        }
    }

    /**
     * Hoare partition around pivot p = a[lo] (Levitin §5.2). Returns the pivot's final index s with
     * a[lo..s-1] &lt;= p &lt;= a[s+1..hi]. The left scan is bounded by hi, so no sentinel is needed.
     * Θ(n) time.
     */
    public static int hoarePartition(int[] a, int lo, int hi, Counter c) {
        int p = a[lo];
        int i = lo;
        int j = hi + 1;
        while (true) {
            do {
                i++;
            } while (i <= hi && less(a[i], p, c));
            do {
                j--;
            } while (less(p, a[j], c));
            if (i >= j) {
                break;
            }
            swap(a, i, j, c);
        }
        swap(a, lo, j, c);
        return j;
    }

    // ------------------------------------------------------------------ heapsort

    /** Heapsort (Levitin §6.4): build a max-heap bottom-up, then delete the max n-1 times. Θ(n log n). */
    public static void heapSort(int[] a) {
        heapSort(a, null);
    }

    /** Heapsort with operation counting. In place, O(1) extra space, not stable. */
    public static void heapSort(int[] a, Counter c) {
        int n = a.length;
        for (int i = n / 2 - 1; i >= 0; i--) {
            siftDown(a, i, n, c);
        }
        for (int end = n - 1; end > 0; end--) {
            swap(a, 0, end, c);
            siftDown(a, 0, end, c);
        }
    }

    private static void siftDown(int[] a, int i, int n, Counter c) {
        int v = a[i];
        while (2 * i + 1 < n) {
            int child = 2 * i + 1;
            if (child + 1 < n && less(a[child], a[child + 1], c)) {
                child++;
            }
            if (!less(v, a[child], c)) {
                break;
            }
            a[i] = a[child];
            i = child;
        }
        a[i] = v;
    }

    /** True when a is in nondecreasing order. Θ(n). */
    public static boolean isSorted(int[] a) {
        for (int i = 1; i < a.length; i++) {
            if (a[i - 1] > a[i]) {
                return false;
            }
        }
        return true;
    }
}
