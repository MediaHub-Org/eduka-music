import { INSTRUMENT_ORDER, INSTRUMENTS } from '../../engine'
import { useT } from '../../i18n'
import { useStore } from '../../state/store'

/** Instrumento: fichas desplazables (se usa en Acordes y en Practicar). */
export function InstrumentPicker() {
  const m = useT()
  const inst = useStore((s) => s.current.instrument)
  const setInstrument = useStore((s) => s.setInstrument)
  return (
    <div className="inst-pick" role="group" aria-label={m.instrument}>
      {INSTRUMENT_ORDER.map((id) => (
        <button key={id} type="button" className={id === inst ? 'on' : ''} aria-pressed={id === inst} onClick={() => id !== inst && setInstrument(id)}>
          {m.inst[id]}
        </button>
      ))}
    </div>
  )
}

/** Instrumento + (en cuerdas) cejilla y zurdo + interruptor de tonalidad. */
export function InstrumentBar() {
  const m = useT()
  const inst = useStore((s) => s.current.instrument)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const strings = INSTRUMENTS[inst].kind === 'strings'
  return (
    <div className="ibar">
      <InstrumentPicker />
      <div className="ibar-opts">
        {strings && (
          <>
            <label className="ibar-capo">
              <span>{m.capo}</span>
              <select aria-label={m.capo} value={settings.capo} onChange={(e) => setSettings({ capo: Number(e.target.value) })}>
                {Array.from({ length: 8 }, (_, c) => (
                  <option key={c} value={c}>
                    {c === 0 ? m.no : c}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={`opt${settings.leftHanded ? ' on' : ''}`} aria-pressed={settings.leftHanded} onClick={() => setSettings({ leftHanded: !settings.leftHanded })}>
              {m.lefty}
            </button>
          </>
        )}
        <button type="button" className={`opt${settings.useKey ? ' on' : ''}`} aria-pressed={settings.useKey} onClick={() => setSettings({ useKey: !settings.useKey })}>
          {m.useKey}
        </button>
      </div>
    </div>
  )
}
