import type { Graph } from '../../engine/graph';
import type { Preset } from '../types';

function graphOf(directed: boolean, vertices: Graph['vertices'], pairs: [string, string][]): Graph {
  return { directed, vertices, edges: pairs.map(([u, v]) => ({ u, v })), adjOrder: {} };
}

export const dfsPresets: Preset[] = [
  {
    name: 'Lecture example (DFS slide 5)',
    params: {},
    graph: graphOf(
      true,
      [
        { id: 'v1', x: 310, y: 215 },
        { id: 'v2', x: 260, y: 105 },
        { id: 'v3', x: 470, y: 160 },
        { id: 'v4', x: 525, y: 270 },
        { id: 'v5', x: 420, y: 320 },
        { id: 'v6', x: 50, y: 160 },
        { id: 'v7', x: 155, y: 215 },
        { id: 'v8', x: 100, y: 320 },
      ],
      [
        ['v1', 'v2'], ['v1', 'v3'], ['v2', 'v3'], ['v3', 'v4'], ['v3', 'v5'], ['v5', 'v1'], ['v5', 'v4'],
        ['v6', 'v2'], ['v6', 'v7'], ['v7', 'v1'], ['v7', 'v8'], ['v8', 'v5'], ['v8', 'v6'],
      ],
    ),
  },
  {
    name: 'Undirected, with a cycle',
    params: {},
    graph: graphOf(
      false,
      [
        { id: 'a', x: 120, y: 120 },
        { id: 'b', x: 300, y: 80 },
        { id: 'c', x: 160, y: 300 },
        { id: 'd', x: 340, y: 260 },
        { id: 'e', x: 500, y: 330 },
      ],
      [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'e']],
    ),
  },
];
