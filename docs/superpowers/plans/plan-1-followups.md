# Follow-ups from Plan 1 (Foundation + BFS)

Items found during Plan 1 reviews and deliberately deferred. Later plans must pick these up.

## Conventions established

- Helper-procedure names come from the **rendered** slides, not `pdftotext` output. The slides use underscores (`BFS_Initialization`); pdftotext drops them. Check `DFS_Visit`, `Initialize_Single_Source`, `Extract_Min`, etc. the same way.
- A question on step `i` is shown over step `i − 1`. Every algorithm's tests must call `assertQuestionsPredictable` (in `src/algorithms/testing.ts`) with a check that step `i − 1` lets the student predict the answer without revealing it.

## Plan 2 (DFS only — topological sort and SCC dropped) — start with a contract task

- New answer kinds: `choice` (edge type tree/back/forward/crossing), with a matching `QuestionOverlay` branch. The `edge` kind is not needed while no question asks the student to pick an edge.
- New `DSView` kinds (recursion stack, output list). `DSPanel` already switches exhaustively, so each new kind fails to compile until it is rendered.
- `loadSettings` should validate the stored shape (a stored `disabledTypes: null` would crash `isAsked`).
- State table needs `overflow-x: auto` (DFS adds `f`).
- Add a test for the 10-vertex cap message in `GraphEditor`.

## Plan 3 (Bellman-Ford, Dijkstra)

- `AlgorithmDef.weighted` is currently unused: add weight entry in the editor, weight labels on the canvas, and tests for `moveVertex` and weighted `addEdge`.
- Registry test: each preset's `graph.directed` matches `def.directed` unless it is `'toggle'`; the page should force direction for fixed-direction algorithms.
- "Edit graph" should clear validation messages (otherwise Dijkstra's w ≥ 0 warning lingers).

## Accepted as-is (revisit only if users complain)

- Source is chosen from a select, not by clicking a vertex (spec §7 says click).
- A wrong answer pauses playback; a correct one keeps playing, so its feedback shows only until the next tick.
- Editor has no keyboard way to add vertices/edges; the canvas is `role="img"`; no `<main>` landmark on the algorithm page; the phone-width e2e checks only edit mode.
