import { cellId } from '../engine/heapArray';
import { inorder } from '../engine/tree';
import { fmtKey, realLeaves } from '../engine/twoThree';
import type { StructureView } from './types';

export type NodeOption = { id: string; label: string };

// What a node question can be answered with: BST nodes in key order, the heap's live cells in index order,
// or a 2-3 tree's real leaves in key order (never the sentinels).
export function nodeOptions(view: StructureView): NodeOption[] {
  if (view.kind === 'tree') return inorder(view.tree).map((id) => ({ id, label: String(view.tree.nodes[id].key) }));
  if (view.kind === 'two-three') return realLeaves(view.tree).map((id) => ({ id, label: fmtKey(view.tree.nodes[id].key) }));
  const { heap } = view;
  return heap.A.slice(0, heap.heapSize).map((key, j) => ({ id: cellId(heap, j + 1), label: String(key) }));
}
