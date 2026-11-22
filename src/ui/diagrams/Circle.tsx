import type { KeyboardEvent, ReactNode } from 'react'
import { CIRCLE, displayNote, relativeMajor, scaleOf } from '../../engine'
import type { KeySpec, Notation } from '../../engine'

export interface CircleProps {
  keySpec: KeySpec
  notation: Notation
  onPick: (k: KeySpec) => void
  /** Texto bajo el nombre de la tonalidad (p. ej. armadura), ya traducido. */
  signatureLabel?: string
}

/** = sector del artifact. */
export function sector(r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`
  return `M${p(r1, a0)}A${r1},${r1} 0 0 1 ${p(r1, a1)}L${p(r0, a1)}A${r0},${r0} 0 0 0 ${p(r0, a0)}Z`
}

const RINGS: [number, number][] = [[150, 206], [104, 150], [66, 104]]
const ROM_MAJ: Record<number, string[]> = { 11: ['IV', 'ii', ''], 0: ['I', 'vi', 'vii°'], 1: ['V', 'iii', ''] }
const ROM_MIN: Record<number, string[]> = { 11: ['VI', 'iv', ''], 0: ['III', 'i', 'ii°'], 1: ['VII', 'v→V', ''] }

/** = drawWheel del artifact; cada sector es un role="button" accesible. */
export function Circle({ keySpec, notation, onPick, signatureLabel }: CircleProps) {
  const nn = (n: string) => displayNote(n, notation)
  const maj = keySpec.mode === 'maj'
  const k = CIRCLE.indexOf(relativeMajor(keySpec))
  const els: ReactNode[] = []

  CIRCLE.forEach((key, i) => {
    const sc = scaleOf({ tonic: key, mode: 'maj' })
    const a = ((i * 30 - 90) * Math.PI) / 180
    const rel = (((i - k) % 12) + 12) % 12
    const names = [nn(key), nn(sc[5]) + 'm', nn(sc[6]) + '°']
    const R = (maj ? ROM_MAJ : ROM_MIN)[rel]
    RINGS.forEach(([r0, r1], ri) => {
      const rom = R?.[ri]
      const ton = rel === 0 && ri === (maj ? 0 : 1)
      const fill = ton ? 'var(--ink)' : rom ? 'var(--hl)' : 'var(--bg)'
      const tc = ton ? 'var(--bg)' : rom ? '#141414' : 'var(--ink)'
      const rm = (r0 + r1) / 2
      const cx = rm * Math.cos(a)
      const cy = rm * Math.sin(a)
      const fs = [16, 13.5, 11][ri]
      const pick: KeySpec = ri === 1 ? { tonic: sc[5], mode: 'min' } : { tonic: key, mode: 'maj' }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPick(pick)
        }
      }
      els.push(
        <g key={`${i}-${ri}`} className="sl" role="button" tabIndex={0} aria-label={names[ri]} style={{ cursor: 'pointer' }} onClick={() => onPick(pick)} onKeyDown={onKey}>
          <path d={sector(r0, r1, a - Math.PI / 12, a + Math.PI / 12)} fill={fill} stroke="var(--line)" strokeWidth={1.5} />
          <text x={cx} y={cy + (rom ? -1 : fs / 3)} textAnchor="middle" fontSize={fs} fill={tc}>{names[ri]}</text>
          {rom ? <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill={tc} style={{ fontWeight: 600 }}>{rom}</text> : null}
        </g>,
      )
    })
  })

  return (
    <svg viewBox="-210 -210 420 420" width="100%" style={{ display: 'block', maxWidth: 460 }}>
      {els}
      <circle r={62} fill="var(--panel)" />
      <text y={-2} textAnchor="middle" fontSize={20} fill="var(--ink)">{nn(keySpec.tonic)}{maj ? '' : 'm'}</text>
      {signatureLabel ? <text y={18} textAnchor="middle" fontSize={11} fill="var(--mute)" style={{ fontWeight: 600 }}>{signatureLabel}</text> : null}
    </svg>
  )
}
