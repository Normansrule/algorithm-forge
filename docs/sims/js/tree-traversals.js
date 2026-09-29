/* Binary tree traversals, height, leaf count, extended tree (Levitin §5.3). */
(function () {
  "use strict";
  Forge.page({ title: "Binary Tree Traversals", chapter: "Ch 5 · Divide-and-Conquer" });
  const $ = (id) => document.getElementById(id);
  const S = Forge.svg;
  const stage = $("stage");
  const say = Forge.narrate($("say"));
  const pred = FX.predict($("predict"));
  let code = null, ctr = null, runId = 0, op = "pre", tool = "grow";
  let root = null, uid = 0;
  const node = (label, L, R) => ({ id: ++uid, label: String(label), L: L || null, R: R || null });

  /* ---------------------------------------------------------------- building */
  function bstInsert(t, key) {
    if (!t) return node(key);
    if (+key < +t.label) t.L = bstInsert(t.L, key); else if (+key > +t.label) t.R = bstInsert(t.R, key);
    return t;
  }
  function fromKeys(keys) { let t = null; keys.forEach((k) => (t = bstInsert(t, k))); return t; }
  function preset(name) {
    if (name === "levitin") return node("a", node("b", node("d", null, node("g")), node("e")), node("c", node("f"), null));
    if (name === "bst") return fromKeys([50, 30, 70, 20, 40, 60, 80]);
    if (name === "chain") return fromKeys([1, 2, 3, 4, 5]);
    if (name === "one") return node("a");
    return null;
  }
  const count = (t) => (t ? 1 + count(t.L) + count(t.R) : 0);
  const height = (t) => (t ? 1 + Math.max(height(t.L), height(t.R)) : -1);
  const leaves = (t) => (!t ? 0 : !t.L && !t.R ? 1 : leaves(t.L) + leaves(t.R));
  function allLabels(t, out) { if (t) { out.push(t.label); allLabels(t.L, out); allLabels(t.R, out); } return out; }
  function nextLabel() {
    const labs = allLabels(root, []);
    if (labs.length && labs.every((l) => /^\d+$/.test(l))) return String(Math.max(...labs.map(Number)) + 1);
    for (let c = 97; c < 123; c++) { const s = String.fromCharCode(c); if (!labs.includes(s)) return s; }
    return "?";
  }

  /* ---------------------------------------------------------------- layout */
  let LAY = null;
  function layout() {
    const showExt = $("ext").checked;
    const pos = {}, ext = []; // ext: {key, x, y, parent, side}
    let slot = 0, maxD = 0;
    function go(t, d, parent, side) {
      maxD = Math.max(maxD, d);
      if (!t) {
        const e = { key: parent ? parent.id + side : "root", slot: showExt ? slot++ : null, d, parent, side };
        ext.push(e); return;
      }
      go(t.L, d + 1, t, "L");
      pos[t.id] = { slot: slot++, d };
      go(t.R, d + 1, t, "R");
    }
    go(root, 0, null, null);
    if (!showExt) { // squares still need a position for clicking/animation: put them under their parent
      ext.forEach((e) => { e.slot = e.parent ? pos[e.parent.id].slot + (e.side === "L" ? -0.35 : 0.35) : 0; });
    }
    const SX = 46, SY = 66, n = Math.max(1, slot);
    const W = Math.max(760, 60 + n * SX), H = 50 + (maxD + (showExt ? 0 : 1)) * SY + 56;
    const off = (W - (n - 1) * SX) / 2;
    const X = (s) => off + s * SX, Y = (d) => 34 + d * SY;
    for (const k in pos) pos[k] = { x: X(pos[k].slot), y: Y(pos[k].d) };
    ext.forEach((e) => { e.x = X(e.slot); e.y = Y(e.d); });
    LAY = { pos, ext, W, H, showExt };
    return LAY;
  }

  /* ---------------------------------------------------------------- pseudocode */
  const LINES = {
    pre: ["ALGORITHM Preorder(T)", "    if T = ∅ then return          // external node: nothing to do", "    visit the root of T           // output it FIRST", "    Preorder(T_left)", "    Preorder(T_right)"],
    in: ["ALGORITHM Inorder(T)", "    if T = ∅ then return          // external node: nothing to do", "    Inorder(T_left)", "    visit the root of T           // output it BETWEEN the subtrees", "    Inorder(T_right)"],
    post: ["ALGORITHM Postorder(T)", "    if T = ∅ then return          // external node: nothing to do", "    Postorder(T_left)", "    Postorder(T_right)", "    visit the root of T           // output it LAST"],
    level: ["ALGORITHM LevelOrder(T)", "    if T = ∅ then return", "    Q ← a queue containing the root of T", "    while Q is not empty do", "        v ← dequeue(Q);  visit v", "        if v has a left child then enqueue(Q, left child)", "        if v has a right child then enqueue(Q, right child)"],
    height: ["ALGORITHM Height(T)", "    // height of the empty tree is −1", "    if T = ∅ then return −1", "    hL ← Height(T_left)", "    hR ← Height(T_right)", "    return max(hL, hR) + 1"],
    leaves: ["ALGORITHM LeafCount(T)", "    if T = ∅ then return 0", "    if T_left = ∅ and T_right = ∅ then return 1   // a leaf", "    return LeafCount(T_left) + LeafCount(T_right)"],
  };
  const NAME = { pre: "Preorder", in: "Inorder", post: "Postorder", height: "Height", leaves: "LeafCount" };

  /* ---------------------------------------------------------------- recorders */
  function extKey(parent, side) { return parent ? parent.id + side : "root"; }
  function recRecursive() {
    const frames = [], stack = [], out = [], val = {}, extVal = {};
    let calls = 0, checks = 0, adds = 0;
    const N = count(root);
    const push = (o) => frames.push(Object.assign({ stack: stack.slice(), out: out.slice(), val: { ...val }, extVal: { ...extVal }, calls, checks, adds }, o));
    const order = []; // for predictions
    (function pre(t) { if (!t) return; if (op === "pre") order.push(t.label); pre(t.L); if (op === "in") order.push(t.label); pre(t.R); if (op === "post") order.push(t.label); })(root);
    const nm = NAME[op];
    let intro = `${nm} starts at the root. Every call first checks whether its tree is empty.`;
    let ask = null;
    if (op === "height") { const h = height(root); ask = { q: "Before we start: what is the height of this tree?", options: [...new Set([h, h + 1, h - 1, N - 1, -1])].filter((x) => x >= -1).slice(0, 4).sort((a, b) => a - b).map((x) => ({ label: String(x), value: x })), answer: h, why: `The longest root-to-leaf path has ${h} edge${h === 1 ? "" : "s"}${h < 0 ? " (the tree is empty)" : ""}. Height counts edges, not nodes.` }; }
    if (op === "leaves") { const L = leaves(root); ask = { q: "Before we start: how many leaves (nodes with no children) does this tree have?", options: [...new Set([L, L + 1, Math.max(0, L - 1), N, N + 1])].slice(0, 4).sort((a, b) => a - b).map((x) => ({ label: String(x), value: x })), answer: L, why: `${L} leaves. Squares don't count: they are empty subtrees, not nodes.` }; }
    push({ line: 0, text: intro + ` The tree has n = ${N} nodes, so the extended tree has x = ${N + 1} squares.`, ask });
    let visits = 0;
    function visit(t) {
      out.push(t.label); visits++;
      push({ line: op === "pre" ? 2 : op === "in" ? 3 : 4, cur: t.id, text: `<b>Visit ${t.label}</b> (output #${out.length}).` + (op === "pre" ? " Preorder visits the root before either subtree." : op === "in" ? ` Its whole left subtree is finished, its right subtree hasn't started: inorder puts ${t.label} in between.` : " Both subtrees are finished, so postorder can finally output the root.") });
      if ((visits === 1 || visits === 3) && visits < N) {
        const ans = order[visits], opts = [ans];
        order.forEach((x) => { if (opts.length < 4 && !opts.includes(x) && !out.includes(x)) opts.push(x); });
        push({ line: op === "pre" ? 2 : op === "in" ? 3 : 4, cur: t.id, text: `Output so far: ${out.join(", ")}. Which node comes out next?`,
          ask: { q: `${nm} has output ${out.join(", ")}. Which node is output next?`, options: opts.sort().map((x) => ({ label: x, value: x })), answer: ans, why: `Next is ${ans}. ${op === "pre" ? "Preorder goes root, then the whole left subtree, then the whole right subtree." : op === "in" ? "Inorder goes left subtree, root, right subtree." : "Postorder finishes both subtrees before the root."}` } });
      }
    }
    function rec(t, parent, side) {
      calls++; checks++;
      if (!t) {
        const k = extKey(parent, side);
        const rv = op === "height" ? -1 : op === "leaves" ? 0 : null;
        if (rv != null) extVal[k] = rv;
        push({ line: op === "leaves" ? 1 : op === "height" ? 2 : 1, ext: k, text: `${nm}(∅) on the ${side === "L" ? "left" : side === "R" ? "right" : ""} empty subtree${parent ? " of " + parent.label : ""}: T = ∅, so return${rv != null ? " " + rv : ""} immediately. (An external node.)` });
        return rv;
      }
      stack.push(t.id);
      push({ line: op === "height" ? 2 : 1, cur: t.id, text: `Call ${nm}(${t.label}): T is not empty.` });
      if (op === "leaves" && !t.L && !t.R) {
        val[t.id] = 1; stack.pop();
        push({ line: 2, cur: t.id, ret: t.id, text: `${t.label} has no children: it is a <b>leaf</b>. Return 1 without recursing.` });
        return 1;
      }
      if (op === "pre") visit(t);
      push({ line: op === "pre" ? 3 : op === "in" || op === "post" ? 2 : op === "height" ? 3 : 3, cur: t.id, text: `${nm}(${t.label}) recurses into its <b>left</b> subtree${t.L ? " (rooted at " + t.L.label + ")" : ", which is empty"}.` });
      const a = rec(t.L, t, "L");
      if (op === "in") visit(t);
      push({ line: op === "pre" ? 4 : op === "in" ? 4 : op === "post" ? 3 : op === "height" ? 4 : 3, cur: t.id, text: `Back in ${nm}(${t.label})${a != null ? ` with ${op === "height" ? "hL" : "left count"} = ${a}` : ""}. Now the <b>right</b> subtree${t.R ? " (rooted at " + t.R.label + ")" : ", which is empty"}.` });
      const b = rec(t.R, t, "R");
      if (op === "post") visit(t);
      stack.pop();
      if (op === "height") {
        adds++;
        val[t.id] = Math.max(a, b) + 1;
        push({ line: 5, cur: t.id, ret: t.id, text: `Height(${t.label}) = max(${a}, ${b}) + 1 = <b>${val[t.id]}</b>. One comparison and one addition for this internal node.` });
        return val[t.id];
      }
      if (op === "leaves") {
        adds++;
        val[t.id] = a + b;
        push({ line: 3, cur: t.id, ret: t.id, text: `LeafCount(${t.label}) = ${a} + ${b} = <b>${a + b}</b>.` });
        return a + b;
      }
      push({ line: 0, cur: t.id, ret: t.id, text: `${nm}(${t.label}) is finished; return to ${stack.length ? "the caller" : "the top level"}.` });
      return null;
    }
    const res = rec(root, null, null);
    const fin = op === "height" ? `Height = <b>${res}</b>. Calls: ${calls} = 2n + 1 = ${2 * N + 1} (one per circle and square), additions: ${adds} = n.` :
      op === "leaves" ? `The tree has <b>${res}</b> leaves. This version stops at leaves, so it made ${calls} calls instead of 2n + 1 = ${2 * N + 1}.` :
      `Done: <b>${out.join(", ") || "(nothing)"}</b>. ${calls} calls = 2n + 1 = ${2 * N + 1}: one for each of the n = ${N} circles and x = ${N + 1} squares.`;
    push({ line: 0, final: true, text: fin });
    return frames;
  }
  function recLevel() {
    const frames = [], out = [], Q = [];
    let calls = 0, checks = 0, adds = 0, enq = 0;
    const N = count(root);
    const push = (o) => frames.push(Object.assign({ stack: Q.map((t) => t.id), out: out.slice(), val: {}, extVal: {}, calls, checks, adds, enq }, o));
    checks++;
    if (!root) { push({ line: 1, final: true, text: "The tree is empty: nothing to visit." }); return frames; }
    const order = []; { const q = [root]; while (q.length) { const v = q.shift(); order.push(v.label); if (v.L) q.push(v.L); if (v.R) q.push(v.R); } }
    Q.push(root); enq++;
    push({ line: 2, cur: root.id, text: `Put the root ${root.label} into the queue. Level-order is Breadth-First Search (BFS) on a tree: finish each level before the next.` });
    while (Q.length) {
      const v = Q.shift(); out.push(v.label);
      push({ line: [3, 4], cur: v.id, text: `Dequeue <b>${v.label}</b> and visit it (output #${out.length}).` });
      if (out.length === 2 && N > 3) {
        const ans = order[2], opts = [ans]; order.forEach((x) => { if (opts.length < 4 && !opts.includes(x) && !out.includes(x)) opts.push(x); });
        push({ line: 3, cur: v.id, text: `Queue: ${Q.map((t) => t.label).join(", ") || "(empty)"}. Which node is visited next?`, ask: { q: `Level-order output so far: ${out.join(", ")}. Which node is next?`, options: opts.sort().map((x) => ({ label: x, value: x })), answer: ans, why: `${ans} is at the front of the queue: it was enqueued earliest among the waiting nodes.` } });
      }
      if (v.L) { Q.push(v.L); enq++; push({ line: 5, cur: v.id, chk: v.L.id, text: `${v.label} has a left child ${v.L.label}: add it to the back of the queue.` }); }
      if (v.R) { Q.push(v.R); enq++; push({ line: 6, cur: v.id, chk: v.R.id, text: `${v.label} has a right child ${v.R.label}: add it to the back of the queue.` }); }
    }
    push({ line: 3, final: true, text: `Queue empty. Level-order: <b>${out.join(", ")}</b>. Each node was enqueued and dequeued once: Θ(n).` });
    return frames;
  }

  /* ---------------------------------------------------------------- render */
  let lastFrame = null;
  function draw(f) {
    lastFrame = f;
    const L = LAY;
    stage.setAttribute("viewBox", `0 0 ${L.W} ${L.H}`);
    stage.innerHTML = "";
    const onStack = new Set(f.stack || []), visitedLabels = new Set(f.out || []);
    const edges = [];
    (function walk(t) { if (!t) return; [t.L, t.R].forEach((c, k) => { const side = k ? "R" : "L"; if (c) { edges.push([L.pos[t.id], L.pos[c.id], false]); walk(c); } else if (L.showExt) { const e = L.ext.find((x) => x.key === t.id + side); edges.push([L.pos[t.id], e, true]); } }); })(root);
    edges.forEach(([a, b, dashed]) => stage.appendChild(S("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: dashed ? "var(--line)" : "var(--line-2)", "stroke-width": dashed ? 1.5 : 2.5, "stroke-dasharray": dashed ? "4 4" : null })));
    if (L.showExt || !root) L.ext.forEach((e) => {
      if (!L.showExt && root) return;
      const on = f.ext === e.key, v = f.extVal ? f.extVal[e.key] : undefined;
      stage.appendChild(S("rect", { x: e.x - 10, y: e.y - 10, width: 20, height: 20, rx: 3, fill: on ? "var(--c-compare)" : v !== undefined ? "var(--c-done)" : "var(--panel)", stroke: on ? "var(--c-compare)" : "var(--line-2)", "stroke-width": 1.5, style: "cursor:" + (tool === "grow" ? "pointer" : "default") }));
      if (v !== undefined) stage.appendChild(S("text", { x: e.x, y: e.y + 26, "text-anchor": "middle", "font-size": 11, fill: "var(--ember-2)" }, String(v)));
    });
    const outIdx = {}; (f.out || []).forEach((lab, k) => (outIdx[lab] = k + 1));
    (function walk(t) {
      if (!t) return;
      const p = L.pos[t.id];
      let st = null;
      if (f.cur === t.id && !f.final) st = "active";
      else if (f.chk === t.id) st = "compare";
      else if (onStack.has(t.id)) st = "pivot";
      else if (visitedLabels.has(t.label) || (f.val && f.val[t.id] !== undefined)) st = "done";
      const fill = { active: "var(--c-active)", compare: "var(--c-compare)", pivot: "var(--c-pivot)", done: "var(--c-done)" }[st] || "var(--panel-2)";
      stage.appendChild(S("circle", { cx: p.x, cy: p.y, r: 18, fill, stroke: st ? fill : "var(--line-2)", "stroke-width": 2, style: "cursor:" + (tool === "prune" ? "pointer" : "default") }));
      stage.appendChild(S("text", { x: p.x, y: p.y + 4.5, "text-anchor": "middle", "font-size": t.label.length > 2 ? 11 : 13, "font-weight": 700, fill: st ? "#0d1117" : "var(--ink)" }, t.label));
      if (op !== "height" && op !== "leaves" && outIdx[t.label]) stage.appendChild(S("text", { x: p.x + 21, y: p.y - 14, "font-size": 11, "font-weight": 700, fill: "var(--ember-2)" }, "#" + outIdx[t.label]));
      if (f.val && f.val[t.id] !== undefined) stage.appendChild(S("text", { x: p.x + 21, y: p.y - 14, "font-size": 12, "font-weight": 700, fill: "var(--ember-2)" }, (op === "height" ? "h=" : "=") + f.val[t.id]));
      walk(t.L); walk(t.R);
    })(root);
    const N = count(root);
    stage.appendChild(S("text", { x: 12, y: L.H - 12, "font-size": 12, fill: "var(--muted)" }, `n = ${N} internal nodes (circles), x = ${N + 1} external nodes (squares): x = n + 1`));
    if (!root) stage.appendChild(S("text", { x: L.W / 2, y: 90, "text-anchor": "middle", "font-size": 14, fill: "var(--muted)" }, "Empty tree: click the square to plant a root"));

    // recursion stack / queue
    const byId = {}; (function m(t) { if (t) { byId[t.id] = t; m(t.L); m(t.R); } })(root);
    if (op === "level") {
      $("ds").innerHTML = `<div class="small muted">front → back</div><div class="fx-chips" style="margin-top:6px">${(f.stack || []).map((id, k) => `<span class="${k === 0 ? "on" : ""}">${byId[id].label}</span>`).join("") || '<span class="dim">(empty)</span>'}</div>`;
    } else {
      const calls = (f.stack || []).map((id) => `${NAME[op]}(${byId[id].label})`);
      if (f.ext) calls.push(`${NAME[op]}(∅)`);
      $("ds").innerHTML = `<div class="small muted">bottom ↓ … top ↑</div><div class="calls" style="margin-top:6px">${calls.map((c, k) => `<span class="${k === calls.length - 1 ? "top" : ""}">${c}</span>`).join("") || '<span>(no active calls)</span>'}</div>`;
    }
    if (op === "height" || op === "leaves") {
      const r = root && f.val[root.id] !== undefined ? f.val[root.id] : null;
      $("out").innerHTML = `<div class="k" style="margin-top:0">${op === "height" ? "Height(root)" : "LeafCount(root)"}</div><div style="font:700 1.6rem var(--mono)">${r == null ? (root ? "…" : op === "height" ? (f.final ? "−1" : "…") : f.final ? "0" : "…") : r}</div>`;
    } else {
      $("out").innerHTML = `<div class="fx-chips">${(f.out || []).map((x, k) => `<span class="${k === f.out.length - 1 && !f.final ? "on" : "done"}">${x}</span>`).join("") || '<span class="dim">(nothing yet)</span>'}</div>`;
    }
    const c = { "calls": f.calls, "T = ∅ checks": f.checks };
    if (op === "height") Object.assign(c, { additions: f.adds, "2n + 1": 2 * N + 1 });
    else if (op === "leaves") Object.assign(c, { additions: f.adds, leaves: leaves(root) });
    else if (op === "level") Object.assign(c, { visited: (f.out || []).length, enqueued: f.enq });
    else Object.assign(c, { visited: (f.out || []).length, "2n + 1": 2 * N + 1 });
    ctr.set(c);
  }
  const player = Forge.player($("player"), {
    frames: [], fps: 2,
    render(f, i) {
      draw(f); code.highlight(f.line); say.say(f.text);
      if (f.ask) { const key = runId + ":" + i; pred.show(f.ask, key); if (pred.shouldPause(key)) player.pause(); } else pred.hide();
    },
  });
  function rerecord() {
    layout();
    runId++;
    player.load(op === "level" ? recLevel() : recRecursive());
  }
  function setOp(o) {
    op = o;
    document.querySelectorAll("#ops button").forEach((b) => b.classList.toggle("on", b.dataset.o === o));
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), LINES[o]);
    const init = { calls: 0, "T = ∅ checks": 0 };
    if (o === "height" || o === "leaves") Object.assign(init, { additions: 0, [o === "height" ? "2n + 1" : "leaves"]: 0 });
    else if (o === "level") Object.assign(init, { visited: 0, enqueued: 0 });
    else Object.assign(init, { visited: 0, "2n + 1": 0 });
    ctr = Forge.counters($("ctr"), init);
    $("dsTitle").textContent = o === "level" ? "Queue" : "Recursion stack (active calls)";
    $("legend").innerHTML = [["var(--c-active)", "current call"], ["var(--c-pivot)", o === "level" ? "waiting in the queue" : "waiting on the stack"], ["var(--c-done)", o === "height" || o === "leaves" ? "returned" : "visited"], ["var(--c-compare)", o === "level" ? "child being enqueued" : "call on ∅ (external)"]]
      .map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join("") + `<span><i style="background:var(--panel);border:1.5px solid var(--line-2)"></i>external node □</span>`;
    rerecord();
  }

  /* ---------------------------------------------------------------- editing */
  stage.addEventListener("click", (e) => {
    if (!LAY) return;
    const p = FX.pt(stage, e);
    if (tool === "grow") {
      const hit = LAY.ext.find((x) => Math.abs(x.x - p.x) < 14 && Math.abs(x.y - p.y) < 14);
      if (!hit || (!LAY.showExt && root)) return;
      if (count(root) >= 20) { say.say("20 nodes is the limit here."); return; }
      const nn = node(nextLabel());
      if (!hit.parent) root = nn; else hit.parent[hit.side] = nn;
      rerecord();
    } else {
      let target = null;
      (function f(t, parent, side) { if (!t || target) return; const q = LAY.pos[t.id]; if (Math.hypot(q.x - p.x, q.y - p.y) < 20) { target = { parent, side }; return; } f(t.L, t, "L"); f(t.R, t, "R"); })(root, null, null);
      if (!target) return;
      if (!target.parent) root = null; else target.parent[target.side] = null;
      rerecord();
    }
  });
  document.querySelectorAll("#ops button").forEach((b) => (b.onclick = () => setOp(b.dataset.o)));
  document.querySelectorAll("#tool button").forEach((b) => (b.onclick = () => {
    tool = b.dataset.t; document.querySelectorAll("#tool button").forEach((x) => x.classList.toggle("on", x === b)); if (lastFrame) draw(lastFrame);
  }));
  $("ext").onchange = () => { layout(); if (lastFrame) draw(lastFrame); };
  $("preset").onchange = () => { root = preset($("preset").value); rerecord(); };
  $("build").onclick = () => {
    const keys = $("keys").value.split(/[\s,]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x)).slice(0, 20);
    if (!keys.length) { say.say("Type some numbers, e.g. 8 3 10 1 6."); return; }
    root = fromKeys(keys); rerecord();
  };
  $("rand").onclick = () => {
    const n = 6 + Math.floor(Math.random() * 6), set = new Set();
    while (set.size < n) set.add(1 + Math.floor(Math.random() * 99));
    $("keys").value = [...set].join(" ");
    root = fromKeys([...set]); rerecord();
  };
  root = preset("levitin");
  setOp("pre");
})();
