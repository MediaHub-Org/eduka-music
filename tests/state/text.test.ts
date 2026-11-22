import { describe, expect, test } from 'vitest'
import { allPositions, buildChord, describeChange, positionKey } from '../../src/engine'
import { messagesFor } from '../../src/i18n'
import { changeSentence, chordLongName } from '../../src/i18n/text'

const es = messagesFor('es')
const en = messagesFor('en')
const find = (c: ReturnType<typeof buildChord>, key: string) => allPositions(c, 'guitar', 0).find((p) => positionKey(p) === key)!
const G = { root: 'G', quality: 'maj' } as const
const Em = { root: 'E', quality: 'm' } as const
const dGEm = () => {
  const a = buildChord(G), b = buildChord(Em)
  return describeChange(a, find(a, '3,2,0,0,0,3'), b, find(b, '0,2,2,0,0,0'), 'guitar', 0)
}

describe('texto', () => {
  test('changeSentence G→Em es', () => {
    const s = changeSentence(dGEm(), G, Em, 'guitar', es, 'latin')
    expect(s).toMatch(/^Mueve 3 dedos: .*Sol, Si se quedan\.$/)
    expect(s).not.toMatch(/<|>/)
    expect(s).toContain('en la cuerda 6 (Mi)')
  })
  test('changeSentence en', () => {
    expect(changeSentence(dGEm(), G, Em, 'guitar', en, 'english')).toMatch(/^Move 3 fingers: .*G, B stay\.$/)
  })
  test('sin cambios: misma posición', () => {
    const a = buildChord(G)
    const d = describeChange(a, find(a, '3,2,0,0,0,3'), a, find(a, '3,2,0,0,0,3'), 'guitar', 0)
    expect(changeSentence(d, G, G, 'guitar', es, 'latin')).toBe('Misma posición. Sol, Si, Re se quedan.')
  })
  test('piano: sin cláusula de cuerda', () => {
    const a = buildChord({ root: 'C', quality: 'maj' }), b = buildChord({ root: 'A', quality: 'm' })
    const d = describeChange(a, allPositions(a, 'piano', 0)[0], b, allPositions(b, 'piano', 0)[0], 'piano', 0)
    const s = changeSentence(d, a.spec, b.spec, 'piano', en, 'english')
    expect(s).not.toContain('on string')
    expect(s).toMatch(/semitone/)
  })
  test('chordLongName', () => {
    expect(chordLongName({ root: 'C', quality: 'maj', bass: 'E' }, es, 'latin')).toBe('Do mayor con bajo en Mi')
    expect(chordLongName({ root: 'E', quality: 'm7' }, es, 'latin')).toBe('Mi menor séptima')
    expect(chordLongName({ root: 'C', quality: 'maj', bass: 'E' }, en, 'english')).toBe('C major over E')
    expect(chordLongName({ root: 'E', quality: 'm7' }, en, 'english')).toBe('E minor seventh')
  })
  test('es y en tienen las mismas claves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
    expect(es.navChords).toBe('Acordes')
  })
})
