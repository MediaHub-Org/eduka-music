import type { NoteName } from './notes'

export type InstrumentId = 'guitar' | 'piano' | 'ukulele' | 'cuatro' | 'timple' | 'bandurria'

export interface StringInstrument {
  kind: 'strings'
  id: InstrumentId
  /** MIDI, en orden de cuerda */
  tuning: number[]
  stringNames: NoteName[]
  frets: number
  caged?: true
  reentrant?: true
}

export interface PianoInstrument {
  kind: 'piano'
  id: 'piano'
}

export type Instrument = StringInstrument | PianoInstrument

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  guitar: { kind: 'strings', id: 'guitar', tuning: [40, 45, 50, 55, 59, 64], stringNames: ['E', 'A', 'D', 'G', 'B', 'E'], frets: 15, caged: true },
  ukulele: { kind: 'strings', id: 'ukulele', tuning: [67, 60, 64, 69], stringNames: ['G', 'C', 'E', 'A'], frets: 12, reentrant: true },
  cuatro: { kind: 'strings', id: 'cuatro', tuning: [57, 62, 66, 59], stringNames: ['A', 'D', 'F#', 'B'], frets: 12, reentrant: true },
  timple: { kind: 'strings', id: 'timple', tuning: [67, 72, 64, 69, 74], stringNames: ['G', 'C', 'E', 'A', 'D'], frets: 12, reentrant: true },
  bandurria: { kind: 'strings', id: 'bandurria', tuning: [56, 61, 66, 71, 76, 81], stringNames: ['G#', 'C#', 'F#', 'B', 'E', 'A'], frets: 12 },
  piano: { kind: 'piano', id: 'piano' },
}

export const INSTRUMENT_ORDER: InstrumentId[] = ['guitar', 'piano', 'ukulele', 'cuatro', 'timple', 'bandurria']
