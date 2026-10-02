// Rooted binary tree with stable node ids (pointer model of the lecture: left, right, p).
export type NodeId = string;
// middle and leaf are used by 2-3 trees only (BST nodes leave them unset). A 2-3 internal node that has no
// children yet is not a leaf, so the flag cannot be derived from the pointers; key NaN means NIL.
export type TreeNode = {
  id: NodeId;
  key: number;
  left: NodeId | null;
  right: NodeId | null;
  p: NodeId | null;
  middle?: NodeId | null;
  leaf?: boolean;
};
export type Tree = { root: NodeId | null; nodes: Record<NodeId, TreeNode>; nextId: number };
// Where a NIL child is drawn when a walk steps off the tree.
export type NilSlot = { parent: NodeId; side: 'left' | 'right' };
export type Pos = { x: number; y: number };

export const TREE_SPACING = 44;
export const TREE_LEVEL = 64;
export const TREE_PAD = 32;

export function emptyTree(): Tree {
  return { root: null, nodes: {}, nextId: 1 };
}

// Adds an unlinked node (DS attributes NIL) and returns its id.
export function newNode(t: Tree, key: number): NodeId {
  const id = `n${t.nextId++}`;
  t.nodes[id] = { id, key, left: null, right: null, p: null };
  return id;
}

export function keyOf(t: Tree, id: NodeId | null): number | null {
  return id === null ? null : t.nodes[id].key;
}

// In-order ids of the nodes reachable from the root.
export function inorder(t: Tree): NodeId[] {
  const out: NodeId[] = [];
  const walk = (id: NodeId | null) => {
    if (id === null) return;
    walk(t.nodes[id].left);
    out.push(id);
    walk(t.nodes[id].right);
  };
  walk(t.root);
  return out;
}

export function size(t: Tree): number {
  return inorder(t).length;
}

export function findKey(t: Tree, k: number): NodeId | null {
  return inorder(t).find((id) => t.nodes[id].key === k) ?? null;
}

export function inorderSuccessor(t: Tree, x: NodeId): NodeId | null {
  const order = inorder(t);
  return order[order.indexOf(x) + 1] ?? null;
}

// Points parent's link (or the root) that held oldId at newId, and fixes newId.p.
export function replaceChild(t: Tree, parent: NodeId | null, oldId: NodeId, newId: NodeId | null): void {
  if (parent === null) t.root = newId;
  else if (t.nodes[parent].left === oldId) t.nodes[parent].left = newId;
  else t.nodes[parent].right = newId;
  if (newId !== null) t.nodes[newId].p = parent;
}

// Removes x, which has at most one child; the child (if any) takes x's place.
export function removeNode(t: Tree, x: NodeId): void {
  const n = t.nodes[x];
  replaceChild(t, n.p, x, n.left ?? n.right);
  delete t.nodes[x];
}

// Exchanges the positions of nodes a and b (the lecture's "swap x and y"); works when one is the other's child.
export function swapPositions(t: Tree, a: NodeId, b: NodeId): void {
  const swap = (id: NodeId | null) => (id === a ? b : id === b ? a : id);
  const A = t.nodes[a];
  const B = t.nodes[b];
  const la = { p: A.p, left: A.left, right: A.right };
  const lb = { p: B.p, left: B.left, right: B.right };
  for (const n of Object.values(t.nodes)) {
    if (n.id === a || n.id === b) continue;
    n.p = swap(n.p);
    n.left = swap(n.left);
    n.right = swap(n.right);
  }
  A.p = swap(lb.p); A.left = swap(lb.left); A.right = swap(lb.right);
  B.p = swap(la.p); B.left = swap(la.left); B.right = swap(la.right);
  t.root = swap(t.root);
}

// BST property (strict, keys unique) and consistent parent pointers.
export function isBst(t: Tree): boolean {
  if (t.root !== null && t.nodes[t.root].p !== null) return false;
  const order = inorder(t);
  for (let i = 1; i < order.length; i++) if (t.nodes[order[i - 1]].key >= t.nodes[order[i]].key) return false;
  return order.every((id) => {
    const n = t.nodes[id];
    return [n.left, n.right].every((c) => c === null || t.nodes[c].p === id);
  });
}

// x = in-order rank, y = depth; nodes not reachable from the root sit in one extra column at the top.
export function bstLayout(t: Tree, nil?: NilSlot): { pos: Record<NodeId, Pos>; nilPos?: Pos; width: number; height: number } {
  const pos: Record<NodeId, Pos> = {};
  const order = inorder(t);
  const depth: Record<NodeId, number> = {};
  const setDepth = (id: NodeId | null, d: number) => {
    if (id === null) return;
    depth[id] = d;
    setDepth(t.nodes[id].left, d + 1);
    setDepth(t.nodes[id].right, d + 1);
  };
  setDepth(t.root, 0);
  order.forEach((id, i) => { pos[id] = { x: TREE_PAD + i * TREE_SPACING, y: TREE_PAD + depth[id] * TREE_LEVEL }; });
  const detached = Object.keys(t.nodes).filter((id) => !(id in pos)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  detached.forEach((id, i) => { pos[id] = { x: TREE_PAD + (order.length + i) * TREE_SPACING, y: TREE_PAD }; });
  const nilPos = nil && pos[nil.parent]
    ? { x: pos[nil.parent].x + (nil.side === 'left' ? -1 : 1) * (TREE_SPACING / 2), y: pos[nil.parent].y + TREE_LEVEL }
    : undefined;
  const columns = Math.max(1, order.length + detached.length);
  const maxY = Math.max(TREE_PAD, ...Object.values(pos).map((p) => p.y), nilPos?.y ?? 0);
  return { pos, nilPos, width: 2 * TREE_PAD + (columns - 1) * TREE_SPACING, height: maxY + TREE_PAD };
}
