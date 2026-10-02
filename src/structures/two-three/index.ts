import type { Tree } from '../../engine/tree';
import { findLeaf, initTree, realLeaves } from '../../engine/twoThree';
import type { StructureDef, TwoThreeView } from '../types';
import { runDelete } from './delete';
import { runInit } from './init';
import { runInsert } from './insert';
import {
  BORROW_OR_MERGE, INSERT_AND_SPLIT, SET_CHILDREN, TT_DELETE, TT_INIT, TT_INSERT, TT_MINIMUM, TT_SEARCH, TT_SUCCESSOR,
  twoThreeProcs, UPDATE_KEY,
} from './pseudocode';
import { runMinimum, runSearch, runSuccessor } from './queries';
import { TWO_THREE_QUESTION_TYPES } from './questions';

const MAX_LEAVES = 12;

function validate(t: Tree, op: string, args: number[]): string[] {
  if (op === 'minimum' || op === 'init') return []; // Minimum on an empty tree runs to the lecture's error line
  const k = args[0] ?? null;
  if (k === null) return ['Enter an integer key.'];
  if (op === 'insert') {
    if (findLeaf(t, k) !== null) return [`Key ${k} is already in the tree (keys must be unique).`];
    if (realLeaves(t).length >= MAX_LEAVES) return [`The tree is limited to ${MAX_LEAVES} keys so it stays readable.`];
    return [];
  }
  if (op === 'successor' || op === 'delete') return findLeaf(t, k) === null ? [`No node with key ${k}.`] : [];
  return [];
}

export const twoThree: StructureDef<Tree, TwoThreeView> = {
  id: 'two-three',
  title: '2-3 Tree',
  procs: twoThreeProcs,
  operations: [
    { id: 'search', label: 'Search', input: 'key', procs: [TT_SEARCH] },
    { id: 'minimum', label: 'Minimum', input: 'none', procs: [TT_MINIMUM] },
    { id: 'successor', label: 'Successor', input: 'node', procs: [TT_SUCCESSOR] },
    { id: 'insert', label: 'Insert', input: 'key', procs: [TT_INSERT, INSERT_AND_SPLIT, SET_CHILDREN, UPDATE_KEY] },
    { id: 'delete', label: 'Delete', input: 'node', procs: [TT_DELETE, BORROW_OR_MERGE, SET_CHILDREN, UPDATE_KEY] },
    { id: 'init', label: 'Init', input: 'none', procs: [TT_INIT] },
  ],
  questionTypes: TWO_THREE_QUESTION_TYPES,
  presets: [
    // Inserted in this order the tree is slide 18 with the two sentinels joined to the first and last leaf groups.
    { name: 'Lecture example', keys: [4, 5, 1, 14, 19, 7, 22, 25, 29] },
    { name: 'Sorted inserts (1-7)', keys: [1, 2, 3, 4, 5, 6, 7] },
    { name: 'Full tree (12 keys)', keys: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  ],
  maxNodes: MAX_LEAVES,
  // One implementation of insert: run the traced 2_3_Insert and keep only the final tree.
  build: (keys) => keys.reduce((t, k) => runInsert(t, k).at(-1)!.view.tree, initTree()),
  view(t, selectedKey) {
    const selected = selectedKey === null ? null : findLeaf(t, selectedKey);
    return { kind: 'two-three', tree: t, highlight: { nodes: selected ? [selected] : [], edges: [] }, tags: {} };
  },
  keep: (v) => v.tree,
  nodeKey(t, id) {
    const n = t.nodes[id];
    return n !== undefined && n.leaf === true && Number.isFinite(n.key) ? n.key : null;
  },
  validate,
  run(t, op, args) {
    switch (op) {
      case 'search': return runSearch(t, args[0]);
      case 'minimum': return runMinimum(t);
      case 'successor': return runSuccessor(t, args[0]);
      case 'insert': return runInsert(t, args[0]);
      case 'delete': return runDelete(t, args[0]);
      case 'init': return runInit();
      default: throw new Error(`Unknown 2-3 tree operation ${op}`);
    }
  },
};
