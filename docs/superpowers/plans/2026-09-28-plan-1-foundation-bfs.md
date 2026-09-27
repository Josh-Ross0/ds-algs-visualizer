# Plan 1: Foundation + BFS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static site where students run BFS step by step on the course's own pseudocode, with an editable preset graph, synchronized panels, predict-mode questions, and automatic deployment to GitHub Pages.

**Architecture:** Pure TypeScript engine (`src/engine/`) defines the graph model and trace format. Each algorithm (`src/algorithms/<id>/`) is a pure function `run(graph, params) → Step[]` that mirrors the slide pseudocode line by line and emits one full snapshot per executed line. React UI (`src/ui/`) renders a snapshot; the player is a pure reducer over the step array. Plans 2–4 add algorithms by adding folders and registry entries.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 5 + Testing Library (jsdom), Playwright, GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-28-algo-visualizer-design.md`

This is plan 1 of 4. Plan 2: DFS, topological sort, SCC. Plan 3: Bellman-Ford, Dijkstra (adds weights to editor/canvas). Plan 4: Prim, Kruskal.

## Global Constraints

- Pseudocode text is verbatim from the lecture slides, with the slides' line numbers (line number = array index + 1).
- Tie-breaking: default order is by vertex label using natural comparison (`s < v1 < v2 < v10`); adjacency lists are always visible and reorderable; the trace uses exactly the displayed order.
- Maximum 10 vertices per graph.
- No backend. `localStorage` only for settings, every access wrapped in try/catch.
- Hash routing (`#/bfs`); Vite `base: './'` so the build works under any GitHub Pages path.
- `src/engine/` and `src/algorithms/*/run.ts` import nothing from React.
- UI language English. Styling: CSS custom properties on `:root` with a dark-mode override; layout works at 375px width.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

```
package.json, tsconfig.json, vite.config.ts, playwright.config.ts, index.html
.github/workflows/ci.yml, .github/workflows/deploy.yml
src/
  main.tsx                 React entry
  App.tsx                  hash routing
  styles.css               tokens, layout
  test-setup.ts            jest-dom matchers
  engine/
    graph.ts               Graph model + pure mutations + adjacency order
    trace.ts               Step/Question/Answer types, formatValue, checkAnswer, treeEdgesFromPi
  algorithms/
    types.ts               AlgorithmDef, Proc, Preset, Params
    registry.ts            ALGORITHMS list
    testing.ts             assertValidTrace (shared by all algorithm tests)
    bfs/
      pseudocode.ts        BFS procs
      questions.ts         BFS question builders + types
      presets.ts           BFS presets
      run.ts               runBfs
      index.ts             bfs: AlgorithmDef
      run.test.ts
  ui/
    settings.ts            Settings load/save + useSettings
    player.ts              pure player reducer
    usePlayer.ts           hook: reducer + play timer
    GraphCanvas.tsx        SVG rendering
    GraphEditor.tsx        edit-mode toolbar + interactions
    PseudocodePanel.tsx
    StatePanel.tsx
    DSPanel.tsx
    AdjacencyPanel.tsx
    PlayerControls.tsx
    QuestionOverlay.tsx    question + feedback
    SettingsPanel.tsx
    Visualizer.tsx         run-mode layout
    AlgorithmPage.tsx      page: presets, params, edit/run switch
    Home.tsx
    *.test.tsx             component tests next to components
e2e/
  bfs.spec.ts
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/test-setup.ts`, `src/App.test.tsx`

**Interfaces:**
- Produces: `npm test` (Vitest, jsdom), `npm run build` (typecheck + Vite build to `dist/`), `npm run dev`.

- [ ] **Step 1: Write config files**

`package.json`:
```json
{
  "name": "ds-algs-visualizer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DS&amp;Algs Visualizer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules
dist
test-results
playwright-report
```

`src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```
Expected: installs without peer-dependency errors. If `npm run build` in Step 6 fails because of TypeScript 7 incompatibilities, run `npm install -D typescript@5` and retry.

- [ ] **Step 3: Write the failing test**

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders site title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'DS&Algs Visualizer' })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./App`.

- [ ] **Step 5: Write minimal implementation**

`src/App.tsx`:
```tsx
export default function App() {
  return <h1>DS&amp;Algs Visualizer</h1>;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/styles.css`:
```css
:root {
  --bg: #ffffff;
  --fg: #1b1f24;
  --muted: #5b6470;
  --panel: #f5f6f8;
  --border: #d5d9df;
  --accent: #2f6fde;
  --accent-soft: #dce8fc;
  --good: #1f8a4c;
  --bad: #c0392b;
  --v-white: #ffffff;
  --v-gray: #a9adb3;
  --v-black: #1b1f24;
  --edge: #8a929c;
  --tree: #2f6fde;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #14171b;
    --fg: #e6e8eb;
    --muted: #9aa3ad;
    --panel: #1d2126;
    --border: #343a42;
    --accent: #6a9cf0;
    --accent-soft: #22324d;
    --edge: #6b737d;
    --tree: #6a9cf0;
    --v-black: #000000;
    color-scheme: dark;
  }
}
:root[data-theme='dark'] {
  --bg: #14171b;
  --fg: #e6e8eb;
  --muted: #9aa3ad;
  --panel: #1d2126;
  --border: #343a42;
  --accent: #6a9cf0;
  --accent-soft: #22324d;
  --edge: #6b737d;
  --tree: #6a9cf0;
  --v-black: #000000;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  line-height: 1.4;
}
#root { max-width: 1280px; margin: 0 auto; padding: 16px; }
```

- [ ] **Step 6: Run tests and build**

Run: `npm test && npm run build`
Expected: 1 test PASS; build writes `dist/index.html`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + Vitest project

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Graph model

**Files:**
- Create: `src/engine/graph.ts`
- Test: `src/engine/graph.test.ts`

**Interfaces:**
- Produces:
  - `MAX_VERTICES = 10`
  - `type Vertex = { id: string; x: number; y: number }` — `id` is also the displayed label
  - `type Edge = { u: string; v: string; w?: number }`
  - `type Graph = { directed: boolean; vertices: Vertex[]; edges: Edge[]; adjOrder: Record<string, string[]> }` — `adjOrder[u]` is an optional user override of adjacency order
  - `compareLabels(a, b): number`, `vertexIds(g): string[]` (sorted by label)
  - `edgeKey(g, u, v): string` — `"u->v"` directed, `"a--b"` undirected with endpoints sorted
  - `hasEdge(g, u, v): boolean`, `adjacency(g, u): string[]`, `canAddVertex(g): boolean`, `nextLabel(g): string`
  - `addVertex(g, x, y): Graph` (throws at cap), `removeVertex(g, id)`, `addEdge(g, u, v, w?)` (no-op on self-loop or duplicate), `removeEdge(g, u, v)`, `moveVertex(g, id, x, y)`, `setDirected(g, directed)`, `moveInAdjacency(g, u, index, delta)`, `resetAdjacency(g)`

- [ ] **Step 1: Write the failing tests**

`src/engine/graph.test.ts`:
```ts
import {
  addEdge, addVertex, adjacency, canAddVertex, compareLabels, edgeKey, hasEdge,
  MAX_VERTICES, moveInAdjacency, nextLabel, removeEdge, removeVertex, resetAdjacency,
  setDirected, vertexIds, type Graph,
} from './graph';

function g(directed: boolean, ids: string[], edges: [string, string][]): Graph {
  return {
    directed,
    vertices: ids.map((id, i) => ({ id, x: i * 10, y: 0 })),
    edges: edges.map(([u, v]) => ({ u, v })),
    adjOrder: {},
  };
}

test('labels compare naturally', () => {
  expect(['v10', 'v2', 's', 'v1'].sort(compareLabels)).toEqual(['s', 'v1', 'v2', 'v10']);
});

test('vertexIds are sorted by label', () => {
  expect(vertexIds(g(false, ['v2', 's', 'v1'], []))).toEqual(['s', 'v1', 'v2']);
});

test('edgeKey is direction-aware', () => {
  expect(edgeKey(g(true, [], []), 'b', 'a')).toBe('b->a');
  expect(edgeKey(g(false, [], []), 'b', 'a')).toBe('a--b');
});

test('undirected adjacency includes both directions, sorted by label', () => {
  const G = g(false, ['a', 'b', 'c'], [['c', 'a'], ['a', 'b']]);
  expect(adjacency(G, 'a')).toEqual(['b', 'c']);
  expect(adjacency(G, 'c')).toEqual(['a']);
});

test('directed adjacency only has out-neighbors', () => {
  const G = g(true, ['a', 'b'], [['a', 'b']]);
  expect(adjacency(G, 'a')).toEqual(['b']);
  expect(adjacency(G, 'b')).toEqual([]);
});

test('custom adjacency order is respected, new neighbors appended', () => {
  let G = g(false, ['a', 'b', 'c', 'd'], [['a', 'b'], ['a', 'c']]);
  G = moveInAdjacency(G, 'a', 1, -1);
  expect(adjacency(G, 'a')).toEqual(['c', 'b']);
  G = addEdge(G, 'a', 'd');
  expect(adjacency(G, 'a')).toEqual(['c', 'b', 'd']);
  expect(adjacency(resetAdjacency(G), 'a')).toEqual(['b', 'c', 'd']);
});

test('moveInAdjacency ignores out-of-range moves', () => {
  const G = g(false, ['a', 'b', 'c'], [['a', 'b'], ['a', 'c']]);
  expect(adjacency(moveInAdjacency(G, 'a', 0, -1), 'a')).toEqual(['b', 'c']);
});

test('addEdge ignores self-loops and duplicates', () => {
  const G = g(false, ['a', 'b'], [['a', 'b']]);
  expect(addEdge(G, 'a', 'a')).toBe(G);
  expect(addEdge(G, 'b', 'a')).toBe(G);
  expect(hasEdge(G, 'b', 'a')).toBe(true);
});

test('removeEdge and removeVertex clean up', () => {
  let G = g(false, ['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  G = moveInAdjacency(G, 'b', 1, -1);
  expect(removeEdge(G, 'b', 'a').edges).toEqual([{ u: 'b', v: 'c' }]);
  G = removeVertex(G, 'c');
  expect(vertexIds(G)).toEqual(['a', 'b']);
  expect(G.edges).toEqual([{ u: 'a', v: 'b' }]);
  expect(G.adjOrder.b).toEqual(['a']);
});

test('nextLabel continues numbered labels, else uses free letters', () => {
  expect(nextLabel(g(false, ['s', 'v1', 'v2', 'v7'], []))).toBe('v8');
  expect(nextLabel(g(false, ['a', 'b', 'd'], []))).toBe('c');
  expect(nextLabel(g(false, [], []))).toBe('a');
});

test('vertex cap', () => {
  const ids = Array.from({ length: MAX_VERTICES }, (_, i) => `v${i + 1}`);
  const full = g(false, ids, []);
  expect(canAddVertex(full)).toBe(false);
  expect(() => addVertex(full, 0, 0)).toThrow();
  expect(vertexIds(addVertex(g(false, ['a'], []), 5, 6))).toEqual(['a', 'b']);
});

test('setDirected to undirected merges opposite edges and resets order', () => {
  let G = g(true, ['a', 'b'], [['a', 'b'], ['b', 'a']]);
  G = moveInAdjacency(G, 'a', 0, 0);
  const U = setDirected(G, false);
  expect(U.edges).toEqual([{ u: 'a', v: 'b' }]);
  expect(U.adjOrder).toEqual({});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/engine/graph.test.ts`
Expected: FAIL — cannot resolve `./graph`.

- [ ] **Step 3: Implement**

`src/engine/graph.ts`:
```ts
export const MAX_VERTICES = 10;

export type Vertex = { id: string; x: number; y: number };
export type Edge = { u: string; v: string; w?: number };
export type Graph = {
  directed: boolean;
  vertices: Vertex[];
  edges: Edge[];
  adjOrder: Record<string, string[]>;
};

export function compareLabels(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

export function vertexIds(g: Graph): string[] {
  return g.vertices.map((v) => v.id).sort(compareLabels);
}

export function edgeKey(g: Graph, u: string, v: string): string {
  if (g.directed) return `${u}->${v}`;
  return compareLabels(u, v) <= 0 ? `${u}--${v}` : `${v}--${u}`;
}

export function hasEdge(g: Graph, u: string, v: string): boolean {
  const key = edgeKey(g, u, v);
  return g.edges.some((e) => edgeKey(g, e.u, e.v) === key);
}

function neighborsByLabel(g: Graph, u: string): string[] {
  const out: string[] = [];
  for (const e of g.edges) {
    if (e.u === u) out.push(e.v);
    else if (!g.directed && e.v === u) out.push(e.u);
  }
  return out.sort(compareLabels);
}

export function adjacency(g: Graph, u: string): string[] {
  const natural = neighborsByLabel(g, u);
  const custom = (g.adjOrder[u] ?? []).filter((x) => natural.includes(x));
  return [...custom, ...natural.filter((x) => !custom.includes(x))];
}

export function canAddVertex(g: Graph): boolean {
  return g.vertices.length < MAX_VERTICES;
}

export function nextLabel(g: Graph): string {
  const ids = g.vertices.map((v) => v.id);
  const counts = new Map<string, number>();
  const max = new Map<string, number>();
  for (const id of ids) {
    const m = /^(\D*)(\d+)$/.exec(id);
    if (!m) continue;
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    max.set(m[1], Math.max(max.get(m[1]) ?? 0, Number(m[2])));
  }
  if (counts.size > 0) {
    const prefix = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return `${prefix}${max.get(prefix)! + 1}`;
  }
  for (const c of 'abcdefghijklmnopqrstuvwxyz') if (!ids.includes(c)) return c;
  throw new Error('No free vertex label');
}

export function addVertex(g: Graph, x: number, y: number): Graph {
  if (!canAddVertex(g)) throw new Error(`At most ${MAX_VERTICES} vertices`);
  return { ...g, vertices: [...g.vertices, { id: nextLabel(g), x, y }] };
}

export function removeVertex(g: Graph, id: string): Graph {
  const adjOrder: Record<string, string[]> = {};
  for (const [u, list] of Object.entries(g.adjOrder)) {
    if (u !== id) adjOrder[u] = list.filter((x) => x !== id);
  }
  return {
    ...g,
    vertices: g.vertices.filter((v) => v.id !== id),
    edges: g.edges.filter((e) => e.u !== id && e.v !== id),
    adjOrder,
  };
}

export function addEdge(g: Graph, u: string, v: string, w?: number): Graph {
  if (u === v || hasEdge(g, u, v)) return g;
  const edge: Edge = w === undefined ? { u, v } : { u, v, w };
  return { ...g, edges: [...g.edges, edge] };
}

export function removeEdge(g: Graph, u: string, v: string): Graph {
  const key = edgeKey(g, u, v);
  return { ...g, edges: g.edges.filter((e) => edgeKey(g, e.u, e.v) !== key) };
}

export function moveVertex(g: Graph, id: string, x: number, y: number): Graph {
  return { ...g, vertices: g.vertices.map((v) => (v.id === id ? { id, x, y } : v)) };
}

export function setDirected(g: Graph, directed: boolean): Graph {
  const next: Graph = { ...g, directed, edges: [], adjOrder: {} };
  for (const e of g.edges) {
    if (!hasEdge(next, e.u, e.v)) next.edges.push(e);
  }
  return next;
}

export function moveInAdjacency(g: Graph, u: string, index: number, delta: number): Graph {
  const list = adjacency(g, u);
  const target = index + delta;
  if (target < 0 || target >= list.length) return g;
  [list[index], list[target]] = [list[target], list[index]];
  return { ...g, adjOrder: { ...g.adjOrder, [u]: list } };
}

export function resetAdjacency(g: Graph): Graph {
  return { ...g, adjOrder: {} };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/engine/graph.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine
git commit -m "feat(engine): graph model with label-ordered adjacency

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Trace types and helpers

**Files:**
- Create: `src/engine/trace.ts`
- Test: `src/engine/trace.test.ts`

**Interfaces:**
- Consumes: `Graph`, `edgeKey` from `graph.ts`.
- Produces:
  - `type Value = string | number | null | undefined` — `undefined` = not yet assigned, `null` = NIL
  - `type VertexState = Record<string, Record<string, Value>>` — per-vertex attributes; parent attribute key is `'pi'`
  - `type DSView = { kind: 'queue'; name: string; items: string[] }` (plans 2–4 extend this union)
  - `type Answer = { kind: 'vertex'; value: string } | { kind: 'number'; value: number } | { kind: 'yesno'; value: boolean }`
  - `type Question = { type: string; prompt: string; answer: Answer; explain: string }`
  - `type Highlight = { vertices?: string[]; edges?: string[]; treeEdges?: string[] }`
  - `type Step = { proc: string; line: number; bigStep: boolean; vertexState: VertexState; vars: Record<string, Value>; ds: DSView[]; highlight: Highlight; note?: string; question?: Question }`
  - `formatValue(v: Value): string`, `formatAnswer(a: Answer): string`, `checkAnswer(q: Question, given: Answer): boolean`, `treeEdgesFromPi(g: Graph, st: VertexState): string[]`

A question on step `i` is asked **before** step `i` is displayed, so its prompt is written against the state of step `i − 1`.

- [ ] **Step 1: Write the failing tests**

`src/engine/trace.test.ts`:
```ts
import type { Graph } from './graph';
import { checkAnswer, formatAnswer, formatValue, treeEdgesFromPi, type Question } from './trace';

test('formatValue', () => {
  expect(formatValue(undefined)).toBe('');
  expect(formatValue(null)).toBe('NIL');
  expect(formatValue(Infinity)).toBe('∞');
  expect(formatValue(3)).toBe('3');
  expect(formatValue('gray')).toBe('gray');
});

test('formatAnswer', () => {
  expect(formatAnswer({ kind: 'vertex', value: 'v1' })).toBe('v1');
  expect(formatAnswer({ kind: 'number', value: Infinity })).toBe('∞');
  expect(formatAnswer({ kind: 'yesno', value: true })).toBe('yes');
});

test('checkAnswer compares kind and value', () => {
  const q: Question = { type: 't', prompt: 'p', answer: { kind: 'number', value: 2 }, explain: 'e' };
  expect(checkAnswer(q, { kind: 'number', value: 2 })).toBe(true);
  expect(checkAnswer(q, { kind: 'number', value: 3 })).toBe(false);
  expect(checkAnswer(q, { kind: 'vertex', value: '2' })).toBe(false);
});

test('treeEdgesFromPi', () => {
  const g: Graph = {
    directed: false,
    vertices: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }, { id: 'c', x: 0, y: 0 }],
    edges: [{ u: 'a', v: 'b' }, { u: 'b', v: 'c' }],
    adjOrder: {},
  };
  expect(treeEdgesFromPi(g, { a: { pi: null }, b: { pi: 'a' }, c: {} })).toEqual(['a--b']);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/engine/trace.test.ts`
Expected: FAIL — cannot resolve `./trace`.

- [ ] **Step 3: Implement**

`src/engine/trace.ts`:
```ts
import { edgeKey, type Graph } from './graph';

export type Value = string | number | null | undefined;
export type VertexState = Record<string, Record<string, Value>>;
export type DSView = { kind: 'queue'; name: string; items: string[] };
export type Answer =
  | { kind: 'vertex'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'yesno'; value: boolean };
export type Question = { type: string; prompt: string; answer: Answer; explain: string };
export type Highlight = { vertices?: string[]; edges?: string[]; treeEdges?: string[] };
export type Step = {
  proc: string;
  line: number;
  bigStep: boolean;
  vertexState: VertexState;
  vars: Record<string, Value>;
  ds: DSView[];
  highlight: Highlight;
  note?: string;
  question?: Question;
};

export function formatValue(v: Value): string {
  if (v === undefined) return '';
  if (v === null) return 'NIL';
  if (v === Infinity) return '∞';
  return String(v);
}

export function formatAnswer(a: Answer): string {
  if (a.kind === 'yesno') return a.value ? 'yes' : 'no';
  return formatValue(a.value);
}

export function checkAnswer(q: Question, given: Answer): boolean {
  return q.answer.kind === given.kind && q.answer.value === given.value;
}

export function treeEdgesFromPi(g: Graph, st: VertexState): string[] {
  const out: string[] = [];
  for (const [v, attrs] of Object.entries(st)) {
    const p = attrs.pi;
    if (typeof p === 'string') out.push(edgeKey(g, p, v));
  }
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/engine/trace.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine
git commit -m "feat(engine): trace step, question and answer types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Algorithm definition types and trace validator

**Files:**
- Create: `src/algorithms/types.ts`, `src/algorithms/testing.ts`
- Test: `src/algorithms/testing.test.ts`

**Interfaces:**
- Consumes: `Graph`, `Step`.
- Produces:
  - `type Proc = { name: string; signature: string; lines: string[] }` — line `n` is `lines[n - 1]`; indentation is leading spaces (4 per level)
  - `type Params = Record<string, string>` — vertex-valued parameters, e.g. `{ s: 'v1' }`
  - `type ParamSpec = { name: string; label: string }`
  - `type Preset = { name: string; graph: Graph; params: Params }`
  - `type Validation = { errors: string[]; warnings: string[] }`
  - `type AlgorithmDef = { id; title; directed: boolean | 'toggle'; weighted: boolean; procs: Proc[]; params: ParamSpec[]; stateColumns: { key: string; label: string }[]; questionTypes: { type: string; label: string }[]; presets: Preset[]; validate(g, p): Validation; run(g, p): Step[] }`
  - `assertValidTrace(def: AlgorithmDef, steps: Step[]): void` — throws if any step's `(proc, line)` is not in `def.procs`, or if there are no steps

- [ ] **Step 1: Write the failing test**

`src/algorithms/testing.test.ts`:
```ts
import type { Step } from '../engine/trace';
import { assertValidTrace } from './testing';
import type { AlgorithmDef } from './types';

const def = {
  procs: [{ name: 'P', signature: 'P(G)', lines: ['a', 'b'] }],
} as unknown as AlgorithmDef;

const step = (proc: string, line: number): Step => ({
  proc, line, bigStep: false, vertexState: {}, vars: {}, ds: [], highlight: {},
});

test('accepts steps on existing lines', () => {
  expect(() => assertValidTrace(def, [step('P', 1), step('P', 2)])).not.toThrow();
});

test('rejects unknown proc, bad line, empty trace', () => {
  expect(() => assertValidTrace(def, [step('Q', 1)])).toThrow(/Q/);
  expect(() => assertValidTrace(def, [step('P', 3)])).toThrow(/line 3/);
  expect(() => assertValidTrace(def, [])).toThrow(/empty/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/algorithms/testing.test.ts`
Expected: FAIL — cannot resolve `./testing`.

- [ ] **Step 3: Implement**

`src/algorithms/types.ts`:
```ts
import type { Graph } from '../engine/graph';
import type { Step } from '../engine/trace';

export type Proc = { name: string; signature: string; lines: string[] };
export type Params = Record<string, string>;
export type ParamSpec = { name: string; label: string };
export type Preset = { name: string; graph: Graph; params: Params };
export type Validation = { errors: string[]; warnings: string[] };

export type AlgorithmDef = {
  id: string;
  title: string;
  directed: boolean | 'toggle';
  weighted: boolean;
  procs: Proc[];
  params: ParamSpec[];
  stateColumns: { key: string; label: string }[];
  questionTypes: { type: string; label: string }[];
  presets: Preset[];
  validate(g: Graph, p: Params): Validation;
  run(g: Graph, p: Params): Step[];
};
```

`src/algorithms/testing.ts`:
```ts
import type { Step } from '../engine/trace';
import type { AlgorithmDef } from './types';

export function assertValidTrace(def: AlgorithmDef, steps: Step[]): void {
  if (steps.length === 0) throw new Error('Trace is empty');
  steps.forEach((s, i) => {
    const proc = def.procs.find((p) => p.name === s.proc);
    if (!proc) throw new Error(`Step ${i}: unknown proc ${s.proc}`);
    if (s.line < 1 || s.line > proc.lines.length) {
      throw new Error(`Step ${i}: ${s.proc} has no line ${s.line}`);
    }
  });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/algorithms/testing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/algorithms
git commit -m "feat(algorithms): AlgorithmDef contract and trace validator

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: BFS algorithm (pseudocode, presets, questions, run)

**Files:**
- Create: `src/algorithms/bfs/pseudocode.ts`, `src/algorithms/bfs/questions.ts`, `src/algorithms/bfs/presets.ts`, `src/algorithms/bfs/run.ts`, `src/algorithms/bfs/index.ts`, `src/algorithms/registry.ts`
- Test: `src/algorithms/bfs/run.test.ts`

**Interfaces:**
- Consumes: `adjacency`, `edgeKey`, `vertexIds`, `Graph` (Task 2); `Step`, `Value`, `VertexState`, `Question`, `treeEdgesFromPi` (Task 3); `AlgorithmDef`, `Params`, `assertValidTrace` (Task 4).
- Produces: `bfs: AlgorithmDef` (id `'bfs'`), `runBfs(g, params)`, `ALGORITHMS: AlgorithmDef[]` in `registry.ts`.

Source of truth for pseudocode: `Lectures/bfs.pdf` slide 4 (identical in `Tutorials/Tutorial 4 - BFS.pdf` slide 6). Source of truth for the lecture preset: `Lectures/bfs.pdf` slide 5.

Step semantics: each emitted step shows the state **after** executing that line. Loop header lines (`for all`, `while`) emit once per evaluation; the final failing `while` check is emitted with a note; exhausted `for all` loops emit nothing extra. Main-loop iterations start at line 3 (`Dequeue`), which is the `bigStep`.

Hand-verified expected results on the lecture preset, source `s`, label order:
- Dequeue order: `s, v1, v2, v3, v4, v5, v6, v7`
- `d`: s 0, v1 1, v2 1, v3 2, v4 2, v5 2, v6 3, v7 3
- `π`: s NIL, v1 s, v2 s, v3 v1, v4 v1, v5 v2, v6 v4, v7 v5

With `Adj[s]` reordered to `v2, v1`: v2 dequeued before v1, so `v3.π = v2` and `v5.π = v2`, `v4.π = v1`.

- [ ] **Step 1: Write the failing tests**

`src/algorithms/bfs/run.test.ts`:
```ts
import { moveInAdjacency } from '../../engine/graph';
import type { Step } from '../../engine/trace';
import { assertValidTrace } from '../testing';
import { bfs } from './index';
import { runBfs } from './run';

const lecture = bfs.presets[0];
const directed = bfs.presets[1];

const final = (steps: Step[]) => steps[steps.length - 1].vertexState;
const dequeued = (steps: Step[]) =>
  steps.filter((s) => s.proc === 'BFS' && s.line === 3).map((s) => s.vars.u);

test('lecture example: d, π and dequeue order', () => {
  const steps = runBfs(lecture.graph, lecture.params);
  assertValidTrace(bfs, steps);
  const st = final(steps);
  const d = Object.fromEntries(Object.entries(st).map(([v, a]) => [v, a.d]));
  const pi = Object.fromEntries(Object.entries(st).map(([v, a]) => [v, a.pi]));
  expect(d).toEqual({ s: 0, v1: 1, v2: 1, v3: 2, v4: 2, v5: 2, v6: 3, v7: 3 });
  expect(pi).toEqual({ s: null, v1: 's', v2: 's', v3: 'v1', v4: 'v1', v5: 'v2', v6: 'v4', v7: 'v5' });
  expect(dequeued(steps)).toEqual(['s', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7']);
  expect(Object.values(st).every((a) => a.color === 'black')).toBe(true);
});

test('big steps are exactly the Dequeue lines', () => {
  const steps = runBfs(lecture.graph, lecture.params);
  const big = steps.filter((s) => s.bigStep);
  expect(big.length).toBe(8);
  expect(big.every((s) => s.proc === 'BFS' && s.line === 3)).toBe(true);
});

test('trace ends on the failing while check', () => {
  const steps = runBfs(lecture.graph, lecture.params);
  const last = steps[steps.length - 1];
  expect([last.proc, last.line]).toEqual(['BFS', 2]);
  expect(last.ds[0].items).toEqual([]);
  expect(last.note).toMatch(/Q = ∅/);
});

test('reordering Adj[s] changes the BFS tree', () => {
  const g = moveInAdjacency(lecture.graph, 's', 1, -1);
  const st = final(runBfs(g, { s: 's' }));
  expect(st.v3.pi).toBe('v2');
  expect(st.v5.pi).toBe('v2');
  expect(st.v4.pi).toBe('v1');
});

test('unreachable vertex keeps d = ∞ and π = NIL', () => {
  const st = final(runBfs(directed.graph, directed.params));
  expect(st.e).toEqual({ color: 'white', d: Infinity, pi: null });
  expect(st.d).toEqual({ color: 'black', d: 2, pi: 'b' });
});

test('questions: one per dequeue, one per discovered vertex', () => {
  const steps = runBfs(lecture.graph, lecture.params);
  const qs = steps.flatMap((s) => (s.question ? [s] : []));
  const deq = qs.filter((s) => s.question!.type === 'bfs.dequeue');
  const dist = qs.filter((s) => s.question!.type === 'bfs.distance');
  expect(deq.length).toBe(8);
  expect(dist.length).toBe(7);
  expect(deq[1].question!.answer).toEqual({ kind: 'vertex', value: 'v1' });
  expect(dist.every((s) => s.line === 7)).toBe(true);
  const v6 = dist.find((s) => s.vars.v === 'v6')!;
  expect(v6.question!.answer).toEqual({ kind: 'number', value: 3 });
});

test('tree edges follow π', () => {
  const steps = runBfs(lecture.graph, lecture.params);
  expect(steps[steps.length - 1].highlight.treeEdges!.sort()).toEqual(
    ['s--v1', 's--v2', 'v1--v3', 'v1--v4', 'v2--v5', 'v4--v6', 'v5--v7'].sort(),
  );
});

test('validate requires an existing source', () => {
  expect(bfs.validate(lecture.graph, {}).errors).toEqual(['Choose a source vertex s.']);
  expect(bfs.validate(lecture.graph, { s: 'zz' }).errors).toEqual(['Choose a source vertex s.']);
  expect(bfs.validate(lecture.graph, { s: 's' }).errors).toEqual([]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/algorithms/bfs`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Write pseudocode (verbatim from slides)**

`src/algorithms/bfs/pseudocode.ts`:
```ts
import type { Proc } from '../types';

export const BFS_MAIN = 'BFS';
export const BFS_INIT = 'BFS Initialization';

export const bfsProcs: Proc[] = [
  {
    name: BFS_MAIN,
    signature: 'BFS(G, s)',
    lines: [
      'BFS Initialization(G, s, Q)',
      'while Q ≠ ∅ do',
      '    u = Dequeue(Q)',
      '    for all v ∈ G.Adj[u] do',
      '        if v.color == white then',
      '            v.color = gray',
      '            v.d = u.d + 1',
      '            v.π = u',
      '            Enqueue(Q, v)',
      '    u.color = black',
    ],
  },
  {
    name: BFS_INIT,
    signature: 'BFS Initialization(G, s, Q)',
    lines: [
      'for all v ∈ G.V − {s} do',
      '    v.color = white',
      '    v.d = ∞',
      '    v.π = NIL',
      's.color = gray',
      's.d = 0',
      's.π = NIL',
      'Q = ∅',
      'Enqueue(Q, s)',
    ],
  },
];
```

- [ ] **Step 4: Write questions**

`src/algorithms/bfs/questions.ts`:
```ts
import type { Question } from '../../engine/trace';

export const bfsQuestionTypes = [
  { type: 'bfs.dequeue', label: 'Which vertex Dequeue returns' },
  { type: 'bfs.distance', label: 'New value of v.d' },
];

export function dequeueQuestion(u: string): Question {
  return {
    type: 'bfs.dequeue',
    prompt: 'Line 3: which vertex does Dequeue(Q) return?',
    answer: { kind: 'vertex', value: u },
    explain: `Q is a FIFO queue, so Dequeue returns its head: ${u}.`,
  };
}

export function distanceQuestion(u: string, v: string, ud: number): Question {
  return {
    type: 'bfs.distance',
    prompt: `Line 7: what value is assigned to ${v}.d?`,
    answer: { kind: 'number', value: ud + 1 },
    explain: `${v}.d = ${u}.d + 1 = ${ud} + 1 = ${ud + 1}.`,
  };
}
```

- [ ] **Step 5: Write presets**

Coordinates use the canvas viewBox `0 0 600 420`.

`src/algorithms/bfs/presets.ts`:
```ts
import type { Graph } from '../../engine/graph';
import type { Preset } from '../types';

function undirected(vertices: Graph['vertices'], pairs: [string, string][]): Graph {
  return { directed: false, vertices, edges: pairs.map(([u, v]) => ({ u, v })), adjOrder: {} };
}

function directed(vertices: Graph['vertices'], pairs: [string, string][]): Graph {
  return { directed: true, vertices, edges: pairs.map(([u, v]) => ({ u, v })), adjOrder: {} };
}

export const bfsPresets: Preset[] = [
  {
    name: 'Lecture example (BFS slide 5)',
    params: { s: 's' },
    graph: undirected(
      [
        { id: 's', x: 60, y: 190 },
        { id: 'v1', x: 155, y: 320 },
        { id: 'v2', x: 195, y: 150 },
        { id: 'v3', x: 280, y: 235 },
        { id: 'v4', x: 320, y: 360 },
        { id: 'v5', x: 365, y: 105 },
        { id: 'v6', x: 450, y: 275 },
        { id: 'v7', x: 535, y: 150 },
      ],
      [
        ['s', 'v1'], ['s', 'v2'], ['v1', 'v2'], ['v1', 'v3'], ['v1', 'v4'], ['v2', 'v3'],
        ['v2', 'v5'], ['v4', 'v5'], ['v4', 'v6'], ['v5', 'v6'], ['v5', 'v7'], ['v6', 'v7'],
      ],
    ),
  },
  {
    name: 'Directed, with an unreachable vertex',
    params: { s: 'a' },
    graph: directed(
      [
        { id: 'a', x: 120, y: 200 },
        { id: 'b', x: 280, y: 100 },
        { id: 'c', x: 280, y: 300 },
        { id: 'd', x: 440, y: 200 },
        { id: 'e', x: 120, y: 360 },
      ],
      [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['e', 'a']],
    ),
  },
];
```

- [ ] **Step 6: Write run**

`src/algorithms/bfs/run.ts`:
```ts
import { adjacency, edgeKey, vertexIds, type Graph } from '../../engine/graph';
import {
  treeEdgesFromPi, type Question, type Step, type Value, type VertexState,
} from '../../engine/trace';
import type { Params } from '../types';
import { BFS_INIT, BFS_MAIN } from './pseudocode';
import { dequeueQuestion, distanceQuestion } from './questions';

type EmitOptions = {
  bigStep?: boolean;
  vertices?: string[];
  edges?: string[];
  note?: string;
  question?: Question;
};

export function runBfs(g: Graph, params: Params): Step[] {
  const s = params.s;
  const V = vertexIds(g);
  const steps: Step[] = [];
  const st: VertexState = {};
  for (const v of V) st[v] = {};
  const Q: string[] = [];
  let vars: Record<string, Value> = { s };

  const emit = (proc: string, line: number, o: EmitOptions = {}) => {
    steps.push(structuredClone({
      proc,
      line,
      bigStep: o.bigStep ?? false,
      vertexState: st,
      vars,
      ds: [{ kind: 'queue' as const, name: 'Q', items: Q }],
      highlight: { vertices: o.vertices, edges: o.edges, treeEdges: treeEdgesFromPi(g, st) },
      note: o.note,
      question: o.question,
    }));
  };

  // BFS line 1 → BFS Initialization
  emit(BFS_MAIN, 1, { vertices: [s] });
  for (const v of V.filter((x) => x !== s)) {
    vars = { s, v };
    emit(BFS_INIT, 1, { vertices: [v] });
    st[v].color = 'white';
    emit(BFS_INIT, 2, { vertices: [v] });
    st[v].d = Infinity;
    emit(BFS_INIT, 3, { vertices: [v] });
    st[v].pi = null;
    emit(BFS_INIT, 4, { vertices: [v] });
  }
  vars = { s };
  st[s].color = 'gray';
  emit(BFS_INIT, 5, { vertices: [s] });
  st[s].d = 0;
  emit(BFS_INIT, 6, { vertices: [s] });
  st[s].pi = null;
  emit(BFS_INIT, 7, { vertices: [s] });
  emit(BFS_INIT, 8);
  Q.push(s);
  emit(BFS_INIT, 9, { vertices: [s] });

  for (;;) {
    vars = { s };
    if (Q.length === 0) {
      emit(BFS_MAIN, 2, { note: 'Q = ∅, so the loop ends.' });
      break;
    }
    emit(BFS_MAIN, 2);
    const u = Q.shift()!;
    vars = { s, u };
    emit(BFS_MAIN, 3, { bigStep: true, vertices: [u], question: dequeueQuestion(u) });
    for (const v of adjacency(g, u)) {
      vars = { s, u, v };
      const hl = { vertices: [u, v], edges: [edgeKey(g, u, v)] };
      emit(BFS_MAIN, 4, hl);
      emit(BFS_MAIN, 5, { ...hl, note: `${v}.color is ${st[v].color}.` });
      if (st[v].color !== 'white') continue;
      st[v].color = 'gray';
      emit(BFS_MAIN, 6, hl);
      const ud = st[u].d as number;
      st[v].d = ud + 1;
      emit(BFS_MAIN, 7, { ...hl, question: distanceQuestion(u, v, ud) });
      st[v].pi = u;
      emit(BFS_MAIN, 8, hl);
      Q.push(v);
      emit(BFS_MAIN, 9, hl);
    }
    vars = { s, u };
    st[u].color = 'black';
    emit(BFS_MAIN, 10, { vertices: [u] });
  }
  return steps;
}
```

- [ ] **Step 7: Write the definition and registry**

`src/algorithms/bfs/index.ts`:
```ts
import type { AlgorithmDef } from '../types';
import { bfsPresets } from './presets';
import { bfsProcs } from './pseudocode';
import { bfsQuestionTypes } from './questions';
import { runBfs } from './run';

export const bfs: AlgorithmDef = {
  id: 'bfs',
  title: 'Breadth-First Search (BFS)',
  directed: 'toggle',
  weighted: false,
  procs: bfsProcs,
  params: [{ name: 's', label: 'Source s' }],
  stateColumns: [
    { key: 'color', label: 'color' },
    { key: 'd', label: 'd' },
    { key: 'pi', label: 'π' },
  ],
  questionTypes: bfsQuestionTypes,
  presets: bfsPresets,
  validate(g, p) {
    const ok = p.s !== undefined && g.vertices.some((v) => v.id === p.s);
    return { errors: ok ? [] : ['Choose a source vertex s.'], warnings: [] };
  },
  run: runBfs,
};
```

`src/algorithms/registry.ts`:
```ts
import { bfs } from './bfs';
import type { AlgorithmDef } from './types';

export const ALGORITHMS: AlgorithmDef[] = [bfs];
```

- [ ] **Step 8: Run to verify pass**

Run: `npm test -- src/algorithms`
Expected: all PASS. If the lecture-example test fails, re-check the edge list against `Lectures/bfs.pdf` slide 5 before touching `run.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/algorithms
git commit -m "feat(bfs): BFS trace, presets and predict questions from lecture pseudocode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Settings and player reducer

**Files:**
- Create: `src/ui/settings.ts`, `src/ui/player.ts`, `src/ui/usePlayer.ts`
- Test: `src/ui/settings.test.ts`, `src/ui/player.test.ts`

**Interfaces:**
- Consumes: `Step`, `Question`, `Answer`, `checkAnswer`.
- Produces:
  - `type Settings = { predict: boolean; disabledTypes: string[]; speedMs: number }`, `DEFAULT_SETTINGS`, `loadSettings(storage?)`, `saveSettings(s, storage?)`, `useSettings(): [Settings, (s: Settings) => void]`, `isAsked(settings, q): boolean`
  - `type Outcome = 'correct' | 'wrong' | 'skipped'`
  - `type PlayerState = { index: number; playing: boolean; pending: number | null; outcomes: Record<number, Outcome>; feedback: { correct: boolean; question: Question } | null }`
  - `type PlayerAction = { type: 'next' | 'prev' | 'bigNext' | 'bigPrev' | 'play' | 'pause' | 'tick' | 'skip' } | { type: 'seek'; index: number } | { type: 'answer'; answer: Answer }`
  - `initialPlayerState(): PlayerState`, `createPlayerReducer(steps, asked: (q: Question) => boolean)`, `score(state): { correct: number; answered: number }`
  - `usePlayer(steps, settings): { state: PlayerState; dispatch: (a: PlayerAction) => void }`

Player rules:
- A question on step `i` is asked when moving forward into `i` (by `next`, `tick` or `bigNext`) if predict mode asks that type and step `i` has no recorded outcome. The move is held as `pending = i`; `index` stays put.
- While `pending` is set, only `answer`, `skip`, `play`, `pause` do anything.
- `answer` records correct/wrong, moves to `pending`, sets `feedback`. A wrong answer pauses playback so the explanation can be read.
- `skip` records `skipped`, moves to `pending`, no feedback.
- `bigNext` stops at the next `bigStep` or the next step with an unanswered, asked question, whichever comes first; at the end it goes to the last step.
- `bigPrev` goes to the previous `bigStep`, or step 0.
- `seek` jumps without asking questions. `prev` never asks.
- `tick` at the last step stops playback.

- [ ] **Step 1: Write the failing tests**

`src/ui/settings.test.ts`:
```ts
import { DEFAULT_SETTINGS, isAsked, loadSettings, saveSettings } from './settings';

function memory() {
  const data: Record<string, string> = {};
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
  };
}

test('round-trips settings', () => {
  const m = memory();
  saveSettings({ predict: false, disabledTypes: ['x'], speedMs: 300 }, m);
  expect(loadSettings(m)).toEqual({ predict: false, disabledTypes: ['x'], speedMs: 300 });
});

test('falls back to defaults on missing, corrupt or throwing storage', () => {
  expect(loadSettings(memory())).toEqual(DEFAULT_SETTINGS);
  const bad = memory();
  bad.setItem('dsalgs.settings.v1', '{not json');
  expect(loadSettings(bad)).toEqual(DEFAULT_SETTINGS);
  const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
  expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow();
});

test('isAsked respects predict switch and disabled types', () => {
  const q = { type: 'bfs.dequeue', prompt: '', explain: '', answer: { kind: 'vertex' as const, value: 'a' } };
  expect(isAsked(DEFAULT_SETTINGS, q)).toBe(true);
  expect(isAsked({ ...DEFAULT_SETTINGS, predict: false }, q)).toBe(false);
  expect(isAsked({ ...DEFAULT_SETTINGS, disabledTypes: ['bfs.dequeue'] }, q)).toBe(false);
});
```

`src/ui/player.test.ts`:
```ts
import type { Question, Step } from '../engine/trace';
import { createPlayerReducer, initialPlayerState, score, type PlayerAction, type PlayerState } from './player';

const q: Question = { type: 't', prompt: 'p', explain: 'e', answer: { kind: 'vertex', value: 'a' } };
const mk = (bigStep = false, question?: Question): Step => ({
  proc: 'P', line: 1, bigStep, vertexState: {}, vars: {}, ds: [], highlight: {}, question,
});
// indices:        0      1          2        3           4
const steps = [mk(), mk(true), mk(false, q), mk(true), mk()];

function run(actions: PlayerAction[], asked = true): PlayerState {
  const r = createPlayerReducer(steps, () => asked);
  return actions.reduce(r, initialPlayerState());
}

test('next and prev move one step and clamp', () => {
  expect(run([{ type: 'next' }]).index).toBe(1);
  expect(run([{ type: 'prev' }]).index).toBe(0);
});

test('moving into a question step holds it as pending', () => {
  const s = run([{ type: 'next' }, { type: 'next' }]);
  expect(s.index).toBe(1);
  expect(s.pending).toBe(2);
  expect(run([{ type: 'next' }, { type: 'next' }, { type: 'next' }]).index).toBe(1);
});

test('correct answer advances with feedback', () => {
  const s = run([{ type: 'next' }, { type: 'next' }, { type: 'answer', answer: { kind: 'vertex', value: 'a' } }]);
  expect(s.index).toBe(2);
  expect(s.pending).toBeNull();
  expect(s.feedback?.correct).toBe(true);
  expect(score(s)).toEqual({ correct: 1, answered: 1 });
});

test('wrong answer advances and pauses', () => {
  const s = run([
    { type: 'play' }, { type: 'tick' }, { type: 'tick' },
    { type: 'answer', answer: { kind: 'vertex', value: 'b' } },
  ]);
  expect(s.index).toBe(2);
  expect(s.playing).toBe(false);
  expect(s.feedback?.correct).toBe(false);
  expect(score(s)).toEqual({ correct: 0, answered: 1 });
});

test('skip advances without feedback and is not re-asked', () => {
  const s = run([{ type: 'next' }, { type: 'next' }, { type: 'skip' }, { type: 'prev' }, { type: 'next' }]);
  expect(s.index).toBe(2);
  expect(s.pending).toBeNull();
  expect(s.outcomes[2]).toBe('skipped');
});

test('questions not asked when disabled', () => {
  expect(run([{ type: 'next' }, { type: 'next' }], false).index).toBe(2);
});

test('bigNext stops at question steps, then big steps, then the end', () => {
  expect(run([{ type: 'bigNext' }]).index).toBe(1);
  expect(run([{ type: 'bigNext' }, { type: 'bigNext' }]).pending).toBe(2);
  expect(run([{ type: 'bigNext' }, { type: 'bigNext' }], false).index).toBe(3);
  expect(run([{ type: 'seek', index: 3 }, { type: 'bigNext' }]).index).toBe(4);
});

test('bigPrev goes to previous big step or start', () => {
  expect(run([{ type: 'seek', index: 4 }, { type: 'bigPrev' }]).index).toBe(3);
  expect(run([{ type: 'seek', index: 3 }, { type: 'bigPrev' }]).index).toBe(1);
  expect(run([{ type: 'seek', index: 1 }, { type: 'bigPrev' }]).index).toBe(0);
});

test('seek clamps and does not ask', () => {
  expect(run([{ type: 'seek', index: 99 }]).index).toBe(4);
  expect(run([{ type: 'seek', index: 2 }]).pending).toBeNull();
});

test('tick at the end stops playback', () => {
  const s = run([{ type: 'seek', index: 4 }, { type: 'play' }, { type: 'tick' }]);
  expect(s.playing).toBe(false);
  expect(s.index).toBe(4);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/ui`
Expected: FAIL — cannot resolve `./settings` / `./player`.

- [ ] **Step 3: Implement settings**

`src/ui/settings.ts`:
```ts
import { useState } from 'react';
import type { Question } from '../engine/trace';

export type Settings = { predict: boolean; disabledTypes: string[]; speedMs: number };
type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };

export const DEFAULT_SETTINGS: Settings = { predict: true, disabledTypes: [], speedMs: 600 };
const KEY = 'dsalgs.settings.v1';

function browserStorage(): KV | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadSettings(storage: KV | undefined = browserStorage()): Settings {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings, storage: KV | undefined = browserStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: settings last for this page view only.
  }
}

export function isAsked(s: Settings, q: Question): boolean {
  return s.predict && !s.disabledTypes.includes(q.type);
}

export function useSettings(): [Settings, (s: Settings) => void] {
  const [settings, setSettings] = useState(() => loadSettings());
  const update = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };
  return [settings, update];
}
```

- [ ] **Step 4: Implement player reducer**

`src/ui/player.ts`:
```ts
import { checkAnswer, type Answer, type Question, type Step } from '../engine/trace';

export type Outcome = 'correct' | 'wrong' | 'skipped';
export type PlayerState = {
  index: number;
  playing: boolean;
  pending: number | null;
  outcomes: Record<number, Outcome>;
  feedback: { correct: boolean; question: Question } | null;
};
export type PlayerAction =
  | { type: 'next' | 'prev' | 'bigNext' | 'bigPrev' | 'play' | 'pause' | 'tick' | 'skip' }
  | { type: 'seek'; index: number }
  | { type: 'answer'; answer: Answer };

export function initialPlayerState(): PlayerState {
  return { index: 0, playing: false, pending: null, outcomes: {}, feedback: null };
}

export function score(s: PlayerState): { correct: number; answered: number } {
  const all = Object.values(s.outcomes);
  return {
    correct: all.filter((o) => o === 'correct').length,
    answered: all.filter((o) => o !== 'skipped').length,
  };
}

export function createPlayerReducer(steps: Step[], asked: (q: Question) => boolean) {
  const last = steps.length - 1;
  const needsAsk = (s: PlayerState, i: number) => {
    const q = steps[i].question;
    return q !== undefined && asked(q) && s.outcomes[i] === undefined;
  };
  const moveTo = (s: PlayerState, i: number): PlayerState => ({ ...s, index: i, feedback: null });
  const forwardTo = (s: PlayerState, i: number): PlayerState =>
    needsAsk(s, i) ? { ...s, pending: i } : moveTo(s, i);

  return function reducer(s: PlayerState, a: PlayerAction): PlayerState {
    if (s.pending !== null && !['answer', 'skip', 'play', 'pause'].includes(a.type)) return s;
    switch (a.type) {
      case 'next':
      case 'tick':
        if (s.index >= last) return { ...s, playing: false };
        return forwardTo(s, s.index + 1);
      case 'prev':
        return moveTo(s, Math.max(0, s.index - 1));
      case 'bigNext': {
        if (s.index >= last) return s;
        let i = s.index + 1;
        while (i < last && !steps[i].bigStep && !needsAsk(s, i)) i++;
        return forwardTo(s, i);
      }
      case 'bigPrev': {
        let i = s.index - 1;
        while (i > 0 && !steps[i].bigStep) i--;
        return moveTo(s, Math.max(0, i));
      }
      case 'seek':
        return moveTo(s, Math.min(last, Math.max(0, a.index)));
      case 'play':
        return { ...s, playing: true };
      case 'pause':
        return { ...s, playing: false };
      case 'answer': {
        if (s.pending === null) return s;
        const question = steps[s.pending].question!;
        const correct = checkAnswer(question, a.answer);
        return {
          ...s,
          index: s.pending,
          pending: null,
          playing: correct && s.playing,
          outcomes: { ...s.outcomes, [s.pending]: correct ? 'correct' : 'wrong' },
          feedback: { correct, question },
        };
      }
      case 'skip':
        if (s.pending === null) return s;
        return {
          ...s,
          index: s.pending,
          pending: null,
          outcomes: { ...s.outcomes, [s.pending]: 'skipped' },
          feedback: null,
        };
    }
  };
}
```

- [ ] **Step 5: Implement the hook**

`src/ui/usePlayer.ts`:
```ts
import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { Question, Step } from '../engine/trace';
import { createPlayerReducer, initialPlayerState } from './player';
import { isAsked, type Settings } from './settings';

export function usePlayer(steps: Step[], settings: Settings) {
  const asked = useCallback((q: Question) => isAsked(settings, q), [settings]);
  const reducer = useMemo(() => createPlayerReducer(steps, asked), [steps, asked]);
  const [state, dispatch] = useReducer(reducer, undefined, initialPlayerState);

  useEffect(() => {
    if (!state.playing) return;
    const id = setInterval(() => dispatch({ type: 'tick' }), settings.speedMs);
    return () => clearInterval(id);
  }, [state.playing, settings.speedMs]);

  // If predict mode is switched off while a question is open, drop the question.
  useEffect(() => {
    if (state.pending !== null && !asked(steps[state.pending].question!)) dispatch({ type: 'skip' });
  }, [state.pending, asked, steps]);

  return { state, dispatch };
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npm test -- src/ui`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ui
git commit -m "feat(ui): settings persistence and predict-aware player reducer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Graph canvas

**Files:**
- Create: `src/ui/GraphCanvas.tsx`
- Modify: `src/styles.css` (append canvas styles)
- Test: `src/ui/GraphCanvas.test.tsx`

**Interfaces:**
- Consumes: `Graph`, `edgeKey`, `hasEdge`, `Step`.
- Produces:
  - `VIEW_W = 600`, `VIEW_H = 420`, `RADIUS = 20`, `type Point = { x: number; y: number }`
  - `GraphCanvas(props: { graph: Graph; step?: Step; selected?: string | null; edgeFrom?: string | null; onBackgroundPointerDown?(p: Point): void; onVertexPointerDown?(id: string): void; onEdgeClick?(key: string): void; onPointerMove?(p: Point): void; onPointerUp?(): void })`
  - DOM hooks for tests: each vertex `<g data-vertex={id}>` with class `vertex v-<color>` plus `active`/`selected`/`edge-from`; each edge `<g data-edge={key}>` with class `edge` plus `tree`/`active`/`selected`.

Opposite directed edges (`a->b` and `b->a`) are drawn offset 6px to either side so both arrows are visible.

- [ ] **Step 1: Write the failing test**

`src/ui/GraphCanvas.test.tsx`:
```tsx
import { fireEvent, render } from '@testing-library/react';
import type { Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { GraphCanvas } from './GraphCanvas';

const graph: Graph = {
  directed: false,
  vertices: [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 300, y: 100 }],
  edges: [{ u: 'a', v: 'b' }],
  adjOrder: {},
};

const step: Step = {
  proc: 'BFS', line: 3, bigStep: true,
  vertexState: { a: { color: 'black' }, b: { color: 'gray' } },
  vars: {}, ds: [],
  highlight: { vertices: ['b'], treeEdges: ['a--b'] },
};

test('vertex colors, active vertex and tree edges come from the step', () => {
  const { container } = render(<GraphCanvas graph={graph} step={step} />);
  expect(container.querySelector('[data-vertex="a"]')).toHaveClass('v-black');
  expect(container.querySelector('[data-vertex="b"]')).toHaveClass('v-gray', 'active');
  expect(container.querySelector('[data-edge="a--b"]')).toHaveClass('tree');
});

test('vertex pointer down reports the id', () => {
  const onDown = vi.fn();
  const { container } = render(<GraphCanvas graph={graph} onVertexPointerDown={onDown} />);
  fireEvent.pointerDown(container.querySelector('[data-vertex="b"]')!);
  expect(onDown).toHaveBeenCalledWith('b');
});

test('directed edges get an arrow marker', () => {
  const { container } = render(<GraphCanvas graph={{ ...graph, directed: true }} />);
  const line = container.querySelector('[data-edge="a->b"] line.edge-line')!;
  expect(line.getAttribute('marker-end')).toBe('url(#arrow)');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/ui/GraphCanvas`
Expected: FAIL — cannot resolve `./GraphCanvas`.

- [ ] **Step 3: Implement**

`src/ui/GraphCanvas.tsx`:
```tsx
import { useRef, type PointerEvent } from 'react';
import { edgeKey, hasEdge, type Graph } from '../engine/graph';
import type { Step } from '../engine/trace';

export const VIEW_W = 600;
export const VIEW_H = 420;
export const RADIUS = 20;
export type Point = { x: number; y: number };

type Props = {
  graph: Graph;
  step?: Step;
  selected?: string | null;
  edgeFrom?: string | null;
  onBackgroundPointerDown?(p: Point): void;
  onVertexPointerDown?(id: string): void;
  onEdgeClick?(key: string): void;
  onPointerMove?(p: Point): void;
  onPointerUp?(): void;
};

function toSvgPoint(svg: SVGSVGElement, e: PointerEvent): Point {
  const m = svg.getScreenCTM();
  if (!m) return { x: e.clientX, y: e.clientY };
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return {
    x: Math.min(VIEW_W - RADIUS, Math.max(RADIUS, p.x)),
    y: Math.min(VIEW_H - RADIUS, Math.max(RADIUS, p.y)),
  };
}

export function GraphCanvas(props: Props) {
  const { graph, step, selected, edgeFrom } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const pos = new Map(graph.vertices.map((v) => [v.id, v]));
  const hl = step?.highlight ?? {};
  const point = (e: PointerEvent) => toSvgPoint(svgRef.current!, e);

  return (
    <svg
      ref={svgRef}
      className="graph-canvas"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Graph"
      onPointerMove={props.onPointerMove && ((e) => props.onPointerMove!(point(e)))}
      onPointerUp={props.onPointerUp}
      onPointerLeave={props.onPointerUp}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="arrow-head" />
        </marker>
      </defs>
      <rect
        className="canvas-bg"
        width={VIEW_W}
        height={VIEW_H}
        onPointerDown={props.onBackgroundPointerDown && ((e) => props.onBackgroundPointerDown!(point(e)))}
      />
      {graph.edges.map((e) => {
        const a = pos.get(e.u)!;
        const b = pos.get(e.v)!;
        const key = edgeKey(graph, e.u, e.v);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const offset = graph.directed && hasEdge(graph, e.v, e.u) ? 6 : 0;
        const ox = -uy * offset;
        const oy = ux * offset;
        const end = graph.directed ? RADIUS + 3 : 0;
        const cls = ['edge'];
        if (hl.treeEdges?.includes(key)) cls.push('tree');
        if (hl.edges?.includes(key)) cls.push('active');
        if (selected === key) cls.push('selected');
        const x1 = a.x + ox;
        const y1 = a.y + oy;
        const x2 = b.x - ux * end + ox;
        const y2 = b.y - uy * end + oy;
        return (
          <g key={key} data-edge={key} className={cls.join(' ')} onClick={() => props.onEdgeClick?.(key)}>
            <line className="edge-hit" x1={x1} y1={y1} x2={x2} y2={y2} />
            <line
              className="edge-line"
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              markerEnd={graph.directed ? 'url(#arrow)' : undefined}
            />
          </g>
        );
      })}
      {graph.vertices.map((v) => {
        const color = step?.vertexState[v.id]?.color;
        const cls = ['vertex', `v-${typeof color === 'string' ? color : 'none'}`];
        if (hl.vertices?.includes(v.id)) cls.push('active');
        if (selected === v.id) cls.push('selected');
        if (edgeFrom === v.id) cls.push('edge-from');
        return (
          <g
            key={v.id}
            data-vertex={v.id}
            className={cls.join(' ')}
            transform={`translate(${v.x},${v.y})`}
            onPointerDown={(e) => {
              e.stopPropagation();
              props.onVertexPointerDown?.(v.id);
            }}
          >
            <circle r={RADIUS} />
            <text textAnchor="middle" dominantBaseline="central">{v.id}</text>
          </g>
        );
      })}
    </svg>
  );
}
```

Append to `src/styles.css`:
```css
.graph-canvas { width: 100%; height: auto; display: block; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; touch-action: none; user-select: none; }
.canvas-bg { fill: transparent; }
.edge-line { stroke: var(--edge); stroke-width: 2; }
.edge-hit { stroke: transparent; stroke-width: 14; cursor: pointer; }
.edge.tree .edge-line { stroke: var(--tree); stroke-width: 4; }
.edge.active .edge-line { stroke: var(--accent); stroke-width: 4; stroke-dasharray: 6 4; }
.edge.selected .edge-line { stroke: var(--bad); stroke-width: 4; }
.arrow-head { fill: var(--edge); }
.vertex { cursor: pointer; }
.vertex circle { stroke: var(--fg); stroke-width: 2; fill: var(--panel); }
.vertex text { font-size: 14px; font-weight: 600; fill: var(--fg); pointer-events: none; }
.vertex.v-white circle { fill: var(--v-white); }
.vertex.v-white text { fill: #1b1f24; }
.vertex.v-gray circle { fill: var(--v-gray); }
.vertex.v-gray text { fill: #1b1f24; }
.vertex.v-black circle { fill: var(--v-black); stroke: var(--muted); }
.vertex.v-black text { fill: #ffffff; }
.vertex.active circle { stroke: var(--accent); stroke-width: 4; }
.vertex.selected circle, .vertex.edge-from circle { stroke: var(--bad); stroke-width: 4; }
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/ui/GraphCanvas`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/GraphCanvas.tsx src/ui/GraphCanvas.test.tsx src/styles.css
git commit -m "feat(ui): SVG graph canvas with step-driven colors and tree edges

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Information panels (pseudocode, state, data structures, adjacency)

**Files:**
- Create: `src/ui/PseudocodePanel.tsx`, `src/ui/StatePanel.tsx`, `src/ui/DSPanel.tsx`, `src/ui/AdjacencyPanel.tsx`
- Modify: `src/styles.css` (append panel styles)
- Test: `src/ui/panels.test.tsx`

**Interfaces:**
- Consumes: `Proc`, `Step`, `DSView`, `formatValue`, `Graph`, `adjacency`, `vertexIds`.
- Produces:
  - `PseudocodePanel({ procs: Proc[]; current?: { proc: string; line: number } })` — current line gets `aria-current="step"`
  - `StatePanel({ columns: { key: string; label: string }[]; vertices: string[]; step?: Step })`
  - `DSPanel({ ds: DSView[] })`
  - `AdjacencyPanel({ graph: Graph; onMove?(u: string, index: number, delta: number): void; onReset?(): void })` — buttons only rendered when `onMove` is given

- [ ] **Step 1: Write the failing tests**

`src/ui/panels.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AdjacencyPanel } from './AdjacencyPanel';
import { DSPanel } from './DSPanel';
import { PseudocodePanel } from './PseudocodePanel';
import { StatePanel } from './StatePanel';

const step: Step = {
  proc: 'BFS', line: 3, bigStep: true,
  vertexState: { a: { color: 'gray', d: 0, pi: null }, b: { color: 'white', d: Infinity, pi: null } },
  vars: { s: 'a', u: 'a' },
  ds: [{ kind: 'queue', name: 'Q', items: ['b', 'c'] }],
  highlight: {},
  note: 'hello note',
};

test('pseudocode highlights the current line of the current proc', () => {
  render(
    <PseudocodePanel
      procs={[
        { name: 'BFS', signature: 'BFS(G, s)', lines: ['one', 'two', 'three'] },
        { name: 'Init', signature: 'Init(G)', lines: ['x', 'y', 'z'] },
      ]}
      current={{ proc: 'BFS', line: 3 }}
    />,
  );
  const current = screen.getByText('three').closest('li')!;
  expect(current).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('z').closest('li')).not.toHaveAttribute('aria-current');
});

test('state panel formats ∞ and NIL, shows vars and note', () => {
  render(<StatePanel columns={[{ key: 'd', label: 'd' }, { key: 'pi', label: 'π' }]} vertices={['a', 'b']} step={step} />);
  const rowB = screen.getByRole('row', { name: /^b/ });
  expect(within(rowB).getByText('∞')).toBeInTheDocument();
  expect(within(rowB).getByText('NIL')).toBeInTheDocument();
  expect(screen.getByText('u = a')).toBeInTheDocument();
  expect(screen.getByText('hello note')).toBeInTheDocument();
});

test('ds panel shows queue from head to tail', () => {
  render(<DSPanel ds={step.ds} />);
  const items = within(screen.getByLabelText('Q contents')).getAllByText(/\w+/).map((e) => e.textContent);
  expect(items).toEqual(['b', 'c']);
});

test('adjacency panel lists neighbors and reports moves', async () => {
  const g: Graph = {
    directed: false,
    vertices: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }, { id: 'c', x: 0, y: 0 }],
    edges: [{ u: 'a', v: 'b' }, { u: 'a', v: 'c' }],
    adjOrder: {},
  };
  const onMove = vi.fn();
  render(<AdjacencyPanel graph={g} onMove={onMove} onReset={() => {}} />);
  expect(screen.getByLabelText('G.Adj[a]')).toHaveTextContent('b');
  await userEvent.click(screen.getByRole('button', { name: 'Move c earlier in G.Adj[a]' }));
  expect(onMove).toHaveBeenCalledWith('a', 1, -1);
});

test('adjacency panel is read-only without onMove', () => {
  const g: Graph = { directed: false, vertices: [{ id: 'a', x: 0, y: 0 }], edges: [], adjOrder: {} };
  render(<AdjacencyPanel graph={g} />);
  expect(screen.queryByRole('button')).toBeNull();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/ui/panels`
Expected: FAIL — cannot resolve modules.

- [ ] **Step 3: Implement**

`src/ui/PseudocodePanel.tsx`:
```tsx
import type { Proc } from '../algorithms/types';

type Props = { procs: Proc[]; current?: { proc: string; line: number } };

export function PseudocodePanel({ procs, current }: Props) {
  return (
    <div className="panel pseudocode">
      {procs.map((p) => (
        <section key={p.name} aria-label={p.signature}>
          <h3>{p.signature}</h3>
          <ol>
            {p.lines.map((text, i) => {
              const isCurrent = current?.proc === p.name && current.line === i + 1;
              return (
                <li key={i} className={isCurrent ? 'current' : undefined} aria-current={isCurrent ? 'step' : undefined}>
                  <span className="ln">{i + 1}:</span>
                  <code>{text}</code>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
```

`src/ui/StatePanel.tsx`:
```tsx
import { formatValue, type Step } from '../engine/trace';

type Props = { columns: { key: string; label: string }[]; vertices: string[]; step?: Step };

export function StatePanel({ columns, vertices, step }: Props) {
  if (!step) return <div className="panel state"><p className="muted">Press Run to start.</p></div>;
  const vars = Object.entries(step.vars).filter(([, v]) => v !== undefined);
  return (
    <div className="panel state">
      {vars.length > 0 && (
        <p className="vars">
          {vars.map(([k, v]) => <span key={k}>{`${k} = ${formatValue(v)}`}</span>)}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th scope="col">v</th>
            {columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {vertices.map((v) => (
            <tr key={v}>
              <th scope="row">{v}</th>
              {columns.map((c) => <td key={c.key}>{formatValue(step.vertexState[v]?.[c.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {step.note && <p className="note">{step.note}</p>}
    </div>
  );
}
```

`src/ui/DSPanel.tsx`:
```tsx
import type { DSView } from '../engine/trace';

export function DSPanel({ ds }: { ds: DSView[] }) {
  return (
    <div className="panel ds">
      {ds.map((d) => (
        <div key={d.name} className="queue">
          <strong>{d.name}</strong>
          <span className="muted"> (head → tail)</span>
          <div className="queue-items" aria-label={`${d.name} contents`}>
            {d.items.length === 0 ? <span className="muted">∅</span> : d.items.map((x, i) => <span key={i} className="chip">{x}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}
```

`src/ui/AdjacencyPanel.tsx`:
```tsx
import { adjacency, vertexIds, type Graph } from '../engine/graph';

type Props = { graph: Graph; onMove?(u: string, index: number, delta: number): void; onReset?(): void };

export function AdjacencyPanel({ graph, onMove, onReset }: Props) {
  return (
    <div className="panel adjacency">
      <h3>Adjacency lists</h3>
      {onMove && <p className="muted">Order here is the order the algorithm scans neighbors.</p>}
      <ul>
        {vertexIds(graph).map((u) => {
          const list = adjacency(graph, u);
          return (
            <li key={u}>
              <span className="adj-head">G.Adj[{u}]:</span>
              <span aria-label={`G.Adj[${u}]`} className="adj-list">
                {list.length === 0 && <span className="muted">∅</span>}
                {list.map((v, i) => (
                  <span key={v} className="chip">
                    {onMove && i > 0 && (
                      <button type="button" aria-label={`Move ${v} earlier in G.Adj[${u}]`} onClick={() => onMove(u, i, -1)}>‹</button>
                    )}
                    {v}
                    {onMove && i < list.length - 1 && (
                      <button type="button" aria-label={`Move ${v} later in G.Adj[${u}]`} onClick={() => onMove(u, i, 1)}>›</button>
                    )}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      {onReset && <button type="button" onClick={onReset}>Reset to label order</button>}
    </div>
  );
}
```

Append to `src/styles.css`:
```css
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
.panel h3 { margin: 0 0 8px; font-size: 14px; }
.muted { color: var(--muted); }
.pseudocode { overflow-x: auto; }
.pseudocode section + section { margin-top: 12px; }
.pseudocode ol { list-style: none; margin: 0; padding: 0; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 13px; }
.pseudocode li { display: flex; gap: 8px; padding: 1px 6px; border-radius: 4px; }
.pseudocode li code { white-space: pre; }
.pseudocode li.current { background: var(--accent-soft); outline: 2px solid var(--accent); }
.pseudocode .ln { color: var(--muted); min-width: 2.5ch; text-align: right; }
.state table { border-collapse: collapse; width: 100%; font-size: 14px; }
.state th, .state td { border: 1px solid var(--border); padding: 4px 8px; text-align: center; }
.vars { display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 8px; font-family: ui-monospace, Menlo, monospace; }
.note { margin: 8px 0 0; font-style: italic; }
.chip { display: inline-flex; align-items: center; gap: 2px; padding: 2px 8px; margin: 2px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); font-family: ui-monospace, Menlo, monospace; }
.chip button { border: none; background: none; color: var(--accent); cursor: pointer; padding: 0 2px; font-size: 14px; }
.adjacency ul { list-style: none; margin: 0 0 8px; padding: 0; }
.adj-head { font-family: ui-monospace, Menlo, monospace; margin-right: 4px; }
.queue-items { margin-top: 4px; }
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/ui/panels`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/styles.css
git commit -m "feat(ui): pseudocode, state, queue and adjacency panels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Player controls, question overlay, settings panel

**Files:**
- Create: `src/ui/PlayerControls.tsx`, `src/ui/QuestionOverlay.tsx`, `src/ui/SettingsPanel.tsx`
- Modify: `src/styles.css` (append)
- Test: `src/ui/controls.test.tsx`

**Interfaces:**
- Consumes: `PlayerState`, `PlayerAction`, `score`, `Settings`, `Question`, `Answer`, `formatAnswer`.
- Produces:
  - `PlayerControls({ state: PlayerState; total: number; dispatch(a: PlayerAction): void; speedMs: number; onSpeed(ms: number): void })` — buttons with aria-labels `Start`, `Previous big step`, `Previous step`, `Play`/`Pause`, `Next step`, `Next big step`, `End`; range input labelled `Step`; text `Step i / n`; score text `Score: c / a` when `answered > 0`
  - `QuestionOverlay({ question: Question; vertices: string[]; onAnswer(a: Answer): void; onSkip(): void })`
  - `Feedback({ correct: boolean; question: Question })`
  - `SettingsPanel({ settings: Settings; questionTypes: { type: string; label: string }[]; onChange(s: Settings): void })` — checkbox `Predict mode`, one checkbox per type

- [ ] **Step 1: Write the failing tests**

`src/ui/controls.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Question } from '../engine/trace';
import { initialPlayerState } from './player';
import { PlayerControls } from './PlayerControls';
import { Feedback, QuestionOverlay } from './QuestionOverlay';
import { DEFAULT_SETTINGS } from './settings';
import { SettingsPanel } from './SettingsPanel';

test('player buttons dispatch actions and show position', async () => {
  const dispatch = vi.fn();
  render(<PlayerControls state={{ ...initialPlayerState(), index: 2 }} total={10} dispatch={dispatch} speedMs={600} onSpeed={() => {}} />);
  expect(screen.getByText('Step 3 / 10')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Next step' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  await userEvent.click(screen.getByRole('button', { name: 'Play' }));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  expect(dispatch.mock.calls.map((c) => c[0])).toEqual([
    { type: 'next' }, { type: 'bigNext' }, { type: 'play' }, { type: 'seek', index: 9 },
  ]);
});

test('player shows score once something was answered', () => {
  render(<PlayerControls state={{ ...initialPlayerState(), outcomes: { 3: 'correct', 5: 'wrong' } }} total={10} dispatch={() => {}} speedMs={600} onSpeed={() => {}} />);
  expect(screen.getByText('Score: 1 / 2')).toBeInTheDocument();
});

const vq: Question = { type: 'bfs.dequeue', prompt: 'Which?', explain: 'Because.', answer: { kind: 'vertex', value: 'b' } };
const nq: Question = { type: 'bfs.distance', prompt: 'Value?', explain: 'Sum.', answer: { kind: 'number', value: 2 } };

test('vertex question offers one button per vertex, plus skip', async () => {
  const onAnswer = vi.fn();
  const onSkip = vi.fn();
  render(<QuestionOverlay question={vq} vertices={['a', 'b']} onAnswer={onAnswer} onSkip={onSkip} />);
  await userEvent.click(screen.getByRole('button', { name: 'b' }));
  expect(onAnswer).toHaveBeenCalledWith({ kind: 'vertex', value: 'b' });
  await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
  expect(onSkip).toHaveBeenCalled();
});

test('number question parses input, accepts ∞', async () => {
  const onAnswer = vi.fn();
  render(<QuestionOverlay question={nq} vertices={[]} onAnswer={onAnswer} onSkip={() => {}} />);
  await userEvent.type(screen.getByLabelText('Your answer'), '2');
  await userEvent.click(screen.getByRole('button', { name: 'Check' }));
  expect(onAnswer).toHaveBeenLastCalledWith({ kind: 'number', value: 2 });
  await userEvent.clear(screen.getByLabelText('Your answer'));
  await userEvent.type(screen.getByLabelText('Your answer'), '∞');
  await userEvent.click(screen.getByRole('button', { name: 'Check' }));
  expect(onAnswer).toHaveBeenLastCalledWith({ kind: 'number', value: Infinity });
});

test('feedback shows correct answer and explanation when wrong', () => {
  render(<Feedback correct={false} question={nq} />);
  expect(screen.getByRole('status')).toHaveTextContent('Not quite. The answer is 2. Sum.');
});

test('settings toggles predict mode and question types', async () => {
  const onChange = vi.fn();
  render(<SettingsPanel settings={DEFAULT_SETTINGS} questionTypes={[{ type: 'bfs.dequeue', label: 'Dequeue' }]} onChange={onChange} />);
  await userEvent.click(screen.getByLabelText('Predict mode'));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, predict: false });
  await userEvent.click(screen.getByLabelText('Dequeue'));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, disabledTypes: ['bfs.dequeue'] });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/ui/controls`
Expected: FAIL — cannot resolve modules.

- [ ] **Step 3: Implement**

`src/ui/PlayerControls.tsx`:
```tsx
import { score, type PlayerAction, type PlayerState } from './player';

type Props = {
  state: PlayerState;
  total: number;
  dispatch(a: PlayerAction): void;
  speedMs: number;
  onSpeed(ms: number): void;
};

export function PlayerControls({ state, total, dispatch, speedMs, onSpeed }: Props) {
  const { correct, answered } = score(state);
  const btn = (label: string, text: string, action: PlayerAction) => (
    <button type="button" aria-label={label} title={label} onClick={() => dispatch(action)}>{text}</button>
  );
  return (
    <div className="player">
      <div className="player-buttons">
        {btn('Start', '⏮', { type: 'seek', index: 0 })}
        {btn('Previous big step', '⏪', { type: 'bigPrev' })}
        {btn('Previous step', '◀', { type: 'prev' })}
        {state.playing ? btn('Pause', '⏸', { type: 'pause' }) : btn('Play', '▶︎', { type: 'play' })}
        {btn('Next step', '▶', { type: 'next' })}
        {btn('Next big step', '⏩', { type: 'bigNext' })}
        {btn('End', '⏭', { type: 'seek', index: total - 1 })}
      </div>
      <input
        type="range"
        aria-label="Step"
        min={0}
        max={total - 1}
        value={state.index}
        onChange={(e) => dispatch({ type: 'seek', index: Number(e.target.value) })}
      />
      <div className="player-meta">
        <span>Step {state.index + 1} / {total}</span>
        {answered > 0 && <span>Score: {correct} / {answered}</span>}
        <label>
          Speed
          <select value={speedMs} onChange={(e) => onSpeed(Number(e.target.value))}>
            <option value={1200}>Slow</option>
            <option value={600}>Normal</option>
            <option value={250}>Fast</option>
          </select>
        </label>
      </div>
    </div>
  );
}
```

`src/ui/QuestionOverlay.tsx`:
```tsx
import { useState } from 'react';
import { formatAnswer, type Answer, type Question } from '../engine/trace';

type Props = { question: Question; vertices: string[]; onAnswer(a: Answer): void; onSkip(): void };

export function QuestionOverlay({ question, vertices, onAnswer, onSkip }: Props) {
  const [text, setText] = useState('');
  const kind = question.answer.kind;
  return (
    <div className="question" role="dialog" aria-label="Predict the next step">
      <p className="question-prompt">{question.prompt}</p>
      {kind === 'vertex' && (
        <>
          <p className="muted">Click a vertex in the graph or choose below.</p>
          <div className="choices">
            {vertices.map((v) => (
              <button key={v} type="button" onClick={() => onAnswer({ kind: 'vertex', value: v })}>{v}</button>
            ))}
          </div>
        </>
      )}
      {kind === 'number' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            onAnswer({ kind: 'number', value: t === '∞' || t.toLowerCase() === 'inf' ? Infinity : Number(t) });
          }}
        >
          <input aria-label="Your answer" value={text} onChange={(e) => setText(e.target.value)} inputMode="numeric" />
          <button type="submit">Check</button>
        </form>
      )}
      {kind === 'yesno' && (
        <div className="choices">
          <button type="button" onClick={() => onAnswer({ kind: 'yesno', value: true })}>Yes</button>
          <button type="button" onClick={() => onAnswer({ kind: 'yesno', value: false })}>No</button>
        </div>
      )}
      <button type="button" className="skip" onClick={onSkip}>Skip</button>
    </div>
  );
}

export function Feedback({ correct, question }: { correct: boolean; question: Question }) {
  return (
    <p role="status" className={correct ? 'feedback good' : 'feedback bad'}>
      {correct ? `Correct. ${question.explain}` : `Not quite. The answer is ${formatAnswer(question.answer)}. ${question.explain}`}
    </p>
  );
}
```

`src/ui/SettingsPanel.tsx`:
```tsx
import type { Settings } from './settings';

type Props = { settings: Settings; questionTypes: { type: string; label: string }[]; onChange(s: Settings): void };

export function SettingsPanel({ settings, questionTypes, onChange }: Props) {
  const toggleType = (type: string) => {
    const off = settings.disabledTypes.includes(type);
    onChange({
      ...settings,
      disabledTypes: off ? settings.disabledTypes.filter((t) => t !== type) : [...settings.disabledTypes, type],
    });
  };
  return (
    <fieldset className="panel settings">
      <legend>Questions</legend>
      <label>
        <input type="checkbox" checked={settings.predict} onChange={() => onChange({ ...settings, predict: !settings.predict })} />
        Predict mode
      </label>
      {questionTypes.map((q) => (
        <label key={q.type} className="indent">
          <input
            type="checkbox"
            disabled={!settings.predict}
            checked={!settings.disabledTypes.includes(q.type)}
            onChange={() => toggleType(q.type)}
          />
          {q.label}
        </label>
      ))}
    </fieldset>
  );
}
```

Append to `src/styles.css`:
```css
button { font: inherit; padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--fg); cursor: pointer; }
button:hover { border-color: var(--accent); }
select, input { font: inherit; color: var(--fg); background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 4px 6px; }
.player { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.player-buttons { display: flex; flex-wrap: wrap; gap: 4px; }
.player input[type='range'] { width: 100%; }
.player-meta { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; color: var(--muted); }
.question { border: 2px solid var(--accent); background: var(--accent-soft); border-radius: 8px; padding: 12px; margin-top: 8px; }
.question-prompt { font-weight: 600; margin: 0 0 8px; }
.choices { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.question form { display: flex; gap: 6px; margin-bottom: 8px; }
.feedback { padding: 8px 12px; border-radius: 6px; margin: 8px 0 0; }
.feedback.good { background: color-mix(in srgb, var(--good) 15%, transparent); border: 1px solid var(--good); }
.feedback.bad { background: color-mix(in srgb, var(--bad) 15%, transparent); border: 1px solid var(--bad); }
.settings { display: flex; flex-direction: column; gap: 4px; }
.settings .indent { padding-left: 20px; }
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/ui/controls`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/styles.css
git commit -m "feat(ui): player controls, predict question overlay, settings panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Graph editor

**Files:**
- Create: `src/ui/GraphEditor.tsx`
- Modify: `src/styles.css` (append)
- Test: `src/ui/GraphEditor.test.tsx`

**Interfaces:**
- Consumes: `GraphCanvas`, `Point`, graph mutations from Task 2, `MAX_VERTICES`.
- Produces: `GraphEditor({ graph: Graph; onChange(g: Graph): void })`.

Behavior (mode buttons `Select / move`, `Add vertex`, `Add edge`):
- Select: pointer-down on a vertex selects and starts dragging it; clicking an edge selects it; `Delete selected` button (or Delete/Backspace key while the editor has focus) removes the selection.
- Add vertex: pointer-down on empty canvas adds a vertex there with `nextLabel`. At the cap, show `Graphs are limited to 10 vertices so they stay readable.`
- Add edge: click the first vertex (highlighted), then the second. Duplicate edge shows `That edge already exists.`; clicking the same vertex twice cancels.
- Edge creation is click-then-click (works on touch screens); this replaces the spec's "drag vertex to vertex".

Drag and click-to-add need SVG coordinates, which jsdom cannot compute, so this task's unit tests cover the mode logic through pointer events on vertices and edges; Playwright (Task 12) covers dragging and adding vertices on the real canvas.

- [ ] **Step 1: Write the failing tests**

`src/ui/GraphEditor.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Graph } from '../engine/graph';
import { GraphEditor } from './GraphEditor';

const start: Graph = {
  directed: false,
  vertices: [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 300, y: 100 }, { id: 'c', x: 200, y: 300 }],
  edges: [{ u: 'a', v: 'b' }],
  adjOrder: {},
};

let latest: Graph;
function Harness() {
  const [g, setG] = useState(start);
  latest = g;
  return <GraphEditor graph={g} onChange={setG} />;
}

const vertex = (c: HTMLElement, id: string) => c.querySelector(`[data-vertex="${id}"]`)!;

test('add edge by clicking two vertices', async () => {
  const { container } = render(<Harness />);
  await userEvent.click(screen.getByRole('button', { name: 'Add edge' }));
  fireEvent.pointerDown(vertex(container, 'b'));
  fireEvent.pointerDown(vertex(container, 'c'));
  expect(latest.edges).toEqual([{ u: 'a', v: 'b' }, { u: 'b', v: 'c' }]);
});

test('duplicate edge shows a message', async () => {
  const { container } = render(<Harness />);
  await userEvent.click(screen.getByRole('button', { name: 'Add edge' }));
  fireEvent.pointerDown(vertex(container, 'b'));
  fireEvent.pointerDown(vertex(container, 'a'));
  expect(screen.getByRole('alert')).toHaveTextContent('That edge already exists.');
});

test('select a vertex and delete it', async () => {
  const { container } = render(<Harness />);
  fireEvent.pointerDown(vertex(container, 'a'));
  fireEvent.pointerUp(container.querySelector('svg')!);
  await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
  expect(latest.vertices.map((v) => v.id)).toEqual(['b', 'c']);
  expect(latest.edges).toEqual([]);
});

test('select an edge and delete it', async () => {
  const { container } = render(<Harness />);
  fireEvent.click(container.querySelector('[data-edge="a--b"]')!);
  await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
  expect(latest.edges).toEqual([]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/ui/GraphEditor`
Expected: FAIL — cannot resolve `./GraphEditor`.

- [ ] **Step 3: Implement**

`src/ui/GraphEditor.tsx`:
```tsx
import { useState } from 'react';
import {
  addEdge, addVertex, canAddVertex, edgeKey, hasEdge, MAX_VERTICES, moveVertex,
  removeEdge, removeVertex, type Graph,
} from '../engine/graph';
import { GraphCanvas, type Point } from './GraphCanvas';

type Mode = 'select' | 'vertex' | 'edge';
type Props = { graph: Graph; onChange(g: Graph): void };

export function GraphEditor({ graph, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('select');
  const [selected, setSelected] = useState<string | null>(null);
  const [edgeFrom, setEdgeFrom] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSelected(null);
    setEdgeFrom(null);
    setMessage(null);
  };

  const onBackground = (p: Point) => {
    setMessage(null);
    if (mode === 'vertex') {
      if (!canAddVertex(graph)) {
        setMessage(`Graphs are limited to ${MAX_VERTICES} vertices so they stay readable.`);
        return;
      }
      onChange(addVertex(graph, Math.round(p.x), Math.round(p.y)));
    } else {
      setSelected(null);
      setEdgeFrom(null);
    }
  };

  const onVertex = (id: string) => {
    setMessage(null);
    if (mode === 'edge') {
      if (edgeFrom === null) {
        setEdgeFrom(id);
        return;
      }
      if (edgeFrom !== id) {
        if (hasEdge(graph, edgeFrom, id)) setMessage('That edge already exists.');
        else onChange(addEdge(graph, edgeFrom, id));
      }
      setEdgeFrom(null);
    } else if (mode === 'select') {
      setSelected(id);
      setDragging(id);
    }
  };

  const onEdge = (key: string) => {
    if (mode === 'select') setSelected(key);
  };

  const deleteSelected = () => {
    if (selected === null) return;
    if (graph.vertices.some((v) => v.id === selected)) {
      onChange(removeVertex(graph, selected));
    } else {
      const e = graph.edges.find((x) => edgeKey(graph, x.u, x.v) === selected);
      if (e) onChange(removeEdge(graph, e.u, e.v));
    }
    setSelected(null);
  };

  const modeButton = (m: Mode, label: string) => (
    <button type="button" aria-pressed={mode === m} onClick={() => switchMode(m)}>{label}</button>
  );

  return (
    <div
      className="editor"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      }}
    >
      <div className="editor-toolbar">
        {modeButton('select', 'Select / move')}
        {modeButton('vertex', 'Add vertex')}
        {modeButton('edge', 'Add edge')}
        <button type="button" disabled={selected === null} onClick={deleteSelected}>Delete selected</button>
      </div>
      <p className="muted hint">
        {mode === 'select' && 'Drag vertices to move them. Click a vertex or edge to select it.'}
        {mode === 'vertex' && 'Click empty space to add a vertex.'}
        {mode === 'edge' && (edgeFrom ? `Now click the second endpoint (from ${edgeFrom}).` : 'Click the first endpoint.')}
      </p>
      <GraphCanvas
        graph={graph}
        selected={selected}
        edgeFrom={edgeFrom}
        onBackgroundPointerDown={onBackground}
        onVertexPointerDown={onVertex}
        onEdgeClick={onEdge}
        onPointerMove={dragging ? (p) => onChange(moveVertex(graph, dragging, Math.round(p.x), Math.round(p.y))) : undefined}
        onPointerUp={() => setDragging(null)}
      />
      {message && <p role="alert" className="feedback bad">{message}</p>}
    </div>
  );
}
```

Append to `src/styles.css`:
```css
.editor { outline: none; }
.editor-toolbar { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
.editor-toolbar button[aria-pressed='true'] { background: var(--accent); color: #ffffff; border-color: var(--accent); }
.hint { margin: 4px 0; font-size: 13px; }
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/ui/GraphEditor`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/styles.css
git commit -m "feat(ui): graph editor with add/move/delete and vertex cap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Visualizer, algorithm page, home and routing

**Files:**
- Create: `src/ui/Visualizer.tsx`, `src/ui/AlgorithmPage.tsx`, `src/ui/Home.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/styles.css` (append)
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: everything above; `ALGORITHMS` from `registry.ts`.
- Produces: `App` with routes `#/` (home) and `#/<algorithm id>`; `AlgorithmPage({ def })`; `Visualizer({ def, graph, steps, settings, onSettingsChange })`.

Page flow: page opens in **edit mode** on preset 0. Toolbar: preset select (`Preset`), one select per param (label from `ParamSpec.label`), `Directed` checkbox when `def.directed === 'toggle'`, `Run` button. `Run` validates; errors block and show as `role="alert"`; warnings show but run proceeds. In **run mode** the toolbar shows `Edit graph` instead of `Run`, preset/params/directed are disabled, and the Visualizer is keyed by a run counter so each run starts fresh.

- [ ] **Step 1: Write the failing tests**

Replace `src/App.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  window.location.hash = '';
  window.localStorage.clear();
});

test('home lists BFS', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'DS&Algs Visualizer' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Breadth-First Search/ })).toHaveAttribute('href', '#/bfs');
});

test('BFS page: run, answer first question, reach the end', async () => {
  window.location.hash = '#/bfs';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Breadth-First Search (BFS)' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('which vertex does Dequeue(Q) return?');
  await userEvent.click(within(dialog).getByRole('button', { name: 's' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
  expect(screen.getByText('BFS(G, s)').closest('section')!.querySelector('[aria-current="step"]')).toHaveTextContent('u = Dequeue(Q)');

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  const rowV7 = screen.getByRole('row', { name: /^v7/ });
  expect(rowV7).toHaveTextContent('black');
  expect(rowV7).toHaveTextContent('3');
  expect(rowV7).toHaveTextContent('v5');
});

test('Run is blocked without a source', async () => {
  window.location.hash = '#/bfs';
  render(<App />);
  await userEvent.selectOptions(screen.getByLabelText('Source s'), '');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a source vertex s.');
  expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/App`
Expected: FAIL — no link / no BFS page.

- [ ] **Step 3: Implement Visualizer**

`src/ui/Visualizer.tsx`:
```tsx
import type { AlgorithmDef } from '../algorithms/types';
import { vertexIds, type Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AdjacencyPanel } from './AdjacencyPanel';
import { DSPanel } from './DSPanel';
import { GraphCanvas } from './GraphCanvas';
import { PlayerControls } from './PlayerControls';
import { PseudocodePanel } from './PseudocodePanel';
import { Feedback, QuestionOverlay } from './QuestionOverlay';
import type { Settings } from './settings';
import { SettingsPanel } from './SettingsPanel';
import { StatePanel } from './StatePanel';
import { usePlayer } from './usePlayer';

type Props = {
  def: AlgorithmDef;
  graph: Graph;
  steps: Step[];
  settings: Settings;
  onSettingsChange(s: Settings): void;
};

export function Visualizer({ def, graph, steps, settings, onSettingsChange }: Props) {
  const { state, dispatch } = usePlayer(steps, settings);
  const step = steps[state.index];
  const pending = state.pending !== null ? steps[state.pending].question! : null;
  const vertices = vertexIds(graph);

  return (
    <div className="layout">
      <div className="main-col">
        <GraphCanvas
          graph={graph}
          step={step}
          onVertexPointerDown={
            pending?.answer.kind === 'vertex'
              ? (id) => dispatch({ type: 'answer', answer: { kind: 'vertex', value: id } })
              : undefined
          }
        />
        {pending && (
          <QuestionOverlay
            key={state.pending}
            question={pending}
            vertices={vertices}
            onAnswer={(answer) => dispatch({ type: 'answer', answer })}
            onSkip={() => dispatch({ type: 'skip' })}
          />
        )}
        {state.feedback && <Feedback {...state.feedback} />}
        <PlayerControls
          state={state}
          total={steps.length}
          dispatch={dispatch}
          speedMs={settings.speedMs}
          onSpeed={(speedMs) => onSettingsChange({ ...settings, speedMs })}
        />
        <DSPanel ds={step.ds} />
      </div>
      <div className="side-col">
        <PseudocodePanel procs={def.procs} current={step} />
        <StatePanel columns={def.stateColumns} vertices={vertices} step={step} />
        <AdjacencyPanel graph={graph} />
        <SettingsPanel settings={settings} questionTypes={def.questionTypes} onChange={onSettingsChange} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement AlgorithmPage**

`src/ui/AlgorithmPage.tsx`:
```tsx
import { useState } from 'react';
import type { AlgorithmDef, Params, Validation } from '../algorithms/types';
import { moveInAdjacency, resetAdjacency, setDirected, vertexIds, type Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AdjacencyPanel } from './AdjacencyPanel';
import { GraphEditor } from './GraphEditor';
import { PseudocodePanel } from './PseudocodePanel';
import { useSettings } from './settings';
import { Visualizer } from './Visualizer';

const NO_MESSAGES: Validation = { errors: [], warnings: [] };

export function AlgorithmPage({ def }: { def: AlgorithmDef }) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [graph, setGraph] = useState<Graph>(def.presets[0].graph);
  const [params, setParams] = useState<Params>(def.presets[0].params);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [runId, setRunId] = useState(0);
  const [messages, setMessages] = useState<Validation>(NO_MESSAGES);
  const [settings, setSettings] = useSettings();
  const running = steps !== null;

  const loadPreset = (i: number) => {
    setPresetIndex(i);
    setGraph(def.presets[i].graph);
    setParams(def.presets[i].params);
    setMessages(NO_MESSAGES);
  };

  const run = () => {
    const v = def.validate(graph, params);
    setMessages(v);
    if (v.errors.length > 0) return;
    setSteps(def.run(graph, params));
    setRunId((r) => r + 1);
  };

  return (
    <div className="algo-page">
      <header className="page-header">
        <a href="#/">← All algorithms</a>
        <h1>{def.title}</h1>
      </header>
      <div className="toolbar">
        <label>
          Preset
          <select value={presetIndex} disabled={running} onChange={(e) => loadPreset(Number(e.target.value))}>
            {def.presets.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
          </select>
        </label>
        {def.params.map((p) => (
          <label key={p.name}>
            {p.label}
            <select
              value={params[p.name] ?? ''}
              disabled={running}
              onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
            >
              <option value="">choose…</option>
              {vertexIds(graph).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        ))}
        {def.directed === 'toggle' && (
          <label>
            <input
              type="checkbox"
              checked={graph.directed}
              disabled={running}
              onChange={(e) => setGraph(setDirected(graph, e.target.checked))}
            />
            Directed
          </label>
        )}
        {running ? (
          <button type="button" onClick={() => setSteps(null)}>Edit graph</button>
        ) : (
          <button type="button" className="primary" onClick={run}>Run</button>
        )}
      </div>
      {messages.errors.map((m) => <p key={m} role="alert" className="feedback bad">{m}</p>)}
      {messages.warnings.map((m) => <p key={m} className="feedback warn">{m}</p>)}
      {running ? (
        <Visualizer key={runId} def={def} graph={graph} steps={steps} settings={settings} onSettingsChange={setSettings} />
      ) : (
        <div className="layout">
          <div className="main-col">
            <GraphEditor graph={graph} onChange={setGraph} />
          </div>
          <div className="side-col">
            <PseudocodePanel procs={def.procs} />
            <AdjacencyPanel
              graph={graph}
              onMove={(u, i, d) => setGraph(moveInAdjacency(graph, u, i, d))}
              onReset={() => setGraph(resetAdjacency(graph))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement Home and routing**

`src/ui/Home.tsx`:
```tsx
import { ALGORITHMS } from '../algorithms/registry';

export function Home() {
  return (
    <main className="home">
      <h1>DS&amp;Algs Visualizer</h1>
      <p>
        Step through the algorithms of Data Structures and Algorithms exactly as they appear in the lectures: same
        pseudocode, same line numbers. Pick an algorithm, start from a lecture example, and edit the graph if you want.
      </p>
      <ul className="algo-list">
        {ALGORITHMS.map((a) => (
          <li key={a.id}>
            <a href={`#/${a.id}`}>{a.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

Replace `src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { ALGORITHMS } from './algorithms/registry';
import { AlgorithmPage } from './ui/AlgorithmPage';
import { Home } from './ui/Home';

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const id = useHash().replace(/^#\/?/, '');
  const def = ALGORITHMS.find((a) => a.id === id);
  return def ? <AlgorithmPage key={def.id} def={def} /> : <Home />;
}
```

Append to `src/styles.css`:
```css
a { color: var(--accent); }
.page-header h1 { margin: 4px 0 12px; font-size: 24px; }
.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; }
.toolbar label { display: flex; gap: 6px; align-items: center; }
button.primary { background: var(--accent); color: #ffffff; border-color: var(--accent); }
.feedback.warn { background: color-mix(in srgb, #d99a00 15%, transparent); border: 1px solid #d99a00; }
.layout { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; }
.main-col, .side-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.algo-list { font-size: 18px; line-height: 2; }
@media (max-width: 800px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 7: Check in a browser**

Run: `npm run dev`, open the printed URL, go to `#/bfs`. Check by hand: drag a vertex, add a vertex and an edge, reorder `G.Adj[s]`, Run, step through, answer a question by clicking a vertex in the graph, toggle predict mode off, resize the window to 375px wide (no horizontal scroll). Fix anything broken before committing.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: BFS page with edit/run modes, home page and hash routing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: End-to-end test, CI and GitHub Pages deploy

**Files:**
- Create: `playwright.config.ts`, `e2e/bfs.spec.ts`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: built site (`npm run build`, `npm run preview`).
- Produces: `npm run e2e`; CI on pull requests and pushes; Pages deploy on push to `main`.

- [ ] **Step 1: Write the Playwright config and failing test**

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4173' },
});
```

`e2e/bfs.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('edit the graph, run BFS, answer a question by clicking the graph', async ({ page }) => {
  await page.goto('/#/bfs');
  await expect(page.getByRole('heading', { name: 'Breadth-First Search (BFS)' })).toBeVisible();

  // Add a vertex (v8) on empty canvas space and connect it to v7.
  await page.getByRole('button', { name: 'Add vertex' }).click();
  const canvas = page.getByRole('img', { name: 'Graph' });
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.92, box.y + box.height * 0.85);
  await expect(page.locator('[data-vertex="v8"]')).toBeVisible();
  await page.getByRole('button', { name: 'Add edge' }).click();
  await page.locator('[data-vertex="v7"]').dispatchEvent('pointerdown');
  await page.locator('[data-vertex="v8"]').dispatchEvent('pointerdown');
  await expect(page.locator('[data-edge="v7--v8"]')).toBeVisible();

  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  await expect(page.getByRole('dialog', { name: 'Predict the next step' })).toBeVisible();
  await page.locator('[data-vertex="s"]').dispatchEvent('pointerdown');
  await expect(page.getByRole('status')).toContainText('Correct.');

  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.getByRole('row', { name: /^v8/ })).toContainText('4');
});

test('no horizontal scroll at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/bfs');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
```

- [ ] **Step 2: Install browser and run**

Run: `npx playwright install chromium && npm run e2e`
Expected: both tests PASS (they exercise code from Tasks 1–11). If the first fails, run `npx playwright test --headed` to watch it and fix the app, not the assertions.

- [ ] **Step 3: Write CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
```

- [ ] **Step 4: Write deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Write README**

`README.md`:
```markdown
# DS&Algs Visualizer

Step-by-step visualizations of the Data Structures and Algorithms course algorithms, using the lecture pseudocode verbatim.

## Develop

    npm install
    npm run dev      # local site
    npm test         # unit tests
    npm run e2e      # browser tests (first run: npx playwright install chromium)

## Add an algorithm

1. Create `src/algorithms/<id>/` with `pseudocode.ts` (verbatim slide lines), `presets.ts`, `questions.ts`, `run.ts`, `index.ts` and `run.test.ts`. Use `src/algorithms/bfs/` as the reference.
2. `run.ts` emits one `Step` per executed pseudocode line, showing the state after that line.
3. Test final results against the lecture/tutorial solutions and call `assertValidTrace`.
4. Add the definition to `src/algorithms/registry.ts`.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages (Settings → Pages → Source: GitHub Actions).
```

- [ ] **Step 6: Run everything**

Run: `npm test && npm run build && npm run e2e`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "ci: Playwright smoke tests, CI and GitHub Pages deploy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Publish (needs the user)**

Creating the GitHub repository and pushing are outward-facing; ask the user before doing them. Once approved:
```bash
gh repo create ds-algs-visualizer --public --source . --push
```
Then in the repo: Settings → Pages → Source: GitHub Actions. Confirm the deploy workflow succeeds and the site loads at the Pages URL with `#/bfs`.
