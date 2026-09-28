import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AdjacencyPanel } from './AdjacencyPanel';
import { DSPanel } from './DSPanel';
import { PseudocodePanel } from './PseudocodePanel';
import { StatePanel } from './StatePanel';

const step: Step = {
  proc: 'BFS', line: 3, bigStep: true,
  vertexState: { a: { color: 'gray', d: 0, pi: null }, b: { color: 'white', d: Infinity, pi: null } },
  vars: { s: 'a', u: 'a' },
  ds: [{ kind: 'queue', name: 'Q', items: ['b', 'c'] }],
  highlight: {},
  note: 'hello note',
};

test('pseudocode highlights the current line of the current proc', () => {
  render(
    <PseudocodePanel
      procs={[
        { name: 'BFS', signature: 'BFS(G, s)', lines: ['one', 'two', 'three'] },
        { name: 'Init', signature: 'Init(G)', lines: ['x', 'y', 'z'] },
      ]}
      current={{ proc: 'BFS', line: 3 }}
    />,
  );
  const current = screen.getByText('three').closest('li')!;
  expect(current).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('z').closest('li')).not.toHaveAttribute('aria-current');
});

test('state panel formats ∞ and NIL, shows vars and note', () => {
  render(<StatePanel columns={[{ key: 'd', label: 'd' }, { key: 'pi', label: 'π' }]} vertices={['a', 'b']} step={step} />);
  const rowB = screen.getByRole('row', { name: /^b/ });
  expect(within(rowB).getByText('∞')).toBeInTheDocument();
  expect(within(rowB).getByText('NIL')).toBeInTheDocument();
  expect(screen.getByText('u = a')).toBeInTheDocument();
  expect(screen.getByText('hello note')).toBeInTheDocument();
});

test('ds panel shows queue from head to tail', () => {
  render(<DSPanel ds={step.ds} />);
  const items = within(screen.getByLabelText('Q contents')).getAllByText(/\w+/).map((e) => e.textContent);
  expect(items).toEqual(['b', 'c']);
});

test('adjacency panel lists neighbors and reports moves', async () => {
  const g: Graph = {
    directed: false,
    vertices: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }, { id: 'c', x: 0, y: 0 }],
    edges: [{ u: 'a', v: 'b' }, { u: 'a', v: 'c' }],
    adjOrder: {},
  };
  const onMove = vi.fn();
  render(<AdjacencyPanel graph={g} onMove={onMove} onReset={() => {}} />);
  expect(screen.getByLabelText('G.Adj[a]')).toHaveTextContent('b');
  await userEvent.click(screen.getByRole('button', { name: 'Move c earlier in G.Adj[a]' }));
  expect(onMove).toHaveBeenCalledWith('a', 1, -1);
});

test('adjacency panel is read-only without onMove', () => {
  const g: Graph = { directed: false, vertices: [{ id: 'a', x: 0, y: 0 }], edges: [], adjOrder: {} };
  render(<AdjacencyPanel graph={g} />);
  expect(screen.queryByRole('button')).toBeNull();
});
