# Journal — Eduka Music

Newest entries first. Current state is in [`HANDOFF.md`](HANDOFF.md).

## 2026-11-24 (tarde) — publicada como v1.0.0

- **Publicada.** Repo público `MediaHub-Org/eduka-music`, AGPL-3.0, CI con
  typecheck + tests + e2e + deploy, y GitHub Pages en
  `https://mediahub-org.github.io/eduka-music/`. Revierte la decisión del mismo día
  de "sin remoto", que existía para evitar cuentas y sync, no para ocultar código.
- **Base `/eduka-music/`** en `vite.config.ts`, manifest, `index.html` y e2e: un
  solo artefacto para Pages y para local, así lo que se prueba es lo que se publica.
- **Servidor local propio** (`server/serve.mjs`, sin dependencias, loopback,
  `:4174`, misma ruta que Pages) con `npm start`, más
  `scripts/windows/install-local.ps1` / `uninstall-local.ps1` para arrancarlo al
  iniciar sesión. Antes dependía de `vite preview` y de una terminal.
- **AGPL**: `LICENSE`, `license` en `package.json` y, en Ajustes, versión,
  licencia y enlace al código fuente (la §13 pide ofrecerlo a quien usa la app por
  red). Nuevo test de UI.
- **Historial limpio.** `docs/reference/mapa-acordes-artifact.html` (prototipo del
  dueño) y `docs/superpowers/` (plan y spec) quedan fuera del repo y del
  historial: respaldo en `..\Eduka-music-pre-public.bundle` y reescritura con
  `git filter-repo`. Los goldens (`tests/golden/artifact.json`) siguen trackeados.
- **AdGuard rompe el offline.** AdGuard for Windows sustituye el `sw.js` instalado
  por su propio "content-script service worker v3.3.1": el precache de Workbox sí
  se crea, pero quien controla la página no es la app y la recarga offline falla
  de forma intermitente. Comprobado comparando el cuerpo servido por red (2.673 B,
  el real) con el que responde el SW bajo su control (15.100 B, AdGuard). El e2e
  de offline se salta solo cuando detecta esa sustitución, con el motivo escrito.
  Es la misma causa del fallo "ambiental" de `test:pwa` en RSS Reader.
- Verificado: typecheck OK; **2670 tests en 19 ficheros**; build OK (precache 27
  entradas / 518.54 KiB); e2e 6 pasan y 2 se saltan por AdGuard (sin él, 8/8).

## 2026-11-24

- **v1 closed.** All 13 plan tasks are implemented and committed; `main` closes
  v1 with these docs and cleanup commits on top of `f2f54d5`, while `feat/v1`
  remains at that v1 implementation tip. Added the agent docs (`AGENTS.md`,
  `HANDOFF.md`, this journal) and removed the SDD run's leftovers
  (`.superpowers/`, `test-results/`, `tsconfig.tsbuildinfo`, stray
  `pnpm-lock.yaml`). `dist/` and `node_modules/` were kept.
- Verified: typecheck OK; `npm test` 2664 tests in 19 files; `npm run build` OK
  (main JS 323.77 kB / gzip 103.05 kB; PWA precache 27 entries / 512.88 KiB);
  Playwright 8/8. The e2e run used a temporary config on `:4174` because the
  RSS Reader local server occupies `:4173` on this machine; the default
  `npm run e2e` therefore hit the wrong app on the first attempt.
- Owner decision: **no git remote**, no push and no CI. The project remains
  local only, with no backend, accounts, sync or telemetry.
- Pending: the owner's three manual PWA checks (install in Chrome/Edge,
  standalone window, cold start offline) and the audible practice checklist.
