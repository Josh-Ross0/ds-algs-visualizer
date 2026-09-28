import { forwardRef, useImperativeHandle, useRef } from 'react';
import { score, type PlayerAction, type PlayerState } from './playerReducer';
import { SPEED_OPTIONS } from './settings';

type Props = {
  state: PlayerState;
  total: number;
  dispatch(a: PlayerAction): void;
  speedMs: number;
  onSpeed(ms: number): void;
};

export type PlayerControlsHandle = { restoreFocus(): void };

// The button the student last used to advance playback, so focus can return
// there (or to "Next step" as a fallback) once a question dialog closes.
export const PlayerControls = forwardRef<PlayerControlsHandle, Props>(function PlayerControls(
  { state, total, dispatch, speedMs, onSpeed },
  ref,
) {
  const { correct, answered } = score(state);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastUsedRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    restoreFocus() {
      const fallback = buttonRefs.current['Next step'];
      const el = (lastUsedRef.current && buttonRefs.current[lastUsedRef.current]) || fallback;
      el?.focus();
    },
  }), []);

  const btn = (label: string, text: string, action: PlayerAction) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      ref={(el) => { buttonRefs.current[label] = el; }}
      onClick={() => { lastUsedRef.current = label; dispatch(action); }}
    >{text}</button>
  );
  return (
    <div className="player">
      <div className="player-buttons">
        {btn('Start', '⏮︎', { type: 'seek', index: 0 })}
        {btn('Previous big step', '⏪︎', { type: 'bigPrev' })}
        {btn('Previous step', '◀︎', { type: 'prev' })}
        {state.playing ? btn('Pause', '⏸︎', { type: 'pause' }) : btn('Play', '▶︎', { type: 'play' })}
        {btn('Next step', '⏵︎', { type: 'next' })}
        {btn('Next big step', '⏩︎', { type: 'bigNext' })}
        {btn('End', '⏭︎', { type: 'seek', index: total - 1 })}
      </div>
      <input
        type="range"
        aria-label="Step"
        min={0}
        max={total - 1}
        value={state.index}
        onChange={(e) => { lastUsedRef.current = null; dispatch({ type: 'seek', index: Number(e.target.value) }); }}
      />
      <div className="player-meta">
        <span>Step {state.index + 1} / {total}</span>
        {answered > 0 && <span>Score: {correct} / {answered}</span>}
        <label>
          Speed
          <select value={speedMs} onChange={(e) => onSpeed(Number(e.target.value))}>
            {SPEED_OPTIONS.map((o) => (
              <option key={o.ms} value={o.ms}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
});
