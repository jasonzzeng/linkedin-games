# Games Unlimited

Four puzzle games in the spirit of the LinkedIn dailies — except they never run
out. Everything is generated in the browser, so there is no daily limit, no
account, and no backend.

| Game | Route | What it is |
| --- | --- | --- |
| Tango | `/tango` | Fill a grid with suns and moons, balanced by row and column |
| Zip | `/zip` | Draw one unbroken path through every square, visiting numbers in order |
| Crossclimb | `/crossclimb` | Solve a word ladder, then reorder it one letter at a time |
| Mini Sudoku | `/sudoku` | 6×6 sudoku with 2×3 blocks |

This repository consolidates four separate repos (`tango-unlimited`,
`zip-unlimited`, `crossclimb-unlimited`, `mini-sudoku-unlimited`) into one app
with a shared design system.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Type-check only |
| `npm run check:puzzles` | Generate puzzles and assert they are solvable and unique |
| `npm run check:render` | Server-render every route to catch runtime errors |
| `npm run check` | All three of the above |
| `npm run preview:tango` | Render the Tango board to a standalone HTML file for a visual look |

`check:puzzles` is the one worth running after touching a generator. It asserts
that Tango boards are solvable from their given clues, that Zip's stored path is
legal move-by-move under the game's own validator, that every Mini Sudoku puzzle
has **exactly one** solution, and that every Crossclimb ladder really does step
one letter at a time.

## How it is put together

```
src/
  lib/          Game registry, timer, persistence, cell sizing, theme
  shared/       GameShell, Button, Select, Modal, Toast, HelpPanel, WinDialog
  pages/        The hub and its board thumbnails
  games/
    tango/      logic/ is pure and headless; the rest is presentation
    zip/        utils/
    crossclimb/ game/ + data/ (hand-written puzzle bank)
    sudoku/     lib/
```

Each game is a lazily-loaded route, so opening Tango does not download
Crossclimb's drag-and-drop library.

**Design tokens** live in `src/index.css` as CSS custom properties and are
exposed to Tailwind through `@theme inline`. Every colour, radius and shadow in
the app resolves through them, and each game supplies only an accent —
`GameShell` sets `--accent` from the registry, so one line repaints a whole
game. Light and dark are both defined, following the system by default with a
manual override in the header.

**Adding a game** means adding an entry to `src/lib/games.ts`, a folder under
`src/games/`, and a route in `src/App.tsx`. Everything else — header, timer,
help panel, win dialog, best times, theming — comes from `shared/`.

## Notes on the port

The four original repos were generated with AI tooling and carried some
scaffolding that is cleaned up here:

- Empty `index.tsx` files and duplicate `<script>` mounts in `index.html`.
- `<link rel="stylesheet" href="/index.css">` pointing at a file that did not
  exist, 404ing on every load.
- Leftover `importmap` blocks pinning React 19 / Vite 7 from a CDN while
  `package.json` pinned React 18.
- Mini Sudoku's win modal was written in Tailwind classes in a project with no
  Tailwind, so it rendered unstyled.
- Mini Sudoku's generator removed clues without checking that one solution
  remained: **80% of Hard puzzles had more than one answer.** It now verifies
  uniqueness after each removal.
- Tango's `solveGrid` ran a full throwaway backtracking solve on every generate
  and discarded the result.
- Zip only handled mouse events; it now uses pointer events, so dragging works
  on touch devices.
- `validateWord` always returned `true` while carrying an unused word list.
- Tango's board was restyled after the real game: one continuous grid with
  hairline dividers rather than separated tiles, a plain ringed disc for the sun
  instead of a rayed one, and constraint marks that interrupt the divider rather
  than sitting in a badge on top of it.
- Tango scattered constraint marks at random without checking any were needed,
  leaving a 6x6 Easy board carrying ~25 marks against roughly ten in the real
  game. Givens and marks are now budgeted separately and every clue has to earn
  its place, giving 12 givens / 8 marks on Easy and 5 / 10 on Hard.

## Credits

Unofficial fan-made puzzles, not affiliated with or endorsed by LinkedIn.
Puzzles are generated locally in your browser — nothing you play is sent
anywhere, and your best times are stored only on your own device.
