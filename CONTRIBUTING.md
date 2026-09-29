# Contributing to Algorithm Forge

Thanks for helping people learn algorithms! This repo has four kinds of content. Each has a checker, so you can tell
whether your change works before you open a pull request.

| You want to add… | Where | Checked by |
|---|---|---|
| An Arena problem | `docs/arena/problems/<pack>.js` | `node tools/validate-problems.mjs <pack>.js` |
| A simulation | `docs/sims/<name>.html` (+ `docs/sims/js/<name>.js`) | `python3 tools/check_pages.py docs/sims/<name>.html` |
| A lesson section | `lessons/NN-slug/README.md` | `node tools/check-lesson-pseudocode.mjs` + `python3 tools/check_links.py` |
| Library code | `src/python/algoforge/`, `src/java/algoforge/` | `python3 -m pytest`, `javac … && java algoforge.SelfTest` |

`npm test` runs the Node checks in one go; Continuous Integration (CI) runs all of them on every push.

## House rules

1. **Never paste textbook text.** Paraphrase, invent your own examples where you can, and cite: "(Levitin §4.4)",
   "Levitin Exercise 3.1.4 (adapted)". Classic named examples (Euclid's gcd(60, 24), the knapsack instance) are fine.
2. **Spell out every acronym the first time it appears on a page**, like "Depth-First Search (DFS)".
3. **Recommend English-language resources only**, and only links you have checked.
4. **Pseudocode is Forge Pseudocode** (Levitin style; see [`cheatsheets/pseudocode-reference.md`](cheatsheets/pseudocode-reference.md)).
   If it's written as an `ALGORITHM Name(...)` block, it must parse. If it's only an outline, fence it as ```` ```text ````.
5. **Every learner, every brain:** give a picture, a story, a block-by-block build, a hand trace, code, the math, and a
   self-check. A visual with no words, or math with no picture, leaves someone behind.

## Adding an Arena problem

Read [`docs/arena/PROBLEM_FORMAT.md`](docs/arena/PROBLEM_FORMAT.md) and copy the style of
[`docs/arena/problems/exemplars.js`](docs/arena/problems/exemplars.js). A problem is done when the validator prints ✓
with no warnings, which means:

- the reference pseudocode and JavaScript solutions pass every hand-written and random test;
- the starter code does **not** pass;
- every **mutant** (a real mistake students make) fails a test *and* gets its own nudge;
- efficiency is graded (`budget` / `growth`) when efficiency is the point of the problem.

Hints climb from insight → plan → specific step. The answer lives in `solution`, never in a hint. Add a `followUp`
("Senior twist") and 1–3 `distractors` for Blocks mode. A new pack file must also be listed in
`docs/arena/problems/index.js`.

## Adding a simulation

Start from [`docs/sims/_template.html`](docs/sims/_template.html): record frames first, then play them with
`Forge.player`. Every frame highlights a pseudocode line and narrates *what* happened and *why*. Each sim needs custom
input, a Random button, at least one 🤔 Predict moment, a legend, "How to read this", "Try this" challenges, and
"Go deeper" links. It must work at 375 px wide, in both light and dark themes, with no console errors. Add a card to
the gallery in `docs/assets/js/forge-hub.js`.

## Regenerating generated files

```bash
python3 tools/build_readme_tables.py   # README course map + level table
python3 tools/make_readme_visuals.py   # assets/svg/*.svg
python3 tools/take_screenshots.py      # assets/img/*.png (needs Playwright + Chromium)
python3 tools/build_cheatsheet.py      # docs/cheatsheet.html from cheatsheets/*.md
python3 tools/build_quiz_bank.py       # docs/quiz/quiz-bank.js from practice/quizzes/*.md
```
