import { memo, useDeferredValue, useState } from 'react'
import type { ChordSpec, InstrumentId, Notation, Position, StringInstrument } from '../../engine'
import { INSTRUMENTS, QUALITIES, ROOTS, buildChord, chordSymbol, displayNote, libraryVariants, pcOf, toneOf } from '../../engine'
import { useT } from '../../i18n'
import { selectCapo, selectNotation } from '../../state/selectors'
import { useStore } from '../../state/store'
import { ChordBox } from '../diagrams/ChordBox'
import { FAMILY_COLOR } from '../diagrams/Dot'
import type { DotStyle } from '../diagrams/Dot'
import { Keyboard } from '../diagrams/Keyboard'
import { toneLabel } from '../diagrams/Neck'
import { play } from './useChordActions'

export interface ChordLibraryProps {
  /** cambio de raíz o bajo: el voicing más cercano */
  onGo: (spec: ChordSpec) => void
  /** tocar una tarjeta: exactamente la variante que se ve */
  onPick: (spec: ChordSpec, p: Position) => void
}

const withBass = (root: string, quality: ChordSpec['quality'], bass: string | undefined): ChordSpec =>
  bass === undefined || pcOf(bass) === pcOf(root) ? { root, quality } : { root, quality, bass }

/** Biblioteca: raíces, bajo y rejilla de calidades por grupo con ‹ › (= drawLib del artifact). */
export function ChordLibrary({ onGo, onPick }: ChordLibraryProps) {
  const m = useT()
  const notation = useStore(selectNotation)
  const cur = useStore((s) => s.current.chord)
  const inst = useStore((s) => s.current.instrument)
  const capo = useStore(selectCapo)
  const labels = useStore((s) => s.settings.labels)
  const lf = useStore((s) => s.settings.leftHanded)
  // la rejilla (18 acordes) se recalcula después del acorde principal
  const spec = useDeferredValue(cur)
  const rp = pcOf(cur.root)
  const bp = cur.bass === undefined ? null : pcOf(cur.bass)
  const nn = (n: string) => displayNote(n, notation)

  return (
    <section className="lib" aria-labelledby="lib-title">
      <h2 id="lib-title">{m.allOf(nn(cur.root))}</h2>
      <div className="rootrow" role="group" aria-label={m.root}>
        {ROOTS.map((r) => (
          <button key={r} type="button" aria-pressed={pcOf(r) === rp} className={pcOf(r) === rp ? 'on' : ''} onClick={() => onGo(withBass(r, cur.quality, cur.bass))}>
            {nn(r)}
          </button>
        ))}
      </div>
      <div className="rootrow bassrow" role="group" aria-label={m.bassRow}>
        <span className="rowlbl" aria-hidden="true">
          {m.bassRow}:
        </span>
        <button type="button" aria-label={m.noBass} aria-pressed={bp === null} className={bp === null ? 'on' : ''} onClick={() => onGo({ root: cur.root, quality: cur.quality })}>
          —
        </button>
        {ROOTS.filter((r) => pcOf(r) !== rp).map((r) => (
          <button key={r} type="button" aria-pressed={bp === pcOf(r)} className={bp === pcOf(r) ? 'on' : ''} onClick={() => onGo(withBass(cur.root, cur.quality, r))}>
            {nn(r)}
          </button>
        ))}
      </div>
      <p className="note">{m.libHelp}</p>
      <LibGrid key={`${inst}|${capo}|${spec.root}|${spec.bass ?? ''}`} spec={spec} inst={inst} capo={capo} labels={labels} lf={lf} notation={notation} onPick={onPick} />
    </section>
  )
}

interface GridProps {
  spec: ChordSpec
  inst: InstrumentId
  capo: number
  labels: 'notes' | 'intervals'
  lf: boolean
  notation: Notation
  onPick: (spec: ChordSpec, p: Position) => void
}

const LibGrid = memo(function LibGrid({ spec, inst, capo, labels, lf, notation, onPick }: GridProps) {
  const m = useT()
  // índice de variante por calidad; el `key` del padre lo reinicia al cambiar raíz/bajo/instrumento
  const [vi, setVi] = useState<Record<string, number>>({})
  const def = INSTRUMENTS[inst]
  return (
    <>
      {(['T', 'S', 'C'] as const).map((g) => (
        <div key={g}>
          <h3 className="lgh">{m.g[g]}</h3>
          <div className="lib-grid">
            {QUALITIES.filter((q) => q.group === g).map((q) => {
              const cs = withBass(spec.root, q.id, spec.bass)
              const c = buildChord(cs)
              const V = libraryVariants(c, inst, capo)
              if (!V.length) return null
              const i = Math.min(vi[q.id] ?? 0, V.length - 1)
              const p = V[i]
              const on = q.id === spec.quality
              const step = (d: number) => {
                const j = (i + d + V.length) % V.length
                setVi((x) => ({ ...x, [q.id]: j }))
                play([V[j]])
              }
              let fig
              if (p.kind === 'keys') {
                const marks: Record<number, DotStyle> = {}
                p.notes.forEach((n) => {
                  const t = toneOf(c, n % 12)
                  if (t) marks[n] = { fill: FAMILY_COLOR[t.family], txt: toneLabel(t, labels, notation) }
                })
                fig = <Keyboard lo={p.notes[0]} hi={p.notes[p.notes.length - 1]} marks={marks} mini notation={notation} />
              } else {
                fig = <ChordBox chord={c} frets={p.frets} inst={def as StringInstrument} capo={capo} leftHanded={lf} labels={labels} notation={notation} />
              }
              return (
                <div key={q.id} className={`lc${on ? ' on' : ''}`}>
                  <button type="button" className="lt" onClick={() => onPick(cs, p)}>
                    <b>{chordSymbol(cs, notation)}</b>
                    <span>{(m.q as Record<string, string>)[q.id]}</span>
                    {fig}
                  </button>
                  <div className="lv">
                    <button type="button" aria-label={m.prevShape} disabled={V.length < 2} onClick={() => step(-1)}>
                      ‹
                    </button>
                    <span>
                      {i + 1}/{V.length}
                    </span>
                    <button type="button" aria-label={m.nextShape} disabled={V.length < 2} onClick={() => step(1)}>
                      ›
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
})
