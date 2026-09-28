# Follow-ups for the tree track

## Conventions established in tree plan 1 (BST)

- Every tree operation starts with a call step: `line: 0` of the main procedure; PseudocodePanel highlights the signature. `assertValidTreeTrace` allows line 0 only at step 0.
- `StructureDef` and `TreeStep` are BST-shaped: `run(t: Tree, …)` and `TreeView.tree`. Plan 2 (heap) must generalise them (e.g. `StructureDef<S>` with a view union) instead of forcing a heap into `Tree`.
- `TreeNode` has no `middle` yet; plan 3 (2-3 tree) adds it and a 2-3 layout (all leaves on one level, internal nodes centred over children).
- Node answers use `{ kind: 'node', value: id | null, label, nil }`; Player builds them from clicks via its `nodes(step)` prop.
- Operations never mutate the page's tree; "Done: keep result" adopts the last step's `view.tree`.
- Spec gap: §3 "Pointer tags" lists `T.root` alongside x, y, z, etc. as a pointer variable to draw beside its node, but only x/y/z/etc. are currently drawn — `T.root` is not. Matters most for Tree_Insert lines 1, 2 and 4. Plan 1 doesn't need to fix this now, but the convention should carry into plans 2 and 3: heap and 2-3 tree also have `T.root` and other pointer variables.

## Plan 2 (binary heap)

- Array strip under the tree, heap-size marker, index labels, greyed cells past heap-size.
- Build Heap takes an editable array, not the current structure.

## Plan 3 (2-3 tree)

- Sentinel leaves (−∞, +∞) must never be offered as node answers or accepted as keys.
