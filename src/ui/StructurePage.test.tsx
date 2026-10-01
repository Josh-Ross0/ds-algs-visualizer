import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bst } from '../structures/bst';
import { StructurePage } from './StructurePage';

beforeEach(() => window.localStorage.clear());

const keysOnCanvas = (c: HTMLElement) =>
  [...c.querySelectorAll('.tnode')].map((g) => g.textContent).sort((a, b) => Number(a) - Number(b));

test('insert 10, keep the result, then search finds it', async () => {
  const { container } = render(<StructurePage def={bst} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(keysOnCanvas(container)).toContain('10');
  expect(container.querySelectorAll('.tnode.active, .tnode.detached')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'search');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  expect(screen.getByText('Returns the node with key 10.')).toBeInTheDocument();
});

test('Back to the tree discards the run', async () => {
  const { container } = render(<StructurePage def={bst} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  await userEvent.type(screen.getByLabelText('Key'), '17');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back to the tree' }));
  expect(keysOnCanvas(container)).toContain('17');
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();
});

test('blocked inputs show a message and do not run', async () => {
  render(<StructurePage def={bst} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '12');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Key 12 is already in the tree (keys must be unique).');
  expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
});

test('Run is disabled for non-integer key text; negative integers are fine; Minimum needs no key', async () => {
  render(<StructurePage def={bst} />);
  const key = screen.getByLabelText('Key');
  const run = screen.getByRole('button', { name: 'Run' });
  for (const text of ['1.5', '-', 'abc']) {
    await userEvent.clear(key);
    await userEvent.type(key, text);
    expect(run).toBeDisabled();
  }
  await userEvent.clear(key);
  expect(run).toBeDisabled();
  await userEvent.type(key, '-3');
  expect(run).toBeEnabled();
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'minimum');
  expect(screen.queryByLabelText('Key')).toBeNull();
  expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
});

test('Clear empties the tree; Reset to preset restores it; clicking a node fills the key for node operations', async () => {
  const { container } = render(<StructurePage def={bst} />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByText('T.root = NIL (empty tree)')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Reset to preset' }));
  expect(container.querySelectorAll('.tnode')).toHaveLength(12);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'successor');
  const n12 = [...container.querySelectorAll('.tnode')].find((g) => g.textContent === '12')!;
  await userEvent.pointer({ keys: '[MouseLeft>]', target: n12 });
  expect(screen.getByLabelText('Key')).toHaveValue('12');
});

test('a node question inside Delete offers the current nodes and NIL', async () => {
  render(<StructurePage def={bst} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  await userEvent.type(screen.getByLabelText('Key'), '17');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  let dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Deleting node x with key 17: which case applies?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'case 4: two children' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Which node will Tree_Successor(17) return?');
  expect(within(dialog).getByRole('button', { name: 'NIL' })).toBeInTheDocument();
  expect(within(dialog).getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent ?? ''))).toHaveLength(12);
  await userEvent.click(within(dialog).getByRole('button', { name: '18' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
});
