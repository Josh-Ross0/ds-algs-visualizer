# Visual design: DS&Algs Visualizer

Subject: a study tool for Technion 094224 Data Structures and Algorithms. Students replay BFS and DFS exactly as on the lecture slides, usually alone, on a laptop the night before a tutorial or an exam, sometimes on a phone.

Primary job: make "where am I in the algorithm" readable at a glance. The current pseudocode line, the vertex colors, the per-vertex table and the queue or call stack have to read as one picture.

## Direction: the revision desk

The world this lives in is a lecture hall whiteboard and a student's revision notes: squared engineering paper, a blue whiteboard marker, and one fluorescent yellow highlighter. The highlighter is the one loud thing on the site, and it is spent on exactly one job: marking the line the algorithm is executing. Everything else is marker ink on paper, quiet and ruled. In dark mode the whiteboard becomes a chalkboard.

## Tokens

### Color, light (whiteboard)

| Name | Hex | Role |
| --- | --- | --- |
| room | `#eef1f4` | page background, the cool grey of a lecture hall wall |
| paper | `#ffffff` | the pseudocode sheet, graph paper, inputs |
| ink | `#16202c` | text; blue-black like a dried marker |
| marker | `#1f4fb5` | links, primary button, focus, tree edges, active vertex ring |
| highlighter | `#ffe14d` | the current pseudocode line and nothing else |
| red pen | `#c0322b` | selection in the editor, wrong answers |

Support: `muted #4f5b68` (AA on room and paper), `rule #c9d0d8`, `grid #e3e9f2` (graph paper lines), `good #1d7a44`.

### Color, dark (chalkboard)

| Name | Hex | Role |
| --- | --- | --- |
| room | `#141a18` | page background |
| slate | `#1c2622` | chalkboard: graph canvas and pseudocode sheet |
| chalk | `#e6ebe6` | text |
| marker | `#8fb3ff` | links, focus, tree edges, active ring |
| highlighter | `#ffe14d` | unchanged: a highlighter looks the same on any page |
| red pen | `#ff8a80` | selection, wrong answers |

### Vertex states (the lecture's definitions; identical in both modes)

- white: fill `#ffffff`, ink stroke. On the chalkboard the stroke is chalk.
- gray: fill `#9e9e9e`, black label.
- black: fill `#000000`, white label. In dark mode it also gets a chalk ring so it never merges into the slate.
- no state yet (editor, before initialization): marker-tinted fill with a dashed marker stroke. It can never be confused with white because it is neither solid nor white.

### Type

One superfamily, chosen for the audience: **Atkinson Hyperlegible Next** for text and **Atkinson Hyperlegible Mono** for pseudocode, `G.Adj[u]` lists, chips and the variables line. It was designed for low-vision legibility, which is what tired eyes at 1 a.m. need, and it keeps `1 l I`, `0 O` and `v1 vl` distinct, which matters when vertices are called `v1` to `v8`. Fallbacks: `system-ui` and `ui-monospace, Menlo, Consolas`.

Scale (ratio 1.25 from 16px): 13 / 14 / 16 / 20 / 25 / 31 / 39.
- 39 / 800: home title.
- 31 / 800: algorithm page title (25 on phones).
- 16 / 700: panel headings and pseudocode signatures (set in the mono, because they are code).
- 16: body. 15 mono: pseudocode, line-height 1.75 so the highlighter band has room.
- 13: hints, orientation labels.

Sentence case everywhere. No all-caps labels, no eyebrows.

## Layout

### Home, desktop

```
 ┌───────────────────────────────────────────────────────────────┐
 │ DS&Algs Visualizer                     ┌───────────────────┐   │
 │ Replay the course's graph algorithms   │ BFS(G, s)         │   │
 │ with the lecture's pseudocode...       │ 2: while Q ≠ ∅ do │   │
 │                                        │█3:  u = Dequeue(Q)█│   │
 │ Breadth-First Search (BFS)  BFS(G, s)  │ 4:  for all v ... │   │
 │ ───────────────────────────────────    └───────────────────┘   │
 │ Depth-First Search (DFS)    DFS(G)       caption: the yellow   │
 │ ───────────────────────────────────      line is where you are │
 └───────────────────────────────────────────────────────────────┘
```

Left aligned. Copy on the left (max 60ch), a real excerpt of the BFS pseudocode on the right, taken from the registry, with one line highlighted: it shows what the tool does before the student clicks anything. The algorithm list is a ruled index, each row the title and the procedure signature, the whole row a link.

### Home, phone

```
 ┌─────────────────────┐
 │ DS&Algs Visualizer  │
 │ copy                │
 │ BFS ............... │
 │ DFS ............... │
 │ ┌─────────────────┐ │
 │ │ excerpt         │ │
 │ └─────────────────┘ │
 └─────────────────────┘
```

### Algorithm page, desktop

```
 ← All algorithms
 Depth-First Search (DFS)
 [Preset ▾] [Directed ☐] [Run]                    toolbar, ruled below
 ┌──────────── graph paper ──────────┐  ┌── pseudocode sheet ──┐
 │   (v1)────(v2)                    │  │ DFS(G)               │
 │    │  ╲                           │  │ █5: DFS_Visit(G, u) █│
 │   (v4)    (v3)                    │  └──────────────────────┘
 └───────────────────────────────────┘   u = v1   time = 3
 ┃ Predict: which vertex ...?  [v1][v2]   v | color | d | f | π
 ⏮ ⏪ ◀ ▶ ⏵ ⏩ ⏭   ───●────────          ruled table
 Step 12 / 40   Speed [Normal ▾]         G.Adj[v1]: v2 v4
 Call stack (bottom → top)               Questions ☑ Predict mode
 [DFS(G)][DFS_Visit(G, v1)][...]
```

Graph and controls on the left (3fr), the "where am I" column on the right (2fr): the pseudocode sheet on top, then the table, adjacency lists and settings. The queue or stack sits under the controls as a row of array cells, like on the slides: a queue is open at both ends, a stack has a closed floor on its left (bottom).

### Algorithm page, phone

Single column, in DOM order: toolbar wraps, graph, question, controls, data structure, pseudocode, table, adjacency, settings. Tables and pseudocode scroll inside their own box, never the page.

## Principles

1. **One highlighter.** Fluorescent yellow means "the algorithm is here" and appears nowhere else on the site, so the eye goes straight to it. The highlighted line is bold, with a marker-swipe shape that runs past the text a little.
2. **Colors are data.** White, gray and black belong to the lecture. Nothing else in the UI uses pure grey fills or black fills, so a grey or black blob on the canvas is always a vertex state.
3. **Paper, not cards.** Surfaces encode hierarchy: the pseudocode is a sheet of paper with a firm edge (the thing you read), the graph is squared paper, and the rest (table, adjacency, settings) sits directly on the page, separated by rules. No shadows, no gradients.
4. **Marker ink.** Marker blue has two meanings, not one: everything clickable is marker blue, and so are tree edges — not because they're clickable, but because they're the structure the algorithm builds. The two never appear in the same place, so the ambiguity doesn't cost the reader anything in practice.
5. **Motion answers the student.** Vertex fills ease between colors when stepping, so a change of state is noticed. Nothing moves on its own. `prefers-reduced-motion` turns this off.

## Review against the brief

First pass, before this revision: cool grey background, blue accent, Inter and JetBrains Mono, every panel a white rounded card with a soft shadow, current line in pale blue with a blue outline. Working the same prompt for any "algorithm visualizer" lands exactly there, so it was the default, not a choice. Revised:

- **Current line**: pale accent tint became a fluorescent highlighter reserved for that single purpose. The brief's primary job is "where am I", so the boldness goes there rather than into the header or the home hero.
- **Panels**: the uniform card kit became three kinds of surface (sheet, squared paper, bare page with rules), so the surface itself says which panel is the reference text.
- **Typefaces**: Inter and JetBrains Mono were reached for by reflex. Atkinson Hyperlegible Next and Mono are chosen for this audience (tired readers, `v1` vs `vl`), and as one superfamily they keep text and code related.
- **Dark mode**: a generic near-black with the same blue became a chalkboard, which is where this material is actually taught, and it keeps black vertices distinguishable (black on slate, with a chalk ring) instead of black on near-black.
- **Unstated vertex**: the old unstated vertex was a panel-grey fill, dangerously close to the lecture's gray. It is now a dashed marker-tinted circle.
- **Home**: a list of links under a paragraph became the paragraph, a ruled index of algorithms with their signatures, and a real excerpt of the BFS pseudocode with the highlighter on it, so the home page teaches the one convention the site relies on.
- Dropped an idea to mark the active vertex in highlighter yellow too: yellow strokes fail contrast on white paper, and it would dilute principle 1.

## Critique log

Screenshots: home, `#/bfs` in edit mode, `#/bfs` and `#/dfs` mid-run with a question open, at 1280×800 and 375×800, light and dark.

**Round 1.**
- The player's `⏪` and `⏩` rendered as colour emoji tiles, out of place next to the other glyphs. Added U+FE0E (text presentation) to every player glyph; labels and `aria-label`s are unchanged.
- At 375px the seven player buttons wrapped to two rows, leaving `⏭` alone. They now shrink to share one row.
- At 375px the longer pseudocode lines ran past the sheet (it scrolled inside its own box, but `then` was hidden). Pseudocode drops to 13px with tighter sheet padding on phones; the home excerpt follows.
- Home phone: the BFS signature wrapped under its title while DFS stayed on one line. Rows now stack title over signature on phones.
- Home desktop: the content floated in the vertical middle of a tall empty page. It now sits at 12vh from the top.
- An active vertex ring looked navy instead of marker blue: the screenshot caught the fill/stroke transition mid-way. Not a defect (the screenshot script now emulates reduced motion), but it confirmed the transition is short enough to read as a response rather than decoration.
- Checked and kept: white, gray and black read unmistakably on both the squared paper and the chalkboard (black gets its chalk ring in dark mode); the dashed unstated vertices in the editor are clearly not white; the highlighted line is the strongest thing on every page, in both modes.

**Round 2.** Player buttons still wrapped (flex items wrap before they shrink). Turned wrapping off for that row.

**Round 3.** No further changes. Accepted: vertex labels are small on phones because the whole SVG scales down (behavior unchanged from before), and the left column has space under the queue on desktop while the right column runs longer.
