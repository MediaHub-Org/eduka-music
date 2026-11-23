import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { INSTRUMENTS, PRESETS, beatsPerBar, buildChord, chordSymbol, toneOf } from '../../engine'
import type { ChordSpec, Position, ProgressionItem, StringInstrument, TimeSignature } from '../../engine'
import { useT } from '../../i18n'
import { selectCapo, selectNotation } from '../../state/selectors'
import { useStore } from '../../state/store'
import { ChordBox } from '../diagrams/ChordBox'
import { FAMILY_COLOR } from '../diagrams/Dot'
import type { DotStyle } from '../diagrams/Dot'
import { Keyboard } from '../diagrams/Keyboard'
import { toneLabel } from '../diagrams/Neck'
import { useHotkeys } from '../shell/useHotkeys'
import { PracticeSetup } from './PracticeSetup'
import { sourceChords, takePendingPracticeSource } from './source'
import type { PracticeSource } from './source'
import { clampBpm, usePractice } from './usePractice'
import { useWakeLock } from './useWakeLock'

const DEFAULT_BPM = 80

/** Diagrama del voicing encadenado (o el aviso si ese bajo no tiene posición). */
function Voicing({ spec, position, mini }: { spec: ChordSpec; position: Position | null; mini?: boolean }) {
  const m = useT()
  const inst = useStore((s) => s.current.instrument)
  const capo = useStore(selectCapo)
  const lf = useStore((s) => s.settings.leftHanded)
  const labels = useStore((s) => s.settings.labels)
  const notation = useStore(selectNotation)
  const chord = useMemo(() => buildChord(spec), [spec])
  const def = INSTRUMENTS[inst]
  if (!position) return <p className="nopos">{m.noPosition}</p>
  if (position.kind === 'keys') {
    const marks: Record<number, DotStyle> = {}
    position.notes.forEach((x) => {
      const t = toneOf(chord, x % 12)
      if (t) marks[x] = { fill: FAMILY_COLOR[t.family], txt: toneLabel(t, labels, notation), ring: t.family === 'r' }
    })
    return <Keyboard lo={48} hi={Math.max(71, position.notes[position.notes.length - 1])} marks={marks} mini={mini} notation={notation} />
  }
  return <ChordBox chord={chord} frets={position.frets} inst={def as StringInstrument} capo={capo} leftHanded={lf} labels={labels} notation={notation} />
}

/** Modo práctica: configuración y, en marcha, acorde actual + siguiente + metrónomo. */
export function PracticeScreen({ hotkeys = true }: { hotkeys?: boolean }) {
  const m = useT()
  const notation = useStore(selectNotation)
  const progressions = useStore((s) => s.progressions)
  const barsPerChord = useStore((s) => s.practice.barsPerChord)
  const inst = useStore((s) => s.current.instrument)
  const capo = useStore(selectCapo)

  const [src, setSrc] = useState<PracticeSource>(() => {
    const { key, chordSet } = useStore.getState().current
    return { kind: 'preset', key, chordSet, presetId: PRESETS[key.mode][0].id }
  })
  const [ts, setTsState] = useState<TimeSignature>('4/4')
  const [bpm, setBpmState] = useState(DEFAULT_BPM)
  const [savedBeats, setSavedBeats] = useState<number[] | null>(null)

  const applySource = useCallback((s: PracticeSource) => {
    setSrc(s)
    const r = sourceChords(s, useStore.getState().progressions)
    if (s.kind === 'saved' && r.beats) {
      setSavedBeats(r.beats)
      if (r.ts) setTsState(r.ts)
      if (r.bpm) setBpmState(clampBpm(r.bpm))
    } else setSavedBeats(null)
  }, [])

  // traspaso desde Tonalidad / Mis cosas: se consume al montar (en un efecto, a prueba de StrictMode)
  useEffect(() => {
    const pending = takePendingPracticeSource()
    if (pending) applySource(pending)
  }, [applySource])

  const chords = useMemo(() => sourceChords(src, progressions).chords, [src, progressions])
  const items = useMemo<ProgressionItem[]>(() => {
    const bpb = beatsPerBar(ts)
    return chords.map((chord, i) => ({ chord, beats: savedBeats?.[i] ?? barsPerChord * bpb }))
  }, [chords, ts, savedBeats, barsPerChord])

  const pr = usePractice(items, ts, bpm)
  useWakeLock(pr.running)

  // cambiar de instrumento o de cejilla detiene la práctica
  const stopRef = useRef(pr.stop)
  stopRef.current = pr.stop
  useEffect(() => () => stopRef.current(), [inst, capo])

  const changeBpm = (n: number) => {
    const b = clampBpm(n)
    setBpmState(b)
    if (pr.running) pr.setBpm(b)
  }
  const shownBpm = pr.running ? pr.bpmNow : bpm
  const toggle = () => (pr.running ? pr.stop() : items.length && pr.start())

  useHotkeys(
    {
      ' ': toggle,
      ArrowUp: () => changeBpm(shownBpm + 5),
      ArrowDown: () => changeBpm(shownBpm - 5),
      Escape: () => pr.running && pr.stop(),
    },
    hotkeys,
  )

  if (!pr.running)
    return (
      <PracticeSetup
        src={src}
        chords={chords}
        onSource={applySource}
        ts={ts}
        onTs={(t) => {
          setTsState(t)
          setSavedBeats(null)
        }}
        bpm={bpm}
        onBpm={changeBpm}
        savedBeats={savedBeats !== null}
        onBars={(b) => {
          useStore.getState().setPracticePrefs({ barsPerChord: b })
          setSavedBeats(null)
        }}
        items={items}
        onStart={pr.start}
      />
    )

  const n = items.length
  const cur = items[pr.index] ?? items[0]
  const nextI = (pr.index + 1) % n
  const nxt = items[nextI]
  const bpb = beatsPerBar(ts)
  const sym = (c: ChordSpec) => chordSymbol(c, notation)
  const isKeys = INSTRUMENTS[inst].kind === 'piano'

  return (
    <div className="prun">
      <div className="prun-hd">
        <span className="prun-loop" aria-live="polite">
          {pr.loop < 0 ? m.pr.countingIn : m.pr.loop(pr.loop + 1)}
        </span>
        <ol className="beats" aria-label={m.pr.beats}>
          {Array.from({ length: bpb }, (_, i) => (
            <li
              key={i}
              className={[i === 0 || (ts === '6/8' && i === 3) ? 'acc' : '', i === pr.beatInBar ? 'on' : ''].filter(Boolean).join(' ') || undefined}
              aria-current={i === pr.beatInBar ? 'step' : undefined}
            >
              {i + 1}
            </li>
          ))}
        </ol>
      </div>

      <div className="prun-main">
        <section className={`prun-cur${pr.loop < 0 ? ' pending' : ''}`}>
          <h1 className="prun-name" data-testid="practice-current">
            {sym(cur.chord)}
          </h1>
          <div className={`prun-fig${isKeys ? ' keys' : ''}`}>
            <Voicing spec={cur.chord} position={pr.voicings[pr.index] ?? null} />
          </div>
        </section>
        {n > 1 && (
          <section className="prun-next" aria-label={m.pr.next}>
            <small>{m.pr.next}</small>
            <b>{sym(nxt.chord)}</b>
            <div className={`prun-fig-mini${isKeys ? ' keys' : ''}`}>
              <Voicing spec={nxt.chord} position={pr.voicings[nextI] ?? null} mini />
            </div>
          </section>
        )}
      </div>

      <div className="pdock prun-dock">
        <div className="pbpm">
          <button type="button" aria-label={m.pr.bpmDown} onClick={() => changeBpm(pr.bpmNow - 5)}>
            −
          </button>
          <div className="pbpm-v">
            <b data-testid="practice-bpm">{pr.bpmNow}</b>
            <small>{m.pr.bpm}</small>
          </div>
          <button type="button" aria-label={m.pr.bpmUp} onClick={() => changeBpm(pr.bpmNow + 5)}>
            +
          </button>
        </div>
        <button type="button" className="pgo stop" onClick={pr.stop}>
          {m.pr.stop}
        </button>
      </div>
    </div>
  )
}
