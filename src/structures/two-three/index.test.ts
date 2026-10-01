import { mulberry32 } from '../../algorithms/sssp/reference';
import { findLeaf, isTwoThree, realKeys, twoThreeLayout } from '../../engine/twoThree';
import { assertValidTreeTrace } from '../testing';
import { twoThree } from './index';
import { checkTwoThreePredictable } from './predictable';
import { shapeOf } from './testing';

const preset = (i: number) => twoThree.build(twoThree.presets[i].keys);

test('presets: slide 18 with sentinels, sorted inserts, and the 12-leaf limit', () => {
  expect(shapeOf(preset(0))).toBe('(((-inf 1 4) (5 7 14)) ((19 22) (25 29 +inf)))');
  expect(shapeOf(preset(1))).toBe('(((-inf 1) (2 3)) ((4 5) (6 7 +inf)))');
  expect(realKeys(preset(2))).toHaveLength(12);
  for (let i = 0; i < twoThree.presets.length; i++) expect(isTwoThree(preset(i))).toBe(true);
  expect(shapeOf(twoThree.build([]))).toBe('(-inf +inf)');
});

test('validate blocks exactly the inputs the spec lists', () => {
  const t = preset(0);
  expect(twoThree.validate(t, 'insert', [14])).toEqual(['Key 14 is already in the tree (keys must be unique).']);
  expect(twoThree.validate(t, 'insert', [23])).toEqual([]);
  expect(twoThree.validate(t, 'insert', [-5])).toEqual([]);
  expect(twoThree.validate(t, 'insert', [0])).toEqual([]);
  expect(twoThree.validate(preset(2), 'insert', [100])).toEqual(['The tree is limited to 12 keys so it stays readable.']);
  expect(twoThree.validate(t, 'delete', [13])).toEqual(['No node with key 13.']);
  expect(twoThree.validate(t, 'successor', [13])).toEqual(['No node with key 13.']);
  expect(twoThree.validate(t, 'delete', [14])).toEqual([]);
  expect(twoThree.validate(t, 'search', [13])).toEqual([]);
  expect(twoThree.validate(t, 'search', [])).toEqual(['Enter an integer key.']);
  expect(twoThree.validate(twoThree.build([]), 'minimum', [])).toEqual([]); // runs to line 7's error
  expect(twoThree.validate(t, 'init', [])).toEqual([]);
});

test('run dispatches every operation with a valid trace', () => {
  const t = preset(0);
  const args: Record<string, number[]> = { search: [14], minimum: [], successor: [14], insert: [23], delete: [19], init: [] };
  for (const op of twoThree.operations) {
    expect(twoThree.validate(t, op.id, args[op.id])).toEqual([]);
    assertValidTreeTrace(twoThree, twoThree.run(t, op.id, args[op.id]));
  }
  expect(twoThree.operations.map((o) => o.id)).toEqual(['search', 'minimum', 'successor', 'insert', 'delete', 'init']);
  expect(twoThree.procs[0].name).toBe('2_3_Search');
});

test('Init discards the tree on screen and keeps the sentinel-only tree', () => {
  const steps = twoThree.run(preset(0), 'init', []);
  expect(shapeOf(twoThree.keep(steps.at(-1)!.view))).toBe('(-inf +inf)');
});

test('view highlights the selected leaf; keep adopts the last step; nodeKey is null for sentinels and internal nodes', () => {
  const t = preset(0);
  const v = twoThree.view(t, 14);
  expect(v).toMatchObject({ kind: 'two-three', tree: t, tags: {}, highlight: { nodes: [findLeaf(t, 14)], edges: [] } });
  expect(twoThree.view(t, null).highlight.nodes).toEqual([]);
  expect(twoThree.view(t, 13).highlight.nodes).toEqual([]);
  const steps = twoThree.run(t, 'insert', [23]);
  expect(realKeys(twoThree.keep(steps.at(-1)!.view))).toContain(23);
  const leaf = findLeaf(t, 14)!;
  expect(twoThree.nodeKey!(t, leaf)).toBe(14);
  expect(twoThree.nodeKey!(t, t.root!)).toBeNull();
  expect(twoThree.nodeKey!(t, t.nodes[t.root!].left!)).toBeNull();
  const sentinel = Object.values(t.nodes).find((n) => n.key === Infinity && n.leaf)!;
  expect(twoThree.nodeKey!(t, sentinel.id)).toBeNull();
});

test('random operation sequences: valid tree, exact keys, predictable questions, and every step lays out', () => {
  const rand = mulberry32(11);
  let t = preset(0);
  const model = new Set(realKeys(t));
  for (let n = 0; n < 250; n++) {
    const k = Math.floor(rand() * 30) - 5;
    const pick = rand();
    const op = pick < 0.4 ? 'insert' : pick < 0.75 ? 'delete' : pick < 0.85 ? 'search' : pick < 0.95 ? 'successor' : 'minimum';
    const args = op === 'minimum' ? [] : [k];
    if (twoThree.validate(t, op, args).length > 0) continue;

    const before = structuredClone(t);
    const steps = twoThree.run(t, op, args);
    expect(t).toEqual(before); // operations never mutate the page's tree
    assertValidTreeTrace(twoThree, steps);
    checkTwoThreePredictable(steps);
    for (const s of steps) {
      for (const p of Object.values(twoThreeLayout(s.view.tree).pos)) {
        expect([Number.isFinite(p.x), Number.isFinite(p.y)]).toEqual([true, true]);
      }
    }

    if (op === 'insert' || op === 'delete') {
      t = twoThree.keep(steps.at(-1)!.view);
      if (op === 'insert') model.add(k);
      else model.delete(k);
      expect(isTwoThree(t)).toBe(true);
      expect(realKeys(t)).toEqual([...model].sort((a, b) => a - b));
    } else if (op === 'successor') {
      const next = [...model].filter((x) => x > k).sort((a, b) => a - b)[0];
      expect(steps.at(-1)!.note).toBe(next === undefined ? 'Returns NIL: x has the largest key.' : `Returns the leaf with key ${next}.`);
    } else if (op === 'minimum' && model.size > 0) {
      expect(steps.at(-1)!.note).toBe(`Returns the leaf with key ${Math.min(...model)}.`);
    }
  }
});
