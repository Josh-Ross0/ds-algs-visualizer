import { fireEvent, render, screen } from '@testing-library/react';
import { newNode } from '../engine/tree';
import { buildBst } from '../structures/bst/model';
import type { TreeView } from '../structures/types';
import { TreeCanvas } from './TreeCanvas';

const view = (over: Partial<TreeView> = {}): TreeView => ({
  tree: buildBst([10, 5, 15]),
  highlight: { nodes: [], edges: [] },
  tags: {},
  ...over,
});

test('draws each node with its key and each parent edge', () => {
  const { container } = render(<TreeCanvas view={view()} />);
  expect(container.querySelectorAll('.tnode')).toHaveLength(3);
  expect(container.querySelector('[data-node="n1"]')).toHaveTextContent('10');
  expect(container.querySelectorAll('.tree-edge')).toHaveLength(2);
});

test('highlights, pointer tags and the NIL slot come from the view', () => {
  const v = view({
    highlight: { nodes: ['n2'], edges: ['n2'] },
    tags: { x: 'n2', y: 'n2', z: 'n1' },
    nil: { parent: 'n2', side: 'left' },
  });
  const { container } = render(<TreeCanvas view={v} />);
  expect(container.querySelector('[data-node="n2"]')).toHaveClass('tnode', 'active');
  expect(container.querySelector('[data-edge="n2"]')).toHaveClass('tree-edge', 'active');
  expect(container.querySelector('[data-node="n2"] .ptr-tag')).toHaveTextContent('x, y');
  expect(container.querySelector('[data-node="n1"] .ptr-tag')).toHaveTextContent('z');
  expect(container.querySelector('.nil-slot')).toHaveTextContent('NIL');
});

test('a node not yet linked (z during Tree_Insert) is drawn detached', () => {
  const t = buildBst([10]);
  newNode(t, 3);
  const { container } = render(<TreeCanvas view={view({ tree: t })} />);
  expect(container.querySelector('[data-node="n2"]')).toHaveClass('detached');
});

test('clicking a node reports its id; an empty tree says so', () => {
  const onNodeClick = vi.fn();
  const { container, rerender } = render(<TreeCanvas view={view()} onNodeClick={onNodeClick} />);
  fireEvent.pointerDown(container.querySelector('[data-node="n3"]')!);
  expect(onNodeClick).toHaveBeenCalledWith('n3');
  rerender(<TreeCanvas view={view({ tree: buildBst([]) })} />);
  expect(screen.getByText('T.root = NIL (empty tree)')).toBeInTheDocument();
});
