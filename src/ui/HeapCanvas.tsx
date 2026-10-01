import { cellId, heapLayout, parent } from '../engine/heapArray';
import { formatValue } from '../engine/trace';
import type { HeapView } from '../structures/types';
import { HeapArrayStrip } from './HeapArrayStrip';

const R = 17;

type Props = { view: HeapView; onNodeClick?(id: string): void };

// The heap as a tree at fixed index positions (slide 43), with the array strip underneath.
export function HeapCanvas({ view, onNodeClick }: Props) {
  const { heap, highlight, tags } = view;
  const L = heapLayout(heap.A.length);
  const live = Array.from({ length: heap.heapSize }, (_, j) => j + 1);
  const tagsAt: Record<number, string[]> = {};
  for (const [name, at] of Object.entries(tags)) (tagsAt[at] ??= []).push(name);

  return (
    <div className="heap-canvas">
      <svg className="tree-canvas" viewBox={`0 0 ${L.width} ${L.height}`} role="img" aria-label="Heap as a tree">
        {live.filter((i) => i > 1).map((i) => {
          const a = L.pos[parent(i)];
          const b = L.pos[i];
          const cls = highlight.edges.includes(i) ? 'tree-edge active' : 'tree-edge';
          return <line key={`e-${cellId(heap, i)}`} data-edge={cellId(heap, i)} className={cls} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {live.map((i) => {
          const id = cellId(heap, i);
          const { x, y } = L.pos[i];
          return (
            <g
              key={id}
              data-node={id}
              className={highlight.cells.includes(i) ? 'tnode active' : 'tnode'}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onPointerDown={() => onNodeClick?.(id)}
            >
              <circle r={R} />
              <text className="key" textAnchor="middle" dominantBaseline="central">{formatValue(heap.A[i - 1])}</text>
              <text className="idx-label" x={-R - 2} y={-R + 2} textAnchor="end">{i}</text>
              {tagsAt[i] && <text className="ptr-tag" x={R + 3} y={-R + 2}>{tagsAt[i].join(', ')}</text>}
            </g>
          );
        })}
        {live.length === 0 && (
          <text className="empty-note" x={L.width / 2} y={L.height / 2} textAnchor="middle" dominantBaseline="central">
            heap-size = 0 (empty heap)
          </text>
        )}
      </svg>
      <HeapArrayStrip view={view} onCellClick={onNodeClick} />
    </div>
  );
}
