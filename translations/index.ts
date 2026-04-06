import { fr } from './fr'
import { en } from './en'
import { th } from './th'
import type { Language } from '@/types'

export const translations = { fr, en, th }

export type TranslationKeys = typeof fr

export function getTranslation(lang: Language): TranslationKeys {
  return translations[lang] ?? translations.fr
}

export { fr, en, th }
