import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import { resetStore, useStore } from '../../src/state/store'

beforeEach(() => {
  resetStore()
  document.documentElement.removeAttribute('data-theme')
  window.location.hash = '#/acordes'
})

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('Ajustes', () => {
  test('cambiar a English traduce la navegación', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.selectOptions(screen.getByLabelText('Idioma'), 'en')

    expect(await screen.findByRole('link', { name: 'Chords' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Practice' })).toBeInTheDocument()
    expect(useStore.getState().settings.lang).toBe('en')
  })

  test('solo contiene idioma, notación y tema', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    const dialog = screen.getByRole('dialog', { name: 'Ajustes' })
    expect(within(dialog).queryByLabelText('Instrumento')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Cejilla')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('Idioma')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Notas')).toBeInTheDocument()
  })

  test('muestra versión, licencia y enlace al código fuente', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    const dialog = screen.getByRole('dialog', { name: 'Ajustes' })

    expect(within(dialog).getByText(/^Eduka Music \d+\.\d+\.\d+$/)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Código fuente' }))
      .toHaveAttribute('href', 'https://github.com/MediaHub-Org/eduka-music')
    expect(within(dialog).getByRole('link', { name: 'AGPL-3.0' }))
      .toHaveAttribute('href', 'https://github.com/MediaHub-Org/eduka-music/blob/main/LICENSE')
  })

  test('el tema se aplica al documento: oscuro, claro y automático', async () => {
    const user = userEvent.setup()
    render(<App />)
    const root = document.documentElement
    expect(root.hasAttribute('data-theme')).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.click(screen.getByRole('button', { name: 'Oscuro' }))
    expect(root.getAttribute('data-theme')).toBe('dark')
    await user.click(screen.getByRole('button', { name: 'Claro' }))
    expect(root.getAttribute('data-theme')).toBe('light')
    await user.click(screen.getByRole('button', { name: 'Auto' }))
    expect(root.hasAttribute('data-theme')).toBe(false)
    expect(useStore.getState().settings.theme).toBe('auto')
  })
})
