import { bfs } from '../algorithms/bfs';
import { ALGORITHMS } from '../algorithms/registry';
import { STRUCTURES } from '../structures/registry';

// A real excerpt of BFS's main procedure, shown with the current-line highlight.
const sample = bfs.procs[0];
const EXCERPT_FROM = 2;
const EXCERPT_TO = 5;
const EXCERPT_CURRENT = 3;

export function Home() {
  return (
    <main className="home">
      <div className="home-intro">
        <h1>DS&amp;Algs Visualizer</h1>
        <p className="lede">
          Replay the graph algorithms and tree data structures of Data Structures and Algorithms (094224) one line at a
          time, with the same pseudocode and line numbers as the lecture slides.
        </p>
        <p>
          Start from a lecture example or draw your own graph, then press Run. At every step you see the current line,
          the table of values and the queue, call stack, edge list, array A or set Q. Predict mode pauses before key steps
          and asks you what happens next.
        </p>
        <h2 className="list-title">Graph algorithms</h2>
        <ul className="algo-list">
          {ALGORITHMS.map((a) => (
            <li key={a.id}>
              <a href={`#/${a.id}`}>
                <span className="algo-title">{a.title}</span>
                <code className="algo-sig">{a.procs[0].signature}</code>
              </a>
            </li>
          ))}
        </ul>
        <h2 className="list-title">Tree structures</h2>
        <ul className="algo-list">
          {STRUCTURES.map((s) => (
            <li key={s.id}>
              <a href={`#/${s.id}`}>
                <span className="algo-title">{s.title}</span>
                <code className="algo-sig">{s.procs[0].signature}</code>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <figure className="excerpt">
        <div className="panel pseudocode">
          <p className="excerpt-sig">{sample.signature}</p>
          <ol>
            {sample.lines.slice(EXCERPT_FROM - 1, EXCERPT_TO).map((text, i) => (
              <li key={i} className={EXCERPT_FROM + i === EXCERPT_CURRENT ? 'current' : undefined}>
                <span className="ln">{EXCERPT_FROM + i}:</span>
                <code>{text}</code>
              </li>
            ))}
          </ol>
        </div>
        <figcaption>The highlighted line is where the algorithm is now.</figcaption>
      </figure>
    </main>
  );
}
