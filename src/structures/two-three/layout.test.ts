import type { NodeId, Tree } from '../../engine/tree';
import { kids, leavesOf, twoThreeLayout } from '../../engine/twoThree';
import { twoThree } from './index';
import { runInsert } from './insert';

// Leaves of the main tree plus those under a new root that is not yet linked as root but already has the old root as a kid.
function pictureLeaves(t: Tree): NodeId[] {
  const out = new Set(leavesOf(t));
  const walk = (id: NodeId) => (t.nodes[id].leaf ? out.add(id) : kids(t, id).forEach(walk));
  const isKid = new Set(Object.keys(t.nodes).flatMap((id) => kids(t, id)));
  for (const id of Object.keys(t.nodes)) {
    if (!isKid.has(id) && !t.nodes[id].leaf && kids(t, id).some((c) => c === t.root)) walk(id);
  }
  return [...out];
}

test.each([
  ['root growth over [1,2,3,4,5] + 6', [1, 2, 3, 4, 5], 6],
  ['root growth over [1] + 0', [1], 0],
])('%s: every step keeps all reachable leaves on one row', (_name, keys, k) => {
  for (const s of runInsert(twoThree.build(keys), k)) {
    const t = s.view.tree;
    const { pos } = twoThreeLayout(t);
    for (const p of Object.values(pos)) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    const ys = new Set(pictureLeaves(t).map((id) => pos[id].y));
    expect(ys.size).toBeLessThanOrEqual(1);
  }
});
