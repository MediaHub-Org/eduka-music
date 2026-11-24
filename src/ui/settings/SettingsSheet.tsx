import { useT } from '../../i18n'
import { useStore } from '../../state/store'
import type { Settings } from '../../state/store'

const THEMES: Settings['theme'][] = ['auto', 'light', 'dark']

/** Ajustes: solo lo que se toca una vez (idioma, notación, tema). Lo de uso diario vive en Acordes. */
export function SettingsSheet() {
  const m = useT()
  const settings = useStore((state) => state.settings)
  const setSettings = useStore((state) => state.setSettings)
  const themeName = { auto: m.themeAuto, light: m.themeLight, dark: m.themeDark }

  return (
    <div className="settings-form">
      <label className="settings-field">
        <span>{m.language}</span>
        <select aria-label={m.language} value={settings.lang} onChange={(event) => setSettings({ lang: event.target.value as 'es' | 'en' })}>
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="settings-field">
        <span>{m.notation}</span>
        <select aria-label={m.notation} value={settings.notation} onChange={(event) => setSettings({ notation: event.target.value as 'latin' | 'english' })}>
          <option value="latin">Do · Re · Mi</option>
          <option value="english">C · D · E</option>
        </select>
      </label>
      <div className="settings-field settings-wide">
        <span id="theme-lbl">{m.theme}</span>
        <div className="seg" role="group" aria-labelledby="theme-lbl">
          {THEMES.map((t) => (
            <button key={t} type="button" className={settings.theme === t ? 'on' : ''} aria-pressed={settings.theme === t} onClick={() => setSettings({ theme: t })}>
              {themeName[t]}
            </button>
          ))}
        </div>
      </div>
      <p className="note settings-wide">{m.settingsHint}</p>
    </div>
  )
}
