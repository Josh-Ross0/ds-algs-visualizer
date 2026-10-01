import { cellId } from '../engine/heapArray';
import { formatValue } from '../engine/trace';
import type { HeapView } from '../structures/types';

const CELL = 28;
const PAD = 16;
// Wide enough for the heap-size label even when the array is one cell long.
const MIN_WIDTH = 130;

type Props = { view: HeapView; onCellClick?(id: string): void };

// A[1…A.length] as a row of cells; cells past heap-size are greyed and a marker sits at the boundary.
export function HeapArrayStrip({ view, onCellClick }: Props) {
  const { heap, highlight, tags } = view;
  const n = heap.A.length;
  const tagsAt: Record<number, string[]> = {};
  for (const [name, at] of Object.entries(tags)) (tagsAt[at] ??= []).push(name);
  const width = Math.max(2 * PAD + n * CELL, MIN_WIDTH);
  const markerX = PAD + heap.heapSize * CELL;
  const anchor = heap.heapSize === 0 ? 'start' : heap.heapSize === n ? 'end' : 'middle';

  return (
    <svg
      className="heap-array"
      viewBox={`0 0 ${width} 84`}
      style={{ width: `${width}px`, maxWidth: '100%' }}
      role="img"
      aria-label="Heap array cells"
    >
      {heap.A.map((key, j) => {
        const i = j + 1;
        const live = i <= heap.heapSize;
        const cls = ['cell'];
        if (!live) cls.push('past');
        if (highlight.cells.includes(i)) cls.push('active');
        return (
          <g
            key={i}
            data-cell={i}
            className={cls.join(' ')}
            transform={`translate(${PAD + j * CELL},0)`}
            onPointerDown={live ? () => onCellClick?.(cellId(heap, i)) : undefined}
          >
            <text className="idx-label" x={CELL / 2} y={11} textAnchor="middle">{i}</text>
            <rect y={16} width={CELL} height={CELL} />
            <text className="key" x={CELL / 2} y={16 + CELL / 2} textAnchor="middle" dominantBaseline="central">
              {key === null ? '' : formatValue(key)}
            </text>
            {tagsAt[i] && <text className="ptr-tag" x={CELL / 2} y={62} textAnchor="middle">{tagsAt[i].join(', ')}</text>}
          </g>
        );
      })}
      <line className="heap-size-marker" x1={markerX} x2={markerX} y1={12} y2={50} />
      <text className="marker-label" x={markerX} y={80} textAnchor={anchor}>{`heap-size = ${heap.heapSize}`}</text>
    </svg>
  );
}
