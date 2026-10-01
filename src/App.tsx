import { useEffect, useState } from 'react';
import { ALGORITHMS } from './algorithms/registry';
import { STRUCTURES } from './structures/registry';
import { AlgorithmPage } from './ui/AlgorithmPage';
import { Home } from './ui/Home';
import { StructurePage } from './ui/StructurePage';

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const id = useHash().replace(/^#\/?/, '');
  const def = ALGORITHMS.find((a) => a.id === id);
  if (def) return <AlgorithmPage key={def.id} def={def} />;
  const structure = STRUCTURES.find((s) => s.id === id);
  if (structure) return <StructurePage key={structure.id} def={structure} />;
  return <Home />;
}
