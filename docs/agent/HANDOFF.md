# Handoff — Eduka Music

Updated: 2026-11-24. History in [`JOURNAL.md`](JOURNAL.md), conventions in
[`AGENTS.md`](../../AGENTS.md).

## State

- **v1 complete and published as `v1.0.0`.** Source:
  <https://github.com/MediaHub-Org/eduka-music> (public, AGPL-3.0). App:
  <https://mediahub-org.github.io/eduka-music/>. CI runs typecheck, tests, e2e and
  the Pages deploy on every push to `main`.
- **One path everywhere:** the build lives under `/eduka-music/`, both on Pages and
  in local (`http://localhost:4174/eduka-music/`), so the tested artefact is the
  deployed one.
- **Local install is first class:** `server/serve.mjs` (zero dependencies,
  loopback only, port 4174) with `npm start`, plus
  `scripts/windows/install-local.ps1` / `uninstall-local.ps1` for a per-user login
  task. `npm run e2e` builds and serves through it, not through `vite preview`.
- **Docs stay local.** `docs/reference/mapa-acordes-artifact.html` (the owner's
  prototype) and `docs/superpowers/` (plan and spec) are ignored and were removed
  from the history; backup at `..\Eduka-music-pre-public.bundle`. The goldens in
  `tests/golden/artifact.json` remain tracked.
- Owner decision (2026-11-24) reversed the one-day "no remote" rule: the code may
  be public, but there is still no backend, account, cloud sync or telemetry.
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

Run on 2026-11-24 on this machine (v1.0.0):

- `npm run typecheck` — pass, exit 0.
- `npm test` — **2670 tests passed in 19 files**, 7.25 s.
- `npm run build` — pass; JS 327.74 kB (gzip 104.33 kB), CSS 48.18 kB
  (gzip 17.75 kB), PWA precache 27 entries / 518.54 KiB.
- `npm run e2e` — **6 passed, 2 skipped** locally: the offline test skips itself
  because AdGuard replaces the installed service worker (see below). Without that
  interference the suite is 8/8, and CI runs on a clean runner.
- Not verified automatically: the manual PWA checks below and audible
  metronome/chord timing in real time.

### AdGuard replaces the service worker

AdGuard for Windows rewrites the `sw.js` of any page it filters with its own
`content-script service worker v3.3.1`. The app's Workbox precache is still
created, but the worker in control is not ours, so an offline reload fails
intermittently. Proof on this machine: `/sw.js` served over the network is 2.673
bytes (the real Workbox worker) while the same URL fetched through the active
worker returns 15.100 bytes of AdGuard code. Pause the filtering or exclude
`localhost`/`github.io` before doing the offline check. This is also the cause of
the "environmental" `test:pwa` offline failure recorded in RSS Reader.

## Decisions

- **Public repo, AGPL-3.0-or-later** (owner, 2026-11-24). The licence link in
  Ajustes covers §13 (offer the source to network users).
- **Base `/eduka-music/` everywhere** instead of a custom domain: one build, one
  behaviour, no DNS dependency.
- **Local server instead of `vite preview`**: fixed port, correct MIME types, no
  cache for `sw.js`/`index.html`, and an installable origin at login.
- Error messages and UI copy go through `src/i18n/` as before; the settings footer
  is the only new copy.
- No Web Worker: the worst-case position search measured about 10 ms, well under
  the 150 ms budget.
- PWA updates must not lose saved data: the store only migrates by schema
  version.

## Next

Nothing is half-done or uncommitted. v1 is closed and deployed; v2 (chord
identification, scales on the neck, tuner, Tauri packaging) needs its own plan and
is out of scope here.

## Owner checks (manual)

1. **Install from Pages.** Open <https://mediahub-org.github.io/eduka-music/> in
   Chrome or Edge, use the install icon (or menu → "Install Eduka Music") and
   confirm the icon and name.
2. **Install locally.** `npm run build && npm start`, open
   `http://localhost:4174/eduka-music/`, install, then
   `pwsh -NoProfile -File scripts\windows\install-local.ps1 -StartNow` so it
   survives a reboot. Remember these are two separate installs with separate
   favourites and progressions.
3. **Standalone window.** Launch the installed app and confirm it opens in its own
   window without browser chrome (manifest `display: standalone`), with the bottom
   navigation clear of the safe areas on a phone-sized window.
4. **Cold start offline.** Close the installed app, disconnect the network (and,
   on this machine, pause AdGuard or exclude the origin), launch it again and
   confirm it opens at Acordes and that navigation, search and the saved
   favourites/progressions still work.
5. **Listening.** Two minutes at 60 and at 180 BPM: no drift, no lost clicks, and
   the chord lands on the accent.
