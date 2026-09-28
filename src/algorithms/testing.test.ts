import type { Step } from '../engine/trace';
import { assertValidTrace } from './testing';
import type { AlgorithmDef } from './types';

const def = {
  procs: [{ name: 'P', signature: 'P(G)', lines: ['a', 'b'] }],
} as unknown as AlgorithmDef;

const step = (proc: string, line: number): Step => ({
  proc, line, bigStep: false, vertexState: {}, vars: {}, ds: [], highlight: {},
});

test('accepts steps on existing lines', () => {
  expect(() => assertValidTrace(def, [step('P', 1), step('P', 2)])).not.toThrow();
});

test('rejects unknown proc, bad line, empty trace', () => {
  expect(() => assertValidTrace(def, [step('Q', 1)])).toThrow(/Q/);
  expect(() => assertValidTrace(def, [step('P', 3)])).toThrow(/line 3/);
  expect(() => assertValidTrace(def, [])).toThrow(/empty/);
});
