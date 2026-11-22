import type { ReactNode } from 'react'
import { displayNote } from '../../engine'
import type { Notation } from '../../engine'
import { Dot } from './Dot'
import type { DotStyle } from './Dot'

export interface KeyboardProps {
  lo: number
  hi: number
  marks: Record<number, DotStyle>
  mini?: boolean
  notation?: Notation
}

const isB = (m: number) => [1, 3, 6, 8, 10].includes(m % 12)

/** = keysSVG del artifact. */
export function Keyboard({ lo: lo0, hi: hi0, marks, mini, notation = 'latin' }: KeyboardProps) {
  const lo = lo0 - (lo0 % 12)
  const hi = hi0 + (11 - (hi0 % 12))
  const ww = mini ? 22 : 30
  const wh = mini ? 96 : 150
  const bh = wh * 0.62
  const whites: number[] = []
  for (let m = lo; m <= hi; m++) if (!isB(m)) whites.push(m)
  const W = whites.length * ww + 2
  const xOf: Record<number, number> = {}
  whites.forEach((m, i) => (xOf[m] = 1 + i * ww))
  for (let m = lo; m <= hi; m++) if (isB(m)) xOf[m] = xOf[m - 1] + ww * 0.68

  const els: ReactNode[] = []
  whites.forEach((m) => els.push(<rect key={`w${m}`} x={xOf[m]} y={1} width={ww} height={wh} rx={3} fill="#fbfbfb" stroke="#9a9a9a" />))
  if (!mini)
    whites.filter((m) => m % 12 === 0).forEach((m) =>
      els.push(<text key={`c${m}`} x={xOf[m] + ww / 2} y={wh - 8} textAnchor="middle" fontSize={10} fill="#9a9a9a">{displayNote('C', notation)}{Math.floor(m / 12) - 1}</text>),
    )
  for (let m = lo; m <= hi; m++) if (isB(m)) els.push(<rect key={`b${m}`} x={xOf[m]} y={1} width={ww * 0.64} height={bh} rx={2} fill="#1b1b1b" />)
  for (const [k, d] of Object.entries(marks)) {
    const m = +k
    if (!(m in xOf)) continue
    const cx = xOf[m] + (isB(m) ? ww * 0.32 : ww / 2)
    const cy = isB(m) ? bh - 14 : wh - (mini ? 18 : 30)
    els.push(<Dot key={`k${m}`} x={cx} y={cy} d={{ ...d, r: mini ? 9.5 : 12 }} />)
  }

  return (
    <svg viewBox={`0 0 ${W} ${wh + 4}`} role="img" width="100%" style={{ display: 'block' }}>
      {els}
    </svg>
  )
}
