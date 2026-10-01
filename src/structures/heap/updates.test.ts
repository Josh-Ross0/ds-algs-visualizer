import { HEAP_CAPACITY, isHeap, makeHeap, type HeapArray } from '../../engine/heapArray';
import { assertValidTreeTrace } from '../testing';
import type { HeapStep } from '../types';
import { heapProcs } from './pseudocode';
import { answerLabels, answerValues, checkHeapPredictable } from './testing';
import { runDecreaseKey, runExtractMin, runInsert } from './updates';

const def = { procs: heapProcs };
const EXAMPLE = [2, 5, 3, 9, 6, 4, 8, 12, 11, 7];
const example = () => makeHeap(EXAMPLE, HEAP_CAPACITY, EXAMPLE.length);
const last = (s: HeapStep[]) => s[s.length - 1];
const heapOf = (s: HeapStep[]) => last(s).view.heap;
const live = (h: HeapArray) => h.A.slice(0, h.heapSize);

test('Heap_Extract_Min on the example: returns 2; 7 seeps down past 3 and 4; the old last cell is stale', () => {
  const steps = runExtractMin(example());
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['Heap_Extract_Min', 0]);
  expect(answerLabels(steps, 'heap.heapify')).toEqual(['3', '4']);
  const h = heapOf(steps);
  expect(live(h)).toEqual([3, 5, 4, 9, 6, 7, 8, 12, 11]);
  expect([h.heapSize, h.A[9], isHeap(h)]).toEqual([9, 7, true]);
  expect([last(steps).proc, last(steps).line, last(steps).note, last(steps).vars.min]).toEqual(['Heap_Extract_Min', 7, 'Returns 2.', 2]);
  expect(last(steps).ds[0]).toEqual({ kind: 'stack', name: 'Call stack', items: ['Heap_Extract_Min(A)'] });
  checkHeapPredictable(steps);
});

test('Heap_Extract_Min does not mutate its input', () => {
  const h = example();
  const before = structuredClone(h);
  runExtractMin(h);
  expect(h).toEqual(before);
});

test('Heap_Extract_Min on a one-key heap leaves heap-size 0 with a stale root; on an empty heap it runs to the error', () => {
  const one = runExtractMin(makeHeap([5], HEAP_CAPACITY, 1));
  assertValidTreeTrace(def, one);
  expect([heapOf(one).heapSize, heapOf(one).A[0], last(one).note]).toEqual([0, 5, 'Returns 5.']);
  expect(one.some((s) => s.question)).toBe(false);
  expect(last(one).view.tags).toEqual({});

  const none = runExtractMin(makeHeap([], HEAP_CAPACITY, 0));
  expect(none.map((s) => s.line)).toEqual([0, 1, 2]);
  expect(last(none).note).toBe('error "the heap is empty"');
  expect(heapOf(none)).toEqual(makeHeap([], HEAP_CAPACITY, 0));
});

test('Heap_Extract_Min gives the copied root a fresh id, so no two live cells share an id', () => {
  for (const s of runExtractMin(example())) {
    const v = s.view.heap;
    expect(new Set(v.ids.slice(0, v.heapSize)).size).toBe(v.heapSize);
  }
});

test('Heap_Decrease_Key(A, 10, 1) on the example swaps up three times and asks yes, yes, yes', () => {
  const steps = runDecreaseKey(example(), 10, 1);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line]).toEqual(['Heap_Decrease_Key', 0]);
  expect(steps.filter((s) => s.line === 4)).toHaveLength(4);
  expect(answerValues(steps, 'heap.decreaseKey')).toEqual([true, true, true]);
  expect(live(heapOf(steps))).toEqual([1, 2, 3, 9, 5, 4, 8, 12, 11, 6]);
  checkHeapPredictable(steps);
});

test('Heap_Decrease_Key: a key that stays put asks once and answers no', () => {
  const steps = runDecreaseKey(example(), 9, 10);
  expect(answerValues(steps, 'heap.decreaseKey')).toEqual([false]);
  expect(live(heapOf(steps))).toEqual([2, 5, 3, 9, 6, 4, 8, 12, 10, 7]);
  checkHeapPredictable(steps);
});

test('Heap_Decrease_Key with k > A[i] runs to line 2 and leaves the heap as it was', () => {
  const h = example();
  const steps = runDecreaseKey(h, 1, 5);
  expect(steps.map((s) => s.line)).toEqual([0, 1, 2]);
  expect(last(steps).note).toBe('error "new key is larger than current key"');
  expect(heapOf(steps)).toEqual(h);
});

test('Heap_Insert 1 into the example: lines 1–5, the new cell holds ∞ before the call, then it climbs to the root', () => {
  const steps = runInsert(example(), 1);
  assertValidTreeTrace(def, steps);
  expect(steps.slice(0, 6).map((s) => [s.proc, s.line])).toEqual([
    ['Heap_Insert', 0], ['Heap_Insert', 1], ['Heap_Insert', 2], ['Heap_Insert', 3], ['Heap_Insert', 4], ['Heap_Insert', 5],
  ]);
  expect([steps[2].view.heap.A[10], steps[2].view.heap.heapSize]).toEqual([1, 10]); // A[s] = x, still past heap-size
  expect([steps[3].view.heap.A[10], steps[3].view.heap.heapSize]).toEqual([Infinity, 10]);
  expect([steps[4].view.heap.A[10], steps[4].view.heap.heapSize]).toEqual([Infinity, 11]);
  expect(steps[6].proc).toBe('Heap_Decrease_Key');
  expect(answerValues(steps, 'heap.decreaseKey')).toEqual([true, true, true]);
  const h = heapOf(steps);
  expect(live(h)).toEqual([1, 2, 3, 9, 5, 4, 8, 12, 11, 7, 6]);
  expect(isHeap(h)).toBe(true);
  expect(last(steps).ds[0]).toEqual({ kind: 'stack', name: 'Call stack', items: ['Heap_Insert(A, x)', 'Heap_Decrease_Key(A, 11, 1)'] });
  checkHeapPredictable(steps);
});

test('Heap_Insert 20 stays at the bottom (one question, no); into an empty heap it asks nothing', () => {
  const big = runInsert(example(), 20);
  expect(answerValues(big, 'heap.decreaseKey')).toEqual([false]);
  expect(live(heapOf(big))).toEqual([...EXAMPLE, 20]);

  const empty = runInsert(makeHeap([], HEAP_CAPACITY, 0), 4);
  assertValidTreeTrace(def, empty);
  expect(empty.some((s) => s.question)).toBe(false);
  expect(live(heapOf(empty))).toEqual([4]);
});
