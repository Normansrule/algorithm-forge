/* Forge Arena — renders a grading report (from ForgeCheck.check via the worker). */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const el = (...a) => Forge.el(...a);
  const S = (...a) => Forge.svg(...a);

  const KIND = {
    mutant: { icon: "🔎", title: "Looks like…", cls: "steel" },
    growth: { icon: "📈", title: "Efficiency", cls: "warn" },
    budget: { icon: "🧮", title: "Too many operations", cls: "warn" },
    forbid: { icon: "🚫", title: "Build it yourself", cls: "bad" },
    lint: { icon: "💡", title: "Spotted in your code", cls: "steel" },
    observe: { icon: "🔬", title: "Look closely", cls: "steel" },
    error: { icon: "⚠️", title: "Error", cls: "bad" },
    blocks: { icon: "🧩", title: "Puzzle tip", cls: "steel" },
  };

  const CLASSES = {
    "1": () => 1, "log n": (n) => Math.log2(n + 1), "sqrt n": (n) => Math.sqrt(n), "n": (n) => n,
    "n log n": (n) => n * Math.log2(n + 1), "n^2": (n) => n * n, "n^2 log n": (n) => n * n * Math.log2(n + 1),
    "n^3": (n) => n * n * n, "2^n": (n) => Math.pow(2, n), "n!": (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; },
  };

  /** Tiny inline chart: learner's ops vs n, plus the target class scaled through the first point. */
  Arena.growthChart = function (g) {
    const pts = (g.points || []).filter((p) => p && Number.isFinite(p.ops));
    if (pts.length < 2) return null;
    const W = 320, H = 150, L = 44, R = 12, T = 12, B = 30;
    const f = CLASSES[g.expect] || CLASSES.n;
    const c = pts[0].ops / Math.max(1e-9, f(pts[0].n));
    const target = pts.map((p) => ({ n: p.n, ops: c * f(p.n) }));
    const maxX = Math.max(...pts.map((p) => p.n)), minX = Math.min(...pts.map((p) => p.n));
    const maxY = Math.max(1, ...pts.map((p) => p.ops), ...target.map((p) => p.ops));
    const X = (n) => L + ((n - minX) / Math.max(1, maxX - minX)) * (W - L - R);
    const Y = (v) => H - B - (v / maxY) * (H - T - B);
    const path = (ps) => ps.map((p, i) => (i ? "L" : "M") + X(p.n).toFixed(1) + " " + Y(p.ops).toFixed(1)).join(" ");
    const s = S("svg", { class: "growth-chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Operations versus n: yours grows like ${Arena.fmtClass(g.fitted)}, target ${Arena.fmtClass(g.expect)}` });
    s.appendChild(S("line", { x1: L, y1: H - B, x2: W - R, y2: H - B, stroke: "var(--line-2)" }));
    s.appendChild(S("line", { x1: L, y1: T, x2: L, y2: H - B, stroke: "var(--line-2)" }));
    pts.forEach((p) => s.appendChild(S("text", { x: X(p.n), y: H - B + 14, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, String(p.n))));
    s.appendChild(S("text", { x: (L + W - R) / 2, y: H - 3, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, "input size n"));
    s.appendChild(S("text", { x: L - 6, y: T + 8, "text-anchor": "end", "font-size": 9, fill: "var(--muted)" }, fmtBig(maxY)));
    s.appendChild(S("text", { x: L - 6, y: H - B, "text-anchor": "end", "font-size": 9, fill: "var(--muted)" }, "0"));
    s.appendChild(S("path", { d: path(target), fill: "none", stroke: "var(--steel)", "stroke-width": 2, "stroke-dasharray": "5 4" }));
    s.appendChild(S("path", { d: path(pts), fill: "none", stroke: g.ok ? "var(--ok)" : "var(--ember)", "stroke-width": 2.5 }));
    pts.forEach((p) => s.appendChild(S("circle", { cx: X(p.n), cy: Y(p.ops), r: 3.2, fill: g.ok ? "var(--ok)" : "var(--ember)" })));
    const box = el("div", { class: "growth" }, s,
      el("div", { class: "legend" },
        el("span", null, el("i", { style: { background: g.ok ? "var(--ok)" : "var(--ember)" } }), "yours ≈ " + Arena.fmtClass(g.fitted)),
        el("span", null, el("i", { style: { background: "var(--steel)" } }), "target " + Arena.fmtClass(g.expect) + " shape"),
        el("span", { class: "muted" }, "counting " + ((Arena.METRIC[g.metric] || [g.metric, g.metric])[1]))));
    return box;
  };
  function fmtBig(v) { return v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e4 ? Math.round(v / 1e3) + "k" : String(Math.round(v)); }

  function lineOf(msg) { const m = /Line (\d+)/i.exec(msg || ""); return m ? +m[1] : null; }

  /** Pick the op metric shown on each test row. */
  function metricFor(problem, ops) {
    if (!ops) return null;
    if (problem.budget) return { metric: problem.budget.metric, label: problem.budget.label };
    if (problem.growth && problem.growth.metric) return { metric: problem.growth.metric };
    if (ops.keyComparisons > 0) return { metric: "keyComparisons" };
    return { metric: "steps" };
  }

  /**
   * ctx: {problem, lang, mode, hintsLeft, onHint(), onGotoLine(n), onWatch(args), extraNudges: [{kind,message}],
   *       interview: true → pass/fail counts only (plus the raw error if the code didn't run); nudges stay hidden}
   */
  Arena.renderReport = function (report, ctx) {
    const p = ctx.problem;
    const passed = report.status === "passed";
    const isRun = report.mode === "run";
    const box = el("section", { class: "report " + (passed ? "is-pass" : report.status === "error" ? "is-error" : "is-fail"), "aria-label": "Results" });

    // ---- headline
    let icon, head, sub;
    if (report.offline) { icon = "🐍"; head = "Python isn't available right now"; sub = "Your draft is saved — switch to ✍️ Pseudocode or JS to keep going."; }
    else if (report.status === "error") { icon = "⚠️"; head = "Your code didn't run"; sub = "Fix the error below, then try again."; }
    else if (passed && !isRun) { icon = "✅"; head = "Accepted"; sub = `All ${report.total} tests pass` + (report.growth ? ` · efficiency ${Arena.fmtClass(report.growth.fitted)} ✓` : "") + "."; }
    else if (passed) { icon = "✅"; head = `${report.passed} of ${report.total} examples pass`; sub = "Nice! Now Submit to face every test (hidden + random" + (p.growth && ctx.lang === "pseudo" ? " + an efficiency check" : "") + ")."; }
    else { icon = "❌"; head = `${report.passed} of ${report.total} passed`; sub = isRun ? "Some examples fail — read the nudges below." : "Not accepted yet — the nudges below point at what to fix."; }
    if (ctx.interview && !passed && !report.offline) {
      if (report.status === "error") sub = "Fix the error below, then try again.";
      else if (report.passed === report.total && report.total) { head = `${report.passed} of ${report.total} passed — not accepted`; sub = report.forbidden && report.forbidden.length ? "A built-in this problem asks you to write yourself is in your code." : "Every answer is right, but the efficiency check failed."; }
      else sub = "Interview mode: nudges and details unlock when the interview ends.";
    }
    const langName = { pseudo: "Pseudocode", js: "JavaScript", python: "Python", blocks: "Blocks" }[ctx.lang] || ctx.lang;
    box.appendChild(el("div", { class: "rep-head" },
      el("span", { class: "rep-icon", "aria-hidden": "true" }, icon),
      el("div", null,
        el("div", { class: "rep-title" }, head),
        el("div", { class: "rep-sub" }, sub, " ", el("span", { class: "muted" }, `${isRun ? "Run" : "Submit"} · ${langName}${report.ms != null ? " · " + (report.ms < 1000 ? report.ms + " ms" : (report.ms / 1000).toFixed(1) + " s") : ""}`)))));

    // ---- nudges
    let nudges = (report.diagnosis || []).slice();
    (ctx.extraNudges || []).forEach((n) => nudges.push(n));
    if (ctx.interview) nudges = nudges.filter((d) => d.kind === "error");
    if (nudges.length) {
      const list = el("div", { class: "nudges" }, el("div", { class: "panel-title" }, "Nudges"));
      nudges.forEach((d) => {
        const k = KIND[d.kind] || KIND.observe;
        let msg = d.message || "";
        let title = k.title;
        if (d.kind === "mutant" && /^Likely issue: /.test(msg)) { msg = msg.replace(/^Likely issue: /, ""); title = "Looks like… (probably)"; }
        const body = el("div", { class: "nudge-body" }, el("div", { class: "nudge-title" }, title), el("div", { class: "nudge-msg" }, msg));
        if (d.kind === "error") {
          const ln = (report.compileError && report.compileError.line) || lineOf(msg) || (report.tests || []).map((t) => t.error && t.error.line).find(Boolean);
          if (ln && ctx.onGotoLine && ctx.lang !== "blocks") body.appendChild(el("button", { class: "linkbtn", type: "button", onclick: () => ctx.onGotoLine(ln) }, `→ Go to line ${ln}`));
        }
        if (d.kind === "observe" && d.test != null) {
          body.appendChild(el("button", { class: "linkbtn", type: "button", onclick: () => { const r = box.querySelector(`[data-test="${d.test}"]`); if (r) { if (r.closest("details")) r.closest("details").open = true; r.scrollIntoView({ block: "center" }); r.classList.add("pulse"); setTimeout(() => r.classList.remove("pulse"), 1400); } } }, "→ Show that test"));
        }
        if (d.kind === "growth" && report.growth) { const ch = Arena.growthChart(report.growth); if (ch) body.appendChild(ch); }
        list.appendChild(el("div", { class: "nudge callout " + k.cls }, el("span", { class: "nudge-icon", "aria-hidden": "true" }, k.icon), body));
      });
      box.appendChild(list);
    }
    if (ctx.interview) { // counts only: one mark per test, no inputs or expected values
      const tests = report.tests || [];
      if (tests.length) {
        const marks = el("div", { class: "iv-marks", role: "img", "aria-label": `${report.passed} of ${report.total} tests passed` });
        tests.forEach((t) => marks.appendChild(el("i", { class: t.pass ? "ok" : "bad" })));
        box.appendChild(el("div", { class: "tests" }, el("div", { class: "panel-title" }, "Tests"), marks));
      }
      return box;
    }
    if (passed && report.growth && report.growth.ok) {
      const ch = Arena.growthChart(report.growth);
      box.appendChild(el("div", { class: "nudge callout ok" }, el("span", { class: "nudge-icon", "aria-hidden": "true" }, "📈"),
        el("div", { class: "nudge-body" }, el("div", { class: "nudge-title" }, "Efficiency check passed"),
          el("div", { class: "nudge-msg" }, `Your work grows like ${Arena.fmtClass(report.growth.fitted)} — the target is ${Arena.fmtClass(report.growth.expect)}.`), ch)));
    }
    if (!passed && ctx.onHint) {
      box.appendChild(el("div", { class: "stuck" },
        el("span", { class: "muted" }, "Stuck?"),
        el("button", { class: "btn sm", type: "button", onclick: ctx.onHint }, ctx.hintsLeft > 0 ? `💡 Get a nudge (${ctx.hintsLeft} left)` : "💡 Open the hint ladder")));
    }

    // ---- tests
    const tests = report.tests || [];
    if (tests.length) {
      const shown = [], hidden = [];
      tests.forEach((t, i) => ((t.generated && t.pass) ? hidden : shown).push([t, i]));
      const wrap = el("div", { class: "tests" }, el("div", { class: "panel-title" }, "Tests"));
      shown.forEach(([t, i]) => wrap.appendChild(testRow(t, i, p, ctx)));
      if (hidden.length) {
        const d = el("details", { class: "more-tests" }, el("summary", null, `✓ ${hidden.length} random test${hidden.length === 1 ? "" : "s"} passed`));
        hidden.forEach(([t, i]) => d.appendChild(testRow(t, i, p, ctx)));
        wrap.appendChild(d);
      }
      box.appendChild(wrap);
    }
    if (report.printed && report.printed.length) {
      box.appendChild(el("div", { class: "outbox" }, el("div", { class: "panel-title" }, "Output"), el("pre", { class: "out" }, report.printed.join("\n"))));
    }
    return box;
  };

  function testRow(t, i, p, ctx) {
    const row = el("div", { class: "trow " + (t.pass ? "ok" : "bad"), "data-test": i });
    const m = metricFor(p, t.ops);
    let opsText = null;
    if (m && t.ops && t.ops[m.metric] != null) {
      opsText = Arena.metricText(m.metric, t.ops[m.metric], m.label);
      if (t.budget) opsText += ` (limit ${t.budget.limit})`;
    }
    row.appendChild(el("div", { class: "trow-head" },
      el("span", { class: "tmark", "aria-label": t.pass ? "passed" : "failed" }, t.pass ? "✓" : "✗"),
      el("b", null, t.name),
      opsText ? el("span", { class: "chip ops", title: t.ops ? Object.keys(t.ops).filter((k) => t.ops[k]).map((k) => Arena.metricText(k, t.ops[k])).join(" · ") : "" }, opsText) : null,
      ctx.onWatch && ctx.lang === "pseudo" ? el("button", { class: "linkbtn watch", type: "button", title: "Step through your code on this input", onclick: () => ctx.onWatch(t.args) }, "👁 Watch") : null));
    const kv = el("div", { class: "kv" });
    kv.appendChild(el("span", { class: "k" }, "Input"));
    kv.appendChild(el("code", { class: "v" }, t.input));
    if (t.expected != null && !t.pass) { kv.appendChild(el("span", { class: "k" }, p.verify ? "e.g." : "Expected")); kv.appendChild(el("code", { class: "v" }, t.expected)); }
    if (t.got != null) { kv.appendChild(el("span", { class: "k" }, p.output && p.output.arg !== undefined ? (p.params[p.output.arg] || "arg") + " after" : "Got")); kv.appendChild(el("code", { class: "v " + (t.pass ? "good" : "badv") }, t.got)); }
    row.appendChild(kv);
    if (t.why) row.appendChild(el("div", { class: "why" }, t.why));
    if (t.error) {
      const e = el("div", { class: "why err" }, (t.error.line ? `Line ${t.error.line}: ` : "") + t.error.message);
      if (t.error.line && ctx.onGotoLine && ctx.lang !== "blocks") e.appendChild(el("button", { class: "linkbtn", type: "button", onclick: () => ctx.onGotoLine(t.error.line) }, " → Go to line " + t.error.line));
      row.appendChild(e);
    }
    if (t.explain && !t.pass) row.appendChild(el("div", { class: "muted small" }, "💬 " + t.explain));
    if (t.printed && t.printed.length) row.appendChild(el("details", { class: "printed" }, el("summary", null, `Printed ${t.printed.length} line${t.printed.length === 1 ? "" : "s"}`), el("pre", { class: "out" }, t.printed.join("\n"))));
    return row;
  }

  /** Timeout / crash card. */
  Arena.renderProblem = function (title, message, icon) {
    return el("section", { class: "report is-error", "aria-label": "Results" },
      el("div", { class: "rep-head" }, el("span", { class: "rep-icon", "aria-hidden": "true" }, icon || "⏱"),
        el("div", null, el("div", { class: "rep-title" }, title), el("div", { class: "rep-sub" }, message))));
  };
})();
