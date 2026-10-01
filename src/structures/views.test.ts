import { makeHeap } from '../engine/heapArray';
import { buildBst } from './bst/model';
import { nodeOptions } from './views';

test('nodeOptions: tree nodes in key order', () => {
  const t = buildBst([10, 5, 15]);
  const view = { kind: 'tree' as const, tree: t, highlight: { nodes: [], edges: [] }, tags: {} };
  expect(nodeOptions(view)).toEqual([{ id: 'n2', label: '5' }, { id: 'n1', label: '10' }, { id: 'n3', label: '15' }]);
});

test('nodeOptions: only the heap cells up to heap-size, in index order, by cell id', () => {
  const heap = makeHeap([2, 5, 3, 9], 15, 3); // A[4] = 9 is a stale cell
  const view = { kind: 'heap' as const, heap, highlight: { cells: [], edges: [] }, tags: {} };
  expect(nodeOptions(view)).toEqual([{ id: '1', label: '2' }, { id: '2', label: '5' }, { id: '3', label: '3' }]);
});
