import { PRESETS, diatonic } from '../../engine'
import type { ChordSet, ChordSpec, KeySpec, PresetProgression, TimeSignature } from '../../engine'
import type { SavedProgression } from '../../state/store'

/** Qué debe practicar la pantalla Practicar al abrirse (traspaso entre pantallas). */
export type PracticeSource =
  | { kind: 'manual'; chords: ChordSpec[] }
  | { kind: 'preset'; key: KeySpec; presetId: PresetProgression['id']; chordSet: ChordSet }
  | { kind: 'saved'; id: string }

let pending: PracticeSource | null = null

export function setPendingPracticeSource(s: PracticeSource): void {
  pending = s
}

/** Devuelve el traspaso pendiente y lo consume. */
export function takePendingPracticeSource(): PracticeSource | null {
  const s = pending
  pending = null
  return s
}

export interface SourceChords {
  chords: ChordSpec[]
  /** Solo en las guardadas: su compás, BPM y duración (tiempos) de cada acorde. */
  ts?: TimeSignature
  bpm?: number
  beats?: number[]
  name?: string
}

/** Acordes de una fuente. Un preset desconocido o una guardada que ya no existe dan `chords: []`. */
export function sourceChords(src: PracticeSource, progressions: SavedProgression[]): SourceChords {
  if (src.kind === 'manual') return { chords: src.chords }
  if (src.kind === 'preset') {
    const pre = PRESETS[src.key.mode].find((p) => p.id === src.presetId)
    const dia = diatonic(src.key, src.chordSet)
    return { chords: pre ? pre.degrees.map((d) => dia[d].spec) : [] }
  }
  const p = progressions.find((x) => x.id === src.id)
  if (!p) return { chords: [] }
  return { chords: p.items.map((i) => i.chord), ts: p.timeSignature, bpm: p.bpm, beats: p.items.map((i) => i.beats), name: p.name }
}
