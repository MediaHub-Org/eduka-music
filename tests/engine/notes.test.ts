import { expect, test } from 'vitest'
import { displayNote, pcOf, spell } from '../../src/engine/notes'

test('pcOf', () => {
  expect(pcOf('C')).toBe(0)
  expect(pcOf('F#')).toBe(6)
  expect(pcOf('Bb')).toBe(10)
  expect(pcOf('Cb')).toBe(11)
})
test('spell respeta la letra', () => {
  expect(spell('Eb', 4, 2)).toBe('G')
  expect(spell('F#', 4, 2)).toBe('A#')
  expect(spell('Db', 3, 2)).toBe('Fb')
})
test('displayNote', () => {
  expect(displayNote('F#', 'latin')).toBe('Fa♯')
  expect(displayNote('Bb', 'english')).toBe('B♭')
})
