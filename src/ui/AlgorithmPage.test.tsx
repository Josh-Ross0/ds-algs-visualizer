import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AlgorithmDef } from '../algorithms/types';
import type { Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AlgorithmPage } from './AlgorithmPage';

beforeEach(() => window.localStorage.clear());

const graph: Graph = {
  directed: true,
  vertices: [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 300, y: 100 }, { id: 'c', x: 200, y: 300 }],
  edges: [{ u: 'a', v: 'b', w: 2 }, { u: 'b', v: 'c', w: -1 }],
  adjOrder: {},
};
const step: Step = { proc: 'P', line: 1, bigStep: false, vertexState: {}, vars: {}, ds: [], highlight: {} };
const def: AlgorithmDef = {
  id: 'fake',
  title: 'Fake',
  directed: true,
  weighted: true,
  order: 'edges',
  procs: [{ name: 'P', signature: 'P(G)', lines: ['x'] }],
  params: [],
  stateColumns: [],
  questionTypes: [],
  presets: [{ name: 'One', graph, params: {} }],
  validate: () => ({ errors: [], warnings: ['Careful.'] }),
  run: () => [step],
};

test('edge-order page: edge list instead of adjacency, weights drawn, Edit graph clears warnings', async () => {
  const { container } = render(<AlgorithmPage def={def} />);
  expect(screen.queryByText('Adjacency lists')).toBeNull();
  expect(screen.getByLabelText('G.E')).toHaveTextContent(/\(a, b\).*\(b, c\)/);
  await userEvent.click(screen.getByRole('button', { name: 'Move (b, c) earlier in G.E' }));
  expect(screen.getByLabelText('G.E')).toHaveTextContent(/\(b, c\).*\(a, b\)/);
  expect(container.querySelector('[data-edge="b->c"] .edge-weight')).toHaveTextContent('-1');

  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByText('Careful.')).toBeInTheDocument();
  expect(screen.queryByText('Adjacency lists')).toBeNull();
  expect(container.querySelector('[data-edge="b->c"] .edge-weight')).toHaveTextContent('-1');

  await userEvent.click(screen.getByRole('button', { name: 'Edit graph' }));
  expect(screen.queryByText('Careful.')).toBeNull();
  expect(screen.getByLabelText('G.E')).toHaveTextContent(/\(b, c\).*\(a, b\)/);
});
