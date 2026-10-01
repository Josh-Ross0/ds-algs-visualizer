# Tree Plan 1: Foundation + Binary Search Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the tree track: a shared player core, a tree model with layout, a `TreeCanvas`, a `StructurePage`, and a BST page (`#/bst`) that steps through the lecture's `Tree_Search`, `Tree_Minimum`, `Tree_Successor`, `Tree_Insert` and the four delete cases line by line.

**Architecture:**
- The player, questions, pseudocode panel and settings move onto a shared `StepCore`. The graph `Step` extends it unchanged, and a generic `Player` component takes over from the graph-only `Visualizer`.
- The tree track adds:
  - `engine/tree.ts`: a pure model with stable node ids and the BST layout;
  - `structures/`: pure operation runners that emit `TreeStep`s;
  - `ui/TreeCanvas` and `ui/StructurePage`.
- Operations never mutate the page's tree. "Done: keep result" adopts the last step's tree.

**Tech Stack:** React 19, TypeScript 5.9.3 (pinned), Vite 8, Vitest 5 + Testing Library (jsdom), Playwright (chromium).

**Spec:** `docs/superpowers/specs/2026-09-28-tree-structures-design.md` (builds on `docs/superpowers/specs/2026-09-28-algo-visualizer-design.md`). Visual language: `docs/superpowers/specs/2026-09-28-visual-design.md`.

## Global Constraints

- **Verbatim pseudocode.** Take it from the rendered slides of `Lectures/efficient-ds.pdf`, with underscores and slide line numbers:
  - `Tree_Search(x, k)` (slide 7, 5 lines; line 1 writes lowercase `nil`);
  - `Tree_Minimum(x)` (slide 8, 3 lines);
  - `Tree_Successor(x)` (slide 9, 7 lines);
  - `Tree_Insert(T, z)` (slide 10, 14 lines).
  - BST delete has no pseudocode; its "procedure" is the slides 11–14 case list defined in Task 3.
- **Steps.** Each executed line emits exactly one step, showing the state after that line. Snapshots are `structuredClone` copies.
- **Call step (decision for this plan).** Every tree operation starts with a *call step*: `line: 0` of the main procedure, drawn as the procedure's signature highlighted. It shows the tree before anything runs, so the first real line can carry a predict question. This is the tree track's version of "every step highlights a real line", and graph traces never use line 0.
- **Questions.** A question on step `i` is shown over step `i − 1`, and that step's note must not reveal the answer. Every structure test calls `assertQuestionsPredictable`.
- **Keys.** Integers only, and unique. At most 15 nodes in a BST.
- **Styling.** The yellow highlighter (`--highlighter`) is reserved for the current pseudocode line (and now the called signature). Node and edge highlights use the marker blue and the active dashed edge.
- **No layout regressions.** No horizontal scroll at 375px width. The six graph pages must behave exactly as before; the existing graph tests pass unchanged (only `src/ui/controls.test.tsx` gains new tests).
- **No React in logic.** `engine/` and `structures/**` must not import React.
- **Typecheck.** Use only `npx tsc --noEmit`. Plain `tsc` or `tsc -b` emit `.js` files into `src/`.

## Review Focus

1. After "Done: keep result", the next operation must run on exactly the kept tree, with no leftover detached node and no stale highlight or pointer tag. Test: Task 6 (insert, keep, then search finds it).
2. Deleting the only node leaves an empty tree. Minimum on it is then blocked; Insert on it goes through line 2 (`T.root = z`). Test: Task 4.
3. A case-4 delete where the successor is x's own right child (an adjacent swap) must leave a valid BST. Tests: Task 2 (`swapPositions`) and Task 4 (delete 9).
4. A node-answer question asked while the tree is changing (inside Delete) must offer the current step's nodes as buttons, with NIL only where it is allowed. Tests: Tasks 1 and 6.
5. Key text such as `1.5`, `-`, `abc` or empty must disable Run, while negative integers are accepted. Test: Task 6.

---

### Task 1: Shared player core and node answers

**Files:**
- Modify: `src/engine/trace.ts`, `src/ui/player.ts`, `src/ui/usePlayer.ts`, `src/ui/Visualizer.tsx`, `src/ui/QuestionOverlay.tsx`, `src/ui/PseudocodePanel.tsx`, `src/ui/StatePanel.tsx`, `src/algorithms/testing.ts`, `src/styles.css`
- Create: `src/ui/Player.tsx`
- Test: `src/ui/controls.test.tsx`, `src/ui/panels.test.tsx`

**Interfaces:**
- Produces:
  - `StepCore = { proc; line; bigStep; vars; note?; question? }`; `Step = StepCore & { vertexState; ds; highlight }`.
  - `Answer` gains `{ kind: 'node'; value: string | null; label: string; nil: boolean }`.
  - `createPlayerReducer(steps: StepCore[], asked)` and `usePlayer<S extends StepCore>(steps: S[], settings)`.
  - `Player<S extends StepCore>(props)` with props:
    - `steps`, `procs`, `questionTypes`, `settings`, `onSettingsChange`;
    - `vertices?: string[]`;
    - `nodes?(step: S): { id: string; label: string }[]`;
    - `main(step, pick?)`, `below?(step)`, `side?(step)`;
    - `end?: ReactNode`, rendered once the last step is shown.
  - `QuestionOverlay` gains an optional prop `nodes?: { id; label }[]`.
  - `PseudocodePanel` highlights the signature when `current.line === 0`.
  - `StatePanel` accepts any `StepCore` (it reads `vertexState` only when there are columns).
  - `assertValidTrace(def: { procs: Proc[] }, steps: StepCore[])` and `assertQuestionsPredictable<S extends StepCore>(steps: S[], check)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/ui/controls.test.tsx`:

```tsx
const nodeQ: Question = {
  type: 't', prompt: 'Which node?', explain: 'e',
  answer: { kind: 'node', value: 'n2', label: '12', nil: true },
};

test('node question offers one button per node plus NIL, and reports labels', async () => {
  const onAnswer = vi.fn();
  render(
    <QuestionOverlay
      question={nodeQ}
      vertices={[]}
      nodes={[{ id: 'n1', label: '4' }, { id: 'n2', label: '12' }]}
      onAnswer={onAnswer}
      onSkip={() => {}}
    />,
  );
  expect(screen.getByRole('button', { name: '4' })).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: '12' }));
  expect(onAnswer).toHaveBeenLastCalledWith({ kind: 'node', value: 'n2', label: '12', nil: true });
  await userEvent.click(screen.getByRole('button', { name: 'NIL' }));
  expect(onAnswer).toHaveBeenLastCalledWith({ kind: 'node', value: null, label: 'NIL', nil: true });
});

test('node question without NIL shows no NIL button; feedback names the node by label', () => {
  const q: Question = { ...nodeQ, answer: { kind: 'node', value: 'n2', label: '12', nil: false } };
  render(<QuestionOverlay question={q} vertices={[]} nodes={[{ id: 'n2', label: '12' }]} onAnswer={() => {}} onSkip={() => {}} />);
  expect(screen.queryByRole('button', { name: 'NIL' })).toBeNull();
});

test('feedback for a wrong node answer shows the label, not the id', () => {
  render(<Feedback correct={false} question={nodeQ} onContinue={() => {}} />);
  expect(screen.getByRole('status')).toHaveTextContent('The answer is 12.');
});
```

Append to `src/ui/panels.test.tsx`:

```tsx
test('pseudocode highlights the signature on a call step (line 0)', () => {
  render(
    <PseudocodePanel
      procs={[{ name: 'P', signature: 'P(x)', lines: ['one'] }]}
      current={{ proc: 'P', line: 0 }}
    />,
  );
  expect(screen.getByRole('heading', { name: 'P(x)' })).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('one').closest('li')).not.toHaveAttribute('aria-current');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run `npx vitest run src/ui` → the new tests FAIL. TypeScript errors on `kind: 'node'` are expected.

- [ ] **Step 3: Implement**

`src/engine/trace.ts`: add `node` to `Answer`, split `Step`, and teach `formatAnswer` about labels:

```ts
export type Answer =
  | { kind: 'vertex'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'yesno'; value: boolean }
  | { kind: 'choice'; value: string; options: string[] }
  // A tree node picked by id (label = its key as shown); value null means NIL.
  | { kind: 'node'; value: string | null; label: string; nil: boolean };
```

```ts
// What the player, questions and pseudocode panel need from any step.
export type StepCore = {
  proc: string;
  line: number;
  bigStep: boolean;
  vars: Record<string, Value>;
  note?: string;
  question?: Question;
};
export type Step = StepCore & {
  vertexState: VertexState;
  ds: DSView[];
  highlight: Highlight;
};
```

```ts
export function formatAnswer(a: Answer): string {
  if (a.kind === 'yesno') return a.value ? 'yes' : 'no';
  if (a.kind === 'node') return a.label;
  return formatValue(a.value);
}
```

`src/ui/player.ts`: import `StepCore` instead of `Step`, and type `createPlayerReducer(steps: StepCore[], asked: (q: Question) => boolean)`.

`src/ui/usePlayer.ts`: import `StepCore`, and make the hook `export function usePlayer<S extends StepCore>(steps: S[], settings: Settings)`.

`src/algorithms/testing.ts`:

```ts
import type { StepCore } from '../engine/trace';
import type { Proc } from './types';

export function assertValidTrace(def: { procs: Proc[] }, steps: StepCore[]): void {
```

(The body is unchanged.) Also:

```ts
export function questionSteps(steps: StepCore[]): number[] {
```

```ts
export function assertQuestionsPredictable<S extends StepCore>(
  steps: S[],
  check: (prevStep: S, questionStep: S, index: number) => void,
): void {
```

`src/ui/PseudocodePanel.tsx`: highlight the heading for a call step:

```tsx
      {procs.map((p) => {
        const isCall = current?.proc === p.name && current.line === 0;
        return (
          <section key={p.name} aria-label={p.signature}>
            <h3 className={isCall ? 'current' : undefined} aria-current={isCall ? 'step' : undefined}>{p.signature}</h3>
            <ol>
              {/* …existing <li> mapping unchanged… */}
            </ol>
          </section>
        );
      })}
```

`src/styles.css`: change the selector `.pseudocode li.current {` to `.pseudocode li.current, .pseudocode h3.current {`.

`src/ui/StatePanel.tsx`: loosen the step type:

```tsx
import { formatValue, type StepCore, type VertexState } from '../engine/trace';

type Props = {
  columns: { key: string; label: string }[];
  vertices: string[];
  step?: StepCore & { vertexState?: VertexState };
};
```

In the cell render, use `step.vertexState?.[v]?.[c.key]`.

`src/ui/QuestionOverlay.tsx`:
- Add `nodes?: { id: string; label: string }[]` to `Props`, default `[]`.
- Add a `node` branch after the `vertex` one:

```tsx
      {answer.kind === 'node' && (
        <>
          <p className="muted">Click a node in the tree or choose below.</p>
          <div className="choices">
            {nodes.map((n, i) => (
              <button
                key={n.id}
                ref={i === 0 ? setFirstControl : undefined}
                type="button"
                onClick={() => onAnswer({ kind: 'node', value: n.id, label: n.label, nil: answer.nil })}
              >{n.label}</button>
            ))}
            {answer.nil && (
              <button type="button" onClick={() => onAnswer({ kind: 'node', value: null, label: 'NIL', nil: true })}>NIL</button>
            )}
          </div>
        </>
      )}
```

Create `src/ui/Player.tsx`, the old `Visualizer` body made generic:

```tsx
import { useRef, type ReactNode } from 'react';
import type { Proc } from '../algorithms/types';
import type { Answer, Question, StepCore } from '../engine/trace';
import { PlayerControls, type PlayerControlsHandle } from './PlayerControls';
import { PseudocodePanel } from './PseudocodePanel';
import { Feedback, QuestionOverlay } from './QuestionOverlay';
import type { Settings } from './settings';
import { SettingsPanel } from './SettingsPanel';
import { usePlayer } from './usePlayer';

type NodeOption = { id: string; label: string };

type Props<S extends StepCore> = {
  steps: S[];
  procs: Proc[];
  questionTypes: { type: string; label: string }[];
  settings: Settings;
  onSettingsChange(s: Settings): void;
  // Choices for vertex questions (graph pages).
  vertices?: string[];
  // Choices for node questions (tree pages), taken from the step on screen.
  nodes?(step: S): NodeOption[];
  // The main picture; `pick` is set while a vertex/node question waits for a click.
  main(step: S, pick?: (id: string) => void): ReactNode;
  below?(step: S): ReactNode;
  side?(step: S): ReactNode;
  // Shown under the controls once the last step is on screen.
  end?: ReactNode;
};

function pickAnswer(q: Question, id: string, options: NodeOption[]): Answer {
  if (q.answer.kind === 'node') {
    return { kind: 'node', value: id, label: options.find((o) => o.id === id)?.label ?? id, nil: q.answer.nil };
  }
  return { kind: 'vertex', value: id };
}

export function Player<S extends StepCore>(p: Props<S>) {
  const { state, dispatch } = usePlayer(p.steps, p.settings);
  const step = p.steps[state.index];
  const pending = state.pending !== null ? p.steps[state.pending].question! : null;
  const nodeOptions = p.nodes?.(step) ?? [];
  const clickable = pending !== null && (pending.answer.kind === 'vertex' || pending.answer.kind === 'node');

  // After Skip or Continue the dialog or result unmounts and focus would fall to
  // <body>, so send it back to the player control. Only these two actions do it:
  // a question closed by a settings change must not pull focus off the settings.
  const playerRef = useRef<PlayerControlsHandle>(null);
  const closeAndRestoreFocus = (type: 'skip' | 'continue') => {
    dispatch({ type });
    playerRef.current?.restoreFocus();
  };

  return (
    <div className="layout">
      <div className="main-col">
        {p.main(step, clickable ? (id) => dispatch({ type: 'answer', answer: pickAnswer(pending!, id, nodeOptions) }) : undefined)}
        {pending && (
          <QuestionOverlay
            key={state.pending}
            question={pending}
            vertices={p.vertices ?? []}
            nodes={nodeOptions}
            onAnswer={(answer) => dispatch({ type: 'answer', answer })}
            onSkip={() => closeAndRestoreFocus('skip')}
          />
        )}
        {state.feedback && <Feedback {...state.feedback} onContinue={() => closeAndRestoreFocus('continue')} />}
        <PlayerControls
          ref={playerRef}
          state={state}
          total={p.steps.length}
          dispatch={dispatch}
          speedMs={p.settings.speedMs}
          onSpeed={(speedMs) => p.onSettingsChange({ ...p.settings, speedMs })}
        />
        {state.index === p.steps.length - 1 && p.end}
        {p.below?.(step)}
      </div>
      <div className="side-col">
        <PseudocodePanel procs={p.procs} current={step} />
        {p.side?.(step)}
        <SettingsPanel settings={p.settings} questionTypes={p.questionTypes} onChange={p.onSettingsChange} />
      </div>
    </div>
  );
}
```

Replace `src/ui/Visualizer.tsx` with a thin graph wrapper. The DOM order stays the same, so every graph test still holds:

```tsx
import type { AlgorithmDef } from '../algorithms/types';
import { vertexIds, type Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AdjacencyPanel } from './AdjacencyPanel';
import { DSPanel } from './DSPanel';
import { GraphCanvas } from './GraphCanvas';
import { Player } from './Player';
import type { Settings } from './settings';
import { StatePanel } from './StatePanel';

type Props = {
  def: AlgorithmDef;
  graph: Graph;
  steps: Step[];
  settings: Settings;
  onSettingsChange(s: Settings): void;
};

export function Visualizer({ def, graph, steps, settings, onSettingsChange }: Props) {
  const vertices = vertexIds(graph);
  return (
    <Player
      steps={steps}
      procs={def.procs}
      questionTypes={def.questionTypes}
      settings={settings}
      onSettingsChange={onSettingsChange}
      vertices={vertices}
      main={(step, pick) => (
        <GraphCanvas
          graph={graph}
          step={step}
          weighted={def.weighted}
          plainVertices={def.stateColumns.length === 0}
          onVertexPointerDown={pick}
        />
      )}
      below={(step) => <DSPanel ds={step.ds} />}
      side={(step) => (
        <>
          <StatePanel columns={def.stateColumns} vertices={vertices} step={step} />
          {def.order === 'adjacency' && <AdjacencyPanel graph={graph} />}
        </>
      )}
    />
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run `npx vitest run` → all PASS; the existing graph, App and player tests pass unchanged. Run `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/trace.ts src/ui/player.ts src/ui/usePlayer.ts src/ui/Player.tsx src/ui/Visualizer.tsx src/ui/QuestionOverlay.tsx src/ui/PseudocodePanel.tsx src/ui/StatePanel.tsx src/algorithms/testing.ts src/styles.css src/ui/controls.test.tsx src/ui/panels.test.tsx
git commit -m "refactor: shared StepCore and generic Player; node answers; call-step highlight"
```

---

### Task 2: Tree model and BST layout

**Files:**
- Create: `src/engine/tree.ts`, `src/engine/tree.test.ts`

**Interfaces:**
- Produces:
  - Types: `NodeId`, `TreeNode = { id, key, left, right, p }`, `Tree = { root, nodes, nextId }`, `NilSlot = { parent: NodeId; side: 'left' | 'right' }`, `Pos`.
  - Construction: `emptyTree()` and `newNode(t, key)`, which mutates `t` and returns the id.
  - Queries: `keyOf(t, id)`, `findKey(t, k)`, `inorder(t)` (reachable nodes only), `size(t)` and `inorderSuccessor(t, x)`.
  - Mutations: `replaceChild(t, parent, oldId, newId)`, `removeNode(t, x)` (for a node with at most one child) and `swapPositions(t, a, b)`.
  - `isBst(t)`.
  - `bstLayout(t, nil?)` returns `{ pos, nilPos?, width, height }`.
  - Layout constants: `TREE_SPACING = 44`, `TREE_LEVEL = 64`, `TREE_PAD = 32`.

- [ ] **Step 1: Write the failing test** `src/engine/tree.test.ts`:

```ts
import {
  bstLayout, emptyTree, findKey, inorder, inorderSuccessor, isBst, keyOf, newNode, removeNode,
  replaceChild, size, swapPositions, TREE_LEVEL, TREE_PAD, TREE_SPACING, type NodeId, type Tree,
} from './tree';

// Links a child under a parent (test helper; the real insert lives in structures/bst).
function link(t: Tree, parent: NodeId, child: NodeId, side: 'left' | 'right') {
  t.nodes[parent][side] = child;
  t.nodes[child].p = parent;
}

// 10 with children 5 and 15; 15 has a left child 12.
function sample() {
  const t = emptyTree();
  const a = newNode(t, 10), b = newNode(t, 5), c = newNode(t, 15), d = newNode(t, 12);
  t.root = a;
  link(t, a, b, 'left');
  link(t, a, c, 'right');
  link(t, c, d, 'left');
  return { t, a, b, c, d };
}

test('newNode gives stable increasing ids; unlinked nodes are not part of the tree', () => {
  const t = emptyTree();
  expect(newNode(t, 7)).toBe('n1');
  expect(newNode(t, 3)).toBe('n2');
  expect(size(t)).toBe(0);
  t.root = 'n1';
  expect(size(t)).toBe(1);
});

test('keyOf, findKey, inorder, inorderSuccessor', () => {
  const { t, a, b, c, d } = sample();
  expect(keyOf(t, d)).toBe(12);
  expect(keyOf(t, null)).toBeNull();
  expect(findKey(t, 15)).toBe(c);
  expect(findKey(t, 99)).toBeNull();
  expect(inorder(t)).toEqual([b, a, d, c]);
  expect(inorderSuccessor(t, a)).toBe(d);
  expect(inorderSuccessor(t, c)).toBeNull();
  expect(isBst(t)).toBe(true);
});

test('isBst catches an order violation and a broken parent pointer', () => {
  const { t, d } = sample();
  t.nodes[d].key = 20;
  expect(isBst(t)).toBe(false);
  const s = sample();
  s.t.nodes[s.d].p = s.a;
  expect(isBst(s.t)).toBe(false);
});

test('replaceChild and removeNode splice out a node with at most one child', () => {
  const { t, a, c, d } = sample();
  removeNode(t, c); // 15 has only a left child 12
  expect(t.nodes[a].right).toBe(d);
  expect(t.nodes[d].p).toBe(a);
  expect(t.nodes[c]).toBeUndefined();
  replaceChild(t, null, a, d);
  expect(t.root).toBe(d);
  const single = emptyTree();
  const only = newNode(single, 1);
  single.root = only;
  removeNode(single, only);
  expect(single.root).toBeNull();
  expect(size(single)).toBe(0);
});

test('swapPositions swaps two nodes, including a node and its own child', () => {
  const { t, a, c, d } = sample();
  swapPositions(t, a, d); // not adjacent
  expect(t.root).toBe(d);
  expect(t.nodes[c].left).toBe(a);
  expect(t.nodes[a].p).toBe(c);
  expect(t.nodes[d].right).toBe(c);
  const s = sample();
  swapPositions(s.t, s.c, s.d); // d is c's left child
  expect(s.t.nodes[s.a].right).toBe(s.d);
  expect(s.t.nodes[s.d].left).toBe(s.c);
  expect(s.t.nodes[s.c].p).toBe(s.d);
  expect(s.t.nodes[s.d].p).toBe(s.a);
});

test('bstLayout: x by in-order rank, y by depth; detached nodes in an extra column; NIL slot', () => {
  const { t, a, b, c, d } = sample();
  const z = newNode(t, 11); // detached (as during Tree_Insert)
  const L = bstLayout(t, { parent: d, side: 'left' });
  // In-order: b(5), a(10), d(12), c(15) → ranks 0..3; depth: a 0, b 1, c 1, d 2.
  expect(L.pos[b]).toEqual({ x: TREE_PAD, y: TREE_PAD + TREE_LEVEL });
  expect(L.pos[a]).toEqual({ x: TREE_PAD + TREE_SPACING, y: TREE_PAD });
  expect(L.pos[d]).toEqual({ x: TREE_PAD + 2 * TREE_SPACING, y: TREE_PAD + 2 * TREE_LEVEL });
  expect(L.pos[c]).toEqual({ x: TREE_PAD + 3 * TREE_SPACING, y: TREE_PAD + TREE_LEVEL });
  expect(L.pos[z]).toEqual({ x: TREE_PAD + 4 * TREE_SPACING, y: TREE_PAD });
  expect(L.nilPos).toEqual({ x: L.pos[d].x - TREE_SPACING / 2, y: L.pos[d].y + TREE_LEVEL });
  expect(L.width).toBe(2 * TREE_PAD + 4 * TREE_SPACING);
  expect(L.height).toBe(2 * TREE_PAD + 3 * TREE_LEVEL);
});

test('bstLayout of an empty tree still has a drawable size', () => {
  const L = bstLayout(emptyTree());
  expect(L.pos).toEqual({});
  expect(L.width).toBeGreaterThan(0);
  expect(L.height).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run `npx vitest run src/engine/tree.test.ts` → FAIL (the module is missing).

- [ ] **Step 3: Implement** `src/engine/tree.ts`:

```ts
// Rooted binary tree with stable node ids (pointer model of the lecture: left, right, p).
export type NodeId = string;
export type TreeNode = { id: NodeId; key: number; left: NodeId | null; right: NodeId | null; p: NodeId | null };
export type Tree = { root: NodeId | null; nodes: Record<NodeId, TreeNode>; nextId: number };
// Where a NIL child is drawn when a walk steps off the tree.
export type NilSlot = { parent: NodeId; side: 'left' | 'right' };
export type Pos = { x: number; y: number };

export const TREE_SPACING = 44;
export const TREE_LEVEL = 64;
export const TREE_PAD = 32;

export function emptyTree(): Tree {
  return { root: null, nodes: {}, nextId: 1 };
}

// Adds an unlinked node (DS attributes NIL) and returns its id.
export function newNode(t: Tree, key: number): NodeId {
  const id = `n${t.nextId++}`;
  t.nodes[id] = { id, key, left: null, right: null, p: null };
  return id;
}

export function keyOf(t: Tree, id: NodeId | null): number | null {
  return id === null ? null : t.nodes[id].key;
}

// In-order ids of the nodes reachable from the root.
export function inorder(t: Tree): NodeId[] {
  const out: NodeId[] = [];
  const walk = (id: NodeId | null) => {
    if (id === null) return;
    walk(t.nodes[id].left);
    out.push(id);
    walk(t.nodes[id].right);
  };
  walk(t.root);
  return out;
}

export function size(t: Tree): number {
  return inorder(t).length;
}

export function findKey(t: Tree, k: number): NodeId | null {
  return inorder(t).find((id) => t.nodes[id].key === k) ?? null;
}

export function inorderSuccessor(t: Tree, x: NodeId): NodeId | null {
  const order = inorder(t);
  return order[order.indexOf(x) + 1] ?? null;
}

// Points parent's link (or the root) that held oldId at newId, and fixes newId.p.
export function replaceChild(t: Tree, parent: NodeId | null, oldId: NodeId, newId: NodeId | null): void {
  if (parent === null) t.root = newId;
  else if (t.nodes[parent].left === oldId) t.nodes[parent].left = newId;
  else t.nodes[parent].right = newId;
  if (newId !== null) t.nodes[newId].p = parent;
}

// Removes x, which has at most one child; the child (if any) takes x's place.
export function removeNode(t: Tree, x: NodeId): void {
  const n = t.nodes[x];
  replaceChild(t, n.p, x, n.left ?? n.right);
  delete t.nodes[x];
}

// Exchanges the positions of nodes a and b (the lecture's "swap x and y"); works when one is the other's child.
export function swapPositions(t: Tree, a: NodeId, b: NodeId): void {
  const swap = (id: NodeId | null) => (id === a ? b : id === b ? a : id);
  const A = t.nodes[a];
  const B = t.nodes[b];
  const la = { p: A.p, left: A.left, right: A.right };
  const lb = { p: B.p, left: B.left, right: B.right };
  for (const n of Object.values(t.nodes)) {
    if (n.id === a || n.id === b) continue;
    n.p = swap(n.p);
    n.left = swap(n.left);
    n.right = swap(n.right);
  }
  A.p = swap(lb.p); A.left = swap(lb.left); A.right = swap(lb.right);
  B.p = swap(la.p); B.left = swap(la.left); B.right = swap(la.right);
  t.root = swap(t.root);
}

// BST property (strict, keys unique) and consistent parent pointers.
export function isBst(t: Tree): boolean {
  if (t.root !== null && t.nodes[t.root].p !== null) return false;
  const order = inorder(t);
  for (let i = 1; i < order.length; i++) if (t.nodes[order[i - 1]].key >= t.nodes[order[i]].key) return false;
  return order.every((id) => {
    const n = t.nodes[id];
    return [n.left, n.right].every((c) => c === null || t.nodes[c].p === id);
  });
}

// x = in-order rank, y = depth; nodes not reachable from the root sit in one extra column at the top.
export function bstLayout(t: Tree, nil?: NilSlot): { pos: Record<NodeId, Pos>; nilPos?: Pos; width: number; height: number } {
  const pos: Record<NodeId, Pos> = {};
  const order = inorder(t);
  const depth: Record<NodeId, number> = {};
  const setDepth = (id: NodeId | null, d: number) => {
    if (id === null) return;
    depth[id] = d;
    setDepth(t.nodes[id].left, d + 1);
    setDepth(t.nodes[id].right, d + 1);
  };
  setDepth(t.root, 0);
  order.forEach((id, i) => { pos[id] = { x: TREE_PAD + i * TREE_SPACING, y: TREE_PAD + depth[id] * TREE_LEVEL }; });
  const detached = Object.keys(t.nodes).filter((id) => !(id in pos)).sort();
  detached.forEach((id, i) => { pos[id] = { x: TREE_PAD + (order.length + i) * TREE_SPACING, y: TREE_PAD }; });
  const nilPos = nil && pos[nil.parent]
    ? { x: pos[nil.parent].x + (nil.side === 'left' ? -1 : 1) * (TREE_SPACING / 2), y: pos[nil.parent].y + TREE_LEVEL }
    : undefined;
  const columns = Math.max(1, order.length + detached.length);
  const maxY = Math.max(TREE_PAD, ...Object.values(pos).map((p) => p.y), nilPos?.y ?? 0);
  return { pos, nilPos, width: 2 * TREE_PAD + (columns - 1) * TREE_SPACING, height: maxY + TREE_PAD };
}
```

Check against the test: sample() has 4 in-order nodes plus 1 detached, so 5 columns and width = 2·PAD + 4·SPACING. The NIL slot sits at depth 3, so height = PAD + 3·LEVEL + PAD.

- [ ] **Step 4: Run it to verify it passes**

Run `npx vitest run src/engine/tree.test.ts` → PASS. Run `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/tree.ts src/engine/tree.test.ts
git commit -m "feat(engine): tree model with stable ids, node swap and BST layout"
```

---

### Task 3: Structure contract, tree tracer, BST query operations

**Files:**
- Create: `src/structures/types.ts`, `src/structures/tracer.ts`, `src/structures/testing.ts`, `src/structures/bst/pseudocode.ts`, `src/structures/bst/model.ts`, `src/structures/bst/questions.ts`, `src/structures/bst/queries.ts`, `src/structures/bst/queries.test.ts`

**Interfaces:**
- Consumes: Task 1 `StepCore`, `DSView`, `Question`, `Value`; `Proc` (`src/algorithms/types.ts`); Task 2 everything in `tree.ts`.
- Produces:
  - `TreeView = { tree; highlight: { nodes: NodeId[]; edges: NodeId[] }; tags: Record<string, NodeId>; nil?: NilSlot }`. `highlight.edges` lists child ids; each one marks the edge from that child up to its parent.
  - `TreeStep = StepCore & { view: TreeView; ds: DSView[] }`.
  - `Operation = { id; label; input: 'none' | 'key' | 'node'; procs: string[] }`.
  - `StructureDef = { id; title; procs; operations; questionTypes; presets: { name; keys }[]; maxNodes; build(keys); validate(t, op, key); run(t, op, key) }`.
  - `createTreeTracer(tree)`.
  - `assertValidTreeTrace(def, steps)`.
  - Proc names `TREE_SEARCH = 'Tree_Search'`, `TREE_MINIMUM = 'Tree_Minimum'`, `TREE_SUCCESSOR = 'Tree_Successor'`, `TREE_INSERT = 'Tree_Insert'`, `BST_DELETE = 'Delete'`, and `bstProcs`.
  - `bstInsertKey(t, k)` and `buildBst(keys)`.
  - `runSearch(t, k)`, `runMinimum(t)` and `runSuccessor(t, k)`.
  - `traceMinimum(tr, start, ask)` and `traceSuccessor(tr, x, ask)`.
  - `BST_QUESTION_TYPES`.

- [ ] **Step 1: Write the failing test** `src/structures/bst/queries.test.ts`:

```ts
import { findKey, inorderSuccessor, keyOf, type Tree } from '../../engine/tree';
import { assertQuestionsPredictable } from '../../algorithms/testing';
import { assertValidTreeTrace } from '../testing';
import type { TreeStep } from '../types';
import { buildBst } from './model';
import { bstProcs } from './pseudocode';
import { runMinimum, runSearch, runSuccessor } from './queries';

// Slide-5 tree: inserting in this order reproduces the slide.
const LECTURE = [17, 4, 20, 1, 12, 18, 29, 9, 26, 6, 11, 23];
const lecture = () => buildBst(LECTURE);
const def = { procs: bstProcs };
const last = (s: TreeStep[]) => s[s.length - 1];
const answers = (s: TreeStep[], type: string) =>
  s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);

test('buildBst reproduces slide 5', () => {
  const t = lecture();
  const k = (id: string | null) => keyOf(t, id);
  const n = (key: number) => t.nodes[findKey(t, key)!];
  expect(k(t.root)).toBe(17);
  expect([k(n(17).left), k(n(17).right)]).toEqual([4, 20]);
  expect([k(n(4).left), k(n(4).right)]).toEqual([1, 12]);
  expect([k(n(20).left), k(n(20).right)]).toEqual([18, 29]);
  expect([k(n(12).left), k(n(12).right)]).toEqual([9, null]);
  expect([k(n(9).left), k(n(9).right)]).toEqual([6, 11]);
  expect([k(n(29).left), k(n(26).left)]).toEqual([26, 23]);
});

test('Tree_Search finds 12: call step, then 17 → 4 → 12', () => {
  const steps = runSearch(lecture(), 12);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['Tree_Search', 0]);
  expect(answers(steps, 'bst.search')).toEqual(['go left', 'go right', 'stop here']);
  expect([last(steps).line, last(steps).note]).toEqual([2, 'Returns the node with key 12.']);
  expect(last(steps).ds[0]).toEqual({ kind: 'stack', name: 'Call stack', items: ['Tree_Search(17, 12)', 'Tree_Search(4, 12)', 'Tree_Search(12, 12)'] });
});

test('Tree_Search for an absent key walks off the tree to a NIL slot', () => {
  const t = lecture();
  const steps = runSearch(t, 13);
  expect(answers(steps, 'bst.search')).toEqual(['go left', 'go right', 'go right', 'stop here']);
  const end = last(steps);
  expect([end.line, end.vars.x, end.note]).toEqual([2, null, 'Returns NIL: no node has key 13.']);
  expect(end.view.nil).toEqual({ parent: findKey(t, 12), side: 'right' });
});

test('Tree_Minimum from the root returns 1 and asks once', () => {
  const t = lecture();
  const steps = runMinimum(t);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'bst.minimum')).toEqual([findKey(t, 1)]);
  expect(steps.filter((s) => s.proc === 'Tree_Minimum' && s.line === 2).map((s) => s.vars.x)).toEqual([4, 1]);
  expect([last(steps).line, last(steps).note]).toEqual([3, 'Returns the node with key 1.']);
});

test('Tree_Successor: via Tree_Minimum (17 → 18), by climbing (12 → 17, 11 → 12), and NIL (29)', () => {
  const t = lecture();
  const s17 = runSuccessor(t, 17);
  assertValidTreeTrace(def, s17);
  expect(s17.some((s) => s.proc === 'Tree_Minimum')).toBe(true);
  expect(answers(s17, 'bst.successor')).toEqual([findKey(t, 18)]);
  expect(last(s17).note).toBe('Returns the node with key 18.');
  expect(answers(runSuccessor(t, 12), 'bst.successor')).toEqual([findKey(t, 17)]);
  expect(answers(runSuccessor(t, 11), 'bst.successor')).toEqual([findKey(t, 12)]);
  const s29 = runSuccessor(t, 29);
  expect(answers(s29, 'bst.successor')).toEqual([null]);
  expect([last(s29).line, last(s29).note]).toEqual([7, 'Returns NIL: x has the largest key.']);
});

test('queries leave the tree unchanged and never share snapshots', () => {
  const t = lecture();
  const before = structuredClone(t);
  const steps = runSearch(t, 6);
  expect(t).toEqual(before);
  expect(last(steps).view.tree).toEqual(before);
  expect(steps[0].view.tree).not.toBe(steps[1].view.tree);
});

function checkPredictable(steps: TreeStep[]) {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    const T: Tree = prev.view.tree;
    if (q.type === 'bst.search') {
      const x = step.view.tags.x ?? null;
      const k = step.vars.k as number;
      const want = x === null || T.nodes[x].key === k ? 'stop here' : k < T.nodes[x].key ? 'go left' : 'go right';
      expect(q.answer.value).toBe(want);
      expect(prev.note ?? '').not.toMatch(/Returns/);
    } else if (q.type === 'bst.minimum') {
      expect(prev.line).toBe(0);
      const order = Object.keys(T.nodes).sort((a, b) => T.nodes[a].key - T.nodes[b].key);
      expect(q.answer.value).toBe(order[0]);
    } else if (q.type === 'bst.successor') {
      expect(q.answer.value).toBe(inorderSuccessor(T, step.view.tags.x));
      expect(prev.note ?? '').not.toMatch(/Returns/);
    } else {
      throw new Error(`unexpected ${q.type}`);
    }
  });
}

test('questions are predictable from the step before them', () => {
  const t = lecture();
  for (const k of [12, 13, 1, 30]) checkPredictable(runSearch(t, k));
  checkPredictable(runMinimum(t));
  for (const k of LECTURE) checkPredictable(runSuccessor(t, k));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run `npx vitest run src/structures/bst` → FAIL (the modules are missing).

- [ ] **Step 3: Implement**

`src/structures/types.ts`:

```ts
import type { Proc } from '../algorithms/types';
import type { DSView, StepCore } from '../engine/trace';
import type { NilSlot, NodeId, Tree } from '../engine/tree';

export type TreeView = {
  tree: Tree;
  // nodes: highlighted nodes; edges: child ids whose edge to their parent is highlighted.
  highlight: { nodes: NodeId[]; edges: NodeId[] };
  // Pointer variables drawn beside the node they point to (x, y, z, …).
  tags: Record<string, NodeId>;
  nil?: NilSlot;
};
export type TreeStep = StepCore & { view: TreeView; ds: DSView[] };

export type Operation = { id: string; label: string; input: 'none' | 'key' | 'node'; procs: string[] };

export type StructureDef = {
  id: string;
  title: string;
  procs: Proc[];
  operations: Operation[];
  questionTypes: { type: string; label: string }[];
  presets: { name: string; keys: number[] }[];
  maxNodes: number;
  build(keys: number[]): Tree;
  validate(t: Tree, op: string, key: number | null): string[];
  run(t: Tree, op: string, key: number | null): TreeStep[];
};
```

`src/structures/tracer.ts`:

```ts
import type { Question, Value } from '../engine/trace';
import type { NilSlot, NodeId, Tree } from '../engine/tree';
import type { TreeStep } from './types';

export type TreeEmit = {
  bigStep?: boolean;
  nodes?: NodeId[];
  edges?: NodeId[];
  nil?: NilSlot;
  note?: string;
  question?: Question;
};

export type TreeTracer = {
  tree: Tree;
  steps: TreeStep[];
  // Pointer variables of the running frame; shown as keys in the variables line and as tags on the tree.
  ptr: Record<string, NodeId | null>;
  // Other variables (e.g. k).
  extra: Record<string, Value>;
  stack: string[];
  emit(proc: string, line: number, o?: TreeEmit): void;
};

export function createTreeTracer(tree: Tree): TreeTracer {
  const tr: TreeTracer = {
    tree,
    steps: [],
    ptr: {},
    extra: {},
    stack: [],
    emit(proc, line, o = {}) {
      const vars: Record<string, Value> = { ...tr.extra };
      const tags: Record<string, NodeId> = {};
      for (const [name, id] of Object.entries(tr.ptr)) {
        vars[name] = id === null ? null : tr.tree.nodes[id].key;
        if (id !== null) tags[name] = id;
      }
      tr.steps.push(structuredClone({
        proc,
        line,
        bigStep: o.bigStep ?? false,
        vars,
        note: o.note,
        question: o.question,
        view: { tree: tr.tree, highlight: { nodes: o.nodes ?? [], edges: o.edges ?? [] }, tags, nil: o.nil },
        ds: tr.stack.length > 0 ? [{ kind: 'stack' as const, name: 'Call stack', items: tr.stack }] : [],
      }));
    },
  };
  return tr;
}
```

`src/structures/testing.ts`:

```ts
import type { Proc } from '../algorithms/types';
import type { StepCore } from '../engine/trace';

// Like assertValidTrace, but the first step may be the call step (line 0).
export function assertValidTreeTrace(def: { procs: Proc[] }, steps: StepCore[]): void {
  if (steps.length === 0) throw new Error('Trace is empty');
  steps.forEach((s, i) => {
    const proc = def.procs.find((p) => p.name === s.proc);
    if (!proc) throw new Error(`Step ${i}: unknown proc ${s.proc}`);
    const min = i === 0 ? 0 : 1;
    if (s.line < min || s.line > proc.lines.length) throw new Error(`Step ${i}: ${s.proc} has no line ${s.line}`);
  });
  if (steps[0].line !== 0) throw new Error('Step 0 must be the call step (line 0)');
}
```

`src/structures/bst/pseudocode.ts`:

```ts
import type { Proc } from '../../algorithms/types';

export const TREE_SEARCH = 'Tree_Search';
export const TREE_MINIMUM = 'Tree_Minimum';
export const TREE_SUCCESSOR = 'Tree_Successor';
export const TREE_INSERT = 'Tree_Insert';
export const BST_DELETE = 'Delete';

// Efficient DS slides 7–10; slides 11–14 give delete as four cases, not pseudocode.
export const bstProcs: Proc[] = [
  {
    name: TREE_SEARCH,
    signature: 'Tree_Search(x, k)',
    lines: [
      'if x == nil or x.key == k then',
      '    return x',
      'if k < x.key then',
      '    return Tree_Search(x.left, k)',
      'else return Tree_Search(x.right, k)',
    ],
  },
  {
    name: TREE_MINIMUM,
    signature: 'Tree_Minimum(x)',
    lines: ['while x.left ≠ NIL do', '    x = x.left', 'return x'],
  },
  {
    name: TREE_SUCCESSOR,
    signature: 'Tree_Successor(x)',
    lines: [
      'if x.right ≠ NIL then',
      '    return Tree_Minimum(x.right)',
      'y = x.p',
      'while y ≠ NIL and x == y.right do',
      '    x = y',
      '    y = y.p',
      'return y',
    ],
  },
  {
    name: TREE_INSERT,
    signature: 'Tree_Insert(T, z)',
    lines: [
      'if T.root == NIL then',
      '    T.root = z',
      'else',
      '    y = T.root',
      '    x = NIL',
      '    while y ≠ NIL do',
      '        x = y',
      '        if z.key < y.key then',
      '            y = y.left',
      '        else y = y.right',
      '    z.p = x',
      '    if z.key < x.key then',
      '        x.left = z',
      '    else x.right = z',
    ],
  },
  {
    name: BST_DELETE,
    signature: 'Deleting node x (slides 11–14)',
    lines: [
      'case 1: x is a leaf',
      '    not much to do: remove x',
      'case 2: x has a right child y and no left child',
      '    replace x with y',
      'case 3: x has a left child y and no right child',
      '    replace x with y',
      'case 4: x has two children',
      "    find x's successor y (in x's right subtree)",
      '    swap x and y',
      '    remove x    ▷ now x has ≤ 1 child',
    ],
  },
];
```

`src/structures/bst/model.ts`:

```ts
import { emptyTree, newNode, type Tree } from '../../engine/tree';

// Plain (untraced) BST insert, used to build presets and kept results.
export function bstInsertKey(t: Tree, k: number): void {
  const z = newNode(t, k);
  let x: string | null = null;
  let y = t.root;
  while (y !== null) {
    x = y;
    y = k < t.nodes[y].key ? t.nodes[y].left : t.nodes[y].right;
  }
  t.nodes[z].p = x;
  if (x === null) t.root = z;
  else if (k < t.nodes[x].key) t.nodes[x].left = z;
  else t.nodes[x].right = z;
}

export function buildBst(keys: number[]): Tree {
  const t = emptyTree();
  for (const k of keys) bstInsertKey(t, k);
  return t;
}
```

`src/structures/bst/questions.ts`:

```ts
import type { Question } from '../../engine/trace';

export const BST_QUESTION_TYPES = [
  { type: 'bst.search', label: 'Tree_Search: stop, left or right' },
  { type: 'bst.minimum', label: 'Which node Tree_Minimum returns' },
  { type: 'bst.successor', label: 'Which node Tree_Successor returns' },
  { type: 'bst.insert', label: 'Tree_Insert: does z go left or right' },
  { type: 'bst.deleteCase', label: 'Which delete case applies' },
];

export type SearchMove = 'stop here' | 'go left' | 'go right';

export function searchQuestion(xKey: number | null, k: number, move: SearchMove): Question {
  const at = xKey === null ? 'x = NIL' : `x.key = ${xKey}`;
  const why: Record<SearchMove, string> = {
    'stop here': xKey === null ? 'x == nil, so Tree_Search returns NIL.' : `x.key == k = ${k}, so Tree_Search returns x.`,
    'go left': `k = ${k} < x.key = ${xKey}, so the search continues in x.left.`,
    'go right': `k = ${k} > x.key = ${xKey}, so the search continues in x.right.`,
  };
  return {
    type: 'bst.search',
    prompt: `Tree_Search(x, ${k}) with ${at}: stop here, go left, or go right?`,
    answer: { kind: 'choice', value: move, options: ['stop here', 'go left', 'go right'] },
    explain: why[move],
  };
}

export function nodeQuestion(type: string, prompt: string, id: string | null, label: string, nil: boolean, explain: string): Question {
  return { type, prompt, answer: { kind: 'node', value: id, label, nil }, explain };
}
```

`src/structures/bst/queries.ts`:

```ts
import { keyOf, type NodeId, type Tree } from '../../engine/tree';
import { createTreeTracer, type TreeTracer } from '../tracer';
import type { TreeStep } from '../types';
import { TREE_MINIMUM, TREE_SEARCH, TREE_SUCCESSOR } from './pseudocode';
import { nodeQuestion, searchQuestion, type SearchMove } from './questions';

const label = (t: Tree, id: NodeId | null) => (id === null ? 'NIL' : String(t.nodes[id].key));

export function runSearch(t0: Tree, k: number): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.extra = { k };
  tr.ptr = { x: T.root };
  tr.stack = [`Tree_Search(${label(T, T.root)}, ${k})`];
  tr.emit(TREE_SEARCH, 0, { nodes: T.root ? [T.root] : [], note: `Tree_Search(T.root, ${k})` });
  let x = T.root;
  let parent: NodeId | null = null;
  let side: 'left' | 'right' = 'left';
  for (;;) {
    tr.ptr = { x };
    const nil = x === null && parent !== null ? { parent, side } : undefined;
    const xKey = keyOf(T, x);
    const move: SearchMove = x === null || xKey === k ? 'stop here' : k < xKey! ? 'go left' : 'go right';
    tr.emit(TREE_SEARCH, 1, {
      bigStep: true,
      nodes: x ? [x] : [],
      nil,
      note: x === null ? 'x == nil.' : `x.key = ${xKey} ${xKey === k ? '==' : '≠'} k = ${k}.`,
      question: searchQuestion(xKey, k, move),
    });
    if (move === 'stop here') {
      tr.emit(TREE_SEARCH, 2, {
        nodes: x ? [x] : [],
        nil,
        note: x === null ? `Returns NIL: no node has key ${k}.` : `Returns the node with key ${k}.`,
      });
      return tr.steps;
    }
    const goLeft = move === 'go left';
    tr.emit(TREE_SEARCH, 3, { nodes: [x!], note: `k = ${k} ${goLeft ? '<' : '>'} x.key = ${xKey}.` });
    const next = goLeft ? T.nodes[x!].left : T.nodes[x!].right;
    tr.emit(TREE_SEARCH, goLeft ? 4 : 5, { nodes: [x!], edges: next ? [next] : [] });
    tr.stack = [...tr.stack, `Tree_Search(${label(T, next)}, ${k})`];
    parent = x;
    side = goLeft ? 'left' : 'right';
    x = next;
  }
}

// Runs Tree_Minimum(start) inside tr; ask adds the "which node" question on its first line.
export function traceMinimum(tr: TreeTracer, start: NodeId, ask: boolean): NodeId {
  const T = tr.tree;
  let x = start;
  let answer = start;
  while (T.nodes[answer].left !== null) answer = T.nodes[answer].left!;
  let first = true;
  for (;;) {
    tr.ptr = { x };
    const left = T.nodes[x].left;
    tr.emit(TREE_MINIMUM, 1, {
      bigStep: true,
      nodes: [x],
      edges: left ? [left] : [],
      note: left ? 'x.left ≠ NIL.' : 'x.left = NIL, so the loop ends.',
      question: first && ask
        ? nodeQuestion('bst.minimum', `Which node will Tree_Minimum(${T.nodes[start].key}) return?`, answer,
          label(T, answer), false, 'Tree_Minimum keeps going left until x.left = NIL.')
        : undefined,
    });
    first = false;
    if (left === null) break;
    x = left;
    tr.ptr = { x };
    tr.emit(TREE_MINIMUM, 2, { nodes: [x] });
  }
  tr.emit(TREE_MINIMUM, 3, { nodes: [x], note: `Returns the node with key ${T.nodes[x].key}.` });
  return x;
}

export function runMinimum(t0: Tree): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.ptr = { x: T.root };
  tr.stack = [`Tree_Minimum(${label(T, T.root)})`];
  tr.emit(TREE_MINIMUM, 0, { nodes: [T.root!], note: 'Tree_Minimum(T.root)' });
  traceMinimum(tr, T.root!, true);
  return tr.steps;
}

// Runs Tree_Successor(x) inside tr; returns the successor (or null).
export function traceSuccessor(tr: TreeTracer, xStart: NodeId, ask: boolean): NodeId | null {
  const T = tr.tree;
  // The answer, worked out independently of the walk below (smallest key greater than x.key).
  const bigger = Object.values(T.nodes).filter((n) => n.key > T.nodes[xStart].key).sort((a, b) => a.key - b.key);
  const answer = bigger[0]?.id ?? null;
  let x = xStart;
  tr.ptr = { x };
  tr.stack = [...tr.stack, `Tree_Successor(${T.nodes[x].key})`];
  const r = T.nodes[x].right;
  tr.emit(TREE_SUCCESSOR, 1, {
    nodes: [x],
    edges: r ? [r] : [],
    note: r ? 'x.right ≠ NIL.' : 'x.right = NIL.',
    question: ask
      ? nodeQuestion('bst.successor', `Which node will Tree_Successor(${T.nodes[x].key}) return?`, answer,
        label(T, answer), true,
        answer === null
          ? `${T.nodes[x].key} is the largest key, so there is no successor (NIL).`
          : `${label(T, answer)} is the smallest key greater than ${T.nodes[x].key}.`)
      : undefined,
  });
  if (r !== null) {
    tr.emit(TREE_SUCCESSOR, 2, { nodes: [x], edges: [r] });
    tr.stack = [...tr.stack, `Tree_Minimum(${T.nodes[r].key})`];
    const m = traceMinimum(tr, r, false);
    tr.stack = tr.stack.slice(0, -2);
    return m;
  }
  let y = T.nodes[x].p;
  tr.ptr = { x, y };
  tr.emit(TREE_SUCCESSOR, 3, { nodes: y ? [x, y] : [x], edges: y ? [x] : [] });
  for (;;) {
    const climb = y !== null && x === T.nodes[y].right;
    tr.emit(TREE_SUCCESSOR, 4, {
      bigStep: true,
      nodes: y ? [x, y] : [x],
      note: y === null ? 'y = NIL, so the loop ends.' : climb ? 'x == y.right: keep climbing.' : 'x is y.left, so the loop ends.',
    });
    if (!climb) break;
    x = y!;
    tr.ptr = { x, y };
    tr.emit(TREE_SUCCESSOR, 5, { nodes: [x] });
    y = T.nodes[y!].p;
    tr.ptr = { x, y };
    tr.emit(TREE_SUCCESSOR, 6, { nodes: y ? [y] : [] });
  }
  tr.emit(TREE_SUCCESSOR, 7, {
    nodes: y ? [y] : [],
    note: y === null ? 'Returns NIL: x has the largest key.' : `Returns the node with key ${T.nodes[y].key}.`,
  });
  tr.stack = tr.stack.slice(0, -1);
  return y;
}

export function runSuccessor(t0: Tree, k: number): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  const x = Object.values(T.nodes).find((n) => n.key === k)!.id;
  tr.ptr = { x };
  tr.emit(TREE_SUCCESSOR, 0, { nodes: [x], note: `Tree_Successor(x) for the node with key ${k}` });
  traceSuccessor(tr, x, true);
  return tr.steps;
}
```

Check the Successor tests against this code:
- 17 has right child 20, so Tree_Minimum(20) runs and returns 18.
- 12 has no right child. y = 4 and 12 == 4.right, so it climbs: x = 4, y = 17. Then 4 is 17's left child, so the loop stops and it returns 17.
- 29 climbs to the root, and it returns NIL.

- [ ] **Step 4: Run it to verify it passes**

Run `npx vitest run src/structures` → PASS. Run `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/structures
git commit -m "feat(bst): structure contract, tree tracer, Tree_Search/Minimum/Successor"
```

---

### Task 4: BST insert, delete and the structure definition

**Files:**
- Create: `src/structures/bst/updates.ts`, `src/structures/bst/updates.test.ts`, `src/structures/bst/index.ts`, `src/structures/registry.ts`

**Interfaces:**
- Consumes: Task 2 `newNode`, `removeNode`, `swapPositions`, `findKey`, `size`, `isBst`, `inorder`; Task 3 tracer, `traceSuccessor`, `runSearch`, `runMinimum`, `runSuccessor`, procs and questions.
- Produces:
  - `runInsert(t, k)` and `runDelete(t, k)`.
  - `bst: StructureDef`, with id `bst` and title `Binary Search Tree (BST)`.
  - `STRUCTURES = [bst]`.
  - Validation messages, exact text:
    - `'Enter an integer key.'`
    - `'Tree Minimum is undefined on an empty tree.'`
    - `` `No node with key ${k}.` ``
    - `` `Key ${k} is already in the tree (keys must be unique).` ``
    - `'The tree is limited to 15 nodes so it stays readable.'`

- [ ] **Step 1: Write the failing test** `src/structures/bst/updates.test.ts`:

```ts
import { assertQuestionsPredictable } from '../../algorithms/testing';
import { findKey, inorder, isBst, keyOf, size, type Tree } from '../../engine/tree';
import { mulberry32 } from '../../algorithms/sssp/reference';
import { assertValidTreeTrace } from '../testing';
import type { TreeStep } from '../types';
import { bst } from './index';
import { buildBst } from './model';
import { runDelete, runInsert } from './updates';

const LECTURE = [17, 4, 20, 1, 12, 18, 29, 9, 26, 6, 11, 23];
const last = (s: TreeStep[]) => s[s.length - 1];
const result = (s: TreeStep[]) => last(s).view.tree;
const keys = (t: Tree) => inorder(t).map((id) => t.nodes[id].key);
const answers = (s: TreeStep[], type: string) =>
  s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);

test('Tree_Insert 10 on slide 5: left, right, left, right, left; 10 becomes 11.left', () => {
  const steps = runInsert(buildBst(LECTURE), 10);
  assertValidTreeTrace(bst, steps);
  expect(answers(steps, 'bst.insert')).toEqual(['left', 'right', 'left', 'right', 'left']);
  const t = result(steps);
  expect(isBst(t)).toBe(true);
  expect(keyOf(t, t.nodes[findKey(t, 11)!].left)).toBe(10);
  expect([last(steps).line, size(t)]).toEqual([13, 13]);
});

test('Tree_Insert into an empty tree runs lines 1–2', () => {
  const steps = runInsert(buildBst([]), 5);
  expect(steps.map((s) => s.line)).toEqual([0, 1, 2]);
  expect(keys(result(steps))).toEqual([5]);
});

test('z is drawn detached until it is linked on line 13/14', () => {
  const steps = runInsert(buildBst(LECTURE), 30);
  const z = last(steps).view.tags.z;
  const linked = (s: TreeStep) => inorder(s.view.tree).includes(z);
  expect(steps.filter((s) => s.line === 11).every((s) => !linked(s))).toBe(true);
  expect(linked(last(steps))).toBe(true);
  expect(last(steps).line).toBe(14);
});

test('delete case 1 (leaf 1), case 3 (26), case 2 (1 on a path)', () => {
  const leaf = runDelete(buildBst(LECTURE), 1);
  expect(answers(leaf, 'bst.deleteCase')).toEqual(['case 1: x is a leaf']);
  expect(keys(result(leaf))).toEqual([4, 6, 9, 11, 12, 17, 18, 20, 23, 26, 29]);
  const left = runDelete(buildBst(LECTURE), 26);
  expect(answers(left, 'bst.deleteCase')).toEqual(['case 3: only a left child']);
  const t = result(left);
  expect(keyOf(t, t.nodes[findKey(t, 29)!].left)).toBe(23);
  const right = runDelete(buildBst([1, 2, 3]), 1);
  expect(answers(right, 'bst.deleteCase')).toEqual(['case 2: only a right child']);
  expect(keyOf(result(right), result(right).root)).toBe(2);
  for (const s of [leaf, left, right]) {
    assertValidTreeTrace(bst, s);
    expect(isBst(result(s))).toBe(true);
  }
});

test('delete case 4 (17): Tree_Successor finds 18, 18 takes the root, 17 is removed as a leaf', () => {
  const steps = runDelete(buildBst(LECTURE), 17);
  assertValidTreeTrace(bst, steps);
  expect(answers(steps, 'bst.deleteCase')).toEqual(['case 4: two children']);
  expect(steps.some((s) => s.proc === 'Tree_Successor')).toBe(true);
  expect(steps.map((s) => s.line).filter((l, i) => steps[i].proc === 'Delete')).toEqual([0, 1, 3, 5, 7, 8, 9, 10]);
  const t = result(steps);
  expect(keyOf(t, t.root)).toBe(18);
  expect(isBst(t)).toBe(true);
  expect(findKey(t, 17)).toBeNull();
  expect(last(steps).note).toBe('x now has no children (case 1), so it is removed.');
});

test('delete case 4 where the successor is x.right itself (9 → 11)', () => {
  const t = result(runDelete(buildBst(LECTURE), 9));
  expect(isBst(t)).toBe(true);
  const n11 = t.nodes[findKey(t, 11)!];
  expect([keyOf(t, n11.p), keyOf(t, n11.left), keyOf(t, n11.right)]).toEqual([12, 6, null]);
});

test('deleting the only node empties the tree; Minimum is then blocked, Insert still works', () => {
  const t = result(runDelete(buildBst([7]), 7));
  expect(t.root).toBeNull();
  expect(bst.validate(t, 'minimum', null)).toEqual(['Tree Minimum is undefined on an empty tree.']);
  expect(bst.validate(t, 'insert', 3)).toEqual([]);
});

test('validate: unique keys, existing nodes, node limit, missing key', () => {
  const t = buildBst(LECTURE);
  expect(bst.validate(t, 'insert', 12)).toEqual(['Key 12 is already in the tree (keys must be unique).']);
  expect(bst.validate(t, 'delete', 13)).toEqual(['No node with key 13.']);
  expect(bst.validate(t, 'successor', 13)).toEqual(['No node with key 13.']);
  expect(bst.validate(t, 'search', 13)).toEqual([]);
  expect(bst.validate(t, 'search', null)).toEqual(['Enter an integer key.']);
  const full = buildBst([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  expect(bst.validate(full, 'insert', 16)).toEqual(['The tree is limited to 15 nodes so it stays readable.']);
});

test('run dispatches every operation', () => {
  const t = buildBst(LECTURE);
  for (const op of bst.operations) {
    const k = op.input === 'none' ? null : op.id === 'insert' ? 5 : 12;
    expect(bst.validate(t, op.id, k)).toEqual([]);
    assertValidTreeTrace(bst, bst.run(t, op.id, k));
  }
});

function checkPredictable(steps: TreeStep[]) {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    const T = prev.view.tree;
    if (q.type === 'bst.insert') {
      expect(prev.line).toBe(7);
      expect(q.answer.value).toBe((step.vars.z as number) < (step.vars.y as number) ? 'left' : 'right');
    } else if (q.type === 'bst.deleteCase') {
      const x = T.nodes[step.view.tags.x];
      const want = x.left === null && x.right === null ? 'case 1: x is a leaf'
        : x.left === null ? 'case 2: only a right child'
        : x.right === null ? 'case 3: only a left child' : 'case 4: two children';
      expect(q.answer.value).toBe(want);
      expect(prev.line).toBe(0);
    } else if (q.type === 'bst.successor') {
      expect(prev.note ?? '').not.toMatch(/Returns/);
    } else {
      throw new Error(`unexpected ${q.type}`);
    }
  });
}

test('questions are predictable; random insert/delete sequences keep a valid BST', () => {
  const rand = mulberry32(21);
  let t = buildBst([]);
  const model = new Set<number>();
  for (let n = 0; n < 200; n++) {
    const k = 1 + Math.floor(rand() * 20);
    const op = model.has(k) ? 'delete' : 'insert';
    if (bst.validate(t, op, k).length > 0) continue;
    const steps = bst.run(t, op, k);
    assertValidTreeTrace(bst, steps);
    checkPredictable(steps);
    t = result(steps);
    if (op === 'insert') model.add(k);
    else model.delete(k);
    expect(isBst(t)).toBe(true);
    expect(keys(t)).toEqual([...model].sort((a, b) => a - b));
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run `npx vitest run src/structures/bst/updates.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`src/structures/bst/updates.ts`:

```ts
import { newNode, removeNode, swapPositions, type NodeId, type Tree } from '../../engine/tree';
import type { Question } from '../../engine/trace';
import { createTreeTracer } from '../tracer';
import type { TreeStep } from '../types';
import { BST_DELETE, TREE_INSERT } from './pseudocode';
import { traceSuccessor } from './queries';

function insertQuestion(zKey: number, yKey: number): Question {
  const left = zKey < yKey;
  return {
    type: 'bst.insert',
    prompt: `Line 8: z.key = ${zKey}, y.key = ${yKey}. Does z go left or right of y?`,
    answer: { kind: 'choice', value: left ? 'left' : 'right', options: ['left', 'right'] },
    explain: `${zKey} ${left ? '<' : '>'} ${yKey}, so y moves to y.${left ? 'left' : 'right'}.`,
  };
}

export function runInsert(t0: Tree, k: number): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  const z = newNode(T, k);
  tr.ptr = { z };
  tr.emit(TREE_INSERT, 0, { nodes: [z], note: `Tree_Insert(T, z) with z.key = ${k}` });
  tr.emit(TREE_INSERT, 1, { note: T.root === null ? 'T.root == NIL.' : 'T.root ≠ NIL.' });
  if (T.root === null) {
    T.root = z;
    tr.emit(TREE_INSERT, 2, { nodes: [z] });
    return tr.steps;
  }
  tr.emit(TREE_INSERT, 3);
  let y: NodeId | null = T.root;
  tr.ptr = { z, y };
  tr.emit(TREE_INSERT, 4, { nodes: [y] });
  let x: NodeId | null = null;
  tr.ptr = { z, y, x };
  tr.emit(TREE_INSERT, 5);
  let side: 'left' | 'right' = 'left';
  for (;;) {
    tr.emit(TREE_INSERT, 6, {
      bigStep: true,
      nodes: y ? [y] : [],
      nil: y === null && x !== null ? { parent: x, side } : undefined,
      note: y === null ? 'y = NIL, so the loop ends.' : 'y ≠ NIL.',
    });
    if (y === null) break;
    x = y;
    tr.ptr = { z, y, x };
    tr.emit(TREE_INSERT, 7, { nodes: [x] });
    const yKey = T.nodes[y].key;
    const left = k < yKey;
    tr.emit(TREE_INSERT, 8, { nodes: [y], note: `z.key = ${k} ${left ? '<' : '>'} y.key = ${yKey}.`, question: insertQuestion(k, yKey) });
    side = left ? 'left' : 'right';
    y = left ? T.nodes[y].left : T.nodes[y].right;
    tr.ptr = { z, y, x };
    tr.emit(TREE_INSERT, left ? 9 : 10, { nodes: y ? [y] : [], edges: y ? [y] : [] });
  }
  T.nodes[z].p = x;
  tr.ptr = { z, x };
  tr.emit(TREE_INSERT, 11, { nodes: [z, x!] });
  const left = k < T.nodes[x!].key;
  tr.emit(TREE_INSERT, 12, { nodes: [z, x!], note: `z.key = ${k} ${left ? '<' : '>'} x.key = ${T.nodes[x!].key}.` });
  if (left) T.nodes[x!].left = z;
  else T.nodes[x!].right = z;
  tr.emit(TREE_INSERT, left ? 13 : 14, { nodes: [z], edges: [z] });
  return tr.steps;
}

const CASES = ['case 1: x is a leaf', 'case 2: only a right child', 'case 3: only a left child', 'case 4: two children'];

function caseQuestion(xKey: number, c: number): Question {
  const why = [
    `${xKey} has no children, so it is a leaf.`,
    `${xKey} has a right child and no left child.`,
    `${xKey} has a left child and no right child.`,
    `${xKey} has two children.`,
  ];
  return {
    type: 'bst.deleteCase',
    prompt: `Deleting node x with key ${xKey}: which case applies?`,
    answer: { kind: 'choice', value: CASES[c - 1], options: CASES },
    explain: why[c - 1],
  };
}

export function runDelete(t0: Tree, k: number): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  const x = Object.values(T.nodes).find((n) => n.key === k)!.id;
  tr.ptr = { x };
  tr.stack = ['Deleting node x'];
  tr.emit(BST_DELETE, 0, { nodes: [x], note: `Deleting node x with key ${k}` });
  const X = T.nodes[x];
  const c = X.left === null && X.right === null ? 1 : X.left === null ? 2 : X.right === null ? 3 : 4;
  tr.emit(BST_DELETE, 1, { nodes: [x], note: c === 1 ? 'x is a leaf.' : 'x is not a leaf.', question: caseQuestion(k, c) });
  if (c === 1) {
    removeNode(T, x);
    tr.ptr = {};
    tr.emit(BST_DELETE, 2, { note: 'Not much to do: x is removed.' });
    return tr.steps;
  }
  tr.emit(BST_DELETE, 3, { nodes: [x], note: c === 2 ? 'x has a right child y and no left child.' : 'No.' });
  if (c === 2) {
    const y = X.right!;
    removeNode(T, x);
    tr.ptr = { y };
    tr.emit(BST_DELETE, 4, { nodes: [y], edges: [y], note: 'y takes the place of x.' });
    return tr.steps;
  }
  tr.emit(BST_DELETE, 5, { nodes: [x], note: c === 3 ? 'x has a left child y and no right child.' : 'No.' });
  if (c === 3) {
    const y = X.left!;
    removeNode(T, x);
    tr.ptr = { y };
    tr.emit(BST_DELETE, 6, { nodes: [y], edges: [y], note: 'y takes the place of x.' });
    return tr.steps;
  }
  tr.emit(BST_DELETE, 7, { nodes: [x], note: 'x has two children.' });
  tr.emit(BST_DELETE, 8, { nodes: [x] });
  const y = traceSuccessor(tr, x, true)!;
  swapPositions(T, x, y);
  tr.ptr = { x, y };
  tr.emit(BST_DELETE, 9, { nodes: [x, y], note: 'x and y swap places.' });
  const child = T.nodes[x].right;
  removeNode(T, x);
  tr.ptr = { y };
  tr.emit(BST_DELETE, 10, {
    nodes: child ? [child] : [],
    note: child === null
      ? 'x now has no children (case 1), so it is removed.'
      : 'x now has only a right child (case 2), so that child takes its place.',
  });
  return tr.steps;
}
```

`src/structures/bst/index.ts`:

```ts
import { findKey, size, type Tree } from '../../engine/tree';
import type { StructureDef } from '../types';
import { buildBst } from './model';
import { BST_DELETE, bstProcs, TREE_INSERT, TREE_MINIMUM, TREE_SEARCH, TREE_SUCCESSOR } from './pseudocode';
import { runMinimum, runSearch, runSuccessor } from './queries';
import { BST_QUESTION_TYPES } from './questions';
import { runDelete, runInsert } from './updates';

const MAX_NODES = 15;

function validate(t: Tree, op: string, k: number | null): string[] {
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

export const bst: StructureDef = {
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
  validate,
  run(t, op, k) {
    switch (op) {
      case 'search': return runSearch(t, k!);
      case 'minimum': return runMinimum(t);
      case 'successor': return runSuccessor(t, k!);
      case 'insert': return runInsert(t, k!);
      case 'delete': return runDelete(t, k!);
      default: throw new Error(`Unknown BST operation ${op}`);
    }
  },
};
```

`src/structures/registry.ts`:

```ts
import { bst } from './bst';
import type { StructureDef } from './types';

export const STRUCTURES: StructureDef[] = [bst];
```

Check the delete tests against this code:
- **Delete 17.** The case questions run first on the Delete lines (1, 3, 5, 7, 8). Then Tree_Successor(17) runs: 17 has a right child, so Tree_Minimum(20) returns 18. Delete line 9 swaps 17 and 18, putting 18 at the root and 17 at 20.left as a leaf. Line 10 removes 17. The test lists only the Delete-proc lines: `[0, 1, 3, 5, 7, 8, 9, 10]`.
- **Delete 9.** Tree_Successor(9): 9 has right child 11, and Tree_Minimum(11) returns 11, which is adjacent to 9. The swap puts 11 at 12.left with left child 6 and right child 9. 9 is then a leaf, and removing it leaves 11.right = NIL.

- [ ] **Step 4: Run it to verify it passes**

Run `npx vitest run src/structures` → PASS. If the random test finds a failing sequence, fix the code; don't change the seed. Run `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/structures/bst/updates.ts src/structures/bst/updates.test.ts src/structures/bst/index.ts src/structures/registry.ts
git commit -m "feat(bst): Tree_Insert, the four delete cases, validation and the BST definition"
```

---

### Task 5: TreeCanvas

**Files:**
- Create: `src/ui/TreeCanvas.tsx`, `src/ui/TreeCanvas.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 2 `bstLayout`, `TREE_*` constants and `inorder`; Task 3 `TreeView`.
- Produces: `TreeCanvas({ view, onNodeClick? })`.
  - Each node is `<g data-node={id} className="tnode …">`, with the key text inside and a `.ptr-tag` text holding its tags.
  - Each edge is `<line data-edge={childId} className="tree-edge …">`.
  - The NIL slot is `<g className="nil-slot">`.
  - An empty tree shows the text "T.root = NIL (empty tree)".

- [ ] **Step 1: Write the failing test** `src/ui/TreeCanvas.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { newNode } from '../engine/tree';
import { buildBst } from '../structures/bst/model';
import type { TreeView } from '../structures/types';
import { TreeCanvas } from './TreeCanvas';

const view = (over: Partial<TreeView> = {}): TreeView => ({
  tree: buildBst([10, 5, 15]),
  highlight: { nodes: [], edges: [] },
  tags: {},
  ...over,
});

test('draws each node with its key and each parent edge', () => {
  const { container } = render(<TreeCanvas view={view()} />);
  expect(container.querySelectorAll('.tnode')).toHaveLength(3);
  expect(container.querySelector('[data-node="n1"]')).toHaveTextContent('10');
  expect(container.querySelectorAll('.tree-edge')).toHaveLength(2);
});

test('highlights, pointer tags and the NIL slot come from the view', () => {
  const v = view({
    highlight: { nodes: ['n2'], edges: ['n2'] },
    tags: { x: 'n2', y: 'n2', z: 'n1' },
    nil: { parent: 'n2', side: 'left' },
  });
  const { container } = render(<TreeCanvas view={v} />);
  expect(container.querySelector('[data-node="n2"]')).toHaveClass('tnode', 'active');
  expect(container.querySelector('[data-edge="n2"]')).toHaveClass('tree-edge', 'active');
  expect(container.querySelector('[data-node="n2"] .ptr-tag')).toHaveTextContent('x, y');
  expect(container.querySelector('[data-node="n1"] .ptr-tag')).toHaveTextContent('z');
  expect(container.querySelector('.nil-slot')).toHaveTextContent('NIL');
});

test('a node not yet linked (z during Tree_Insert) is drawn detached', () => {
  const t = buildBst([10]);
  newNode(t, 3);
  const { container } = render(<TreeCanvas view={view({ tree: t })} />);
  expect(container.querySelector('[data-node="n2"]')).toHaveClass('detached');
});

test('clicking a node reports its id; an empty tree says so', () => {
  const onNodeClick = vi.fn();
  const { container, rerender } = render(<TreeCanvas view={view()} onNodeClick={onNodeClick} />);
  fireEvent.pointerDown(container.querySelector('[data-node="n3"]')!);
  expect(onNodeClick).toHaveBeenCalledWith('n3');
  rerender(<TreeCanvas view={view({ tree: buildBst([]) })} />);
  expect(screen.getByText('T.root = NIL (empty tree)')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run `npx vitest run src/ui/TreeCanvas.test.tsx` → FAIL.

- [ ] **Step 3: Implement** `src/ui/TreeCanvas.tsx`:

```tsx
import { bstLayout, inorder, type NodeId } from '../engine/tree';
import { formatValue } from '../engine/trace';
import type { TreeView } from '../structures/types';

const R = 17;

type Props = { view: TreeView; onNodeClick?(id: NodeId): void };

export function TreeCanvas({ view, onNodeClick }: Props) {
  const { tree, highlight, tags, nil } = view;
  const L = bstLayout(tree, nil);
  const attached = new Set(inorder(tree));
  const ids = Object.keys(L.pos);
  const tagsOf: Record<NodeId, string[]> = {};
  for (const [name, id] of Object.entries(tags)) (tagsOf[id] ??= []).push(name);

  return (
    <svg className="tree-canvas" viewBox={`0 0 ${L.width} ${L.height}`} role="img" aria-label="Tree">
      {ids.map((id) => {
        const p = tree.nodes[id].p;
        if (p === null || !attached.has(id)) return null;
        const a = L.pos[p];
        const b = L.pos[id];
        const cls = highlight.edges.includes(id) ? 'tree-edge active' : 'tree-edge';
        return <line key={`e-${id}`} data-edge={id} className={cls} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
      {nil && L.nilPos && (
        <g className="nil-slot">
          <line className="nil-edge" x1={L.pos[nil.parent].x} y1={L.pos[nil.parent].y} x2={L.nilPos.x} y2={L.nilPos.y} />
          <g transform={`translate(${L.nilPos.x},${L.nilPos.y})`}>
            <circle r={R} />
            <text textAnchor="middle" dominantBaseline="central">NIL</text>
          </g>
        </g>
      )}
      {ids.map((id) => {
        const { x, y } = L.pos[id];
        const cls = ['tnode'];
        if (highlight.nodes.includes(id)) cls.push('active');
        if (!attached.has(id)) cls.push('detached');
        return (
          <g
            key={id}
            data-node={id}
            className={cls.join(' ')}
            style={{ transform: `translate(${x}px, ${y}px)` }}
            onPointerDown={() => onNodeClick?.(id)}
          >
            <circle r={R} />
            <text textAnchor="middle" dominantBaseline="central">{formatValue(tree.nodes[id].key)}</text>
            {tagsOf[id] && <text className="ptr-tag" x={R + 3} y={-R + 2}>{tagsOf[id].join(', ')}</text>}
          </g>
        );
      })}
      {ids.length === 0 && (
        <text className="empty-note" x={L.width / 2} y={L.height / 2} textAnchor="middle" dominantBaseline="central">
          T.root = NIL (empty tree)
        </text>
      )}
    </svg>
  );
}
```

`src/styles.css`:
- change `.graph-canvas {` to `.graph-canvas, .tree-canvas {`, so the tree gets the same squared-paper panel;
- add after the vertex rules:

```css
/* ---------- Trees (BST) ---------- */
.tree-canvas { max-height: 460px; }
.tree-edge { stroke: var(--edge); stroke-width: 2; }
.tree-edge.active { stroke: var(--marker); stroke-width: 4; stroke-dasharray: 7 5; }
.tnode { cursor: pointer; transition: transform 0.3s ease; }
.tnode circle { fill: var(--v-white); stroke: var(--v-stroke); stroke-width: 2; }
.tnode text { font-family: var(--font-text); font-size: 14px; font-weight: 700; fill: #000000; pointer-events: none; }
.tnode.active circle { stroke: var(--marker); stroke-width: 5; }
.tnode.detached circle { stroke-dasharray: 5 3; }
.tnode .ptr-tag { font-family: var(--font-code); font-size: 12px; fill: var(--marker); }
.nil-slot circle { fill: none; stroke: var(--muted); stroke-width: 2; stroke-dasharray: 4 4; }
.nil-slot text { font-family: var(--font-code); font-size: 11px; fill: var(--muted); }
.nil-edge { stroke: var(--muted); stroke-width: 2; stroke-dasharray: 4 4; }
.empty-note { font-family: var(--font-code); font-size: 14px; fill: var(--muted); }
@media (prefers-reduced-motion: reduce) { .tnode { transition: none; } }
```

- [ ] **Step 4: Run it to verify it passes**

Run `npx vitest run src/ui/TreeCanvas.test.tsx` → PASS. Run `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/ui/TreeCanvas.tsx src/ui/TreeCanvas.test.tsx src/styles.css
git commit -m "feat(ui): TreeCanvas with pointer tags, NIL slot and detached nodes"
```

---

### Task 6: StructurePage, routing and the home page

**Files:**
- Create: `src/ui/StructurePage.tsx`, `src/ui/StructurePage.test.tsx`
- Modify: `src/App.tsx`, `src/ui/Home.tsx`, `src/App.test.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: Task 1 `Player`, `StatePanel`, `DSPanel`, `PseudocodePanel` and `useSettings`; Task 4 `STRUCTURES` and `bst`; Task 5 `TreeCanvas`; `findKey` and `inorder`.
- Produces: `StructurePage({ def })`, with these accessible names:
  - labels `Preset`, `Operation`, `Key`;
  - buttons `Reset to preset`, `Clear`, `Run`, `Back to the tree`, `Done: keep result`.

- [ ] **Step 1: Write the failing tests** `src/ui/StructurePage.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bst } from '../structures/bst';
import { StructurePage } from './StructurePage';

beforeEach(() => window.localStorage.clear());

const keysOnCanvas = (c: HTMLElement) =>
  [...c.querySelectorAll('.tnode')].map((g) => g.textContent).sort((a, b) => Number(a) - Number(b));

test('insert 10, keep the result, then search finds it', async () => {
  const { container } = render(<StructurePage def={bst} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(keysOnCanvas(container)).toContain('10');
  expect(container.querySelectorAll('.tnode.active, .tnode.detached')).toHaveLength(0);

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'search');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  expect(screen.getByText('Returns the node with key 10.')).toBeInTheDocument();
});

test('Back to the tree discards the run', async () => {
  const { container } = render(<StructurePage def={bst} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  await userEvent.type(screen.getByLabelText('Key'), '17');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back to the tree' }));
  expect(keysOnCanvas(container)).toContain('17');
});

test('blocked inputs show a message and do not run', async () => {
  render(<StructurePage def={bst} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '12');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Key 12 is already in the tree (keys must be unique).');
  expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
});

test('Run is disabled for non-integer key text; negative integers are fine; Minimum needs no key', async () => {
  render(<StructurePage def={bst} />);
  const key = screen.getByLabelText('Key');
  const run = screen.getByRole('button', { name: 'Run' });
  for (const text of ['1.5', '-', 'abc']) {
    await userEvent.clear(key);
    await userEvent.type(key, text);
    expect(run).toBeDisabled();
  }
  await userEvent.clear(key);
  expect(run).toBeDisabled();
  await userEvent.type(key, '-3');
  expect(run).toBeEnabled();
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'minimum');
  expect(screen.queryByLabelText('Key')).toBeNull();
  expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
});

test('Clear empties the tree; Reset to preset restores it; clicking a node fills the key for node operations', async () => {
  const { container } = render(<StructurePage def={bst} />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByText('T.root = NIL (empty tree)')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Reset to preset' }));
  expect(container.querySelectorAll('.tnode')).toHaveLength(12);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'successor');
  const n12 = [...container.querySelectorAll('.tnode')].find((g) => g.textContent === '12')!;
  await userEvent.pointer({ keys: '[MouseLeft>]', target: n12 });
  expect(screen.getByLabelText('Key')).toHaveValue('12');
});

test('a node question inside Delete offers the current nodes and NIL', async () => {
  render(<StructurePage def={bst} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  await userEvent.type(screen.getByLabelText('Key'), '17');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  let dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Deleting node x with key 17: which case applies?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'case 4: two children' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Which node will Tree_Successor(17) return?');
  expect(within(dialog).getByRole('button', { name: 'NIL' })).toBeInTheDocument();
  expect(within(dialog).getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent ?? ''))).toHaveLength(12);
  await userEvent.click(within(dialog).getByRole('button', { name: '18' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
});
```

Append to `src/App.test.tsx`:

```tsx
test('home lists the BST under tree structures', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Tree structures' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Binary Search Tree/ })).toHaveAttribute('href', '#/bst');
});

test('#/bst opens the BST page with the lecture tree', () => {
  window.location.hash = '#/bst';
  const { container } = render(<App />);
  expect(screen.getByRole('heading', { name: 'Binary Search Tree (BST)' })).toBeInTheDocument();
  expect(container.querySelectorAll('.tnode')).toHaveLength(12);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run `npx vitest run src/ui/StructurePage.test.tsx src/App.test.tsx` → FAIL.

- [ ] **Step 3: Implement** `src/ui/StructurePage.tsx`:

```tsx
import { useState } from 'react';
import { findKey, inorder, type NodeId } from '../engine/tree';
import type { StructureDef, TreeStep } from '../structures/types';
import { DSPanel } from './DSPanel';
import { Player } from './Player';
import { PseudocodePanel } from './PseudocodePanel';
import { useSettings } from './settings';
import { StatePanel } from './StatePanel';
import { TreeCanvas } from './TreeCanvas';

const parseKey = (text: string): number | null => (/^-?\d+$/.test(text.trim()) ? Number(text.trim()) : null);

export function StructurePage({ def }: { def: StructureDef }) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [tree, setTree] = useState(() => def.build(def.presets[0].keys));
  const [opId, setOpId] = useState(def.operations[0].id);
  const [keyText, setKeyText] = useState('');
  const [steps, setSteps] = useState<TreeStep[] | null>(null);
  const [runId, setRunId] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [settings, setSettings] = useSettings();

  const op = def.operations.find((o) => o.id === opId)!;
  const procs = op.procs.map((name) => def.procs.find((p) => p.name === name)!);
  const needsKey = op.input !== 'none';
  const key = parseKey(keyText);
  const selected: NodeId | null = op.input === 'node' && key !== null ? findKey(tree, key) : null;

  const loadPreset = (i: number) => {
    setPresetIndex(i);
    setTree(def.build(def.presets[i].keys));
    setErrors([]);
  };
  const run = () => {
    const k = needsKey ? key : null;
    const e = def.validate(tree, op.id, k);
    setErrors(e);
    if (e.length > 0) return;
    setSteps(def.run(tree, op.id, k));
    setRunId((r) => r + 1);
  };
  const keep = () => {
    setTree(steps![steps!.length - 1].view.tree);
    setSteps(null);
  };

  return (
    <div className="algo-page">
      <header className="page-header">
        <a href="#/">← All topics</a>
        <h1>{def.title}</h1>
      </header>
      <div className="toolbar">
        <label>
          Preset
          <select value={presetIndex} disabled={steps !== null} onChange={(e) => loadPreset(Number(e.target.value))}>
            {def.presets.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={steps !== null} onClick={() => loadPreset(presetIndex)}>Reset to preset</button>
        <button type="button" disabled={steps !== null} onClick={() => { setTree(def.build([])); setErrors([]); }}>Clear</button>
        <label>
          Operation
          <select value={opId} disabled={steps !== null} onChange={(e) => { setOpId(e.target.value); setErrors([]); }}>
            {def.operations.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        {needsKey && (
          <label>
            Key
            <input
              className="key-input"
              value={keyText}
              inputMode="numeric"
              disabled={steps !== null}
              aria-invalid={keyText.trim() !== '' && key === null}
              onChange={(e) => setKeyText(e.target.value)}
            />
          </label>
        )}
        {steps === null ? (
          <button type="button" className="primary" disabled={needsKey && key === null} onClick={run}>Run</button>
        ) : (
          <button type="button" onClick={() => setSteps(null)}>Back to the tree</button>
        )}
      </div>
      {errors.map((m) => <p key={m} role="alert" className="feedback bad">{m}</p>)}
      {steps === null ? (
        <div className="layout">
          <div className="main-col">
            <TreeCanvas
              view={{ tree, highlight: { nodes: selected ? [selected] : [], edges: [] }, tags: {} }}
              onNodeClick={op.input === 'node' ? (id) => setKeyText(String(tree.nodes[id].key)) : undefined}
            />
            {op.input === 'node' && <p className="muted hint">Click a node or type its key.</p>}
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
          nodes={(s) => inorder(s.view.tree).map((id) => ({ id, label: String(s.view.tree.nodes[id].key) }))}
          main={(s, pick) => <TreeCanvas view={s.view} onNodeClick={pick} />}
          below={(s) => <DSPanel ds={s.ds} />}
          side={(s) => <StatePanel columns={[]} vertices={[]} step={s} />}
          end={<button type="button" className="primary keep-result" onClick={keep}>Done: keep result</button>}
        />
      )}
    </div>
  );
}
```

`src/App.tsx`: route structures too:

```tsx
import { STRUCTURES } from './structures/registry';
import { StructurePage } from './ui/StructurePage';
// …
export default function App() {
  const id = useHash().replace(/^#\/?/, '');
  const def = ALGORITHMS.find((a) => a.id === id);
  if (def) return <AlgorithmPage key={def.id} def={def} />;
  const structure = STRUCTURES.find((s) => s.id === id);
  if (structure) return <StructurePage key={structure.id} def={structure} />;
  return <Home />;
}
```

`src/ui/Home.tsx`:
- import `STRUCTURES`;
- change the lede to "Replay the graph algorithms and tree data structures of Data Structures and Algorithms (094224) one line at a time, with the same pseudocode and line numbers as the lecture slides.";
- put `<h2 className="list-title">Graph algorithms</h2>` before the existing `<ul className="algo-list">`;
- after that list, add:

```tsx
        <h2 className="list-title">Tree structures</h2>
        <ul className="algo-list">
          {STRUCTURES.map((s) => (
            <li key={s.id}>
              <a href={`#/${s.id}`}>
                <span className="algo-title">{s.title}</span>
                <code className="algo-sig">{s.procs[0].signature}</code>
              </a>
            </li>
          ))}
        </ul>
```

`src/styles.css`: after the `.algo-list` rules add:

```css
.list-title { font-size: 16px; font-weight: 700; margin: 32px 0 0; }
.list-title + .algo-list { margin-top: 8px; }
.key-input { width: 6em; }
.key-input[aria-invalid='true'] { border-color: var(--red); }
.keep-result { margin: 4px 0 12px; }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run `npx vitest run` → all PASS. Run `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/ui/StructurePage.tsx src/ui/StructurePage.test.tsx src/App.tsx src/ui/Home.tsx src/App.test.tsx src/styles.css
git commit -m "feat(ui): StructurePage with keep-result flow; BST route and home section"
```

---

### Task 7: End-to-end and docs

**Files:**
- Create: `e2e/bst.spec.ts`, `docs/superpowers/plans/tree-followups.md`
- Modify: `docs/superpowers/specs/2026-09-28-tree-structures-design.md`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the e2e test** `e2e/bst.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('BST: search with a predict answer, then delete the root and keep the result', async ({ page }) => {
  await page.goto('/#/bst');
  await expect(page.getByRole('heading', { name: 'Binary Search Tree (BST)' })).toBeVisible();
  await page.getByLabel('Operation').selectOption('search');
  await page.getByLabel('Key').fill('12');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  const dialog = page.getByRole('dialog', { name: 'Predict the next step' });
  await dialog.getByRole('button', { name: 'go left' }).click();
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('.note')).toContainText('Returns the node with key 12.');
  await page.getByRole('button', { name: 'Back to the tree' }).click();

  await page.getByLabel('Operation').selectOption('delete');
  await page.locator('.tnode', { hasText: /^17$/ }).dispatchEvent('pointerdown');
  await expect(page.getByLabel('Key')).toHaveValue('17');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode', { hasText: /^17$/ })).toHaveCount(0);
  await expect(page.locator('.tnode')).toHaveCount(11);
});

test('BST page: no horizontal scroll at phone width, before and after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/bst');
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.getByLabel('Operation').selectOption('insert');
  await page.getByLabel('Key').fill('10');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await overflow()).toBe(false);
});
```

- [ ] **Step 2: Run everything**

Run `npx vitest run && npx tsc --noEmit && npm run build && npx playwright test`. Everything must be green, including every existing graph e2e. A failure is a real bug: find the cause. If it is an e2e locator or actionability problem rather than an app bug, fix it in the spec file.

- [ ] **Step 3: Docs**

`docs/superpowers/specs/2026-09-28-tree-structures-design.md`:
- change `Status: Approved in conversation; awaiting review of this written spec` to `Status: Approved`;
- in §4, under the graph-track rules list, add: `- every operation starts with a call step (line 0 of the main procedure, drawn as its highlighted signature) so the first real line can carry a question.`

Create `docs/superpowers/plans/tree-followups.md`:

```markdown
# Follow-ups for the tree track

## Conventions established in tree plan 1 (BST)

- Every tree operation starts with a call step: `line: 0` of the main procedure; PseudocodePanel highlights the signature. `assertValidTreeTrace` allows line 0 only at step 0.
- `StructureDef` and `TreeStep` are BST-shaped: `run(t: Tree, …)` and `TreeView.tree`. Plan 2 (heap) must generalise them (e.g. `StructureDef<S>` with a view union) instead of forcing a heap into `Tree`.
- `TreeNode` has no `middle` yet; plan 3 (2-3 tree) adds it and a 2-3 layout (all leaves on one level, internal nodes centred over children).
- Node answers use `{ kind: 'node', value: id | null, label, nil }`; Player builds them from clicks via its `nodes(step)` prop.
- Operations never mutate the page's tree; "Done: keep result" adopts the last step's `view.tree`.

## Plan 2 (binary heap)

- Array strip under the tree, heap-size marker, index labels, greyed cells past heap-size.
- Build Heap takes an editable array, not the current structure.

## Plan 3 (2-3 tree)

- Sentinel leaves (−∞, +∞) must never be offered as node answers or accepted as keys.
```

- [ ] **Step 4: Commit**

```bash
git add e2e/bst.spec.ts docs/superpowers/specs/2026-09-28-tree-structures-design.md docs/superpowers/plans/tree-followups.md
git commit -m "test: BST page end to end; docs for tree plan 1"
```
