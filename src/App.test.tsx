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

  await userEvent.click(screen.getByRole('button', { name: 'Next big step' }));
  const dialog = screen.getByRole('dialog', { name: 'Predict the next step' });
  expect(dialog).toHaveTextContent('Which vertex will DFS discover next?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'v1' }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct.');

  await userEvent.click(screen.getByLabelText('Predict mode'));
  await userEvent.click(screen.getByRole('button', { name: 'End' }));
  const rowV6 = screen.getByRole('row', { name: /^v6/ });
  expect(rowV6).toHaveTextContent('11');
  expect(rowV6).toHaveTextContent('16');
  expect(screen.getByLabelText('Call stack contents')).toHaveTextContent('DFS(G)');
  expect(document.body).not.toHaveTextContent(/\b(forward|crossing)\b/);
});
