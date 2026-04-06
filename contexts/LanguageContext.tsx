'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Language } from '@/types'
import { getTranslation, type TranslationKeys } from '@/translations'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: TranslationKeys
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('fr')

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLang
    }
  }, [])

  const t = getTranslation(lang)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
