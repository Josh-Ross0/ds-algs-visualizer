import { emptyTree, newNode, type Tree } from '../../engine/tree';

// Plain (untraced) BST insert, used to build presets and kept results.
export function bstInsertKey(t: Tree, k: number): void {
  const z = newNode(t, k);
  let x: string | null = null;
  let y = t.root;
  while (y !== null) {
    x = y;
    y = k < t.nodes[y].key ? t.nodes[y].left : t.nodes[y].right;
  }
  t.nodes[z].p = x;
  if (x === null) t.root = z;
  else if (k < t.nodes[x].key) t.nodes[x].left = z;
  else t.nodes[x].right = z;
}

export function buildBst(keys: number[]): Tree {
  const t = emptyTree();
  for (const k of keys) bstInsertKey(t, k);
  return t;
}
