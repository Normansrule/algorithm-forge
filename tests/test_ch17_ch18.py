"""Tests for Chapter 17 (algorithms inside production systems) and Chapter 18 (the frontier).

Style as in the other chapters: hand-checkable examples (several taken from the
Arena problems of the same name), randomized tests against brute-force oracles
with fixed seeds, and statistical tests for the probabilistic structures that
compare measured error with the theory.
"""

import heapq
import itertools
import math
import random
import statistics
from collections import Counter

import pytest

from algoforge import OpCounter
from algoforge import ch09_greedy as gr
from algoforge import ch10_iterative_improvement as ii
from algoforge import ch17_systems as sy
from algoforge import ch18_frontier as fr


# ===================================================================== ch 17
# ------------------------------------------------------------- caching
def test_lru_cache_basics_and_eviction_order():
    c = sy.LRUCache(2)
    c.put("a", 1)
    c.put("b", 2)
    assert c.get("a") == 1  # a is now most recent
    c.put("c", 3)  # evicts b
    assert c.evicted == ["b"] and "b" not in c and c.get("b") is None
    assert c.keys_most_recent_first() == ["c", "a"]
    assert (c.hits, c.misses) == (1, 1)
    with pytest.raises(ValueError):
        sy.LRUCache(0)


def _lru_hits_brute(requests, capacity):
    cache, hits = [], 0  # most recent at the end
    for p in requests:
        if p in cache:
            hits += 1
            cache.remove(p)
        elif len(cache) == capacity:
            cache.pop(0)
        cache.append(p)
    return hits


def _opt_hits_brute(requests, capacity):
    """Best hit count over every possible eviction choice (exhaustive)."""
    best = 0

    def go(i, cache, hits):
        nonlocal best
        if hits + (len(requests) - i) <= best:
            return
        if i == len(requests):
            best = max(best, hits)
            return
        p = requests[i]
        if p in cache:
            go(i + 1, cache, hits + 1)
        elif len(cache) < capacity:
            go(i + 1, cache | {p}, hits)
        else:
            for victim in cache:
                go(i + 1, (cache - {victim}) | {p}, hits)

    go(0, frozenset(), 0)
    return best


def test_lru_hits_and_belady_against_brute_force():
    rng = random.Random(1701)
    for _ in range(150):
        reqs = [rng.randint(0, 4) for _ in range(rng.randint(0, 11))]
        k = rng.randint(1, 3)
        lru, opt = sy.lru_hits(reqs, k), sy.belady_hits(reqs, k)
        assert lru == _lru_hits_brute(reqs, k)
        assert opt == _opt_hits_brute(reqs, k)
        assert lru <= opt


def test_belady_classic_example():
    # the classic 20-request reference string with 3 frames: OPT has 9 page faults, LRU 12
    reqs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
    assert len(reqs) - sy.belady_hits(reqs, 3) == 9
    assert len(reqs) - sy.lru_hits(reqs, 3) == 12


# ------------------------------------------------------------- storage
def test_lsm_compact_examples():
    runs = [[("b", 7), ("d", None)], [("a", 1), ("b", 2), ("d", 4)]]
    assert sy.lsm_compact(runs, True) == [("a", 1), ("b", 7)]
    assert sy.lsm_compact(runs, False) == [("a", 1), ("b", 7), ("d", None)]
    assert sy.lsm_compact([[("m", None)], [("m", 8)], [("m", 1), ("z", 2)]], True) == [("z", 2)]
    assert sy.lsm_compact([[("m", 9)], [("m", None)], [("m", 1), ("z", 2)]], True) == [("m", 9), ("z", 2)]
    assert sy.lsm_compact([], True) == [] and sy.lsm_compact([[], []], False) == []


def test_lsm_compact_random_against_dict_replay():
    rng = random.Random(2)
    for _ in range(200):
        r = rng.randint(0, 5)
        runs = []
        for _ in range(r):
            keys = sorted(rng.sample(range(12), rng.randint(0, 8)))
            runs.append([(k, None if rng.random() < 0.25 else rng.randint(1, 99)) for k in keys])
        bottom = rng.random() < 0.5
        newest = {}
        for run in reversed(runs):  # replay oldest to newest
            newest.update(run)
        expect = sorted((k, v) for k, v in newest.items() if not (bottom and v is None))
        c = OpCounter()
        assert sy.lsm_compact(runs, bottom, counter=c) == expect
        assert c["heap_ops"] <= 2 * sum(len(run) for run in runs)
        for k in range(12):
            assert sy.lsm_get(runs, k) == newest.get(k)


def test_wal_recover_examples():
    disk = [("x", 1), ("y", 2), ("z", 3)]
    log = [("update", 1, "x", 1, 10), ("update", 2, "y", 2, 20), ("commit", 1), ("update", 2, "z", 3, 30)]
    assert sy.wal_recover(disk, log) == [("x", 10), ("y", 2), ("z", 3)]
    # a loser's dirty page already on disk must be undone
    assert sy.wal_recover([("x", 10), ("y", 20)], log[:3]) == [("x", 10), ("y", 2)]
    # undo must run backwards
    assert sy.wal_recover([("a", 5)], [("update", 7, "a", 5, 6), ("update", 7, "a", 6, 7)]) == [("a", 5)]
    assert sy.wal_recover([("q", 4)], []) == [("q", 4)]
    assert sy.wal_recover([], [("update", 1, "n", None, 3), ("commit", 1), ("update", 2, "n", 3, None)]) == [("n", 3)]


def test_wal_recover_random_crashes():
    """Run random transactions under strict two-phase locking, crash at a random point with a random
    subset of dirty pages flushed, and check recovery yields exactly the committed transactions' effect."""
    rng = random.Random(3)
    for _ in range(200):
        keys = ["k%d" % i for i in range(4)]
        state = {k: rng.choice([None, 0]) for k in keys}
        committed_state = dict(state)
        log, locks, active, next_id = [], {}, {}, 1
        for _ in range(rng.randint(0, 25)):
            if active and rng.random() < 0.7:
                t = rng.choice(sorted(active))  # a running transaction
            else:
                t, next_id = next_id, next_id + 1  # transaction ids are never reused
            if rng.random() < 0.25 and t in active:
                log.append(("commit", t))
                for k in active.pop(t):
                    del locks[k]
                    committed_state[k] = state[k]
                continue
            k = rng.choice(keys)
            if locks.get(k, t) != t:
                continue  # strict 2PL: someone else holds the lock
            locks[k] = t
            active.setdefault(t, set()).add(k)
            after = rng.choice([None, rng.randint(1, 9)])
            log.append(("update", t, k, state[k], after))
            state[k] = after
        # disk: any mix of old and new values (pages may or may not have been flushed)
        disk_state = {k: rng.choice([committed_state[k], state[k]]) for k in keys}
        recovered = sy.wal_recover(list(disk_state.items()), log)
        assert recovered == sorted((k, v) for k, v in committed_state.items() if v is not None)


def test_external_sort_plan_examples():
    assert sy.external_sort_plan(200, 6) == (34, 4, 1600)
    assert sy.external_sort_plan(5, 5) == (1, 1, 10)
    assert sy.external_sort_plan(36, 6) == (6, 3, 216)
    assert sy.external_sort_plan(10 ** 10, 100) == (10 ** 8, 6, 12 * 10 ** 10)
    with pytest.raises(ValueError):
        sy.external_sort_plan(10, 2)


def test_external_merge_sort_matches_plan():
    rng = random.Random(4)
    for _ in range(80):
        n = rng.randint(1, 300)
        M = rng.randint(3, 12)
        data = [rng.randint(-50, 50) for _ in range(n)]
        out, stats = sy.external_merge_sort(data, M)
        assert out == sorted(data)
        runs, passes, _ = sy.external_sort_plan(n, M)  # one item per "page", B = M buffers
        assert (stats["runs"], stats["passes"]) == (runs, passes)
    assert sy.external_merge_sort([], 4) == ([], {"runs": 0, "passes": 0})


# ------------------------------------------------------------- placement
def test_consistent_hash_ring_lookup_and_minimal_movement():
    ring = sy.ConsistentHashRing(vnodes=50, seed=7)
    with pytest.raises(LookupError):
        ring.lookup("x")
    for s in "ABCD":
        ring.add_server(s)
    keys = [f"user{i}" for i in range(2000)]
    before = {k: ring.lookup(k) for k in keys}
    # lookup agrees with a linear scan of the ring
    for k in keys[:200]:
        h = sy._hash64(("key", k), 7)
        at_or_after = [p for p in ring.points if p >= h]
        p = min(at_or_after) if at_or_after else ring.points[0]
        assert ring.owner[p] == before[k]
    load = Counter(before.values())
    assert all(300 <= load[s] <= 700 for s in "ABCD")  # 2000 / 4 = 500 each, roughly
    ring.add_server("E")
    after = {k: ring.lookup(k) for k in keys}
    moved = [k for k in keys if before[k] != after[k]]
    assert all(after[k] == "E" for k in moved)  # keys only move TO the new server
    assert 0.1 < len(moved) / len(keys) < 0.3  # about 1/5
    ring.remove_server("E")
    assert {k: ring.lookup(k) for k in keys} == before


def test_jump_consistent_hash_properties():
    rng = random.Random(5)
    keys = [rng.getrandbits(64) for _ in range(3000)]
    prev = [0] * len(keys)
    for n in range(1, 25):
        cur = [sy.jump_consistent_hash(k, n) for k in keys]
        assert all(0 <= b < n for b in cur)
        # monotone: a key either stays or moves to the NEW bucket n - 1
        assert all(c == p or c == n - 1 for c, p in zip(cur, prev))
        prev = cur
    counts = Counter(prev)
    assert all(abs(counts[b] - 3000 / 24) < 60 for b in range(24))
    with pytest.raises(ValueError):
        sy.jump_consistent_hash(1, 0)


def test_rendezvous_hash_removal_moves_only_its_keys():
    servers = ["s1", "s2", "s3", "s4", "s5"]
    keys = range(1500)
    before = {k: sy.rendezvous_hash(k, servers) for k in keys}
    assert all(abs(c - 300) < 80 for c in Counter(before.values()).values())
    rest = [s for s in servers if s != "s3"]
    for k in keys:
        after = sy.rendezvous_hash(k, rest)
        assert after == before[k] or before[k] == "s3"
    with pytest.raises(LookupError):
        sy.rendezvous_hash(1, [])


# ------------------------------------------------------------- traffic control
def test_token_bucket_examples():
    assert sy.token_bucket_decisions(2, 1, [0, 0, 0, 1, 1, 5, 5, 5]) == [True, True, False, True, False, True, True, False]
    assert sy.token_bucket_decisions(2, 0.5, [0, 0, 1, 2, 3]) == [True, True, False, True, False]
    assert sy.token_bucket_decisions(3, 3, [0, 10 ** 6, 10 ** 6, 10 ** 6, 10 ** 6]) == [True, True, True, True, False]
    b = sy.TokenBucket(1, 1)
    with pytest.raises(ValueError):
        b.allow(1)
        b.allow(0)


def test_token_bucket_vs_per_second_simulation():
    rng = random.Random(6)
    for _ in range(200):
        C, rate = rng.randint(1, 6), rng.choice([0.25, 0.5, 1, 2, 3])
        times = sorted(rng.randint(0, 30) for _ in range(rng.randint(0, 25)))
        tokens, clock, expect = C, 0, []
        for t in times:  # tick one second at a time (the slow, obviously correct way)
            while clock < t:
                tokens = min(C, tokens + rate)
                clock += 1
            expect.append(tokens >= 1)
            if tokens >= 1:
                tokens -= 1
        assert sy.token_bucket_decisions(C, rate, times) == expect


def test_backoff_schedule_examples_and_bounds():
    assert sy.backoff_schedule(100, 1000, 100000, "full", [0.5] * 6) == [50, 100, 200, 400, 500, 500]
    assert sy.backoff_schedule(10, 1000, 100000, "decorrelated", [0, 0.5, 0.99, 0.25]) == [10, 20, 60, 52]
    assert sy.backoff_schedule(100, 1000, 700, "full", [0.9] * 4) == [90, 180, 360]
    assert sy.backoff_schedule(10, 50, 1000, "decorrelated", [0.9, 0.9, 0.2, 0.2]) == [28, 50, 38, 31]
    assert sy.backoff_schedule(5, 100, 0, "full", [0, 0.5]) == [0]
    assert sy.backoff_schedule(10, 300, 10 ** 6, "none", [0.3] * 7) == [10, 20, 40, 80, 160, 300, 300]
    with pytest.raises(ValueError):
        sy.backoff_schedule(1, 2, 3, "bogus", [0.1])
    rng = random.Random(7)
    for _ in range(200):
        base = rng.randint(1, 50)
        cap = base * rng.randint(1, 40)
        mode = rng.choice(["none", "full", "equal", "decorrelated"])
        deadline = rng.randint(0, 20 * cap)
        sleeps = sy.backoff_schedule(base, cap, deadline, mode, attempts=15, rng=rng)
        assert sum(sleeps) <= deadline and all(0 <= s <= cap for s in sleeps)
        for a, s in enumerate(sleeps):
            e = min(cap, base * 2 ** a)
            if mode in ("full", "equal", "none"):
                assert s <= e
            if mode == "equal":
                assert s >= e - e // 2
            if mode == "decorrelated":
                assert s >= min(cap, base)
    # full jitter spreads synchronized clients out: mean is about e / 2
    draws = [sy.backoff_schedule(1000, 1000, 10 ** 9, "full", attempts=1, rng=random.Random(s))[0] for s in range(400)]
    assert 430 < statistics.mean(draws) < 570


# ------------------------------------------------------------- logical clocks
def _random_execution(rng, procs=3, steps=18):
    events, pending, msg = [], [], 0
    for _ in range(steps):
        p = rng.randrange(procs)
        r = rng.random()
        if r < 0.3 and pending:
            m = pending.pop(rng.randrange(len(pending)))
            events.append(("recv", p, m))
        elif r < 0.65:
            events.append(("send", p, msg))
            pending.append(msg)
            msg += 1
        else:
            events.append(("local", p))
    return events


def _happens_before(events):
    """Transitive closure of program order plus send -> receive (brute force)."""
    n = len(events)
    hb = [[False] * n for _ in range(n)]
    last_of = {}
    send_of = {}
    for j, ev in enumerate(events):
        if ev[1] in last_of:
            hb[last_of[ev[1]]][j] = True
        last_of[ev[1]] = j
        if ev[0] == "send":
            send_of[ev[2]] = j
        if ev[0] == "recv":
            hb[send_of[ev[2]]][j] = True
    for k in range(n):
        for i in range(n):
            if hb[i][k]:
                for j in range(n):
                    if hb[k][j]:
                        hb[i][j] = True
    return hb


def test_lamport_and_vector_clocks_against_happens_before():
    rng = random.Random(8)
    for _ in range(150):
        events = _random_execution(rng)
        hb = _happens_before(events)
        L = sy.lamport_timestamps(events)
        V = sy.vector_timestamps(events)
        for i, j in itertools.permutations(range(len(events)), 2):
            if hb[i][j]:
                assert L[i] < L[j]  # clock condition (only one direction)
            relation = sy.vc_compare(V[i], V[j])
            assert (relation == "before") == hb[i][j]  # strong clock condition: both directions
            assert (relation == "concurrent") == (not hb[i][j] and not hb[j][i])


def test_vector_clock_example():
    events = [("send", "A", 1), ("local", "B"), ("recv", "B", 1), ("local", "C")]
    V = sy.vector_timestamps(events)
    assert V[2] == {"A": 1, "B": 2}
    assert sy.vc_compare(V[0], V[2]) == "before" and sy.vc_compare(V[2], V[0]) == "after"
    assert sy.vc_compare(V[1], V[3]) == "concurrent" and sy.vc_compare(V[1], dict(V[1])) == "equal"
    assert sy.lamport_timestamps(events) == [1, 1, 2, 1]


# ------------------------------------------------------------- Raft
def test_raft_append_entries_examples():
    ok, log = sy.raft_append_entries([0, 1, 1, 2], 2, 1, [3, 3])
    assert ok and log == [0, 1, 1, 3, 3]
    assert sy.raft_append_entries([0, 1, 1, 2], 4, 3, [3]) == (False, [0, 1, 1, 2])  # gap
    assert sy.raft_append_entries([0, 1, 1, 2], 3, 3, [3]) == (False, [0, 1, 1, 2])  # conflict at prev
    # a delayed duplicate of an older message must not delete matching later entries
    assert sy.raft_append_entries([0, 1, 1, 2, 2], 1, 1, [1]) == (True, [0, 1, 1, 2, 2])


def test_raft_replication_converges_to_leader_prefix():
    rng = random.Random(9)
    for _ in range(300):
        # Logs must satisfy Raft's invariant (an (index, term) pair is unique cluster-wide), so build a
        # common prefix and then let the two logs diverge with terms from different leaders (even vs odd).
        prefix = [0] + sorted(rng.randint(1, 3) for _ in range(rng.randint(0, 6)))
        top = prefix[-1]
        leader = prefix + sorted(2 * rng.randint(top // 2 + 1, top + 3) for _ in range(rng.randint(0, 5)))
        follower = prefix[:len(prefix) - rng.randint(0, len(prefix) - 1)]
        if len(follower) == len(prefix):
            follower = follower + sorted(2 * rng.randint(top // 2 + 1, top + 3) + 1 for _ in range(rng.randint(0, 5)))
        nxt = len(leader)  # leader's nextIndex for this follower, decremented on rejection
        while True:
            ok, new = sy.raft_append_entries(follower, nxt - 1, leader[nxt - 1], leader[nxt:])
            if ok:
                break
            assert new == follower
            nxt -= 1
        assert new[:len(leader)] == leader  # follower now holds the leader's whole log
        # log matching: any common (index, term) implies identical prefixes
        for i in range(min(len(new), len(leader))):
            if new[i] == leader[i]:
                assert new[:i + 1] == leader[:i + 1]


def test_raft_commit_index_examples_and_brute_force():
    assert sy.raft_commit_index([0, 1, 1, 1], [3, 3, 1], 1, 0) == 3
    assert sy.raft_commit_index([0, 1, 2, 4], [3, 2, 2, 1, 1], 4, 1) == 1  # Figure 8 trap
    assert sy.raft_commit_index([0, 3, 3, 3, 3, 3], [5, 5, 2, 2], 3, 0) == 2
    assert sy.raft_commit_index([0, 2, 2, 2, 2, 2, 2], [6, 1, 1], 2, 4) == 4
    assert sy.raft_commit_index([0], [0, 0, 0], 1, 0) == 0
    rng = random.Random(10)
    for _ in range(300):
        term = rng.randint(1, 5)
        log = [0] + sorted(rng.randint(1, term) for _ in range(rng.randint(0, 12)))
        s = rng.randint(1, 7)
        match = [len(log) - 1] + [rng.randint(0, len(log) - 1) for _ in range(s - 1)]
        commit = rng.randint(0, len(log) - 1)
        expect = max([N for N in range(commit + 1, len(log))
                      if 2 * sum(m >= N for m in match) > s and log[N] == term], default=commit)
        assert sy.raft_commit_index(log, match, term, commit) == expect


def test_raft_vote_rule():
    assert sy.raft_log_up_to_date(3, 1, 2, 9)  # higher last term wins even if shorter
    assert not sy.raft_log_up_to_date(2, 9, 3, 1)
    assert sy.raft_log_up_to_date(2, 5, 2, 5) and not sy.raft_log_up_to_date(2, 4, 2, 5)


# ------------------------------------------------------------- Merkle, CRDT
def _toy_combine(x, y):
    return (x * 1009 + y * 9176 + 1) % 1000003


def test_merkle_diff_arena_examples():
    ident = lambda x: x  # noqa: E731
    c = OpCounter()
    assert sy.merkle_diff([1, 2, 3, 4], [1, 2, 3, 4], ident, _toy_combine, c) == [] and c["comparisons"] == 1
    assert sy.merkle_tree([1, 2, 3, 4], ident, _toy_combine)[1] == 115939
    c = OpCounter()
    assert sy.merkle_diff([1, 2, 3, 4], [1, 2, 9, 4], ident, _toy_combine, c) == [2] and c["comparisons"] == 5
    c = OpCounter()
    A, B = [10, 20, 30, 40, 50, 60, 70, 80], [10, 21, 30, 40, 50, 60, 70, 81]
    assert sy.merkle_diff(A, B, ident, _toy_combine, c) == [1, 7] and c["comparisons"] == 11


def test_merkle_diff_random_sha256():
    rng = random.Random(11)
    for _ in range(100):
        n = rng.randint(1, 40)
        A = [rng.randint(0, 9) for _ in range(n)]
        B = list(A)
        for i in rng.sample(range(n), rng.randint(0, min(n, 4))):
            B[i] += 1
        c = OpCounter()
        diff = sy.merkle_diff(A, B, counter=c)
        assert diff == [i for i in range(n) if A[i] != B[i]]
        depth = max(1, math.ceil(math.log2(n))) + 1
        assert c["comparisons"] <= 1 + 2 * len(diff) * depth
    with pytest.raises(ValueError):
        sy.merkle_diff([1], [1, 2])


def test_crdt_counters_converge_in_any_order():
    rng = random.Random(12)
    for _ in range(100):
        R = rng.randint(1, 4)
        reps = [sy.PNCounter(r) for r in range(R)]
        truth = 0
        for _ in range(rng.randint(0, 30)):
            r = rng.randrange(R)
            op = rng.random()
            if op < 0.4:
                a = rng.randint(1, 9)
                reps[r].increment(a)
                truth += a
            elif op < 0.7:
                a = rng.randint(1, 9)
                reps[r].decrement(a)
                truth -= a
            else:
                reps[r].merge(reps[rng.randrange(R)])  # gossip, possibly repeated or with itself
        for _ in range(2):  # full gossip rounds in a random order
            for r, q in rng.sample([(r, q) for r in range(R) for q in range(R)], R * R):
                reps[r].merge(reps[q])
        assert all(rep.value() == truth for rep in reps)


def test_gcounter_merge_is_a_semilattice():
    rng = random.Random(13)
    for _ in range(200):
        a, b, c = ({r: rng.randint(0, 5) for r in rng.sample(range(4), rng.randint(0, 4))} for _ in range(3))
        m = sy.gcounter_merge
        norm = lambda d: {k: v for k, v in d.items() if v}  # noqa: E731
        assert norm(m(a, b)) == norm(m(b, a))
        assert norm(m(m(a, b), c)) == norm(m(a, m(b, c)))
        assert norm(m(a, a)) == norm(a)
    g = sy.GCounter("x")
    with pytest.raises(ValueError):
        g.increment(-1)


# ===================================================================== ch 18
# ------------------------------------------------------------- adaptive sorting
def _sort_inputs(rng):
    n = rng.randint(0, 300)
    kind = rng.choice(["random", "sorted", "reverse", "few", "runs", "organ", "sawtooth"])
    if kind == "random":
        return [rng.randint(-1000, 1000) for _ in range(n)]
    if kind == "sorted":
        return list(range(n))
    if kind == "reverse":
        return list(range(n, 0, -1))
    if kind == "few":
        return [rng.randint(0, 3) for _ in range(n)]
    if kind == "runs":
        out = []
        while len(out) < n:
            start = rng.randint(0, 100)
            out += list(range(start, start + rng.randint(1, 40)))[:: rng.choice([1, -1])]
        return out[:n]
    if kind == "organ":
        return list(range(n // 2)) + list(range(n - n // 2, 0, -1))
    return [i % 17 for i in range(n)]


@pytest.mark.parametrize("sort", [fr.timsort, fr.powersort, fr.pdqsort])
def test_adaptive_sorts_match_sorted(sort):
    rng = random.Random(14)
    for _ in range(250):
        A = _sort_inputs(rng)
        before = list(A)
        assert sort(A) == sorted(A)
        assert A == before  # input not modified


@pytest.mark.parametrize("sort", [fr.timsort, fr.powersort])
def test_run_adaptive_sorts_are_stable(sort):
    rng = random.Random(15)
    for _ in range(200):
        A = [(rng.randint(0, 5), i) for i in range(rng.randint(0, 200))]
        if rng.random() < 0.5:
            A.sort(key=lambda p: -p[0])  # descending runs with equal keys inside
        assert sort(A, key=lambda p: p[0]) == sorted(A, key=lambda p: p[0])


def test_adaptive_sorts_are_linear_on_presorted_input():
    n = 4096
    for sort in (fr.timsort, fr.powersort, fr.pdqsort):
        for A in (list(range(n)), list(range(n, 0, -1))):
            c = OpCounter()
            sort(A, counter=c)
            if sort is fr.pdqsort and A[0] > A[-1]:  # descending is fast for pdqsort, but not one pass
                assert c["comparisons"] <= 0.5 * n * math.log2(n)
            else:
                assert c["comparisons"] <= 3 * n, sort.__name__
    # few runs: about n log2(r) comparisons for r runs
    A = list(range(1000, 2000)) + list(range(1000)) + list(range(2000, 3000))
    c = OpCounter()
    fr.powersort(A, counter=c)
    assert c["comparisons"] < 3 * 3000


def test_natural_runs_and_node_power():
    assert fr.natural_runs([5, 6, 7, 1, 2, 9, 8, 3, 3, 4]) == [[5, 6, 7], [1, 2, 9], [3, 8], [3, 4]]
    assert fr.natural_runs([]) == []
    assert fr.node_power(0, 4, 4, 8) == 1 and fr.node_power(0, 2, 2, 8) == 2 and fr.node_power(0, 2, 6, 8) == 1
    rng = random.Random(16)
    for _ in range(300):  # matches the exact rational definition
        n = rng.randint(2, 200)
        s1 = rng.randint(0, n - 2)
        n1 = rng.randint(1, n - 1 - s1)
        n2 = rng.randint(1, n - s1 - n1)
        a = (2 * s1 + n1) / (2 * n)
        b = (2 * s1 + 2 * n1 + n2) / (2 * n)
        k = 1
        while math.floor(a * 2 ** k) == math.floor(b * 2 ** k):
            k += 1
        assert fr.node_power(s1, n1, n2, n) == k


def test_galloping_merge_stable_and_cheap_on_disjoint_runs():
    rng = random.Random(17)
    for _ in range(300):
        L = sorted((rng.randint(0, 9), "L", i) for i in range(rng.randint(0, 30)))
        R = sorted((rng.randint(0, 9), "R", i) for i in range(rng.randint(0, 30)))
        out = fr.galloping_merge(L, R, key=lambda t: t[0], min_gallop=rng.randint(1, 7))
        assert out == sorted(L + R, key=lambda t: t[0])  # sorted() is stable: L before R on ties
    c = OpCounter()
    fr.galloping_merge(list(range(1000)), list(range(1000, 2000)), counter=c)
    assert c["comparisons"] < 60  # 7 plain wins, then one exponential search


def test_min_run_length():
    assert fr.min_run_length(63) == 63
    assert all(32 <= fr.min_run_length(n) <= 64 for n in range(64, 5000))
    assert fr.min_run_length(2048) == 32 and fr.min_run_length(2049) == 33


def test_pdqsort_heapsort_fallback_and_duplicates():
    # median-of-three picks 1 as pivot: a 1 / 63 split is "bad"; with max_bad = 1 heapsort finishes the job
    A = [0] + list(range(3, 34)) + [1] + list(range(34, 64)) + [2]
    c = OpCounter()
    assert fr.pdqsort(A, max_bad=1, counter=c) == sorted(A)
    assert c["heapsort_fallbacks"] == 1
    c = OpCounter()
    fr.pdqsort(A, counter=c)
    assert c["heapsort_fallbacks"] == 0
    # few distinct keys: O(n k) instead of O(n log n)
    rng = random.Random(18)
    A = [rng.randint(0, 2) for _ in range(5000)]
    c = OpCounter()
    assert fr.pdqsort(A, counter=c) == sorted(A)
    assert c["comparisons"] < 6 * 5000
    # random input stays within a small constant of n log2 n
    A = [rng.random() for _ in range(5000)]
    c = OpCounter()
    fr.pdqsort(A, counter=c)
    assert c["comparisons"] < 1.6 * 5000 * math.log2(5000)


# ------------------------------------------------------------- ordered dictionaries
def test_skip_list_against_set():
    rng = random.Random(19)
    sl, ref = fr.SkipList(rng=random.Random(1)), set()
    for _ in range(3000):
        x = rng.randint(0, 300)
        op = rng.random()
        if op < 0.5:
            assert sl.insert(x) == (x not in ref)
            ref.add(x)
        elif op < 0.8:
            assert sl.delete(x) == (x in ref)
            ref.discard(x)
        else:
            assert sl.contains(x) == (x in ref)
        assert len(sl) == len(ref)
    assert list(sl) == sorted(ref)
    sizes = sl.level_sizes()
    assert sizes[0] == len(ref) and all(a >= b for a, b in zip(sizes, sizes[1:]))


def test_skip_list_search_cost_is_logarithmic():
    sl = fr.SkipList(rng=random.Random(2))
    keys = list(range(4096))
    random.Random(3).shuffle(keys)
    for k in keys:
        sl.insert(k)
    sl.steps = 0
    for k in range(0, 4096, 8):
        assert sl.contains(k)
    assert sl.steps / 512 < 4 * math.log2(4096)  # expected about (1/p) log_{1/p} n = 2 * 12


def test_zip_tree_matches_set_and_is_canonical():
    rng = random.Random(20)
    for _ in range(60):
        keys = rng.sample(range(100), rng.randint(0, 40))
        ranks = {k: rng.randint(0, 4) for k in keys}
        trees = []
        for _ in range(3):  # different insertion orders give the SAME tree
            order = keys[:]
            rng.shuffle(order)
            t = fr.ZipTree()
            for k in order:
                t.insert(k, ranks[k])
            assert t.is_valid() and t.inorder() == sorted(keys) and len(t) == len(keys)
            trees.append(t.preorder())
        assert trees[0] == trees[1] == trees[2]
        if keys:  # deleting gives the tree built without that key
            gone = rng.choice(keys)
            assert t.delete(gone) and not t.delete(gone) and not t.contains(gone)
            fresh = fr.ZipTree()
            for k in keys:
                if k != gone:
                    fresh.insert(k, ranks[k])
            assert t.preorder() == fresh.preorder() and t.is_valid()


def test_zip_tree_random_ranks_give_logarithmic_depth():
    t = fr.ZipTree(rng=random.Random(21))
    for k in range(2000):  # sorted insertion: a plain BST would be a 2000-deep stick
        t.insert(k)
    depths, stack = [], [(t.root, 1)]
    while stack:
        node, d = stack.pop()
        if node is not None:
            depths.append(d)
            stack += [(node.left, d + 1), (node.right, d + 1)]
    assert t.is_valid() and len(depths) == 2000
    assert statistics.mean(depths) < 1.5 * math.log2(2000) + 3  # Tarjan-Levy-Timmel expected-depth bound
    assert t.depth() < 4 * math.log2(2000)


def test_shrinking_cone_and_learned_index():
    keys = [3, 8, 12, 20, 21, 30, 41, 47, 55, 60]
    idx = fr.LearnedIndex(keys, eps=1)
    assert [idx.lookup(k) for k in keys] == list(range(10))
    assert idx.lookup(9) == -1 and idx.lookup(0) == -1 and idx.lookup(99) == -1
    assert fr.shrinking_cone_segments(list(range(0, 300, 3)), 1) == [(0, 99)]  # perfectly linear: one segment
    assert fr.shrinking_cone_segments([], 2) == []
    with pytest.raises(ValueError):
        fr.shrinking_cone_segments([1, 1], 1)
    rng = random.Random(22)
    for _ in range(80):
        keys = sorted(rng.sample(range(5000), rng.randint(1, 300)))
        eps = rng.randint(1, 8)
        idx = fr.LearnedIndex(keys, eps)
        for i, k in enumerate(keys):
            assert abs(idx.predict(k) - i) <= eps  # the model's guarantee
            lo, hi = idx.window(k)
            assert lo <= i <= hi and hi - lo <= 2 * eps
        c = OpCounter()
        for q in range(0, 5000, 7):
            assert idx.lookup(q, c) == (keys.index(q) if q in keys else -1)
        assert c["comparisons"] <= (5000 // 7 + 1) * (math.log2(2 * eps + 1) + 1)
        segs = idx.segments
        assert segs[0][0] == 0 and segs[-1][1] == len(keys) - 1
        assert all(b + 1 == a2 for (_, b), (a2, _) in zip(segs, segs[1:]))


# ------------------------------------------------------------- hashing and filters
def test_cuckoo_hash_table_against_dict():
    rng = random.Random(23)
    t, ref = fr.CuckooHashTable(capacity=4, rng=random.Random(5)), {}
    for _ in range(4000):
        k = rng.randint(0, 800)
        op = rng.random()
        if op < 0.6:
            v = rng.randint(0, 99)
            t.put(k, v)
            ref[k] = v
        elif op < 0.8:
            assert t.delete(k) == (k in ref)
            ref.pop(k, None)
        else:
            assert t.get(k) == ref.get(k) and (k in t) == (k in ref)
        assert len(t) == len(ref)
    assert sorted(t.keys()) == sorted(ref)
    assert len(t) <= 0.46 * 2 * t.m  # load kept under control
    assert t.kicks > 0 and t.rehashes > 0


def test_cuckoo_filter_no_false_negatives_and_fp_rate():
    rng = random.Random(24)
    n = 3000
    f = fr.CuckooFilter(n, bucket_size=4, fingerprint_bits=8, rng=random.Random(6))
    items = [f"item{i}" for i in range(n)]
    for x in items:
        assert f.insert(x)
    assert all(f.contains(x) for x in items)
    assert f.load_factor() > 0.7
    trials = 30000
    fp = sum(f.contains(f"other{i}") for i in range(trials)) / trials
    expected = f.expected_false_positive_rate()
    assert 0.6 * expected < fp < 1.4 * expected
    assert fp < 2 * 4 / 2 ** 8  # the 2b / 2^f bound
    gone = set(rng.sample(items, 1000))
    for x in gone:
        assert f.delete(x)
    assert all(f.contains(x) for x in items if x not in gone)  # deletions never hurt other items
    assert sum(f.contains(x) for x in gone) < 0.1 * len(gone)  # deleted ones are (almost all) gone
    assert not f.delete("never inserted, surely")


def test_cuckoo_filter_full_keeps_everything():
    f = fr.CuckooFilter(40, bucket_size=2, fingerprint_bits=10, max_kicks=20, rng=random.Random(7))
    stored = []
    for i in range(500):
        if not f.insert(i):
            break
        stored.append(i)
    assert f.victim is not None and not f.insert("one more")
    assert all(f.contains(x) for x in stored)  # the overflow fingerprint sits in the victim slot
    for x in stored[:5]:  # free some room: the victim gets re-inserted
        assert f.delete(x)
    assert f.victim is None and f.insert("one more")
    assert all(f.contains(x) for x in stored[5:]) and f.contains("one more")


def test_xor_filter_no_false_negatives_and_fp_rate():
    keys = [f"key{i}" for i in range(4000)]
    xf = fr.XorFilter(keys, fingerprint_bits=8, rng=random.Random(8))
    assert all(xf.contains(k) for k in keys)
    trials = 60000
    fp = sum(xf.contains(f"nope{i}") for i in range(trials)) / trials
    assert 0.6 / 256 < fp < 1.5 / 256
    assert 9.5 < xf.bits_per_key() < 10.5  # about 1.23 * 8
    order_keys = {i for i, _ in xf.order}
    assert order_keys == set(range(len(keys)))
    small = fr.XorFilter([1, 2, 3, 3, 2], rng=random.Random(9))  # duplicates are fine
    assert all(small.contains(k) for k in (1, 2, 3))
    empty = fr.XorFilter([], rng=random.Random(9))
    assert sum(empty.contains(i) for i in range(1000)) < 30


# ------------------------------------------------------------- streaming sketches
def test_hyperloglog_error_near_theory():
    errors = []
    for seed in range(12):
        h = fr.HyperLogLog(p=10, seed=seed)
        n = 20000
        for i in range(n):
            h.add(i)
            if i % 3 == 0:
                h.add(i)  # duplicates change nothing
        errors.append(h.estimate() / n - 1)
    se = 1.04 / math.sqrt(1024)
    rms = math.sqrt(statistics.mean(e * e for e in errors))
    assert rms < 1.6 * se and abs(statistics.mean(errors)) < se
    small = fr.HyperLogLog(p=10)
    for i in range(50):
        small.add(i)
    assert abs(small.estimate() - 50) < 3  # linear counting regime is nearly exact
    with pytest.raises(ValueError):
        fr.HyperLogLog(p=2)


def test_hyperloglog_merge_is_union():
    a, b, u = fr.HyperLogLog(8), fr.HyperLogLog(8), fr.HyperLogLog(8)
    for i in range(3000):
        a.add(i)
        u.add(i)
    for i in range(2000, 6000):
        b.add(i)
        u.add(i)
    a.merge(b)
    assert a.registers == u.registers
    with pytest.raises(ValueError):
        a.merge(fr.HyperLogLog(9))


def test_cvm_exact_when_buffer_is_large_and_accurate_otherwise():
    assert fr.cvm_estimate([1, 2, 3, 2, 1, 4, 4, 4], 100, random.Random(0)) == 4
    assert fr.cvm_estimate([], 10) == 0
    rng = random.Random(25)
    stream = [rng.randint(0, 4999) for _ in range(20000)]
    distinct = len(set(stream))
    estimates = [fr.cvm_estimate(stream, 600, random.Random(s)) for s in range(8)]
    assert all(e is not None for e in estimates)
    rel = [abs(e / distinct - 1) for e in estimates]
    assert statistics.mean(rel) < 0.08 and max(rel) < 0.2
    assert fr.cvm_threshold(0.1, 0.01, 10 ** 6) == math.ceil(1200 * math.log2(8e8))


def test_cvm_failure_symbol():
    # thresh = 1: the buffer is full after the first item, and survives the halving with probability 1/2
    results = [fr.cvm_estimate([7], 1, random.Random(s)) for s in range(50)]
    assert None in results and 0 in results  # either fail, or the item was thrown away (p = 1/2 -> 0 / p)


def test_count_min_never_underestimates_and_conservative_helps():
    rng = random.Random(26)
    stream = [int(rng.paretovariate(1.2)) for _ in range(20000)]
    truth = Counter(stream)
    eps, delta = 0.002, 0.01
    plain = fr.CountMinSketch.for_error(eps, delta, seed=1)
    cons = fr.CountMinSketch.for_error(eps, delta, conservative=True, seed=1)
    for x in stream:
        plain.add(x)
        cons.add(x)
    N = len(stream)
    over_bound = 0
    for x in truth:
        p, c = plain.estimate(x), cons.estimate(x)
        assert truth[x] <= c <= p  # conservative is never worse, and nothing undercounts
        over_bound += p - truth[x] > eps * N
    assert over_bound <= max(1, 3 * delta * len(truth))
    assert plain.estimate("never seen") <= eps * N * 3
    with pytest.raises(ValueError):
        plain.add(1, -1)


def test_misra_gries_guarantee():
    rng = random.Random(27)
    for _ in range(300):
        stream = [rng.choice("aaaabbbcdefg") for _ in range(rng.randint(0, 60))]
        k = rng.randint(2, 6)
        counters = fr.misra_gries(stream, k)
        assert len(counters) <= k - 1
        f = Counter(stream)
        N = len(stream)
        for x in set(stream) | set(counters):
            assert f[x] - N / k <= counters.get(x, 0) <= f[x]
            if f[x] > N / k:
                assert x in counters
    with pytest.raises(ValueError):
        fr.misra_gries([1], 1)


def test_minhash_estimates_jaccard():
    rng = random.Random(28)
    for target in (0.2, 0.5, 0.8):
        diffs = []
        for trial in range(10):
            common = rng.sample(range(10 ** 6), 60)
            extra = round(60 * (1 / target - 1) / 2)
            A = set(common) | {("a", trial, i) for i in range(extra)}
            B = set(common) | {("b", trial, i) for i in range(extra)}
            J = fr.jaccard(A, B)
            est = fr.minhash_similarity(fr.minhash_signature(A, 128, trial), fr.minhash_signature(B, 128, trial))
            diffs.append(est - J)
        assert abs(statistics.mean(diffs)) < 0.05
        assert max(abs(d) for d in diffs) < 0.2
    sig = fr.minhash_signature({1, 2, 3}, 16)
    assert fr.minhash_similarity(sig, fr.minhash_signature([3, 2, 1, 1], 16)) == 1.0
    with pytest.raises(ValueError):
        fr.minhash_signature([], 4)
    assert fr.jaccard([], []) == 1.0


def test_lsh_banding_follows_the_s_curve():
    bands, rows = 10, 4
    assert fr.lsh_candidate_probability(1.0, bands, rows) == 1.0
    assert fr.lsh_candidate_probability(0.0, bands, rows) == 0.0
    rng = random.Random(29)
    hits = 0
    trials = 120
    for t in range(trials):
        common = set(rng.sample(range(10 ** 6), 20))
        A = common | {("a", t, i) for i in range(10)}
        B = common | {("b", t, i) for i in range(10)}  # Jaccard = 20 / 40 = 0.5
        sigs = {"A": fr.minhash_signature(A, bands * rows, t), "B": fr.minhash_signature(B, bands * rows, t)}
        hits += ("A", "B") in fr.lsh_candidate_pairs(sigs, bands, rows)
    p = fr.lsh_candidate_probability(0.5, bands, rows)  # about 0.48
    assert abs(hits / trials - p) < 0.15
    same = fr.minhash_signature(range(30), 40)
    assert fr.lsh_candidate_pairs({"x": same, "y": same, "z": same}, bands, rows) == {("x", "y"), ("x", "z"), ("y", "z")}


# ------------------------------------------------------------- vector search
def test_hnsw_recall_against_brute_force():
    rng = random.Random(30)
    dim = 6
    points = [[rng.random() for _ in range(dim)] for _ in range(300)]
    index = fr.HNSW(M=6, ef_construction=40, rng=random.Random(31))
    for p in points:
        index.add(p)
    recalls = []
    for _ in range(25):
        q = [rng.random() for _ in range(dim)]
        truth = fr.brute_force_knn(points, q, 10)
        found = index.search(q, k=10, ef=40)
        assert len(found) == 10 and len(set(found)) == 10
        recalls.append(fr.recall_at_k(found, truth))
    assert statistics.mean(recalls) >= 0.9
    assert index.search(points[17], k=1) == [17]  # a stored point finds itself
    assert fr.HNSW().search([0.0], k=3) == []
    # it is approximate, but much cheaper than a scan per query
    before = index.distance_evaluations
    index.search([0.5] * dim, k=1, ef=10)
    assert index.distance_evaluations - before < 300


# ------------------------------------------------------------- parallel / algebraic
def test_blelloch_scan():
    assert fr.blelloch_scan([3, 1, 7, 0, 4, 1, 6, 3]) == [0, 3, 4, 11, 11, 15, 16, 22]
    assert fr.blelloch_scan([]) == []
    assert fr.blelloch_scan(list("abcde"), op=lambda x, y: x + y, identity="") == ["", "a", "ab", "abc", "abcd"]
    rng = random.Random(32)
    for _ in range(100):
        A = [rng.randint(-9, 9) for _ in range(rng.randint(1, 70))]
        c = OpCounter()
        expect = [0] + list(itertools.accumulate(A))[:-1]
        assert fr.blelloch_scan(A, counter=c) == expect
        m = 1 << (len(A) - 1).bit_length()
        assert c["work"] == 2 * (m - 1) and c["span"] == 2 * int(math.log2(m))
    assert fr.blelloch_scan([2, 5, 1, 7], op=max, identity=-math.inf) == [-math.inf, 2, 5, 5]


def test_ntt_roundtrip_and_multiplication():
    rng = random.Random(33)
    for _ in range(60):
        n = 1 << rng.randint(0, 6)
        a = [rng.randrange(fr.NTT_MOD) for _ in range(n)]
        assert fr.ntt(fr.ntt(a), invert=True) == a
        p = [rng.randint(0, 1000) for _ in range(rng.randint(1, 40))]
        q = [rng.randint(0, 1000) for _ in range(rng.randint(1, 40))]
        naive = [0] * (len(p) + len(q) - 1)
        for i, x in enumerate(p):
            for j, y in enumerate(q):
                naive[i + j] += x * y
        assert fr.ntt_multiply(p, q) == naive  # coefficients are below the modulus: exact
    assert fr.ntt_multiply([], [1]) == []
    with pytest.raises(ValueError):
        fr.ntt([1, 2, 3])


# ------------------------------------------------------------- string indexing
def test_suffix_array_lcp_against_brute_force():
    assert fr.suffix_array("banana") == [5, 3, 1, 0, 4, 2]
    assert fr.lcp_array("banana", [5, 3, 1, 0, 4, 2]) == [0, 1, 3, 0, 0, 2]
    assert fr.suffix_array("") == [] and fr.suffix_array("a") == [0]
    rng = random.Random(34)
    for _ in range(200):
        s = "".join(rng.choice("ab" if rng.random() < 0.5 else "acgt") for _ in range(rng.randint(1, 40)))
        sa = fr.suffix_array(s)
        assert sa == sorted(range(len(s)), key=lambda i: s[i:])
        lcp = fr.lcp_array(s, sa)
        for i in range(1, len(s)):
            x, y = s[sa[i - 1]:], s[sa[i]:]
            assert lcp[i] == next((j for j in range(min(len(x), len(y))) if x[j] != y[j]), min(len(x), len(y)))
    ints = [3, -1, 3, -1, 0]
    assert fr.suffix_array(ints) == sorted(range(5), key=lambda i: ints[i:])


def test_bwt_inverse_and_fm_index():
    assert fr.bwt("banana", "$") == "annb$aa"
    rng = random.Random(35)
    for _ in range(150):
        text = "".join(rng.choice("abc") for _ in range(rng.randint(0, 30)))
        rotations = sorted((text + "$")[i:] + (text + "$")[:i] for i in range(len(text) + 1))
        L = fr.bwt(text, "$")
        assert L == "".join(r[-1] for r in rotations)
        assert fr.inverse_bwt(L, "$") == text
        fm = fr.FMIndex(text, "$")
        for _ in range(5):
            pat = "".join(rng.choice("abcd") for _ in range(rng.randint(1, 4)))
            positions = [i for i in range(len(text)) if text.startswith(pat, i)]
            assert fm.count(pat) == len(positions) and fm.locate(pat) == positions
    with pytest.raises(ValueError):
        fr.bwt("a$b", "$")


# ------------------------------------------------------------- graphs
def _random_network(rng, n, p=0.4, cmax=9):
    cap = {u: {} for u in range(n)}
    for u in range(n):
        for v in range(n):
            if u != v and rng.random() < p:
                cap[u][v] = rng.randint(1, cmax)
    return cap


def _min_cut_brute(cap, s, t, n):
    best = math.inf
    others = [v for v in range(n) if v not in (s, t)]
    for r in range(len(others) + 1):
        for side in itertools.combinations(others, r):
            S = {s, *side}
            best = min(best, sum(c for u in S for v, c in cap[u].items() if v not in S))
    return best


@pytest.mark.parametrize("algo", [fr.dinic_max_flow, fr.push_relabel_max_flow])
def test_max_flow_equals_min_cut(algo):
    rng = random.Random(36)
    for _ in range(80):
        n = rng.randint(2, 7)
        cap = _random_network(rng, n)
        res = algo(cap, 0, n - 1)
        assert res.value == _min_cut_brute(cap, 0, n - 1, n) == ii.max_flow(cap, 0, n - 1).value
        for (u, v), f in res.flow.items():  # capacity constraints
            assert 0 <= f <= cap[u][v]
        for x in range(1, n - 1):  # conservation at inner vertices
            inflow = sum(f for (u, v), f in res.flow.items() if v == x)
            outflow = sum(f for (u, v), f in res.flow.items() if u == x)
            assert inflow == outflow
        assert sum(cap[u][v] for u, v in res.cut_edges) == res.value
        assert 0 in res.source_side and n - 1 not in res.source_side


def test_max_flow_classic_example_and_counters():
    cap = {"s": {"a": 10, "b": 10}, "a": {"b": 2, "t": 4, "c": 8}, "b": {"c": 9}, "c": {"t": 10}, "t": {}}
    c1, c2 = OpCounter(), OpCounter()
    assert fr.dinic_max_flow(cap, "s", "t", c1).value == 14
    assert fr.push_relabel_max_flow(cap, "s", "t", c2).value == 14
    assert c1["phases"] >= 1 and c2["pushes"] >= 1 and c2["relabels"] >= 1


def test_boruvka_matches_kruskal():
    rng = random.Random(37)
    for _ in range(150):
        n = rng.randint(1, 12)
        edges = [(u, v, rng.randint(1, 6)) for u in range(n) for v in range(u + 1, n) if rng.random() < 0.4]
        c = OpCounter()
        total, tree = fr.boruvka_mst(range(n), edges, c)
        k_total, k_tree = gr.kruskal(list(range(n)), edges)
        assert total == k_total and len(tree) == len(k_tree)
        assert c["rounds"] <= max(1, math.ceil(math.log2(max(n, 1))) + 1)


@pytest.mark.parametrize("delta", [0.5, 3, 10 ** 9])
def test_delta_stepping_matches_dijkstra(delta):
    rng = random.Random(38)
    for _ in range(100):
        n = rng.randint(1, 15)
        graph = {u: [(v, rng.randint(0, 9)) for v in range(n) if v != u and rng.random() < 0.3] for u in range(n)}
        dist, _ = gr.dijkstra(graph, 0)
        assert fr.delta_stepping(graph, 0, delta) == dist
    with pytest.raises(ValueError):
        fr.delta_stepping({0: []}, 0, 0)


def _lists_to_dicts(G, D):
    return {u: [tuple(e) for e in edges] for u, edges in enumerate(G)}, dict(enumerate(D))


def test_find_pivots_arena_examples():
    inf = math.inf
    cases = [
        ([[[1, 3]], [[2, 2]], [[3, 1]], [], [[5, 2]], []], [0, 4], [0, inf, inf, inf, 1, inf], 100, 3,
         [0], [0, 1, 2, 3, 4, 5]),
        ([[[1, 2], [2, 5]], [[3, 2]], [[4, 1]], [[5, 3]], [], []], [0], [0] + [inf] * 5, 100, 2, [0], [0, 1, 2]),
        ([[[2, 3]], [[4, 4]], [[3, 2], [5, 4]], [], [], []], [0, 1], [0, 1, 3, inf, inf, inf], 100, 3,
         [0], [0, 1, 2, 3, 4, 5]),
        ([[[2, 3]], [[4, 4]], [[3, 2], [5, 4]], [], [], []], [0, 1], [0, 1, inf, inf, inf, inf], 6, 3,
         [0], [0, 1, 2, 3, 4]),
        ([[[1, 2], [4, 9]], [[2, 1], [3, 3]], [], [], []], [0, 1], [0, 2, inf, inf, inf], 20, 3, [0], [0, 1, 2, 3, 4]),
        ([[[1, 1]], [[2, 1]], [[3, 1]], [[4, 1]], []], [0], [0, inf, inf, inf, inf], 3, 4, [], [0, 1, 2]),
    ]
    for G, S, D, B, k, P, W in cases:
        graph, d = _lists_to_dicts(G, D)
        got_P, got_W, _ = fr.find_pivots(graph, S, d, B, k)
        assert (got_P, got_W) == (P, W)


def _dijkstra_multi(graph, starts, n):
    dist = [math.inf] * n
    heap = [(d0, s) for s, d0 in starts.items()]
    for s, d0 in starts.items():
        dist[s] = min(dist[s], d0)
    heapq.heapify(heap)
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in graph.get(u, []):
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (d + w, v))
    return dist


def test_find_pivots_lemma_3_2_on_random_graphs():
    """Duan et al. (2025), Lemma 3.2: every vertex x with d(x) < B whose shortest path starts in S is either
    complete in W, or its shortest path passes through a pivot; and |P| <= |W| / k when P != S."""
    rng = random.Random(39)
    checked_normal_exit = 0
    for _ in range(250):
        n = rng.randint(3, 14)
        graph = {u: [(v, rng.randint(1, 40)) for v in range(n) if v != u and rng.random() < 0.25] for u in range(n)}
        S = rng.sample(range(n), rng.randint(1, 3))
        offsets = {s: rng.randint(0, 10) for s in S}
        true = _dijkstra_multi(graph, offsets, n)  # every shortest path starts at some vertex of S
        d = {s: true[s] for s in S}  # S is complete
        for v in range(n):
            if v not in S and true[v] < math.inf and rng.random() < 0.2:
                d[v] = true[v]  # earlier work may have finished some vertices
        B = rng.randint(max(true[s] for s in S) + 1, 120)
        k = rng.randint(2, 4)
        P, W, d_after = fr.find_pivots(graph, S, d, B, k)
        assert set(S) <= set(W) and set(P) <= set(S)
        assert all(d_after.get(v, math.inf) >= true[v] for v in range(n))  # estimates stay upper bounds
        if P != sorted(S):
            checked_normal_exit += 1
            assert len(P) * k <= len(W) <= k * len(S)
        from_pivot = {y: _dijkstra_multi(graph, {y: true[y]}, n) for y in P}
        for x in range(n):
            if true[x] < B:
                complete_in_W = x in W and d_after.get(x) == true[x]
                via_pivot = any(from_pivot[y][x] == true[x] for y in P)
                assert complete_in_W or via_pivot, (graph, S, d, B, k, x)
    assert checked_normal_exit > 20
