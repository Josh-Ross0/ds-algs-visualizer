import type { NodeId } from '../engine/tree';
import { fmtKey, kids, twoThreeLayout } from '../engine/twoThree';
import type { TwoThreeView } from '../structures/types';

const R = 17;
const LW = 15; // half the width of a leaf box
const LH = 13;

type Props = { view: TwoThreeView; onNodeClick?(id: NodeId): void };

// Leaves are boxes on one row, internal nodes circles centred over their children (slide 18).
// Edges follow the child pointers, not p, so half-finished states between lecture lines still draw.
export function TwoThreeCanvas({ view, onNodeClick }: Props) {
  const { tree, highlight, tags } = view;
  const L = twoThreeLayout(tree);
  const ids = Object.keys(L.pos);
  const attached = new Set<NodeId>();
  const mark = (id: NodeId) => {
    if (attached.has(id)) return;
    attached.add(id);
    kids(tree, id).forEach(mark);
  };
  if (tree.root !== null) mark(tree.root);
  const tagsOf: Record<NodeId, string[]> = {};
  for (const [name, id] of Object.entries(tags)) (tagsOf[id] ??= []).push(name);

  return (
    <svg className="tree-canvas two-three" viewBox={`0 0 ${L.width} ${L.height}`} role="img" aria-label="2-3 tree">
      {ids.flatMap((id) => kids(tree, id).map((c) => (
        <line
          key={`e-${id}-${c}`}
          data-edge={`${id}>${c}`}
          className={highlight.edges.includes(c) ? 'tree-edge active' : 'tree-edge'}
          x1={L.pos[id].x}
          y1={L.pos[id].y}
          x2={L.pos[c].x}
          y2={L.pos[c].y}
        />
      )))}
      {ids.map((id) => {
        const n = tree.nodes[id];
        const { x, y } = L.pos[id];
        const leaf = n.leaf === true;
        const real = leaf && Number.isFinite(n.key);
        const cls = ['tnode'];
        if (leaf) cls.push('leaf');
        if (leaf && !real && !Number.isNaN(n.key)) cls.push('sentinel');
        if (highlight.nodes.includes(id)) cls.push('active');
        if (!attached.has(id)) cls.push('detached');
        return (
          <g
            key={id}
            data-node={id}
            className={cls.join(' ')}
            style={{ transform: `translate(${x}px, ${y}px)` }}
            onPointerDown={real ? () => onNodeClick?.(id) : undefined}
          >
            {leaf ? <rect x={-LW} y={-LH} width={2 * LW} height={2 * LH} /> : <circle r={R} />}
            <text className="key" textAnchor="middle" dominantBaseline="central">
              {Number.isNaN(n.key) ? '' : fmtKey(n.key)}
            </text>
            {tagsOf[id] && (
              <text className="ptr-tag" x={(leaf ? LW : R) + 3} y={leaf ? -LH : -R + 2}>{tagsOf[id].join(', ')}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
