import { describe, expect, test } from 'vitest'
import golden from '../golden/artifact.json'
import { chordSymbol } from '../../src/engine/chords'
import {
  CIRCLE, PRESETS, circleNeighbours, diatonic, keySignature, keysContaining, nextChord, previousChord,
  relativeMajor, relativeMinor, scaleOf,
} from '../../src/engine/keys'
import type { Mode } from '../../src/engine/keys'

describe('keys', () => {
  test.each(Object.keys(golden.diatonic))('diatónicos %s', (k) => {
    const [tonic, mode, type] = k.split('|')
    const got = diatonic({ tonic, mode: mode as Mode }, type === 'tri' ? 'triads' : 'sevenths').map((d) =>
      chordSymbol(d.spec, 'english'),
    )
    expect(got).toEqual((golden.diatonic as Record<string, string[]>)[k])
  })

  test('escalas y relativos', () => {
    expect(scaleOf({ tonic: 'D', mode: 'maj' })).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])
    expect(scaleOf({ tonic: 'A', mode: 'min' })).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(relativeMajor({ tonic: 'A', mode: 'min' })).toBe('C')
    expect(relativeMajor({ tonic: 'G', mode: 'maj' })).toBe('G')
    expect(relativeMinor({ tonic: 'G', mode: 'maj' })).toBe('E')
  })

  test('armadura', () => {
    expect(keySignature({ tonic: 'D', mode: 'maj' })).toEqual({ type: 'sharp', count: 2, notes: ['F#', 'C#'] })
    expect(keySignature({ tonic: 'G', mode: 'min' })).toMatchObject({ type: 'flat', count: 2 })
    expect(keySignature({ tonic: 'C', mode: 'maj' })).toEqual({ type: 'none', count: 0, notes: [] })
    expect(circleNeighbours({ tonic: 'C', mode: 'maj' })).toEqual(['F', 'G'])
  })

  test('next down en G: Em7→Cmaj7', () => {
    expect(nextChord({ root: 'E', quality: 'm7' }, { tonic: 'G', mode: 'maj' }, 'sevenths', 'down').spec).toEqual({ root: 'C', quality: 'maj7' })
  })

  test('fuera de tonalidad → variant', () => {
    expect(nextChord({ root: 'F', quality: 'maj' }, { tonic: 'G', mode: 'maj' }, 'triads', 'down')).toMatchObject({
      dir: 'variant', inKey: false, spec: { root: 'F', quality: 'm' },
    })
    expect(nextChord({ root: 'F', quality: 'maj', bass: 'A' }, { tonic: 'G', mode: 'maj' }, 'triads', 'up').spec).toEqual({ root: 'F', quality: 'm', bass: 'A' })
  })

  test('previousChord invierte down', () => {
    const k = { tonic: 'G', mode: 'maj' as Mode }
    expect(previousChord({ root: 'C', quality: 'maj7' }, k, 'sevenths', 'down')).toEqual({ root: 'E', quality: 'm7' })
  })

  test('keysContaining(Bm) incluye D y G mayor', () => {
    const ks = keysContaining({ root: 'B', quality: 'm' }).map((k) => k.tonic + k.mode)
    expect(ks).toEqual(expect.arrayContaining(['Dmaj', 'Gmaj', 'Amaj']))
    expect(ks.indexOf('Gmaj')).toBeLessThan(ks.indexOf('Dmaj'))
    const firstMin = ks.findIndex((k) => k.endsWith('min'))
    expect(ks.slice(0, firstMin).every((k) => k.endsWith('maj'))).toBe(true)
  })

  test('presets', () => {
    expect(CIRCLE).toHaveLength(12)
    expect(PRESETS.maj.map((p) => p.id)).toEqual(['pop', 'jazz', 'fifties', 'blues', 'cycle'])
    expect(PRESETS.min[0]).toMatchObject({ id: 'anda', roman: 'i–VII–VI–V', degrees: [0, 6, 5, 4] })
  })
})
