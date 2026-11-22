import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildChord, INSTRUMENTS } from '../../src/engine'
import type { FretPosition, StringInstrument } from '../../src/engine'
import { Neck } from '../../src/ui/diagrams/Neck'
import { ChordBox } from '../../src/ui/diagrams/ChordBox'
import { Keyboard } from '../../src/ui/diagrams/Keyboard'
import { Circle } from '../../src/ui/diagrams/Circle'
import { FAMILY_COLOR } from '../../src/ui/diagrams/Dot'

afterEach(cleanup)

const guitar = INSTRUMENTS.guitar as StringInstrument
const em7 = buildChord({ root: 'E', quality: 'm7' })
const frets = [null, null, 5, 7, 5, 7]
const pos: FretPosition = { kind: 'frets', frets, score: 0, fingers: 4, barre: 0, bass: em7.tones[0], lo: 5, hi: 7 }

const neck = (leftHanded: boolean, vertical = false) => (
  <Neck chord={em7} position={pos} inst={guitar} capo={0} vertical={vertical} leftHanded={leftHanded} labels="notes" notation="english" />
)

describe('Neck', () => {
  test('Em7 x,x,5,7,5,7: 4 puntos grandes', () => {
    const { container } = render(neck(false))
    expect(container.querySelectorAll('[data-on="true"]')).toHaveLength(4)
    expect(container.querySelectorAll('[data-on="false"]').length).toBeGreaterThan(4)
  })

  test('zurdo invierte x', () => {
    const a = render(neck(false))
    const W = Number(a.container.querySelector('svg')!.getAttribute('viewBox')!.split(' ')[2])
    const cxR = Number(a.container.querySelector('[data-on="true"][data-s="2"]')!.querySelector('circle')!.getAttribute('cx'))
    a.unmount()
    const b = render(neck(true))
    const cxL = Number(b.container.querySelector('[data-on="true"][data-s="2"]')!.querySelector('circle')!.getAttribute('cx'))
    expect(cxL).toBeCloseTo(W - cxR)
  })

  test('onTapNote recibe cuerda y traste', async () => {
    const fn = vi.fn()
    const { container } = render(<Neck chord={em7} position={pos} inst={guitar} capo={0} vertical={false} leftHanded={false} labels="intervals" notation="latin" onTapNote={fn} />)
    await userEvent.click(container.querySelector('[data-on="true"][data-s="2"]')!)
    expect(fn).toHaveBeenCalledWith(2, 5)
  })

  test('vertical dibuja los puntos de la posición', () => {
    const { container } = render(neck(false, true))
    expect(container.querySelectorAll('[data-on="true"]')).toHaveLength(4)
  })
})

describe('ChordBox', () => {
  test('muestra × en cuerdas apagadas', () => {
    render(<ChordBox chord={em7} frets={frets} inst={guitar} capo={0} leftHanded={false} labels="notes" notation="english" />)
    expect(screen.getAllByText('×')).toHaveLength(2)
  })
})

describe('Keyboard', () => {
  test('marca las notas dadas', () => {
    const { container } = render(<Keyboard lo={60} hi={67} marks={{ 60: { fill: 'var(--ink)', txt: 'C' } }} />)
    expect(container.querySelectorAll('circle')).toHaveLength(1)
  })
})

describe('Circle', () => {
  test('Enter en sector Em llama onPick({tonic:"E",mode:"min"})', async () => {
    const onPick = vi.fn()
    render(<Circle keySpec={{ tonic: 'C', mode: 'maj' }} notation="english" onPick={onPick} />)
    const em = screen.getByRole('button', { name: 'Em' })
    em.focus()
    await userEvent.keyboard('{Enter}')
    expect(onPick).toHaveBeenCalledWith({ tonic: 'E', mode: 'min' })
  })

  test('clic y espacio también', async () => {
    const onPick = vi.fn()
    render(<Circle keySpec={{ tonic: 'C', mode: 'maj' }} notation="english" onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: 'G' }))
    expect(onPick).toHaveBeenLastCalledWith({ tonic: 'G', mode: 'maj' })
    screen.getByRole('button', { name: 'Em' }).focus()
    await userEvent.keyboard(' ')
    expect(onPick).toHaveBeenLastCalledWith({ tonic: 'E', mode: 'min' })
  })
})

test('FAMILY_COLOR', () => {
  expect(FAMILY_COLOR.b).toBe('var(--cx)')
  expect(FAMILY_COLOR.r).toBe('var(--ink)')
})

const win = (c: HTMLElement) => c.querySelector('rect[fill="var(--hl)"]')!
const num = (el: Element, a: string) => Number(el.getAttribute(a))

describe('geometría (fórmulas del artifact)', () => {
  test('Neck horizontal: franja de la posición', () => {
    const { container } = render(neck(false))
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 1008 242')
    const w = win(container)
    expect([num(w, 'x'), num(w, 'y'), num(w, 'width'), num(w, 'height')]).toEqual([328, 8, 184, 138])
  })

  test('Neck horizontal zurdo: franja espejada', () => {
    const { container } = render(neck(true))
    expect(num(win(container), 'x')).toBe(1008 - 508)
  })

  test('Neck vertical: franja y espejo zurdo', () => {
    const r = render(neck(false, true))
    expect(r.container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 312 ' + (48 + 15 * 42 + 34))
    const w = win(r.container)
    expect([num(w, 'x'), num(w, 'y'), num(w, 'width'), num(w, 'height')]).toEqual([112, 216, 184, 130])
    expect(num(r.container.querySelector('[data-on="true"][data-s="2"] circle')!, 'cx')).toBe(132)
    r.unmount()
    const l = render(neck(true, true))
    expect(num(win(l.container), 'x')).toBe(16)
    expect(num(l.container.querySelector('[data-on="true"][data-s="2"] circle')!, 'cx')).toBe(180)
  })

  test('ChordBox con ventana: número de traste y sin cejuela', () => {
    const { container } = render(<ChordBox chord={em7} frets={frets} inst={guitar} capo={0} leftHanded={false} labels="notes" notation="english" />)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 172 190')
    const t = screen.getByText('5', { selector: 'svg > text' })
    expect([num(t, 'x'), num(t, 'y')]).toEqual([2, 57])
    expect(container.querySelector('rect[width="120"]')).toBeNull()
  })

  test('ChordBox zurdo con ventana: etiqueta a la derecha', () => {
    render(<ChordBox chord={em7} frets={frets} inst={guitar} capo={0} leftHanded labels="notes" notation="english" />)
    const t = screen.getByText('5', { selector: 'svg > text' })
    expect(num(t, 'x')).toBe(168)
    expect(t.getAttribute('text-anchor')).toBe('end')
  })

  test('ChordBox en primera posición: cejuela', () => {
    const { container } = render(<ChordBox chord={em7} frets={[0, 2, 0, 0, 0, 0]} inst={guitar} capo={0} leftHanded={false} labels="notes" notation="english" />)
    expect(container.querySelector('rect[width="120"][height="5"]')).not.toBeNull()
  })

  test('Keyboard: teclas negras y marcas', () => {
    const { container } = render(<Keyboard lo={60} hi={67} marks={{ 60: { fill: 'var(--ink)' }, 61: { fill: 'var(--c3)' } }} />)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 212 154')
    const blacks = container.querySelectorAll('rect[fill="#1b1b1b"]')
    expect(blacks).toHaveLength(5)
    expect(num(blacks[0], 'x')).toBeCloseTo(21.4)
    expect(num(blacks[0], 'width')).toBeCloseTo(19.2)
    const [c, cs] = Array.from(container.querySelectorAll('circle'))
    expect([num(c, 'cx'), num(c, 'cy')]).toEqual([16, 120])
    expect(num(cs, 'cx')).toBeCloseTo(31)
    expect(num(cs, 'cy')).toBeCloseTo(79)
  })

  test('Dot raíz: texto con color de fondo (contraste en oscuro)', () => {
    const { container } = render(<Keyboard lo={60} hi={67} marks={{ 60: { fill: 'var(--ink)', txt: 'C' }, 64: { fill: 'var(--c3)', txt: 'E' } }} />)
    const texts = Array.from(container.querySelectorAll('g text'))
    expect(texts.map((t) => t.getAttribute('fill'))).toEqual(['var(--bg)', '#fff'])
  })

  test('Circle: Espacio hace preventDefault', () => {
    render(<Circle keySpec={{ tonic: 'C', mode: 'maj' }} notation="english" onPick={() => {}} />)
    const em = screen.getByRole('button', { name: 'Em' })
    expect(fireEvent.keyDown(em, { key: ' ' })).toBe(false)
    expect(fireEvent.keyDown(em, { key: 'a' })).toBe(true)
  })
})
