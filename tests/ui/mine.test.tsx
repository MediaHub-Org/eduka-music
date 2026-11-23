import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import { resetStore, useStore } from '../../src/state/store'
import type { ChordSpec } from '../../src/engine'

const C: ChordSpec = { root: 'C', quality: 'maj' }
const Am: ChordSpec = { root: 'A', quality: 'm' }
const F: ChordSpec = { root: 'F', quality: 'maj' }
const G: ChordSpec = { root: 'G', quality: 'maj' }

beforeEach(() => {
  resetStore()
  window.location.hash = '#/mis-cosas'
})

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('Mis cosas', () => {
  test('crear progresión "Canción" con C, Am/G, F, G en 3/4 a 2 compases da 6 tiempos', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Nueva progresión/i }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Canción')
    await user.selectOptions(screen.getByLabelText('Compás'), '3/4')
    await user.selectOptions(screen.getByLabelText('Compases por acorde'), '2')

    for (const query of ['C', 'Am/G', 'F', 'G']) {
      const search = screen.getByRole('searchbox')
      await user.type(search, `${query}{Enter}`)
    }
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useStore.getState().progressions[0]).toMatchObject({
      name: 'Canción',
      timeSignature: '3/4',
      items: [
        { chord: C, beats: 6 },
        { chord: { root: 'A', quality: 'm', bass: 'G' }, beats: 6 },
        { chord: F, beats: 6 },
        { chord: G, beats: 6 },
      ],
    })
  })

  test('borrar una progresión pide confirmación antes de eliminarla', async () => {
    const user = userEvent.setup()
    const id = useStore.getState().saveProgression({
      name: 'Canción',
      timeSignature: '4/4',
      items: [{ chord: C, beats: 4 }],
      bpm: 100,
    })
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Borrar Canción' }))
    expect(useStore.getState().progressions).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Confirmar borrado' }))
    expect(useStore.getState().progressions).toHaveLength(0)
    expect(useStore.getState().progressions.some((p) => p.id === id)).toBe(false)
  })

  test('importar JSON de otra app muestra error y no cambia nada', async () => {
    const user = userEvent.setup()
    useStore.getState().saveProgression({
      name: 'Intacta',
      timeSignature: '4/4',
      items: [{ chord: C, beats: 4 }],
      bpm: 100,
    })
    const before = useStore.getState().progressions
    render(<App />)

    const file = new File(['{"app":"otra-app"}'], 'otra-app.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Importar copia'), file)

    expect(await screen.findByText('Este archivo no es una copia de Eduka Music.')).toBeInTheDocument()
    expect(useStore.getState().progressions).toEqual(before)
  })

  test('importar una copia válida pide confirmación y fusiona sus elementos', async () => {
    const user = userEvent.setup()
    const backup = {
      app: 'eduka-music',
      version: 1,
      exportedAt: new Date().toISOString(),
      favorites: [{ id: 'backup-fav', chord: C, instrument: 'guitar', capo: 0, positionKey: 'x,3,2,0,1,0', createdAt: 1 }],
      progressions: [{ id: 'backup-prog', name: 'Importada', timeSignature: '4/4', items: [{ chord: C, beats: 4 }], bpm: 100, createdAt: 1, updatedAt: 1 }],
      settings: { lang: 'en' },
    }
    render(<App />)
    await user.upload(screen.getByLabelText('Importar copia'), new File([JSON.stringify(backup)], 'copia.json', { type: 'application/json' }))

    expect(await screen.findByRole('dialog', { name: '¿Importar esta copia?' })).toBeInTheDocument()
    expect(useStore.getState().favorites).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Importar datos' }))

    expect(useStore.getState().favorites).toHaveLength(1)
    expect(useStore.getState().progressions[0].name).toBe('Importada')
    expect(useStore.getState().settings.lang).toBe('en')
  })

  test('editar conserva el id y las duraciones mixtas mientras no se cambien', async () => {
    const user = userEvent.setup()
    const id = useStore.getState().saveProgression({
      name: 'Mixta',
      timeSignature: '3/4',
      items: [{ chord: C, beats: 3 }, { chord: F, beats: 6 }],
      bpm: 100,
    })
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const name = screen.getByRole('textbox', { name: 'Nombre' })
    await user.clear(name)
    await user.type(name, 'Mixta editada')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useStore.getState().progressions).toMatchObject([
      { id, name: 'Mixta editada', items: [{ chord: C, beats: 3 }, { chord: F, beats: 6 }] },
    ])
  })

  test('tocar un favorito de ukelele cambia instrumento, acorde y posición', async () => {
    const user = userEvent.setup()
    useStore.getState().toggleFavorite({
      chord: Am,
      instrument: 'ukulele',
      capo: 0,
      positionKey: '0,0,0,0',
    })
    render(<App />)

    const favorite = within(screen.getByTestId('favorites')).getByRole('button', { name: /Am.*Ukelele/i })
    await user.click(favorite)

    expect(useStore.getState().current.instrument).toBe('ukulele')
    expect(useStore.getState().current.chord).toEqual(Am)
    expect(useStore.getState().current.positionKey).toBe('0,0,0,0')
    expect(window.location.hash).toBe('#/acordes')
  })
})
