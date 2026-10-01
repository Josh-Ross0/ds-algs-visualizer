import type { AlgorithmDef } from '../algorithms/types';
import { vertexIds, type Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AdjacencyPanel } from './AdjacencyPanel';
import { DSPanel } from './DSPanel';
import { GraphCanvas } from './GraphCanvas';
import { Player } from './Player';
import type { Settings } from './settings';
import { StatePanel } from './StatePanel';

type Props = {
  def: AlgorithmDef;
  graph: Graph;
  steps: Step[];
  settings: Settings;
  onSettingsChange(s: Settings): void;
};

export function Visualizer({ def, graph, steps, settings, onSettingsChange }: Props) {
  const vertices = vertexIds(graph);
  return (
    <Player
      steps={steps}
      procs={def.procs}
      questionTypes={def.questionTypes}
      settings={settings}
      onSettingsChange={onSettingsChange}
      vertices={vertices}
      main={(step, pick) => (
        <GraphCanvas
          graph={graph}
          step={step}
          weighted={def.weighted}
          plainVertices={def.stateColumns.length === 0}
          onVertexPointerDown={pick}
        />
      )}
      below={(step) => <DSPanel ds={step.ds} />}
      side={(step) => (
        <>
          <StatePanel columns={def.stateColumns} vertices={vertices} step={step} />
          {def.order === 'adjacency' && <AdjacencyPanel graph={graph} />}
        </>
      )}
    />
  );
}
