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

const okFav = { id: 'f1', chord: { root: 'C', quality: 'maj' }, instrument: 'guitar', capo: 0, positionKey: 'k', createdAt: 1 }
const okProg = { id: 'p1', name: 'P', timeSignature: '4/4', items: [{ chord: { root: 'C', quality: 'maj' }, beats: 4 }], bpm: 100, createdAt: 1, updatedAt: 1 }
const wrap = (o: object) => JSON.stringify({ app: 'eduka-music', version: 1, favorites: [], progressions: [], ...o })

describe('parseImport validación profunda', () => {
  test('acepta datos válidos (con bajo)', () => {
    const f = { ...okFav, chord: { root: 'C', quality: 'maj', bass: 'E' } }
    expect(parseImport(wrap({ favorites: [f], progressions: [okProg] })).ok).toBe(true)
  })
  const bad: [string, object][] = [
    ['raíz inválida', { favorites: [{ ...okFav, chord: { root: 'Z', quality: 'maj' } }] }],
    ['calidad inválida', { favorites: [{ ...okFav, chord: { root: 'C', quality: 'foo' } }] }],
    ['calidad de prototipo', { favorites: [{ ...okFav, chord: { root: 'C', quality: 'toString' } }] }],
    ['bajo inválido', { favorites: [{ ...okFav, chord: { root: 'C', quality: 'maj', bass: 'H' } }] }],
    ['instrumento inválido', { favorites: [{ ...okFav, instrument: 'banjo' }] }],
    ['capo fuera de rango', { favorites: [{ ...okFav, capo: 9 }] }],
    ['capo NaN', { favorites: [{ ...okFav, capo: null }] }],
    ['compás inválido', { progressions: [{ ...okProg, timeSignature: '5/4' }] }],
    ['bpm no positivo', { progressions: [{ ...okProg, bpm: 0 }] }],
    ['beats inválidos', { progressions: [{ ...okProg, items: [{ chord: { root: 'C', quality: 'maj' }, beats: -1 }] }] }],
    ['bajo inválido en progresión', { progressions: [{ ...okProg, items: [{ chord: { root: 'C', quality: 'maj', bass: 'Q' }, beats: 4 }] }] }],
    ['ajustes no objeto', { settings: 'x' }],
  ]
  test.each(bad)('rechaza %s', (_n, o) => {
    expect(parseImport(wrap(o))).toEqual({ ok: false, error: 'invalid_shape' })
  })
  test('importación inválida no toca el store', () => {
    useStore.getState().toggleFavorite({ chord: { root: 'C', quality: 'maj' }, instrument: 'guitar', capo: 0, positionKey: 'k' })
    const before = useStore.getState().favorites
    const r = parseImport(wrap({ favorites: [{ ...okFav, chord: { root: 'Z', quality: 'maj' } }] }))
    if (r.ok) useStore.setState(applyImport(useStore.getState(), r.data))
    expect(r.ok).toBe(false)
    expect(useStore.getState().favorites).toBe(before)
  })
})

describe('restauración real', () => {
  test('favoritos, progresiones y current sobreviven a rehydrate', async () => {
    const st = useStore.getState()
    st.toggleFavorite({ chord: { root: 'C', quality: 'maj', bass: 'E' }, instrument: 'ukulele', capo: 2, positionKey: 'k1' })
    st.saveProgression({ name: 'X', timeSignature: '3/4', items: [{ chord: { root: 'G', quality: '7' }, beats: 3 }], bpm: 80 })
    st.setInstrument('piano')
    st.selectChord({ root: 'A', quality: 'm' }, 'pk')
    st.setPracticePrefs({ clickVolume: 0.3 })
    const snap = JSON.parse(JSON.stringify({ f: useStore.getState().favorites, p: useStore.getState().progressions, c: useStore.getState().current, pr: useStore.getState().practice }))
    useStore.setState({ favorites: [], progressions: [], current: { ...useStore.getState().current, instrument: 'guitar', positionKey: null } })
    localStorage.setItem(STORE_NAME, JSON.stringify({ version: 1, state: { favorites: snap.f, progressions: snap.p, current: snap.c, practice: snap.pr, settings: useStore.getState().settings } }))
    await useStore.persist.rehydrate()
    const s = useStore.getState()
    expect(s.favorites).toEqual(snap.f)
    expect(s.progressions).toEqual(snap.p)
    expect(s.current).toEqual(snap.c)
    expect(s.practice.clickVolume).toBe(0.3)
  })
  test('forma incorrecta guardada → valores por defecto por trozo', async () => {
    localStorage.setItem(
      STORE_NAME,
      JSON.stringify({
        version: 1,
        state: {
          favorites: 3,
          progressions: [okProg, { ...okProg, id: 'bad', timeSignature: 'x' }],
          current: { chord: 'x', instrument: 'banjo', direction: 'up' },
          settings: { lang: 'xx', notation: 'english', capo: 'a' },
          practice: 'nope',
        },
      }),
    )
    await expect(useStore.persist.rehydrate()).resolves.not.toThrow()
    const s = useStore.getState()
    expect(s.favorites).toEqual([])
    expect(s.progressions.map((p) => p.id)).toEqual(['p1'])
    expect(s.current.chord).toEqual({ root: 'E', quality: 'm7' })
    expect(s.current.instrument).toBe('guitar')
    expect(s.current.direction).toBe('up')
    expect(s.settings).toMatchObject({ lang: 'es', notation: 'english', capo: 0 })
    expect(s.practice.clickOn).toBe(true)
  })
  test('capo NaN → 0', () => {
    useStore.getState().setSettings({ capo: Number.NaN })
    expect(useStore.getState().settings.capo).toBe(0)
  })
})
