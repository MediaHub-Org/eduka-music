import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import { resetStore, useStore } from '../../src/state/store'

beforeEach(() => {
  resetStore()
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

  test('la cejilla desaparece al elegir piano', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.selectOptions(screen.getByLabelText('Instrumento'), 'piano')

    expect(useStore.getState().current.instrument).toBe('piano')
    expect(screen.queryByLabelText('Cejilla')).not.toBeInTheDocument()
  })
})
