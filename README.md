# Eduka Music

PWA de práctica de acordes (Vite + React + TypeScript). Motor de teoría en TS puro (`src/engine`).

**App:** <https://mediahub-org.github.io/eduka-music/>
**Código:** <https://github.com/MediaHub-Org/eduka-music> · licencia [AGPL-3.0](LICENSE)

## Uso local

```
npm install
npm run dev        # desarrollo (http://localhost:5173/eduka-music/)
npm run build      # compilación y assets PWA en dist/
npm start          # sirve dist/ en http://localhost:4174/eduka-music/
npm run test       # vitest
npm run typecheck  # tsc
npm run e2e        # Playwright: mobile + desktop (build y server incluidos)
```

`npm start` usa `server/serve.mjs`: un servidor estático sin dependencias que
escucha solo en loopback. Hace falta un origen `http` porque el navegador no
registra un service worker desde `file://`; la app en sí no tiene backend. Sirve
la misma ruta que GitHub Pages (`/eduka-music/`) para que lo que se prueba en
local sea lo que se despliega.

Para que el servidor arranque solo al iniciar sesión:

```
pwsh -NoProfile -File scripts\windows\install-local.ps1 -StartNow
pwsh -NoProfile -File scripts\windows\uninstall-local.ps1
```

En la primera ejecución de Playwright, instala Chromium con `npx playwright install chromium`.
Si ya tienes un Chromium compatible en otra ruta, puedes indicar
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Instalación

La PWA se instala desde el icono de instalación del navegador o desde su menú,
en la URL de Pages o en la local (son dos orígenes distintos: cada uno guarda sus
propios favoritos y progresiones). El e2e confirma el precache del app shell, su
respuesta desde caché y navegación dentro de la app sin conexión; la instalación
standalone y el arranque en frío offline quedan para la prueba manual en
Chrome/Edge.

> Si el test de offline se salta, hay un bloqueador (por ejemplo AdGuard) que
> sustituye el `sw.js` instalado por su propio service worker. Pausa el filtrado
> o excluye el origen; sin eso, ninguna PWA funciona offline en ese navegador.
