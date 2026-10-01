import type { NodeId, Tree } from '../../engine/tree';
import { findLeaf } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import type { TwoThreeStep } from '../types';
import { callSetChildren, dropVar, inFrame, traceUpdateKey, type TT } from './primitives';
import { BORROW_OR_MERGE, TT_DELETE } from './pseudocode';
import { borrowMergeQuestion } from './questions';

const BOM = BORROW_OR_MERGE;

type Lines = { pick: number; test: number; borrow1: number; borrow2: number; merge1: number; del: number; merge2: number; ret: number };

// The three branches of the slide: y is z.left (lines 3–10), z.middle (12–19) or z.right (21–28).
const LEFT: Lines = { pick: 3, test: 4, borrow1: 5, borrow2: 6, merge1: 7, del: 8, merge2: 9, ret: 10 };
const MIDDLE: Lines = { pick: 12, test: 13, borrow1: 14, borrow2: 15, merge1: 16, del: 17, merge2: 18, ret: 19 };
const RIGHT: Lines = { pick: 21, test: 22, borrow1: 23, borrow2: 24, merge1: 25, del: 26, merge2: 27, ret: 28 };

// y has one child (y.left): borrow a child from a sibling x or merge x and y; returns the parent z.
export function traceBorrowOrMerge(tr: TT, y: NodeId): NodeId {
  const T = tr.tree;
  return inFrame(tr, 'Borrow_Or_Merge(y)', { y }, () => {
    const z = T.nodes[y].p!;
    const side = y === T.nodes[z].left ? 'left' : y === T.nodes[z].middle ? 'middle' : 'right';
    const x = side === 'middle' ? T.nodes[z].left! : T.nodes[z].middle!;
    const L = side === 'left' ? LEFT : side === 'middle' ? MIDDLE : RIGHT;
    tr.ptr = { y, z };
    tr.emit(BOM, 1, {
      bigStep: true,
      nodes: [y, z],
      note: 'z = y.p.',
      question: borrowMergeQuestion(T.nodes[x].right != null),
    });
    tr.emit(BOM, 2, { nodes: [y, z], note: side === 'left' ? 'y == z.left.' : 'y ≠ z.left.' });
    if (side !== 'left') tr.emit(BOM, 11, { nodes: [y, z], note: side === 'middle' ? 'y == z.middle.' : 'y ≠ z.middle.' });
    // line 20 is a comment (▷ y == z.right)

    tr.ptr = { y, z, x };
    tr.emit(BOM, L.pick, { nodes: [x], edges: [x], note: `x = z.${side === 'middle' ? 'left' : 'middle'}.` });
    const xn = T.nodes[x];
    const yChild = T.nodes[y].left!; // the one child y has left
    const hasRight = xn.right !== null;
    tr.emit(BOM, L.test, { nodes: [x], note: hasRight ? 'x.right ≠ NIL: x has three children.' : 'x.right = NIL: x has only two children.' });
    if (hasRight) {
      if (side === 'left') {
        callSetChildren(tr, BOM, L.borrow1, y, yChild, xn.left!, null);
        callSetChildren(tr, BOM, L.borrow2, x, xn.middle!, xn.right!, null);
      } else {
        callSetChildren(tr, BOM, L.borrow1, y, xn.right!, yChild, null);
        callSetChildren(tr, BOM, L.borrow2, x, xn.left!, xn.middle!, null);
      }
    } else {
      if (side === 'left') callSetChildren(tr, BOM, L.merge1, x, yChild, xn.left!, xn.middle!);
      else callSetChildren(tr, BOM, L.merge1, x, xn.left!, xn.middle!, yChild);
      delete T.nodes[y];
      dropVar(tr, 'y');
      tr.emit(BOM, L.del, { nodes: [x], note: 'delete y.' });
      if (side === 'right') callSetChildren(tr, BOM, L.merge2, z, T.nodes[z].left!, x, null);
      else callSetChildren(tr, BOM, L.merge2, z, x, T.nodes[z].right, null);
    }
    tr.emit(BOM, L.ret, { nodes: [z], note: 'Returns z, the parent of y and x.' });
    return z;
  });
}

// x is the real leaf with key k.
export function runDelete(t0: Tree, k: number): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.showRoot = true;
  const x = findLeaf(T, k)!;
  tr.ptr = { x };
  tr.stack = ['2_3_Delete(T, x)'];
  tr.emit(TT_DELETE, 0, { nodes: [x], note: `2_3_Delete(T, x) for the leaf with key ${k}` });
  let y: NodeId | null = T.nodes[x].p!;
  tr.ptr = { x, y };
  tr.emit(TT_DELETE, 1, { nodes: [x, y], note: 'y = x.p.' });
  const yn = T.nodes[y];
  const isLeft = x === yn.left;
  tr.emit(TT_DELETE, 2, { nodes: [x, y], note: isLeft ? 'x == y.left.' : 'x ≠ y.left.' });
  if (isLeft) {
    callSetChildren(tr, TT_DELETE, 3, y, yn.middle!, yn.right, null);
  } else {
    const isMiddle = x === yn.middle;
    tr.emit(TT_DELETE, 4, { nodes: [x, y], note: isMiddle ? 'x == y.middle.' : 'x ≠ y.middle: x is the right child.' });
    if (isMiddle) callSetChildren(tr, TT_DELETE, 5, y, yn.left!, yn.right, null);
    else callSetChildren(tr, TT_DELETE, 6, y, yn.left!, yn.middle!, null);
  }
  delete T.nodes[x];
  tr.ptr = { y };
  tr.emit(TT_DELETE, 7, { nodes: [y], note: 'delete x; deg(y) may now be below 2.' });
  for (;;) {
    tr.ptr = { y };
    tr.emit(TT_DELETE, 8, { bigStep: true, nodes: y === null ? [] : [y], note: y === null ? 'y == NIL: done.' : 'y ≠ NIL.' });
    if (y === null) return tr.steps;
    const hasMiddle = (T.nodes[y].middle ?? null) !== null;
    tr.emit(TT_DELETE, 9, { nodes: [y], note: hasMiddle ? 'y.middle ≠ NIL.' : 'y.middle = NIL: y has one child.' });
    if (hasMiddle) {
      tr.emit(TT_DELETE, 10, { nodes: [y], note: 'Update_Key(y).' });
      traceUpdateKey(tr, y);
      y = T.nodes[y].p;
      tr.ptr = { y };
      tr.emit(TT_DELETE, 11, { nodes: y === null ? [] : [y], note: 'y = y.p.' });
    } else {
      tr.emit(TT_DELETE, 12, { nodes: [y], note: 'y has only one child.' });
      const notRoot = y !== T.root;
      tr.emit(TT_DELETE, 13, { nodes: [y], note: notRoot ? 'y ≠ T.root.' : 'y == T.root.' });
      if (notRoot) {
        tr.emit(TT_DELETE, 14, { nodes: [y], note: 'y = Borrow_Or_Merge(y).' });
        y = traceBorrowOrMerge(tr, y);
      } else {
        const child = T.nodes[y].left!;
        T.root = child;
        tr.emit(TT_DELETE, 15, { nodes: [child], note: 'T.root = y.left: the tree shrinks one level.' });
        T.nodes[child].p = null;
        tr.emit(TT_DELETE, 16, { nodes: [child], note: 'y.left.p = NIL.' });
        delete T.nodes[y];
        tr.ptr = {};
        tr.emit(TT_DELETE, 17, { nodes: [child], note: 'delete y.' });
        tr.emit(TT_DELETE, 18, { note: 'Return.' });
        return tr.steps;
      }
    }
  }
}
