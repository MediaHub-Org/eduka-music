import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { useT } from '../../i18n'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Hoja inferior en móvil, diálogo centrado ≥ 760 px. Esc y clic fuera la cierran; foco atrapado. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const m = useT()
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel.current)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close.current()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open])

  if (!open) return null

  const trap = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab' || !panel.current) return
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!items.length) {
      e.preventDefault()
      return
    }
    const a = items[0]
    const z = items[items.length - 1]
    if (e.shiftKey && document.activeElement === a) {
      e.preventDefault()
      z.focus()
    } else if (!e.shiftKey && document.activeElement === z) {
      e.preventDefault()
      a.focus()
    }
  }

  return (
    <div className="sheet" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className="sheet-in" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={trap}>
        <div className="sheet-hd">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label={m.close} onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
