import { useEffect, useState } from 'react'
import { useT } from '../../i18n'
import { useStore } from '../../state/store'
import { ChordsScreen } from '../chords/ChordsScreen'
import { KeyScreen } from '../key/KeyScreen'
import { MineScreen } from '../mine/MineScreen'
import { PracticeScreen } from '../practice/PracticeScreen'
import { SettingsSheet } from '../settings/SettingsSheet'
import { NavBar } from './NavBar'
import { Sheet } from './Sheet'
import { useRoute } from './useRoute'

export function AppShell() {
  const m = useT()
  const [route] = useRoute()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const lang = useStore((s) => s.settings.lang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    // la barra del navegador/PWA sigue al tema elegido (o al del sistema)
    const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111214' : '#ffffff')
  }, [theme])
  useEffect(() => {
    window.scrollTo?.(0, 0)
  }, [route])

  return (
    <div className="app">
      <NavBar route={route} onSettings={() => setSettingsOpen(true)} />
      <main className="main">
        {route === 'chords' ? (
          <ChordsScreen hotkeys={!settingsOpen} />
        ) : route === 'key' ? (
          <KeyScreen />
        ) : route === 'practice' ? (
          <PracticeScreen hotkeys={!settingsOpen} />
        ) : route === 'mine' ? (
          <MineScreen />
        ) : (
          <ChordsScreen hotkeys={!settingsOpen} />
        )}
      </main>
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={m.settings}>
        <SettingsSheet />
      </Sheet>
    </div>
  )
}
