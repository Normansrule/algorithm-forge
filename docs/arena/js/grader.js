/* Forge Arena — main-thread client for worker.js.
   Arena.grader.check({id, lang, code, mode}) / .trace({id, code, args}) → Promise.
   Requests are serialized. A request that runs too long gets the worker terminated and recreated:
   pseudocode/JS 10 s, Python 20 s (plus up to 120 s while Pyodide itself downloads). */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const LIMIT = { pseudo: 10000, js: 10000, python: 20000, trace: 10000, loading: 120000 };
  const TOO_LONG = "Took too long — is there a loop whose condition never changes?";

  function Grader(url) {
    this.url = url || "worker.js";
    this.worker = null;
    this.seq = 0;
    this.pending = null;
    this.chain = Promise.resolve();
    this.onStatus = null;
    this.spawn();
  }
  Grader.prototype.spawn = function () {
    if (this.worker) try { this.worker.terminate(); } catch (e) { /* ignore */ }
    this.worker = new Worker(this.url);
    this.worker.onmessage = (ev) => this.receive(ev.data || {});
    this.worker.onerror = (ev) => {
      ev.preventDefault && ev.preventDefault();
      if (this.pending) { const p = this.pending; this.pending = null; clearTimeout(p.timer); p.reject({ fatal: "The grader crashed: " + (ev.message || "unknown error") }); this.spawn(); }
    };
  };
  Grader.prototype.receive = function (m) {
    const p = this.pending;
    if (!p || m.req !== p.req) return;
    if (m.type === "status") {
      clearTimeout(p.timer);
      p.arm(m.phase === "loading-python" ? LIMIT.loading : p.limit);
      if (this.onStatus) this.onStatus(m);
      return;
    }
    this.pending = null;
    clearTimeout(p.timer);
    if (m.fatal) p.reject({ fatal: m.fatal });
    else p.resolve(m.type === "trace" ? m.result : m.type === "pong" ? m : m.report);
  };
  Grader.prototype.send = function (msg, limit) {
    const run = () => new Promise((resolve, reject) => {
      const req = ++this.seq;
      const p = { req, resolve, reject, limit, timer: null };
      p.arm = (ms) => {
        p.timer = setTimeout(() => {
          if (this.pending !== p) return;
          this.pending = null;
          this.spawn(); // kill the stuck worker, start a fresh one
          reject({ timeout: true, message: TOO_LONG, ms });
        }, ms);
      };
      this.pending = p;
      p.arm(limit);
      this.worker.postMessage(Object.assign({ req }, msg));
    });
    const out = this.chain.then(run, run);
    this.chain = out.catch(() => {});
    return out;
  };
  Grader.prototype.check = function (o) { return this.send({ type: "check", id: o.id, lang: o.lang, code: o.code, mode: o.mode || "run" }, LIMIT[o.lang] || 10000); };
  Grader.prototype.trace = function (o) { return this.send({ type: "trace", id: o.id, code: o.code, args: o.args }, LIMIT.trace); };
  Grader.prototype.ping = function () { return this.send({ type: "ping", id: null }, 10000); };

  Arena.Grader = Grader;
  Arena.TOO_LONG = TOO_LONG;
})();
