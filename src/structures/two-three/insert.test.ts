import { mulberry32 } from '../../algorithms/sssp/reference';
import { initTree, isTwoThree, realKeys } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import type { TwoThreeStep } from '../types';
import { runInsert } from './insert';
import { checkTwoThreePredictable } from './predictable';
import { twoThreeProcs } from './pseudocode';
import { fromShape, SLIDE_18, shapeOf } from './testing';

const def = { procs: twoThreeProcs };
const slide18 = () => fromShape(SLIDE_18);
const last = (s: TwoThreeStep[]) => s[s.length - 1];
const result = (s: TwoThreeStep[]) => last(s).view.tree;
const answers = (s: TwoThreeStep[], type: string) => s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);
const used = (s: TwoThreeStep[], proc: string, line: number) => s.some((x) => x.proc === proc && x.line === line);

test('insert 6 into slide 18: a split in the middle branch (lines 13–15), no root change', () => {
  const steps = runInsert(slide18(), 6);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['2_3_Insert', 0]);
  expect(answers(steps, 'two3.insertWalk')).toEqual(['left child', 'middle child', 'middle child']);
  expect(answers(steps, 'two3.split')).toEqual([true, false]);
  expect(answers(steps, 'two3.where')).toEqual(['after m']);
  expect(used(steps, 'Insert_And_Split', 14)).toBe(true);
  expect(used(steps, 'Insert_And_Split', 15)).toBe(true);
  expect(shapeOf(result(steps))).toBe('(((-inf 1 4) (5 6) (7 14)) ((19 22) (25 29 +inf)))');
  expect([last(steps).proc, last(steps).line]).toEqual(['2_3_Insert', 13]);
  checkTwoThreePredictable(steps);
});

test('insert 23 into slide 18: the "z before ℓ" split branch (lines 10–12)', () => {
  const steps = runInsert(slide18(), 23);
  expect(answers(steps, 'two3.insertWalk')).toEqual(['middle child', 'middle child', 'left child']);
  expect(answers(steps, 'two3.split')).toEqual([true, false]);
  expect(answers(steps, 'two3.where')).toEqual(['after m']);
  expect(used(steps, 'Insert_And_Split', 11)).toBe(true);
  expect(used(steps, 'Insert_And_Split', 12)).toBe(true);
  expect(shapeOf(result(steps))).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (23 25) (29 +inf)))');
  checkTwoThreePredictable(steps);
});

test('insert 2 and 30: the "z before r" branch (lines 16–18)', () => {
  const two = runInsert(slide18(), 2);
  expect(used(two, 'Insert_And_Split', 17)).toBe(true);
  expect(used(two, 'Insert_And_Split', 18)).toBe(true);
  expect(answers(two, 'two3.where')).toEqual(['between ℓ and m']);
  expect(shapeOf(result(two))).toBe('(((-inf 1) (2 4) (5 7 14)) ((19 22) (25 29 +inf)))');
  const thirty = runInsert(slide18(), 30);
  expect(used(thirty, 'Insert_And_Split', 17)).toBe(true);
  expect(shapeOf(result(thirty))).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (25 29) (30 +inf)))');
  checkTwoThreePredictable(two);
  checkTwoThreePredictable(thirty);
});

test('insert -5 and 100 next to the sentinels, and 20 without any split', () => {
  expect(shapeOf(result(runInsert(slide18(), -5)))).toBe('(((-inf -5) (1 4) (5 7 14)) ((19 22) (25 29 +inf)))');
  expect(shapeOf(result(runInsert(slide18(), 100)))).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (25 29) (100 +inf)))');
  const twenty = runInsert(slide18(), 20);
  expect(answers(twenty, 'two3.split')).toEqual([false]);
  expect(answers(twenty, 'two3.where')).toEqual(['between ℓ and m']);
  expect(used(twenty, 'Insert_And_Split', 6)).toBe(true);
  expect(shapeOf(result(twenty))).toBe('(((-inf 1 4) (5 7 14)) ((19 20 22) (25 29 +inf)))');
});

test('a split that cascades through the root (lines 19–20) makes the tree grow one level (lines 14–16)', () => {
  const t = fromShape([[-Infinity, 1], [2, 3], [4, 5, Infinity]]);
  const steps = runInsert(t, 6);
  assertValidTreeTrace(def, steps);
  expect(answers(steps, 'two3.insertWalk')).toEqual(['right child', 'right child']);
  expect(answers(steps, 'two3.split')).toEqual([true, true]);
  expect(used(steps, 'Insert_And_Split', 19)).toBe(true);
  expect(used(steps, 'Insert_And_Split', 20)).toBe(true);
  for (const line of [14, 15, 16]) expect(used(steps, '2_3_Insert', line)).toBe(true);
  expect(shapeOf(result(steps))).toBe('(((-inf 1) (2 3)) ((4 5) (6 +inf)))');
  expect(isTwoThree(result(steps))).toBe(true);
  checkTwoThreePredictable(steps);
});

test('the first key into an empty tree goes between the sentinels', () => {
  const steps = runInsert(initTree(), 5);
  expect(answers(steps, 'two3.insertWalk')).toEqual(['middle child']);
  expect(answers(steps, 'two3.split')).toEqual([false]);
  expect(answers(steps, 'two3.where')).toEqual(['between ℓ and m']);
  expect(shapeOf(result(steps))).toBe('(-inf 5 +inf)');
  expect(isTwoThree(result(steps))).toBe(true);
  checkTwoThreePredictable(steps);
});

test('call stack and variables: Set_Children and Update_Key run inside Insert_And_Split; T.root is tagged; z becomes NIL', () => {
  const t = slide18();
  const steps = runInsert(t, 20);
  const sc = steps.find((s) => s.proc === 'Set_Children' && s.line === 1)!;
  expect(sc.ds[0]).toMatchObject({ items: ['2_3_Insert(T, z)', 'Insert_And_Split(x, z)', 'Set_Children(x, ℓ, m, r)'] });
  const uk = steps.find((s) => s.proc === 'Update_Key')!;
  expect(uk.ds[0]).toMatchObject({ items: ['2_3_Insert(T, z)', 'Insert_And_Split(x, z)', 'Set_Children(x, ℓ, m, r)', 'Update_Key(x)'] });
  // Update_Key(root) transiently shows x.key = x.left.key on lines 1-2, before line 3 sets it to the middle key.
  const settled = steps.filter((s) => !(s.proc === 'Update_Key' && s.line <= 2));
  expect(settled.every((s) => s.vars['T.root'] === Infinity && s.view.tags['T.root'] === t.root)).toBe(true);
  const afterSplit = steps.find((s) => s.proc === '2_3_Insert' && s.line === 8 && s.vars.z === null)!;
  expect(afterSplit).toBeDefined(); // z = Insert_And_Split(x, z) returned NIL
  expect(steps[0].view.tree.nodes[steps[0].view.tags.z].leaf).toBe(true);
});

test('insert does not mutate its input, and a new leaf is detached until Set_Children links it', () => {
  const t = slide18();
  const before = structuredClone(t);
  const steps = runInsert(t, 20);
  expect(t).toEqual(before);
  const z = steps[0].view.tags.z;
  expect(steps[0].view.tree.nodes[z]).toMatchObject({ leaf: true, key: 20, p: null });
});

test('random inserts keep a valid 2-3 tree with exactly the inserted keys, and every question is predictable', () => {
  const rand = mulberry32(3);
  let t = initTree();
  const model = new Set<number>();
  for (let n = 0; n < 150; n++) {
    const k = Math.floor(rand() * 60) - 20;
    if (model.has(k)) continue;
    const steps = runInsert(t, k);
    assertValidTreeTrace(def, steps);
    checkTwoThreePredictable(steps);
    t = result(steps);
    model.add(k);
    expect(isTwoThree(t)).toBe(true);
    expect(realKeys(t)).toEqual([...model].sort((a, b) => a - b));
  }
});
