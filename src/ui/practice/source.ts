import type { ChordSet, ChordSpec, KeySpec, PresetProgression } from '../../engine'

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
