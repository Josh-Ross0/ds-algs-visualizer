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
