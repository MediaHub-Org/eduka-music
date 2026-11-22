import type { ChordSet, ChordSpec, Direction, InstrumentId, KeySpec, Notation, ProgressionItem, Ramp, TimeSignature } from '../engine'

export interface Settings {
  lang: 'es' | 'en'
  notation: Notation
  capo: number
  leftHanded: boolean
  labels: 'notes' | 'intervals'
}
export interface Current {
  instrument: InstrumentId
  key: KeySpec
  chordSet: ChordSet
  chord: ChordSpec
  positionKey: string | null
  direction: Direction
}
export interface Favorite {
  id: string
  chord: ChordSpec
  instrument: InstrumentId
  capo: number
  positionKey: string
  createdAt: number
}
export interface SavedProgression {
  id: string
  name: string
  timeSignature: TimeSignature
  items: ProgressionItem[]
  bpm: number
  createdAt: number
  updatedAt: number
}
export interface PracticePrefs {
  clickOn: boolean
  clickVolume: number
  chordOn: boolean
  chordVolume: number
  countInBars: 0 | 1 | 2
  barsPerChord: 1 | 2 | 4
  ramp: Ramp
}

export interface AppState {
  settings: Settings
  current: Current
  favorites: Favorite[]
  progressions: SavedProgression[]
  practice: PracticePrefs
  setSettings(p: Partial<Settings>): void
  setInstrument(i: InstrumentId): void
  setKey(k: KeySpec): void
  setChordSet(s: ChordSet): void
  selectChord(spec: ChordSpec, positionKey?: string | null): void
  setPositionKey(k: string | null): void
  setDirection(d: Direction): void
  toggleFavorite(f: Omit<Favorite, 'id' | 'createdAt'>): void
  saveProgression(p: Omit<SavedProgression, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): string
  deleteProgression(id: string): void
  moveProgression(id: string, toIndex: number): void
  setPracticePrefs(p: Partial<PracticePrefs>): void
}

export type PersistedState = Pick<AppState, 'settings' | 'current' | 'favorites' | 'progressions' | 'practice'>

export const STORE_NAME = 'eduka-music'
export const STORE_VERSION = 1

export function defaultData(): PersistedState {
  return {
    settings: { lang: 'es', notation: 'latin', capo: 0, leftHanded: false, labels: 'notes' },
    current: {
      instrument: 'guitar',
      key: { tonic: 'G', mode: 'maj' },
      chordSet: 'sevenths',
      chord: { root: 'E', quality: 'm7' },
      positionKey: 'x,x,5,7,5,7',
      direction: 'down',
    },
    favorites: [],
    progressions: [],
    practice: {
      clickOn: true,
      clickVolume: 0.8,
      chordOn: true,
      chordVolume: 0.6,
      countInBars: 1,
      barsPerChord: 1,
      ramp: { enabled: false, step: 5, everyLoops: 4, max: 160 },
    },
  }
}


