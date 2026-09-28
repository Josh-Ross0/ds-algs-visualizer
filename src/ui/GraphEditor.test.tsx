import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Graph } from '../engine/graph';
import { GraphEditor } from './GraphEditor';

const start: Graph = {
  directed: false,
  vertices: [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 300, y: 100 }, { id: 'c', x: 200, y: 300 }],
  edges: [{ u: 'a', v: 'b' }],
  adjOrder: {},
};

let latest: Graph;
function Harness() {
  const [g, setG] = useState(start);
  latest = g;
  return <GraphEditor graph={g} onChange={setG} />;
}

const vertex = (c: HTMLElement, id: string) => c.querySelector(`[data-vertex="${id}"]`)!;

test('add edge by clicking two vertices', async () => {
  const { container } = render(<Harness />);
  await userEvent.click(screen.getByRole('button', { name: 'Add edge' }));
  fireEvent.pointerDown(vertex(container, 'b'));
  fireEvent.pointerDown(vertex(container, 'c'));
  expect(latest.edges).toEqual([{ u: 'a', v: 'b' }, { u: 'b', v: 'c' }]);
});

test('duplicate edge shows a message', async () => {
  const { container } = render(<Harness />);
  await userEvent.click(screen.getByRole('button', { name: 'Add edge' }));
  fireEvent.pointerDown(vertex(container, 'b'));
  fireEvent.pointerDown(vertex(container, 'a'));
  expect(screen.getByRole('alert')).toHaveTextContent('That edge already exists.');
});

test('select a vertex and delete it', async () => {
  const { container } = render(<Harness />);
  fireEvent.pointerDown(vertex(container, 'a'));
  fireEvent.pointerUp(container.querySelector('svg')!);
  await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
  expect(latest.vertices.map((v) => v.id)).toEqual(['b', 'c']);
  expect(latest.edges).toEqual([]);
});

test('select an edge and delete it', async () => {
  const { container } = render(<Harness />);
  fireEvent.click(container.querySelector('[data-edge="a--b"]')!);
  await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
  expect(latest.edges).toEqual([]);
});

test('switching mode while dragging stops the drag', async () => {
  const { container } = render(<Harness />);
  const svg = container.querySelector('svg')! as any;
  svg.getScreenCTM = () => null;
  fireEvent.pointerDown(vertex(container, 'a'));
  await userEvent.click(screen.getByRole('button', { name: 'Add vertex' }));
  fireEvent.pointerMove(svg, { clientX: 250, clientY: 250 });
  expect(latest.vertices.find((v) => v.id === 'a')).toEqual({ id: 'a', x: 100, y: 100 });
});

test('adding an 11th vertex shows the cap message', async () => {
  const full: Graph = {
    directed: false,
    vertices: Array.from({ length: 10 }, (_, i) => ({ id: `v${i + 1}`, x: 40 + i * 50, y: 100 })),
    edges: [],
    adjOrder: {},
  };
  const onChange = vi.fn();
  const { container } = render(<GraphEditor graph={full} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add vertex' }));
  const svg = container.querySelector('svg')! as any;
  svg.getScreenCTM = () => null;
  fireEvent.pointerDown(container.querySelector('.canvas-bg')!, { clientX: 300, clientY: 300 });
  expect(screen.getByRole('alert')).toHaveTextContent('Graphs are limited to 10 vertices so they stay readable.');
  expect(onChange).not.toHaveBeenCalled();
});
