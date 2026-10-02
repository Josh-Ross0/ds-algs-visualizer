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

## Conventions established in tree plan 3 (2-3 tree)

- `TreeNode` carries `middle?` and `leaf?`; a node with NIL attributes has `key = NaN` (the tracer shows it as NIL). `StructureView` has a third member, `TwoThreeView`; add a view the same way for any further structure: a `kind`, a `StructureCanvas` branch, a `nodeOptions` branch.
- `createTreeTracer`/`createTwoThreeTracer` share one factory. A pointer variable whose node was deleted shows `'deleted'` and has no tag; procedures drop the variable (`dropVar`) when the lecture frees a node.
- Procedures that call procedures run in their own frame: `inFrame(tr, frameLabel, ptr, body)` swaps variables and the call stack and restores them.
- A line that calls a procedure emits one step before the callee's steps; the caller's variable that receives the result changes in the caller's next step.
- Sentinels (`±∞` leaves) are ordinary leaves; they are excluded from node answers (`realLeaves`), from clicks (`TwoThreeCanvas`) and from keys (integers only).
- Out of scope, as in the spec: the augmented 2-3 tree of Tutorial 6 and B+ trees with d > 3.
