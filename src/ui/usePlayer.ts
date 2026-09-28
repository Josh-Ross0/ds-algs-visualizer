import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { Question, Step } from '../engine/trace';
import { createPlayerReducer, initialPlayerState } from './player';
import { isAsked, type Settings } from './settings';

export function usePlayer(steps: Step[], settings: Settings) {
  const asked = useCallback((q: Question) => isAsked(settings, q), [settings]);
  const reducer = useMemo(() => createPlayerReducer(steps, asked), [steps, asked]);
  const [state, dispatch] = useReducer(reducer, undefined, initialPlayerState);

  useEffect(() => {
    if (!state.playing) return;
    const id = setInterval(() => dispatch({ type: 'tick' }), settings.speedMs);
    return () => clearInterval(id);
  }, [state.playing, settings.speedMs]);

  // If predict mode is switched off while a question is open, drop the question.
  useEffect(() => {
    if (state.pending !== null && !asked(steps[state.pending].question!)) dispatch({ type: 'skip' });
  }, [state.pending, asked, steps]);

  return { state, dispatch };
}
