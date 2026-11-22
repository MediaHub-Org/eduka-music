import type { ReactNode } from 'react'
import { displayNote, toneOf, tuningWithCapo } from '../../engine'
import type { Chord, FretPosition, Notation, StringInstrument, Tone } from '../../engine'
import { Dot, FAMILY_COLOR } from './Dot'
import type { DotStyle } from './Dot'

export interface NeckProps {
  chord: Chord
  position: FretPosition
  inst: StringInstrument
  capo: number
  vertical: boolean
  leftHanded: boolean
  labels: 'notes' | 'intervals'
  notation: Notation
  onTapNote?: (s: number, fret: number) => void
}

export function toneLabel(t: Tone, labels: 'notes' | 'intervals', notation: Notation): string {
  return labels === 'notes' ? displayNote(t.name, notation) : t.label
}

export function toneStyle(t: Tone): Pick<DotStyle, 'fill' | 'stroke' | 'sw'> {
  return t.family === 'b'
    ? { fill: FAMILY_COLOR.b, stroke: 'var(--ink)', sw: 2 }
    : { fill: FAMILY_COLOR[t.family] }
}

interface NDot { s: number; f: number; style: DotStyle; on: boolean }

const MARKS = [3, 5, 7, 9, 15]

/** = neckSVG del artifact. */
export function Neck({ chord, position, inst, capo, vertical, leftHanded, labels, notation, onTapNote }: NeckProps) {
  const N = inst.tuning.length
  const F = inst.frets
  const lf = leftHanded
  const T = tuningWithCapo(inst, capo)

  const dots: NDot[] = []
  for (let s = 0; s < N; s++) {
    for (let f = 0; f <= F; f++) {
      const t = toneOf(chord, (T[s] + f) % 12)
      if (!t) continue
      const on = position.frets[s] === f
      dots.push({
        s, f, on,
        style: { ...toneStyle(t), txt: toneLabel(t, labels, notation), op: on ? 1 : 0.22, r: on ? 13.5 : 11, ring: on && t.family === 'r' },
      })
    }
  }
  const pl = position.frets.map((f, s) => (f == null ? -1 : s)).filter((s) => s >= 0)
  const nz = position.frets.filter((f): f is number => f != null && f > 0)
  const win = { lo: nz.length ? Math.min(...nz) : 0, hi: nz.length ? Math.max(...nz) : 0, s0: pl[0] ?? 0, s1: pl[pl.length - 1] ?? 0 }

  const tap = (d: NDot, x: number, y: number): ReactNode => {
    const dot = <Dot x={x} y={y} d={d.style} on={d.on} s={d.s} f={d.f} />
    if (!onTapNote) return <g key={`${d.s}-${d.f}`}>{dot}</g>
    return (
      <g key={`${d.s}-${d.f}`} style={{ cursor: 'pointer' }} onClick={() => onTapNote(d.s, d.f)}>
        <circle cx={x} cy={y} r={22} fill="transparent" />
        {dot}
      </g>
    )
  }

  const note = (s: number) => displayNote(inst.stringNames[s], notation)
  const els: ReactNode[] = []
  let W: number
  let H: number

  if (vertical) {
    const cw = Math.min(54, 240 / (N - 1)), rh = 42, X0 = 36, Y0 = 48
    W = X0 * 2 + (N - 1) * cw
    H = Y0 + F * rh + 34
    const X = (s: number) => X0 + (lf ? N - 1 - s : s) * cw
    const Y = (f: number) => (f === 0 ? Y0 - 22 : Y0 + (f - 0.5) * rh)
    const midX = X0 + ((N - 1) * cw) / 2
    els.push(<rect key="bg" x={X0} y={Y0} width={(N - 1) * cw} height={F * rh} fill="var(--bg)" />)
    MARKS.filter((f) => f <= F).forEach((f) => els.push(<circle key={`m${f}`} cx={midX} cy={Y(f)} r={5} fill="var(--line)" />))
    if (F >= 12) {
      els.push(<circle key="m12a" cx={midX - cw * 0.6} cy={Y(12)} r={5} fill="var(--line)" />)
      els.push(<circle key="m12b" cx={midX + cw * 0.6} cy={Y(12)} r={5} fill="var(--line)" />)
    }
    {
      const y0 = win.lo === 0 ? Y0 - 40 : Y0 + (win.lo - 1) * rh
      const y1 = Y0 + win.hi * rh
      const xs = [X(win.s0), X(win.s1)]
      els.push(<rect key="win" x={Math.min(...xs) - 20} y={y0} width={Math.abs(xs[1] - xs[0]) + 40} height={y1 - y0 + 4} rx={10} fill="var(--hl)" opacity={0.45} />)
    }
    for (let f = 0; f <= F; f++) {
      els.push(<line key={`fl${f}`} x1={X0} x2={X0 + (N - 1) * cw} y1={Y0 + f * rh} y2={Y0 + f * rh} stroke={f ? 'var(--line)' : 'var(--ink)'} strokeWidth={f ? 2 : 6} />)
      if (f) els.push(<text key={`fn${f}`} x={X0 - 14} y={Y(f) + 4} textAnchor="middle" fontSize={12} fill="var(--mute)">{f}</text>)
    }
    for (let s = 0; s < N; s++) {
      els.push(<line key={`sl${s}`} x1={X(s)} x2={X(s)} y1={Y0} y2={Y0 + F * rh} stroke="var(--mute)" strokeWidth={1.4} />)
      els.push(<text key={`sn${s}`} x={X(s)} y={Y0 + F * rh + 22} textAnchor="middle" fontSize={12} fill="var(--mute)">{note(s)}</text>)
    }
    dots.forEach((d) => els.push(tap(d, X(d.s), Y(d.f))))
  } else {
    const fw = Math.min(62, 900 / F), sp = N <= 5 ? 42 : 34, L0 = 88, T0 = 26
    W = L0 + F * fw + 20
    H = T0 + (N - 1) * sp + 46
    const X = (f: number) => {
      const x = f === 0 ? L0 - 28 : L0 + (f - 0.5) * fw
      return lf ? W - x : x
    }
    const Y = (s: number) => T0 + (N - 1 - s) * sp
    const XL = (x: number) => (lf ? W - x : x)
    const midY = T0 + ((N - 1) * sp) / 2
    els.push(<rect key="bg" x={Math.min(XL(L0), XL(L0 + F * fw))} y={T0} width={F * fw} height={(N - 1) * sp} fill="var(--bg)" />)
    MARKS.filter((f) => f <= F).forEach((f) => els.push(<circle key={`m${f}`} cx={X(f)} cy={midY} r={5} fill="var(--line)" />))
    if (F >= 12) {
      els.push(<circle key="m12a" cx={X(12)} cy={midY - sp * 0.6} r={5} fill="var(--line)" />)
      els.push(<circle key="m12b" cx={X(12)} cy={midY + sp * 0.6} r={5} fill="var(--line)" />)
    }
    {
      const xa = win.lo === 0 ? L0 - 50 : L0 + (win.lo - 1) * fw
      const xb = L0 + win.hi * fw
      const x0 = lf ? W - xb : xa
      els.push(<rect key="win" x={x0} y={Math.min(Y(win.s0), Y(win.s1)) - 18} width={xb - xa + 4} height={Math.abs(Y(win.s0) - Y(win.s1)) + 36} rx={10} fill="var(--hl)" opacity={0.45} />)
    }
    for (let f = 0; f <= F; f++) {
      const x = XL(L0 + f * fw)
      els.push(<line key={`fl${f}`} x1={x} x2={x} y1={T0} y2={T0 + (N - 1) * sp} stroke={f ? 'var(--line)' : 'var(--ink)'} strokeWidth={f ? 2 : 6} />)
      if (f) els.push(<text key={`fn${f}`} x={X(f)} y={T0 + (N - 1) * sp + 30} textAnchor="middle" fontSize={12} fill="var(--mute)">{f}</text>)
    }
    for (let s = 0; s < N; s++) {
      els.push(<line key={`sl${s}`} x1={XL(L0)} x2={XL(L0 + F * fw)} y1={Y(s)} y2={Y(s)} stroke="var(--mute)" strokeWidth={1.4} />)
      els.push(<text key={`sn${s}`} x={lf ? W - 10 : 10} y={Y(s) + 4} textAnchor={lf ? 'end' : 'start'} fontSize={12} fill="var(--mute)">{note(s)}</text>)
    }
    dots.forEach((d) => els.push(tap(d, X(d.f), Y(d.s))))
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" width="100%" style={{ display: 'block', maxWidth: W * 1.6 }}>
      {els}
    </svg>
  )
}
