import type { Question, Step } from '../engine/trace';
import { createPlayerReducer, initialPlayerState, score, type PlayerAction, type PlayerState } from './player';

const q: Question = { type: 't', prompt: 'p', explain: 'e', answer: { kind: 'vertex', value: 'a' } };
const mk = (bigStep = false, question?: Question): Step => ({
  proc: 'P', line: 1, bigStep, vertexState: {}, vars: {}, ds: [], highlight: {}, question,
});
// indices:        0      1          2        3           4
const steps = [mk(), mk(true), mk(false, q), mk(true), mk()];

function run(actions: PlayerAction[], asked = true): PlayerState {
  const r = createPlayerReducer(steps, () => asked);
  return actions.reduce(r, initialPlayerState());
}

test('next and prev move one step and clamp', () => {
  expect(run([{ type: 'next' }]).index).toBe(1);
  expect(run([{ type: 'prev' }]).index).toBe(0);
});

test('moving into a question step holds it as pending', () => {
  const s = run([{ type: 'next' }, { type: 'next' }]);
  expect(s.index).toBe(1);
  expect(s.pending).toBe(2);
  expect(run([{ type: 'next' }, { type: 'next' }, { type: 'next' }]).index).toBe(1);
});

test('correct answer advances with feedback', () => {
  const s = run([{ type: 'next' }, { type: 'next' }, { type: 'answer', answer: { kind: 'vertex', value: 'a' } }]);
  expect(s.index).toBe(2);
  expect(s.pending).toBeNull();
  expect(s.feedback?.correct).toBe(true);
  expect(score(s)).toEqual({ correct: 1, answered: 1 });
});

test('wrong answer advances and pauses', () => {
  const s = run([
    { type: 'play' }, { type: 'tick' }, { type: 'tick' },
    { type: 'answer', answer: { kind: 'vertex', value: 'b' } },
  ]);
  expect(s.index).toBe(2);
  expect(s.playing).toBe(false);
  expect(s.feedback?.correct).toBe(false);
  expect(score(s)).toEqual({ correct: 0, answered: 1 });
});

test('skip advances without feedback and is not re-asked', () => {
  const s = run([{ type: 'next' }, { type: 'next' }, { type: 'skip' }, { type: 'prev' }, { type: 'next' }]);
  expect(s.index).toBe(2);
  expect(s.pending).toBeNull();
  expect(s.outcomes[2]).toBe('skipped');
});

test('questions not asked when disabled', () => {
  expect(run([{ type: 'next' }, { type: 'next' }], false).index).toBe(2);
});

test('bigNext stops at question steps, then big steps, then the end', () => {
  expect(run([{ type: 'bigNext' }]).index).toBe(1);
  expect(run([{ type: 'bigNext' }, { type: 'bigNext' }]).pending).toBe(2);
  expect(run([{ type: 'bigNext' }, { type: 'bigNext' }], false).index).toBe(3);
  expect(run([{ type: 'seek', index: 3 }, { type: 'bigNext' }]).index).toBe(4);
});

test('bigPrev goes to previous big step or start', () => {
  expect(run([{ type: 'seek', index: 4 }, { type: 'bigPrev' }]).index).toBe(3);
  expect(run([{ type: 'seek', index: 3 }, { type: 'bigPrev' }]).index).toBe(1);
  expect(run([{ type: 'seek', index: 1 }, { type: 'bigPrev' }]).index).toBe(0);
});

test('seek clamps and does not ask', () => {
  expect(run([{ type: 'seek', index: 99 }]).index).toBe(4);
  expect(run([{ type: 'seek', index: 2 }]).pending).toBeNull();
});

test('tick at the end stops playback', () => {
  const s = run([{ type: 'seek', index: 4 }, { type: 'play' }, { type: 'tick' }]);
  expect(s.playing).toBe(false);
  expect(s.index).toBe(4);
});

test('feedback clears when moving to next question', () => {
  const twoQ = [mk(), mk(false, q), mk(false, q)];
  const r = createPlayerReducer(twoQ, () => true);
  const actions: PlayerAction[] = [
    { type: 'next' },
    { type: 'answer', answer: { kind: 'vertex', value: 'a' } },
    { type: 'next' },
  ];
  const s = actions.reduce(r, initialPlayerState());
  expect(s.index).toBe(1);
  expect(s.pending).toBe(2);
  expect(s.feedback).toBeNull();
});
