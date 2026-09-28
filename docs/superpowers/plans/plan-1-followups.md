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

- Focus restore after a question closes (added in plan 2, `Visualizer.tsx`) also fires when a settings change auto-skips the open question (`usePlayer.ts`), pulling focus off the settings checkbox. Restore focus only when the close came from an answer or skip action, and add a test that toggles Predict mode while a question is open.

- `AlgorithmDef.weighted` is currently unused: add weight entry in the editor, weight labels on the canvas, and tests for `moveVertex` and weighted `addEdge`.
- Registry test: each preset's `graph.directed` matches `def.directed` unless it is `'toggle'`; the page should force direction for fixed-direction algorithms.
- "Edit graph" should clear validation messages (otherwise Dijkstra's w ≥ 0 warning lingers).
- Restore focus is done (final plan-2 fix wave). Add per-class arrow markers with `useId` ids so tree/active edges get matching arrowheads.
- Screenshot the pseudocode glyphs (∈ ≠ ∅ π ∞) in WebKit and Firefox.
- `AlgorithmDef.weighted` is still unused (the existing items stay).

## Accepted as-is (revisit only if users complain)

- Source is chosen from a select, not by clicking a vertex (spec §7 says click).
- A wrong answer pauses playback; a correct one keeps playing, so its feedback shows only until the next tick.
- Editor has no keyboard way to add vertices/edges; the canvas is `role="img"`; no `<main>` landmark on the algorithm page; the phone-width e2e checks only edit mode.
- Self-loops are blocked by `addEdge`, although the lecture allows a directed self-loop (a back edge).

DFS asks 23 questions per lecture run (8 discover + 7 edge-type + 8 finish on the directed lecture graph). Was ~29 (13 edge-type, one per edge); staff decided (2026-09-28) to ask the edge-type question only for non-tree edges, since a tree edge is the "normal" case already predicted via the discover question — the answer options are unchanged, so "tree" remains a plausible wrong answer.
