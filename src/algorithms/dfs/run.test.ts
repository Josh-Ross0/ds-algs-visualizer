import { edgeKey, moveInAdjacency, setDirected, type Graph } from '../../engine/graph';
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

test('lecture example: every edge classified in real time', () => {
  expect(edgeTypes(lecture.graph)).toEqual({
    'v1->v2': 'tree', 'v2->v3': 'tree', 'v3->v4': 'tree', 'v3->v5': 'tree', 'v6->v7': 'tree', 'v7->v8': 'tree',
    'v5->v1': 'back', 'v8->v6': 'back',
    'v1->v3': 'forward',
    'v5->v4': 'crossing', 'v6->v2': 'crossing', 'v7->v1': 'crossing', 'v8->v5': 'crossing',
  });
});

test('edge types are never shown outside questions', () => {
  for (const g of [lecture.graph, undirected.graph]) {
    for (const s of runDfs(g)) {
      expect(s).not.toHaveProperty('edgeLabels');
      expect(s.note ?? '').not.toMatch(/\b(tree|back|forward|crossing) edge\b/);
    }
  }
});

test('undirected example: only tree and back edges', () => {
  const steps = runDfs(undirected.graph);
  assertValidTrace(dfs, steps);
  expect(attr(steps, 'd')).toEqual({ a: 1, b: 2, c: 4, d: 3, e: 6 });
  expect(attr(steps, 'f')).toEqual({ a: 10, b: 9, c: 5, d: 8, e: 7 });
  expect(attr(steps, 'pi')).toEqual({ a: null, b: 'a', c: 'd', d: 'b', e: 'd' });
  expect(edgeTypes(undirected.graph)).toEqual({ 'a--b': 'tree', 'b--d': 'tree', 'c--d': 'tree', 'd--e': 'tree', 'a--c': 'back' });
});

test('lecture preset toggled to undirected: one question per edge, only tree or back', () => {
  const g = setDirected(lecture.graph, false);
  const questions = runDfs(g).filter((s) => s.question?.type === 'dfs.edgeType');
  const types = edgeTypes(g);
  expect(questions.length).toBe(g.edges.length);
  expect(Object.keys(types).length).toBe(g.edges.length);
  expect(Object.values(types).every((t) => t === 'tree' || t === 'back')).toBe(true);
});

test('directed 2-cycle: tree edge then back edge', () => {
  const g: Graph = {
    directed: true,
    vertices: [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 300, y: 100 }],
    edges: [{ u: 'a', v: 'b' }, { u: 'b', v: 'a' }],
    adjOrder: {},
  };
  expect(edgeTypes(g)).toEqual({ 'a->b': 'tree', 'b->a': 'back' });
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

test('question counts: one discovery and one finish per vertex, one type per edge', () => {
  const qs = runDfs(lecture.graph).flatMap((s) => (s.question ? [s.question] : []));
  expect(qs.filter((q) => q.type === 'dfs.discover').length).toBe(8);
  expect(qs.filter((q) => q.type === 'dfs.finish').length).toBe(8);
  const types = qs.filter((q) => q.type === 'dfs.edgeType');
  expect(types.length).toBe(13);
  expect(types.every((q) => q.answer.kind === 'choice' && q.answer.options.length === 4)).toBe(true);
  expect(qs.find((q) => q.type === 'dfs.discover')!.answer).toEqual({ kind: 'vertex', value: 'v1' });

  const uq = runDfs(undirected.graph).flatMap((s) => (s.question?.type === 'dfs.edgeType' ? [s.question] : []));
  expect(uq.length).toBe(5);
  expect(uq.every((q) => q.answer.kind === 'choice' && q.answer.options.join() === 'tree,back')).toBe(true);
});

test('every question is predictable from the step before it', () => {
  for (const g of [lecture.graph, undirected.graph]) {
    assertQuestionsPredictable(runDfs(g), (prev, step) => {
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
    });
  }
});

test('validate needs at least one vertex', () => {
  expect(dfs.validate({ directed: true, vertices: [], edges: [], adjOrder: {} }, {}).errors).toEqual(['Add at least one vertex.']);
  expect(dfs.validate(lecture.graph, {}).errors).toEqual([]);
});
