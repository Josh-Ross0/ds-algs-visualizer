import { findLeaf, initTree } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import type { TwoThreeStep } from '../types';
import { checkTwoThreePredictable } from './predictable';
import { twoThreeProcs } from './pseudocode';
import { runMinimum, runSearch, runSuccessor } from './queries';
import { fromShape, SLIDE_18 } from './testing';

const def = { procs: twoThreeProcs };
const slide18 = () => fromShape(SLIDE_18);
const last = (s: TwoThreeStep[]) => s[s.length - 1];
const lines = (s: TwoThreeStep[]) => s.map((x) => x.line);
const answers = (s: TwoThreeStep[], type: string) => s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);

test('2_3_Search 14 on slide 18: left, middle, right, then the leaf', () => {
  const steps = runSearch(slide18(), 14);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['2_3_Search', 0]);
  expect(answers(steps, 'two3.search')).toEqual(['left child', 'middle child', 'right child']);
  expect(lines(steps)).toEqual([0, 1, 5, 6, 1, 5, 7, 8, 1, 5, 7, 9, 1, 2, 3]);
  expect(last(steps).note).toBe('Returns the leaf with key 14.');
  expect(last(steps).ds[0]).toEqual({
    kind: 'stack',
    name: 'Call stack',
    items: ['2_3_Search(+∞, 14)', '2_3_Search(14, 14)', '2_3_Search(14, 14)', '2_3_Search(14, 14)'],
  });
  checkTwoThreePredictable(steps);
});

test('2_3_Search offers only the left and middle child at a node with two children', () => {
  const steps = runSearch(slide18(), 14);
  const first = steps.find((s) => s.question)!.question!;
  expect(first.answer).toMatchObject({ kind: 'choice', options: ['left child', 'middle child'] });
  const third = steps.filter((s) => s.question)[2].question!;
  expect(third.answer).toMatchObject({ options: ['left child', 'middle child', 'right child'] });
});

test('2_3_Search for an absent key and for a key beyond the largest return NIL', () => {
  const t = slide18();
  const absent = runSearch(t, 13);
  expect(answers(absent, 'two3.search')).toEqual(['left child', 'middle child', 'right child']);
  expect(last(absent).note).toBe('Returns NIL: no leaf has key 13.');
  expect(last(absent).line).toBe(4);
  const beyond = runSearch(t, 30);
  expect(answers(beyond, 'two3.search')).toEqual(['middle child', 'middle child', 'right child']);
  expect(last(beyond).note).toBe('Returns NIL: no leaf has key 30.');
  checkTwoThreePredictable(absent);
  checkTwoThreePredictable(beyond);
});

test('2_3_Search on the empty tree and with negative keys', () => {
  const empty = runSearch(initTree(), 5);
  expect(answers(empty, 'two3.search')).toEqual(['middle child']);
  expect(last(empty).note).toBe('Returns NIL: no leaf has key 5.');
  expect(last(runSearch(slide18(), -3)).note).toBe('Returns NIL: no leaf has key -3.');
});

test('queries leave the tree unchanged', () => {
  const t = slide18();
  const before = structuredClone(t);
  runSearch(t, 7);
  runMinimum(t);
  runSuccessor(t, 4);
  expect(t).toEqual(before);
});

test('2_3_Minimum on slide 18 walks left to the −∞ sentinel, then steps to its sibling', () => {
  const t = slide18();
  const steps = runMinimum(t);
  assertValidTreeTrace(def, steps);
  expect(lines(steps)).toEqual([0, 1, 2, 3, 2, 3, 2, 3, 2, 4, 5, 6]);
  expect(answers(steps, 'two3.minimum')).toEqual([findLeaf(t, 1)]);
  expect(last(steps).note).toBe('Returns the leaf with key 1.');
  expect(steps[1].vars['T.root']).toBe(Infinity);
  checkTwoThreePredictable(steps);
});

test('2_3_Minimum on an empty tree runs to the error on line 7 and asks nothing', () => {
  const steps = runMinimum(initTree());
  assertValidTreeTrace(def, steps);
  expect(lines(steps)).toEqual([0, 1, 2, 3, 2, 4, 5, 7]);
  expect(last(steps).note).toBe('error: T is empty');
  expect(steps.some((s) => s.question)).toBe(false);
});

test('2_3_Successor by climbing and by descending: 4 → 5, 14 → 19', () => {
  const t = slide18();
  const s4 = runSuccessor(t, 4);
  assertValidTreeTrace(def, s4);
  expect(lines(s4)).toEqual([0, 1, 2, 3, 4, 2, 5, 6, 8, 9, 8, 10, 11]);
  expect(answers(s4, 'two3.successor')).toEqual([findLeaf(t, 5)]);
  expect(last(s4).note).toBe('Returns the leaf with key 5.');
  const s14 = runSuccessor(t, 14);
  expect(lines(s14)).toEqual([0, 1, 2, 3, 4, 2, 3, 4, 2, 5, 6, 8, 9, 8, 9, 8, 10, 11]);
  expect(answers(s14, 'two3.successor')).toEqual([findLeaf(t, 19)]);
  checkTwoThreePredictable(s4);
  checkTwoThreePredictable(s14);
});

test('2_3_Successor of the largest key reaches the +∞ sentinel and returns NIL', () => {
  const steps = runSuccessor(slide18(), 29);
  expect(lines(steps)).toEqual([0, 1, 2, 5, 7, 8, 10, 12]);
  expect(answers(steps, 'two3.successor')).toEqual([null]);
  expect(last(steps).note).toBe('Returns NIL: x has the largest key.');
  checkTwoThreePredictable(steps);
});

test('2_3_Successor of every real key matches the next key in order', () => {
  const t = slide18();
  const keys = [1, 4, 5, 7, 14, 19, 22, 25, 29];
  keys.forEach((k, i) => {
    const steps = runSuccessor(t, k);
    expect(answers(steps, 'two3.successor')).toEqual([i + 1 < keys.length ? findLeaf(t, keys[i + 1]) : null]);
    checkTwoThreePredictable(steps);
  });
});
