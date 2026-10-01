import { mulberry32 } from '../../algorithms/sssp/reference';
import { isHeap, type HeapArray } from '../../engine/heapArray';
import { assertValidTreeTrace } from '../testing';
import type { HeapStep } from '../types';
import { runBuildHeap } from './heapify';
import { heapProcs } from './pseudocode';
import { answerLabels, checkHeapPredictable, randomKeys } from './testing';

const def = { procs: heapProcs };
const EXAMPLE = [9, 4, 7, 1, 3, 8, 2, 6, 5];
const last = (s: HeapStep[]) => s[s.length - 1];
const heapOf = (s: HeapStep[]) => last(s).view.heap;
const live = (h: HeapArray) => h.A.slice(0, h.heapSize);

test('Build_Heap on [9,4,7,1,3,8,2,6,5]: the array is placed first, then heap-size = A.length, and the result is a heap', () => {
  const steps = runBuildHeap(EXAMPLE);
  assertValidTreeTrace(def, steps);
  expect([steps[0].proc, steps[0].line, steps[0].view.heap.heapSize]).toEqual(['Build_Heap', 0, 0]);
  expect([steps[1].line, steps[1].view.heap.heapSize]).toEqual([1, 9]);
  const h = heapOf(steps);
  expect(live(h)).toEqual([1, 3, 2, 4, 9, 8, 7, 6, 5]);
  expect([h.heapSize, h.A.length, isHeap(h)]).toEqual([9, 9, true]);
});

test('Build_Heap: each i from A.length down to 1 is a big step; Heapify asks once per non-leaf call', () => {
  const steps = runBuildHeap(EXAMPLE);
  const loop = steps.filter((s) => s.proc === 'Build_Heap' && s.line === 2);
  expect(loop.map((s) => s.vars.i)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
  expect(loop.every((s) => s.bigStep)).toBe(true);
  // calls: i=4 (1), i=3 (2), i=2 (1), its recursive call at 4 (4), i=1 (1), its recursive call at 2 (3)
  expect(answerLabels(steps, 'heap.heapify')).toEqual(['1', '2', '1', '4', '1', '3']);
  checkHeapPredictable(steps);
});

test('Heapify seeps 9 down to A[5]: recursive calls are on the call stack', () => {
  const steps = runBuildHeap(EXAMPLE);
  const recursions = steps.filter((s) => s.proc === 'Heapify' && s.line === 10).map((s) => s.vars.smallest);
  expect(recursions).toEqual([7, 4, 2, 5]);
  expect(last(steps).ds[0]).toEqual({
    kind: 'stack',
    name: 'Call stack',
    items: ['Build_Heap(A)', 'Heapify(A, 1)', 'Heapify(A, 2)', 'Heapify(A, 5)'],
  });
});

test('index variables are drawn as tags and listed in the variables line', () => {
  const steps = runBuildHeap(EXAMPLE);
  const seven = steps.find((s) => s.proc === 'Heapify' && s.line === 7)!;
  expect(seven.view.tags).toEqual({ i: 3, 'ℓ': 6, smallest: 7, r: 7 });
  expect(seven.vars).toMatchObject({ 'heap-size': 9, i: 3, 'ℓ': 6, r: 7, smallest: 7 });
});

test('one key, negative keys and an already valid heap', () => {
  const one = runBuildHeap([7]);
  expect(live(heapOf(one))).toEqual([7]);
  expect(one.some((s) => s.question)).toBe(false); // a leaf call asks nothing
  expect(live(heapOf(runBuildHeap([-1, -5, 3])))).toEqual([-5, -1, 3]);
  const sorted = runBuildHeap([1, 2, 3, 4, 5, 6, 7]);
  expect(live(heapOf(sorted))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(sorted.some((s) => s.proc === 'Heapify' && s.line === 9)).toBe(false); // no swaps
});

test('random arrays: a valid heap with the same keys, and predictable questions', () => {
  const rand = mulberry32(5);
  for (let n = 0; n < 60; n++) {
    const keys = randomKeys(rand, 1 + Math.floor(rand() * 15));
    const steps = runBuildHeap(keys);
    assertValidTreeTrace(def, steps);
    checkHeapPredictable(steps);
    const h = heapOf(steps);
    expect(isHeap(h)).toBe(true);
    expect([...live(h)].sort((a, b) => (a as number) - (b as number))).toEqual([...keys].sort((a, b) => a - b));
  }
});
