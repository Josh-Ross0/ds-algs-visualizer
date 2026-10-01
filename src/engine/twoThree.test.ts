import { fromShape, SLIDE_18, shapeOf } from '../structures/two-three/testing';
import { formatValue } from './trace';
import { emptyTree } from './tree';
import {
  findLeaf, fmtKey, initTree, isTwoThree, kids, leavesOf, newInternal, newLeaf, realKeys, realLeaves, twoThreeLayout,
} from './twoThree';

test('fmtKey and formatValue show NIL, +∞ and −∞', () => {
  expect([fmtKey(NaN), fmtKey(Infinity), fmtKey(-Infinity), fmtKey(-7), fmtKey(0)]).toEqual(['NIL', '+∞', '−∞', '-7', '0']);
  expect([formatValue(-Infinity), formatValue(Infinity)]).toEqual(['−∞', '∞']);
});

test('newLeaf and newInternal make unlinked nodes whose attributes are NIL', () => {
  const t = emptyTree();
  const leaf = newLeaf(t);
  const inner = newInternal(t);
  expect(t.nodes[leaf]).toMatchObject({ leaf: true, left: null, middle: null, right: null, p: null });
  expect(Number.isNaN(t.nodes[leaf].key)).toBe(true);
  expect(t.nodes[inner]).toMatchObject({ leaf: false, left: null, middle: null, right: null, p: null });
  expect([leaf, inner]).toEqual(['n1', 'n2']);
});

test('fromShape and shapeOf round-trip slide 18; helpers read leaves in order', () => {
  const t = fromShape(SLIDE_18);
  expect(shapeOf(t)).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (25 29 +inf)))');
  expect(realKeys(t)).toEqual([1, 4, 5, 7, 14, 19, 22, 25, 29]);
  expect(leavesOf(t)).toHaveLength(11);
  expect(realLeaves(t)).toHaveLength(9);
  expect(t.nodes[findLeaf(t, 14)!].key).toBe(14);
  expect(findLeaf(t, 13)).toBeNull();
  expect(findLeaf(t, Infinity)).toBeNull(); // sentinels are not real leaves
  expect(t.nodes[t.root!].key).toBe(Infinity); // an internal key is its subtree maximum
  expect(kids(t, t.root!)).toHaveLength(2);
});

test('kids skips NIL pointers and pointers to deleted nodes', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const leaf = findLeaf(t, 2)!;
  const parent = t.nodes[leaf].p!;
  delete t.nodes[leaf];
  expect(kids(t, parent)).toHaveLength(2);
});

test('initTree is the sentinel-only tree of 2_3_Init', () => {
  const t = initTree();
  expect(shapeOf(t)).toBe('(-inf +inf)');
  expect(t.nodes[t.root!].key).toBe(Infinity);
  expect([t.root, t.nodes[t.root!].left, t.nodes[t.root!].middle]).toEqual(['n1', 'n2', 'n3']);
  expect(isTwoThree(t)).toBe(true);
});

test('isTwoThree accepts valid trees and rejects each broken property', () => {
  expect(isTwoThree(fromShape(SLIDE_18))).toBe(true);
  expect(isTwoThree(fromShape([[-Infinity, 1], [2, 3, Infinity]]))).toBe(true);
  expect(isTwoThree(fromShape([[-Infinity, 2], [1, Infinity]]))).toBe(false); // keys out of order
  expect(isTwoThree(fromShape([-Infinity, [1, [2, Infinity]]]))).toBe(false); // leaves on two levels
  expect(isTwoThree(fromShape([[-Infinity], [1, Infinity]]))).toBe(false); // degree 1
  expect(isTwoThree(fromShape([[1, 2], [3, 4]]))).toBe(false); // no sentinels
  const wrongKey = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  wrongKey.nodes[wrongKey.root!].key = 5;
  expect(isTwoThree(wrongKey)).toBe(false); // internal key is not the subtree maximum
  const wrongParent = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  wrongParent.nodes[findLeaf(wrongParent, 1)!].p = null;
  expect(isTwoThree(wrongParent)).toBe(false); // inconsistent parent pointer
  const leaked = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  newLeaf(leaked, 9);
  expect(isTwoThree(leaked)).toBe(false); // a node the root cannot reach
});

test('twoThreeLayout: leaves evenly spaced on one row, internal nodes centred over their children', () => {
  const t = fromShape(SLIDE_18);
  const L = twoThreeLayout(t);
  const leaves = leavesOf(t);
  expect(leaves.map((id) => L.pos[id].x)).toEqual(leaves.map((_, i) => 32 + i * 44));
  expect(new Set(leaves.map((id) => L.pos[id].y))).toEqual(new Set([224]));
  expect(L.pos[t.root!].y).toBe(32);
  expect(L.pos[t.root!].x).toBeCloseTo(32 + 5.125 * 44); // (2.5 + 7.75) / 2 leaf slots
  expect([L.width, L.height]).toEqual([504, 256]);
});

test('twoThreeLayout places loose nodes (a new leaf, an orphaned subtree) to the right at the top', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const z = newLeaf(t, 7);
  const y = newInternal(t);
  const a = newLeaf(t, 8);
  const b = newLeaf(t, 9);
  t.nodes[y].left = a;
  t.nodes[y].middle = b;
  const L = twoThreeLayout(t);
  const mainRight = Math.max(...leavesOf(t).map((id) => L.pos[id].x));
  expect(L.pos[z].x).toBeGreaterThan(mainRight);
  expect(L.pos[z].y).toBe(32);
  expect(L.pos[y].x).toBeGreaterThan(mainRight);
  expect(L.pos[a].y).toBe(96);
  for (const p of Object.values(L.pos)) expect([Number.isFinite(p.x), Number.isFinite(p.y)]).toEqual([true, true]);
});

test('twoThreeLayout survives a node with two parents and a pointer to a deleted node', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const [left, right] = kids(t, t.root!);
  t.nodes[right].left = t.nodes[left].left; // two parents for one leaf
  const gone = newLeaf(t, 5);
  t.nodes[left].middle = gone;
  delete t.nodes[gone];
  const L = twoThreeLayout(t);
  for (const p of Object.values(L.pos)) expect([Number.isFinite(p.x), Number.isFinite(p.y)]).toEqual([true, true]);
});
