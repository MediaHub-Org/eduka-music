import type { ReactNode } from 'react'
import { toneOf, tuningWithCapo } from '../../engine'
import type { Chord, Notation, StringInstrument } from '../../engine'
import { Dot } from './Dot'
import { toneLabel, toneStyle } from './Neck'

export interface ChordBoxProps {
  chord: Chord
  frets: (number | null)[]
  inst: StringInstrument
  capo: number
  leftHanded: boolean
  labels: 'notes' | 'intervals'
  notation: Notation
  ghosts?: { s: number; f: number }[]
  moved?: number[]
  extraFrets?: (number | null)[]
}

/** = boxSVG del artifact. */
export function ChordBox({ chord, frets: fr, inst, capo, leftHanded: lf, labels, notation, ghosts = [], moved = [], extraFrets = [] }: ChordBoxProps) {
  const N = fr.length
  const sp = 120 / (N - 1)
  const top = 34, rh = 36
  const X = (s: number) => 26 + (lf ? N - 1 - s : s) * sp
  const all = [...fr, ...ghosts.map((g) => g.f), ...extraFrets].filter((f): f is number => f != null)
  const nz = all.filter((f) => f > 0)
  const hi = Math.max(0, ...all)
  const ws = hi <= 4 ? 1 : Math.min(...nz)
  const rows = Math.max(4, hi - ws + 1)
  const H = top + rows * rh + 12
  const y = (f: number) => (f === 0 ? top - 15 : top + (f - ws + 0.5) * rh)
  const T = tuningWithCapo(inst, capo)
  const els: ReactNode[] = []

  els.push(
    ws === 1 ? (
      <rect key="nut" x={26} y={top - 4} width={120} height={5} fill="var(--ink)" />
    ) : (
      <text key="ws" x={lf ? 168 : 2} y={top + rh / 2 + 5} textAnchor={lf ? 'end' : 'start'} fontSize={13} fill="var(--mute)">{ws}</text>
    ),
  )
  for (let r = 0; r <= rows; r++) els.push(<line key={`r${r}`} x1={26} x2={146} y1={top + r * rh} y2={top + r * rh} stroke="var(--line)" strokeWidth={2} />)
  for (let s = 0; s < N; s++) {
    els.push(<line key={`s${s}`} x1={X(s)} x2={X(s)} y1={top} y2={top + rows * rh} stroke="var(--mute)" strokeWidth={1.3} />)
    if (fr[s] == null) els.push(<text key={`x${s}`} x={X(s)} y={top - 11} textAnchor="middle" fontSize={13} fill="var(--mute)">×</text>)
  }
  ghosts.forEach((gh, i) => els.push(<circle key={`g${i}`} cx={X(gh.s)} cy={y(gh.f)} r={11} fill="none" stroke="var(--mv)" strokeWidth={2} strokeDasharray="3 3" />))
  fr.forEach((f, s) => {
    if (f == null) return
    const t = toneOf(chord, (T[s] + f) % 12)
    if (!t) return
    const mv = moved.includes(s)
    els.push(
      <Dot key={`d${s}`} x={X(s)} y={y(f)} s={s} f={f}
        d={{ ...toneStyle(t), ...(mv ? { fill: 'var(--mv)' } : {}), txt: toneLabel(t, labels, notation), r: f === 0 ? 10 : 12 }} />,
    )
  })

  return (
    <svg viewBox={`0 0 172 ${H}`} role="img" width="100%" style={{ display: 'block' }}>
      {els}
    </svg>
  )
}
