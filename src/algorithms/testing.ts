import type { Step } from '../engine/trace';
import type { AlgorithmDef } from './types';

export function assertValidTrace(def: AlgorithmDef, steps: Step[]): void {
  if (steps.length === 0) throw new Error('Trace is empty');
  steps.forEach((s, i) => {
    const proc = def.procs.find((p) => p.name === s.proc);
    if (!proc) throw new Error(`Step ${i}: unknown proc ${s.proc}`);
    if (s.line < 1 || s.line > proc.lines.length) {
      throw new Error(`Step ${i}: ${s.proc} has no line ${s.line}`);
    }
  });
}
