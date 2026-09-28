import { removeEdge } from '../../engine/graph';
import { mulberry32 } from '../sssp/reference';
import { bruteForceMstWeight, randomWeightedGraph } from './reference';
import { connectedErrors, MST_VERTICES, weightedGraph } from './shared';

const NOT_CONNECTED = 'This graph is not connected. An MST needs a connected graph: add edges or remove the isolated part.';

test('weightedGraph builds an undirected weighted graph', () => {
  const g = weightedGraph(MST_VERTICES.slice(0, 2), [['a', 'r', 4]]);
  expect(g).toEqual({ directed: false, vertices: MST_VERTICES.slice(0, 2), edges: [{ u: 'a', v: 'r', w: 4 }], adjOrder: {} });
});

test('connectedErrors: connected passes, disconnected and empty are blocked', () => {
  const tri = weightedGraph(MST_VERTICES.slice(0, 3), [['a', 'r', 1], ['a', 'b', 2]]);
  expect(connectedErrors(tri)).toEqual([]);
  expect(connectedErrors(removeEdge(tri, 'a', 'b'))).toEqual([NOT_CONNECTED]);
  expect(connectedErrors({ ...tri, vertices: [], edges: [] })).toEqual(['Add at least one vertex.']);
});

test('reference: brute-force MST weight on a small known graph, random graphs stay within limits', () => {
  const g = weightedGraph(MST_VERTICES.slice(0, 3), [['a', 'r', 1], ['a', 'b', 2], ['b', 'r', 5]]);
  expect(bruteForceMstWeight(g)).toBe(3);
  const rand = mulberry32(1);
  for (let n = 0; n < 10; n++) {
    const r = randomWeightedGraph(rand);
    expect(r.directed).toBe(false);
    expect(r.vertices.length).toBeLessThanOrEqual(6);
    expect(r.edges.every((e) => Number.isInteger(e.w) && e.w! >= 1 && e.w! <= 9)).toBe(true);
  }
});
