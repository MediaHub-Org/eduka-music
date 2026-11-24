import type { Chord, QualityId, Tone } from './chords'
import { toneOf } from './chords'
import type { InstrumentId, StringInstrument } from './instruments'
import { INSTRUMENTS } from './instruments'
import { pcOf } from './notes'

export interface FretPosition {
  kind: 'frets'
  frets: (number | null)[]
  score: number
  fingers: number
  barre: number
  bass: Tone
  lo: number
  hi: number
  shape?: 'E' | 'A' | 'D' | 'C' | 'G'
}

export interface KeyPosition {
  kind: 'keys'
  notes: number[]
  inversion: number
  bass: Tone
}

export type Position = FretPosition | KeyPosition

type Shape = 'E' | 'A' | 'D' | 'C' | 'G'
type ShapeTable = { base: number; offsets: Partial<Record<QualityId, (number | null)[]>> }

/** Formas CAGED (offsets relativos a la cejilla). Copiado del artifact. */
const SH: Record<Shape, ShapeTable> = {
  E: { base: 4, offsets: { maj: [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], dim: [0, 1, 2, 0, null, null], aug: [0, 3, 2, 1, 1, 0], sus4: [0, 2, 2, 2, 0, 0], maj7: [0, 2, 1, 1, 0, 0], '7': [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0], m7b5: [0, null, 0, 0, -1, null], dim7: [0, null, -1, 0, -1, null], '7sus4': [0, 2, 0, 2, 0, 0], '6': [0, 2, 2, 1, 2, 0], m6: [0, 2, 2, 0, 2, 0], '9': [0, 2, 0, 1, 0, 2] } },
  A: { base: 9, offsets: { maj: [null, 0, 2, 2, 2, 0], m: [null, 0, 2, 2, 1, 0], dim: [null, 0, 1, 2, 1, null], aug: [null, 0, 3, 2, 2, 1], sus2: [null, 0, 2, 2, 0, 0], sus4: [null, 0, 2, 2, 3, 0], maj7: [null, 0, 2, 1, 2, 0], '7': [null, 0, 2, 0, 2, 0], m7: [null, 0, 2, 0, 1, 0], m7b5: [null, 0, 1, 0, 1, null], dim7: [null, 0, 1, 2, 1, 2], '7sus4': [null, 0, 2, 0, 3, 0], '6': [null, 0, 2, 2, 2, 2], m6: [null, 0, 2, 2, 1, 2], add9: [null, 0, 2, 4, 2, 0], '9': [null, 0, -1, 0, 0, null], m9: [null, 0, -2, 0, 0, null], maj9: [null, 0, -1, 1, 0, null] } },
  D: { base: 2, offsets: { maj: [null, null, 0, 2, 3, 2], m: [null, null, 0, 2, 3, 1], dim: [null, null, 0, 1, 3, 1], aug: [null, null, 0, 3, 3, 2], sus2: [null, null, 0, 2, 3, 0], sus4: [null, null, 0, 2, 3, 3], maj7: [null, null, 0, 2, 2, 2], '7': [null, null, 0, 2, 1, 2], m7: [null, null, 0, 2, 1, 1], m7b5: [null, null, 0, 1, 1, 1], dim7: [null, null, 0, 1, 0, 1], '7sus4': [null, null, 0, 2, 1, 3], '6': [null, null, 0, 2, 0, 2], m6: [null, null, 0, 2, 0, 1] } },
  C: { base: 0, offsets: { maj: [null, 3, 2, 0, 1, 0], m: [null, 3, 1, 0, 1, null], aug: [null, 3, 2, 1, 1, 0], maj7: [null, 3, 2, 0, 0, 0], '7': [null, 3, 2, 3, 1, 0], '6': [null, 3, 2, 2, 1, 0], add9: [null, 3, 2, 0, 3, 0] } },
  G: { base: 7, offsets: { maj: [3, 2, 0, 0, 0, 3], m: [3, 1, 0, 0, 3, 3], aug: [3, 2, 1, 0, 0, 3], sus4: [3, 3, 0, 0, 1, 3], maj7: [3, 2, 0, 0, 0, 2], '7': [3, 2, 0, 0, 0, 1], m7: [3, 1, 0, 0, 3, 1], '6': [3, 2, 0, 0, 0, 0], add9: [3, 0, 0, 2, 0, 3] } },
}
const SHAPE_ORDER: Shape[] = ['E', 'A', 'D', 'C', 'G']

export function tuningWithCapo(inst: StringInstrument, capo: number): number[] {
  return inst.tuning.map((t) => t + (capo || 0))
}

function strings(id: InstrumentId): StringInstrument {
  const i = INSTRUMENTS[id]
  if (i.kind !== 'strings') throw new Error(`${id} is not a string instrument`)
  return i
}

function evalPos(fr: (number | null)[], c: Chord, inst: StringInstrument, capo: number): FretPosition {
  const T = tuningWithCapo(inst, capo)
  const played = fr.map((f, s) => (f == null ? null : T[s] + f))
  const fretted: [number, number][] = []
  fr.forEach((f, s) => {
    if (f != null && f > 0) fretted.push([s, f])
  })
  let fingers = fretted.length
  let barre = 0
  if (fretted.length) {
    const mn = Math.min(...fretted.map((x) => x[1]))
    const ms = fretted.filter((x) => x[1] === mn).map((x) => x[0])
    if (ms.length > 1) {
      const a = ms[0]
      const b = ms[ms.length - 1]
      let ok = b - a >= 1
      for (let s = a; s <= b; s++) {
        const f = fr[s]
        if (f != null && f < mn) ok = false
      }
      if (ok) {
        barre = mn
        fingers = 1 + fretted.filter((x) => x[1] > mn).length
      }
    }
  }
  const nz = fretted.map((x) => x[1])
  const span = nz.length ? Math.max(...nz) - Math.min(...nz) : 0
  const lo = nz.length ? Math.min(...nz) : 0
  let bm = 1e9
  played.forEach((m) => {
    if (m != null && m < bm) bm = m
  })
  const bass = toneOf(c, bm % 12)!
  const mutes = fr.filter((f) => f == null).length
  const opens = fr.filter((f) => f === 0).length
  const rootPc = pcOf(c.spec.root)
  const has5 = c.tones.some((t) => t.semis === 7)
    ? fr.some((f, s) => f != null && (T[s] + f) % 12 === (rootPc + 7) % 12)
    : true
  let lowM = 0
  let highM = 0
  for (const f of fr) {
    if (f == null) lowM++
    else break
  }
  for (let i = fr.length - 1; i >= 0 && fr[i] == null; i--) highM++
  const gtr = !!inst.caged
  const score =
    span +
    fingers * 0.7 +
    (barre ? 1.2 : 0) +
    (gtr ? lowM * 0.3 + highM * 1.2 : mutes * 0.1) -
    opens * 0.2 +
    lo * 0.05 +
    // Con bajo pedido, el bajo es el correcto: no se penaliza que no sea la raíz.
    (c.bassPc != null || bass.family === 'r' ? 0 : gtr ? 2.5 : inst.reentrant ? 0.3 : 1) +
    (has5 ? 0 : 0.3)
  return { kind: 'frets', frets: fr, score, fingers, barre, bass, lo, hi: nz.length ? Math.max(...nz) : 0 }
}

const posCache = new Map<string, Position[]>()
const topCache = new Map<string, Position[]>()

export function clearPositionCache(): void {
  posCache.clear()
  topCache.clear()
}

const cacheKey = (c: Chord, inst: InstrumentId, capo: number): string =>
  `${inst}|${capo}|${c.spec.root}|${c.spec.quality}|${c.bassPc ?? ''}`

/** Rango MIDI del bajo añadido en piano. */
export const PIANO_BASS_MIN = 36
export const PIANO_BASS_MAX = 59

function pianoPos(c: Chord): KeyPosition[] {
  const base = 48 + pcOf(c.spec.root)
  const stack = c.tones.map((t) => base + t.semis)
  const out: KeyPosition[] = []
  for (let k = 0; k < c.tones.length; k++) {
    let n = stack.slice(k).concat(stack.slice(0, k).map((m) => m + 12))
    while (n[0] >= 60) n = n.map((m) => m - 12)
    if (c.bassPc != null && c.bassTone) {
      // Bajo en la octava inmediatamente por debajo de la nota más grave de la mano derecha.
      // (En los acordes de 9ª del artifact `n[0]` no siempre es la más grave: se usa el mínimo.)
      const low = Math.min(...n)
      const b = low - (((low - c.bassPc) % 12 + 12) % 12 || 12)
      let notes = [b, ...n]
      while (notes[0] < PIANO_BASS_MIN) notes = notes.map((m) => m + 12)
      while (notes[0] > PIANO_BASS_MAX) notes = notes.map((m) => m - 12)
      out.push({ kind: 'keys', notes, inversion: k, bass: c.bassTone })
    } else out.push({ kind: 'keys', notes: n, inversion: k, bass: toneOf(c, n[0] % 12)! })
  }
  return out
}

/**
 * Regla del bajo pedido sobre las alturas que suenan: la más grave tiene `bassPc` y, si el bajo
 * no pertenece al acorde, `bassPc` no suena en ninguna otra altura.
 */
function bassOk(midis: number[], c: Chord): boolean {
  if (c.bassPc == null) return true
  if (!midis.length) return false
  const lo = Math.min(...midis)
  if (lo % 12 !== c.bassPc) return false
  if (c.pcs.includes(c.bassPc)) return true
  return midis.every((m) => m % 12 !== c.bassPc || m === lo)
}

export function midisOf(p: Position, inst: InstrumentId, capo: number): number[] {
  if (p.kind === 'keys') return p.notes.slice()
  const T = tuningWithCapo(strings(inst), capo)
  const out: number[] = []
  p.frets.forEach((f, s) => {
    if (f != null) out.push(T[s] + f)
  })
  return out
}

function stringPositions(c: Chord, instId: InstrumentId, capo: number): FretPosition[] {
  const inst = strings(instId)
  const T = tuningWithCapo(inst, capo)
  const N = T.length
  const F = inst.frets
  const allow = N >= 6
  const minPlay = N >= 6 ? 4 : N
  const base = c.tones.filter((t) => t.semis !== 7).map((t) => t.pc)
  const levels: [number[], number][] = [
    [base, 3],
    [base.length > 3 ? base.slice(1) : base, 3],
    [base, 4],
    [base.slice(1), 4],
  ]
  const bp = c.bassPc
  // Con bajo pedido se permite además su pc (si es ajeno al acorde, solo como nota más grave: bassOk).
  const allowed = bp != null && !c.pcs.includes(bp) ? [...c.pcs, bp] : c.pcs
  const midisOfFrets = (fr: (number | null)[]): number[] => {
    const r: number[] = []
    fr.forEach((f, s) => {
      if (f != null) r.push(T[s] + f)
    })
    return r
  }
  let out: FretPosition[] = []
  for (const [lvlReq, span] of levels) {
    const req = bp != null && !lvlReq.includes(bp) ? [...lvlReq, bp] : lvlReq
    const seen = new Set<string>()
    out = []
    for (let w = 0; w <= F - span; w++) {
      const cand = T.map((t) => {
        const o: (number | null)[] = allow ? [null] : []
        if (allowed.includes(t % 12)) o.push(0)
        for (let f = Math.max(1, w); f <= w + span; f++) if (allowed.includes((t + f) % 12)) o.push(f)
        return o
      })
      const acc: (number | null)[] = []
      const rec = (s: number): void => {
        if (s === N) {
          const pl: number[] = []
          acc.forEach((f, i) => {
            if (f != null) pl.push(i)
          })
          if (pl.length < minPlay) return
          if (pl[pl.length - 1] - pl[0] + 1 !== pl.length) return
          const pcs = acc.map((f, i) => (f == null ? null : (T[i] + f) % 12))
          if (!req.every((p) => pcs.includes(p))) return
          const key = acc.join(',')
          if (seen.has(key)) return
          seen.add(key)
          if (bp != null && !bassOk(midisOfFrets(acc), c)) return
          const e = evalPos(acc.slice(), c, inst, capo)
          if (e.fingers > 4) return
          if (acc.includes(0) && e.hi > 4) return
          if (lvlReq.length < base.length) e.score += 1
          out.push(e)
          return
        }
        for (const f of cand[s]) {
          acc.push(f)
          rec(s + 1)
          acc.pop()
        }
      }
      rec(0)
    }
    if (out.length) break
  }
  if (inst.caged && !capo) {
    for (const sh of SHAPE_ORDER) {
      const off = SH[sh].offsets[c.spec.quality]
      if (!off) continue
      let b = (pcOf(c.spec.root) - SH[sh].base + 12) % 12
      if (off.some((o) => o != null && o + b < 0)) b += 12
      const fr = off.map((o) => (o == null ? null : o + b))
      if (Math.max(...fr.filter((f): f is number => f != null)) > F) continue
      if (bp != null && !bassOk(midisOfFrets(fr), c)) continue
      const key = fr.join(',')
      let p = out.find((x) => x.frets.join(',') === key)
      if (!p) {
        p = evalPos(fr, c, inst, capo)
        out.push(p)
      }
      p.shape = sh
      p.score -= 1.5
    }
  }
  out.sort((a, b) => a.score - b.score || a.lo - b.lo)
  return out
}

export function allPositions(c: Chord, inst: InstrumentId, capo: number): Position[] {
  const k = cacheKey(c, inst, capo)
  let r = posCache.get(k)
  if (!r) {
    r = INSTRUMENTS[inst].kind === 'piano' ? pianoPos(c) : stringPositions(c, inst, capo)
    posCache.set(k, r)
  }
  return r
}

export function topPositions(c: Chord, inst: InstrumentId, capo: number): Position[] {
  if (INSTRUMENTS[inst].kind === 'piano') return allPositions(c, inst, capo)
  const k = cacheKey(c, inst, capo)
  let r = topCache.get(k)
  if (!r) {
    const all = allPositions(c, inst, capo)
    const t = all.slice(0, 40)
    all.slice(40).forEach((p) => {
      if (p.kind === 'frets' && p.shape) t.push(p)
    })
    r = t
    topCache.set(k, r)
  }
  return r
}

/** Más de 4 formas por acorde no aportan: se ofrecen las mejores. */
export const MAX_VARIANTS = 4

export function libraryVariants(c: Chord, inst: InstrumentId, capo: number): Position[] {
  const all = allPositions(c, inst, capo)
  if (INSTRUMENTS[inst].kind === 'piano') return all
  if (!all.length) return []
  const frets = all as FretPosition[]
  const best = frets[0].score
  const out: FretPosition[] = []
  const pl = (p: FretPosition): number[] => {
    const r: number[] = []
    p.frets.forEach((f, i) => {
      if (f != null) r.push(i)
    })
    return r
  }
  const sub = (p: FretPosition, q: FretPosition): boolean => {
    const a = pl(p)
    const b = pl(q)
    return a.length < b.length && a.every((i) => p.frets[i] === q.frets[i])
  }
  for (const p of frets) {
    if (out.length >= MAX_VARIANTS) break
    if (p.score > best + 5.5 && out.length >= 3) break
    if (out.some((q) => sub(p, q))) continue
    out.push(p)
  }
  return out
}

export function positionKey(p: Position): string {
  return p.kind === 'frets' ? p.frets.map((f) => (f == null ? 'x' : f)).join(',') : p.notes.join(',')
}

export function difficulty(p: FretPosition): 'easy' | 'mid' | 'hard' {
  return p.score < 3.6 ? 'easy' : p.score < 5.6 ? 'mid' : 'hard'
}
