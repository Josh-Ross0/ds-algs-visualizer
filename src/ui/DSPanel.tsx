import type { DSView } from '../engine/trace';

export function DSPanel({ ds }: { ds: DSView[] }) {
  return (
    <div className="panel ds">
      {ds.map((d) => (
        <div key={d.name} className="queue">
          <strong>{d.name}</strong>
          <span className="muted"> (head → tail)</span>
          <div className="queue-items" aria-label={`${d.name} contents`}>
            {d.items.length === 0 ? <span className="muted">∅</span> : d.items.map((x, i) => <span key={i} className="chip">{x}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}
