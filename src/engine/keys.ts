import type { ChordSpec, QualityId } from './chords'
import { VARIANT } from './chords'
import type { NoteName } from './notes'
import { pcOf, spell } from './notes'

export type Mode = 'maj' | 'min'
export type ChordSet = 'triads' | 'sevenths'
export interface KeySpec {
  tonic: NoteName
  mode: Mode
}

export const CIRCLE: NoteName[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']

const MAJ = [0, 2, 4, 5, 7, 9, 11]
const MIN = [0, 2, 3, 5, 7, 8, 10]

export function scaleOf(k: KeySpec): NoteName[] {
  return (k.mode === 'min' ? MIN : MAJ).map((iv, i) => spell(k.tonic, iv, i))
}

/** Tonalidad mayor (del círculo) con la misma armadura. */
export function relativeMajor(k: KeySpec): NoteName {
  if (k.mode === 'maj') return k.tonic
  const pc = pcOf(k.tonic)
  return CIRCLE.find((t) => pcOf(scaleOf({ tonic: t, mode: 'maj' })[5]) === pc) ?? spell(k.tonic, 3, 2)
}

/** Tónica de la tonalidad menor con la misma armadura. */
export function relativeMinor(k: KeySpec): NoteName {
  return k.mode === 'min' ? k.tonic : scaleOf(k)[5]
}

export interface DiatonicChord {
  spec: ChordSpec
  roman: string
  degree: number
}

type Row = { tri: QualityId[]; s7: QualityId[]; rt: string[]; r7: string[] }
/** `DQ` del artifact. */
const DQ: Record<Mode, Row> = {
  maj: {
    tri: ['maj', 'm', 'm', 'maj', 'maj', 'm', 'dim'],
    s7: ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'],
    rt: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
    r7: ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'],
  },
  min: {
    tri: ['m', 'dim', 'maj', 'm', 'maj', 'maj', 'maj'],
    s7: ['m7', 'm7b5', 'maj7', 'm7', '7', 'maj7', '7'],
    rt: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII'],
    r7: ['im7', 'iiø7', 'IIImaj7', 'ivm7', 'V7', 'VImaj7', 'VII7'],
  },
}

export function diatonic(k: KeySpec, set: ChordSet): DiatonicChord[] {
  const d = DQ[k.mode]
  const tri = set === 'triads'
  return scaleOf(k).map((root, i) => ({
    spec: { root, quality: (tri ? d.tri : d.s7)[i] },
    roman: (tri ? d.rt : d.r7)[i],
    degree: i,
  }))
}

export function keySignature(k: KeySpec): { type: 'none' | 'sharp' | 'flat'; count: number; notes: NoteName[] } {
  const n = CIRCLE.indexOf(relativeMajor(k))
  if (n === 0) return { type: 'none', count: 0, notes: [] }
  if (n <= 6) return { type: 'sharp', count: n, notes: [...'FCGDAEB'.slice(0, n)].map((l) => l + '#') }
  return { type: 'flat', count: 12 - n, notes: [...'BEADGCF'.slice(0, 12 - n)].map((l) => l + 'b') }
}

/** Vecinos en el círculo de quintas (de la mayor relativa): [izquierda (cuarta), derecha (quinta)]. */
export function circleNeighbours(k: KeySpec): [NoteName, NoteName] {
  const i = CIRCLE.indexOf(relativeMajor(k))
  return [CIRCLE[(i + 11) % 12], CIRCLE[(i + 1) % 12]]
}

export type Direction = 'down' | 'up' | 'step' | 'variant'

const findDegree = (spec: ChordSpec, k: KeySpec, set: ChordSet): number =>
  diatonic(k, set).findIndex((c) => pcOf(c.spec.root) === pcOf(spec.root) && c.spec.quality === spec.quality)

function variantOf(cur: ChordSpec, fallback: QualityId): ChordSpec {
  const spec: ChordSpec = { root: cur.root, quality: VARIANT[cur.quality] ?? fallback }
  if (cur.bass !== undefined) spec.bass = cur.bass
  return spec
}

/** `degree` es el grado diatónico del acorde resultante (null si no es diatónico). */
export function nextChord(
  cur: ChordSpec,
  k: KeySpec,
  set: ChordSet,
  dir: Direction,
): { spec: ChordSpec; dir: Direction; inKey: boolean; degree: number | null } {
  const i = findDegree(cur, k, set)
  const inKey = i >= 0
  if (!inKey || dir === 'variant') {
    const spec = variantOf(cur, 'm')
    const d = findDegree(spec, k, set)
    return { spec, dir: 'variant', inKey, degree: d >= 0 ? d : null }
  }
  const j = dir === 'down' ? (i + 5) % 7 : dir === 'up' ? (i + 2) % 7 : (i + 1) % 7
  return { spec: diatonic(k, set)[j].spec, dir, inKey, degree: j }
}

export function previousChord(cur: ChordSpec, k: KeySpec, set: ChordSet, dir: Direction): ChordSpec {
  const i = findDegree(cur, k, set)
  if (i < 0 || dir === 'variant') return variantOf(cur, 'maj')
  const j = dir === 'down' ? (i + 2) % 7 : dir === 'up' ? (i + 5) % 7 : (i + 6) % 7
  return diatonic(k, set)[j].spec
}

const circDist = (t: NoteName): number => {
  const i = CIRCLE.indexOf(t)
  return Math.min(i, 12 - i)
}

/** Tonalidades (de las 24) con el acorde (ignorando bajo) entre sus diatónicos de tríada o séptima. */
export function keysContaining(spec: ChordSpec): KeySpec[] {
  const out: KeySpec[] = []
  for (const mode of ['maj', 'min'] as const)
    for (const tonic of [...CIRCLE].sort((a, b) => circDist(a) - circDist(b) || CIRCLE.indexOf(a) - CIRCLE.indexOf(b))) {
      const k: KeySpec = { tonic, mode }
      const has = (['triads', 'sevenths'] as const).some((s) => findDegree(spec, k, s) >= 0)
      if (has) out.push(k)
    }
  return out
}

export interface PresetProgression {
  id: 'pop' | 'jazz' | 'fifties' | 'blues' | 'cycle' | 'anda' | 'minc' | 'ballad'
  roman: string
  degrees: number[]
}

/** `PR` del artifact. */
export const PRESETS: Record<Mode, PresetProgression[]> = {
  maj: [
    { id: 'pop', roman: 'I–V–vi–IV', degrees: [0, 4, 5, 3] },
    { id: 'jazz', roman: 'ii–V–I', degrees: [1, 4, 0] },
    { id: 'fifties', roman: 'I–vi–IV–V', degrees: [0, 5, 3, 4] },
    { id: 'blues', roman: 'I–IV–V–I', degrees: [0, 3, 4, 0] },
    { id: 'cycle', roman: 'I–vi–IV–ii–vii–V–iii', degrees: [0, 5, 3, 1, 6, 4, 2] },
  ],
  min: [
    { id: 'anda', roman: 'i–VII–VI–V', degrees: [0, 6, 5, 4] },
    { id: 'minc', roman: 'i–iv–V–i', degrees: [0, 3, 4, 0] },
    { id: 'jazz', roman: 'ii°–V–i', degrees: [1, 4, 0] },
    { id: 'ballad', roman: 'i–VI–III–VII', degrees: [0, 5, 2, 6] },
    { id: 'cycle', roman: 'i–VI–iv–ii°–VII–V–III', degrees: [0, 5, 3, 1, 6, 4, 2] },
  ],
}
