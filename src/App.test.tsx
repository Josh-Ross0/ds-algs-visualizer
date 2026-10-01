import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  window.location.hash = '';
  window.localStorage.clear();
});

test('home lists BFS', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'DS&Algs Visualizer' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Breadth-First Search/ })).toHaveAttribute('href', '#/bfs');
});

test('BFS page: run, answer first question, reach the end', async () => {
  window.location.hash = '#/bfs';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Breadth-First Search (BFS)' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('which vertex does Dequeue(Q) return?');
  await userEvent.click(within(dialog).getByRole('button', { name: 's' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
  expect(screen.getByText('BFS(G, s)').closest('section')!.querySelector('[aria-current="step"]')).toHaveTextContent('u = Dequeue(Q)');

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  const rowV7 = screen.getByRole('row', { name: /^v7/ });
  expect(rowV7).toHaveTextContent('black');
  expect(rowV7).toHaveTextContent('3');
  expect(rowV7).toHaveTextContent('v5');
});

test('turning off Predict mode while a question is open keeps focus on the checkbox', async () => {
  window.location.hash = '#/bfs';
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  expect(screen.getByRole('dialog', { name: 'Predict the next step' })).toBeInTheDocument();
  const predict = screen.getByLabelText('Predict mode');
  await userEvent.click(predict);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(predict).toHaveFocus();
});

test('Run is blocked without a source', async () => {
  window.location.hash = '#/bfs';
  render(<App />);
  await userEvent.selectOptions(screen.getByLabelText('Source s'), '');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a source vertex s.');
  expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
});

test('home lists DFS', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /Depth-First Search/ })).toHaveAttribute('href', '#/dfs');
});

test('DFS page: first question, final times, no edge types on screen', async () => {
  window.location.hash = '#/dfs';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Depth-First Search (DFS)' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  const bigNext = screen.getByRole('button', { name: 'Next big step' });
  await userEvent.click(bigNext);
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Which vertex will DFS discover next?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'v1' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');

  // The result stays until Continue: stepping forward is held.
  const continueButton = screen.getByRole('button', { name: 'Continue' });
  expect(continueButton).toHaveFocus();
  const position = screen.getByText(/^Step \d+ \/ \d+$/).textContent;
  await userEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByText(/^Step \d+ \/ \d+$/)).toHaveTextContent(position!);
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');

  await userEvent.click(continueButton);
  expect(screen.queryByRole('status')).toBeNull();
  // Focus returns to the player button used last (the held "Next step" click).
  expect(screen.getByRole('button', { name: 'Next step' })).toHaveFocus();

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  const rowV6 = screen.getByRole('row', { name: /^v6/ });
  expect(rowV6).toHaveTextContent('11');
  expect(rowV6).toHaveTextContent('16');
  expect(screen.getByLabelText('Call stack contents')).toHaveTextContent('DFS(G)');
  expect(document.body).not.toHaveTextContent(/\b(forward|crossing)\b/);
});

test('home lists Bellman-Ford and Dijkstra', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /Bellman-Ford/ })).toHaveAttribute('href', '#/bellman-ford');
  expect(screen.getByRole('link', { name: /Dijkstra/ })).toHaveAttribute('href', '#/dijkstra');
});

test('Bellman-Ford page: first Relax question, final distances', async () => {
  window.location.hash = '#/bellman-ford';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Bellman-Ford' })).toBeInTheDocument();
  expect(screen.getByLabelText('G.E')).toHaveTextContent(/\(s, v2\)/);
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Relax line 1: is v2.d > s.d + w(s, v2)?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Yes' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  const rowV1 = screen.getByRole('row', { name: /^v1/ });
  expect(rowV1).toHaveTextContent('-4');
  expect(rowV1).toHaveTextContent('v4');
  expect(screen.getByLabelText('G.E contents')).toHaveTextContent('(v7, v3)');
});

test('Dijkstra page: Extract_Min question, final distances, settled vertices', async () => {
  window.location.hash = '#/dijkstra';
  const { container } = render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Line 4: which vertex does Extract_Min(Q) return?');
  await userEvent.click(within(dialog).getByRole('button', { name: 's' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  const rowV7 = screen.getByRole('row', { name: /^v7/ });
  expect(rowV7).toHaveTextContent('14');
  expect(rowV7).toHaveTextContent('v6');
  expect(screen.getByLabelText('Q contents')).toHaveTextContent('∅');
  expect(container.querySelectorAll('.vertex.settled')).toHaveLength(8);
});

test('Dijkstra negative-weight preset: warning on Run, cleared by Edit graph', async () => {
  window.location.hash = '#/dijkstra';
  render(<App />);
  await userEvent.selectOptions(screen.getByLabelText('Preset'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.getByText(/Dijkstra assumes w ≥ 0/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next step' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Edit graph' }));
  expect(screen.queryByText(/Dijkstra assumes w ≥ 0/)).toBeNull();
});

test('home lists Prim and Kruskal', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /^Prim/ })).toHaveAttribute('href', '#/prim');
  expect(screen.getByRole('link', { name: /^Kruskal/ })).toHaveAttribute('href', '#/kruskal');
});

test('Prim page: Extract_Min question, final keys and tree', async () => {
  window.location.hash = '#/prim';
  const { container } = render(<App />);
  expect(screen.getByRole('heading', { name: 'Prim' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Line 8: which vertex does Extract_Min(Q) return?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'r' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  const rowH = screen.getByRole('row', { name: /^h/ });
  expect(rowH).toHaveTextContent('4');
  expect(rowH).toHaveTextContent('g');
  expect(container.querySelectorAll('.vertex.settled')).toHaveLength(9);
  expect(container.querySelectorAll('.edge.tree')).toHaveLength(8);
});

test('Kruskal page: cycle-free question, final T, no state table', async () => {
  window.location.hash = '#/kruskal';
  const { container } = render(<App />);
  expect(screen.getByLabelText('G.E')).toHaveTextContent(/\(a, c\)/);
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(screen.queryByRole('table')).toBeNull();
  expect(container.querySelectorAll('.vertex.v-plain')).toHaveLength(9);

  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Line 6: is (G.V, T ∪ {(c, d)}) cycle free?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Yes' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  expect(screen.getByLabelText('T contents')).toHaveTextContent('(d, r)');
  expect(screen.getByText('T has 8 edges with total weight 29.')).toBeInTheDocument();
});

test('home lists the BST under tree structures', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Tree structures' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Binary Search Tree/ })).toHaveAttribute('href', '#/bst');
});

test('#/bst opens the BST page with the lecture tree', () => {
  window.location.hash = '#/bst';
  const { container } = render(<App />);
  expect(screen.getByRole('heading', { name: 'Binary Search Tree (BST)' })).toBeInTheDocument();
  expect(container.querySelectorAll('.tnode')).toHaveLength(12);
});

test('home lists the heap under tree structures', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /Binary Heap/ })).toHaveAttribute('href', '#/heap');
});

test('#/heap opens the heap page with the example heap', () => {
  window.location.hash = '#/heap';
  const { container } = render(<App />);
  expect(screen.getByRole('heading', { name: 'Binary Heap (min-heap)' })).toBeInTheDocument();
  expect(container.querySelectorAll('.tnode')).toHaveLength(10);
  expect(container.querySelector('.marker-label')).toHaveTextContent('heap-size = 10');
});
