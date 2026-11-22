import { beforeEach, describe, expect, test, vi } from 'vitest'
import { resetStore, useStore, STORE_NAME } from '../../src/state/store'
import { applyImport, exportData, parseImport } from '../../src/state/persist'

beforeEach(() => {
  vi.restoreAllMocks()
  resetStore()
})

describe('rehidratación', () => {
  test('localStorage corrupto → valores por defecto', async () => {
    useStore.getState().setInstrument('piano')
    localStorage.setItem(STORE_NAME, '{no json')
    await useStore.persist.rehydrate()
    expect(useStore.getState().current.instrument).toBe('guitar')
  })
  test('versión futura → valores por defecto sin lanzar', async () => {
    useStore.getState().setInstrument('piano')
    localStorage.setItem(STORE_NAME, JSON.stringify({ version: 9, state: { current: { instrument: 'piano' } } }))
    await useStore.persist.rehydrate()
    expect(useStore.getState().current.instrument).toBe('guitar')
  })
  test('almacenamiento que lanza → defaults', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await expect(useStore.persist.rehydrate()).resolves.not.toThrow()
    expect(useStore.getState().current.instrument).toBe('guitar')
  })
  test('setItem que lanza no rompe las acciones', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => useStore.getState().setSettings({ lang: 'en' })).not.toThrow()
    expect(useStore.getState().settings.lang).toBe('en')
  })
  test('datos válidos guardados se restauran', async () => {
    localStorage.setItem(STORE_NAME, JSON.stringify({ version: 1, state: { settings: { lang: 'en' } } }))
    await useStore.persist.rehydrate()
    expect(useStore.getState().settings.lang).toBe('en')
    expect(useStore.getState().settings.notation).toBe('latin')
  })
})

describe('export / import', () => {
  const prog = { name: 'P', timeSignature: '4/4' as const, items: [{ chord: { root: 'C', quality: 'maj' as const }, beats: 4 }], bpm: 100 }
  test('ida y vuelta', () => {
    useStore.getState().saveProgression(prog)
    useStore.getState().toggleFavorite({ chord: { root: 'C', quality: 'maj' }, instrument: 'guitar', capo: 0, positionKey: 'k' })
    const state = useStore.getState()
    const r = parseImport(exportData(state))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const empty = { favorites: [], progressions: [], settings: state.settings }
    const out = applyImport(empty, r.data)
    expect(out.progressions).toEqual(state.progressions)
    expect(out.favorites).toEqual(state.favorites)
  })
  test('combina por id: el importado sustituye', () => {
    const id = useStore.getState().saveProgression(prog)
    const state = useStore.getState()
    const incoming = { ...state.progressions[0], name: 'Nuevo' }
    const out = applyImport(state, { favorites: [], progressions: [incoming, { ...incoming, id: 'otro' }] })
    expect(out.progressions.map((p) => [p.id, p.name])).toEqual([[id, 'Nuevo'], ['otro', 'Nuevo']])
  })
  test('errores', () => {
    expect(parseImport('xx')).toEqual({ ok: false, error: 'invalid_json' })
    expect(parseImport('[]')).toEqual({ ok: false, error: 'wrong_app' })
    expect(parseImport('{"app":"eduka-music","version":1,"favorites":3,"progressions":[]}')).toEqual({ ok: false, error: 'invalid_shape' })
  })
})

