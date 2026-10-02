import { emptyTree, type NodeId, type Tree } from '../../engine/tree';
import { kids, newInternal, newLeaf } from '../../engine/twoThree';

// A tree written as nested arrays: a number is a leaf key, an array an internal node (2 or 3 children).
export type Shape = number | Shape[];

// Slide 18 with the two sentinels joined to the first and last leaf groups.
export const SLIDE_18: Shape = [[[-Infinity, 1, 4], [5, 7, 14]], [[19, 22], [25, 29, Infinity]]];

export function fromShape(shape: Shape): Tree {
  const t = emptyTree();
  const make = (s: Shape): NodeId => {
    if (typeof s === 'number') return newLeaf(t, s);
    const x = newInternal(t);
    const cs = s.map(make);
    const n = t.nodes[x];
    n.left = cs[0];
    n.middle = cs[1] ?? null;
    n.right = cs[2] ?? null;
    cs.forEach((c) => { t.nodes[c].p = x; });
    n.key = t.nodes[cs[cs.length - 1]].key;
    return x;
  };
  t.root = make(shape);
  return t;
}

// ASCII form of a tree for comparisons: ((−∞ 1) (2 3 +∞)) is "((-inf 1) (2 3 +inf))".
export function shapeOf(t: Tree): string {
  const show = (id: NodeId): string => {
    const n = t.nodes[id];
    if (n.leaf) return n.key === -Infinity ? '-inf' : n.key === Infinity ? '+inf' : String(n.key);
    return `(${kids(t, id).map(show).join(' ')})`;
  };
  return t.root === null ? '' : show(t.root);
}
