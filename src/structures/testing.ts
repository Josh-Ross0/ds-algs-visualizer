import type { Proc } from '../algorithms/types';
import type { StepCore } from '../engine/trace';

// Like assertValidTrace, but the first step may be the call step (line 0).
export function assertValidTreeTrace(def: { procs: Proc[] }, steps: StepCore[]): void {
  if (steps.length === 0) throw new Error('Trace is empty');
  steps.forEach((s, i) => {
    const proc = def.procs.find((p) => p.name === s.proc);
    if (!proc) throw new Error(`Step ${i}: unknown proc ${s.proc}`);
    const min = i === 0 ? 0 : 1;
    if (s.line < min || s.line > proc.lines.length) throw new Error(`Step ${i}: ${s.proc} has no line ${s.line}`);
  });
  if (steps[0].line !== 0) throw new Error('Step 0 must be the call step (line 0)');
}
