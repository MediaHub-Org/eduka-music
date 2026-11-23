import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import { resetStore, useStore } from '../../src/state/store'
import type { ChordSpec, ProgressionItem } from '../../src/engine'
import { setPendingPracticeSource, sourceChords, takePendingPracticeSource } from '../../src/ui/practice/source'
import { useWakeLock } from '../../src/ui/practice/useWakeLock'
import { usePractice } from '../../src/ui/practice/usePractice'
import * as synth from '../../src/audio/synth'

vi.mock('../../src/audio/synth', () => ({ playClick: vi.fn(), playPositions: vi.fn() }))

const G: ChordSpec = { root: 'G', quality: 'maj' }
const Cc: ChordSpec = { root: 'C', quality: 'maj' }

beforeEach(() => {
  resetStore()
  takePendingPracticeSource()
  vi.mocked(synth.playClick).mockClear()
  vi.mocked(synth.playPositions).mockClear()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  delete (navigator as unknown as Record<string, unknown>).wakeLock
})

const setVisibility = (v: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { value: v, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })

describe('useWakeLock', () => {
  test('wake lock: se pide al iniciar y se vuelve a pedir al volver a visible', async () => {
    const release = vi.fn().mockResolvedValue(undefined)
    const request = vi.fn().mockResolvedValue({ release, addEventListener: vi.fn() })
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    const { rerender } = renderHook(({ on }) => useWakeLock(on), { initialProps: { on: true } })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('screen')
    await flush()
    setVisibility('hidden')
    setVisibility('visible')
    await flush()
    expect(request).toHaveBeenCalledTimes(2)
    rerender({ on: false })
    expect(release).toHaveBeenCalled()
    setVisibility('visible')
    await flush()
    expect(request).toHaveBeenCalledTimes(2)
  })

  test('sin wakeLock en navigator no lanza', () => {
    expect('wakeLock' in navigator).toBe(false)
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()
  })

  test('si request rechaza no lanza', async () => {
    const request = vi.fn().mockRejectedValue(new Error('NotAllowed'))
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    renderHook(() => useWakeLock(true))
    await flush()
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe('usePractice', () => {
  // reloj falso: segundos de Date.now (falso) y temporizadores falsos de vitest
  const clock = { now: () => Date.now() / 1000, setTimer: (f: () => void, ms: number) => setTimeout(f, ms), clearTimer: (h: unknown) => clearTimeout(h as number) }
  const items: ProgressionItem[] = [{ chord: G, beats: 4 }, { chord: Cc, beats: 4 }]
  const advance = (sec: number) => act(() => { vi.advanceTimersByTime(sec * 1000) })

  test('usePractice avanza index en cada evento chord (scheduler con reloj falso)', () => {
    vi.useFakeTimers()
    useStore.getState().setPracticePrefs({ countInBars: 1, clickOn: true, chordOn: true, chordVolume: 0.5, clickVolume: 0.7 })
    const { result } = renderHook(() => usePractice(items, '4/4', 120, clock))
    expect(result.current.running).toBe(false)
    const t0 = clock.now()
    act(() => result.current.start())
    expect(result.current.running).toBe(true)
    // cuenta previa: 4 tiempos a 0,5 s desde t0+0,1
    advance(1.0)
    expect(result.current.loop).toBe(-1)
    expect(result.current.beatInBar).toBe(1)
    expect(result.current.index).toBe(0)
    advance(1.2) // t0+2.2: primer acorde (t0+2.1)
    expect(result.current.loop).toBe(0)
    expect(result.current.index).toBe(0)
    expect(result.current.beatInBar).toBe(0)
    expect(synth.playPositions).toHaveBeenCalledTimes(1)
    const [ps, opts] = vi.mocked(synth.playPositions).mock.calls[0]
    expect(ps).toHaveLength(1)
    expect(opts).toMatchObject({ inst: 'guitar', capo: 0, volume: 0.5 })
    expect(opts.at).toBeCloseTo(t0 + 2.1, 6)
    expect(vi.mocked(synth.playClick).mock.calls[0]).toEqual([expect.closeTo(t0 + 0.1, 6), 'accent', 0.7])
    advance(2.0) // t0+4.2
    expect(result.current.index).toBe(1)
    expect(result.current.loop).toBe(0)
    advance(2.0) // t0+6.2
    expect(result.current.index).toBe(0)
    expect(result.current.loop).toBe(1)
    act(() => result.current.stop())
    expect(result.current.running).toBe(false)
    const n = vi.mocked(synth.playClick).mock.calls.length
    advance(3)
    expect(vi.mocked(synth.playClick).mock.calls.length).toBe(n)
  })

  test('sin clic ni acorde no suena nada; la rampa sube el BPM en cada vuelta nueva', () => {
    vi.useFakeTimers()
    useStore.getState().setPracticePrefs({
      countInBars: 0,
      clickOn: false,
      chordOn: false,
      ramp: { enabled: true, step: 10, everyLoops: 1, max: 135 },
    })
    const { result } = renderHook(() => usePractice(items, '4/4', 120, clock))
    act(() => result.current.start())
    expect(result.current.bpmNow).toBe(120)
    advance(4.2) // vuelta 1 empieza en t0+4.1
    expect(result.current.loop).toBe(1)
    expect(result.current.bpmNow).toBe(130)
    advance(60 / 130 * 8 + 0.1)
    expect(result.current.loop).toBe(2)
    expect(result.current.bpmNow).toBe(135) // tope
    expect(synth.playClick).not.toHaveBeenCalled()
    expect(synth.playPositions).not.toHaveBeenCalled()
    act(() => result.current.setBpm(90))
    expect(result.current.bpmNow).toBe(90)
  })
})

describe('fuente de práctica', () => {
  test('preset Pop en G mayor da G, D, Em, C con el juego actual (tríadas)', () => {
    const r = sourceChords({ kind: 'preset', key: { tonic: 'G', mode: 'maj' }, presetId: 'pop', chordSet: 'triads' }, [])
    expect(r.chords).toEqual([
      { root: 'G', quality: 'maj' },
      { root: 'D', quality: 'maj' },
      { root: 'E', quality: 'm' },
      { root: 'C', quality: 'maj' },
    ])
  })

  test('un preset pendiente al abrir #/practicar se consume y muestra 4 acordes', () => {
    useStore.getState().setSettings({ notation: 'english' })
    setPendingPracticeSource({ kind: 'preset', key: { tonic: 'G', mode: 'maj' }, presetId: 'pop', chordSet: 'triads' })
    window.location.hash = '#/practicar'
    render(<App />)
    const list = screen.getByTestId('practice-chords')
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['G', 'D', 'Em', 'C'])
    expect(takePendingPracticeSource()).toBeNull()
  })

  test('progresión guardada: usa su compás, BPM y duraciones', () => {
    const s = useStore.getState()
    const id = s.saveProgression({ name: 'Mia', timeSignature: '3/4', items: [{ chord: G, beats: 6 }, { chord: Cc, beats: 3 }], bpm: 77 })
    const r = sourceChords({ kind: 'saved', id }, useStore.getState().progressions)
    expect(r).toMatchObject({ chords: [G, Cc], ts: '3/4', bpm: 77, beats: [6, 3] })
  })
})

describe('pantalla Practicar', () => {
  const open = () => {
    useStore.getState().setSettings({ notation: 'english' })
    setPendingPracticeSource({ kind: 'manual', chords: [G, Cc] })
    window.location.hash = '#/practicar'
    render(<App />)
  }

  test('espacio inicia y para', async () => {
    const user = userEvent.setup()
    open()
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Parar' })).toBeInTheDocument()
    expect(screen.getByTestId('practice-current')).toHaveTextContent('G')
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
  })

  test('↑/↓ cambian el BPM de 5 en 5 y Esc para', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: 'Iniciar' }))
    const bpm = screen.getByTestId('practice-bpm')
    const before = Number(bpm.textContent)
    ;(document.activeElement as HTMLElement | null)?.blur()
    await user.keyboard('{ArrowUp}')
    expect(Number(screen.getByTestId('practice-bpm').textContent)).toBe(before + 5)
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(Number(screen.getByTestId('practice-bpm').textContent)).toBe(before - 5)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
  })

  test('cambiar de instrumento o de cejilla detiene la práctica', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: 'Iniciar' }))
    act(() => useStore.getState().setInstrument('ukulele'))
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Iniciar' }))
    act(() => useStore.getState().setSettings({ capo: 2 }))
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
  })

  test('añadir acordes con el buscador (máx. 4) y quitar', async () => {
    const user = userEvent.setup()
    open()
    const search = screen.getByRole('searchbox')
    await user.type(search, 'am{Enter}')
    const list = () => within(screen.getByTestId('practice-chords')).getAllByRole('listitem').map((li) => li.textContent)
    expect(list()).toEqual(['G', 'C', 'Am'])
    await user.type(screen.getByRole('searchbox'), 'd7{Enter}')
    expect(list()).toEqual(['G', 'C', 'Am', 'D7'])
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quitar Am' }))
    expect(list()).toEqual(['G', 'C', 'D7'])
  })

  test('guardar como progresión', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: 'Guardar como progresión' }))
    const name = screen.getByRole('textbox', { name: 'Nombre' })
    await user.clear(name)
    await user.type(name, 'Mi práctica{Enter}')
    const p = useStore.getState().progressions
    expect(p).toHaveLength(1)
    expect(p[0]).toMatchObject({ name: 'Mi práctica', timeSignature: '4/4', bpm: 80, items: [{ chord: G, beats: 4 }, { chord: Cc, beats: 4 }] })
  })

  test('con una guardada, elegir compases por acorde sustituye sus duraciones', async () => {
    const user = userEvent.setup()
    const id = useStore.getState().saveProgression({ name: 'Mia', timeSignature: '3/4', items: [{ chord: G, beats: 6 }, { chord: Cc, beats: 3 }], bpm: 77 })
    setPendingPracticeSource({ kind: 'saved', id })
    window.location.hash = '#/practicar'
    render(<App />)
    await user.click(within(screen.getByRole('group', { name: 'Compases por acorde' })).getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'Guardar como progresión' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), '{Enter}')
    const p = useStore.getState().progressions
    expect(p).toHaveLength(2)
    expect(p[1]).toMatchObject({ timeSignature: '3/4', bpm: 77, items: [{ chord: G, beats: 6 }, { chord: Cc, beats: 6 }] })
  })
})
