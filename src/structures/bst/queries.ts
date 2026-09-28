import { keyOf, type NodeId, type Tree } from '../../engine/tree';
import { createTreeTracer, type TreeTracer } from '../tracer';
import type { TreeStep } from '../types';
import { TREE_MINIMUM, TREE_SEARCH, TREE_SUCCESSOR } from './pseudocode';
import { nodeQuestion, searchQuestion, type SearchMove } from './questions';

const label = (t: Tree, id: NodeId | null) => (id === null ? 'NIL' : String(t.nodes[id].key));

export function runSearch(t0: Tree, k: number): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.extra = { k };
  tr.ptr = { x: T.root };
  tr.stack = [`Tree_Search(${label(T, T.root)}, ${k})`];
  tr.emit(TREE_SEARCH, 0, { nodes: T.root ? [T.root] : [], note: `Tree_Search(T.root, ${k})` });
  let x = T.root;
  let parent: NodeId | null = null;
  let side: 'left' | 'right' = 'left';
  for (;;) {
    tr.ptr = { x };
    const nil = x === null && parent !== null ? { parent, side } : undefined;
    const xKey = keyOf(T, x);
    const move: SearchMove = x === null || xKey === k ? 'stop here' : k < xKey! ? 'go left' : 'go right';
    tr.emit(TREE_SEARCH, 1, {
      bigStep: true,
      nodes: x ? [x] : [],
      nil,
      note: x === null ? 'x == nil.' : `x.key = ${xKey} ${xKey === k ? '==' : '≠'} k = ${k}.`,
      question: searchQuestion(xKey, k, move),
    });
    if (move === 'stop here') {
      tr.emit(TREE_SEARCH, 2, {
        nodes: x ? [x] : [],
        nil,
        note: x === null ? `Returns NIL: no node has key ${k}.` : `Returns the node with key ${k}.`,
      });
      return tr.steps;
    }
    const goLeft = move === 'go left';
    tr.emit(TREE_SEARCH, 3, { nodes: [x!], note: `k = ${k} ${goLeft ? '<' : '>'} x.key = ${xKey}.` });
    const next = goLeft ? T.nodes[x!].left : T.nodes[x!].right;
    tr.emit(TREE_SEARCH, goLeft ? 4 : 5, { nodes: [x!], edges: next ? [next] : [] });
    tr.stack = [...tr.stack, `Tree_Search(${label(T, next)}, ${k})`];
    parent = x;
    side = goLeft ? 'left' : 'right';
    x = next;
  }
}

// Runs Tree_Minimum(start) inside tr; ask adds the "which node" question on its first line.
export function traceMinimum(tr: TreeTracer, start: NodeId, ask: boolean): NodeId {
  const T = tr.tree;
  let x = start;
  let answer = start;
  while (T.nodes[answer].left !== null) answer = T.nodes[answer].left!;
  let first = true;
  for (;;) {
    tr.ptr = { x };
    const left = T.nodes[x].left;
    tr.emit(TREE_MINIMUM, 1, {
      bigStep: true,
      nodes: [x],
      edges: left ? [left] : [],
      note: left ? 'x.left ≠ NIL.' : 'x.left = NIL, so the loop ends.',
      question: first && ask
        ? nodeQuestion('bst.minimum', `Which node will Tree_Minimum(${T.nodes[start].key}) return?`, answer,
          label(T, answer), false, 'Tree_Minimum keeps going left until x.left = NIL.')
        : undefined,
    });
    first = false;
    if (left === null) break;
    x = left;
    tr.ptr = { x };
    tr.emit(TREE_MINIMUM, 2, { nodes: [x] });
  }
  tr.emit(TREE_MINIMUM, 3, { nodes: [x], note: `Returns the node with key ${T.nodes[x].key}.` });
  return x;
}

export function runMinimum(t0: Tree): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  tr.ptr = { x: T.root };
  tr.stack = [`Tree_Minimum(${label(T, T.root)})`];
  tr.emit(TREE_MINIMUM, 0, { nodes: [T.root!], note: 'Tree_Minimum(T.root)' });
  traceMinimum(tr, T.root!, true);
  return tr.steps;
}

// Runs Tree_Successor(x) inside tr; returns the successor (or null).
export function traceSuccessor(tr: TreeTracer, xStart: NodeId, ask: boolean): NodeId | null {
  const T = tr.tree;
  // The answer, worked out independently of the walk below (smallest key greater than x.key).
  const bigger = Object.values(T.nodes).filter((n) => n.key > T.nodes[xStart].key).sort((a, b) => a.key - b.key);
  const answer = bigger[0]?.id ?? null;
  let x = xStart;
  tr.ptr = { x };
  tr.stack = [...tr.stack, `Tree_Successor(${T.nodes[x].key})`];
  const r = T.nodes[x].right;
  tr.emit(TREE_SUCCESSOR, 1, {
    nodes: [x],
    edges: r ? [r] : [],
    note: r ? 'x.right ≠ NIL.' : 'x.right = NIL.',
    question: ask
      ? nodeQuestion('bst.successor', `Which node will Tree_Successor(${T.nodes[x].key}) return?`, answer,
        label(T, answer), true,
        answer === null
          ? `${T.nodes[x].key} is the largest key, so there is no successor (NIL).`
          : `${label(T, answer)} is the smallest key greater than ${T.nodes[x].key}.`)
      : undefined,
  });
  if (r !== null) {
    tr.emit(TREE_SUCCESSOR, 2, { nodes: [x], edges: [r] });
    tr.stack = [...tr.stack, `Tree_Minimum(${T.nodes[r].key})`];
    const m = traceMinimum(tr, r, false);
    tr.stack = tr.stack.slice(0, -2);
    return m;
  }
  let y = T.nodes[x].p;
  tr.ptr = { x, y };
  tr.emit(TREE_SUCCESSOR, 3, { nodes: y ? [x, y] : [x], edges: y ? [x] : [] });
  for (;;) {
    const climb = y !== null && x === T.nodes[y].right;
    tr.emit(TREE_SUCCESSOR, 4, {
      bigStep: true,
      nodes: y ? [x, y] : [x],
      note: y === null ? 'y = NIL, so the loop ends.' : climb ? 'x == y.right: keep climbing.' : 'x is y.left, so the loop ends.',
    });
    if (!climb) break;
    x = y!;
    tr.ptr = { x, y };
    tr.emit(TREE_SUCCESSOR, 5, { nodes: [x] });
    y = T.nodes[y!].p;
    tr.ptr = { x, y };
    tr.emit(TREE_SUCCESSOR, 6, { nodes: y ? [y] : [] });
  }
  tr.emit(TREE_SUCCESSOR, 7, {
    nodes: y ? [y] : [],
    note: y === null ? 'Returns NIL: x has the largest key.' : `Returns the node with key ${T.nodes[y].key}.`,
  });
  tr.stack = tr.stack.slice(0, -1);
  return y;
}

export function runSuccessor(t0: Tree, k: number): TreeStep[] {
  const tr = createTreeTracer(structuredClone(t0));
  const T = tr.tree;
  const x = Object.values(T.nodes).find((n) => n.key === k)!.id;
  tr.ptr = { x };
  tr.emit(TREE_SUCCESSOR, 0, { nodes: [x], note: `Tree_Successor(x) for the node with key ${k}` });
  traceSuccessor(tr, x, true);
  return tr.steps;
}
