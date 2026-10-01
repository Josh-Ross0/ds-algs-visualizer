import type { Proc } from '../../algorithms/types';

export const TREE_SEARCH = 'Tree_Search';
export const TREE_MINIMUM = 'Tree_Minimum';
export const TREE_SUCCESSOR = 'Tree_Successor';
export const TREE_INSERT = 'Tree_Insert';
export const BST_DELETE = 'Delete';

// Efficient DS slides 7–10; slides 11–14 give delete as four cases, not pseudocode.
export const bstProcs: Proc[] = [
  {
    name: TREE_SEARCH,
    signature: 'Tree_Search(x, k)',
    lines: [
      'if x == nil or x.key == k then',
      '    return x',
      'if k < x.key then',
      '    return Tree_Search(x.left, k)',
      'else return Tree_Search(x.right, k)',
    ],
  },
  {
    name: TREE_MINIMUM,
    signature: 'Tree_Minimum(x)',
    lines: ['while x.left ≠ NIL do', '    x = x.left', 'return x'],
  },
  {
    name: TREE_SUCCESSOR,
    signature: 'Tree_Successor(x)',
    lines: [
      'if x.right ≠ NIL then',
      '    return Tree_Minimum(x.right)',
      'y = x.p',
      'while y ≠ NIL and x == y.right do',
      '    x = y',
      '    y = y.p',
      'return y',
    ],
  },
  {
    name: TREE_INSERT,
    signature: 'Tree_Insert(T, z)',
    lines: [
      'if T.root == NIL then',
      '    T.root = z',
      'else',
      '    y = T.root',
      '    x = NIL',
      '    while y ≠ NIL do',
      '        x = y',
      '        if z.key < y.key then',
      '            y = y.left',
      '        else y = y.right',
      '    z.p = x',
      '    if z.key < x.key then',
      '        x.left = z',
      '    else x.right = z',
    ],
  },
  {
    name: BST_DELETE,
    signature: 'Deleting node x (slides 11–14)',
    lines: [
      'case 1: x is a leaf',
      '    not much to do: remove x',
      'case 2: x has a right child y and no left child',
      '    replace x with y',
      'case 3: x has a left child y and no right child',
      '    replace x with y',
      'case 4: x has two children',
      "    find x's successor y (in x's right subtree)",
      '    swap x and y',
      '    remove x    ▷ now x has ≤ 1 child',
    ],
  },
];
