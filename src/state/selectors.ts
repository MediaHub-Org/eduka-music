import type { ChordSpec } from '../engine'
import { sameChord } from '../engine'
import type { AppState } from './store'

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
