# Eduka Music

PWA de práctica de acordes (Vite + React + TypeScript). Motor de teoría en TS puro (`src/engine`).

```
npm install
npm run dev        # desarrollo
npm run test       # vitest
npm run typecheck  # tsc
npm run build      # compilación y assets PWA
npm run e2e        # Playwright: mobile + desktop (build y preview incluidos)
```

En la primera ejecución de Playwright, instala Chromium con `npx playwright install chromium`.
Si ya tienes un Chromium compatible en otra ruta, puedes indicar
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. La PWA se puede instalar desde el icono
de instalación del navegador o desde su menú. El e2e confirma el precache del
app shell, su respuesta desde caché y navegación dentro de la app sin conexión;
la instalación standalone y el arranque en frío offline quedan para la prueba
manual en Chrome/Edge.
