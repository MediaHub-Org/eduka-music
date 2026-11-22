import type { Chord, Tone } from './chords'
import { toneOf } from './chords'
import type { InstrumentId } from './instruments'
import { INSTRUMENTS } from './instruments'
import type { Position } from './positions'
import { tuningWithCapo } from './positions'

export type ChangeItem =
  | { kind: 'move'; string: number | null; from: Tone; to: Tone; delta: number }
  | { kind: 'add'; string: number | null; tone: Tone }
  | { kind: 'drop'; string: number | null; tone: Tone }

export interface ChangeDescription {
  items: ChangeItem[]
  kept: Tone[]
  /** índices 0-based de cuerda cuya pulsación cambia (vacío en piano) */
  movedStrings: number[]
}

/** Estructura de `drawChange` del artifact. `string` es 1-based desde la más aguda. */
export function describeChange(
  a: Chord,
  pa: Position,
  b: Chord,
  pb: Position,
  inst: InstrumentId,
  capo: number,
): ChangeDescription {
  const kept = a.tones.filter((t) => b.pcs.includes(t.pc))
  const items: ChangeItem[] = []
  const movedStrings: number[] = []
  const def = INSTRUMENTS[inst]

  if (def.kind === 'strings' && pa.kind === 'frets' && pb.kind === 'frets') {
    const T = tuningWithCapo(def, capo)
    const N = T.length
    pa.frets.forEach((f, s) => {
      const g = pb.frets[s]
      if (f === g) return
      movedStrings.push(s)
      if (f == null) items.push({ kind: 'add', string: N - s, tone: toneOf(b, (T[s] + (g as number)) % 12)! })
      else if (g == null) items.push({ kind: 'drop', string: N - s, tone: toneOf(a, (T[s] + f) % 12)! })
      else
        items.push({
          kind: 'move',
          string: N - s,
          from: toneOf(a, (T[s] + f) % 12)!,
          to: toneOf(b, (T[s] + g) % 12)!,
          delta: g - f,
        })
    })
  } else if (pa.kind === 'keys' && pb.kind === 'keys') {
    const out = pa.notes.filter((m) => !pb.notes.includes(m))
    const inn = pb.notes.filter((m) => !pa.notes.includes(m))
    const used: number[] = []
    for (const m of out) {
      const cand = inn.filter((x) => !used.includes(x)).sort((x, y) => Math.abs(x - m) - Math.abs(y - m))[0]
      if (cand == null) {
        items.push({ kind: 'drop', string: null, tone: toneOf(a, m % 12)! })
        continue
      }
      used.push(cand)
      items.push({ kind: 'move', string: null, from: toneOf(a, m % 12)!, to: toneOf(b, cand % 12)!, delta: cand - m })
    }
    for (const m of inn) if (!used.includes(m)) items.push({ kind: 'add', string: null, tone: toneOf(b, m % 12)! })
  }
  return { items, kept, movedStrings }
}
