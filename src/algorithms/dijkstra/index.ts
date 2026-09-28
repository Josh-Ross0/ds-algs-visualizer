import { DEFAULT_WEIGHT } from '../../engine/graph';
import { sourceErrors } from '../sssp/shared';
import type { AlgorithmDef } from '../types';
import { dijkstraPresets } from './presets';
import { dijkstraProcs } from './pseudocode';
import { dijkstraQuestionTypes } from './questions';
import { runDijkstra } from './run';

export const DIJKSTRA_NEGATIVE_WARNING = 'Dijkstra assumes w ≥ 0. This graph has a negative weight, so the result may be wrong.';

export const dijkstra: AlgorithmDef = {
  id: 'dijkstra',
  title: 'Dijkstra',
  directed: true,
  weighted: true,
  order: 'adjacency',
  procs: dijkstraProcs,
  params: [{ name: 's', label: 'Source s' }],
  stateColumns: [
    { key: 'd', label: 'd' },
    { key: 'pi', label: 'π' },
    { key: 'inQ', label: 'in Q' },
  ],
  questionTypes: dijkstraQuestionTypes,
  presets: dijkstraPresets,
  validate(g, p) {
    const negative = g.edges.some((e) => (e.w ?? DEFAULT_WEIGHT) < 0);
    return { errors: sourceErrors(g, p), warnings: negative ? [DIJKSTRA_NEGATIVE_WARNING] : [] };
  },
  run: runDijkstra,
};
