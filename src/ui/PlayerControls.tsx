import { score, type PlayerAction, type PlayerState } from './player';

type Props = {
  state: PlayerState;
  total: number;
  dispatch(a: PlayerAction): void;
  speedMs: number;
  onSpeed(ms: number): void;
};

export function PlayerControls({ state, total, dispatch, speedMs, onSpeed }: Props) {
  const { correct, answered } = score(state);
  const btn = (label: string, text: string, action: PlayerAction) => (
    <button type="button" aria-label={label} title={label} onClick={() => dispatch(action)}>{text}</button>
  );
  return (
    <div className="player">
      <div className="player-buttons">
        {btn('Start', '⏮', { type: 'seek', index: 0 })}
        {btn('Previous big step', '⏪', { type: 'bigPrev' })}
        {btn('Previous step', '◀', { type: 'prev' })}
        {state.playing ? btn('Pause', '⏸', { type: 'pause' }) : btn('Play', '▶︎', { type: 'play' })}
        {btn('Next step', '⏵', { type: 'next' })}
        {btn('Next big step', '⏩', { type: 'bigNext' })}
        {btn('End', '⏭', { type: 'seek', index: total - 1 })}
      </div>
      <input
        type="range"
        aria-label="Step"
        min={0}
        max={total - 1}
        value={state.index}
        onChange={(e) => dispatch({ type: 'seek', index: Number(e.target.value) })}
      />
      <div className="player-meta">
        <span>Step {state.index + 1} / {total}</span>
        {answered > 0 && <span>Score: {correct} / {answered}</span>}
        <label>
          Speed
          <select value={speedMs} onChange={(e) => onSpeed(Number(e.target.value))}>
            <option value={1200}>Slow</option>
            <option value={600}>Normal</option>
            <option value={250}>Fast</option>
          </select>
        </label>
      </div>
    </div>
  );
}
