import type { Graph } from '../../engine/graph';
import type { Preset } from '../types';

function undirected(vertices: Graph['vertices'], pairs: [string, string][]): Graph {
  return { directed: false, vertices, edges: pairs.map(([u, v]) => ({ u, v })), adjOrder: {} };
}

function directed(vertices: Graph['vertices'], pairs: [string, string][]): Graph {
  return { directed: true, vertices, edges: pairs.map(([u, v]) => ({ u, v })), adjOrder: {} };
}

export const bfsPresets: Preset[] = [
  {
    name: 'Lecture example',
    params: { s: 's' },
    graph: undirected(
      [
        { id: 's', x: 60, y: 190 },
        { id: 'v1', x: 155, y: 320 },
        { id: 'v2', x: 195, y: 150 },
        { id: 'v3', x: 280, y: 235 },
        { id: 'v4', x: 320, y: 360 },
        { id: 'v5', x: 365, y: 105 },
        { id: 'v6', x: 450, y: 275 },
        { id: 'v7', x: 535, y: 150 },
      ],
      [
        ['s', 'v1'], ['s', 'v2'], ['v1', 'v2'], ['v1', 'v3'], ['v1', 'v4'], ['v2', 'v3'],
        ['v2', 'v5'], ['v4', 'v5'], ['v4', 'v6'], ['v5', 'v6'], ['v5', 'v7'], ['v6', 'v7'],
      ],
    ),
  },
  {
    name: 'Directed, with an unreachable vertex',
    params: { s: 'a' },
    graph: directed(
      [
        { id: 'a', x: 120, y: 200 },
        { id: 'b', x: 280, y: 100 },
        { id: 'c', x: 280, y: 300 },
        { id: 'd', x: 440, y: 200 },
        { id: 'e', x: 120, y: 360 },
      ],
      [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['e', 'a']],
    ),
  },
];
