import type { ChangeDescription, ChordSpec, InstrumentId, Notation, Tone } from '../engine'
import { INSTRUMENTS, chordSymbol, displayNote } from '../engine'
import type { Messages } from './index'

const tn = (t: Tone, notation: Notation): string => displayNote(t.name, notation)

/** "Do mayor con bajo en Mi" / "C major over E". */
export function chordLongName(spec: ChordSpec, m: Messages, notation: Notation): string {
  const q = (m.q as Record<string, string>)[spec.quality] ?? spec.quality
  const base = `${displayNote(spec.root, notation)} ${q}`
  return spec.bass === undefined ? base : `${base} ${m.overBass} ${displayNote(spec.bass, notation)}`
}

/** Frase del cambio A→B, texto plano (la UI le da estilo). Reproduce el final de `drawChange` del artifact. */
export function changeSentence(
  d: ChangeDescription,
  a: ChordSpec,
  b: ChordSpec,
  inst: InstrumentId,
  m: Messages,
  notation: Notation,
): string {
  const def = INSTRUMENTS[inst]
  const names = def.kind === 'strings' ? def.stringNames : []
  const iv = m.iv as Record<string, string>
  const nameA = chordSymbol(a, notation)
  const nameB = chordSymbol(b, notation)
  const becomes = (t0: Tone, t1: Tone): string =>
    m.becomes(iv[t0.label] ?? t0.label, nameA, iv[t1.label] ?? t1.label, nameB)
  const where = (string: number | null): string => {
    if (string === null) return ''
    const open = names[names.length - string]
    return `${m.onStr} ${string}${open !== undefined ? ` (${displayNote(open, notation)})` : ''}`
  }

  const parts: string[] = []
  let nMoved = 0
  for (const it of d.items) {
    if (it.kind === 'add') {
      parts.push(`${m.adds} ${tn(it.tone, notation)}${it.string !== null ? ` ${where(it.string)}` : ''}`)
    } else if (it.kind === 'drop') {
      parts.push(`${tn(it.tone, notation)} ${m.drops}${it.string !== null ? ` (${where(it.string)})` : ''}`)
    } else {
      nMoved++
      const n = Math.abs(it.delta)
      const dir = it.delta < 0 ? m.down : m.up
      const unit = it.string === null ? (n === 1 ? m.semi1 : m.semiN) : n === 1 ? m.fret1 : m.fretN
      const at = it.string === null ? '' : ` ${where(it.string)}`
      parts.push(`${tn(it.from, notation)} → ${tn(it.to, notation)}${at}, ${dir} ${n} ${unit} (${becomes(it.from, it.to)})`)
    }
  }

  const keep = d.kept.map((t) => tn(t, notation))
  const head = parts.length
    ? `${nMoved === 1 && parts.length === 1 ? m.move1 : m.moveN(Math.max(nMoved, parts.length))}: `
    : `${m.same} `
  const tail = keep.length ? `${keep.join(', ')} ${keep.length === 1 ? m.stay1 : m.stayN}.` : ''
  return (head + parts.join('; ') + (parts.length ? '. ' : '') + tail).trim()
}
