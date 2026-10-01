import { useRef, type ReactNode } from 'react';
import type { Proc } from '../algorithms/types';
import type { Answer, Question, StepCore } from '../engine/trace';
import { PlayerControls, type PlayerControlsHandle } from './PlayerControls';
import { PseudocodePanel } from './PseudocodePanel';
import { Feedback, QuestionOverlay } from './QuestionOverlay';
import type { Settings } from './settings';
import { SettingsPanel } from './SettingsPanel';
import { usePlayer } from './usePlayer';

type NodeOption = { id: string; label: string };

type Props<S extends StepCore> = {
  steps: S[];
  procs: Proc[];
  questionTypes: { type: string; label: string }[];
  settings: Settings;
  onSettingsChange(s: Settings): void;
  // Choices for vertex questions (graph pages).
  vertices?: string[];
  // Choices for node questions (tree pages), taken from the step on screen.
  nodes?(step: S): NodeOption[];
  // The main picture; `pick` is set while a vertex/node question waits for a click.
  main(step: S, pick?: (id: string) => void): ReactNode;
  below?(step: S): ReactNode;
  side?(step: S): ReactNode;
  // Shown under the controls once the last step is on screen.
  end?: ReactNode;
};

function pickAnswer(q: Question, id: string, options: NodeOption[]): Answer {
  if (q.answer.kind === 'node') {
    return { kind: 'node', value: id, label: options.find((o) => o.id === id)?.label ?? id, nil: q.answer.nil };
  }
  return { kind: 'vertex', value: id };
}

export function Player<S extends StepCore>(p: Props<S>) {
  const { state, dispatch } = usePlayer(p.steps, p.settings);
  const step = p.steps[state.index];
  const pending = state.pending !== null ? p.steps[state.pending].question! : null;
  const nodeOptions = p.nodes?.(step) ?? [];
  const clickable = pending !== null && (pending.answer.kind === 'vertex' || pending.answer.kind === 'node');

  // After Skip or Continue the dialog or result unmounts and focus would fall to
  // <body>, so send it back to the player control. Only these two actions do it:
  // a question closed by a settings change must not pull focus off the settings.
  const playerRef = useRef<PlayerControlsHandle>(null);
  const closeAndRestoreFocus = (type: 'skip' | 'continue') => {
    dispatch({ type });
    playerRef.current?.restoreFocus();
  };

  return (
    <div className="layout">
      <div className="main-col">
        {p.main(step, clickable ? (id) => dispatch({ type: 'answer', answer: pickAnswer(pending!, id, nodeOptions) }) : undefined)}
        {pending && (
          <QuestionOverlay
            key={state.pending}
            question={pending}
            vertices={p.vertices ?? []}
            nodes={nodeOptions}
            onAnswer={(answer) => dispatch({ type: 'answer', answer })}
            onSkip={() => closeAndRestoreFocus('skip')}
          />
        )}
        {state.feedback && <Feedback {...state.feedback} onContinue={() => closeAndRestoreFocus('continue')} />}
        <PlayerControls
          ref={playerRef}
          state={state}
          total={p.steps.length}
          dispatch={dispatch}
          speedMs={p.settings.speedMs}
          onSpeed={(speedMs) => p.onSettingsChange({ ...p.settings, speedMs })}
        />
        {state.index === p.steps.length - 1 && p.end}
        {p.below?.(step)}
      </div>
      <div className="side-col">
        <PseudocodePanel procs={p.procs} current={step} />
        {p.side?.(step)}
        <SettingsPanel settings={p.settings} questionTypes={p.questionTypes} onChange={p.onSettingsChange} />
      </div>
    </div>
  );
}
