import { midisOf } from '../engine/positions'
import type { Position } from '../engine/positions'
import { INSTRUMENTS } from '../engine/instruments'
import type { InstrumentId } from '../engine/instruments'
import { getAudioContext, getMasterGain, silenceAll } from './context'

const ksCache = new Map<string, AudioBuffer>()

/** Karplus-Strong (portado del artifact): cuerda pulsada de 1,8 s. */
function ks(ctx: AudioContext, m: number): AudioBuffer {
  const key = `${ctx.sampleRate}:${m}`
  const hit = ksCache.get(key)
  if (hit) return hit
  const sr = ctx.sampleRate
  const f = 440 * 2 ** ((m - 69) / 12)
  const N = Math.max(2, Math.round(sr / f))
  const len = Math.floor(sr * 1.8)
  const buf = ctx.createBuffer(1, len, sr)
  const d = buf.getChannelData(0)
  let p = 0
  for (let i = 0; i < N; i++) {
    p = p * 0.5 + (Math.random() * 2 - 1) * 0.5
    d[i] = p
  }
  for (let i = N; i < len; i++) d[i] = 0.996 * 0.5 * (d[i - N] + d[i - N + 1])
  ksCache.set(key, buf)
  return buf
}

function note(ctx: AudioContext, m: number, t: number, piano: boolean, volume: number): void {
  if (piano) {
    const amps = [0.16, 0.06, 0.025]
    ;[1, 2, 3].forEach((h, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 440 * 2 ** ((m - 69) / 12) * h
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(amps[i] * volume, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0008, t + 2.2 / h)
      o.connect(g).connect(getMasterGain())
      o.start(t)
      o.stop(t + 2.3)
    })
  } else {
    const s = ctx.createBufferSource()
    const g = ctx.createGain()
    s.buffer = ks(ctx, m)
    g.gain.value = 0.35 * volume
    s.connect(g).connect(getMasterGain())
    s.start(t)
  }
}

/** Toca una lista de posiciones; `gap` = segundos entre posiciones, `at` = tiempo absoluto del contexto. */
export function playPositions(
  ps: Position[],
  opts: { inst: InstrumentId; capo: number; gap?: number; at?: number; volume?: number },
): void {
  try {
    const ctx = getAudioContext()
    const piano = INSTRUMENTS[opts.inst].kind === 'piano'
    const gap = opts.gap ?? 1
    const volume = opts.volume ?? 1
    const t = opts.at ?? ctx.currentTime + 0.06
    const strum = piano ? 0 : 0.035
    ps.forEach((p, i) => {
      midisOf(p, opts.inst, opts.capo).forEach((m, j) => note(ctx, m, t + i * gap + j * strum, piano, volume))
    })
  } catch {
    /* sin audio disponible */
  }
}

/** Blip de oscilador: acento 1500 Hz / 0,9; acento2 1100 Hz / 0,65; clic 800 Hz / 0,4 (por volumen). */
const CLICK = {
  accent: { freq: 1500, gain: 0.9 },
  accent2: { freq: 1100, gain: 0.65 },
  click: { freq: 800, gain: 0.4 },
} as const

export function playClick(at: number, kind: 'accent' | 'accent2' | 'click', volume: number): void {
  try {
    const ctx = getAudioContext()
    const { freq, gain } = CLICK[kind]
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = freq
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(gain * volume * 0.3, at + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05)
    o.connect(g).connect(getMasterGain())
    o.start(at)
    o.stop(at + 0.06)
  } catch {
    /* sin audio disponible */
  }
}

/** Calla al instante todo lo que suena o está programado (parar la práctica). */
export function stopAllSound(): void {
  silenceAll()
}
