import { edgeKey, removeEdge, weightOf, type Graph } from '../../engine/graph';
import type { DSView, Step } from '../../engine/trace';
import { bruteForceMstWeight, randomWeightedGraph } from '../mst/reference';
import { weightedGraph } from '../mst/shared';
import { mulberry32 } from '../sssp/reference';
import { assertQuestionsPredictable, assertValidTrace } from '../testing';
import { prim } from './index';
import { runPrim } from './run';

const lecture = prim.presets[0];
const last = (steps: Step[]) => steps[steps.length - 1];
const attr = (steps: Step[], key: string) =>
  Object.fromEntries(Object.entries(last(steps).vertexState).map(([v, a]) => [v, a[key]]));
const extracted = (steps: Step[]) => steps.filter((s) => s.line === 8).map((s) => s.vars.u);

function checkPredictable(g: Graph, steps: Step[]): void {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    if (q.type === 'prim.extract') {
      expect(prev.line).toBe(7);
      const Q = prev.ds[0] as Extract<DSView, { kind: 'keyed' }>;
      expect(Q.items[0].id).toBe(q.answer.value);
    } else if (q.type === 'prim.key') {
      const u = step.vars.u as string;
      const v = step.vars.v as string;
      expect([prev.line, prev.vars.u, prev.vars.v]).toEqual([9, u, v]);
      expect(prev.note).toBeUndefined();
      expect(prev.vertexState[v].inQ).toBe('yes');
      expect(q.answer.value).toBe(Math.min(prev.vertexState[v].key as number, weightOf(g, u, v)));
    } else {
      throw new Error(`unexpected question ${q.type}`);
    }
  });
}

test('lecture example (slide 12): extract order, key and π', () => {
  const steps = runPrim(lecture.graph, lecture.params);
  assertValidTrace(prim, steps);
  expect(extracted(steps)).toEqual(['r', 'a', 'd', 'c', 'b', 'f', 'e', 'g', 'h']);
  expect(attr(steps, 'key')).toEqual({ r: 0, a: 4, b: 3, c: 2, d: 5, e: 3, f: 4, g: 4, h: 4 });
  expect(attr(steps, 'pi')).toEqual({ r: null, a: 'r', b: 'd', c: 'd', d: 'r', e: 'f', f: 'c', g: 'f', h: 'g' });
  expect(last(steps).highlight.treeEdges!.sort()).toEqual(
    ['a--r', 'b--d', 'c--d', 'c--f', 'd--r', 'e--f', 'f--g', 'g--h'],
  );
  expect([last(steps).line, last(steps).note]).toEqual([7, 'Q = ∅, so the loop ends.']);
  expect(last(steps).highlight.settled).toHaveLength(9);
});

test('the slide 12 snapshot: r, a, d, c, b out of Q before f is extracted', () => {
  const steps = runPrim(lecture.graph, lecture.params);
  const i = steps.findIndex((s) => s.line === 8 && s.vars.u === 'f');
  expect(steps[i - 1].highlight.settled).toEqual(['a', 'b', 'c', 'd', 'r']);
});

test('line 10 runs for every scanned neighbor; lines 11–12 only on an update', () => {
  const steps = runPrim(lecture.graph, lecture.params);
  expect(steps.filter((s) => s.line === 10)).toHaveLength(30);
  expect(steps.filter((s) => s.line === 11)).toHaveLength(14);
  expect(steps.find((s) => s.line === 10 && s.vars.u === 'a' && s.vars.v === 'r')!.note).toBe('r ∉ Q.');
});

test('questions: one Extract_Min per vertex, one key question per edge', () => {
  const qs = runPrim(lecture.graph, lecture.params).filter((s) => s.question);
  expect(qs.filter((s) => s.question!.type === 'prim.extract')).toHaveLength(9);
  const keyQs = qs.filter((s) => s.question!.type === 'prim.key');
  expect(keyQs).toHaveLength(15);
  expect(keyQs[0].question!.answer).toEqual({ kind: 'number', value: 4 }); // u = r, v = a
  const ac = keyQs.find((s) => s.vars.u === 'a' && s.vars.v === 'c')!;
  expect(ac.question!.answer).toEqual({ kind: 'number', value: 6 }); // w(a, c) = 7 ≥ c.key = 6: unchanged
});

test('questions are predictable from the step shown before them', () => {
  for (const p of prim.presets) checkPredictable(p.graph, runPrim(p.graph, p.params));
});

test('ties: Extract_Min by label; w(u, v) equal to v.key keeps v.key', () => {
  const g = weightedGraph(
    [{ id: 'r', x: 60, y: 60 }, { id: 'a', x: 200, y: 60 }, { id: 'b', x: 130, y: 200 }],
    [['a', 'r', 1], ['b', 'r', 1], ['a', 'b', 1]],
  );
  const steps = runPrim(g, { r: 'r' });
  const ex = steps.filter((s) => s.line === 8);
  expect(ex.map((s) => s.vars.u)).toEqual(['r', 'a', 'b']);
  expect(ex[1].question!.explain).toMatch(/ties with b/);
  const ab = steps.find((s) => s.question?.type === 'prim.key' && s.vars.u === 'a' && s.vars.v === 'b')!;
  expect(ab.question!.answer).toEqual({ kind: 'number', value: 1 });
  expect(ab.note).toBe('b ∈ Q and w(a, b) = 1 ≥ b.key = 1.');
  expect(attr(steps, 'pi')).toEqual({ r: null, a: 'r', b: 'r' });
  checkPredictable(g, steps);
});

test('validate: root required and must exist; disconnected graphs blocked', () => {
  expect(prim.validate(lecture.graph, { r: 'r' })).toEqual({ errors: [], warnings: [] });
  expect(prim.validate(lecture.graph, {}).errors).toEqual(['Choose a root vertex r.']);
  expect(prim.validate(lecture.graph, { r: 'zz' }).errors).toEqual(['Choose a root vertex r.']);
  const split = removeEdge(removeEdge(lecture.graph, 'f', 'g'), 'e', 'h');
  expect(prim.validate(split, { r: 'r' }).errors).toEqual([
    'This graph is not connected. An MST needs a connected graph: add edges or remove the isolated part.',
  ]);
});

test('random connected graphs: the π-tree is an MST (brute force)', () => {
  const rand = mulberry32(5);
  let checked = 0;
  for (let n = 0; n < 60 && checked < 30; n++) {
    const g = randomWeightedGraph(rand);
    if (prim.validate(g, { r: 'a' }).errors.length > 0) continue;
    checked++;
    const steps = runPrim(g, { r: 'a' });
    assertValidTrace(prim, steps);
    checkPredictable(g, steps);
    const tree = last(steps).highlight.treeEdges!;
    expect(tree).toHaveLength(g.vertices.length - 1);
    const weight = g.edges.filter((e) => tree.includes(edgeKey(g, e.u, e.v))).reduce((s, e) => s + e.w!, 0);
    expect(weight).toBe(bruteForceMstWeight(g));
  }
  expect(checked).toBe(30); // if fewer connected graphs appear, change the seed — do not drop this line
});
