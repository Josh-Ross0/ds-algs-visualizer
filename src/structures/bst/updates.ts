import { newNode, removeNode, swapPositions, type NodeId, type Tree } from '../../engine/tree';
import type { Question } from '../../engine/trace';
import { createTreeTracer } from '../tracer';
import type { TreeStep } from '../types';
import { BST_DELETE, TREE_INSERT } from './pseudocode';
import { traceSuccessor } from './queries';

function insertQuestion(zKey: number, yKey: number): Question {
  const left = zKey < yKey;
  return {
    type: 'bst.insert',
    prompt: `Line 8: z.key = ${zKey}, y.key = ${yKey}. Does z go left or right of y?`,
    answer: { kind: 'choice', value: left ? 'left' : 'right', options: ['left', 'right'] },
    explain: `${zKey} ${left ? '<' : '>'} ${yKey}, so y moves to y.${left ? 'left' : 'right'}.`,
  };
}

export function runInsert(t0: Tree, k: number): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.showRoot = true;
  const z = newNode(T, k);
  tr.ptr = { z };
  tr.emit(TREE_INSERT, 0, { nodes: [z], note: `Tree_Insert(T, z) with z.key = ${k}` });
  tr.emit(TREE_INSERT, 1, { note: T.root === null ? 'T.root == NIL.' : 'T.root ≠ NIL.' });
  if (T.root === null) {
    T.root = z;
    tr.emit(TREE_INSERT, 2, { nodes: [z] });
    return tr.steps;
  }
  tr.emit(TREE_INSERT, 3);
  let y: NodeId | null = T.root;
  tr.ptr = { z, y };
  tr.emit(TREE_INSERT, 4, { nodes: [y] });
  let x: NodeId | null = null;
  tr.ptr = { z, y, x };
  tr.emit(TREE_INSERT, 5);
  let side: 'left' | 'right' = 'left';
  for (;;) {
    tr.emit(TREE_INSERT, 6, {
      bigStep: true,
      nodes: y ? [y] : [],
      nil: y === null && x !== null ? { parent: x, side } : undefined,
      note: y === null ? 'y = NIL, so the loop ends.' : 'y ≠ NIL.',
    });
    if (y === null) break;
    x = y;
    tr.ptr = { z, y, x };
    tr.emit(TREE_INSERT, 7, { nodes: [x] });
    const yKey: number = T.nodes[y].key;
    const left: boolean = k < yKey;
    tr.emit(TREE_INSERT, 8, { nodes: [y], note: `z.key = ${k} ${left ? '<' : '>'} y.key = ${yKey}.`, question: insertQuestion(k, yKey) });
    side = left ? 'left' : 'right';
    y = left ? T.nodes[y].left : T.nodes[y].right;
    tr.ptr = { z, y, x };
    tr.emit(TREE_INSERT, left ? 9 : 10, { nodes: y ? [y] : [], edges: y ? [y] : [] });
  }
  T.nodes[z].p = x;
  tr.ptr = { z, x };
  tr.emit(TREE_INSERT, 11, { nodes: [z, x!] });
  const left = k < T.nodes[x!].key;
  tr.emit(TREE_INSERT, 12, { nodes: [z, x!], note: `z.key = ${k} ${left ? '<' : '>'} x.key = ${T.nodes[x!].key}.` });
  if (left) T.nodes[x!].left = z;
  else T.nodes[x!].right = z;
  tr.emit(TREE_INSERT, left ? 13 : 14, { nodes: [z], edges: [z] });
  return tr.steps;
}

const CASES = ['case 1: x is a leaf', 'case 2: only a right child', 'case 3: only a left child', 'case 4: two children'];

function caseQuestion(xKey: number, c: number): Question {
  const why = [
    `${xKey} has no children, so it is a leaf.`,
    `${xKey} has a right child and no left child.`,
    `${xKey} has a left child and no right child.`,
    `${xKey} has two children.`,
  ];
  return {
    type: 'bst.deleteCase',
    prompt: `Deleting node x with key ${xKey}: which case applies?`,
    answer: { kind: 'choice', value: CASES[c - 1], options: CASES },
    explain: why[c - 1],
  };
}

export function runDelete(t0: Tree, k: number): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  const x = Object.values(T.nodes).find((n) => n.key === k)!.id;
  tr.ptr = { x };
  tr.stack = ['Deleting node x'];
  tr.emit(BST_DELETE, 0, { nodes: [x], note: `Deleting node x with key ${k}` });
  const X = T.nodes[x];
  const c = X.left === null && X.right === null ? 1 : X.left === null ? 2 : X.right === null ? 3 : 4;
  tr.emit(BST_DELETE, 1, { nodes: [x], note: c === 1 ? 'x is a leaf.' : 'x is not a leaf.', question: caseQuestion(k, c) });
  if (c === 1) {
    removeNode(T, x);
    tr.ptr = {};
    tr.emit(BST_DELETE, 2, { note: 'Not much to do: x is removed.' });
    return tr.steps;
  }
  tr.emit(BST_DELETE, 3, { nodes: [x], note: c === 2 ? 'x has a right child y and no left child.' : 'No.' });
  if (c === 2) {
    const y = X.right!;
    removeNode(T, x);
    tr.ptr = { y };
    tr.emit(BST_DELETE, 4, { nodes: [y], edges: [y], note: 'y takes the place of x.' });
    return tr.steps;
  }
  tr.emit(BST_DELETE, 5, { nodes: [x], note: c === 3 ? 'x has a left child y and no right child.' : 'No.' });
  if (c === 3) {
    const y = X.left!;
    removeNode(T, x);
    tr.ptr = { y };
    tr.emit(BST_DELETE, 6, { nodes: [y], edges: [y], note: 'y takes the place of x.' });
    return tr.steps;
  }
  tr.emit(BST_DELETE, 7, { nodes: [x], note: 'x has two children.' });
  tr.emit(BST_DELETE, 8, { nodes: [x] });
  const y = traceSuccessor(tr, x, true)!;
  swapPositions(T, x, y);
  tr.ptr = { x, y };
  tr.emit(BST_DELETE, 9, { nodes: [x, y], note: 'x and y swap places.' });
  const child = T.nodes[x].right;
  removeNode(T, x);
  tr.ptr = { y };
  tr.emit(BST_DELETE, 10, {
    nodes: child ? [child] : [],
    note: child === null
      ? 'x now has no children (case 1), so it is removed.'
      : 'x now has only a right child (case 2), so that child takes its place.',
  });
  return tr.steps;
}
