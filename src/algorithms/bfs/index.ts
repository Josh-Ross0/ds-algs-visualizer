import type { AlgorithmDef } from '../types';
import { bfsPresets } from './presets';
import { bfsProcs } from './pseudocode';
import { bfsQuestionTypes } from './questions';
import { runBfs } from './run';

export const bfs: AlgorithmDef = {
  id: 'bfs',
  title: 'Breadth-First Search (BFS)',
  directed: 'toggle',
  weighted: false,
  order: 'adjacency',
  procs: bfsProcs,
  params: [{ name: 's', label: 'Source s' }],
  stateColumns: [
    { key: 'color', label: 'color' },
    { key: 'd', label: 'd' },
    { key: 'pi', label: 'π' },
  ],
  questionTypes: bfsQuestionTypes,
  presets: bfsPresets,
  validate(g, p) {
    const ok = p.s !== undefined && g.vertices.some((v) => v.id === p.s);
    return { errors: ok ? [] : ['Choose a source vertex s.'], warnings: [] };
  },
  run: runBfs,
};
