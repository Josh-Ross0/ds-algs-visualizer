import { adjacency, vertexIds, type Graph } from '../engine/graph';

type Props = { graph: Graph; onMove?(u: string, index: number, delta: number): void; onReset?(): void };

export function AdjacencyPanel({ graph, onMove, onReset }: Props) {
  return (
    <div className="panel adjacency">
      <h3>Adjacency lists</h3>
      {onMove && <p className="muted">Order here is the order the algorithm scans neighbors.</p>}
      <ul>
        {vertexIds(graph).map((u) => {
          const list = adjacency(graph, u);
          return (
            <li key={u}>
              <span className="adj-head">G.Adj[{u}]:</span>
              <span aria-label={`G.Adj[${u}]`} className="adj-list">
                {list.length === 0 && <span className="muted">∅</span>}
                {list.map((v, i) => (
                  <span key={v} className="chip">
                    {onMove && i > 0 && (
                      <button type="button" aria-label={`Move ${v} earlier in G.Adj[${u}]`} onClick={() => onMove(u, i, -1)}>‹</button>
                    )}
                    {v}
                    {onMove && i < list.length - 1 && (
                      <button type="button" aria-label={`Move ${v} later in G.Adj[${u}]`} onClick={() => onMove(u, i, 1)}>›</button>
                    )}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      {onReset && <button type="button" onClick={onReset}>Reset to label order</button>}
    </div>
  );
}
