#!/usr/bin/env node
/**
 * Servidor estático de la PWA compilada.
 *
 * Eduka Music no tiene backend: esto solo le da a `dist/` un origen http de
 * loopback, que es lo que el navegador exige para registrar el service worker e
 * instalar la app. Sirve la misma ruta que GitHub Pages (`/eduka-music/`), así
 * que lo que se prueba en local es lo que se despliega.
 *
 *   npm start        ->  http://localhost:4174/eduka-music/
 *
 * Variables: PORT (4174), HOST (127.0.0.1). Solo escucha en loopback.
 */
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = path.join(REPO, 'dist')
const BASE = '/eduka-music/'
const PORT = Number.parseInt(process.env.PORT ?? '4174', 10)
const HOST = process.env.HOST ?? '127.0.0.1'

const TYPES = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}))

if (!safeStat(path.join(DIST, 'index.html'))) {
  console.error(`No hay build en ${DIST}. Ejecuta "npm run build" primero.`)
  process.exit(1)
}

function safeStat(file) {
  try {
    return statSync(file)
  } catch {
    return null
  }
}

/** El service worker y el manifest no se cachean; los assets llevan hash en el nombre. */
function cacheControl(relative) {
  if (relative.startsWith('assets/')) return 'public, max-age=31536000, immutable'
  return 'no-cache'
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

function resolveFile(pathname) {
  let relative = decodeURIComponent(pathname.slice(BASE.length))
  if (relative === '' || relative.endsWith('/')) relative += 'index.html'
  const file = path.resolve(DIST, relative)
  // Nada fuera de dist/.
  if (file !== DIST && !file.startsWith(DIST + path.sep)) return null
  return { file, relative }
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed')
    return
  }

  let pathname
  try {
    pathname = new URL(req.url ?? '/', 'http://localhost').pathname
  } catch {
    send(res, 400, 'Bad request')
    return
  }

  // Un origen, una ruta: la de Pages. Atajos para no acabar en un 404 confuso.
  if (pathname === '/' || pathname === '') {
    res.writeHead(302, { Location: BASE })
    res.end()
    return
  }
  if (pathname === BASE.slice(0, -1)) {
    res.writeHead(301, { Location: BASE })
    res.end()
    return
  }
  if (!pathname.startsWith(BASE)) {
    send(res, 404, `Esta app vive en ${BASE} -> http://${HOST}:${PORT}${BASE}\n`)
    return
  }

  const target = resolveFile(pathname)
  if (!target) {
    send(res, 400, 'Bad path')
    return
  }

  const stat = safeStat(target.file)
  const isFile = Boolean(stat?.isFile())
  // Ruta desconocida sin extensión: la app enruta por hash, así que devuelve el
  // shell y deja que React decida.
  const file = isFile ? target.file : path.join(DIST, 'index.html')
  const relative = isFile ? target.relative : 'index.html'
  const info = isFile ? stat : safeStat(file)
  if (!info) {
    send(res, 500, 'index.html missing from dist/')
    return
  }

  const etag = `W/"${info.size}-${Math.trunc(info.mtimeMs)}"`
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag })
    res.end()
    return
  }

  const ext = path.extname(file).toLowerCase()
  const headers = {
    'Content-Type': TYPES.get(ext) ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': cacheControl(relative),
    'ETag': etag,
    'X-Content-Type-Options': 'nosniff',
  }
  res.writeHead(200, headers)
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(file).on('error', () => res.destroy()).pipe(res)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Cierra lo que lo ocupa o usa PORT=<otro> npm start.`)
    process.exit(1)
  }
  console.error(error)
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`Eduka Music -> http://localhost:${PORT}${BASE}`)
  console.log(`  sirviendo ${DIST}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
