import { weightedDigraph } from '../sssp/shared';
import type { Preset } from '../types';

export const bellmanFordPresets: Preset[] = [
  {
    name: 'Lecture example',
    params: { s: 's' },
    graph: weightedDigraph(
      [
        { id: 's', x: 45, y: 335 },
        { id: 'v1', x: 84, y: 80 },
        { id: 'v2', x: 123, y: 233 },
        { id: 'v3', x: 241, y: 335 },
        { id: 'v4', x: 281, y: 132 },
        { id: 'v5', x: 398, y: 233 },
        { id: 'v6', x: 477, y: 80 },
        { id: 'v7', x: 556, y: 335 },
      ],
      [
        ['s', 'v2', 4], ['s', 'v3', -5], ['v1', 's', 5], ['v2', 'v4', 5], ['v3', 'v4', 4],
        ['v3', 'v5', 1], ['v4', 'v1', -2], ['v4', 'v6', -4], ['v5', 'v4', 2], ['v5', 'v6', -1],
        ['v5', 'v7', 6], ['v6', 'v7', 5], ['v7', 'v3', -3],
      ],
    ),
  },
  {
    name: 'Negative weight cycle',
    params: { s: 's' },
    graph: weightedDigraph(
      [
        { id: 's', x: 80, y: 210 },
        { id: 'a', x: 240, y: 110 },
        { id: 'b', x: 400, y: 210 },
        { id: 'c', x: 240, y: 310 },
      ],
      [['s', 'a', 2], ['a', 'b', 1], ['b', 'c', -4], ['c', 'a', 2]],
    ),
  },
];
