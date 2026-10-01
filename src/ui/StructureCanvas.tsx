import type { StructureView } from '../structures/types';
import { HeapCanvas } from './HeapCanvas';
import { TreeCanvas } from './TreeCanvas';

type Props = { view: StructureView; onNodeClick?(id: string): void };

export function StructureCanvas({ view, onNodeClick }: Props) {
  return view.kind === 'tree'
    ? <TreeCanvas view={view} onNodeClick={onNodeClick} />
    : <HeapCanvas view={view} onNodeClick={onNodeClick} />;
}
