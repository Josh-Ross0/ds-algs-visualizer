import { compareLabels, type Edge } from '../../engine/graph';

// The vertices on the path from u to v in the forest T (unique, since T has no cycle), or null.
export function forestPath(T: Edge[], u: string, v: string): string[] | null {
  const prev = new Map<string, string | null>([[u, null]]);
  const queue = [u];
  while (queue.length > 0) {
    const x = queue.shift()!;
    if (x === v) break;
    const next = T.flatMap((e) => (e.u === x ? [e.v] : e.v === x ? [e.u] : [])).sort(compareLabels);
    for (const y of next) {
      if (!prev.has(y)) {
        prev.set(y, x);
        queue.push(y);
      }
    }
  }
  if (!prev.has(v)) return null;
  const path: string[] = [];
  for (let x: string | null = v; x !== null; x = prev.get(x)!) path.unshift(x);
  return path;
}
