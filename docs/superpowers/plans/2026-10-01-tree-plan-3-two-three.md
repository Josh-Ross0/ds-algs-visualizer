# Tree Plan 3: 2-3 Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 2-3 tree page (`#/two-three`): `2_3_Search`, `2_3_Minimum`, `2_3_Successor`, `2_3_Insert` (with `Insert_And_Split`, `Set_Children`, `Update_Key`), `2_3_Delete` (with `Borrow_Or_Merge`) and `2_3_Init`, each stepped line by line with the lecture pseudocode, sentinel leaves, predict questions, and a 2-3 drawing (leaves as boxes on one level, internal nodes centred over their children).

**Architecture:**
- The 2-3 tree reuses the pointer `Tree` model (`TreeNode` gains `middle?` and `leaf?`) and the existing `createTreeTracer`, which becomes a small factory that stamps a view `kind`. A third view, `TwoThreeView` (`kind: 'two-three'`), is added to `StructureView`; `StructurePage`, `Player` and the definition contract from plans 1–2 are unchanged.
- Operations are pure functions that mirror the slide pseudocode line by line. Procedures that call other procedures (`Insert_And_Split` → `Set_Children` → `Update_Key`, `Borrow_Or_Merge`) run in their own variable frame and call-stack frame via one helper, `inFrame`.
- `TwoThreeCanvas` draws from child pointers (not `p`), so the half-finished states between lecture lines (a stale second parent, a node already deleted, a new node not yet linked) draw without crashing.

**Tech Stack:** React 19, TypeScript 5.9.3 (pinned), Vite 8, Vitest + Testing Library (jsdom), Playwright (chromium).

**Spec:** `docs/superpowers/specs/2026-09-28-tree-structures-design.md` (§3 model and views, §4 2-3 tree steps and questions, §5 errors, §6 architecture, §8 delivery plan 3). Conventions from `docs/superpowers/plans/tree-followups.md`; builds on tree plans 1 and 2 (`2026-09-28-tree-plan-1-bst.md`, `2026-10-01-tree-plan-2-heap.md`).

## Global Constraints

- **Verbatim pseudocode** from the rendered slides of `Lectures/efficient-ds.pdf`, with underscores and slide line numbers (names checked against slide images 18, 31, 34): `2_3_Init(T)` (slide 21, 9 lines), `2_3_Search(x, k)` (slide 22, 9), `2_3_Minimum(T)` (slide 23, 7), `2_3_Successor(x)` (slide 24, 12), `Update_Key(x)` (slide 26, 5), `Set_Children(x, ℓ, m, r)` (slide 27, 7), `Insert_And_Split(x, z)` (slides 29–30, 21), `2_3_Insert(T, z)` (slides 31–32, 16), `Borrow_Or_Merge(y)` (slides 34–36, 28; line 20 is the comment `▷ y == z.right`), `2_3_Delete(T, x)` (slides 37–38, 18).
- **Steps.** Each executed line emits exactly one step showing the state after that line; snapshots are `structuredClone` copies. Every operation starts with a call step (`line: 0` of its main procedure); `assertValidTreeTrace` allows line 0 only at step 0. A bare `else` line that has no statement of its own (`2_3_Delete` line 12) is emitted, as `Tree_Insert` line 3 is in plan 1; a pure comment line (`Borrow_Or_Merge` line 20) is never emitted.
- **Questions.** A question on step `i` is shown over step `i − 1`, whose note must not reveal the answer. Every trace test calls `checkTwoThreePredictable` (built on `assertQuestionsPredictable`). A question whose answer is forced is not asked.
- **Sentinels.** The leaves with keys `−∞` and `+∞` are ordinary leaves in the model. They are never offered as node answers, never clickable, and never accepted as keys (keys are typed integers).
- **Keys.** Integers only, unique. At most 12 leaves, sentinels excluded.
- **Styling.** The yellow highlighter is reserved for the current pseudocode line. Node and edge highlights use the marker blue and the active dashed edge. Movement uses the existing `.tnode` CSS transition (disabled under `prefers-reduced-motion`).
- **No React in logic.** `engine/` and `structures/**` must not import React.
- **No layout regressions.** No horizontal scroll at 375px. The graph pages, BST and heap pages behave exactly as before; their existing tests pass (only the type edits listed in Task 2 touch shared files).
- **Typecheck.** Use only `npx tsc --noEmit`. Plain `tsc` or `tsc -b` emit `.js` files into `src/`.
- **Commits.** Conventional subjects (`feat(two-three): …`) and end every commit message with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (second `-m`).

### Decisions this plan makes where the spec is silent or too coarse

- **`Init` is an operation.** Spec §4 says `2_3_Init` is "stepped through line by line", but the §2 table lists only five operations. The page gets a sixth operation, `Init` (no input), that runs `2_3_Init` and, on "Done: keep result", leaves an empty tree. It is listed last so Search stays the default.
- **Internal keys are `NaN` while NIL.** A node created by `new internal node y` has "DS attributes initialized to NIL". The model stores that as `key: NaN`; the tracer shows it as `NIL` in the variables line and the canvas draws an empty circle.
- **`+∞` / `−∞` display.** Leaves show `+∞` and `−∞` (`fmtKey`); `formatValue` learns `−∞` for the variables line.
- **Preset order.** The slide 18 tree (with the two sentinels added to the first and last leaf group) is reproduced by inserting `[4, 5, 1, 14, 19, 7, 22, 25, 29]` in that order (found by exhaustive search against a reference implementation of the slide code); `build(keys)` runs the traced `2_3_Insert` and keeps only the final tree, so there is one implementation of insert.
- **Single call-line step.** A line that calls a procedure emits one step before the callee's steps (as in plans 1–2); the caller's variable that receives the result is updated for the caller's next step.
- **Message wording.** Delete/Successor of an absent key uses the spec's `No node with key k.`

## Review Focus

1. **Delete cascades.** Borrow from the right sibling, from the left sibling, merge, a merge that cascades up and collapses the root (height shrinks), and deleting back down to only the two sentinels. Tests: Task 6.
2. **Insert at the extremes.** Splits in each of the four `Insert_And_Split` branches, a split that cascades to a new root (height grows), a key below the smallest real key (next to `−∞`), above the largest (next to `+∞`), and the first key into an empty tree. Tests: Task 5.
3. **Sentinel handling.** Minimum on an empty tree runs to line 7's error; Successor of the largest key returns NIL; sentinels never appear in node answers and cannot be clicked or typed. Tests: Tasks 2, 4, 8.
4. **Half-finished states.** Between lecture lines a node can have two parents, point at a deleted node, or be unlinked. Every step of every operation must lay out with finite coordinates and the drawing must not throw. Tests: Tasks 1, 2, 7.
5. **Limits and input.** 12 leaves block Insert; duplicates, absent keys, negative keys and `0` behave; the 12-leaf tree and its widest mid-operation state cause no horizontal scroll at 375px. Tests: Tasks 7, 8.

## File Structure

Create:
- `src/engine/twoThree.ts`, `src/engine/twoThree.test.ts`: node constructors, `fmtKey`, helpers, `initTree`, `isTwoThree`, `twoThreeLayout`.
- `src/structures/two-three/testing.ts`: `fromShape`, `shapeOf`, `SLIDE_18` (test helpers).
- `src/structures/two-three/pseudocode.ts`: the ten procedures.
- `src/structures/two-three/questions.ts`: question builders and `TWO_THREE_QUESTION_TYPES`.
- `src/structures/two-three/primitives.ts`, `primitives.test.ts`: `inFrame`, `lab`, `traceUpdateKey`, `traceSetChildren`, `callSetChildren`.
- `src/structures/two-three/init.ts`, `init.test.ts`: `runInit`.
- `src/structures/two-three/queries.ts`, `queries.test.ts`: `runSearch`, `runMinimum`, `runSuccessor`.
- `src/structures/two-three/predictable.ts`: `checkTwoThreePredictable`.
- `src/structures/two-three/insert.ts`, `insert.test.ts`: `traceInsertAndSplit`, `runInsert`.
- `src/structures/two-three/delete.ts`, `delete.test.ts`: `traceBorrowOrMerge`, `runDelete`.
- `src/structures/two-three/index.ts`, `index.test.ts`: the `twoThree` `StructureDef`.
- `src/structures/tracer.test.ts`.
- `src/ui/TwoThreeCanvas.tsx`, `src/ui/TwoThreeCanvas.test.tsx`, `src/ui/TwoThreePage.test.tsx`, `e2e/two-three.spec.ts`.

Modify:
- `src/engine/tree.ts` (node fields), `src/engine/trace.ts` (`formatValue`), `src/structures/types.ts`, `src/structures/tracer.ts`, `src/structures/views.ts`, `src/structures/views.test.ts`, `src/ui/StructureCanvas.tsx`, `src/styles.css`, `src/structures/registry.ts`, `src/App.test.tsx`.
- `docs/superpowers/specs/2026-09-28-tree-structures-design.md`, `docs/superpowers/plans/tree-followups.md`.

---

### Task 1: 2-3 node model, invariants, layout, shape helpers

**Files:**
- Modify: `src/engine/tree.ts`, `src/engine/trace.ts`
- Create: `src/engine/twoThree.ts`, `src/engine/twoThree.test.ts`, `src/structures/two-three/testing.ts`

**Interfaces:**
- Consumes: `Tree`, `TreeNode`, `NodeId`, `Pos`, `emptyTree`, `TREE_SPACING`, `TREE_LEVEL`, `TREE_PAD` from `src/engine/tree.ts`.
- Produces (later tasks rely on these exact names):
  - `TreeNode` gains `middle?: NodeId | null` and `leaf?: boolean` (BST nodes leave both unset).
  - `fmtKey(k: number): string`: `NaN → 'NIL'`, `+∞ → '+∞'`, `−∞ → '−∞'`, else `String(k)`.
  - `newLeaf(t, key = NaN): NodeId`, `newInternal(t): NodeId` (key `NaN`, all pointers `null`).
  - `isLeaf(t, id): boolean`, `kids(t, id): NodeId[]` (left, middle, right in order, skipping NIL and deleted nodes), `leavesOf(t): NodeId[]` (left to right from the root), `realLeaves(t): NodeId[]` (finite keys only), `findLeaf(t, k): NodeId | null` (real leaves only), `realKeys(t): number[]`.
  - `initTree(): Tree` (ids: internal root `n1`, leaves `n2` = −∞, `n3` = +∞).
  - `isTwoThree(t): boolean`.
  - `twoThreeLayout(t): { pos: Record<NodeId, Pos>; width: number; height: number }`.
  - Test helpers: `type Shape = number | Shape[]`, `fromShape(shape: Shape): Tree`, `shapeOf(t): string`, `SLIDE_18: Shape`.

- [ ] **Step 1: Write the failing tests**

Create `src/structures/two-three/testing.ts` first (the engine tests import it):

```ts
import { emptyTree, type NodeId, type Tree } from '../../engine/tree';
import { kids, newInternal, newLeaf } from '../../engine/twoThree';

// A tree written as nested arrays: a number is a leaf key, an array an internal node (2 or 3 children).
export type Shape = number | Shape[];

// Slide 18 with the two sentinels joined to the first and last leaf groups.
export const SLIDE_18: Shape = [[[-Infinity, 1, 4], [5, 7, 14]], [[19, 22], [25, 29, Infinity]]];

export function fromShape(shape: Shape): Tree {
  const t = emptyTree();
  const make = (s: Shape): NodeId => {
    if (typeof s === 'number') return newLeaf(t, s);
    const x = newInternal(t);
    const cs = s.map(make);
    const n = t.nodes[x];
    n.left = cs[0];
    n.middle = cs[1] ?? null;
    n.right = cs[2] ?? null;
    cs.forEach((c) => { t.nodes[c].p = x; });
    n.key = t.nodes[cs[cs.length - 1]].key;
    return x;
  };
  t.root = make(shape);
  return t;
}

// ASCII form of a tree for comparisons: ((−∞ 1) (2 3 +∞)) is "((-inf 1) (2 3 +inf))".
export function shapeOf(t: Tree): string {
  const show = (id: NodeId): string => {
    const n = t.nodes[id];
    if (n.leaf) return n.key === -Infinity ? '-inf' : n.key === Infinity ? '+inf' : String(n.key);
    return `(${kids(t, id).map(show).join(' ')})`;
  };
  return t.root === null ? '' : show(t.root);
}
```

Create `src/engine/twoThree.test.ts`:

```ts
import { fromShape, SLIDE_18, shapeOf } from '../structures/two-three/testing';
import { formatValue } from './trace';
import { emptyTree } from './tree';
import {
  findLeaf, fmtKey, initTree, isTwoThree, kids, leavesOf, newInternal, newLeaf, realKeys, realLeaves, twoThreeLayout,
} from './twoThree';

test('fmtKey and formatValue show NIL, +∞ and −∞', () => {
  expect([fmtKey(NaN), fmtKey(Infinity), fmtKey(-Infinity), fmtKey(-7), fmtKey(0)]).toEqual(['NIL', '+∞', '−∞', '-7', '0']);
  expect([formatValue(-Infinity), formatValue(Infinity)]).toEqual(['−∞', '∞']);
});

test('newLeaf and newInternal make unlinked nodes whose attributes are NIL', () => {
  const t = emptyTree();
  const leaf = newLeaf(t);
  const inner = newInternal(t);
  expect(t.nodes[leaf]).toMatchObject({ leaf: true, left: null, middle: null, right: null, p: null });
  expect(Number.isNaN(t.nodes[leaf].key)).toBe(true);
  expect(t.nodes[inner]).toMatchObject({ leaf: false, left: null, middle: null, right: null, p: null });
  expect([leaf, inner]).toEqual(['n1', 'n2']);
});

test('fromShape and shapeOf round-trip slide 18; helpers read leaves in order', () => {
  const t = fromShape(SLIDE_18);
  expect(shapeOf(t)).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (25 29 +inf)))');
  expect(realKeys(t)).toEqual([1, 4, 5, 7, 14, 19, 22, 25, 29]);
  expect(leavesOf(t)).toHaveLength(11);
  expect(realLeaves(t)).toHaveLength(9);
  expect(t.nodes[findLeaf(t, 14)!].key).toBe(14);
  expect(findLeaf(t, 13)).toBeNull();
  expect(findLeaf(t, Infinity)).toBeNull(); // sentinels are not real leaves
  expect(t.nodes[t.root!].key).toBe(Infinity); // an internal key is its subtree maximum
  expect(kids(t, t.root!)).toHaveLength(2);
});

test('kids skips NIL pointers and pointers to deleted nodes', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const leaf = findLeaf(t, 2)!;
  const parent = t.nodes[leaf].p!;
  delete t.nodes[leaf];
  expect(kids(t, parent)).toHaveLength(2);
});

test('initTree is the sentinel-only tree of 2_3_Init', () => {
  const t = initTree();
  expect(shapeOf(t)).toBe('(-inf +inf)');
  expect(t.nodes[t.root!].key).toBe(Infinity);
  expect([t.root, t.nodes[t.root!].left, t.nodes[t.root!].middle]).toEqual(['n1', 'n2', 'n3']);
  expect(isTwoThree(t)).toBe(true);
});

test('isTwoThree accepts valid trees and rejects each broken property', () => {
  expect(isTwoThree(fromShape(SLIDE_18))).toBe(true);
  expect(isTwoThree(fromShape([[-Infinity, 1], [2, 3, Infinity]]))).toBe(true);
  expect(isTwoThree(fromShape([[-Infinity, 2], [1, Infinity]]))).toBe(false); // keys out of order
  expect(isTwoThree(fromShape([-Infinity, [1, [2, Infinity]]]))).toBe(false); // leaves on two levels
  expect(isTwoThree(fromShape([[-Infinity], [1, Infinity]]))).toBe(false); // degree 1
  expect(isTwoThree(fromShape([[1, 2], [3, 4]]))).toBe(false); // no sentinels
  const wrongKey = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  wrongKey.nodes[wrongKey.root!].key = 5;
  expect(isTwoThree(wrongKey)).toBe(false); // internal key is not the subtree maximum
  const wrongParent = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  wrongParent.nodes[findLeaf(wrongParent, 1)!].p = null;
  expect(isTwoThree(wrongParent)).toBe(false); // inconsistent parent pointer
  const leaked = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  newLeaf(leaked, 9);
  expect(isTwoThree(leaked)).toBe(false); // a node the root cannot reach
});

test('twoThreeLayout: leaves evenly spaced on one row, internal nodes centred over their children', () => {
  const t = fromShape(SLIDE_18);
  const L = twoThreeLayout(t);
  const leaves = leavesOf(t);
  expect(leaves.map((id) => L.pos[id].x)).toEqual(leaves.map((_, i) => 32 + i * 44));
  expect(new Set(leaves.map((id) => L.pos[id].y))).toEqual(new Set([224]));
  expect(L.pos[t.root!].y).toBe(32);
  expect(L.pos[t.root!].x).toBeCloseTo(32 + 5.125 * 44); // (2.5 + 7.75) / 2 leaf slots
  expect([L.width, L.height]).toEqual([504, 256]);
});

test('twoThreeLayout places loose nodes (a new leaf, an orphaned subtree) to the right at the top', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const z = newLeaf(t, 7);
  const y = newInternal(t);
  const a = newLeaf(t, 8);
  const b = newLeaf(t, 9);
  t.nodes[y].left = a;
  t.nodes[y].middle = b;
  const L = twoThreeLayout(t);
  const mainRight = Math.max(...leavesOf(t).map((id) => L.pos[id].x));
  expect(L.pos[z].x).toBeGreaterThan(mainRight);
  expect(L.pos[z].y).toBe(32);
  expect(L.pos[y].x).toBeGreaterThan(mainRight);
  expect(L.pos[a].y).toBe(96);
  for (const p of Object.values(L.pos)) expect([Number.isFinite(p.x), Number.isFinite(p.y)]).toEqual([true, true]);
});

test('twoThreeLayout survives a node with two parents and a pointer to a deleted node', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const [left, right] = kids(t, t.root!);
  t.nodes[right].left = t.nodes[left].left; // two parents for one leaf
  const gone = newLeaf(t, 5);
  t.nodes[left].middle = gone;
  delete t.nodes[gone];
  const L = twoThreeLayout(t);
  for (const p of Object.values(L.pos)) expect([Number.isFinite(p.x), Number.isFinite(p.y)]).toEqual([true, true]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/engine/twoThree.test.ts`
Expected: FAIL, unresolved import `./twoThree`.

- [ ] **Step 3: Implement**

In `src/engine/tree.ts`, replace the `TreeNode` line

```ts
export type TreeNode = { id: NodeId; key: number; left: NodeId | null; right: NodeId | null; p: NodeId | null };
```

with

```ts
// middle and leaf are used by 2-3 trees only (BST nodes leave them unset). A 2-3 internal node that has no
// children yet is not a leaf, so the flag cannot be derived from the pointers; key NaN means NIL.
export type TreeNode = {
  id: NodeId;
  key: number;
  left: NodeId | null;
  right: NodeId | null;
  p: NodeId | null;
  middle?: NodeId | null;
  leaf?: boolean;
};
```

In `src/engine/trace.ts`, in `formatValue`, add one line after `if (v === Infinity) return '∞';`:

```ts
  if (v === -Infinity) return '−∞';
```

Create `src/engine/twoThree.ts`:

```ts
import { emptyTree, TREE_LEVEL, TREE_PAD, TREE_SPACING, type NodeId, type Pos, type Tree } from './tree';

export const fmtKey = (k: number): string =>
  Number.isNaN(k) ? 'NIL' : k === Infinity ? '+∞' : k === -Infinity ? '−∞' : String(k);

// A new unlinked leaf; like every DS attribute its key starts NIL (NaN) unless given.
export function newLeaf(t: Tree, key = NaN): NodeId {
  const id = `n${t.nextId++}`;
  t.nodes[id] = { id, key, left: null, middle: null, right: null, p: null, leaf: true };
  return id;
}

export function newInternal(t: Tree): NodeId {
  const id = `n${t.nextId++}`;
  t.nodes[id] = { id, key: NaN, left: null, middle: null, right: null, p: null, leaf: false };
  return id;
}

export const isLeaf = (t: Tree, id: NodeId): boolean => t.nodes[id].leaf === true;

// Children in order, skipping NIL and pointers to nodes that were already deleted.
export function kids(t: Tree, id: NodeId): NodeId[] {
  const n = t.nodes[id];
  return [n.left, n.middle ?? null, n.right].filter((c): c is NodeId => c !== null && c in t.nodes);
}

// Leaves reachable from the root, left to right.
export function leavesOf(t: Tree): NodeId[] {
  const out: NodeId[] = [];
  const walk = (id: NodeId) => {
    if (t.nodes[id].leaf) out.push(id);
    else kids(t, id).forEach(walk);
  };
  if (t.root !== null) walk(t.root);
  return out;
}

// Leaves other than the two sentinels.
export const realLeaves = (t: Tree): NodeId[] => leavesOf(t).filter((id) => Number.isFinite(t.nodes[id].key));
export const findLeaf = (t: Tree, k: number): NodeId | null => realLeaves(t).find((id) => t.nodes[id].key === k) ?? null;
export const realKeys = (t: Tree): number[] => realLeaves(t).map((id) => t.nodes[id].key);

// 2_3_Init without the steps: an internal root over the two sentinel leaves.
export function initTree(): Tree {
  const t = emptyTree();
  const x = newInternal(t);
  const l = newLeaf(t, -Infinity);
  const m = newLeaf(t, Infinity);
  t.nodes[l].p = x;
  t.nodes[m].p = x;
  t.nodes[x].key = Infinity;
  t.nodes[x].left = l;
  t.nodes[x].middle = m;
  t.root = x;
  return t;
}

// The 2-3 properties of slide 17: internal degree 2–3, all leaves on one level, ordered keys,
// each internal key the maximum of its subtree; plus consistent parents, the sentinels at the ends
// and no node the root cannot reach.
export function isTwoThree(t: Tree): boolean {
  if (t.root === null || t.nodes[t.root].p !== null) return false;
  const seen = new Set<NodeId>();
  let leafDepth = -1;
  let last = null as number | null; // assigned inside walk(); the cast stops TypeScript narrowing it to null
  let first = true;
  const walk = (id: NodeId, depth: number): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    const n = t.nodes[id];
    const ks = kids(t, id);
    if (n.leaf) {
      if (ks.length > 0) return false;
      if (leafDepth === -1) leafDepth = depth;
      if (depth !== leafDepth) return false;
      if (first && n.key !== -Infinity) return false;
      first = false;
      if (last !== null && !(n.key > last)) return false;
      last = n.key;
      return true;
    }
    if (ks.length < 2 || ks.length > 3) return false;
    if (n.left === null || (n.middle ?? null) === null) return false;
    for (const c of ks) {
      if (t.nodes[c].p !== id || !walk(c, depth + 1)) return false;
    }
    return n.key === t.nodes[ks[ks.length - 1]].key;
  };
  return walk(t.root, 0) && last === Infinity && seen.size === Object.keys(t.nodes).length;
}

const byId = (a: NodeId, b: NodeId) => Number(a.slice(1)) - Number(b.slice(1));

// Leaves evenly spaced in key order on one row; an internal node is centred over its first and last child.
// Nodes the root cannot reach (a new leaf, an orphaned subtree) are laid out as separate trees to the right,
// roots at the top row. A node reached twice through stale pointers keeps its first spot.
export function twoThreeLayout(t: Tree): { pos: Record<NodeId, Pos>; width: number; height: number } {
  const pos: Record<NodeId, Pos> = {};
  let slot = 0;
  const place = (id: NodeId, depth: number): void => {
    if (id in pos) return;
    const ks = kids(t, id);
    const y = TREE_PAD + depth * TREE_LEVEL;
    if (ks.length === 0) {
      pos[id] = { x: TREE_PAD + slot++ * TREE_SPACING, y };
      return;
    }
    ks.forEach((c) => place(c, depth + 1));
    const xs = ks.map((c) => pos[c].x);
    pos[id] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y };
  };
  if (t.root !== null) place(t.root, 0);
  const loose = Object.keys(t.nodes).filter((id) => !(id in pos));
  const childOfLoose = new Set(loose.flatMap((id) => kids(t, id)));
  for (const r of loose.filter((id) => !childOfLoose.has(id)).sort(byId)) {
    slot++; // a gap before each separate tree
    const ks = kids(t, r);
    if (ks.length > 0 && ks.every((c) => c in pos)) {
      // an old root whose only child is now the root: park it at the top, its edge shows the stale pointer
      pos[r] = { x: TREE_PAD + slot++ * TREE_SPACING, y: TREE_PAD };
    } else {
      place(r, 0);
    }
  }
  const all = Object.values(pos);
  return {
    pos,
    width: Math.max(TREE_PAD, ...all.map((p) => p.x)) + TREE_PAD,
    height: Math.max(TREE_PAD, ...all.map((p) => p.y)) + TREE_PAD,
  };
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx vitest run src/engine && npx tsc --noEmit`
Expected: all PASS (new engine tests plus the existing ones), no type errors. If the layout numbers differ, recompute by hand from the algorithm (leaf slot `i` at `32 + 44·i`; internal x is the mean of its first and last child) before touching the implementation.

- [ ] **Step 5: Commit**

```bash
git add src/engine src/structures/two-three/testing.ts
git commit -m "feat(engine): 2-3 node model, invariants and layout; shape test helpers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `TwoThreeView`, tracer factory, `nodeOptions`, `TwoThreeCanvas`

**Files:**
- Modify: `src/structures/types.ts`, `src/structures/tracer.ts`, `src/structures/views.ts`, `src/structures/views.test.ts`, `src/ui/StructureCanvas.tsx`, `src/styles.css`
- Create: `src/structures/tracer.test.ts`, `src/ui/TwoThreeCanvas.tsx`, `src/ui/TwoThreeCanvas.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`fmtKey`, `kids`, `twoThreeLayout`, `realLeaves`, `fromShape`, `SLIDE_18`, `findLeaf`, `newLeaf`, `newInternal`).
- Produces:
  - `TwoThreeView = TreeShape & { kind: 'two-three' }` and `TwoThreeStep = StructureStep<TwoThreeView>`; `StructureView = TreeView | TwoThreeView | HeapView`.
  - `TreeTracer<V extends TreeView | TwoThreeView = TreeView>`; `createTreeTracer(tree)` (unchanged behaviour) and `createTwoThreeTracer(tree): TreeTracer<TwoThreeView>`. In both, a `ptr` variable whose node is missing shows `'deleted'` in `vars` and gets no tag; a node with key `NaN` shows `null` (NIL).
  - `nodeOptions(view)` for `'two-three'`: real leaves in key order, labelled with `String(key)`.
  - `<TwoThreeCanvas view={TwoThreeView} onNodeClick?(id) />`. DOM contract: node `g.tnode[data-node=<id>]` (`.leaf`, `.sentinel`, `.active`, `.detached`) containing `text.key` and optional `text.ptr-tag`; edge `line.tree-edge[data-edge="<parent>><child>"]` (`.active` when the child id is in `highlight.edges`). Only real leaves are clickable.

- [ ] **Step 1: Write the failing tests**

Create `src/structures/tracer.test.ts`:

```ts
import { emptyTree, newNode } from '../engine/tree';
import { newInternal, newLeaf } from '../engine/twoThree';
import { createTreeTracer, createTwoThreeTracer } from './tracer';

test('the BST tracer still stamps kind "tree"', () => {
  const t = emptyTree();
  const a = newNode(t, 5);
  t.root = a;
  const tr = createTreeTracer(t);
  tr.ptr = { x: a };
  tr.emit('P', 1);
  expect(tr.steps[0].view.kind).toBe('tree');
  expect(tr.steps[0].vars).toEqual({ x: 5 });
  expect(tr.steps[0].view.tags).toEqual({ x: a });
});

test('the 2-3 tracer stamps kind "two-three"; a NIL key shows as NIL, a deleted node as "deleted" without a tag', () => {
  const t = emptyTree();
  const y = newInternal(t); // key NaN = NIL
  const z = newLeaf(t, 4);
  const gone = newLeaf(t, 9);
  delete t.nodes[gone];
  const tr = createTwoThreeTracer(t);
  tr.ptr = { y, z, w: gone, v: null };
  tr.emit('P', 1);
  const s = tr.steps[0];
  expect(s.view.kind).toBe('two-three');
  expect(s.vars).toEqual({ y: null, z: 4, w: 'deleted', v: null });
  expect(s.view.tags).toEqual({ y, z });
});

test('showRoot lists T.root in the variables and tags the root node', () => {
  const t = emptyTree();
  const tr = createTwoThreeTracer(t);
  tr.showRoot = true;
  tr.emit('P', 1);
  const r = newInternal(t);
  t.nodes[r].key = Infinity;
  t.root = r;
  tr.emit('P', 2);
  expect([tr.steps[0].vars['T.root'], 'T.root' in tr.steps[0].view.tags]).toEqual([null, false]);
  expect([tr.steps[1].vars['T.root'], tr.steps[1].view.tags['T.root']]).toEqual([Infinity, r]);
});
```

Append to `src/structures/views.test.ts` (add `import { fromShape, SLIDE_18 } from './two-three/testing';` to its imports):

```ts
test('nodeOptions: a 2-3 tree offers only the real leaves, in key order, never the sentinels', () => {
  const tree = fromShape(SLIDE_18);
  const view = { kind: 'two-three' as const, tree, highlight: { nodes: [], edges: [] }, tags: {} };
  const labels = nodeOptions(view).map((o) => o.label);
  expect(labels).toEqual(['1', '4', '5', '7', '14', '19', '22', '25', '29']);
});
```

Create `src/ui/TwoThreeCanvas.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react';
import { fmtKey, findLeaf, newInternal, newLeaf } from '../engine/twoThree';
import { fromShape, SLIDE_18 } from '../structures/two-three/testing';
import type { TwoThreeView } from '../structures/types';
import { StructureCanvas } from './StructureCanvas';
import { TwoThreeCanvas } from './TwoThreeCanvas';

const view = (over: Partial<TwoThreeView> = {}): TwoThreeView => ({
  kind: 'two-three',
  tree: fromShape(SLIDE_18),
  highlight: { nodes: [], edges: [] },
  tags: {},
  ...over,
});

const leafKeys = (c: HTMLElement) => [...c.querySelectorAll('.tnode.leaf .key')].map((e) => e.textContent);

test('draws 11 leaf boxes (two sentinels) and 7 internal circles joined by 17 edges', () => {
  const { container } = render(<TwoThreeCanvas view={view()} />);
  expect(container.querySelectorAll('.tnode')).toHaveLength(18);
  expect(container.querySelectorAll('.tnode.leaf rect')).toHaveLength(11);
  expect(container.querySelectorAll('.tnode:not(.leaf) circle')).toHaveLength(7);
  expect(container.querySelectorAll('.tree-edge')).toHaveLength(17);
  expect(container.querySelectorAll('.tnode.sentinel')).toHaveLength(2);
  expect(leafKeys(container)).toEqual([fmtKey(-Infinity), '1', '4', '5', '7', '14', '19', '22', '25', '29', fmtKey(Infinity)]);
});

test('highlights, active edges and pointer tags come from the view', () => {
  const t = fromShape(SLIDE_18);
  const five = findLeaf(t, 5)!;
  const parent = t.nodes[five].p!;
  const { container } = render(<TwoThreeCanvas view={view({
    tree: t,
    highlight: { nodes: [five], edges: [five] },
    tags: { x: parent, y: parent, z: five },
  })}
  />);
  expect(container.querySelector(`[data-node="${five}"]`)).toHaveClass('tnode', 'leaf', 'active');
  expect(container.querySelector(`[data-edge="${parent}>${five}"]`)).toHaveClass('tree-edge', 'active');
  expect(container.querySelector(`[data-node="${parent}"] .ptr-tag`)).toHaveTextContent('x, y');
  expect(container.querySelector(`[data-node="${five}"] .ptr-tag`)).toHaveTextContent('z');
});

test('only real leaves are clickable: not internal nodes, not sentinels', () => {
  const t = fromShape(SLIDE_18);
  const onNodeClick = vi.fn();
  const { container } = render(<TwoThreeCanvas view={view({ tree: t })} onNodeClick={onNodeClick} />);
  fireEvent.pointerDown(container.querySelector(`[data-node="${findLeaf(t, 14)}"]`)!);
  fireEvent.pointerDown(container.querySelector(`[data-node="${t.root}"]`)!);
  fireEvent.pointerDown(container.querySelector('.tnode.sentinel')!);
  expect(onNodeClick.mock.calls).toEqual([[findLeaf(t, 14)]]);
});

test('half-finished states draw: a loose leaf is detached, a NIL-key internal node is an empty circle, a deleted child is skipped', () => {
  const t = fromShape(SLIDE_18);
  const z = newLeaf(t, 7);
  const y = newInternal(t);
  const gone = newLeaf(t, 8);
  t.nodes[y].left = gone;
  delete t.nodes[gone];
  const { container } = render(<TwoThreeCanvas view={view({ tree: t })} />);
  expect(container.querySelector(`[data-node="${z}"]`)).toHaveClass('detached');
  expect(container.querySelector(`[data-node="${y}"]`)).toHaveClass('detached');
  expect(container.querySelector(`[data-node="${y}"] .key`)).toHaveTextContent('');
  expect(container.querySelectorAll('.tree-edge')).toHaveLength(17);
});

test('StructureCanvas draws a two-three view with TwoThreeCanvas', () => {
  const { container } = render(<StructureCanvas view={view()} />);
  expect(container.querySelector('.tree-canvas.two-three')).not.toBeNull();
  expect(container.querySelector('.heap-array')).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/tracer.test.ts src/structures/views.test.ts src/ui/TwoThreeCanvas.test.tsx`
Expected: FAIL (`createTwoThreeTracer` is not exported, the view kind is unknown, `./TwoThreeCanvas` is unresolved).

- [ ] **Step 3: Implement the types**

In `src/structures/types.ts`, replace the `TreeView` block

```ts
export type TreeView = {
  kind: 'tree';
  tree: Tree;
  // nodes: highlighted nodes; edges: child ids whose edge to their parent is highlighted.
  highlight: { nodes: NodeId[]; edges: NodeId[] };
  // Pointer variables drawn beside the node they point to (x, y, z, T.root, …).
  tags: Record<string, NodeId>;
  nil?: NilSlot;
};
```

with

```ts
type TreeShape = {
  tree: Tree;
  // nodes: highlighted nodes; edges: child ids whose edge to their parent is highlighted.
  highlight: { nodes: NodeId[]; edges: NodeId[] };
  // Pointer variables drawn beside the node they point to (x, y, z, T.root, …).
  tags: Record<string, NodeId>;
  nil?: NilSlot;
};
export type TreeView = TreeShape & { kind: 'tree' };
export type TwoThreeView = TreeShape & { kind: 'two-three' };
```

then replace `export type StructureView = TreeView | HeapView;` with

```ts
export type StructureView = TreeView | TwoThreeView | HeapView;
```

and add after `export type HeapStep = StructureStep<HeapView>;`:

```ts
export type TwoThreeStep = StructureStep<TwoThreeView>;
```

- [ ] **Step 4: Implement the tracer factory**

Replace `src/structures/tracer.ts` with:

```ts
import type { Question, Value } from '../engine/trace';
import type { NilSlot, NodeId, Tree } from '../engine/tree';
import type { StructureStep, TreeView, TwoThreeView } from './types';

export type TreeEmit = {
  bigStep?: boolean;
  nodes?: NodeId[];
  edges?: NodeId[];
  nil?: NilSlot;
  note?: string;
  question?: Question;
};

export type TreeTracer<V extends TreeView | TwoThreeView = TreeView> = {
  tree: Tree;
  steps: StructureStep<V>[];
  // Pointer variables of the running frame; shown as keys in the variables line and as tags on the tree.
  ptr: Record<string, NodeId | null>;
  // Other variables (e.g. k).
  extra: Record<string, Value>;
  stack: string[];
  // While true, T.root is a pointer variable of the running procedure (Tree_Insert, the 2-3 procedures).
  showRoot: boolean;
  emit(proc: string, line: number, o?: TreeEmit): void;
};

function makeTracer<V extends TreeView | TwoThreeView>(tree: Tree, kind: V['kind']): TreeTracer<V> {
  const tr: TreeTracer<V> = {
    tree,
    steps: [],
    ptr: {},
    extra: {},
    stack: [],
    showRoot: false,
    emit(proc, line, o = {}) {
      const vars: Record<string, Value> = { ...tr.extra };
      const tags: Record<string, NodeId> = {};
      for (const [name, id] of Object.entries(tr.ptr)) {
        const n = id === null ? undefined : tr.tree.nodes[id];
        // NIL shows no key; so does a node whose key is still NIL (NaN); a node already deleted shows "deleted".
        vars[name] = id === null ? null : n === undefined ? 'deleted' : Number.isNaN(n.key) ? null : n.key;
        if (id !== null && n !== undefined) tags[name] = id;
      }
      if (tr.showRoot) {
        vars['T.root'] = tr.tree.root === null ? null : tr.tree.nodes[tr.tree.root].key;
        if (tr.tree.root !== null) tags['T.root'] = tr.tree.root;
      }
      tr.steps.push(structuredClone({
        proc,
        line,
        bigStep: o.bigStep ?? false,
        vars,
        note: o.note,
        question: o.question,
        view: { kind, tree: tr.tree, highlight: { nodes: o.nodes ?? [], edges: o.edges ?? [] }, tags, nil: o.nil },
        ds: tr.stack.length > 0 ? [{ kind: 'stack' as const, name: 'Call stack', items: tr.stack }] : [],
      }) as unknown as StructureStep<V>);
    },
  };
  return tr;
}

export const createTreeTracer = (tree: Tree): TreeTracer<TreeView> => makeTracer<TreeView>(tree, 'tree');
export const createTwoThreeTracer = (tree: Tree): TreeTracer<TwoThreeView> => makeTracer<TwoThreeView>(tree, 'two-three');
```

- [ ] **Step 5: Implement `nodeOptions`, the canvas and the dispatcher**

Replace `src/structures/views.ts` with:

```ts
import { cellId } from '../engine/heapArray';
import { inorder } from '../engine/tree';
import { fmtKey, realLeaves } from '../engine/twoThree';
import type { StructureView } from './types';

export type NodeOption = { id: string; label: string };

// What a node question can be answered with: BST nodes in key order, the heap's live cells in index order,
// or a 2-3 tree's real leaves in key order (never the sentinels).
export function nodeOptions(view: StructureView): NodeOption[] {
  if (view.kind === 'tree') return inorder(view.tree).map((id) => ({ id, label: String(view.tree.nodes[id].key) }));
  if (view.kind === 'two-three') return realLeaves(view.tree).map((id) => ({ id, label: fmtKey(view.tree.nodes[id].key) }));
  const { heap } = view;
  return heap.A.slice(0, heap.heapSize).map((key, j) => ({ id: cellId(heap, j + 1), label: String(key) }));
}
```

Create `src/ui/TwoThreeCanvas.tsx`:

```tsx
import type { NodeId } from '../engine/tree';
import { fmtKey, kids, twoThreeLayout } from '../engine/twoThree';
import type { TwoThreeView } from '../structures/types';

const R = 17;
const LW = 15; // half the width of a leaf box
const LH = 13;

type Props = { view: TwoThreeView; onNodeClick?(id: NodeId): void };

// Leaves are boxes on one row, internal nodes circles centred over their children (slide 18).
// Edges follow the child pointers, not p, so half-finished states between lecture lines still draw.
export function TwoThreeCanvas({ view, onNodeClick }: Props) {
  const { tree, highlight, tags } = view;
  const L = twoThreeLayout(tree);
  const ids = Object.keys(L.pos);
  const attached = new Set<NodeId>();
  const mark = (id: NodeId) => {
    if (attached.has(id)) return;
    attached.add(id);
    kids(tree, id).forEach(mark);
  };
  if (tree.root !== null) mark(tree.root);
  const tagsOf: Record<NodeId, string[]> = {};
  for (const [name, id] of Object.entries(tags)) (tagsOf[id] ??= []).push(name);

  return (
    <svg className="tree-canvas two-three" viewBox={`0 0 ${L.width} ${L.height}`} role="img" aria-label="2-3 tree">
      {ids.flatMap((id) => kids(tree, id).map((c) => (
        <line
          key={`e-${id}-${c}`}
          data-edge={`${id}>${c}`}
          className={highlight.edges.includes(c) ? 'tree-edge active' : 'tree-edge'}
          x1={L.pos[id].x}
          y1={L.pos[id].y}
          x2={L.pos[c].x}
          y2={L.pos[c].y}
        />
      )))}
      {ids.map((id) => {
        const n = tree.nodes[id];
        const { x, y } = L.pos[id];
        const leaf = n.leaf === true;
        const real = leaf && Number.isFinite(n.key);
        const cls = ['tnode'];
        if (leaf) cls.push('leaf');
        if (leaf && !real && !Number.isNaN(n.key)) cls.push('sentinel');
        if (highlight.nodes.includes(id)) cls.push('active');
        if (!attached.has(id)) cls.push('detached');
        return (
          <g
            key={id}
            data-node={id}
            className={cls.join(' ')}
            style={{ transform: `translate(${x}px, ${y}px)` }}
            onPointerDown={real ? () => onNodeClick?.(id) : undefined}
          >
            {leaf ? <rect x={-LW} y={-LH} width={2 * LW} height={2 * LH} /> : <circle r={R} />}
            <text className="key" textAnchor="middle" dominantBaseline="central">
              {Number.isNaN(n.key) ? '' : fmtKey(n.key)}
            </text>
            {tagsOf[id] && (
              <text className="ptr-tag" x={(leaf ? LW : R) + 3} y={leaf ? -LH : -R + 2}>{tagsOf[id].join(', ')}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

Replace `src/ui/StructureCanvas.tsx` with:

```tsx
import type { StructureView } from '../structures/types';
import { HeapCanvas } from './HeapCanvas';
import { TreeCanvas } from './TreeCanvas';
import { TwoThreeCanvas } from './TwoThreeCanvas';

type Props = { view: StructureView; onNodeClick?(id: string): void };

export function StructureCanvas({ view, onNodeClick }: Props) {
  if (view.kind === 'tree') return <TreeCanvas view={view} onNodeClick={onNodeClick} />;
  if (view.kind === 'two-three') return <TwoThreeCanvas view={view} onNodeClick={onNodeClick} />;
  return <HeapCanvas view={view} onNodeClick={onNodeClick} />;
}
```

Append to `src/styles.css`:

```css

/* ---------- 2-3 tree ---------- */
.tnode.leaf rect { fill: var(--v-white); stroke: var(--v-stroke); stroke-width: 2; }
.tnode.leaf.sentinel rect { fill: none; stroke: var(--muted); stroke-dasharray: 4 3; }
.tnode.leaf.sentinel text.key { fill: var(--muted); }
.tnode.active rect { stroke: var(--marker); stroke-width: 5; }
.tnode.detached rect { stroke-dasharray: 5 3; }
.two-three .tnode:not(.leaf), .two-three .tnode.sentinel { cursor: default; }
```

- [ ] **Step 6: Run the tests and the typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: everything PASSES (the new tracer, views and canvas tests, and every existing BST/heap/graph test); no type errors. If TypeScript rejects the `as unknown as StructureStep<V>` cast or `V['kind']`, keep the same runtime code and loosen only the offending annotation, and record a ruling.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat(ui): TwoThreeView, tracer factory and TwoThreeCanvas for 2-3 trees" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Pseudocode, questions, `Set_Children`/`Update_Key`, `2_3_Init`

**Files:**
- Create: `src/structures/two-three/pseudocode.ts`, `questions.ts`, `primitives.ts`, `primitives.test.ts`, `init.ts`, `init.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2 (`createTwoThreeTracer`, `TreeTracer<TwoThreeView>`, `fmtKey`, `newInternal`, `newLeaf`, `kids`, `isTwoThree`, `initTree`, `fromShape`, `shapeOf`, `SLIDE_18`), `assertValidTreeTrace` from `src/structures/testing.ts`, `nodeQuestion` from `src/structures/bst/questions.ts`.
- Produces:
  - `pseudocode.ts`: constants `TT_INIT = '2_3_Init'`, `TT_SEARCH = '2_3_Search'`, `TT_MINIMUM = '2_3_Minimum'`, `TT_SUCCESSOR = '2_3_Successor'`, `UPDATE_KEY = 'Update_Key'`, `SET_CHILDREN = 'Set_Children'`, `INSERT_AND_SPLIT = 'Insert_And_Split'`, `TT_INSERT = '2_3_Insert'`, `BORROW_OR_MERGE = 'Borrow_Or_Merge'`, `TT_DELETE = '2_3_Delete'`; `twoThreeProcs: Proc[]` (`2_3_Search` first).
  - `questions.ts`: `TWO_THREE_QUESTION_TYPES`; `type Child = 'left child' | 'middle child' | 'right child'`; `childOptions(t, x): Child[]`; `childToward(t, x, k, strict): Child`; `searchQuestion(t, x, k)`, `insertWalkQuestion(t, y, k)`, `splitQuestion(splits: boolean)`, `whereQuestion(t, x, z)`, `borrowMergeQuestion(borrow: boolean)`, `minimumQuestion(t, first: NodeId)`, `successorQuestion(t, x: NodeId, answer: NodeId | null)`. Question types: `two3.search`, `two3.insertWalk`, `two3.split`, `two3.where`, `two3.borrowMerge`, `two3.minimum`, `two3.successor`.
  - `primitives.ts`: `type TT = TreeTracer<TwoThreeView>`; `lab(tr, id: NodeId | null): string`; `inFrame<R>(tr, frame: string, ptr, body: () => R): R`; `dropVar(tr, name): void`; `traceUpdateKey(tr, x): void`; `traceSetChildren(tr, x, l, m, r): void`; `callSetChildren(tr, proc, line, x, l, m, r): void`.
  - `init.ts`: `runInit(): TwoThreeStep[]` (ignores the current tree).

- [ ] **Step 1: Write the failing tests**

Create `src/structures/two-three/init.test.ts`:

```ts
import { isTwoThree } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import { runInit } from './init';
import { twoThreeProcs } from './pseudocode';
import { shapeOf } from './testing';

const def = { procs: twoThreeProcs };

test('every procedure has the slide line count', () => {
  const counts = Object.fromEntries(twoThreeProcs.map((p) => [p.name, p.lines.length]));
  expect(counts).toEqual({
    '2_3_Search': 9, '2_3_Minimum': 7, '2_3_Successor': 12, '2_3_Insert': 16, Insert_And_Split: 21,
    Set_Children: 7, Update_Key: 5, '2_3_Delete': 18, Borrow_Or_Merge: 28, '2_3_Init': 9,
  });
  expect(twoThreeProcs[0].name).toBe('2_3_Search');
});

test('2_3_Init runs lines 1–9 and leaves the sentinel-only tree', () => {
  const steps = runInit();
  assertValidTreeTrace(def, steps);
  expect(steps.map((s) => s.line)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(steps.every((s) => s.proc === '2_3_Init')).toBe(true);
  const t = steps.at(-1)!.view.tree;
  expect(shapeOf(t)).toBe('(-inf +inf)');
  expect(isTwoThree(t)).toBe(true);
  expect(steps.some((s) => s.question)).toBe(false);
});

test('2_3_Init builds the tree one attribute at a time; unset attributes are NIL', () => {
  const steps = runInit();
  expect(steps[1].vars).toMatchObject({ x: null, 'T.root': null }); // new internal node: key NIL, root NIL
  expect(steps[2].vars).toMatchObject({ 'ℓ': null, m: null });
  expect(steps[3].vars).toMatchObject({ 'ℓ': -Infinity, m: null });
  expect(steps[4].vars).toMatchObject({ 'ℓ': -Infinity, m: Infinity });
  expect(steps[6].vars.x).toBe(Infinity);
  expect(steps[9].vars['T.root']).toBe(Infinity);
  expect(steps[9].view.tags['T.root']).toBe(steps[9].view.tree.root);
  expect(steps[6].view.tree.root).toBeNull(); // not linked to T until line 9
});
```

Create `src/structures/two-three/primitives.test.ts`:

```ts
import { findLeaf, newLeaf } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import { traceSetChildren, traceUpdateKey } from './primitives';
import { fromShape, shapeOf } from './testing';

const lines = (steps: { proc: string; line: number }[]) => steps.map((s) => `${s.proc}:${s.line}`);

test('Update_Key sets x.key to the key of its last child: lines 1–5 with a right child, 1–4 without', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const [a, b] = [t.nodes[t.root!].left!, t.nodes[t.root!].middle!];
  t.nodes[a].key = 99;
  t.nodes[b].key = 99;
  const tr = createTwoThreeTracer(t);
  traceUpdateKey(tr, a);
  traceUpdateKey(tr, b);
  expect(lines(tr.steps)).toEqual([
    'Update_Key:1', 'Update_Key:2', 'Update_Key:3', 'Update_Key:4',
    'Update_Key:1', 'Update_Key:2', 'Update_Key:3', 'Update_Key:4', 'Update_Key:5',
  ]);
  expect([t.nodes[a].key, t.nodes[b].key]).toEqual([1, Infinity]);
  expect(tr.steps[0].ds[0]).toEqual({ kind: 'stack', name: 'Call stack', items: ['Update_Key(x)'] });
  expect(tr.stack).toEqual([]); // the frame is popped
});

test('Set_Children relinks x, fixes the parents, then calls Update_Key', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const x = t.nodes[t.root!].left!;
  const z = newLeaf(t, 0);
  const l = findLeaf(t, 1)!;
  const sentinel = t.nodes[x].left!;
  const tr = createTwoThreeTracer(t);
  tr.ptr = { caller: x };
  traceSetChildren(tr, x, z, l, sentinel);
  expect(lines(tr.steps).slice(0, 7)).toEqual([
    'Set_Children:1', 'Set_Children:2', 'Set_Children:3', 'Set_Children:4', 'Set_Children:5', 'Set_Children:6', 'Set_Children:7',
  ]);
  expect(lines(tr.steps).slice(7).every((s) => s.startsWith('Update_Key:'))).toBe(true);
  expect(t.nodes[x]).toMatchObject({ left: z, middle: l, right: sentinel, key: -Infinity });
  expect([t.nodes[z].p, t.nodes[l].p, t.nodes[sentinel].p]).toEqual([x, x, x]);
  expect(tr.steps.at(-1)!.ds[0]).toMatchObject({ items: ['Set_Children(x, ℓ, m, r)', 'Update_Key(x)'] });
  expect(tr.ptr).toEqual({ caller: x }); // the caller's variables are restored
});

test('Set_Children with m and r NIL skips lines 4 and 6', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const x = t.nodes[t.root!].left!;
  const l = t.nodes[x].left!;
  const tr = createTwoThreeTracer(t);
  traceSetChildren(tr, x, l, null, null);
  const own = tr.steps.filter((s) => s.proc === 'Set_Children').map((s) => s.line);
  expect(own).toEqual([1, 2, 3, 5, 7]);
  expect(shapeOf(t)).toBe('((-inf) (2 3 +inf))'); // x keeps one child
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/two-three`
Expected: FAIL, unresolved imports `./init`, `./pseudocode`, `./primitives`.

- [ ] **Step 3: Implement `pseudocode.ts`**

```ts
import type { Proc } from '../../algorithms/types';

export const TT_INIT = '2_3_Init';
export const TT_SEARCH = '2_3_Search';
export const TT_MINIMUM = '2_3_Minimum';
export const TT_SUCCESSOR = '2_3_Successor';
export const UPDATE_KEY = 'Update_Key';
export const SET_CHILDREN = 'Set_Children';
export const INSERT_AND_SPLIT = 'Insert_And_Split';
export const TT_INSERT = '2_3_Insert';
export const BORROW_OR_MERGE = 'Borrow_Or_Merge';
export const TT_DELETE = '2_3_Delete';

// Efficient DS slides 21–38 (2-3 trees; objects live at the leaves, key = maximum key in the subtree).
export const twoThreeProcs: Proc[] = [
  {
    name: TT_SEARCH,
    signature: '2_3_Search(x, k)',
    lines: [
      'if x is a leaf then',
      '    if x.key == k then',
      '        return x',
      '    else return NIL',
      'if k ≤ x.left.key then',
      '    return 2_3_Search(x.left, k)',
      'else if k ≤ x.middle.key then',
      '    return 2_3_Search(x.middle, k)',
      'else return 2_3_Search(x.right, k)',
    ],
  },
  {
    name: TT_MINIMUM,
    signature: '2_3_Minimum(T)',
    lines: [
      'x = T.root',
      'while x is not a leaf do',
      '    x = x.left',
      'x = x.p.middle',
      'if x.key ≠ +∞ then',
      '    return x',
      'else error: T is empty',
    ],
  },
  {
    name: TT_SUCCESSOR,
    signature: '2_3_Successor(x)',
    lines: [
      'z = x.p',
      'while x == z.right or (z.right == NIL and x == z.middle) do',
      '    x = z',
      '    z = z.p',
      'if x == z.left then',
      '    y = z.middle',
      'else y = z.right',
      'while y is not a leaf do',
      '    y = y.left',
      'if y.key < +∞ then',
      '    return y',
      'else return NIL',
    ],
  },
  {
    name: TT_INSERT,
    signature: '2_3_Insert(T, z)',
    lines: [
      'y = T.root',
      'while y is not a leaf do',
      '    if z.key < y.left.key then y = y.left',
      '    else if z.key < y.middle.key then y = y.middle',
      '    else y = y.right',
      'x = y.p',
      'z = Insert_And_Split(x, z)',
      'while x ≠ T.root do',
      '    x = x.p',
      '    if z ≠ NIL then',
      '        z = Insert_And_Split(x, z)',
      '    else Update_Key(x)',
      'if z ≠ NIL then',
      '    new internal node w',
      '    Set_Children(w, x, z, NIL)',
      '    T.root = w',
    ],
  },
  {
    name: INSERT_AND_SPLIT,
    signature: 'Insert_And_Split(x, z)',
    lines: [
      '⟨ℓ, m, r⟩ = ⟨x.left, x.middle, x.right⟩',
      'if r == NIL then',
      '    if z.key < ℓ.key then',
      '        Set_Children(x, z, ℓ, m)',
      '    else if z.key < m.key then',
      '        Set_Children(x, ℓ, z, m)',
      '    else Set_Children(x, ℓ, m, z)',
      '    return NIL',
      'new internal node y',
      'if z.key < ℓ.key then',
      '    Set_Children(x, z, ℓ, NIL)',
      '    Set_Children(y, m, r, NIL)',
      'else if z.key < m.key then',
      '    Set_Children(x, ℓ, z, NIL)',
      '    Set_Children(y, m, r, NIL)',
      'else if z.key < r.key then',
      '    Set_Children(x, ℓ, m, NIL)',
      '    Set_Children(y, z, r, NIL)',
      'else Set_Children(x, ℓ, m, NIL)',
      '    Set_Children(y, r, z, NIL)',
      'return y',
    ],
  },
  {
    name: SET_CHILDREN,
    signature: 'Set_Children(x, ℓ, m, r)',
    lines: [
      '⟨x.left, x.middle, x.right⟩ = ⟨ℓ, m, r⟩',
      'ℓ.p = x',
      'if m ≠ NIL then',
      '    m.p = x',
      'if r ≠ NIL then',
      '    r.p = x',
      'Update_Key(x)',
    ],
  },
  {
    name: UPDATE_KEY,
    signature: 'Update_Key(x)',
    lines: [
      'x.key = x.left.key',
      'if x.middle ≠ NIL then',
      '    x.key = x.middle.key',
      'if x.right ≠ NIL then',
      '    x.key = x.right.key',
    ],
  },
  {
    name: TT_DELETE,
    signature: '2_3_Delete(T, x)',
    lines: [
      'y = x.p',
      'if x == y.left then',
      '    Set_Children(y, y.middle, y.right, NIL)',
      'else if x == y.middle then',
      '    Set_Children(y, y.left, y.right, NIL)',
      'else Set_Children(y, y.left, y.middle, NIL)',
      'delete x    ▷ deg(y) may be < 2',
      'while y ≠ NIL do',
      '    if y.middle ≠ NIL then',
      '        Update_Key(y)',
      '        y = y.p',
      '    else',
      '        if y ≠ T.root then',
      '            y = Borrow_Or_Merge(y)',
      '        else T.root = y.left',
      '            y.left.p = NIL',
      '            delete y',
      '            return',
    ],
  },
  {
    name: BORROW_OR_MERGE,
    signature: 'Borrow_Or_Merge(y)',
    lines: [
      'z = y.p',
      'if y == z.left then',
      '    x = z.middle',
      '    if x.right ≠ NIL then',
      '        Set_Children(y, y.left, x.left, NIL)',
      '        Set_Children(x, x.middle, x.right, NIL)',
      '    else Set_Children(x, y.left, x.left, x.middle)',
      '        delete y',
      '        Set_Children(z, x, z.right, NIL)',
      '    return z',
      'if y == z.middle then',
      '    x = z.left',
      '    if x.right ≠ NIL then',
      '        Set_Children(y, x.right, y.left, NIL)',
      '        Set_Children(x, x.left, x.middle, NIL)',
      '    else Set_Children(x, x.left, x.middle, y.left)',
      '        delete y',
      '        Set_Children(z, x, z.right, NIL)',
      '    return z',
      '▷ y == z.right',
      'x = z.middle',
      'if x.right ≠ NIL then',
      '    Set_Children(y, x.right, y.left, NIL)',
      '    Set_Children(x, x.left, x.middle, NIL)',
      'else Set_Children(x, x.left, x.middle, y.left)',
      '    delete y',
      '    Set_Children(z, z.left, x, NIL)',
      'return z',
    ],
  },
  {
    name: TT_INIT,
    signature: '2_3_Init(T)',
    lines: [
      'new internal node x    ▷ DS attributes initialized to NIL',
      'new leaves ℓ, m    ▷ DS attributes initialized to NIL',
      'ℓ.key = −∞',
      'm.key = +∞',
      'ℓ.p = m.p = x',
      'x.key = +∞',
      'x.left = ℓ',
      'x.middle = m',
      'T.root = x',
    ],
  },
];
```

- [ ] **Step 4: Implement `questions.ts`**

```ts
import type { Question } from '../../engine/trace';
import type { NodeId, Tree } from '../../engine/tree';
import { fmtKey } from '../../engine/twoThree';
import { nodeQuestion } from '../bst/questions';

export const TWO_THREE_QUESTION_TYPES = [
  { type: 'two3.search', label: '2_3_Search: left, middle or right child' },
  { type: 'two3.insertWalk', label: '2_3_Insert: left, middle or right child' },
  { type: 'two3.split', label: 'Insert_And_Split: does x split' },
  { type: 'two3.where', label: 'Insert_And_Split: where does z go' },
  { type: 'two3.borrowMerge', label: 'Borrow_Or_Merge: borrow or merge' },
  { type: 'two3.minimum', label: 'Which leaf 2_3_Minimum returns' },
  { type: 'two3.successor', label: 'Which leaf 2_3_Successor returns' },
];

export type Child = 'left child' | 'middle child' | 'right child';

// An internal node with two children offers only the left and the middle child.
export function childOptions(t: Tree, x: NodeId): Child[] {
  return t.nodes[x].right != null ? ['left child', 'middle child', 'right child'] : ['left child', 'middle child'];
}

// The child a walk toward key k takes at x. 2_3_Search tests k ≤ key (slide 22), 2_3_Insert tests z.key < key (slide 31).
export function childToward(t: Tree, x: NodeId, k: number, strict: boolean): Child {
  const n = t.nodes[x];
  const before = (a: number, b: number) => (strict ? a < b : a <= b);
  if (before(k, t.nodes[n.left!].key)) return 'left child';
  if (before(k, t.nodes[n.middle!].key)) return 'middle child';
  return 'right child';
}

function walkQuestion(type: string, prompt: string, t: Tree, x: NodeId, k: number, strict: boolean): Question {
  const n = t.nodes[x];
  const op = strict ? '<' : '≤';
  const move = childToward(t, x, k, strict);
  const left = fmtKey(t.nodes[n.left!].key);
  const middle = fmtKey(t.nodes[n.middle!].key);
  const why: Record<Child, string> = {
    'left child': `${k} ${op} x.left.key = ${left}, so the walk continues in the left child.`,
    'middle child': `${k} > x.left.key = ${left} and ${k} ${op} x.middle.key = ${middle}, so it continues in the middle child.`,
    'right child': `${k} > x.middle.key = ${middle}, so it continues in the right child.`,
  };
  return { type, prompt, answer: { kind: 'choice', value: move, options: childOptions(t, x) }, explain: why[move] };
}

export const searchQuestion = (t: Tree, x: NodeId, k: number): Question =>
  walkQuestion('two3.search', `2_3_Search(x, ${k}) at the internal node with key ${fmtKey(t.nodes[x].key)}: which child does the search continue in?`, t, x, k, false);

export const insertWalkQuestion = (t: Tree, y: NodeId, k: number): Question =>
  walkQuestion('two3.insertWalk', `Line 2: y is the internal node with key ${fmtKey(t.nodes[y].key)}. Which child does z.key = ${k} go down into?`, t, y, k, true);

export const splitQuestion = (splits: boolean): Question => ({
  type: 'two3.split',
  prompt: 'Insert_And_Split(x, z): does x split?',
  answer: { kind: 'yesno', value: splits },
  explain: splits
    ? 'x already has three children, so adding z would give it four: x splits (r ≠ NIL).'
    : 'x has only two children, so z fits without a split (r == NIL).',
});

export const WHERE = ['before ℓ', 'between ℓ and m', 'after m'];

export function whereQuestion(t: Tree, x: NodeId, z: NodeId): Question {
  const n = t.nodes[x];
  const zk = t.nodes[z].key;
  const l = fmtKey(t.nodes[n.left!].key);
  const m = fmtKey(t.nodes[n.middle!].key);
  const value = zk < t.nodes[n.left!].key ? WHERE[0] : zk < t.nodes[n.middle!].key ? WHERE[1] : WHERE[2];
  const why = [`z.key = ${fmtKey(zk)} < ℓ.key = ${l}.`, `ℓ.key = ${l} < z.key = ${fmtKey(zk)} < m.key = ${m}.`, `z.key = ${fmtKey(zk)} > m.key = ${m}.`];
  return {
    type: 'two3.where',
    prompt: `x has two children ℓ and m. Where does z (key ${fmtKey(zk)}) go?`,
    answer: { kind: 'choice', value, options: WHERE },
    explain: why[WHERE.indexOf(value)],
  };
}

export const borrowMergeQuestion = (borrow: boolean): Question => ({
  type: 'two3.borrowMerge',
  prompt: 'Borrow_Or_Merge(y): does y borrow a child from its sibling x, or merge with it?',
  answer: { kind: 'choice', value: borrow ? 'borrow' : 'merge', options: ['borrow', 'merge'] },
  explain: borrow
    ? 'The sibling x has three children (x.right ≠ NIL), so it can give one to y.'
    : 'The sibling x has only two children (x.right = NIL), so y and x merge into one node.',
});

export const minimumQuestion = (t: Tree, first: NodeId): Question =>
  nodeQuestion('two3.minimum', 'Which leaf will 2_3_Minimum(T) return?', first, fmtKey(t.nodes[first].key), false,
    'The leaves are sorted, so the minimum is the first leaf after the −∞ sentinel.');

export const successorQuestion = (t: Tree, x: NodeId, answer: NodeId | null): Question =>
  nodeQuestion('two3.successor', `Which leaf will 2_3_Successor(x) return for the leaf with key ${fmtKey(t.nodes[x].key)}?`, answer,
    answer === null ? 'NIL' : fmtKey(t.nodes[answer].key), true,
    answer === null
      ? `${fmtKey(t.nodes[x].key)} is the largest key; the next leaf is the +∞ sentinel, so the procedure returns NIL.`
      : `${fmtKey(t.nodes[answer].key)} is the smallest key greater than ${fmtKey(t.nodes[x].key)}.`);
```

- [ ] **Step 5: Implement `primitives.ts` and `init.ts`**

`src/structures/two-three/primitives.ts`:

```ts
import type { NodeId } from '../../engine/tree';
import { fmtKey } from '../../engine/twoThree';
import type { TreeTracer } from '../tracer';
import type { TwoThreeView } from '../types';
import { SET_CHILDREN, UPDATE_KEY } from './pseudocode';

export type TT = TreeTracer<TwoThreeView>;

// A node as the variables line shows it: its key, NIL, or "deleted".
export function lab(tr: TT, id: NodeId | null): string {
  if (id === null) return 'NIL';
  const n = tr.tree.nodes[id];
  return n === undefined ? 'deleted' : fmtKey(n.key);
}

// Runs a callee in its own variables and call-stack frame, then restores the caller's.
export function inFrame<R>(tr: TT, frame: string, ptr: Record<string, NodeId | null>, body: () => R): R {
  const saved = { ptr: tr.ptr, extra: tr.extra, stack: tr.stack };
  tr.stack = [...tr.stack, frame];
  tr.ptr = ptr;
  tr.extra = {};
  const out = body();
  tr.ptr = saved.ptr;
  tr.extra = saved.extra;
  tr.stack = saved.stack;
  return out;
}

// After "delete y" the variable still exists in the lecture, but there is no node to point at.
export function dropVar(tr: TT, name: string): void {
  tr.ptr = Object.fromEntries(Object.entries(tr.ptr).filter(([n]) => n !== name));
}

export function traceUpdateKey(tr: TT, x: NodeId): void {
  const T = tr.tree;
  inFrame(tr, 'Update_Key(x)', { x }, () => {
    const n = T.nodes[x];
    n.key = T.nodes[n.left!].key;
    tr.emit(UPDATE_KEY, 1, { nodes: [x], edges: [n.left!], note: `x.key = x.left.key = ${fmtKey(n.key)}.` });
    const hasMiddle = (n.middle ?? null) !== null;
    tr.emit(UPDATE_KEY, 2, { nodes: [x], note: hasMiddle ? 'x.middle ≠ NIL.' : 'x.middle = NIL.' });
    if (hasMiddle) {
      n.key = T.nodes[n.middle!].key;
      tr.emit(UPDATE_KEY, 3, { nodes: [x], edges: [n.middle!], note: `x.key = x.middle.key = ${fmtKey(n.key)}.` });
    }
    const hasRight = n.right !== null;
    tr.emit(UPDATE_KEY, 4, { nodes: [x], note: hasRight ? 'x.right ≠ NIL.' : 'x.right = NIL.' });
    if (hasRight) {
      n.key = T.nodes[n.right!].key;
      tr.emit(UPDATE_KEY, 5, { nodes: [x], edges: [n.right!], note: `x.key = x.right.key = ${fmtKey(n.key)}.` });
    }
  });
}

export function traceSetChildren(tr: TT, x: NodeId, l: NodeId, m: NodeId | null, r: NodeId | null): void {
  const T = tr.tree;
  inFrame(tr, 'Set_Children(x, ℓ, m, r)', { x, 'ℓ': l, m, r }, () => {
    const n = T.nodes[x];
    n.left = l;
    n.middle = m;
    n.right = r;
    tr.emit(SET_CHILDREN, 1, {
      nodes: [x],
      edges: [l, m, r].filter((c): c is NodeId => c !== null),
      note: 'x gets the children ℓ, m and r.',
    });
    T.nodes[l].p = x;
    tr.emit(SET_CHILDREN, 2, { nodes: [l, x], note: 'ℓ.p = x.' });
    tr.emit(SET_CHILDREN, 3, { note: m === null ? 'm = NIL.' : 'm ≠ NIL.' });
    if (m !== null) {
      T.nodes[m].p = x;
      tr.emit(SET_CHILDREN, 4, { nodes: [m, x], note: 'm.p = x.' });
    }
    tr.emit(SET_CHILDREN, 5, { note: r === null ? 'r = NIL.' : 'r ≠ NIL.' });
    if (r !== null) {
      T.nodes[r].p = x;
      tr.emit(SET_CHILDREN, 6, { nodes: [r, x], note: 'r.p = x.' });
    }
    tr.emit(SET_CHILDREN, 7, { nodes: [x], note: 'Update_Key(x).' });
    traceUpdateKey(tr, x);
  });
}

// The call line of a procedure that calls Set_Children, then Set_Children itself.
export function callSetChildren(
  tr: TT, proc: string, line: number, x: NodeId, l: NodeId, m: NodeId | null, r: NodeId | null,
): void {
  tr.emit(proc, line, {
    nodes: [x],
    edges: [l, m, r].filter((c): c is NodeId => c !== null),
    note: `Set_Children with the children ${[l, m, r].map((c) => lab(tr, c)).join(', ')}.`,
  });
  traceSetChildren(tr, x, l, m, r);
}
```

`src/structures/two-three/init.ts`:

```ts
import { emptyTree } from '../../engine/tree';
import { newInternal, newLeaf } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import type { TwoThreeStep } from '../types';
import { TT_INIT } from './pseudocode';

// 2_3_Init(T): builds the sentinel-only tree from nothing, so the tree on screen is ignored.
export function runInit(): TwoThreeStep[] {
  const tr = createTwoThreeTracer(emptyTree());
  const T = tr.tree;
  tr.showRoot = true;
  tr.stack = ['2_3_Init(T)'];
  tr.emit(TT_INIT, 0, { note: '2_3_Init(T): create an empty 2-3 tree.' });
  const x = newInternal(T);
  tr.ptr = { x };
  tr.emit(TT_INIT, 1, { nodes: [x], note: 'New internal node x; its attributes are NIL.' });
  const l = newLeaf(T);
  const m = newLeaf(T);
  tr.ptr = { x, 'ℓ': l, m };
  tr.emit(TT_INIT, 2, { nodes: [l, m], note: 'New leaves ℓ and m; their attributes are NIL.' });
  T.nodes[l].key = -Infinity;
  tr.emit(TT_INIT, 3, { nodes: [l], note: 'ℓ.key = −∞.' });
  T.nodes[m].key = Infinity;
  tr.emit(TT_INIT, 4, { nodes: [m], note: 'm.key = +∞.' });
  T.nodes[l].p = x;
  T.nodes[m].p = x;
  tr.emit(TT_INIT, 5, { nodes: [l, m, x], note: 'ℓ.p = m.p = x.' });
  T.nodes[x].key = Infinity;
  tr.emit(TT_INIT, 6, { nodes: [x], note: 'x.key = +∞.' });
  T.nodes[x].left = l;
  tr.emit(TT_INIT, 7, { nodes: [x], edges: [l], note: 'x.left = ℓ.' });
  T.nodes[x].middle = m;
  tr.emit(TT_INIT, 8, { nodes: [x], edges: [m], note: 'x.middle = m.' });
  T.root = x;
  tr.emit(TT_INIT, 9, { nodes: [x], note: 'T.root = x.' });
  return tr.steps;
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/structures/two-three && npx tsc --noEmit`
Expected: all PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/structures/two-three
git commit -m "feat(two-three): pseudocode, questions, Set_Children, Update_Key and 2_3_Init traces" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `2_3_Search`, `2_3_Minimum`, `2_3_Successor`

**Files:**
- Create: `src/structures/two-three/queries.ts`, `queries.test.ts`, `predictable.ts`

**Interfaces:**
- Consumes: Tasks 1–3 (`createTwoThreeTracer`, `lab`, `searchQuestion`, `minimumQuestion`, `successorQuestion`, `childToward`, pseudocode constants, `findLeaf`, `realLeaves`, `fromShape`, `SLIDE_18`, `initTree`).
- Produces: `runSearch(t, k)`, `runMinimum(t)`, `runSuccessor(t, k)` (all `(Tree, …) => TwoThreeStep[]`, none mutates its input; `runSuccessor` requires a real leaf with key `k`); `checkTwoThreePredictable(steps: TwoThreeStep[]): void` (handles every `two3.*` question type, used by Tasks 5–7).

- [ ] **Step 1: Write `predictable.ts` (test helper) and the failing tests**

`src/structures/two-three/predictable.ts`:

```ts
import { assertQuestionsPredictable } from '../../algorithms/testing';
import { realLeaves } from '../../engine/twoThree';
import type { TwoThreeStep } from '../types';
import { childToward, WHERE } from './questions';

// Every question must be answerable from the step shown before it, and that step's note must not give it away.
export function checkTwoThreePredictable(steps: TwoThreeStep[]): void {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    const T = prev.view.tree;
    const tags = step.view.tags;
    switch (q.type) {
      case 'two3.search':
        expect(q.answer.value).toBe(childToward(T, tags.x, step.vars.k as number, false));
        break;
      case 'two3.insertWalk':
        expect(q.answer.value).toBe(childToward(T, tags.y, T.nodes[tags.z].key, true));
        break;
      case 'two3.split':
        expect(q.answer).toEqual({ kind: 'yesno', value: T.nodes[tags.x].right != null });
        expect(prev.note ?? '').not.toMatch(/two children|three children|r == NIL|r ≠ NIL/);
        break;
      case 'two3.where': {
        const n = T.nodes[tags.x];
        const zk = T.nodes[tags.z].key;
        const want = zk < T.nodes[n.left!].key ? WHERE[0] : zk < T.nodes[n.middle!].key ? WHERE[1] : WHERE[2];
        expect(q.answer.value).toBe(want);
        break;
      }
      case 'two3.borrowMerge': {
        const y = T.nodes[tags.y];
        const z = T.nodes[y.p!];
        const sibling = y.id === z.left ? z.middle! : y.id === z.middle ? z.left! : z.middle!;
        expect(q.answer.value).toBe(T.nodes[sibling].right != null ? 'borrow' : 'merge');
        expect(prev.line).toBe(14);
        expect(prev.note).toBe('y = Borrow_Or_Merge(y).');
        break;
      }
      case 'two3.minimum':
        expect(prev.line).toBe(0);
        expect(q.answer.kind === 'node' && q.answer.value).toBe(realLeaves(T)[0]);
        break;
      case 'two3.successor': {
        const order = realLeaves(T);
        expect(prev.line).toBe(0);
        expect(q.answer.kind === 'node' && q.answer.value).toBe(order[order.indexOf(tags.x) + 1] ?? null);
        break;
      }
      default:
        throw new Error(`unexpected ${q.type}`);
    }
  });
}
```

`src/structures/two-three/queries.test.ts`:

```ts
import { findLeaf, initTree } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import type { TwoThreeStep } from '../types';
import { checkTwoThreePredictable } from './predictable';
import { twoThreeProcs } from './pseudocode';
import { runMinimum, runSearch, runSuccessor } from './queries';
import { fromShape, SLIDE_18 } from './testing';

const def = { procs: twoThreeProcs };
const slide18 = () => fromShape(SLIDE_18);
const last = (s: TwoThreeStep[]) => s[s.length - 1];
const lines = (s: TwoThreeStep[]) => s.map((x) => x.line);
const answers = (s: TwoThreeStep[], type: string) => s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);

test('2_3_Search 14 on slide 18: left, middle, right, then the leaf', () => {
  const steps = runSearch(slide18(), 14);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['2_3_Search', 0]);
  expect(answers(steps, 'two3.search')).toEqual(['left child', 'middle child', 'right child']);
  expect(lines(steps)).toEqual([0, 1, 5, 6, 1, 5, 7, 8, 1, 5, 7, 9, 1, 2, 3]);
  expect(last(steps).note).toBe('Returns the leaf with key 14.');
  expect(last(steps).ds[0]).toEqual({
    kind: 'stack',
    name: 'Call stack',
    items: ['2_3_Search(+∞, 14)', '2_3_Search(14, 14)', '2_3_Search(14, 14)', '2_3_Search(14, 14)'],
  });
  checkTwoThreePredictable(steps);
});

test('2_3_Search offers only the left and middle child at a node with two children', () => {
  const steps = runSearch(slide18(), 14);
  const first = steps.find((s) => s.question)!.question!;
  expect(first.answer).toMatchObject({ kind: 'choice', options: ['left child', 'middle child'] });
  const third = steps.filter((s) => s.question)[2].question!;
  expect(third.answer).toMatchObject({ options: ['left child', 'middle child', 'right child'] });
});

test('2_3_Search for an absent key and for a key beyond the largest return NIL', () => {
  const t = slide18();
  const absent = runSearch(t, 13);
  expect(answers(absent, 'two3.search')).toEqual(['left child', 'middle child', 'right child']);
  expect(last(absent).note).toBe('Returns NIL: no leaf has key 13.');
  expect(last(absent).line).toBe(4);
  const beyond = runSearch(t, 30);
  expect(answers(beyond, 'two3.search')).toEqual(['middle child', 'middle child', 'right child']);
  expect(last(beyond).note).toBe('Returns NIL: no leaf has key 30.');
  checkTwoThreePredictable(absent);
  checkTwoThreePredictable(beyond);
});

test('2_3_Search on the empty tree and with negative keys', () => {
  const empty = runSearch(initTree(), 5);
  expect(answers(empty, 'two3.search')).toEqual(['middle child']);
  expect(last(empty).note).toBe('Returns NIL: no leaf has key 5.');
  expect(last(runSearch(slide18(), -3)).note).toBe('Returns NIL: no leaf has key -3.');
});

test('queries leave the tree unchanged', () => {
  const t = slide18();
  const before = structuredClone(t);
  runSearch(t, 7);
  runMinimum(t);
  runSuccessor(t, 4);
  expect(t).toEqual(before);
});

test('2_3_Minimum on slide 18 walks left to the −∞ sentinel, then steps to its sibling', () => {
  const t = slide18();
  const steps = runMinimum(t);
  assertValidTreeTrace(def, steps);
  expect(lines(steps)).toEqual([0, 1, 2, 3, 2, 3, 2, 3, 2, 4, 5, 6]);
  expect(answers(steps, 'two3.minimum')).toEqual([findLeaf(t, 1)]);
  expect(last(steps).note).toBe('Returns the leaf with key 1.');
  expect(steps[1].vars['T.root']).toBe(Infinity);
  checkTwoThreePredictable(steps);
});

test('2_3_Minimum on an empty tree runs to the error on line 7 and asks nothing', () => {
  const steps = runMinimum(initTree());
  assertValidTreeTrace(def, steps);
  expect(lines(steps)).toEqual([0, 1, 2, 3, 2, 4, 5, 7]);
  expect(last(steps).note).toBe('error: T is empty');
  expect(steps.some((s) => s.question)).toBe(false);
});

test('2_3_Successor by climbing and by descending: 4 → 5, 14 → 19', () => {
  const t = slide18();
  const s4 = runSuccessor(t, 4);
  assertValidTreeTrace(def, s4);
  expect(lines(s4)).toEqual([0, 1, 2, 3, 4, 2, 5, 6, 8, 9, 8, 10, 11]);
  expect(answers(s4, 'two3.successor')).toEqual([findLeaf(t, 5)]);
  expect(last(s4).note).toBe('Returns the leaf with key 5.');
  const s14 = runSuccessor(t, 14);
  expect(lines(s14)).toEqual([0, 1, 2, 3, 4, 2, 3, 4, 2, 5, 6, 8, 9, 8, 9, 8, 10, 11]);
  expect(answers(s14, 'two3.successor')).toEqual([findLeaf(t, 19)]);
  checkTwoThreePredictable(s4);
  checkTwoThreePredictable(s14);
});

test('2_3_Successor of the largest key reaches the +∞ sentinel and returns NIL', () => {
  const steps = runSuccessor(slide18(), 29);
  expect(lines(steps)).toEqual([0, 1, 2, 5, 7, 8, 10, 12]);
  expect(answers(steps, 'two3.successor')).toEqual([null]);
  expect(last(steps).note).toBe('Returns NIL: x has the largest key.');
  checkTwoThreePredictable(steps);
});

test('2_3_Successor of every real key matches the next key in order', () => {
  const t = slide18();
  const keys = [1, 4, 5, 7, 14, 19, 22, 25, 29];
  keys.forEach((k, i) => {
    const steps = runSuccessor(t, k);
    expect(answers(steps, 'two3.successor')).toEqual([i + 1 < keys.length ? findLeaf(t, keys[i + 1]) : null]);
    checkTwoThreePredictable(steps);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/two-three/queries.test.ts`
Expected: FAIL, unresolved import `./queries`.

- [ ] **Step 3: Implement `queries.ts`**

```ts
import type { NodeId, Tree } from '../../engine/tree';
import { findLeaf, fmtKey, realLeaves } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import type { TwoThreeStep } from '../types';
import { lab } from './primitives';
import { TT_MINIMUM, TT_SEARCH, TT_SUCCESSOR } from './pseudocode';
import { minimumQuestion, searchQuestion, successorQuestion } from './questions';

export function runSearch(t0: Tree, k: number): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.extra = { k };
  let x: NodeId = T.root!;
  tr.ptr = { x };
  tr.stack = [`2_3_Search(${lab(tr, x)}, ${k})`];
  tr.emit(TT_SEARCH, 0, { nodes: [x], note: `2_3_Search(T.root, ${k})` });
  for (;;) {
    tr.ptr = { x };
    const n = T.nodes[x];
    const leaf = n.leaf === true;
    tr.emit(TT_SEARCH, 1, {
      bigStep: true,
      nodes: [x],
      note: leaf ? 'x is a leaf.' : 'x is not a leaf.',
      question: leaf ? undefined : searchQuestion(T, x, k),
    });
    if (leaf) {
      const hit = n.key === k;
      tr.emit(TT_SEARCH, 2, { nodes: [x], note: `x.key = ${fmtKey(n.key)} ${hit ? '==' : '≠'} k = ${k}.` });
      if (hit) tr.emit(TT_SEARCH, 3, { nodes: [x], note: `Returns the leaf with key ${k}.` });
      else tr.emit(TT_SEARCH, 4, { nodes: [x], note: `Returns NIL: no leaf has key ${k}.` });
      return tr.steps;
    }
    const [l, m, r] = [n.left!, n.middle!, n.right];
    const goLeft = k <= T.nodes[l].key;
    tr.emit(TT_SEARCH, 5, {
      nodes: [x], edges: [l], note: `k = ${k} ${goLeft ? '≤' : '>'} x.left.key = ${fmtKey(T.nodes[l].key)}.`,
    });
    let next: NodeId;
    let line: number;
    let side: string;
    if (goLeft) {
      next = l; line = 6; side = 'left';
    } else {
      const goMiddle = k <= T.nodes[m!].key;
      tr.emit(TT_SEARCH, 7, {
        nodes: [x], edges: [m!], note: `k = ${k} ${goMiddle ? '≤' : '>'} x.middle.key = ${fmtKey(T.nodes[m!].key)}.`,
      });
      if (goMiddle) { next = m!; line = 8; side = 'middle'; } else { next = r!; line = 9; side = 'right'; }
    }
    tr.emit(TT_SEARCH, line, { nodes: [x], edges: [next], note: `Recursive call on the ${side} child.` });
    tr.stack = [...tr.stack, `2_3_Search(${lab(tr, next)}, ${k})`];
    x = next;
  }
}

export function runMinimum(t0: Tree): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.showRoot = true;
  tr.stack = ['2_3_Minimum(T)'];
  const first = realLeaves(T)[0] ?? null;
  tr.emit(TT_MINIMUM, 0, { note: '2_3_Minimum(T)' });
  let x: NodeId = T.root!;
  tr.ptr = { x };
  tr.emit(TT_MINIMUM, 1, {
    nodes: [x],
    note: 'x = T.root.',
    question: first === null ? undefined : minimumQuestion(T, first),
  });
  for (;;) {
    const leaf = T.nodes[x].leaf === true;
    tr.emit(TT_MINIMUM, 2, { bigStep: true, nodes: [x], note: leaf ? 'x is a leaf, so the loop ends.' : 'x is not a leaf.' });
    if (leaf) break;
    x = T.nodes[x].left!;
    tr.ptr = { x };
    tr.emit(TT_MINIMUM, 3, { nodes: [x], edges: [x] });
  }
  x = T.nodes[T.nodes[x].p!].middle!;
  tr.ptr = { x };
  tr.emit(TT_MINIMUM, 4, { nodes: [x], note: 'x = x.p.middle: past the −∞ sentinel.' });
  const real = T.nodes[x].key !== Infinity;
  tr.emit(TT_MINIMUM, 5, { nodes: [x], note: real ? `x.key = ${fmtKey(T.nodes[x].key)} ≠ +∞.` : 'x.key = +∞.' });
  if (real) tr.emit(TT_MINIMUM, 6, { nodes: [x], note: `Returns the leaf with key ${fmtKey(T.nodes[x].key)}.` });
  else tr.emit(TT_MINIMUM, 7, { note: 'error: T is empty' });
  return tr.steps;
}

// x is the real leaf with key k.
export function runSuccessor(t0: Tree, k: number): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  const x0 = findLeaf(T, k)!;
  const order = realLeaves(T);
  const answer = order[order.indexOf(x0) + 1] ?? null;
  let x = x0;
  tr.ptr = { x };
  tr.stack = ['2_3_Successor(x)'];
  tr.emit(TT_SUCCESSOR, 0, { nodes: [x], note: `2_3_Successor(x) for the leaf with key ${k}` });
  let z = T.nodes[x].p!;
  tr.ptr = { x, z };
  tr.emit(TT_SUCCESSOR, 1, { nodes: [x, z], note: 'z = x.p.', question: successorQuestion(T, x, answer) });
  for (;;) {
    const zn = T.nodes[z];
    const climb = x === zn.right || (zn.right === null && x === zn.middle);
    tr.emit(TT_SUCCESSOR, 2, {
      bigStep: true, nodes: [x, z], note: climb ? 'x is the last child of z: keep climbing.' : 'x is not the last child of z.',
    });
    if (!climb) break;
    x = z;
    tr.ptr = { x, z };
    tr.emit(TT_SUCCESSOR, 3, { nodes: [x] });
    z = T.nodes[z].p!;
    tr.ptr = { x, z };
    tr.emit(TT_SUCCESSOR, 4, { nodes: [x, z] });
  }
  const fromLeft = x === T.nodes[z].left;
  tr.emit(TT_SUCCESSOR, 5, { nodes: [x, z], note: fromLeft ? 'x == z.left.' : 'x ≠ z.left.' });
  let y: NodeId;
  if (fromLeft) {
    y = T.nodes[z].middle!;
    tr.ptr = { x, z, y };
    tr.emit(TT_SUCCESSOR, 6, { nodes: [y], edges: [y] });
  } else {
    y = T.nodes[z].right!;
    tr.ptr = { x, z, y };
    tr.emit(TT_SUCCESSOR, 7, { nodes: [y], edges: [y] });
  }
  for (;;) {
    const leaf = T.nodes[y].leaf === true;
    tr.emit(TT_SUCCESSOR, 8, { bigStep: true, nodes: [y], note: leaf ? 'y is a leaf, so the loop ends.' : 'y is not a leaf.' });
    if (leaf) break;
    y = T.nodes[y].left!;
    tr.ptr = { x, z, y };
    tr.emit(TT_SUCCESSOR, 9, { nodes: [y], edges: [y] });
  }
  const real = T.nodes[y].key < Infinity;
  tr.emit(TT_SUCCESSOR, 10, { nodes: [y], note: real ? `y.key = ${fmtKey(T.nodes[y].key)} < +∞.` : 'y.key = +∞.' });
  if (real) tr.emit(TT_SUCCESSOR, 11, { nodes: [y], note: `Returns the leaf with key ${fmtKey(T.nodes[y].key)}.` });
  else tr.emit(TT_SUCCESSOR, 12, { nodes: [y], note: 'Returns NIL: x has the largest key.' });
  return tr.steps;
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx vitest run src/structures/two-three && npx tsc --noEmit`
Expected: all PASS, no type errors. The expected line sequences were derived by hand from the slide pseudocode (for example Successor of 14: `z = x.p`; two climbs; then `y = z.middle` and two descents); if one differs, retrace the slide by hand before changing the implementation.

- [ ] **Step 5: Commit**

```bash
git add src/structures/two-three
git commit -m "feat(two-three): 2_3_Search, 2_3_Minimum and 2_3_Successor traces" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `2_3_Insert` with `Insert_And_Split`

**Files:**
- Create: `src/structures/two-three/insert.ts`, `insert.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4 (`createTwoThreeTracer`, `inFrame`, `callSetChildren`, `traceSetChildren`, `traceUpdateKey`, `newLeaf`, `newInternal`, `insertWalkQuestion`, `splitQuestion`, `whereQuestion`, pseudocode constants, `checkTwoThreePredictable`, `fromShape`, `shapeOf`, `isTwoThree`, `initTree`, `realKeys`).
- Produces: `traceInsertAndSplit(tr: TT, x: NodeId, z: NodeId): NodeId | null` (returns the new right sibling `y`, or `null`), `runInsert(t: Tree, k: number): TwoThreeStep[]` (requires `k` not already a key and a non-full tree; the definition's `validate` guarantees both).

- [ ] **Step 1: Write the failing tests**

Create `src/structures/two-three/insert.test.ts`:

```ts
import { mulberry32 } from '../../algorithms/sssp/reference';
import { initTree, isTwoThree, realKeys } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import type { TwoThreeStep } from '../types';
import { runInsert } from './insert';
import { checkTwoThreePredictable } from './predictable';
import { twoThreeProcs } from './pseudocode';
import { fromShape, SLIDE_18, shapeOf } from './testing';

const def = { procs: twoThreeProcs };
const slide18 = () => fromShape(SLIDE_18);
const last = (s: TwoThreeStep[]) => s[s.length - 1];
const result = (s: TwoThreeStep[]) => last(s).view.tree;
const answers = (s: TwoThreeStep[], type: string) => s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);
const used = (s: TwoThreeStep[], proc: string, line: number) => s.some((x) => x.proc === proc && x.line === line);

test('insert 6 into slide 18: a split in the middle branch (lines 13–15), no root change', () => {
  const steps = runInsert(slide18(), 6);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['2_3_Insert', 0]);
  expect(answers(steps, 'two3.insertWalk')).toEqual(['left child', 'middle child', 'middle child']);
  expect(answers(steps, 'two3.split')).toEqual([true, false]);
  expect(answers(steps, 'two3.where')).toEqual(['after m']);
  expect(used(steps, 'Insert_And_Split', 14)).toBe(true);
  expect(used(steps, 'Insert_And_Split', 15)).toBe(true);
  expect(shapeOf(result(steps))).toBe('(((-inf 1 4) (5 6) (7 14)) ((19 22) (25 29 +inf)))');
  expect([last(steps).proc, last(steps).line]).toEqual(['2_3_Insert', 13]);
  checkTwoThreePredictable(steps);
});

test('insert 23 into slide 18: the "z before ℓ" split branch (lines 10–12)', () => {
  const steps = runInsert(slide18(), 23);
  expect(answers(steps, 'two3.insertWalk')).toEqual(['middle child', 'middle child', 'left child']);
  expect(answers(steps, 'two3.split')).toEqual([true, false]);
  expect(answers(steps, 'two3.where')).toEqual(['after m']);
  expect(used(steps, 'Insert_And_Split', 11)).toBe(true);
  expect(used(steps, 'Insert_And_Split', 12)).toBe(true);
  expect(shapeOf(result(steps))).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (23 25) (29 +inf)))');
  checkTwoThreePredictable(steps);
});

test('insert 2 and 30: the "z before r" branch (lines 16–18)', () => {
  const two = runInsert(slide18(), 2);
  expect(used(two, 'Insert_And_Split', 17)).toBe(true);
  expect(used(two, 'Insert_And_Split', 18)).toBe(true);
  expect(answers(two, 'two3.where')).toEqual(['between ℓ and m']);
  expect(shapeOf(result(two))).toBe('(((-inf 1) (2 4) (5 7 14)) ((19 22) (25 29 +inf)))');
  const thirty = runInsert(slide18(), 30);
  expect(used(thirty, 'Insert_And_Split', 17)).toBe(true);
  expect(shapeOf(result(thirty))).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (25 29) (30 +inf)))');
  checkTwoThreePredictable(two);
  checkTwoThreePredictable(thirty);
});

test('insert -5 and 100 next to the sentinels, and 20 without any split', () => {
  expect(shapeOf(result(runInsert(slide18(), -5)))).toBe('(((-inf -5) (1 4) (5 7 14)) ((19 22) (25 29 +inf)))');
  expect(shapeOf(result(runInsert(slide18(), 100)))).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (25 29) (100 +inf)))');
  const twenty = runInsert(slide18(), 20);
  expect(answers(twenty, 'two3.split')).toEqual([false]);
  expect(answers(twenty, 'two3.where')).toEqual(['between ℓ and m']);
  expect(used(twenty, 'Insert_And_Split', 6)).toBe(true);
  expect(shapeOf(result(twenty))).toBe('(((-inf 1 4) (5 7 14)) ((19 20 22) (25 29 +inf)))');
});

test('a split that cascades through the root (lines 19–20) makes the tree grow one level (lines 14–16)', () => {
  const t = fromShape([[-Infinity, 1], [2, 3], [4, 5, Infinity]]);
  const steps = runInsert(t, 6);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'two3.insertWalk')).toEqual(['right child', 'right child']);
  expect(answers(steps, 'two3.split')).toEqual([true, true]);
  expect(used(steps, 'Insert_And_Split', 19)).toBe(true);
  expect(used(steps, 'Insert_And_Split', 20)).toBe(true);
  for (const line of [14, 15, 16]) expect(used(steps, '2_3_Insert', line)).toBe(true);
  expect(shapeOf(result(steps))).toBe('(((-inf 1) (2 3)) ((4 5) (6 +inf)))');
  expect(isTwoThree(result(steps))).toBe(true);
  checkTwoThreePredictable(steps);
});

test('the first key into an empty tree goes between the sentinels', () => {
  const steps = runInsert(initTree(), 5);
  expect(answers(steps, 'two3.insertWalk')).toEqual(['middle child']);
  expect(answers(steps, 'two3.split')).toEqual([false]);
  expect(answers(steps, 'two3.where')).toEqual(['between ℓ and m']);
  expect(shapeOf(result(steps))).toBe('(-inf 5 +inf)');
  expect(isTwoThree(result(steps))).toBe(true);
  checkTwoThreePredictable(steps);
});

test('call stack and variables: Set_Children and Update_Key run inside Insert_And_Split; T.root is tagged; z becomes NIL', () => {
  const t = slide18();
  const steps = runInsert(t, 20);
  const sc = steps.find((s) => s.proc === 'Set_Children' && s.line === 1)!;
  expect(sc.ds[0]).toMatchObject({ items: ['2_3_Insert(T, z)', 'Insert_And_Split(x, z)', 'Set_Children(x, ℓ, m, r)'] });
  const uk = steps.find((s) => s.proc === 'Update_Key')!;
  expect(uk.ds[0]).toMatchObject({ items: ['2_3_Insert(T, z)', 'Insert_And_Split(x, z)', 'Set_Children(x, ℓ, m, r)', 'Update_Key(x)'] });
  expect(steps.every((s) => s.vars['T.root'] === Infinity && s.view.tags['T.root'] === t.root)).toBe(true);
  const afterSplit = steps.find((s) => s.proc === '2_3_Insert' && s.line === 8 && s.vars.z === null)!;
  expect(afterSplit).toBeDefined(); // z = Insert_And_Split(x, z) returned NIL
  expect(steps[0].view.tree.nodes[steps[0].view.tags.z].leaf).toBe(true);
});

test('insert does not mutate its input, and a new leaf is detached until Set_Children links it', () => {
  const t = slide18();
  const before = structuredClone(t);
  const steps = runInsert(t, 20);
  expect(t).toEqual(before);
  const z = steps[0].view.tags.z;
  expect(steps[0].view.tree.nodes[z]).toMatchObject({ leaf: true, key: 20, p: null });
});

test('random inserts keep a valid 2-3 tree with exactly the inserted keys, and every question is predictable', () => {
  const rand = mulberry32(3);
  let t = initTree();
  const model = new Set<number>();
  for (let n = 0; n < 150; n++) {
    const k = Math.floor(rand() * 60) - 20;
    if (model.has(k)) continue;
    const steps = runInsert(t, k);
    assertValidTreeTrace(def, steps);
    checkTwoThreePredictable(steps);
    t = result(steps);
    model.add(k);
    expect(isTwoThree(t)).toBe(true);
    expect(realKeys(t)).toEqual([...model].sort((a, b) => a - b));
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/two-three/insert.test.ts`
Expected: FAIL, unresolved import `./insert`.

- [ ] **Step 3: Implement `insert.ts`**

```ts
import type { NodeId, Tree } from '../../engine/tree';
import { fmtKey, newInternal, newLeaf } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import type { TwoThreeStep } from '../types';
import { callSetChildren, inFrame, traceSetChildren, traceUpdateKey, type TT } from './primitives';
import { INSERT_AND_SPLIT, TT_INSERT } from './pseudocode';
import { insertWalkQuestion, splitQuestion, whereQuestion } from './questions';

const IAS = INSERT_AND_SPLIT;

// Insert z as a child of x; returns the new node y when x had to split, otherwise NIL.
export function traceInsertAndSplit(tr: TT, x: NodeId, z: NodeId): NodeId | null {
  const T = tr.tree;
  return inFrame(tr, 'Insert_And_Split(x, z)', { x, z }, () => {
    const n = T.nodes[x];
    const [l, m, r] = [n.left!, n.middle!, n.right];
    const zk = T.nodes[z].key;
    const frame: Record<string, NodeId | null> = { x, z, 'ℓ': l, m, r };
    tr.ptr = frame;
    tr.emit(IAS, 1, {
      bigStep: true,
      nodes: [x],
      edges: [l, m, ...(r === null ? [] : [r])],
      note: '⟨ℓ, m, r⟩ = the children of x.',
      question: splitQuestion(r !== null),
    });
    tr.emit(IAS, 2, { nodes: [x], note: r === null ? 'r == NIL: x has only two children.' : 'r ≠ NIL: x has three children.' });

    if (r === null) {
      const beforeL = zk < T.nodes[l].key;
      tr.emit(IAS, 3, {
        nodes: [z, l],
        note: `z.key = ${fmtKey(zk)} ${beforeL ? '<' : '>'} ℓ.key = ${fmtKey(T.nodes[l].key)}.`,
        question: whereQuestion(T, x, z),
      });
      if (beforeL) {
        callSetChildren(tr, IAS, 4, x, z, l, m);
      } else {
        const beforeM = zk < T.nodes[m].key;
        tr.emit(IAS, 5, { nodes: [z, m], note: `z.key = ${fmtKey(zk)} ${beforeM ? '<' : '>'} m.key = ${fmtKey(T.nodes[m].key)}.` });
        if (beforeM) callSetChildren(tr, IAS, 6, x, l, z, m);
        else callSetChildren(tr, IAS, 7, x, l, m, z);
      }
      tr.emit(IAS, 8, { nodes: [x], note: 'Returns NIL: x did not split.' });
      return null;
    }

    const y = newInternal(T);
    tr.ptr = { ...frame, y };
    tr.emit(IAS, 9, { nodes: [y], note: 'New internal node y, the right half of the split.' });
    const lt = (a: NodeId) => zk < T.nodes[a].key;
    tr.emit(IAS, 10, { nodes: [z, l], note: `z.key = ${fmtKey(zk)} ${lt(l) ? '<' : '>'} ℓ.key = ${fmtKey(T.nodes[l].key)}.` });
    if (lt(l)) {
      callSetChildren(tr, IAS, 11, x, z, l, null);
      callSetChildren(tr, IAS, 12, y, m, r, null);
    } else {
      tr.emit(IAS, 13, { nodes: [z, m], note: `z.key = ${fmtKey(zk)} ${lt(m) ? '<' : '>'} m.key = ${fmtKey(T.nodes[m].key)}.` });
      if (lt(m)) {
        callSetChildren(tr, IAS, 14, x, l, z, null);
        callSetChildren(tr, IAS, 15, y, m, r, null);
      } else {
        tr.emit(IAS, 16, { nodes: [z, r], note: `z.key = ${fmtKey(zk)} ${lt(r) ? '<' : '>'} r.key = ${fmtKey(T.nodes[r].key)}.` });
        if (lt(r)) {
          callSetChildren(tr, IAS, 17, x, l, m, null);
          callSetChildren(tr, IAS, 18, y, z, r, null);
        } else {
          callSetChildren(tr, IAS, 19, x, l, m, null);
          callSetChildren(tr, IAS, 20, y, r, z, null);
        }
      }
    }
    tr.emit(IAS, 21, { nodes: [y], note: 'Returns y, the new right sibling of x.' });
    return y;
  });
}

export function runInsert(t0: Tree, k: number): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.showRoot = true;
  const z0 = newLeaf(T, k);
  let z: NodeId | null = z0;
  tr.ptr = { z };
  tr.stack = ['2_3_Insert(T, z)'];
  tr.emit(TT_INSERT, 0, { nodes: [z0], note: `2_3_Insert(T, z) with z.key = ${k}` });
  let y: NodeId = T.root!;
  tr.ptr = { z, y };
  tr.emit(TT_INSERT, 1, { nodes: [y], note: 'y = T.root.' });
  for (;;) {
    const yn = T.nodes[y];
    const leaf = yn.leaf === true;
    tr.emit(TT_INSERT, 2, {
      bigStep: true,
      nodes: [y],
      note: leaf ? 'y is a leaf, so the loop ends.' : 'y is not a leaf.',
      question: leaf ? undefined : insertWalkQuestion(T, y, k),
    });
    if (leaf) break;
    const [l, m, r] = [yn.left!, yn.middle!, yn.right];
    if (k < T.nodes[l].key) {
      y = l;
      tr.ptr = { z, y };
      tr.emit(TT_INSERT, 3, { nodes: [y], edges: [y], note: `z.key = ${k} < y.left.key: y = y.left.` });
    } else {
      tr.emit(TT_INSERT, 3, { nodes: [y], note: `z.key = ${k} > y.left.key = ${fmtKey(T.nodes[l].key)}.` });
      if (k < T.nodes[m].key) {
        y = m;
        tr.ptr = { z, y };
        tr.emit(TT_INSERT, 4, { nodes: [y], edges: [y], note: `z.key = ${k} < y.middle.key: y = y.middle.` });
      } else {
        tr.emit(TT_INSERT, 4, { nodes: [y], note: `z.key = ${k} > y.middle.key = ${fmtKey(T.nodes[m].key)}.` });
        y = r!;
        tr.ptr = { z, y };
        tr.emit(TT_INSERT, 5, { nodes: [y], edges: [y], note: 'y = y.right.' });
      }
    }
  }
  let x: NodeId = T.nodes[y].p!;
  tr.ptr = { z, y, x };
  tr.emit(TT_INSERT, 6, { nodes: [y, x], note: 'x = y.p, the parent of the new leaf.' });
  tr.emit(TT_INSERT, 7, { nodes: [x, z0], note: 'z = Insert_And_Split(x, z).' });
  z = traceInsertAndSplit(tr, x, z0);
  for (;;) {
    tr.ptr = { z, y, x };
    const more = x !== T.root;
    tr.emit(TT_INSERT, 8, { bigStep: true, nodes: [x], note: more ? 'x ≠ T.root.' : 'x == T.root, so the loop ends.' });
    if (!more) break;
    x = T.nodes[x].p!;
    tr.ptr = { z, y, x };
    tr.emit(TT_INSERT, 9, { nodes: [x], note: 'x = x.p.' });
    tr.emit(TT_INSERT, 10, { nodes: [x], note: z !== null ? 'z ≠ NIL.' : 'z = NIL.' });
    if (z !== null) {
      tr.emit(TT_INSERT, 11, { nodes: [x, z], note: 'z = Insert_And_Split(x, z).' });
      z = traceInsertAndSplit(tr, x, z);
    } else {
      tr.emit(TT_INSERT, 12, { nodes: [x], note: 'Update_Key(x).' });
      traceUpdateKey(tr, x);
    }
  }
  tr.ptr = { z, y, x };
  tr.emit(TT_INSERT, 13, { note: z !== null ? 'z ≠ NIL: the root split.' : 'z = NIL.' });
  if (z !== null) {
    const w = newInternal(T);
    tr.ptr = { z, y, x, w };
    tr.emit(TT_INSERT, 14, { nodes: [w], note: 'New internal node w, the new root.' });
    tr.emit(TT_INSERT, 15, { nodes: [w, x, z], note: 'Set_Children(w, x, z, NIL).' });
    traceSetChildren(tr, w, x, z, null);
    T.root = w;
    tr.emit(TT_INSERT, 16, { nodes: [w], note: 'T.root = w: the tree grows one level.' });
  }
  return tr.steps;
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx vitest run src/structures/two-three && npx tsc --noEmit`
Expected: all PASS, no type errors. If a shape differs, compare against the slide code by hand (the expected shapes were checked against a plain-JavaScript transcription of the slide procedures). The step `afterSplit` assertion relies on line 8 being emitted with `z` already NIL, which holds because `tr.ptr = { z, y, x }` is rebuilt before each line-8 step.

- [ ] **Step 5: Commit**

```bash
git add src/structures/two-three
git commit -m "feat(two-three): 2_3_Insert with Insert_And_Split, including cascading splits and root growth" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `2_3_Delete` with `Borrow_Or_Merge`

**Files:**
- Create: `src/structures/two-three/delete.ts`, `delete.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5 (`createTwoThreeTracer`, `inFrame`, `dropVar`, `callSetChildren`, `traceUpdateKey`, `borrowMergeQuestion`, pseudocode constants, `findLeaf`, `checkTwoThreePredictable`, `fromShape`, `shapeOf`, `isTwoThree`, `runInsert`, `initTree`).
- Produces: `traceBorrowOrMerge(tr: TT, y: NodeId): NodeId` (returns the parent `z`), `runDelete(t: Tree, k: number): TwoThreeStep[]` (requires a real leaf with key `k`).

- [ ] **Step 1: Write the failing tests**

Create `src/structures/two-three/delete.test.ts`:

```ts
import { mulberry32 } from '../../algorithms/sssp/reference';
import { findLeaf, initTree, isTwoThree, realKeys } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import type { TwoThreeStep } from '../types';
import { runDelete } from './delete';
import { runInsert } from './insert';
import { checkTwoThreePredictable } from './predictable';
import { twoThreeProcs } from './pseudocode';
import { fromShape, SLIDE_18, shapeOf, type Shape } from './testing';

const def = { procs: twoThreeProcs };
const I = Infinity;
const slide18 = () => fromShape(SLIDE_18);
const last = (s: TwoThreeStep[]) => s[s.length - 1];
const result = (s: TwoThreeStep[]) => last(s).view.tree;
const answers = (s: TwoThreeStep[], type: string) => s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);
const linesOf = (s: TwoThreeStep[], proc: string) => s.filter((x) => x.proc === proc).map((x) => x.line);
const used = (s: TwoThreeStep[], proc: string, line: number) => s.some((x) => x.proc === proc && x.line === line);

test.each([
  [5, 3, '(((-inf 1 4) (7 14)) ((19 22) (25 29 +inf)))'],
  [7, 5, '(((-inf 1 4) (5 14)) ((19 22) (25 29 +inf)))'],
  [14, 6, '(((-inf 1 4) (5 7)) ((19 22) (25 29 +inf)))'],
])('delete %i from a three-leaf group takes the line %i branch and needs no Borrow_Or_Merge', (key, line, shape) => {
  const steps = runDelete(slide18(), key);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['2_3_Delete', 0]);
  expect(used(steps, '2_3_Delete', line)).toBe(true);
  expect(steps.some((s) => s.proc === 'Borrow_Or_Merge')).toBe(false);
  expect(steps.some((s) => s.question)).toBe(false);
  expect(shapeOf(result(steps))).toBe(shape);
  expect(isTwoThree(result(steps))).toBe(true);
  expect(last(steps).line).toBe(8); // the loop ends with y = NIL
});

test('delete 19: the group is left with one child, Borrow_Or_Merge borrows 25 from its right sibling', () => {
  const t = slide18();
  const steps = runDelete(t, 19);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'two3.borrowMerge')).toEqual(['borrow']);
  expect(linesOf(steps, 'Borrow_Or_Merge')).toEqual([1, 2, 3, 4, 5, 6, 10]);
  expect(shapeOf(result(steps))).toBe('(((-inf 1 4) (5 7 14)) ((22 25) (29 +inf)))');
  expect(steps.find((s) => s.proc === 'Borrow_Or_Merge' && s.line === 1)!.ds[0]).toMatchObject({ items: ['2_3_Delete(T, x)', 'Borrow_Or_Merge(y)'] });
  checkTwoThreePredictable(steps);
});

test('delete 22: a middle child removed from a two-leaf group also borrows', () => {
  const steps = runDelete(slide18(), 22);
  expect(used(steps, '2_3_Delete', 5)).toBe(true);
  expect(answers(steps, 'two3.borrowMerge')).toEqual(['borrow']);
  expect(shapeOf(result(steps))).toBe('(((-inf 1 4) (5 7 14)) ((19 25) (29 +inf)))');
  checkTwoThreePredictable(steps);
});

test('delete 19 then 22: two merges cascade up and the root collapses, so the tree loses a level', () => {
  const first = runDelete(slide18(), 19);
  const steps = runDelete(result(first), 22);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'two3.borrowMerge')).toEqual(['merge', 'merge']);
  expect(linesOf(steps, 'Borrow_Or_Merge')).toEqual([1, 2, 3, 4, 7, 8, 9, 10, 1, 2, 11, 12, 13, 16, 17, 18, 19]);
  for (const line of [15, 16, 17, 18]) expect(used(steps, '2_3_Delete', line)).toBe(true);
  expect([last(steps).proc, last(steps).line]).toEqual(['2_3_Delete', 18]);
  expect(shapeOf(result(steps))).toBe('((-inf 1 4) (5 7 14) (25 29 +inf))');
  expect(isTwoThree(result(steps))).toBe(true);
  expect(result(steps).nodes[result(steps).root!].p).toBeNull();
  checkTwoThreePredictable(steps);
});

const BOM_CASES: [string, Shape, number, string, string, number[]][] = [
  ['borrow from the left sibling (y is the middle child)', [[-I, 1, 2], [3, 4], [5, I]], 3, 'borrow', '((-inf 1) (2 4) (5 +inf))', [1, 2, 11, 12, 13, 14, 15, 19]],
  ['borrow from the middle sibling (y is the right child)', [[-I, 1], [2, 3, 4], [5, I]], 5, 'borrow', '((-inf 1) (2 3) (4 +inf))', [1, 2, 11, 21, 22, 23, 24, 28]],
  ['merge into the left sibling (y is the right child)', [[-I, 1], [2, 3], [5, I]], 5, 'merge', '((-inf 1) (2 3 +inf))', [1, 2, 11, 21, 22, 25, 26, 27, 28]],
  ['merge into the left sibling (y is the middle child)', [[-I, 1], [2, 3], [5, I]], 2, 'merge', '((-inf 1 3) (5 +inf))', [1, 2, 11, 12, 13, 16, 17, 18, 19]],
  ['merge with the right sibling without collapsing the root', [[-I, 1], [2, 3], [4, 5, I]], 1, 'merge', '((-inf 2 3) (4 5 +inf))', [1, 2, 3, 4, 7, 8, 9, 10]],
];

test.each(BOM_CASES)('Borrow_Or_Merge: %s', (_name, shape, key, answer, after, bomLines) => {
  const steps = runDelete(fromShape(shape), key);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'two3.borrowMerge')).toEqual([answer]);
  expect(linesOf(steps, 'Borrow_Or_Merge')).toEqual(bomLines);
  expect(shapeOf(result(steps))).toBe(after);
  expect(isTwoThree(result(steps))).toBe(true);
  expect(used(steps, '2_3_Delete', 15)).toBe(false); // no root collapse in these cases
  checkTwoThreePredictable(steps);
});

test('deleting the keys of a small tree one by one ends with only the sentinels', () => {
  let t = fromShape([[-I, 1], [2, 3, I]]);
  for (const [k, shape] of [[3, '((-inf 1) (2 +inf))'], [2, '(-inf 1 +inf)'], [1, '(-inf +inf)']] as const) {
    const steps = runDelete(t, k);
    assertValidTreeTrace(def, steps);
    checkTwoThreePredictable(steps);
    t = result(steps);
    expect(shapeOf(t)).toBe(shape);
    expect(isTwoThree(t)).toBe(true);
  }
  expect(realKeys(t)).toEqual([]);
  expect(shapeOf(result(runDelete(fromShape([[-I, 10], [20, I]]), 10)))).toBe('(-inf 20 +inf)');
});

test('delete frees the leaf at line 7 and its variable disappears; Borrow_Or_Merge runs on y', () => {
  const t = slide18();
  const x = findLeaf(t, 19)!;
  const steps = runDelete(t, 19);
  const afterLine7 = steps.find((s) => s.proc === '2_3_Delete' && s.line === 7)!;
  expect(x in afterLine7.view.tree.nodes).toBe(false);
  expect('x' in afterLine7.vars).toBe(false); // the freed leaf's variable is dropped, not left dangling
  const firstBorrowOrMerge = steps.find((s) => s.proc === 'Borrow_Or_Merge' && s.line === 1)!;
  expect(firstBorrowOrMerge.view.tags.y).toBeDefined();
});

test('delete does not mutate its input; T.root is tagged throughout', () => {
  const t = slide18();
  const before = structuredClone(t);
  const steps = runDelete(t, 19);
  expect(t).toEqual(before);
  expect(steps[0].vars['T.root']).toBe(Infinity);
});

test('random inserts and deletes keep a valid 2-3 tree with exactly the right keys, and questions are predictable', () => {
  const rand = mulberry32(9);
  let t = initTree();
  const model = new Set<number>();
  for (let n = 0; n < 300; n++) {
    const k = Math.floor(rand() * 24) - 4;
    const del = model.has(k) && rand() < 0.6;
    const steps = del ? runDelete(t, k) : model.has(k) ? null : runInsert(t, k);
    if (steps === null) continue;
    assertValidTreeTrace(def, steps);
    checkTwoThreePredictable(steps);
    t = result(steps);
    if (del) model.delete(k);
    else model.add(k);
    expect(isTwoThree(t)).toBe(true);
    expect(realKeys(t)).toEqual([...model].sort((a, b) => a - b));
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/two-three/delete.test.ts`
Expected: FAIL, unresolved import `./delete`.

- [ ] **Step 3: Implement `delete.ts`**

```ts
import type { NodeId, Tree } from '../../engine/tree';
import { findLeaf } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import type { TwoThreeStep } from '../types';
import { callSetChildren, dropVar, inFrame, traceUpdateKey, type TT } from './primitives';
import { BORROW_OR_MERGE, TT_DELETE } from './pseudocode';
import { borrowMergeQuestion } from './questions';

const BOM = BORROW_OR_MERGE;

type Lines = { pick: number; test: number; borrow1: number; borrow2: number; merge1: number; del: number; merge2: number; ret: number };

// The three branches of the slide: y is z.left (lines 3–10), z.middle (12–19) or z.right (21–28).
const LEFT: Lines = { pick: 3, test: 4, borrow1: 5, borrow2: 6, merge1: 7, del: 8, merge2: 9, ret: 10 };
const MIDDLE: Lines = { pick: 12, test: 13, borrow1: 14, borrow2: 15, merge1: 16, del: 17, merge2: 18, ret: 19 };
const RIGHT: Lines = { pick: 21, test: 22, borrow1: 23, borrow2: 24, merge1: 25, del: 26, merge2: 27, ret: 28 };

// y has one child (y.left): borrow a child from a sibling x or merge x and y; returns the parent z.
export function traceBorrowOrMerge(tr: TT, y: NodeId): NodeId {
  const T = tr.tree;
  return inFrame(tr, 'Borrow_Or_Merge(y)', { y }, () => {
    const z = T.nodes[y].p!;
    const side = y === T.nodes[z].left ? 'left' : y === T.nodes[z].middle ? 'middle' : 'right';
    const x = side === 'middle' ? T.nodes[z].left! : T.nodes[z].middle!;
    const L = side === 'left' ? LEFT : side === 'middle' ? MIDDLE : RIGHT;
    tr.ptr = { y, z };
    tr.emit(BOM, 1, {
      bigStep: true,
      nodes: [y, z],
      note: 'z = y.p.',
      question: borrowMergeQuestion(T.nodes[x].right != null),
    });
    tr.emit(BOM, 2, { nodes: [y, z], note: side === 'left' ? 'y == z.left.' : 'y ≠ z.left.' });
    if (side !== 'left') tr.emit(BOM, 11, { nodes: [y, z], note: side === 'middle' ? 'y == z.middle.' : 'y ≠ z.middle.' });
    // line 20 is a comment (▷ y == z.right)

    tr.ptr = { y, z, x };
    tr.emit(BOM, L.pick, { nodes: [x], edges: [x], note: `x = z.${side === 'middle' ? 'left' : 'middle'}.` });
    const xn = T.nodes[x];
    const yChild = T.nodes[y].left!; // the one child y has left
    const hasRight = xn.right !== null;
    tr.emit(BOM, L.test, { nodes: [x], note: hasRight ? 'x.right ≠ NIL: x has three children.' : 'x.right = NIL: x has only two children.' });
    if (hasRight) {
      if (side === 'left') {
        callSetChildren(tr, BOM, L.borrow1, y, yChild, xn.left!, null);
        callSetChildren(tr, BOM, L.borrow2, x, xn.middle!, xn.right!, null);
      } else {
        callSetChildren(tr, BOM, L.borrow1, y, xn.right!, yChild, null);
        callSetChildren(tr, BOM, L.borrow2, x, xn.left!, xn.middle!, null);
      }
    } else {
      if (side === 'left') callSetChildren(tr, BOM, L.merge1, x, yChild, xn.left!, xn.middle!);
      else callSetChildren(tr, BOM, L.merge1, x, xn.left!, xn.middle!, yChild);
      delete T.nodes[y];
      dropVar(tr, 'y');
      tr.emit(BOM, L.del, { nodes: [x], note: 'delete y.' });
      if (side === 'right') callSetChildren(tr, BOM, L.merge2, z, T.nodes[z].left!, x, null);
      else callSetChildren(tr, BOM, L.merge2, z, x, T.nodes[z].right, null);
    }
    tr.emit(BOM, L.ret, { nodes: [z], note: 'Returns z, the parent of y and x.' });
    return z;
  });
}

// x is the real leaf with key k.
export function runDelete(t0: Tree, k: number): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.showRoot = true;
  const x = findLeaf(T, k)!;
  tr.ptr = { x };
  tr.stack = ['2_3_Delete(T, x)'];
  tr.emit(TT_DELETE, 0, { nodes: [x], note: `2_3_Delete(T, x) for the leaf with key ${k}` });
  let y: NodeId | null = T.nodes[x].p!;
  tr.ptr = { x, y };
  tr.emit(TT_DELETE, 1, { nodes: [x, y], note: 'y = x.p.' });
  const yn = T.nodes[y];
  const isLeft = x === yn.left;
  tr.emit(TT_DELETE, 2, { nodes: [x, y], note: isLeft ? 'x == y.left.' : 'x ≠ y.left.' });
  if (isLeft) {
    callSetChildren(tr, TT_DELETE, 3, y, yn.middle!, yn.right, null);
  } else {
    const isMiddle = x === yn.middle;
    tr.emit(TT_DELETE, 4, { nodes: [x, y], note: isMiddle ? 'x == y.middle.' : 'x ≠ y.middle: x is the right child.' });
    if (isMiddle) callSetChildren(tr, TT_DELETE, 5, y, yn.left!, yn.right, null);
    else callSetChildren(tr, TT_DELETE, 6, y, yn.left!, yn.middle!, null);
  }
  delete T.nodes[x];
  tr.ptr = { y };
  tr.emit(TT_DELETE, 7, { nodes: [y], note: 'delete x; deg(y) may now be below 2.' });
  for (;;) {
    tr.ptr = { y };
    tr.emit(TT_DELETE, 8, { bigStep: true, nodes: y === null ? [] : [y], note: y === null ? 'y == NIL: done.' : 'y ≠ NIL.' });
    if (y === null) return tr.steps;
    const hasMiddle = (T.nodes[y].middle ?? null) !== null;
    tr.emit(TT_DELETE, 9, { nodes: [y], note: hasMiddle ? 'y.middle ≠ NIL.' : 'y.middle = NIL: y has one child.' });
    if (hasMiddle) {
      tr.emit(TT_DELETE, 10, { nodes: [y], note: 'Update_Key(y).' });
      traceUpdateKey(tr, y);
      y = T.nodes[y].p;
      tr.ptr = { y };
      tr.emit(TT_DELETE, 11, { nodes: y === null ? [] : [y], note: 'y = y.p.' });
    } else {
      tr.emit(TT_DELETE, 12, { nodes: [y], note: 'y has only one child.' });
      const notRoot = y !== T.root;
      tr.emit(TT_DELETE, 13, { nodes: [y], note: notRoot ? 'y ≠ T.root.' : 'y == T.root.' });
      if (notRoot) {
        tr.emit(TT_DELETE, 14, { nodes: [y], note: 'y = Borrow_Or_Merge(y).' });
        y = traceBorrowOrMerge(tr, y);
      } else {
        const child = T.nodes[y].left!;
        T.root = child;
        tr.emit(TT_DELETE, 15, { nodes: [child], note: 'T.root = y.left: the tree shrinks one level.' });
        T.nodes[child].p = null;
        tr.emit(TT_DELETE, 16, { nodes: [child], note: 'y.left.p = NIL.' });
        delete T.nodes[y];
        tr.ptr = {};
        tr.emit(TT_DELETE, 17, { nodes: [child], note: 'delete y.' });
        tr.emit(TT_DELETE, 18, { note: 'Return.' });
        return tr.steps;
      }
    }
  }
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx vitest run src/structures/two-three && npx tsc --noEmit`
Expected: all PASS, no type errors. Every expected line sequence and shape was derived by hand from the slide pseudocode and checked against a plain-JavaScript transcription of the slide procedures; if one differs, retrace the 28-line `Borrow_Or_Merge` slide by hand before changing the implementation.

- [ ] **Step 5: Commit**

```bash
git add src/structures/two-three
git commit -m "feat(two-three): 2_3_Delete with Borrow_Or_Merge: borrow, merge, cascade and root collapse" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The `twoThree` structure definition

**Files:**
- Create: `src/structures/two-three/index.ts`, `index.test.ts`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: `twoThree: StructureDef<Tree, TwoThreeView>` with `id: 'two-three'`, `title: '2-3 Tree'`, `procs: twoThreeProcs`, `maxNodes: 12`; operations `search` (`'key'`, `[2_3_Search]`), `minimum` (`'none'`, `[2_3_Minimum]`), `successor` (`'node'`, `[2_3_Successor]`), `insert` (`'key'`, `[2_3_Insert, Insert_And_Split, Set_Children, Update_Key]`), `delete` (`'node'`, `[2_3_Delete, Borrow_Or_Merge, Set_Children, Update_Key]`), `init` (`'none'`, `[2_3_Init]`); presets `'Lecture example (slide 18)'` (`[4, 5, 1, 14, 19, 7, 22, 25, 29]`), `'Sorted inserts (1-7)'` (`[1..7]`), `'Full tree (12 keys)'` (`[1..12]`). `build(keys)` inserts the keys in order with `2_3_Insert`. Args: `search`/`insert`/`successor`/`delete` take `[key]`, `minimum`/`init` take `[]`.

- [ ] **Step 1: Write the failing tests**

Create `src/structures/two-three/index.test.ts`:

```ts
import { mulberry32 } from '../../algorithms/sssp/reference';
import { findLeaf, isTwoThree, realKeys, twoThreeLayout } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import { twoThree } from './index';
import { checkTwoThreePredictable } from './predictable';
import { shapeOf } from './testing';

const preset = (i: number) => twoThree.build(twoThree.presets[i].keys);

test('presets: slide 18 with sentinels, sorted inserts, and the 12-leaf limit', () => {
  expect(shapeOf(preset(0))).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (25 29 +inf)))');
  expect(shapeOf(preset(1))).toBe('(((-inf 1) (2 3)) ((4 5) (6 7 +inf)))');
  expect(realKeys(preset(2))).toHaveLength(12);
  for (let i = 0; i < twoThree.presets.length; i++) expect(isTwoThree(preset(i))).toBe(true);
  expect(shapeOf(twoThree.build([]))).toBe('(-inf +inf)');
});

test('validate blocks exactly the inputs the spec lists', () => {
  const t = preset(0);
  expect(twoThree.validate(t, 'insert', [14])).toEqual(['Key 14 is already in the tree (keys must be unique).']);
  expect(twoThree.validate(t, 'insert', [23])).toEqual([]);
  expect(twoThree.validate(t, 'insert', [-5])).toEqual([]);
  expect(twoThree.validate(t, 'insert', [0])).toEqual([]);
  expect(twoThree.validate(preset(2), 'insert', [100])).toEqual(['The tree is limited to 12 keys so it stays readable.']);
  expect(twoThree.validate(t, 'delete', [13])).toEqual(['No node with key 13.']);
  expect(twoThree.validate(t, 'successor', [13])).toEqual(['No node with key 13.']);
  expect(twoThree.validate(t, 'delete', [14])).toEqual([]);
  expect(twoThree.validate(t, 'search', [13])).toEqual([]);
  expect(twoThree.validate(t, 'search', [])).toEqual(['Enter an integer key.']);
  expect(twoThree.validate(twoThree.build([]), 'minimum', [])).toEqual([]); // runs to line 7's error
  expect(twoThree.validate(t, 'init', [])).toEqual([]);
});

test('run dispatches every operation with a valid trace', () => {
  const t = preset(0);
  const args: Record<string, number[]> = { search: [14], minimum: [], successor: [14], insert: [23], delete: [19], init: [] };
  for (const op of twoThree.operations) {
    expect(twoThree.validate(t, op.id, args[op.id])).toEqual([]);
    assertValidTreeTrace(twoThree, twoThree.run(t, op.id, args[op.id]));
  }
  expect(twoThree.operations.map((o) => o.id)).toEqual(['search', 'minimum', 'successor', 'insert', 'delete', 'init']);
  expect(twoThree.procs[0].name).toBe('2_3_Search');
});

test('Init discards the tree on screen and keeps the sentinel-only tree', () => {
  const steps = twoThree.run(preset(0), 'init', []);
  expect(shapeOf(twoThree.keep(steps.at(-1)!.view))).toBe('(-inf +inf)');
});

test('view highlights the selected leaf; keep adopts the last step; nodeKey is null for sentinels and internal nodes', () => {
  const t = preset(0);
  const v = twoThree.view(t, 14);
  expect(v).toMatchObject({ kind: 'two-three', tree: t, tags: {}, highlight: { nodes: [findLeaf(t, 14)], edges: [] } });
  expect(twoThree.view(t, null).highlight.nodes).toEqual([]);
  expect(twoThree.view(t, 13).highlight.nodes).toEqual([]);
  const steps = twoThree.run(t, 'insert', [23]);
  expect(realKeys(twoThree.keep(steps.at(-1)!.view))).toContain(23);
  const leaf = findLeaf(t, 14)!;
  expect(twoThree.nodeKey!(t, leaf)).toBe(14);
  expect(twoThree.nodeKey!(t, t.root!)).toBeNull();
  expect(twoThree.nodeKey!(t, t.nodes[t.root!].left!)).toBeNull();
  const sentinel = Object.values(t.nodes).find((n) => n.key === Infinity && n.leaf)!;
  expect(twoThree.nodeKey!(t, sentinel.id)).toBeNull();
});

test('random operation sequences: valid tree, exact keys, predictable questions, and every step lays out', () => {
  const rand = mulberry32(11);
  let t = preset(0);
  const model = new Set(realKeys(t));
  for (let n = 0; n < 250; n++) {
    const k = Math.floor(rand() * 30) - 5;
    const pick = rand();
    const op = pick < 0.4 ? 'insert' : pick < 0.75 ? 'delete' : pick < 0.85 ? 'search' : pick < 0.95 ? 'successor' : 'minimum';
    const args = op === 'minimum' ? [] : [k];
    if (twoThree.validate(t, op, args).length > 0) continue;

    const before = structuredClone(t);
    const steps = twoThree.run(t, op, args);
    expect(t).toEqual(before); // operations never mutate the page's tree
    assertValidTreeTrace(twoThree, steps);
    checkTwoThreePredictable(steps);
    for (const s of steps) {
      for (const p of Object.values(twoThreeLayout(s.view.tree).pos)) {
        expect([Number.isFinite(p.x), Number.isFinite(p.y)]).toEqual([true, true]);
      }
    }

    if (op === 'insert' || op === 'delete') {
      t = twoThree.keep(steps.at(-1)!.view);
      if (op === 'insert') model.add(k);
      else model.delete(k);
      expect(isTwoThree(t)).toBe(true);
      expect(realKeys(t)).toEqual([...model].sort((a, b) => a - b));
    } else if (op === 'successor') {
      const next = [...model].filter((x) => x > k).sort((a, b) => a - b)[0];
      expect(steps.at(-1)!.note).toBe(next === undefined ? 'Returns NIL: x has the largest key.' : `Returns the leaf with key ${next}.`);
    } else if (op === 'minimum' && model.size > 0) {
      expect(steps.at(-1)!.note).toBe(`Returns the leaf with key ${Math.min(...model)}.`);
    }
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/structures/two-three/index.test.ts`
Expected: FAIL, unresolved import `./index`.

- [ ] **Step 3: Implement `index.ts`**

```ts
import type { Tree } from '../../engine/tree';
import { findLeaf, initTree, realLeaves } from '../../engine/twoThree';
import type { StructureDef, TwoThreeView } from '../types';
import { runDelete } from './delete';
import { runInit } from './init';
import { runInsert } from './insert';
import {
  BORROW_OR_MERGE, INSERT_AND_SPLIT, SET_CHILDREN, TT_DELETE, TT_INIT, TT_INSERT, TT_MINIMUM, TT_SEARCH, TT_SUCCESSOR,
  twoThreeProcs, UPDATE_KEY,
} from './pseudocode';
import { runMinimum, runSearch, runSuccessor } from './queries';
import { TWO_THREE_QUESTION_TYPES } from './questions';

const MAX_LEAVES = 12;

function validate(t: Tree, op: string, args: number[]): string[] {
  if (op === 'minimum' || op === 'init') return []; // Minimum on an empty tree runs to the lecture's error line
  const k = args[0] ?? null;
  if (k === null) return ['Enter an integer key.'];
  if (op === 'insert') {
    if (findLeaf(t, k) !== null) return [`Key ${k} is already in the tree (keys must be unique).`];
    if (realLeaves(t).length >= MAX_LEAVES) return [`The tree is limited to ${MAX_LEAVES} keys so it stays readable.`];
    return [];
  }
  if (op === 'successor' || op === 'delete') return findLeaf(t, k) === null ? [`No node with key ${k}.`] : [];
  return [];
}

export const twoThree: StructureDef<Tree, TwoThreeView> = {
  id: 'two-three',
  title: '2-3 Tree',
  procs: twoThreeProcs,
  operations: [
    { id: 'search', label: 'Search', input: 'key', procs: [TT_SEARCH] },
    { id: 'minimum', label: 'Minimum', input: 'none', procs: [TT_MINIMUM] },
    { id: 'successor', label: 'Successor', input: 'node', procs: [TT_SUCCESSOR] },
    { id: 'insert', label: 'Insert', input: 'key', procs: [TT_INSERT, INSERT_AND_SPLIT, SET_CHILDREN, UPDATE_KEY] },
    { id: 'delete', label: 'Delete', input: 'node', procs: [TT_DELETE, BORROW_OR_MERGE, SET_CHILDREN, UPDATE_KEY] },
    { id: 'init', label: 'Init', input: 'none', procs: [TT_INIT] },
  ],
  questionTypes: TWO_THREE_QUESTION_TYPES,
  presets: [
    // Inserted in this order the tree is slide 18 with the two sentinels joined to the first and last leaf groups.
    { name: 'Lecture example (slide 18)', keys: [4, 5, 1, 14, 19, 7, 22, 25, 29] },
    { name: 'Sorted inserts (1-7)', keys: [1, 2, 3, 4, 5, 6, 7] },
    { name: 'Full tree (12 keys)', keys: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  ],
  maxNodes: MAX_LEAVES,
  // One implementation of insert: run the traced 2_3_Insert and keep only the final tree.
  build: (keys) => keys.reduce((t, k) => runInsert(t, k).at(-1)!.view.tree, initTree()),
  view(t, selectedKey) {
    const selected = selectedKey === null ? null : findLeaf(t, selectedKey);
    return { kind: 'two-three', tree: t, highlight: { nodes: selected ? [selected] : [], edges: [] }, tags: {} };
  },
  keep: (v) => v.tree,
  nodeKey(t, id) {
    const n = t.nodes[id];
    return n !== undefined && n.leaf === true && Number.isFinite(n.key) ? n.key : null;
  },
  validate,
  run(t, op, args) {
    switch (op) {
      case 'search': return runSearch(t, args[0]);
      case 'minimum': return runMinimum(t);
      case 'successor': return runSuccessor(t, args[0]);
      case 'insert': return runInsert(t, args[0]);
      case 'delete': return runDelete(t, args[0]);
      case 'init': return runInit();
      default: throw new Error(`Unknown 2-3 tree operation ${op}`);
    }
  },
};
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx vitest run src/structures && npx tsc --noEmit`
Expected: all PASS, no type errors. A failure in the random test names the broken invariant: fix the trace code in Tasks 3–6, not the test. The preset order `[4, 5, 1, 14, 19, 7, 22, 25, 29]` reproduces the slide 18 shape; it was found by exhaustive search against a plain-JavaScript transcription of the slide procedures.

- [ ] **Step 5: Commit**

```bash
git add src/structures/two-three
git commit -m "feat(two-three): the 2-3 tree structure definition with validation and presets" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Register, page tests, end to end, docs

**Files:**
- Modify: `src/structures/registry.ts`, `src/App.test.tsx`, `docs/superpowers/specs/2026-09-28-tree-structures-design.md`, `docs/superpowers/plans/tree-followups.md`
- Create: `src/ui/TwoThreePage.test.tsx`, `e2e/two-three.spec.ts`

**Interfaces:**
- Consumes: everything above; `StructurePage` is generic and needs no change.
- Produces: the page at `#/two-three`. Operation-bar labels used by the tests: `Preset`, `Operation`, `Key`, buttons `Run`, `Back to the tree`, `Done: keep result`, `Clear`.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/TwoThreePage.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fmtKey } from '../engine/twoThree';
import { twoThree } from '../structures/two-three';
import { StructurePage } from './StructurePage';

beforeEach(() => window.localStorage.clear());

const leafKeys = (c: HTMLElement) => [...c.querySelectorAll('.tnode.leaf .key')].map((e) => e.textContent);
const leaf = (c: HTMLElement, key: string) =>
  [...c.querySelectorAll('.tnode.leaf')].find((g) => g.querySelector('.key')?.textContent === key)!;
const MIN = fmtKey(-Infinity);
const MAX = fmtKey(Infinity);

async function runToEnd() {
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
}

test('the page opens on slide 18 with both sentinels drawn', () => {
  const { container } = render(<StructurePage def={twoThree} />);
  expect(leafKeys(container)).toEqual([MIN, '1', '4', '5', '7', '14', '19', '22', '25', '29', MAX]);
});

test('Insert 23, keep the result, then Search finds it', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '23');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(leafKeys(container)).toEqual([MIN, '1', '4', '5', '7', '14', '19', '22', '23', '25', '29', MAX]);
  expect(container.querySelectorAll('.tnode.active, .tnode.detached')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'search');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '23');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  expect(container.querySelector('.note')).toHaveTextContent('Returns the leaf with key 23.');
});

test('Delete by clicking a leaf: the key field fills in, and keeping the result removes the leaf', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  fireEvent.pointerDown(leaf(container, '19'));
  expect(screen.getByLabelText('Key')).toHaveValue('19');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(leafKeys(container)).toEqual([MIN, '1', '4', '5', '7', '14', '22', '25', '29', MAX]);
});

test('sentinels and internal nodes cannot be clicked into the key field', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  fireEvent.pointerDown(leaf(container, MIN));
  fireEvent.pointerDown(leaf(container, MAX));
  fireEvent.pointerDown(container.querySelector('.tnode:not(.leaf)')!);
  expect(screen.getByLabelText('Key')).toHaveValue('');
});

test('Back to the tree discards the run', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '23');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Back to the tree' }));
  expect(leafKeys(container)).not.toContain('23');
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();
});

test('Clear leaves only the sentinels; Minimum then runs to the error line and keeps the empty tree', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(leafKeys(container)).toEqual([MIN, MAX]);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'minimum');
  await runToEnd();
  expect(container.querySelector('.note')).toHaveTextContent('error: T is empty');
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(leafKeys(container)).toEqual([MIN, MAX]);
});

test('Init replaces the tree on screen with the sentinel-only tree', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'init');
  expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled(); // no input needed
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(leafKeys(container)).toEqual([MIN, MAX]);
});

test('blocked inputs show the spec messages and do not run', async () => {
  render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '14');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Key 14 is already in the tree (keys must be unique).');

  await userEvent.selectOptions(screen.getByLabelText('Preset'), 'Full tree (12 keys)');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '100');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('The tree is limited to 12 keys so it stays readable.');

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '99');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('No node with key 99.');
  expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
});

test('Run is disabled for non-integer key text; negative integers and 0 are fine; Minimum and Init need no key', async () => {
  render(<StructurePage def={twoThree} />);
  const key = screen.getByLabelText('Key');
  const run = screen.getByRole('button', { name: 'Run' });
  for (const text of ['1.5', '-', 'abc', '']) {
    await userEvent.clear(key);
    if (text) await userEvent.type(key, text);
    expect(run).toBeDisabled();
  }
  for (const text of ['-3', '0']) {
    await userEvent.clear(key);
    await userEvent.type(key, text);
    expect(run).toBeEnabled();
  }
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'minimum');
  expect(run).toBeEnabled();
});
```

In `src/App.test.tsx`, append (the file already clears the hash and storage in a `beforeEach`):

```tsx

test('home lists the 2-3 tree under tree structures', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /2-3 Tree/ })).toHaveAttribute('href', '#/two-three');
});

test('#/two-three opens the 2-3 tree page with the lecture example and both sentinels', () => {
  window.location.hash = '#/two-three';
  const { container } = render(<App />);
  expect(screen.getByRole('heading', { name: '2-3 Tree' })).toBeInTheDocument();
  expect(container.querySelectorAll('.tnode.leaf')).toHaveLength(11);
  expect(container.querySelectorAll('.tnode.sentinel')).toHaveLength(2);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/TwoThreePage.test.tsx src/App.test.tsx`
Expected: FAIL (`#/two-three` is not registered). The `TwoThreePage` tests render `StructurePage` directly, so only the App tests fail for that reason; the page tests fail or pass depending on the previous tasks, and every failure must be investigated rather than adjusted away.

- [ ] **Step 3: Register the structure**

Replace `src/structures/registry.ts`:

```ts
import { bst } from './bst';
import { heap } from './heap';
import { twoThree } from './two-three';
import type { AnyStructure } from './types';

export const STRUCTURES: AnyStructure[] = [bst, heap, twoThree];
```

- [ ] **Step 4: Run the whole suite and the typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; everything PASSES, including the unchanged BST, heap and graph tests. A BST or heap failure means a shared file (tracer, types, views, canvas dispatcher) regressed: fix that, not the old tests.

- [ ] **Step 5: Write the Playwright tests**

Create `e2e/two-three.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('2-3 tree: Search with a predict answer, Insert 23, then Delete 19 by clicking its leaf', async ({ page }) => {
  await page.goto('/#/two-three');
  await expect(page.getByRole('heading', { name: '2-3 Tree' })).toBeVisible();
  await page.getByLabel('Operation').selectOption('search');
  await page.getByLabel('Key', { exact: true }).fill('14');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  const dialog = page.getByRole('dialog', { name: 'Predict the next step' });
  await dialog.getByRole('button', { name: 'left child' }).click(); // 14 ≤ the left subtree's key 14
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('.note')).toContainText('Returns the leaf with key 14.');
  await page.getByRole('button', { name: 'Back to the tree' }).click();

  await page.getByLabel('Operation').selectOption('insert');
  await page.getByLabel('Key', { exact: true }).fill('23');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode.leaf')).toHaveCount(12);

  await page.getByLabel('Operation').selectOption('delete');
  await page.locator('.tnode.leaf').filter({ has: page.locator('.key', { hasText: /^19$/ }) }).dispatchEvent('pointerdown');
  await expect(page.getByLabel('Key', { exact: true })).toHaveValue('19');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode.leaf')).toHaveCount(11);
  await expect(page.locator('.tnode.leaf .key', { hasText: /^19$/ })).toHaveCount(0);
});

test('2-3 tree: Delete 1 from the sorted tree answers the borrow-or-merge question', async ({ page }) => {
  await page.goto('/#/two-three');
  await page.getByRole('combobox', { name: 'Preset' }).selectOption({ label: 'Sorted inserts (1-7)' });
  await page.getByLabel('Operation').selectOption('delete');
  await page.getByLabel('Key', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Run' }).click();
  // the first big step is the while-loop test (line 8); the second is the question in Borrow_Or_Merge
  await page.getByRole('button', { name: 'Next big step' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  const dialog = page.getByRole('dialog', { name: 'Predict the next step' });
  await dialog.getByRole('button', { name: 'merge' }).click();
  await expect(page.getByRole('status')).toContainText('Correct.');
});

test('2-3 tree page: no horizontal scroll at phone width with the 12-leaf tree, before and after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/two-three');
  await page.getByRole('combobox', { name: 'Preset' }).selectOption({ label: 'Full tree (12 keys)' });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.getByLabel('Operation').selectOption('delete');
  await page.getByLabel('Key', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await overflow()).toBe(false);
});
```

Before relying on the second test, check its premise: on the sorted tree `(((-inf 1) (2 3)) ((4 5) (6 7 +inf)))`, deleting 1 leaves the first group with the single child `-inf`; its sibling `(2 3)` has no right child, so the answer is `merge`. The first `Next big step` stops at `2_3_Delete` line 8 (a big step with no question) and the second at `Borrow_Or_Merge` line 1 (the question). If the big-step order differs, print `steps.map(s => [s.proc, s.line, s.bigStep])` for that run and adjust the number of "Next big step" clicks.

- [ ] **Step 6: Build and run every suite**

Run: `npm run build && npx vitest run && npx playwright test`
Expected: the build succeeds (`tsc --noEmit` then `vite build`); all unit tests PASS; all Playwright tests PASS (graph pages, BST, heap, 2-3 tree). Playwright's `getByLabel` matches substrings, hence `{ exact: true }` for the Key field.

- [ ] **Step 7: Update the spec and the follow-ups note**

In `docs/superpowers/specs/2026-09-28-tree-structures-design.md`:

1. §2 operations table, change the 2-3 tree row

   `| 2-3 tree | Search, Minimum, Successor, Insert, Delete | key (Search, Insert); leaf, by key or click (Successor, Delete) |`

   to

   `| 2-3 tree | Search, Minimum, Successor, Insert, Delete, Init | key (Search, Insert); leaf, by key or click (Successor, Delete); none (Minimum, Init) |`

   and add below the table: `- **Init** runs \`2_3_Init\` (slide 21) and, on "Done: keep result", leaves the sentinel-only tree; it ignores the tree on screen.`
2. §3 Tree model, after the `TreeNode` bullet add: `- 2-3 only: \`middle?\` and \`leaf?\` on \`TreeNode\`; a node whose DS attributes are still NIL (a new internal node) has \`key = NaN\`. The 2-3 snapshot is a \`TwoThreeView\` (\`kind: 'two-three'\`), drawn by \`TwoThreeCanvas\` from child pointers so half-finished states still draw.`
3. §4 2-3 tree, change the Minimum/Successor bullet to read: `- **Minimum (slide 23)** and **Successor (slide 24)**: "which leaf?" (node answer; Successor also offers NIL). Minimum on an empty tree asks nothing and runs to line 7's error. Sentinels are never offered as answers.`

In `docs/superpowers/plans/tree-followups.md`, replace the "Plan 3 (2-3 tree)" section with:

```markdown
## Conventions established in tree plan 3 (2-3 tree)

- `TreeNode` carries `middle?` and `leaf?`; a node with NIL attributes has `key = NaN` (the tracer shows it as NIL). `StructureView` has a third member, `TwoThreeView`; add a view the same way for any further structure: a `kind`, a `StructureCanvas` branch, a `nodeOptions` branch.
- `createTreeTracer`/`createTwoThreeTracer` share one factory. A pointer variable whose node was deleted shows `'deleted'` and has no tag; procedures drop the variable (`dropVar`) when the lecture frees a node.
- Procedures that call procedures run in their own frame: `inFrame(tr, frameLabel, ptr, body)` swaps variables and the call stack and restores them.
- A line that calls a procedure emits one step before the callee's steps; the caller's variable that receives the result changes in the caller's next step.
- Sentinels (`±∞` leaves) are ordinary leaves; they are excluded from node answers (`realLeaves`), from clicks (`TwoThreeCanvas`) and from keys (integers only).
- Out of scope, as in the spec: the augmented 2-3 tree of Tutorial 6 and B+ trees with d > 3.
```

Run: `npm run build && npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src e2e docs
git commit -m "feat(ui): 2-3 tree page: #/two-three route, page and end-to-end tests; docs for tree plan 3" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage** (spec §2 2-3 rows, §3, §4 2-3, §5 2-3 rows, §6, §7, §8 plan 3):
- Operations Search, Minimum, Successor, Insert, Delete with the lecture's procedures and helpers in the pseudocode panel (`Insert_And_Split` → `Set_Children` → `Update_Key`; `Borrow_Or_Merge`): Tasks 3–7. Init, Update_Key, Set_Children stepped without questions: Task 3.
- Sentinel leaves (−∞, +∞), leaf boxes on one level, internal nodes centred, key = subtree maximum, as on slide 18: Tasks 1–2; preset reproduces slide 18 (with the sentinels joined to the end groups): Task 7.
- Questions: Search and the Insert walk (left/middle/right), "does x split?" and "where does z go?", "borrow or merge?", Minimum/Successor "which leaf?" with NIL: Tasks 3–6. A forced answer (a leaf in Search, the split branch's placement) asks nothing.
- Errors table, 2-3 rows: insert duplicate, delete/successor of an absent key, Minimum on an empty tree runs to line 7, node/leaf limit (12), non-integer or empty input disabling Run: Tasks 7–8.
- Call-stack panel (recursive `2_3_Search`, nested procedures), variables line with `T.root`, pointer tags, `NIL`, "Done: keep result", "Back": Tasks 2–8.
- Followup items: sentinels never offered as answers (`realLeaves`, `nodeKey`, canvas clicks), `middle` and the 2-3 layout (Tasks 1–2), `T.root` tag for the 2-3 procedures (`showRoot`).
- Testing: per-procedure tests with hand-checked results against a transcription of the slide code, seeded random invariant tests for insert, delete and mixed operations, predictability on every trace, page tests, Playwright, 375px: Tasks 4–8.

**Placeholders:** none. Two judgement calls are called out where a hand-derived expectation could be wrong and say how to resolve them (Task 6 step 5, Task 8 step 5).

**Type consistency:** `TT = TreeTracer<TwoThreeView>`, `inFrame`, `callSetChildren(tr, proc, line, x, l, m, r)`, `traceSetChildren(tr, x, l, m, r)`, `traceUpdateKey(tr, x)`, `traceInsertAndSplit(tr, x, z)`, `traceBorrowOrMerge(tr, y)`, `runSearch/runMinimum/runSuccessor/runInsert/runDelete/runInit`, `checkTwoThreePredictable`, question builders and type ids (`two3.*`), `fmtKey`, `realLeaves`, `findLeaf`, `isTwoThree`, `twoThreeLayout`, `fromShape`, `shapeOf`, `SLIDE_18`, label strings (`Key`, `Preset`, `Operation`) are used identically across tasks.

**Review Focus coverage:** 1 → Task 6 (borrow left/middle/right, merge, cascade and root collapse, delete down to the sentinels). 2 → Task 5 (all four `Insert_And_Split` branches, root growth, extremes, empty tree). 3 → Tasks 2 (canvas, `nodeOptions`), 4 (empty Minimum, Successor NIL), 7 (`nodeKey`), 8 (clicks). 4 → Tasks 1 (layout with two parents, deleted child, loose nodes), 2 (canvas), 7 (every step of every random operation lays out). 5 → Tasks 7–8 (limit, duplicate, absent, negative and zero keys, 375px with the 12-leaf tree).
