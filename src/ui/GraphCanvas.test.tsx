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

const markerOf = (container: HTMLElement, key: string) => {
  const ref = container.querySelector(`[data-edge="${key}"] line.edge-line`)!.getAttribute('marker-end')!;
  expect(ref).toMatch(/^url\(#.+\)$/);
  return container.querySelector(`marker[id="${ref.slice(5, -1)}"] path`)!;
};

test('directed edges get an arrowhead that matches the edge class', () => {
  const directed = { ...graph, directed: true, edges: [{ u: 'a', v: 'b' }, { u: 'b', v: 'a' }] };
  const { container } = render(
    <GraphCanvas graph={directed} step={{ ...step, highlight: { treeEdges: ['a->b'] } }} />,
  );
  expect(markerOf(container, 'a->b')).toHaveClass('arrow-head', 'tree');
  expect(markerOf(container, 'b->a')).toHaveClass('arrow-head', 'plain');
});

test('undirected edges have no arrowhead', () => {
  const { container } = render(<GraphCanvas graph={graph} />);
  expect(container.querySelector('[data-edge="a--b"] line.edge-line')!.getAttribute('marker-end')).toBeNull();
});

test('weights are drawn only on weighted canvases, defaulting to 1', () => {
  const g = { ...graph, edges: [{ u: 'a', v: 'b', w: -2 }] };
  const { container, rerender } = render(<GraphCanvas graph={g} weighted />);
  expect(container.querySelector('[data-edge="a--b"] .edge-weight')).toHaveTextContent('-2');
  rerender(<GraphCanvas graph={graph} weighted />);
  expect(container.querySelector('[data-edge="a--b"] .edge-weight')).toHaveTextContent('1');
  rerender(<GraphCanvas graph={g} />);
  expect(container.querySelector('.edge-weight')).toBeNull();
});

test('a vertex with state but no color is plain; settled vertices are marked', () => {
  const s: Step = { ...step, vertexState: { a: { d: 0 }, b: {} }, highlight: { settled: ['a'] } };
  const { container } = render(<GraphCanvas graph={graph} step={s} />);
  expect(container.querySelector('[data-vertex="a"]')).toHaveClass('v-plain', 'settled');
  expect(container.querySelector('[data-vertex="b"]')).toHaveClass('v-none');
  expect(container.querySelector('[data-vertex="b"]')).not.toHaveClass('settled');
});
