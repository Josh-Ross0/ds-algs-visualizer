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
      // Regression: the Relax line-1 note (shown over this question) must not reveal the answer.
      expect(prev.note ?? '').not.toMatch(new RegExp(`= ${String(ud + w).replace('-', '\\-')}\\.$`));
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
