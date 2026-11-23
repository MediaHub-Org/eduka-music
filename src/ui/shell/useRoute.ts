import { useCallback, useEffect, useState } from 'react'

export type Route = 'chords' | 'practice' | 'key' | 'mine'

export const ROUTE_HASH: Record<Route, string> = {
  chords: '#/acordes',
  practice: '#/practicar',
  key: '#/tonalidad',
  mine: '#/mis-cosas',
}

export function routeFromHash(hash: string): Route {
  const hit = (Object.keys(ROUTE_HASH) as Route[]).find((r) => ROUTE_HASH[r] === hash)
  return hit ?? 'chords'
}

/** Ruta en el hash, para que el botón atrás de Android funcione. */
export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash))
  useEffect(() => {
    const on = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', on)
    on()
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = useCallback((r: Route) => {
    if (window.location.hash !== ROUTE_HASH[r]) window.location.hash = ROUTE_HASH[r]
    setRoute(r)
  }, [])
  return [route, go]
}
