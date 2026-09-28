import { addEdge, adjacency, edgeKey, moveInAdjacency, setDirected, vertexIds, type Graph } from '../../engine/graph';
import type { Step } from '../../engine/trace';
import { assertQuestionsPredictable, assertValidTrace } from '../testing';
import { dfs } from './index';
import { runDfs } from './run';

const lecture = dfs.presets[0];
const undirected = dfs.presets[1];

const last = (steps: Step[]) => steps[steps.length - 1];
const attr = (steps: Step[], key: string) =>
  Object.fromEntries(Object.entries(last(steps).vertexState).map(([v, a]) => [v, a[key]]));
// Edge types are only visible through the edge-type questions.
const edgeTypes = (g: Graph) =>
  Object.fromEntries(
    runDfs(g).flatMap((s) =>
      s.question?.type === 'dfs.edgeType'
        ? [[edgeKey(g, s.vars.u as string, s.vars.v as string), s.question.answer.value]]
        : [],
    ),
  );

test('lecture example (slide 5): d, f and π match the slide table', () => {
  const steps = runDfs(lecture.graph);
  assertValidTrace(dfs, steps);
  expect(attr(steps, 'd')).toEqual({ v1: 1, v2: 2, v3: 3, v4: 4, v5: 6, v6: 11, v7: 12, v8: 13 });
  expect(attr(steps, 'f')).toEqual({ v1: 10, v2: 9, v3: 8, v4: 5, v5: 7, v6: 16, v7: 15, v8: 14 });
  expect(attr(steps, 'pi')).toEqual({ v1: null, v2: 'v1', v3: 'v2', v4: 'v3', v5: 'v3', v6: null, v7: 'v6', v8: 'v7' });
  expect(Object.values(attr(steps, 'color')).every((c) => c === 'black')).toBe(true);
  expect(last(steps).vars.time).toBe(16);
});

test('lecture example: every non-tree edge classified in real time (tree edges are not asked about)', () => {
  expect(edgeTypes(lecture.graph)).toEqual({
    'v5->v1': 'back', 'v8->v6': 'back',
    'v1->v3': 'forward',
    'v5->v4': 'crossing', 'v6->v2': 'crossing', 'v7->v1': 'crossing', 'v8->v5': 'crossing',
  });
});

const ALLOWED_STEP_KEYS = ['proc', 'line', 'bigStep', 'vertexState', 'vars', 'ds', 'highlight', 'note', 'question'];

test('edge types are never shown outside questions', () => {
  for (const g of [lecture.graph, undirected.graph]) {
    for (const s of runDfs(g)) {
      expect(Object.keys(s).every((k) => ALLOWED_STEP_KEYS.includes(k))).toBe(true);
      expect(s.note ?? '').not.toMatch(/\b(tree|back|forward|crossing)\b/);
    }
  }
});

test('undirected example: only tree and back edges', () => {
  const steps = runDfs(undirected.graph);
  assertValidTrace(dfs, steps);
  expect(attr(steps, 'd')).toEqual({ a: 1, b: 2, c: 4, d: 3, e: 6 });
  expect(attr(steps, 'f')).toEqual({ a: 10, b: 9, c: 5, d: 8, e: 7 });
  expect(attr(steps, 'pi')).toEqual({ a: null, b: 'a', c: 'd', d: 'b', e: 'd' });
  expect(edgeTypes(undirected.graph)).toEqual({ 'a--c': 'back' });
});

test('lecture preset toggled to undirected: one question per non-tree edge, only back', () => {
  const g = setDirected(lecture.graph, false);
  const steps = runDfs(g);
  const treeEdgeCount = Object.values(attr(steps, 'pi')).filter((p) => p !== null).length;
  const questions = steps.filter((s) => s.question?.type === 'dfs.edgeType');
  const types = edgeTypes(g);
  expect(questions.length).toBe(g.edges.length - treeEdgeCount);
  expect(Object.keys(types).length).toBe(g.edges.length - treeEdgeCount);
  expect(Object.values(types).every((t) => t === 'back')).toBe(true);
});

test('directed 2-cycle: tree edge then back edge', () => {
  const g: Graph = {
    directed: true,
    vertices: [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 300, y: 100 }],
    edges: [{ u: 'a', v: 'b' }, { u: 'b', v: 'a' }],
    adjOrder: {},
  };
  expect(edgeTypes(g)).toEqual({ 'b->a': 'back' });
});

test('single vertex: discovered at 1, retracted at 2', () => {
  const g: Graph = { directed: true, vertices: [{ id: 'a', x: 100, y: 100 }], edges: [], adjOrder: {} };
  const steps = runDfs(g);
  expect(last(steps).vertexState.a).toEqual({ color: 'black', pi: null, d: 1, f: 2 });
  expect(edgeTypes(g)).toEqual({});
});

test('reordering Adj[v3] turns v3→v4 into a forward edge', () => {
  const g = moveInAdjacency(lecture.graph, 'v3', 1, -1);
  const steps = runDfs(g);
  expect(attr(steps, 'pi').v4).toBe('v5');
  expect(attr(steps, 'd').v4).toBe(5);
  expect(edgeTypes(g)['v3->v4']).toBe('forward');
});

test('big steps are discoveries and retractions', () => {
  const big = runDfs(lecture.graph).filter((s) => s.bigStep);
  expect(big.length).toBe(16);
  expect(big.every((s) => s.proc === 'DFS_Visit' && (s.line === 2 || s.line === 10))).toBe(true);
});

test('call stack follows the recursion', () => {
  const steps = runDfs(lecture.graph);
  const v4found = steps.find((s) => s.proc === 'DFS_Visit' && s.line === 2 && s.vars.u === 'v4')!;
  expect(v4found.ds[0]).toEqual({
    kind: 'stack', name: 'Call stack',
    items: ['DFS(G)', 'DFS_Visit(G, v1)', 'DFS_Visit(G, v2)', 'DFS_Visit(G, v3)', 'DFS_Visit(G, v4)'],
  });
  expect(last(steps).ds[0].items).toEqual(['DFS(G)']);
});

test('question counts: one discovery and one finish per vertex, one type per non-tree edge', () => {
  const qs = runDfs(lecture.graph).flatMap((s) => (s.question ? [s.question] : []));
  expect(qs.filter((q) => q.type === 'dfs.discover').length).toBe(8);
  expect(qs.filter((q) => q.type === 'dfs.finish').length).toBe(8);
  const types = qs.filter((q) => q.type === 'dfs.edgeType');
  expect(types.length).toBe(7);
  expect(types.every((q) => q.answer.kind === 'choice' && q.answer.options.length === 4)).toBe(true);
  expect(qs.find((q) => q.type === 'dfs.discover')!.answer).toEqual({ kind: 'vertex', value: 'v1' });

  const uq = runDfs(undirected.graph).flatMap((s) => (s.question?.type === 'dfs.edgeType' ? [s.question] : []));
  expect(uq.length).toBe(1);
  expect(uq.every((q) => q.answer.kind === 'choice' && q.answer.options.join() === 'tree,back')).toBe(true);
});

test('edge-type question never has answer "tree" (tree edges are not asked about)', () => {
  for (const g of [lecture.graph, undirected.graph, setDirected(lecture.graph, false)]) {
    const qs = runDfs(g).flatMap((s) => (s.question?.type === 'dfs.edgeType' ? [s.question] : []));
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.answer.value !== 'tree')).toBe(true);
  }
});

// Shared by the fixed-graph and random-graph predictability checks below.
function checkPredictable(prev: Step, step: Step): void {
  const q = step.question!;
  if (q.type === 'dfs.discover') {
    const v = q.answer.value as string;
    expect(prev.vertexState[v].color).toBe('white');
    expect(prev.vars.u).not.toBe(v);
    expect(prev.vars.v).not.toBe(v);
  } else if (q.type === 'dfs.edgeType') {
    expect([prev.proc, prev.line, prev.vars.u, prev.vars.v]).toEqual(['DFS_Visit', 4, step.vars.u, step.vars.v]);
    expect(step.note ?? '').not.toMatch(/\b(tree|back|forward|crossing)\b/);
  } else if (q.type === 'dfs.finish') {
    expect(prev.vertexState[step.vars.u as string].f).toBeUndefined();
    expect(q.answer.value).toBe(step.vars.time);
  } else {
    throw new Error(`unexpected question type ${q.type}`);
  }
}

test('every question is predictable from the step before it', () => {
  for (const g of [lecture.graph, undirected.graph]) {
    assertQuestionsPredictable(runDfs(g), checkPredictable);
  }
});

// mulberry32: tiny deterministic PRNG, no new dependency.
function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomGraph(rand: () => number): Graph {
  const n = 1 + Math.floor(rand() * 10); // 1..10
  const directed = rand() < 0.5;
  const vertices = Array.from({ length: n }, (_, i) => ({ id: String.fromCharCode(97 + i), x: i * 60, y: 100 }));
  let g: Graph = { directed, vertices, edges: [], adjOrder: {} };
  const ids = vertices.map((v) => v.id);
  const maxEdges = directed ? n * (n - 1) : (n * (n - 1)) / 2;
  const targetEdges = Math.floor(rand() * (maxEdges + 1));
  for (let attempts = 0; attempts < maxEdges * 4 && g.edges.length < targetEdges; attempts++) {
    const u = ids[Math.floor(rand() * n)];
    const v = ids[Math.floor(rand() * n)];
    if (u === v) continue;
    g = addEdge(g, u, v);
  }
  // Shuffle each vertex's adjacency order with a handful of random adjacent swaps.
  for (const u of ids) {
    const len = adjacency(g, u).length;
    for (let i = 0; i < len; i++) {
      g = moveInAdjacency(g, u, Math.floor(rand() * len), rand() < 0.5 ? 1 : -1);
    }
  }
  return g;
}

test('30 seeded random graphs: valid traces, predictable questions, correct d/f/pi', () => {
  const rand = mulberry32(20260928);
  for (let i = 0; i < 30; i++) {
    const g = randomGraph(rand);
    const steps = runDfs(g);
    assertValidTrace(dfs, steps);
    assertQuestionsPredictable(steps, checkPredictable);

    const n = g.vertices.length;
    const vs = last(steps).vertexState;
    for (const v of vertexIds(g)) {
      const a = vs[v];
      expect(a.color).toBe('black');
      expect(a.d as number).toBeGreaterThanOrEqual(1);
      expect(a.d as number).toBeLessThan(a.f as number);
      expect(a.f as number).toBeLessThanOrEqual(2 * n);
      // Parenthesis property: a descendant's interval nests inside its parent's.
      const p = a.pi;
      if (typeof p === 'string') {
        expect(vs[p].d as number).toBeLessThan(a.d as number);
        expect(a.f as number).toBeLessThan(vs[p].f as number);
      }
    }

    const treeEdgeCount = Object.values(vs).filter((a) => a.pi !== null).length;
    const edgeQuestions = steps.flatMap((s) => (s.question?.type === 'dfs.edgeType' ? [s.question] : []));
    expect(edgeQuestions.length).toBe(g.edges.length - treeEdgeCount);
    expect(edgeQuestions.every((q) => q.answer.value !== 'tree')).toBe(true);
    if (!g.directed) {
      expect(edgeQuestions.every((q) => q.answer.value === 'back')).toBe(true);
    }
  }
});

test('validate needs at least one vertex', () => {
  expect(dfs.validate({ directed: true, vertices: [], edges: [], adjOrder: {} }, {}).errors).toEqual(['Add at least one vertex.']);
  expect(dfs.validate(lecture.graph, {}).errors).toEqual([]);
});
