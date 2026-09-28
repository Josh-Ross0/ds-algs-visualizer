import { sourceErrors } from '../sssp/shared';
import type { AlgorithmDef } from '../types';
import { bellmanFordPresets } from './presets';
import { bellmanFordProcs } from './pseudocode';
import { bellmanFordQuestionTypes } from './questions';
import { runBellmanFord } from './run';

export const bellmanFord: AlgorithmDef = {
  id: 'bellman-ford',
  title: 'Bellman-Ford',
  directed: true,
  weighted: true,
  order: 'edges',
  procs: bellmanFordProcs,
  params: [{ name: 's', label: 'Source s' }],
  stateColumns: [
    { key: 'd', label: 'd' },
    { key: 'pi', label: 'π' },
  ],
  questionTypes: bellmanFordQuestionTypes,
  presets: bellmanFordPresets,
  validate(g, p) {
    return { errors: sourceErrors(g, p), warnings: [] };
  },
  run: runBellmanFord,
};
