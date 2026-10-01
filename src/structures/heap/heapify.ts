import { keyAt, left, makeHeap, right, swapCells } from '../../engine/heapArray';
import type { HeapStep } from '../types';
import { BUILD_HEAP, HEAPIFY } from './pseudocode';
import { heapifyQuestion } from './questions';
import { createHeapTracer, type HeapTracer } from './tracer';

// Runs Heapify(A, start) inside tr, as the lecture's recursive procedure, and pops the frames it pushed.
export function traceHeapify(tr: HeapTracer, start: number): void {
  const h = tr.heap;
  const base = tr.stack.length;
  let i = start;
  tr.stack = [...tr.stack, `Heapify(A, ${i})`];
  for (;;) {
    const hs = h.heapSize;
    const l = left(i);
    tr.idx = { i, 'ℓ': l };
    tr.emit(HEAPIFY, 1, {
      bigStep: true,
      cells: [i],
      note: `ℓ = Left(${i}) = ${l}.`,
      // A call with no child inside the heap has a forced answer, so it asks nothing.
      question: l <= hs ? heapifyQuestion(h, i) : undefined,
    });

    const lLive = l <= hs;
    const lSmaller = lLive && keyAt(h, l) < keyAt(h, i);
    tr.emit(HEAPIFY, 2, {
      cells: lLive ? [i, l] : [i],
      edges: lLive ? [l] : [],
      note: lLive
        ? `ℓ = ${l} ≤ heap-size = ${hs}; A[ℓ] = ${keyAt(h, l)} ${lSmaller ? '<' : '≥'} A[i] = ${keyAt(h, i)}.`
        : `ℓ = ${l} > heap-size = ${hs}.`,
    });
    let smallest = lSmaller ? l : i;
    tr.idx = { i, 'ℓ': l, smallest };
    if (lSmaller) tr.emit(HEAPIFY, 3, { cells: [l], note: `smallest = ℓ = ${l}.` });
    else tr.emit(HEAPIFY, 4, { cells: [i], note: `smallest = i = ${i}.` });

    const r = right(i);
    tr.idx = { i, 'ℓ': l, smallest, r };
    tr.emit(HEAPIFY, 5, { cells: [i], note: `r = Right(${i}) = ${r}.` });
    const rLive = r <= hs;
    const rSmaller = rLive && keyAt(h, r) < keyAt(h, smallest);
    tr.emit(HEAPIFY, 6, {
      cells: rLive ? [smallest, r] : [smallest],
      edges: rLive ? [r] : [],
      note: rLive
        ? `r = ${r} ≤ heap-size = ${hs}; A[r] = ${keyAt(h, r)} ${rSmaller ? '<' : '≥'} A[smallest] = ${keyAt(h, smallest)}.`
        : `r = ${r} > heap-size = ${hs}.`,
    });
    if (rSmaller) {
      smallest = r;
      tr.idx = { i, 'ℓ': l, smallest, r };
      tr.emit(HEAPIFY, 7, { cells: [r], note: `smallest = r = ${r}.` });
    }

    const swaps = smallest !== i;
    tr.emit(HEAPIFY, 8, {
      cells: swaps ? [i, smallest] : [i],
      edges: swaps ? [smallest] : [],
      note: swaps ? `smallest = ${smallest} ≠ i = ${i}.` : `smallest = i = ${i}, so A[i] is in place.`,
    });
    if (!swaps) break;
    swapCells(h, i, smallest);
    tr.emit(HEAPIFY, 9, { cells: [i, smallest], edges: [smallest], note: `Swapped A[${i}] and A[${smallest}].` });
    tr.emit(HEAPIFY, 10, { cells: [smallest], note: `Heapify(A, ${smallest}).` });
    tr.stack = [...tr.stack, `Heapify(A, ${smallest})`];
    i = smallest;
  }
  tr.stack = tr.stack.slice(0, base);
}

// Build_Heap(A) on a typed array: the array replaces the heap, so A.length = keys.length.
export function runBuildHeap(keys: number[]): HeapStep[] {
  const n = keys.length;
  const tr = createHeapTracer(makeHeap(keys, n, 0));
  const h = tr.heap;
  tr.stack = ['Build_Heap(A)'];
  tr.emit(BUILD_HEAP, 0, { note: `Build_Heap(A) with A.length = ${n}` });
  h.heapSize = n;
  tr.emit(BUILD_HEAP, 1, { note: `heap-size = A.length = ${n}.` });
  for (let i = n; i >= 1; i--) {
    tr.idx = { i };
    tr.emit(BUILD_HEAP, 2, { bigStep: true, cells: [i], note: `i = ${i}.` });
    tr.emit(BUILD_HEAP, 3, { cells: [i], note: `Heapify(A, ${i}).` });
    traceHeapify(tr, i);
  }
  return tr.steps;
}
