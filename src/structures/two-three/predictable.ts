import { assertQuestionsPredictable } from '../../algorithms/testing';
import { realLeaves } from '../../engine/twoThree';
import type { TwoThreeStep } from '../types';
import { childToward, WHERE } from './questions';

// Every question must be answerable from the step shown before it, and that step's note must not give it away.
export function checkTwoThreePredictable(steps: TwoThreeStep[]): void {
  assertQuestionsPredictable(steps, (prev, step) => {
    const q = step.question!;
    const T = prev.view.tree;
    const tags = step.view.tags;
    switch (q.type) {
      case 'two3.search':
        expect(q.answer.value).toBe(childToward(T, tags.x, step.vars.k as number, false));
        break;
      case 'two3.insertWalk':
        expect(q.answer.value).toBe(childToward(T, tags.y, T.nodes[tags.z].key, true));
        break;
      case 'two3.split':
        expect(q.answer).toEqual({ kind: 'yesno', value: T.nodes[tags.x].right != null });
        expect(prev.note ?? '').not.toMatch(/two children|three children|r == NIL|r ≠ NIL/);
        break;
      case 'two3.where': {
        const n = T.nodes[tags.x];
        const zk = T.nodes[tags.z].key;
        const want = zk < T.nodes[n.left!].key ? WHERE[0] : zk < T.nodes[n.middle!].key ? WHERE[1] : WHERE[2];
        expect(q.answer.value).toBe(want);
        break;
      }
      case 'two3.borrowMerge': {
        const y = T.nodes[tags.y];
        const z = T.nodes[y.p!];
        const sibling = y.id === z.left ? z.middle! : y.id === z.middle ? z.left! : z.middle!;
        expect(q.answer.value).toBe(T.nodes[sibling].right != null ? 'borrow' : 'merge');
        expect(prev.line).toBe(14);
        expect(prev.note).toBe('y = Borrow_Or_Merge(y).');
        break;
      }
      case 'two3.minimum':
        expect(prev.line).toBe(0);
        expect(q.answer.kind === 'node' && q.answer.value).toBe(realLeaves(T)[0]);
        break;
      case 'two3.successor': {
        const order = realLeaves(T);
        expect(prev.line).toBe(0);
        expect(q.answer.kind === 'node' && q.answer.value).toBe(order[order.indexOf(tags.x) + 1] ?? null);
        break;
      }
      default:
        throw new Error(`unexpected ${q.type}`);
    }
  });
}
