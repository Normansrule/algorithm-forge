/* Forge Arena — 🧱 Blocks mode (a Parsons puzzle).
   The reference pseudocode is cut into lines (indentation removed) and shuffled together with any
   problem.distractors. The ALGORITHM header stays fixed on top. The learner orders + indents the blocks
   (drag with a mouse/pen or the grip; on every device: tap to select, then ↑ ↓ ⇤ ⇥ 🗑), then presses Check.
   The assembled code is graded by the same worker as typed pseudocode. */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const el = (...a) => Forge.el(...a);
  const STEP = 26; // px per indent level
  const MAXLVL = 8;

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /** Cut a solution into {header, blocks:[{id, text, level, distractor}]} */
  Arena.parsonsPieces = function (problem) {
    const src = String((problem.solution && problem.solution.pseudo) || "").replace(/\t/g, "    ");
    const lines = src.split("\n");
    let k = lines.findIndex((l) => /^\s*(ALGORITHM|FUNCTION|PROCEDURE)\b/i.test(l));
    if (k < 0) k = lines.findIndex((l) => l.trim());
    // top-level lines before the first header (shared globals) stay fixed above it, like the header itself
    const prelude = lines.slice(0, Math.max(0, k)).filter((l) => l.trim() && !/^\s*(\/\/|#|▷)/.test(l)).map((l) => l.replace(/\s+$/, ""));
    const header = prelude.concat([(lines[k] || "").trim()]).join("\n");
    const headIndent = ((lines[k] || "").match(/^ */) || [""])[0].length;
    const blocks = [];
    let n = 0;
    const hid = (str) => { let h = 2166136261; for (let q = 0; q < str.length; q++) { h ^= str.charCodeAt(q); h = Math.imul(h, 16777619); } return "k" + (h >>> 0).toString(36); };
    for (let i = k + 1; i < lines.length; i++) {
      const raw = lines[i];
      const t = raw.trim();
      if (!t || /^(\/\/|#|▷)/.test(t)) continue; // blank and comment-only lines are not blocks
      const ind = raw.match(/^ */)[0].length - headIndent;
      blocks.push({ id: hid(problem.id + "|" + n++ + "|" + t), text: t.replace(/\s{2,}\/\//, "   //"), level: Math.max(0, Math.round(ind / 4)), distractor: false });
    }
    (problem.distractors || []).forEach((d, j) => {
      const text = typeof d === "string" ? d : d && (d.code || d.line || d.text);
      if (text) blocks.push({ id: hid(problem.id + "|x" + j + "|" + text), text: String(text).trim(), level: 1, distractor: true, why: d && d.why });
    });
    return { header, blocks };
  };

  function Blocks(host, opts) {
    this.opts = opts;
    this.problem = opts.problem;
    const pieces = Arena.parsonsPieces(this.problem);
    this.header = pieces.header;
    this.byId = {};
    pieces.blocks.forEach((b) => (this.byId[b.id] = b));
    this.ids = pieces.blocks.map((b) => b.id);
    this.selected = null;
    this.root = el("div", { class: "parsons" });
    host.appendChild(this.root);
    const saved = opts.saved;
    if (saved && Array.isArray(saved.order) && Array.isArray(saved.aside) && sameSet(saved.order.concat(saved.aside), this.ids)) {
      this.state = { order: saved.order.slice(), aside: saved.aside.slice(), level: Object.assign({}, saved.level || {}) };
    } else this.shuffle(0);
    this.build();
    this.render();
  }
  function sameSet(a, b) { if (a.length !== b.length) return false; const s = new Set(a); return b.every((x) => s.has(x)); }

  Blocks.prototype.shuffle = function (salt) {
    const r = Forge.rng(hash(this.problem.id) + (salt || 0) * 7919);
    const order = this.ids.slice();
    for (let tries = 0; tries < 5; tries++) {
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      if (order.length < 3 || order.some((id, i) => id !== this.ids[i])) break;
    }
    const level = {};
    order.forEach((id) => (level[id] = 1));
    this.state = { order, aside: [], level };
  };

  Blocks.prototype.build = function () {
    const R = this.root;
    R.innerHTML = "";
    const tb = (label, title, fn, cls) => el("button", { class: "btn icon sm " + (cls || ""), type: "button", title, "aria-label": title, onclick: fn }, label);
    this.btnUp = tb("↑", "Move block up (Alt+↑)", () => this.move(-1));
    this.btnDown = tb("↓", "Move block down (Alt+↓)", () => this.move(1));
    this.btnOut = tb("⇤", "Outdent block (←)", () => this.indent(-1));
    this.btnIn = tb("⇥", "Indent block (→)", () => this.indent(1));
    this.btnAside = tb("🗑", "Set block aside (Delete)", () => this.toggleAside());
    this.selLabel = el("span", { class: "pz-sel muted small", "aria-live": "polite" }, "Tap a block to select it");
    this.toolbar = el("div", { class: "pz-tools", role: "toolbar", "aria-label": "Move the selected block" }, this.btnUp, this.btnDown, this.btnOut, this.btnIn, this.btnAside, this.selLabel);
    this.list = el("ol", { class: "pz-list", role: "listbox", "aria-label": "Your algorithm: arrange and indent these lines", "data-zone": "list" });
    this.aside = el("ol", { class: "pz-list pz-aside-list", role: "listbox", "aria-label": "Set-aside blocks (not used)", "data-zone": "aside" });
    this.preview = el("div", { class: "pz-preview", hidden: true });
    const nD = Object.values(this.byId).filter((b) => b.distractor).length;
    R.appendChild(el("div", { class: "pz-intro small" },
      el("b", null, "Arrange the lines into a working algorithm."), " Drag them (or tap one, then use the arrows). Indentation matters: ⇥ puts a line inside the loop or if above it.",
      nD ? el("span", null, " ", el("b", null, "Heads-up:"), ` ${nD === 1 ? "one block is a decoy" : "some blocks are decoys"} — set ${nD === 1 ? "it" : "them"} aside with 🗑.`) : null));
    R.appendChild(this.toolbar);
    R.appendChild(el("div", { class: "pz-board" },
      el("div", { class: "pz-head", title: "The header is fixed" }, el("span", { class: "lock", "aria-hidden": "true" }, "🔒"), el("code", { html: Arena.highlight(this.header, "pseudo").join("\n") })),
      this.list));
    R.appendChild(el("div", { class: "pz-aside" }, el("div", { class: "panel-title" }, "Set aside — not part of your algorithm"), this.aside));
    const peek = el("button", { class: "btn sm ghost", type: "button", "aria-expanded": "false" }, "👀 Show as code");
    peek.addEventListener("click", () => {
      this.preview.hidden = !this.preview.hidden;
      peek.setAttribute("aria-expanded", String(!this.preview.hidden));
      peek.textContent = this.preview.hidden ? "👀 Show as code" : "🙈 Hide code";
      this.renderPreview();
    });
    this.peekBtn = peek;
    R.appendChild(el("div", { class: "row pz-foot" },
      peek,
      el("button", { class: "btn sm ghost", type: "button", onclick: () => { this.shuffle(Date.now() % 1000); this.selected = null; this.render(); this.save(); Arena.announce("Blocks shuffled"); } }, "🔀 Shuffle again"),
      this.opts.onToEditor ? el("button", { class: "btn sm ghost", type: "button", onclick: () => this.opts.onToEditor(this.code()) }, "✍️ Open in Pseudocode editor") : null));
    R.appendChild(this.preview);
    this.bindDrag();
  };

  Blocks.prototype.blockEl = function (id, zone) {
    const b = this.byId[id];
    const lvl = zone === "list" ? this.state.level[id] || 0 : 0;
    const li = el("li", { class: "pz-block" + (this.selected === id ? " sel" : ""), role: "option", tabindex: "-1", "aria-selected": this.selected === id ? "true" : "false", "data-id": id, "data-lvl": zone === "list" ? lvl : null,
      "aria-label": b.text + (zone === "list" ? `, indent level ${lvl}` : ", set aside") },
    el("span", { class: "grip", "aria-hidden": "true", title: "Drag" }, "⠿"),
    el("code", { html: Arena.highlight(b.text, "pseudo")[0] }));
    li.style.setProperty("--lvl", lvl);
    return li;
  };

  Blocks.prototype.render = function () {
    const focusId = document.activeElement && document.activeElement.closest && document.activeElement.closest(".pz-block") ? document.activeElement.getAttribute("data-id") : null;
    this.list.innerHTML = "";
    this.aside.innerHTML = "";
    this.state.order.forEach((id) => this.list.appendChild(this.blockEl(id, "list")));
    this.state.aside.forEach((id) => this.aside.appendChild(this.blockEl(id, "aside")));
    if (!this.state.aside.length) this.aside.appendChild(el("li", { class: "pz-empty muted small" }, "Nothing set aside. Decoy lines go here."));
    if (!this.state.order.length) this.list.appendChild(el("li", { class: "pz-empty muted small" }, "Drag blocks back here."));
    // roving tabindex
    const all = [...this.root.querySelectorAll(".pz-block")];
    const keep = all.find((x) => x.getAttribute("data-id") === (this.selected || focusId)) || all[0];
    if (keep) keep.tabIndex = 0;
    if (focusId) { const f = all.find((x) => x.getAttribute("data-id") === focusId); if (f) f.focus({ preventScroll: true }); }
    const sel = this.selected;
    const inList = sel && this.state.order.includes(sel);
    this.btnUp.disabled = !sel || (inList ? this.state.order.indexOf(sel) === 0 : this.state.aside.indexOf(sel) === 0);
    this.btnDown.disabled = !sel || (inList ? this.state.order.indexOf(sel) === this.state.order.length - 1 : this.state.aside.indexOf(sel) === this.state.aside.length - 1);
    this.btnOut.disabled = !inList || (this.state.level[sel] || 0) <= 0;
    this.btnIn.disabled = !inList || (this.state.level[sel] || 0) >= MAXLVL;
    this.btnAside.disabled = !sel;
    this.btnAside.textContent = sel && !inList ? "↩" : "🗑";
    this.btnAside.title = this.btnAside.ariaLabel = sel && !inList ? "Put block back into the algorithm (Delete)" : "Set block aside (Delete)";
    this.btnAside.setAttribute("aria-label", this.btnAside.title);
    this.selLabel.textContent = sel ? "Selected: " + this.byId[sel].text.slice(0, 40) + (this.byId[sel].text.length > 40 ? "…" : "") : "Tap a block to select it";
    this.renderPreview();
  };
  Blocks.prototype.renderPreview = function () {
    if (!this.preview || this.preview.hidden) return;
    this.preview.innerHTML = "";
    this.preview.appendChild(Arena.codeBlock(this.code(), "pseudo"));
  };

  Blocks.prototype.code = function () {
    return [this.header].concat(this.state.order.map((id) => "    ".repeat(this.state.level[id] || 0) + this.byId[id].text)).join("\n");
  };
  Blocks.prototype.save = function () { if (this.opts.onSave) this.opts.onSave(JSON.parse(JSON.stringify(this.state))); };
  Blocks.prototype.zoneOf = function (id) { return this.state.order.includes(id) ? "order" : "aside"; };

  Blocks.prototype.select = function (id) {
    this.selected = this.selected === id ? null : id;
    this.render();
    const n = this.root.querySelector(`.pz-block[data-id="${id}"]`);
    if (n) n.focus({ preventScroll: true });
  };
  Blocks.prototype.move = function (d) {
    const id = this.selected; if (!id) return;
    const arr = this.state[this.zoneOf(id)];
    const k = arr.indexOf(id), j = k + d;
    if (j < 0 || j >= arr.length) return;
    [arr[k], arr[j]] = [arr[j], arr[k]];
    this.render(); this.save(); this.focusSel();
    Arena.announce(`Moved to position ${j + 1} of ${arr.length}`);
  };
  Blocks.prototype.indent = function (d) {
    const id = this.selected; if (!id || this.zoneOf(id) !== "order") return;
    this.state.level[id] = Math.max(0, Math.min(MAXLVL, (this.state.level[id] || 0) + d));
    this.render(); this.save(); this.focusSel();
    Arena.announce(`Indent level ${this.state.level[id]}`);
  };
  Blocks.prototype.toggleAside = function () {
    const id = this.selected; if (!id) return;
    if (this.zoneOf(id) === "order") { this.state.order.splice(this.state.order.indexOf(id), 1); this.state.aside.push(id); Arena.announce("Set aside"); }
    else { this.state.aside.splice(this.state.aside.indexOf(id), 1); this.state.order.push(id); this.state.level[id] = this.state.level[id] || 1; Arena.announce("Put back at the end of your algorithm"); }
    this.render(); this.save(); this.focusSel();
  };
  Blocks.prototype.focusSel = function () {
    const n = this.selected && this.root.querySelector(`.pz-block[data-id="${this.selected}"]`);
    if (n) { n.focus({ preventScroll: true }); n.scrollIntoView({ block: "nearest" }); }
  };

  /* ---- keyboard + pointer ---- */
  Blocks.prototype.bindDrag = function () {
    const R = this.root;
    R.addEventListener("keydown", (e) => {
      const li = e.target.closest && e.target.closest(".pz-block");
      if (!li) return;
      const id = li.getAttribute("data-id");
      if (/^(Arrow|Delete|Backspace|Enter| )/.test(e.key)) e.stopPropagation(); // keep the trace player's global arrow keys out of it
      const all = [...R.querySelectorAll(".pz-block")];
      const k = all.indexOf(li);
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.select(id); return; }
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); this.selected = id; this.move(e.key === "ArrowUp" ? -1 : 1); return; }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const n = all[k + (e.key === "ArrowUp" ? -1 : 1)];
        if (n) { all.forEach((x) => (x.tabIndex = -1)); n.tabIndex = 0; n.focus(); }
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); this.selected = id; this.indent(e.key === "ArrowRight" ? 1 : -1); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); this.selected = id; this.toggleAside(); }
    });
    let drag = null;
    R.addEventListener("pointerdown", (e) => {
      const li = e.target.closest(".pz-block");
      if (!li || e.button > 0) return;
      const onGrip = !!e.target.closest(".grip");
      if (e.pointerType !== "mouse" && e.pointerType !== "pen" && !onGrip) { drag = { id: li.getAttribute("data-id"), li, tapOnly: true, x: e.clientX, y: e.clientY }; return; }
      if (onGrip) e.preventDefault();
      drag = { id: li.getAttribute("data-id"), li, x: e.clientX, y: e.clientY, started: false, pid: e.pointerId };
    });
    const start = (e) => {
      const d = drag;
      d.started = true;
      const rect = d.li.getBoundingClientRect();
      d.dx = e.clientX - rect.left; d.dy = e.clientY - rect.top;
      d.ghost = d.li.cloneNode(true);
      d.ghost.classList.add("pz-ghost");
      d.ghost.style.width = rect.width + "px";
      document.body.appendChild(d.ghost);
      d.ph = el("li", { class: "pz-ph", "aria-hidden": "true" });
      d.li.replaceWith(d.ph);
      d.baseLvl = this.zoneOf(d.id) === "order" ? this.state.level[d.id] || 0 : 1;
      document.body.classList.add("pz-dragging");
      try { R.setPointerCapture && d.pid != null && R.setPointerCapture(d.pid); } catch (err) { /* ignore */ }
    };
    R.addEventListener("pointermove", (e) => {
      const d = drag;
      if (!d || d.tapOnly) return;
      if (!d.started) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return; start(e); }
      e.preventDefault();
      d.ghost.style.transform = `translate(${e.clientX - d.dx}px, ${e.clientY - d.dy}px)`;
      // which zone + index?
      const zones = [this.list, this.aside];
      let zone = null;
      for (const z of zones) { const r = z.getBoundingClientRect(); if (e.clientY >= r.top - 24 && e.clientY <= r.bottom + 24 && e.clientX >= r.left - 40 && e.clientX <= r.right + 40) zone = z; }
      if (!zone) return;
      const items = [...zone.querySelectorAll(".pz-block")];
      let before = null;
      for (const it of items) { const r = it.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = it; break; } }
      const empty = zone.querySelector(".pz-empty");
      if (empty) empty.remove();
      if (before) zone.insertBefore(d.ph, before); else zone.appendChild(d.ph);
      d.lvl = zone === this.list ? Math.max(0, Math.min(MAXLVL, d.baseLvl + Math.round((e.clientX - d.x) / STEP))) : 0;
      d.ph.style.setProperty("--lvl", d.lvl);
      d.ph.setAttribute("data-lvl", zone === this.list ? "indent " + d.lvl : "");
    });
    const end = (e) => {
      const d = drag;
      drag = null;
      if (!d) return;
      if (!d.started) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) this.select(d.id);
        return;
      }
      document.body.classList.remove("pz-dragging");
      d.ghost.remove();
      // read the new arrangement from the DOM (placeholder = the dragged block)
      const read = (zone) => [...zone.children].map((c) => (c === d.ph ? d.id : c.getAttribute("data-id"))).filter(Boolean);
      const order = read(this.list), aside = read(this.aside);
      this.state.order = order;
      this.state.aside = aside;
      if (order.includes(d.id)) this.state.level[d.id] = d.lvl != null ? d.lvl : d.baseLvl;
      this.selected = d.id;
      this.render(); this.save(); this.focusSel();
    };
    R.addEventListener("pointerup", end);
    R.addEventListener("pointercancel", (e) => { if (drag && drag.started) end(e); else drag = null; });
  };

  /** Outline the block that sits on line `line` of the assembled code (1-based). */
  Blocks.prototype.markError = function (line) {
    this.root.querySelectorAll(".pz-err").forEach((x) => x.classList.remove("pz-err"));
    const idx = (line || 0) - this.header.split("\n").length - 1;
    const id = this.state.order[idx];
    const li = id && this.root.querySelector(`.pz-list[data-zone=list] .pz-block[data-id="${id}"]`);
    if (li) { li.classList.add("pz-err"); li.scrollIntoView({ block: "nearest" }); }
    return !!li;
  };
  Blocks.prototype.hasDistractorInList = function () { return this.state.order.some((id) => this.byId[id].distractor); };
  Blocks.prototype.realAside = function () { return this.state.aside.filter((id) => !this.byId[id].distractor).length; };

  Arena.Blocks = Blocks;
})();
