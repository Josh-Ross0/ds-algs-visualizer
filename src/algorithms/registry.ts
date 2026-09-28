import { bellmanFord } from './bellman-ford';
import { bfs } from './bfs';
import { dfs } from './dfs';
import { dijkstra } from './dijkstra';
import type { AlgorithmDef } from './types';

export const ALGORITHMS: AlgorithmDef[] = [bfs, dfs, bellmanFord, dijkstra];
