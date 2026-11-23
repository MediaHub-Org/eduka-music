import { useEffect, useRef } from 'react'
import type { ChordSpec } from '../../engine'
import { chordSymbol, diatonic, displayNote, pcOf } from '../../engine'
import { useT } from '../../i18n'
import { selectNotation } from '../../state/selectors'
import { useStore } from '../../state/store'

export interface KeyStripProps {
  /** acorde destino de "Siguiente" (se marca si está en la tonalidad) */
  next: ChordSpec | null
  onPick: (spec: ChordSpec) => void
  onSet: (set: 'triads' | 'sevenths') => void
}

const same = (a: ChordSpec, b: ChordSpec) => a.bass === undefined && b.bass === undefined && pcOf(a.root) === pcOf(b.root) && a.quality === b.quality

/** Tira con los diatónicos de la tonalidad actual (= fila .row del artifact). */
export function KeyStrip({ next, onPick, onSet }: KeyStripProps) {
  const m = useT()
  const notation = useStore(selectNotation)
  const key = useStore((s) => s.current.key)
  const set = useStore((s) => s.current.chordSet)
  const cur = useStore((s) => s.current.chord)
  const row = useRef<HTMLDivElement>(null)
  const chords = diatonic(key, set)
  const keyName = `${displayNote(key.tonic, notation)} ${key.mode === 'maj' ? m.major : m.minor}`
  const curIdx = chords.findIndex((c) => same(c.spec, cur))

  // centra el acorde actual si la tira se desplaza (móvil)
  useEffect(() => {
    const el = row.current
    const c = el?.querySelector<HTMLElement>('.card.cur')
    if (!el || !c || el.scrollWidth <= el.clientWidth) return
    el.scrollTo?.({ left: c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2, behavior: 'smooth' })
  }, [curIdx, key, set])

  return (
    <section className="strip">
      <div className="strip-hd">
        <a className="key-link" href="#/tonalidad">
          <small>{m.key}</small>
          <b>{keyName}</b>
          <span aria-hidden="true">›</span>
        </a>
        <div className="seg" role="group" aria-label={`${m.triads} / ${m.sevenths}`}>
          <button type="button" aria-pressed={set === 'triads'} className={set === 'triads' ? 'on' : ''} onClick={() => onSet('triads')}>
            {m.triads}
          </button>
          <button type="button" aria-pressed={set === 'sevenths'} className={set === 'sevenths' ? 'on' : ''} onClick={() => onSet('sevenths')}>
            {m.sevenths}
          </button>
        </div>
      </div>
      <div className="row" ref={row} role="group" aria-label={`${m.chordsIn} ${keyName}`}>
        {chords.map((c, i) => {
          const isCur = i === curIdx
          const isNext = curIdx >= 0 && next !== null && same(c.spec, next) && !isCur
          return (
            <button
              type="button"
              key={i}
              className={`card${isCur ? ' cur' : ''}${isNext ? ' cmp' : ''}`}
              aria-pressed={isCur}
              onClick={() => onPick(c.spec)}
            >
              <span className="rn">{c.roman}</span>
              <span className="nm">{chordSymbol(c.spec, notation)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
