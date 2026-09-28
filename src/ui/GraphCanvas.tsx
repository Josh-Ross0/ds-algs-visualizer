import { useId, useRef, type PointerEvent } from 'react';
import { DEFAULT_WEIGHT, edgeKey, hasEdge, type Graph } from '../engine/graph';
import { formatValue, type Step } from '../engine/trace';

export const VIEW_W = 600;
export const VIEW_H = 420;
export const RADIUS = 20;
export type Point = { x: number; y: number };

const MARKER_KINDS = ['plain', 'tree', 'active', 'selected'] as const;

type Props = {
  graph: Graph;
  step?: Step;
  selected?: string | null;
  edgeFrom?: string | null;
  weighted?: boolean;
  plainVertices?: boolean;
  onBackgroundPointerDown?(p: Point): void;
  onVertexPointerDown?(id: string): void;
  onEdgeClick?(key: string): void;
  onPointerMove?(p: Point): void;
  onPointerUp?(): void;
};

function toSvgPoint(svg: SVGSVGElement, e: PointerEvent): Point {
  const m = svg.getScreenCTM();
  if (!m) return { x: e.clientX, y: e.clientY };
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return {
    x: Math.min(VIEW_W - RADIUS, Math.max(RADIUS, p.x)),
    y: Math.min(VIEW_H - RADIUS, Math.max(RADIUS, p.y)),
  };
}

export function GraphCanvas(props: Props) {
  const { graph, step, selected, edgeFrom } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const pos = new Map(graph.vertices.map((v) => [v.id, v]));
  const hl = step?.highlight ?? {};
  const point = (e: PointerEvent) => toSvgPoint(svgRef.current!, e);
  // One set of arrowheads per canvas; strip useId's punctuation so url(#…) stays simple.
  const markerBase = `arrow${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg
      ref={svgRef}
      className="graph-canvas"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Graph"
      onPointerMove={props.onPointerMove && ((e) => props.onPointerMove!(point(e)))}
      onPointerUp={props.onPointerUp}
      onPointerLeave={props.onPointerUp}
    >
      <defs>
        {MARKER_KINDS.map((k) => (
          <marker
            key={k}
            id={`${markerBase}-${k}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className={`arrow-head ${k}`} />
          </marker>
        ))}
      </defs>
      <rect
        className="canvas-bg"
        width={VIEW_W}
        height={VIEW_H}
        onPointerDown={props.onBackgroundPointerDown && ((e) => props.onBackgroundPointerDown!(point(e)))}
      />
      {graph.edges.map((e) => {
        const a = pos.get(e.u)!;
        const b = pos.get(e.v)!;
        const key = edgeKey(graph, e.u, e.v);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const offset = graph.directed && hasEdge(graph, e.v, e.u) ? 6 : 0;
        const ox = -uy * offset;
        const oy = ux * offset;
        const end = graph.directed ? RADIUS + 3 : 0;
        const cls = ['edge'];
        if (hl.treeEdges?.includes(key)) cls.push('tree');
        if (hl.edges?.includes(key)) cls.push('active');
        if (hl.cycle?.includes(key)) cls.push('cycle');
        if (selected === key) cls.push('selected');
        const markerKind =
          selected === key ? 'selected' : hl.edges?.includes(key) ? 'active' : hl.treeEdges?.includes(key) ? 'tree' : 'plain';
        const x1 = a.x + ox;
        const y1 = a.y + oy;
        const x2 = b.x - ux * end + ox;
        const y2 = b.y - uy * end + oy;
        return (
          <g key={key} data-edge={key} className={cls.join(' ')} onClick={() => props.onEdgeClick?.(key)}>
            <line className="edge-hit" x1={x1} y1={y1} x2={x2} y2={y2} />
            <line
              className="edge-line"
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              markerEnd={graph.directed ? `url(#${markerBase}-${markerKind})` : undefined}
            />
            {props.weighted && (
              <text
                className="edge-weight"
                x={(x1 + x2) / 2 - uy * 12}
                y={(y1 + y2) / 2 + ux * 12}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {formatValue(e.w ?? DEFAULT_WEIGHT)}
              </text>
            )}
          </g>
        );
      })}
      {graph.vertices.map((v) => {
        const attrs = step?.vertexState[v.id];
        const color = attrs?.color;
        const hasState = attrs !== undefined && Object.keys(attrs).length > 0;
        const look = typeof color === 'string' ? `v-${color}` : props.plainVertices || hasState ? 'v-plain' : 'v-none';
        const cls = ['vertex', look];
        if (hl.settled?.includes(v.id)) cls.push('settled');
        if (hl.vertices?.includes(v.id)) cls.push('active');
        if (selected === v.id) cls.push('selected');
        if (edgeFrom === v.id) cls.push('edge-from');
        return (
          <g
            key={v.id}
            data-vertex={v.id}
            className={cls.join(' ')}
            transform={`translate(${v.x},${v.y})`}
            onPointerDown={(e) => {
              e.stopPropagation();
              props.onVertexPointerDown?.(v.id);
            }}
          >
            <circle r={RADIUS} />
            <text textAnchor="middle" dominantBaseline="central">{v.id}</text>
          </g>
        );
      })}
    </svg>
  );
}
