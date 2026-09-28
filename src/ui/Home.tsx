import { ALGORITHMS } from '../algorithms/registry';

export function Home() {
  return (
    <main className="home">
      <h1>DS&amp;Algs Visualizer</h1>
      <p>
        Step through the algorithms of Data Structures and Algorithms exactly as they appear in the lectures: same
        pseudocode, same line numbers. Pick an algorithm, start from a lecture example, and edit the graph if you want.
      </p>
      <ul className="algo-list">
        {ALGORITHMS.map((a) => (
          <li key={a.id}>
            <a href={`#/${a.id}`}>{a.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
