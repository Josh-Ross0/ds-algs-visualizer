import type { Question, Value } from '../engine/trace';
import type { NilSlot, NodeId, Tree } from '../engine/tree';
import type { StructureStep, TreeView, TwoThreeView } from './types';

export type TreeEmit = {
  bigStep?: boolean;
  nodes?: NodeId[];
  edges?: NodeId[];
  nil?: NilSlot;
  note?: string;
  question?: Question;
};

export type TreeTracer<V extends TreeView | TwoThreeView = TreeView> = {
  tree: Tree;
  steps: StructureStep<V>[];
  // Pointer variables of the running frame; shown as keys in the variables line and as tags on the tree.
  ptr: Record<string, NodeId | null>;
  // Other variables (e.g. k).
  extra: Record<string, Value>;
  stack: string[];
  // While true, T.root is a pointer variable of the running procedure (Tree_Insert, the 2-3 procedures).
  showRoot: boolean;
  emit(proc: string, line: number, o?: TreeEmit): void;
};

function makeTracer<V extends TreeView | TwoThreeView>(tree: Tree, kind: V['kind']): TreeTracer<V> {
  const tr: TreeTracer<V> = {
    tree,
    steps: [],
    ptr: {},
    extra: {},
    stack: [],
    showRoot: false,
    emit(proc, line, o = {}) {
      const vars: Record<string, Value> = { ...tr.extra };
      const tags: Record<string, NodeId> = {};
      for (const [name, id] of Object.entries(tr.ptr)) {
        const n = id === null ? undefined : tr.tree.nodes[id];
        // NIL shows no key; so does a node whose key is still NIL (NaN); a node already deleted shows "deleted".
        vars[name] = id === null ? null : n === undefined ? 'deleted' : Number.isNaN(n.key) ? null : n.key;
        if (id !== null && n !== undefined) tags[name] = id;
      }
      if (tr.showRoot) {
        vars['T.root'] = tr.tree.root === null ? null : tr.tree.nodes[tr.tree.root].key;
        if (tr.tree.root !== null) tags['T.root'] = tr.tree.root;
      }
      tr.steps.push(structuredClone({
        proc,
        line,
        bigStep: o.bigStep ?? false,
        vars,
        note: o.note,
        question: o.question,
        view: { kind, tree: tr.tree, highlight: { nodes: o.nodes ?? [], edges: o.edges ?? [] }, tags, nil: o.nil },
        ds: tr.stack.length > 0 ? [{ kind: 'stack' as const, name: 'Call stack', items: tr.stack }] : [],
      }) as unknown as StructureStep<V>);
    },
  };
  return tr;
}

export const createTreeTracer = (tree: Tree): TreeTracer<TreeView> => makeTracer<TreeView>(tree, 'tree');
export const createTwoThreeTracer = (tree: Tree): TreeTracer<TwoThreeView> => makeTracer<TwoThreeView>(tree, 'two-three');
