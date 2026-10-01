import { cellId, keyAt, left, parent, right, type HeapArray } from '../../engine/heapArray';
import type { Question } from '../../engine/trace';

export const HEAP_QUESTION_TYPES = [
  { type: 'heap.heapify', label: 'Heapify: which of A[i], A[ℓ], A[r] is smallest' },
  { type: 'heap.decreaseKey', label: 'Heap_Decrease_Key: does A[i] swap with its parent' },
];

// Only cells up to heap-size are candidates. Asked only when ℓ ≤ heap-size, so i itself is live.
export function heapifyQuestion(h: HeapArray, i: number): Question {
  const cells = [i, left(i), right(i)].filter((c) => c <= h.heapSize);
  const best = cells.reduce((a, b) => (keyAt(h, b) < keyAt(h, a) ? b : a));
  return {
    type: 'heap.heapify',
    prompt: `Heapify(A, ${i}): which of ${cells.map((c) => `A[${c}]`).join(', ')} is the smallest?`,
    answer: { kind: 'node', value: cellId(h, best), label: String(keyAt(h, best)), nil: false },
    explain: `${cells.map((c) => `A[${c}] = ${keyAt(h, c)}`).join(', ')}: the smallest is A[${best}] = ${keyAt(h, best)}.`,
  };
}

// Asked only for i > 1 (at i = 1 the loop test is forced).
export function decreaseKeyQuestion(h: HeapArray, i: number): Question {
  const p = parent(i);
  const swap = keyAt(h, i) < keyAt(h, p);
  return {
    type: 'heap.decreaseKey',
    prompt: `Line 4: i = ${i}. Does A[i] swap with its parent A[${p}]?`,
    answer: { kind: 'yesno', value: swap },
    explain: swap
      ? `A[${i}] = ${keyAt(h, i)} < A[${p}] = ${keyAt(h, p)}, so they swap.`
      : `A[${i}] = ${keyAt(h, i)} > A[${p}] = ${keyAt(h, p)}, so the loop ends.`,
  };
}
