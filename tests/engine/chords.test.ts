import { expect, test } from 'vitest'
import { buildChord, chordSymbol, sameChord } from '../../src/engine/chords'

test('Em7', () => {
  const c = buildChord({ root: 'E', quality: 'm7' })
  expect(c.tones.map((t) => t.name)).toEqual(['E', 'G', 'B', 'D'])
  expect(c.tones.map((t) => t.family)).toEqual(['r', '3', '5', '7'])
})
test('Cdim7 usa ♭♭7', () => {
  expect(buildChord({ root: 'C', quality: 'dim7' }).tones[3]).toMatchObject({ name: 'Bbb', label: '♭♭7' })
})
test('C/E: bajo dentro', () => {
  const c = buildChord({ root: 'C', quality: 'maj', bass: 'E' })
  expect(c.bassTone?.family).toBe('3')
  expect(c.pcs).toEqual([0, 4, 7])
})
test('C/D: bajo añadido', () => {
  const c = buildChord({ root: 'C', quality: 'maj', bass: 'D' })
  expect(c.bassTone).toMatchObject({ pc: 2, family: 'b', label: 'B' })
  expect(c.pcs).toEqual([0, 4, 7])
})
test('chordSymbol', () => {
  expect(chordSymbol({ root: 'F#', quality: 'm7b5' }, 'english')).toBe('F♯m7♭5')
  expect(chordSymbol({ root: 'C', quality: 'maj', bass: 'E' }, 'latin')).toBe('Do/Mi')
  expect(chordSymbol({ root: 'E', quality: 'm7' }, 'english')).toBe('Em7')
  expect(chordSymbol({ root: 'E', quality: 'm7' }, 'latin')).toBe('Mim7')
})
test('sameChord enarmónico', () => {
  expect(sameChord({ root: 'F#', quality: 'm' }, { root: 'Gb', quality: 'm' })).toBe(true)
  expect(sameChord({ root: 'C', quality: 'm' }, { root: 'C', quality: 'maj' })).toBe(false)
})
