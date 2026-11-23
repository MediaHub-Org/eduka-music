import { useId, useMemo, useState } from 'react'
import type { Chord, Direction, InstrumentId, Notation, Position, StringInstrument } from '../../engine'
import { INSTRUMENTS, buildChord, chordSymbol, describeChange, toneOf } from '../../engine'
import { useT } from '../../i18n'
import { changeSentence } from '../../i18n/text'
import { selectCapo, selectNotation, useCurrentChord, useNext, useSelectedPosition } from '../../state/selectors'
import { useStore } from '../../state/store'
import { ChordBox } from '../diagrams/ChordBox'
import { FAMILY_COLOR } from '../diagrams/Dot'
import type { DotStyle } from '../diagrams/Dot'
import { Keyboard } from '../diagrams/Keyboard'
import { toneLabel } from '../diagrams/Neck'

const wide = (): boolean => {
  try {
    return window.matchMedia('(min-width: 760px)').matches
  } catch {
    return false
  }
}

export interface ChangePanelProps {
  onBack: () => void
  onHear: (a: Position, b: Position) => void
}

/** Cambio al siguiente acorde (= .chg / drawChange del artifact). Plegable en móvil. */
export function ChangePanel({ onBack, onHear }: ChangePanelProps) {
  const m = useT()
  const notation = useStore(selectNotation)
  const inst = useStore((s) => s.current.instrument)
  const capo = useStore(selectCapo)
  const lf = useStore((s) => s.settings.leftHanded)
  const labels = useStore((s) => s.settings.labels)
  const setDirection = useStore((s) => s.setDirection)
  const [open, setOpen] = useState(wide)
  const bodyId = useId()
  const A = useCurrentChord()
  const P = useSelectedPosition()
  const nx = useNext()
  const B = useMemo(() => buildChord(nx.spec), [nx.spec])
  const PN = nx.position
  const nameA = chordSymbol(A.spec, notation)
  const nameB = chordSymbol(nx.spec, notation)
  const dirs: [Direction, string][] = [['down', m.dDown], ['up', m.dUp], ['step', m.dStep], ['variant', m.dVar]]
  const sentence = P && PN ? changeSentence(describeChange(A, P, B, PN, inst, capo), A.spec, nx.spec, inst, m, notation) : m.noPosition

  return (
    <section className={`chg${open ? ' open' : ''}`}>
      <button type="button" className="chg-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
        <span>{m.next}</span>
        <b>
          {nameA} → {nameB}
        </b>
        <span className="chev" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div id={bodyId} className="chg-body">
          <div className="chips" role="radiogroup" aria-label={m.next}>
            {dirs.map(([d, t]) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={nx.dir === d}
                className={nx.dir === d ? 'on' : ''}
                disabled={!nx.inKey && d !== 'variant'}
                onClick={() => setDirection(d)}
              >
                {t}
              </button>
            ))}
          </div>
          {P && PN && <Pair A={A} B={B} P={P} PN={PN} nameA={nameA} nameB={nameB} lf={lf} labels={labels} capo={capo} inst={inst} notation={notation} />}
          <p className="say">{sentence}</p>
          <div className="chips">
            <button type="button" onClick={onBack}>
              {m.back}
            </button>
            <button type="button" disabled={!P || !PN} onClick={() => P && PN && onHear(P, PN)}>
              {m.hearBoth}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

interface PairProps {
  A: Chord
  B: Chord
  P: Position
  PN: Position
  nameA: string
  nameB: string
  lf: boolean
  labels: 'notes' | 'intervals'
  capo: number
  inst: InstrumentId
  notation: Notation
}

/** Las dos cajas A→B (o teclados mini en piano), con lo que se mueve en naranja. */
function Pair(props: PairProps) {
  const { A, B, P, PN, inst, notation } = props
  const def = INSTRUMENTS[inst]
  let a, b
  if (P.kind === 'keys' && PN.kind === 'keys') {
    const inn = PN.notes.filter((x) => !P.notes.includes(x))
    const out = P.notes.filter((x) => !PN.notes.includes(x))
    const mA: Record<number, DotStyle> = {}
    const mB: Record<number, DotStyle> = {}
    P.notes.forEach((x) => {
      const t = toneOf(A, x % 12)
      if (t) mA[x] = { fill: FAMILY_COLOR[t.family], txt: toneLabel(t, props.labels, notation) }
    })
    PN.notes.forEach((x) => {
      const t = toneOf(B, x % 12)
      if (t) mB[x] = { fill: inn.includes(x) ? 'var(--mv)' : FAMILY_COLOR[t.family], txt: toneLabel(t, props.labels, notation) }
    })
    out.forEach((x) => {
      if (!mB[x]) mB[x] = { fill: 'none', stroke: 'var(--mv)', sw: 2, dash: true }
    })
    const lo = Math.min(...P.notes, ...PN.notes)
    const hi = Math.max(...P.notes, ...PN.notes)
    a = <Keyboard lo={lo} hi={hi} marks={mA} mini notation={notation} />
    b = <Keyboard lo={lo} hi={hi} marks={mB} mini notation={notation} />
  } else if (P.kind === 'frets' && PN.kind === 'frets' && def.kind === 'strings') {
    const sInst = def as StringInstrument
    const moved = P.frets.map((f, s) => (f !== PN.frets[s] ? s : -1)).filter((s) => s >= 0)
    const ghosts = moved.filter((s) => P.frets[s] != null && PN.frets[s] != null).map((s) => ({ s, f: P.frets[s] as number }))
    const common = { inst: sInst, capo: props.capo, leftHanded: props.lf, labels: props.labels, notation }
    a = <ChordBox chord={A} frets={P.frets} extraFrets={PN.frets} {...common} />
    b = <ChordBox chord={B} frets={PN.frets} ghosts={ghosts} moved={moved.filter((s) => PN.frets[s] != null)} extraFrets={P.frets} {...common} />
  } else return null
  return (
    <div className="pair">
      <div>
        <h3>{props.nameA}</h3>
        {a}
      </div>
      <div className="arrow" aria-hidden="true">
        →
      </div>
      <div>
        <h3>{props.nameB}</h3>
        {b}
      </div>
    </div>
  )
}
