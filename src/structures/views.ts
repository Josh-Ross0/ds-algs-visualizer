import { cellId } from '../engine/heapArray';
import { inorder } from '../engine/tree';
import type { StructureView } from './types';

export type NodeOption = { id: string; label: string };

// What a node question can be answered with: tree nodes in key order, or the heap's live cells in index order.
export function nodeOptions(view: StructureView): NodeOption[] {
  if (view.kind === 'tree') return inorder(view.tree).map((id) => ({ id, label: String(view.tree.nodes[id].key) }));
  const { heap } = view;
  return heap.A.slice(0, heap.heapSize).map((key, j) => ({ id: cellId(heap, j + 1), label: String(key) }));
}
