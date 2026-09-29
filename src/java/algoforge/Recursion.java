package algoforge;

import java.util.ArrayList;
import java.util.List;

/** Recursive (and matching iterative) algorithms from Levitin Chapters 1, 2 and 4. */
public final class Recursion {

    private Recursion() { }

    /** n! by F(n) = F(n-1) * n (Levitin §2.4). n multiplications; valid for 0 &lt;= n &lt;= 20 in a long. */
    public static long factorial(int n) {
        if (n < 0 || n > 20) {
            throw new IllegalArgumentException("factorial(n) fits in a long only for 0 <= n <= 20");
        }
        return n == 0 ? 1 : factorial(n - 1) * n;
    }

    /**
     * Tower of Hanoi moves (Levitin §2.4), each written like "1: A->C" (disk 1 is the smallest).
     * Exactly 2^n - 1 moves: Θ(2^n).
     */
    public static List<String> hanoi(int n, char from, char to, char via) {
        List<String> moves = new ArrayList<>();
        hanoi(n, from, to, via, moves);
        return moves;
    }

    private static void hanoi(int n, char from, char to, char via, List<String> moves) {
        if (n == 0) {
            return;
        }
        hanoi(n - 1, from, via, to, moves);
        moves.add(n + ": " + from + "->" + to);
        hanoi(n - 1, via, to, from, moves);
    }

    /** Fibonacci straight from the definition (Levitin §2.5). Exponential Θ(phi^n): keep n small. */
    public static long fibRecursive(int n) {
        if (n < 0) {
            throw new IllegalArgumentException("n must be >= 0");
        }
        return n <= 1 ? n : fibRecursive(n - 1) + fibRecursive(n - 2);
    }

    /** Fibonacci keeping only the last two values (Levitin §2.5). Θ(n) additions; n &lt;= 92 fits a long. */
    public static long fibIterative(int n) {
        if (n < 0 || n > 92) {
            throw new IllegalArgumentException("need 0 <= n <= 92");
        }
        long prev = 0;
        long cur = 1;
        if (n == 0) {
            return 0;
        }
        for (int i = 2; i <= n; i++) {
            long next = prev + cur;
            prev = cur;
            cur = next;
        }
        return cur;
    }

    /**
     * Fibonacci from [[1,1],[1,0]]^n = [[F(n+1),F(n)],[F(n),F(n-1)]] using exponentiation by
     * squaring (Levitin §2.5 and §6.5). Θ(log n) 2x2 matrix products; n &lt;= 92.
     */
    public static long fibMatrix(int n) {
        if (n < 0 || n > 92) {
            throw new IllegalArgumentException("need 0 <= n <= 92");
        }
        long[][] result = {{1, 0}, {0, 1}};
        long[][] base = {{1, 1}, {1, 0}};
        int k = n;
        while (k > 0) {
            if ((k & 1) == 1) {
                result = multiply(result, base);
            }
            k >>= 1;
            if (k > 0) {
                base = multiply(base, base);
            }
        }
        return result[0][1];
    }

    private static long[][] multiply(long[][] x, long[][] y) {
        return new long[][] {
            {x[0][0] * y[0][0] + x[0][1] * y[1][0], x[0][0] * y[0][1] + x[0][1] * y[1][1]},
            {x[1][0] * y[0][0] + x[1][1] * y[1][0], x[1][0] * y[0][1] + x[1][1] * y[1][1]},
        };
    }

    /** Euclid's algorithm gcd(m, n) = gcd(n, m mod n) (Levitin §1.1). O(log min(m, n)). */
    public static long gcd(long m, long n) {
        if (m < 0 || n < 0 || (m == 0 && n == 0)) {
            throw new IllegalArgumentException("need non-negative inputs, not both zero");
        }
        while (n != 0) {
            long r = m % n;
            m = n;
            n = r;
        }
        return m;
    }

    /** Recursive form of Euclid's algorithm. Same O(log min(m, n)) steps, plus stack depth. */
    public static long gcdRecursive(long m, long n) {
        return n == 0 ? m : gcdRecursive(n, m % n);
    }

    /** Number of binary digits of n &gt;= 1, iteratively (Levitin §2.3). Θ(log n). */
    public static int binaryDigits(int n) {
        if (n < 1) {
            throw new IllegalArgumentException("n must be positive");
        }
        int count = 1;
        while (n > 1) {
            count++;
            n /= 2;
        }
        return count;
    }

    /** Number of binary digits of n &gt;= 1: BinRec(n) = BinRec(n/2) + 1 (Levitin §2.4). Θ(log n). */
    public static int binaryDigitsRecursive(int n) {
        if (n < 1) {
            throw new IllegalArgumentException("n must be positive");
        }
        return n == 1 ? 1 : binaryDigitsRecursive(n / 2) + 1;
    }

    /**
     * a^n by exponentiation by squaring (Levitin §4.4): a^n = (a^(n/2))^2, times a when n is odd.
     * Θ(log n) multiplications. Overflow wraps silently, as with any Java long arithmetic.
     */
    public static long power(long a, int n) {
        if (n < 0) {
            throw new IllegalArgumentException("n must be >= 0");
        }
        if (n == 0) {
            return 1;
        }
        long half = power(a, n / 2);
        long result = half * half;
        return (n % 2 == 1) ? result * a : result;
    }
}
