import type { StepCore } from '../engine/trace';
import type { Proc } from './types';

export function assertValidTrace(def: { procs: Proc[] }, steps: StepCore[]): void {
  if (steps.length === 0) throw new Error('Trace is empty');
  steps.forEach((s, i) => {
    const proc = def.procs.find((p) => p.name === s.proc);
    if (!proc) throw new Error(`Step ${i}: unknown proc ${s.proc}`);
    if (s.line < 1 || s.line > proc.lines.length) {
      throw new Error(`Step ${i}: ${s.proc} has no line ${s.line}`);
    }
  });
}

// Indices of every step in the trace that carries a question.
export function questionSteps(steps: StepCore[]): number[] {
  return steps.flatMap((s, i) => (s.question ? [i] : []));
}

// A question is asked before its step is shown, so the student predicts from
// the step displayed just before it (index i - 1). Runs `check` against that
// prior step and the question step for every question in the trace.
export function assertQuestionsPredictable<S extends StepCore>(
  steps: S[],
  check: (prevStep: S, questionStep: S, index: number) => void,
): void {
  for (const i of questionSteps(steps)) {
    if (i < 1) throw new Error(`Step ${i}: question has no prior step to predict from`);
    check(steps[i - 1], steps[i], i);
  }
}
