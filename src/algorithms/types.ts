import type { Graph } from '../engine/graph';
import type { Step } from '../engine/trace';

export type Proc = { name: string; signature: string; lines: string[] };
export type Params = Record<string, string>;
export type ParamSpec = { name: string; label: string };
export type Preset = { name: string; graph: Graph; params: Params };
export type Validation = { errors: string[]; warnings: string[] };

export type AlgorithmDef = {
  id: string;
  title: string;
  directed: boolean | 'toggle';
  weighted: boolean;
  // Which scan order the student can edit: neighbor lists (G.Adj) or the edge list (G.E).
  order: 'adjacency' | 'edges';
  procs: Proc[];
  params: ParamSpec[];
  stateColumns: { key: string; label: string }[];
  questionTypes: { type: string; label: string }[];
  presets: Preset[];
  validate(g: Graph, p: Params): Validation;
  run(g: Graph, p: Params): Step[];
};
