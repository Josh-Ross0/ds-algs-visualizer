import { connectedErrors } from '../mst/shared';
import type { AlgorithmDef } from '../types';
import { primPresets } from './presets';
import { primProcs } from './pseudocode';
import { primQuestionTypes } from './questions';
import { runPrim } from './run';

export const prim: AlgorithmDef = {
  id: 'prim',
  title: 'Prim',
  directed: false,
  weighted: true,
  order: 'adjacency',
  procs: primProcs,
  params: [{ name: 'r', label: 'Root r' }],
  stateColumns: [
    { key: 'key', label: 'key' },
    { key: 'pi', label: 'π' },
    { key: 'inQ', label: 'in Q' },
  ],
  questionTypes: primQuestionTypes,
  presets: primPresets,
  validate(g, p) {
    const hasRoot = p.r !== undefined && g.vertices.some((v) => v.id === p.r);
    return { errors: [...connectedErrors(g), ...(hasRoot ? [] : ['Choose a root vertex r.'])], warnings: [] };
  },
  run: runPrim,
};
