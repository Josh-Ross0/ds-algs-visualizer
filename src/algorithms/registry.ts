import { bellmanFord } from './bellman-ford';
import { bfs } from './bfs';
import { dfs } from './dfs';
import { dijkstra } from './dijkstra';
import { kruskal } from './kruskal';
import { prim } from './prim';
import type { AlgorithmDef } from './types';

export const ALGORITHMS: AlgorithmDef[] = [bfs, dfs, bellmanFord, dijkstra, prim, kruskal];
