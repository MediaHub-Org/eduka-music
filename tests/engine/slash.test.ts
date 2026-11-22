import { describe, expect, test } from 'vitest'
import golden from '../golden/artifact.json'
import { QUALITIES, buildChord, sameChord } from '../../src/engine/chords'
import type { Chord, QualityId } from '../../src/engine/chords'
import type { InstrumentId } from '../../src/engine/instruments'
import { INSTRUMENT_ORDER } from '../../src/engine/instruments'
import { ROOTS, pcOf } from '../../src/engine/notes'
import type { KeyPosition, Position } from '../../src/engine/positions'
import {
  allPositions,
  clearPositionCache,
  libraryVariants,
  midisOf,
  positionKey,
  topPositions,
} from '../../src/engine/positions'
import { chainVoicings, nearestPosition } from '../../src/engine/voiceLeading'

const lowestPc = (p: Position, inst: InstrumentId, capo: number): number => Math.min(...midisOf(p, inst, capo)) % 12

describe('slash chords', () => {
  test.each(INSTRUMENT_ORDER)('C/E en %s: bajo E', (inst) => {
    const ps = allPositions(buildChord({ root: 'C', quality: 'maj', bass: 'E' }), inst, 0)
    expect(ps.length).toBeGreaterThan(0)
    ps.forEach((p) => {
      expect(lowestPc(p, inst, 0)).toBe(4)
      expect(p.bass.pc).toBe(4)
    })
  })

  test('D/F# guitarra contiene x,x,4,2,3,2', () => {
    expect(allPositions(buildChord({ root: 'D', quality: 'maj', bass: 'F#' }), 'guitar', 0).map(positionKey)).toContain(
      'x,x,4,2,3,2',
    )
  })

  test('C/D guitarra: el bajo añadido solo suena como nota más grave', () => {
    const ps = allPositions(buildChord({ root: 'C', quality: 'maj', bass: 'D' }), 'guitar', 0)
    expect(ps.length).toBeGreaterThan(0)
    ps.forEach((p) => {
      const ms = midisOf(p, 'guitar', 0)
      const lo = Math.min(...ms)
      expect(lo % 12).toBe(2)
      ms.filter((m) => m % 12 === 2).forEach((m) => expect(m).toBe(lo))
      expect(p.bass.family).toBe('b')
    })
  })

  test('barrido: bajo raro nunca lanza y siempre se respeta', () => {
    for (const inst of INSTRUMENT_ORDER)
      for (const root of ['C', 'F#', 'Bb'])
        for (const q of ['maj', 'm7', '9'] as QualityId[])
          for (const bass of ['D', 'G', 'B']) {
            const c = buildChord({ root, quality: q, bass })
            const ps = allPositions(c, inst, 2)
            ps.forEach((p) => expect(lowestPc(p, inst, 2)).toBe(pcOf(bass)))
            expect(() => topPositions(c, inst, 2)).not.toThrow()
            expect(() => libraryVariants(c, inst, 2)).not.toThrow()
          }
  })

  test('piano: mano derecha = pianoPos del acorde, bajo una octava por debajo, MIDI 36..59', () => {
    const plain = allPositions(buildChord({ root: 'C', quality: 'maj' }), 'piano', 0) as KeyPosition[]
    const ps = allPositions(buildChord({ root: 'C', quality: 'maj', bass: 'D' }), 'piano', 0) as KeyPosition[]
    expect(ps).toHaveLength(plain.length)
    ps.forEach((p, i) => {
      expect(p.inversion).toBe(i)
      expect(p.notes.slice(1)).toEqual(plain[i].notes)
      expect(p.notes[0] % 12).toBe(2)
      expect(p.notes[0]).toBeGreaterThanOrEqual(36)
      expect(p.notes[0]).toBeLessThanOrEqual(59)
      const gap = Math.min(...p.notes.slice(1)) - p.notes[0]
      expect(gap).toBeGreaterThan(0)
      expect(gap).toBeLessThanOrEqual(12)
      expect(p.bass).toMatchObject({ pc: 2, family: 'b' })
    })
  })

  test('piano: el voicing más cercano mantiene el bajo abajo', () => {
    const chords = ['C', 'G/B', 'Am', 'F/A', 'C/G', 'D/F#', 'G'].map((s) => {
      const [head, bass] = s.split('/')
      const m = head.endsWith('m')
      return buildChord({ root: m ? head.slice(0, -1) : head, quality: m ? 'm' : 'maj', bass })
    })
    const chain = chainVoicings(chords, 'piano', 0)
    chain.forEach((p, i) => {
      if (!p || p.kind !== 'keys') throw new Error('keys')
      const bp = chords[i].bassPc
      if (bp != null) {
        expect(p.notes[0] % 12).toBe(bp)
        expect(Math.min(...p.notes)).toBe(p.notes[0])
        expect(p.notes[0]).toBeGreaterThanOrEqual(36)
        expect(p.notes[0]).toBeLessThanOrEqual(59)
      }
    })
  })

  test('cuerdas: nearestPosition con bajo respeta el bajo', () => {
    const from = allPositions(buildChord({ root: 'D', quality: 'maj' }), 'guitar', 0)[0]
    const p = nearestPosition(from, buildChord({ root: 'G', quality: 'maj', bass: 'B' }), 'guitar', 0)
    expect(p).not.toBeNull()
    expect(lowestPc(p!, 'guitar', 0)).toBe(11)
  })

  test('sin solución: [] y null en el encadenado, sin lanzar', () => {
    let impossible: Chord | null = null
    for (const root of ROOTS)
      for (const q of QUALITIES)
        for (const bass of ROOTS) {
          const c = buildChord({ root, quality: q.id, bass })
          if (!impossible && c.bassPc != null && allPositions(c, 'ukulele', 0).length === 0) impossible = c
        }
    expect(impossible).not.toBeNull()
    const c = impossible!
    expect(topPositions(c, 'ukulele', 0)).toEqual([])
    expect(libraryVariants(c, 'ukulele', 0)).toEqual([])
    const g = buildChord({ root: 'G', quality: 'maj' })
    const chain = chainVoicings([g, c, g], 'ukulele', 0)
    expect(chain[0]).not.toBeNull()
    expect(chain[1]).toBeNull()
    expect(chain[2]).not.toBeNull()
    expect(nearestPosition(null, c, 'ukulele', 0)).toBeNull()
  })

  test('C/C ≡ C', () => {
    const c = buildChord({ root: 'C', quality: 'maj', bass: 'C' })
    expect(c.bassPc).toBeNull()
    expect(c.bassTone).toBeNull()
    expect(c.spec.bass).toBeUndefined()
    expect(sameChord({ root: 'C', quality: 'maj', bass: 'B#' }, { root: 'C', quality: 'maj' })).toBe(true)
    expect(allPositions(c, 'guitar', 0)).toEqual(allPositions(buildChord({ root: 'C', quality: 'maj' }), 'guitar', 0))
  })

  test('la caché distingue el bajo', () => {
    const a = allPositions(buildChord({ root: 'C', quality: 'maj' }), 'guitar', 0)
    const b = allPositions(buildChord({ root: 'C', quality: 'maj', bass: 'E' }), 'guitar', 0)
    expect(a).not.toBe(b)
    expect(lowestPc(b[0], 'guitar', 0)).toBe(4)
  })

  test('rendimiento con bajo: G9/B y F#m7b5/D en guitarra < 150 ms sin caché', () => {
    for (const spec of [
      { root: 'G', quality: '9' as QualityId, bass: 'B' },
      { root: 'F#', quality: 'm7b5' as QualityId, bass: 'D' },
      { root: 'G', quality: '9' as QualityId, bass: 'C#' },
    ]) {
      clearPositionCache()
      const t0 = performance.now()
      allPositions(buildChord(spec), 'guitar', 0)
      expect(performance.now() - t0).toBeLessThan(150)
    }
  })

  test('goldens sin bajo siguen iguales (20 claves, semilla fija)', () => {
    const pos = (golden as unknown as { positions: Record<string, string[]> }).positions
    const keys = Object.keys(pos)
    let s = 12345
    const rnd = (): number => {
      s = (s * 1103515245 + 12345) % 2147483648
      return s / 2147483648
    }
    clearPositionCache()
    for (let i = 0; i < 20; i++) {
      const key = keys[Math.floor(rnd() * keys.length)]
      const [inst, capo, root, q] = key.split('|')
      const got = topPositions(buildChord({ root, quality: q as QualityId }), inst as InstrumentId, +capo)
        .slice(0, 12)
        .map((p) => (p.kind === 'keys' ? `${p.notes.join(',')}@${p.inversion}` : positionKey(p) + (p.shape ? '#' + p.shape : '')))
      expect(got).toEqual(pos[key])
    }
  })
})
