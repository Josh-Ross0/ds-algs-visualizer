import type { Proc } from '../algorithms/types';

type Props = { procs: Proc[]; current?: { proc: string; line: number } };

export function PseudocodePanel({ procs, current }: Props) {
  return (
    <div className="panel pseudocode">
      {procs.map((p) => (
        <section key={p.name} aria-label={p.signature}>
          <h3>{p.signature}</h3>
          <ol>
            {p.lines.map((text, i) => {
              const isCurrent = current?.proc === p.name && current.line === i + 1;
              return (
                <li key={i} className={isCurrent ? 'current' : undefined} aria-current={isCurrent ? 'step' : undefined}>
                  <span className="ln">{i + 1}:</span>
                  <code>{text}</code>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
