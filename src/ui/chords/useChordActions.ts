import { useMemo } from 'react'
import type { ChordSpec, KeySpec, Position } from '../../engine'
import { buildChord, diatonic, nearestPosition, nextChord, pcOf, positionKey, previousChord } from '../../engine'
import { playPositions } from '../../audio/synth'
import { positionListFor, selectCapo, selectedIndex, selectedPositionOf } from '../../state/selectors'
import { useStore } from '../../state/store'

/** Toca posiciones sin romper nunca la interfaz si no hay audio. */
export function play(ps: (Position | null)[], gap?: number): void {
  const list = ps.filter((p): p is Position => p !== null)
  if (!list.length) return
  const s = useStore.getState()
  try {
    playPositions(list, { inst: s.current.instrument, capo: selectCapo(s), gap })
  } catch {
    /* sin audio */
  }
}

/**
 * Acciones de la pantalla Acordes (= goTo y eventos del artifact). Leen el estado en el
 * momento de la llamada para no depender de renders.
 */
export function chordActions() {
  const st = () => useStore.getState()

  /** Cambia de acorde con el voicing más cercano al actual (o `pos` si se da) y lo toca. */
  const goTo = (spec: ChordSpec, pos?: Position | null) => {
    const s = st()
    const p = pos !== undefined ? pos : nearestPosition(selectedPositionOf(s), buildChord(spec), s.current.instrument, selectCapo(s))
    s.selectChord(spec, p ? positionKey(p) : null)
    play([p])
  }

  /** Acorde buscado: su mejor posición (índice 0), como un acorde nuevo. */
  const pickBest = (spec: ChordSpec) => {
    const s = st()
    s.selectChord(spec, null)
    play([positionListFor(buildChord(spec), s.current.instrument, selectCapo(s), null)[0] ?? null])
  }

  /** Avanza (+1) o retrocede (-1) en la lista de posiciones y la toca. */
  const stepPosition = (d: 1 | -1) => {
    const s = st()
    const { chord, instrument, positionKey: key } = s.current
    const list = positionListFor(buildChord(chord), instrument, selectCapo(s), key)
    if (!list.length) return
    const i = (selectedIndex(list, key) + d + list.length) % list.length
    s.setPositionKey(positionKey(list[i]))
    play([list[i]])
  }

  const listen = () => play([selectedPositionOf(st())])

  const next = () => {
    const { chord, key, chordSet, direction } = st().current
    goTo(nextChord(chord, key, chordSet, direction).spec)
  }

  const back = () => {
    const { chord, key, chordSet, direction } = st().current
    goTo(previousChord(chord, key, chordSet, direction))
  }

  const toggleFavorite = () => {
    const s = st()
    const p = selectedPositionOf(s)
    if (!p) return
    s.toggleFavorite({ chord: s.current.chord, instrument: s.current.instrument, capo: s.settings.capo, positionKey: positionKey(p) })
  }

  /** Tríadas ↔ séptimas: si el acorde es diatónico, pasa al mismo grado del otro juego (= switchType). */
  const switchSet = (set: 'triads' | 'sevenths') => {
    const s = st()
    const { chord, key, chordSet } = s.current
    if (set === chordSet) return
    const i = diatonic(key, chordSet).findIndex((d) => pcOf(d.spec.root) === pcOf(chord.root) && d.spec.quality === chord.quality && chord.bass === undefined)
    s.setChordSet(set)
    if (i >= 0) goTo(diatonic(key, set)[i].spec)
  }

  /** Tonalidad sugerida: el acorde no cambia; si solo está en el otro juego (tríadas/7ª), se cambia de juego. */
  const adoptKey = (k: KeySpec) => {
    const s = st()
    const { chord, chordSet } = s.current
    const other = chordSet === 'triads' ? 'sevenths' : 'triads'
    s.setKey(k)
    if (!nextChord(chord, k, chordSet, 'down').inKey && nextChord(chord, k, other, 'down').inKey) s.setChordSet(other)
  }

  return { goTo, pickBest, adoptKey, stepPosition, listen, next, back, toggleFavorite, switchSet }
}

export function useChordActions() {
  return useMemo(chordActions, [])
}
