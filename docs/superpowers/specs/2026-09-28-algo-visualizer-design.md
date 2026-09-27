# DS&Algs Algorithm Visualizer — Design (v1: Graph Track)

Date: 2026-09-28
Status: Approved

## 1. Goal

A static website where students of Data Structures and Algorithms (Yuval Emek, Winter 2025/6) run the course's algorithms step by step, **exactly as taught**: the pseudocode shown is verbatim from the lecture slides, with the slides' line numbers, and every visual state change corresponds to an executed pseudocode line.

Inspiration: VisuAlgo. Differentiator: fidelity to the course's own pseudocode and conventions (`NIL`, `G.Adj[u]`, white/gray/black, `v.d`, `v.π`, abstract `Q` with `Extract Min`, etc.).

### Success criteria

- For every preset taken from a lecture or tutorial, the final output (d, π, f, tree, order) matches the course's published solution.
- Every step highlights a real line of the course pseudocode.
- A student can open an algorithm, run it on a preset, edit the graph, and re-run without instructions.
- Adding a new algorithm requires only a new folder under `src/algorithms/` and a registry entry.

## 2. Users and features

### Students

- Choose an algorithm; page opens with a preset graph.
- Pick another preset (slide examples, tutorial examples, edge cases).
- Edit the graph freely: add/remove vertices and edges, move vertices, set weights. Cap: 10 vertices (readability).
- Choose parameters where applicable (source `s`, root `r`).
- See and reorder adjacency lists (and the edge order for Bellman-Ford).
- Play/pause, step forward/back, line step vs big step (next main-loop iteration), speed control, scrubber.
- Synchronized panels: graph, pseudocode (current line highlighted, helper procedures shown beside main), per-vertex state table, data-structure panel.
- **Predict mode**: inline questions at key steps. Globally toggleable off, each question skippable, per-question-type toggles in settings.

### Course staff

- No admin UI. Staff extend the site by editing the repo (new algorithms, presets, questions). Push to `main` deploys.

### Explicitly out of scope for v1

Backend, accounts, analytics, question-authoring UI, shareable links, Hebrew UI, and all non-graph topics (see §9).

## 3. Scope of v1 algorithms

BFS, DFS, Topological sort, SCC, Bellman-Ford, Dijkstra, Prim, Kruskal.

Pseudocode is taken verbatim from `Lectures/bfs.pdf`, `dfs.pdf`, `shortest-paths.pdf`, `mst.pdf`, including helper procedures (`BFS Initialization`, `DFS Visit`, `Initialize Single Source`, `Relax`).

## 4. Conventions

### Tie-breaking

Wherever the pseudocode leaves order unspecified (`for all v ∈ G.Adj[u]`, `for all u ∈ G.V`, `for all (u,v) ∈ G.E`, `Extract Min` ties):

- Default order is by vertex label (a < b < c, or 1 < 2 < 3). Extract Min ties break by label.
- Adjacency lists are always visible and the student can reorder them; Bellman-Ford's edge list likewise. The trace uses exactly the displayed order.
- Predict questions accept only the answer consistent with the displayed order.

### Abstract data structures

Where slides use an abstract structure, the visualizer does too. Dijkstra and Prim's `Q = G.V` is shown as a set listed by key, not a binary heap. Kruskal's line 6 ("is cycle free") is not implemented with Union-Find; on rejection the visualizer highlights the cycle the edge would close.

### Graph type per algorithm

| Algorithm | Directed | Weighted |
|---|---|---|
| BFS, DFS | toggle | no |
| Topological sort, SCC | directed | no |
| Bellman-Ford, Dijkstra | directed | yes |
| Prim, Kruskal | undirected | yes |

## 5. Architecture

Stack: React + TypeScript + Vite, SVG rendering with fixed vertex coordinates (no force layout, so presets look like the slides). Vitest for unit tests, Playwright for smoke tests. Hash routing (`#/bfs`) so GitHub Pages needs no server config.

```
src/
  engine/
    trace.ts         Step type
    graph.ts         Graph model
  algorithms/
    registry.ts      list of algorithms (id, title, page config)
    bfs/
      pseudocode.ts  verbatim lines + helper procedures
      run.ts         run(graph, params) → Step[]
      presets.ts     preset graphs
      questions.ts   predict-question generators
      run.test.ts
    dfs/ topo-sort/ scc/ bellman-ford/ dijkstra/ prim/ kruskal/
  ui/
    GraphCanvas      SVG view: vertex colors, edge highlight, tree edges
    GraphEditor      editing interactions, 10-vertex cap
    PseudocodePanel
    StatePanel       per-vertex attribute table
    DSPanel          queue / Q set / recursion stack / edge array
    AdjacencyPanel   reorderable adjacency lists or edge list
    Player           controls
    QuestionOverlay
  pages/
    Home, AlgorithmPage
```

### Core types (sketch)

```ts
type Graph = {
  directed: boolean;
  vertices: { id: string; label: string; x: number; y: number }[];
  edges: { id: string; u: string; v: string; w?: number }[];
  adjOrder: Record<string, string[]>;   // displayed adjacency order
  edgeOrder?: string[];                 // Bellman-Ford edge order
};

type Step = {
  proc: string;                 // "BFS" | "BFS Initialization" | "Relax" ...
  line: number;                 // slide line number within proc
  bigStep: boolean;             // start of a main-loop iteration
  vertexState: Record<string, Record<string, string | number | null>>;
  vars: Record<string, string | number | null>;   // time, i, u, ...
  ds: DSView;                   // queue / set / stack / edge array
  highlight: { vertices?: string[]; edges?: string[]; cycle?: string[] };
  note?: string;
  question?: Question;
};

type Question = {
  type: string;                 // e.g. "bfs.nextDequeue"
  prompt: string;
  answer: { kind: "vertex" | "edge" | "number" | "yesno"; value: string | number | boolean };
  explain: string;
};
```

### Rules

- `engine/` and `algorithms/*/run.ts` are pure functions with no React imports.
- `run.ts` mirrors the pseudocode line by line; each executed line emits one Step. Snapshots are full copies so stepping backward is an index change.
- Editing the graph or parameters discards the trace; the next Run starts at step 0.

## 6. Per-algorithm views and questions

| Algorithm | State table | DS panel | Graph highlights | Params | Predict questions |
|---|---|---|---|---|---|
| BFS | color, d, π | FIFO queue | colors, π-tree | s | next dequeued vertex; new `v.d` |
| DFS | color, d, f, π; `time` | recursion stack | colors, π-tree; edge types at end | — | next visited vertex; `u.f`; edge type |
| Topo sort | DFS + output | list by decreasing f | as DFS | — | next vertex in output |
| SCC | pass 1, Gᵀ, pass 2 | components | components colored | — | which component a vertex joins |
| Bellman-Ford | d, π; `i` | edge list, current edge | relaxed edge; negative-cycle edge | s, edge order | does Relax update; new `v.d` |
| Dijkstra | d, π, in Q | Q by d | extracted set, π-tree | s | Extract Min result; does Relax update |
| Prim | key, π, in Q | Q by key | tree edges | r | Extract Min result; new `v.key` |
| Kruskal | — | sorted array A, index i | T; rejected edge's cycle | — | accept or reject edge |

Answer input: click a vertex/edge, type a number, or yes/no. Wrong answer shows the correct one and a one-line explanation, then playback continues. Score is shown at the end of the run.

## 7. Error handling and validation

| Situation | Behavior |
|---|---|
| Dijkstra with a negative weight | Warn ("Dijkstra assumes w ≥ 0"), allow run so students see the failure |
| Topo sort on a cyclic graph | Run; report back edge → "not a DAG" |
| Prim/Kruskal on disconnected graph | Block run with message |
| Bellman-Ford with reachable negative cycle | Run; highlight line 7 and the violating edge |
| No source/root selected | Prompt to click a vertex |
| 11th vertex | Refuse with message about the cap |

Settings (speed, predict toggles) persist in `localStorage`, wrapped in try/catch; site works without it.

## 8. Testing and deployment

- Vitest per algorithm: final results on every lecture/tutorial preset match the course solution (hand-verified from the PDFs).
- Trace invariants: every Step's `(proc, line)` exists in that algorithm's pseudocode; traces are finite and deterministic.
- Tie-break tests: reordering an adjacency list changes the trace as expected.
- Playwright smoke: each page loads, plays to the end, one predict question answered.
- GitHub Actions: test + build on PRs; build + deploy to GitHub Pages on push to `main`. Public repository.

## 9. Later phases (same engine)

1. Heaps (Heapify, Build Heap, Heapsort), BST, 2-3 trees
2. Sorting: insertion, merge, counting, radix; Quicksort, Partition, Select
3. DAG shortest paths, Floyd-Warshall, Johnson
4. DP: rod cutting, matrix-chain order, subsequence problems
5. Elementary DS: stack, queue, linked list

## 10. Resolved items

- Publishing slide pseudocode in a public repo: permission confirmed.
- Repository: `ds-algs-visualizer/`, its own git repo, separate from the lecture PDFs (which stay in the parent folder and are not committed).
