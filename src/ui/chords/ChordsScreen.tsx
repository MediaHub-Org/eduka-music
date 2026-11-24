import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { ChordSpec, Position, StringInstrument } from '../../engine'
import { INSTRUMENTS, chordSymbol, displayNote, keysContaining, positionKey, toneOf } from '../../engine'
import { useT } from '../../i18n'
import { chordLongName } from '../../i18n/text'
import {
  selectCapo,
  selectIsFavorite,
  selectNotation,
  useCurrentChord,
  useNext,
  usePositionList,
  useSelectedIndex,
} from '../../state/selectors'
import { useStore } from '../../state/store'
import { FAMILY_COLOR } from '../diagrams/Dot'
import type { DotStyle } from '../diagrams/Dot'
import { Keyboard } from '../diagrams/Keyboard'
import { Neck, toneLabel } from '../diagrams/Neck'
import { useHotkeys } from '../shell/useHotkeys'
import { ChangePanel } from './ChangePanel'
import { ChordLibrary } from './ChordLibrary'
import { InstrumentBar } from './InstrumentBar'
import { KeyStrip } from './KeyStrip'
import { LabelsToggle, ListenButton, PositionStepper } from './PositionStepper'
import { play, useChordActions } from './useChordActions'

/** Ancho del contenedor con ResizeObserver (0 hasta medir). */
function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

/**
 * Móvil: si al cambiar de posición o de acorde los puntos elegidos quedan tapados (bajo la
 * barra del pulgar o fuera de pantalla por arriba), desplaza la página lo justo. No actúa al montar.
 */
function useKeepPositionVisible(stage: RefObject<HTMLDivElement | null>, key: string | null, spec: object) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = stage.current
    if (!el || typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 760px)').matches) return
    const dots = [...el.querySelectorAll('[data-on="true"]')].map((d) => d.getBoundingClientRect())
    if (!dots.length) return
    const top = Math.min(...dots.map((r) => r.top)) - 16
    const bottom = Math.max(...dots.map((r) => r.bottom)) + 16
    const minY = 0
    const maxY = document.querySelector('.dock')?.getBoundingClientRect().top ?? window.innerHeight
    let dy = 0
    if (bottom > maxY) dy = bottom - maxY
    else if (top < minY) dy = top - minY
    if (dy) window.scrollBy?.({ top: dy, behavior: 'smooth' })
  }, [stage, key, spec])
}

export function ChordsScreen({ hotkeys = true }: { hotkeys?: boolean }) {
  const m = useT()
  const a = useChordActions()
  const notation = useStore(selectNotation)
  const inst = useStore((s) => s.current.instrument)
  const capo = useStore(selectCapo)
  const lf = useStore((s) => s.settings.leftHanded)
  const labels = useStore((s) => s.settings.labels)
  const chord = useCurrentChord()
  const list = usePositionList()
  const idx = useSelectedIndex()
  const P: Position | null = list[idx] ?? null
  const fav = useStore(selectIsFavorite(chord.spec, P ? positionKey(P) : null))
  const nx = useNext()
  const [stage, stageW] = useWidth<HTMLDivElement>()
  const def = INSTRUMENTS[inst]
  const nn = (n: string) => displayNote(n, notation)
  const symbol = chordSymbol(chord.spec, notation)
  const dirLabel = { down: m.dDown, up: m.dUp, step: m.dStep, variant: m.dVar }[nx.dir]
  const useKey = useStore((s) => s.settings.useKey)
  const suggestions = useKey && !nx.inKey ? keysContaining(chord.spec).slice(0, 3) : []

  const hero = useRef<HTMLElement>(null)
  /** Tras elegir en la biblioteca: el nombre del acorde y el mástil a la vista. */
  const pickFromLibrary = useCallback(
    (spec: ChordSpec, p: Position) => {
      a.goTo(spec, p)
      hero.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    },
    [a],
  )
  useKeepPositionVisible(stage, P ? positionKey(P) : null, chord.spec)

  useHotkeys(
    {
      ArrowLeft: () => a.stepPosition(-1),
      ArrowRight: () => a.stepPosition(1),
      ' ': () => a.listen(),
      ...(useKey ? { n: () => a.next(), N: () => a.next(), b: () => a.back(), B: () => a.back() } : {}),
      f: () => a.toggleFavorite(),
      F: () => a.toggleFavorite(),
    },
    hotkeys,
  )

  let diagram
  if (!P) diagram = <p className="nopos">{m.noPosition}</p>
  else if (P.kind === 'keys') {
    const marks: Record<number, DotStyle> = {}
    P.notes.forEach((x) => {
      const t = toneOf(chord, x % 12)
      if (t) marks[x] = { fill: FAMILY_COLOR[t.family], txt: toneLabel(t, labels, notation), ring: t.family === 'r' }
    })
    diagram = <Keyboard lo={48} hi={Math.max(71, P.notes[P.notes.length - 1])} marks={marks} notation={notation} />
  } else if (def.kind === 'strings')
    diagram = (
      <Neck chord={chord} position={P} inst={def as StringInstrument} capo={capo} vertical={stageW < 640} leftHanded={lf} labels={labels} notation={notation} />
    )

  const instNote =
    def.kind === 'piano' ? m.pianoNote : [capo ? m.capoOn(capo) : '', def.reentrant ? m.reent : ''].filter(Boolean).join(' ')

  return (
    <div className="chords">
      <InstrumentBar />

      {useKey && <KeyStrip next={nx.inKey ? nx.spec : null} onPick={a.goTo} onSet={a.switchSet} />}

      <header className="hero" ref={hero}>
        <div className="hero-name">
          <h1 className="cn" data-testid="chord-symbol">
            {symbol}
          </h1>
          <span className="long">{chordLongName(chord.spec, m, notation)}</span>
        </div>
        <button
          type="button"
          className={`fav${fav ? ' on' : ''}`}
          aria-pressed={fav}
          aria-label={fav ? m.favRemove : m.favAdd}
          disabled={!P}
          onClick={a.toggleFavorite}
        >
          {fav ? '★' : '☆'}
        </button>
      </header>
      <div className="tones-row">
        <ul className="tones" aria-label={m.chord}>
          {[...chord.tones, ...(chord.bassTone && chord.bassTone.family === 'b' ? [chord.bassTone] : [])].map((t) => (
            <li key={`${t.pc}-${t.label}`} className="tone">
              <i style={{ background: FAMILY_COLOR[t.family] }} className={t.family === 'r' ? 'root' : undefined}>
                {t.label}
              </i>
              {nn(t.name)}
            </li>
          ))}
        </ul>
        <LabelsToggle />
      </div>

      <div className={`stage${P?.kind === 'frets' && stageW < 640 ? ' vert' : ''}`} ref={stage}>
        {diagram}
      </div>
      {instNote && <p className="note inst-note">{instNote}</p>}

      <div className="side">
        <div className="dock">
          <PositionStepper list={list} index={idx} onStep={a.stepPosition} />
          <div className="dock-actions">
            <ListenButton onListen={a.listen} disabled={!P} />
            {useKey && (
              <button type="button" className="next-btn" onClick={a.next}>
                <span className="nb-main">{nx.inKey ? m.nextBtn : m.variantBtn}</span>
                <small>
                  {nx.inKey ? `${dirLabel} · ` : ''}
                  {chordSymbol(nx.spec, notation)}
                </small>
              </button>
            )}
          </div>
          {suggestions.length > 0 && <p className="keysugg-lbl" id="keysugg-lbl">{m.keysWith}</p>}
          {suggestions.length > 0 && (
            <div className="keysugg" role="group" aria-labelledby="keysugg-lbl">
              {suggestions.map((k) => (
                <button key={`${k.tonic}${k.mode}`} type="button" data-testid="key-suggestion" onClick={() => a.adoptKey(k)}>
                  {nn(k.tonic)} {k.mode === 'maj' ? m.major : m.minor}
                </button>
              ))}
            </div>
          )}
        </div>
        {useKey && <ChangePanel onBack={a.back} onHear={(p, q) => play([p, q], 1.1)} />}
      </div>

      <ChordLibrary
        onGo={a.goTo}
        onPick={pickFromLibrary}
      />
    </div>
  )
}
