// Prints the Arena problem bank as JSON: [{id, title, level, chapter, difficulty, topics}]
// Usage: node tools/bank_summary.mjs > /tmp/bank.json
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = path.join(ROOT, "docs/arena/problems");
const ctx = vm.createContext({ console, Math, JSON, Array, Object, Set, Map, Number, String, Infinity, globalThis: {} });
ctx.self = ctx;
vm.runInContext(fs.readFileSync(path.join(dir, "registry.js"), "utf8"), ctx);
const man = vm.createContext({ self: {} }); vm.runInContext(fs.readFileSync(path.join(dir, "index.js"), "utf8"), man);
for (const f of man.self.FORGE_PACKS)
  vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f });
const out = ctx.ForgeProblems.sorted().map((p) => ({ id: p.id, title: p.title, level: p.level, chapter: p.chapter, difficulty: p.difficulty || 1, topics: p.topics }));
process.stdout.write(JSON.stringify({ levels: ctx.ForgeProblems.LEVELS, chapters: ctx.ForgeProblems.CHAPTERS, problems: out }, null, 1));
