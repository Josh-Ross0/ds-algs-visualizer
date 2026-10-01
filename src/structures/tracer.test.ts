import { emptyTree, newNode } from '../engine/tree';
import { newInternal, newLeaf } from '../engine/twoThree';
import { createTreeTracer, createTwoThreeTracer } from './tracer';

test('the BST tracer still stamps kind "tree"', () => {
  const t = emptyTree();
  const a = newNode(t, 5);
  t.root = a;
  const tr = createTreeTracer(t);
  tr.ptr = { x: a };
  tr.emit('P', 1);
  expect(tr.steps[0].view.kind).toBe('tree');
  expect(tr.steps[0].vars).toEqual({ x: 5 });
  expect(tr.steps[0].view.tags).toEqual({ x: a });
});

test('the 2-3 tracer stamps kind "two-three"; a NIL key shows as NIL, a deleted node as "deleted" without a tag', () => {
  const t = emptyTree();
  const y = newInternal(t); // key NaN = NIL
  const z = newLeaf(t, 4);
  const gone = newLeaf(t, 9);
  delete t.nodes[gone];
  const tr = createTwoThreeTracer(t);
  tr.ptr = { y, z, w: gone, v: null };
  tr.emit('P', 1);
  const s = tr.steps[0];
  expect(s.view.kind).toBe('two-three');
  expect(s.vars).toEqual({ y: null, z: 4, w: 'deleted', v: null });
  expect(s.view.tags).toEqual({ y, z });
});

test('showRoot lists T.root in the variables and tags the root node', () => {
  const t = emptyTree();
  const tr = createTwoThreeTracer(t);
  tr.showRoot = true;
  tr.emit('P', 1);
  const r = newInternal(t);
  t.nodes[r].key = Infinity;
  t.root = r;
  tr.emit('P', 2);
  expect([tr.steps[0].vars['T.root'], 'T.root' in tr.steps[0].view.tags]).toEqual([null, false]);
  expect([tr.steps[1].vars['T.root'], tr.steps[1].view.tags['T.root']]).toEqual([Infinity, r]);
});
