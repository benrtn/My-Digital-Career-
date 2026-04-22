'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

export interface CookiePreferences {
  necessary: true
  analytics: boolean
  payments: boolean
}

interface CookieConsentState {
  hasMadeChoice: boolean
  updatedAt: string | null
  preferences: CookiePreferences
}

interface CookieConsentContextValue extends CookieConsentState {
  hydrated: boolean
  isPreferencesOpen: boolean
  acceptAll: () => void
  rejectAll: () => void
  savePreferences: (preferences: Pick<CookiePreferences, 'analytics' | 'payments'>) => void
  openPreferences: () => void
  closePreferences: () => void
}

const STORAGE_KEY = 'my-digital-career-cookie-consent'

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  payments: false,
}

const defaultState: CookieConsentState = {
  hasMadeChoice: false,
  updatedAt: null,
  preferences: defaultPreferences,
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

function persistState(nextState: CookieConsentState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CookieConsentState>(defaultState)
  const [hydrated, setHydrated] = useState(false)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        setHydrated(true)
        return
      }

      const parsed = JSON.parse(raw) as Partial<CookieConsentState>
      setState({
        hasMadeChoice: Boolean(parsed.hasMadeChoice),
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
        preferences: {
          necessary: true,
          analytics: Boolean(parsed.preferences?.analytics),
          payments: Boolean(parsed.preferences?.payments),
        },
      })
    } catch {
      setState(defaultState)
    } finally {
      setHydrated(true)
    }
  }, [])

  const applyState = useCallback((preferences: Pick<CookiePreferences, 'analytics' | 'payments'>) => {
    const nextState: CookieConsentState = {
      hasMadeChoice: true,
      updatedAt: new Date().toISOString(),
      preferences: {
        necessary: true,
        analytics: preferences.analytics,
        payments: preferences.payments,
      },
    }

    setState(nextState)
    persistState(nextState)
    setIsPreferencesOpen(false)

    // Persist server-side (Google Sheets). Fire-and-forget — UI already updated.
    void fetch('/api/cookie-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analytics: preferences.analytics,
        payments: preferences.payments,
      }),
      credentials: 'same-origin',
    }).catch(() => {
      // Server persistence is best-effort; local state is already saved.
    })
  }, [])

  const acceptAll = useCallback(() => {
    applyState({ analytics: true, payments: true })
  }, [applyState])

  const rejectAll = useCallback(() => {
    applyState({ analytics: false, payments: false })
  }, [applyState])

  const savePreferences = useCallback((preferences: Pick<CookiePreferences, 'analytics' | 'payments'>) => {
    applyState(preferences)
  }, [applyState])

  const openPreferences = useCallback(() => setIsPreferencesOpen(true), [])
  const closePreferences = useCallback(() => setIsPreferencesOpen(false), [])

  return (
    <CookieConsentContext.Provider
      value={{
        ...state,
        hydrated,
        isPreferencesOpen,
        acceptAll,
        rejectAll,
        savePreferences,
        openPreferences,
        closePreferences,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsent must be used inside CookieConsentProvider')
  return ctx
}
