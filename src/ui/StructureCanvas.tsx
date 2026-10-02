import type { StructureView } from '../structures/types';
import { HeapCanvas } from './HeapCanvas';
import { TreeCanvas } from './TreeCanvas';
import { TwoThreeCanvas } from './TwoThreeCanvas';

type Props = { view: StructureView; onNodeClick?(id: string): void };

export function StructureCanvas({ view, onNodeClick }: Props) {
  if (view.kind === 'tree') return <TreeCanvas view={view} onNodeClick={onNodeClick} />;
  if (view.kind === 'two-three') return <TwoThreeCanvas view={view} onNodeClick={onNodeClick} />;
  return <HeapCanvas view={view} onNodeClick={onNodeClick} />;
}
