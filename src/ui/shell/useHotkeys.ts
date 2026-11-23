import { useEffect, useRef } from 'react'

const isTyping = (t: EventTarget | null): boolean => {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
}

/**
 * Atajos de teclado por `e.key` (' ' para espacio). Se ignoran con Ctrl/Alt/Meta y mientras
 * el foco está en un campo de texto, salvo `Escape`.
 */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, enabled = true): void {
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    if (!enabled) return
    const on = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.defaultPrevented) return
      if (e.key !== 'Escape' && isTyping(e.target)) return
      const fn = ref.current[e.key]
      if (!fn) return
      e.preventDefault()
      fn(e)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [enabled])
}
