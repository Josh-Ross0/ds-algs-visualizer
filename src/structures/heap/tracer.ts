import type { HeapArray } from '../../engine/heapArray';
import type { Question, Value } from '../../engine/trace';
import type { HeapStep } from '../types';

export type HeapEmit = {
  bigStep?: boolean;
  // Highlighted cells (indices) and child indices whose edge to their parent is highlighted.
  cells?: number[];
  edges?: number[];
  note?: string;
  question?: Question;
};

export type HeapTracer = {
  heap: HeapArray;
  steps: HeapStep[];
  // Index variables of the running frame (i, ℓ, r, smallest, s); drawn as tags and listed in the variables line.
  idx: Record<string, number>;
  // Other variables (k, x, min).
  extra: Record<string, Value>;
  stack: string[];
  emit(proc: string, line: number, o?: HeapEmit): void;
};

export function createHeapTracer(heap: HeapArray): HeapTracer {
  const tr: HeapTracer = {
    heap,
    steps: [],
    idx: {},
    extra: {},
    stack: [],
    emit(proc, line, o = {}) {
      const tags: Record<string, number> = {};
      for (const [name, at] of Object.entries(tr.idx)) if (at >= 1 && at <= tr.heap.A.length) tags[name] = at;
      tr.steps.push(structuredClone({
        proc,
        line,
        bigStep: o.bigStep ?? false,
        vars: { 'heap-size': tr.heap.heapSize, ...tr.extra, ...tr.idx },
        note: o.note,
        question: o.question,
        view: { kind: 'heap' as const, heap: tr.heap, highlight: { cells: o.cells ?? [], edges: o.edges ?? [] }, tags },
        ds: tr.stack.length > 0 ? [{ kind: 'stack' as const, name: 'Call stack', items: tr.stack }] : [],
      }));
    },
  };
  return tr;
}
