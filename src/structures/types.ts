import type { Proc } from '../algorithms/types';
import type { DSView, StepCore } from '../engine/trace';
import type { HeapArray } from '../engine/heapArray';
import type { NilSlot, NodeId, Tree } from '../engine/tree';

type TreeShape = {
  tree: Tree;
  // nodes: highlighted nodes; edges: child ids whose edge to their parent is highlighted.
  highlight: { nodes: NodeId[]; edges: NodeId[] };
  // Pointer variables drawn beside the node they point to (x, y, z, T.root, …).
  tags: Record<string, NodeId>;
  nil?: NilSlot;
};
export type TreeView = TreeShape & { kind: 'tree' };
export type TwoThreeView = TreeShape & { kind: 'two-three' };

export type HeapView = {
  kind: 'heap';
  heap: HeapArray;
  // cells: highlighted indices; edges: child indices whose edge to their parent is highlighted.
  highlight: { cells: number[]; edges: number[] };
  // Index variables (i, ℓ, r, smallest, s) drawn beside their node and under their array cell.
  tags: Record<string, number>;
};

export type StructureView = TreeView | TwoThreeView | HeapView;
export type StructureStep<V extends StructureView = StructureView> = StepCore & { view: V; ds: DSView[] };
export type TreeStep = StructureStep<TreeView>;
export type HeapStep = StructureStep<HeapView>;
export type TwoThreeStep = StructureStep<TwoThreeView>;

// input: what the operation bar asks for. 'node' = a key typed or a node clicked; 'array' = a
// comma-separated list (sample is its initial text); 'index-key' = an array index i and a key k.
export type Operation = {
  id: string;
  label: string;
  input: 'none' | 'key' | 'node' | 'array' | 'index-key';
  procs: string[];
  sample?: string;
};

// S = the structure's state (Tree, HeapArray); V = the view its steps carry.
export type StructureDef<S = Tree, V extends StructureView = TreeView> = {
  id: string;
  title: string;
  procs: Proc[];
  operations: Operation[];
  questionTypes: { type: string; label: string }[];
  presets: { name: string; keys: number[] }[];
  maxNodes: number;
  build(keys: number[]): S;
  // The picture of a state in setup; selectedKey is the node an operation is aimed at, if any.
  view(s: S, selectedKey: number | null): V;
  // The state a finished run leaves behind ("Done: keep result").
  keep(v: V): S;
  // Key of the node with this id, for operations whose input is a node.
  nodeKey?(s: S, id: string): number | null;
  // args: [] (no input), [key], [index, key] or the array's keys, per Operation.input.
  validate(s: S, op: string, args: number[]): string[];
  run(s: S, op: string, args: number[]): StructureStep<V>[];
};

// The registry and App hold structures of different S and V.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStructure = StructureDef<any, any>;
