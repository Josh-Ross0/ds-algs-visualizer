import type { AlgorithmDef } from '../algorithms/types';
import { vertexIds, type Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AdjacencyPanel } from './AdjacencyPanel';
import { DSPanel } from './DSPanel';
import { GraphCanvas } from './GraphCanvas';
import { PlayerControls } from './PlayerControls';
import { PseudocodePanel } from './PseudocodePanel';
import { Feedback, QuestionOverlay } from './QuestionOverlay';
import type { Settings } from './settings';
import { SettingsPanel } from './SettingsPanel';
import { StatePanel } from './StatePanel';
import { usePlayer } from './usePlayer';

type Props = {
  def: AlgorithmDef;
  graph: Graph;
  steps: Step[];
  settings: Settings;
  onSettingsChange(s: Settings): void;
};

export function Visualizer({ def, graph, steps, settings, onSettingsChange }: Props) {
  const { state, dispatch } = usePlayer(steps, settings);
  const step = steps[state.index];
  const pending = state.pending !== null ? steps[state.pending].question! : null;
  const vertices = vertexIds(graph);

  return (
    <div className="layout">
      <div className="main-col">
        <GraphCanvas
          graph={graph}
          step={step}
          onVertexPointerDown={
            pending?.answer.kind === 'vertex'
              ? (id) => dispatch({ type: 'answer', answer: { kind: 'vertex', value: id } })
              : undefined
          }
        />
        {pending && (
          <QuestionOverlay
            key={state.pending}
            question={pending}
            vertices={vertices}
            onAnswer={(answer) => dispatch({ type: 'answer', answer })}
            onSkip={() => dispatch({ type: 'skip' })}
          />
        )}
        {state.feedback && <Feedback {...state.feedback} />}
        <PlayerControls
          state={state}
          total={steps.length}
          dispatch={dispatch}
          speedMs={settings.speedMs}
          onSpeed={(speedMs) => onSettingsChange({ ...settings, speedMs })}
        />
        <DSPanel ds={step.ds} />
      </div>
      <div className="side-col">
        <PseudocodePanel procs={def.procs} current={step} />
        <StatePanel columns={def.stateColumns} vertices={vertices} step={step} />
        <AdjacencyPanel graph={graph} />
        <SettingsPanel settings={settings} questionTypes={def.questionTypes} onChange={onSettingsChange} />
      </div>
    </div>
  );
}
