'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Cookie, FileText, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useCookieConsent } from '@/contexts/CookieConsentContext'
import { LEGAL_PLACEHOLDERS, cookieContent } from './legalContent'
import { LegalDocumentContent } from './LegalDocumentContent'
import { cn } from '@/lib/utils'

type LegalModal = 'cookies' | 'cgv' | 'legal' | 'privacy' | null

export function LegalDock() {
  const {
    hydrated,
    hasMadeChoice,
    preferences,
    isPreferencesOpen,
    acceptAll,
    rejectAll,
    savePreferences,
    openPreferences,
    closePreferences,
  } = useCookieConsent()

  const [activeModal, setActiveModal] = useState<LegalModal>(null)
  const [draftAnalytics, setDraftAnalytics] = useState(preferences.analytics)
  const [draftPayments, setDraftPayments] = useState(preferences.payments)

  useEffect(() => {
    setDraftAnalytics(preferences.analytics)
    setDraftPayments(preferences.payments)
  }, [preferences.analytics, preferences.payments, isPreferencesOpen])

  const openModal = (modal: Exclude<LegalModal, null>) => {
    if (modal === 'cookies') {
      openPreferences()
      return
    }
    setActiveModal(modal)
  }

  const closeModal = () => setActiveModal(null)

  const saveDraft = () => {
    savePreferences({ analytics: draftAnalytics, payments: draftPayments })
  }

  return (
    <>
      {hydrated && !hasMadeChoice ? (
        <AnimatePresence>
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
                    Nous utilisons des cookies et technologies similaires pour assurer le bon fonctionnement du site, mesurer l’audience et securiser les paiements. Avec votre accord, certaines donnees de navigation peuvent etre utilisees par des services tels que Google Analytics, Stripe ou PayPal. Vous pouvez accepter, refuser ou personnaliser vos choix a tout moment.
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
      ) : null}

      <div className="fixed inset-x-0 bottom-4 z-40 px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-2 rounded-[1.75rem] border border-white/10 bg-neutral-950/88 px-3 py-3 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
          <LegalButton icon={<SlidersHorizontal size={15} />} onClick={() => openModal('cookies')}>
            Gestion des cookies
          </LegalButton>
          <LegalButton icon={<FileText size={15} />} onClick={() => openModal('cgv')}>
            CGV
          </LegalButton>
          <LegalButton icon={<ShieldCheck size={15} />} onClick={() => openModal('legal')}>
            Mentions légales
          </LegalButton>
          <LegalButton icon={<Cookie size={15} />} onClick={() => openModal('privacy')}>
            Politique de confidentialité
          </LegalButton>
        </div>
      </div>

      <Modal open={isPreferencesOpen} onClose={closePreferences} title="Gestion des cookies" size="lg">
        <div className="px-8 py-7 space-y-8 text-sm text-neutral-700">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              My Digital Career
            </p>
            <p className="leading-relaxed text-neutral-600">{cookieContent.intro}</p>
            <div className="space-y-2 text-neutral-600">
              {cookieContent.explanation.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <ConsentRow
              title={cookieContent.categories[0].title}
              description={cookieContent.categories[0].description}
              checked
              disabled
            />
            <ConsentRow
              title={cookieContent.categories[1].title}
              description={cookieContent.categories[1].description}
              checked={draftAnalytics}
              onChange={() => setDraftAnalytics((value) => !value)}
            />
            <ConsentRow
              title={cookieContent.categories[2].title}
              description={cookieContent.categories[2].description}
              checked={draftPayments}
              onChange={() => setDraftPayments((value) => !value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={acceptAll}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
            >
              Tout accepter
            </button>
            <button
              type="button"
              onClick={rejectAll}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950/10"
            >
              Tout refuser
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-neutral-950 bg-neutral-950/5 px-4 text-sm font-medium text-neutral-950 transition hover:bg-neutral-950 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
            >
              Enregistrer mes préférences
            </button>
          </div>
        </div>
      </Modal>

      <LegalTextModal
        open={activeModal === 'cgv'}
        onClose={closeModal}
        title="CGV"
        placeholder={LEGAL_PLACEHOLDERS.cgv}
        note="Remplacez ce placeholder par vos conditions générales de vente complètes."
      />
      <LegalTextModal
        open={activeModal === 'legal'}
        onClose={closeModal}
        title="Mentions légales"
        placeholder={LEGAL_PLACEHOLDERS.legalNotice}
        note="Remplacez ce placeholder par vos mentions légales complètes."
      />
      <LegalTextModal
        open={activeModal === 'privacy'}
        onClose={closeModal}
        title="Politique de confidentialité"
        placeholder={LEGAL_PLACEHOLDERS.privacyPolicy}
        note="Remplacez ce placeholder par votre politique de confidentialité complète."
      />
    </>
  )
}

function LegalButton({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
    >
      <span className="text-white/70">{icon}</span>
      <span>{children}</span>
    </button>
  )
}

function ConsentRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string
  description: string
  checked: boolean
  onChange?: () => void
  disabled?: boolean
}) {
  return (
    <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-4 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.4)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-neutral-950">{title}</p>
          <p className="text-sm leading-relaxed text-neutral-600">{description}</p>
        </div>

        <button
          type="button"
          onClick={disabled ? undefined : onChange}
          aria-pressed={checked}
          aria-disabled={disabled}
          disabled={disabled}
          className={cn(
            'relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-neutral-950/15',
            checked
              ? 'border-neutral-950 bg-neutral-950'
              : 'border-neutral-300 bg-neutral-200',
            disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    </div>
  )
}

function LegalTextModal({
  open,
  onClose,
  title,
  placeholder,
  note,
}: {
  open: boolean
  onClose: () => void
  title: string
  placeholder: string
  note: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <LegalDocumentContent
        note={note}
        placeholder={placeholder}
        type={title === 'CGV' ? 'cgv' : title === 'Mentions légales' ? 'legal' : 'privacy'}
      />
    </Modal>
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
