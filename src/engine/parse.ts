import { pcOf } from './notes'
import type { NoteName } from './notes'
import type { ChordSpec, QualityId } from './chords'

const MAX_RESULTS = 8
const LATIN: Record<string, string> = { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B' }

const ALIASES: Record<QualityId, string[]> = {
  maj: ['maj', 'major', 'mayor'],
  m: ['m', 'min', '-', 'menor', 'minor'],
  dim: ['dim', '°', 'º', 'disminuido', 'diminished'],
  aug: ['aug', '+', 'aumentado', 'augmented'],
  sus2: ['sus2', 'suspendido2', 'suspended2'],
  sus4: ['sus4', 'sus', 'suspendido', 'suspended', 'suspendido4', 'suspended4'],
  maj7: ['maj7', 'major7', 'mayor7', 'Δ', 'δ', 'Δ7', 'ma7', 'septimamayor', 'majorseventh', 'seventhmajor', 'majorseptima', 'mayorseptima', 'major7th'],
  '7': ['7', 'septima', 'seventh', 'dominante', 'dominant', 'dom7', 'dom', 'septimadominante'],
  m7: ['m7', 'min7', '-7', 'menor7', 'minor7', 'menorseptima', 'minorseventh', 'minor7th', 'minorseptima'],
  m7b5: ['m7b5', 'm7♭5', 'min7b5', 'ø', 'Ø', 'ø7', 'semidisminuido', 'halfdiminished', 'halfdim'],
  dim7: ['dim7', '°7', 'º7', 'disminuido7', 'diminished7'],
  '7sus4': ['7sus4', '7sus'],
  '6': ['6', 'sexta', 'sixth', 'mayor6', 'major6'],
  m6: ['m6', 'min6', 'menor6', 'minor6', 'menorsexta', 'minorsixth'],
  add9: ['add9'],
  '9': ['9', 'novena', 'ninth', 'dominante9', 'dom9'],
  m9: ['m9', 'min9', 'menor9', 'minor9', 'menornovena', 'minorninth'],
  maj9: ['maj9', 'major9', 'mayor9', 'Δ9', 'novenamayor', 'majorninth'],
}

const QUALITY_BY_ALIAS = new Map<string, QualityId>()
for (const [id, list] of Object.entries(ALIASES) as [QualityId, string[]][]) {
  for (const a of list) QUALITY_BY_ALIAS.set(a, id)
}

const FALLBACK: QualityId[] = ['maj', 'm', '7', 'm7']

const lowerAscii = (s: string): string => s.replace(/[A-Z]/g, (c) => c.toLowerCase())
const stripDiacritics = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

interface Parsed {
  name: NoteName
  end: number
}

/** Posibles raíces al inicio de `s` desde `pos`: primero nombres latinos, luego letra A-G. Incluye la alteración. */
function noteCandidates(s: string, pos: number): Parsed[] {
  const out: Parsed[] = []
  const low = lowerAscii(s)
  const rest = low.slice(pos)
  const roots: Parsed[] = []
  const latin = /^(sol|do|re|mi|fa|la|si)/.exec(rest)
  if (latin) roots.push({ name: LATIN[latin[1]], end: pos + latin[1].length })
  if (/^[a-g]/.test(rest)) roots.push({ name: rest[0].toUpperCase(), end: pos + 1 })
  for (const r of roots) {
    const after = low.slice(r.end)
    const ws = /^\s*/.exec(after)![0].length
    const t = after.slice(ws)
    let acc = ''
    let len = 0
    const word = /^(sostenido|sharp)/.exec(t)
    const wordFlat = /^(bemol|flat)/.exec(t)
    if (word) { acc = '#'; len = word[1].length }
    else if (wordFlat) { acc = 'b'; len = wordFlat[1].length }
    else if (t[0] === '#' || t[0] === '♯') { acc = '#'; len = 1 }
    else if (t[0] === 'b' || t[0] === '♭') { acc = 'b'; len = 1 }
    else if (t[0] === 's' && !t.startsWith('sus')) { acc = '#'; len = 1 }
    // Con la alteración (si la hay) y, como alternativa, sin ella.
    if (len > 0) out.push({ name: r.name + acc, end: r.end + ws + len })
    out.push(r)
  }
  return out
}

function parseQuality(s: string, pos: number): QualityId | null | undefined {
  let rest = stripDiacritics(s.slice(pos))
  // M mayúscula pegada a la raíz/alteración = mayor (CM7); 'Ma…'/'Mi…' son palabras.
  if (rest[0] === 'M' && !/^M[a-zA-Z]/.test(rest)) rest = 'maj' + rest.slice(1)
  const key = lowerAscii(rest).replace(/[\s()]/g, '')
  if (key === '') return null
  return QUALITY_BY_ALIAS.get(key)
}

function parseBass(part: string): NoteName | undefined {
  const t = stripDiacritics(part.trim())
  if (t === '') return undefined
  for (const c of noteCandidates(t, 0)) {
    if (t.slice(c.end).trim() === '') return c.name
  }
  return undefined
}

export function parseChordQuery(q: string): ChordSpec[] {
  const input = stripDiacritics(q.trim())
  if (input === '') return []
  const slash = input.indexOf('/')
  const main = slash < 0 ? input : input.slice(0, slash).trim()
  const bass = slash < 0 ? undefined : parseBass(input.slice(slash + 1))
  if (main === '') return []

  for (const c of noteCandidates(main, 0)) {
    const quality = parseQuality(main, c.end)
    if (quality === undefined) continue
    const withBass = bass !== undefined && pcOf(bass) !== pcOf(c.name) ? bass : undefined
    const qualities = quality === null ? FALLBACK : [quality]
    return qualities
      .map((id): ChordSpec => (withBass === undefined ? { root: c.name, quality: id } : { root: c.name, quality: id, bass: withBass }))
      .slice(0, MAX_RESULTS)
  }
  return []
}
