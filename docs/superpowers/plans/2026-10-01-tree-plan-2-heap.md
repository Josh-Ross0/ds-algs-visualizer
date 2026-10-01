# Tree Plan 2: Binary Heap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the binary min-heap page (`#/heap`): `Build_Heap`, `Heap_Extract_Min`, `Heap_Decrease_Key` and `Heap_Insert` stepped line by line with the lecture pseudocode, an array strip with a heap-size marker under the tree, and predict questions. Along the way, generalise the BST-shaped `StructureDef`/`TreeStep` and draw the `T.root` pointer tag, as `docs/superpowers/plans/tree-followups.md` requires.

**Architecture:**
- `StructureDef<S, V>` becomes generic over the state `S` (`Tree` or `HeapArray`) and the view `V` (`TreeView` or `HeapView`, a discriminated union on `kind`). The player, `StructurePage` and node answers work on `StructureView`, so the BST keeps working unchanged and plan 3 (2-3 tree) can add a third view.
- The heap is a pure `HeapArray` (`engine/heapArray.ts`) with a stable id per cell, so a key keeps its identity when swaps move it and the canvas can animate it. Operations are pure functions that mirror the pseudocode line by line, like the BST ones.
- `HeapCanvas` draws the tree at fixed index positions plus a `HeapArrayStrip` (index labels, greyed cells past heap-size, a heap-size marker).

**Tech Stack:** React 19, TypeScript 5.9.3 (pinned), Vite 8, Vitest + Testing Library (jsdom), Playwright (chromium).

**Spec:** `docs/superpowers/specs/2026-09-28-tree-structures-design.md` (§3 model and views, §4 heap steps and questions, §5 errors, §6 architecture, §8 delivery plan 2). Builds on tree plan 1: `docs/superpowers/plans/2026-09-28-tree-plan-1-bst.md` and `docs/superpowers/plans/tree-followups.md`.

## Global Constraints

- **Verbatim pseudocode** from the rendered slides of `Lectures/efficient-ds.pdf`, with underscores and slide line numbers (checked against slide images 46, 47, 49, 50, 51): `Heapify(A, i)` (slide 46, 10 lines), `Build_Heap(A)` (slide 47, 3 lines), `Heap_Extract_Min(A)` (slide 49, 7 lines), `Heap_Decrease_Key(A, i, k)` (slide 50, 6 lines), `Heap_Insert(A, x)` (slide 51, 5 lines).
- **Steps.** Each executed line emits exactly one step showing the state after that line; snapshots are `structuredClone` copies. Every operation starts with a call step (`line: 0` of its main procedure); `assertValidTreeTrace` allows line 0 only at step 0.
- **Questions.** A question on step `i` is shown over step `i − 1`, and that step's note must not reveal the answer. Every trace test calls `assertQuestionsPredictable` (through `checkHeapPredictable`).
- **Keys.** Integers only, unique. At most 15 cells (`A.length ≤ 15`).
- **Styling.** The yellow highlighter is reserved for the current pseudocode line. Node, cell and edge highlights use the marker blue and the active dashed edge. Node movement uses the existing `.tnode` CSS transition, already disabled under `prefers-reduced-motion`.
- **No React in logic.** `engine/` and `structures/**` must not import React.
- **No layout regressions.** No horizontal scroll at 375px. The six graph pages and the BST page behave exactly as before; their existing tests pass (only the signature edits listed in Task 2 touch them).
- **Typecheck.** Use only `npx tsc --noEmit`. Plain `tsc` or `tsc -b` emit `.js` files into `src/`.
- **Commits.** Conventional subjects (`feat(heap): …`) and end every commit message with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (second `-m`).

### Decisions this plan makes where the spec is silent or too coarse

- **Leaf Heapify calls ask nothing.** Spec §4 says Heapify asks "once per call". When `Left(i) > heap-size` the answer is forced (`i` itself), and in `Build_Heap` half of all calls are leaves, so those calls carry no question. Task 9 edits the spec to say so.
- **`A.length` after Build Heap.** Presets and Clear give `A.length = 15`. `Build_Heap` on a typed array of `n` keys produces `A.length = n`, as in the lecture ("`A.length` is known in advance"); a later Insert is then blocked with the spec's "array is full" message until an Extract Min frees a cell.
- **The heap has no `T.root`.** The followup note assumed heaps also use `T.root`; the slides show they do not. The heap's pointer variables are *indices* (`i`, `ℓ`, `r`, `smallest`, `s`), drawn beside the node at that index and under that array cell.
- **Copies get fresh ids.** `A[1] = A[heap-size]` (Extract Min line 4) and `A[s] = x` (Insert line 2) copy an object, so the destination cell gets a new id; swaps move ids with keys. This keeps every live cell's id unique (no duplicate React keys) and lets swaps animate.
- **Uniqueness on Decrease Key.** The new key must not equal another live key (unless `k > A[i]`, which just runs to the error line).

## Review Focus

1. **Empty and one-key heaps.** Extract Min on a one-key heap leaves `heap-size = 0` and `Heapify(A, 1)` runs on a stale root without drawing it or crashing; Extract Min on an empty heap runs to line 2's error and "keep result" keeps the empty heap. Tests: Task 6, Task 8.
2. **Typed arrays for Build Heap.** Duplicates, more than 15 keys, negative numbers, a single key, extra spaces or commas, and non-integers must be blocked or handled with a clear message, never crash. Tests: Task 5, Task 7, Task 8.
3. **Decrease Key edge cases.** `k > A[i]` leaves the heap untouched (error line) and keeping it changes nothing; `k` equal to another live key is blocked; `i` outside `1…heap-size` is blocked. Tests: Task 6, Task 7.
4. **Stale cells past heap-size.** After Extract Min the old last cell still holds a key; it must not count as a live key (Insert of that key is allowed), must be greyed, and must not be clickable as an answer. Tests: Task 4, Task 7.
5. **Full array and phone width.** Insert into a full array is blocked with the spec's message; the 15-cell strip and 4-level tree must not cause horizontal scroll at 375px. Tests: Task 7, Task 9.

## File Structure

Create:
- `src/engine/heapArray.ts`, `src/engine/heapArray.test.ts`: `HeapArray` model, macros, `isHeap`, fixed index layout.
- `src/structures/views.ts`, `src/structures/views.test.ts`: `nodeOptions(view)` for node answers.
- `src/structures/heap/pseudocode.ts`: the five procedures.
- `src/structures/heap/tracer.ts`: `createHeapTracer`.
- `src/structures/heap/questions.ts`: question builders and `HEAP_QUESTION_TYPES`.
- `src/structures/heap/heapify.ts`, `heapify.test.ts`: `traceHeapify`, `runBuildHeap`.
- `src/structures/heap/updates.ts`, `updates.test.ts`: `runExtractMin`, `traceDecreaseKey`, `runDecreaseKey`, `runInsert`.
- `src/structures/heap/testing.ts`: `checkHeapPredictable`, `answerLabels`, `answerValues`, `randomKeys` (test helpers).
- `src/structures/heap/index.ts`, `index.test.ts`: the `heap` `StructureDef`.
- `src/ui/HeapArrayStrip.tsx`, `src/ui/HeapCanvas.tsx`, `src/ui/StructureCanvas.tsx`, `src/ui/HeapCanvas.test.tsx`.
- `src/ui/HeapPage.test.tsx`, `e2e/heap.spec.ts`.

Modify:
- `src/structures/types.ts` (generic `StructureDef`, `HeapView`, `StructureView`), `src/structures/tracer.ts` (`kind`, `showRoot`), `src/structures/bst/index.ts`, `src/structures/bst/updates.ts` (T.root), `src/structures/bst/updates.test.ts`, `src/structures/registry.ts`.
- `src/ui/StructurePage.tsx`, `src/ui/TreeCanvas.test.tsx`, `src/App.test.tsx`, `src/styles.css`.
- `docs/superpowers/specs/2026-09-28-tree-structures-design.md`, `docs/superpowers/plans/tree-followups.md`.

---

### Task 1: `HeapArray` model, macros and layout

**Files:**
- Create: `src/engine/heapArray.ts`
- Test: `src/engine/heapArray.test.ts`

**Interfaces:**
- Consumes: `Pos`, `TREE_SPACING`, `TREE_LEVEL`, `TREE_PAD` from `src/engine/tree.ts`.
- Produces (later tasks rely on these exact names):
  - `type HeapArray = { A: (number | null)[]; ids: number[]; heapSize: number; nextId: number }`: `A[i - 1]` is the lecture's `A[i].key`; `null` = never filled; `ids[i - 1]` identifies the object in `A[i]`.
  - `HEAP_CAPACITY = 15`, `left(i)`, `right(i)`, `parent(i)`.
  - `makeHeap(keys: number[], length: number, heapSize: number): HeapArray`.
  - `keyAt(h, i): number`, `cellId(h, i): string`, `swapCells(h, i, j): void`.
  - `isHeap(h): boolean`.
  - `heapLayout(length: number): { pos: Record<number, Pos>; width: number; height: number }`.

- [ ] **Step 1: Write the failing test**

Create `src/engine/heapArray.test.ts`:

```ts
import { cellId, HEAP_CAPACITY, heapLayout, isHeap, left, makeHeap, parent, right, swapCells } from './heapArray';

test('Left, Right and Parent are the lecture macros', () => {
  expect([left(3), right(3), parent(7), parent(6), parent(2)]).toEqual([6, 7, 3, 3, 1]);
});

test('makeHeap pads with empty cells and gives every cell its own id', () => {
  const h = makeHeap([2, 5, 3], HEAP_CAPACITY, 3);
  expect(h.A).toHaveLength(15);
  expect(h.A.slice(0, 4)).toEqual([2, 5, 3, null]);
  expect(h.heapSize).toBe(3);
  expect(new Set(h.ids).size).toBe(15);
  expect(h.nextId).toBe(16);
});

test('swapCells moves keys and ids together', () => {
  const h = makeHeap([2, 5, 3], 3, 3);
  const before = [cellId(h, 1), cellId(h, 3)];
  swapCells(h, 1, 3);
  expect(h.A).toEqual([3, 5, 2]);
  expect([cellId(h, 1), cellId(h, 3)]).toEqual([before[1], before[0]]);
});

test('isHeap checks the strict heap property, uniqueness and finiteness of live cells only', () => {
  expect(isHeap(makeHeap([2, 5, 3, 9], 15, 4))).toBe(true);
  expect(isHeap(makeHeap([2, 5, 3, 1], 15, 4))).toBe(false); // 1 under 5
  expect(isHeap(makeHeap([2, 5, 5], 15, 3))).toBe(false); // equal keys
  expect(isHeap(makeHeap([2, Infinity], 15, 2))).toBe(false); // ∞ is only ever transient
  expect(isHeap(makeHeap([], 15, 0))).toBe(true);
  expect(isHeap(makeHeap([2, 5, 3, 1], 15, 3))).toBe(true); // the stale cell past heap-size is ignored
});

test('heapLayout fixes index i at one spot: root centred, siblings symmetric, one row per level', () => {
  const L = heapLayout(15);
  expect(L.width).toBe(372);
  expect(L.height).toBe(256);
  expect(L.pos[1].x).toBeCloseTo(L.width / 2);
  expect(L.pos[2].x + L.pos[3].x).toBeCloseTo(L.width);
  expect(L.pos[8].x).toBe(32);
  expect([L.pos[1].y, L.pos[2].y, L.pos[4].y, L.pos[8].y]).toEqual([32, 96, 160, 224]);
  expect(L.pos[4].x).toBeCloseTo((L.pos[8].x + L.pos[9].x) / 2);
});

test('heapLayout of a one-cell array is a single node', () => {
  const L = heapLayout(1);
  expect(L.pos[1]).toEqual({ x: 32, y: 32 });
  expect(L.width).toBe(64);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/heapArray.test.ts`
Expected: FAIL, "Failed to resolve import './heapArray'".

- [ ] **Step 3: Write the implementation**

Create `src/engine/heapArray.ts`:

```ts
import { TREE_LEVEL, TREE_PAD, TREE_SPACING, type Pos } from './tree';

// Binary heap stored in the lecture's array A[1…A.length], 0-based here.
// ids[i - 1] identifies the object in A[i]: swaps move ids with keys, copies get a fresh id,
// so the canvas can animate a key moving through the tree.
export type HeapArray = {
  A: (number | null)[]; // null = a cell never filled
  ids: number[];
  heapSize: number;
  nextId: number;
};

export const HEAP_CAPACITY = 15;

export const left = (i: number) => 2 * i;
export const right = (i: number) => 2 * i + 1;
export const parent = (i: number) => Math.floor(i / 2);

// keys fill A[1…keys.length]; the other cells up to `length` are empty.
export function makeHeap(keys: number[], length: number, heapSize: number): HeapArray {
  const A: (number | null)[] = [...keys, ...Array<null>(length - keys.length).fill(null)];
  return { A, ids: A.map((_, j) => j + 1), heapSize, nextId: length + 1 };
}

export const keyAt = (h: HeapArray, i: number): number => h.A[i - 1] as number;
export const cellId = (h: HeapArray, i: number): string => String(h.ids[i - 1]);

export function swapCells(h: HeapArray, i: number, j: number): void {
  [h.A[i - 1], h.A[j - 1]] = [h.A[j - 1], h.A[i - 1]];
  [h.ids[i - 1], h.ids[j - 1]] = [h.ids[j - 1], h.ids[i - 1]];
}

// The heap property (strict, keys unique) on A[1…heap-size]; cells past heap-size are ignored.
export function isHeap(h: HeapArray): boolean {
  if (h.heapSize < 0 || h.heapSize > h.A.length) return false;
  const liveKeys = h.A.slice(0, h.heapSize);
  if (!liveKeys.every((k) => typeof k === 'number' && Number.isFinite(k))) return false;
  if (new Set(liveKeys).size !== h.heapSize) return false;
  for (let i = 2; i <= h.heapSize; i++) if (!(keyAt(h, parent(i)) < keyAt(h, i))) return false;
  return true;
}

// Fixed positions by index (slide 43): level = ⌊lg i⌋, a level's nodes are spread over the width of the last level.
export function heapLayout(length: number): { pos: Record<number, Pos>; width: number; height: number } {
  const levels = Math.floor(Math.log2(Math.max(1, length))) + 1;
  const pos: Record<number, Pos> = {};
  for (let i = 1; i <= length; i++) {
    const d = Math.floor(Math.log2(i));
    const span = 2 ** (levels - 1 - d); // last-level slots under one node of this level
    const j = i - 2 ** d;
    pos[i] = { x: TREE_PAD + (j * span + (span - 1) / 2) * TREE_SPACING, y: TREE_PAD + d * TREE_LEVEL };
  }
  return {
    pos,
    width: 2 * TREE_PAD + (2 ** (levels - 1) - 1) * TREE_SPACING,
    height: 2 * TREE_PAD + (levels - 1) * TREE_LEVEL,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/heapArray.test.ts && npx tsc --noEmit`
Expected: 6 tests PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/heapArray.ts src/engine/heapArray.test.ts
git commit -m "feat(engine): HeapArray model with cell ids, isHeap and fixed index layout" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Generalise `StructureDef` and the views (BST keeps working)

This task is a refactor: no behaviour change. It is done when `npx tsc --noEmit` and the whole existing suite pass.

**Files:**
- Modify: `src/structures/types.ts`, `src/structures/tracer.ts`, `src/structures/bst/index.ts`, `src/structures/registry.ts`, `src/ui/StructurePage.tsx`, `src/structures/bst/updates.test.ts`, `src/ui/TreeCanvas.test.tsx`

**Interfaces:**
- Consumes: `HeapArray` from Task 1.
- Produces:
  - `TreeView` gains `kind: 'tree'`; new `HeapView = { kind: 'heap'; heap: HeapArray; highlight: { cells: number[]; edges: number[] }; tags: Record<string, number> }` (`cells` and `tags` are 1-based indices; `edges` are child indices whose edge to their parent is highlighted); `StructureView = TreeView | HeapView`.
  - `StructureStep<V extends StructureView = StructureView> = StepCore & { view: V; ds: DSView[] }`; `TreeStep = StructureStep<TreeView>`; `HeapStep = StructureStep<HeapView>`.
  - `Operation = { id; label; input: 'none' | 'key' | 'node' | 'array' | 'index-key'; procs: string[]; sample?: string }`.
  - `StructureDef<S = Tree, V extends StructureView = TreeView>` with `build(keys): S`, `view(s, selectedKey: number | null): V`, `keep(v: V): S`, optional `nodeKey(s, id): number | null`, `validate(s, op, args: number[]): string[]`, `run(s, op, args: number[]): StructureStep<V>[]`.
  - `AnyStructure = StructureDef<any, any>`.

- [ ] **Step 1: Replace `src/structures/types.ts`**

```ts
import type { Proc } from '../algorithms/types';
import type { DSView, StepCore } from '../engine/trace';
import type { HeapArray } from '../engine/heapArray';
import type { NilSlot, NodeId, Tree } from '../engine/tree';

export type TreeView = {
  kind: 'tree';
  tree: Tree;
  // nodes: highlighted nodes; edges: child ids whose edge to their parent is highlighted.
  highlight: { nodes: NodeId[]; edges: NodeId[] };
  // Pointer variables drawn beside the node they point to (x, y, z, T.root, …).
  tags: Record<string, NodeId>;
  nil?: NilSlot;
};

export type HeapView = {
  kind: 'heap';
  heap: HeapArray;
  // cells: highlighted indices; edges: child indices whose edge to their parent is highlighted.
  highlight: { cells: number[]; edges: number[] };
  // Index variables (i, ℓ, r, smallest, s) drawn beside their node and under their array cell.
  tags: Record<string, number>;
};

export type StructureView = TreeView | HeapView;
export type StructureStep<V extends StructureView = StructureView> = StepCore & { view: V; ds: DSView[] };
export type TreeStep = StructureStep<TreeView>;
export type HeapStep = StructureStep<HeapView>;

// input: what the operation bar asks for. 'node' = a key typed or a node clicked; 'array' = a
// comma-separated list (sample is its initial text); 'index-key' = an array index i and a key k.
export type Operation = {
  id: string;
  label: string;
  input: 'none' | 'key' | 'node' | 'array' | 'index-key';
  procs: string[];
  sample?: string;
};

// S = the structure's state (Tree, HeapArray); V = the view its steps carry.
export type StructureDef<S = Tree, V extends StructureView = TreeView> = {
  id: string;
  title: string;
  procs: Proc[];
  operations: Operation[];
  questionTypes: { type: string; label: string }[];
  presets: { name: string; keys: number[] }[];
  maxNodes: number;
  build(keys: number[]): S;
  // The picture of a state in setup; selectedKey is the node an operation is aimed at, if any.
  view(s: S, selectedKey: number | null): V;
  // The state a finished run leaves behind ("Done: keep result").
  keep(v: V): S;
  // Key of the node with this id, for operations whose input is a node.
  nodeKey?(s: S, id: string): number | null;
  // args: [] (no input), [key], [index, key] or the array's keys, per Operation.input.
  validate(s: S, op: string, args: number[]): string[];
  run(s: S, op: string, args: number[]): StructureStep<V>[];
};

// eslint-free escape hatch for the registry and App, which hold structures of different S and V.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStructure = StructureDef<any, any>;
```

- [ ] **Step 2: Add `kind` to the tree tracer's view**

In `src/structures/tracer.ts`, change the `view:` line of `emit`:

```ts
        view: { kind: 'tree' as const, tree: tr.tree, highlight: { nodes: o.nodes ?? [], edges: o.edges ?? [] }, tags, nil: o.nil },
```

- [ ] **Step 3: Replace `src/structures/bst/index.ts`**

```ts
import { findKey, size, type Tree } from '../../engine/tree';
import type { StructureDef, TreeView } from '../types';
import { buildBst } from './model';
import { BST_DELETE, bstProcs, TREE_INSERT, TREE_MINIMUM, TREE_SEARCH, TREE_SUCCESSOR } from './pseudocode';
import { runMinimum, runSearch, runSuccessor } from './queries';
import { BST_QUESTION_TYPES } from './questions';
import { runDelete, runInsert } from './updates';

const MAX_NODES = 15;

function validate(t: Tree, op: string, args: number[]): string[] {
  const k = args[0] ?? null;
  if (op === 'minimum') return size(t) === 0 ? ['Tree Minimum is undefined on an empty tree.'] : [];
  if (k === null) return ['Enter an integer key.'];
  if (op === 'insert') {
    if (findKey(t, k) !== null) return [`Key ${k} is already in the tree (keys must be unique).`];
    if (size(t) >= MAX_NODES) return [`The tree is limited to ${MAX_NODES} nodes so it stays readable.`];
    return [];
  }
  if (op === 'successor' || op === 'delete') return findKey(t, k) === null ? [`No node with key ${k}.`] : [];
  return [];
}

export const bst: StructureDef<Tree, TreeView> = {
  id: 'bst',
  title: 'Binary Search Tree (BST)',
  procs: bstProcs,
  operations: [
    { id: 'search', label: 'Search', input: 'key', procs: [TREE_SEARCH] },
    { id: 'minimum', label: 'Minimum', input: 'none', procs: [TREE_MINIMUM] },
    { id: 'successor', label: 'Successor', input: 'node', procs: [TREE_SUCCESSOR, TREE_MINIMUM] },
    { id: 'insert', label: 'Insert', input: 'key', procs: [TREE_INSERT] },
    { id: 'delete', label: 'Delete', input: 'node', procs: [BST_DELETE, TREE_SUCCESSOR, TREE_MINIMUM] },
  ],
  questionTypes: BST_QUESTION_TYPES,
  presets: [
    { name: 'Lecture example', keys: [17, 4, 20, 1, 12, 18, 29, 9, 26, 6, 11, 23] },
    { name: 'Sorted inserts (a path)', keys: [1, 2, 3, 4, 5, 6] },
  ],
  maxNodes: MAX_NODES,
  build: buildBst,
  view(t, selectedKey) {
    const selected = selectedKey === null ? null : findKey(t, selectedKey);
    return { kind: 'tree', tree: t, highlight: { nodes: selected ? [selected] : [], edges: [] }, tags: {} };
  },
  keep: (v) => v.tree,
  nodeKey: (t, id) => t.nodes[id].key,
  validate,
  run(t, op, args) {
    const k = args[0];
    switch (op) {
      case 'search': return runSearch(t, k);
      case 'minimum': return runMinimum(t);
      case 'successor': return runSuccessor(t, k);
      case 'insert': return runInsert(t, k);
      case 'delete': return runDelete(t, k);
      default: throw new Error(`Unknown BST operation ${op}`);
    }
  },
};
```

- [ ] **Step 4: Type the registry**

Replace `src/structures/registry.ts`:

```ts
import { bst } from './bst';
import type { AnyStructure } from './types';

export const STRUCTURES: AnyStructure[] = [bst];
```

- [ ] **Step 5: Adapt `StructurePage.tsx` (still tree-only; Task 8 generalises it)**

Apply these edits to `src/ui/StructurePage.tsx`.

1. Imports and signature:

```tsx
import { inorder, type Tree } from '../engine/tree';
import type { StructureDef, TreeStep, TreeView } from '../structures/types';
```
replacing
```tsx
import { findKey, inorder, type NodeId } from '../engine/tree';
import type { StructureDef, TreeStep } from '../structures/types';
```
and
```tsx
export function StructurePage({ def }: { def: StructureDef<Tree, TreeView> }) {
```
replacing `export function StructurePage({ def }: { def: StructureDef }) {`.

2. Delete the line `const selected: NodeId | null = op.input === 'node' && key !== null ? findKey(tree, key) : null;`.

3. In `run`, replace
```tsx
    const k = needsKey ? key : null;
    const e = def.validate(tree, op.id, k);
    setErrors(e);
    if (e.length > 0) return;
    setSteps(def.run(tree, op.id, k));
```
with
```tsx
    const args = needsKey ? [key!] : [];
    const e = def.validate(tree, op.id, args);
    setErrors(e);
    if (e.length > 0) return;
    setSteps(def.run(tree, op.id, args));
```

4. In `keep`, replace `setTree(steps![steps!.length - 1].view.tree);` with `setTree(def.keep(steps![steps!.length - 1].view));`.

5. Replace the setup-state `<TreeCanvas … />` element with
```tsx
            <TreeCanvas
              view={def.view(tree, op.input === 'node' ? key : null)}
              onNodeClick={op.input === 'node' ? (id) => setKeyText(String(def.nodeKey!(tree, id))) : undefined}
            />
```

- [ ] **Step 6: Update the tests that touch the changed signatures**

In `src/ui/TreeCanvas.test.tsx`, add `kind: 'tree',` as the first property of the object returned by `view`:

```tsx
const view = (over: Partial<TreeView> = {}): TreeView => ({
  kind: 'tree',
  tree: buildBst([10, 5, 15]),
  highlight: { nodes: [], edges: [] },
  tags: {},
  ...over,
});
```

In `src/structures/bst/updates.test.ts`, first convert the scalar `validate` calls (lines 82–94) mechanically:

Run:
```bash
sed -i '' -E "s/bst\.validate\((\w+), ('[a-z]+'), null\)/bst.validate(\1, \2, [])/; s/bst\.validate\((\w+), ('[a-z]+'), ([0-9]+)\)/bst.validate(\1, \2, [\3])/" src/structures/bst/updates.test.ts
```
then edit the two remaining call sites by hand. In `run dispatches every operation`:

```ts
  for (const op of bst.operations) {
    const args = op.input === 'none' ? [] : [op.id === 'insert' ? 5 : 12];
    expect(bst.validate(t, op.id, args)).toEqual([]);
    assertValidTreeTrace(bst, bst.run(t, op.id, args));
  }
```
and in the random-sequence test:
```ts
    if (bst.validate(t, op, [k]).length > 0) continue;
    const steps = bst.run(t, op, [k]);
```

- [ ] **Step 7: Verify nothing changed behaviourally**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all existing tests PASS (same count as before).

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "refactor(structures): StructureDef generic over state and view; HeapView and StructureStep types" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Draw the `T.root` pointer tag (BST `Tree_Insert`)

Resolves the spec gap in `tree-followups.md`: `T.root` is a pointer variable of `Tree_Insert` (lines 1, 2 and 4) and was never drawn.

**Files:**
- Modify: `src/structures/tracer.ts`, `src/structures/bst/updates.ts`
- Test: `src/structures/bst/updates.test.ts`

**Interfaces:**
- Consumes: `TreeTracer` from `src/structures/tracer.ts`.
- Produces: `TreeTracer.showRoot: boolean` (default `false`). While true, every emitted step has `vars['T.root']` (the root's key, or `null`) and, when the tree has a root, `view.tags['T.root']` (the root's id).

- [ ] **Step 1: Write the failing test**

Append to `src/structures/bst/updates.test.ts` (add `import { runSearch } from './queries';` to the imports):

```ts
test('Tree_Insert tags T.root on the root node and lists it in the variables; other procedures do not', () => {
  const t = buildBst(LECTURE);
  const steps = runInsert(t, 10);
  expect(steps.every((s) => s.vars['T.root'] === 17 && s.view.tags['T.root'] === t.root)).toBe(true);

  const empty = runInsert(buildBst([]), 5);
  expect([empty[1].vars['T.root'], 'T.root' in empty[1].view.tags]).toEqual([null, false]);
  expect([last(empty).vars['T.root'], last(empty).view.tags['T.root']]).toEqual([5, last(empty).view.tree.root]);

  expect('T.root' in runSearch(t, 12)[1].vars).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/structures/bst/updates.test.ts -t "T.root"`
Expected: FAIL (`vars['T.root']` is `undefined`).

- [ ] **Step 3: Implement**

In `src/structures/tracer.ts`: add to the `TreeTracer` type, after `stack: string[];`:

```ts
  // While true, T.root is a pointer variable of the running procedure (Tree_Insert).
  showRoot: boolean;
```
add `showRoot: false,` after `stack: [],` in the object literal, and in `emit`, after the `for (const [name, id] of Object.entries(tr.ptr)) { … }` loop:

```ts
      if (tr.showRoot) {
        vars['T.root'] = tr.tree.root === null ? null : tr.tree.nodes[tr.tree.root].key;
        if (tr.tree.root !== null) tags['T.root'] = tr.tree.root;
      }
```

In `src/structures/bst/updates.ts`, in `runInsert`, right after `const T = tr.tree;` add:

```ts
  tr.showRoot = true;
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/structures src/ui && npx tsc --noEmit`
Expected: all PASS (the new test and every existing BST/TreeCanvas test).

- [ ] **Step 5: Commit**

```bash
git add src/structures/tracer.ts src/structures/bst/updates.ts src/structures/bst/updates.test.ts
git commit -m "feat(bst): draw the T.root pointer tag during Tree_Insert" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Heap drawing: `HeapArrayStrip`, `HeapCanvas`, `StructureCanvas`, `nodeOptions`

**Files:**
- Create: `src/structures/views.ts`, `src/structures/views.test.ts`, `src/ui/HeapArrayStrip.tsx`, `src/ui/HeapCanvas.tsx`, `src/ui/StructureCanvas.tsx`, `src/ui/HeapCanvas.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `HeapView`, `StructureView` (Task 2); `cellId`, `heapLayout`, `makeHeap` (Task 1); `TreeCanvas` (existing).
- Produces:
  - `nodeOptions(view: StructureView): { id: string; label: string }[]`: tree nodes in key order, or the heap's live cells in index order (node-answer choices).
  - `<StructureCanvas view={StructureView} onNodeClick?(id: string) />`: dispatches on `view.kind`.
  - `<HeapCanvas view={HeapView} onNodeClick? />` and `<HeapArrayStrip view={HeapView} onCellClick? />`. DOM contract used by tests: a live node is `g.tnode[data-node=<cellId>]` containing `text.key`, `text.idx-label`, optional `text.ptr-tag`; an edge is `line.tree-edge[data-edge=<child cellId>]`; a cell is `g.cell[data-cell=<index>]` (`.past` past heap-size, `.active` highlighted); the marker label is `text.marker-label` reading `heap-size = n`.

- [ ] **Step 1: Write the failing tests**

Create `src/structures/views.test.ts`:

```ts
import { makeHeap } from '../engine/heapArray';
import { buildBst } from './bst/model';
import { nodeOptions } from './views';

test('nodeOptions: tree nodes in key order', () => {
  const t = buildBst([10, 5, 15]);
  const view = { kind: 'tree' as const, tree: t, highlight: { nodes: [], edges: [] }, tags: {} };
  expect(nodeOptions(view)).toEqual([{ id: 'n2', label: '5' }, { id: 'n1', label: '10' }, { id: 'n3', label: '15' }]);
});

test('nodeOptions: only the heap cells up to heap-size, in index order, by cell id', () => {
  const heap = makeHeap([2, 5, 3, 9], 15, 3); // A[4] = 9 is a stale cell
  const view = { kind: 'heap' as const, heap, highlight: { cells: [], edges: [] }, tags: {} };
  expect(nodeOptions(view)).toEqual([{ id: '1', label: '2' }, { id: '2', label: '5' }, { id: '3', label: '3' }]);
});
```

Create `src/ui/HeapCanvas.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { makeHeap } from '../engine/heapArray';
import type { HeapView, TreeView } from '../structures/types';
import { buildBst } from '../structures/bst/model';
import { HeapCanvas } from './HeapCanvas';
import { StructureCanvas } from './StructureCanvas';

const EXAMPLE = [2, 5, 3, 9, 6, 4, 8, 12, 11, 7];
const view = (over: Partial<HeapView> = {}): HeapView => ({
  kind: 'heap',
  heap: makeHeap(EXAMPLE, 15, 10),
  highlight: { cells: [], edges: [] },
  tags: {},
  ...over,
});

test('draws a node and a parent edge per live cell, and a 15-cell strip with the stale cells greyed', () => {
  const { container } = render(<HeapCanvas view={view()} />);
  expect(container.querySelectorAll('.tnode')).toHaveLength(10);
  expect(container.querySelectorAll('.tree-edge')).toHaveLength(9);
  expect(container.querySelectorAll('.heap-array .cell')).toHaveLength(15);
  expect(container.querySelectorAll('.heap-array .cell.past')).toHaveLength(5);
  expect(container.querySelector('.marker-label')).toHaveTextContent('heap-size = 10');
  const root = container.querySelector('[data-node="1"]')!;
  expect(root.querySelector('.key')).toHaveTextContent('2');
  expect(root.querySelector('.idx-label')).toHaveTextContent('1');
});

test('highlights and index tags come from the view: beside the node and under the cell, even past heap-size', () => {
  const v = view({ highlight: { cells: [2], edges: [4] }, tags: { i: 2, 'ℓ': 4, smallest: 4, s: 12 } });
  const { container } = render(<HeapCanvas view={v} />);
  expect(container.querySelector('[data-node="2"]')).toHaveClass('tnode', 'active');
  expect(container.querySelector('[data-cell="2"]')).toHaveClass('active');
  expect(container.querySelector('[data-edge="4"]')).toHaveClass('tree-edge', 'active');
  expect(container.querySelector('[data-node="2"] .ptr-tag')).toHaveTextContent('i');
  expect(container.querySelector('[data-node="4"] .ptr-tag')).toHaveTextContent('ℓ, smallest');
  expect(container.querySelector('[data-cell="12"] .ptr-tag')).toHaveTextContent('s');
  expect(container.querySelector('[data-node="12"]')).toBeNull();
});

test('clicking a live node or a live cell reports its id; a stale cell is not clickable', () => {
  const onNodeClick = vi.fn();
  const { container } = render(<HeapCanvas view={view()} onNodeClick={onNodeClick} />);
  fireEvent.pointerDown(container.querySelector('[data-node="3"]')!);
  fireEvent.pointerDown(container.querySelector('[data-cell="4"]')!);
  fireEvent.pointerDown(container.querySelector('[data-cell="11"]')!);
  expect(onNodeClick.mock.calls).toEqual([['3'], ['4']]);
});

test('∞ is drawn as ∞; an empty heap says so and still shows the whole strip', () => {
  const heap = makeHeap([2, 5], 15, 2);
  heap.A[1] = Infinity;
  const { container, rerender } = render(<HeapCanvas view={view({ heap })} />);
  expect(container.querySelector('[data-node="2"] .key')).toHaveTextContent('∞');
  rerender(<HeapCanvas view={view({ heap: makeHeap([], 15, 0) })} />);
  expect(screen.getByText('heap-size = 0 (empty heap)')).toBeInTheDocument();
  expect(container.querySelectorAll('.heap-array .cell.past')).toHaveLength(15);
  expect(container.querySelector('.marker-label')).toHaveTextContent('heap-size = 0');
});

test('StructureCanvas picks the drawing by view kind', () => {
  const tree: TreeView = { kind: 'tree', tree: buildBst([10, 5]), highlight: { nodes: [], edges: [] }, tags: {} };
  const { container, rerender } = render(<StructureCanvas view={tree} />);
  expect(container.querySelector('.heap-array')).toBeNull();
  expect(container.querySelectorAll('.tnode')).toHaveLength(2);
  rerender(<StructureCanvas view={view()} />);
  expect(container.querySelector('.heap-array')).not.toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/views.test.ts src/ui/HeapCanvas.test.tsx`
Expected: FAIL, unresolved imports `./views`, `./HeapCanvas`, `./StructureCanvas`.

- [ ] **Step 3: Implement `views.ts`**

Create `src/structures/views.ts`:

```ts
import { cellId } from '../engine/heapArray';
import { inorder } from '../engine/tree';
import type { StructureView } from './types';

export type NodeOption = { id: string; label: string };

// What a node question can be answered with: tree nodes in key order, or the heap's live cells in index order.
export function nodeOptions(view: StructureView): NodeOption[] {
  if (view.kind === 'tree') return inorder(view.tree).map((id) => ({ id, label: String(view.tree.nodes[id].key) }));
  const { heap } = view;
  return heap.A.slice(0, heap.heapSize).map((key, j) => ({ id: cellId(heap, j + 1), label: String(key) }));
}
```

- [ ] **Step 4: Implement the strip, the canvas and the dispatcher**

Create `src/ui/HeapArrayStrip.tsx`:

```tsx
import { cellId } from '../engine/heapArray';
import { formatValue } from '../engine/trace';
import type { HeapView } from '../structures/types';

const CELL = 28;
const PAD = 16;

type Props = { view: HeapView; onCellClick?(id: string): void };

// A[1…A.length] as a row of cells; cells past heap-size are greyed and a marker sits at the boundary.
export function HeapArrayStrip({ view, onCellClick }: Props) {
  const { heap, highlight, tags } = view;
  const n = heap.A.length;
  const tagsAt: Record<number, string[]> = {};
  for (const [name, at] of Object.entries(tags)) (tagsAt[at] ??= []).push(name);
  const markerX = PAD + heap.heapSize * CELL;
  const anchor = heap.heapSize === 0 ? 'start' : heap.heapSize === n ? 'end' : 'middle';

  return (
    <svg className="heap-array" viewBox={`0 0 ${2 * PAD + n * CELL} 84`} role="img" aria-label="Array A">
      {heap.A.map((key, j) => {
        const i = j + 1;
        const live = i <= heap.heapSize;
        const cls = ['cell'];
        if (!live) cls.push('past');
        if (highlight.cells.includes(i)) cls.push('active');
        return (
          <g
            key={i}
            data-cell={i}
            className={cls.join(' ')}
            transform={`translate(${PAD + j * CELL},0)`}
            onPointerDown={live ? () => onCellClick?.(cellId(heap, i)) : undefined}
          >
            <text className="idx-label" x={CELL / 2} y={11} textAnchor="middle">{i}</text>
            <rect y={16} width={CELL} height={CELL} />
            <text className="key" x={CELL / 2} y={16 + CELL / 2} textAnchor="middle" dominantBaseline="central">
              {key === null ? '' : formatValue(key)}
            </text>
            {tagsAt[i] && <text className="ptr-tag" x={CELL / 2} y={62} textAnchor="middle">{tagsAt[i].join(', ')}</text>}
          </g>
        );
      })}
      <line className="heap-size-marker" x1={markerX} x2={markerX} y1={12} y2={50} />
      <text className="marker-label" x={markerX} y={80} textAnchor={anchor}>{`heap-size = ${heap.heapSize}`}</text>
    </svg>
  );
}
```

Create `src/ui/HeapCanvas.tsx`:

```tsx
import { cellId, heapLayout, parent } from '../engine/heapArray';
import { formatValue } from '../engine/trace';
import type { HeapView } from '../structures/types';
import { HeapArrayStrip } from './HeapArrayStrip';

const R = 17;

type Props = { view: HeapView; onNodeClick?(id: string): void };

// The heap as a tree at fixed index positions (slide 43), with the array strip underneath.
export function HeapCanvas({ view, onNodeClick }: Props) {
  const { heap, highlight, tags } = view;
  const L = heapLayout(heap.A.length);
  const live = Array.from({ length: heap.heapSize }, (_, j) => j + 1);
  const tagsAt: Record<number, string[]> = {};
  for (const [name, at] of Object.entries(tags)) (tagsAt[at] ??= []).push(name);

  return (
    <div className="heap-canvas">
      <svg className="tree-canvas" viewBox={`0 0 ${L.width} ${L.height}`} role="img" aria-label="Heap as a tree">
        {live.filter((i) => i > 1).map((i) => {
          const a = L.pos[parent(i)];
          const b = L.pos[i];
          const cls = highlight.edges.includes(i) ? 'tree-edge active' : 'tree-edge';
          return <line key={`e-${cellId(heap, i)}`} data-edge={cellId(heap, i)} className={cls} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {live.map((i) => {
          const id = cellId(heap, i);
          const { x, y } = L.pos[i];
          return (
            <g
              key={id}
              data-node={id}
              className={highlight.cells.includes(i) ? 'tnode active' : 'tnode'}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onPointerDown={() => onNodeClick?.(id)}
            >
              <circle r={R} />
              <text className="key" textAnchor="middle" dominantBaseline="central">{formatValue(heap.A[i - 1])}</text>
              <text className="idx-label" x={-R - 2} y={-R + 2} textAnchor="end">{i}</text>
              {tagsAt[i] && <text className="ptr-tag" x={R + 3} y={-R + 2}>{tagsAt[i].join(', ')}</text>}
            </g>
          );
        })}
        {live.length === 0 && (
          <text className="empty-note" x={L.width / 2} y={L.height / 2} textAnchor="middle" dominantBaseline="central">
            heap-size = 0 (empty heap)
          </text>
        )}
      </svg>
      <HeapArrayStrip view={view} onCellClick={onNodeClick} />
    </div>
  );
}
```

Create `src/ui/StructureCanvas.tsx`:

```tsx
import type { StructureView } from '../structures/types';
import { HeapCanvas } from './HeapCanvas';
import { TreeCanvas } from './TreeCanvas';

type Props = { view: StructureView; onNodeClick?(id: string): void };

export function StructureCanvas({ view, onNodeClick }: Props) {
  return view.kind === 'tree'
    ? <TreeCanvas view={view} onNodeClick={onNodeClick} />
    : <HeapCanvas view={view} onNodeClick={onNodeClick} />;
}
```

- [ ] **Step 5: Add the styles**

Append to `src/styles.css`:

```css

/* ---------- Binary heap ---------- */
.heap-canvas { display: flex; flex-direction: column; gap: 8px; }
.tnode .idx-label, .heap-array .idx-label { font-family: var(--font-code); font-size: 10px; font-weight: 400; fill: var(--muted); }
.heap-array { width: 100%; height: auto; display: block; }
.heap-array .cell { cursor: pointer; }
.heap-array .cell rect { fill: var(--v-white); stroke: var(--v-stroke); stroke-width: 2; }
.heap-array .cell text.key { font-family: var(--font-text); font-size: 13px; font-weight: 700; fill: #000000; pointer-events: none; }
.heap-array .cell.past { cursor: default; }
.heap-array .cell.past rect { fill: none; stroke: var(--muted); stroke-dasharray: 3 3; }
.heap-array .cell.past text.key { fill: var(--muted); }
.heap-array .cell.active rect { stroke: var(--marker); stroke-width: 4; }
.heap-array .ptr-tag { font-family: var(--font-code); font-size: 11px; fill: var(--marker); }
.heap-size-marker { stroke: var(--marker); stroke-width: 3; }
.marker-label { font-family: var(--font-code); font-size: 11px; fill: var(--muted); }
.array-input { width: 16em; max-width: 100%; }
.array-input[aria-invalid='true'] { border-color: var(--red); }
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/structures/views.test.ts src/ui/HeapCanvas.test.tsx && npx tsc --noEmit`
Expected: all PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/structures/views.ts src/structures/views.test.ts src/ui/HeapArrayStrip.tsx src/ui/HeapCanvas.tsx src/ui/StructureCanvas.tsx src/ui/HeapCanvas.test.tsx src/styles.css
git commit -m "feat(ui): HeapCanvas with array strip, heap-size marker and index tags; StructureCanvas; nodeOptions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Heap pseudocode, tracer, questions; `Heapify` and `Build_Heap`

**Files:**
- Create: `src/structures/heap/pseudocode.ts`, `tracer.ts`, `questions.ts`, `testing.ts`, `heapify.ts`, `heapify.test.ts`

**Interfaces:**
- Consumes: `HeapArray`, `makeHeap`, `keyAt`, `left`, `right`, `swapCells`, `cellId` (Task 1); `HeapStep` (Task 2); `assertQuestionsPredictable` from `src/algorithms/testing.ts`; `mulberry32` from `src/algorithms/sssp/reference.ts`.
- Produces:
  - `pseudocode.ts`: constants `BUILD_HEAP = 'Build_Heap'`, `HEAPIFY = 'Heapify'`, `HEAP_EXTRACT_MIN = 'Heap_Extract_Min'`, `HEAP_DECREASE_KEY = 'Heap_Decrease_Key'`, `HEAP_INSERT = 'Heap_Insert'`; `heapProcs: Proc[]` with `Build_Heap` first.
  - `tracer.ts`: `createHeapTracer(heap): HeapTracer` with `heap`, `steps: HeapStep[]`, `idx: Record<string, number>` (index variables of the running frame), `extra: Record<string, Value>`, `stack: string[]`, `emit(proc, line, o?: { bigStep?; cells?: number[]; edges?: number[]; note?; question? })`. Every step's `vars` starts with `'heap-size'`.
  - `questions.ts`: `HEAP_QUESTION_TYPES`, `heapifyQuestion(h, i)`, `decreaseKeyQuestion(h, i)`.
  - `heapify.ts`: `traceHeapify(tr, start): void` (runs `Heapify(A, start)` inside `tr`, pushes and pops its stack frames), `runBuildHeap(keys: number[]): HeapStep[]`.
  - `testing.ts` (test helpers): `checkHeapPredictable(steps)`, `answerLabels(steps, type)`, `answerValues(steps, type)`, `randomKeys(rand, size)`.

- [ ] **Step 1: Write the failing tests**

Create `src/structures/heap/testing.ts` (helpers first; the tests import them):

```ts
import { assertQuestionsPredictable } from '../../algorithms/testing';
import { cellId, keyAt, left, parent, right } from '../../engine/heapArray';
import type { HeapStep } from '../types';

// Every question must be answerable from the step shown before it, and that step's note must not give it away.
export function checkHeapPredictable(steps: HeapStep[]): void {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    const h = prev.view.heap;
    const i = step.vars.i as number;
    if (q.type === 'heap.heapify') {
      expect(left(i)).toBeLessThanOrEqual(h.heapSize); // a leaf call has a forced answer and asks nothing
      const cells = [i, left(i), right(i)].filter((c) => c <= h.heapSize);
      const best = cells.reduce((a, b) => (keyAt(h, b) < keyAt(h, a) ? b : a));
      expect(q.answer).toEqual({ kind: 'node', value: cellId(h, best), label: String(keyAt(h, best)), nil: false });
      expect(prev.note ?? '').not.toMatch(/smallest/);
    } else if (q.type === 'heap.decreaseKey') {
      expect(i).toBeGreaterThan(1);
      expect(q.answer).toEqual({ kind: 'yesno', value: keyAt(h, i) < keyAt(h, parent(i)) });
      expect(prev.note ?? '').not.toMatch(/Swapped|loop ends/);
    } else {
      throw new Error(`unexpected ${q.type}`);
    }
  });
}

// The labels (keys) of the node answers of one question type, in trace order.
export const answerLabels = (steps: HeapStep[], type: string): string[] =>
  steps.flatMap((s) => (s.question?.type === type && s.question.answer.kind === 'node' ? [s.question.answer.label] : []));

export const answerValues = (steps: HeapStep[], type: string) =>
  steps.filter((s) => s.question?.type === type).map((s) => s.question!.answer.value);

// `size` distinct integers in -10…29, in random order.
export function randomKeys(rand: () => number, size: number): number[] {
  const pool = Array.from({ length: 40 }, (_, j) => j - 10);
  for (let j = pool.length - 1; j > 0; j--) {
    const r = Math.floor(rand() * (j + 1));
    [pool[j], pool[r]] = [pool[r], pool[j]];
  }
  return pool.slice(0, size);
}
```

Create `src/structures/heap/heapify.test.ts`:

```ts
import { mulberry32 } from '../../algorithms/sssp/reference';
import { isHeap, type HeapArray } from '../../engine/heapArray';
import { assertValidTreeTrace } from '../testing';
import type { HeapStep } from '../types';
import { runBuildHeap } from './heapify';
import { heapProcs } from './pseudocode';
import { answerLabels, checkHeapPredictable, randomKeys } from './testing';

const def = { procs: heapProcs };
const EXAMPLE = [9, 4, 7, 1, 3, 8, 2, 6, 5];
const last = (s: HeapStep[]) => s[s.length - 1];
const heapOf = (s: HeapStep[]) => last(s).view.heap;
const live = (h: HeapArray) => h.A.slice(0, h.heapSize);

test('Build_Heap on [9,4,7,1,3,8,2,6,5]: the array is placed first, then heap-size = A.length, and the result is a heap', () => {
  const steps = runBuildHeap(EXAMPLE);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line, steps[0].view.heap.heapSize]).toEqual(['Build_Heap', 0, 0]);
  expect([steps[1].line, steps[1].view.heap.heapSize]).toEqual([1, 9]);
  const h = heapOf(steps);
  expect(live(h)).toEqual([1, 3, 2, 4, 9, 8, 7, 6, 5]);
  expect([h.heapSize, h.A.length, isHeap(h)]).toEqual([9, 9, true]);
});

test('Build_Heap: each i from A.length down to 1 is a big step; Heapify asks once per non-leaf call', () => {
  const steps = runBuildHeap(EXAMPLE);
  const loop = steps.filter((s) => s.proc === 'Build_Heap' && s.line === 2);
  expect(loop.map((s) => s.vars.i)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
  expect(loop.every((s) => s.bigStep)).toBe(true);
  // calls: i=4 (1), i=3 (2), i=2 (1), its recursive call at 4 (4), i=1 (1), its recursive call at 2 (3)
  expect(answerLabels(steps, 'heap.heapify')).toEqual(['1', '2', '1', '4', '1', '3']);
  checkHeapPredictable(steps);
});

test('Heapify seeps 9 down to A[5]: recursive calls are on the call stack', () => {
  const steps = runBuildHeap(EXAMPLE);
  const recursions = steps.filter((s) => s.proc === 'Heapify' && s.line === 10).map((s) => s.vars.smallest);
  expect(recursions).toEqual([7, 4, 2, 5]);
  expect(last(steps).ds[0]).toEqual({
    kind: 'stack',
    name: 'Call stack',
    items: ['Build_Heap(A)', 'Heapify(A, 1)', 'Heapify(A, 2)', 'Heapify(A, 5)'],
  });
});

test('index variables are drawn as tags and listed in the variables line', () => {
  const steps = runBuildHeap(EXAMPLE);
  const seven = steps.find((s) => s.proc === 'Heapify' && s.line === 7)!;
  expect(seven.view.tags).toEqual({ i: 3, 'ℓ': 6, smallest: 7, r: 7 });
  expect(seven.vars).toMatchObject({ 'heap-size': 9, i: 3, 'ℓ': 6, r: 7, smallest: 7 });
});

test('one key, negative keys and an already valid heap', () => {
  const one = runBuildHeap([7]);
  expect(live(heapOf(one))).toEqual([7]);
  expect(one.some((s) => s.question)).toBe(false); // a leaf call asks nothing
  expect(live(heapOf(runBuildHeap([-1, -5, 3])))).toEqual([-5, -1, 3]);
  const sorted = runBuildHeap([1, 2, 3, 4, 5, 6, 7]);
  expect(live(heapOf(sorted))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(sorted.some((s) => s.proc === 'Heapify' && s.line === 9)).toBe(false); // no swaps
});

test('random arrays: a valid heap with the same keys, and predictable questions', () => {
  const rand = mulberry32(5);
  for (let n = 0; n < 60; n++) {
    const keys = randomKeys(rand, 1 + Math.floor(rand() * 15));
    const steps = runBuildHeap(keys);
    assertValidTreeTrace(def, steps);
    checkHeapPredictable(steps);
    const h = heapOf(steps);
    expect(isHeap(h)).toBe(true);
    expect([...live(h)].sort((a, b) => (a as number) - (b as number))).toEqual([...keys].sort((a, b) => a - b));
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/heap/heapify.test.ts`
Expected: FAIL, unresolved imports `./heapify` and `./pseudocode`.

- [ ] **Step 3: Implement `pseudocode.ts`**

Create `src/structures/heap/pseudocode.ts`:

```ts
import type { Proc } from '../../algorithms/types';

export const BUILD_HEAP = 'Build_Heap';
export const HEAPIFY = 'Heapify';
export const HEAP_EXTRACT_MIN = 'Heap_Extract_Min';
export const HEAP_DECREASE_KEY = 'Heap_Decrease_Key';
export const HEAP_INSERT = 'Heap_Insert';

// Efficient DS slides 46, 47, 49, 50, 51 (min-heap; keys are the A[i].key of the slides).
export const heapProcs: Proc[] = [
  {
    name: BUILD_HEAP,
    signature: 'Build_Heap(A)',
    lines: ['A.heap-size = A.length', 'for i = A.length, …, 2, 1 do', '    Heapify(A, i)'],
  },
  {
    name: HEAPIFY,
    signature: 'Heapify(A, i)',
    lines: [
      'ℓ = Left(i)',
      'if ℓ ≤ A.heap-size and A[ℓ].key < A[i].key then',
      '    smallest = ℓ',
      'else smallest = i',
      'r = Right(i)',
      'if r ≤ A.heap-size and A[r].key < A[smallest].key then',
      '    smallest = r',
      'if smallest ≠ i then',
      '    swap A[i] and A[smallest]',
      '    Heapify(A, smallest)',
    ],
  },
  {
    name: HEAP_EXTRACT_MIN,
    signature: 'Heap_Extract_Min(A)',
    lines: [
      'if A.heap-size < 1 then',
      '    error "the heap is empty"',
      'min = A[1]',
      'A[1] = A[A.heap-size]',
      'A.heap-size = A.heap-size − 1',
      'Heapify(A, 1)',
      'return min',
    ],
  },
  {
    name: HEAP_DECREASE_KEY,
    signature: 'Heap_Decrease_Key(A, i, k)',
    lines: [
      'if k > A[i].key then',
      '    error "new key is larger than current key"',
      'A[i].key = k',
      'while i > 1 and A[i].key < A[Parent(i)].key do',
      '    swap A[i] and A[Parent(i)]',
      '    i = Parent(i)',
    ],
  },
  {
    name: HEAP_INSERT,
    signature: 'Heap_Insert(A, x)',
    lines: [
      's = A.heap-size + 1',
      'A[s] = x    ▷ copy all satellite attributes',
      'A[s].key = ∞',
      'A.heap-size = s    ▷ a valid heap of size s',
      'Heap_Decrease_Key(A, s, x.key)',
    ],
  },
];
```

- [ ] **Step 4: Implement `tracer.ts` and `questions.ts`**

Create `src/structures/heap/tracer.ts`:

```ts
import type { HeapArray } from '../../engine/heapArray';
import type { Question, Value } from '../../engine/trace';
import type { HeapStep } from '../types';

export type HeapEmit = {
  bigStep?: boolean;
  // Highlighted cells (indices) and child indices whose edge to their parent is highlighted.
  cells?: number[];
  edges?: number[];
  note?: string;
  question?: Question;
};

export type HeapTracer = {
  heap: HeapArray;
  steps: HeapStep[];
  // Index variables of the running frame (i, ℓ, r, smallest, s); drawn as tags and listed in the variables line.
  idx: Record<string, number>;
  // Other variables (k, x, min).
  extra: Record<string, Value>;
  stack: string[];
  emit(proc: string, line: number, o?: HeapEmit): void;
};

export function createHeapTracer(heap: HeapArray): HeapTracer {
  const tr: HeapTracer = {
    heap,
    steps: [],
    idx: {},
    extra: {},
    stack: [],
    emit(proc, line, o = {}) {
      const tags: Record<string, number> = {};
      for (const [name, at] of Object.entries(tr.idx)) if (at >= 1 && at <= tr.heap.A.length) tags[name] = at;
      tr.steps.push(structuredClone({
        proc,
        line,
        bigStep: o.bigStep ?? false,
        vars: { 'heap-size': tr.heap.heapSize, ...tr.extra, ...tr.idx },
        note: o.note,
        question: o.question,
        view: { kind: 'heap' as const, heap: tr.heap, highlight: { cells: o.cells ?? [], edges: o.edges ?? [] }, tags },
        ds: tr.stack.length > 0 ? [{ kind: 'stack' as const, name: 'Call stack', items: tr.stack }] : [],
      }));
    },
  };
  return tr;
}
```

Create `src/structures/heap/questions.ts`:

```ts
import { cellId, keyAt, left, parent, right, type HeapArray } from '../../engine/heapArray';
import type { Question } from '../../engine/trace';

export const HEAP_QUESTION_TYPES = [
  { type: 'heap.heapify', label: 'Heapify: which of A[i], A[ℓ], A[r] is smallest' },
  { type: 'heap.decreaseKey', label: 'Heap_Decrease_Key: does A[i] swap with its parent' },
];

// Only cells up to heap-size are candidates. Asked only when ℓ ≤ heap-size, so i itself is live.
export function heapifyQuestion(h: HeapArray, i: number): Question {
  const cells = [i, left(i), right(i)].filter((c) => c <= h.heapSize);
  const best = cells.reduce((a, b) => (keyAt(h, b) < keyAt(h, a) ? b : a));
  return {
    type: 'heap.heapify',
    prompt: `Heapify(A, ${i}): which of ${cells.map((c) => `A[${c}]`).join(', ')} is the smallest?`,
    answer: { kind: 'node', value: cellId(h, best), label: String(keyAt(h, best)), nil: false },
    explain: `${cells.map((c) => `A[${c}] = ${keyAt(h, c)}`).join(', ')}: the smallest is A[${best}] = ${keyAt(h, best)}.`,
  };
}

// Asked only for i > 1 (at i = 1 the loop test is forced).
export function decreaseKeyQuestion(h: HeapArray, i: number): Question {
  const p = parent(i);
  const swap = keyAt(h, i) < keyAt(h, p);
  return {
    type: 'heap.decreaseKey',
    prompt: `Line 4: i = ${i}. Does A[i] swap with its parent A[${p}]?`,
    answer: { kind: 'yesno', value: swap },
    explain: swap
      ? `A[${i}] = ${keyAt(h, i)} < A[${p}] = ${keyAt(h, p)}, so they swap.`
      : `A[${i}] = ${keyAt(h, i)} > A[${p}] = ${keyAt(h, p)}, so the loop ends.`,
  };
}
```

- [ ] **Step 5: Implement `heapify.ts`**

Create `src/structures/heap/heapify.ts`:

```ts
import { keyAt, left, makeHeap, right, swapCells } from '../../engine/heapArray';
import type { HeapStep } from '../types';
import { BUILD_HEAP, HEAPIFY } from './pseudocode';
import { heapifyQuestion } from './questions';
import { createHeapTracer, type HeapTracer } from './tracer';

// Runs Heapify(A, start) inside tr, as the lecture's recursive procedure, and pops the frames it pushed.
export function traceHeapify(tr: HeapTracer, start: number): void {
  const h = tr.heap;
  const base = tr.stack.length;
  let i = start;
  tr.stack = [...tr.stack, `Heapify(A, ${i})`];
  for (;;) {
    const hs = h.heapSize;
    const l = left(i);
    tr.idx = { i, 'ℓ': l };
    tr.emit(HEAPIFY, 1, {
      bigStep: true,
      cells: [i],
      note: `ℓ = Left(${i}) = ${l}.`,
      // A call with no child inside the heap has a forced answer, so it asks nothing.
      question: l <= hs ? heapifyQuestion(h, i) : undefined,
    });

    const lLive = l <= hs;
    const lSmaller = lLive && keyAt(h, l) < keyAt(h, i);
    tr.emit(HEAPIFY, 2, {
      cells: lLive ? [i, l] : [i],
      edges: lLive ? [l] : [],
      note: lLive
        ? `ℓ = ${l} ≤ heap-size = ${hs}; A[ℓ] = ${keyAt(h, l)} ${lSmaller ? '<' : '≥'} A[i] = ${keyAt(h, i)}.`
        : `ℓ = ${l} > heap-size = ${hs}.`,
    });
    let smallest = lSmaller ? l : i;
    tr.idx = { i, 'ℓ': l, smallest };
    if (lSmaller) tr.emit(HEAPIFY, 3, { cells: [l], note: `smallest = ℓ = ${l}.` });
    else tr.emit(HEAPIFY, 4, { cells: [i], note: `smallest = i = ${i}.` });

    const r = right(i);
    tr.idx = { i, 'ℓ': l, smallest, r };
    tr.emit(HEAPIFY, 5, { cells: [i], note: `r = Right(${i}) = ${r}.` });
    const rLive = r <= hs;
    const rSmaller = rLive && keyAt(h, r) < keyAt(h, smallest);
    tr.emit(HEAPIFY, 6, {
      cells: rLive ? [smallest, r] : [smallest],
      edges: rLive ? [r] : [],
      note: rLive
        ? `r = ${r} ≤ heap-size = ${hs}; A[r] = ${keyAt(h, r)} ${rSmaller ? '<' : '≥'} A[smallest] = ${keyAt(h, smallest)}.`
        : `r = ${r} > heap-size = ${hs}.`,
    });
    if (rSmaller) {
      smallest = r;
      tr.idx = { i, 'ℓ': l, smallest, r };
      tr.emit(HEAPIFY, 7, { cells: [r], note: `smallest = r = ${r}.` });
    }

    const swaps = smallest !== i;
    tr.emit(HEAPIFY, 8, {
      cells: swaps ? [i, smallest] : [i],
      edges: swaps ? [smallest] : [],
      note: swaps ? `smallest = ${smallest} ≠ i = ${i}.` : `smallest = i = ${i}, so A[i] is in place.`,
    });
    if (!swaps) break;
    swapCells(h, i, smallest);
    tr.emit(HEAPIFY, 9, { cells: [i, smallest], edges: [smallest], note: `Swapped A[${i}] and A[${smallest}].` });
    tr.emit(HEAPIFY, 10, { cells: [smallest], note: `Heapify(A, ${smallest}).` });
    tr.stack = [...tr.stack, `Heapify(A, ${smallest})`];
    i = smallest;
  }
  tr.stack = tr.stack.slice(0, base);
}

// Build_Heap(A) on a typed array: the array replaces the heap, so A.length = keys.length.
export function runBuildHeap(keys: number[]): HeapStep[] {
  const n = keys.length;
  const tr = createHeapTracer(makeHeap(keys, n, 0));
  const h = tr.heap;
  tr.stack = ['Build_Heap(A)'];
  tr.emit(BUILD_HEAP, 0, { note: `Build_Heap(A) with A.length = ${n}` });
  h.heapSize = n;
  tr.emit(BUILD_HEAP, 1, { note: `heap-size = A.length = ${n}.` });
  for (let i = n; i >= 1; i--) {
    tr.idx = { i };
    tr.emit(BUILD_HEAP, 2, { bigStep: true, cells: [i], note: `i = ${i}.` });
    tr.emit(BUILD_HEAP, 3, { cells: [i], note: `Heapify(A, ${i}).` });
    traceHeapify(tr, i);
  }
  return tr.steps;
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/structures/heap/heapify.test.ts && npx tsc --noEmit`
Expected: 6 tests PASS, no type errors. If the question order or counts differ, recompute by hand from the lecture procedure (the expected values were derived by tracing `Build_Heap` on `[9,4,7,1,3,8,2,6,5]` line by line) before touching the implementation.

- [ ] **Step 7: Commit**

```bash
git add src/structures/heap
git commit -m "feat(heap): pseudocode, tracer, questions; Heapify and Build_Heap traces" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `Heap_Extract_Min`, `Heap_Decrease_Key`, `Heap_Insert`

**Files:**
- Create: `src/structures/heap/updates.ts`, `src/structures/heap/updates.test.ts`

**Interfaces:**
- Consumes: Task 5 (`createHeapTracer`, `traceHeapify`, `decreaseKeyQuestion`, pseudocode constants, test helpers), Task 1 (`HeapArray`, `keyAt`, `parent`, `swapCells`).
- Produces: `runExtractMin(h: HeapArray): HeapStep[]`, `traceDecreaseKey(tr, start, k): void`, `runDecreaseKey(h, i, k): HeapStep[]`, `runInsert(h, x): HeapStep[]`. None mutates its input. `runInsert` requires `h.heapSize < h.A.length` (the definition's `validate` guarantees it). After a run, `last(steps).vars.min` holds the extracted key.

- [ ] **Step 1: Write the failing tests**

Create `src/structures/heap/updates.test.ts`:

```ts
import { HEAP_CAPACITY, isHeap, makeHeap, type HeapArray } from '../../engine/heapArray';
import { assertValidTreeTrace } from '../testing';
import type { HeapStep } from '../types';
import { heapProcs } from './pseudocode';
import { answerLabels, answerValues, checkHeapPredictable } from './testing';
import { runDecreaseKey, runExtractMin, runInsert } from './updates';

const def = { procs: heapProcs };
const EXAMPLE = [2, 5, 3, 9, 6, 4, 8, 12, 11, 7];
const example = () => makeHeap(EXAMPLE, HEAP_CAPACITY, EXAMPLE.length);
const last = (s: HeapStep[]) => s[s.length - 1];
const heapOf = (s: HeapStep[]) => last(s).view.heap;
const live = (h: HeapArray) => h.A.slice(0, h.heapSize);

test('Heap_Extract_Min on the example: returns 2; 7 seeps down past 3 and 4; the old last cell is stale', () => {
  const steps = runExtractMin(example());
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['Heap_Extract_Min', 0]);
  expect(answerLabels(steps, 'heap.heapify')).toEqual(['3', '4']);
  const h = heapOf(steps);
  expect(live(h)).toEqual([3, 5, 4, 9, 6, 7, 8, 12, 11]);
  expect([h.heapSize, h.A[9], isHeap(h)]).toEqual([9, 7, true]);
  expect([last(steps).proc, last(steps).line, last(steps).note, last(steps).vars.min]).toEqual(['Heap_Extract_Min', 7, 'Returns 2.', 2]);
  expect(last(steps).ds[0]).toEqual({ kind: 'stack', name: 'Call stack', items: ['Heap_Extract_Min(A)'] });
  checkHeapPredictable(steps);
});

test('Heap_Extract_Min does not mutate its input', () => {
  const h = example();
  const before = structuredClone(h);
  runExtractMin(h);
  expect(h).toEqual(before);
});

test('Heap_Extract_Min on a one-key heap leaves heap-size 0 with a stale root; on an empty heap it runs to the error', () => {
  const one = runExtractMin(makeHeap([5], HEAP_CAPACITY, 1));
  assertValidTreeTrace(def, one);
  expect([heapOf(one).heapSize, heapOf(one).A[0], last(one).note]).toEqual([0, 5, 'Returns 5.']);
  expect(one.some((s) => s.question)).toBe(false);
  expect(last(one).view.tags).toEqual({});

  const none = runExtractMin(makeHeap([], HEAP_CAPACITY, 0));
  expect(none.map((s) => s.line)).toEqual([0, 1, 2]);
  expect(last(none).note).toBe('error "the heap is empty"');
  expect(heapOf(none)).toEqual(makeHeap([], HEAP_CAPACITY, 0));
});

test('Heap_Extract_Min gives the copied root a fresh id, so no two live cells share an id', () => {
  for (const s of runExtractMin(example())) {
    const v = s.view.heap;
    expect(new Set(v.ids.slice(0, v.heapSize)).size).toBe(v.heapSize);
  }
});

test('Heap_Decrease_Key(A, 10, 1) on the example swaps up three times and asks yes, yes, yes', () => {
  const steps = runDecreaseKey(example(), 10, 1);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['Heap_Decrease_Key', 0]);
  expect(steps.filter((s) => s.line === 4)).toHaveLength(4);
  expect(answerValues(steps, 'heap.decreaseKey')).toEqual([true, true, true]);
  expect(live(heapOf(steps))).toEqual([1, 2, 3, 9, 5, 4, 8, 12, 11, 6]);
  checkHeapPredictable(steps);
});

test('Heap_Decrease_Key: a key that stays put asks once and answers no', () => {
  const steps = runDecreaseKey(example(), 9, 10);
  expect(answerValues(steps, 'heap.decreaseKey')).toEqual([false]);
  expect(live(heapOf(steps))).toEqual([2, 5, 3, 9, 6, 4, 8, 12, 10, 7]);
  checkHeapPredictable(steps);
});

test('Heap_Decrease_Key with k > A[i] runs to line 2 and leaves the heap as it was', () => {
  const h = example();
  const steps = runDecreaseKey(h, 1, 5);
  expect(steps.map((s) => s.line)).toEqual([0, 1, 2]);
  expect(last(steps).note).toBe('error "new key is larger than current key"');
  expect(heapOf(steps)).toEqual(h);
});

test('Heap_Insert 1 into the example: lines 1–5, the new cell holds ∞ before the call, then it climbs to the root', () => {
  const steps = runInsert(example(), 1);
  assertValidTreeTrace(def, steps);
  expect(steps.slice(0, 6).map((s) => [s.proc, s.line])).toEqual([
    ['Heap_Insert', 0], ['Heap_Insert', 1], ['Heap_Insert', 2], ['Heap_Insert', 3], ['Heap_Insert', 4], ['Heap_Insert', 5],
  ]);
  expect([steps[2].view.heap.A[10], steps[2].view.heap.heapSize]).toEqual([1, 10]); // A[s] = x, still past heap-size
  expect([steps[3].view.heap.A[10], steps[3].view.heap.heapSize]).toEqual([Infinity, 10]);
  expect([steps[4].view.heap.A[10], steps[4].view.heap.heapSize]).toEqual([Infinity, 11]);
  expect(steps[6].proc).toBe('Heap_Decrease_Key');
  expect(answerValues(steps, 'heap.decreaseKey')).toEqual([true, true, true]);
  const h = heapOf(steps);
  expect(live(h)).toEqual([1, 2, 3, 9, 5, 4, 8, 12, 11, 7, 6]);
  expect(isHeap(h)).toBe(true);
  expect(last(steps).ds[0]).toEqual({ kind: 'stack', name: 'Call stack', items: ['Heap_Insert(A, x)', 'Heap_Decrease_Key(A, 11, 1)'] });
  checkHeapPredictable(steps);
});

test('Heap_Insert 20 stays at the bottom (one question, no); into an empty heap it asks nothing', () => {
  const big = runInsert(example(), 20);
  expect(answerValues(big, 'heap.decreaseKey')).toEqual([false]);
  expect(live(heapOf(big))).toEqual([...EXAMPLE, 20]);

  const empty = runInsert(makeHeap([], HEAP_CAPACITY, 0), 4);
  assertValidTreeTrace(def, empty);
  expect(empty.some((s) => s.question)).toBe(false);
  expect(live(heapOf(empty))).toEqual([4]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/heap/updates.test.ts`
Expected: FAIL, unresolved import `./updates`.

- [ ] **Step 3: Implement `updates.ts`**

Create `src/structures/heap/updates.ts`:

```ts
import { keyAt, parent, swapCells, type HeapArray } from '../../engine/heapArray';
import type { HeapStep } from '../types';
import { traceHeapify } from './heapify';
import { HEAP_DECREASE_KEY, HEAP_EXTRACT_MIN, HEAP_INSERT } from './pseudocode';
import { decreaseKeyQuestion } from './questions';
import { createHeapTracer, type HeapTracer } from './tracer';

const show = (n: number) => (n === Infinity ? '∞' : String(n));

export function runExtractMin(h0: HeapArray): HeapStep[] {
  const tr = createHeapTracer(structuredClone(h0));
  const h = tr.heap;
  tr.stack = ['Heap_Extract_Min(A)'];
  tr.emit(HEAP_EXTRACT_MIN, 0, { note: 'Heap_Extract_Min(A)' });
  const n = h.heapSize;
  tr.emit(HEAP_EXTRACT_MIN, 1, { note: n < 1 ? 'A.heap-size < 1.' : `A.heap-size = ${n} ≥ 1.` });
  if (n < 1) {
    tr.emit(HEAP_EXTRACT_MIN, 2, { note: 'error "the heap is empty"' });
    return tr.steps;
  }
  const min = keyAt(h, 1);
  tr.extra = { min };
  tr.emit(HEAP_EXTRACT_MIN, 3, { cells: [1], note: `min = A[1] = ${min}.` });
  h.A[0] = h.A[n - 1];
  h.ids[0] = h.nextId++; // a copy of the object, so a new identity
  tr.emit(HEAP_EXTRACT_MIN, 4, { cells: [1, n], note: `A[1] = A[${n}] = ${h.A[0]}.` });
  h.heapSize = n - 1;
  tr.emit(HEAP_EXTRACT_MIN, 5, { cells: [n], note: `heap-size = ${n - 1}.` });
  tr.emit(HEAP_EXTRACT_MIN, 6, { cells: [1], note: 'Heapify(A, 1).' });
  traceHeapify(tr, 1);
  tr.idx = {};
  tr.emit(HEAP_EXTRACT_MIN, 7, { note: `Returns ${min}.` });
  return tr.steps;
}

// Runs Heap_Decrease_Key(A, start, k) inside tr (the caller has already pushed its stack frame).
export function traceDecreaseKey(tr: HeapTracer, start: number, k: number): void {
  const h = tr.heap;
  let i = start;
  tr.extra = { k };
  tr.idx = { i };
  const current = keyAt(h, i);
  const tooBig = k > current;
  tr.emit(HEAP_DECREASE_KEY, 1, { cells: [i], note: `k = ${k} ${tooBig ? '>' : '≤'} A[i].key = ${show(current)}.` });
  if (tooBig) {
    tr.emit(HEAP_DECREASE_KEY, 2, { cells: [i], note: 'error "new key is larger than current key"' });
    return;
  }
  h.A[i - 1] = k;
  tr.emit(HEAP_DECREASE_KEY, 3, { cells: [i], note: `A[${i}].key = ${k}.` });
  for (;;) {
    const p = parent(i);
    const climb = i > 1 && keyAt(h, i) < keyAt(h, p);
    tr.emit(HEAP_DECREASE_KEY, 4, {
      bigStep: true,
      cells: i > 1 ? [i, p] : [i],
      edges: i > 1 ? [i] : [],
      note: i === 1
        ? 'i = 1, so the loop ends.'
        : `A[${i}] = ${keyAt(h, i)} ${climb ? '<' : '>'} A[Parent(i)] = A[${p}] = ${keyAt(h, p)}.`,
      question: i > 1 ? decreaseKeyQuestion(h, i) : undefined,
    });
    if (!climb) return;
    swapCells(h, i, p);
    tr.emit(HEAP_DECREASE_KEY, 5, { cells: [i, p], edges: [i], note: `Swapped A[${i}] and A[${p}].` });
    i = p;
    tr.idx = { i };
    tr.emit(HEAP_DECREASE_KEY, 6, { cells: [i], note: `i = Parent(i) = ${i}.` });
  }
}

export function runDecreaseKey(h0: HeapArray, i: number, k: number): HeapStep[] {
  const tr = createHeapTracer(structuredClone(h0));
  tr.stack = [`Heap_Decrease_Key(A, ${i}, ${k})`];
  tr.extra = { k };
  tr.idx = { i };
  tr.emit(HEAP_DECREASE_KEY, 0, { cells: [i], note: `Heap_Decrease_Key(A, ${i}, ${k})` });
  traceDecreaseKey(tr, i, k);
  return tr.steps;
}

// Requires heap-size < A.length (the definition's validate blocks a full array).
export function runInsert(h0: HeapArray, x: number): HeapStep[] {
  const tr = createHeapTracer(structuredClone(h0));
  const h = tr.heap;
  tr.stack = ['Heap_Insert(A, x)'];
  tr.extra = { x };
  tr.emit(HEAP_INSERT, 0, { note: `Heap_Insert(A, x) with x.key = ${x}` });
  const s = h.heapSize + 1;
  tr.idx = { s };
  tr.emit(HEAP_INSERT, 1, { cells: [s], note: `s = heap-size + 1 = ${s}.` });
  h.A[s - 1] = x;
  h.ids[s - 1] = h.nextId++; // a copy of x, so a new identity
  tr.emit(HEAP_INSERT, 2, { cells: [s], note: `A[${s}] = x.` });
  h.A[s - 1] = Infinity;
  tr.emit(HEAP_INSERT, 3, { cells: [s], note: `A[${s}].key = ∞.` });
  h.heapSize = s;
  tr.emit(HEAP_INSERT, 4, { cells: [s], edges: s > 1 ? [s] : [], note: `heap-size = ${s}: a valid heap of size ${s}.` });
  tr.emit(HEAP_INSERT, 5, { cells: [s], note: `Heap_Decrease_Key(A, ${s}, ${x}).` });
  tr.stack = [...tr.stack, `Heap_Decrease_Key(A, ${s}, ${x})`];
  traceDecreaseKey(tr, s, x);
  return tr.steps;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/structures/heap && npx tsc --noEmit`
Expected: all PASS (heapify + updates), no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/structures/heap/updates.ts src/structures/heap/updates.test.ts
git commit -m "feat(heap): Heap_Extract_Min, Heap_Decrease_Key and Heap_Insert traces" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The `heap` structure definition (validation, presets, invariants)

**Files:**
- Create: `src/structures/heap/index.ts`, `src/structures/heap/index.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 5, 6.
- Produces: `heap: StructureDef<HeapArray, HeapView>` with id `'heap'`, title `'Binary Heap (min-heap)'`, `procs[0]` = `Build_Heap`, operations `build` (`input: 'array'`, procs `[Build_Heap, Heapify]`, `sample: '9, 4, 7, 1, 3, 8, 2, 6, 5'`), `extract` (`'none'`, `[Heap_Extract_Min, Heapify]`), `decrease` (`'index-key'`, `[Heap_Decrease_Key]`), `insert` (`'key'`, `[Heap_Insert, Heap_Decrease_Key]`); presets `'Example heap (10 keys)'` and `'Full heap (15 keys)'`; `maxNodes: 15`. Args per op: `build` = the array's keys, `extract` = `[]`, `decrease` = `[i, k]`, `insert` = `[k]`.

- [ ] **Step 1: Write the failing tests**

Create `src/structures/heap/index.test.ts`:

```ts
import { mulberry32 } from '../../algorithms/sssp/reference';
import { HEAP_CAPACITY, isHeap, keyAt, makeHeap, type HeapArray } from '../../engine/heapArray';
import { assertValidTreeTrace } from '../testing';
import { heap } from './index';
import { runExtractMin } from './updates';
import { checkHeapPredictable, randomKeys } from './testing';

const live = (h: HeapArray) => h.A.slice(0, h.heapSize) as number[];
const example = () => heap.build(heap.presets[0].keys);
const full = () => heap.build(heap.presets[1].keys);

test('presets are valid heaps in a 15-cell array', () => {
  for (const p of heap.presets) {
    const h = heap.build(p.keys);
    expect(isHeap(h)).toBe(true);
    expect([h.A.length, h.heapSize]).toEqual([HEAP_CAPACITY, p.keys.length]);
  }
  expect(heap.presets[1].keys).toHaveLength(15);
  expect(isHeap(heap.build([]))).toBe(true);
});

test('validate blocks exactly the inputs the spec lists', () => {
  const h = example();
  const dup = (k: number) => [`Key ${k} is already in the heap (keys must be unique).`];
  expect(heap.validate(h, 'insert', [5])).toEqual(dup(5));
  expect(heap.validate(h, 'insert', [100])).toEqual([]);
  expect(heap.validate(full(), 'insert', [100])).toEqual(['The array is full (A.length = 15).']);

  const range = ['Choose an index between 1 and heap-size.'];
  expect(heap.validate(h, 'decrease', [0, 1])).toEqual(range);
  expect(heap.validate(h, 'decrease', [11, 1])).toEqual(range);
  expect(heap.validate(heap.build([]), 'decrease', [1, 1])).toEqual(range);
  expect(heap.validate(h, 'decrease', [10, 5])).toEqual(dup(5)); // 5 lives at A[2]
  expect(heap.validate(h, 'decrease', [10, 7])).toEqual([]); // k = A[i]: nothing changes
  expect(heap.validate(h, 'decrease', [1, 5])).toEqual([]); // k > A[1]: runs to the error line

  expect(heap.validate(heap.build([]), 'extract', [])).toEqual([]); // runs to the error line
  expect(heap.validate(h, 'build', [9, 4, 7])).toEqual([]);
  expect(heap.validate(h, 'build', [1, 2, 1])).toEqual(['Key 1 appears more than once (keys must be unique).']);
  expect(heap.validate(h, 'build', Array.from({ length: 16 }, (_, j) => j))).toEqual([
    'Build_Heap is limited to 15 keys so the heap stays readable.',
  ]);
});

test('a stale cell past heap-size does not count as a live key', () => {
  const after = runExtractMin(makeHeap([5], HEAP_CAPACITY, 1)).at(-1)!.view.heap;
  expect([after.heapSize, after.A[0]]).toEqual([0, 5]);
  expect(heap.validate(after, 'insert', [5])).toEqual([]);
  const again = heap.keep(heap.run(after, 'insert', [5]).at(-1)!.view);
  expect([again.heapSize, again.A[0], isHeap(again)]).toEqual([1, 5, true]);
});

test('run dispatches every operation with a valid trace', () => {
  const h = example();
  const args: Record<string, number[]> = { build: [9, 4, 7], extract: [], decrease: [10, 1], insert: [1] };
  for (const op of heap.operations) {
    expect(heap.validate(h, op.id, args[op.id])).toEqual([]);
    assertValidTreeTrace(heap, heap.run(h, op.id, args[op.id]));
  }
  expect(heap.operations.find((o) => o.id === 'build')!.sample).toBe('9, 4, 7, 1, 3, 8, 2, 6, 5');
  expect(heap.procs[0].name).toBe('Build_Heap');
});

test('view and keep: setup draws the state; keeping adopts the last step', () => {
  const h = example();
  expect(heap.view(h, null)).toEqual({ kind: 'heap', heap: h, highlight: { cells: [], edges: [] }, tags: {} });
  const steps = heap.run(h, 'extract', []);
  expect(heap.keep(steps.at(-1)!.view).heapSize).toBe(9);
});

test('random operation sequences keep a valid heap with unique live ids and predictable questions', () => {
  const rand = mulberry32(7);
  let h = example();
  let model = new Set<number>(live(h));
  for (let n = 0; n < 300; n++) {
    const pick = rand();
    let op: string;
    let args: number[];
    if (pick < 0.4) {
      op = 'insert';
      args = [Math.floor(rand() * 40) - 5];
    } else if (pick < 0.65) {
      op = 'extract';
      args = [];
    } else if (pick < 0.95) {
      op = 'decrease';
      args = [1 + Math.floor(rand() * Math.max(h.heapSize, 1)), Math.floor(rand() * 40) - 20];
    } else {
      op = 'build';
      args = randomKeys(rand, 1 + Math.floor(rand() * 15));
    }
    if (heap.validate(h, op, args).length > 0) continue;

    const before = structuredClone(h);
    const steps = heap.run(h, op, args);
    expect(h).toEqual(before); // operations never mutate the page's heap
    assertValidTreeTrace(heap, steps);
    checkHeapPredictable(steps);
    for (const s of steps) {
      const v = s.view.heap;
      expect(new Set(v.ids.slice(0, v.heapSize)).size).toBe(v.heapSize);
    }

    if (op === 'insert') model.add(args[0]);
    else if (op === 'extract' && model.size > 0) {
      const min = Math.min(...model);
      expect(steps.at(-1)!.vars.min).toBe(min);
      model.delete(min);
    } else if (op === 'decrease') {
      const old = keyAt(h, args[0]);
      if (args[1] <= old) {
        model.delete(old);
        model.add(args[1]);
      }
    } else if (op === 'build') model = new Set(args);

    h = heap.keep(steps.at(-1)!.view);
    expect(isHeap(h)).toBe(true);
    expect(live(h).sort((a, b) => a - b)).toEqual([...model].sort((a, b) => a - b));
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/heap/index.test.ts`
Expected: FAIL, unresolved import `./index`.

- [ ] **Step 3: Implement `index.ts`**

Create `src/structures/heap/index.ts`:

```ts
import { HEAP_CAPACITY, keyAt, makeHeap, type HeapArray } from '../../engine/heapArray';
import type { HeapView, StructureDef } from '../types';
import { runBuildHeap } from './heapify';
import { BUILD_HEAP, HEAP_DECREASE_KEY, HEAP_EXTRACT_MIN, HEAP_INSERT, HEAPIFY, heapProcs } from './pseudocode';
import { HEAP_QUESTION_TYPES } from './questions';
import { runDecreaseKey, runExtractMin, runInsert } from './updates';

const live = (h: HeapArray) => h.A.slice(0, h.heapSize);
const duplicate = (k: number) => `Key ${k} is already in the heap (keys must be unique).`;

function validate(h: HeapArray, op: string, args: number[]): string[] {
  switch (op) {
    case 'build': {
      if (args.length > HEAP_CAPACITY) return [`Build_Heap is limited to ${HEAP_CAPACITY} keys so the heap stays readable.`];
      const twice = args.find((k, j) => args.indexOf(k) !== j);
      return twice === undefined ? [] : [`Key ${twice} appears more than once (keys must be unique).`];
    }
    case 'insert': {
      if (live(h).includes(args[0])) return [duplicate(args[0])];
      return h.heapSize >= h.A.length ? [`The array is full (A.length = ${h.A.length}).`] : [];
    }
    case 'decrease': {
      const [i, k] = args;
      if (i < 1 || i > h.heapSize) return ['Choose an index between 1 and heap-size.'];
      // k > A[i] only runs to the error line; otherwise k must not duplicate another live key.
      const others = live(h).filter((_, j) => j !== i - 1);
      return k <= keyAt(h, i) && others.includes(k) ? [duplicate(k)] : [];
    }
    default:
      return []; // Extract Min on an empty heap runs to the lecture's error line
  }
}

export const heap: StructureDef<HeapArray, HeapView> = {
  id: 'heap',
  title: 'Binary Heap (min-heap)',
  procs: heapProcs,
  operations: [
    { id: 'build', label: 'Build Heap', input: 'array', procs: [BUILD_HEAP, HEAPIFY], sample: '9, 4, 7, 1, 3, 8, 2, 6, 5' },
    { id: 'extract', label: 'Extract Min', input: 'none', procs: [HEAP_EXTRACT_MIN, HEAPIFY] },
    { id: 'decrease', label: 'Decrease Key', input: 'index-key', procs: [HEAP_DECREASE_KEY] },
    { id: 'insert', label: 'Insert', input: 'key', procs: [HEAP_INSERT, HEAP_DECREASE_KEY] },
  ],
  questionTypes: HEAP_QUESTION_TYPES,
  presets: [
    { name: 'Example heap (10 keys)', keys: [2, 5, 3, 9, 6, 4, 8, 12, 11, 7] },
    { name: 'Full heap (15 keys)', keys: [1, 3, 2, 6, 4, 5, 7, 10, 8, 9, 12, 11, 15, 13, 14] },
  ],
  maxNodes: HEAP_CAPACITY,
  // Preset keys are already in heap order; the array has room for 15 cells.
  build: (keys) => makeHeap(keys, HEAP_CAPACITY, keys.length),
  view: (h) => ({ kind: 'heap', heap: h, highlight: { cells: [], edges: [] }, tags: {} }),
  keep: (v) => v.heap,
  validate,
  run(h, op, args) {
    switch (op) {
      case 'build': return runBuildHeap(args);
      case 'extract': return runExtractMin(h);
      case 'decrease': return runDecreaseKey(h, args[0], args[1]);
      case 'insert': return runInsert(h, args[0]);
      default: throw new Error(`Unknown heap operation ${op}`);
    }
  },
};
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/structures && npx tsc --noEmit`
Expected: all PASS, no type errors. If the random test fails, the failing assertion names the broken invariant: fix the trace code in Tasks 5–6, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/structures/heap/index.ts src/structures/heap/index.test.ts
git commit -m "feat(heap): the heap structure definition with validation and presets" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `StructurePage` for any structure; register the heap; route and home

**Files:**
- Modify (rewrite): `src/ui/StructurePage.tsx`
- Modify: `src/structures/registry.ts`, `src/App.test.tsx`
- Create: `src/ui/HeapPage.test.tsx`

**Interfaces:**
- Consumes: everything above. `Player` (existing) is generic over the step type.
- Produces: `StructurePage<S, V extends StructureView>({ def: StructureDef<S, V> })`; the heap at `#/heap`. Operation-bar labels (tests rely on them): `Operation`, `Preset`, `Key` (inputs `key`, `node`), `Array A` (input `array`), `Index i` and `New key k` (input `index-key`); buttons `Run`, `Back to the tree`, `Done: keep result`, `Reset to preset`, `Clear`.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/HeapPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { heap } from '../structures/heap';
import { StructurePage } from './StructurePage';

beforeEach(() => window.localStorage.clear());

// Keys of the tree nodes in index order.
const treeKeys = (c: HTMLElement) => [...c.querySelectorAll('.tnode .key')].map((e) => e.textContent);
const marker = (c: HTMLElement) => c.querySelector('.marker-label');

async function runToEnd() {
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
}

test('Extract Min, keep the result: the minimum is gone, heap-size drops, focus returns to Run', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'extract');
  await runToEnd();
  expect(screen.getByText('Returns 2.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual(['3', '5', '4', '9', '6', '7', '8', '12', '11']);
  expect(marker(container)).toHaveTextContent('heap-size = 9');
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();
});

test('after Extract Min, Insert works on the kept heap and reuses the stale cell', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'extract');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual(['1', '3', '4', '9', '5', '7', '8', '12', '11', '6']);
  expect(marker(container)).toHaveTextContent('heap-size = 10');
});

test('Build Heap builds from the typed array, not from the heap on screen; A.length becomes its length', async () => {
  const { container } = render(<StructurePage def={heap} />);
  expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled(); // the sample array is prefilled
  const input = screen.getByLabelText('Array A');
  await userEvent.clear(input);
  await userEvent.type(input, '5, 3, 1');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual(['1', '3', '5']);
  expect(container.querySelectorAll('.heap-array .cell')).toHaveLength(3);
  expect(marker(container)).toHaveTextContent('heap-size = 3');
});

test('Decrease Key takes an index and a new key', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'decrease');
  await userEvent.type(screen.getByLabelText('Index i'), '10');
  await userEvent.type(screen.getByLabelText('New key k'), '1');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual(['1', '2', '3', '9', '5', '4', '8', '12', '11', '6']);
});

test('Back to the tree discards the run', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'extract');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Back to the tree' }));
  expect(marker(container)).toHaveTextContent('heap-size = 10');
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();
});

test('Clear then Extract Min runs to the error line and keeps the empty heap', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByText('heap-size = 0 (empty heap)')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'extract');
  await runToEnd();
  expect(screen.getByText('error "the heap is empty"')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual([]);
  expect(marker(container)).toHaveTextContent('heap-size = 0');
});

test('blocked inputs show the spec messages and do not run', async () => {
  render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Key 5 is already in the heap (keys must be unique).');

  await userEvent.selectOptions(screen.getByLabelText('Preset'), 'Full heap (15 keys)');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '100');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('The array is full (A.length = 15).');

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'decrease');
  await userEvent.type(screen.getByLabelText('Index i'), '16');
  await userEvent.type(screen.getByLabelText('New key k'), '0');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose an index between 1 and heap-size.');
  expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
});

test('Run is disabled until every input parses: array text, index and key', async () => {
  render(<StructurePage def={heap} />);
  const run = screen.getByRole('button', { name: 'Run' });
  const array = screen.getByLabelText('Array A');
  for (const text of ['', ',,', '1, x', '1.5']) {
    await userEvent.clear(array);
    if (text) await userEvent.type(array, text);
    expect(run).toBeDisabled();
  }
  await userEvent.clear(array);
  await userEvent.type(array, ' -3 ,  8  4 ');
  expect(run).toBeEnabled();

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'decrease');
  expect(run).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Index i'), '2');
  expect(run).toBeDisabled();
  await userEvent.type(screen.getByLabelText('New key k'), '1');
  expect(run).toBeEnabled();
});
```

In `src/App.test.tsx`, after the existing test `#/bst opens the BST page with the lecture tree` (use the same `render`/`beforeEach` conventions as that test), add:

```tsx
test('home lists the heap under tree structures', () => {
  window.location.hash = '';
  render(<App />);
  expect(screen.getByRole('link', { name: /Binary Heap/ })).toHaveAttribute('href', '#/heap');
});

test('#/heap opens the heap page with the example heap', () => {
  window.location.hash = '#/heap';
  const { container } = render(<App />);
  expect(screen.getByRole('heading', { name: 'Binary Heap (min-heap)' })).toBeInTheDocument();
  expect(container.querySelectorAll('.tnode')).toHaveLength(10);
  expect(container.querySelector('.marker-label')).toHaveTextContent('heap-size = 10');
});
```

(Before adding, read the two existing home/BST tests in `src/App.test.tsx` and copy their exact setup lines for `render` and the hash, so the new tests match.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/HeapPage.test.tsx src/App.test.tsx`
Expected: FAIL (`StructurePage` has no `Array A` input; `#/heap` is not registered).

- [ ] **Step 3: Rewrite `src/ui/StructurePage.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { StructureDef, StructureStep, StructureView } from '../structures/types';
import { nodeOptions } from '../structures/views';
import { DSPanel } from './DSPanel';
import { Player } from './Player';
import { PseudocodePanel } from './PseudocodePanel';
import { useSettings } from './settings';
import { StatePanel } from './StatePanel';
import { StructureCanvas } from './StructureCanvas';

const parseKey = (text: string): number | null => (/^-?\d+$/.test(text.trim()) ? Number(text.trim()) : null);
// "9, 4 7" → [9, 4, 7]; null when empty or when any item is not an integer.
const parseList = (text: string): number[] | null => {
  const nums = text.split(/[,\s]+/).filter((p) => p !== '').map(parseKey);
  return nums.length > 0 && nums.every((n) => n !== null) ? (nums as number[]) : null;
};

export function StructurePage<S, V extends StructureView>({ def }: { def: StructureDef<S, V> }) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [state, setState] = useState<S>(() => def.build(def.presets[0].keys));
  const [opId, setOpId] = useState(def.operations[0].id);
  const [keyText, setKeyText] = useState('');
  const [indexText, setIndexText] = useState('');
  const [arrayText, setArrayText] = useState(() => def.operations.find((o) => o.input === 'array')?.sample ?? '');
  const [steps, setSteps] = useState<StructureStep<V>[] | null>(null);
  const [runId, setRunId] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [settings, setSettings] = useSettings();
  // Keep/Back both return the page to setup state, unmounting the button the
  // student clicked, so focus would fall to <body>. Send it to Run instead.
  const runRef = useRef<HTMLButtonElement>(null);
  const focusRunRef = useRef(false);
  useEffect(() => {
    if (steps === null && focusRunRef.current) {
      focusRunRef.current = false;
      runRef.current?.focus();
    }
  }, [steps]);

  const op = def.operations.find((o) => o.id === opId)!;
  const procs = op.procs.map((name) => def.procs.find((p) => p.name === name)!);
  const key = parseKey(keyText);
  const index = parseKey(indexText);
  const list = parseList(arrayText);
  // What the operation bar has parsed so far; null while any needed field is empty or invalid.
  const args: number[] | null =
    op.input === 'none' ? []
      : op.input === 'array' ? list
        : op.input === 'index-key' ? (index !== null && key !== null ? [index, key] : null)
          : key === null ? null : [key];

  const loadPreset = (i: number) => {
    setPresetIndex(i);
    setState(def.build(def.presets[i].keys));
    setErrors([]);
  };
  const run = () => {
    const e = def.validate(state, op.id, args!);
    setErrors(e);
    if (e.length > 0) return;
    setSteps(def.run(state, op.id, args!));
    setRunId((r) => r + 1);
  };
  const keep = () => {
    setState(def.keep(steps![steps!.length - 1].view));
    setSteps(null);
    focusRunRef.current = true;
  };
  const backToTree = () => {
    setSteps(null);
    focusRunRef.current = true;
  };
  const busy = steps !== null;

  return (
    <div className="algo-page">
      <header className="page-header">
        <a href="#/">← All topics</a>
        <h1>{def.title}</h1>
      </header>
      <div className="toolbar">
        <label>
          Preset
          <select value={presetIndex} disabled={busy} onChange={(e) => loadPreset(Number(e.target.value))}>
            {def.presets.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy} onClick={() => loadPreset(presetIndex)}>Reset to preset</button>
        <button type="button" disabled={busy} onClick={() => { setState(def.build([])); setErrors([]); }}>Clear</button>
        <label>
          Operation
          <select value={opId} disabled={busy} onChange={(e) => { setOpId(e.target.value); setErrors([]); }}>
            {def.operations.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        {op.input === 'array' && (
          <label>
            Array A
            <input
              className="array-input"
              value={arrayText}
              disabled={busy}
              aria-invalid={arrayText.trim() !== '' && list === null}
              onChange={(e) => setArrayText(e.target.value)}
            />
          </label>
        )}
        {op.input === 'index-key' && (
          <label>
            Index i
            <input
              className="key-input"
              value={indexText}
              inputMode="numeric"
              disabled={busy}
              aria-invalid={indexText.trim() !== '' && index === null}
              onChange={(e) => setIndexText(e.target.value)}
            />
          </label>
        )}
        {(op.input === 'key' || op.input === 'node' || op.input === 'index-key') && (
          <label>
            {op.input === 'index-key' ? 'New key k' : 'Key'}
            <input
              className="key-input"
              value={keyText}
              inputMode="numeric"
              disabled={busy}
              aria-invalid={keyText.trim() !== '' && key === null}
              onChange={(e) => setKeyText(e.target.value)}
            />
          </label>
        )}
        {steps === null ? (
          <button type="button" ref={runRef} className="primary" disabled={args === null} onClick={run}>Run</button>
        ) : (
          <button type="button" onClick={backToTree}>Back to the tree</button>
        )}
      </div>
      {errors.map((m) => <p key={m} role="alert" className="feedback bad">{m}</p>)}
      {steps === null ? (
        <div className="layout">
          <div className="main-col">
            <StructureCanvas
              view={def.view(state, op.input === 'node' ? key : null)}
              onNodeClick={op.input === 'node' && def.nodeKey
                ? (id) => { const k = def.nodeKey!(state, id); if (k !== null) setKeyText(String(k)); }
                : undefined}
            />
            {op.input === 'node' && <p className="muted hint">Click a node or type its key.</p>}
            {op.input === 'array' && <p className="muted hint">Build_Heap starts from this array, not from the heap shown.</p>}
          </div>
          <div className="side-col">
            <PseudocodePanel procs={procs} />
          </div>
        </div>
      ) : (
        <Player
          key={runId}
          steps={steps}
          procs={procs}
          questionTypes={def.questionTypes}
          settings={settings}
          onSettingsChange={setSettings}
          nodes={(s) => nodeOptions(s.view)}
          main={(s, pick) => <StructureCanvas view={s.view} onNodeClick={pick} />}
          below={(s) => <DSPanel ds={s.ds} />}
          side={(s) => <StatePanel columns={[]} vertices={[]} step={s} />}
          end={<button type="button" className="primary keep-result" onClick={keep}>Done: keep result</button>}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Register the heap**

Replace `src/structures/registry.ts`:

```ts
import { bst } from './bst';
import { heap } from './heap';
import type { AnyStructure } from './types';

export const STRUCTURES: AnyStructure[] = [bst, heap];
```

- [ ] **Step 5: Run the whole suite and the typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; everything PASSES, including the unchanged BST page tests (`src/ui/StructurePage.test.tsx`) and the new heap page and App tests. A BST failure here means the rewrite changed BST behaviour: fix `StructurePage`, not the BST tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/StructurePage.tsx src/ui/HeapPage.test.tsx src/structures/registry.ts src/App.test.tsx
git commit -m "feat(ui): heap page: StructurePage over any structure, array and index-key inputs, #/heap route" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: End-to-end tests, build check and docs

**Files:**
- Create: `e2e/heap.spec.ts`
- Modify: `docs/superpowers/specs/2026-09-28-tree-structures-design.md`, `docs/superpowers/plans/tree-followups.md`

- [ ] **Step 1: Write the Playwright tests**

Create `e2e/heap.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('Heap: Extract Min with a predict answer, keep, then Insert', async ({ page }) => {
  await page.goto('/#/heap');
  await expect(page.getByRole('heading', { name: 'Binary Heap (min-heap)' })).toBeVisible();
  await page.getByLabel('Operation').selectOption('extract');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  const dialog = page.getByRole('dialog', { name: 'Predict the next step' });
  await dialog.getByRole('button', { name: '3', exact: true }).click(); // smallest of A[1]=7, A[2]=5, A[3]=3
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('.note')).toContainText('Returns 2.');
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.marker-label')).toHaveText('heap-size = 9');

  await page.getByLabel('Operation').selectOption('insert');
  await page.getByLabel('Key').fill('1');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode .key').first()).toHaveText('1');
  await expect(page.locator('.marker-label')).toHaveText('heap-size = 10');
});

test('Heap: Build Heap from a typed array', async ({ page }) => {
  await page.goto('/#/heap');
  await page.getByLabel('Array A').fill('5, 3, 1');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode .key')).toHaveText(['1', '3', '5']);
  await expect(page.locator('.heap-array .cell')).toHaveCount(3);
});

test('Heap page: no horizontal scroll at phone width, before and after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/heap');
  await page.getByRole('combobox', { name: 'Preset' }).selectOption({ label: 'Full heap (15 keys)' });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.getByLabel('Operation').selectOption('extract');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await overflow()).toBe(false);
});
```

- [ ] **Step 2: Run build, unit tests and e2e**

Run: `npm run build && npx vitest run && npx playwright test`
Expected: build succeeds (`tsc --noEmit` then `vite build`); all unit tests PASS; all Playwright tests PASS (graph pages, BST, heap). If the first Playwright test fails at the dialog, check the question step: for the example heap the first `Next big step` after Run must land on `Heapify` line 1 of the call `Heapify(A, 1)`.

- [ ] **Step 3: Update the spec**

In `docs/superpowers/specs/2026-09-28-tree-structures-design.md`:

1. §3, replace the heap bullet
`- **Heap:** \`HeapArray = { A: number[]; heapSize: number }\` (1-based in the display). …`
so it reads
`- **Heap:** \`HeapArray = { A: (number | null)[]; ids: number[]; heapSize: number; nextId: number }\` (1-based in the display; \`ids\` give each cell a stable identity so swaps animate). The tree view is derived from indices: \`Left(i) = 2i\`, \`Right(i) = 2i + 1\`, \`Parent(i) = ⌊i/2⌋\`.`
2. §4 Binary heap, replace the Heapify bullet with
`- **Heapify (slide 46)**: once per call that has a left child inside the heap (\`Left(i) ≤ heap-size\`): "which of A[i], A[Left(i)], A[Right(i)] is smallest?" (node answer by clicking a node or array cell; only cells up to heap-size are candidates). A leaf call has a forced answer and asks nothing.`
3. §2 Setup state, after the Build Heap bullet add
`- Presets and Clear give \`A.length = 15\`; Build Heap on a typed array of n keys gives \`A.length = n\`, so a later Insert is blocked ("the array is full") until an Extract Min frees a cell.`

- [ ] **Step 4: Update the follow-ups note**

Replace the whole of `docs/superpowers/plans/tree-followups.md` with:

```markdown
# Follow-ups for the tree track

## Conventions established in tree plan 1 (BST)

- Every tree operation starts with a call step: `line: 0` of the main procedure; PseudocodePanel highlights the signature. `assertValidTreeTrace` allows line 0 only at step 0.
- `TreeNode` has no `middle` yet; plan 3 (2-3 tree) adds it and a 2-3 layout (all leaves on one level, internal nodes centred over children).
- Node answers use `{ kind: 'node', value: id | null, label, nil }`; Player builds them from clicks via its `nodes(step)` prop.
- Operations never mutate the page's structure; "Done: keep result" adopts the last step's view.

## Conventions established in tree plan 2 (binary heap)

- `StructureDef<S, V>` is generic over the state and the view; `view(s, selectedKey)`, `keep(view)` and optional `nodeKey` replace direct `Tree` access. `StructureView = TreeView | HeapView`, discriminated on `kind`; plan 3 adds a third view and a `StructureCanvas` branch. `validate` and `run` take `args: number[]` (`[]`, `[key]`, `[index, key]` or an array's keys, per `Operation.input`).
- Pointer variables are drawn as tags: `TreeView.tags` maps a name to a node id (plan 1), `HeapView.tags` maps a name to an array index (drawn beside the node and under the cell). `T.root` is a tag while `tr.showRoot` is set (Tree_Insert); the heap pseudocode has no `T.root`. Plan 3's `2_3_Insert` and friends use `T.root`: set `showRoot` there too.
- Copies (`A[1] = A[heap-size]`, `A[s] = x`) get a fresh cell id; swaps move ids with keys. Live ids stay unique, so canvases can key nodes by id and transitions animate swaps.
- Leaf Heapify calls ask nothing (forced answer). Apply the same rule to any plan-3 question whose answer is forced.
- `A.length` is 15 for presets and Clear, and `n` after Build Heap; Insert is blocked when the array is full.

## Plan 3 (2-3 tree)

- Sentinel leaves (−∞, +∞) must never be offered as node answers or accepted as keys.
- `nodeOptions(view)` (in `structures/views.ts`) must learn the 2-3 view; leaves only for leaf answers.
```

- [ ] **Step 5: Final check and commit**

Run: `npm run build && npx vitest run`
Expected: PASS.

```bash
git add e2e/heap.spec.ts docs/superpowers/specs/2026-09-28-tree-structures-design.md docs/superpowers/plans/tree-followups.md
git commit -m "test: heap page end to end; docs for tree plan 2" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage** (spec §3, §4 heap, §5 heap rows, §6, §7, §8 plan 2):
- `HeapArray`, macros, derived tree, fixed index layout, array strip, heap-size marker, greyed cells, index labels, pointer tags beside nodes: Tasks 1, 4.
- Four operations with verbatim pseudocode, call steps, questions (Heapify node answer, Decrease Key yes/no, Insert via Decrease Key, Extract Min via Heapify, Build Heap big steps): Tasks 5, 6.
- Errors table, heap rows: empty-heap Extract Min runs to line 2; Decrease Key `k > A[i]` runs to line 2; index range, array full, non-integer or empty input disabling Run: Tasks 7, 8 (node limit is the array-full message).
- Build Heap on an editable array: Tasks 7, 8. Done: keep result / Back / Clear / presets: Task 8.
- Movement by id and reduced motion: ids in Tasks 1, 4, 6 (existing `.tnode` transition and media query).
- Testing: per-procedure unit tests with hand-checked results, seeded random invariants, predictability, page tests, Playwright, 375px: Tasks 5–9.
- Tree-followups: generalise `StructureDef`/`TreeStep` (Task 2), `T.root` tag (Task 3), array strip and heap-size marker (Task 4), Build Heap array (Tasks 7, 8).

**Placeholders:** none; every code step has full code. Task 8 asks the executor to read two existing `App.test.tsx` tests to copy their setup lines; that is deliberate because their exact `render` helpers were not reproduced here.

**Type consistency:** `makeHeap(keys, length, heapSize)`, `cellId`, `keyAt`, `swapCells`, `HeapStep`, `traceHeapify(tr, start)`, `traceDecreaseKey(tr, start, k)`, `HeapTracer.idx/extra/stack/emit`, `heapProcs`, constants `BUILD_HEAP…HEAP_INSERT`, `StructureDef<S, V>` members, `nodeOptions`, `StructureCanvas`, label strings (`Array A`, `Index i`, `New key k`, `Key`) are used identically in every task that mentions them.

**Review Focus coverage:** 1 → Task 6 (one-key and empty Extract Min, tags empty on the final step) and Task 8 (Clear then Extract Min, keep). 2 → Tasks 5 (one key, negatives, random), 7 (duplicates, 16 keys), 8 (invalid array text, odd spacing). 3 → Tasks 6, 7. 4 → Tasks 4 (stale cell not clickable), 7 (stale key not live), 8 (Insert after Extract Min). 5 → Tasks 7, 8 (blocked messages), 9 (375px).
