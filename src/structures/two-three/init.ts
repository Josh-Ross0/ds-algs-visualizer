import { emptyTree } from '../../engine/tree';
import { newInternal, newLeaf } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import type { TwoThreeStep } from '../types';
import { TT_INIT } from './pseudocode';

// 2_3_Init(T): builds the sentinel-only tree from nothing, so the tree on screen is ignored.
export function runInit(): TwoThreeStep[] {
  const tr = createTwoThreeTracer(emptyTree());
  const T = tr.tree;
  tr.showRoot = true;
  tr.stack = ['2_3_Init(T)'];
  tr.emit(TT_INIT, 0, { note: '2_3_Init(T): create an empty 2-3 tree.' });
  const x = newInternal(T);
  tr.ptr = { x };
  tr.emit(TT_INIT, 1, { nodes: [x], note: 'New internal node x; its attributes are NIL.' });
  const l = newLeaf(T);
  const m = newLeaf(T);
  tr.ptr = { x, 'ℓ': l, m };
  tr.emit(TT_INIT, 2, { nodes: [l, m], note: 'New leaves ℓ and m; their attributes are NIL.' });
  T.nodes[l].key = -Infinity;
  tr.emit(TT_INIT, 3, { nodes: [l], note: 'ℓ.key = −∞.' });
  T.nodes[m].key = Infinity;
  tr.emit(TT_INIT, 4, { nodes: [m], note: 'm.key = +∞.' });
  T.nodes[l].p = x;
  T.nodes[m].p = x;
  tr.emit(TT_INIT, 5, { nodes: [l, m, x], note: 'ℓ.p = m.p = x.' });
  T.nodes[x].key = Infinity;
  tr.emit(TT_INIT, 6, { nodes: [x], note: 'x.key = +∞.' });
  T.nodes[x].left = l;
  tr.emit(TT_INIT, 7, { nodes: [x], edges: [l], note: 'x.left = ℓ.' });
  T.nodes[x].middle = m;
  tr.emit(TT_INIT, 8, { nodes: [x], edges: [m], note: 'x.middle = m.' });
  T.root = x;
  tr.emit(TT_INIT, 9, { nodes: [x], note: 'T.root = x.' });
  return tr.steps;
}
