/* =====================================================================
   Algorithm Forge — Raft core (no DOM)
   ---------------------------------------------------------------------
   A deterministic discrete-event simulation of Raft leader election and
   log replication, following Figure 2 of D. Ongaro and J. Ousterhout,
   "In Search of an Understandable Consensus Algorithm", USENIX ATC 2014:
     - persistent state: currentTerm, votedFor, log[]
     - volatile state: commitIndex; leaders: nextIndex[], matchIndex[]
     - RequestVote with the election restriction (§5.4.1: grant only to a
       candidate whose log is at least as up-to-date)
     - AppendEntries with the consistency check on (prevLogIndex,
       prevLogTerm), conflict truncation, and
       commitIndex = min(leaderCommit, index of last new entry)
     - leaders commit only entries of their own term by counting
       replicas (§5.4.2); a failed AppendEntries makes nextIndex back up
     - randomized election timeouts in [150, 300] ms (§5.2)
   The whole state is a plain object (cloneable), including the random
   generator, so the UI can snapshot every frame and branch the timeline.
   Times are integer milliseconds, quantized to 5 ms.
   ===================================================================== */
(function (root) {
  "use strict";

  const Q = 5;                       // time quantum (ms)
  const qz = (x) => Math.max(Q, Math.round(x / Q) * Q);
  const nm = (i) => "S" + (i + 1);
  const KEYS = ["x", "y", "z", "w", "v", "u"];

  function rand(st) {                // mulberry32 with the state stored in st.rs
    st.rs = (st.rs + 0x6d2b79f5) >>> 0;
    let t = st.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const lastIndex = (s) => s.log.length;
  const lastTerm = (s) => (s.log.length ? s.log[s.log.length - 1].term : 0);
  const termAt = (s, i) => (i <= 0 ? 0 : s.log[i - 1] ? s.log[i - 1].term : -1);
  const linkKey = (a, b) => (a < b ? a + "-" + b : b + "-" + a);
  const majority = (st) => Math.floor(st.n / 2) + 1;

  function create(opts) {
    opts = opts || {};
    const n = opts.n || 5;
    const st = {
      n, t: 0, rs: (opts.seed >>> 0) || 1, seed: opts.seed || 1,
      cfg: { hb: 50, tmin: 150, tmax: 300, drop: opts.drop || 0 },
      lat: [], cut: {}, msgs: [], nextId: 1, nextCmd: 1, pending: [],
      script: (opts.script || []).slice().sort((a, b) => a.at - b.at),
      stats: { sent: 0, lost: 0, elections: 0, leaders: {}, committed: 0 },
      committed: {},               // index -> {term, cmd}: every entry ever committed (for the safety checks)
      violations: [],
      servers: [],
    };
    for (let i = 0; i < n; i++) { st.lat.push(new Array(n).fill(0)); }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const v = opts.lat && opts.lat[linkKey(i, j)] ? opts.lat[linkKey(i, j)] : 20 + Q * Math.floor(rand(st) * 5);
      st.lat[i][j] = st.lat[j][i] = v;
    }
    for (let i = 0; i < n; i++) {
      const s = { id: i, up: true, role: "follower", term: 0, votedFor: null, log: [], commitIndex: 0,
        deadline: 0, timerSet: 0, votes: [], nextIndex: new Array(n).fill(1), matchIndex: new Array(n).fill(0), hbDue: 0, leaderId: null };
      st.servers.push(s);
      if (opts.deadlines && opts.deadlines[i] != null) { s.deadline = opts.deadlines[i]; s.timerSet = 0; } else resetTimer(st, s);
    }
    return st;
  }

  function resetTimer(st, s) {
    s.timerSet = st.t;
    s.deadline = st.t + qz(st.cfg.tmin + rand(st) * (st.cfg.tmax - st.cfg.tmin));
  }

  function send(st, from, to, type, body) {
    const m = Object.assign({ id: st.nextId++, type, from, to, sent: st.t, arrive: st.t + st.lat[from][to] }, body);
    st.stats.sent++;
    if (st.cut[linkKey(from, to)]) { m.doomed = "cut"; }
    else if (st.cfg.drop > 0 && rand(st) < st.cfg.drop) { m.doomed = "drop"; }
    if (m.doomed) m.dieAt = m.sent + Math.max(Q, Math.floor((m.arrive - m.sent) / 2 / Q) * Q);
    st.msgs.push(m);
    return m;
  }

  function stepDown(st, s, term, ev) {
    const was = s.role;
    if (term > s.term) { s.term = term; s.votedFor = null; }
    if (s.role !== "follower") {
      s.role = "follower"; s.votes = [];
      if (ev) ev.push({ kind: "stepdown", s: s.id, was, term: s.term, code: ["lead", [14]],
        text: `${nm(s.id)} sees term ${term} and steps down from ${was} to follower: a newer term always wins.` });
      if (was === "leader") resetTimer(st, s);
    }
  }

  function startElection(st, s, ev) {
    const again = s.role === "candidate";
    s.term++;
    s.role = "candidate"; s.votedFor = s.id; s.votes = [s.id]; s.leaderId = null;
    resetTimer(st, s);
    st.stats.elections++;
    for (let r = 0; r < st.n; r++) if (r !== s.id) send(st, s.id, r, "RV", { term: s.term, lastIndex: lastIndex(s), lastTerm: lastTerm(s) });
    ev.push({ kind: "timeout", s: s.id, term: s.term, again, code: ["elect", [0, 1, 2, 3, 4, 5]],
      text: again
        ? `${nm(s.id)}'s election for term ${s.term - 1} timed out without a winner (a split vote, or lost messages). It starts again: <b>term ${s.term}</b>, votes for itself, and sends RequestVote to everyone. Its new random timeout makes another tie unlikely.`
        : `${nm(s.id)} heard from no leader before its random timeout, so it becomes a <b>candidate for term ${s.term}</b>: it votes for itself and sends RequestVote (with its last log entry: index ${lastIndex(s)}, term ${lastTerm(s)}) to the other ${st.n - 1} servers.` });
  }

  function becomeLeader(st, L, ev) {
    L.role = "leader"; L.leaderId = L.id; L.votes = [];
    for (let i = 0; i < st.n; i++) { L.nextIndex[i] = lastIndex(L) + 1; L.matchIndex[i] = 0; }
    L.matchIndex[L.id] = lastIndex(L);
    (st.stats.leaders[L.term] = st.stats.leaders[L.term] || []).push(L.id);
    if (st.stats.leaders[L.term].length > 1) st.violations.push(`Election Safety: two leaders in term ${L.term}`);
    ev.push({ kind: "leader", s: L.id, term: L.term, code: ["lead", [0, 1, 2]],
      text: `${nm(L.id)} has votes from a majority (${majority(st)} of ${st.n}): it is the <b>leader for term ${L.term}</b>. It sets nextIndex = ${lastIndex(L) + 1} for every follower and immediately sends heartbeats (empty AppendEntries) to stop new elections.` });
    for (let f = 0; f < st.n; f++) if (f !== L.id) sendAppend(st, L, f);
    L.hbDue = st.t + st.cfg.hb;
    // clients that were waiting for a leader retry now
    const waiting = st.pending.splice(0);
    waiting.forEach((cmd) => clientToLeader(st, L, cmd, ev, true));
  }

  function sendAppend(st, L, f) {
    const prev = L.nextIndex[f] - 1;
    return send(st, L.id, f, "AE", { term: L.term, prevIndex: prev, prevTerm: termAt(L, prev),
      entries: L.log.slice(prev).map((e) => ({ term: e.term, cmd: e.cmd })), leaderCommit: L.commitIndex });
  }

  function clientToLeader(st, L, cmd, ev, retry, pre) {
    L.log.push({ term: L.term, cmd });
    L.matchIndex[L.id] = lastIndex(L);
    ev.push({ kind: "client", s: L.id, cmd, index: lastIndex(L), code: ["lead", [4, 5, 6]],
      text: `${retry ? "The waiting client retries: it sends " : (pre || "") + "a client sends "}<b>${cmd}</b> to leader ${nm(L.id)}, which appends it at index ${lastIndex(L)} (term ${L.term}) and sends AppendEntries to every follower. It is <i>not</i> committed yet.` });
    for (let f = 0; f < st.n; f++) if (f !== L.id) sendAppend(st, L, f);
  }

  function advanceCommit(st, L, ev) {
    const maj = majority(st);
    for (let N = lastIndex(L); N > L.commitIndex; N--) {
      let cnt = 0;
      for (let i = 0; i < st.n; i++) if (i === L.id || L.matchIndex[i] >= N) cnt++;
      if (cnt >= maj && termAt(L, N) === L.term) {
        const old = L.commitIndex;
        L.commitIndex = N;
        recordCommitted(st, L, old, N);
        ev.push({ kind: "commit", s: L.id, from: old + 1, to: N, cnt, code: ["lead", [17, 18]],
          text: `Index ${N} is now stored on ${cnt} of ${st.n} servers, a majority, and it is from the leader's own term ${L.term}: ${nm(L.id)} <b>commits</b> ${N > old + 1 ? `indices ${old + 1}–${N}` : `index ${N}`}. Committed entries are applied to the state machine and will never be lost.` });
        return true;
      }
      if (cnt >= maj && termAt(L, N) !== L.term && !ev.some((e) => e.kind === "oldterm")) {
        ev.push({ kind: "oldterm", s: L.id, index: N, code: ["lead", [17]],
          text: `Index ${N} is on a majority, but it is from term ${termAt(L, N)}, not the current term ${L.term}. Raft does not commit it by counting replicas (the paper's Figure 8 shows why that would be unsafe); it will be committed together with the first entry of term ${L.term}.` });
      }
    }
    return false;
  }
  function recordCommitted(st, s, from, to) {
    for (let i = from + 1; i <= to; i++) {
      const e = s.log[i - 1];
      const prev = st.committed[i];
      if (!prev) { st.committed[i] = { term: e.term, cmd: e.cmd }; st.stats.committed = Math.max(st.stats.committed, i); }
      else if (prev.term !== e.term || prev.cmd !== e.cmd) st.violations.push(`State Machine Safety: two different entries committed at index ${i}`);
    }
  }

  /* ---------------- message handlers ---------------- */
  function onRV(st, r, m, ev) {
    if (m.term > r.term) stepDown(st, r, m.term, ev);
    const upToDate = m.lastTerm > lastTerm(r) || (m.lastTerm === lastTerm(r) && m.lastIndex >= lastIndex(r));
    let reason = "";
    if (m.term < r.term) reason = "stale";
    else if (r.votedFor !== null && r.votedFor !== m.from) reason = "voted";
    else if (!upToDate) reason = "log";
    const granted = !reason;
    if (granted) { r.votedFor = m.from; resetTimer(st, r); }
    send(st, r.id, m.from, "RVR", { term: r.term, granted, reason });
    const who = `${nm(r.id)} gets ${nm(m.from)}'s RequestVote for term ${m.term}`;
    const text = granted ? `${who}: it has not voted for anyone else in term ${r.term} and the candidate's log (last entry term ${m.lastTerm}, index ${m.lastIndex}) is at least as up-to-date as its own (term ${lastTerm(r)}, index ${lastIndex(r)}), so it <b>grants its vote</b> and resets its timer.`
      : reason === "stale" ? `${who}, but it is already in term ${r.term}: the request is stale, so it refuses.`
        : reason === "voted" ? (r.votedFor === r.id ? `${who}, but it is a candidate in this term too and already voted for itself (one vote per term), so it refuses.` : `${who}, but it already voted for ${nm(r.votedFor)} in this term (one vote per term), so it refuses.`)
          : `${who} and <b>refuses</b>: the candidate's log ends with (term ${m.lastTerm}, index ${m.lastIndex}) but its own ends with (term ${lastTerm(r)}, index ${lastIndex(r)}), which is more up-to-date. This <b>election restriction</b> keeps a server that may lack committed entries from becoming leader.`;
    ev.push({ kind: "rv", s: r.id, c: m.from, granted, reason, term: m.term, mLastTerm: m.lastTerm, mLastIndex: m.lastIndex, rLastTerm: lastTerm(r), rLastIndex: lastIndex(r), code: ["elect", granted ? [7, 8, 9, 10, 11, 12, 13] : [7, 8, 9, 10, 11, 14]], text });
  }

  function onRVR(st, c, m, ev) {
    if (m.term > c.term) { stepDown(st, c, m.term, ev); return; }
    if (c.role !== "candidate" || m.term !== c.term) {
      ev.push({ kind: "rvr-late", s: c.id, group: "late", code: ["elect", [16, 17, 18]], text: `${nm(c.id)} ignores a late vote reply from ${nm(m.from)} (it is no longer a candidate in that term).` });
      return;
    }
    if (m.granted && !c.votes.includes(m.from)) c.votes.push(m.from);
    ev.push({ kind: "rvr", s: c.id, v: m.from, granted: m.granted, code: ["elect", m.granted ? [16, 17, 18, 19] : [16, 17, 18]],
      text: m.granted ? `${nm(c.id)} receives a vote from ${nm(m.from)}: ${c.votes.length} of the ${majority(st)} it needs.` : `${nm(c.id)} is refused by ${nm(m.from)}.` });
    if (c.votes.length >= majority(st)) becomeLeader(st, c, ev);
  }

  function onAE(st, f, m, ev) {
    if (m.term < f.term) {
      send(st, f.id, m.from, "AER", { term: f.term, success: false, reason: "stale", prevIndex: m.prevIndex, matchIndex: 0 });
      ev.push({ kind: "ae", s: f.id, l: m.from, ok: false, reason: "stale", prevIndex: m.prevIndex, prevTerm: m.prevTerm, term: m.term, code: ["follow", [0, 1]],
        text: `${nm(f.id)} rejects AppendEntries from ${nm(m.from)}: it carries term ${m.term} but ${nm(f.id)} is already in term ${f.term}. Its reply tells the old leader about the newer term.` });
      return;
    }
    const wasRole = f.role;
    if (m.term > f.term) { f.term = m.term; f.votedFor = null; }
    if (f.role !== "follower") { f.role = "follower"; f.votes = []; }
    f.leaderId = m.from;
    resetTimer(st, f);
    const lead = wasRole === "candidate" ? ` (${nm(f.id)} was a candidate; a leader for this term exists, so it becomes a follower)` : "";
    if (m.prevIndex > lastIndex(f)) {
      send(st, f.id, m.from, "AER", { term: f.term, success: false, reason: "gap", prevIndex: m.prevIndex, matchIndex: 0 });
      ev.push({ kind: "ae", s: f.id, l: m.from, ok: false, reason: "gap", prevIndex: m.prevIndex, prevTerm: m.prevTerm, term: m.term, code: ["follow", [0, 1, 2, 3]],
        text: `${nm(f.id)} refuses AppendEntries from ${nm(m.from)}: the leader says the new entries follow index ${m.prevIndex}, but ${nm(f.id)}'s log has only ${lastIndex(f)} entr${lastIndex(f) === 1 ? "y" : "ies"}, a <b>gap</b>. The leader will back up and retry.${lead}` });
      return;
    }
    if (termAt(f, m.prevIndex) !== m.prevTerm) {
      send(st, f.id, m.from, "AER", { term: f.term, success: false, reason: "conflict", prevIndex: m.prevIndex, matchIndex: 0 });
      ev.push({ kind: "ae", s: f.id, l: m.from, ok: false, reason: "conflict", prevIndex: m.prevIndex, prevTerm: m.prevTerm, term: m.term, code: ["follow", [0, 1, 2, 3, 4]],
        text: `${nm(f.id)} refuses AppendEntries from ${nm(m.from)}: its entry ${m.prevIndex} has term ${termAt(f, m.prevIndex)}, but the leader's has term ${m.prevTerm}. The logs <b>disagree at that index</b>, so (by Log Matching) they may disagree before it too. The leader will back up and retry.${lead}` });
      return;
    }
    let cut = 0, added = 0;
    m.entries.forEach((e, k) => {
      const i = m.prevIndex + 1 + k;
      if (i <= lastIndex(f) && f.log[i - 1].term !== e.term) { cut += lastIndex(f) - i + 1; f.log.length = i - 1; }
      if (i > lastIndex(f)) { f.log.push({ term: e.term, cmd: e.cmd }); added++; }
    });
    const oldC = f.commitIndex;
    if (m.leaderCommit > f.commitIndex) f.commitIndex = Math.min(m.leaderCommit, m.prevIndex + m.entries.length);
    const match = m.prevIndex + m.entries.length;
    send(st, f.id, m.from, "AER", { term: f.term, success: true, prevIndex: m.prevIndex, matchIndex: match });
    const lines = [0, 1, 2, 3, 4].concat(m.entries.length ? [5, 6, 8] : [], cut ? [7] : [], f.commitIndex > oldC ? [9, 10] : [], [11]);
    const trivial = !m.entries.length && f.commitIndex === oldC && !lead;
    ev.push({ kind: "ae", s: f.id, l: m.from, ok: true, trivial, cut, added, prevIndex: m.prevIndex, prevTerm: m.prevTerm, nEntries: m.entries.length, code: ["follow", lines], group: trivial ? "hb" : null,
      text: trivial ? null : `${nm(f.id)} accepts AppendEntries from ${nm(m.from)}: its entry ${m.prevIndex} ${m.prevIndex ? `has term ${m.prevTerm}, as the leader expects` : "is the empty start of the log"}` +
        (cut ? `, but later entries conflict, so it <b>deletes ${cut} conflicting entr${cut === 1 ? "y" : "ies"}</b> (they were never committed)` : "") +
        (added ? `, and appends ${added} entr${added === 1 ? "y" : "ies"}` : m.entries.length ? ", and already has every entry sent" : " (a heartbeat)") +
        (f.commitIndex > oldC ? `; the leader's commit index lets it commit up to index ${f.commitIndex}` : "") + `.${lead}` });
    if (f.commitIndex > oldC) recordCommitted(st, f, oldC, f.commitIndex);
  }

  function onAER(st, L, m, ev) {
    if (m.term > L.term) { stepDown(st, L, m.term, ev); return; }
    if (L.role !== "leader" || m.term !== L.term) return;
    const f = m.from;
    if (m.success) {
      const before = L.matchIndex[f];
      L.matchIndex[f] = Math.max(L.matchIndex[f], m.matchIndex);
      L.nextIndex[f] = L.matchIndex[f] + 1;
      const moved = L.matchIndex[f] > before;
      ev.push({ kind: "aer", s: L.id, f, ok: true, trivial: !moved, group: moved ? null : "ack", code: ["lead", [13, 15, 16]],
        text: moved ? `${nm(L.id)} learns that ${nm(f)} stores its log up to index ${L.matchIndex[f]} (matchIndex[${nm(f)}] = ${L.matchIndex[f]}, nextIndex = ${L.nextIndex[f]}).` : null });
      advanceCommit(st, L, ev);
    } else {
      const before = L.nextIndex[f];
      L.nextIndex[f] = Math.max(1, Math.min(L.nextIndex[f], m.prevIndex));
      ev.push({ kind: "aer", s: L.id, f, ok: false, code: ["lead", [13, 19, 20]],
        text: before === L.nextIndex[f] ? `${nm(f)} refused an older request (prevIndex ${m.prevIndex}); nextIndex[${nm(f)}] is already ${L.nextIndex[f]}, so ${nm(L.id)} simply retries.` : `${nm(f)} refused (${m.reason === "gap" ? "gap" : "conflict"} at index ${m.prevIndex}), so ${nm(L.id)} <b>backs up</b>: nextIndex[${nm(f)}] = ${L.nextIndex[f]}, and retries at once with prevIndex = ${L.nextIndex[f] - 1}.` });
      sendAppend(st, L, f);
    }
  }

  /* ---------------- the event loop ---------------- */
  function nextTime(st) {
    let T = Infinity;
    for (const m of st.msgs) T = Math.min(T, m.doomed ? m.dieAt : m.arrive);
    for (const s of st.servers) {
      if (!s.up) continue;
      T = Math.min(T, s.role === "leader" ? s.hbDue : s.deadline);
    }
    if (st.script.length) T = Math.min(T, st.script[0].at);
    return T;
  }

  /** Advance to the next moment something happens; process everything at that moment. Returns the events. */
  function step(st) {
    const T = nextTime(st);
    if (!Number.isFinite(T)) return [];
    st.t = T;
    const ev = [];
    while (st.script.length && st.script[0].at === T) ev.push(...action(st, st.script.shift(), true));
    const due = st.msgs.filter((m) => (m.doomed ? m.dieAt : m.arrive) === T).sort((a, b) => a.id - b.id);
    st.msgs = st.msgs.filter((m) => (m.doomed ? m.dieAt : m.arrive) !== T);
    for (const m of due) {
      const r = st.servers[m.to];
      if (m.doomed || st.cut[linkKey(m.from, m.to)]) {
        st.stats.lost++;
        ev.push({ kind: "lost", group: "lost", m: msgLabel(m), text: `${msgLabel(m)} is lost (${m.doomed === "drop" ? "dropped by the network" : "the link is cut"}).` });
        continue;
      }
      if (!r.up) { st.stats.lost++; ev.push({ kind: "lost", group: "lost", m: msgLabel(m), text: `${msgLabel(m)} reaches ${nm(r.id)}, which is down: lost.` }); continue; }
      if (m.type === "RV") onRV(st, r, m, ev);
      else if (m.type === "RVR") onRVR(st, r, m, ev);
      else if (m.type === "AE") onAE(st, r, m, ev);
      else if (m.type === "AER") onAER(st, r, m, ev);
    }
    for (const s of st.servers) {
      if (!s.up) continue;
      if (s.role === "leader" && s.hbDue === T) {
        for (let f = 0; f < st.n; f++) if (f !== s.id) sendAppend(st, s, f);
        s.hbDue = T + st.cfg.hb;
        ev.push({ kind: "hb", s: s.id, group: "hbsend", code: ["lead", [2, 8, 9, 10, 11]], text: null });
      } else if (s.role !== "leader" && s.deadline === T) startElection(st, s, ev);
    }
    return ev;
  }
  function msgLabel(m) {
    const t = { RV: "RequestVote", RVR: "vote reply", AE: m.entries && m.entries.length ? "AppendEntries" : "heartbeat", AER: "AppendEntries reply" }[m.type];
    return `${t} ${nm(m.from)}→${nm(m.to)}`;
  }

  /** User or script actions. a = {kind, s?, target?, a?, b?, msg?}. */
  function action(st, a, scripted) {
    const ev = [];
    const pre = scripted ? "Scenario: " : "You: ";
    if (a.kind === "client") {
      const cmd = KEYS[(st.nextCmd - 1) % KEYS.length] + "=" + st.nextCmd;
      st.nextCmd++;
      let L = null;
      if (a.target == null || a.target === "auto") {
        st.servers.forEach((s) => { if (s.up && s.role === "leader" && (!L || s.term > L.term)) L = s; });
        if (!L) { st.pending.push(cmd); ev.push({ kind: "client-wait", text: `${pre}a client wants to run <b>${cmd}</b>, but no server is leader right now. It waits and retries when a leader appears.` }); return ev; }
      } else {
        L = st.servers[a.target];
        if (!L.up) { ev.push({ kind: "client-fail", text: `${pre}a client sends <b>${cmd}</b> to ${nm(L.id)}, which is down: no answer.` }); return ev; }
        if (L.role !== "leader") { ev.push({ kind: "client-fail", text: `${pre}a client sends <b>${cmd}</b> to ${nm(L.id)}, which is a ${L.role}, not the leader: it refuses${L.leaderId != null ? ` and points the client to ${nm(L.leaderId)}` : ""}.` }); return ev; }
      }
      clientToLeader(st, L, cmd, ev, false, pre);
    } else if (a.kind === "crash" || (a.kind === "crashLeader")) {
      let s = a.kind === "crash" ? st.servers[a.s] : null;
      if (a.kind === "crashLeader") st.servers.forEach((x) => { if (x.up && x.role === "leader" && (!s || x.term > s.term)) s = x; });
      if (!s || !s.up) return ev;
      const was = s.role;
      s.up = false; s.role = "follower"; s.votes = []; s.commitIndex = 0; s.leaderId = null;
      ev.push({ kind: "crash", s: s.id, text: `${pre}<b>${nm(s.id)} crashes</b>${was === "leader" ? " (it was the leader)" : ""}. Its term, vote and log survive on disk; its commit index and leader bookkeeping are lost.` });
    } else if (a.kind === "restart" || a.kind === "restartAll") {
      (a.kind === "restart" ? [st.servers[a.s]] : st.servers.filter((x) => !x.up)).forEach((s) => {
        if (s.up) return;
        s.up = true; s.role = "follower"; resetTimer(st, s);
        ev.push({ kind: "restart", s: s.id, text: `${pre}<b>${nm(s.id)} restarts</b> as a follower in term ${s.term} with its ${lastIndex(s)}-entry log, and starts a fresh election timer.` });
      });
    } else if (a.kind === "cut" || a.kind === "uncut") {
      const pairs = a.pairs || [[a.a, a.b]];
      pairs.forEach(([x, y]) => { if (a.kind === "cut") st.cut[linkKey(x, y)] = true; else delete st.cut[linkKey(x, y)]; });
      ev.push({ kind: a.kind, text: a.text ? pre + a.text : `${pre}${a.kind === "cut" ? "cut" : "restored"} the link${pairs.length > 1 ? "s" : ""} ${pairs.map(([x, y]) => nm(x) + "–" + nm(y)).join(", ")}.` });
    } else if (a.kind === "heal") {
      st.cut = {};
      ev.push({ kind: "heal", text: `${pre}the network <b>heals</b>: every link works again.` });
    } else if (a.kind === "drop") {
      const k = st.msgs.findIndex((m) => m.id === a.msg);
      if (k < 0) return ev;
      const m = st.msgs[k];
      st.msgs.splice(k, 1); st.stats.lost++;
      ev.push({ kind: "lost", text: `${pre}dropped the ${msgLabel(m)}.` });
    } else if (a.kind === "droprate") {
      st.cfg.drop = a.p;
      ev.push({ kind: "note", text: `${pre}the network now drops ${Math.round(a.p * 100)}% of messages at random.` });
    }
    return ev;
  }

  /* ---------------- safety checks ---------------- */
  function checks(st) {
    const out = { electionSafety: true, logMatching: true, leaderCompleteness: true, stateMachine: true, details: [] };
    for (const t in st.stats.leaders) if (st.stats.leaders[t].length > 1) out.electionSafety = false;
    const S = st.servers;
    for (let a = 0; a < S.length; a++) for (let b = a + 1; b < S.length; b++) {
      const A = S[a].log, B = S[b].log, n = Math.min(A.length, B.length);
      let lastSame = 0;
      for (let i = n; i >= 1; i--) if (A[i - 1].term === B[i - 1].term) { lastSame = i; break; }
      for (let i = 1; i <= lastSame; i++) if (A[i - 1].term !== B[i - 1].term || A[i - 1].cmd !== B[i - 1].cmd) out.logMatching = false;
    }
    S.forEach((s) => {
      if (s.role === "leader" && s.up) for (const i in st.committed) {
        const e = s.log[i - 1];
        if (!e || e.term !== st.committed[i].term || e.cmd !== st.committed[i].cmd) out.leaderCompleteness = false;
      }
      for (let i = 1; i <= s.commitIndex; i++) {
        const c = st.committed[i];
        const e = s.log[i - 1];
        if (c && (!e || c.term !== e.term || c.cmd !== e.cmd)) out.stateMachine = false;
      }
    });
    if (st.violations.length) { out.details = st.violations.slice(); if (st.violations.some((v) => v.startsWith("State"))) out.stateMachine = false; }
    return out;
  }

  /* ---------------- scenarios ---------------- */
  const ALL = [0, 1, 2, 3, 4];
  function crossPairs(A, B) { const p = []; A.forEach((a) => B.forEach((b) => p.push([a, b]))); return p; }
  function scenario(name, seed) {
    seed = seed || 1;
    if (name === "normal") return create({ seed: 11, deadlines: [260, 175, 235, 290, 215], script: [
      { at: 450, kind: "client" }, { at: 600, kind: "client" }, { at: 750, kind: "client" }] });
    if (name === "crash") return create({ seed: 11, deadlines: [260, 175, 235, 290, 215], script: [
      { at: 380, kind: "crash", s: 4 }, { at: 450, kind: "client" }, { at: 560, kind: "client" }, { at: 800, kind: "crashLeader" },
      { at: 1300, kind: "client" }, { at: 1420, kind: "client" }, { at: 1650, kind: "restartAll" }] });
    if (name === "split") return create({ seed: 5, deadlines: [150, 290, 155, 295, 160],
      lat: { "0-1": 20, "1-2": 35, "1-4": 40, "3-4": 20, "2-3": 35, "0-3": 40, "0-2": 25, "0-4": 30, "2-4": 25, "1-3": 30 },
      script: [{ at: 900, kind: "client" }, { at: 1000, kind: "client" }] });
    if (name === "partition") return create({ seed: 3, deadlines: [160, 270, 285, 250, 295], script: [
      { at: 400, kind: "client" }, { at: 500, kind: "client" },
      { at: 700, kind: "cut", pairs: crossPairs([0, 1], [2, 3, 4]), text: "the network <b>partitions</b>: {S1, S2} can no longer reach {S3, S4, S5}." },
      { at: 760, kind: "client", target: 0 }, { at: 1250, kind: "client" }, { at: 1350, kind: "client" },
      { at: 1700, kind: "heal" }] });
    return create({ seed });
  }

  const API = { create, step, action, checks, scenario, nextTime, lastIndex, lastTerm, termAt, linkKey, majority, nm, ALL };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.RaftCore = API;
})(typeof window !== "undefined" ? window : globalThis);
