import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { heap } from '../structures/heap';
import { StructurePage } from './StructurePage';

beforeEach(() => window.localStorage.clear());

// Keys of the tree nodes in index order.
const treeKeys = (c: HTMLElement) => [...c.querySelectorAll('.tnode .key')].map((e) => e.textContent);
const marker = (c: HTMLElement) => c.querySelector('.marker-label');

async function runToEnd() {
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
}

test('Extract Min, keep the result: the minimum is gone, heap-size drops, focus returns to Run', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'extract');
  await runToEnd();
  expect(screen.getByText('Returns 2.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual(['3', '5', '4', '9', '6', '7', '8', '12', '11']);
  expect(marker(container)).toHaveTextContent('heap-size = 9');
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();
});

test('after Extract Min, Insert works on the kept heap and reuses the stale cell', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'extract');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual(['1', '3', '4', '9', '5', '7', '8', '12', '11', '6']);
  expect(marker(container)).toHaveTextContent('heap-size = 10');
});

test('Build Heap builds from the typed array, not from the heap on screen; A.length becomes its length', async () => {
  const { container } = render(<StructurePage def={heap} />);
  expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled(); // the sample array is prefilled
  const input = screen.getByLabelText('Array A');
  await userEvent.clear(input);
  await userEvent.type(input, '5, 3, 1');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual(['1', '3', '5']);
  expect(container.querySelectorAll('.heap-array .cell')).toHaveLength(3);
  expect(marker(container)).toHaveTextContent('heap-size = 3');
});

test('Decrease Key takes an index and a new key', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'decrease');
  await userEvent.type(screen.getByLabelText('Index i'), '10');
  await userEvent.type(screen.getByLabelText('New key k'), '1');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual(['1', '2', '3', '9', '5', '4', '8', '12', '11', '6']);
});

test('Back to the tree discards the run', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'extract');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Back to the tree' }));
  expect(marker(container)).toHaveTextContent('heap-size = 10');
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();
});

test('Clear then Extract Min runs to the error line and keeps the empty heap', async () => {
  const { container } = render(<StructurePage def={heap} />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByText('heap-size = 0 (empty heap)')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'extract');
  await runToEnd();
  expect(container.querySelector('.note')).toHaveTextContent('error "the heap is empty"');
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(treeKeys(container)).toEqual([]);
  expect(marker(container)).toHaveTextContent('heap-size = 0');
});

test('blocked inputs show the spec messages and do not run', async () => {
  render(<StructurePage def={heap} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Key 5 is already in the heap (keys must be unique).');

  await userEvent.selectOptions(screen.getByLabelText('Preset'), 'Full heap (15 keys)');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '100');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('The array is full (A.length = 15).');

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'decrease');
  await userEvent.type(screen.getByLabelText('Index i'), '16');
  await userEvent.type(screen.getByLabelText('New key k'), '0');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose an index between 1 and heap-size.');
  expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
});

test('Run is disabled until every input parses: array text, index and key', async () => {
  render(<StructurePage def={heap} />);
  const run = screen.getByRole('button', { name: 'Run' });
  const array = screen.getByLabelText('Array A');
  for (const text of ['', ',,', '1, x', '1.5']) {
    await userEvent.clear(array);
    if (text) await userEvent.type(array, text);
    expect(run).toBeDisabled();
  }
  await userEvent.clear(array);
  await userEvent.type(array, ' -3 ,  8  4 ');
  expect(run).toBeEnabled();

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'decrease');
  expect(run).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Index i'), '2');
  expect(run).toBeDisabled();
  await userEvent.type(screen.getByLabelText('New key k'), '1');
  expect(run).toBeEnabled();
});
