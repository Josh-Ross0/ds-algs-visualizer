import { ALGORITHMS } from './registry';

test('algorithm ids are unique', () => {
  expect(new Set(ALGORITHMS.map((a) => a.id)).size).toBe(ALGORITHMS.length);
});

test.each(ALGORITHMS)('$id presets fit the algorithm', (def) => {
  for (const p of def.presets) {
    if (def.directed !== 'toggle') expect(p.graph.directed).toBe(def.directed);
    expect(p.graph.edges.every((e) => (typeof e.w === 'number') === def.weighted)).toBe(true);
    expect(def.validate(p.graph, p.params).errors).toEqual([]);
  }
});
