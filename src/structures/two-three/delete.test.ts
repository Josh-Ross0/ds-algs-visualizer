import { mulberry32 } from '../../algorithms/sssp/reference';
import { findLeaf, initTree, isTwoThree, realKeys } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import type { TwoThreeStep } from '../types';
import { runDelete } from './delete';
import { runInsert } from './insert';
import { checkTwoThreePredictable } from './predictable';
import { twoThreeProcs } from './pseudocode';
import { fromShape, SLIDE_18, shapeOf, type Shape } from './testing';

const def = { procs: twoThreeProcs };
const I = Infinity;
const slide18 = () => fromShape(SLIDE_18);
const last = (s: TwoThreeStep[]) => s[s.length - 1];
const result = (s: TwoThreeStep[]) => last(s).view.tree;
const answers = (s: TwoThreeStep[], type: string) => s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);
const linesOf = (s: TwoThreeStep[], proc: string) => s.filter((x) => x.proc === proc).map((x) => x.line);
const used = (s: TwoThreeStep[], proc: string, line: number) => s.some((x) => x.proc === proc && x.line === line);

test.each([
  [5, 3, '(((-inf 1 4) (7 14)) ((19 22) (25 29 +inf)))'],
  [7, 5, '(((-inf 1 4) (5 14)) ((19 22) (25 29 +inf)))'],
  [14, 6, '(((-inf 1 4) (5 7)) ((19 22) (25 29 +inf)))'],
])('delete %i from a three-leaf group takes the line %i branch and needs no Borrow_Or_Merge', (key, line, shape) => {
  const steps = runDelete(slide18(), key);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['2_3_Delete', 0]);
  expect(used(steps, '2_3_Delete', line)).toBe(true);
  expect(steps.some((s) => s.proc === 'Borrow_Or_Merge')).toBe(false);
  expect(steps.some((s) => s.question)).toBe(false);
  expect(shapeOf(result(steps))).toBe(shape);
  expect(isTwoThree(result(steps))).toBe(true);
  expect(last(steps).line).toBe(8); // the loop ends with y = NIL
});

test('delete 19: the group is left with one child, Borrow_Or_Merge borrows 25 from its right sibling', () => {
  const t = slide18();
  const steps = runDelete(t, 19);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'two3.borrowMerge')).toEqual(['borrow']);
  expect(linesOf(steps, 'Borrow_Or_Merge')).toEqual([1, 2, 3, 4, 5, 6, 10]);
  expect(shapeOf(result(steps))).toBe('(((-inf 1 4) (5 7 14)) ((22 25) (29 +inf)))');
  expect(steps.find((s) => s.proc === 'Borrow_Or_Merge' && s.line === 1)!.ds[0]).toMatchObject({ items: ['2_3_Delete(T, x)', 'Borrow_Or_Merge(y)'] });
  checkTwoThreePredictable(steps);
});

test('delete 22: a middle child removed from a two-leaf group also borrows', () => {
  const steps = runDelete(slide18(), 22);
  expect(used(steps, '2_3_Delete', 5)).toBe(true);
  expect(answers(steps, 'two3.borrowMerge')).toEqual(['borrow']);
  expect(shapeOf(result(steps))).toBe('(((-inf 1 4) (5 7 14)) ((19 25) (29 +inf)))');
  checkTwoThreePredictable(steps);
});

test('delete 19 then 22: two merges cascade up and the root collapses, so the tree loses a level', () => {
  const first = runDelete(slide18(), 19);
  const steps = runDelete(result(first), 22);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'two3.borrowMerge')).toEqual(['merge', 'merge']);
  expect(linesOf(steps, 'Borrow_Or_Merge')).toEqual([1, 2, 3, 4, 7, 8, 9, 10, 1, 2, 11, 12, 13, 16, 17, 18, 19]);
  for (const line of [15, 16, 17, 18]) expect(used(steps, '2_3_Delete', line)).toBe(true);
  expect([last(steps).proc, last(steps).line]).toEqual(['2_3_Delete', 18]);
  expect(shapeOf(result(steps))).toBe('((-inf 1 4) (5 7 14) (25 29 +inf))');
  expect(isTwoThree(result(steps))).toBe(true);
  expect(result(steps).nodes[result(steps).root!].p).toBeNull();
  checkTwoThreePredictable(steps);
});

const BOM_CASES: [string, Shape, number, string, string, number[]][] = [
  ['borrow from the left sibling (y is the middle child)', [[-I, 1, 2], [3, 4], [5, I]], 3, 'borrow', '((-inf 1) (2 4) (5 +inf))', [1, 2, 11, 12, 13, 14, 15, 19]],
  ['borrow from the middle sibling (y is the right child)', [[-I, 1], [2, 3, 4], [5, I]], 5, 'borrow', '((-inf 1) (2 3) (4 +inf))', [1, 2, 11, 21, 22, 23, 24, 28]],
  ['merge into the left sibling (y is the right child)', [[-I, 1], [2, 3], [5, I]], 5, 'merge', '((-inf 1) (2 3 +inf))', [1, 2, 11, 21, 22, 25, 26, 27, 28]],
  ['merge into the left sibling (y is the middle child)', [[-I, 1], [2, 3], [5, I]], 2, 'merge', '((-inf 1 3) (5 +inf))', [1, 2, 11, 12, 13, 16, 17, 18, 19]],
  ['merge with the right sibling without collapsing the root', [[-I, 1], [2, 3], [4, 5, I]], 1, 'merge', '((-inf 2 3) (4 5 +inf))', [1, 2, 3, 4, 7, 8, 9, 10]],
];

test.each(BOM_CASES)('Borrow_Or_Merge: %s', (_name, shape, key, answer, after, bomLines) => {
  const steps = runDelete(fromShape(shape), key);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'two3.borrowMerge')).toEqual([answer]);
  expect(linesOf(steps, 'Borrow_Or_Merge')).toEqual(bomLines);
  expect(shapeOf(result(steps))).toBe(after);
  expect(isTwoThree(result(steps))).toBe(true);
  expect(used(steps, '2_3_Delete', 15)).toBe(false); // no root collapse in these cases
  checkTwoThreePredictable(steps);
});

test('deleting the keys of a small tree one by one ends with only the sentinels', () => {
  let t = fromShape([[-I, 1], [2, 3, I]]);
  for (const [k, shape] of [[3, '((-inf 1) (2 +inf))'], [2, '(-inf 1 +inf)'], [1, '(-inf +inf)']] as const) {
    const steps = runDelete(t, k);
    assertValidTreeTrace(def, steps);
    checkTwoThreePredictable(steps);
    t = result(steps);
    expect(shapeOf(t)).toBe(shape);
    expect(isTwoThree(t)).toBe(true);
  }
  expect(realKeys(t)).toEqual([]);
  expect(shapeOf(result(runDelete(fromShape([[-I, 10], [20, I]]), 10)))).toBe('(-inf 20 +inf)');
});

test('delete frees the leaf at line 7 and its variable disappears; Borrow_Or_Merge runs on y', () => {
  const t = slide18();
  const x = findLeaf(t, 19)!;
  const steps = runDelete(t, 19);
  const afterLine7 = steps.find((s) => s.proc === '2_3_Delete' && s.line === 7)!;
  expect(x in afterLine7.view.tree.nodes).toBe(false);
  expect('x' in afterLine7.vars).toBe(false); // the freed leaf's variable is dropped, not left dangling
  const firstBorrowOrMerge = steps.find((s) => s.proc === 'Borrow_Or_Merge' && s.line === 1)!;
  expect(firstBorrowOrMerge.view.tags.y).toBeDefined();
});

test('delete does not mutate its input; T.root is tagged throughout', () => {
  const t = slide18();
  const before = structuredClone(t);
  const steps = runDelete(t, 19);
  expect(t).toEqual(before);
  expect(steps[0].vars['T.root']).toBe(Infinity);
});

test('random inserts and deletes keep a valid 2-3 tree with exactly the right keys, and questions are predictable', () => {
  const rand = mulberry32(9);
  let t = initTree();
  const model = new Set<number>();
  for (let n = 0; n < 300; n++) {
    const k = Math.floor(rand() * 24) - 4;
    const del = model.has(k) && rand() < 0.6;
    const steps = del ? runDelete(t, k) : model.has(k) ? null : runInsert(t, k);
    if (steps === null) continue;
    assertValidTreeTrace(def, steps);
    checkTwoThreePredictable(steps);
    t = result(steps);
    if (del) model.delete(k);
    else model.add(k);
    expect(isTwoThree(t)).toBe(true);
    expect(realKeys(t)).toEqual([...model].sort((a, b) => a - b));
  }
});
