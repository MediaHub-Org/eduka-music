import { useMemo } from 'react'
import type { Chord, ChordSpec, Direction, InstrumentId, KeyPosition, Position } from '../engine'
import { INSTRUMENTS, allPositions, buildChord, nearestPosition, nextChord, positionKey, sameChord, stepPositions } from '../engine'
import type { AppState } from './store'
import { useStore } from './store'

export const selectIsFavorite =
  (chord: ChordSpec, positionKey: string | null) =>
  (s: AppState): boolean =>
    positionKey !== null &&
    s.favorites.some(
      (f) =>
        sameChord(f.chord, chord) &&
        f.instrument === s.current.instrument &&
        f.capo === s.settings.capo &&
        f.positionKey === positionKey,
    )

export const selectProgression =
  (id: string) =>
  (s: AppState) =>
    s.progressions.find((p) => p.id === id)

export const selectNotation = (s: AppState) => s.settings.notation
export const selectLang = (s: AppState) => s.settings.lang

/** La cejilla solo cuenta en instrumentos de cuerda. */
export const effectiveCapo = (inst: InstrumentId, capo: number): number => (INSTRUMENTS[inst].kind === 'piano' ? 0 : capo)
export const selectCapo = (s: AppState): number => effectiveCapo(s.current.instrument, s.settings.capo)

/**
 * Busca la posición guardada por su clave. En piano el voicing más cercano puede estar
 * desplazado una octava respecto a `allPositions`, así que se prueban ±12.
 */
export function resolvePosition(c: Chord, inst: InstrumentId, capo: number, key: string | null): Position | null {
  if (key === null) return null
  const all = allPositions(c, inst, capo)
  const hit = all.find((p) => positionKey(p) === key)
  if (hit || INSTRUMENTS[inst].kind !== 'piano') return hit ?? null
  for (const p of all as KeyPosition[])
    for (const o of [-12, 12]) {
      const notes = p.notes.map((m) => m + o)
      if (notes.join(',') === key) return { ...p, notes }
    }
  return null
}

/** `stepPositions` + la seleccionada si no está entre ellas (p. ej. la más cercana al acorde anterior). */
export function positionListFor(c: Chord, inst: InstrumentId, capo: number, key: string | null): Position[] {
  const top = stepPositions(c, inst, capo)
  const sel = resolvePosition(c, inst, capo, key)
  if (!sel || top.some((p) => positionKey(p) === key)) return top
  return [...top, sel]
}

/** Índice de la posición seleccionada en la lista (0 si no hay clave o no se encuentra). */
export function selectedIndex(list: Position[], key: string | null): number {
  const i = key === null ? -1 : list.findIndex((p) => positionKey(p) === key)
  return i < 0 ? 0 : i
}

/** Posición seleccionada a partir del estado (para acciones fuera de React). */
export function selectedPositionOf(s: AppState): Position | null {
  const { instrument, chord, positionKey: key } = s.current
  const capo = selectCapo(s)
  const list = positionListFor(buildChord(chord), instrument, capo, key)
  return list[selectedIndex(list, key)] ?? null
}

export function useCurrentChord(): Chord {
  const spec = useStore((s) => s.current.chord)
  return useMemo(() => buildChord(spec), [spec])
}

export function usePositionList(): Position[] {
  const chord = useCurrentChord()
  const inst = useStore((s) => s.current.instrument)
  const capo = useStore(selectCapo)
  const key = useStore((s) => s.current.positionKey)
  return useMemo(() => positionListFor(chord, inst, capo, key), [chord, inst, capo, key])
}

export function useSelectedIndex(): number {
  const list = usePositionList()
  const key = useStore((s) => s.current.positionKey)
  return selectedIndex(list, key)
}

export function useSelectedPosition(): Position | null {
  const list = usePositionList()
  const i = useSelectedIndex()
  return list[i] ?? null
}

export interface NextInfo {
  spec: ChordSpec
  dir: Direction
  inKey: boolean
  position: Position | null
}

export function useNext(): NextInfo {
  const spec = useStore((s) => s.current.chord)
  const key = useStore((s) => s.current.key)
  const set = useStore((s) => s.current.chordSet)
  const dir = useStore((s) => s.current.direction)
  const inst = useStore((s) => s.current.instrument)
  const capo = useStore(selectCapo)
  const from = useSelectedPosition()
  return useMemo(() => {
    const n = nextChord(spec, key, set, dir)
    const position = nearestPosition(from, buildChord(n.spec), inst, capo)
    return { spec: n.spec, dir: n.dir, inKey: n.inKey, position }
  }, [spec, key, set, dir, inst, capo, from])
}
