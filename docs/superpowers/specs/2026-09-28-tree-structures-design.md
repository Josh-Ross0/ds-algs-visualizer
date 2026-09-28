# DS&Algs Visualizer — Tree Structures Design (BST, Binary Heap, 2-3 Tree)

Date: 2026-09-28
Status: Approved

Builds on `2026-09-28-algo-visualizer-design.md` (the graph-track spec). Everything there about fidelity, predict mode, settings, hosting and visual design still applies unless this document says otherwise.

## 1. Goal

Add the course's tree data structures to the site. Students step through each operation **exactly as taught**, using verbatim pseudocode and line numbers from `Lectures/efficient-ds.pdf`:

- binary search trees (slides 4–15);
- 2-3 trees (slides 16–40);
- binary heaps (slides 41–53).

`Lectures/elementary-ds.pdf` covers stacks, queues and lists, and is out of scope here.

Procedure names are spelled as on the **rendered** slides (for example `Tree_Search`, `Insert_And_Split`, `2_3_Insert`); `pdftotext` drops the underscores, so each name is checked against a slide image. Names in this spec use spaces for readability.

### Success criteria

- Every step highlights a real line of the lecture pseudocode (or, for BST delete, a case from slides 11–14).
- The lecture presets reproduce the slides: BST slide 5 and 2-3 tree slide 18.
- After every operation, the structure satisfies its invariant: the BST property; the 2-3 properties (internal degree 2–3, all leaves on one level, ordered keys, each internal key equal to its subtree maximum); the heap property with the correct heap-size.
- A student can run an operation, keep the result, and run another on it without instructions.
- The six graph pages behave exactly as before.

## 2. Page and interaction

Routes: `#/bst`, `#/heap`, `#/two-three`. The home page gains a "Tree structures" section below the graph algorithms.

### Setup state (before Run)

- **Structure panel:** the current structure. It starts from a preset; the heap page shows the array `A[1…A.length]` under the tree.
- **Preset select** plus **Reset to preset** and **Clear** (empty structure).
- **Operation bar:** a select listing exactly the lecture's procedures for that structure, the inputs that operation needs, and **Run**.

| Structure | Operations | Inputs |
|---|---|---|
| BST | Search, Minimum, Successor, Insert, Delete | key (Search, Insert); node, by typing its key or clicking it (Successor, Delete) |
| Binary heap | Build Heap, Extract Min, Decrease Key, Insert | array (Build Heap); index i and new key k (Decrease Key); key (Insert) |
| 2-3 tree | Search, Minimum, Successor, Insert, Delete | key (Search, Insert); leaf, by key or click (Successor, Delete) |

- **Build Heap** runs on an editable array (typed as `9, 4, 7, 1, …`), because it builds from an arbitrary array rather than the current heap.
- **No free-form drawing.** Structures change only through operations, Clear and presets, so every structure is always valid.

### Run state

- The same player as the graph pages: step and big step, back, speed, slider, predict questions with Continue, and settings.
- Pseudocode panel with the main procedure and its helpers:
  - `Tree Successor` → `Tree Minimum`;
  - `2 3 Insert` → `Insert And Split` → `Set Children` → `Update Key`;
  - `2 3 Delete` → `Borrow Or Merge`;
  - `Heap Insert` → `Heap Decrease Key`;
  - `Build Heap` and `Heap Extract Min` → `Heapify`.
- A variables line, notes, and a call-stack panel for recursive procedures (`Tree Search`, `2 3 Search`, `Heapify`).
- **Done: keep result** at the end makes the final structure the current one.
- **Back** returns to the structure as it was before the run.

### Limits

- At most 15 nodes (BST, heap) and 12 leaves (2-3 tree, sentinels excluded).
- Integer keys only; keys unique (the lecture assumes uniqueness).

## 3. Model and views

### Shared step core

The player, question overlay, pseudocode panel and settings depend only on a core step:

```ts
type StepCore = { proc: string; line: number; bigStep: boolean; vars: Record<string, Value>; note?: string; question?: Question };
```

- The graph `Step` extends `StepCore`, keeping `vertexState`, `ds` and `highlight` unchanged.
- The tree track adds `TreeStep = StepCore & { view: StructureView; ds?: DSView[] }`. The optional `ds` carries the call stack.

### Tree model (pure TS, `src/engine/tree.ts`)

- `Tree = { root: NodeId | null; nodes: Record<NodeId, TreeNode> }`.
- `TreeNode = { id; key: number; left; right; middle?; p }`. Pointers are `NodeId | null`.
- Nodes have **stable ids**, so a node keeps its identity across steps.
- 2-3 sentinels are ordinary leaves with keys `−∞` and `+∞`.
- **Heap:** `HeapArray = { A: number[]; heapSize: number }` (1-based in the display). The tree view is derived from indices: `Left(i) = 2i`, `Right(i) = 2i + 1`, `Parent(i) = ⌊i/2⌋`.

### Snapshot (`StructureView`)

- The tree or heap array after the line.
- **Highlights:** the current node, the nodes being compared, pointer edges (parent→child) being followed or set, and NIL slots (see below).
- **Pointer tags:** each pseudocode variable that points to a node (x, y, z, ℓ, m, r, w, `smallest`, `T.root`) is drawn as a small label beside that node. The variables line shows each as the node's key, e.g. `x = 12`, or `x = NIL`.
- **NIL slot:** when BST Search or Insert walks off the tree, a dashed empty slot marks where the NIL child is.

### Layout (`TreeCanvas`)

- **BST:** x position = rank in sorted order, y = depth.
- **2-3 tree:** all leaves on one level, evenly spaced in key order with the sentinels at the ends. Internal nodes are centred over their children and show their key (the subtree maximum), as on slide 18. Leaves are drawn as boxes.
- **Heap:** fixed positions by index, as on slide 43, with the index shown small beside each node. An **array strip** below shows `A[1…A.length]`, a marker at the heap-size boundary, and cells past it greyed out.
- **Movement:** nodes are keyed by id with a short CSS transition on position, so swaps and splits visibly move. The transition is disabled under `prefers-reduced-motion`.
- **Styling:** follows the visual-design spec. The yellow highlighter is reserved for the current pseudocode line; node and edge highlights use the marker blue and the active dashed edge.

## 4. Steps and predict questions

Graph-track rules apply:

- one step per executed pseudocode line, showing the state after that line;
- a question on step i is shown over step i − 1, whose note must not reveal the answer;
- every question type can be switched off or skipped.
- every operation starts with a call step (line 0 of the main procedure, drawn as its highlighted signature) so the first real line can carry a question.

### BST

- **Tree Search (slide 7)**: recursive, with a call stack. Question at each call: "go left, go right, or stop here?" (choice).
- **Tree Minimum (slide 8)**: one question at the start: "which node is the minimum?" (node answer).
- **Tree Successor (slide 9)**, which calls Tree Minimum: "which node is x's successor?" (node answer with a NIL button).
- **Tree Insert (slide 10)**: at each step down, "does z go left or right of y?" (choice).
- **Delete (slides 11–14, no pseudocode)**:
  - The procedure panel shows the slide's four cases as its "lines": case 1 leaf; case 2 only a right child; case 3 only a left child; case 4 two children → find the successor, swap x and y, remove x.
  - The question is "which case applies?" (choice of 4).
  - Case 4 runs the real `Tree Successor` pseudocode with its question, then swaps, then removes.
  - The deleted key must exist; otherwise Run is blocked.

### Binary heap (min-heap, as in the lecture)

- **Heapify (slide 46)**: once per call, "which of A[i], A[Left(i)], A[Right(i)] is smallest?" (node or array-cell answer).
- **Build Heap (slide 47)**: each `i` is a big step; questions come from Heapify.
- **Heap Extract Min (slide 49)**: no question of its own; its `Heapify(A, 1)` asks.
- **Heap Decrease Key (slide 50)**: at each test of line 4, "does A[i] swap with its parent?" (yes/no).
- **Heap Insert (slide 51)**: steps through lines 1–5; the questions come from the Decrease Key it calls.

### 2-3 tree

- **Search (slide 22)** and **the walk down in Insert (slide 31)**: at each internal node, "left, middle or right child?" (choice).
- **Insert And Split (slides 29–30)**: "does x split?" (yes/no). When it doesn't split, "where does z go: before ℓ, between ℓ and m, or after m?" (choice).
- **Delete (slides 37–38) → Borrow Or Merge (slides 34–36)**: "borrow or merge?" (choice).
- **Minimum (slide 23)** and **Successor (slide 24)**: "which leaf?" (node answer, with NIL where the procedure can return NIL).
- **Init (slide 21), Update Key (slide 26) and Set Children (slide 27)**: stepped through line by line, with no questions.

### Answer types

The existing `vertex`, `choice` and `yesno` answers are reused. One addition: a `node` answer with an optional NIL button, answered by clicking a node or array cell.

## 5. Errors and validation

| Situation | Behavior |
|---|---|
| Insert a key already present | Run blocked: "Key k is already in the tree (keys must be unique)." |
| Search for an absent key | Runs; returns NIL as the pseudocode does |
| Delete or Successor on an absent key | Run blocked: "No node with key k." |
| BST Minimum on an empty tree | Run blocked: "Tree Minimum is undefined on an empty tree." (slide 8) |
| 2-3 Minimum on an empty tree | Runs to the pseudocode's line-7 `error: T is empty` |
| Heap Extract Min on an empty heap | Runs to line 2's `error "the heap is empty"` |
| Decrease Key with k > A[i].key | Runs to line 2's error |
| Decrease Key with i outside 1…heap-size | Run blocked: "Choose an index between 1 and heap-size." |
| Heap Insert with heap-size = A.length | Run blocked: "The array is full (A.length = n)." |
| Node or leaf limit reached | Insert blocked with a message about the limit |
| Non-integer or empty input | Run disabled; the field is marked invalid |

## 6. Architecture

```
src/
  engine/
    trace.ts         StepCore (shared); graph Step extends it
    tree.ts          Tree model, pure helpers
    heapArray.ts     HeapArray helpers (Left/Right/Parent)
  structures/
    registry.ts      list of tree structures
    types.ts         StructureDef { id, title, procs, operations, presets, validate, run }
    bst/ heap/ two-three/   pseudocode.ts, operations (run*.ts), presets.ts, questions.ts, tests
  ui/
    TreeCanvas       layout + drawing for all three
    HeapArrayStrip
    StructurePage    setup state, operation bar, keep-result flow
    Visualizer       main view passed in, so graph and tree pages share the player
```

- `engine/` and `structures/**` must not import React.
- `StructureDef.run(structure, operation, inputs) → TreeStep[]`. Each operation is a pure function that mirrors the pseudocode line by line, taking `structuredClone` snapshots.
- Operations never mutate the page's current structure. The final step's `view` becomes the new current structure only when the student presses **Done: keep result**.

## 7. Testing

- **Unit tests per procedure:**
  - every step's `(proc, line)` exists in that structure's pseudocode;
  - final structures match hand-checked results on the lecture presets.
- **Invariant tests:** seeded random sequences of inserts and deletes (and, for the heap, extract-min and decrease-key), checking the structure's invariant after every operation.
- **Predictability:** `assertQuestionsPredictable` holds on every trace; notes never contain the answer.
- **Page tests and Playwright:**
  - run an operation, answer a question, keep the result, run another;
  - the Clear and Reset paths;
  - blocked inputs;
  - no horizontal scroll at 375px.

## 8. Delivery plans

1. **Tree foundation + BST:**
   - the StepCore refactor (graph pages unchanged, proven by the existing tests);
   - the tree model and BST layout, `TreeCanvas`, `StructurePage`, the node answer;
   - the BST page with all five operations;
   - the home-page section.
2. **Binary heap:** `HeapArray`, the array strip, the heap-size marker, index layout, and the four operations.
3. **2-3 tree:** sentinels, leaf and internal node drawing, and all operations, including Insert And Split and Borrow Or Merge.

## 9. Out of scope

- Stacks, queues and linked lists (`elementary-ds.pdf`).
- The tutorials' extra procedures, such as Tutorial 7's `Heap Delete` and Tutorial 6's augmented 2-3 tree.
- Max-heaps, B+ trees with d > 3, and AVL or red-black trees.
