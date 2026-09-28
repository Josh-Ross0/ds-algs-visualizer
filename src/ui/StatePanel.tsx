import { formatValue, type StepCore, type VertexState } from '../engine/trace';

type Props = {
  columns: { key: string; label: string }[];
  vertices: string[];
  step?: StepCore & { vertexState?: VertexState };
};

export function StatePanel({ columns, vertices, step }: Props) {
  if (!step) return <div className="panel state"><p className="muted">Press Run to start.</p></div>;
  const vars = Object.entries(step.vars).filter(([, v]) => v !== undefined);
  return (
    <div className="panel state">
      {vars.length > 0 && (
        <p className="vars">
          {vars.map(([k, v]) => <span key={k}>{`${k} = ${formatValue(v)}`}</span>)}
        </p>
      )}
      {columns.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">v</th>
              {columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {vertices.map((v) => (
              <tr key={v}>
                <th scope="row">{v}</th>
                {columns.map((c) => <td key={c.key}>{formatValue(step.vertexState?.[v]?.[c.key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {step.note && <p className="note">{step.note}</p>}
    </div>
  );
}
