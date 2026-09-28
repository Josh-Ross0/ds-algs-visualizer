import { formatValue, type DSView } from '../engine/trace';

function assertNever(x: never): never {
  throw new Error(`Unhandled DSView kind: ${JSON.stringify(x)}`);
}

function getOrientationLabel(d: DSView): string {
  switch (d.kind) {
    case 'queue':
      return '(head → tail)';
    case 'stack':
      return '(bottom → top)';
    case 'edges':
      return '(scan order)';
    case 'keyed':
      return `(by ${d.key})`;
    default:
      return assertNever(d);
  }
}

function getChips(d: DSView): { text: string; current: boolean }[] {
  switch (d.kind) {
    case 'queue':
    case 'stack':
      return d.items.map((text) => ({ text, current: false }));
    case 'edges':
      return d.items.map((text, i) => ({ text, current: i === d.current }));
    case 'keyed':
      return d.items.map((x) => ({ text: `${x.id}.${d.key} = ${formatValue(x.value)}`, current: false }));
    default:
      return assertNever(d);
  }
}

function renderDs(d: DSView) {
  const chips = getChips(d);
  return (
    <div key={d.name} className={d.kind}>
      <strong>{d.name}</strong>
      <span className="muted"> {getOrientationLabel(d)}</span>
      <div className="queue-items" aria-label={`${d.name} contents`}>
        {chips.length === 0 ? (
          <span className="muted">∅</span>
        ) : (
          chips.map((c, i) => (
            <span key={i} className={c.current ? 'chip current' : 'chip'} aria-current={c.current ? 'true' : undefined}>
              {c.text}
            </span>
          ))
        )}
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
