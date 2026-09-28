import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AdjacencyPanel } from './AdjacencyPanel';
import { DSPanel } from './DSPanel';
import { EdgeListPanel } from './EdgeListPanel';
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

test('ds panel shows a stack from bottom to top', () => {
  render(<DSPanel ds={[{ kind: 'stack', name: 'Call stack', items: ['DFS(G)', 'DFS_Visit(G, v1)'] }]} />);
  expect(screen.getByText('(bottom → top)')).toBeInTheDocument();
  const items = within(screen.getByLabelText('Call stack contents')).getAllByText(/\w+/).map((e) => e.textContent);
  expect(items).toEqual(['DFS(G)', 'DFS_Visit(G, v1)']);
});

test('ds panel shows the edge list and marks the current edge', () => {
  render(<DSPanel ds={[{ kind: 'edges', name: 'G.E', items: ['(s, a)', '(a, b)'], current: 1 }]} />);
  expect(screen.getByText('(scan order)')).toBeInTheDocument();
  const current = within(screen.getByLabelText('G.E contents')).getByText('(a, b)');
  expect(current).toHaveClass('current');
  expect(current).toHaveAttribute('aria-current', 'true');
  expect(within(screen.getByLabelText('G.E contents')).getByText('(s, a)')).not.toHaveClass('current');
});

test('ds panel lists a keyed set with each key', () => {
  render(<DSPanel ds={[{ kind: 'keyed', name: 'Q', key: 'd', items: [{ id: 'a', value: 3 }, { id: 'b', value: Infinity }] }]} />);
  expect(screen.getByText('(by d)')).toBeInTheDocument();
  const items = within(screen.getByLabelText('Q contents')).getAllByText(/\w/).map((e) => e.textContent);
  expect(items).toEqual(['a.d = 3', 'b.d = ∞']);
});

test('state panel with no columns shows the variables but no table', () => {
  render(<StatePanel columns={[]} vertices={['a']} step={{ ...step, vars: { i: 2 } }} />);
  expect(screen.getByText('i = 2')).toBeInTheDocument();
  expect(screen.queryByRole('table')).toBeNull();
});

test('edge list names undirected edges with endpoints in label order', () => {
  const g: Graph = {
    directed: false,
    vertices: [{ id: 'a', x: 0, y: 0 }, { id: 'r', x: 0, y: 0 }],
    edges: [{ u: 'r', v: 'a', w: 4 }],
    adjOrder: {},
  };
  render(<EdgeListPanel graph={g} onMove={() => {}} onReset={() => {}} />);
  expect(screen.getByLabelText('G.E')).toHaveTextContent('(a, r)');
});
