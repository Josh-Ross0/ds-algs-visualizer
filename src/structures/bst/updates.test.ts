import { assertQuestionsPredictable } from '../../algorithms/testing';
import { findKey, inorder, isBst, keyOf, size, type Tree } from '../../engine/tree';
import { mulberry32 } from '../../algorithms/sssp/reference';
import { assertValidTreeTrace } from '../testing';
import type { TreeStep } from '../types';
import { bst } from './index';
import { buildBst } from './model';
import { runDelete, runInsert } from './updates';

const LECTURE = [17, 4, 20, 1, 12, 18, 29, 9, 26, 6, 11, 23];
const last = (s: TreeStep[]) => s[s.length - 1];
const result = (s: TreeStep[]) => last(s).view.tree;
const keys = (t: Tree) => inorder(t).map((id) => t.nodes[id].key);
const answers = (s: TreeStep[], type: string) =>
  s.filter((x) => x.question?.type === type).map((x) => x.question!.answer.value);

test('Tree_Insert 10 on slide 5: left, right, left, right, left; 10 becomes 11.left', () => {
  const steps = runInsert(buildBst(LECTURE), 10);
  assertValidTreeTrace(bst, steps);
  expect(answers(steps, 'bst.insert')).toEqual(['left', 'right', 'left', 'right', 'left']);
  const t = result(steps);
  expect(isBst(t)).toBe(true);
  expect(keyOf(t, t.nodes[findKey(t, 11)!].left)).toBe(10);
  expect([last(steps).line, size(t)]).toEqual([13, 13]);
});

test('Tree_Insert into an empty tree runs lines 1–2', () => {
  const steps = runInsert(buildBst([]), 5);
  expect(steps.map((s) => s.line)).toEqual([0, 1, 2]);
  expect(keys(result(steps))).toEqual([5]);
});

test('z is drawn detached until it is linked on line 13/14', () => {
  const steps = runInsert(buildBst(LECTURE), 30);
  const z = last(steps).view.tags.z;
  const linked = (s: TreeStep) => inorder(s.view.tree).includes(z);
  expect(steps.filter((s) => s.line === 11).every((s) => !linked(s))).toBe(true);
  expect(linked(last(steps))).toBe(true);
  expect(last(steps).line).toBe(14);
});

test('delete case 1 (leaf 1), case 3 (26), case 2 (1 on a path)', () => {
  const leaf = runDelete(buildBst(LECTURE), 1);
  expect(answers(leaf, 'bst.deleteCase')).toEqual(['case 1: x is a leaf']);
  expect(keys(result(leaf))).toEqual([4, 6, 9, 11, 12, 17, 18, 20, 23, 26, 29]);
  const left = runDelete(buildBst(LECTURE), 26);
  expect(answers(left, 'bst.deleteCase')).toEqual(['case 3: only a left child']);
  const t = result(left);
  expect(keyOf(t, t.nodes[findKey(t, 29)!].left)).toBe(23);
  const right = runDelete(buildBst([1, 2, 3]), 1);
  expect(answers(right, 'bst.deleteCase')).toEqual(['case 2: only a right child']);
  expect(keyOf(result(right), result(right).root)).toBe(2);
  for (const s of [leaf, left, right]) {
    assertValidTreeTrace(bst, s);
    expect(isBst(result(s))).toBe(true);
  }
});

test('delete case 4 (17): Tree_Successor finds 18, 18 takes the root, 17 is removed as a leaf', () => {
  const steps = runDelete(buildBst(LECTURE), 17);
  assertValidTreeTrace(bst, steps);
  expect(answers(steps, 'bst.deleteCase')).toEqual(['case 4: two children']);
  expect(steps.some((s) => s.proc === 'Tree_Successor')).toBe(true);
  expect(steps.map((s) => s.line).filter((_l, i) => steps[i].proc === 'Delete')).toEqual([0, 1, 3, 5, 7, 8, 9, 10]);
  const t = result(steps);
  expect(keyOf(t, t.root)).toBe(18);
  expect(isBst(t)).toBe(true);
  expect(findKey(t, 17)).toBeNull();
  expect(last(steps).note).toBe('x now has no children (case 1), so it is removed.');
});

test('delete case 4 where the successor is x.right itself (9 → 11)', () => {
  const t = result(runDelete(buildBst(LECTURE), 9));
  expect(isBst(t)).toBe(true);
  const n11 = t.nodes[findKey(t, 11)!];
  expect([keyOf(t, n11.p), keyOf(t, n11.left), keyOf(t, n11.right)]).toEqual([12, 6, null]);
});

test('deleting the only node empties the tree; Minimum is then blocked, Insert still works', () => {
  const t = result(runDelete(buildBst([7]), 7));
  expect(t.root).toBeNull();
  expect(bst.validate(t, 'minimum', null)).toEqual(['Tree Minimum is undefined on an empty tree.']);
  expect(bst.validate(t, 'insert', 3)).toEqual([]);
});

test('validate: unique keys, existing nodes, node limit, missing key', () => {
  const t = buildBst(LECTURE);
  expect(bst.validate(t, 'insert', 12)).toEqual(['Key 12 is already in the tree (keys must be unique).']);
  expect(bst.validate(t, 'delete', 13)).toEqual(['No node with key 13.']);
  expect(bst.validate(t, 'successor', 13)).toEqual(['No node with key 13.']);
  expect(bst.validate(t, 'search', 13)).toEqual([]);
  expect(bst.validate(t, 'search', null)).toEqual(['Enter an integer key.']);
  const full = buildBst([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  expect(bst.validate(full, 'insert', 16)).toEqual(['The tree is limited to 15 nodes so it stays readable.']);
});

test('run dispatches every operation', () => {
  const t = buildBst(LECTURE);
  for (const op of bst.operations) {
    const k = op.input === 'none' ? null : op.id === 'insert' ? 5 : 12;
    expect(bst.validate(t, op.id, k)).toEqual([]);
    assertValidTreeTrace(bst, bst.run(t, op.id, k));
  }
});

function checkPredictable(steps: TreeStep[]) {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    const T = prev.view.tree;
    if (q.type === 'bst.insert') {
      expect(prev.line).toBe(7);
      expect(q.answer.value).toBe((step.vars.z as number) < (step.vars.y as number) ? 'left' : 'right');
    } else if (q.type === 'bst.deleteCase') {
      const x = T.nodes[step.view.tags.x];
      const want = x.left === null && x.right === null ? 'case 1: x is a leaf'
        : x.left === null ? 'case 2: only a right child'
        : x.right === null ? 'case 3: only a left child' : 'case 4: two children';
      expect(q.answer.value).toBe(want);
      expect(prev.line).toBe(0);
    } else if (q.type === 'bst.successor') {
      expect(prev.note ?? '').not.toMatch(/Returns/);
    } else {
      throw new Error(`unexpected ${q.type}`);
    }
  });
}

test('questions are predictable; random insert/delete sequences keep a valid BST', () => {
  const rand = mulberry32(21);
  let t = buildBst([]);
  const model = new Set<number>();
  for (let n = 0; n < 200; n++) {
    const k = 1 + Math.floor(rand() * 20);
    const op = model.has(k) ? 'delete' : 'insert';
    if (bst.validate(t, op, k).length > 0) continue;
    const steps = bst.run(t, op, k);
    assertValidTreeTrace(bst, steps);
    checkPredictable(steps);
    t = result(steps);
    if (op === 'insert') model.add(k);
    else model.delete(k);
    expect(isBst(t)).toBe(true);
    expect(keys(t)).toEqual([...model].sort((a, b) => a - b));
  }
});
