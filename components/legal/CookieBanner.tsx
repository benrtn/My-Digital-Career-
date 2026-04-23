'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCookieConsent } from '@/contexts/CookieConsentContext'

export function CookieBanner() {
  const { hydrated, hasMadeChoice, acceptAll, rejectAll, openPreferences } = useCookieConsent()

  useEffect(() => {
    if (hydrated && !hasMadeChoice) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [hydrated, hasMadeChoice])

  if (!hydrated || hasMadeChoice) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 bg-neutral-950/45 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white/92 p-7 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.55)] backdrop-blur-2xl"
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                My Digital Career
              </p>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                Votre confidentialite compte
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                Nous utilisons des cookies et technologies similaires pour assurer le bon fonctionnement du site, mesurer l'audience et securiser les paiements. Avec votre accord, certaines donnees de navigation peuvent etre utilisees par des services tels que Google Analytics, Stripe ou PayPal. Vous pouvez accepter, refuser ou personnaliser vos choix a tout moment.
              </p>
            </div>

            <div className="grid gap-3 rounded-[1.5rem] border border-neutral-200 bg-neutral-50/70 p-4 md:grid-cols-3">
              <CookiePill title="Essentiels" subtitle="Fonctionnement du site" />
              <CookiePill title="Audience" subtitle="Google Analytics" />
              <CookiePill title="Paiement" subtitle="Stripe & PayPal" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={acceptAll}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
              >
                Accepter tout
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950/10"
              >
                Refuser
              </button>
              <button
                type="button"
                onClick={openPreferences}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-neutral-950 bg-neutral-950/5 px-5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-950 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
              >
                Personnaliser
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function CookiePill({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.35)]">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
    </div>
  )
}
