import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { beatsPerBar, bpmForLoop, buildChord, buildTimeline, chainVoicings } from '../../engine'
import type { Position, ProgressionItem, TimeSignature, TimelineEvent } from '../../engine'
import { getAudioContext } from '../../audio/context'
import { Scheduler } from '../../audio/scheduler'
import type { SchedulerDeps } from '../../audio/scheduler'
import { playClick, playPositions } from '../../audio/synth'
import { selectCapo } from '../../state/selectors'
import { useStore } from '../../state/store'

export const BPM_MIN = 40
export const BPM_MAX = 220
export const clampBpm = (n: number): number => (Number.isFinite(n) ? Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(n))) : 80)

/** Margen entre pulsar Iniciar y el primer tiempo (s), para que el primer clic no llegue tarde. */
const LEAD_SEC = 0.1

export type PracticeClock = Pick<SchedulerDeps, 'now' | 'setTimer' | 'clearTimer'>

const audioClock: PracticeClock = {
  now: () => {
    try {
      return getAudioContext().currentTime
    } catch {
      return performance.now() / 1000
    }
  },
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
}

export interface PracticeState {
  running: boolean
  /** Acorde que suena (o el que va a sonar durante la cuenta previa). */
  index: number
  /** Tiempo del compás que acaba de sonar; -1 antes del primero. */
  beatInBar: number
  /** Vuelta actual (0, 1…); -1 durante la cuenta previa. */
  loop: number
  bpmNow: number
  start(): void
  stop(): void
  setBpm(n: number): void
  /** Voicing encadenado de cada acorde (null = sin posición: se muestra el nombre y no suena). */
  voicings: (Position | null)[]
}

/**
 * Metrónomo + acordes sobre el reloj de Web Audio. El audio se programa en `at`; la interfaz se
 * actualiza en ese mismo instante con un temporizador de `at - now`. `clock` solo para tests.
 */
export function usePractice(items: ProgressionItem[], ts: TimeSignature, bpm: number, clock: PracticeClock = audioClock): PracticeState {
  const inst = useStore((s) => s.current.instrument)
  const capo = useStore(selectCapo)
  const voicings = useMemo(() => chainVoicings(items.map((i) => buildChord(i.chord)), inst, capo), [items, inst, capo])

  const [running, setRunning] = useState(false)
  const [index, setIndex] = useState(0)
  const [beatInBar, setBeat] = useState(-1)
  const [loop, setLoop] = useState(-1)
  const [bpmNow, setBpmNow] = useState(() => clampBpm(bpm))

  const clockRef = useRef(clock)
  clockRef.current = clock
  const sched = useRef<Scheduler | null>(null)
  const uiTimers = useRef(new Set<unknown>())
  // base de la rampa: BPM y vuelta desde la que cuenta (se reinicia al tocar el BPM a mano)
  const ramp = useRef({ base: clampBpm(bpm), fromLoop: 0, loop: -1, bpm: clampBpm(bpm) })
  const live = useRef({ items, ts, bpm, voicings, inst, capo })
  live.current = { items, ts, bpm, voicings, inst, capo }

  useEffect(() => {
    if (!running) setBpmNow(clampBpm(bpm))
  }, [bpm, running])

  const clearUi = () => {
    const c = clockRef.current
    for (const h of uiTimers.current) c.clearTimer(h)
    uiTimers.current.clear()
  }

  const stop = useCallback(() => {
    sched.current?.stop()
    sched.current = null
    clearUi()
    setRunning(false)
    setIndex(0)
    setBeat(-1)
    setLoop(-1)
  }, [])

  const start = useCallback(() => {
    const { items: its, ts: t, bpm: b0 } = live.current
    if (!its.length) return
    stop()
    const c = clockRef.current
    const prefs = useStore.getState().practice
    const tl = buildTimeline(its, t, prefs.countInBars)
    const bpb = beatsPerBar(t)
    const b = clampBpm(b0)
    ramp.current = { base: b, fromLoop: 0, loop: -1, bpm: b }
    const s = new Scheduler({ now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer })
    sched.current = s

    const ui = (at: number, fn: () => void) => {
      const h = c.setTimer(() => {
        uiTimers.current.delete(h)
        fn()
      }, Math.max(0, (at - c.now()) * 1000))
      uiTimers.current.add(h)
    }

    const onEvent = (e: TimelineEvent, at: number, lp: number) => {
      const st = useStore.getState()
      const p = st.practice
      if (e.kind === 'chord') {
        // rampa: al empezar cada vuelta nueva
        const r = ramp.current
        if (lp !== r.loop) {
          r.loop = lp
          const next = clampBpm(bpmForLoop(r.base, p.ramp, lp - r.fromLoop))
          if (next !== r.bpm) {
            r.bpm = next
            s.setBpm(next)
            ui(at, () => setBpmNow(next))
          }
        }
        const v = live.current.voicings[e.index]
        if (p.chordOn && v) playPositions([v], { inst: live.current.inst, capo: live.current.capo, at, gap: 0, volume: p.chordVolume })
        const i = e.index
        ui(at, () => {
          setIndex(i)
          setLoop(lp)
        })
      } else {
        if (p.clickOn) playClick(at, e.kind, p.clickVolume)
        const beat = e.beat % bpb
        ui(at, () => {
          setBeat(beat)
          if (lp < 0) setLoop(-1)
        })
      }
    }

    setRunning(true)
    setIndex(0)
    setBeat(-1)
    setLoop(-1)
    setBpmNow(b)
    s.start(tl, b, onEvent, c.now() + LEAD_SEC)
  }, [stop])

  const setBpm = useCallback((n: number) => {
    const b = clampBpm(n)
    setBpmNow(b)
    const s = sched.current
    if (!s) return
    // la rampa sigue contando desde aquí con el BPM elegido
    const r = ramp.current
    r.base = b
    r.bpm = b
    r.fromLoop = Math.max(0, r.loop)
    s.setBpm(b)
  }, [])

  useEffect(() => stop, [stop])

  return { running, index, beatInBar, loop, bpmNow, start, stop, setBpm, voicings }
}
