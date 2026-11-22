import { describe, expect, test } from 'vitest'
import { buildChord } from '../../src/engine/chords'
import { describeChange } from '../../src/engine/change'
import { allPositions, positionKey } from '../../src/engine/positions'

const find = (c: ReturnType<typeof buildChord>, key: string) =>
  allPositions(c, 'guitar', 0).find((p) => positionKey(p) === key)!

describe('describeChange', () => {
  test('G→Em en guitarra (posiciones abiertas)', () => {
    const G = buildChord({ root: 'G', quality: 'maj' })
    const Em = buildChord({ root: 'E', quality: 'm' })
    const d = describeChange(G, find(G, '3,2,0,0,0,3'), Em, find(Em, '0,2,2,0,0,0'), 'guitar', 0)
    expect(d.kept.map((t) => t.name).sort()).toEqual(['B', 'G'])
    expect(d.items.filter((i) => i.kind === 'move').length).toBe(3)
    expect(d.movedStrings).toEqual([0, 2, 5])
    expect(d.items[0]).toMatchObject({ kind: 'move', string: 6, delta: -3 })
  })

  test('piano: empareja notas movidas', () => {
    const C = buildChord({ root: 'C', quality: 'maj' })
    const Am = buildChord({ root: 'A', quality: 'm' })
    const pa = allPositions(C, 'piano', 0)[0]
    const pb = allPositions(Am, 'piano', 0)[0]
    const d = describeChange(C, pa, Am, pb, 'piano', 0)
    expect(d.items.every((i) => i.string === null)).toBe(true)
    expect(d.items.some((i) => i.kind === 'move')).toBe(true)
  })
})
