import {
  addEdge, addVertex, adjacency, canAddVertex, compareLabels, DEFAULT_WEIGHT, edgeKey, edgeList, hasEdge,
  MAX_VERTICES, moveInAdjacency, moveInEdgeList, moveVertex, nextLabel, removeEdge, removeVertex, resetAdjacency,
  resetEdgeOrder, setDirected, setWeight, vertexIds, weightOf, type Graph,
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

function wg(edges: [string, string, number][]): Graph {
  return {
    directed: true,
    vertices: ['s', 'a', 'b'].map((id, i) => ({ id, x: i * 10, y: 0 })),
    edges: edges.map(([u, v, w]) => ({ u, v, w })),
    adjOrder: {},
  };
}

test('addEdge keeps a weight; weightOf reads it, defaulting to 1', () => {
  const G = addEdge(g(true, ['a', 'b'], []), 'a', 'b', -3);
  expect(G.edges).toEqual([{ u: 'a', v: 'b', w: -3 }]);
  expect(weightOf(G, 'a', 'b')).toBe(-3);
  expect(weightOf(g(true, ['a', 'b'], [['a', 'b']]), 'a', 'b')).toBe(DEFAULT_WEIGHT);
  expect(() => weightOf(G, 'b', 'a')).toThrow(/b->a/);
});

test('setWeight changes only that edge', () => {
  const G = setWeight(wg([['s', 'a', 1], ['a', 'b', 2]]), 'a', 'b', 7);
  expect(G.edges).toEqual([{ u: 's', v: 'a', w: 1 }, { u: 'a', v: 'b', w: 7 }]);
});

test('moveVertex moves only that vertex', () => {
  const G = moveVertex(g(false, ['a', 'b'], []), 'b', 55, 66);
  expect(G.vertices).toEqual([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 55, y: 66 }]);
});

test('edgeList defaults to label order of (u, v)', () => {
  const G = wg([['b', 'a', 1], ['s', 'b', 1], ['a', 'b', 1], ['s', 'a', 1]]);
  expect(edgeList(G).map((e) => `${e.u}->${e.v}`)).toEqual(['a->b', 'b->a', 's->a', 's->b']);
});

test('moveInEdgeList swaps neighbors and clamps at the ends', () => {
  const G = wg([['s', 'a', 1], ['a', 'b', 1], ['s', 'b', 1]]);
  const moved = moveInEdgeList(G, 2, -1);
  expect(edgeList(moved).map((e) => `${e.u}->${e.v}`)).toEqual(['a->b', 's->b', 's->a']);
  expect(moveInEdgeList(G, 0, -1)).toBe(G);
  expect(moveInEdgeList(G, 2, 1)).toBe(G);
  expect(edgeList(resetEdgeOrder(moved)).map((e) => `${e.u}->${e.v}`)).toEqual(['a->b', 's->a', 's->b']);
});

test('removing an edge or vertex prunes edgeOrder, so a re-added edge goes back to label order', () => {
  const G = moveInEdgeList(wg([['s', 'a', 1], ['a', 'b', 1], ['s', 'b', 1]]), 2, -1);
  const noSB = removeEdge(G, 's', 'b');
  expect(noSB.edgeOrder).toEqual(['a->b', 's->a']);
  const readded = addEdge(noSB, 's', 'b', 1);
  expect(edgeList(readded).map((e) => `${e.u}->${e.v}`)).toEqual(['a->b', 's->a', 's->b']);
  expect(removeVertex(G, 'a').edgeOrder).toEqual(['s->b']);
});

test('edgeList appends edges missing from a custom order in label order', () => {
  const G = { ...wg([['s', 'a', 1], ['a', 'b', 1], ['s', 'b', 1]]), edgeOrder: ['s->b', 'gone->x'] };
  expect(edgeList(G).map((e) => `${e.u}->${e.v}`)).toEqual(['s->b', 'a->b', 's->a']);
});
