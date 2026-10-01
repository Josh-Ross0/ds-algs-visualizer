import type { Proc } from '../../algorithms/types';

export const BUILD_HEAP = 'Build_Heap';
export const HEAPIFY = 'Heapify';
export const HEAP_EXTRACT_MIN = 'Heap_Extract_Min';
export const HEAP_DECREASE_KEY = 'Heap_Decrease_Key';
export const HEAP_INSERT = 'Heap_Insert';

// Efficient DS slides 46, 47, 49, 50, 51 (min-heap; keys are the A[i].key of the slides).
export const heapProcs: Proc[] = [
  {
    name: BUILD_HEAP,
    signature: 'Build_Heap(A)',
    lines: ['A.heap-size = A.length', 'for i = A.length, …, 2, 1 do', '    Heapify(A, i)'],
  },
  {
    name: HEAPIFY,
    signature: 'Heapify(A, i)',
    lines: [
      'ℓ = Left(i)',
      'if ℓ ≤ A.heap-size and A[ℓ].key < A[i].key then',
      '    smallest = ℓ',
      'else smallest = i',
      'r = Right(i)',
      'if r ≤ A.heap-size and A[r].key < A[smallest].key then',
      '    smallest = r',
      'if smallest ≠ i then',
      '    swap A[i] and A[smallest]',
      '    Heapify(A, smallest)',
    ],
  },
  {
    name: HEAP_EXTRACT_MIN,
    signature: 'Heap_Extract_Min(A)',
    lines: [
      'if A.heap-size < 1 then',
      '    error "the heap is empty"',
      'min = A[1]',
      'A[1] = A[A.heap-size]',
      'A.heap-size = A.heap-size − 1',
      'Heapify(A, 1)',
      'return min',
    ],
  },
  {
    name: HEAP_DECREASE_KEY,
    signature: 'Heap_Decrease_Key(A, i, k)',
    lines: [
      'if k > A[i].key then',
      '    error "new key is larger than current key"',
      'A[i].key = k',
      'while i > 1 and A[i].key < A[Parent(i)].key do',
      '    swap A[i] and A[Parent(i)]',
      '    i = Parent(i)',
    ],
  },
  {
    name: HEAP_INSERT,
    signature: 'Heap_Insert(A, x)',
    lines: [
      's = A.heap-size + 1',
      'A[s] = x    ▷ copy all satellite attributes',
      'A[s].key = ∞',
      'A.heap-size = s    ▷ a valid heap of size s',
      'Heap_Decrease_Key(A, s, x.key)',
    ],
  },
];
