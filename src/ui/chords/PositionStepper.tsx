import type { Position } from '../../engine'
import { difficulty, displayNote } from '../../engine'
import { useT } from '../../i18n'
import type { Messages } from '../../i18n'
import { selectNotation } from '../../state/selectors'
import { useStore } from '../../state/store'
import type { Notation } from '../../engine'

/** Texto de la posición: [título, detalle] (= pLbl de drawBig). */
export function positionText(p: Position, i: number, n: number, m: Messages, notation: Notation): [string, string] {
  const nn = (x: string) => displayNote(x, notation)
  const iv = m.iv as Record<string, string>
  if (p.kind === 'keys') return [m.inv[p.inversion] ?? m.inv[0], `${m.bass}: ${nn(p.bass.name)} (${iv[p.bass.label] ?? p.bass.label})`]
  const nz = p.frets.filter((f): f is number => f != null && f > 0)
  const lo = Math.min(...nz)
  const hi = Math.max(...nz)
  const fr = !nz.length ? m.open : lo === hi ? `${m.frets.replace(/s$/, '')} ${lo}` : `${m.frets} ${lo}–${hi}`
  const diff = { easy: m.easy, mid: m.mid, hard: m.hard }[difficulty(p)]
  const shape = p.shape ? ` · ${m.shape} ${nn(p.shape)}` : ''
  return [`${m.position} ${i + 1} ${m.of} ${n}`, `${fr} · ${diff}${shape} · ${m.bass} ${nn(p.bass.name)}`]
}

export interface PositionStepperProps {
  list: Position[]
  index: number
  onStep: (d: 1 | -1) => void
}

/** ◀ "Posición 2 de 9 · trastes 5–7 · fácil · forma de A · bajo Mi" ▶ */
export function PositionStepper({ list, index, onStep }: PositionStepperProps) {
  const m = useT()
  const notation = useStore(selectNotation)
  const p = list[index]
  const [title, detail] = p ? positionText(p, index, list.length, m, notation) : [m.noPosition, '']
  const off = list.length < 2
  return (
    <div className="step">
      <button type="button" className="step-btn" aria-label={m.prevPos} disabled={off} onClick={() => onStep(-1)}>
        ◀
      </button>
      <div className="step-lbl" aria-live="polite">
        <b>{title}</b>
        {detail && <span>{detail}</span>}
      </div>
      <button type="button" className="step-btn" aria-label={m.nextPos} disabled={off} onClick={() => onStep(1)}>
        ▶
      </button>
    </div>
  )
}

export function ListenButton({ onListen, disabled }: { onListen: () => void; disabled: boolean }) {
  const m = useT()
  return (
    <button type="button" className="listen" disabled={disabled} onClick={onListen}>
      {m.listen}
    </button>
  )
}

/** Selector Notas / Intervalos. */
export function LabelsToggle() {
  const m = useT()
  const labels = useStore((s) => s.settings.labels)
  const setSettings = useStore((s) => s.setSettings)
  return (
    <div className="seg" role="group" aria-label={m.labelsL}>
      <button type="button" aria-pressed={labels === 'notes'} className={labels === 'notes' ? 'on' : ''} onClick={() => setSettings({ labels: 'notes' })}>
        {m.notes}
      </button>
      <button type="button" aria-pressed={labels === 'intervals'} className={labels === 'intervals' ? 'on' : ''} onClick={() => setSettings({ labels: 'intervals' })}>
        {m.intervals}
      </button>
    </div>
  )
}
