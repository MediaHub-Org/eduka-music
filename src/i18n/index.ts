import { useStore } from '../state/store'
import { en } from './en'
import { es } from './es'
import type { Messages } from './es'

export type { Messages }
export type Lang = 'es' | 'en'

export function messagesFor(lang: Lang): Messages {
  return lang === 'en' ? en : es
}

export function useT(): Messages {
  return messagesFor(useStore((s) => s.settings.lang))
}
