import { assertQuestionsPredictable } from '../../algorithms/testing';
import { cellId, keyAt, left, parent, right } from '../../engine/heapArray';
import type { HeapStep } from '../types';

// Every question must be answerable from the step shown before it, and that step's note must not give it away.
export function checkHeapPredictable(steps: HeapStep[]): void {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    const h = prev.view.heap;
    const i = step.vars.i as number;
    if (q.type === 'heap.heapify') {
      expect(left(i)).toBeLessThanOrEqual(h.heapSize); // a leaf call has a forced answer and asks nothing
      const cells = [i, left(i), right(i)].filter((c) => c <= h.heapSize);
      const best = cells.reduce((a, b) => (keyAt(h, b) < keyAt(h, a) ? b : a));
      expect(q.answer).toEqual({ kind: 'node', value: cellId(h, best), label: String(keyAt(h, best)), nil: false });
      expect(prev.note ?? '').not.toMatch(/smallest/);
    } else if (q.type === 'heap.decreaseKey') {
      expect(i).toBeGreaterThan(1);
      expect(q.answer).toEqual({ kind: 'yesno', value: keyAt(h, i) < keyAt(h, parent(i)) });
      expect(prev.note ?? '').not.toMatch(/Swapped|loop ends/);
    } else {
      throw new Error(`unexpected ${q.type}`);
    }
  });
}

// The labels (keys) of the node answers of one question type, in trace order.
export const answerLabels = (steps: HeapStep[], type: string): string[] =>
  steps.flatMap((s) => (s.question?.type === type && s.question.answer.kind === 'node' ? [s.question.answer.label] : []));

export const answerValues = (steps: HeapStep[], type: string) =>
  steps.filter((s) => s.question?.type === type).map((s) => s.question!.answer.value);

// `size` distinct integers in -10…29, in random order.
export function randomKeys(rand: () => number, size: number): number[] {
  const pool = Array.from({ length: 40 }, (_, j) => j - 10);
  for (let j = pool.length - 1; j > 0; j--) {
    const r = Math.floor(rand() * (j + 1));
    [pool[j], pool[r]] = [pool[r], pool[j]];
  }
  return pool.slice(0, size);
}
