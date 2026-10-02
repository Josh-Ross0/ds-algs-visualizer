import { emptyTree, TREE_LEVEL, TREE_PAD, TREE_SPACING, type NodeId, type Pos, type Tree } from './tree';

export const fmtKey = (k: number): string =>
  Number.isNaN(k) ? 'NIL' : k === Infinity ? '+∞' : k === -Infinity ? '−∞' : String(k);

// A new unlinked leaf; like every DS attribute its key starts NIL (NaN) unless given.
export function newLeaf(t: Tree, key = NaN): NodeId {
  const id = `n${t.nextId++}`;
  t.nodes[id] = { id, key, left: null, middle: null, right: null, p: null, leaf: true };
  return id;
}

export function newInternal(t: Tree): NodeId {
  const id = `n${t.nextId++}`;
  t.nodes[id] = { id, key: NaN, left: null, middle: null, right: null, p: null, leaf: false };
  return id;
}

export const isLeaf = (t: Tree, id: NodeId): boolean => t.nodes[id].leaf === true;

// Children in order, skipping NIL and pointers to nodes that were already deleted.
export function kids(t: Tree, id: NodeId): NodeId[] {
  const n = t.nodes[id];
  return [n.left, n.middle ?? null, n.right].filter((c): c is NodeId => c !== null && c in t.nodes);
}

// Leaves reachable from the root, left to right.
export function leavesOf(t: Tree): NodeId[] {
  const out: NodeId[] = [];
  const walk = (id: NodeId) => {
    if (t.nodes[id].leaf) out.push(id);
    else kids(t, id).forEach(walk);
  };
  if (t.root !== null) walk(t.root);
  return out;
}

// Leaves other than the two sentinels.
export const realLeaves = (t: Tree): NodeId[] => leavesOf(t).filter((id) => Number.isFinite(t.nodes[id].key));
export const findLeaf = (t: Tree, k: number): NodeId | null => realLeaves(t).find((id) => t.nodes[id].key === k) ?? null;
export const realKeys = (t: Tree): number[] => realLeaves(t).map((id) => t.nodes[id].key);

// 2_3_Init without the steps: an internal root over the two sentinel leaves.
export function initTree(): Tree {
  const t = emptyTree();
  const x = newInternal(t);
  const l = newLeaf(t, -Infinity);
  const m = newLeaf(t, Infinity);
  t.nodes[l].p = x;
  t.nodes[m].p = x;
  t.nodes[x].key = Infinity;
  t.nodes[x].left = l;
  t.nodes[x].middle = m;
  t.root = x;
  return t;
}

// The 2-3 properties of slide 17: internal degree 2–3, all leaves on one level, ordered keys,
// each internal key the maximum of its subtree; plus consistent parents, the sentinels at the ends
// and no node the root cannot reach.
export function isTwoThree(t: Tree): boolean {
  if (t.root === null || t.nodes[t.root].p !== null) return false;
  const seen = new Set<NodeId>();
  let leafDepth = -1;
  let last = null as number | null; // assigned inside walk(); the cast stops TypeScript narrowing it to null
  let first = true;
  const walk = (id: NodeId, depth: number): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    const n = t.nodes[id];
    const ks = kids(t, id);
    if (n.leaf) {
      if (ks.length > 0) return false;
      if (leafDepth === -1) leafDepth = depth;
      if (depth !== leafDepth) return false;
      if (first && n.key !== -Infinity) return false;
      first = false;
      if (last !== null && !(n.key > last)) return false;
      last = n.key;
      return true;
    }
    if (ks.length < 2 || ks.length > 3) return false;
    if (n.left === null || (n.middle ?? null) === null) return false;
    for (const c of ks) {
      if (t.nodes[c].p !== id || !walk(c, depth + 1)) return false;
    }
    return n.key === t.nodes[ks[ks.length - 1]].key;
  };
  return walk(t.root, 0) && last === Infinity && seen.size === Object.keys(t.nodes).length;
}

const byId = (a: NodeId, b: NodeId) => Number(a.slice(1)) - Number(b.slice(1));

// Leaves evenly spaced in key order on one row; an internal node is centred over its first and last child.
// Nodes the root cannot reach (a new leaf, an orphaned subtree) are laid out as separate trees to the right,
// roots at the top row. A node reached twice through stale pointers keeps its first spot.
export function twoThreeLayout(t: Tree): { pos: Record<NodeId, Pos>; width: number; height: number } {
  const pos: Record<NodeId, Pos> = {};
  let slot = 0;
  const place = (id: NodeId, depth: number): void => {
    if (id in pos) return;
    const ks = kids(t, id);
    const y = TREE_PAD + depth * TREE_LEVEL;
    if (ks.length === 0) {
      pos[id] = { x: TREE_PAD + slot++ * TREE_SPACING, y };
      return;
    }
    ks.forEach((c) => place(c, depth + 1));
    const xs = ks.map((c) => pos[c].x);
    pos[id] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y };
  };
  if (t.root !== null) place(t.root, 0);
  const loose = Object.keys(t.nodes).filter((id) => !(id in pos));
  const childOfLoose = new Set(loose.flatMap((id) => kids(t, id)));
  for (const r of loose.filter((id) => !childOfLoose.has(id)).sort(byId)) {
    slot++; // a gap before each separate tree
    const ks = kids(t, r);
    if (ks.length > 0 && ks.every((c) => c in pos)) {
      // an old root whose only child is now the root: park it at the top, its edge shows the stale pointer
      pos[r] = { x: TREE_PAD + slot++ * TREE_SPACING, y: TREE_PAD };
    } else {
      // a new root over the old root and a loose subtree: one level above the placed kid, so leaves share a row
      const placed = ks.filter((c) => c in pos).map((c) => (pos[c].y - TREE_PAD) / TREE_LEVEL);
      place(r, placed.length > 0 ? Math.min(...placed) - 1 : 0);
    }
  }
  const minY = Math.min(TREE_PAD, ...Object.values(pos).map((p) => p.y));
  for (const p of Object.values(pos)) p.y += TREE_PAD - minY; // the whole picture drops when the new root appears
  const all = Object.values(pos);
  return {
    pos,
    width: Math.max(TREE_PAD, ...all.map((p) => p.x)) + TREE_PAD,
    height: Math.max(TREE_PAD, ...all.map((p) => p.y)) + TREE_PAD,
  };
}
