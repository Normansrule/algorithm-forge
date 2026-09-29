/* Forge Arena — problem loader.
   Page must already have loaded problems/registry.js and problems/index.js (the manifest).
   Arena.loadProblems() injects every pack in manifest order (async=false keeps execution order),
   tolerates missing/broken packs, and resolves with {list, sorted, loaded, missing}. */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  let promise = null;

  Arena.loadProblems = function (base) {
    if (promise) return promise;
    base = base || "problems/";
    const packs = (window.FORGE_PACKS && window.FORGE_PACKS.length ? window.FORGE_PACKS : ["exemplars.js"]).slice();
    const loaded = [], missing = [];
    // A pack that throws while running (e.g. a duplicate id) must not break the page.
    const onErr = (e) => {
      if (e && e.filename && /\/arena\/problems\//.test(e.filename)) {
        const f = e.filename.split("/").pop();
        if (!missing.includes(f)) missing.push(f + " (error)");
        e.preventDefault();
      }
    };
    window.addEventListener("error", onErr);
    promise = Promise.all(packs.map((f) => new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = base + f;
      s.async = false;
      s.onload = () => { loaded.push(f); resolve(); };
      s.onerror = () => { missing.push(f); resolve(); };
      document.head.appendChild(s);
    }))).then(() => {
      window.removeEventListener("error", onErr);
      const P = window.ForgeProblems;
      const sorted = P ? P.sorted() : [];
      return { list: P ? P.list : [], sorted, loaded, missing, packs };
    });
    return promise;
  };

  /** Previous / next problem in the canonical sorted order. */
  Arena.neighbors = function (sorted, id) {
    const k = sorted.findIndex((p) => p.id === id);
    return { prev: k > 0 ? sorted[k - 1] : null, next: k >= 0 && k < sorted.length - 1 ? sorted[k + 1] : null, index: k };
  };
})();
