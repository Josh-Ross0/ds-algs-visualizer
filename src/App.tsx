import { useEffect, useState } from 'react';
import { ALGORITHMS } from './algorithms/registry';
import { AlgorithmPage } from './ui/AlgorithmPage';
import { Home } from './ui/Home';

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
  return def ? <AlgorithmPage key={def.id} def={def} /> : <Home />;
}
