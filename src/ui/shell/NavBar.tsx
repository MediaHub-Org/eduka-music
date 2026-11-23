import type { ReactNode } from 'react'
import { useT } from '../../i18n'
import { ROUTE_HASH } from './useRoute'
import type { Route } from './useRoute'

const ico = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)

const ICONS: Record<Route, ReactNode> = {
  // mástil con tres puntos
  chords: ico(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M5 9h14M5 15h14M10 3v18M14 3v18" /><circle cx="10" cy="12" r="1.6" fill="currentColor" /></>),
  // metrónomo
  practice: ico(<><path d="M8 21h8l-3-17h-2z" /><path d="M12 15l5-8" /></>),
  // círculo de quintas
  key: ico(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v5M12 16v5M3 12h5M16 12h5" /></>),
  // estrella
  mine: ico(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />),
}

export interface NavBarProps {
  route: Route
  onSettings: () => void
}

export function NavBar({ route, onSettings }: NavBarProps) {
  const m = useT()
  const label: Record<Route, string> = { chords: m.navChords, practice: m.navPractice, key: m.navKey, mine: m.navMine }
  return (
    <nav className="navbar" aria-label={m.mainNav}>
      <div className="brand" aria-hidden="true">Eduka</div>
      {(Object.keys(ROUTE_HASH) as Route[]).map((r) => (
        <a key={r} href={ROUTE_HASH[r]} className="nav-item" aria-current={route === r ? 'page' : undefined}>
          {ICONS[r]}
          <span>{label[r]}</span>
        </a>
      ))}
      <button type="button" className="nav-item nav-set" aria-label={m.settings} onClick={onSettings}>
        <span aria-hidden="true" className="gear">⚙</span>
        <span aria-hidden="true">{m.settings}</span>
      </button>
    </nav>
  )
}
