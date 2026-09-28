import { useState } from 'react';
import {
  addEdge, addVertex, canAddVertex, DEFAULT_WEIGHT, edgeKey, hasEdge, MAX_VERTICES, moveVertex,
  removeEdge, removeVertex, setWeight, type Edge, type Graph,
} from '../engine/graph';
import { GraphCanvas, type Point } from './GraphCanvas';

type Mode = 'select' | 'vertex' | 'edge';
type Props = { graph: Graph; weighted?: boolean; onChange(g: Graph): void };

function WeightField({ edge, onChange }: { edge: Edge; onChange(w: number): void }) {
  const [text, setText] = useState(String(edge.w ?? DEFAULT_WEIGHT));
  const parse = (t: string) => (t.trim() !== '' && Number.isFinite(Number(t)) ? Number(t) : null);
  return (
    <label className="weight-field">
      Weight w({edge.u}, {edge.v})
      <input
        value={text}
        aria-invalid={parse(text) === null}
        onChange={(e) => {
          setText(e.target.value);
          const w = parse(e.target.value);
          if (w !== null) onChange(w);
        }}
      />
    </label>
  );
}

export function GraphEditor({ graph, weighted, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('select');
  const [selected, setSelected] = useState<string | null>(null);
  const [edgeFrom, setEdgeFrom] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSelected(null);
    setEdgeFrom(null);
    setDragging(null);
    setMessage(null);
  };

  const onBackground = (p: Point) => {
    setMessage(null);
    if (mode === 'vertex') {
      if (!canAddVertex(graph)) {
        setMessage(`Graphs are limited to ${MAX_VERTICES} vertices so they stay readable.`);
        return;
      }
      onChange(addVertex(graph, Math.round(p.x), Math.round(p.y)));
    } else {
      setSelected(null);
      setEdgeFrom(null);
    }
  };

  const onVertex = (id: string) => {
    setMessage(null);
    if (mode === 'edge') {
      if (edgeFrom === null) {
        setEdgeFrom(id);
        return;
      }
      if (edgeFrom !== id) {
        if (hasEdge(graph, edgeFrom, id)) setMessage('That edge already exists.');
        else onChange(addEdge(graph, edgeFrom, id, weighted ? DEFAULT_WEIGHT : undefined));
      }
      setEdgeFrom(null);
    } else if (mode === 'select') {
      setSelected(id);
      setDragging(id);
    }
  };

  const onEdge = (key: string) => {
    if (mode === 'select') setSelected(key);
  };

  const deleteSelected = () => {
    if (selected === null) return;
    if (graph.vertices.some((v) => v.id === selected)) {
      onChange(removeVertex(graph, selected));
    } else {
      const e = graph.edges.find((x) => edgeKey(graph, x.u, x.v) === selected);
      if (e) onChange(removeEdge(graph, e.u, e.v));
    }
    setSelected(null);
  };

  const modeButton = (m: Mode, label: string) => (
    <button type="button" aria-pressed={mode === m} onClick={() => switchMode(m)}>{label}</button>
  );

  const selectedEdge = graph.edges.find((x) => edgeKey(graph, x.u, x.v) === selected);

  return (
    <div
      className="editor"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      }}
    >
      <div className="editor-toolbar">
        {modeButton('select', 'Select / move')}
        {modeButton('vertex', 'Add vertex')}
        {modeButton('edge', 'Add edge')}
        <button type="button" disabled={selected === null} onClick={deleteSelected}>Delete selected</button>
      </div>
      <p className="muted hint">
        {mode === 'select' && (weighted
          ? 'Drag vertices to move them. Click an edge to select it and change its weight.'
          : 'Drag vertices to move them. Click a vertex or edge to select it.')}
        {mode === 'vertex' && 'Click empty space to add a vertex.'}
        {mode === 'edge' && (edgeFrom
          ? `Now click the second endpoint (from ${edgeFrom}).`
          : weighted ? 'Click the first endpoint. New edges get weight 1.' : 'Click the first endpoint.')}
      </p>
      <GraphCanvas
        graph={graph}
        selected={selected}
        edgeFrom={edgeFrom}
        weighted={weighted}
        onBackgroundPointerDown={onBackground}
        onVertexPointerDown={onVertex}
        onEdgeClick={onEdge}
        onPointerMove={dragging ? (p) => onChange(moveVertex(graph, dragging, Math.round(p.x), Math.round(p.y))) : undefined}
        onPointerUp={() => setDragging(null)}
      />
      {weighted && selectedEdge && (
        <WeightField
          key={selected}
          edge={selectedEdge}
          onChange={(w) => onChange(setWeight(graph, selectedEdge.u, selectedEdge.v, w))}
        />
      )}
      {message && <p role="alert" className="feedback bad">{message}</p>}
    </div>
  );
}
