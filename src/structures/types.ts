import type { Proc } from '../algorithms/types';
import type { DSView, StepCore } from '../engine/trace';
import type { NilSlot, NodeId, Tree } from '../engine/tree';

export type TreeView = {
  tree: Tree;
  // nodes: highlighted nodes; edges: child ids whose edge to their parent is highlighted.
  highlight: { nodes: NodeId[]; edges: NodeId[] };
  // Pointer variables drawn beside the node they point to (x, y, z, …).
  tags: Record<string, NodeId>;
  nil?: NilSlot;
};
export type TreeStep = StepCore & { view: TreeView; ds: DSView[] };

export type Operation = { id: string; label: string; input: 'none' | 'key' | 'node'; procs: string[] };

export type StructureDef = {
  id: string;
  title: string;
  procs: Proc[];
  operations: Operation[];
  questionTypes: { type: string; label: string }[];
  presets: { name: string; keys: number[] }[];
  maxNodes: number;
  build(keys: number[]): Tree;
  validate(t: Tree, op: string, key: number | null): string[];
  run(t: Tree, op: string, key: number | null): TreeStep[];
};
