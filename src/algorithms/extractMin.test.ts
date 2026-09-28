import type { VertexState } from '../engine/trace';
import { extractMin, extractMinQuestion, keyedQ } from './extractMin';

const st: VertexState = { a: { k: 3 }, b: { k: Infinity }, c: { k: 3 }, d: { k: Infinity } };

test('extractMin returns the smallest key; ties and ∞ break by label', () => {
  expect(extractMin(['d', 'c', 'b', 'a'], st, 'k')).toEqual({ u: 'a', tied: ['c'] });
  expect(extractMin(['d', 'b'], st, 'k')).toEqual({ u: 'b', tied: ['d'] });
  expect(extractMin(['c'], st, 'k')).toEqual({ u: 'c', tied: [] });
});

test('keyedQ lists Q by key, then label', () => {
  expect(keyedQ(['d', 'c', 'b', 'a'], st, 'k')).toEqual({
    kind: 'keyed', name: 'Q', key: 'k',
    items: [{ id: 'a', value: 3 }, { id: 'c', value: 3 }, { id: 'b', value: Infinity }, { id: 'd', value: Infinity }],
  });
});

test('extractMinQuestion names the line, the key and any tie', () => {
  expect(extractMinQuestion('t', 8, 'a', 'k', st, ['c'])).toEqual({
    type: 't',
    prompt: 'Line 8: which vertex does Extract_Min(Q) return?',
    answer: { kind: 'vertex', value: 'a' },
    explain: 'a.k = 3 is the smallest k in Q; it ties with c and ties break by label.',
  });
  expect(extractMinQuestion('t', 4, 'b', 'k', st, []).explain).toBe('b.k = ∞ is the smallest k in Q.');
});
