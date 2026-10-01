import { fireEvent, render } from '@testing-library/react';
import { fmtKey, findLeaf, newInternal, newLeaf } from '../engine/twoThree';
import { fromShape, SLIDE_18 } from '../structures/two-three/testing';
import type { TwoThreeView } from '../structures/types';
import { StructureCanvas } from './StructureCanvas';
import { TwoThreeCanvas } from './TwoThreeCanvas';

const view = (over: Partial<TwoThreeView> = {}): TwoThreeView => ({
  kind: 'two-three',
  tree: fromShape(SLIDE_18),
  highlight: { nodes: [], edges: [] },
  tags: {},
  ...over,
});

const leafKeys = (c: HTMLElement) => [...c.querySelectorAll('.tnode.leaf .key')].map((e) => e.textContent);

test('draws 11 leaf boxes (two sentinels) and 7 internal circles joined by 17 edges', () => {
  const { container } = render(<TwoThreeCanvas view={view()} />);
  expect(container.querySelectorAll('.tnode')).toHaveLength(18);
  expect(container.querySelectorAll('.tnode.leaf rect')).toHaveLength(11);
  expect(container.querySelectorAll('.tnode:not(.leaf) circle')).toHaveLength(7);
  expect(container.querySelectorAll('.tree-edge')).toHaveLength(17);
  expect(container.querySelectorAll('.tnode.sentinel')).toHaveLength(2);
  expect(leafKeys(container)).toEqual([fmtKey(-Infinity), '1', '4', '5', '7', '14', '19', '22', '25', '29', fmtKey(Infinity)]);
});

test('highlights, active edges and pointer tags come from the view', () => {
  const t = fromShape(SLIDE_18);
  const five = findLeaf(t, 5)!;
  const parent = t.nodes[five].p!;
  const { container } = render(<TwoThreeCanvas view={view({
    tree: t,
    highlight: { nodes: [five], edges: [five] },
    tags: { x: parent, y: parent, z: five },
  })}
  />);
  expect(container.querySelector(`[data-node="${five}"]`)).toHaveClass('tnode', 'leaf', 'active');
  expect(container.querySelector(`[data-edge="${parent}>${five}"]`)).toHaveClass('tree-edge', 'active');
  expect(container.querySelector(`[data-node="${parent}"] .ptr-tag`)).toHaveTextContent('x, y');
  expect(container.querySelector(`[data-node="${five}"] .ptr-tag`)).toHaveTextContent('z');
});

test('only real leaves are clickable: not internal nodes, not sentinels', () => {
  const t = fromShape(SLIDE_18);
  const onNodeClick = vi.fn();
  const { container } = render(<TwoThreeCanvas view={view({ tree: t })} onNodeClick={onNodeClick} />);
  fireEvent.pointerDown(container.querySelector(`[data-node="${findLeaf(t, 14)}"]`)!);
  fireEvent.pointerDown(container.querySelector(`[data-node="${t.root}"]`)!);
  fireEvent.pointerDown(container.querySelector('.tnode.sentinel')!);
  expect(onNodeClick.mock.calls).toEqual([[findLeaf(t, 14)]]);
});

test('half-finished states draw: a loose leaf is detached, a NIL-key internal node is an empty circle, a deleted child is skipped', () => {
  const t = fromShape(SLIDE_18);
  const z = newLeaf(t, 7);
  const y = newInternal(t);
  const gone = newLeaf(t, 8);
  t.nodes[y].left = gone;
  delete t.nodes[gone];
  const { container } = render(<TwoThreeCanvas view={view({ tree: t })} />);
  expect(container.querySelector(`[data-node="${z}"]`)).toHaveClass('detached');
  expect(container.querySelector(`[data-node="${y}"]`)).toHaveClass('detached');
  expect(container.querySelector(`[data-node="${y}"] .key`)).toHaveTextContent('');
  expect(container.querySelectorAll('.tree-edge')).toHaveLength(17);
});

test('StructureCanvas draws a two-three view with TwoThreeCanvas', () => {
  const { container } = render(<StructureCanvas view={view()} />);
  expect(container.querySelector('.tree-canvas.two-three')).not.toBeNull();
  expect(container.querySelector('.heap-array')).toBeNull();
});
