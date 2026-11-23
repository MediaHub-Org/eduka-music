import { useEffect } from 'react'

interface Sentinel {
  release(): Promise<void> | void
}
interface WakeLockApi {
  request(type: 'screen'): Promise<Sentinel>
}

const releaseQuietly = (s: Sentinel | null): void => {
  if (!s) return
  try {
    void Promise.resolve(s.release()).catch(() => {})
  } catch {
    /* ya liberado */
  }
}

/**
 * Mantiene la pantalla encendida mientras `active`. El navegador suelta el bloqueo al ocultar
 * la pestaña, así que se vuelve a pedir al volver a `visible`. Sin la API no hace nada.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return
    const api = (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock
    if (!api || typeof api.request !== 'function') return
    let alive = true
    let held: Sentinel | null = null

    const request = () => {
      let p: Promise<Sentinel>
      try {
        p = api.request('screen')
      } catch {
        return
      }
      void Promise.resolve(p)
        .then((s) => {
          if (!alive) return releaseQuietly(s)
          releaseQuietly(held)
          held = s
        })
        .catch(() => {
          /* denegado (batería baja, pestaña oculta…): se reintenta al volver a visible */
        })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }

    request()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisibility)
      releaseQuietly(held)
      held = null
    }
  }, [active])
}
