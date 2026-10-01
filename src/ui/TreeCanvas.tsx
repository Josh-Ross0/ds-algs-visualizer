import { bstLayout, inorder, type NodeId } from '../engine/tree';
import { formatValue } from '../engine/trace';
import type { TreeView } from '../structures/types';

const R = 17;

type Props = { view: TreeView; onNodeClick?(id: NodeId): void };

export function TreeCanvas({ view, onNodeClick }: Props) {
  const { tree, highlight, tags, nil } = view;
  const L = bstLayout(tree, nil);
  const attached = new Set(inorder(tree));
  const ids = Object.keys(L.pos);
  const tagsOf: Record<NodeId, string[]> = {};
  for (const [name, id] of Object.entries(tags)) (tagsOf[id] ??= []).push(name);

  return (
    <svg className="tree-canvas" viewBox={`0 0 ${L.width} ${L.height}`} role="img" aria-label="Tree">
      {ids.map((id) => {
        const p = tree.nodes[id].p;
        if (p === null || !attached.has(id)) return null;
        const a = L.pos[p];
        const b = L.pos[id];
        const cls = highlight.edges.includes(id) ? 'tree-edge active' : 'tree-edge';
        return <line key={`e-${id}`} data-edge={id} className={cls} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
      {nil && L.nilPos && (
        <g className="nil-slot">
          <line className="nil-edge" x1={L.pos[nil.parent].x} y1={L.pos[nil.parent].y} x2={L.nilPos.x} y2={L.nilPos.y} />
          <g transform={`translate(${L.nilPos.x},${L.nilPos.y})`}>
            <circle r={R} />
            <text textAnchor="middle" dominantBaseline="central">NIL</text>
          </g>
        </g>
      )}
      {ids.map((id) => {
        const { x, y } = L.pos[id];
        const cls = ['tnode'];
        if (highlight.nodes.includes(id)) cls.push('active');
        if (!attached.has(id)) cls.push('detached');
        return (
          <g
            key={id}
            data-node={id}
            className={cls.join(' ')}
            style={{ transform: `translate(${x}px, ${y}px)` }}
            onPointerDown={() => onNodeClick?.(id)}
          >
            <circle r={R} />
            <text textAnchor="middle" dominantBaseline="central">{formatValue(tree.nodes[id].key)}</text>
            {tagsOf[id] && <text className="ptr-tag" x={R + 3} y={-R + 2}>{tagsOf[id].join(', ')}</text>}
          </g>
        );
      })}
      {ids.length === 0 && (
        <text className="empty-note" x={L.width / 2} y={L.height / 2} textAnchor="middle" dominantBaseline="central">
          T.root = NIL (empty tree)
        </text>
      )}
    </svg>
  );
}
