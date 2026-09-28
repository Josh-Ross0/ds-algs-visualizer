import { edgeKey, moveInEdgeList, removeEdge, type Graph } from '../../engine/graph';
import type { Step } from '../../engine/trace';
import { bruteForceMstWeight, randomWeightedGraph } from '../mst/reference';
import { mulberry32 } from '../sssp/reference';
import { assertQuestionsPredictable, assertValidTrace } from '../testing';
import { forestPath } from './forest';
import { kruskal } from './index';
import { runKruskal } from './run';

const lecture = kruskal.presets[0];
const last = (steps: Step[]) => steps[steps.length - 1];
const items = (s: Step, i: number) => (s.ds[i] as { items: string[] }).items;
const decisions = (steps: Step[]) =>
  steps.filter((s) => s.line === 6).map((s) => `${s.vars.e}${s.question!.answer.value ? '+' : '-'}`);

function checkPredictable(g: Graph, steps: Step[]): void {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    expect(q.type).toBe('kruskal.accept');
    expect([prev.line, prev.vars.e]).toEqual([5, step.vars.e]);
    expect(prev.note).toBeUndefined();
    expect(prev.highlight.cycle).toBeUndefined();
    const [u, v] = step.highlight.edges![0].split('--');
    const T = g.edges.filter((e) => prev.highlight.treeEdges!.includes(edgeKey(g, e.u, e.v)));
    expect(q.answer.value).toBe(forestPath(T, u, v) === null);
  });
}

test('lecture example (slide 21): accepted and rejected edges, final T', () => {
  const steps = runKruskal(lecture.graph);
  assertValidTrace(kruskal, steps);
  expect(decisions(steps)).toEqual([
    '(c, d)+', '(b, d)+', '(e, f)+', '(a, r)+', '(c, f)+', '(d, f)-', '(f, g)+', '(g, h)+',
    '(c, e)-', '(d, r)+', '(e, h)-', '(c, r)-', '(a, c)-', '(b, r)-', '(a, e)-',
  ]);
  const end = last(steps);
  expect(end.line).toBe(8);
  expect(items(end, 1)).toEqual(['(c, d)', '(b, d)', '(e, f)', '(a, r)', '(c, f)', '(f, g)', '(g, h)', '(d, r)']);
  expect(end.note).toBe('T has 8 edges with total weight 29.');
});

test('lines 1–2: A is G.E in displayed order, then sorted stably by weight', () => {
  const steps = runKruskal(lecture.graph);
  expect(items(steps.find((s) => s.line === 1)!, 0).slice(0, 3)).toEqual(['(a, c): 7', '(a, e): 8', '(a, r): 4']);
  expect(items(steps.find((s) => s.line === 2)!, 0).slice(0, 8)).toEqual([
    '(c, d): 2', '(b, d): 3', '(e, f): 3', '(a, r): 4', '(c, f): 4', '(d, f): 4', '(f, g): 4', '(g, h): 4',
  ]);
});

test('big steps are the loop header; A marks the current index', () => {
  const steps = runKruskal(lecture.graph);
  const big = steps.filter((s) => s.bigStep);
  expect(big).toHaveLength(15);
  expect(big.every((s) => s.line === 4)).toBe(true);
  expect(big[5].ds[0]).toMatchObject({ kind: 'edges', name: 'A', current: 5 });
  expect(big[5].vars.i).toBe(6);
});

test('a rejected edge highlights the cycle it would close', () => {
  const steps = runKruskal(lecture.graph);
  const s = steps.find((x) => x.line === 6 && x.vars.e === '(d, f)')!;
  expect([...s.highlight.cycle!].sort()).toEqual(['c--d', 'c--f', 'd--f']);
  expect(s.note).toBe('T ∪ {(d, f)} has the cycle d – c – f – d.');
  expect(s.question!.explain).toBe('T already has the path d – c – f, so (d, f) would close a cycle.');
  const ok = steps.find((x) => x.line === 6 && x.vars.e === '(c, d)')!;
  expect(ok.highlight.cycle).toBeUndefined();
  expect(ok.note).toBe('T has no path between c and d, so T ∪ {(c, d)} is cycle free.');
});

test('equal weights follow the displayed G.E order', () => {
  // Swap (c, f) (index 7) and (d, f) (index 9) in G.E: now (d, f) comes first among the weight-4 edges.
  const g = moveInEdgeList(lecture.graph, 9, -2);
  const d = decisions(runKruskal(g));
  expect(d).toContain('(d, f)+');
  expect(d).toContain('(c, f)-');
  expect(last(runKruskal(g)).note).toBe('T has 8 edges with total weight 29.');
});

test('an edge drawn from r to a is named (a, r) in A and T', () => {
  const g: Graph = {
    directed: false,
    vertices: [{ id: 'a', x: 60, y: 60 }, { id: 'r', x: 200, y: 60 }],
    edges: [{ u: 'r', v: 'a', w: 3 }],
    adjOrder: {},
  };
  const end = last(runKruskal(g));
  expect(items(end, 0)).toEqual(['(a, r): 3']);
  expect(items(end, 1)).toEqual(['(a, r)']);
});

test('questions: one per edge, predictable from the step before', () => {
  const steps = runKruskal(lecture.graph);
  expect(steps.filter((s) => s.question)).toHaveLength(15);
  for (const p of kruskal.presets) checkPredictable(p.graph, runKruskal(p.graph));
});

test('validate blocks disconnected graphs', () => {
  expect(kruskal.validate(lecture.graph, {})).toEqual({ errors: [], warnings: [] });
  const split = removeEdge(removeEdge(lecture.graph, 'f', 'g'), 'e', 'h');
  expect(kruskal.validate(split, {}).errors).toEqual([
    'This graph is not connected. An MST needs a connected graph: add edges or remove the isolated part.',
  ]);
});

test('random connected graphs: T is an MST (brute force)', () => {
  const rand = mulberry32(8);
  let checked = 0;
  for (let n = 0; n < 60 && checked < 30; n++) {
    const g = randomWeightedGraph(rand);
    if (kruskal.validate(g, {}).errors.length > 0) continue;
    checked++;
    const steps = runKruskal(g);
    assertValidTrace(kruskal, steps);
    checkPredictable(g, steps);
    const T = last(steps).highlight.treeEdges!;
    expect(T).toHaveLength(g.vertices.length - 1);
    expect(g.edges.filter((e) => T.includes(edgeKey(g, e.u, e.v))).reduce((s, e) => s + e.w!, 0)).toBe(bruteForceMstWeight(g));
  }
  expect(checked).toBe(30); // if fewer connected graphs appear, change the seed — do not drop this line
});
