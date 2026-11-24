import { INSTRUMENT_ORDER } from '../engine'
import type { InstrumentId } from '../engine'

/**
 * Cuántas veces se ha elegido cada instrumento. Es una comodidad local (ordena las fichas),
 * no datos del usuario: vive aparte del store y no entra en copias de seguridad.
 */
const KEY = 'eduka-music-instrument-use'

function read(): Partial<Record<InstrumentId, number>> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Partial<Record<InstrumentId, number>>) : {}
  } catch {
    return {}
  }
}

export function bumpInstrumentUse(id: InstrumentId): void {
  try {
    const use = read()
    use[id] = (Number.isFinite(use[id]) ? (use[id] as number) : 0) + 1
    localStorage.setItem(KEY, JSON.stringify(use))
  } catch {
    /* sin almacenamiento */
  }
}

export function clearInstrumentUse(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* sin almacenamiento */
  }
}

/** Instrumentos del más al menos usado; los empates mantienen el orden por defecto. */
export function instrumentsByUse(): InstrumentId[] {
  const use = read()
  const n = (id: InstrumentId) => (Number.isFinite(use[id]) ? (use[id] as number) : 0)
  return [...INSTRUMENT_ORDER].sort((a, b) => n(b) - n(a))
}
