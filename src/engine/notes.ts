export type Pc = number
export type NoteName = string
export type Notation = 'latin' | 'english'

export const ROOTS: readonly NoteName[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

const NAT: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const LET = 'CDEFGAB'
const SOLF: Record<string, string> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' }

const mod12 = (n: number): number => ((n % 12) + 12) % 12

export function pcOf(n: NoteName): Pc {
  let acc = NAT[n[0]]
  for (const c of n.slice(1)) acc += c === '#' ? 1 : -1
  return mod12(acc)
}

/** Nombre de la nota a `semis` semitonos de `root`, usando la letra `step` pasos por encima. */
export function spell(root: NoteName, semis: number, step: number): NoteName {
  const letter = LET[(LET.indexOf(root[0]) + step) % 7]
  const pc = mod12(pcOf(root) + semis)
  let d = mod12(pc - NAT[letter])
  if (d > 6) d -= 12
  return letter + (d > 0 ? '#'.repeat(d) : 'b'.repeat(-d))
}

const fmt = (n: string): string => n.replace(/#/g, '♯').replace(/b/g, '♭')

export function displayNote(n: NoteName, notation: Notation): string {
  return notation === 'latin' ? SOLF[n[0]] + fmt(n.slice(1)) : fmt(n)
}
