// Parses every ```pseudo / ``` block that contains an ALGORITHM header in lessons/, cheatsheets/ and practice/
// with the Forge Pseudocode engine, so the pseudocode you read is the same language the Arena runs.
// A ```text fence marks a deliberate outline or fill-in-the-blanks template; those are counted but not parsed.
// Usage: node tools/check-lesson-pseudocode.mjs [--verbose]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const F = require("../docs/engine/forge-pseudo.js");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const verbose = process.argv.includes("--verbose");
const files = [];
for (const dir of ["lessons", "cheatsheets", "practice"]) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (p.endsWith(".md")) files.push(p);
  });
  walk(path.join(ROOT, dir));
}
let blocks = 0, bad = 0, outlines = 0;
for (const f of files) {
  const md = fs.readFileSync(f, "utf8");
  const re = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md))) {
    const lang = m[1].toLowerCase(), code = m[2];
    if (!/^\s*(ALGORITHM|Algorithm)\s+\w+\s*\(/m.test(code)) continue;
    if (lang === "text") { outlines++; continue; }
    if (lang && !["", "pseudo", "pseudocode", "forge"].includes(lang)) continue;
    blocks++;
    try { F.parse(code); }
    catch (e) {
      bad++;
      const line = md.slice(0, m.index).split("\n").length + (e.line || 0);
      console.log(`✗ ${path.relative(ROOT, f)}:${line}  ${e.message}`);
      if (verbose) console.log(code.split("\n").slice(0, 8).map((l) => "    | " + l).join("\n"));
    }
  }
}
console.log(`\n${blocks - bad}/${blocks} ALGORITHM blocks parse as Forge Pseudocode` + (outlines ? ` (${outlines} \`\`\`text outlines skipped)` : ""));
process.exitCode = bad ? 1 : 0;
