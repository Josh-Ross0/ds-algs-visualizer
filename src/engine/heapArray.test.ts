import { cellId, HEAP_CAPACITY, heapLayout, isHeap, left, makeHeap, parent, right, swapCells } from './heapArray';

test('Left, Right and Parent are the lecture macros', () => {
  expect([left(3), right(3), parent(7), parent(6), parent(2)]).toEqual([6, 7, 3, 3, 1]);
});

test('makeHeap pads with empty cells and gives every cell its own id', () => {
  const h = makeHeap([2, 5, 3], HEAP_CAPACITY, 3);
  expect(h.A).toHaveLength(15);
  expect(h.A.slice(0, 4)).toEqual([2, 5, 3, null]);
  expect(h.heapSize).toBe(3);
  expect(new Set(h.ids).size).toBe(15);
  expect(h.nextId).toBe(16);
});

test('swapCells moves keys and ids together', () => {
  const h = makeHeap([2, 5, 3], 3, 3);
  const before = [cellId(h, 1), cellId(h, 3)];
  swapCells(h, 1, 3);
  expect(h.A).toEqual([3, 5, 2]);
  expect([cellId(h, 1), cellId(h, 3)]).toEqual([before[1], before[0]]);
});

test('isHeap checks the strict heap property, uniqueness and finiteness of live cells only', () => {
  expect(isHeap(makeHeap([2, 5, 3, 9], 15, 4))).toBe(true);
  expect(isHeap(makeHeap([2, 5, 3, 1], 15, 4))).toBe(false); // 1 under 5
  expect(isHeap(makeHeap([2, 5, 5], 15, 3))).toBe(false); // equal keys
  expect(isHeap(makeHeap([2, Infinity], 15, 2))).toBe(false); // ∞ is only ever transient
  expect(isHeap(makeHeap([], 15, 0))).toBe(true);
  expect(isHeap(makeHeap([2, 5, 3, 1], 15, 3))).toBe(true); // the stale cell past heap-size is ignored
});

test('heapLayout fixes index i at one spot: root centred, siblings symmetric, one row per level', () => {
  const L = heapLayout(15);
  expect(L.width).toBe(372);
  expect(L.height).toBe(256);
  expect(L.pos[1].x).toBeCloseTo(L.width / 2);
  expect(L.pos[2].x + L.pos[3].x).toBeCloseTo(L.width);
  expect(L.pos[8].x).toBe(32);
  expect([L.pos[1].y, L.pos[2].y, L.pos[4].y, L.pos[8].y]).toEqual([32, 96, 160, 224]);
  expect(L.pos[4].x).toBeCloseTo((L.pos[8].x + L.pos[9].x) / 2);
});

test('heapLayout of a one-cell array is a single node', () => {
  const L = heapLayout(1);
  expect(L.pos[1]).toEqual({ x: 32, y: 32 });
  expect(L.width).toBe(64);
});
