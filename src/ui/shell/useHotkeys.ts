import { useEffect, useRef } from 'react'

const isTyping = (t: EventTarget | null): boolean => {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
}

const ACTIVATES = 'button, a[href], summary, select, [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [role="option"], [role="tab"], [role="menuitem"]'
const ARROWS = '[role="radiogroup"], [role="listbox"], [role="tablist"], [role="slider"], [role="menu"]'

/** La tecla pertenece al control enfocado (activar un botón, moverse en un grupo de radio…). */
const ownedByTarget = (key: string, t: EventTarget | null): boolean => {
  if (!(t instanceof Element)) return false
  if (key === ' ' || key === 'Enter') return t.closest(ACTIVATES) !== null
  if (key.startsWith('Arrow')) return t.closest(ARROWS) !== null
  return false
}

/**
 * Atajos de teclado por `e.key` (' ' para espacio). Se ignoran con Ctrl/Alt/Meta y mientras
 * el foco está en un campo de texto, salvo `Escape`. Espacio/Enter sobre un botón, enlace o
 * radio, y las flechas dentro de un grupo de radio/lista, se dejan al control enfocado.
 */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, enabled = true): void {
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    if (!enabled) return
    const on = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.defaultPrevented) return
      if (e.key !== 'Escape' && isTyping(e.target)) return
      if (ownedByTarget(e.key, e.target)) return
      const fn = ref.current[e.key]
      if (!fn) return
      e.preventDefault()
      fn(e)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [enabled])
}
