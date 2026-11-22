import { sameChord } from '../engine'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { mergePersisted, migrateState, safeStorage } from './persist'
import { STORE_NAME, STORE_VERSION, defaultData } from './types'
import type { AppState, Favorite, PersistedState, SavedProgression } from './types'

export { STORE_NAME, STORE_VERSION, defaultData }
export type { AppState, Current, Favorite, PersistedState, PracticePrefs, SavedProgression, Settings } from './types'
const clampCapo = (n: number): number => (Number.isFinite(n) ? Math.min(7, Math.max(0, Math.round(n))) : 0)
const uuid = (): string => crypto.randomUUID()

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...defaultData(),
      setSettings: (p) =>
        set((s) => {
          const settings = { ...s.settings, ...p, capo: clampCapo(p.capo ?? s.settings.capo) }
          const capoChanged = settings.capo !== s.settings.capo
          return { settings, current: capoChanged ? { ...s.current, positionKey: null } : s.current }
        }),
      setInstrument: (instrument) => set((s) => ({ current: { ...s.current, instrument, positionKey: null } })),
      setKey: (key) => set((s) => ({ current: { ...s.current, key } })),
      setChordSet: (chordSet) => set((s) => ({ current: { ...s.current, chordSet } })),
      selectChord: (chord, positionKey = null) => set((s) => ({ current: { ...s.current, chord, positionKey } })),
      setPositionKey: (positionKey) => set((s) => ({ current: { ...s.current, positionKey } })),
      setDirection: (direction) => set((s) => ({ current: { ...s.current, direction } })),
      toggleFavorite: (f) =>
        set((s) => {
          const same = (x: Favorite): boolean =>
            sameChord(x.chord, f.chord) && x.instrument === f.instrument && x.capo === f.capo && x.positionKey === f.positionKey
          return s.favorites.some(same)
            ? { favorites: s.favorites.filter((x) => !same(x)) }
            : { favorites: [...s.favorites, { ...f, id: uuid(), createdAt: Date.now() }] }
        }),
      saveProgression: (p) => {
        const now = Date.now()
        const existing = p.id ? get().progressions.find((x) => x.id === p.id) : undefined
        const id = existing?.id ?? p.id ?? uuid()
        const saved: SavedProgression = {
          name: p.name,
          timeSignature: p.timeSignature,
          items: p.items,
          bpm: p.bpm,
          id,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        set((s) => ({
          progressions: existing ? s.progressions.map((x) => (x.id === id ? saved : x)) : [...s.progressions, saved],
        }))
        return id
      },
      deleteProgression: (id) => set((s) => ({ progressions: s.progressions.filter((x) => x.id !== id) })),
      moveProgression: (id, toIndex) =>
        set((s) => {
          const from = s.progressions.findIndex((x) => x.id === id)
          if (from < 0) return {}
          const list = [...s.progressions]
          const [it] = list.splice(from, 1)
          list.splice(Math.min(Math.max(toIndex, 0), list.length), 0, it)
          return { progressions: list }
        }),
      setPracticePrefs: (p) => set((s) => ({ practice: { ...s.practice, ...p } })),
    }),
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      storage: createJSONStorage(() => safeStorage()),
      partialize: (s): PersistedState => ({
        settings: s.settings,
        current: s.current,
        favorites: s.favorites,
        progressions: s.progressions,
        practice: s.practice,
      }),
      migrate: migrateState,
      merge: (persisted, current) => ({ ...current, ...mergePersisted(persisted, defaultData()) }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) useStore.setState(defaultData())
      },
    },
  ),
)

/** Test helper: vuelve a los valores por defecto y borra lo guardado. */
export function resetStore(): void {
  useStore.setState(defaultData())
  try {
    localStorage.removeItem(STORE_NAME)
  } catch {
    /* sin almacenamiento */
  }
}

