import { keyAt, parent, swapCells, type HeapArray } from '../../engine/heapArray';
import type { HeapStep } from '../types';
import { traceHeapify } from './heapify';
import { HEAP_DECREASE_KEY, HEAP_EXTRACT_MIN, HEAP_INSERT } from './pseudocode';
import { decreaseKeyQuestion } from './questions';
import { createHeapTracer, type HeapTracer } from './tracer';

const show = (n: number) => (n === Infinity ? '∞' : String(n));

export function runExtractMin(h0: HeapArray): HeapStep[] {
  const tr = createHeapTracer(structuredClone(h0));
  const h = tr.heap;
  tr.stack = ['Heap_Extract_Min(A)'];
  tr.emit(HEAP_EXTRACT_MIN, 0, { note: 'Heap_Extract_Min(A)' });
  const n = h.heapSize;
  tr.emit(HEAP_EXTRACT_MIN, 1, { note: n < 1 ? 'A.heap-size < 1.' : `A.heap-size = ${n} ≥ 1.` });
  if (n < 1) {
    tr.emit(HEAP_EXTRACT_MIN, 2, { note: 'error "the heap is empty"' });
    return tr.steps;
  }
  const min = keyAt(h, 1);
  tr.extra = { min };
  tr.emit(HEAP_EXTRACT_MIN, 3, { cells: [1], note: `min = A[1] = ${min}.` });
  h.A[0] = h.A[n - 1];
  h.ids[0] = h.nextId++; // a copy of the object, so a new identity
  tr.emit(HEAP_EXTRACT_MIN, 4, { cells: [1, n], note: `A[1] = A[${n}] = ${h.A[0]}.` });
  h.heapSize = n - 1;
  tr.emit(HEAP_EXTRACT_MIN, 5, { cells: [n], note: `heap-size = ${n - 1}.` });
  tr.emit(HEAP_EXTRACT_MIN, 6, { cells: [1], note: 'Heapify(A, 1).' });
  traceHeapify(tr, 1);
  tr.idx = {};
  tr.emit(HEAP_EXTRACT_MIN, 7, { note: `Returns ${min}.` });
  return tr.steps;
}

// Runs Heap_Decrease_Key(A, start, k) inside tr (the caller has already pushed its stack frame).
export function traceDecreaseKey(tr: HeapTracer, start: number, k: number): void {
  const h = tr.heap;
  let i = start;
  tr.extra = { k };
  tr.idx = { i };
  const current = keyAt(h, i);
  const tooBig = k > current;
  tr.emit(HEAP_DECREASE_KEY, 1, { cells: [i], note: `k = ${k} ${tooBig ? '>' : '≤'} A[i].key = ${show(current)}.` });
  if (tooBig) {
    tr.emit(HEAP_DECREASE_KEY, 2, { cells: [i], note: 'error "new key is larger than current key"' });
    return;
  }
  h.A[i - 1] = k;
  tr.emit(HEAP_DECREASE_KEY, 3, { cells: [i], note: `A[${i}].key = ${k}.` });
  for (;;) {
    const p = parent(i);
    const climb = i > 1 && keyAt(h, i) < keyAt(h, p);
    tr.emit(HEAP_DECREASE_KEY, 4, {
      bigStep: true,
      cells: i > 1 ? [i, p] : [i],
      edges: i > 1 ? [i] : [],
      note: i === 1
        ? 'i = 1, so the loop ends.'
        : `A[${i}] = ${keyAt(h, i)} ${climb ? '<' : '>'} A[Parent(i)] = A[${p}] = ${keyAt(h, p)}.`,
      question: i > 1 ? decreaseKeyQuestion(h, i) : undefined,
    });
    if (!climb) return;
    swapCells(h, i, p);
    tr.emit(HEAP_DECREASE_KEY, 5, { cells: [i, p], edges: [i], note: `Swapped A[${i}] and A[${p}].` });
    i = p;
    tr.idx = { i };
    tr.emit(HEAP_DECREASE_KEY, 6, { cells: [i], note: `i = Parent(i) = ${i}.` });
  }
}

export function runDecreaseKey(h0: HeapArray, i: number, k: number): HeapStep[] {
  const tr = createHeapTracer(structuredClone(h0));
  tr.stack = [`Heap_Decrease_Key(A, ${i}, ${k})`];
  tr.extra = { k };
  tr.idx = { i };
  tr.emit(HEAP_DECREASE_KEY, 0, { cells: [i], note: `Heap_Decrease_Key(A, ${i}, ${k})` });
  traceDecreaseKey(tr, i, k);
  return tr.steps;
}

// Requires heap-size < A.length (the definition's validate blocks a full array).
export function runInsert(h0: HeapArray, x: number): HeapStep[] {
  const tr = createHeapTracer(structuredClone(h0));
  const h = tr.heap;
  tr.stack = ['Heap_Insert(A, x)'];
  tr.extra = { x };
  tr.emit(HEAP_INSERT, 0, { note: `Heap_Insert(A, x) with x.key = ${x}` });
  const s = h.heapSize + 1;
  tr.idx = { s };
  tr.emit(HEAP_INSERT, 1, { cells: [s], note: `s = heap-size + 1 = ${s}.` });
  h.A[s - 1] = x;
  h.ids[s - 1] = h.nextId++; // a copy of x, so a new identity
  tr.emit(HEAP_INSERT, 2, { cells: [s], note: `A[${s}] = x.` });
  h.A[s - 1] = Infinity;
  tr.emit(HEAP_INSERT, 3, { cells: [s], note: `A[${s}].key = ∞.` });
  h.heapSize = s;
  tr.emit(HEAP_INSERT, 4, { cells: [s], edges: s > 1 ? [s] : [], note: `heap-size = ${s}: a valid heap of size ${s}.` });
  tr.emit(HEAP_INSERT, 5, { cells: [s], note: `Heap_Decrease_Key(A, ${s}, ${x}).` });
  tr.stack = [...tr.stack, `Heap_Decrease_Key(A, ${s}, ${x})`];
  traceDecreaseKey(tr, s, x);
  return tr.steps;
}
