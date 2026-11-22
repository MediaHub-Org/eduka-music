import { describe, expect, test } from 'vitest'
import { parseChordQuery } from '../../src/engine/parse'
import { sameChord } from '../../src/engine/chords'

describe('parseChordQuery', () => {
  test.each([
    ['F#m7', { root: 'F#', quality: 'm7' }], ['fa# m7', { root: 'F#', quality: 'm7' }], ['sol menor', { root: 'G', quality: 'm' }],
    ['Bb maj7', { root: 'Bb', quality: 'maj7' }], ['do séptima', { root: 'C', quality: '7' }], ['C/E', { root: 'C', quality: 'maj', bass: 'E' }],
    ['re/fa#', { root: 'D', quality: 'maj', bass: 'F#' }], ['Am7/G', { root: 'A', quality: 'm7', bass: 'G' }], ['CΔ', { root: 'C', quality: 'maj7' }],
    ['Bø', { root: 'B', quality: 'm7b5' }], ['  bb  m7 ', { root: 'Bb', quality: 'm7' }], ['mi menor séptima', { root: 'E', quality: 'm7' }],
  ])('%s', (q, exp) => expect(parseChordQuery(q)[0]).toEqual(exp))

  test('parciales', () => {
    expect(parseChordQuery('sol').map((c) => c.quality).slice(0, 4)).toEqual(['maj', 'm', '7', 'm7'])
    expect(parseChordQuery('C/')[0]).toEqual({ root: 'C', quality: 'maj' })
  })

  test.each(['', '   ', 'xyz', '123', '//', 'H7', 'C blah', 'C#x'])('basura %j → []', (q) => expect(parseChordQuery(q)).toEqual([]))

  test.each([
    ['Fs', 'F#'], ['fas m7', 'F#'], ['do sostenido', 'C#'], ['fa sharp', 'F#'], ['si bemol', 'Bb'], ['la flat', 'Ab'],
    ['F♯', 'F#'], ['B♭', 'Bb'], ['Sib', 'Bb'],
  ])('alteración %s → %s', (q, root) => expect(parseChordQuery(q)[0].root).toBe(root))

  test('s no se come sus', () => {
    expect(parseChordQuery('Csus4')[0]).toEqual({ root: 'C', quality: 'sus4' })
    expect(parseChordQuery('Dsus')[0]).toEqual({ root: 'D', quality: 'sus4' })
  })

  test('b suelta es la nota B; bb es Bb', () => {
    expect(parseChordQuery('b')[0]).toEqual({ root: 'B', quality: 'maj' })
    expect(parseChordQuery('bb m7')[0]).toEqual({ root: 'Bb', quality: 'm7' })
    expect(parseChordQuery('Bm')[0]).toEqual({ root: 'B', quality: 'm' })
  })

  test('mi es la nota E; m/min/-/menor/minor son menor', () => {
    expect(parseChordQuery('mi')[0]).toEqual({ root: 'E', quality: 'maj' })
    for (const q of ['Am', 'Amin', 'A-', 'la menor', 'A minor']) expect(parseChordQuery(q)[0]).toEqual({ root: 'A', quality: 'm' })
  })

  test('M mayúscula pegada = mayor', () => {
    expect(parseChordQuery('CM7')[0]).toEqual({ root: 'C', quality: 'maj7' })
    expect(parseChordQuery('Cm7')[0]).toEqual({ root: 'C', quality: 'm7' })
    expect(parseChordQuery('F#M7')[0]).toEqual({ root: 'F#', quality: 'maj7' })
    expect(parseChordQuery('CM')[0]).toEqual({ root: 'C', quality: 'maj' })
    expect(parseChordQuery('CMaj7')[0]).toEqual({ root: 'C', quality: 'maj7' })
  })

  test.each([
    ['do menor séptima', 'm7'], ['do menor 7', 'm7'], ['do séptima mayor', 'maj7'], ['C major seventh', 'maj7'], ['Cmaj7', 'maj7'],
    ['do séptima', '7'], ['C seventh', '7'], ['do dominante', '7'], ['do mayor', 'maj'], ['C major', 'maj'],
    ['do disminuido', 'dim'], ['C°7', 'dim7'], ['C+', 'aug'], ['do aumentado', 'aug'], ['do semidisminuido', 'm7b5'],
    ['do suspendido', 'sus4'], ['C7sus4', '7sus4'], ['Csus2', 'sus2'], ['do novena', '9'], ['do sexta', '6'], ['Cm6', 'm6'],
    ['Cadd9', 'add9'], ['Cm9', 'm9'], ['Cmaj9', 'maj9'], ['Cm7b5', 'm7b5'], ['Cdim', 'dim'],
  ])('calidad %s → %s', (q, quality) => expect(parseChordQuery(q)[0]).toEqual({ root: 'C', quality }))

  test('bajo', () => {
    expect(parseChordQuery('C/xyz')[0]).toEqual({ root: 'C', quality: 'maj' })
    expect(parseChordQuery('Cm7/xyz')).toEqual([{ root: 'C', quality: 'm7' }])
    expect(parseChordQuery('Cm7/Bb')[0]).toEqual({ root: 'C', quality: 'm7', bass: 'Bb' })
    expect(parseChordQuery('do/sib')[0]).toEqual({ root: 'C', quality: 'maj', bass: 'Bb' })
    expect(parseChordQuery('C/C')[0]).toEqual({ root: 'C', quality: 'maj' })
  })

  test('sin calidad conserva el bajo', () => {
    expect(parseChordQuery('C/E').map((c) => c.quality)).toEqual(['maj', 'm', '7', 'm7'])
    expect(parseChordQuery('C/E').every((c) => c.bass === 'E')).toBe(true)
  })

  test('máximo 8, sin duplicados', () => {
    const r = parseChordQuery('sol')
    expect(r.length).toBeLessThanOrEqual(8)
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) expect(sameChord(r[i], r[j])).toBe(false)
  })
})
