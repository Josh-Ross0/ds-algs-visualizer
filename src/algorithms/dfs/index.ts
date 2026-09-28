import type { AlgorithmDef } from '../types';
import { dfsPresets } from './presets';
import { dfsProcs } from './pseudocode';
import { dfsQuestionTypes } from './questions';
import { runDfs } from './run';

export const dfs: AlgorithmDef = {
  id: 'dfs',
  title: 'Depth-First Search (DFS)',
  directed: 'toggle',
  weighted: false,
  order: 'adjacency',
  procs: dfsProcs,
  params: [],
  stateColumns: [
    { key: 'color', label: 'color' },
    { key: 'd', label: 'd' },
    { key: 'f', label: 'f' },
    { key: 'pi', label: 'π' },
  ],
  questionTypes: dfsQuestionTypes,
  presets: dfsPresets,
  validate(g) {
    return { errors: g.vertices.length === 0 ? ['Add at least one vertex.'] : [], warnings: [] };
  },
  run: (g) => runDfs(g),
};
