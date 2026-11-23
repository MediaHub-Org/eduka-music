let ctx: AudioContext | null = null
let gestureHooked = false

/** Crea el AudioContext de forma perezosa (seguro de importar en node). */
export function getAudioContext(): AudioContext {
  if (!ctx) {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  if (!gestureHooked && typeof document !== 'undefined') {
    gestureHooked = true
    const resume = () => {
      if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
    }
    for (const ev of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, resume, { passive: true })
  }
  return ctx
}

let master: GainNode | null = null

/** Salida común de todo el sintetizador: permite callar de golpe lo ya programado. */
export function getMasterGain(): GainNode {
  const c = getAudioContext()
  if (!master) {
    master = c.createGain()
    master.gain.value = 1
    master.connect(c.destination)
  }
  return master
}

/**
 * Silencia ya todo lo sonando o programado: la salida actual baja a 0 en ~30 ms y se
 * desconecta; lo siguiente que suene usa una salida nueva a volumen 1.
 */
export function silenceAll(fadeSec = 0.03): void {
  const old = master
  master = null
  if (!old || !ctx) return
  try {
    const t = ctx.currentTime
    old.gain.cancelScheduledValues?.(t)
    old.gain.setValueAtTime?.(old.gain.value, t)
    old.gain.linearRampToValueAtTime?.(0, t + fadeSec)
    setTimeout(() => {
      try {
        old.disconnect?.()
      } catch {
        /* ya desconectada */
      }
    }, Math.ceil(fadeSec * 1000) + 20)
  } catch {
    /* sin audio */
  }
}
