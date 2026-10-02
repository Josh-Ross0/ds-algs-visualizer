import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fmtKey } from '../engine/twoThree';
import { twoThree } from '../structures/two-three';
import { StructurePage } from './StructurePage';

beforeEach(() => window.localStorage.clear());

const leafKeys = (c: HTMLElement) => [...c.querySelectorAll('.tnode.leaf .key')].map((e) => e.textContent);
const leaf = (c: HTMLElement, key: string) =>
  [...c.querySelectorAll('.tnode.leaf')].find((g) => g.querySelector('.key')?.textContent === key)!;
const MIN = fmtKey(-Infinity);
const MAX = fmtKey(Infinity);

async function runToEnd() {
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
}

test('the page opens on slide 18 with both sentinels drawn', () => {
  const { container } = render(<StructurePage def={twoThree} />);
  expect(leafKeys(container)).toEqual([MIN, '1', '4', '5', '7', '14', '19', '22', '25', '29', MAX]);
});

test('Insert 23, keep the result, then Search finds it', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '23');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(leafKeys(container)).toEqual([MIN, '1', '4', '5', '7', '14', '19', '22', '23', '25', '29', MAX]);
  expect(container.querySelectorAll('.tnode.active, .tnode.detached')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'search');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '23');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  expect(container.querySelector('.note')).toHaveTextContent('Returns the leaf with key 23.');
});

test('Delete by clicking a leaf: the key field fills in, and keeping the result removes the leaf', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  fireEvent.pointerDown(leaf(container, '19'));
  expect(screen.getByLabelText('Key')).toHaveValue('19');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(leafKeys(container)).toEqual([MIN, '1', '4', '5', '7', '14', '22', '25', '29', MAX]);
});

test('sentinels and internal nodes cannot be clicked into the key field', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  fireEvent.pointerDown(leaf(container, MIN));
  fireEvent.pointerDown(leaf(container, MAX));
  fireEvent.pointerDown(container.querySelector('.tnode:not(.leaf)')!);
  expect(screen.getByLabelText('Key')).toHaveValue('');
});

test('Back to the tree discards the run', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '23');
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Back to the tree' }));
  expect(leafKeys(container)).not.toContain('23');
  expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();
});

test('Clear leaves only the sentinels; Minimum then runs to the error line and keeps the empty tree', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(leafKeys(container)).toEqual([MIN, MAX]);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'minimum');
  await runToEnd();
  expect(container.querySelector('.note')).toHaveTextContent('error: T is empty');
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(leafKeys(container)).toEqual([MIN, MAX]);
});

test('Init replaces the tree on screen with the sentinel-only tree', async () => {
  const { container } = render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'init');
  expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled(); // no input needed
  await runToEnd();
  await userEvent.click(screen.getByRole('button', { name: 'Done: keep result' }));
  expect(leafKeys(container)).toEqual([MIN, MAX]);
});

test('blocked inputs show the spec messages and do not run', async () => {
  render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  await userEvent.type(screen.getByLabelText('Key'), '14');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Key 14 is already in the tree (keys must be unique).');

  await userEvent.selectOptions(screen.getByLabelText('Preset'), 'Full tree (12 keys)');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '100');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('The tree is limited to 12 keys so it stays readable.');

  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'delete');
  await userEvent.clear(screen.getByLabelText('Key'));
  await userEvent.type(screen.getByLabelText('Key'), '99');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('No node with key 99.');
  expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
});

test('Run is disabled for non-integer key text; negative integers and 0 are fine; Minimum and Init need no key', async () => {
  render(<StructurePage def={twoThree} />);
  const key = screen.getByLabelText('Key');
  const run = screen.getByRole('button', { name: 'Run' });
  for (const text of ['1.5', '-', 'abc', '']) {
    await userEvent.clear(key);
    if (text) await userEvent.type(key, text);
    expect(run).toBeDisabled();
  }
  for (const text of ['-3', '0']) {
    await userEvent.clear(key);
    await userEvent.type(key, text);
    expect(run).toBeEnabled();
  }
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'minimum');
  expect(run).toBeEnabled();
});

test('keys outside the safe integer range leave Run disabled; ordinary keys enable it', async () => {
  render(<StructurePage def={twoThree} />);
  await userEvent.selectOptions(screen.getByLabelText('Operation'), 'insert');
  const key = screen.getByLabelText('Key');
  const run = screen.getByRole('button', { name: 'Run' });
  for (const bad of ['9'.repeat(400), '9007199254740993']) {
    await userEvent.clear(key);
    await userEvent.type(key, bad);
    expect(run).toBeDisabled();
  }
  for (const good of ['42', '-3']) {
    await userEvent.clear(key);
    await userEvent.type(key, good);
    expect(run).toBeEnabled();
  }
});
