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

  test('libraryVariants devuelve entre 1 y 10 posiciones', () => {
    const v = libraryVariants(buildChord({ root: 'A', quality: 'm7' }), 'guitar', 0)
    expect(v.length).toBeGreaterThan(0)
    expect(v.length).toBeLessThanOrEqual(10)
    expect(libraryVariants(buildChord({ root: 'C', quality: 'maj' }), 'piano', 0)).toHaveLength(3)
  })
})
