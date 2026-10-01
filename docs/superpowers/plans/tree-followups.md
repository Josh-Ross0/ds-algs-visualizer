# Follow-ups for the tree track

## Conventions established in tree plan 1 (BST)

- Every tree operation starts with a call step: `line: 0` of the main procedure; PseudocodePanel highlights the signature. `assertValidTreeTrace` allows line 0 only at step 0.
- `TreeNode` has no `middle` yet; plan 3 (2-3 tree) adds it and a 2-3 layout (all leaves on one level, internal nodes centred over children).
- Node answers use `{ kind: 'node', value: id | null, label, nil }`; Player builds them from clicks via its `nodes(step)` prop.
- Operations never mutate the page's structure; "Done: keep result" adopts the last step's view.

## Conventions established in tree plan 2 (binary heap)

- `StructureDef<S, V>` is generic over the state and the view; `view(s, selectedKey)`, `keep(view)` and optional `nodeKey` replace direct `Tree` access. `StructureView = TreeView | HeapView`, discriminated on `kind`; plan 3 adds a third view and a `StructureCanvas` branch. `validate` and `run` take `args: number[]` (`[]`, `[key]`, `[index, key]` or an array's keys, per `Operation.input`).
- Pointer variables are drawn as tags: `TreeView.tags` maps a name to a node id (plan 1), `HeapView.tags` maps a name to an array index (drawn beside the node and under the cell). `T.root` is a tag while `tr.showRoot` is set (Tree_Insert); the heap pseudocode has no `T.root`. Plan 3's `2_3_Insert` and friends use `T.root`: set `showRoot` there too.
- Copies (`A[1] = A[heap-size]`, `A[s] = x`) get a fresh cell id; swaps move ids with keys. Live ids stay unique, so canvases can key nodes by id and transitions animate swaps.
- Leaf Heapify calls ask nothing (forced answer). Apply the same rule to any plan-3 question whose answer is forced.
- `A.length` is 15 for presets and Clear, and `n` after Build Heap; Insert is blocked when the array is full.

## Plan 3 (2-3 tree)

- Sentinel leaves (−∞, +∞) must never be offered as node answers or accepted as keys.
- `nodeOptions(view)` (in `structures/views.ts`) must learn the 2-3 view; leaves only for leaf answers.
