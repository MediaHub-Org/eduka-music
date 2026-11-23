import { buildChord, chainVoicings, chordSymbol, circleNeighbours, diatonic, displayNote, keySignature, PRESETS, relativeMajor, relativeMinor, scaleOf, spell } from '../../engine'
import type { ChordSet, ChordSpec, KeySpec, PresetProgression } from '../../engine'
import { useT } from '../../i18n'
import { selectCapo, selectNotation } from '../../state/selectors'
import { useStore } from '../../state/store'
import { Circle } from '../diagrams/Circle'
import { play, useChordActions } from '../chords/useChordActions'
import { setPendingPracticeSource } from '../practice/source'
import { useRoute } from '../shell/useRoute'

const SETS: ChordSet[] = ['triads', 'sevenths']

/** Pantalla Tonalidad: círculo, datos de la tonalidad, diatónicos y progresiones preset. */
export function KeyScreen() {
  const m = useT()
  const a = useChordActions()
  const [, go] = useRoute()
  const notation = useStore(selectNotation)
  const key = useStore((s) => s.current.key)
  const chordSet = useStore((s) => s.current.chordSet)
  const inst = useStore((s) => s.current.instrument)
  const capo = useStore(selectCapo)
  const nn = (n: string) => displayNote(n, notation)

  const maj = key.mode === 'maj'
  const sig = keySignature(key)
  const sigText = sig.type === 'none' ? m.sig0 : sig.type === 'sharp' ? m.sharps(sig.count) : m.flats(sig.count)
  const sc = scaleOf(key)
  const [left, right] = circleNeighbours(key)
  const keyName = `${nn(key.tonic)} ${maj ? m.major : m.minor}`
  const relative = maj ? `${nn(relativeMinor(key))}m` : nn(relativeMajor(key))
  // en menor, el V mayor armónico lleva la sensible (3ª del V)
  const leading = maj ? null : spell(sc[4], 4, 2)

  const pickKey = (k: KeySpec) => {
    const s = useStore.getState()
    s.setKey(k)
    a.goTo(diatonic(k, s.current.chordSet)[0].spec)
  }
  const pickChord = (set: ChordSet, spec: ChordSpec) => {
    useStore.getState().setChordSet(set)
    a.goTo(spec)
    go('chords')
  }
  const hear = (p: PresetProgression) => {
    const chords = p.degrees.map((d) => buildChord(diatonic(key, chordSet)[d].spec))
    play(chainVoicings(chords, inst, capo), 0.9)
  }
  const practise = (p: PresetProgression) => {
    setPendingPracticeSource({ kind: 'preset', key, presetId: p.id, chordSet })
    go('practice')
  }

  return (
    <div className="keyscreen">
      <div className="key-wheel">
        <h1 className="key-title">
          <small>{m.key}</small>
          {keyName}
        </h1>
        <Circle keySpec={key} notation={notation} onPick={pickKey} signatureLabel={sigText} />
        <p className="note">{m.wheelHelp}</p>
      </div>

      <div className="key-side">
        <dl className="facts">
          <div>
            <dt>{m.sigL}</dt>
            <dd>{sig.notes.length ? sig.notes.map(nn).join(' ') : '—'}</dd>
          </div>
          <div>
            <dt>{m.relL}</dt>
            <dd>{relative}</dd>
          </div>
          <div>
            <dt>
              {m.scaleL}
              {leading ? ` · ${m.harm}` : ''}
            </dt>
            <dd>
              {sc.map(nn).join(' ')}
              {leading ? ` · ${nn(leading)}` : ''}
            </dd>
          </div>
          <div>
            <dt>{m.neighL}</dt>
            <dd>
              {nn(left)} · {nn(right)}
            </dd>
          </div>
        </dl>

        {SETS.map((set) => (
          <section key={set} className="diat">
            <h2>
              {m.chordsIn} {keyName} · {set === 'triads' ? m.triads : m.sevenths}
            </h2>
            <div className="row" role="group" aria-label={`${m.chordsIn} ${keyName} · ${set === 'triads' ? m.triads : m.sevenths}`}>
              {diatonic(key, set).map((c) => (
                <button type="button" key={c.degree} className="card" onClick={() => pickChord(set, c.spec)}>
                  <span className="rn">{c.roman}</span>
                  <span className="nm">{chordSymbol(c.spec, notation)}</span>
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className="progs-sec">
          <h2>{m.progressions}</h2>
          <ul className="progs">
            {PRESETS[key.mode].map((p) => {
              const name = m.P[p.id]
              return (
                <li key={p.id} className="prog">
                  <div className="prog-txt">
                    <small>
                      {name} · {p.roman}
                    </small>
                    <b>{p.degrees.map((d) => chordSymbol(diatonic(key, chordSet)[d].spec, notation)).join(' · ')}</b>
                  </div>
                  <button type="button" className="prog-play" aria-label={`${m.listen} ${name}`} onClick={() => hear(p)}>
                    ▶
                  </button>
                  <button type="button" className="prog-go" aria-label={`${m.navPractice} ${name}`} onClick={() => practise(p)}>
                    {m.navPractice}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
