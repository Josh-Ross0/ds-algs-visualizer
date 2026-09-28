import {
  bstLayout, emptyTree, findKey, inorder, inorderSuccessor, isBst, keyOf, newNode, removeNode,
  replaceChild, size, swapPositions, TREE_LEVEL, TREE_PAD, TREE_SPACING, type NodeId, type Tree,
} from './tree';

// Links a child under a parent (test helper; the real insert lives in structures/bst).
function link(t: Tree, parent: NodeId, child: NodeId, side: 'left' | 'right') {
  t.nodes[parent][side] = child;
  t.nodes[child].p = parent;
}

// 10 with children 5 and 15; 15 has a left child 12.
function sample() {
  const t = emptyTree();
  const a = newNode(t, 10), b = newNode(t, 5), c = newNode(t, 15), d = newNode(t, 12);
  t.root = a;
  link(t, a, b, 'left');
  link(t, a, c, 'right');
  link(t, c, d, 'left');
  return { t, a, b, c, d };
}

test('newNode gives stable increasing ids; unlinked nodes are not part of the tree', () => {
  const t = emptyTree();
  expect(newNode(t, 7)).toBe('n1');
  expect(newNode(t, 3)).toBe('n2');
  expect(size(t)).toBe(0);
  t.root = 'n1';
  expect(size(t)).toBe(1);
});

test('keyOf, findKey, inorder, inorderSuccessor', () => {
  const { t, a, b, c, d } = sample();
  expect(keyOf(t, d)).toBe(12);
  expect(keyOf(t, null)).toBeNull();
  expect(findKey(t, 15)).toBe(c);
  expect(findKey(t, 99)).toBeNull();
  expect(inorder(t)).toEqual([b, a, d, c]);
  expect(inorderSuccessor(t, a)).toBe(d);
  expect(inorderSuccessor(t, c)).toBeNull();
  expect(isBst(t)).toBe(true);
});

test('isBst catches an order violation and a broken parent pointer', () => {
  const { t, d } = sample();
  t.nodes[d].key = 20;
  expect(isBst(t)).toBe(false);
  const s = sample();
  s.t.nodes[s.d].p = s.a;
  expect(isBst(s.t)).toBe(false);
});

test('replaceChild and removeNode splice out a node with at most one child', () => {
  const { t, a, c, d } = sample();
  removeNode(t, c); // 15 has only a left child 12
  expect(t.nodes[a].right).toBe(d);
  expect(t.nodes[d].p).toBe(a);
  expect(t.nodes[c]).toBeUndefined();
  replaceChild(t, null, a, d);
  expect(t.root).toBe(d);
  const single = emptyTree();
  const only = newNode(single, 1);
  single.root = only;
  removeNode(single, only);
  expect(single.root).toBeNull();
  expect(size(single)).toBe(0);
});

test('swapPositions swaps two nodes, including a node and its own child', () => {
  const { t, a, c, d } = sample();
  swapPositions(t, a, d); // not adjacent
  expect(t.root).toBe(d);
  expect(t.nodes[c].left).toBe(a);
  expect(t.nodes[a].p).toBe(c);
  expect(t.nodes[d].right).toBe(c);
  const s = sample();
  swapPositions(s.t, s.c, s.d); // d is c's left child
  expect(s.t.nodes[s.a].right).toBe(s.d);
  expect(s.t.nodes[s.d].left).toBe(s.c);
  expect(s.t.nodes[s.c].p).toBe(s.d);
  expect(s.t.nodes[s.d].p).toBe(s.a);
});

test('bstLayout: x by in-order rank, y by depth; detached nodes in an extra column; NIL slot', () => {
  const { t, a, b, c, d } = sample();
  const z = newNode(t, 11); // detached (as during Tree_Insert)
  const L = bstLayout(t, { parent: d, side: 'left' });
  // In-order: b(5), a(10), d(12), c(15) → ranks 0..3; depth: a 0, b 1, c 1, d 2.
  expect(L.pos[b]).toEqual({ x: TREE_PAD, y: TREE_PAD + TREE_LEVEL });
  expect(L.pos[a]).toEqual({ x: TREE_PAD + TREE_SPACING, y: TREE_PAD });
  expect(L.pos[d]).toEqual({ x: TREE_PAD + 2 * TREE_SPACING, y: TREE_PAD + 2 * TREE_LEVEL });
  expect(L.pos[c]).toEqual({ x: TREE_PAD + 3 * TREE_SPACING, y: TREE_PAD + TREE_LEVEL });
  expect(L.pos[z]).toEqual({ x: TREE_PAD + 4 * TREE_SPACING, y: TREE_PAD });
  expect(L.nilPos).toEqual({ x: L.pos[d].x - TREE_SPACING / 2, y: L.pos[d].y + TREE_LEVEL });
  expect(L.width).toBe(2 * TREE_PAD + 4 * TREE_SPACING);
  expect(L.height).toBe(2 * TREE_PAD + 3 * TREE_LEVEL);
});

test('bstLayout of an empty tree still has a drawable size', () => {
  const L = bstLayout(emptyTree());
  expect(L.pos).toEqual({});
  expect(L.width).toBeGreaterThan(0);
  expect(L.height).toBeGreaterThan(0);
});
