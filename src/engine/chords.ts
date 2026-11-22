import { displayNote, pcOf, spell } from './notes'
import type { NoteName, Notation, Pc } from './notes'

export type QualityId =
  | 'maj' | 'm' | 'dim' | 'aug' | 'sus2' | 'sus4'
  | 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7' | '7sus4'
  | '6' | 'm6' | 'add9' | '9' | 'm9' | 'maj9'

export interface Quality {
  id: QualityId
  symbol: string
  group: 'T' | 'S' | 'C'
  intervals: number[]
}

const q = (id: QualityId, symbol: string, group: Quality['group'], intervals: number[]): Quality => ({
  id, symbol, group, intervals,
})

export const QUALITIES: Quality[] = [
  q('maj', '', 'T', [0, 4, 7]),
  q('m', 'm', 'T', [0, 3, 7]),
  q('dim', '°', 'T', [0, 3, 6]),
  q('aug', '+', 'T', [0, 4, 8]),
  q('sus2', 'sus2', 'T', [0, 2, 7]),
  q('sus4', 'sus4', 'T', [0, 5, 7]),
  q('maj7', 'maj7', 'S', [0, 4, 7, 11]),
  q('7', '7', 'S', [0, 4, 7, 10]),
  q('m7', 'm7', 'S', [0, 3, 7, 10]),
  q('m7b5', 'm7♭5', 'S', [0, 3, 6, 10]),
  q('dim7', '°7', 'S', [0, 3, 6, 9]),
  q('7sus4', '7sus4', 'S', [0, 5, 7, 10]),
  q('6', '6', 'C', [0, 4, 7, 9]),
  q('m6', 'm6', 'C', [0, 3, 7, 9]),
  q('add9', 'add9', 'C', [0, 4, 7, 14]),
  q('9', '9', 'C', [0, 4, 7, 10, 14]),
  q('m9', 'm9', 'C', [0, 3, 7, 10, 14]),
  q('maj9', 'maj9', 'C', [0, 4, 7, 11, 14]),
]

export const QUALITY = Object.fromEntries(QUALITIES.map((x) => [x.id, x])) as Record<QualityId, Quality>

export const VARIANT: Record<QualityId, QualityId> = {
  maj: 'm', m: 'maj', '7': 'm7', m7: '7', maj7: '7', m7b5: 'm7', dim7: 'm7b5', dim: 'm', aug: 'maj',
  sus2: 'sus4', sus4: 'maj', '7sus4': '7', '6': 'm6', m6: '6', add9: 'maj', '9': 'm9', m9: '9', maj9: 'maj7',
}

export interface ChordSpec {
  root: NoteName
  quality: QualityId
  bass?: NoteName
}

/** 'b' = bajo añadido que no pertenece al acorde */
export type Family = 'r' | '3' | '5' | '7' | 'x' | 'b'

export interface Tone {
  pc: Pc
  name: NoteName
  semis: number
  step: number
  label: string
  family: Family
}

export interface Chord {
  spec: ChordSpec
  tones: Tone[]
  pcs: Pc[]
  bassPc: Pc | null
  bassTone: Tone | null
}

const STEP: Record<number, number> = { 0: 0, 2: 1, 14: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 8: 4, 9: 5, 10: 6, 11: 6 }
const LABEL: Record<number, string> = {
  0: 'R', 2: '2', 14: '9', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7',
}

function ivInfo(s: number, quality: QualityId): { step: number; label: string; family: Family } {
  const dim7 = quality === 'dim7' && s === 9
  const family: Family =
    s === 0 ? 'r' : s === 3 || s === 4 ? '3' : s >= 6 && s <= 8 ? '5' : s >= 9 && s <= 11 ? '7' : 'x'
  return { step: dim7 ? 6 : STEP[s], label: dim7 ? '♭♭7' : LABEL[s], family }
}

export function buildChord(spec: ChordSpec): Chord {
  const rootPc = pcOf(spec.root)
  const tones: Tone[] = QUALITY[spec.quality].intervals.map((s) => {
    const i = ivInfo(s, spec.quality)
    return {
      pc: (rootPc + s) % 12,
      name: spell(spec.root, s, i.step),
      semis: s,
      step: i.step,
      label: i.label,
      family: i.family,
    }
  })
  const pcs = tones.map((t) => t.pc)
  let bassPc: Pc | null = null
  let bassTone: Tone | null = null
  if (spec.bass !== undefined) {
    bassPc = pcOf(spec.bass)
    bassTone =
      tones.find((t) => t.pc === bassPc) ??
      { pc: bassPc, name: spec.bass, semis: (bassPc - rootPc + 12) % 12, step: 0, label: 'B', family: 'b' }
  }
  return { spec, tones, pcs, bassPc, bassTone }
}

export function toneOf(c: Chord, pc: Pc): Tone | undefined {
  return c.tones.find((t) => t.pc === pc) ?? (c.bassTone && c.bassTone.pc === pc ? c.bassTone : undefined)
}

export function chordSymbol(spec: ChordSpec, notation: Notation): string {
  const base = displayNote(spec.root, notation) + QUALITY[spec.quality].symbol
  return spec.bass === undefined ? base : `${base}/${displayNote(spec.bass, notation)}`
}

export function sameChord(a: ChordSpec, b: ChordSpec): boolean {
  const bassA = a.bass === undefined ? null : pcOf(a.bass)
  const bassB = b.bass === undefined ? null : pcOf(b.bass)
  return pcOf(a.root) === pcOf(b.root) && a.quality === b.quality && bassA === bassB
}
