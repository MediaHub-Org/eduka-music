import { beforeEach, describe, expect, test } from 'vitest'
import { resetStore, useStore, STORE_NAME } from '../../src/state/store'
import { exportData, parseImport } from '../../src/state/persist'

beforeEach(() => resetStore())

describe('store', () => {
  test('estado inicial', () => {
    const s = useStore.getState()
    expect(s.current.chord).toEqual({ root: 'E', quality: 'm7' })
    expect(s.current).toMatchObject({ instrument: 'guitar', positionKey: null, direction: 'down', chordSet: 'sevenths' })
    expect(s.settings).toEqual({ lang: 'es', notation: 'latin', capo: 0, leftHanded: false, labels: 'notes' })
    expect(s.practice.ramp).toEqual({ enabled: false, step: 5, everyLoops: 4, max: 160 })
  })
  test('selectChord conserva bajo y resetea posición', () => {
    useStore.getState().selectChord({ root: 'C', quality: 'maj', bass: 'E' })
    expect(useStore.getState().current).toMatchObject({ chord: { bass: 'E' }, positionKey: null })
  })
  test('setInstrument y capo resetean posición; setKey no toca el acorde', () => {
    const st = useStore.getState()
    st.setPositionKey('x,x,5,7,5,7')
    st.setKey({ tonic: 'C', mode: 'maj' })
    expect(useStore.getState().current.chord).toEqual({ root: 'E', quality: 'm7' })
    expect(useStore.getState().current.positionKey).toBe('x,x,5,7,5,7')
    useStore.getState().setSettings({ capo: 2 })
    expect(useStore.getState().current.positionKey).toBeNull()
    useStore.getState().setPositionKey('a')
    useStore.getState().setInstrument('ukulele')
    expect(useStore.getState().current.positionKey).toBeNull()
  })
  test('toggleFavorite añade y quita por identidad', () => {
    const f = { chord: { root: 'C', quality: 'maj' as const }, instrument: 'guitar' as const, capo: 0, positionKey: 'x,3,2,0,1,0' }
    useStore.getState().toggleFavorite(f)
    expect(useStore.getState().favorites).toHaveLength(1)
    useStore.getState().toggleFavorite({ ...f, capo: 1 })
    expect(useStore.getState().favorites).toHaveLength(2)
    useStore.getState().toggleFavorite(f)
    expect(useStore.getState().favorites).toHaveLength(1)
  })
  test('progresiones: guardar, actualizar, mover, borrar', () => {
    const base = { name: 'A', timeSignature: '4/4' as const, items: [], bpm: 90 }
    const a = useStore.getState().saveProgression(base)
    const b = useStore.getState().saveProgression({ ...base, name: 'B' })
    useStore.getState().saveProgression({ ...base, id: a, name: 'A2' })
    expect(useStore.getState().progressions.map((p) => p.name)).toEqual(['A2', 'B'])
    useStore.getState().moveProgression(b, 0)
    expect(useStore.getState().progressions.map((p) => p.id)).toEqual([b, a])
    useStore.getState().deleteProgression(b)
    expect(useStore.getState().progressions).toHaveLength(1)
  })
  test('persiste ajustes y no las acciones', () => {
    useStore.getState().setSettings({ lang: 'en' })
    const saved = JSON.parse(localStorage.getItem(STORE_NAME)!)
    expect(saved.version).toBe(1)
    expect(saved.state.settings.lang).toBe('en')
    expect(saved.state.setSettings).toBeUndefined()
  })
  test('import inválido no toca datos', () => {
    useStore.getState().toggleFavorite({ chord: { root: 'C', quality: 'maj' }, instrument: 'guitar', capo: 0, positionKey: 'k' })
    expect(parseImport('{"app":"otra"}')).toEqual({ ok: false, error: 'wrong_app' })
    expect(parseImport('{"app":"eduka-music","version":9}')).toMatchObject({ error: 'unsupported_version' })
    expect(useStore.getState().favorites).toHaveLength(1)
    expect(exportData(useStore.getState())).toContain('"eduka-music"')
  })
})
