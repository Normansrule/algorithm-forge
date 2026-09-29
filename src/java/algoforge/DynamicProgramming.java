package algoforge;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Dynamic Programming (DP) classics from Levitin Chapter 8 (plus the Longest Common Subsequence). */
public final class DynamicProgramming {

    private DynamicProgramming() { }

    /** "No edge" marker for {@link #floyd}. Large, but adding two of them cannot overflow an int. */
    public static final int INF = Integer.MAX_VALUE / 4;

    /** Result of a DP that picks items: the optimal value and the chosen indices (ascending). */
    public record Choice(int value, List<Integer> indices) { }

    /**
     * Coin-row problem (Levitin §8.1): the largest total of coins with no two adjacent ones picked.
     * F(i) = max(c_i + F(i-2), F(i-1)). Θ(n) time and space.
     */
    public static Choice coinRow(int[] coins) {
        int n = coins.length;
        int[] f = new int[n + 1];
        if (n >= 1) {
            f[1] = coins[0];
        }
        for (int i = 2; i <= n; i++) {
            f[i] = Math.max(coins[i - 1] + f[i - 2], f[i - 1]);
        }
        List<Integer> picked = new ArrayList<>();
        int i = n;
        while (i >= 1) {
            int take = coins[i - 1] + (i >= 2 ? f[i - 2] : 0);
            if (f[i] == take) {
                picked.add(i - 1);
                i -= 2;
            } else {
                i -= 1;
            }
        }
        Collections.reverse(picked);
        return new Choice(f[n], picked);
    }

    /**
     * 0/1 knapsack by bottom-up DP (Levitin §8.2):
     * F(i, j) = max(F(i-1, j), v_i + F(i-1, j - w_i)) when w_i &lt;= j. Θ(nW) time and space.
     */
    public static Choice knapsack(int[] weights, int[] values, int capacity) {
        int n = weights.length;
        int[][] f = new int[n + 1][capacity + 1];
        for (int i = 1; i <= n; i++) {
            for (int j = 0; j <= capacity; j++) {
                f[i][j] = f[i - 1][j];
                if (weights[i - 1] <= j) {
                    f[i][j] = Math.max(f[i][j], values[i - 1] + f[i - 1][j - weights[i - 1]]);
                }
            }
        }
        List<Integer> items = new ArrayList<>();
        int j = capacity;
        for (int i = n; i >= 1; i--) {
            if (f[i][j] != f[i - 1][j]) {       // item i was needed to reach this value
                items.add(i - 1);
                j -= weights[i - 1];
            }
        }
        Collections.reverse(items);
        return new Choice(f[n][capacity], items);
    }

    /**
     * One Longest Common Subsequence (LCS) of a and b.
     * L[i][j] = L[i-1][j-1] + 1 on a match, else max(L[i-1][j], L[i][j-1]). Θ(nm) time and space.
     */
    public static String lcs(String a, String b) {
        int n = a.length();
        int m = b.length();
        int[][] L = new int[n + 1][m + 1];
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                L[i][j] = a.charAt(i - 1) == b.charAt(j - 1)
                        ? L[i - 1][j - 1] + 1
                        : Math.max(L[i - 1][j], L[i][j - 1]);
            }
        }
        StringBuilder sb = new StringBuilder();
        int i = n;
        int j = m;
        while (i > 0 && j > 0) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) {
                sb.append(a.charAt(i - 1));
                i--;
                j--;
            } else if (L[i - 1][j] >= L[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        return sb.reverse().toString();
    }

    /**
     * Floyd's all-pairs shortest paths (Levitin §8.4): D[i][j] = min(D[i][j], D[i][k] + D[k][j]).
     * Use {@link #INF} for "no edge" and 0 on the diagonal; negative edges are fine as long as there
     * is no negative cycle. Returns a new matrix. Θ(n^3).
     */
    public static int[][] floyd(int[][] w) {
        int n = w.length;
        int[][] d = new int[n][];
        for (int i = 0; i < n; i++) {
            d[i] = w[i].clone();
        }
        for (int k = 0; k < n; k++) {
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    // skip "no path" entries so INF never takes part in arithmetic
                    if (d[i][k] < INF && d[k][j] < INF && d[i][k] + d[k][j] < d[i][j]) {
                        d[i][j] = d[i][k] + d[k][j];
                    }
                }
            }
        }
        return d;
    }

    /**
     * Warshall's transitive closure (Levitin §8.4): r[i][j] is true when a directed path of length
     * at least 1 leads from i to j. Returns a new matrix. Θ(n^3).
     */
    public static boolean[][] warshall(boolean[][] adj) {
        int n = adj.length;
        boolean[][] r = new boolean[n][];
        for (int i = 0; i < n; i++) {
            r[i] = adj[i].clone();
        }
        for (int k = 0; k < n; k++) {
            for (int i = 0; i < n; i++) {
                if (r[i][k]) {
                    for (int j = 0; j < n; j++) {
                        if (r[k][j]) {
                            r[i][j] = true;
                        }
                    }
                }
            }
        }
        return r;
    }
}
