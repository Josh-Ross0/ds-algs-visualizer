import { findLeaf, newLeaf } from '../../engine/twoThree';
import { createTwoThreeTracer } from '../tracer';
import { traceSetChildren, traceUpdateKey } from './primitives';
import { fromShape, shapeOf } from './testing';

const lines = (steps: { proc: string; line: number }[]) => steps.map((s) => `${s.proc}:${s.line}`);

test('Update_Key sets x.key to the key of its last child: lines 1–5 with a right child, 1–4 without', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const [a, b] = [t.nodes[t.root!].left!, t.nodes[t.root!].middle!];
  t.nodes[a].key = 99;
  t.nodes[b].key = 99;
  const tr = createTwoThreeTracer(t);
  traceUpdateKey(tr, a);
  traceUpdateKey(tr, b);
  expect(lines(tr.steps)).toEqual([
    'Update_Key:1', 'Update_Key:2', 'Update_Key:3', 'Update_Key:4',
    'Update_Key:1', 'Update_Key:2', 'Update_Key:3', 'Update_Key:4', 'Update_Key:5',
  ]);
  expect([t.nodes[a].key, t.nodes[b].key]).toEqual([1, Infinity]);
  expect(tr.steps[0].ds[0]).toEqual({ kind: 'stack', name: 'Call stack', items: ['Update_Key(x)'] });
  expect(tr.stack).toEqual([]); // the frame is popped
});

test('Set_Children relinks x, fixes the parents, then calls Update_Key', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const x = t.nodes[t.root!].left!;
  const z = newLeaf(t, 0);
  const l = findLeaf(t, 1)!;
  const sentinel = t.nodes[x].left!;
  const tr = createTwoThreeTracer(t);
  tr.ptr = { caller: x };
  traceSetChildren(tr, x, z, l, sentinel);
  expect(lines(tr.steps).slice(0, 7)).toEqual([
    'Set_Children:1', 'Set_Children:2', 'Set_Children:3', 'Set_Children:4', 'Set_Children:5', 'Set_Children:6', 'Set_Children:7',
  ]);
  expect(lines(tr.steps).slice(7).every((s) => s.startsWith('Update_Key:'))).toBe(true);
  expect(t.nodes[x]).toMatchObject({ left: z, middle: l, right: sentinel, key: -Infinity });
  expect([t.nodes[z].p, t.nodes[l].p, t.nodes[sentinel].p]).toEqual([x, x, x]);
  expect(tr.steps.at(-1)!.ds[0]).toMatchObject({ items: ['Set_Children(x, ℓ, m, r)', 'Update_Key(x)'] });
  expect(tr.ptr).toEqual({ caller: x }); // the caller's variables are restored
});

test('Set_Children with m and r NIL skips lines 4 and 6', () => {
  const t = fromShape([[-Infinity, 1], [2, 3, Infinity]]);
  const x = t.nodes[t.root!].left!;
  const l = t.nodes[x].left!;
  const tr = createTwoThreeTracer(t);
  traceSetChildren(tr, x, l, null, null);
  const own = tr.steps.filter((s) => s.proc === 'Set_Children').map((s) => s.line);
  expect(own).toEqual([1, 2, 3, 5, 7]);
  expect(shapeOf(t)).toBe('((-inf) (2 3 +inf))'); // x keeps one child
});
