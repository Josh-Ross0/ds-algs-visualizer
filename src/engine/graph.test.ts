import {
  addEdge, addVertex, adjacency, canAddVertex, compareLabels, edgeKey, hasEdge,
  MAX_VERTICES, moveInAdjacency, nextLabel, removeEdge, removeVertex, resetAdjacency,
  setDirected, vertexIds, type Graph,
} from './graph';

function g(directed: boolean, ids: string[], edges: [string, string][]): Graph {
  return {
    directed,
    vertices: ids.map((id, i) => ({ id, x: i * 10, y: 0 })),
    edges: edges.map(([u, v]) => ({ u, v })),
    adjOrder: {},
  };
}

test('labels compare naturally', () => {
  expect(['v10', 'v2', 's', 'v1'].sort(compareLabels)).toEqual(['s', 'v1', 'v2', 'v10']);
});

test('vertexIds are sorted by label', () => {
  expect(vertexIds(g(false, ['v2', 's', 'v1'], []))).toEqual(['s', 'v1', 'v2']);
});

test('edgeKey is direction-aware', () => {
  expect(edgeKey(g(true, [], []), 'b', 'a')).toBe('b->a');
  expect(edgeKey(g(false, [], []), 'b', 'a')).toBe('a--b');
});

test('undirected adjacency includes both directions, sorted by label', () => {
  const G = g(false, ['a', 'b', 'c'], [['c', 'a'], ['a', 'b']]);
  expect(adjacency(G, 'a')).toEqual(['b', 'c']);
  expect(adjacency(G, 'c')).toEqual(['a']);
});

test('directed adjacency only has out-neighbors', () => {
  const G = g(true, ['a', 'b'], [['a', 'b']]);
  expect(adjacency(G, 'a')).toEqual(['b']);
  expect(adjacency(G, 'b')).toEqual([]);
});

test('custom adjacency order is respected, new neighbors appended', () => {
  let G = g(false, ['a', 'b', 'c', 'd'], [['a', 'b'], ['a', 'c']]);
  G = moveInAdjacency(G, 'a', 1, -1);
  expect(adjacency(G, 'a')).toEqual(['c', 'b']);
  G = addEdge(G, 'a', 'd');
  expect(adjacency(G, 'a')).toEqual(['c', 'b', 'd']);
  expect(adjacency(resetAdjacency(G), 'a')).toEqual(['b', 'c', 'd']);
});

test('moveInAdjacency ignores out-of-range moves', () => {
  const G = g(false, ['a', 'b', 'c'], [['a', 'b'], ['a', 'c']]);
  expect(adjacency(moveInAdjacency(G, 'a', 0, -1), 'a')).toEqual(['b', 'c']);
});

test('addEdge ignores self-loops and duplicates', () => {
  const G = g(false, ['a', 'b'], [['a', 'b']]);
  expect(addEdge(G, 'a', 'a')).toBe(G);
  expect(addEdge(G, 'b', 'a')).toBe(G);
  expect(hasEdge(G, 'b', 'a')).toBe(true);
});

test('removeEdge and removeVertex clean up', () => {
  let G = g(false, ['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  G = moveInAdjacency(G, 'b', 1, -1);
  expect(removeEdge(G, 'b', 'a').edges).toEqual([{ u: 'b', v: 'c' }]);
  G = removeVertex(G, 'c');
  expect(vertexIds(G)).toEqual(['a', 'b']);
  expect(G.edges).toEqual([{ u: 'a', v: 'b' }]);
  expect(G.adjOrder.b).toEqual(['a']);
});

test('nextLabel continues numbered labels, else uses free letters', () => {
  expect(nextLabel(g(false, ['s', 'v1', 'v2', 'v7'], []))).toBe('v8');
  expect(nextLabel(g(false, ['a', 'b', 'd'], []))).toBe('c');
  expect(nextLabel(g(false, [], []))).toBe('a');
});

test('vertex cap', () => {
  const ids = Array.from({ length: MAX_VERTICES }, (_, i) => `v${i + 1}`);
  const full = g(false, ids, []);
  expect(canAddVertex(full)).toBe(false);
  expect(() => addVertex(full, 0, 0)).toThrow();
  expect(vertexIds(addVertex(g(false, ['a'], []), 5, 6))).toEqual(['a', 'b']);
});

test('setDirected to undirected merges opposite edges and resets order', () => {
  let G = g(true, ['a', 'b'], [['a', 'b'], ['b', 'a']]);
  G = moveInAdjacency(G, 'a', 0, 0);
  const U = setDirected(G, false);
  expect(U.edges).toEqual([{ u: 'a', v: 'b' }]);
  expect(U.adjOrder).toEqual({});
});
