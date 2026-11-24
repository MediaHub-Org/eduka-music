# Agent notes for Eduka Music

Local-first PWA for chord practice: six instruments (guitar, piano, ukulele,
Venezuelan cuatro, timple, bandurria), chord search, key explorer, voice-led
changes, metronome practice and saved favourites/progressions. Vite + React +
TypeScript. There is no account, backend, sync or telemetry, and no runtime
network request: settings, favourites and progressions live in `localStorage`
under `eduka-music` (schema version 1). After the first load it works offline and
can be installed from Chrome/Edge.

## Commands

- `npm install` — `package-lock.json` is the lockfile; do not add another one.
- `npm run dev` — Vite dev server at `http://localhost:5173/eduka-music/`.
- `npm test` — Vitest (node project for `src/engine`, jsdom for state/UI).
- `npm run typecheck` — `tsc -b --noEmit`.
- `npm run build` — typecheck, production build and PWA service worker in `dist/`.
- `npm start` — serves `dist/` on `http://localhost:4174/eduka-music/` with
  `server/serve.mjs` (zero dependencies, loopback only). This is the installed
  app's origin; `scripts/windows/install-local.ps1` starts it at login.
- `npm run e2e` — Playwright, four smoke tests × mobile (Pixel 7) and desktop.
  It runs `npm run build && npm start` and expects `127.0.0.1:4174` free. First
  run needs `npx playwright install chromium`, or set
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a full Chromium (the headless shell
  cannot test offline service-worker navigation).

## Conventions

- `src/engine/` is pure TypeScript: no React, DOM, Web Audio, store or UI imports.
  Theory, spelling, position search, voice leading, the search parser and the
  practice timeline live there and are tested without jsdom.
- Every user-visible string goes through `src/i18n/` (Spanish is the default,
  English is the second locale). Add both sides; composed sentences belong in
  `text.ts`. Do not inline UI copy.
- `tests/golden/artifact.json` is extracted from
  `docs/reference/mapa-acordes-artifact.html`, which is **local only** (ignored by
  git, the owner's own prototype): regenerating the goldens needs that copy on
  disk. Chords without a slash bass must keep the artifact's positions and order.
  Any intentional difference goes in `docs/deviations.md`.
- Rhythm is scheduled against the Web Audio clock (`src/audio/scheduler.ts`);
  never move timing to `setInterval`. Diagrams are React SVG components driven by
  engine data.
- State is zustand with `persist`. Changing the stored shape means bumping the
  schema version and adding a migration. Stored data and import files are
  untrusted: validate, and fall back to defaults instead of throwing.
- Behaviour changes need a test; flow-level UI changes should extend
  `tests/e2e/smoke.spec.ts`.
- Commits are one line, imperative, lowercase after the type (`feat: ...`,
  `fix: ...`, `docs: ...`, `chore: ...`).
- `dist/`, `node_modules/`, `test-results/`, `.superpowers/` and `*.tsbuildinfo`
  are generated or disposable, never edit them by hand.

## State and constraints

- v1 is complete (plan tasks 1–13). Current state, exact checks and the next step
  live in [`docs/agent/HANDOFF.md`](docs/agent/HANDOFF.md); append history to
  [`docs/agent/JOURNAL.md`](docs/agent/JOURNAL.md), newest entry first.
- **Published on GitHub** (owner decision, 2026-11-24, reversing the one-day
  "no remote" rule): source at
  [`MediaHub-Org/eduka-music`](https://github.com/MediaHub-Org/eduka-music), AGPL-3.0,
  deployed to Pages at `https://mediahub-org.github.io/eduka-music/`. Work on
  `main`; CI runs typecheck, tests, e2e and the deploy on every push. `docs/reference/`
  and `docs/superpowers/` stay out of the repository and out of its history.
- The app lives under the `/eduka-music/` base in both Pages and local, so the same
  build is what gets tested and deployed. Do not hardcode `/` paths.
- No backend, accounts, cloud sync or telemetry; no third-party requests at
  runtime. Manrope is bundled locally. The repo is public, so nothing secret and
  no personal data goes in a commit.
- PWA installation, the standalone window and a cold-start offline launch are
  manual checks in Chrome/Edge; Playwright only proves precache and navigation
  while offline. AdGuard for Windows replaces the installed `sw.js` with its own
  service worker, which breaks the offline test locally; the test skips itself
  when it detects that.
- Artifact parity for chords without a bass is a hard constraint. Position search
  is brute force but cached; the measured worst case is far below the 150 ms
  budget, so there is no Web Worker.
