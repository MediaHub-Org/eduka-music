import '@testing-library/jest-dom/vitest'

// jsdom no trae ResizeObserver, AudioContext, matchMedia ni scrollIntoView.
class RO {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
const g = globalThis as unknown as Record<string, unknown>
if (!g.ResizeObserver) g.ResizeObserver = RO

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  sampleRate = 44100
  destination = {}
  resume(): Promise<void> {
    return Promise.resolve()
  }
  createBuffer(_c: number, len: number) {
    const d = new Float32Array(len)
    return { getChannelData: () => d }
  }
  createBufferSource() {
    return { buffer: null, connect: (x: unknown) => x, start() {} }
  }
  createGain() {
    const gain = { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }
    return { gain, connect: (x: unknown) => x }
  }
  createOscillator() {
    return { type: 'sine', frequency: { value: 0 }, connect: (x: unknown) => x, start() {}, stop() {} }
  }
}

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>
  if (!w.AudioContext) w.AudioContext = FakeAudioContext
  if (!w.matchMedia)
    w.matchMedia = (q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    })
  // jsdom lo "implementa" escribiendo un error en consola
  window.scrollTo = (() => {}) as typeof window.scrollTo
  window.scrollBy = (() => {}) as typeof window.scrollBy
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function () {}
}
