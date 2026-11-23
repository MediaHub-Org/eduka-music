import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import { resetStore, useStore } from '../../src/state/store'
import { PRESETS, diatonic } from '../../src/engine'
import { takePendingPracticeSource } from '../../src/ui/practice/source'

beforeEach(() => {
  resetStore()
  takePendingPracticeSource()
  window.location.hash = '#/tonalidad'
})
afterEach(cleanup)

describe('pantalla Tonalidad', () => {
  test('elegir Dm en el círculo pone tonalidad D menor y acorde Dm7', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Rem' }))
    const s = useStore.getState().current
    expect(s.key).toEqual({ tonic: 'D', mode: 'min' })
    expect(s.chord).toEqual({ root: 'D', quality: 'm7' })
    expect(window.location.hash).toBe('#/tonalidad')
  })

  test('armadura de A mayor muestra F♯ C♯ G♯ (notación english)', () => {
    act(() => {
      useStore.getState().setSettings({ notation: 'english' })
      useStore.getState().setKey({ tonic: 'A', mode: 'maj' })
    })
    render(<App />)
    expect(screen.getByText('F♯ C♯ G♯')).toBeInTheDocument()
  })

  test('tocar un diatónico lo selecciona y vuelve a Acordes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const list = screen.getAllByRole('group', { name: /Acordes de/ })[1]
    await user.click(within(list).getAllByRole('button')[3])
    expect(useStore.getState().current.chord).toEqual({ root: 'C', quality: 'maj7' })
    expect(window.location.hash).toBe('#/acordes')
  })

  test('"Practicar" en Pop navega a #/practicar con 4 acordes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const pop = screen.getByText(/^Pop/).closest('li') as HTMLElement
    await user.click(within(pop).getByRole('button', { name: /Practicar/ }))
    expect(window.location.hash).toBe('#/practicar')
    // Practicar consume el traspaso al montar y muestra los 4 acordes (séptimas en G mayor)
    expect(takePendingPracticeSource()).toBeNull()
    const list = screen.getByTestId('practice-chords')
    const want = PRESETS.maj.find((p) => p.id === 'pop')!.degrees.map((d) => diatonic({ tonic: 'G', mode: 'maj' }, 'sevenths')[d].spec)
    expect(want).toHaveLength(4)
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Solmaj7', 'Re7', 'Mim7', 'Domaj7'])
  })
})
