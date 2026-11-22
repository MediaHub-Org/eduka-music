import { describe, expect, test } from 'vitest'
import { beatsPerBar, bpmForLoop, buildTimeline } from '../../src/engine/practice'
import type { ChordSpec } from '../../src/engine/chords'

const C = { root: 'C', quality: 'maj' } as ChordSpec
const G = { root: 'G', quality: 'maj' } as ChordSpec

describe('practice timeline', () => {
  test('beatsPerBar', () => {
    expect(['4/4', '3/4', '6/8'].map((t) => beatsPerBar(t as '4/4'))).toEqual([4, 3, 6])
  })
  test('4/4, 2 acordes de 4 tiempos', () => {
    const t = buildTimeline([{ chord: C, beats: 4 }, { chord: G, beats: 4 }], '4/4', 1)
    expect(t.loopBeats).toBe(8)
    expect(t.countIn.map((e) => e.kind)).toEqual(['accent', 'click', 'click', 'click'])
    expect(t.loop.filter((e) => e.kind === 'chord').map((e) => e.beat)).toEqual([0, 4])
    expect(t.loop.filter((e) => e.kind === 'accent').map((e) => e.beat)).toEqual([0, 4])
  })
  test('6/8 acentos', () => {
    const t = buildTimeline([{ chord: C, beats: 6 }], '6/8', 0)
    expect(t.loop.filter((e) => e.kind !== 'chord').map((e) => e.kind)).toEqual(['accent', 'click', 'click', 'accent2', 'click', 'click'])
    expect(t.countIn).toEqual([])
  })
  test('rampa', () => {
    const r = { enabled: true, step: 5, everyLoops: 2, max: 100 }
    expect([0, 1, 2, 3, 4, 20].map((n) => bpmForLoop(80, r, n))).toEqual([80, 80, 85, 85, 90, 100])
    expect(bpmForLoop(80, { ...r, enabled: false }, 10)).toBe(80)
  })
})
