import { useState } from 'react';
import type { AlgorithmDef, Params, Validation } from '../algorithms/types';
import { moveInAdjacency, resetAdjacency, setDirected, vertexIds, type Graph } from '../engine/graph';
import type { Step } from '../engine/trace';
import { AdjacencyPanel } from './AdjacencyPanel';
import { GraphEditor } from './GraphEditor';
import { PseudocodePanel } from './PseudocodePanel';
import { useSettings } from './settings';
import { Visualizer } from './Visualizer';

const NO_MESSAGES: Validation = { errors: [], warnings: [] };

export function AlgorithmPage({ def }: { def: AlgorithmDef }) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [graph, setGraph] = useState<Graph>(def.presets[0].graph);
  const [params, setParams] = useState<Params>(def.presets[0].params);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [runId, setRunId] = useState(0);
  const [messages, setMessages] = useState<Validation>(NO_MESSAGES);
  const [settings, setSettings] = useSettings();
  const running = steps !== null;

  const loadPreset = (i: number) => {
    setPresetIndex(i);
    setGraph(def.presets[i].graph);
    setParams(def.presets[i].params);
    setMessages(NO_MESSAGES);
  };

  const run = () => {
    const v = def.validate(graph, params);
    setMessages(v);
    if (v.errors.length > 0) return;
    setSteps(def.run(graph, params));
    setRunId((r) => r + 1);
  };

  return (
    <div className="algo-page">
      <header className="page-header">
        <a href="#/">← All algorithms</a>
        <h1>{def.title}</h1>
      </header>
      <div className="toolbar">
        <label>
          Preset
          <select value={presetIndex} disabled={running} onChange={(e) => loadPreset(Number(e.target.value))}>
            {def.presets.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
          </select>
        </label>
        {def.params.map((p) => (
          <label key={p.name}>
            {p.label}
            <select
              value={params[p.name] ?? ''}
              disabled={running}
              onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
            >
              <option value="">choose…</option>
              {vertexIds(graph).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        ))}
        {def.directed === 'toggle' && (
          <label>
            <input
              type="checkbox"
              checked={graph.directed}
              disabled={running}
              onChange={(e) => setGraph(setDirected(graph, e.target.checked))}
            />
            Directed
          </label>
        )}
        {running ? (
          <button type="button" onClick={() => setSteps(null)}>Edit graph</button>
        ) : (
          <button type="button" className="primary" onClick={run}>Run</button>
        )}
      </div>
      {messages.errors.map((m) => <p key={m} role="alert" className="feedback bad">{m}</p>)}
      {messages.warnings.map((m) => <p key={m} className="feedback warn">{m}</p>)}
      {running ? (
        <Visualizer key={runId} def={def} graph={graph} steps={steps} settings={settings} onSettingsChange={setSettings} />
      ) : (
        <div className="layout">
          <div className="main-col">
            <GraphEditor graph={graph} onChange={setGraph} />
          </div>
          <div className="side-col">
            <PseudocodePanel procs={def.procs} />
            <AdjacencyPanel
              graph={graph}
              onMove={(u, i, d) => setGraph(moveInAdjacency(graph, u, i, d))}
              onReset={() => setGraph(resetAdjacency(graph))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
