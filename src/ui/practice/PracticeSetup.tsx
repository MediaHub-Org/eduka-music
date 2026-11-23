import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { PRESETS, chordSymbol, displayNote } from '../../engine'
import type { ChordSpec, ProgressionItem, TimeSignature } from '../../engine'
import { useT } from '../../i18n'
import { selectNotation } from '../../state/selectors'
import { useStore } from '../../state/store'
import type { PracticePrefs } from '../../state/store'
import { SearchBox } from '../chords/SearchBox'
import type { PracticeSource } from './source'
import { BPM_MAX, BPM_MIN } from './usePractice'

const METERS: TimeSignature[] = ['4/4', '3/4', '6/8']
const BARS: PracticePrefs['barsPerChord'][] = [1, 2, 4]
const COUNT_IN: PracticePrefs['countInBars'][] = [0, 1, 2]
export const MAX_MANUAL = 4

export interface PracticeSetupProps {
  src: PracticeSource
  chords: ChordSpec[]
  onSource: (s: PracticeSource) => void
  ts: TimeSignature
  onTs: (t: TimeSignature) => void
  bpm: number
  onBpm: (n: number) => void
  /** Las duraciones vienen de una progresión guardada (no de "compases por acorde"). */
  savedBeats: boolean
  items: ProgressionItem[]
  onStart: () => void
}

function Seg<T extends string | number>({ label, value, options, onPick, fmt = String }: { label: string; value: T; options: T[]; onPick: (v: T) => void; fmt?: (v: T) => string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o)} type="button" className={o === value ? 'on' : undefined} aria-pressed={o === value} onClick={() => onPick(o)}>
          {fmt(o)}
        </button>
      ))}
    </div>
  )
}

function Field({ label, children, id }: { label: string; children: ReactNode; id?: string }) {
  return (
    <div className="pfield">
      <span className="pfield-l" id={id}>
        {label}
      </span>
      {children}
    </div>
  )
}

/** Pantalla de configuración de la práctica. */
export function PracticeSetup(p: PracticeSetupProps) {
  const m = useT()
  const notation = useStore(selectNotation)
  const prefs = useStore((s) => s.practice)
  const setPrefs = useStore((s) => s.setPracticePrefs)
  const progressions = useStore((s) => s.progressions)
  const storeKey = useStore((s) => s.current.key)
  const storeSet = useStore((s) => s.current.chordSet)
  const [naming, setNaming] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)
  const uid = useId()
  const sym = (c: ChordSpec) => chordSymbol(c, notation)
  const { src } = p

  const pickKind = (kind: PracticeSource['kind']) => {
    if (kind === src.kind) return
    if (kind === 'manual') p.onSource({ kind: 'manual', chords: p.chords.slice(0, MAX_MANUAL) })
    else if (kind === 'preset') p.onSource({ kind: 'preset', key: storeKey, chordSet: storeSet, presetId: PRESETS[storeKey.mode][0].id })
    else if (progressions[0]) p.onSource({ kind: 'saved', id: progressions[0].id })
  }
  const kinds: PracticeSource['kind'][] = progressions.length || src.kind === 'saved' ? ['manual', 'preset', 'saved'] : ['manual', 'preset']
  const kindName = { manual: m.pr.manual, preset: m.pr.preset, saved: m.pr.saved }

  const manual = src.kind === 'manual' ? src.chords : null
  const save = (e: FormEvent) => {
    e.preventDefault()
    const name = (naming ?? '').trim()
    if (!name || !p.items.length) return
    useStore.getState().saveProgression({ name, timeSignature: p.ts, items: p.items, bpm: p.bpm })
    setNaming(null)
    setSavedName(name)
  }
  const pct = (v: number) => `${Math.round(v * 100)} %`

  return (
    <div className="psetup">
      <h1 className="ptitle">{m.navPractice}</h1>

      <section className="pcard">
        <Field label={m.pr.source}>
          <Seg label={m.pr.source} value={src.kind} options={kinds} onPick={pickKind} fmt={(k) => kindName[k]} />
        </Field>

        {src.kind === 'preset' && (
          <label className="pselect">
            <span className="sr">{m.pr.preset}</span>
            <select
              value={src.presetId}
              onChange={(e) => p.onSource({ ...src, presetId: e.target.value as typeof src.presetId })}
            >
              {PRESETS[src.key.mode].map((x) => (
                <option key={x.id} value={x.id}>
                  {m.P[x.id]} · {x.roman}
                </option>
              ))}
            </select>
            <small className="note">
              {m.pr.inKey} {displayNote(src.key.tonic, notation)} {src.key.mode === 'maj' ? m.major : m.minor} · {src.chordSet === 'triads' ? m.triads : m.sevenths}
            </small>
          </label>
        )}
        {src.kind === 'saved' && (
          <label className="pselect">
            <span className="sr">{m.pr.saved}</span>
            <select value={src.id} onChange={(e) => p.onSource({ kind: 'saved', id: e.target.value })}>
              {progressions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <ol className="pchords" data-testid="practice-chords" aria-label={m.pr.chords}>
          {p.chords.map((c, i) => (
            <li key={`${i}-${sym(c)}`} className={manual ? 'removable' : undefined}>
              <span>{sym(c)}</span>
              {manual && (
                <button
                  type="button"
                  className="pchip-x"
                  aria-label={m.pr.remove(sym(c))}
                  onClick={() => p.onSource({ kind: 'manual', chords: manual.filter((_, j) => j !== i) })}
                />
              )}
            </li>
          ))}
        </ol>
        {manual && manual.length < MAX_MANUAL && (
          <>
            <SearchBox onPick={(spec) => p.onSource({ kind: 'manual', chords: [...manual, spec].slice(0, MAX_MANUAL) })} />
            {manual.length < 2 && <p className="note">{m.pr.add}</p>}
          </>
        )}
      </section>

      <section className="pcard pgrid">
        <Field label={m.pr.meter}>
          <Seg label={m.pr.meter} value={p.ts} options={METERS} onPick={p.onTs} />
          {p.ts === '6/8' && <small className="note">{m.pr.meterNote}</small>}
        </Field>
        <Field label={m.pr.bpm}>
          <div className="pbpm-set">
            <button type="button" className="icon-btn" aria-label={m.pr.bpmDown} onClick={() => p.onBpm(p.bpm - 5)} disabled={p.bpm <= BPM_MIN}>
              −
            </button>
            <output aria-live="polite">{p.bpm}</output>
            <button type="button" className="icon-btn" aria-label={m.pr.bpmUp} onClick={() => p.onBpm(p.bpm + 5)} disabled={p.bpm >= BPM_MAX}>
              +
            </button>
          </div>
          <input type="range" min={BPM_MIN} max={BPM_MAX} step={1} value={p.bpm} aria-label={m.pr.bpm} onChange={(e) => p.onBpm(Number(e.target.value))} />
        </Field>
        <Field label={m.pr.bars}>
          <Seg label={m.pr.bars} value={p.savedBeats ? (0 as PracticePrefs['barsPerChord']) : prefs.barsPerChord} options={BARS} onPick={(b) => setPrefs({ barsPerChord: b })} />
          {p.savedBeats && <small className="note">{m.pr.barsSaved}</small>}
        </Field>
        <Field label={m.pr.countIn}>
          <Seg label={m.pr.countIn} value={prefs.countInBars} options={COUNT_IN} onPick={(c) => setPrefs({ countInBars: c })} />
        </Field>
      </section>

      <section className="pcard pgrid">
        <Field label={m.pr.sound}>
          <div className="psound">
            <button type="button" className={prefs.clickOn ? 'on' : undefined} aria-pressed={prefs.clickOn} onClick={() => setPrefs({ clickOn: !prefs.clickOn })}>
              {m.pr.click}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={prefs.clickVolume} disabled={!prefs.clickOn} aria-label={m.pr.volume(m.pr.click)} aria-valuetext={pct(prefs.clickVolume)} onChange={(e) => setPrefs({ clickVolume: Number(e.target.value) })} />
          </div>
          <div className="psound">
            <button type="button" className={prefs.chordOn ? 'on' : undefined} aria-pressed={prefs.chordOn} onClick={() => setPrefs({ chordOn: !prefs.chordOn })}>
              {m.pr.chordSound}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={prefs.chordVolume} disabled={!prefs.chordOn} aria-label={m.pr.volume(m.pr.chordSound)} aria-valuetext={pct(prefs.chordVolume)} onChange={(e) => setPrefs({ chordVolume: Number(e.target.value) })} />
          </div>
        </Field>
        <Field label={m.pr.ramp}>
          <button type="button" className={`pramp-t${prefs.ramp.enabled ? ' on' : ''}`} aria-pressed={prefs.ramp.enabled} onClick={() => setPrefs({ ramp: { ...prefs.ramp, enabled: !prefs.ramp.enabled } })}>
            {prefs.ramp.enabled ? m.yes : m.no}
          </button>
          {prefs.ramp.enabled && (
            <div className="pramp">
              {(
                [
                  ['step', m.pr.rampStep, 1, 20],
                  ['everyLoops', m.pr.rampEvery, 1, 16],
                  ['max', m.pr.rampMax, BPM_MIN, BPM_MAX],
                ] as const
              ).map(([k, label, min, max]) => (
                <label key={k}>
                  <span>{label}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    value={prefs.ramp[k]}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (Number.isFinite(v)) setPrefs({ ramp: { ...prefs.ramp, [k]: Math.min(max, Math.max(min, Math.round(v))) } })
                    }}
                  />
                </label>
              ))}
            </div>
          )}
        </Field>
      </section>

      <section className="pcard">
        {naming === null ? (
          <button type="button" className="psave" disabled={!p.items.length} onClick={() => { setSavedName(null); setNaming(p.chords.map(sym).join(' – ')) }}>
            {m.pr.save}
          </button>
        ) : (
          <form className="psave-form" onSubmit={save}>
            <label htmlFor={`${uid}-n`} className="sr">
              {m.pr.name}
            </label>
            <input id={`${uid}-n`} type="text" value={naming} autoFocus maxLength={60} onChange={(e) => setNaming(e.target.value)} placeholder={m.pr.name} />
            <button type="submit" className="on" disabled={!naming.trim()}>
              {m.pr.saveBtn}
            </button>
            <button type="button" onClick={() => setNaming(null)}>
              {m.pr.cancel}
            </button>
          </form>
        )}
        {savedName && <p className="note" role="status">{m.pr.savedOk(savedName)}</p>}
        <p className="note pkeys">{m.pr.keys}</p>
      </section>

      <div className="pdock">
        <button type="button" className="pgo" onClick={p.onStart} disabled={!p.items.length}>
          {m.pr.start}
        </button>
        {!p.items.length && <p className="note">{m.pr.empty}</p>}
      </div>
    </div>
  )
}
