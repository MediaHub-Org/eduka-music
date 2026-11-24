import type { StateStorage } from 'zustand/middleware'
import { INSTRUMENT_ORDER, QUALITY } from '../engine'
import type { AppState, Current, Favorite, PersistedState, PracticePrefs, SavedProgression, Settings } from './types'
import { STORE_VERSION } from './types'

/** localStorage que nunca lanza: JSON corrupto o almacenamiento roto → null (valores por defecto). */
export function safeStorage(): StateStorage {
  return {
    getItem: (name) => {
      try {
        const v = localStorage.getItem(name)
        if (v === null) return null
        JSON.parse(v)
        return v
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, value)
      } catch {
        /* cuota o almacenamiento bloqueado */
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name)
      } catch {
        /* nada */
      }
    },
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isNote = (v: unknown): boolean => typeof v === 'string' && /^[A-G][#b]?$/.test(v)
const isQuality = (v: unknown): boolean => typeof v === 'string' && Object.hasOwn(QUALITY, v)
const isInstrument = (v: unknown): boolean => typeof v === 'string' && (INSTRUMENT_ORDER as string[]).includes(v)
const TIME_SIGNATURES = ['4/4', '3/4', '6/8']
const isChord = (c: unknown): boolean =>
  isObj(c) && isNote(c.root) && isQuality(c.quality) && (c.bass === undefined || isNote(c.bass))
const isFav = (f: unknown): boolean =>
  isObj(f) && typeof f.id === 'string' && isChord(f.chord) && isInstrument(f.instrument) &&
  isNum(f.capo) && Number.isInteger(f.capo) && f.capo >= 0 && f.capo <= 7 &&
  typeof f.positionKey === 'string' && isNum(f.createdAt)
const isProg = (p: unknown): boolean =>
  isObj(p) && typeof p.id === 'string' && typeof p.name === 'string' &&
  typeof p.timeSignature === 'string' && TIME_SIGNATURES.includes(p.timeSignature) &&
  isNum(p.bpm) && p.bpm > 0 && isNum(p.createdAt) && isNum(p.updatedAt) &&
  Array.isArray(p.items) && p.items.every((i) => isObj(i) && isChord(i.chord) && isNum(i.beats) && i.beats > 0)

function cleanSettings(s: unknown): Partial<Settings> | null {
  if (!isObj(s)) return null
  const out: Partial<Settings> = {}
  if (s.lang === 'es' || s.lang === 'en') out.lang = s.lang
  if (s.notation === 'latin' || s.notation === 'english') out.notation = s.notation
  if (isNum(s.capo)) out.capo = Math.min(7, Math.max(0, Math.round(s.capo)))
  if (typeof s.leftHanded === 'boolean') out.leftHanded = s.leftHanded
  if (s.labels === 'notes' || s.labels === 'intervals') out.labels = s.labels
  if (s.theme === 'auto' || s.theme === 'light' || s.theme === 'dark') out.theme = s.theme
  if (typeof s.useKey === 'boolean') out.useKey = s.useKey
  return out
}

function cleanCurrent(c: unknown): Partial<Current> {
  const out: Partial<Current> = {}
  if (!isObj(c)) return out
  if (isInstrument(c.instrument)) out.instrument = c.instrument as Current['instrument']
  if (isObj(c.key) && isNote(c.key.tonic) && (c.key.mode === 'maj' || c.key.mode === 'min'))
    out.key = { tonic: c.key.tonic as string, mode: c.key.mode }
  if (c.chordSet === 'triads' || c.chordSet === 'sevenths') out.chordSet = c.chordSet
  if (isChord(c.chord)) out.chord = c.chord as Current['chord']
  if (c.positionKey === null || typeof c.positionKey === 'string') out.positionKey = c.positionKey
  if (c.direction === 'down' || c.direction === 'up' || c.direction === 'step' || c.direction === 'variant')
    out.direction = c.direction
  return out
}

function cleanPractice(p: unknown): Partial<PracticePrefs> {
  const out: Partial<PracticePrefs> = {}
  if (!isObj(p)) return out
  const vol = (v: unknown): v is number => isNum(v) && v >= 0 && v <= 1
  if (typeof p.clickOn === 'boolean') out.clickOn = p.clickOn
  if (typeof p.chordOn === 'boolean') out.chordOn = p.chordOn
  if (vol(p.clickVolume)) out.clickVolume = p.clickVolume
  if (vol(p.chordVolume)) out.chordVolume = p.chordVolume
  if (p.countInBars === 0 || p.countInBars === 1 || p.countInBars === 2) out.countInBars = p.countInBars
  if (p.barsPerChord === 1 || p.barsPerChord === 2 || p.barsPerChord === 4) out.barsPerChord = p.barsPerChord
  if (isObj(p.ramp)) {
    const r = p.ramp
    const ramp: Partial<PracticePrefs['ramp']> = {}
    if (typeof r.enabled === 'boolean') ramp.enabled = r.enabled
    if (isNum(r.step) && r.step > 0) ramp.step = r.step
    if (isNum(r.everyLoops) && r.everyLoops > 0) ramp.everyLoops = r.everyLoops
    if (isNum(r.max) && r.max > 0) ramp.max = r.max
    out.ramp = ramp as PracticePrefs['ramp']
  }
  return out
}

/** Migración del esquema: solo existe la v1. Una versión desconocida lanza → onRehydrateStorage restablece. */
export function migrateState(persisted: unknown, version: number): PersistedState {
  if (version !== STORE_VERSION) throw new Error(`unsupported persisted version ${version}`)
  return persisted as PersistedState
}

/** Mezcla lo guardado sobre los valores por defecto, validando por trozo: lo inválido vuelve al valor por defecto. */
export function mergePersisted(persisted: unknown, base: PersistedState): PersistedState {
  if (!isObj(persisted)) return base
  const list = <T>(v: unknown, ok: (x: unknown) => boolean): T[] => (Array.isArray(v) ? (v.filter(ok) as T[]) : [])
  const practice = { ...base.practice, ...cleanPractice(persisted.practice) }
  practice.ramp = { ...base.practice.ramp, ...(cleanPractice(persisted.practice).ramp ?? {}) }
  return {
    settings: { ...base.settings, ...(cleanSettings(persisted.settings) ?? {}) },
    current: { ...base.current, ...cleanCurrent(persisted.current) },
    favorites: list<Favorite>(persisted.favorites, isFav),
    progressions: list<SavedProgression>(persisted.progressions, isProg),
    practice,
  }
}

export interface ImportData {
  favorites: Favorite[]
  progressions: SavedProgression[]
  settings?: Partial<Settings>
}

export type ImportError = 'invalid_json' | 'wrong_app' | 'unsupported_version' | 'invalid_shape'
export function exportData(s: Pick<AppState, 'favorites' | 'progressions' | 'settings'>): string {
  return JSON.stringify(
    {
      app: 'eduka-music',
      version: STORE_VERSION,
      exportedAt: new Date().toISOString(),
      favorites: s.favorites,
      progressions: s.progressions,
      settings: s.settings,
    },
    null,
    2,
  )
}

export function parseImport(json: string): { ok: true; data: ImportData } | { ok: false; error: ImportError } {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, error: 'invalid_json' }
  }
  if (!isObj(raw) || raw.app !== 'eduka-music') return { ok: false, error: 'wrong_app' }
  if (raw.version !== STORE_VERSION) return { ok: false, error: 'unsupported_version' }
  if (!Array.isArray(raw.favorites) || !raw.favorites.every(isFav)) return { ok: false, error: 'invalid_shape' }
  if (!Array.isArray(raw.progressions) || !raw.progressions.every(isProg)) return { ok: false, error: 'invalid_shape' }
  const data: ImportData = { favorites: raw.favorites as Favorite[], progressions: raw.progressions as SavedProgression[] }
  if (raw.settings !== undefined) {
    const s = cleanSettings(raw.settings)
    if (!s) return { ok: false, error: 'invalid_shape' }
    data.settings = s
  }
  return { ok: true, data }
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(incoming.map((x) => [x.id, x]))
  const seen = new Set<string>()
  const out = existing.map((x) => {
    seen.add(x.id)
    return byId.get(x.id) ?? x
  })
  for (const x of incoming) if (!seen.has(x.id)) (seen.add(x.id), out.push(x))
  return out
}

export function applyImport(
  state: Pick<AppState, 'favorites' | 'progressions' | 'settings'>,
  data: ImportData,
): Pick<AppState, 'favorites' | 'progressions' | 'settings'> {
  return {
    favorites: mergeById(state.favorites, data.favorites),
    progressions: mergeById(state.progressions, data.progressions),
    settings: { ...state.settings, ...data.settings },
  }
}





