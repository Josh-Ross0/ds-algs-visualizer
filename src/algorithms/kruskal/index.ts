import { connectedErrors } from '../mst/shared';
import type { AlgorithmDef } from '../types';
import { kruskalPresets } from './presets';
import { kruskalProcs } from './pseudocode';
import { kruskalQuestionTypes } from './questions';
import { runKruskal } from './run';

export const kruskal: AlgorithmDef = {
  id: 'kruskal',
  title: 'Kruskal',
  directed: false,
  weighted: true,
  order: 'edges',
  procs: kruskalProcs,
  params: [],
  stateColumns: [],
  questionTypes: kruskalQuestionTypes,
  presets: kruskalPresets,
  validate(g) {
    return { errors: connectedErrors(g), warnings: [] };
  },
  run: (g) => runKruskal(g),
};
