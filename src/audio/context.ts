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
