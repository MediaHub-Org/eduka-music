# Handoff — Eduka Music

Updated: 2026-11-24. History in [`JOURNAL.md`](JOURNAL.md), conventions in
[`AGENTS.md`](../../AGENTS.md).

## State

- **v1 is complete.** `main` carries these closure commits on top of `f2f54d5`
  ("docs: clarify offline PWA verification"); tasks 1–13 of the v1 plan are
  implemented and committed (`76c1fff` favourites, `97c8d8e` settings/PWA/e2e,
  `f2f54d5` README/offline note). `feat/v1` still points at `f2f54d5`, the v1
  implementation tip. The working tree is clean.
- **Local repository by owner decision (2026-11-24): there is no git remote and
  none is to be created.** Nothing is pushed; the history lives only on this
  machine.
- The SDD run's residuals were removed on 2026-11-24: `.superpowers/` (review
  diffs, task briefs/reports and visual screenshots), `test-results/`,
  `tsconfig.tsbuildinfo` and a stray `pnpm-lock.yaml`. `dist/` and
  `node_modules/` are kept (generated, ignored). `package-lock.json` stays the
  only lockfile.
- Scope delivered: pure-TS engine ported against artifact goldens, slash-bass
  positions for all six instruments, ES/EN chord parser, Web Audio synth and
  lookahead scheduler, persisted zustand store with import/export, SVG
  neck/chord-box/keyboard/circle diagrams, Acordes, Tonalidad, Practicar, Mis
  cosas and Ajustes screens, installable auto-update PWA.
- Known deferred minors (from the SDD ledger, none blocking): `midisOfFrets`
  duplicates `midisOf`; `chainVoicings` falls back to `allPositions[0]` when the
  first chord has no voicing; parser edge cases (`Fadd9`, `Ebm`, `sib7`, `B+`)
  are untested; `isNote` accepts one accidental only; some Neck/Circle
  accessibility and aria polish; keyboard-marks helper duplicated across
  screens; `outputLatency` not compensated; saved time signature/BPM survive a
  source switch in Practicar.

## Verification

Run on 2026-11-24 on this machine:

- `npm run typecheck` — pass, exit 0.
- `npm test` — **2664 tests passed in 19 files** (node + jsdom projects),
  7.80 s.
- `npm run build` — pass; `dist/assets/index-*.js` 323.77 kB (gzip 103.05 kB),
  CSS 46.71 kB (gzip 17.54 kB), PWA precache 27 entries / 512.88 KiB, built in
  283 ms.
- `npm run e2e` — **8/8 passed** (4 tests × mobile/desktop), but run on
  `127.0.0.1:4174` with a temporary config, not on the default port. Reason: the
  RSS Reader app server from another repo is listening on `:4173`; the first
  `npm run e2e` hit that app (6 failed, 2 passed) and proves nothing about Eduka.
  With `:4173` free, plain `npm run e2e` is the command. Do not stop the other
  project's server to free the port; use a temporary config on a free port
  instead. Chromium was already installed (Playwright 1.65.1).

Not verified automatically: the three manual PWA checks below, and audible
metronome/chord timing in real time (the owner's listening checklist from task
11 is still open).

## Decisions

- **No remoto** (owner, 2026-11-24): the project stays a local git repository;
  no GitHub, no push, no CI.
- Local only: no backend, accounts, sync or telemetry, and no runtime network
  requests. Fonts are bundled.
- Chord search and positions must match the artifact for chords without a slash
  bass; deviations are documented in [`../deviations.md`](../deviations.md).
  Notable ones: nullable `nearestPosition`/`chainVoicings` for impossible slash
  chords, piano changes include `drop` items, and the first launch shows the
  easiest position (`positionKey: null`) instead of the artifact's default.
- No Web Worker: the worst-case position search measured about 10 ms, well under
  the 150 ms budget.
- PWA updates must not lose saved data: the store only migrates by schema
  version.

## Post-v1 UX pass (2026-11-24)

- Theme setting (auto/light/dark, `settings.theme`) applied via `data-theme`, with a
  pre-paint script in `index.html`.
- `libraryVariants` capped at 4 (`MAX_VARIANTS`).
- Settings now only holds language, notation and theme. Instrument, capo and
  left-handed live in `InstrumentBar` on Acordes (instrument also in Practicar).
- Acordes is key-free by default; `settings.useKey` ("Usar tonalidad") shows the key
  strip, Siguiente/Atrás, the change panel, key suggestions and the `n`/`b` hotkeys.
  Picking a chord from Tonalidad turns it on.
- Acordes has no search box (root/bass/quality grid cover it; search stays in Practicar and Mis cosas). Instrument chips carry an icon and are ordered by how often each was chosen (`eduka-music-instrument-use` in localStorage, order frozen while the picker is mounted).
- Verified: typecheck, 2668 tests, build, e2e 8/8 (temporary port 4190).

## Next

Nothing is half-done or uncommitted. v1 is closed; v2 (chord identification,
scales on the neck, tuner, Tauri packaging) needs its own plan and is out of
scope here.

## Owner checks (manual)

1. **Install the PWA in Chrome or Edge.** Open the preview/production origin,
   use the install icon (or menu → "Install Eduka Music"), and confirm the icon
   and name appear. To serve the built app: `npm run build` then
   `npm run preview`.
2. **Standalone window.** Launch the installed app and confirm it opens in its
   own window without browser chrome (manifest `display: standalone`), with the
   bottom navigation clear of the safe areas on a phone-sized window.
3. **Cold start offline.** Close the installed app, disconnect the network,
   launch it again and confirm it opens at Acordes and that navigation, search
   and the saved favourites/progressions still work. The Playwright test covers
   precache plus navigation offline, not the installed cold start.
