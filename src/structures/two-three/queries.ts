import type { NodeId, Tree } from '../../engine/tree';
import { findLeaf, fmtKey, realLeaves } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import type { TwoThreeStep } from '../types';
import { lab } from './primitives';
import { TT_MINIMUM, TT_SEARCH, TT_SUCCESSOR } from './pseudocode';
import { minimumQuestion, searchQuestion, successorQuestion } from './questions';

export function runSearch(t0: Tree, k: number): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.extra = { k };
  let x: NodeId = T.root!;
  tr.ptr = { x };
  tr.stack = [`2_3_Search(${lab(tr, x)}, ${k})`];
  tr.emit(TT_SEARCH, 0, { nodes: [x], note: `2_3_Search(T.root, ${k})` });
  for (;;) {
    tr.ptr = { x };
    const n = T.nodes[x];
    const leaf = n.leaf === true;
    tr.emit(TT_SEARCH, 1, {
      bigStep: true,
      nodes: [x],
      note: leaf ? 'x is a leaf.' : 'x is not a leaf.',
      question: leaf ? undefined : searchQuestion(T, x, k),
    });
    if (leaf) {
      const hit = n.key === k;
      tr.emit(TT_SEARCH, 2, { nodes: [x], note: `x.key = ${fmtKey(n.key)} ${hit ? '==' : '≠'} k = ${k}.` });
      if (hit) tr.emit(TT_SEARCH, 3, { nodes: [x], note: `Returns the leaf with key ${k}.` });
      else tr.emit(TT_SEARCH, 4, { nodes: [x], note: `Returns NIL: no leaf has key ${k}.` });
      return tr.steps;
    }
    const [l, m, r] = [n.left!, n.middle!, n.right];
    const goLeft = k <= T.nodes[l].key;
    tr.emit(TT_SEARCH, 5, {
      nodes: [x], edges: [l], note: `k = ${k} ${goLeft ? '≤' : '>'} x.left.key = ${fmtKey(T.nodes[l].key)}.`,
    });
    let next: NodeId;
    let line: number;
    let side: string;
    if (goLeft) {
      next = l; line = 6; side = 'left';
    } else {
      const goMiddle = k <= T.nodes[m!].key;
      tr.emit(TT_SEARCH, 7, {
        nodes: [x], edges: [m!], note: `k = ${k} ${goMiddle ? '≤' : '>'} x.middle.key = ${fmtKey(T.nodes[m!].key)}.`,
      });
      if (goMiddle) { next = m!; line = 8; side = 'middle'; } else { next = r!; line = 9; side = 'right'; }
    }
    tr.emit(TT_SEARCH, line, { nodes: [x], edges: [next], note: `Recursive call on the ${side} child.` });
    tr.stack = [...tr.stack, `2_3_Search(${lab(tr, next)}, ${k})`];
    x = next;
  }
}

export function runMinimum(t0: Tree): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.showRoot = true;
  tr.stack = ['2_3_Minimum(T)'];
  const first = realLeaves(T)[0] ?? null;
  tr.emit(TT_MINIMUM, 0, { note: '2_3_Minimum(T)' });
  let x: NodeId = T.root!;
  tr.ptr = { x };
  tr.emit(TT_MINIMUM, 1, {
    nodes: [x],
    note: 'x = T.root.',
    question: first === null ? undefined : minimumQuestion(T, first),
  });
  for (;;) {
    const leaf = T.nodes[x].leaf === true;
    tr.emit(TT_MINIMUM, 2, { bigStep: true, nodes: [x], note: leaf ? 'x is a leaf, so the loop ends.' : 'x is not a leaf.' });
    if (leaf) break;
    x = T.nodes[x].left!;
    tr.ptr = { x };
    tr.emit(TT_MINIMUM, 3, { nodes: [x], edges: [x] });
  }
  x = T.nodes[T.nodes[x].p!].middle!;
  tr.ptr = { x };
  tr.emit(TT_MINIMUM, 4, { nodes: [x], note: 'x = x.p.middle: past the −∞ sentinel.' });
  const real = T.nodes[x].key !== Infinity;
  tr.emit(TT_MINIMUM, 5, { nodes: [x], note: real ? `x.key = ${fmtKey(T.nodes[x].key)} ≠ +∞.` : 'x.key = +∞.' });
  if (real) tr.emit(TT_MINIMUM, 6, { nodes: [x], note: `Returns the leaf with key ${fmtKey(T.nodes[x].key)}.` });
  else tr.emit(TT_MINIMUM, 7, { note: 'error: T is empty' });
  return tr.steps;
}

// x is the real leaf with key k.
export function runSuccessor(t0: Tree, k: number): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  const x0 = findLeaf(T, k)!;
  const order = realLeaves(T);
  const answer = order[order.indexOf(x0) + 1] ?? null;
  let x = x0;
  tr.ptr = { x };
  tr.stack = ['2_3_Successor(x)'];
  tr.emit(TT_SUCCESSOR, 0, { nodes: [x], note: `2_3_Successor(x) for the leaf with key ${k}` });
  let z = T.nodes[x].p!;
  tr.ptr = { x, z };
  tr.emit(TT_SUCCESSOR, 1, { nodes: [x, z], note: 'z = x.p.', question: successorQuestion(T, x, answer) });
  for (;;) {
    const zn = T.nodes[z];
    const climb = x === zn.right || (zn.right === null && x === zn.middle);
    tr.emit(TT_SUCCESSOR, 2, {
      bigStep: true, nodes: [x, z], note: climb ? 'x is the last child of z: keep climbing.' : 'x is not the last child of z.',
    });
    if (!climb) break;
    x = z;
    tr.ptr = { x, z };
    tr.emit(TT_SUCCESSOR, 3, { nodes: [x] });
    z = T.nodes[z].p!;
    tr.ptr = { x, z };
    tr.emit(TT_SUCCESSOR, 4, { nodes: [x, z] });
  }
  const fromLeft = x === T.nodes[z].left;
  tr.emit(TT_SUCCESSOR, 5, { nodes: [x, z], note: fromLeft ? 'x == z.left.' : 'x ≠ z.left.' });
  let y: NodeId;
  if (fromLeft) {
    y = T.nodes[z].middle!;
    tr.ptr = { x, z, y };
    tr.emit(TT_SUCCESSOR, 6, { nodes: [y], edges: [y] });
  } else {
    y = T.nodes[z].right!;
    tr.ptr = { x, z, y };
    tr.emit(TT_SUCCESSOR, 7, { nodes: [y], edges: [y] });
  }
  for (;;) {
    const leaf = T.nodes[y].leaf === true;
    tr.emit(TT_SUCCESSOR, 8, { bigStep: true, nodes: [y], note: leaf ? 'y is a leaf, so the loop ends.' : 'y is not a leaf.' });
    if (leaf) break;
    y = T.nodes[y].left!;
    tr.ptr = { x, z, y };
    tr.emit(TT_SUCCESSOR, 9, { nodes: [y], edges: [y] });
  }
  const real = T.nodes[y].key < Infinity;
  tr.emit(TT_SUCCESSOR, 10, { nodes: [y], note: real ? `y.key = ${fmtKey(T.nodes[y].key)} < +∞.` : 'y.key = +∞.' });
  if (real) tr.emit(TT_SUCCESSOR, 11, { nodes: [y], note: `Returns the leaf with key ${fmtKey(T.nodes[y].key)}.` });
  else tr.emit(TT_SUCCESSOR, 12, { nodes: [y], note: 'Returns NIL: x has the largest key.' });
  return tr.steps;
}
