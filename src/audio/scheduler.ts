import type { Timeline, TimelineEvent } from '../engine/practice'

export interface SchedulerDeps {
  now: () => number
  setTimer: (fn: () => void, ms: number) => unknown
  clearTimer: (h: unknown) => void
  lookaheadMs?: number
  aheadSec?: number
}

type OnEvent = (e: TimelineEvent, at: number, loop: number) => void

const LATE_SEC = 0.05

/** Planificador "lookahead": cada tick programa los eventos con at < now()+aheadSec. */
export class Scheduler {
  private readonly lookaheadMs: number
  private readonly aheadSec: number
  private timer: unknown = null
  private running = false
  private tl: Timeline = { countIn: [], loop: [], loopBeats: 0 }
  private onEvent: OnEvent = () => {}
  private bpm = 120
  // cursor: loop -1 = cuenta previa
  private loop = -1
  private idx = 0
  // último evento procesado (emitido u omitido): ancla del siguiente
  private prevAt = 0
  private prevBeat = 0
  private done = false

  constructor(private deps: SchedulerDeps) {
    this.lookaheadMs = deps.lookaheadMs ?? 25
    this.aheadSec = deps.aheadSec ?? 0.12
  }

  start(tl: Timeline, bpm: number, onEvent: OnEvent, startAt: number): void {
    this.stop()
    this.tl = tl
    this.onEvent = onEvent
    this.bpm = bpm
    this.prevAt = startAt
    this.prevBeat = 0
    this.loop = tl.countIn.length ? -1 : 0
    this.idx = 0
    this.done = tl.loop.length === 0 && tl.countIn.length === 0
    this.running = true
    this.tick()
  }

  setBpm(bpm: number): void {
    this.bpm = bpm
  }

  stop(): void {
    this.running = false
    if (this.timer !== null) this.deps.clearTimer(this.timer)
    this.timer = null
  }

  private current(): { e: TimelineEvent; abs: number } | null {
    if (this.done) return null
    if (this.loop < 0) {
      const e = this.tl.countIn[this.idx]
      return { e, abs: e.beat }
    }
    const e = this.tl.loop[this.idx]
    return { e, abs: this.tl.countIn.length + this.loop * this.tl.loopBeats + e.beat }
  }

  private advance(): void {
    this.idx++
    if (this.loop < 0) {
      if (this.idx >= this.tl.countIn.length) { this.loop = 0; this.idx = 0 }
    } else if (this.idx >= this.tl.loop.length) {
      this.loop++
      this.idx = 0
      if (this.tl.loopBeats <= 0) this.done = true
    }
    if (this.loop === 0 && this.tl.loop.length === 0) this.done = true
  }

  private atOf(abs: number): number {
    return this.prevAt + (abs - this.prevBeat) * (60 / this.bpm)
  }

  private tick = (): void => {
    if (!this.running) return
    const now = this.deps.now()
    let cur = this.current()
    // salto (pestaña oculta): avanzar sin emitir hasta el siguiente tiempo >= now
    if (cur && this.atOf(cur.abs) < now - LATE_SEC) {
      while (cur && this.atOf(cur.abs) < now) {
        this.prevAt = this.atOf(cur.abs)
        this.prevBeat = cur.abs
        this.advance()
        cur = this.current()
      }
    }
    while (cur) {
      const at = this.atOf(cur.abs)
      if (at >= now + this.aheadSec) break
      this.prevAt = at
      this.prevBeat = cur.abs
      const loop = this.loop
      this.advance()
      this.onEvent(cur.e, at, loop)
      cur = this.current()
    }
    if (this.running) this.timer = this.deps.setTimer(this.tick, this.lookaheadMs)
  }
}
