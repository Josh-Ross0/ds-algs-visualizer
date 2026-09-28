import type { Question, Value } from '../engine/trace';
import type { NilSlot, NodeId, Tree } from '../engine/tree';
import type { TreeStep } from './types';

export type TreeEmit = {
  bigStep?: boolean;
  nodes?: NodeId[];
  edges?: NodeId[];
  nil?: NilSlot;
  note?: string;
  question?: Question;
};

export type TreeTracer = {
  tree: Tree;
  steps: TreeStep[];
  // Pointer variables of the running frame; shown as keys in the variables line and as tags on the tree.
  ptr: Record<string, NodeId | null>;
  // Other variables (e.g. k).
  extra: Record<string, Value>;
  stack: string[];
  emit(proc: string, line: number, o?: TreeEmit): void;
};

export function createTreeTracer(tree: Tree): TreeTracer {
  const tr: TreeTracer = {
    tree,
    steps: [],
    ptr: {},
    extra: {},
    stack: [],
    emit(proc, line, o = {}) {
      const vars: Record<string, Value> = { ...tr.extra };
      const tags: Record<string, NodeId> = {};
      for (const [name, id] of Object.entries(tr.ptr)) {
        vars[name] = id === null ? null : tr.tree.nodes[id].key;
        if (id !== null) tags[name] = id;
      }
      tr.steps.push(structuredClone({
        proc,
        line,
        bigStep: o.bigStep ?? false,
        vars,
        note: o.note,
        question: o.question,
        view: { tree: tr.tree, highlight: { nodes: o.nodes ?? [], edges: o.edges ?? [] }, tags, nil: o.nil },
        ds: tr.stack.length > 0 ? [{ kind: 'stack' as const, name: 'Call stack', items: tr.stack }] : [],
      }));
    },
  };
  return tr;
}
