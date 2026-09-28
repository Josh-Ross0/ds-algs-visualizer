import { fireEvent, render } from '@testing-library/react';
import type { Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { GraphCanvas } from './GraphCanvas';

const graph: Graph = {
  directed: false,
  vertices: [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 300, y: 100 }],
  edges: [{ u: 'a', v: 'b' }],
  adjOrder: {},
};

const step: Step = {
  proc: 'BFS', line: 3, bigStep: true,
  vertexState: { a: { color: 'black' }, b: { color: 'gray' } },
  vars: {}, ds: [],
  highlight: { vertices: ['b'], treeEdges: ['a--b'] },
};

test('vertex colors, active vertex and tree edges come from the step', () => {
  const { container } = render(<GraphCanvas graph={graph} step={step} />);
  expect(container.querySelector('[data-vertex="a"]')).toHaveClass('v-black');
  expect(container.querySelector('[data-vertex="b"]')).toHaveClass('v-gray', 'active');
  expect(container.querySelector('[data-edge="a--b"]')).toHaveClass('tree');
});

test('vertex pointer down reports the id', () => {
  const onDown = vi.fn();
  const { container } = render(<GraphCanvas graph={graph} onVertexPointerDown={onDown} />);
  fireEvent.pointerDown(container.querySelector('[data-vertex="b"]')!);
  expect(onDown).toHaveBeenCalledWith('b');
});

test('directed edges get an arrow marker', () => {
  const { container } = render(<GraphCanvas graph={{ ...graph, directed: true }} />);
  const line = container.querySelector('[data-edge="a->b"] line.edge-line')!;
  expect(line.getAttribute('marker-end')).toBe('url(#arrow)');
});
