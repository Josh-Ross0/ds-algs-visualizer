import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Question } from '../engine/trace';
import { initialPlayerState } from './player';
import { PlayerControls } from './PlayerControls';
import { Feedback, QuestionOverlay } from './QuestionOverlay';
import { DEFAULT_SETTINGS } from './settings';
import { SettingsPanel } from './SettingsPanel';

test('player buttons dispatch actions and show position', async () => {
  const dispatch = vi.fn();
  render(<PlayerControls state={{ ...initialPlayerState(), index: 2 }} total={10} dispatch={dispatch} speedMs={600} onSpeed={() => {}} />);
  expect(screen.getByText('Step 3 / 10')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Next step' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  await userEvent.click(screen.getByRole('button', { name: 'Play' }));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  expect(dispatch.mock.calls.map((c) => c[0])).toEqual([
    { type: 'next' }, { type: 'bigNext' }, { type: 'play' }, { type: 'seek', index: 9 },
  ]);
});

test('player shows score once something was answered', () => {
  render(<PlayerControls state={{ ...initialPlayerState(), outcomes: { 3: 'correct', 5: 'wrong' } }} total={10} dispatch={() => {}} speedMs={600} onSpeed={() => {}} />);
  expect(screen.getByText('Score: 1 / 2')).toBeInTheDocument();
});

const vq: Question = { type: 'bfs.dequeue', prompt: 'Which?', explain: 'Because.', answer: { kind: 'vertex', value: 'b' } };
const nq: Question = { type: 'bfs.distance', prompt: 'Value?', explain: 'Sum.', answer: { kind: 'number', value: 2 } };

test('vertex question offers one button per vertex, plus skip', async () => {
  const onAnswer = vi.fn();
  const onSkip = vi.fn();
  render(<QuestionOverlay question={vq} vertices={['a', 'b']} onAnswer={onAnswer} onSkip={onSkip} />);
  await userEvent.click(screen.getByRole('button', { name: 'b' }));
  expect(onAnswer).toHaveBeenCalledWith({ kind: 'vertex', value: 'b' });
  await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
  expect(onSkip).toHaveBeenCalled();
});

test('number question parses input, accepts ∞', async () => {
  const onAnswer = vi.fn();
  render(<QuestionOverlay question={nq} vertices={[]} onAnswer={onAnswer} onSkip={() => {}} />);
  await userEvent.type(screen.getByLabelText('Your answer'), '2');
  await userEvent.click(screen.getByRole('button', { name: 'Check' }));
  expect(onAnswer).toHaveBeenLastCalledWith({ kind: 'number', value: 2 });
  await userEvent.clear(screen.getByLabelText('Your answer'));
  await userEvent.type(screen.getByLabelText('Your answer'), '∞');
  await userEvent.click(screen.getByRole('button', { name: 'Check' }));
  expect(onAnswer).toHaveBeenLastCalledWith({ kind: 'number', value: Infinity });
});

test('number question disables Check button for empty or invalid input', async () => {
  const onAnswer = vi.fn();
  render(<QuestionOverlay question={nq} vertices={[]} onAnswer={onAnswer} onSkip={() => {}} />);
  const checkBtn = screen.getByRole('button', { name: 'Check' });
  expect(checkBtn).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Your answer'), 'abc');
  expect(checkBtn).toBeDisabled();
  await userEvent.click(checkBtn);
  expect(onAnswer).not.toHaveBeenCalled();
  await userEvent.clear(screen.getByLabelText('Your answer'));
  await userEvent.type(screen.getByLabelText('Your answer'), '5');
  expect(checkBtn).not.toBeDisabled();
});

test('feedback shows correct answer and explanation when wrong', () => {
  render(<Feedback correct={false} question={nq} />);
  expect(screen.getByRole('status')).toHaveTextContent('Not quite. The answer is 2. Sum.');
});

test('settings toggles predict mode and question types', async () => {
  const onChange = vi.fn();
  render(<SettingsPanel settings={DEFAULT_SETTINGS} questionTypes={[{ type: 'bfs.dequeue', label: 'Dequeue' }]} onChange={onChange} />);
  await userEvent.click(screen.getByLabelText('Predict mode'));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, predict: false });
  await userEvent.click(screen.getByLabelText('Dequeue'));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, disabledTypes: ['bfs.dequeue'] });
});
