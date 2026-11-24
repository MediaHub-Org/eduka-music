import type { ReactNode } from 'react'
import type { InstrumentId } from '../../engine'

/** Siluetas sencillas (mástil arriba, caja abajo), en el mismo trazo que los iconos de la barra. */
const SHAPES: Record<InstrumentId, ReactNode> = {
  guitar: (
    <>
      <path d="M12 22c-3 0-5-1.8-5-4.2 0-1.7 1.4-2.2 1.4-3.6 0-.9.7-1.5 1.6-1.5h4c.9 0 1.6.6 1.6 1.5 0 1.4 1.4 1.9 1.4 3.6 0 2.4-2 4.2-5 4.2z" />
      <path d="M12 12.6V3M10.5 2h3" />
      <circle cx="12" cy="18" r="1.2" />
    </>
  ),
  piano: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M9 12v7M15 12v7" />
      <path d="M7.5 5v7M12 5v7M16.5 5v7" />
    </>
  ),
  ukulele: (
    <>
      <path d="M12 22c-2.4 0-4-1.5-4-3.4 0-1.4 1.2-1.8 1.2-3 0-.8.6-1.3 1.3-1.3h3c.7 0 1.3.5 1.3 1.3 0 1.2 1.2 1.6 1.2 3 0 1.9-1.6 3.4-4 3.4z" />
      <path d="M12 14.3V6M10.8 5h2.4" />
      <circle cx="12" cy="18.6" r="1" />
    </>
  ),
  cuatro: (
    <>
      <rect x="7" y="13" width="10" height="9" rx="4" />
      <path d="M12 13V3M10.5 2h3" />
      <circle cx="12" cy="17.5" r="1.1" />
    </>
  ),
  timple: (
    <>
      <circle cx="12" cy="17" r="5" />
      <path d="M12 12V4M10.8 3h2.4" />
      <circle cx="12" cy="17" r="1.1" />
    </>
  ),
  bandurria: (
    <>
      <path d="M12 22c-3.2 0-5-2-5-4.4 0-2.2 2.2-3.6 5-6.6 2.8 3 5 4.4 5 6.6 0 2.4-1.8 4.4-5 4.4z" />
      <path d="M12 11V3M10.5 2h3" />
      <circle cx="12" cy="17.8" r="1.1" />
    </>
  ),
}

export function InstrumentIcon({ id }: { id: InstrumentId }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {SHAPES[id]}
    </svg>
  )
}
