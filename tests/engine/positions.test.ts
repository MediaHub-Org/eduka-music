import { describe, expect, test } from 'vitest'
import golden from '../golden/artifact.json'
import { buildChord } from '../../src/engine/chords'
import type { QualityId } from '../../src/engine/chords'
import type { InstrumentId } from '../../src/engine/instruments'
import { INSTRUMENT_ORDER, INSTRUMENTS } from '../../src/engine/instruments'
import type { Position } from '../../src/engine/positions'
import {
  allPositions,
  clearPositionCache,
  difficulty,
  libraryVariants,
  positionKey,
  stepPositions,
  topPositions,
  tuningWithCapo,
} from '../../src/engine/positions'

const g = golden as unknown as { positions: Record<string, string[]> }
const goldenPositionKeys = Object.keys(g.positions)

function serialize(p: Position): string {
  if (p.kind === 'keys') return `${p.notes.join(',')}@${p.inversion}`
  return positionKey(p) + (p.shape ? '#' + p.shape : '')
}

test('golden covers all 6 instruments', () => {
  const insts = new Set(goldenPositionKeys.map((k) => k.split('|')[0]))
  expect([...insts].sort()).toEqual([...INSTRUMENT_ORDER].sort())
})

test.each(goldenPositionKeys)('posiciones %s = artifact', (key) => {
  const [inst, capo, root, q] = key.split('|')
  const got = topPositions(buildChord({ root, quality: q as QualityId }), inst as InstrumentId, +capo)
    .slice(0, 12)
    .map(serialize)
  expect(got).toEqual(g.positions[key])
})
describe('positions', () => {
  test('Em7 de guitarra incluye x,x,5,7,5,7', () => {
    expect(allPositions(buildChord({ root: 'E', quality: 'm7' }), 'guitar', 0).map(positionKey)).toContain('x,x,5,7,5,7')
  })

  test('cache devuelve la misma referencia', () => {
    const c = buildChord({ root: 'G', quality: 'maj' })
    expect(allPositions(c, 'guitar', 0)).toBe(allPositions(c, 'guitar', 0))
  })

  test('rendimiento: peor caso de guitarra < 150 ms sin caché', () => {
    const c = buildChord({ root: 'G', quality: '9' })
    clearPositionCache()
    const t0 = performance.now()
    allPositions(c, 'guitar', 0)
    const ms = performance.now() - t0
    expect(ms).toBeLessThan(150)
  })

  test('tuningWithCapo y difficulty', () => {
    const guitar = INSTRUMENTS.guitar
    if (guitar.kind !== 'strings') throw new Error('guitar')
    expect(tuningWithCapo(guitar, 2)).toEqual([42, 47, 52, 57, 61, 66])
    const [first] = allPositions(buildChord({ root: 'C', quality: 'maj' }), 'guitar', 0)
    if (first.kind !== 'frets') throw new Error('frets')
    expect(difficulty(first)).toBe('easy')
  })

  test('stepPositions: pocas formas, la mejor primero y repartidas por el mástil', () => {
    const region = (p: Position) => {
      if (p.kind !== 'frets') return 0
      const f = p.frets.filter((x): x is number => x != null && x > 0)
      return f.length ? Math.min(...f) : 0
    }
    for (const inst of ['guitar', 'ukulele', 'bandurria'] as const)
      for (const root of ['C', 'E', 'F#', 'Bb'])
        for (const q of ['maj', 'm', '7', 'm7', 'maj7', 'dim'] as const) {
          const c = buildChord({ root, quality: q })
          const all = allPositions(c, inst, 0)
          const steps = stepPositions(c, inst, 0)
          expect(steps.length).toBeLessThanOrEqual(5)
          expect(steps.length).toBeGreaterThan(0)
          expect(positionKey(steps[0])).toBe(positionKey(all[0]))
          const keys = new Set(all.map(positionKey))
          steps.forEach((p) => expect(keys.has(positionKey(p))).toBe(true))
          for (let i = 0; i < steps.length; i++)
            for (let j = i + 1; j < steps.length; j++) expect(Math.abs(region(steps[i]) - region(steps[j]))).toBeGreaterThanOrEqual(3)
        }
  })

  test('libraryVariants devuelve entre 1 y 4 posiciones', () => {
    const v = libraryVariants(buildChord({ root: 'A', quality: 'm7' }), 'guitar', 0)
    expect(v.length).toBeGreaterThan(0)
    expect(v.length).toBeLessThanOrEqual(4)
    expect(libraryVariants(buildChord({ root: 'C', quality: 'maj' }), 'piano', 0)).toHaveLength(3)
  })
})
