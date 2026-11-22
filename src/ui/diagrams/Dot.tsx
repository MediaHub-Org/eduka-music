import type { Family } from '../../engine'

export const FAMILY_COLOR: Record<Family, string> = {
  r: 'var(--ink)',
  '3': 'var(--c3)',
  '5': 'var(--c5)',
  '7': 'var(--c7)',
  x: 'var(--cx)',
  b: 'var(--cx)',
}

export interface DotStyle {
  fill?: string
  stroke?: string
  sw?: number
  dash?: boolean
  op?: number
  r?: number
  ring?: boolean
  txt?: string
  tc?: string
}

export interface DotProps {
  x: number
  y: number
  d: DotStyle
  on?: boolean
  s?: number
  f?: number
}

/** = dotSVG del artifact. */
export function Dot({ x, y, d, on, s, f }: DotProps) {
  const r = d.r ?? 12
  const op = d.op ?? 1
  const txt = d.txt
  return (
    <g
      data-on={on === undefined ? undefined : String(on)}
      data-s={s}
      data-f={f}
    >
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={d.fill ?? 'var(--bg)'}
        stroke={d.stroke ?? 'none'}
        strokeWidth={d.sw ?? 1.5}
        strokeDasharray={d.dash ? '3 3' : undefined}
        opacity={op}
      />
      {d.ring && <circle cx={x} cy={y} r={r + 3.5} fill="none" stroke="var(--ink)" strokeWidth={1.5} opacity={op} />}
      {txt && (
        <text
          x={x}
          y={y + 4}
          textAnchor="middle"
          fontSize={txt.length > 3 ? 8.5 : txt.length > 2 ? 9.5 : 11}
          fill={d.tc ?? '#fff'}
          opacity={op}
        >
          {txt}
        </text>
      )}
    </g>
  )
}
