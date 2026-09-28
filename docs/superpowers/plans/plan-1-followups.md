# Follow-ups from Plan 1 (Foundation + BFS)

Items found during Plan 1 reviews and deliberately deferred. Later plans must pick these up.

## Conventions established

- Helper-procedure names come from the **rendered** slides, not `pdftotext` output. The slides use underscores (`BFS_Initialization`); pdftotext drops them. Check `DFS_Visit`, `Initialize_Single_Source`, `Extract_Min`, etc. the same way.
- A question on step `i` is shown over step `i − 1`. Every algorithm's tests must call `assertQuestionsPredictable` (in `src/algorithms/testing.ts`) with a check that step `i − 1` lets the student predict the answer without revealing it.

## Plan 2 (DFS only — topological sort and SCC dropped) — start with a contract task

- New answer kinds: `choice` (edge type tree/back/forward/crossing), with a matching `QuestionOverlay` branch. The `edge` kind is not needed while no question asks the student to pick an edge. Closed: e7f0c48, bd72f63.
- New `DSView` kinds (recursion stack, output list). `DSPanel` already switches exhaustively, so each new kind fails to compile until it is rendered. Closed: e7f0c48, bd72f63, 2936b16 — only the recursion stack kind was needed for DFS; "output list" is Kruskal's (plan 3+) and was not added.
- `loadSettings` should validate the stored shape (a stored `disabledTypes: null` would crash `isAsked`). Closed: e7f0c48.
- State table needs `overflow-x: auto` (DFS adds `f`). Closed: bd72f63.
- Add a test for the 10-vertex cap message in `GraphEditor`. Closed: bd72f63.

## Plan 3 (Bellman-Ford, Dijkstra)

- ~~Focus restore also fires when a settings change auto-skips the open question.~~ Closed on branch `continue-after-answer`: focus returns only after Continue or Skip, with a test.

- `AlgorithmDef.weighted` is currently unused: add weight entry in the editor, weight labels on the canvas, and tests for `moveVertex` and weighted `addEdge`. Closed: 85a9c68 (`moveVertex`/weighted `addEdge` tests, edge order), 026ded8 (weight labels on canvas), bc72b67 (weight editor).
- Registry test: each preset's `graph.directed` matches `def.directed` unless it is `'toggle'`; the page should force direction for fixed-direction algorithms. Closed here: the registry test pins the presets; the page needs no forcing, since fixed-direction algorithms have no toggle.
- "Edit graph" should clear validation messages (otherwise Dijkstra's w ≥ 0 warning lingers). Closed: bc72b67.
- Restore focus is done (final plan-2 fix wave). Add per-class arrow markers with `useId` ids so tree/active edges get matching arrowheads. Closed: 026ded8.
- Screenshot the pseudocode glyphs (∈ ≠ ∅ π ∞) in WebKit and Firefox. WebKit: clean, no tofu (`∈`, `∞`, `π`, `…`, `−` all confirmed on the Bellman-Ford `.pseudocode` panel; `≠`, `∅`, `▷` don't appear on that panel so weren't visually checked). Firefox: not run — headless Firefox fails to launch in this sandbox (`Could not find profile folder`, reproduced with a writable persistent-profile dir; sandbox override is blocked by policy).
- `AlgorithmDef.weighted` is still unused (the existing items stay).

## Plan 4 (Prim, Kruskal)

- `keyed` DSView is ready for Prim's Q by key (`key: 'key'`); `settled` highlight is ready for vertices out of Q.
- Kruskal needs an "output list"/sorted-array view and a `cycle` highlight (spec §4); neither exists yet.
- Undirected weighted presets: `weightedDigraph` in `src/algorithms/sssp/shared.ts` is directed-only — add an undirected twin.
- Bellman-Ford asks 26 questions per lecture run (13 first-pass yes/no + 13 new v.d); Dijkstra asks 22 (8 Extract_Min + 14 Relax).

## Accepted as-is (revisit only if users complain)

- Source is chosen from a select, not by clicking a vertex (spec §7 says click).
- A wrong answer pauses playback; a correct one keeps playing, so its feedback shows only until the next tick.
- Editor has no keyboard way to add vertices/edges; the canvas is `role="img"`; no `<main>` landmark on the algorithm page; the phone-width e2e checks only edit mode.
- Self-loops are blocked by `addEdge`, although the lecture allows a directed self-loop (a back edge).

DFS asks 23 questions per lecture run (8 discover + 7 edge-type + 8 finish on the directed lecture graph). Was ~29 (13 edge-type, one per edge); staff decided (2026-09-28) to ask the edge-type question only for non-tree edges, since a tree edge is the "normal" case already predicted via the discover question — the answer options are unchanged, so "tree" remains a plausible wrong answer.
