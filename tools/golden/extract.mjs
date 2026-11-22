// Extracts golden data from the original artifact. Usage:
//   node tools/golden/extract.mjs <artifact.html> <out.json>
// Chord names in `diatonic` are the artifact's cName() with S.nota='le': root with
// sharps/flats rendered as ♯/♭ plus the quality symbol (e.g. "F♯m7♭5", "Gmaj7", "C").
// Chain / position keys: strings "x,0,2,2,1,0" (+ "#tag" for CAGED in positions),
// piano "48,52,55@inversion" in positions, plain "48,52,55" in chains.
import { readFileSync, writeFileSync } from 'node:fs'

const [, , src, out] = process.argv
const html = readFileSync(src, 'utf8')
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
const full = scripts.find((s) => s.includes('/* ================= theory'))
const a = full.indexOf('/* ================= theory')
const b = full.indexOf('/* ================= audio')
const code = full.slice(a, b)
const A = new Function(
  code + '; return {S, chord, positions, topList, pianoPos, pianoNext, diatonic, nearest, allList, posList, Q, QI, ROOTS, KEYS, cName}',
)()
const { S, chord, topList, pianoPos, pianoNext, diatonic, nearest, allList, posList, Q, QI, ROOTS, KEYS, cName } = A

const INSTS = ['guitar', 'piano', 'ukulele', 'cuatro', 'timple', 'bandurria']
S.nota = 'le'
S.capo = 0

const frKey = (p) => p.fr.map((f) => (f == null ? 'x' : f)).join(',')
const plain = (p) => (p.notes ? p.notes.join(',') : frKey(p))
const ser = (p) => (p.notes ? `${p.notes.join(',')}@${p.inv}` : frKey(p) + (p.tag ? '#' + p.tag : ''))

const golden = { tones: {}, positions: {}, diatonic: {}, chains: {} }

for (const r of ROOTS) for (const q of Q) golden.tones[`${r}|${q.id}`] = chord(r, q.id).tones.map((t) => t.raw)

for (const inst of INSTS) {
  for (const capo of inst === 'piano' ? [0] : [0, 2]) {
    S.inst = inst
    S.capo = capo
    for (const r of ROOTS)
      for (const q of Q) {
        const c = chord(r, q.id)
        const list = inst === 'piano' ? pianoPos(c) : topList(c)
        golden.positions[`${inst}|${capo}|${r}|${q.id}`] = list.slice(0, 12).map(ser)
      }
  }
}
S.capo = 0

for (const k of KEYS)
  for (const mode of ['maj', 'min'])
    for (const type of ['tri', '7']) {
      S.key = k
      S.mode = mode
      S.type = type
      golden.diatonic[`${k}|${mode}|${type}`] = diatonic().map((c) => cName(c))
    }

// Copied verbatim from render() in the artifact (outside the sliced region)
const PR = {
  maj: { pop: [0, 4, 5, 3], jazz: [1, 4, 0], fifties: [0, 5, 3, 4], blues: [0, 3, 4, 0], cycle: [0, 5, 3, 1, 6, 4, 2] },
  min: { anda: [0, 6, 5, 4], minc: [0, 3, 4, 0], jazz: [1, 4, 0], ballad: [0, 5, 2, 6], cycle: [0, 5, 3, 1, 6, 4, 2] },
}
for (const inst of ['guitar', 'piano'])
  for (const [key, mode] of [['G', 'maj'], ['A', 'min']]) {
    S.inst = inst
    S.capo = 0
    S.key = key
    S.mode = mode
    S.type = 'tri'
    const D = diatonic()
    for (const [id, degs] of Object.entries(PR[mode])) {
      let prev = null
      const seq = degs.map((d, i) => {
        const c = D[d]
        let p
        if (i === 0) p = posList(c)[0]
        else if (inst === 'piano') p = pianoNext(prev, c)
        else {
          const L2 = allList(c)
          p = L2[nearest(prev, L2)]
        }
        prev = p
        return plain(p)
      })
      golden.chains[`${inst}|${key}|${mode}|${id}`] = seq
    }
  }

writeFileSync(out, JSON.stringify(golden))
const n = (o) => Object.keys(o).length
console.log('tones', n(golden.tones), 'positions', n(golden.positions), 'diatonic', n(golden.diatonic), 'chains', n(golden.chains))
