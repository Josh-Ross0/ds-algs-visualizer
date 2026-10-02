import { isTwoThree } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import { runInit } from './init';
import { twoThreeProcs } from './pseudocode';
import { shapeOf } from './testing';

const def = { procs: twoThreeProcs };

test('every procedure has the slide line count', () => {
  const counts = Object.fromEntries(twoThreeProcs.map((p) => [p.name, p.lines.length]));
  expect(counts).toEqual({
    '2_3_Search': 9, '2_3_Minimum': 7, '2_3_Successor': 12, '2_3_Insert': 16, Insert_And_Split: 21,
    Set_Children: 7, Update_Key: 5, '2_3_Delete': 18, Borrow_Or_Merge: 28, '2_3_Init': 9,
  });
  expect(twoThreeProcs[0].name).toBe('2_3_Search');
});

test('2_3_Init runs lines 1–9 and leaves the sentinel-only tree', () => {
  const steps = runInit();
  assertValidTreeTrace(def, steps);
  expect(steps.map((s) => s.line)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(steps.every((s) => s.proc === '2_3_Init')).toBe(true);
  const t = steps.at(-1)!.view.tree;
  expect(shapeOf(t)).toBe('(-inf +inf)');
  expect(isTwoThree(t)).toBe(true);
  expect(steps.some((s) => s.question)).toBe(false);
});

test('2_3_Init builds the tree one attribute at a time; unset attributes are NIL', () => {
  const steps = runInit();
  expect(steps[1].vars).toMatchObject({ x: null, 'T.root': null }); // new internal node: key NIL, root NIL
  expect(steps[2].vars).toMatchObject({ 'ℓ': null, m: null });
  expect(steps[3].vars).toMatchObject({ 'ℓ': -Infinity, m: null });
  expect(steps[4].vars).toMatchObject({ 'ℓ': -Infinity, m: Infinity });
  expect(steps[6].vars.x).toBe(Infinity);
  expect(steps[9].vars['T.root']).toBe(Infinity);
  expect(steps[9].view.tags['T.root']).toBe(steps[9].view.tree.root);
  expect(steps[6].view.tree.root).toBeNull(); // not linked to T until line 9
});
