import type { NodeId, Tree } from '../../engine/tree';
import { fmtKey, newInternal, newLeaf } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import type { TwoThreeStep } from '../types';
import { callSetChildren, inFrame, traceSetChildren, traceUpdateKey, type TT } from './primitives';
import { INSERT_AND_SPLIT, TT_INSERT } from './pseudocode';
import { insertWalkQuestion, splitQuestion, whereQuestion } from './questions';

const IAS = INSERT_AND_SPLIT;

// Insert z as a child of x; returns the new node y when x had to split, otherwise NIL.
export function traceInsertAndSplit(tr: TT, x: NodeId, z: NodeId): NodeId | null {
  const T = tr.tree;
  return inFrame(tr, 'Insert_And_Split(x, z)', { x, z }, () => {
    const n = T.nodes[x];
    const [l, m, r] = [n.left!, n.middle!, n.right];
    const zk = T.nodes[z].key;
    const frame: Record<string, NodeId | null> = { x, z, 'ℓ': l, m, r };
    tr.ptr = frame;
    tr.emit(IAS, 1, {
      bigStep: true,
      nodes: [x],
      edges: [l, m, ...(r === null ? [] : [r])],
      note: '⟨ℓ, m, r⟩ = the children of x.',
      question: splitQuestion(r !== null),
    });
    tr.emit(IAS, 2, { nodes: [x], note: r === null ? 'r == NIL: x has only two children.' : 'r ≠ NIL: x has three children.' });

    if (r === null) {
      const beforeL = zk < T.nodes[l].key;
      tr.emit(IAS, 3, {
        nodes: [z, l],
        note: `z.key = ${fmtKey(zk)} ${beforeL ? '<' : '>'} ℓ.key = ${fmtKey(T.nodes[l].key)}.`,
        question: whereQuestion(T, x, z),
      });
      if (beforeL) {
        callSetChildren(tr, IAS, 4, x, z, l, m);
      } else {
        const beforeM = zk < T.nodes[m].key;
        tr.emit(IAS, 5, { nodes: [z, m], note: `z.key = ${fmtKey(zk)} ${beforeM ? '<' : '>'} m.key = ${fmtKey(T.nodes[m].key)}.` });
        if (beforeM) callSetChildren(tr, IAS, 6, x, l, z, m);
        else callSetChildren(tr, IAS, 7, x, l, m, z);
      }
      tr.emit(IAS, 8, { nodes: [x], note: 'Returns NIL: x did not split.' });
      return null;
    }

    const y = newInternal(T);
    tr.ptr = { ...frame, y };
    tr.emit(IAS, 9, { nodes: [y], note: 'New internal node y, the right half of the split.' });
    const lt = (a: NodeId) => zk < T.nodes[a].key;
    tr.emit(IAS, 10, { nodes: [z, l], note: `z.key = ${fmtKey(zk)} ${lt(l) ? '<' : '>'} ℓ.key = ${fmtKey(T.nodes[l].key)}.` });
    if (lt(l)) {
      callSetChildren(tr, IAS, 11, x, z, l, null);
      callSetChildren(tr, IAS, 12, y, m, r, null);
    } else {
      tr.emit(IAS, 13, { nodes: [z, m], note: `z.key = ${fmtKey(zk)} ${lt(m) ? '<' : '>'} m.key = ${fmtKey(T.nodes[m].key)}.` });
      if (lt(m)) {
        callSetChildren(tr, IAS, 14, x, l, z, null);
        callSetChildren(tr, IAS, 15, y, m, r, null);
      } else {
        tr.emit(IAS, 16, { nodes: [z, r], note: `z.key = ${fmtKey(zk)} ${lt(r) ? '<' : '>'} r.key = ${fmtKey(T.nodes[r].key)}.` });
        if (lt(r)) {
          callSetChildren(tr, IAS, 17, x, l, m, null);
          callSetChildren(tr, IAS, 18, y, z, r, null);
        } else {
          callSetChildren(tr, IAS, 19, x, l, m, null);
          callSetChildren(tr, IAS, 20, y, r, z, null);
        }
      }
    }
    tr.emit(IAS, 21, { nodes: [y], note: 'Returns y, the new right sibling of x.' });
    return y;
  });
}

export function runInsert(t0: Tree, k: number): TwoThreeStep[] {
  const tr = createTwoThreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.showRoot = true;
  const z0 = newLeaf(T, k);
  let z: NodeId | null = z0;
  tr.ptr = { z };
  tr.stack = ['2_3_Insert(T, z)'];
  tr.emit(TT_INSERT, 0, { nodes: [z0], note: `2_3_Insert(T, z) with z.key = ${k}` });
  let y: NodeId = T.root!;
  tr.ptr = { z, y };
  tr.emit(TT_INSERT, 1, { nodes: [y], note: 'y = T.root.' });
  for (;;) {
    const yn = T.nodes[y];
    const leaf = yn.leaf === true;
    tr.emit(TT_INSERT, 2, {
      bigStep: true,
      nodes: [y],
      note: leaf ? 'y is a leaf, so the loop ends.' : 'y is not a leaf.',
      question: leaf ? undefined : insertWalkQuestion(T, y, k),
    });
    if (leaf) break;
    const [l, m, r] = [yn.left!, yn.middle!, yn.right];
    if (k < T.nodes[l].key) {
      y = l;
      tr.ptr = { z, y };
      tr.emit(TT_INSERT, 3, { nodes: [y], edges: [y], note: `z.key = ${k} < y.left.key: y = y.left.` });
    } else {
      tr.emit(TT_INSERT, 3, { nodes: [y], note: `z.key = ${k} > y.left.key = ${fmtKey(T.nodes[l].key)}.` });
      if (k < T.nodes[m].key) {
        y = m;
        tr.ptr = { z, y };
        tr.emit(TT_INSERT, 4, { nodes: [y], edges: [y], note: `z.key = ${k} < y.middle.key: y = y.middle.` });
      } else {
        tr.emit(TT_INSERT, 4, { nodes: [y], note: `z.key = ${k} > y.middle.key = ${fmtKey(T.nodes[m].key)}.` });
        y = r!;
        tr.ptr = { z, y };
        tr.emit(TT_INSERT, 5, { nodes: [y], edges: [y], note: 'y = y.right.' });
      }
    }
  }
  let x: NodeId = T.nodes[y].p!;
  tr.ptr = { z, y, x };
  tr.emit(TT_INSERT, 6, { nodes: [y, x], note: 'x = y.p, the parent of the new leaf.' });
  tr.emit(TT_INSERT, 7, { nodes: [x, z0], note: 'z = Insert_And_Split(x, z).' });
  z = traceInsertAndSplit(tr, x, z0);
  for (;;) {
    tr.ptr = { z, y, x };
    const more = x !== T.root;
    tr.emit(TT_INSERT, 8, { bigStep: true, nodes: [x], note: more ? 'x ≠ T.root.' : 'x == T.root, so the loop ends.' });
    if (!more) break;
    x = T.nodes[x].p!;
    tr.ptr = { z, y, x };
    tr.emit(TT_INSERT, 9, { nodes: [x], note: 'x = x.p.' });
    tr.emit(TT_INSERT, 10, { nodes: [x], note: z !== null ? 'z ≠ NIL.' : 'z = NIL.' });
    if (z !== null) {
      tr.emit(TT_INSERT, 11, { nodes: [x, z], note: 'z = Insert_And_Split(x, z).' });
      z = traceInsertAndSplit(tr, x, z);
    } else {
      tr.emit(TT_INSERT, 12, { nodes: [x], note: 'Update_Key(x).' });
      traceUpdateKey(tr, x);
    }
  }
  tr.ptr = { z, y, x };
  tr.emit(TT_INSERT, 13, { note: z !== null ? 'z ≠ NIL: the root split.' : 'z = NIL.' });
  if (z !== null) {
    const w = newInternal(T);
    tr.ptr = { z, y, x, w };
    tr.emit(TT_INSERT, 14, { nodes: [w], note: 'New internal node w, the new root.' });
    tr.emit(TT_INSERT, 15, { nodes: [w, x, z], note: 'Set_Children(w, x, z, NIL).' });
    traceSetChildren(tr, w, x, z, null);
    T.root = w;
    tr.emit(TT_INSERT, 16, { nodes: [w], note: 'T.root = w: the tree grows one level.' });
  }
  return tr.steps;
}
