import type { Chord } from './chords'
import type { InstrumentId } from './instruments'
import { INSTRUMENTS } from './instruments'
import type { KeyPosition, Position } from './positions'
import { allPositions, topPositions } from './positions'

export function moveCost(a: Position, b: Position): number {
  if (a.kind === 'keys' && b.kind === 'keys') {
    let c = 0
    for (const m of a.notes) c += Math.min(...b.notes.map((x) => Math.abs(x - m)))
    for (const m of b.notes) c += Math.min(...a.notes.map((x) => Math.abs(x - m)))
    return c
  }
  if (a.kind === 'frets' && b.kind === 'frets') {
    let c = 0
    a.frets.forEach((f, s) => {
      const g = b.frets[s]
      if (f == null && g == null) return
      if (f == null || g == null) c += 4
      else c += Math.abs(f - g)
    })
    return c + b.score * 0.15
  }
  throw new Error('moveCost: positions of different instrument kinds')
}

/** `pianoNext` del artifact: voicing de piano más cercano, probando octavas -12/0/+12 dentro de 40..84. */
function pianoNext(from: KeyPosition, c: Chord): Position {
  let best: KeyPosition | null = null
  let bc = 1e9
  for (const p of allPositions(c, 'piano', 0) as KeyPosition[])
    for (const o of [-12, 0, 12]) {
      const notes = p.notes.map((m) => m + o)
      if (notes[0] < 40 || notes[notes.length - 1] > 84) continue
      const q: KeyPosition = { ...p, notes }
      const v = moveCost(from, q)
      if (v < bc) {
        bc = v
        best = q
      }
    }
  return best ?? allPositions(c, 'piano', 0)[0]
}

export function nearestPosition(from: Position | null, c: Chord, inst: InstrumentId, capo: number): Position {
  const list = allPositions(c, inst, capo)
  if (!from) return list[0]
  if (INSTRUMENTS[inst].kind === 'piano') return pianoNext(from as KeyPosition, c)
  let bi = 0
  let bc = 1e9
  list.forEach((p, i) => {
    const v = moveCost(from, p)
    if (v < bc) {
      bc = v
      bi = i
    }
  })
  return list[bi]
}

/**
 * Un voicing por acorde, cada uno el más cercano al anterior. `start` es la posición de la que
 * se parte (p. ej. la actual); sin ella el primer acorde usa su mejor posición (`topPositions[0]`).
 */
export function chainVoicings(chords: Chord[], inst: InstrumentId, capo: number, start?: Position): Position[] {
  const out: Position[] = []
  let prev: Position | null = start ?? null
  chords.forEach((c, i) => {
    const p = i === 0 && !start ? topPositions(c, inst, capo)[0] : nearestPosition(prev, c, inst, capo)
    out.push(p)
    prev = p
  })
  return out
}
