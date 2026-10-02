import { useEffect, useRef, useState } from 'react';
import type { StructureDef, StructureStep, StructureView } from '../structures/types';
import { nodeOptions } from '../structures/views';
import { DSPanel } from './DSPanel';
import { Player } from './Player';
import { PseudocodePanel } from './PseudocodePanel';
import { useSettings } from './settings';
import { StatePanel } from './StatePanel';
import { StructureCanvas } from './StructureCanvas';

const parseKey = (text: string): number | null => {
  if (!/^-?\d+$/.test(text.trim())) return null;
  const n = Number(text.trim());
  return Number.isSafeInteger(n) ? n : null;
};
// "9, 4 7" → [9, 4, 7]; null when empty or when any item is not an integer.
const parseList = (text: string): number[] | null => {
  const nums = text.split(/[,\s]+/).filter((p) => p !== '').map(parseKey);
  return nums.length > 0 && nums.every((n) => n !== null) ? (nums as number[]) : null;
};

export function StructurePage<S, V extends StructureView>({ def }: { def: StructureDef<S, V> }) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [state, setState] = useState<S>(() => def.build(def.presets[0].keys));
  const [opId, setOpId] = useState(def.operations[0].id);
  const [keyText, setKeyText] = useState('');
  const [indexText, setIndexText] = useState('');
  const [arrayText, setArrayText] = useState(() => def.operations.find((o) => o.input === 'array')?.sample ?? '');
  const [steps, setSteps] = useState<StructureStep<V>[] | null>(null);
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
  const key = parseKey(keyText);
  const index = parseKey(indexText);
  const list = parseList(arrayText);
  // What the operation bar has parsed so far; null while any needed field is empty or invalid.
  const args: number[] | null =
    op.input === 'none' ? []
      : op.input === 'array' ? list
        : op.input === 'index-key' ? (index !== null && key !== null ? [index, key] : null)
          : key === null ? null : [key];

  const loadPreset = (i: number) => {
    setPresetIndex(i);
    setState(def.build(def.presets[i].keys));
    setErrors([]);
  };
  const run = () => {
    const e = def.validate(state, op.id, args!);
    setErrors(e);
    if (e.length > 0) return;
    setSteps(def.run(state, op.id, args!));
    setRunId((r) => r + 1);
  };
  const keep = () => {
    setState(def.keep(steps![steps!.length - 1].view));
    setSteps(null);
    focusRunRef.current = true;
  };
  const backToTree = () => {
    setSteps(null);
    focusRunRef.current = true;
  };
  const busy = steps !== null;

  return (
    <div className="algo-page">
      <header className="page-header">
        <a href="#/">← All topics</a>
        <h1>{def.title}</h1>
      </header>
      <div className="toolbar">
        <label>
          Preset
          <select value={presetIndex} disabled={busy} onChange={(e) => loadPreset(Number(e.target.value))}>
            {def.presets.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy} onClick={() => loadPreset(presetIndex)}>Reset to preset</button>
        <button type="button" disabled={busy} onClick={() => { setState(def.build([])); setErrors([]); }}>Clear</button>
        <label>
          Operation
          <select value={opId} disabled={busy} onChange={(e) => { setOpId(e.target.value); setErrors([]); }}>
            {def.operations.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        {op.input === 'array' && (
          <label>
            Array A
            <input
              className="array-input"
              value={arrayText}
              disabled={busy}
              aria-invalid={arrayText.trim() !== '' && list === null}
              onChange={(e) => setArrayText(e.target.value)}
            />
          </label>
        )}
        {op.input === 'index-key' && (
          <label>
            Index i
            <input
              className="key-input"
              value={indexText}
              inputMode="numeric"
              disabled={busy}
              aria-invalid={indexText.trim() !== '' && index === null}
              onChange={(e) => setIndexText(e.target.value)}
            />
          </label>
        )}
        {(op.input === 'key' || op.input === 'node' || op.input === 'index-key') && (
          <label>
            {op.input === 'index-key' ? 'New key k' : 'Key'}
            <input
              className="key-input"
              value={keyText}
              inputMode="numeric"
              disabled={busy}
              aria-invalid={keyText.trim() !== '' && key === null}
              onChange={(e) => setKeyText(e.target.value)}
            />
          </label>
        )}
        {steps === null ? (
          <button type="button" ref={runRef} className="primary" disabled={args === null} onClick={run}>Run</button>
        ) : (
          <button type="button" onClick={backToTree}>Back to the tree</button>
        )}
      </div>
      {errors.map((m) => <p key={m} role="alert" className="feedback bad">{m}</p>)}
      {steps === null ? (
        <div className="layout">
          <div className="main-col">
            <StructureCanvas
              view={def.view(state, op.input === 'node' ? key : null)}
              onNodeClick={op.input === 'node' && def.nodeKey
                ? (id) => { const k = def.nodeKey!(state, id); if (k !== null) setKeyText(String(k)); }
                : undefined}
            />
            {op.input === 'node' && <p className="muted hint">Click a node or type its key.</p>}
            {op.input === 'array' && <p className="muted hint">Build_Heap starts from this array, not from the heap shown.</p>}
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
          nodes={(s) => nodeOptions(s.view)}
          main={(s, pick) => <StructureCanvas view={s.view} onNodeClick={pick} />}
          below={(s) => <DSPanel ds={s.ds} />}
          side={(s) => <StatePanel columns={[]} vertices={[]} step={s} />}
          end={<button type="button" className="primary keep-result" onClick={keep}>Done: keep result</button>}
        />
      )}
    </div>
  );
}
