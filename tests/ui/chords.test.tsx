import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import { resetStore, useStore } from '../../src/state/store'
import { buildChord, positionKey, topPositions } from '../../src/engine'

beforeEach(() => {
  resetStore()
  window.location.hash = ''
})
afterEach(cleanup)

const setup = () => {
  const user = userEvent.setup()
  render(<App />)
  return { user, search: screen.getByRole('searchbox') }
}

describe('pantalla Acordes', () => {
  test('buscar "re/fa#" + Enter selecciona D/F#', async () => {
    const { user, search } = setup()
    await user.type(search, 're/fa#{Enter}')
    expect(useStore.getState().current.chord).toEqual({ root: 'D', quality: 'maj', bass: 'F#' })
    expect(screen.getByTestId('chord-symbol')).toHaveTextContent('Re/Fa♯')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  test('el buscador muestra resultados con nombre largo y se elige tocando', async () => {
    const { user, search } = setup()
    await user.type(search, 'sol7')
    const list = screen.getByRole('listbox')
    const opt = within(list).getAllByRole('option')[0]
    expect(opt).toHaveTextContent('Sol7')
    expect(opt).toHaveTextContent('séptima de dominante')
    await user.click(opt)
    expect(useStore.getState().current.chord).toEqual({ root: 'G', quality: '7' })
  })

  test('Siguiente desde Em7 en G → Cmaj7', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /Siguiente/ }))
    expect(useStore.getState().current.chord).toEqual({ root: 'C', quality: 'maj7' })
    expect(useStore.getState().current.positionKey).not.toBeNull()
  })

  test('acorde fuera de tonalidad: botón Variante y chips de tonalidades', async () => {
    const { user } = setup()
    act(() => useStore.getState().selectChord({ root: 'F', quality: 'maj' }))
    expect(screen.getByRole('button', { name: /Variante/ })).toBeInTheDocument()
    const chips = screen.getAllByTestId('key-suggestion')
    expect(chips.length).toBeGreaterThan(0)
    expect(chips.length).toBeLessThanOrEqual(3)
    await user.click(chips[0])
    const st = useStore.getState().current
    expect(st.chord).toEqual({ root: 'F', quality: 'maj' })
    expect(st.key).toEqual({ tonic: 'C', mode: 'maj' })
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeInTheDocument()
  })

  test('posición ▶ avanza positionKey', async () => {
    const { user } = setup()
    const list = topPositions(buildChord({ root: 'E', quality: 'm7' }), 'guitar', 0)
    const i = list.findIndex((p) => positionKey(p) === 'x,x,5,7,5,7')
    await user.click(screen.getByRole('button', { name: 'Posición siguiente' }))
    const j = (i + 1) % list.length
    expect(useStore.getState().current.positionKey).toBe(positionKey(list[j]))
    expect(screen.getByText(`Posición ${j + 1} de ${list.length}`)).toBeInTheDocument()
  })

  test('tecla "/" enfoca el buscador', async () => {
    const { user, search } = setup()
    await user.keyboard('/')
    expect(search).toHaveFocus()
    expect(search).toHaveValue('')
  })

  test('atajos: → posición, f favorito, n siguiente', async () => {
    const { user } = setup()
    const k0 = useStore.getState().current.positionKey
    await user.keyboard('{ArrowRight}')
    expect(useStore.getState().current.positionKey).not.toBe(k0)
    await user.keyboard('f')
    expect(useStore.getState().favorites).toHaveLength(1)
    await user.keyboard('n')
    expect(useStore.getState().current.chord).toEqual({ root: 'C', quality: 'maj7' })
  })

  test('tira de tonalidad: tocar un acorde lo selecciona', async () => {
    const { user } = setup()
    const strip = screen.getByRole('group', { name: /Acordes de Sol mayor/ })
    await user.click(within(strip).getByRole('button', { name: /Re7/ }))
    expect(useStore.getState().current.chord).toEqual({ root: 'D', quality: '7' })
  })

  test('sin posición: muestra el aviso y no rompe', () => {
    setup()
    act(() => {
      useStore.getState().setInstrument('ukulele')
      useStore.getState().selectChord({ root: 'C', quality: 'm', bass: 'Db' })
    })
    expect(screen.getAllByText('Sin posición para este bajo en este instrumento').length).toBeGreaterThan(0)
  })

  test('biblioteca: fila de bajo elige el bajo del acorde', async () => {
    const { user } = setup()
    const bassRow = screen.getByRole('group', { name: /Bajo/ })
    await user.click(within(bassRow).getByRole('button', { name: 'Sol' }))
    expect(useStore.getState().current.chord).toEqual({ root: 'E', quality: 'm7', bass: 'G' })
  })
})

describe('shell', () => {
  test('navegación por hash con enlaces', async () => {
    const { user } = setup()
    const nav = screen.getByRole('navigation')
    const link = within(nav).getByRole('link', { name: 'Practicar' })
    expect(link).toHaveAttribute('href', '#/practicar')
    expect(within(nav).getByRole('link', { name: 'Acordes' })).toHaveAttribute('aria-current', 'page')
    await user.click(link)
    expect(window.location.hash).toBe('#/practicar')
    expect(await screen.findByRole('heading', { name: 'Practicar' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  test('ajustes abre una hoja que se cierra con Escape', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(screen.getByRole('dialog', { name: 'Ajustes' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
