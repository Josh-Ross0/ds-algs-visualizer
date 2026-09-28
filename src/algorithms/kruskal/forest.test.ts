import { forestPath } from './forest';

const T = [{ u: 'a', v: 'b' }, { u: 'c', v: 'b' }, { u: 'd', v: 'e' }];

test('forestPath returns the vertices from u to v in T, or null when T does not connect them', () => {
  expect(forestPath(T, 'a', 'c')).toEqual(['a', 'b', 'c']);
  expect(forestPath(T, 'c', 'a')).toEqual(['c', 'b', 'a']);
  expect(forestPath(T, 'a', 'b')).toEqual(['a', 'b']);
  expect(forestPath(T, 'a', 'd')).toBeNull();
  expect(forestPath([], 'a', 'b')).toBeNull();
});
