import { MST_VERTICES, weightedGraph } from '../mst/shared';
import type { Preset } from '../types';

export const kruskalPresets: Preset[] = [
  {
    name: 'Lecture example',
    params: {},
    graph: weightedGraph(MST_VERTICES, [
      ['a', 'r', 4], ['a', 'e', 8], ['a', 'c', 7], ['c', 'r', 6], ['d', 'r', 5], ['b', 'r', 7], ['b', 'd', 3], ['c', 'd', 2],
      ['c', 'e', 5], ['c', 'f', 4], ['e', 'f', 3], ['e', 'h', 5], ['d', 'f', 4], ['f', 'g', 4], ['g', 'h', 4],
    ]),
  },
  {
    name: 'Prim lecture example',
    params: {},
    graph: weightedGraph(MST_VERTICES, [
      ['a', 'r', 4], ['a', 'e', 8], ['a', 'c', 7], ['c', 'r', 6], ['d', 'r', 5], ['b', 'r', 7], ['b', 'd', 3], ['c', 'd', 2],
      ['c', 'e', 5], ['c', 'f', 4], ['e', 'f', 3], ['e', 'h', 7], ['d', 'f', 5], ['f', 'g', 4], ['g', 'h', 4],
    ]),
  },
];
