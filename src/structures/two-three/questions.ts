import type { Question } from '../../engine/trace';
import type { NodeId, Tree } from '../../engine/tree';
import { fmtKey } from '../../engine/twoThree';
import { nodeQuestion } from '../bst/questions';

export const TWO_THREE_QUESTION_TYPES = [
  { type: 'two3.search', label: '2_3_Search: left, middle or right child' },
  { type: 'two3.insertWalk', label: '2_3_Insert: left, middle or right child' },
  { type: 'two3.split', label: 'Insert_And_Split: does x split' },
  { type: 'two3.where', label: 'Insert_And_Split: where does z go' },
  { type: 'two3.borrowMerge', label: 'Borrow_Or_Merge: borrow or merge' },
  { type: 'two3.minimum', label: 'Which leaf 2_3_Minimum returns' },
  { type: 'two3.successor', label: 'Which leaf 2_3_Successor returns' },
];

export type Child = 'left child' | 'middle child' | 'right child';

// An internal node with two children offers only the left and the middle child.
export function childOptions(t: Tree, x: NodeId): Child[] {
  return t.nodes[x].right != null ? ['left child', 'middle child', 'right child'] : ['left child', 'middle child'];
}

// The child a walk toward key k takes at x. 2_3_Search tests k ≤ key (slide 22), 2_3_Insert tests z.key < key (slide 31).
export function childToward(t: Tree, x: NodeId, k: number, strict: boolean): Child {
  const n = t.nodes[x];
  const before = (a: number, b: number) => (strict ? a < b : a <= b);
  if (before(k, t.nodes[n.left!].key)) return 'left child';
  if (before(k, t.nodes[n.middle!].key)) return 'middle child';
  return 'right child';
}

function walkQuestion(type: string, prompt: string, t: Tree, x: NodeId, k: number, strict: boolean): Question {
  const n = t.nodes[x];
  const op = strict ? '<' : '≤';
  const move = childToward(t, x, k, strict);
  const left = fmtKey(t.nodes[n.left!].key);
  const middle = fmtKey(t.nodes[n.middle!].key);
  const why: Record<Child, string> = {
    'left child': `${k} ${op} x.left.key = ${left}, so the walk continues in the left child.`,
    'middle child': `${k} > x.left.key = ${left} and ${k} ${op} x.middle.key = ${middle}, so it continues in the middle child.`,
    'right child': `${k} > x.middle.key = ${middle}, so it continues in the right child.`,
  };
  return { type, prompt, answer: { kind: 'choice', value: move, options: childOptions(t, x) }, explain: why[move] };
}

export const searchQuestion = (t: Tree, x: NodeId, k: number): Question =>
  walkQuestion('two3.search', `2_3_Search(x, ${k}) at the internal node with key ${fmtKey(t.nodes[x].key)}: which child does the search continue in?`, t, x, k, false);

export const insertWalkQuestion = (t: Tree, y: NodeId, k: number): Question =>
  walkQuestion('two3.insertWalk', `Line 2: y is the internal node with key ${fmtKey(t.nodes[y].key)}. Which child does z.key = ${k} go down into?`, t, y, k, true);

export const splitQuestion = (splits: boolean): Question => ({
  type: 'two3.split',
  prompt: 'Insert_And_Split(x, z): does x split?',
  answer: { kind: 'yesno', value: splits },
  explain: splits
    ? 'x already has three children, so adding z would give it four: x splits (r ≠ NIL).'
    : 'x has only two children, so z fits without a split (r == NIL).',
});

export const WHERE = ['before ℓ', 'between ℓ and m', 'after m'];

export function whereQuestion(t: Tree, x: NodeId, z: NodeId): Question {
  const n = t.nodes[x];
  const zk = t.nodes[z].key;
  const l = fmtKey(t.nodes[n.left!].key);
  const m = fmtKey(t.nodes[n.middle!].key);
  const value = zk < t.nodes[n.left!].key ? WHERE[0] : zk < t.nodes[n.middle!].key ? WHERE[1] : WHERE[2];
  const why = [`z.key = ${fmtKey(zk)} < ℓ.key = ${l}.`, `ℓ.key = ${l} < z.key = ${fmtKey(zk)} < m.key = ${m}.`, `z.key = ${fmtKey(zk)} > m.key = ${m}.`];
  return {
    type: 'two3.where',
    prompt: `x has two children ℓ and m. Where does z (key ${fmtKey(zk)}) go?`,
    answer: { kind: 'choice', value, options: WHERE },
    explain: why[WHERE.indexOf(value)],
  };
}

export const borrowMergeQuestion = (borrow: boolean): Question => ({
  type: 'two3.borrowMerge',
  prompt: 'Borrow_Or_Merge(y): does y borrow a child from its sibling x, or merge with it?',
  answer: { kind: 'choice', value: borrow ? 'borrow' : 'merge', options: ['borrow', 'merge'] },
  explain: borrow
    ? 'The sibling x has three children (x.right ≠ NIL), so it can give one to y.'
    : 'The sibling x has only two children (x.right = NIL), so y and x merge into one node.',
});

export const minimumQuestion = (t: Tree, first: NodeId): Question =>
  nodeQuestion('two3.minimum', 'Which leaf will 2_3_Minimum(T) return?', first, fmtKey(t.nodes[first].key), false,
    'The leaves are sorted, so the minimum is the first leaf after the −∞ sentinel.');

export const successorQuestion = (t: Tree, x: NodeId, answer: NodeId | null): Question =>
  nodeQuestion('two3.successor', `Which leaf will 2_3_Successor(x) return for the leaf with key ${fmtKey(t.nodes[x].key)}?`, answer,
    answer === null ? 'NIL' : fmtKey(t.nodes[answer].key), true,
    answer === null
      ? `${fmtKey(t.nodes[x].key)} is the largest key; the next leaf is the +∞ sentinel, so the procedure returns NIL.`
      : `${fmtKey(t.nodes[answer].key)} is the smallest key greater than ${fmtKey(t.nodes[x].key)}.`);
