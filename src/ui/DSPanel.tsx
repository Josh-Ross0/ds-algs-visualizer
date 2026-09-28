import type { DSView } from '../engine/trace';

function assertNever(x: never): never {
  throw new Error(`Unhandled DSView kind: ${JSON.stringify(x)}`);
}

function getOrientationLabel(d: DSView): string {
  switch (d.kind) {
    case 'queue':
      return '(head → tail)';
    case 'stack':
      return '(bottom → top)';
    default:
      return assertNever(d as never);
  }
}

function renderDs(d: DSView) {
  const orientationLabel = getOrientationLabel(d);
  return (
    <div key={d.name} className={d.kind}>
      <strong>{d.name}</strong>
      <span className="muted"> {orientationLabel}</span>
      <div className="queue-items" aria-label={`${d.name} contents`}>
        {d.items.length === 0 ? <span className="muted">∅</span> : d.items.map((x, i) => <span key={i} className="chip">{x}</span>)}
      </div>
    </div>
  );
}

export function DSPanel({ ds }: { ds: DSView[] }) {
  return (
    <div className="panel ds">
      {ds.map(renderDs)}
    </div>
  );
}
