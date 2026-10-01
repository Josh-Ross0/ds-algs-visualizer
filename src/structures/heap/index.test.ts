import { mulberry32 } from '../../algorithms/sssp/reference';
import { HEAP_CAPACITY, isHeap, keyAt, makeHeap, type HeapArray } from '../../engine/heapArray';
import { assertValidTreeTrace } from '../testing';
import { heap } from './index';
import { runExtractMin } from './updates';
import { checkHeapPredictable, randomKeys } from './testing';

const live = (h: HeapArray) => h.A.slice(0, h.heapSize) as number[];
const example = () => heap.build(heap.presets[0].keys);
const full = () => heap.build(heap.presets[1].keys);

test('presets are valid heaps in a 15-cell array', () => {
  for (const p of heap.presets) {
    const h = heap.build(p.keys);
    expect(isHeap(h)).toBe(true);
    expect([h.A.length, h.heapSize]).toEqual([HEAP_CAPACITY, p.keys.length]);
  }
  expect(heap.presets[1].keys).toHaveLength(15);
  expect(isHeap(heap.build([]))).toBe(true);
});

test('validate blocks exactly the inputs the spec lists', () => {
  const h = example();
  const dup = (k: number) => [`Key ${k} is already in the heap (keys must be unique).`];
  expect(heap.validate(h, 'insert', [5])).toEqual(dup(5));
  expect(heap.validate(h, 'insert', [100])).toEqual([]);
  expect(heap.validate(full(), 'insert', [100])).toEqual(['The array is full (A.length = 15).']);

  const range = ['Choose an index between 1 and heap-size.'];
  expect(heap.validate(h, 'decrease', [0, 1])).toEqual(range);
  expect(heap.validate(h, 'decrease', [11, 1])).toEqual(range);
  expect(heap.validate(heap.build([]), 'decrease', [1, 1])).toEqual(range);
  expect(heap.validate(h, 'decrease', [10, 5])).toEqual(dup(5)); // 5 lives at A[2]
  expect(heap.validate(h, 'decrease', [10, 7])).toEqual([]); // k = A[i]: nothing changes
  expect(heap.validate(h, 'decrease', [1, 5])).toEqual([]); // k > A[1]: runs to the error line

  expect(heap.validate(heap.build([]), 'extract', [])).toEqual([]); // runs to the error line
  expect(heap.validate(h, 'build', [9, 4, 7])).toEqual([]);
  expect(heap.validate(h, 'build', [1, 2, 1])).toEqual(['Key 1 appears more than once (keys must be unique).']);
  expect(heap.validate(h, 'build', Array.from({ length: 16 }, (_, j) => j))).toEqual([
    'Build_Heap is limited to 15 keys so the heap stays readable.',
  ]);
});

test('a stale cell past heap-size does not count as a live key', () => {
  const after = runExtractMin(makeHeap([5], HEAP_CAPACITY, 1)).at(-1)!.view.heap;
  expect([after.heapSize, after.A[0]]).toEqual([0, 5]);
  expect(heap.validate(after, 'insert', [5])).toEqual([]);
  const again = heap.keep(heap.run(after, 'insert', [5]).at(-1)!.view);
  expect([again.heapSize, again.A[0], isHeap(again)]).toEqual([1, 5, true]);
});

test('run dispatches every operation with a valid trace', () => {
  const h = example();
  const args: Record<string, number[]> = { build: [9, 4, 7], extract: [], decrease: [10, 1], insert: [1] };
  for (const op of heap.operations) {
    expect(heap.validate(h, op.id, args[op.id])).toEqual([]);
    assertValidTreeTrace(heap, heap.run(h, op.id, args[op.id]));
  }
  expect(heap.operations.find((o) => o.id === 'build')!.sample).toBe('9, 4, 7, 1, 3, 8, 2, 6, 5');
  expect(heap.procs[0].name).toBe('Build_Heap');
});

test('view and keep: setup draws the state; keeping adopts the last step', () => {
  const h = example();
  expect(heap.view(h, null)).toEqual({ kind: 'heap', heap: h, highlight: { cells: [], edges: [] }, tags: {} });
  const steps = heap.run(h, 'extract', []);
  expect(heap.keep(steps.at(-1)!.view).heapSize).toBe(9);
});

test('random operation sequences keep a valid heap with unique live ids and predictable questions', () => {
  const rand = mulberry32(7);
  let h = example();
  let model = new Set<number>(live(h));
  for (let n = 0; n < 300; n++) {
    const pick = rand();
    let op: string;
    let args: number[];
    if (pick < 0.4) {
      op = 'insert';
      args = [Math.floor(rand() * 40) - 5];
    } else if (pick < 0.65) {
      op = 'extract';
      args = [];
    } else if (pick < 0.95) {
      op = 'decrease';
      args = [1 + Math.floor(rand() * Math.max(h.heapSize, 1)), Math.floor(rand() * 40) - 20];
    } else {
      op = 'build';
      args = randomKeys(rand, 1 + Math.floor(rand() * 15));
    }
    if (heap.validate(h, op, args).length > 0) continue;

    const before = structuredClone(h);
    const steps = heap.run(h, op, args);
    expect(h).toEqual(before); // operations never mutate the page's heap
    assertValidTreeTrace(heap, steps);
    checkHeapPredictable(steps);
    for (const s of steps) {
      const v = s.view.heap;
      expect(new Set(v.ids.slice(0, v.heapSize)).size).toBe(v.heapSize);
    }

    if (op === 'insert') model.add(args[0]);
    else if (op === 'extract' && model.size > 0) {
      const min = Math.min(...model);
      expect(steps.at(-1)!.vars.min).toBe(min);
      model.delete(min);
    } else if (op === 'decrease') {
      const old = keyAt(h, args[0]);
      if (args[1] <= old) {
        model.delete(old);
        model.add(args[1]);
      }
    } else if (op === 'build') model = new Set(args);

    h = heap.keep(steps.at(-1)!.view);
    expect(isHeap(h)).toBe(true);
    expect(live(h).sort((a, b) => a - b)).toEqual([...model].sort((a, b) => a - b));
  }
});
