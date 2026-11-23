import { useMemo, useState } from 'react'
import { beatsPerBar, chordSymbol } from '../../engine'
import type { ChordSpec, TimeSignature } from '../../engine'
import type { ProgressionItem } from '../../engine'
import { useT } from '../../i18n'
import { useStore } from '../../state/store'
import type { SavedProgression } from '../../state/store'
import { SearchBox } from '../chords/SearchBox'

type ProgressionInput = Omit<SavedProgression, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export function ProgressionEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: SavedProgression
  onSave: (progression: ProgressionInput) => void
  onCancel: () => void
}) {
  const m = useT()
  const notation = useStore((s) => s.settings.notation)
  const [name, setName] = useState(initial?.name ?? '')
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(initial?.timeSignature ?? '4/4')
  const [bpm, setBpm] = useState(initial?.bpm ?? 80)
  const bpb = beatsPerBar(timeSignature)
  const firstBars = initial?.items[0] && initial.items[0].beats % bpb === 0 ? initial.items[0].beats / bpb : 1
  const equalDurations =
    !!initial?.items.length &&
    initial.items.every((item) => item.beats === initial.items[0].beats) &&
    initial.items[0].beats % bpb === 0
  const [barsChoice, setBarsChoice] = useState<string>(initial ? (equalDurations ? String(firstBars) : 'mixed') : '1')
  const [items, setItems] = useState<ProgressionItem[]>(() => initial?.items ?? [])
  const [error, setError] = useState<string | null>(null)

  const symbols = useMemo(() => items.map((item) => chordSymbol(item.chord, notation)), [items, notation])
  const onPick = (chord: ChordSpec) => {
    if (items.length < 16) setItems((list) => [...list, { chord, beats: bpb }])
  }
  const durationChanged = barsChoice !== 'mixed'

  const save = () => {
    const cleanName = name.trim()
    if (!cleanName) {
      setError(m.mine.nameRequired)
      return
    }
    if (!items.length) {
      setError(m.mine.chordsRequired)
      return
    }
    const progressionItems = items.map((item) => ({
      chord: item.chord,
      beats: durationChanged ? Number(barsChoice) * bpb : item.beats,
    }))
    onSave({
      ...(initial ? { id: initial.id } : {}),
      name: cleanName,
      timeSignature,
      bpm: Math.min(240, Math.max(30, Math.round(Number.isFinite(bpm) ? bpm : 80))),
      items: progressionItems,
    })
  }

  return (
    <section className="mine-editor" aria-label={initial ? m.mine.editorEdit : m.mine.editorNew}>
      <h2>{initial ? m.mine.editorEdit : m.mine.editorNew}</h2>
      <label className="mine-field">
        <span>{m.pr.name}</span>
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} aria-label={m.pr.name} />
      </label>
      <div className="mine-fields">
        <label className="mine-field">
          <span>{m.mine.meter}</span>
          <select aria-label={m.mine.meter} value={timeSignature} onChange={(event) => setTimeSignature(event.target.value as TimeSignature)}>
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="6/8">6/8</option>
          </select>
        </label>
        <label className="mine-field">
          <span>{m.mine.bars}</span>
          <select aria-label={m.mine.bars} value={barsChoice} onChange={(event) => setBarsChoice(event.target.value)}>
            {initial && <option value="mixed">{m.mine.mixed}</option>}
            {[1, 2, 4].map((bars) => <option key={bars} value={bars}>{bars}</option>)}
          </select>
        </label>
        <label className="mine-field">
          <span>{m.mine.bpm}</span>
          <input type="number" min={30} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} />
        </label>
      </div>

      <div className="mine-editor-chords">
        <div className="mine-section-hd">
          <h3>{m.progressions}</h3>
          <small>{m.mine.chordCount(items.length)}</small>
        </div>
        <SearchBox onPick={onPick} />
        <p className="note">{m.mine.addChord}</p>
        {items.length > 0 && (
          <ol className="mine-chord-list">
            {items.map((item, index) => (
              <li key={`${symbols[index]}-${index}`}>
                <b>{symbols[index]}</b>
                <span className="note">{durationChanged ? m.mine.beats(Number(barsChoice) * bpb) : m.mine.beats(item.beats)}</span>
                <div className="mine-row-actions">
                  <button type="button" aria-label={m.mine.moveUp} disabled={index === 0} onClick={() => setItems((list) => {
                    const next = [...list]
                    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                    return next
                  })}>↑</button>
                  <button type="button" aria-label={m.mine.moveDown} disabled={index === items.length - 1} onClick={() => setItems((list) => {
                    const next = [...list]
                    ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                    return next
                  })}>↓</button>
                  <button type="button" className="mine-remove" aria-label={m.mine.removeChord(symbols[index])} onClick={() => setItems((list) => list.filter((_, i) => i !== index))}>×</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      {error && <p className="mine-error" role="alert">{error}</p>}
      <div className="mine-actions">
        <button type="button" onClick={onCancel}>{m.pr.cancel}</button>
        <button type="button" className="mine-primary" onClick={save}>{m.mine.save}</button>
      </div>
    </section>
  )
}
