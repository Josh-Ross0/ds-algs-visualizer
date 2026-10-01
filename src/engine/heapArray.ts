import { TREE_LEVEL, TREE_PAD, TREE_SPACING, type Pos } from './tree';

// Binary heap stored in the lecture's array A[1…A.length], 0-based here.
// ids[i - 1] identifies the object in A[i]: swaps move ids with keys, copies get a fresh id,
// so the canvas can animate a key moving through the tree.
export type HeapArray = {
  A: (number | null)[]; // null = a cell never filled
  ids: number[];
  heapSize: number;
  nextId: number;
};

export const HEAP_CAPACITY = 15;

export const left = (i: number) => 2 * i;
export const right = (i: number) => 2 * i + 1;
export const parent = (i: number) => Math.floor(i / 2);

// keys fill A[1…keys.length]; the other cells up to `length` are empty.
export function makeHeap(keys: number[], length: number, heapSize: number): HeapArray {
  const A: (number | null)[] = [...keys, ...Array<null>(length - keys.length).fill(null)];
  return { A, ids: A.map((_, j) => j + 1), heapSize, nextId: length + 1 };
}

export const keyAt = (h: HeapArray, i: number): number => h.A[i - 1] as number;
export const cellId = (h: HeapArray, i: number): string => String(h.ids[i - 1]);

export function swapCells(h: HeapArray, i: number, j: number): void {
  [h.A[i - 1], h.A[j - 1]] = [h.A[j - 1], h.A[i - 1]];
  [h.ids[i - 1], h.ids[j - 1]] = [h.ids[j - 1], h.ids[i - 1]];
}

// The heap property (strict, keys unique) on A[1…heap-size]; cells past heap-size are ignored.
export function isHeap(h: HeapArray): boolean {
  if (h.heapSize < 0 || h.heapSize > h.A.length) return false;
  const liveKeys = h.A.slice(0, h.heapSize);
  if (!liveKeys.every((k) => typeof k === 'number' && Number.isFinite(k))) return false;
  if (new Set(liveKeys).size !== h.heapSize) return false;
  for (let i = 2; i <= h.heapSize; i++) if (!(keyAt(h, parent(i)) < keyAt(h, i))) return false;
  return true;
}

// Fixed positions by index (slide 43): level = ⌊lg i⌋, a level's nodes are spread over the width of the last level.
export function heapLayout(length: number): { pos: Record<number, Pos>; width: number; height: number } {
  const levels = Math.floor(Math.log2(Math.max(1, length))) + 1;
  const pos: Record<number, Pos> = {};
  for (let i = 1; i <= length; i++) {
    const d = Math.floor(Math.log2(i));
    const span = 2 ** (levels - 1 - d); // last-level slots under one node of this level
    const j = i - 2 ** d;
    pos[i] = { x: TREE_PAD + (j * span + (span - 1) / 2) * TREE_SPACING, y: TREE_PAD + d * TREE_LEVEL };
  }
  return {
    pos,
    width: 2 * TREE_PAD + (2 ** (levels - 1) - 1) * TREE_SPACING,
    height: 2 * TREE_PAD + (levels - 1) * TREE_LEVEL,
  };
}
