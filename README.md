# DS&Algs Visualizer

Step-by-step visualizations of the Data Structures and Algorithms course algorithms, using the lecture pseudocode verbatim.

## Develop

    npm install
    npm run dev      # local site
    npm test         # unit tests
    npm run e2e      # browser tests (first run: npx playwright install chromium)

## Add an algorithm

1. Create `src/algorithms/<id>/` with `pseudocode.ts` (verbatim slide lines), `presets.ts`, `questions.ts`, `run.ts`, `index.ts` and `run.test.ts`. Use `src/algorithms/bfs/` as the reference.
2. `run.ts` emits one `Step` per executed pseudocode line, showing the state after that line.
3. Test final results against the lecture/tutorial solutions and call `assertValidTrace`.
4. Add the definition to `src/algorithms/registry.ts`.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages (Settings → Pages → Source: GitHub Actions).
