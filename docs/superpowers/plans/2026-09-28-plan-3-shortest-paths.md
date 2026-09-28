# Plan 3: Bellman-Ford and Dijkstra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Bellman-Ford and Dijkstra pages that run the course's shortest-paths pseudocode (lecture `shortest-paths.pdf`, slides 9, 12, 29, 39) line by line on weighted digraphs, with editable weights, a reorderable edge list, and predict questions.

**Architecture:** The graph model gains edge weights and a displayed edge order (`edgeOrder`). The trace model gains two data-structure views: `edges` for Bellman-Ford's `G.E` with the current edge, and `keyed` for Dijkstra's `Q` listed by `d`. It also gains a `settled` highlight for vertices extracted from `Q`. Both algorithms share one tracer (`src/algorithms/sssp/tracer.ts`) that emits `Initialize_Single_Source` and `Relax` steps, so the two helper procedures behave the same on both pages. `AlgorithmDef` gains `order: 'adjacency' | 'edges'`, which tells the page whether to show the adjacency panel or the edge-list panel.

**Tech Stack:** React 19, TypeScript 5.9.3 (pinned, do not upgrade), Vite 8, Vitest 5 + Testing Library (jsdom), Playwright (chromium).

**Spec:** `docs/superpowers/specs/2026-09-28-algo-visualizer-design.md`. Carry-forwards: `docs/superpowers/plans/plan-1-followups.md`. Visual language: `docs/superpowers/specs/2026-09-28-visual-design.md`.

## Global Constraints

- Pseudocode verbatim from the rendered slides, with underscores: `Bellman_Ford(G, w, s)`, `Dijkstra(G, w, s)`, `Initialize_Single_Source(G, s)`, `Relax(u, v, w)`, `Extract_Min(Q)`. Slide line numbers are kept.
- Each executed pseudocode line emits exactly one `Step`. The state shown is the state after that line. Snapshots are `structuredClone` copies.
- A question on step `i` is shown over step `i − 1`. Every algorithm test calls `assertQuestionsPredictable`.
- Tie-breaking: by vertex label (`compareLabels`). `for all (u, v) ∈ G.E` uses the displayed edge list. `for all v ∈ G.Adj[u]` uses the displayed adjacency list. `Extract_Min` ties break by label.
- Bellman-Ford and Dijkstra are `directed: true, weighted: true`.
- Dijkstra with a negative weight gets a warning, not an error: "Dijkstra assumes w ≥ 0. This graph has a negative weight, so the result may be wrong." The run is allowed.
- Staff decision (2026-09-28): Bellman-Ford asks "does Relax update" only in pass `i = 1`, and asks "new `v.d`" at every update in every pass.
- Ruling (this plan): Bellman-Ford's line 7 `error` ends the run. The trace stops at the first edge that fails the check, highlights it, and notes the error. Line 7 has no `return`, but the slide presents it as the algorithm's output, and running on would only repeat the same error.
- Ruling (this plan): the Dijkstra "in Q" column shows `yes`/`no`. Vertices extracted from Q are drawn filled, using the same look as `black`, via `highlight.settled`.
- The yellow highlighter (`--highlighter`) is reserved for the current pseudocode line. New UI (the current edge chip, weight labels, settled vertices) uses the marker, ink or edge tokens only.
- Layout must not scroll horizontally at 375px width.
- `engine/` and `algorithms/*/run.ts` must not import React.

## Review Focus

1. Typing Backspace or Delete inside the weight field must edit the number, not delete the selected edge. The test is in Task 3.
2. Yes/no questions (most of the new questions) must focus Yes on open, like the other question kinds, so keyboard users can answer. The answer input keeps `inputMode="numeric"` (staff decision, 2026-09-28). Test: Task 2.
3. Extract_Min with ties and with unreachable (∞) vertices: ties break by label, ∞ vertices are extracted last in label order, and relaxing from an ∞ vertex never updates. The test is in Task 6.
4. The edge order after reordering and then deleting an edge must stay the displayed order with the edge removed, and must not later bring the deleted edge back at its old position. The tests are in Tasks 1 and 5.
5. The Dijkstra negative-weight warning shows on Run, the run still happens, and "Edit graph" clears the warning. The tests are in Tasks 3 and 7.

---

### Task 1: Graph model — weights and edge order

**Files:**
- Modify: `src/engine/graph.ts`
- Test: `src/engine/graph.test.ts`

**Interfaces:**
- Produces: `DEFAULT_WEIGHT = 1`, `Graph.edgeOrder?: string[]` (edge keys), `weightOf(g, u, v): number`, `setWeight(g, u, v, w): Graph`, `edgeList(g): Edge[]`, `moveInEdgeList(g, index, delta): Graph`, `resetEdgeOrder(g): Graph`. `removeEdge` and `removeVertex` also prune `edgeOrder`.

- [ ] **Step 1: Write the failing tests** (append to `src/engine/graph.test.ts`, and extend its import list with `DEFAULT_WEIGHT, edgeList, moveInEdgeList, moveVertex, resetEdgeOrder, setWeight, weightOf`)

```ts
function wg(edges: [string, string, number][]): Graph {
  return {
    directed: true,
    vertices: ['s', 'a', 'b'].map((id, i) => ({ id, x: i * 10, y: 0 })),
    edges: edges.map(([u, v, w]) => ({ u, v, w })),
    adjOrder: {},
  };
}

test('addEdge keeps a weight; weightOf reads it, defaulting to 1', () => {
  const G = addEdge(g(true, ['a', 'b'], []), 'a', 'b', -3);
  expect(G.edges).toEqual([{ u: 'a', v: 'b', w: -3 }]);
  expect(weightOf(G, 'a', 'b')).toBe(-3);
  expect(weightOf(g(true, ['a', 'b'], [['a', 'b']]), 'a', 'b')).toBe(DEFAULT_WEIGHT);
  expect(() => weightOf(G, 'b', 'a')).toThrow(/b->a/);
});

test('setWeight changes only that edge', () => {
  const G = setWeight(wg([['s', 'a', 1], ['a', 'b', 2]]), 'a', 'b', 7);
  expect(G.edges).toEqual([{ u: 's', v: 'a', w: 1 }, { u: 'a', v: 'b', w: 7 }]);
});

test('moveVertex moves only that vertex', () => {
  const G = moveVertex(g(false, ['a', 'b'], []), 'b', 55, 66);
  expect(G.vertices).toEqual([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 55, y: 66 }]);
});

test('edgeList defaults to label order of (u, v)', () => {
  const G = wg([['b', 'a', 1], ['s', 'b', 1], ['a', 'b', 1], ['s', 'a', 1]]);
  expect(edgeList(G).map((e) => `${e.u}->${e.v}`)).toEqual(['a->b', 'b->a', 's->a', 's->b']);
});

test('moveInEdgeList swaps neighbors and clamps at the ends', () => {
  const G = wg([['s', 'a', 1], ['a', 'b', 1], ['s', 'b', 1]]);
  const moved = moveInEdgeList(G, 2, -1);
  expect(edgeList(moved).map((e) => `${e.u}->${e.v}`)).toEqual(['a->b', 's->b', 's->a']);
  expect(moveInEdgeList(G, 0, -1)).toBe(G);
  expect(moveInEdgeList(G, 2, 1)).toBe(G);
  expect(edgeList(resetEdgeOrder(moved)).map((e) => `${e.u}->${e.v}`)).toEqual(['a->b', 's->a', 's->b']);
});

test('removing an edge or vertex prunes edgeOrder, so a re-added edge goes back to label order', () => {
  const G = moveInEdgeList(wg([['s', 'a', 1], ['a', 'b', 1], ['s', 'b', 1]]), 2, -1);
  const noSB = removeEdge(G, 's', 'b');
  expect(noSB.edgeOrder).toEqual(['a->b', 's->a']);
  const readded = addEdge(noSB, 's', 'b', 1);
  expect(edgeList(readded).map((e) => `${e.u}->${e.v}`)).toEqual(['a->b', 's->a', 's->b']);
  expect(removeVertex(G, 'a').edgeOrder).toEqual(['s->b']);
});

test('edgeList appends edges missing from a custom order in label order', () => {
  const G = { ...wg([['s', 'a', 1], ['a', 'b', 1], ['s', 'b', 1]]), edgeOrder: ['s->b', 'gone->x'] };
  expect(edgeList(G).map((e) => `${e.u}->${e.v}`)).toEqual(['s->b', 'a->b', 's->a']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/engine/graph.test.ts`
Expected: FAIL (the new exports do not exist yet).

- [ ] **Step 3: Implement.** In `src/engine/graph.ts`:

Add below `MAX_VERTICES`:

```ts
// Weight of an edge that has none (new edges in a weighted editor start here too).
export const DEFAULT_WEIGHT = 1;
```

Extend `Graph`:

```ts
export type Graph = {
  directed: boolean;
  vertices: Vertex[];
  edges: Edge[];
  adjOrder: Record<string, string[]>;
  // Displayed order of G.E as edge keys (Bellman-Ford scans edges in this order).
  edgeOrder?: string[];
};
```

Add after `hasEdge`:

```ts
function findEdge(g: Graph, u: string, v: string): Edge | undefined {
  const key = edgeKey(g, u, v);
  return g.edges.find((e) => edgeKey(g, e.u, e.v) === key);
}

export function weightOf(g: Graph, u: string, v: string): number {
  const e = findEdge(g, u, v);
  if (!e) throw new Error(`No edge ${edgeKey(g, u, v)}`);
  return e.w ?? DEFAULT_WEIGHT;
}

export function setWeight(g: Graph, u: string, v: string, w: number): Graph {
  const key = edgeKey(g, u, v);
  return { ...g, edges: g.edges.map((e) => (edgeKey(g, e.u, e.v) === key ? { ...e, w } : e)) };
}
```

Replace `removeVertex` and `removeEdge` with versions that also prune `edgeOrder`:

```ts
export function removeVertex(g: Graph, id: string): Graph {
  const adjOrder: Record<string, string[]> = {};
  for (const [u, list] of Object.entries(g.adjOrder)) {
    if (u !== id) adjOrder[u] = list.filter((x) => x !== id);
  }
  const edges = g.edges.filter((e) => e.u !== id && e.v !== id);
  const kept = new Set(edges.map((e) => edgeKey(g, e.u, e.v)));
  return {
    ...g,
    vertices: g.vertices.filter((v) => v.id !== id),
    edges,
    adjOrder,
    edgeOrder: g.edgeOrder?.filter((k) => kept.has(k)),
  };
}
```

```ts
export function removeEdge(g: Graph, u: string, v: string): Graph {
  const key = edgeKey(g, u, v);
  return {
    ...g,
    edges: g.edges.filter((e) => edgeKey(g, e.u, e.v) !== key),
    edgeOrder: g.edgeOrder?.filter((k) => k !== key),
  };
}
```

Add at the end of the file:

```ts
function endpointsByLabel(g: Graph, e: Edge): [string, string] {
  if (g.directed || compareLabels(e.u, e.v) <= 0) return [e.u, e.v];
  return [e.v, e.u];
}

// G.E in displayed order: the custom order first, then any other edges by label.
export function edgeList(g: Graph): Edge[] {
  const byKey = new Map(g.edges.map((e) => [edgeKey(g, e.u, e.v), e]));
  const custom = (g.edgeOrder ?? []).flatMap((k) => byKey.get(k) ?? []);
  const natural = [...g.edges].sort((a, b) => {
    const [a1, a2] = endpointsByLabel(g, a);
    const [b1, b2] = endpointsByLabel(g, b);
    return compareLabels(a1, b1) || compareLabels(a2, b2);
  });
  return [...custom, ...natural.filter((e) => !custom.includes(e))];
}

export function moveInEdgeList(g: Graph, index: number, delta: number): Graph {
  const list = edgeList(g).map((e) => edgeKey(g, e.u, e.v));
  const target = index + delta;
  if (target < 0 || target >= list.length) return g;
  [list[index], list[target]] = [list[target], list[index]];
  return { ...g, edgeOrder: list };
}

export function resetEdgeOrder(g: Graph): Graph {
  return { ...g, edgeOrder: undefined };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/engine/graph.test.ts` → PASS. Then `npx vitest run` → all PASS (existing tests use `toEqual`, which ignores `edgeOrder: undefined`).

- [ ] **Step 5: Commit**

```bash
git add src/engine/graph.ts src/engine/graph.test.ts
git commit -m "feat(engine): edge weights and a reorderable edge list"
```

---

### Task 2: View contracts — new DS views, weights on the canvas, settled vertices, question inputs

**Files:**
- Modify: `src/engine/trace.ts`, `src/ui/DSPanel.tsx`, `src/ui/GraphCanvas.tsx`, `src/ui/QuestionOverlay.tsx`, `src/styles.css`
- Test: `src/ui/panels.test.tsx`, `src/ui/GraphCanvas.test.tsx`, `src/ui/controls.test.tsx`

**Interfaces:**
- Consumes: `DEFAULT_WEIGHT` (Task 1).
- Produces:
  - `DSView` adds `{ kind: 'edges'; name: string; items: string[]; current: number | null }` and `{ kind: 'keyed'; name: string; key: string; items: { id: string; value: Value }[] }`.
  - `Highlight.settled?: string[]`.
  - `GraphCanvas` prop `weighted?: boolean`.
  - Vertex class `v-plain` when a vertex has state but no `color`, and class `settled` when the vertex is in `highlight.settled`.
  - Arrow markers per edge class (`plain | tree | active | selected`), with ids from `useId`.

- [ ] **Step 1: Write the failing tests**

Append to `src/ui/panels.test.tsx`:

```tsx
test('ds panel shows the edge list and marks the current edge', () => {
  render(<DSPanel ds={[{ kind: 'edges', name: 'G.E', items: ['(s, a)', '(a, b)'], current: 1 }]} />);
  expect(screen.getByText('(scan order)')).toBeInTheDocument();
  const current = within(screen.getByLabelText('G.E contents')).getByText('(a, b)');
  expect(current).toHaveClass('current');
  expect(current).toHaveAttribute('aria-current', 'true');
  expect(within(screen.getByLabelText('G.E contents')).getByText('(s, a)')).not.toHaveClass('current');
});

test('ds panel lists a keyed set with each key', () => {
  render(<DSPanel ds={[{ kind: 'keyed', name: 'Q', key: 'd', items: [{ id: 'a', value: 3 }, { id: 'b', value: Infinity }] }]} />);
  expect(screen.getByText('(by d)')).toBeInTheDocument();
  const items = within(screen.getByLabelText('Q contents')).getAllByText(/\w/).map((e) => e.textContent);
  expect(items).toEqual(['a.d = 3', 'b.d = ∞']);
});
```

Replace the last test in `src/ui/GraphCanvas.test.tsx` (`directed edges get an arrow marker`) with the following, and add the others:

```tsx
const markerOf = (container: HTMLElement, key: string) => {
  const ref = container.querySelector(`[data-edge="${key}"] line.edge-line`)!.getAttribute('marker-end')!;
  expect(ref).toMatch(/^url\(#.+\)$/);
  return container.querySelector(`marker[id="${ref.slice(5, -1)}"] path`)!;
};

test('directed edges get an arrowhead that matches the edge class', () => {
  const directed = { ...graph, directed: true, edges: [{ u: 'a', v: 'b' }, { u: 'b', v: 'a' }] };
  const { container } = render(
    <GraphCanvas graph={directed} step={{ ...step, highlight: { treeEdges: ['a->b'] } }} />,
  );
  expect(markerOf(container, 'a->b')).toHaveClass('arrow-head', 'tree');
  expect(markerOf(container, 'b->a')).toHaveClass('arrow-head', 'plain');
});

test('undirected edges have no arrowhead', () => {
  const { container } = render(<GraphCanvas graph={graph} />);
  expect(container.querySelector('[data-edge="a--b"] line.edge-line')!.getAttribute('marker-end')).toBeNull();
});

test('weights are drawn only on weighted canvases, defaulting to 1', () => {
  const g = { ...graph, edges: [{ u: 'a', v: 'b', w: -2 }] };
  const { container, rerender } = render(<GraphCanvas graph={g} weighted />);
  expect(container.querySelector('[data-edge="a--b"] .edge-weight')).toHaveTextContent('-2');
  rerender(<GraphCanvas graph={graph} weighted />);
  expect(container.querySelector('[data-edge="a--b"] .edge-weight')).toHaveTextContent('1');
  rerender(<GraphCanvas graph={g} />);
  expect(container.querySelector('.edge-weight')).toBeNull();
});

test('a vertex with state but no color is plain; settled vertices are marked', () => {
  const s: Step = { ...step, vertexState: { a: { d: 0 }, b: {} }, highlight: { settled: ['a'] } };
  const { container } = render(<GraphCanvas graph={graph} step={s} />);
  expect(container.querySelector('[data-vertex="a"]')).toHaveClass('v-plain', 'settled');
  expect(container.querySelector('[data-vertex="b"]')).toHaveClass('v-none');
  expect(container.querySelector('[data-vertex="b"]')).not.toHaveClass('settled');
});
```

Append to `src/ui/controls.test.tsx`:

```tsx
test('yes/no question focuses Yes on mount', () => {
  const yq: Question = { type: 't', prompt: 'Update?', explain: 'e', answer: { kind: 'yesno', value: true } };
  render(<QuestionOverlay question={yq} vertices={[]} onAnswer={() => {}} onSkip={() => {}} />);
  expect(screen.getByRole('button', { name: 'Yes' })).toHaveFocus();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui` → the new tests FAIL. The TypeScript errors on `kind: 'edges'` and `kind: 'keyed'` are expected.

- [ ] **Step 3: Implement**

`src/engine/trace.ts`: extend `DSView` and `Highlight`:

```ts
export type DSView =
  | { kind: 'queue'; name: string; items: string[] }
  | { kind: 'stack'; name: string; items: string[] }
  // An ordered edge list; `current` is the index being scanned, if any.
  | { kind: 'edges'; name: string; items: string[]; current: number | null }
  // A set shown sorted by one attribute (e.g. Dijkstra's Q by d).
  | { kind: 'keyed'; name: string; key: string; items: { id: string; value: Value }[] };
```

```ts
export type Highlight = { vertices?: string[]; edges?: string[]; treeEdges?: string[]; settled?: string[] };
```

Replace `src/ui/DSPanel.tsx` with:

```tsx
import { formatValue, type DSView } from '../engine/trace';

function assertNever(x: never): never {
  throw new Error(`Unhandled DSView kind: ${JSON.stringify(x)}`);
}

function getOrientationLabel(d: DSView): string {
  switch (d.kind) {
    case 'queue':
      return '(head → tail)';
    case 'stack':
      return '(bottom → top)';
    case 'edges':
      return '(scan order)';
    case 'keyed':
      return `(by ${d.key})`;
    default:
      return assertNever(d);
  }
}

function getChips(d: DSView): { text: string; current: boolean }[] {
  switch (d.kind) {
    case 'queue':
    case 'stack':
      return d.items.map((text) => ({ text, current: false }));
    case 'edges':
      return d.items.map((text, i) => ({ text, current: i === d.current }));
    case 'keyed':
      return d.items.map((x) => ({ text: `${x.id}.${d.key} = ${formatValue(x.value)}`, current: false }));
    default:
      return assertNever(d);
  }
}

function renderDs(d: DSView) {
  const chips = getChips(d);
  return (
    <div key={d.name} className={d.kind}>
      <strong>{d.name}</strong>
      <span className="muted"> {getOrientationLabel(d)}</span>
      <div className="queue-items" aria-label={`${d.name} contents`}>
        {chips.length === 0 ? (
          <span className="muted">∅</span>
        ) : (
          chips.map((c, i) => (
            <span key={i} className={c.current ? 'chip current' : 'chip'} aria-current={c.current ? 'true' : undefined}>
              {c.text}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function DSPanel({ ds }: { ds: DSView[] }) {
  return (
    <div className="panel ds">
      {ds.map(renderDs)}
    </div>
  );
}
```

`src/ui/GraphCanvas.tsx`:
- import `useId` from react, `DEFAULT_WEIGHT` from `../engine/graph`, and `formatValue` from `../engine/trace`;
- add `weighted?: boolean` to `Props`;
- replace the `<defs>` block, the edge class computation, the edge `<line>` marker, and the vertex class computation;
- add the weight label.

The changed parts:

```tsx
const MARKER_KINDS = ['plain', 'tree', 'active', 'selected'] as const;
```

Inside the component, after `const svgRef = …`:

```tsx
  // One set of arrowheads per canvas; strip useId's punctuation so url(#…) stays simple.
  const markerBase = `arrow${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
```

```tsx
      <defs>
        {MARKER_KINDS.map((k) => (
          <marker
            key={k}
            id={`${markerBase}-${k}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className={`arrow-head ${k}`} />
          </marker>
        ))}
      </defs>
```

In the edge map, after the `cls` pushes (keep them), add:

```tsx
        const markerKind =
          selected === key ? 'selected' : hl.edges?.includes(key) ? 'active' : hl.treeEdges?.includes(key) ? 'tree' : 'plain';
```

Change the line's marker to `markerEnd={graph.directed ? \`url(#${markerBase}-${markerKind})\` : undefined}`. After the second `<line>`, add:

```tsx
            {props.weighted && (
              <text
                className="edge-weight"
                x={(x1 + x2) / 2 - uy * 12}
                y={(y1 + y2) / 2 + ux * 12}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {formatValue(e.w ?? DEFAULT_WEIGHT)}
              </text>
            )}
```

(The label sits on the same side as the offset of an antiparallel pair, so the two weights of `u→v` and `v→u` land on opposite sides.)

Vertex classes:

```tsx
        const attrs = step?.vertexState[v.id];
        const color = attrs?.color;
        const look = typeof color === 'string' ? `v-${color}` : attrs && Object.keys(attrs).length > 0 ? 'v-plain' : 'v-none';
        const cls = ['vertex', look];
        if (hl.settled?.includes(v.id)) cls.push('settled');
```

(Keep the existing `active`, `selected` and `edge-from` pushes after these.)

`src/ui/QuestionOverlay.tsx`: give the Yes button the first-control ref (leave `inputMode="numeric"` as is — staff decision):

```tsx
          <button ref={setFirstControl} type="button" onClick={() => onAnswer({ kind: 'yesno', value: true })}>Yes</button>
```

`src/styles.css`: after `.arrow-head { fill: var(--edge); }` add:

```css
.arrow-head.tree { fill: var(--tree); }
.arrow-head.active { fill: var(--marker); }
.arrow-head.selected { fill: var(--red); }
.edge-weight {
  font-family: var(--font-code);
  font-size: 14px;
  font-weight: 700;
  fill: var(--ink);
  paint-order: stroke;
  stroke: var(--paper);
  stroke-width: 4px;
  stroke-linejoin: round;
  pointer-events: none;
}
```

After the `.vertex.v-black text` rule add:

```css
/* Has values (d, π) but no color attribute: Bellman-Ford and Dijkstra vertices. */
.vertex.v-plain circle { fill: var(--v-white); }
.vertex.v-plain text { fill: #000000; }
/* Extracted from Dijkstra's Q: done, drawn like a black vertex. */
.vertex.settled circle { fill: var(--v-black); stroke: var(--v-black-stroke); stroke-dasharray: none; }
.vertex.settled text { fill: #ffffff; }
```

After the `.stack .queue-items { … }` rule add:

```css
.queue-items .chip.current { background: var(--marker-tint); border-color: var(--marker); box-shadow: inset 0 -3px 0 var(--marker); }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run` → all PASS. Run `npx tsc --noEmit` → no errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/trace.ts src/ui/DSPanel.tsx src/ui/GraphCanvas.tsx src/ui/QuestionOverlay.tsx src/styles.css src/ui/panels.test.tsx src/ui/GraphCanvas.test.tsx src/ui/controls.test.tsx
git commit -m "feat(ui): edge-list and keyed-set views, weight labels, per-class arrowheads"
```

---

### Task 3: Weighted editing and page wiring

**Files:**
- Modify: `src/algorithms/types.ts`, `src/algorithms/bfs/index.ts`, `src/algorithms/dfs/index.ts`, `src/ui/GraphEditor.tsx`, `src/ui/AlgorithmPage.tsx`, `src/ui/Visualizer.tsx`, `src/styles.css`
- Create: `src/ui/EdgeListPanel.tsx`, `src/ui/AlgorithmPage.test.tsx`
- Test: `src/ui/GraphEditor.test.tsx`, `src/ui/AlgorithmPage.test.tsx`

**Interfaces:**
- Consumes: `edgeList`, `moveInEdgeList`, `resetEdgeOrder`, `setWeight`, `DEFAULT_WEIGHT`, and `edgeKey` (Task 1); `GraphCanvas`'s `weighted` prop (Task 2).
- Produces:
  - `AlgorithmDef.order: 'adjacency' | 'edges'`.
  - `EdgeListPanel({ graph, onMove(index, delta), onReset })`, whose list is labelled `G.E` and whose buttons are named `Move (u, v) earlier in G.E` and `Move (u, v) later in G.E`.
  - `GraphEditor` prop `weighted?: boolean` and a weight field labelled `Weight w(u, v)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/ui/GraphEditor.test.tsx`:

```tsx
const weightedStart: Graph = { ...start, directed: true, edges: [{ u: 'a', v: 'b', w: 2 }] };

function WeightedHarness() {
  const [g, setG] = useState(weightedStart);
  latest = g;
  return <GraphEditor graph={g} weighted onChange={setG} />;
}

test('new edges in a weighted graph get weight 1', async () => {
  const { container } = render(<WeightedHarness />);
  await userEvent.click(screen.getByRole('button', { name: 'Add edge' }));
  fireEvent.pointerDown(vertex(container, 'b'));
  fireEvent.pointerDown(vertex(container, 'c'));
  expect(latest.edges).toEqual([{ u: 'a', v: 'b', w: 2 }, { u: 'b', v: 'c', w: 1 }]);
});

test('a selected edge has an editable weight; Backspace in the field does not delete the edge', async () => {
  const { container } = render(<WeightedHarness />);
  fireEvent.click(container.querySelector('[data-edge="a->b"]')!);
  const field = screen.getByLabelText('Weight w(a, b)');
  expect(field).toHaveValue('2');
  fireEvent.keyDown(field, { key: 'Backspace' });
  expect(latest.edges).toHaveLength(1);
  await userEvent.clear(field);
  await userEvent.type(field, '-3');
  expect(latest.edges).toEqual([{ u: 'a', v: 'b', w: -3 }]);
});

test('weight field ignores text that is not a number', async () => {
  const { container } = render(<WeightedHarness />);
  fireEvent.click(container.querySelector('[data-edge="a->b"]')!);
  const field = screen.getByLabelText('Weight w(a, b)');
  await userEvent.clear(field);
  await userEvent.type(field, 'x');
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(latest.edges).toEqual([{ u: 'a', v: 'b', w: 2 }]);
});

test('unweighted editor shows no weight field', () => {
  const { container } = render(<Harness />);
  fireEvent.click(container.querySelector('[data-edge="a--b"]')!);
  expect(screen.queryByLabelText(/^Weight/)).toBeNull();
});
```

Create `src/ui/AlgorithmPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AlgorithmDef } from '../algorithms/types';
import type { Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AlgorithmPage } from './AlgorithmPage';

beforeEach(() => window.localStorage.clear());

const graph: Graph = {
  directed: true,
  vertices: [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 300, y: 100 }, { id: 'c', x: 200, y: 300 }],
  edges: [{ u: 'a', v: 'b', w: 2 }, { u: 'b', v: 'c', w: -1 }],
  adjOrder: {},
};
const step: Step = { proc: 'P', line: 1, bigStep: false, vertexState: {}, vars: {}, ds: [], highlight: {} };
const def: AlgorithmDef = {
  id: 'fake',
  title: 'Fake',
  directed: true,
  weighted: true,
  order: 'edges',
  procs: [{ name: 'P', signature: 'P(G)', lines: ['x'] }],
  params: [],
  stateColumns: [],
  questionTypes: [],
  presets: [{ name: 'One', graph, params: {} }],
  validate: () => ({ errors: [], warnings: ['Careful.'] }),
  run: () => [step],
};

test('edge-order page: edge list instead of adjacency, weights drawn, Edit graph clears warnings', async () => {
  const { container } = render(<AlgorithmPage def={def} />);
  expect(screen.queryByText('Adjacency lists')).toBeNull();
  expect(screen.getByLabelText('G.E')).toHaveTextContent(/\(a, b\).*\(b, c\)/);
  await userEvent.click(screen.getByRole('button', { name: 'Move (b, c) earlier in G.E' }));
  expect(screen.getByLabelText('G.E')).toHaveTextContent(/\(b, c\).*\(a, b\)/);
  expect(container.querySelector('[data-edge="b->c"] .edge-weight')).toHaveTextContent('-1');

  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByText('Careful.')).toBeInTheDocument();
  expect(screen.queryByText('Adjacency lists')).toBeNull();
  expect(container.querySelector('[data-edge="b->c"] .edge-weight')).toHaveTextContent('-1');

  await userEvent.click(screen.getByRole('button', { name: 'Edit graph' }));
  expect(screen.queryByText('Careful.')).toBeNull();
  expect(screen.getByLabelText('G.E')).toHaveTextContent(/\(b, c\).*\(a, b\)/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/GraphEditor.test.tsx src/ui/AlgorithmPage.test.tsx` → FAIL.

- [ ] **Step 3: Implement**

`src/algorithms/types.ts`: add to `AlgorithmDef`, after `weighted: boolean;`:

```ts
  // Which scan order the student can edit: neighbor lists (G.Adj) or the edge list (G.E).
  order: 'adjacency' | 'edges';
```

`src/algorithms/bfs/index.ts` and `src/algorithms/dfs/index.ts`: add `order: 'adjacency',` after `weighted: false,`.

Create `src/ui/EdgeListPanel.tsx`:

```tsx
import { edgeKey, edgeList, type Graph } from '../engine/graph';

type Props = { graph: Graph; onMove(index: number, delta: number): void; onReset(): void };

export function EdgeListPanel({ graph, onMove, onReset }: Props) {
  const list = edgeList(graph);
  return (
    <div className="panel adjacency">
      <h3>Edge list G.E</h3>
      <p className="muted">Order here is the order the algorithm scans the edges.</p>
      <p aria-label="G.E" className="adj-list edge-list">
        {list.length === 0 && <span className="muted">∅</span>}
        {list.map((e, i) => {
          const name = `(${e.u}, ${e.v})`;
          return (
            <span key={edgeKey(graph, e.u, e.v)} className="chip">
              {i > 0 && (
                <button type="button" aria-label={`Move ${name} earlier in G.E`} onClick={() => onMove(i, -1)}>‹</button>
              )}
              {name}
              {i < list.length - 1 && (
                <button type="button" aria-label={`Move ${name} later in G.E`} onClick={() => onMove(i, 1)}>›</button>
              )}
            </span>
          );
        })}
      </p>
      <button type="button" onClick={onReset}>Reset to label order</button>
    </div>
  );
}
```

`src/ui/GraphEditor.tsx`:
- extend the graph import with `DEFAULT_WEIGHT, setWeight, type Edge`;
- change `Props` to `{ graph: Graph; weighted?: boolean; onChange(g: Graph): void }` and destructure `weighted`;
- add the `WeightField` component above `GraphEditor`:

```tsx
function WeightField({ edge, onChange }: { edge: Edge; onChange(w: number): void }) {
  const [text, setText] = useState(String(edge.w ?? DEFAULT_WEIGHT));
  const parse = (t: string) => (t.trim() !== '' && Number.isFinite(Number(t)) ? Number(t) : null);
  return (
    <label className="weight-field">
      Weight w({edge.u}, {edge.v})
      <input
        value={text}
        aria-invalid={parse(text) === null}
        onChange={(e) => {
          setText(e.target.value);
          const w = parse(e.target.value);
          if (w !== null) onChange(w);
        }}
      />
    </label>
  );
}
```

In `onVertex`, the add-edge branch becomes:

```tsx
        else onChange(addEdge(graph, edgeFrom, id, weighted ? DEFAULT_WEIGHT : undefined));
```

The editor `onKeyDown` must ignore keys typed into a field:

```tsx
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      }}
```

Before the `return`:

```tsx
  const selectedEdge = graph.edges.find((x) => edgeKey(graph, x.u, x.v) === selected);
```

Select-mode hint text:

```tsx
        {mode === 'select' && (weighted
          ? 'Drag vertices to move them. Click an edge to select it and change its weight.'
          : 'Drag vertices to move them. Click a vertex or edge to select it.')}
```

Edge-mode hint, when weighted and there is no `edgeFrom`: `'Click the first endpoint. New edges get weight 1.'` Keep the other wording unchanged.

Pass `weighted={weighted}` to `GraphCanvas`, and render the field after the canvas, before the message:

```tsx
      {weighted && selectedEdge && (
        <WeightField
          key={selected}
          edge={selectedEdge}
          onChange={(w) => onChange(setWeight(graph, selectedEdge.u, selectedEdge.v, w))}
        />
      )}
```

`src/ui/AlgorithmPage.tsx`:
- extend the graph import with `moveInEdgeList, resetEdgeOrder`, and import `EdgeListPanel`;
- "Edit graph" clears messages: `onClick={() => { setSteps(null); setMessages(NO_MESSAGES); }}`;
- `<GraphEditor graph={graph} weighted={def.weighted} onChange={setGraph} />`;
- the side panel picks the order panel:

```tsx
            {def.order === 'edges' ? (
              <EdgeListPanel
                graph={graph}
                onMove={(i, d) => setGraph(moveInEdgeList(graph, i, d))}
                onReset={() => setGraph(resetEdgeOrder(graph))}
              />
            ) : (
              <AdjacencyPanel
                graph={graph}
                onMove={(u, i, d) => setGraph(moveInAdjacency(graph, u, i, d))}
                onReset={() => setGraph(resetAdjacency(graph))}
              />
            )}
```

`src/ui/Visualizer.tsx`: pass `weighted={def.weighted}` to `GraphCanvas`, and render `{def.order === 'adjacency' && <AdjacencyPanel graph={graph} />}`. Bellman-Ford's edge list appears in the DS panel during a run.

`src/styles.css`: after the `.adjacency li` rule add:

```css
.edge-list { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.weight-field { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 10px; font-family: var(--font-code); }
.weight-field input { width: 7em; }
.weight-field input[aria-invalid='true'] { border-color: var(--red); }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run` → all PASS. Run `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/algorithms/types.ts src/algorithms/bfs/index.ts src/algorithms/dfs/index.ts src/ui/EdgeListPanel.tsx src/ui/GraphEditor.tsx src/ui/AlgorithmPage.tsx src/ui/Visualizer.tsx src/styles.css src/ui/GraphEditor.test.tsx src/ui/AlgorithmPage.test.tsx
git commit -m "feat(ui): weight editing, edge-list panel, Edit graph clears messages"
```

---

### Task 4: Shared single-source shortest-path tracer

**Files:**
- Create: `src/algorithms/sssp/shared.ts`, `src/algorithms/sssp/questions.ts`, `src/algorithms/sssp/tracer.ts`, `src/algorithms/sssp/reference.ts` (test helper), `src/algorithms/sssp/tracer.test.ts`

**Interfaces:**
- Consumes: `vertexIds`, `edgeKey`, `weightOf`, `Graph` (Task 1); `DSView`, `Highlight.settled` (Task 2).
- Produces:
  - `INIT = 'Initialize_Single_Source'`, `RELAX = 'Relax'`, `initProc`, `relaxProc: Proc`.
  - `weightedDigraph(vertices, edges: [u, v, w][]): Graph`.
  - `sourceErrors(g, params): string[]`.
  - `relaxNote(u, v, ud, w, vd): string`.
  - `relaxUpdateQuestion(type, u, v, ud, w, vd): Question`.
  - `newDistanceQuestion(type, u, v, ud, w): Question`.
  - `createTracer(g, s, dsOf, settledOf?) → Tracer` with `steps`, `st`, `vars`, `emit(proc, line, opts?)`, `initializeSingleSource()`, and `relax(u, v, ask)`.
  - Test-only: `mulberry32`, `randomWeightedDigraph(rand, minW)`, `shortestFrom(g, s)`.

- [ ] **Step 1: Write the failing test** `src/algorithms/sssp/tracer.test.ts`:

```ts
import type { DSView } from '../../engine/trace';
import { relaxUpdateQuestion, newDistanceQuestion, relaxNote } from './questions';
import { shortestFrom, weightedDigraphForTest } from './reference';
import { INIT, RELAX } from './shared';
import { createTracer } from './tracer';

const g = weightedDigraphForTest([['s', 'a', 2], ['a', 'b', -1]]);
const noDs = (): DSView[] => [];

test('Initialize_Single_Source: lines 1–3 per vertex in label order, then line 4', () => {
  const t = createTracer(g, 's', noDs);
  t.initializeSingleSource();
  expect(t.steps.map((s) => `${s.line}${s.vars.v ?? ''}`)).toEqual([
    '1a', '2a', '3a', '1b', '2b', '3b', '1s', '2s', '3s', '4',
  ]);
  expect(t.steps.every((s) => s.proc === INIT)).toBe(true);
  expect(t.st).toEqual({ a: { d: Infinity, pi: null }, b: { d: Infinity, pi: null }, s: { d: 0, pi: null } });
  expect(t.steps[1].vertexState.a).toEqual({ d: Infinity });
});

test('Relax: one step when nothing changes, three when it updates; questions only when asked', () => {
  const t = createTracer(g, 's', noDs);
  t.initializeSingleSource();
  const before = t.steps.length;
  t.relax('a', 'b', { update: 'x.relax', value: 'x.value' });
  expect(t.steps.slice(before).map((s) => [s.proc, s.line])).toEqual([[RELAX, 1]]);
  expect(t.steps[before].question?.answer).toEqual({ kind: 'yesno', value: false });

  const mid = t.steps.length;
  t.relax('s', 'a', { value: 'x.value' });
  const relaxSteps = t.steps.slice(mid);
  expect(relaxSteps.map((s) => s.line)).toEqual([1, 2, 3]);
  expect(relaxSteps[0].question).toBeUndefined();
  expect(relaxSteps[1].question?.answer).toEqual({ kind: 'number', value: 2 });
  expect(relaxSteps[1].vertexState.a).toEqual({ d: 2, pi: null });
  expect(relaxSteps[2].vertexState.a).toEqual({ d: 2, pi: 's' });
  expect(relaxSteps[2].highlight.edges).toEqual(['s->a']);
  expect(relaxSteps[2].highlight.treeEdges).toEqual(['s->a']);
});

test('ds and settled callbacks are read at every emit', () => {
  let n = 0;
  const t = createTracer(g, 's', () => [{ kind: 'queue', name: 'Q', items: [String(n)] }], () => (n > 0 ? ['s'] : []));
  t.emit(INIT, 4);
  n = 1;
  t.emit(INIT, 4);
  expect(t.steps.map((s) => s.ds[0])).toEqual([
    { kind: 'queue', name: 'Q', items: ['0'] },
    { kind: 'queue', name: 'Q', items: ['1'] },
  ]);
  expect(t.steps[1].highlight.settled).toEqual(['s']);
});

test('notes and explanations spell out the comparison, with ∞ and negative weights', () => {
  expect(relaxNote('a', 'b', Infinity, -1, Infinity)).toBe('b.d = ∞ ≤ a.d + w(a, b) = ∞ + (-1) = ∞.');
  expect(relaxNote('s', 'a', 0, 2, Infinity)).toBe('a.d = ∞ > s.d + w(s, a) = 0 + 2 = 2.');
  expect(relaxUpdateQuestion('t', 's', 'a', 0, 2, Infinity)).toEqual({
    type: 't',
    prompt: 'Relax line 1: is a.d > s.d + w(s, a)?',
    answer: { kind: 'yesno', value: true },
    explain: 'a.d = ∞ and s.d + w(s, a) = 0 + 2 = 2, so a.d and a.π are updated.',
  });
  expect(newDistanceQuestion('t', 'a', 'b', 2, -1)).toEqual({
    type: 't',
    prompt: 'Relax line 2: what value is assigned to b.d?',
    answer: { kind: 'number', value: 1 },
    explain: 'b.d = a.d + w(a, b) = 2 + (-1) = 1.',
  });
});

test('reference: Floyd–Warshall distances and reachable negative cycles', () => {
  expect(shortestFrom(g, 's')).toEqual({ d: { a: 2, b: 1, s: 0 }, negativeCycle: false });
  const cyc = weightedDigraphForTest([['s', 'a', 1], ['a', 'b', -2], ['b', 'a', 1]]);
  expect(shortestFrom(cyc, 's').negativeCycle).toBe(true);
  expect(shortestFrom(cyc, 'b').negativeCycle).toBe(true);
  const unreachable = weightedDigraphForTest([['a', 'b', -2], ['b', 'a', 1], ['s', 'x', 1]]);
  expect(shortestFrom(unreachable, 's').negativeCycle).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/algorithms/sssp` → FAIL (the modules are missing).

- [ ] **Step 3: Implement**

`src/algorithms/sssp/shared.ts`:

```ts
import type { Graph } from '../../engine/graph';
import type { Params, Proc } from '../types';

export const INIT = 'Initialize_Single_Source';
export const RELAX = 'Relax';

// Shortest Paths slide 9.
export const initProc: Proc = {
  name: INIT,
  signature: 'Initialize_Single_Source(G, s)',
  lines: [
    'for all v ∈ G.V do',
    '    v.d = ∞',
    '    v.π = NIL',
    's.d = 0',
  ],
};

// Shortest Paths slide 12.
export const relaxProc: Proc = {
  name: RELAX,
  signature: 'Relax(u, v, w)',
  lines: [
    'if v.d > u.d + w(u, v) then',
    '    v.d = u.d + w(u, v)',
    '    v.π = u',
  ],
};

export function weightedDigraph(vertices: Graph['vertices'], edges: [string, string, number][]): Graph {
  return { directed: true, vertices, edges: edges.map(([u, v, w]) => ({ u, v, w })), adjOrder: {} };
}

export function sourceErrors(g: Graph, p: Params): string[] {
  const ok = p.s !== undefined && g.vertices.some((v) => v.id === p.s);
  return ok ? [] : ['Choose a source vertex s.'];
}
```

`src/algorithms/sssp/questions.ts`:

```ts
import { formatValue, type Question } from '../../engine/trace';

// "u.d + w" worked out, with a negative weight in parentheses: "2 + (-1) = 1".
function sumText(ud: number, w: number): string {
  return `${formatValue(ud)} + ${w < 0 ? `(${w})` : w} = ${formatValue(ud + w)}`;
}

export function relaxNote(u: string, v: string, ud: number, w: number, vd: number): string {
  return `${v}.d = ${formatValue(vd)} ${vd > ud + w ? '>' : '≤'} ${u}.d + w(${u}, ${v}) = ${sumText(ud, w)}.`;
}

export function relaxUpdateQuestion(type: string, u: string, v: string, ud: number, w: number, vd: number): Question {
  const yes = vd > ud + w;
  return {
    type,
    prompt: `Relax line 1: is ${v}.d > ${u}.d + w(${u}, ${v})?`,
    answer: { kind: 'yesno', value: yes },
    explain: `${v}.d = ${formatValue(vd)} and ${u}.d + w(${u}, ${v}) = ${sumText(ud, w)}, so ${
      yes ? `${v}.d and ${v}.π are updated` : 'nothing changes'
    }.`,
  };
}

export function newDistanceQuestion(type: string, u: string, v: string, ud: number, w: number): Question {
  return {
    type,
    prompt: `Relax line 2: what value is assigned to ${v}.d?`,
    answer: { kind: 'number', value: ud + w },
    explain: `${v}.d = ${u}.d + w(${u}, ${v}) = ${sumText(ud, w)}.`,
  };
}
```

`src/algorithms/sssp/tracer.ts`:

```ts
import { edgeKey, vertexIds, weightOf, type Graph } from '../../engine/graph';
import {
  treeEdgesFromPi, type DSView, type Question, type Step, type Value, type VertexState,
} from '../../engine/trace';
import { newDistanceQuestion, relaxNote, relaxUpdateQuestion } from './questions';
import { INIT, RELAX } from './shared';

export type EmitOptions = {
  bigStep?: boolean;
  vertices?: string[];
  edges?: string[];
  note?: string;
  question?: Question;
};

// Question types to attach inside Relax; a missing one is not asked.
export type RelaxQuestions = { update?: string; value?: string };

export type Tracer = {
  steps: Step[];
  st: VertexState;
  // Caller-owned: set before emitting; Relax steps show whatever is here.
  vars: Record<string, Value>;
  emit(proc: string, line: number, o?: EmitOptions): void;
  initializeSingleSource(): void;
  relax(u: string, v: string, ask: RelaxQuestions): void;
};

export function createTracer(
  g: Graph,
  s: string,
  dsOf: (st: VertexState) => DSView[],
  settledOf: (st: VertexState) => string[] = () => [],
): Tracer {
  const st: VertexState = {};
  for (const v of vertexIds(g)) st[v] = {};
  const t: Tracer = {
    steps: [],
    st,
    vars: { s },
    emit(proc, line, o = {}) {
      t.steps.push(structuredClone({
        proc,
        line,
        bigStep: o.bigStep ?? false,
        vertexState: st,
        vars: t.vars,
        ds: dsOf(st),
        highlight: { vertices: o.vertices, edges: o.edges, treeEdges: treeEdgesFromPi(g, st), settled: settledOf(st) },
        note: o.note,
        question: o.question,
      }));
    },
    initializeSingleSource() {
      const outer = t.vars;
      for (const v of vertexIds(g)) {
        t.vars = { ...outer, v };
        t.emit(INIT, 1, { vertices: [v] });
        st[v].d = Infinity;
        t.emit(INIT, 2, { vertices: [v] });
        st[v].pi = null;
        t.emit(INIT, 3, { vertices: [v] });
      }
      t.vars = outer;
      st[s].d = 0;
      t.emit(INIT, 4, { vertices: [s] });
    },
    relax(u, v, ask) {
      const hl = { vertices: [u, v], edges: [edgeKey(g, u, v)] };
      const w = weightOf(g, u, v);
      const ud = st[u].d as number;
      const vd = st[v].d as number;
      t.emit(RELAX, 1, {
        ...hl,
        note: relaxNote(u, v, ud, w, vd),
        question: ask.update ? relaxUpdateQuestion(ask.update, u, v, ud, w, vd) : undefined,
      });
      if (!(vd > ud + w)) return;
      st[v].d = ud + w;
      t.emit(RELAX, 2, { ...hl, question: ask.value ? newDistanceQuestion(ask.value, u, v, ud, w) : undefined });
      st[v].pi = u;
      t.emit(RELAX, 3, hl);
    },
  };
  return t;
}
```

`src/algorithms/sssp/reference.ts` (used only by tests; no production import):

```ts
import { addEdge, vertexIds, type Graph } from '../../engine/graph';

// Test helpers: an independent shortest-path reference and random weighted digraphs.

export function weightedDigraphForTest(edges: [string, string, number][]): Graph {
  const ids = [...new Set(edges.flatMap(([u, v]) => [u, v]).concat('s'))];
  return {
    directed: true,
    vertices: ids.map((id, i) => ({ id, x: 40 + i * 50, y: 100 })),
    edges: edges.map(([u, v, w]) => ({ u, v, w })),
    adjOrder: {},
  };
}

// mulberry32: tiny deterministic PRNG, no new dependency.
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1–10 vertices a, b, …; random edges with integer weights in [minW, minW + 12].
export function randomWeightedDigraph(rand: () => number, minW: number): Graph {
  const n = 1 + Math.floor(rand() * 10);
  const vertices = Array.from({ length: n }, (_, i) => ({ id: String.fromCharCode(97 + i), x: 40 + i * 50, y: 100 }));
  let g: Graph = { directed: true, vertices, edges: [], adjOrder: {} };
  const ids = vertices.map((v) => v.id);
  const target = Math.floor(rand() * (n * (n - 1) + 1));
  for (let tries = 0; tries < n * n * 4 && g.edges.length < target; tries++) {
    const u = ids[Math.floor(rand() * n)];
    const v = ids[Math.floor(rand() * n)];
    g = addEdge(g, u, v, minW + Math.floor(rand() * 13));
  }
  return g;
}

// Floyd–Warshall from s, plus whether a negative cycle is reachable from s.
export function shortestFrom(g: Graph, s: string): { d: Record<string, number>; negativeCycle: boolean } {
  const V = vertexIds(g);
  const dist: Record<string, Record<string, number>> = {};
  for (const a of V) {
    dist[a] = {};
    for (const b of V) dist[a][b] = a === b ? 0 : Infinity;
  }
  for (const e of g.edges) dist[e.u][e.v] = Math.min(dist[e.u][e.v], e.w!);
  for (const k of V) {
    for (const i of V) {
      for (const j of V) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
      }
    }
  }
  const negativeCycle = V.some((v) => dist[s][v] < Infinity && dist[v][v] < 0);
  return { d: dist[s], negativeCycle };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/algorithms/sssp` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/algorithms/sssp
git commit -m "feat(sssp): shared Initialize_Single_Source and Relax tracer"
```

---

### Task 5: Bellman-Ford

**Files:**
- Create: `src/algorithms/bellman-ford/pseudocode.ts`, `questions.ts`, `presets.ts`, `run.ts`, `index.ts`, `run.test.ts`
- Modify: `src/algorithms/registry.ts`

**Interfaces:**
- Consumes: Task 1 `edgeList`, `edgeKey`, `vertexIds`, `weightOf`; Task 4 `createTracer`, `initProc`, `relaxProc`, `relaxNote`, `weightedDigraph`, `sourceErrors`; test-only `mulberry32`, `randomWeightedDigraph`, `shortestFrom`.
- Produces: `bellmanFord: AlgorithmDef` (id `bellman-ford`, route `#/bellman-ford`, title `Bellman-Ford`), `runBellmanFord(g, params)`, `BF = 'Bellman_Ford'`; question types `bf.relax`, `bf.distance`.

- [ ] **Step 1: Write the failing test** `src/algorithms/bellman-ford/run.test.ts`:

```ts
import { moveInEdgeList, removeEdge, weightOf, type Graph } from '../../engine/graph';
import type { Step } from '../../engine/trace';
import { mulberry32, randomWeightedDigraph, shortestFrom } from '../sssp/reference';
import { assertQuestionsPredictable, assertValidTrace } from '../testing';
import { bellmanFord } from './index';
import { runBellmanFord } from './run';

const lecture = bellmanFord.presets[0];
const cycle = bellmanFord.presets[1];
const last = (steps: Step[]) => steps[steps.length - 1];
const attr = (steps: Step[], key: string) =>
  Object.fromEntries(Object.entries(last(steps).vertexState).map(([v, a]) => [v, a[key]]));
const firstPassEdges = (steps: Step[]) =>
  steps.filter((s) => s.proc === 'Bellman_Ford' && s.line === 4 && s.vars.i === 1).map((s) => `${s.vars.u}->${s.vars.v}`);

function checkPredictable(g: Graph, steps: Step[]): void {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    const u = step.vars.u as string;
    const v = step.vars.v as string;
    const w = weightOf(g, u, v);
    const ud = prev.vertexState[u].d as number;
    const vd = prev.vertexState[v].d as number;
    if (q.type === 'bf.relax') {
      expect([prev.proc, prev.line, prev.vars.u, prev.vars.v]).toEqual(['Bellman_Ford', 4, u, v]);
      expect(q.answer.value).toBe(vd > ud + w);
    } else if (q.type === 'bf.distance') {
      expect([prev.proc, prev.line]).toEqual(['Relax', 1]);
      expect(q.answer.value).toBe(ud + w);
      expect(vd).not.toBe(ud + w);
    } else {
      throw new Error(`unexpected question ${q.type}`);
    }
  });
}

test('lecture example (slide 30): d and π match the slide', () => {
  const steps = runBellmanFord(lecture.graph, lecture.params);
  assertValidTrace(bellmanFord, steps);
  expect(attr(steps, 'd')).toEqual({ s: 0, v1: -4, v2: 4, v3: -5, v4: -2, v5: -4, v6: -6, v7: -1 });
  expect(attr(steps, 'pi')).toEqual({ s: null, v1: 'v4', v2: 's', v3: 's', v4: 'v5', v5: 'v3', v6: 'v4', v7: 'v6' });
  expect([last(steps).proc, last(steps).line]).toEqual(['Bellman_Ford', 6]);
  expect(last(steps).note).toMatch(/no negative weight cycle/);
});

test('|V| − 1 passes, each relaxing every edge in G.E order', () => {
  const steps = runBellmanFord(lecture.graph, lecture.params);
  expect(steps.filter((s) => s.proc === 'Bellman_Ford' && s.line === 2).map((s) => s.vars.i)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(firstPassEdges(steps)).toEqual([
    's->v2', 's->v3', 'v1->s', 'v2->v4', 'v3->v4', 'v3->v5', 'v4->v1',
    'v4->v6', 'v5->v4', 'v5->v6', 'v5->v7', 'v6->v7', 'v7->v3',
  ]);
  expect(steps.filter((s) => s.proc === 'Relax' && s.line === 1)).toHaveLength(91);
  expect(steps.filter((s) => s.proc === 'Relax' && s.line === 2)).toHaveLength(13);
});

test('big steps: every pass header, then the start of the check loop', () => {
  const big = runBellmanFord(lecture.graph, lecture.params).filter((s) => s.bigStep);
  expect(big.map((s) => [s.line, s.vars.i ?? null])).toEqual([
    [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [5, null],
  ]);
});

test('the G.E panel marks the edge being scanned', () => {
  const steps = runBellmanFord(lecture.graph, lecture.params);
  const s = steps.find((x) => x.proc === 'Bellman_Ford' && x.line === 4 && x.vars.u === 'v1')!;
  expect(s.ds[0]).toMatchObject({ kind: 'edges', name: 'G.E', current: 2 });
  expect((s.ds[0] as { items: string[] }).items[2]).toBe('(v1, s)');
  expect(steps[0].ds[0]).toMatchObject({ current: null });
});

test('questions: yes/no at every Relax in pass 1 only; new v.d at every update', () => {
  const qs = runBellmanFord(lecture.graph, lecture.params).filter((s) => s.question);
  const yn = qs.filter((s) => s.question!.type === 'bf.relax');
  expect(yn).toHaveLength(13);
  expect(yn.every((s) => s.vars.i === 1 && s.proc === 'Relax' && s.line === 1)).toBe(true);
  expect(yn[0].question!.answer).toEqual({ kind: 'yesno', value: true }); // Relax(s, v2): ∞ > 0 + 4
  expect(yn[2].question!.answer).toEqual({ kind: 'yesno', value: false }); // Relax(v1, s): v1.d = ∞
  const num = qs.filter((s) => s.question!.type === 'bf.distance');
  expect(num).toHaveLength(13);
  expect(num[1].question!.answer).toEqual({ kind: 'number', value: -5 }); // Relax(s, v3)
});

test('questions are predictable from the step shown before them', () => {
  for (const p of bellmanFord.presets) checkPredictable(p.graph, runBellmanFord(p.graph, p.params));
});

test('negative weight cycle: the run ends at line 7 on the first edge that fails the check', () => {
  const steps = runBellmanFord(cycle.graph, cycle.params);
  assertValidTrace(bellmanFord, steps);
  const end = last(steps);
  expect([end.proc, end.line]).toEqual(['Bellman_Ford', 7]);
  expect(end.highlight.edges).toEqual(['a->b']);
  expect(end.note).toMatch(/negative weight cycle/);
  expect(attr(steps, 'd')).toEqual({ s: 0, a: 0, b: 2, c: -2 });
});

test('the trace follows the displayed G.E order, also after an edge is removed', () => {
  const moved = moveInEdgeList(lecture.graph, 2, -1);
  const steps = runBellmanFord(moved, lecture.params);
  expect(firstPassEdges(steps).slice(0, 3)).toEqual(['s->v2', 'v1->s', 's->v3']);
  expect(attr(steps, 'd')).toEqual(attr(runBellmanFord(lecture.graph, lecture.params), 'd'));
  const removed = removeEdge(moved, 's', 'v2');
  expect(firstPassEdges(runBellmanFord(removed, lecture.params)).slice(0, 2)).toEqual(['v1->s', 's->v3']);
});

test('a single vertex: no passes, still a valid trace', () => {
  const g: Graph = { directed: true, vertices: [{ id: 's', x: 100, y: 100 }], edges: [], adjOrder: {} };
  const steps = runBellmanFord(g, { s: 's' });
  assertValidTrace(bellmanFord, steps);
  expect(attr(steps, 'd')).toEqual({ s: 0 });
});

test('validate requires an existing source', () => {
  expect(bellmanFord.validate(lecture.graph, {}).errors).toEqual(['Choose a source vertex s.']);
  expect(bellmanFord.validate(lecture.graph, { s: 's' })).toEqual({ errors: [], warnings: [] });
});

test('random weighted digraphs agree with Floyd–Warshall, including negative-cycle detection', () => {
  const rand = mulberry32(3);
  const seen = { cycle: 0, ok: 0 };
  for (let n = 0; n < 40; n++) {
    const g = randomWeightedDigraph(rand, -3);
    const steps = runBellmanFord(g, { s: 'a' });
    assertValidTrace(bellmanFord, steps);
    checkPredictable(g, steps);
    const ref = shortestFrom(g, 'a');
    const end = last(steps);
    if (ref.negativeCycle) {
      seen.cycle++;
      expect([end.proc, end.line]).toEqual(['Bellman_Ford', 7]);
    } else {
      seen.ok++;
      expect(end.line).not.toBe(7);
      expect(attr(steps, 'd')).toEqual(ref.d);
    }
  }
  // Both outcomes must be exercised. If one count is 0, change the seed — do not drop this line.
  expect(seen.cycle > 0 && seen.ok > 0).toBe(true);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/algorithms/bellman-ford` → FAIL.

- [ ] **Step 3: Implement**

`src/algorithms/bellman-ford/pseudocode.ts`:

```ts
import { initProc, relaxProc } from '../sssp/shared';
import type { Proc } from '../types';

export const BF = 'Bellman_Ford';

// Shortest Paths slide 29.
export const bellmanFordProcs: Proc[] = [
  {
    name: BF,
    signature: 'Bellman_Ford(G, w, s)',
    lines: [
      'Initialize_Single_Source(G, s)',
      'for i = 1, …, |G.V| − 1 do',
      '    for all (u, v) ∈ G.E do',
      '        Relax(u, v, w)',
      'for all (u, v) ∈ G.E do',
      '    if v.d > u.d + w(u, v) then',
      '        error: “negative weight cycle”',
    ],
  },
  initProc,
  relaxProc,
];
```

`src/algorithms/bellman-ford/questions.ts`:

```ts
export const bellmanFordQuestionTypes = [
  { type: 'bf.relax', label: 'Does Relax update v.d (first pass)' },
  { type: 'bf.distance', label: 'New value of v.d' },
];
```

`src/algorithms/bellman-ford/presets.ts`:

```ts
import { weightedDigraph } from '../sssp/shared';
import type { Preset } from '../types';

export const bellmanFordPresets: Preset[] = [
  {
    name: 'Lecture example (Shortest Paths slide 30)',
    params: { s: 's' },
    graph: weightedDigraph(
      [
        { id: 's', x: 45, y: 335 },
        { id: 'v1', x: 84, y: 80 },
        { id: 'v2', x: 123, y: 233 },
        { id: 'v3', x: 241, y: 335 },
        { id: 'v4', x: 281, y: 132 },
        { id: 'v5', x: 398, y: 233 },
        { id: 'v6', x: 477, y: 80 },
        { id: 'v7', x: 556, y: 335 },
      ],
      [
        ['s', 'v2', 4], ['s', 'v3', -5], ['v1', 's', 5], ['v2', 'v4', 5], ['v3', 'v4', 4],
        ['v3', 'v5', 1], ['v4', 'v1', -2], ['v4', 'v6', -4], ['v5', 'v4', 2], ['v5', 'v6', -1],
        ['v5', 'v7', 6], ['v6', 'v7', 5], ['v7', 'v3', -3],
      ],
    ),
  },
  {
    name: 'Negative weight cycle',
    params: { s: 's' },
    graph: weightedDigraph(
      [
        { id: 's', x: 80, y: 210 },
        { id: 'a', x: 240, y: 110 },
        { id: 'b', x: 400, y: 210 },
        { id: 'c', x: 240, y: 310 },
      ],
      [['s', 'a', 2], ['a', 'b', 1], ['b', 'c', -4], ['c', 'a', 2]],
    ),
  },
];
```

`src/algorithms/bellman-ford/run.ts`:

```ts
import { edgeKey, edgeList, vertexIds, weightOf, type Graph } from '../../engine/graph';
import type { Step } from '../../engine/trace';
import { relaxNote } from '../sssp/questions';
import { createTracer } from '../sssp/tracer';
import type { Params } from '../types';
import { BF } from './pseudocode';

export function runBellmanFord(g: Graph, params: Params): Step[] {
  const s = params.s;
  const E = edgeList(g);
  const names = E.map((e) => `(${e.u}, ${e.v})`);
  let current: number | null = null;
  const t = createTracer(g, s, () => [{ kind: 'edges', name: 'G.E', items: names, current }]);

  t.emit(BF, 1, { vertices: [s] });
  t.initializeSingleSource();

  const n = vertexIds(g).length;
  for (let i = 1; i <= n - 1; i++) {
    current = null;
    t.vars = { s, i };
    t.emit(BF, 2, { bigStep: true });
    E.forEach((e, k) => {
      current = k;
      t.vars = { s, i, u: e.u, v: e.v };
      const hl = { vertices: [e.u, e.v], edges: [edgeKey(g, e.u, e.v)] };
      t.emit(BF, 3, hl);
      t.emit(BF, 4, hl);
      // Staff decision: "does Relax update" only in the first pass; the new v.d at every update.
      t.relax(e.u, e.v, i === 1 ? { update: 'bf.relax', value: 'bf.distance' } : { value: 'bf.distance' });
    });
  }

  for (const [k, e] of E.entries()) {
    current = k;
    t.vars = { s, u: e.u, v: e.v };
    const hl = { vertices: [e.u, e.v], edges: [edgeKey(g, e.u, e.v)] };
    t.emit(BF, 5, { ...hl, bigStep: k === 0 });
    const ud = t.st[e.u].d as number;
    const vd = t.st[e.v].d as number;
    const w = weightOf(g, e.u, e.v);
    const fails = vd > ud + w;
    const lastEdge = k === E.length - 1;
    const done = !fails && lastEdge ? ' No edge fails the check, so there is no negative weight cycle reachable from s.' : '';
    t.emit(BF, 6, { ...hl, note: relaxNote(e.u, e.v, ud, w, vd) + done });
    if (fails) {
      t.emit(BF, 7, { ...hl, note: 'error: “negative weight cycle”. The algorithm stops here.' });
      break;
    }
  }
  return t.steps;
}
```

`src/algorithms/bellman-ford/index.ts`:

```ts
import { sourceErrors } from '../sssp/shared';
import type { AlgorithmDef } from '../types';
import { bellmanFordPresets } from './presets';
import { bellmanFordProcs } from './pseudocode';
import { bellmanFordQuestionTypes } from './questions';
import { runBellmanFord } from './run';

export const bellmanFord: AlgorithmDef = {
  id: 'bellman-ford',
  title: 'Bellman-Ford',
  directed: true,
  weighted: true,
  order: 'edges',
  procs: bellmanFordProcs,
  params: [{ name: 's', label: 'Source s' }],
  stateColumns: [
    { key: 'd', label: 'd' },
    { key: 'pi', label: 'π' },
  ],
  questionTypes: bellmanFordQuestionTypes,
  presets: bellmanFordPresets,
  validate(g, p) {
    return { errors: sourceErrors(g, p), warnings: [] };
  },
  run: runBellmanFord,
};
```

`src/algorithms/registry.ts`: import `bellmanFord` and set `ALGORITHMS = [bfs, dfs, bellmanFord]`.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run` → all PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/algorithms/bellman-ford src/algorithms/registry.ts
git commit -m "feat(bellman-ford): lecture pseudocode, presets, first-pass Relax questions"
```

---

### Task 6: Dijkstra

**Files:**
- Create: `src/algorithms/dijkstra/pseudocode.ts`, `questions.ts`, `presets.ts`, `run.ts`, `index.ts`, `run.test.ts`
- Modify: `src/algorithms/registry.ts`

**Interfaces:**
- Consumes: Task 1 `adjacency`, `compareLabels`, `edgeKey`, `vertexIds`, `weightOf`, `moveInAdjacency`, `DEFAULT_WEIGHT`; Task 4 `createTracer`, `initProc`, `relaxProc`, `weightedDigraph`, `sourceErrors`, and the test helpers.
- Produces: `dijkstra: AlgorithmDef` (id `dijkstra`, title `Dijkstra`), `runDijkstra`, `DIJKSTRA = 'Dijkstra'`, `DIJKSTRA_NEGATIVE_WARNING`; question types `dijkstra.extract`, `dijkstra.relax`.

- [ ] **Step 1: Write the failing test** `src/algorithms/dijkstra/run.test.ts`:

```ts
import { moveInAdjacency, weightOf, type Graph } from '../../engine/graph';
import type { DSView, Step } from '../../engine/trace';
import { mulberry32, randomWeightedDigraph, shortestFrom } from '../sssp/reference';
import { assertQuestionsPredictable, assertValidTrace } from '../testing';
import { dijkstra, DIJKSTRA_NEGATIVE_WARNING } from './index';
import { runDijkstra } from './run';

const lecture = dijkstra.presets[0];
const tutorial = dijkstra.presets[1];
const last = (steps: Step[]) => steps[steps.length - 1];
const attr = (steps: Step[], key: string) =>
  Object.fromEntries(Object.entries(last(steps).vertexState).map(([v, a]) => [v, a[key]]));
const extracted = (steps: Step[]) => steps.filter((s) => s.proc === 'Dijkstra' && s.line === 4).map((s) => s.vars.u);

function checkPredictable(g: Graph, steps: Step[]): void {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    if (q.type === 'dijkstra.extract') {
      expect([prev.proc, prev.line]).toEqual(['Dijkstra', 3]);
      const Q = prev.ds[0] as Extract<DSView, { kind: 'keyed' }>;
      expect(Q.items[0].id).toBe(q.answer.value);
      expect(prev.vertexState[q.answer.value as string].inQ).toBe('yes');
    } else if (q.type === 'dijkstra.relax') {
      const u = step.vars.u as string;
      const v = step.vars.v as string;
      expect([prev.proc, prev.line, prev.vars.u, prev.vars.v]).toEqual(['Dijkstra', 6, u, v]);
      const ud = prev.vertexState[u].d as number;
      const vd = prev.vertexState[v].d as number;
      expect(q.answer.value).toBe(vd > ud + weightOf(g, u, v));
    } else {
      throw new Error(`unexpected question ${q.type}`);
    }
  });
}

test('lecture example (slide 40): extract order, d and π', () => {
  const steps = runDijkstra(lecture.graph, lecture.params);
  assertValidTrace(dijkstra, steps);
  expect(extracted(steps)).toEqual(['s', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7']);
  expect(attr(steps, 'd')).toEqual({ s: 0, v1: 3, v2: 5, v3: 8, v4: 9, v5: 10, v6: 13, v7: 14 });
  expect(attr(steps, 'pi')).toEqual({ s: null, v1: 's', v2: 's', v3: 'v1', v4: 'v3', v5: 'v2', v6: 'v5', v7: 'v6' });
  expect(Object.values(attr(steps, 'inQ')).every((x) => x === 'no')).toBe(true);
  const end = last(steps);
  expect([end.proc, end.line]).toEqual(['Dijkstra', 3]);
  expect(end.note).toMatch(/Q = ∅/);
  expect(end.highlight.settled).toHaveLength(8);
});

test('the slide 40 snapshot: just before v4 is extracted', () => {
  const steps = runDijkstra(lecture.graph, lecture.params);
  const i = steps.findIndex((s) => s.proc === 'Dijkstra' && s.line === 4 && s.vars.u === 'v4');
  const st = steps[i - 1].vertexState;
  expect(['v4', 'v5', 'v6', 'v7'].map((v) => st[v].d)).toEqual([9, 10, Infinity, 17]);
  expect(steps[i - 1].highlight.settled).toEqual(['s', 'v1', 'v2', 'v3']);
});

test('the Q panel lists Q by d, ties by label', () => {
  const steps = runDijkstra(lecture.graph, lecture.params);
  const afterS = steps.filter((s) => s.proc === 'Dijkstra' && s.line === 3)[1];
  expect(afterS.ds[0]).toEqual({
    kind: 'keyed', name: 'Q', key: 'd',
    items: [
      { id: 'v1', value: 3 }, { id: 'v2', value: 5 }, { id: 'v3', value: Infinity }, { id: 'v4', value: Infinity },
      { id: 'v5', value: Infinity }, { id: 'v6', value: Infinity }, { id: 'v7', value: Infinity },
    ],
  });
  expect(steps[0].ds[0]).toMatchObject({ items: [] });
});

test('big steps are exactly the Extract_Min lines', () => {
  const big = runDijkstra(lecture.graph, lecture.params).filter((s) => s.bigStep);
  expect(big).toHaveLength(8);
  expect(big.every((s) => s.proc === 'Dijkstra' && s.line === 4)).toBe(true);
});

test('questions: one Extract_Min per vertex, one Relax per edge', () => {
  const qs = runDijkstra(lecture.graph, lecture.params).filter((s) => s.question);
  expect(qs.filter((s) => s.question!.type === 'dijkstra.extract')).toHaveLength(8);
  const relax = qs.filter((s) => s.question!.type === 'dijkstra.relax');
  expect(relax).toHaveLength(14);
  expect(relax[0].question!.answer).toEqual({ kind: 'yesno', value: true }); // Relax(s, v1)
});

test('questions are predictable from the step shown before them', () => {
  for (const p of dijkstra.presets) checkPredictable(p.graph, runDijkstra(p.graph, p.params));
});

test('tutorial 10 question 1: a negative weight makes c.d wrong, with a warning', () => {
  expect(dijkstra.validate(tutorial.graph, tutorial.params)).toEqual({ errors: [], warnings: [DIJKSTRA_NEGATIVE_WARNING] });
  const steps = runDijkstra(tutorial.graph, tutorial.params);
  expect(extracted(steps)).toEqual(['s', 'b', 'a', 'c']);
  expect(attr(steps, 'd')).toEqual({ s: 0, a: 4, b: 2, c: 7 });
  expect(attr(steps, 'pi')).toEqual({ s: null, a: 's', b: 'a', c: 'b' });
});

test('ties break by label; unreachable vertices come out last and never relax anything', () => {
  const g: Graph = {
    directed: true,
    vertices: ['s', 'b', 'a', 'z'].map((id, i) => ({ id, x: 60 + i * 100, y: 100 })),
    edges: [{ u: 's', v: 'b', w: 1 }, { u: 's', v: 'a', w: 1 }, { u: 'z', v: 'a', w: 0 }],
    adjOrder: {},
  };
  const steps = runDijkstra(g, { s: 's' });
  const ex = steps.filter((s) => s.proc === 'Dijkstra' && s.line === 4);
  expect(ex.map((s) => s.vars.u)).toEqual(['s', 'a', 'b', 'z']);
  expect(ex[1].question!.explain).toMatch(/ties with b/);
  expect(attr(steps, 'd')).toEqual({ s: 0, a: 1, b: 1, z: Infinity });
  expect(attr(steps, 'pi')).toEqual({ s: null, a: 's', b: 's', z: null });
  checkPredictable(g, steps);
});

test('reordering G.Adj[s] changes the Relax order', () => {
  const g = moveInAdjacency(lecture.graph, 's', 1, -1);
  const steps = runDijkstra(g, lecture.params);
  expect(steps.find((s) => s.proc === 'Dijkstra' && s.line === 6)!.vars.v).toBe('v2');
  expect(attr(steps, 'd')).toEqual(attr(runDijkstra(lecture.graph, lecture.params), 'd'));
});

test('validate: source required; negative weights warn but do not block', () => {
  expect(dijkstra.validate(lecture.graph, {}).errors).toEqual(['Choose a source vertex s.']);
  expect(dijkstra.validate(lecture.graph, { s: 's' })).toEqual({ errors: [], warnings: [] });
});

test('random digraphs with w ≥ 0 agree with Floyd–Warshall', () => {
  const rand = mulberry32(11);
  for (let n = 0; n < 40; n++) {
    const g = randomWeightedDigraph(rand, 0);
    const steps = runDijkstra(g, { s: 'a' });
    assertValidTrace(dijkstra, steps);
    checkPredictable(g, steps);
    expect(attr(steps, 'd')).toEqual(shortestFrom(g, 'a').d);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/algorithms/dijkstra` → FAIL.

- [ ] **Step 3: Implement**

`src/algorithms/dijkstra/pseudocode.ts`:

```ts
import { initProc, relaxProc } from '../sssp/shared';
import type { Proc } from '../types';

export const DIJKSTRA = 'Dijkstra';

// Shortest Paths slide 39.
export const dijkstraProcs: Proc[] = [
  {
    name: DIJKSTRA,
    signature: 'Dijkstra(G, w, s)',
    lines: [
      'Initialize_Single_Source(G, s)',
      'Q = G.V',
      'while Q ≠ ∅ do',
      '    u = Extract_Min(Q)    ▷ minimum w.r.t. d',
      '    for all v ∈ G.Adj[u] do',
      '        Relax(u, v, w)',
    ],
  },
  initProc,
  relaxProc,
];
```

`src/algorithms/dijkstra/questions.ts`:

```ts
import { formatValue, type Question, type Value } from '../../engine/trace';

export const dijkstraQuestionTypes = [
  { type: 'dijkstra.extract', label: 'Which vertex Extract_Min returns' },
  { type: 'dijkstra.relax', label: 'Does Relax update v.d' },
];

export function extractQuestion(u: string, d: Value, tiedWith: string[]): Question {
  const tie = tiedWith.length > 0 ? `; it ties with ${tiedWith.join(', ')} and ties break by label` : '';
  return {
    type: 'dijkstra.extract',
    prompt: 'Line 4: which vertex does Extract_Min(Q) return?',
    answer: { kind: 'vertex', value: u },
    explain: `${u}.d = ${formatValue(d)} is the smallest d in Q${tie}.`,
  };
}
```

`src/algorithms/dijkstra/presets.ts`:

```ts
import { weightedDigraph } from '../sssp/shared';
import type { Preset } from '../types';

export const dijkstraPresets: Preset[] = [
  {
    name: 'Lecture example (Shortest Paths slide 40)',
    params: { s: 's' },
    graph: weightedDigraph(
      [
        { id: 's', x: 45, y: 238 },
        { id: 'v1', x: 126, y: 119 },
        { id: 'v2', x: 213, y: 297 },
        { id: 'v3', x: 300, y: 60 },
        { id: 'v4', x: 343, y: 178 },
        { id: 'v5', x: 430, y: 356 },
        { id: 'v6', x: 516, y: 236 },
        { id: 'v7', x: 560, y: 119 },
      ],
      [
        ['s', 'v1', 3], ['s', 'v2', 5], ['v2', 'v1', 4], ['v1', 'v3', 5], ['v1', 'v4', 8],
        ['v3', 'v4', 1], ['v3', 'v7', 9], ['v4', 'v7', 7], ['v4', 'v2', 4], ['v4', 'v6', 5],
        ['v4', 'v5', 4], ['v2', 'v5', 5], ['v5', 'v6', 3], ['v6', 'v7', 1],
      ],
    ),
  },
  {
    name: 'Tutorial 10, question 1 (negative weight)',
    params: { s: 's' },
    graph: weightedDigraph(
      [
        { id: 's', x: 80, y: 200 },
        { id: 'a', x: 260, y: 90 },
        { id: 'b', x: 260, y: 310 },
        { id: 'c', x: 460, y: 310 },
      ],
      [['s', 'a', 4], ['s', 'b', 3], ['a', 'b', -2], ['b', 'c', 4]],
    ),
  },
];
```

`src/algorithms/dijkstra/run.ts`:

```ts
import { adjacency, compareLabels, edgeKey, vertexIds, type Graph } from '../../engine/graph';
import type { Step, VertexState } from '../../engine/trace';
import { createTracer } from '../sssp/tracer';
import type { Params } from '../types';
import { DIJKSTRA } from './pseudocode';
import { extractQuestion } from './questions';

// Q in Extract_Min order: by d, ties by label (∞ − ∞ is NaN, which falls through to the label).
const byD = (st: VertexState) => (a: string, b: string) =>
  (st[a].d as number) - (st[b].d as number) || compareLabels(a, b);

export function runDijkstra(g: Graph, params: Params): Step[] {
  const s = params.s;
  let Q: string[] = [];
  const t = createTracer(
    g,
    s,
    (st) => [{ kind: 'keyed', name: 'Q', key: 'd', items: [...Q].sort(byD(st)).map((id) => ({ id, value: st[id].d })) }],
    (st) => vertexIds(g).filter((v) => st[v].inQ === 'no'),
  );

  t.emit(DIJKSTRA, 1, { vertices: [s] });
  t.initializeSingleSource();
  Q = vertexIds(g);
  for (const v of Q) t.st[v].inQ = 'yes';
  t.emit(DIJKSTRA, 2);

  for (;;) {
    t.vars = { s };
    if (Q.length === 0) {
      t.emit(DIJKSTRA, 3, { note: 'Q = ∅, so the loop ends.' });
      break;
    }
    t.emit(DIJKSTRA, 3);
    const [u, ...rest] = [...Q].sort(byD(t.st));
    const tied = rest.filter((x) => t.st[x].d === t.st[u].d);
    Q = Q.filter((x) => x !== u);
    t.st[u].inQ = 'no';
    t.vars = { s, u };
    t.emit(DIJKSTRA, 4, { bigStep: true, vertices: [u], question: extractQuestion(u, t.st[u].d, tied) });
    for (const v of adjacency(g, u)) {
      t.vars = { s, u, v };
      const hl = { vertices: [u, v], edges: [edgeKey(g, u, v)] };
      t.emit(DIJKSTRA, 5, hl);
      t.emit(DIJKSTRA, 6, hl);
      t.relax(u, v, { update: 'dijkstra.relax' });
    }
  }
  return t.steps;
}
```

`src/algorithms/dijkstra/index.ts`:

```ts
import { DEFAULT_WEIGHT } from '../../engine/graph';
import { sourceErrors } from '../sssp/shared';
import type { AlgorithmDef } from '../types';
import { dijkstraPresets } from './presets';
import { dijkstraProcs } from './pseudocode';
import { dijkstraQuestionTypes } from './questions';
import { runDijkstra } from './run';

export const DIJKSTRA_NEGATIVE_WARNING = 'Dijkstra assumes w ≥ 0. This graph has a negative weight, so the result may be wrong.';

export const dijkstra: AlgorithmDef = {
  id: 'dijkstra',
  title: 'Dijkstra',
  directed: true,
  weighted: true,
  order: 'adjacency',
  procs: dijkstraProcs,
  params: [{ name: 's', label: 'Source s' }],
  stateColumns: [
    { key: 'd', label: 'd' },
    { key: 'pi', label: 'π' },
    { key: 'inQ', label: 'in Q' },
  ],
  questionTypes: dijkstraQuestionTypes,
  presets: dijkstraPresets,
  validate(g, p) {
    const negative = g.edges.some((e) => (e.w ?? DEFAULT_WEIGHT) < 0);
    return { errors: sourceErrors(g, p), warnings: negative ? [DIJKSTRA_NEGATIVE_WARNING] : [] };
  },
  run: runDijkstra,
};
```

`src/algorithms/registry.ts`: import `dijkstra`; `ALGORITHMS = [bfs, dfs, bellmanFord, dijkstra]`.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run` → all PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/algorithms/dijkstra src/algorithms/registry.ts
git commit -m "feat(dijkstra): lecture pseudocode, Q by d, Extract_Min and Relax questions"
```

---

### Task 7: Registry checks, page tests, e2e, docs

**Files:**
- Create: `src/algorithms/registry.test.ts`, `e2e/bellman-ford.spec.ts`, `e2e/dijkstra.spec.ts`
- Modify: `src/App.test.tsx`, `src/ui/Home.tsx`, `docs/superpowers/specs/2026-09-28-algo-visualizer-design.md`, `docs/superpowers/plans/plan-1-followups.md`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the failing and new tests**

`src/algorithms/registry.test.ts`:

```ts
import { ALGORITHMS } from './registry';

test('algorithm ids are unique', () => {
  expect(new Set(ALGORITHMS.map((a) => a.id)).size).toBe(ALGORITHMS.length);
});

test.each(ALGORITHMS)('$id presets fit the algorithm', (def) => {
  for (const p of def.presets) {
    if (def.directed !== 'toggle') expect(p.graph.directed).toBe(def.directed);
    expect(p.graph.edges.every((e) => (typeof e.w === 'number') === def.weighted)).toBe(true);
    expect(def.validate(p.graph, p.params).errors).toEqual([]);
  }
});
```

Append to `src/App.test.tsx`:

```tsx
test('home lists Bellman-Ford and Dijkstra', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /Bellman-Ford/ })).toHaveAttribute('href', '#/bellman-ford');
  expect(screen.getByRole('link', { name: /Dijkstra/ })).toHaveAttribute('href', '#/dijkstra');
});

test('Bellman-Ford page: first Relax question, final distances', async () => {
  window.location.hash = '#/bellman-ford';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Bellman-Ford' })).toBeInTheDocument();
  expect(screen.getByLabelText('G.E')).toHaveTextContent(/\(s, v2\)/);
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Relax line 1: is v2.d > s.d + w(s, v2)?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Yes' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  const rowV1 = screen.getByRole('row', { name: /^v1/ });
  expect(rowV1).toHaveTextContent('-4');
  expect(rowV1).toHaveTextContent('v4');
  expect(screen.getByLabelText('G.E contents')).toHaveTextContent('(v7, v3)');
});

test('Dijkstra page: Extract_Min question, final distances, settled vertices', async () => {
  window.location.hash = '#/dijkstra';
  const { container } = render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Line 4: which vertex does Extract_Min(Q) return?');
  await userEvent.click(within(dialog).getByRole('button', { name: 's' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  const rowV7 = screen.getByRole('row', { name: /^v7/ });
  expect(rowV7).toHaveTextContent('14');
  expect(rowV7).toHaveTextContent('v6');
  expect(screen.getByLabelText('Q contents')).toHaveTextContent('∅');
  expect(container.querySelectorAll('.vertex.settled')).toHaveLength(8);
});

test('Dijkstra negative-weight preset: warning on Run, cleared by Edit graph', async () => {
  window.location.hash = '#/dijkstra';
  render(<App />);
  await userEvent.selectOptions(screen.getByLabelText('Preset'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByText(/Dijkstra assumes w ≥ 0/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next step' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Edit graph' }));
  expect(screen.queryByText(/Dijkstra assumes w ≥ 0/)).toBeNull();
});
```

`e2e/bellman-ford.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('run Bellman-Ford on the lecture example to the end', async ({ page }) => {
  await page.goto('/#/bellman-ford');
  await expect(page.getByRole('heading', { name: 'Bellman-Ford' })).toBeVisible();
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  await expect(page.getByRole('button', { name: 'Yes' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.getByRole('row', { name: /^v6/ })).toContainText('-6');
});

test('negative weight cycle preset ends on the error line', async ({ page }) => {
  await page.goto('/#/bellman-ford');
  await page.getByLabel('Preset').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText('negative weight cycle');
  await expect(page.locator('.note')).toContainText('stops here');
});

test('Bellman-Ford page: no horizontal scroll at phone width, before and after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/bellman-ford');
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await overflow()).toBe(false);
});
```

`e2e/dijkstra.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('edit a weight, run Dijkstra, answer Extract_Min by clicking the graph', async ({ page }) => {
  await page.goto('/#/dijkstra');
  // exact: the pseudocode heading "Dijkstra(G, w, s)" would also match a substring search.
  await expect(page.getByRole('heading', { name: 'Dijkstra', exact: true })).toBeVisible();
  await page.locator('[data-edge="s->v1"] .edge-hit').click();
  await page.getByLabel('Weight w(s, v1)').fill('10');
  await expect(page.locator('[data-edge="s->v1"] .edge-weight')).toHaveText('10');

  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  await expect(page.getByRole('dialog', { name: 'Predict the next step' })).toBeVisible();
  await page.locator('[data-vertex="s"]').dispatchEvent('pointerdown');
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  // s→v1 now costs 10, so v1 is reached through v2: 5 + 4 = 9.
  await expect(page.getByRole('row', { name: /^v1/ })).toContainText('9');
  await expect(page.getByRole('row', { name: /^v1/ })).toContainText('v2');
});

test('Dijkstra page: no horizontal scroll at phone width after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/dijkstra');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run` → PASS (only `Home` text changes below; these tests already pass if Tasks 1–6 are right; any failure is a real bug to fix in the owning file). Run: `npx playwright test` → PASS.

- [ ] **Step 3: Update copy and docs**

`src/ui/Home.tsx`: in the second paragraph, replace `the color of each vertex, the table of values and the queue or call stack.` with `the table of values and the queue, call stack, edge list or set Q.`

`docs/superpowers/specs/2026-09-28-algo-visualizer-design.md`:
- §3: change `` `Initialize Single Source` `` to `` `Initialize_Single_Source` `` and add `` `Extract_Min` ``.
- §6, the Bellman-Ford row, Predict questions column: `does Relax update (first pass, i = 1, only); new \`v.d\` (every update)`.
- Below the edge-type paragraphs, add: `Bellman-Ford asks "does Relax update" only in the first pass: across all |V| − 1 passes the lecture graph makes 91 Relax calls, only 13 of which change anything (staff decision, 2026-09-28).`
- §7, the Bellman-Ford row: `Run; the trace stops at line 7 on the first edge that fails the check, with that edge highlighted`.

`docs/superpowers/plans/plan-1-followups.md`: under "## Plan 3", mark the following as closed with the task commit hashes:
- weights: editor, canvas labels, `moveVertex` and weighted `addEdge` tests;
- the registry direction test (the page needs no forcing, since fixed-direction algorithms have no toggle and the test pins the presets);
- Edit graph clears messages;
- per-class arrow markers.

Then add this section:

```markdown
## Plan 4 (Prim, Kruskal)

- `keyed` DSView is ready for Prim's Q by key (`key: 'key'`); `settled` highlight is ready for vertices out of Q.
- Kruskal needs an "output list"/sorted-array view and a `cycle` highlight (spec §4); neither exists yet.
- Undirected weighted presets: `weightedDigraph` in `src/algorithms/sssp/shared.ts` is directed-only — add an undirected twin.
- Bellman-Ford asks 26 questions per lecture run (13 first-pass yes/no + 13 new v.d); Dijkstra asks 22 (8 Extract_Min + 14 Relax).
```

- [ ] **Step 4: Glyph check in WebKit and Firefox (manual, not committed)**

Run `npx playwright install webkit firefox`, then `npm run build && (npx vite preview --port 4173 &)`. Then run the following from the repo root, so `require` finds the repo's Playwright. `$SCRATCH` is the session scratchpad directory, not the repo:

```bash
SCRATCH=<scratchpad dir> node -e "
const { webkit, firefox } = require('@playwright/test');
(async () => {
  for (const [name, type] of [['webkit', webkit], ['firefox', firefox]]) {
    const b = await type.launch();
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto('http://localhost:4173/#/bellman-ford');
    await p.locator('.pseudocode').screenshot({ path: process.env.SCRATCH + '/glyphs-' + name + '.png' });
    await b.close();
  }
})();"
```

Stop the preview server, then look at both PNGs. The glyphs ∈, ≠, ∅, π, ∞, −, … and ▷ must render in Atkinson Hyperlegible Mono or a clean fallback, not as tofu boxes. Record the result in `plan-1-followups.md`. If a glyph fails, record that too, and do not change fonts in this plan.

- [ ] **Step 5: Run everything and commit**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npx playwright test` → all green.

```bash
git add src/algorithms/registry.test.ts src/App.test.tsx src/ui/Home.tsx e2e/bellman-ford.spec.ts e2e/dijkstra.spec.ts docs/superpowers/specs/2026-09-28-algo-visualizer-design.md docs/superpowers/plans/plan-1-followups.md
git commit -m "test: Bellman-Ford and Dijkstra pages end to end; docs for plan 3"
```
