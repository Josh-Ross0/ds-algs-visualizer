import { fireEvent, render, screen } from '@testing-library/react';
import { makeHeap } from '../engine/heapArray';
import type { HeapView, TreeView } from '../structures/types';
import { buildBst } from '../structures/bst/model';
import { HeapCanvas } from './HeapCanvas';
import { StructureCanvas } from './StructureCanvas';

const EXAMPLE = [2, 5, 3, 9, 6, 4, 8, 12, 11, 7];
const view = (over: Partial<HeapView> = {}): HeapView => ({
  kind: 'heap',
  heap: makeHeap(EXAMPLE, 15, 10),
  highlight: { cells: [], edges: [] },
  tags: {},
  ...over,
});

test('draws a node and a parent edge per live cell, and a 15-cell strip with the stale cells greyed', () => {
  const { container } = render(<HeapCanvas view={view()} />);
  expect(container.querySelectorAll('.tnode')).toHaveLength(10);
  expect(container.querySelectorAll('.tree-edge')).toHaveLength(9);
  expect(container.querySelectorAll('.heap-array .cell')).toHaveLength(15);
  expect(container.querySelectorAll('.heap-array .cell.past')).toHaveLength(5);
  expect(container.querySelector('.marker-label')).toHaveTextContent('heap-size = 10');
  const root = container.querySelector('[data-node="1"]')!;
  expect(root.querySelector('.key')).toHaveTextContent('2');
  expect(root.querySelector('.idx-label')).toHaveTextContent('1');
});

test('highlights and index tags come from the view: beside the node and under the cell, even past heap-size', () => {
  const v = view({ highlight: { cells: [2], edges: [4] }, tags: { i: 2, 'ℓ': 4, smallest: 4, s: 12 } });
  const { container } = render(<HeapCanvas view={v} />);
  expect(container.querySelector('[data-node="2"]')).toHaveClass('tnode', 'active');
  expect(container.querySelector('[data-cell="2"]')).toHaveClass('active');
  expect(container.querySelector('[data-edge="4"]')).toHaveClass('tree-edge', 'active');
  expect(container.querySelector('[data-node="2"] .ptr-tag')).toHaveTextContent('i');
  expect(container.querySelector('[data-node="4"] .ptr-tag')).toHaveTextContent('ℓ, smallest');
  expect(container.querySelector('[data-cell="12"] .ptr-tag')).toHaveTextContent('s');
  expect(container.querySelector('[data-node="12"]')).toBeNull();
});

test('clicking a live node or a live cell reports its id; a stale cell is not clickable', () => {
  const onNodeClick = vi.fn();
  const { container } = render(<HeapCanvas view={view()} onNodeClick={onNodeClick} />);
  fireEvent.pointerDown(container.querySelector('[data-node="3"]')!);
  fireEvent.pointerDown(container.querySelector('[data-cell="4"]')!);
  fireEvent.pointerDown(container.querySelector('[data-cell="11"]')!);
  expect(onNodeClick.mock.calls).toEqual([['3'], ['4']]);
});

test('∞ is drawn as ∞; an empty heap says so and still shows the whole strip', () => {
  const heap = makeHeap([2, 5], 15, 2);
  heap.A[1] = Infinity;
  const { container, rerender } = render(<HeapCanvas view={view({ heap })} />);
  expect(container.querySelector('[data-node="2"] .key')).toHaveTextContent('∞');
  rerender(<HeapCanvas view={view({ heap: makeHeap([], 15, 0) })} />);
  expect(screen.getByText('heap-size = 0 (empty heap)')).toBeInTheDocument();
  expect(container.querySelectorAll('.heap-array .cell.past')).toHaveLength(15);
  expect(container.querySelector('.marker-label')).toHaveTextContent('heap-size = 0');
});

test('StructureCanvas picks the drawing by view kind', () => {
  const tree: TreeView = { kind: 'tree', tree: buildBst([10, 5]), highlight: { nodes: [], edges: [] }, tags: {} };
  const { container, rerender } = render(<StructureCanvas view={tree} />);
  expect(container.querySelector('.heap-array')).toBeNull();
  expect(container.querySelectorAll('.tnode')).toHaveLength(2);
  rerender(<StructureCanvas view={view()} />);
  expect(container.querySelector('.heap-array')).not.toBeNull();
});

test('a short array strip keeps its natural size (capped by the page width) and fits the heap-size label', () => {
  const { container } = render(<HeapCanvas view={view({ heap: makeHeap([7], 1, 1) })} />);
  const strip = container.querySelector('.heap-array') as SVGSVGElement;
  const width = Number(strip.getAttribute('viewBox')!.split(' ')[2]);
  expect(width).toBeGreaterThanOrEqual(130);
  expect(strip.style.width).toBe(`${width}px`);
  expect(strip.style.maxWidth).toBe('100%');
});
