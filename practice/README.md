# 🏋️ Practice — Quizzes, Assignments, Midterm, and the Empirical-Analysis Lab

This folder is where you **use** what the lessons teach. Reading a solution feels like learning. Rebuilding it from
a blank page is what actually builds the skill. Everything here is designed to be redone, not only read.

For CSC 501 (Algorithm Analysis and Design) with Levitin, *Introduction to the Design and Analysis of Algorithms*, 3rd ed.

---

## 📚 What's here

| Section | What you get | Chapters |
|---------|--------------|----------|
| [**Quiz bank**](quizzes/README.md) | All 20 course quiz questions (Quizzes A–D), organized by topic, plus **98 new** questions (58 in the quiz bank, 40 more in [`extra-questions.md`](quizzes/extra-questions.md)); all of them are also in the [interactive quiz](https://normansrule.github.io/algorithm-forge/quiz.html). Every answer explains why it is right and why each distractor is wrong. | 1–12 |
| [**Assignment 1**](assignments/assignment-1.md) | 10 worked problems: integer square root, `MinDistance` improvements, comparison counting sort trace, binary-tree height bounds, order-of-growth ranking, sum of squares, recurrences, locker doors, Fibonacci call counts | 1–2 |
| [**Assignment 2**](assignments/assignment-2.md) | 10 worked problems: $a^n \bmod m$, A…B substrings, post office, partition, power set, source-removal topological sort, three-pile fake coin, Binary Search Tree (BST) maximum, Breadth-First Search (BFS) cross edges, Directed Acyclic Graph (DAG) ⇔ topological order | 3–4 |
| [**Midterm 1 review**](midterm-1/README.md) | Format tips, the 4-question review guide, and full solutions to the **sample exam (5 problems)** and **Midterm 1 (4 problems)**: idea → pseudocode → invariant → analysis → trace | 1–5 |
| [**Practice Exam 2**](midterm-1/practice-exam-2.md) | A brand-new exam in the Midterm 1 style, with hidden solutions and grading checklists | 1–5 |
| [**Exam strategies**](exam-strategies.md) | How to attack each of the 4 question types, fill-in templates, worked mini-examples, and a **one-page recurrence cheat sheet** | 2–5 |
| [**Empirical-analysis lab**](empirical-analysis-lab/README.md) | The course project, step by step: find the comparison-counter bug, fix it, run Java and Python experiments (18 sizes × 20 arrays), plot, fit $C(n) \approx 0.250\,n^2$, predict n = 10,000 | 2, 4 |

🎮 **Arena (Algorithm Forge's online practice problems):** <https://normansrule.github.io/algorithm-forge/arena/>. Filter by
chapter, for example [Chapter 4](https://normansrule.github.io/algorithm-forge/arena/?chapter=4), or by level, for
example [level 2](https://normansrule.github.io/algorithm-forge/arena/?level=2). You write Forge Pseudocode, and it
runs against hidden tests.

🧪 **Interactive lab:** <https://normansrule.github.io/algorithm-forge/sims/empirical-lab.html>

---

## 🧭 How to practice (a method that works)

### 1. Redo without looking ("blank-page recall")
For every worked solution:
1. Read the **problem only**. Cover the solution.
2. On a blank page, write the idea, the pseudocode, the invariant and the count.
3. Compare with the solution **line by line**. Mark every difference: a missed initial condition, a wrong loop
   bound, no trace.
4. Two days later, redo the problems you marked. A problem is "done" only when you can reproduce it cold.

### 2. Spaced repetition
Memory grows with **retrieval spaced out over time**, not with rereading. A simple schedule:

| When | What |
|------|------|
| Day 0 | Learn the lesson, then do the quiz questions for that chapter |
| Day 1 | Redo the questions you missed, without looking |
| Day 3 | Redo one assignment problem per technique from a blank page |
| Day 7 | Mixed quiz: 10 random questions across chapters |
| Day 14, 30 | Timed exam simulation (below) |

Keep a "missed" list (a text file is enough) with the question ID and **why** you missed it. The *why* is what you
review.

### 3. Timed exam simulation
1. Pick [Practice Exam 2](midterm-1/practice-exam-2.md), or the Midterm 1 questions if you have not looked at their
   solutions recently.
2. Set a timer for **75 minutes**: about 17 minutes per question plus a few minutes to review. Closed book.
3. Use the [exam strategies](exam-strategies.md) answer shape: idea → pseudocode → correctness → analysis → trace.
4. Grade yourself **strictly** with the checklists in the solutions. Partial credit on your own paper means points
   lost on the real one.
5. Every mistake goes onto the "missed" list.

### 4. Explain it out loud
If you can explain *why* insertion sort's average is about $n^2/4$, or *why* $T(n) = T(n/2) + \log n$ is
$\Theta(\log^2 n)$, to a friend (or a rubber duck) in two minutes without notes, you own it.

---

## 🗺️ Suggested order

1. Quizzes for Chapters 1–2 → [Assignment 1](assignments/assignment-1.md) → the [lab](empirical-analysis-lab/README.md)
2. Quizzes for Chapters 3–4 → [Assignment 2](assignments/assignment-2.md)
3. [Exam strategies](exam-strategies.md) → [Midterm 1 solutions](midterm-1/README.md) → [Practice Exam 2](midterm-1/practice-exam-2.md), timed
4. Quizzes for Chapters 5–12 as the course moves on, plus the Arena for each chapter

---

## 📖 English-language resources that pair well with this folder

- **MIT OpenCourseWare 6.006 *Introduction to Algorithms*** (lectures and problem sets)
- **Abdul Bari's algorithms playlist** on YouTube (recurrences, Master Theorem, sorting)
- **VisuAlgo**: <https://visualgo.net/> (animations of sorting, heaps, graph traversals)
- **William Fiset's** graph theory videos on YouTube (topological sort, BFS, Depth-First Search (DFS))

---

⬅️ [Back to the repository home](../README.md) · [Lessons](../lessons/00-start-here/README.md)
