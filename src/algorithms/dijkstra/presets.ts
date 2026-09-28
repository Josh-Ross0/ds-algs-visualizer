import { weightedDigraph } from '../sssp/shared';
import type { Preset } from '../types';

export const dijkstraPresets: Preset[] = [
  {
    name: 'Lecture example (Shortest Paths slide 40)',
    params: { s: 's' },
    graph: weightedDigraph(
      [
        { id: 's', x: 45, y: 238 },
        { id: 'v1', x: 126, y: 119 },
        { id: 'v2', x: 213, y: 297 },
        { id: 'v3', x: 300, y: 60 },
        { id: 'v4', x: 343, y: 178 },
        { id: 'v5', x: 430, y: 356 },
        { id: 'v6', x: 516, y: 236 },
        { id: 'v7', x: 560, y: 119 },
      ],
      [
        ['s', 'v1', 3], ['s', 'v2', 5], ['v2', 'v1', 4], ['v1', 'v3', 5], ['v1', 'v4', 8],
        ['v3', 'v4', 1], ['v3', 'v7', 9], ['v4', 'v7', 7], ['v4', 'v2', 4], ['v4', 'v6', 5],
        ['v4', 'v5', 4], ['v2', 'v5', 5], ['v5', 'v6', 3], ['v6', 'v7', 1],
      ],
    ),
  },
  {
    name: 'Tutorial 10, question 1 (negative weight)',
    params: { s: 's' },
    graph: weightedDigraph(
      [
        { id: 's', x: 80, y: 200 },
        { id: 'a', x: 260, y: 90 },
        { id: 'b', x: 260, y: 310 },
        { id: 'c', x: 460, y: 310 },
      ],
      [['s', 'a', 4], ['s', 'b', 3], ['a', 'b', -2], ['b', 'c', 4]],
    ),
  },
];
