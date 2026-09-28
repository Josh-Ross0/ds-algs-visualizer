import { findKey, inorderSuccessor, keyOf, type Tree } from '../../engine/tree';
import { assertQuestionsPredictable } from '../../algorithms/testing';
import { assertValidTreeTrace } from '../testing';
import type { TreeStep } from '../types';
import { buildBst } from './model';
import { bstProcs } from './pseudocode';
import { runMinimum, runSearch, runSuccessor } from './queries';

// Slide-5 tree: inserting in this order reproduces the slide.
const LECTURE = [17, 4, 20, 1, 12, 18, 29, 9, 26, 6, 11, 23];
const lecture = () => buildBst(LECTURE);
const def = { procs: bstProcs };
const last = (s: TreeStep[]) => s[s.length - 1];
const answers = (s: TreeStep[], type: string) =>
  s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);

test('buildBst reproduces slide 5', () => {
  const t = lecture();
  const k = (id: string | null) => keyOf(t, id);
  const n = (key: number) => t.nodes[findKey(t, key)!];
  expect(k(t.root)).toBe(17);
  expect([k(n(17).left), k(n(17).right)]).toEqual([4, 20]);
  expect([k(n(4).left), k(n(4).right)]).toEqual([1, 12]);
  expect([k(n(20).left), k(n(20).right)]).toEqual([18, 29]);
  expect([k(n(12).left), k(n(12).right)]).toEqual([9, null]);
  expect([k(n(9).left), k(n(9).right)]).toEqual([6, 11]);
  expect([k(n(29).left), k(n(26).left)]).toEqual([26, 23]);
});

test('Tree_Search finds 12: call step, then 17 → 4 → 12', () => {
  const steps = runSearch(lecture(), 12);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['Tree_Search', 0]);
  expect(answers(steps, 'bst.search')).toEqual(['go left', 'go right', 'stop here']);
  expect([last(steps).line, last(steps).note]).toEqual([2, 'Returns the node with key 12.']);
  expect(last(steps).ds[0]).toEqual({ kind: 'stack', name: 'Call stack', items: ['Tree_Search(17, 12)', 'Tree_Search(4, 12)', 'Tree_Search(12, 12)'] });
});

test('Tree_Search for an absent key walks off the tree to a NIL slot', () => {
  const t = lecture();
  const steps = runSearch(t, 13);
  expect(answers(steps, 'bst.search')).toEqual(['go left', 'go right', 'go right', 'stop here']);
  const end = last(steps);
  expect([end.line, end.vars.x, end.note]).toEqual([2, null, 'Returns NIL: no node has key 13.']);
  expect(end.view.nil).toEqual({ parent: findKey(t, 12), side: 'right' });
});

test('Tree_Minimum from the root returns 1 and asks once', () => {
  const t = lecture();
  const steps = runMinimum(t);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'bst.minimum')).toEqual([findKey(t, 1)]);
  expect(steps.filter((s) => s.proc === 'Tree_Minimum' && s.line === 2).map((s) => s.vars.x)).toEqual([4, 1]);
  expect([last(steps).line, last(steps).note]).toEqual([3, 'Returns the node with key 1.']);
});

test('Tree_Successor: via Tree_Minimum (17 → 18), by climbing (12 → 17, 11 → 12), and NIL (29)', () => {
  const t = lecture();
  const s17 = runSuccessor(t, 17);
  assertValidTreeTrace(def, s17);
  expect(s17.some((s) => s.proc === 'Tree_Minimum')).toBe(true);
  expect(answers(s17, 'bst.successor')).toEqual([findKey(t, 18)]);
  expect(last(s17).note).toBe('Returns the node with key 18.');
  expect(answers(runSuccessor(t, 12), 'bst.successor')).toEqual([findKey(t, 17)]);
  expect(answers(runSuccessor(t, 11), 'bst.successor')).toEqual([findKey(t, 12)]);
  const s29 = runSuccessor(t, 29);
  expect(answers(s29, 'bst.successor')).toEqual([null]);
  expect([last(s29).line, last(s29).note]).toEqual([7, 'Returns NIL: x has the largest key.']);
});

test('queries leave the tree unchanged and never share snapshots', () => {
  const t = lecture();
  const before = structuredClone(t);
  const steps = runSearch(t, 6);
  expect(t).toEqual(before);
  expect(last(steps).view.tree).toEqual(before);
  expect(steps[0].view.tree).not.toBe(steps[1].view.tree);
});

function checkPredictable(steps: TreeStep[]) {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    const T: Tree = prev.view.tree;
    if (q.type === 'bst.search') {
      const x = step.view.tags.x ?? null;
      const k = step.vars.k as number;
      const want = x === null || T.nodes[x].key === k ? 'stop here' : k < T.nodes[x].key ? 'go left' : 'go right';
      expect(q.answer.value).toBe(want);
      expect(prev.note ?? '').not.toMatch(/Returns/);
    } else if (q.type === 'bst.minimum') {
      expect(prev.line).toBe(0);
      const order = Object.keys(T.nodes).sort((a, b) => T.nodes[a].key - T.nodes[b].key);
      expect(q.answer.value).toBe(order[0]);
    } else if (q.type === 'bst.successor') {
      expect(q.answer.value).toBe(inorderSuccessor(T, step.view.tags.x));
      expect(prev.note ?? '').not.toMatch(/Returns/);
    } else {
      throw new Error(`unexpected ${q.type}`);
    }
  });
}

test('questions are predictable from the step before them', () => {
  const t = lecture();
  for (const k of [12, 13, 1, 30]) checkPredictable(runSearch(t, k));
  checkPredictable(runMinimum(t));
  for (const k of LECTURE) checkPredictable(runSuccessor(t, k));
});
