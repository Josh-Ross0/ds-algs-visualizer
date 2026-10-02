import { findKey, size, type Tree } from '../../engine/tree';
import type { StructureDef, TreeView } from '../types';
import { buildBst } from './model';
import { BST_DELETE, bstProcs, TREE_INSERT, TREE_MINIMUM, TREE_SEARCH, TREE_SUCCESSOR } from './pseudocode';
import { runMinimum, runSearch, runSuccessor } from './queries';
import { BST_QUESTION_TYPES } from './questions';
import { runDelete, runInsert } from './updates';

const MAX_NODES = 15;
const MIN_KEY = -999; // four characters at most, so a key fits inside its node
const MAX_KEY = 9999;

function validate(t: Tree, op: string, args: number[]): string[] {
  const k = args[0] ?? null;
  if (op === 'minimum') return size(t) === 0 ? ['Tree Minimum is undefined on an empty tree.'] : [];
  if (k === null) return ['Enter an integer key.'];
  if (op === 'insert') {
    if (k < MIN_KEY || k > MAX_KEY) return [`Keys are limited to ${MIN_KEY}…${MAX_KEY} so they fit inside a node.`];
    if (findKey(t, k) !== null) return [`Key ${k} is already in the tree (keys must be unique).`];
    if (size(t) >= MAX_NODES) return [`The tree is limited to ${MAX_NODES} nodes so it stays readable.`];
    return [];
  }
  if (op === 'successor' || op === 'delete') return findKey(t, k) === null ? [`No node with key ${k}.`] : [];
  return [];
}

export const bst: StructureDef<Tree, TreeView> = {
  id: 'bst',
  title: 'Binary Search Tree (BST)',
  procs: bstProcs,
  operations: [
    { id: 'search', label: 'Search', input: 'key', procs: [TREE_SEARCH] },
    { id: 'minimum', label: 'Minimum', input: 'none', procs: [TREE_MINIMUM] },
    { id: 'successor', label: 'Successor', input: 'node', procs: [TREE_SUCCESSOR, TREE_MINIMUM] },
    { id: 'insert', label: 'Insert', input: 'key', procs: [TREE_INSERT] },
    { id: 'delete', label: 'Delete', input: 'node', procs: [BST_DELETE, TREE_SUCCESSOR, TREE_MINIMUM] },
  ],
  questionTypes: BST_QUESTION_TYPES,
  presets: [
    { name: 'Lecture example', keys: [17, 4, 20, 1, 12, 18, 29, 9, 26, 6, 11, 23] },
    { name: 'Sorted inserts (a path)', keys: [1, 2, 3, 4, 5, 6] },
  ],
  maxNodes: MAX_NODES,
  build: buildBst,
  view(t, selectedKey) {
    const selected = selectedKey === null ? null : findKey(t, selectedKey);
    return { kind: 'tree', tree: t, highlight: { nodes: selected ? [selected] : [], edges: [] }, tags: {} };
  },
  keep: (v) => v.tree,
  nodeKey: (t, id) => t.nodes[id].key,
  validate,
  run(t, op, args) {
    const k = args[0];
    switch (op) {
      case 'search': return runSearch(t, k);
      case 'minimum': return runMinimum(t);
      case 'successor': return runSuccessor(t, k);
      case 'insert': return runInsert(t, k);
      case 'delete': return runDelete(t, k);
      default: throw new Error(`Unknown BST operation ${op}`);
    }
  },
};
