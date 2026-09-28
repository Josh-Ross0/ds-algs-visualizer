import type { DSView } from '../engine/trace';

function assertNever(x: never): never {
  throw new Error(`Unhandled DSView kind: ${JSON.stringify(x)}`);
}

function renderDs(d: DSView) {
  switch (d.kind) {
    case 'queue':
      return (
        <div key={d.name} className="queue">
          <strong>{d.name}</strong>
          <span className="muted"> (head → tail)</span>
          <div className="queue-items" aria-label={`${d.name} contents`}>
            {d.items.length === 0 ? <span className="muted">∅</span> : d.items.map((x, i) => <span key={i} className="chip">{x}</span>)}
          </div>
        </div>
      );
    case 'stack':
      return null;
    default:
      return assertNever(d as never);
  }
}

export function DSPanel({ ds }: { ds: DSView[] }) {
  return (
    <div className="panel ds">
      {ds.map(renderDs)}
    </div>
  );
}
