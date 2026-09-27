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
