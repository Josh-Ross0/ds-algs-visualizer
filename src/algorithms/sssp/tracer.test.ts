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
  expect(relaxSteps[0].note).toBe('a.d = ∞ > s.d + w(s, a) = 0 + 2.');
  expect(relaxSteps[1].note).toBe('a.d = s.d + w(s, a) = 0 + 2 = 2.');
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
  expect(relaxNote('s', 'a', 0, 2, Infinity)).toBe('a.d = ∞ > s.d + w(s, a) = 0 + 2.');
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
