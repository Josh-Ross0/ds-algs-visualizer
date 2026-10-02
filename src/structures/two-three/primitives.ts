import type { NodeId } from '../../engine/tree';
import { fmtKey } from '../../engine/twoThree';
import type { TreeTracer } from '../tracer';
import type { TwoThreeView } from '../types';
import { SET_CHILDREN, UPDATE_KEY } from './pseudocode';

export type TT = TreeTracer<TwoThreeView>;

// A node as the variables line shows it: its key, NIL, or "deleted".
export function lab(tr: TT, id: NodeId | null): string {
  if (id === null) return 'NIL';
  const n = tr.tree.nodes[id];
  return n === undefined ? 'deleted' : fmtKey(n.key);
}

// Runs a callee in its own variables and call-stack frame, then restores the caller's.
export function inFrame<R>(tr: TT, frame: string, ptr: Record<string, NodeId | null>, body: () => R): R {
  const saved = { ptr: tr.ptr, extra: tr.extra, stack: tr.stack };
  tr.stack = [...tr.stack, frame];
  tr.ptr = ptr;
  tr.extra = {};
  const out = body();
  tr.ptr = saved.ptr;
  tr.extra = saved.extra;
  tr.stack = saved.stack;
  return out;
}

// After "delete y" the variable still exists in the lecture, but there is no node to point at.
export function dropVar(tr: TT, name: string): void {
  tr.ptr = Object.fromEntries(Object.entries(tr.ptr).filter(([n]) => n !== name));
}

export function traceUpdateKey(tr: TT, x: NodeId): void {
  const T = tr.tree;
  inFrame(tr, 'Update_Key(x)', { x }, () => {
    const n = T.nodes[x];
    n.key = T.nodes[n.left!].key;
    tr.emit(UPDATE_KEY, 1, { nodes: [x], edges: [n.left!], note: `x.key = x.left.key = ${fmtKey(n.key)}.` });
    const hasMiddle = (n.middle ?? null) !== null;
    tr.emit(UPDATE_KEY, 2, { nodes: [x], note: hasMiddle ? 'x.middle ≠ NIL.' : 'x.middle = NIL.' });
    if (hasMiddle) {
      n.key = T.nodes[n.middle!].key;
      tr.emit(UPDATE_KEY, 3, { nodes: [x], edges: [n.middle!], note: `x.key = x.middle.key = ${fmtKey(n.key)}.` });
    }
    const hasRight = n.right !== null;
    tr.emit(UPDATE_KEY, 4, { nodes: [x], note: hasRight ? 'x.right ≠ NIL.' : 'x.right = NIL.' });
    if (hasRight) {
      n.key = T.nodes[n.right!].key;
      tr.emit(UPDATE_KEY, 5, { nodes: [x], edges: [n.right!], note: `x.key = x.right.key = ${fmtKey(n.key)}.` });
    }
  });
}

export function traceSetChildren(tr: TT, x: NodeId, l: NodeId, m: NodeId | null, r: NodeId | null): void {
  const T = tr.tree;
  inFrame(tr, 'Set_Children(x, ℓ, m, r)', { x, 'ℓ': l, m, r }, () => {
    const n = T.nodes[x];
    n.left = l;
    n.middle = m;
    n.right = r;
    tr.emit(SET_CHILDREN, 1, {
      nodes: [x],
      edges: [l, m, r].filter((c): c is NodeId => c !== null),
      note: 'x gets the children ℓ, m and r.',
    });
    T.nodes[l].p = x;
    tr.emit(SET_CHILDREN, 2, { nodes: [l, x], note: 'ℓ.p = x.' });
    tr.emit(SET_CHILDREN, 3, { note: m === null ? 'm = NIL.' : 'm ≠ NIL.' });
    if (m !== null) {
      T.nodes[m].p = x;
      tr.emit(SET_CHILDREN, 4, { nodes: [m, x], note: 'm.p = x.' });
    }
    tr.emit(SET_CHILDREN, 5, { note: r === null ? 'r = NIL.' : 'r ≠ NIL.' });
    if (r !== null) {
      T.nodes[r].p = x;
      tr.emit(SET_CHILDREN, 6, { nodes: [r, x], note: 'r.p = x.' });
    }
    tr.emit(SET_CHILDREN, 7, { nodes: [x], note: 'Update_Key(x).' });
    traceUpdateKey(tr, x);
  });
}

// The call line of a procedure that calls Set_Children, then Set_Children itself.
export function callSetChildren(
  tr: TT, proc: string, line: number, x: NodeId, l: NodeId, m: NodeId | null, r: NodeId | null,
): void {
  tr.emit(proc, line, {
    nodes: [x],
    edges: [l, m, r].filter((c): c is NodeId => c !== null),
    note: `Set_Children with the children ${[l, m, r].map((c) => lab(tr, c)).join(', ')}.`,
  });
  traceSetChildren(tr, x, l, m, r);
}
