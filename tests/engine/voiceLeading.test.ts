import { describe, expect, test } from 'vitest'
import golden from '../golden/artifact.json'
import { buildChord } from '../../src/engine/chords'
import type { InstrumentId } from '../../src/engine/instruments'
import { PRESETS, diatonic } from '../../src/engine/keys'
import type { Mode } from '../../src/engine/keys'
import { allPositions, positionKey } from '../../src/engine/positions'
import { chainVoicings, moveCost } from '../../src/engine/voiceLeading'

describe('voiceLeading', () => {
  test.each(Object.keys(golden.chains))('encadenado %s = artifact', (key) => {
    const [inst, tonic, mode, id] = key.split('|')
    const preset = PRESETS[mode as Mode].find((p) => p.id === id)!
    const D = diatonic({ tonic, mode: mode as Mode }, 'triads')
    const chords = preset.degrees.map((d) => buildChord(D[d].spec))
    const chain = chainVoicings(chords, inst as InstrumentId, 0)
    expect(chain.map(positionKey)).toEqual((golden.chains as Record<string, string[]>)[key])
  })

  test('moveCost de una posición consigo misma', () => {
    const p = allPositions(buildChord({ root: 'G', quality: 'maj' }), 'guitar', 0)[0]
    expect(moveCost(p, p)).toBeCloseTo(p.kind === 'frets' ? p.score * 0.15 : 0)
  })
})
