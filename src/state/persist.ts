import type { StateStorage } from 'zustand/middleware'
import type { AppState, Favorite, PersistedState, SavedProgression, Settings } from './store'
import { STORE_VERSION } from './store'

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

/** Migración del esquema: solo existe la v1. Una versión desconocida lanza → onRehydrateStorage restablece. */
export function migrateState(persisted: unknown, version: number): PersistedState {
  if (version !== STORE_VERSION) throw new Error(`unsupported persisted version ${version}`)
  return persisted as PersistedState
}

/** Mezcla lo guardado sobre los valores por defecto, ignorando lo que no tenga la forma esperada. */
export function mergePersisted(persisted: unknown, base: PersistedState): PersistedState {
  if (!isObj(persisted)) return base
  const pick = <T extends object>(k: string, dflt: T): T =>
    isObj(persisted[k]) ? { ...dflt, ...(persisted[k] as Partial<T>) } : dflt
  const arr = <T>(k: string, dflt: T[]): T[] => (Array.isArray(persisted[k]) ? (persisted[k] as T[]) : dflt)
  return {
    settings: pick('settings', base.settings),
    current: pick('current', base.current),
    favorites: arr('favorites', base.favorites),
    progressions: arr('progressions', base.progressions),
    practice: pick('practice', base.practice),
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

const isChord = (c: unknown): boolean => isObj(c) && typeof c.root === 'string' && typeof c.quality === 'string'
const isFav = (f: unknown): boolean =>
  isObj(f) && typeof f.id === 'string' && isChord(f.chord) && typeof f.instrument === 'string' &&
  typeof f.capo === 'number' && typeof f.positionKey === 'string' && typeof f.createdAt === 'number'
const isProg = (p: unknown): boolean =>
  isObj(p) && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.timeSignature === 'string' &&
  typeof p.bpm === 'number' && typeof p.createdAt === 'number' && typeof p.updatedAt === 'number' &&
  Array.isArray(p.items) && p.items.every((i) => isObj(i) && isChord(i.chord) && typeof i.beats === 'number')

function cleanSettings(s: unknown): Partial<Settings> | null {
  if (!isObj(s)) return null
  const out: Partial<Settings> = {}
  if (s.lang === 'es' || s.lang === 'en') out.lang = s.lang
  if (s.notation === 'latin' || s.notation === 'english') out.notation = s.notation
  if (typeof s.capo === 'number') out.capo = Math.min(7, Math.max(0, Math.round(s.capo)))
  if (typeof s.leftHanded === 'boolean') out.leftHanded = s.leftHanded
  if (s.labels === 'notes' || s.labels === 'intervals') out.labels = s.labels
  return out
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


