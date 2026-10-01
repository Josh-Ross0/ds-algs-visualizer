import { HEAP_CAPACITY, keyAt, makeHeap, type HeapArray } from '../../engine/heapArray';
import type { HeapView, StructureDef } from '../types';
import { runBuildHeap } from './heapify';
import { BUILD_HEAP, HEAP_DECREASE_KEY, HEAP_EXTRACT_MIN, HEAP_INSERT, HEAPIFY, heapProcs } from './pseudocode';
import { HEAP_QUESTION_TYPES } from './questions';
import { runDecreaseKey, runExtractMin, runInsert } from './updates';

const live = (h: HeapArray) => h.A.slice(0, h.heapSize);
const duplicate = (k: number) => `Key ${k} is already in the heap (keys must be unique).`;

function validate(h: HeapArray, op: string, args: number[]): string[] {
  switch (op) {
    case 'build': {
      if (args.length > HEAP_CAPACITY) return [`Build_Heap is limited to ${HEAP_CAPACITY} keys so the heap stays readable.`];
      const twice = args.find((k, j) => args.indexOf(k) !== j);
      return twice === undefined ? [] : [`Key ${twice} appears more than once (keys must be unique).`];
    }
    case 'insert': {
      if (live(h).includes(args[0])) return [duplicate(args[0])];
      return h.heapSize >= h.A.length ? [`The array is full (A.length = ${h.A.length}).`] : [];
    }
    case 'decrease': {
      const [i, k] = args;
      if (i < 1 || i > h.heapSize) return ['Choose an index between 1 and heap-size.'];
      // k > A[i] only runs to the error line; otherwise k must not duplicate another live key.
      const others = live(h).filter((_, j) => j !== i - 1);
      return k <= keyAt(h, i) && others.includes(k) ? [duplicate(k)] : [];
    }
    default:
      return []; // Extract Min on an empty heap runs to the lecture's error line
  }
}

export const heap: StructureDef<HeapArray, HeapView> = {
  id: 'heap',
  title: 'Binary Heap (min-heap)',
  procs: heapProcs,
  operations: [
    { id: 'build', label: 'Build Heap', input: 'array', procs: [BUILD_HEAP, HEAPIFY], sample: '9, 4, 7, 1, 3, 8, 2, 6, 5' },
    { id: 'extract', label: 'Extract Min', input: 'none', procs: [HEAP_EXTRACT_MIN, HEAPIFY] },
    { id: 'decrease', label: 'Decrease Key', input: 'index-key', procs: [HEAP_DECREASE_KEY] },
    { id: 'insert', label: 'Insert', input: 'key', procs: [HEAP_INSERT, HEAP_DECREASE_KEY] },
  ],
  questionTypes: HEAP_QUESTION_TYPES,
  presets: [
    { name: 'Example heap (10 keys)', keys: [2, 5, 3, 9, 6, 4, 8, 12, 11, 7] },
    { name: 'Full heap (15 keys)', keys: [1, 3, 2, 6, 4, 5, 7, 10, 8, 9, 12, 11, 15, 13, 14] },
  ],
  maxNodes: HEAP_CAPACITY,
  // Preset keys are already in heap order; the array has room for 15 cells.
  build: (keys) => makeHeap(keys, HEAP_CAPACITY, keys.length),
  view: (h) => ({ kind: 'heap', heap: h, highlight: { cells: [], edges: [] }, tags: {} }),
  keep: (v) => v.heap,
  validate,
  run(h, op, args) {
    switch (op) {
      case 'build': return runBuildHeap(args);
      case 'extract': return runExtractMin(h);
      case 'decrease': return runDecreaseKey(h, args[0], args[1]);
      case 'insert': return runInsert(h, args[0]);
      default: throw new Error(`Unknown heap operation ${op}`);
    }
  },
};
