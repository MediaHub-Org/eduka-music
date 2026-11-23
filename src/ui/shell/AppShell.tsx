import { useEffect, useState } from 'react'
import { useT } from '../../i18n'
import { useStore } from '../../state/store'
import { ChordsScreen } from '../chords/ChordsScreen'
import { KeyScreen } from '../key/KeyScreen'
import { NavBar } from './NavBar'
import { Sheet } from './Sheet'
import { useRoute } from './useRoute'
import type { Route } from './useRoute'

function Placeholder({ route }: { route: Exclude<Route, 'chords' | 'key'> }) {
  const m = useT()
  const title = { practice: m.navPractice, mine: m.navMine }[route]
  return (
    <section className="screen placeholder">
      <h1>{title}</h1>
      <p className="note">{m.soon}</p>
    </section>
  )
}

export function AppShell() {
  const m = useT()
  const [route] = useRoute()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const lang = useStore((s) => s.settings.lang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  useEffect(() => {
    window.scrollTo?.(0, 0)
  }, [route])

  return (
    <div className="app">
      <NavBar route={route} onSettings={() => setSettingsOpen(true)} />
      <main className="main">
        {route === 'chords' ? <ChordsScreen hotkeys={!settingsOpen} /> : route === 'key' ? <KeyScreen /> : <Placeholder route={route} />}
      </main>
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={m.settings}>
        <p className="note">{m.soon}</p>
      </Sheet>
    </div>
  )
}
