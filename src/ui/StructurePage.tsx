import { useEffect, useRef, useState } from 'react';
import { inorder, type Tree } from '../engine/tree';
import type { StructureDef, TreeStep, TreeView } from '../structures/types';
import { DSPanel } from './DSPanel';
import { Player } from './Player';
import { PseudocodePanel } from './PseudocodePanel';
import { useSettings } from './settings';
import { StatePanel } from './StatePanel';
import { TreeCanvas } from './TreeCanvas';

const parseKey = (text: string): number | null => (/^-?\d+$/.test(text.trim()) ? Number(text.trim()) : null);

export function StructurePage({ def }: { def: StructureDef<Tree, TreeView> }) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [tree, setTree] = useState(() => def.build(def.presets[0].keys));
  const [opId, setOpId] = useState(def.operations[0].id);
  const [keyText, setKeyText] = useState('');
  const [steps, setSteps] = useState<TreeStep[] | null>(null);
  const [runId, setRunId] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [settings, setSettings] = useSettings();
  // Keep/Back both return the page to setup state, unmounting the button the
  // student clicked, so focus would fall to <body>. Send it to Run instead.
  const runRef = useRef<HTMLButtonElement>(null);
  const focusRunRef = useRef(false);
  useEffect(() => {
    if (steps === null && focusRunRef.current) {
      focusRunRef.current = false;
      runRef.current?.focus();
    }
  }, [steps]);

  const op = def.operations.find((o) => o.id === opId)!;
  const procs = op.procs.map((name) => def.procs.find((p) => p.name === name)!);
  const needsKey = op.input !== 'none';
  const key = parseKey(keyText);

  const loadPreset = (i: number) => {
    setPresetIndex(i);
    setTree(def.build(def.presets[i].keys));
    setErrors([]);
  };
  const run = () => {
    const args = needsKey ? [key!] : [];
    const e = def.validate(tree, op.id, args);
    setErrors(e);
    if (e.length > 0) return;
    setSteps(def.run(tree, op.id, args));
    setRunId((r) => r + 1);
  };
  const keep = () => {
    setTree(def.keep(steps![steps!.length - 1].view));
    setSteps(null);
    focusRunRef.current = true;
  };
  const backToTree = () => {
    setSteps(null);
    focusRunRef.current = true;
  };

  return (
    <div className="algo-page">
      <header className="page-header">
        <a href="#/">← All topics</a>
        <h1>{def.title}</h1>
      </header>
      <div className="toolbar">
        <label>
          Preset
          <select value={presetIndex} disabled={steps !== null} onChange={(e) => loadPreset(Number(e.target.value))}>
            {def.presets.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={steps !== null} onClick={() => loadPreset(presetIndex)}>Reset to preset</button>
        <button type="button" disabled={steps !== null} onClick={() => { setTree(def.build([])); setErrors([]); }}>Clear</button>
        <label>
          Operation
          <select value={opId} disabled={steps !== null} onChange={(e) => { setOpId(e.target.value); setErrors([]); }}>
            {def.operations.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        {needsKey && (
          <label>
            Key
            <input
              className="key-input"
              value={keyText}
              inputMode="numeric"
              disabled={steps !== null}
              aria-invalid={keyText.trim() !== '' && key === null}
              onChange={(e) => setKeyText(e.target.value)}
            />
          </label>
        )}
        {steps === null ? (
          <button type="button" ref={runRef} className="primary" disabled={needsKey && key === null} onClick={run}>Run</button>
        ) : (
          <button type="button" onClick={backToTree}>Back to the tree</button>
        )}
      </div>
      {errors.map((m) => <p key={m} role="alert" className="feedback bad">{m}</p>)}
      {steps === null ? (
        <div className="layout">
          <div className="main-col">
            <TreeCanvas
              view={def.view(tree, op.input === 'node' ? key : null)}
              onNodeClick={op.input === 'node' ? (id) => setKeyText(String(def.nodeKey!(tree, id))) : undefined}
            />
            {op.input === 'node' && <p className="muted hint">Click a node or type its key.</p>}
          </div>
          <div className="side-col">
            <PseudocodePanel procs={procs} />
          </div>
        </div>
      ) : (
        <Player
          key={runId}
          steps={steps}
          procs={procs}
          questionTypes={def.questionTypes}
          settings={settings}
          onSettingsChange={setSettings}
          nodes={(s) => inorder(s.view.tree).map((id) => ({ id, label: String(s.view.tree.nodes[id].key) }))}
          main={(s, pick) => <TreeCanvas view={s.view} onNodeClick={pick} />}
          below={(s) => <DSPanel ds={s.ds} />}
          side={(s) => <StatePanel columns={[]} vertices={[]} step={s} />}
          end={<button type="button" className="primary keep-result" onClick={keep}>Done: keep result</button>}
        />
      )}
    </div>
  );
}
