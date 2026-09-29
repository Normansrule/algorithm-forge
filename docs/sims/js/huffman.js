/* Huffman Codes — Algorithm Forge (Ch 9 · Greedy Technique) */
(function () {
  "use strict";
  const E = Forge.el, S = Forge.svg, $ = (id) => document.getElementById(id);
  Forge.page({ title: "Huffman Codes", chapter: "Ch 9 · Greedy Technique" });
  const EPS = 1e-9;
  const fw = (x) => String(+(+x).toFixed(4));

  const LINES = [
    "ALGORITHM Huffman(symbols a[1..n] with weights w[1..n])",
    "    Q ← priority queue of n one-node trees keyed by weight",
    "    for i ← 1 to n − 1 do",
    "        T1 ← removeMin(Q)",
    "        T2 ← removeMin(Q)",
    "        T ← new node: left T1, right T2, weight w(T1) + w(T2)",
    "        insert(Q, T)",
    "    label every left edge 0 and every right edge 1",
    "    return removeMin(Q)      // the Huffman tree",
    "",
    "ALGORITHM Decode(b[1..m], root)",
    "    v ← root",
    "    for i ← 1 to m do",
    "        if b[i] = 0 then v ← left(v) else v ← right(v)",
    "        if v is a leaf then",
    "            output symbol(v)",
    "            v ← root",
  ];
  const code = Forge.code($("code"), LINES);
  let ctr = null;
  const say = Forge.narrate($("say"));

  let syms = [], textMode = false, tie = "fifo", predict = false;
  let buildFrames = [], final = null; // final = {nodes, root, codes}
  const score = { right: 0, total: 0 }, answered = {}, picks = {};

  /* ---------------- input ---------------- */
  function readInput() {
    textMode = $("mode").value === "text";
    if (textMode) {
      const t = $("text").value;
      if (!t.length) return null;
      const cnt = new Map();
      [...t].forEach((c) => cnt.set(c, (cnt.get(c) || 0) + 1));
      const list = [...cnt.entries()].map(([c, n]) => ({ s: c === " " ? "␣" : c, raw: c, w: n }));
      if (list.length > 10) return { err: `That text has ${list.length} distinct characters; the stage fits 10. Try a shorter text.` };
      return { list, total: t.length };
    }
    const list = [];
    $("freq").value.split(/[,;\n]+/).forEach((part) => {
      const m = part.trim().match(/^(\S{1,2})\s*[:=]?\s*(\d*\.?\d+)$/);
      if (m && +m[2] > 0 && !list.some((x) => x.s === m[1])) list.push({ s: m[1], raw: m[1] === "_" ? " " : m[1], w: +m[2] });
    });
    if (list.length > 10) return { err: "Please use at most 10 symbols." };
    return { list, total: list.reduce((a, b) => a + b.w, 0) };
  }

  /* ---------------- core algorithm ---------------- */
  function huffman(list, policy, rec) {
    const nodes = list.map((x, i) => ({ id: i, s: x.s, w: x.w, l: null, r: null, ord: i }));
    let Q = nodes.map((n) => n.id);
    let ord = nodes.length;
    const cmp = (a, b) => {
      const A = nodes[a], B = nodes[b];
      if (Math.abs(A.w - B.w) > EPS) return A.w - B.w;
      return policy === "fifo" ? A.ord - B.ord : B.ord - A.ord;
    };
    const sorted = () => Q.slice().sort(cmp);
    let merges = 0, qops = list.length;
    const snap = (o) => rec && rec(Object.assign({ nodes: nodes.map((n) => Object.assign({}, n)), Q: sorted(), ctr: { merges, "queue operations": qops } }, o));
    snap({ line: 1, text: `Start: ${list.length} one-node trees, one per symbol, in a priority queue keyed by ${textMode ? "count" : "frequency"}.` });
    while (Q.length > 1) {
      const q = sorted();
      const minW = [nodes[q[0]].w, nodes[q[1]].w];
      snap({ line: [3, 4], pick: [q[0], q[1]], ask: { q: q.slice(), minW },
        text: `The two lightest trees are <b>${label(nodes, q[0])}</b> (${fw(nodes[q[0]].w)}) and <b>${label(nodes, q[1])}</b> (${fw(nodes[q[1]].w)})${tieNote(nodes, q)}.` });
      const t1 = q[0], t2 = q[1];
      Q = Q.filter((x) => x !== t1 && x !== t2);
      const nn = { id: nodes.length, s: null, w: nodes[t1].w + nodes[t2].w, l: t1, r: t2, ord: ord++ };
      nodes.push(nn); Q.push(nn.id); merges++; qops += 3;
      snap({ line: [5, 6], fresh: nn.id, formula: `${fw(nodes[t1].w)} + ${fw(nodes[t2].w)} = ${fw(nn.w)}`,
        text: `Join them: left = ${label(nodes, t1)}, right = ${label(nodes, t2)}, new weight ${fw(nn.w)}. Insert it back. ${Q.length - 1} merge${Q.length - 1 === 1 ? "" : "s"} to go.` });
    }
    const root = Q[0];
    const codes = {};
    const walk = (id, pre) => { const n = nodes[id]; if (n.s != null) { codes[n.s] = pre || "0"; return; } walk(n.l, pre + "0"); walk(n.r, pre + "1"); };
    walk(root, "");
    return { nodes, root, codes };
  }
  function label(nodes, id) {
    const out = []; const walk = (x) => { const n = nodes[x]; if (n.s != null) out.push(n.s); else { walk(n.l); walk(n.r); } };
    walk(id);
    return nodes[id].s != null ? nodes[id].s : `{${out.join("")}}`;
  }
  function tieNote(nodes, q) {
    const w1 = nodes[q[1]].w;
    const tied = q.slice(1).filter((x) => Math.abs(nodes[x].w - w1) < EPS);
    return tied.length > 1 ? ` — a tie at ${fw(w1)} between ${tied.map((x) => label(nodes, x)).join(", ")}; the “${tie === "fifo" ? "oldest first" : "newest first"}” rule decides` : "";
  }
  function stats(list, codes, total) {
    const n = list.length;
    const p = (x) => x.w / total;
    const avg = list.reduce((a, x) => a + p(x) * codes[x.s].length, 0);
    const vr = list.reduce((a, x) => a + p(x) * (codes[x.s].length - avg) ** 2, 0);
    const fixed = Math.max(1, Math.ceil(Math.log2(n)));
    return { avg, vr, fixed, ratio: ((fixed - avg) / fixed) * 100 };
  }

  /* ---------------- record build frames ---------------- */
  function recordBuild(list, total) {
    const frames = [];
    const res = huffman(list, tie, (f) => frames.push(f));
    const st = stats(list, res.codes, total);
    // codeword frames
    const shown = [];
    list.forEach((x) => {
      shown.push(x.s);
      const leaf = res.nodes.find((n) => n.s === x.s);
      frames.push({ nodes: res.nodes, Q: [res.root], line: 7, path: pathTo(res.nodes, res.root, leaf.id), codesShown: shown.slice(), ctr: frames[frames.length - 1].ctr,
        formula: `${x.s}: ${res.codes[x.s]}  (length ${res.codes[x.s].length})`,
        text: `Walk from the root to <b>${x.s}</b>, writing 0 for every left edge and 1 for every right edge: codeword <b>${res.codes[x.s]}</b>.` });
    });
    frames.push({ nodes: res.nodes, Q: [res.root], line: 8, codesShown: shown.slice(), ctr: frames[frames.length - 1].ctr, done: true,
      formula: `average = Σ p·len = ${list.map((x) => `${fw(x.w / total)}·${res.codes[x.s].length}`).join(" + ")} = <b>${fw(st.avg)}</b> bits`,
      text: `Done in ${list.length - 1} merges (O(n log n) with a heap). Average codeword length <b>${fw(st.avg)}</b> bits vs <b>${st.fixed}</b> for a fixed-length code: ${+st.ratio.toFixed(1)}% shorter.` });
    return { frames, res, st };
  }
  function pathTo(nodes, root, target) {
    const path = [];
    const dfs = (id) => { path.push(id); if (id === target) return true; const n = nodes[id]; if (n.s == null && (dfs(n.l) || dfs(n.r))) return true; path.pop(); return false; };
    dfs(root);
    return path;
  }

  /* ---------------- decode frames ---------------- */
  function recordDecode(bits) {
    const { nodes, root } = final;
    const frames = [];
    let v = root, out = "", read = 0;
    const push = (o) => frames.push(Object.assign({ nodes, Q: [root], decode: true, bits, pos: read, out, ctr: { "bits read": read, "symbols out": out.length } }, o));
    push({ line: 11, cur: root, text: `Decoding ${bits.length} bits. Start at the root.`, formula: bitsHtml(bits, -1, 0) });
    for (let i = 0; i < bits.length; i++) {
      const b = bits[i];
      v = b === "0" ? nodes[v].l : nodes[v].r;
      read = i + 1;
      if (v == null) { push({ line: 13, text: "That bit leads nowhere: the message is not a valid code sequence.", formula: bitsHtml(bits, i, i) }); return frames; }
      if (nodes[v].s != null) {
        out += nodes[v].s;
        push({ line: [13, 14, 15], cur: v, text: `Bit ${b} → go ${b === "0" ? "left" : "right"}: reached leaf <b>${nodes[v].s}</b>. Output it and jump back to the root.`, formula: bitsHtml(bits, i, read) + `  ⇒  <b>${out}</b>` });
        v = root;
      } else push({ line: 13, cur: v, text: `Bit ${b} → go ${b === "0" ? "left" : "right"} to an inner node (weight ${fw(nodes[v].w)}). Not a leaf yet, keep reading.`, formula: bitsHtml(bits, i, read) + `  ⇒  ${out}` });
    }
    push({ line: 16, cur: root, text: `All ${bits.length} bits used: decoded <b>${out}</b>. No separators were needed because the code is prefix-free.`, formula: bitsHtml(bits, -1, bits.length) + `  ⇒  <b>${out}</b>` });
    return frames;
  }
  function bitsHtml(bits, cur, used) {
    return `<span class="bits">${[...bits].map((b, i) => (i === cur ? `<span class="cur">${b}</span>` : i < used ? `<span class="used">${b}</span>` : b)).join("")}</span>`;
  }

  /* ---------------- drawing ---------------- */
  function drawForest(f) {
    const svg = $("svgT");
    const nodes = f.nodes;
    const pos = {}; let x = 0, maxD = 0;
    const lay = (id, d) => {
      maxD = Math.max(maxD, d);
      const n = nodes[id];
      if (n.s != null) { pos[id] = [x++, d]; return; }
      lay(n.l, d + 1); lay(n.r, d + 1);
      pos[id] = [(pos[n.l][0] + pos[n.r][0]) / 2, d];
    };
    f.Q.forEach((id) => { lay(id, 0); x += 0.35; });
    const gx = 70, gy = 62;
    const W = Math.max(520, x * gx + 30), H = 50 + maxD * gy + 40;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const P = (id) => [20 + pos[id][0] * gx + gx / 2 - 10, 30 + pos[id][1] * gy];
    const pathSet = new Set(f.path || []);
    const pick = new Set(f.pick || []);
    // edges
    Object.keys(pos).forEach((k) => {
      const n = nodes[k];
      if (n.s != null) return;
      [[n.l, "0"], [n.r, "1"]].forEach(([c, b]) => {
        const [x1, y1] = P(+k), [x2, y2] = P(c);
        const onP = pathSet.has(+k) && pathSet.has(c);
        const col = onP ? "var(--c-done)" : "var(--line-2)";
        svg.appendChild(S("line", { x1, y1, x2, y2, stroke: col, "stroke-width": onP ? 4 : 2 }));
        const mx = (x1 + x2) / 2 + (b === "0" ? -9 : 9), my = (y1 + y2) / 2 - 2;
        svg.appendChild(S("text", { x: mx, y: my, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: onP ? "var(--c-done)" : "var(--ember-2)" }, b));
      });
    });
    Object.keys(pos).forEach((k) => {
      const id = +k, n = nodes[id];
      const [cx, cy] = P(id);
      let fill = "var(--panel-2)", ink = "var(--ink)";
      if (pick.has(id)) { fill = "var(--c-compare)"; ink = "#0d1117"; }
      if (f.fresh === id) { fill = "var(--c-swap)"; ink = "#0d1117"; }
      if (pathSet.has(id) && n.s != null) { fill = "var(--c-done)"; ink = "#0d1117"; }
      if (f.cur === id) { fill = "var(--c-active)"; ink = "#0d1117"; }
      if (n.s != null) {
        svg.appendChild(S("rect", { x: cx - 24, y: cy - 17, width: 48, height: 34, rx: 7, fill, stroke: "var(--line-2)", "stroke-width": 1.5 }));
        svg.appendChild(S("text", { x: cx, y: cy - 1, "text-anchor": "middle", "font-size": 14, "font-weight": 800, fill: ink }, n.s));
        svg.appendChild(S("text", { x: cx, y: cy + 12, "text-anchor": "middle", "font-size": 10, fill: ink === "var(--ink)" ? "var(--muted)" : ink }, fw(n.w)));
        if (f.done || (f.codesShown && f.codesShown.includes(n.s))) {
          const cw = final && final.codes[n.s];
          if (cw && (f.codesShown || []).includes(n.s)) svg.appendChild(S("text", { x: cx, y: cy + 32, "text-anchor": "middle", "font-size": 11.5, "font-weight": 700, fill: "var(--c-done)" }, cw));
        }
      } else {
        svg.appendChild(S("circle", { cx, cy, r: 19, fill, stroke: "var(--line-2)", "stroke-width": 1.5 }));
        svg.appendChild(S("text", { x: cx, y: cy + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: ink }, fw(n.w)));
      }
    });
  }
  function drawPQ(f) {
    const host = $("pq"); host.innerHTML = "";
    const t = E("table", { class: "t" }, E("tr", null, E("th", null, "#"), E("th", null, "tree"), E("th", null, "weight")));
    f.Q.forEach((id, i) => {
      const cls = (f.pick || []).includes(id) ? "pick" : f.fresh === id ? "new" : "";
      t.appendChild(E("tr", { class: cls }, E("td", null, i + 1), E("td", null, label(f.nodes, id)), E("td", null, fw(f.nodes[id].w))));
    });
    host.appendChild(t);
  }
  function drawCodes(f) {
    const host = $("codes"); host.innerHTML = "";
    const list = syms.list, tot = syms.total;
    const t = E("table", { class: "t" }, E("tr", null, E("th", null, "symbol"), E("th", null, textMode ? "count" : "freq"), E("th", null, "codeword"), E("th", null, "len"), E("th", null, "p × len")));
    list.forEach((x) => {
      const show = f.done || f.decode || (f.codesShown || []).includes(x.s);
      const c = final.codes[x.s];
      t.appendChild(E("tr", { class: f.path && f.nodes[f.path[f.path.length - 1]].s === x.s ? "cur" : "" }, E("td", null, x.s), E("td", null, fw(x.w)), E("td", null, show ? c : "·"), E("td", null, show ? c.length : "·"), E("td", null, show ? fw((x.w / tot) * c.length) : "·")));
    });
    host.appendChild(t);
  }
  function drawStats() {
    const s = final.st, list = syms.list;
    const box = $("stats"); box.innerHTML = "";
    const cell = (k, v) => box.appendChild(E("div", null, k, E("b", null, v)));
    cell("average bits / symbol", fw(s.avg));
    cell(`fixed-length code (⌈log₂ ${list.length}⌉)`, `${s.fixed} bits`);
    cell("compression vs fixed", `${+s.ratio.toFixed(1)} %`);
    cell("codeword-length variance", fw(s.vr));
    if (textMode) {
      const bits = syms.list.reduce((a, x) => a + x.w * final.codes[x.s].length, 0);
      cell("whole text, Huffman", `${bits} bits`);
      cell("whole text, 8-bit ASCII", `${syms.total * 8} bits`);
    }
  }
  function drawTies() {
    const host = $("ties"); host.innerHTML = "";
    const rows = ["fifo", "lifo"].map((p) => {
      const r = huffman(syms.list, p, null), st = stats(syms.list, r.codes, syms.total);
      return { p, r, st };
    });
    const t = E("table", { class: "t" }, E("tr", null, E("th", null, "rule"), ...syms.list.map((x) => E("th", null, x.s)), E("th", null, "average"), E("th", null, "variance")));
    rows.forEach(({ p, r, st }) => t.appendChild(E("tr", { class: p === tie ? "cur" : "" }, E("td", null, p === "fifo" ? "oldest first" : "newest first"),
      ...syms.list.map((x) => E("td", null, r.codes[x.s])), E("td", null, fw(st.avg)), E("td", null, fw(st.vr)))));
    host.appendChild(t);
    const same = Math.abs(rows[0].st.vr - rows[1].st.vr) < 1e-9 && syms.list.every((x) => rows[0].r.codes[x.s].length === rows[1].r.codes[x.s].length);
    host.appendChild(E("p", { class: "muted", style: { margin: "8px 0 0" } }, same ? "Here both rules give the same codeword lengths (no tie mattered)." :
      `Same average (both are optimal), different shapes: the lower-variance code keeps codeword lengths closer together, which smooths the bit rate of a transmission.`));
  }

  /* ---------------- wiring ---------------- */
  const player = Forge.player($("player"), { frames: [], render });
  function render(f, idx) {
    drawForest(f);
    drawPQ(f);
    drawCodes(f);
    code.highlight(f.line);
    if (!ctr || ctr._decode !== !!f.decode) {
      $("ctr").innerHTML = "";
      ctr = Forge.counters($("ctr"), f.decode ? { "bits read": 0, "symbols out": 0 } : { merges: 0, "queue operations": 0 });
      ctr._decode = !!f.decode;
    }
    ctr.set(f.ctr);
    say.say(f.text);
    $("formula").innerHTML = f.formula || "&nbsp;";
    const box = $("ask");
    if (predict && f.ask) {
      player.pause();
      box.hidden = false;
      const sel = picks[idx] || (picks[idx] = []);
      const a = answered[idx];
      $("askQ").textContent = a ? "" : `Click the two trees that will be merged next (${sel.length}/2 chosen).`;
      const btns = $("askBtns"); btns.innerHTML = "";
      f.ask.q.forEach((id) => btns.appendChild(E("button", { class: "btn sm" + (sel.includes(id) ? " primary" : ""), disabled: !!a, onclick: () => {
        const k = sel.indexOf(id); if (k >= 0) sel.splice(k, 1); else if (sel.length < 2) sel.push(id);
        if (sel.length === 2) {
          const ws = sel.map((x) => f.nodes[x].w).sort((p, q) => p - q), ok = Math.abs(ws[0] - f.ask.minW[0]) < EPS && Math.abs(ws[1] - f.ask.minW[1]) < EPS;
          score.total++; if (ok) score.right++;
          $("score").textContent = `predictions: ${score.right} / ${score.total}`;
          answered[idx] = ok ? `<span style="color:var(--ok)">✓ Yes — the two smallest weights.</span>` : `<span style="color:var(--bad)">✗ The lightest two weigh ${fw(f.ask.minW[0])} and ${fw(f.ask.minW[1])}.</span>`;
        }
        render(f, idx);
      } }, `${label(f.nodes, id)} (${fw(f.nodes[id].w)})`)));
      if (a) btns.appendChild(E("button", { class: "btn sm steel", onclick: () => player.go(idx + 1) }, "Continue ▶"));
      $("askFb").innerHTML = a || "";
    } else box.hidden = true;
  }
  function build() {
    const inp = readInput();
    if (!inp || inp.err || inp.list.length < 2) { say.say((inp && inp.err) || "Please give at least two symbols with positive frequencies."); return; }
    syms = inp;
    const r = recordBuild(inp.list, inp.total);
    final = Object.assign({}, r.res, { st: r.st });
    buildFrames = r.frames;
    Object.keys(answered).forEach((k) => delete answered[k]);
    Object.keys(picks).forEach((k) => delete picks[k]);
    drawStats(); drawTies();
    if (textMode) $("msg").value = $("text").value.slice(0, 24);
    encode();
    player.load(buildFrames);
  }
  function msgBits() {
    const m = $("msg").value;
    let bits = "", bad = [];
    [...m].forEach((c) => {
      const key = syms.list.find((x) => x.raw === c || x.s === c);
      if (key) bits += final.codes[key.s]; else bad.push(c);
    });
    return { bits, bad };
  }
  function encode() {
    if (!final) return;
    const { bits, bad } = msgBits();
    const n = $("msg").value.length - bad.length;
    $("encOut").innerHTML = bits ? `<b>${bits}</b><br><span class="muted">${bits.length} bits for ${n} symbols (${fw(bits.length / Math.max(1, n))} bits/symbol); fixed-length would use ${n * final.st.fixed}.${bad.length ? ` Skipped unknown: ${[...new Set(bad)].join(" ")}` : ""}</span>` : `<span class="muted">No known symbols in the message.</span>`;
    return bits;
  }
  $("enc").onclick = encode;
  $("dec").onclick = () => { const bits = encode(); if (bits) player.load(recordDecode(bits)); };
  $("back").onclick = () => player.load(buildFrames);
  $("load").onclick = build;
  $("mode").onchange = (e) => { const t = e.target.value === "text"; $("tableField").hidden = t; $("textField").hidden = !t; build(); };
  $("tie").onchange = (e) => { tie = e.target.value; build(); };
  $("pBook").onclick = () => { $("mode").value = "table"; $("mode").onchange({ target: $("mode") }); $("freq").value = "A 0.35, B 0.1, C 0.2, D 0.2, _ 0.15"; $("msg").value = "DAD_CAB"; build(); };
  $("pLec").onclick = () => { $("mode").value = "table"; $("tableField").hidden = false; $("textField").hidden = true; $("freq").value = "A 0.1, B 0.1, C 0.2, D 0.2, E 0.4"; $("msg").value = "BEADCE"; build(); };
  $("rand").onclick = () => {
    if ($("mode").value === "text") {
      const words = ["MISSISSIPPI", "BANANA BANDANA", "GREEDY GREEN GEESE", "ABRACADABRA", "PEPPER PICKER", "TO BE OR NOT TO BE"];
      $("text").value = words[Math.floor(Math.random() * words.length)];
    } else {
      const n = 4 + Math.floor(Math.random() * 4);
      const raw = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 9)), tot = raw.reduce((a, b) => a + b, 0);
      $("freq").value = raw.map((r, i) => `${"ABCDEFGH"[i]} ${(r / tot).toFixed(2)}`).join(", ");
      $("msg").value = "ABCA".slice(0, 4);
    }
    build();
  };
  ["freq", "text"].forEach((id) => $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") build(); }));
  $("msg").addEventListener("keydown", (e) => { if (e.key === "Enter") encode(); });
  $("predictMode").onchange = (e) => { predict = e.target.checked; player.go(player.index); };
  build();
})();
