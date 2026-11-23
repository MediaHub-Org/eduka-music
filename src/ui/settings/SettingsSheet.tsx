import { INSTRUMENT_ORDER } from '../../engine'
import { useT } from '../../i18n'
import { useStore } from '../../state/store'

export function SettingsSheet() {
  const m = useT()
  const settings = useStore((state) => state.settings)
  const instrument = useStore((state) => state.current.instrument)
  const setSettings = useStore((state) => state.setSettings)
  const setInstrument = useStore((state) => state.setInstrument)

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
        <span>{m.instrument}</span>
        <select aria-label={m.instrument} value={instrument} onChange={(event) => setInstrument(event.target.value as typeof instrument)}>
          {INSTRUMENT_ORDER.map((id) => <option key={id} value={id}>{m.inst[id]}</option>)}
        </select>
      </label>
      <label className="settings-field">
        <span>{m.notation}</span>
        <select aria-label={m.notation} value={settings.notation} onChange={(event) => setSettings({ notation: event.target.value as 'latin' | 'english' })}>
          <option value="latin">Do · Re · Mi</option>
          <option value="english">C · D · E</option>
        </select>
      </label>
      {instrument !== 'piano' && (
        <>
          <label className="settings-field">
            <span>{m.capo}</span>
            <select aria-label={m.capo} value={settings.capo} onChange={(event) => setSettings({ capo: Number(event.target.value) })}>
              {Array.from({ length: 8 }, (_, capo) => <option key={capo} value={capo}>{capo === 0 ? m.no : capo}</option>)}
            </select>
          </label>
          <label className="settings-toggle">
            <span>{m.lefty}</span>
            <input type="checkbox" checked={settings.leftHanded} onChange={(event) => setSettings({ leftHanded: event.target.checked })} />
          </label>
        </>
      )}
      <label className="settings-field">
        <span>{m.labelsL}</span>
        <select aria-label={m.labelsL} value={settings.labels} onChange={(event) => setSettings({ labels: event.target.value as 'notes' | 'intervals' })}>
          <option value="notes">{m.notes}</option>
          <option value="intervals">{m.intervals}</option>
        </select>
      </label>
    </div>
  )
}
