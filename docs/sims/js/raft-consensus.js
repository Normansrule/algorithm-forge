/* =====================================================================
   Algorithm Forge — Raft consensus (UI)
   The protocol lives in raft-consensus-core.js (window.RaftCore).
   Every frame stores a full snapshot of the cluster, so the player can
   scrub backwards; frames are generated ahead of the play head, and any
   user action (crash, cut, drop, client command) truncates the future
   and branches the timeline from the current frame.
   ===================================================================== */
(function () {
  "use strict";
  const R = window.RaftCore;
  Forge.page({ title: "Raft Consensus", chapter: "Ch 18 · The Frontier" });
  const $ = (id) => document.getElementById(id);
  const E = Forge.el;
  const S = (tag, a, ...k) => {
    if (tag === "text" && a && a.fill) { a = Object.assign({}, a); a.style = "fill:" + a.fill + (a.style ? ";" + a.style : ""); delete a.fill; }
    return Forge.svg(tag, a, ...k);
  };
  const clone = (x) => (typeof structuredClone === "function" ? structuredClone(x) : JSON.parse(JSON.stringify(x)));
  const nm = R.nm;
  const reduceMotion = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();
  const CAP = 5000;

  /* ---------------- pseudocode (paper Figure 2, in Forge Pseudocode) ---------------- */
  const LINES = {
    elect: [
      "ALGORITHM OnElectionTimeout(s)    // no leader heard from",
      "    s.term ← s.term + 1",
      "    s.role ← candidate; s.votedFor ← s; votes ← 1",
      "    reset s.timer to random(150, 300) ms",
      "    for each other server r do",
      "        send RequestVote(s.term, lastIndex(s), lastTerm(s)) to r",
      "",
      "ALGORITHM OnRequestVote(r, term, c, cIndex, cTerm)",
      "    if term > r.term then StepDown(r, term)",
      "    upToDate ← cTerm > lastTerm(r) or",
      "        (cTerm = lastTerm(r) and cIndex ≥ lastIndex(r))",
      "    if term = r.term and r.votedFor ∈ {null, c} and upToDate then",
      "        r.votedFor ← c; reset r.timer",
      "        reply (r.term, true)      // vote granted",
      "    else reply (r.term, false)",
      "",
      "ALGORITHM OnVoteReply(c, term, granted)",
      "    if term > c.term then StepDown(c, term)",
      "    else if c is a candidate in term and granted then",
      "        votes ← votes + 1",
      "        if votes ≥ 3 then BecomeLeader(c)   // a majority of 5",
    ],
    lead: [
      "ALGORITHM BecomeLeader(L)",
      "    for each server f do L.nextIndex[f] ← lastIndex(L) + 1",
      "    every 50 ms: SendAppend(L, f) to each follower f   // heartbeat",
      "",
      "ALGORITHM OnClientCommand(L, cmd)",
      "    append (L.term, cmd) to L.log",
      "    for each follower f do SendAppend(L, f)",
      "",
      "ALGORITHM SendAppend(L, f)",
      "    prev ← L.nextIndex[f] - 1",
      "    send AppendEntries(L.term, prev, L.log[prev].term,",
      "        L.log[prev + 1..], L.commitIndex) to f",
      "",
      "ALGORITHM OnAppendReply(L, f, term, success, matchIdx)",
      "    if term > L.term then StepDown(L, term)",
      "    else if success then",
      "        L.matchIndex[f] ← matchIdx; L.nextIndex[f] ← matchIdx + 1",
      "        N ← largest N on a majority with L.log[N].term = L.term",
      "        if N > L.commitIndex then L.commitIndex ← N",
      "    else",
      "        L.nextIndex[f] ← L.nextIndex[f] - 1; SendAppend(L, f)",
    ],
    follow: [
      "ALGORITHM OnAppendEntries(f, m)   // m: the leader's message",
      "    if m.term < f.term then reply (f.term, false); return",
      "    f.term ← m.term; f.role ← follower; reset f.timer",
      "    if m.prevIndex > lastIndex(f) then reply false; return   // gap",
      "    if f.log[m.prevIndex].term ≠ m.prevTerm then reply false; return",
      "    for each entry e of m.entries, at index i do",
      "        if f.log[i] exists and f.log[i].term ≠ e.term then",
      "            delete f.log[i..]        // conflict: drop the suffix",
      "        if f.log[i] does not exist then append e",
      "    if m.leaderCommit > f.commitIndex then",
      "        f.commitIndex ← min(m.leaderCommit, index of last new entry)",
      "    reply (f.term, true)",
    ],
  };

  const INTRO = {
    normal: "Five servers start as followers in term 0 with empty logs. Each waits for a leader until its random election timeout (150–300 ms) runs out; the orange arcs show the timers. S2's is shortest.",
    crash: "Same start as normal operation. Then follower S5 crashes, the leader crashes, and only three servers are left: still a majority of five, so the cluster keeps working. Later both crashed servers restart and catch up.",
    split: "S1, S3 and S5 have nearly equal timeouts (150, 155 and 160 ms), so all three become candidates for term 1 before any RequestVote arrives. Who will get 3 votes?",
    partition: "S1 becomes leader and commits two commands. Then the network splits {S1, S2} from {S3, S4, S5}. Watch what each side can and cannot do, and how the logs are repaired when the network heals.",
    free: "Free play: the seed picks random link latencies (20–40 ms) and election timeouts. Use the buttons, or click servers, links and messages in the picture.",
  };

  /* ---------------- state ---------------- */
  let frames = [];
  let player = null, ctr = null, lastShown = -1, raf = null, curCodeKey = "elect";
  let asked = new Set();
  const codes = FX.codeSwitch($("code"));
  const say = Forge.narrate($("say"));
  const pred = FX.predict($("pred"), () => player);

  function termColor(t) { return t <= 0 ? "var(--panel-2)" : `hsl(${(t * 83 + 205) % 360} 68% 62%)`; }
  function leaderOf(st) {
    let L = null;
    st.servers.forEach((s) => { if (s.up && s.role === "leader" && (!L || s.term > L.term)) L = s; });
    return L;
  }

  /* ---------------- frames ---------------- */
  const PRIORITY = ["leader", "commit", "oldterm", "client", "timeout", "stepdown", "rv", "ae", "aer", "rvr", "hb"];
  function pickCode(ev) {
    for (const k of PRIORITY) {
      const cands = ev.filter((e) => e.kind === k && e.code);
      const e = cands.find((x) => (k === "rv" ? !x.granted : k === "ae" ? !x.ok || !x.trivial : k === "aer" ? !x.trivial : true)) || cands[0];
      if (e) return e.code;
    }
    return null;
  }
  function narrate(ev) {
    const parts = [];
    const groups = { hb: [], ack: [], lost: [], late: [], hbsend: [] };
    ev.forEach((e) => {
      if (e.group && groups[e.group] && !e.text) { groups[e.group].push(e); return; }
      if (e.group === "lost" || e.group === "late") { groups[e.group].push(e); return; }
      if (e.text) parts.push(e.text);
    });
    const shown = parts.slice(0, 4);
    if (parts.length > 4) shown.push(`<span class="muted">…and ${parts.length - 4} more things at this moment.</span>`);
    if (groups.hbsend.length) shown.push(`Leader ${groups.hbsend.map((e) => nm(e.s)).join(", ")} sends AppendEntries to every follower (a heartbeat, carrying any entries a follower is missing).`);
    if (groups.hb.length) shown.push(`${list(groups.hb.map((e) => nm(e.s)))} accept${groups.hb.length === 1 ? "s" : ""} the heartbeat from ${nm(groups.hb[0].l)} and reset${groups.hb.length === 1 ? "s" : ""} the election timer.`);
    if (groups.ack.length) shown.push(`${nm(groups.ack[0].s)} gets success replies from ${list(groups.ack.map((e) => nm(e.f)))}.`);
    if (groups.lost.length) shown.push(groups.lost.length <= 2 ? groups.lost.map((e) => e.text).join(" ") : `${groups.lost.length} messages are lost (${groups.lost.slice(0, 2).map((e) => e.m).join(", ")}, …).`);
    if (groups.late.length) shown.push(groups.late[0].text);
    return shown.map((s) => `<p style="margin:0 0 6px">${s}</p>`).join("");
  }
  const list = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

  function pushFrame(st, ev, intro) {
    const prev = frames[frames.length - 1];
    const f = { t: st.t, st: clone(st), ev, code: pickCode(ev), text: intro || narrate(ev) };
    attachAsks(f, prev, ev);
    frames.push(f);
  }

  function attachAsks(f, P, ev) {
    // never put questions on two consecutive frames (the Predict panel keeps the previous answer text)
    const PP = frames[frames.length - 2];
    const free = P && !P.ask && P !== frames[lastShown] && !(PP && PP.ask);
    const tm = ev.find((e) => e.kind === "timeout" && !e.again);
    if (tm && !asked.has("votes") && !(P && P.ask)) {
      asked.add("votes");
      f.ask = { q: `${nm(tm.s)} just started an election for term ${tm.term}. How many votes, counting its own, does it need to become leader?`, opts: ["2", "3", "4", "5"], ans: 1,
        why: "A majority of the 5 servers: 3. Any two majorities share at least one server, and a server votes only once per term, so two candidates can never both win the same term. That is Election Safety." };
      f.askKind = "votes";
      return;
    }
    if (!free) return;
    const rvLog = ev.find((e) => e.kind === "rv" && !e.granted && e.reason === "log");
    if (rvLog && !asked.has("grant")) {
      asked.add("grant");
      P.ask = { q: `${nm(rvLog.c)}'s RequestVote for term ${rvLog.term} is about to reach ${nm(rvLog.s)}. The candidate's log ends with (term ${rvLog.mLastTerm}, index ${rvLog.mLastIndex}); ${nm(rvLog.s)}'s ends with (term ${rvLog.rLastTerm}, index ${rvLog.rLastIndex}). Will ${nm(rvLog.s)} grant its vote?`, opts: ["Yes", "No"], ans: 1,
        why: `No. Raft's election restriction: vote only for a candidate whose log is at least as up-to-date as yours (a later last term, or the same last term and at least as long). ${nm(rvLog.s)}'s log is more up-to-date, so the candidate might be missing committed entries and must not lead.` };
      P.askKind = "grant";
      return;
    }
    const rvOk = ev.find((e) => e.kind === "rv" && e.granted);
    if (rvOk && !asked.has("grantYes")) {
      asked.add("grantYes");
      P.ask = { q: `${nm(rvOk.c)}'s RequestVote for term ${rvOk.term} is about to reach ${nm(rvOk.s)}, which has not voted in term ${rvOk.term}. The candidate's log ends with (term ${rvOk.mLastTerm}, index ${rvOk.mLastIndex}); ${nm(rvOk.s)}'s ends with (term ${rvOk.rLastTerm}, index ${rvOk.rLastIndex}). Will ${nm(rvOk.s)} grant its vote?`, opts: ["Yes", "No"], ans: 0,
        why: "Yes: it has not voted yet in this term and the candidate's log is at least as up-to-date as its own. Granting a vote also resets its election timer, so it will not compete." };
      P.askKind = "grantYes";
      return;
    }
    const aeBad = ev.find((e) => e.kind === "ae" && !e.ok && (e.reason === "gap" || e.reason === "conflict"));
    if (aeBad && !asked.has("ae")) {
      asked.add("ae");
      const fs = P.st.servers[aeBad.s];
      const have = fs.log.length, tAt = aeBad.prevIndex >= 1 && aeBad.prevIndex <= have ? fs.log[aeBad.prevIndex - 1].term : null;
      P.ask = { q: `${nm(aeBad.l)} sends ${nm(aeBad.s)} AppendEntries with prevIndex = ${aeBad.prevIndex}, prevTerm = ${aeBad.prevTerm}. ${nm(aeBad.s)}'s log has ${have} entr${have === 1 ? "y" : "ies"}${tAt != null ? ` and entry ${aeBad.prevIndex} has term ${tAt}` : ""}. What does ${nm(aeBad.s)} answer?`,
        opts: ["Accept and append", "Refuse: gap", "Refuse: conflict at prevIndex"], ans: aeBad.reason === "gap" ? 1 : 2,
        why: aeBad.reason === "gap" ? `It has no entry ${aeBad.prevIndex} at all, so it cannot check that the logs match there. It refuses, and the leader decrements nextIndex and retries one entry earlier.` : `Entry ${aeBad.prevIndex} exists but has a different term, so the logs diverged at or before it. It refuses; the leader backs up until it finds the last matching entry, then overwrites everything after it.` };
      P.askKind = "ae";
      return;
    }
    const cm = ev.find((e) => e.kind === "commit");
    const aerOk = ev.find((e) => e.kind === "aer" && e.ok && !e.trivial);
    if (cm && aerOk && !asked.has("commit")) {
      asked.add("commit");
      const L = P.st.servers[cm.s];
      let cnt = 0;
      for (let i = 0; i < L.matchIndex.length; i++) if (i === L.id || L.matchIndex[i] >= cm.to) cnt++;
      P.ask = { q: `Leader ${nm(cm.s)} is about to hear that ${nm(aerOk.f)} stored index ${cm.to}. Right now index ${cm.to} is known to be on ${cnt} of 5 servers (counting the leader). Will the leader commit index ${cm.to} when this reply arrives?`, opts: ["Yes", "No, it must wait for all 5", "No, followers commit first"], ans: 0,
        why: `${cnt} + 1 = ${cnt + 1} servers is a majority of 5, and the entry is from the leader's own term, so it is committed. Any future leader must get votes from a majority, which overlaps this one, and the election restriction then guarantees it holds the entry.` };
      P.askKind = "commit";
    }
  }

  function extend(ahead, at) {
    while (frames.length < CAP && frames.length - 1 - at < ahead) {
      const s = clone(frames[frames.length - 1].st);
      if (!Number.isFinite(R.nextTime(s))) break;
      const ev = R.step(s);
      pushFrame(s, ev);
    }
  }

  function load() {
    const name = $("scen").value;
    $("seedField").hidden = name !== "free";
    const st = R.scenario(name, Math.max(1, +$("seed").value || 1));
    st.cfg.drop = +$("drop").value;
    frames.length = 0;
    asked = new Set();
    lastShown = -1;
    pushFrame(st, [], `<p style="margin:0">${INTRO[name]}</p>`);
    frames[0].code = ["elect", []];
    extend(120, 0);
    pred.reset();
    if (!player) player = Forge.player($("player"), { frames, render, fps: 5 });
    else player.load(frames);
  }

  /* ---------------- branching actions ---------------- */
  function act(a) {
    if (!player || !frames.length) return;
    const i = player.index;
    const s = clone(frames[i].st);
    const ev = R.action(s, a, false);
    if (!ev.length) return;
    frames.length = i + 1;
    asked = new Set(frames.filter((f) => f.askKind).map((f) => f.askKind));
    pushFrame(s, ev);
    extend(120, i + 1);
    pred.reset();
    player.go(i + 1);
  }

  /* ---------------- drawing: the ring ---------------- */
  const RW = 480, RH = 460, CX = 240, CY = 232, RR = 160, NR = 30;
  const P = [0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + (2 * Math.PI * k) / 5; return { x: CX + RR * Math.cos(a), y: CY + RR * Math.sin(a), a }; });
  function arc(cx, cy, r, frac) {
    frac = Math.max(0, Math.min(0.9999, frac));
    const a0 = -Math.PI / 2, a1 = a0 + 2 * Math.PI * frac;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  function drawRing(st, tau) {
    const svg = $("ring");
    svg.setAttribute("viewBox", `0 0 ${RW} ${RH}`);
    svg.innerHTML = "";
    svg.appendChild(S("text", { x: 8, y: 18, "font-size": 13, fill: "var(--muted)" }, `t = ${Math.round(tau)} ms`));
    const L = leaderOf(st);
    svg.appendChild(S("text", { x: RW - 8, y: 18, "text-anchor": "end", "font-size": 13, fill: "var(--muted)" }, L ? `leader ${nm(L.id)} · term ${L.term}` : "no leader"));
    // links
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
      const cut = !!st.cut[R.linkKey(i, j)];
      const a = P[i], b = P[j];
      svg.appendChild(S("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: cut ? "var(--c-swap)" : "var(--line-2)", "stroke-width": cut ? 2 : 1.5, "stroke-dasharray": cut ? "6 5" : null }));
      if (cut) svg.appendChild(S("text", { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 5, "text-anchor": "middle", "font-size": 15, fill: "var(--c-swap)" }, "✂"));
      svg.appendChild(S("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "transparent", "stroke-width": 16, "data-act": "link", "data-a": i, "data-b": j },
        S("title", null, `${nm(i)}–${nm(j)}: ${st.lat[i][j]} ms${cut ? " (cut). Click to restore." : ". Click to cut."}`)));
    }
    // messages
    st.msgs.forEach((m) => {
      const end = m.doomed ? m.dieAt : m.arrive;
      if (tau > end || tau < m.sent) return;
      const a = P[m.from], b = P[m.to];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      const pr = (tau - m.sent) / Math.max(1, m.arrive - m.sent);
      const x0 = a.x + ux * NR, y0 = a.y + uy * NR, x1 = b.x - ux * NR, y1 = b.y - uy * NR;
      const off = 6;
      const x = x0 + (x1 - x0) * pr - uy * off, y = y0 + (y1 - y0) * pr + ux * off;
      let r = 6, fill = "var(--c-compare)", stroke = "none", sw = 0;
      if (m.type === "RVR") { r = 4.5; fill = m.granted ? "var(--c-done)" : "var(--c-swap)"; }
      else if (m.type === "AE") { if (m.entries.length) { r = 7; fill = "var(--steel)"; } else { r = 5.5; fill = "var(--bg-2)"; stroke = "var(--steel)"; sw = 2.5; } }
      else if (m.type === "AER") { r = 4; fill = m.success ? "var(--c-done)" : "var(--c-swap)"; stroke = "var(--steel)"; sw = 1.5; }
      const g = S("g", { "data-act": "msg", "data-id": m.id },
        S("circle", { cx: x, cy: y, r: 11, fill: "transparent" }),
        S("circle", { cx: x, cy: y, r, fill, stroke, "stroke-width": sw }),
        S("title", null, msgTitle(m)));
      if (m.type === "AE" && m.entries.length > 1) g.appendChild(S("text", { x, y: y + 3.5, "text-anchor": "middle", "font-size": 9, "font-weight": 700, fill: "#0d1117" }, String(m.entries.length)));
      svg.appendChild(g);
    });
    // servers
    st.servers.forEach((s, k) => {
      const p = P[k];
      const g = S("g", { "data-act": "srv", "data-s": k });
      const fill = !s.up ? "var(--c-dim)" : s.role === "leader" ? "var(--ember)" : s.role === "candidate" ? "var(--c-compare)" : "var(--panel-2)";
      const ink = s.up && s.role !== "follower" ? "#0d1117" : "var(--ink)";
      if (s.up && s.role !== "leader") {
        const span = Math.max(1, s.deadline - s.timerSet);
        g.appendChild(S("circle", { cx: p.x, cy: p.y, r: NR + 6, fill: "none", stroke: "var(--line)", "stroke-width": 3 }));
        g.appendChild(S("path", { d: arc(p.x, p.y, NR + 6, (s.deadline - tau) / span), fill: "none", stroke: "var(--ember)", "stroke-width": 3, "stroke-linecap": "round" }));
      } else if (s.up) {
        g.appendChild(S("circle", { cx: p.x, cy: p.y, r: NR + 6, fill: "none", stroke: "var(--ember)", "stroke-width": 2, "stroke-dasharray": "2 4" }));
      }
      g.appendChild(S("circle", { cx: p.x, cy: p.y, r: NR, fill, stroke: s.up ? "var(--line-2)" : "var(--muted)", "stroke-width": 2 }));
      g.appendChild(S("text", { x: p.x, y: p.y - 2, "text-anchor": "middle", "font-size": 16, "font-weight": 800, fill: ink }, nm(k)));
      g.appendChild(S("text", { x: p.x, y: p.y + 15, "text-anchor": "middle", "font-size": 12.5, fill: ink }, "T" + s.term));
      if (!s.up) g.appendChild(S("text", { x: p.x + 24, y: p.y - 14, "text-anchor": "middle", "font-size": 22, "font-weight": 800, fill: "var(--c-swap)" }, "✕"));
      // label: above the top server, below the others
      const role = !s.up ? "crashed" : s.role === "candidate" ? `candidate ${s.votes.length}/3 votes` : s.role;
      const yy = k === 0 ? p.y - NR - 24 : p.y + NR + 20;
      const sub = s.up ? (s.votedFor != null && s.role === "follower" ? `voted ${nm(s.votedFor)} · ` : "") + `commit ${s.commitIndex}` : `log ${s.log.length} entries`;
      g.appendChild(S("text", { x: p.x, y: yy, "text-anchor": "middle", "font-size": 13.5, "font-weight": 700, fill: s.role === "leader" && s.up ? "var(--ember)" : s.role === "candidate" && s.up ? "var(--c-compare)" : "var(--ink-2)" }, role));
      g.appendChild(S("text", { x: p.x, y: yy + 15, "text-anchor": "middle", "font-size": 12, fill: "var(--muted)" }, sub));
      g.appendChild(S("title", null, `${nm(k)}: click to ${s.up ? "crash" : "restart"} it`));
      svg.appendChild(g);
    });
  }
  function msgTitle(m) {
    const t = m.type === "RV" ? `RequestVote (term ${m.term})` : m.type === "RVR" ? `vote reply: ${m.granted ? "granted" : "refused"}`
      : m.type === "AE" ? `AppendEntries (term ${m.term}, prevIndex ${m.prevIndex}, ${m.entries.length} entries, leaderCommit ${m.leaderCommit})` : `AppendEntries reply: ${m.success ? "success" : "refused"}`;
    return `${t} ${nm(m.from)}→${nm(m.to)}. Click to drop it.`;
  }

  /* ---------------- drawing: the logs ---------------- */
  function drawLogs(st) {
    const svg = $("logs");
    const narrow = (svg.clientWidth || 520) < 430;
    const LW = narrow ? 340 : 520, top = 26, rowH = 46, lab = 62, rightW = 8, cols = narrow ? 7 : 12;
    const H = top + 5 * rowH + 6;
    svg.setAttribute("viewBox", `0 0 ${LW} ${H}`);
    svg.innerHTML = "";
    const maxLen = Math.max(1, ...st.servers.map((s) => s.log.length));
    const first = Math.max(1, maxLen - cols + 2);         // keep one free column on the right
    const cw = (LW - lab - rightW) / cols;
    const L = leaderOf(st);
    for (let c = 0; c < cols; c++) svg.appendChild(S("text", { x: lab + c * cw + cw / 2, y: 16, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, String(first + c)));
    st.servers.forEach((s, k) => {
      const y = top + k * rowH;
      const g = S("g", { opacity: s.up ? 1 : 0.5 });
      g.appendChild(S("text", { x: 4, y: y + 17, "font-size": 13, "font-weight": 800, fill: s.up && s.role === "leader" ? "var(--ember)" : "var(--ink)" }, nm(k) + (s.up && s.role === "leader" ? " ★" : "")));
      g.appendChild(S("text", { x: 4, y: y + 31, "font-size": 10.5, fill: "var(--muted)" }, s.up ? "commit " + s.commitIndex : "down"));
      for (let c = 0; c < cols; c++) {
        const idx = first + c, x = lab + c * cw;
        const e = s.log[idx - 1];
        if (!e) {
          g.appendChild(S("rect", { x: x + 1.5, y: y + 2, width: cw - 3, height: 32, rx: 4, fill: "none", stroke: "var(--line)", "stroke-dasharray": "2 3" }));
          continue;
        }
        const committed = idx <= s.commitIndex;
        const le = L && L !== s ? L.log[idx - 1] : null;
        const conflict = L && L !== s && (!le || le.term !== e.term);
        g.appendChild(S("rect", { x: x + 1.5, y: y + 2, width: cw - 3, height: 32, rx: 4, fill: termColor(e.term), "fill-opacity": committed ? 1 : 0.42,
          stroke: conflict ? "var(--c-swap)" : committed ? "var(--ink-2)" : "var(--line-2)", "stroke-width": conflict ? 2.5 : 1, "stroke-dasharray": committed || conflict ? null : "3 2" }));
        g.appendChild(S("text", { x: x + cw / 2, y: y + 17, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: committed ? "#0d1117" : "var(--ink)" }, String(e.term)));
        g.appendChild(S("text", { x: x + cw / 2, y: y + 29, "text-anchor": "middle", "font-size": 9.5, fill: committed ? "#0d1117" : "var(--ink-2)" }, e.cmd));
      }
      if (L && L !== s) {
        const mi = L.matchIndex[k], ni = L.nextIndex[k];
        if (mi >= first) g.appendChild(S("rect", { x: lab + 2, y: y + 37, width: Math.max(0, (Math.min(mi, first + cols - 1) - first + 1) * cw - 4), height: 3.5, rx: 1.5, fill: "var(--c-done)" }));
        if (ni >= first && ni < first + cols) g.appendChild(S("text", { x: lab + (ni - first) * cw + cw / 2, y: y + 44, "text-anchor": "middle", "font-size": 9, fill: "var(--ember)" }, "▲next"));
      }
      svg.appendChild(g);
    });
    if (first > 1) svg.appendChild(S("text", { x: lab - 4, y: 16, "text-anchor": "end", "font-size": 10, fill: "var(--muted)" }, "…"));
  }

  /* ---------------- side panels ---------------- */
  function sidePanels(f) {
    const st = f.st;
    const code = f.code || [curCodeKey, []];
    curCodeKey = code[0];
    codes.show(code[0], LINES[code[0]]).highlight(code[1]);
    say.say(f.text || `<p style="margin:0" class="muted">Nothing new at t = ${st.t} ms.</p>`);
    const L = leaderOf(st);
    const vals = {
      "time (ms)": st.t, "highest term": Math.max(...st.servers.map((s) => s.term)), leader: L ? nm(L.id) : "none",
      elections: st.stats.elections, "messages sent": st.stats.sent, "lost / dropped": st.stats.lost, committed: st.stats.committed,
    };
    if (!ctr) ctr = Forge.counters($("ctr"), vals);
    ctr.set(vals);
    const c = R.checks(st);
    const terms = Object.keys(st.stats.leaders).sort((a, b) => a - b).map((t) => `T${t}: ${st.stats.leaders[t].map(nm).join(" & ")}`).join(" · ") || "none yet";
    const committed = Object.keys(st.committed).sort((a, b) => a - b).map((i) => st.committed[i].cmd).join(", ") || "nothing yet";
    const row = (ok, title, sub) => `<li><span class="mk ${ok ? "ok" : "no"}">${ok ? "✓" : "✗"}</span><span><b>${title}</b><small>${sub}</small></span></li>`;
    $("checks").innerHTML =
      row(c.electionSafety, "Election Safety", `At most one leader per term. Leaders so far: ${terms}.`) +
      row(c.logMatching, "Log Matching", "If two logs have an entry with the same index and term, they are identical up to that index.") +
      row(c.leaderCompleteness, "Leader Completeness", "The current leader's log holds every committed entry.") +
      row(c.stateMachine, "State Machine Safety", `No two servers apply different commands at the same index. Committed so far: ${committed}.`);
  }

  /* ---------------- render with a short tween between consecutive frames ---------------- */
  function speedFps() { const inp = $("player").querySelector('input[title="Speed"]'); return inp ? +inp.value : 5; }
  function render(f, i) {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (frames.length >= CAP && i > CAP - 300) {     // keep memory bounded: forget the oldest 1,000 steps
      frames.splice(0, 1000);
      lastShown = -1;
      pred.reset();
      player.go(i - 1000);
      return;
    }
    if (i > frames.length - 40) extend(120, i);
    const prev = frames[lastShown];
    const tween = !reduceMotion && prev && i === lastShown + 1 && f.t > prev.t;
    lastShown = i;
    drawLogs(f.st);
    sidePanels(f);
    pred.update(f, i);
    if (!tween) { drawRing(f.st, f.t); return; }
    const dur = Math.max(140, Math.min(650, 0.85 * 1000 / speedFps()));
    const t0 = performance.now(), a = prev.t, b = f.t, pst = prev.st;
    const stepT = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      if (u < 1) { drawRing(pst, a + (b - a) * u); raf = requestAnimationFrame(stepT); }
      else { raf = null; drawRing(f.st, f.t); }
    };
    raf = requestAnimationFrame(stepT);
  }

  /* ---------------- wiring ---------------- */
  $("ring").addEventListener("pointerdown", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || !player) return;
    const cur = frames[player.index].st;
    const kind = el.getAttribute("data-act");
    if (kind === "srv") { const s = +el.getAttribute("data-s"); act({ kind: cur.servers[s].up ? "crash" : "restart", s }); }
    else if (kind === "link") { const a = +el.getAttribute("data-a"), b = +el.getAttribute("data-b"); act({ kind: cur.cut[R.linkKey(a, b)] ? "uncut" : "cut", a, b }); }
    else if (kind === "msg") act({ kind: "drop", msg: +el.getAttribute("data-id") });
    e.preventDefault();
  });
  let rz = null;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (player && frames.length) drawLogs(frames[player.index].st); }, 150); });
  $("scen").addEventListener("change", load);
  $("load").addEventListener("click", load);
  $("seed").addEventListener("change", load);
  $("cmd").addEventListener("click", () => { const v = $("cmdTo").value; act({ kind: "client", target: v === "auto" ? "auto" : +v }); });
  $("crash").addEventListener("click", () => { const s = +$("srv").value; act({ kind: frames[player.index].st.servers[s].up ? "crash" : "restart", s }); });
  $("crashL").addEventListener("click", () => act({ kind: "crashLeader" }));
  $("heal").addEventListener("click", () => act({ kind: "heal" }));
  $("drop").addEventListener("change", () => act({ kind: "droprate", p: +$("drop").value }));

  load();
})();
