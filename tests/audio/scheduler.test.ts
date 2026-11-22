import { describe, expect, test } from 'vitest'
import { Scheduler } from '../../src/audio/scheduler'
import { buildTimeline } from '../../src/engine/practice'
import type { ChordSpec } from '../../src/engine/chords'
import type { TimelineEvent } from '../../src/engine/practice'

const C = { root: 'C', quality: 'maj' } as ChordSpec

function setup() {
  let t = 0
  let fn: (() => void) | null = null
  const sch = new Scheduler({
    now: () => t,
    setTimer: (f) => { fn = f; return 1 },
    clearTimer: () => { fn = null },
  })
  const got: { e: TimelineEvent; at: number; loop: number }[] = []
  return {
    sch, got,
    set: (v: number) => { t = v },
    tick: () => fn?.(),
    active: () => fn !== null,
    onEvent: (e: TimelineEvent, at: number, loop: number) => got.push({ e, at, loop }),
  }
}
const clicks = <T extends { e: TimelineEvent }>(g: T[]) => g.filter((x) => x.e.kind !== 'chord')

describe('Scheduler', () => {
  test('tiempos correctos a 120 bpm, con cuenta previa', () => {
    const s = setup()
    const tl = buildTimeline([{ chord: C, beats: 4 }], '4/4', 1)
    s.sch.start(tl, 120, s.onEvent, 10)
    for (let n = 10; n < 14; n += 0.025) { s.set(n); s.tick() }
    const ci = s.got.filter((x) => x.loop === -1)
    expect(ci.map((x) => x.at)).toEqual([10, 10.5, 11, 11.5])
    const l0 = clicks(s.got.filter((x) => x.loop === 0))
    expect(l0.slice(0, 4).map((x) => x.at)).toEqual([12, 12.5, 13, 13.5])
    const l1 = s.got.filter((x) => x.loop === 1 && x.e.kind === 'chord')
    expect(l1[0].at).toBe(14)
  })

  test('salto de 10 s no reproduce en ráfaga', () => {
    const s = setup()
    const tl = buildTimeline([{ chord: C, beats: 4 }], '4/4', 0)
    s.sch.start(tl, 120, s.onEvent, 0)
    s.set(0); s.tick(); s.set(1); s.tick()
    const n0 = s.got.length
    s.set(11); s.tick()
    const after = s.got.slice(n0)
    expect(after.length).toBeGreaterThan(0)
    for (const x of after) {
      expect(x.at).toBeGreaterThanOrEqual(11)
      expect(x.at).toBeLessThan(11.12)
    }
    // el contador de vueltas siguió avanzando al saltar (11 s = 5.5 vueltas de 2 s)
    expect(after[0].loop).toBe(5)
  })

  test('setBpm a mitad de vuelta mantiene el pulso continuo', () => {
    const s = setup()
    const tl = buildTimeline([{ chord: C, beats: 8 }], '4/4', 0)
    s.sch.start(tl, 120, s.onEvent, 0)
    s.set(0); s.tick()
    const last = clicks(s.got).at(-1)!
    s.sch.setBpm(60)
    s.set(0.95); s.tick()
    const c = clicks(s.got)
    const next = c[c.length - 1]
    expect(next.at).toBeCloseTo(last.at + 1, 9)
  })

  test('stop detiene el temporizador', () => {
    const s = setup()
    s.sch.start(buildTimeline([{ chord: C, beats: 4 }], '4/4', 0), 120, s.onEvent, 0)
    expect(s.active()).toBe(true)
    s.sch.stop()
    expect(s.active()).toBe(false)
  })
})
