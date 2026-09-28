import { edgeKey, edgeList, edgeName, type Graph } from '../engine/graph';

type Props = { graph: Graph; onMove(index: number, delta: number): void; onReset(): void };

export function EdgeListPanel({ graph, onMove, onReset }: Props) {
  const list = edgeList(graph);
  return (
    <div className="panel adjacency">
      <h3>Edge list G.E</h3>
      <p className="muted">Order here is the order the algorithm scans the edges.</p>
      <p aria-label="G.E" className="adj-list edge-list">
        {list.length === 0 && <span className="muted">∅</span>}
        {list.map((e, i) => {
          const name = edgeName(graph, e);
          return (
            <span key={edgeKey(graph, e.u, e.v)} className="chip">
              {i > 0 && (
                <button type="button" aria-label={`Move ${name} earlier in G.E`} onClick={() => onMove(i, -1)}>‹</button>
              )}
              {name}
              {i < list.length - 1 && (
                <button type="button" aria-label={`Move ${name} later in G.E`} onClick={() => onMove(i, 1)}>›</button>
              )}
            </span>
          );
        })}
      </p>
      <button type="button" onClick={onReset}>Reset to label order</button>
    </div>
  );
}
