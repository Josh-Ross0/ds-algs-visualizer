import { useState } from 'react';
import {
  addEdge, addVertex, canAddVertex, edgeKey, hasEdge, MAX_VERTICES, moveVertex,
  removeEdge, removeVertex, type Graph,
} from '../engine/graph';
import { GraphCanvas, type Point } from './GraphCanvas';

type Mode = 'select' | 'vertex' | 'edge';
type Props = { graph: Graph; onChange(g: Graph): void };

export function GraphEditor({ graph, onChange }: Props) {
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
        else onChange(addEdge(graph, edgeFrom, id));
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

  return (
    <div
      className="editor"
      tabIndex={0}
      onKeyDown={(e) => {
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
        {mode === 'select' && 'Drag vertices to move them. Click a vertex or edge to select it.'}
        {mode === 'vertex' && 'Click empty space to add a vertex.'}
        {mode === 'edge' && (edgeFrom ? `Now click the second endpoint (from ${edgeFrom}).` : 'Click the first endpoint.')}
      </p>
      <GraphCanvas
        graph={graph}
        selected={selected}
        edgeFrom={edgeFrom}
        onBackgroundPointerDown={onBackground}
        onVertexPointerDown={onVertex}
        onEdgeClick={onEdge}
        onPointerMove={dragging ? (p) => onChange(moveVertex(graph, dragging, Math.round(p.x), Math.round(p.y))) : undefined}
        onPointerUp={() => setDragging(null)}
      />
      {message && <p role="alert" className="feedback bad">{message}</p>}
    </div>
  );
}
