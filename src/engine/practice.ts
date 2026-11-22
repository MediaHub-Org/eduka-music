import type { ChordSpec } from './chords'

export type TimeSignature = '4/4' | '3/4' | '6/8'

/** En 6/8 el BPM cuenta corcheas; se acentúan los tiempos 1 (fuerte) y 4 (accent2). */
export function beatsPerBar(ts: TimeSignature): number {
  return ts === '4/4' ? 4 : ts === '3/4' ? 3 : 6
}

export interface ProgressionItem {
  chord: ChordSpec
  beats: number
}

export type ClickKind = 'accent' | 'accent2' | 'click'
export type TimelineEvent = { beat: number; kind: ClickKind } | { beat: number; kind: 'chord'; index: number }
export interface Timeline {
  countIn: TimelineEvent[]
  loop: TimelineEvent[]
  loopBeats: number
}

function clickKind(ts: TimeSignature, beatInBar: number): ClickKind {
  if (beatInBar === 0) return 'accent'
  if (ts === '6/8' && beatInBar === 3) return 'accent2'
  return 'click'
}

export function buildTimeline(items: ProgressionItem[], ts: TimeSignature, countInBars: number): Timeline {
  const bpb = beatsPerBar(ts)
  const countIn: TimelineEvent[] = []
  for (let b = 0; b < countInBars * bpb; b++) countIn.push({ beat: b, kind: clickKind(ts, b % bpb) })
  const loop: TimelineEvent[] = []
  const starts: number[] = []
  let total = 0
  items.forEach((it, index) => {
    starts.push(total)
    loop.push({ beat: total, kind: 'chord', index })
    total += it.beats
  })
  for (let b = 0; b < total; b++) loop.push({ beat: b, kind: clickKind(ts, b % bpb) })
  loop.sort((a, b) => a.beat - b.beat) // estable: el acorde queda antes que el clic del mismo tiempo
  return { countIn, loop, loopBeats: total }
}

export interface Ramp {
  enabled: boolean
  step: number
  everyLoops: number
  max: number
}

export function bpmForLoop(start: number, ramp: Ramp, loopsDone: number): number {
  if (!ramp.enabled || ramp.everyLoops <= 0) return start
  return Math.min(ramp.max, start + ramp.step * Math.floor(loopsDone / ramp.everyLoops))
}
