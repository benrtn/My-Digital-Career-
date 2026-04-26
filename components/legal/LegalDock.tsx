'use client'

import { useEffect, useState } from 'react'
import { BarChart3, ChevronLeft, Cookie, CreditCard, FileText, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useCookieConsent } from '@/contexts/CookieConsentContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { LEGAL_PLACEHOLDERS } from './legalContent'
import { LegalDocumentContent } from './LegalDocumentContent'
import { cn } from '@/lib/utils'

type LegalModal = 'cookies' | 'cgv' | 'legal' | 'privacy' | null

export function LegalDock({
  variant = 'floating',
}: {
  variant?: 'floating' | 'inline'
}) {
  const {
    preferences,
    isPreferencesOpen,
    acceptAll,
    rejectAll,
    savePreferences,
    openPreferences,
    closePreferences,
  } = useCookieConsent()

  const { t } = useLanguage()
  const m = t.legalDock.modal

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
      <div
        className={cn(
          variant === 'floating'
            ? 'fixed inset-x-0 bottom-4 z-40 px-4 pb-[env(safe-area-inset-bottom)]'
            : 'w-full'
        )}
      >
        <div
          className={cn(
            variant === 'floating'
              ? 'mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-2 rounded-[1.75rem] border border-white/10 bg-neutral-950/88 px-3 py-3 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.75)] backdrop-blur-2xl'
              : 'w-full rounded-[1.9rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-3 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.75)] backdrop-blur-2xl'
          )}
        >
          {variant === 'inline' ? (
            <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
              <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/75">
                {t.legalDock.sectionLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                <LegalButton variant={variant} icon={<SlidersHorizontal size={15} />} onClick={() => openModal('cookies')}>
                  {t.legalDock.cookies}
                </LegalButton>
                <LegalButton variant={variant} icon={<FileText size={15} />} onClick={() => openModal('cgv')}>
                  {t.legalDock.cgv}
                </LegalButton>
                <LegalButton variant={variant} icon={<ShieldCheck size={15} />} onClick={() => openModal('legal')}>
                  {t.legalDock.legal}
                </LegalButton>
                <LegalButton variant={variant} icon={<Cookie size={15} />} onClick={() => openModal('privacy')}>
                  {t.legalDock.privacy}
                </LegalButton>
              </div>
            </div>
          ) : (
            <>
              <LegalButton icon={<SlidersHorizontal size={15} />} onClick={() => openModal('cookies')} variant={variant}>
                {t.legalDock.cookies}
              </LegalButton>
              <LegalButton icon={<FileText size={15} />} onClick={() => openModal('cgv')}>
                {t.legalDock.cgv}
              </LegalButton>
              <LegalButton icon={<ShieldCheck size={15} />} onClick={() => openModal('legal')}>
                {t.legalDock.legal}
              </LegalButton>
              <LegalButton icon={<Cookie size={15} />} onClick={() => openModal('privacy')}>
                {t.legalDock.privacy}
              </LegalButton>
            </>
          )}
        </div>
      </div>

      <Modal open={isPreferencesOpen} onClose={closePreferences} title={m.cookiesTitle} size="xl">
        <div className="space-y-6 px-7 py-7 text-sm text-neutral-700 md:px-8">
          <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-5">
              <div className="rounded-[1.6rem] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,248,228,0.98),rgba(255,255,255,0.95))] p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.4)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700/75">
                  {m.privacyLabel}
                </p>
                <p className="mt-2 leading-relaxed text-neutral-700">{m.intro}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {(m.features as { title: string; subtitle: string }[]).map((f, i) => (
                  <CookieFeatureCard
                    key={i}
                    icon={[<ShieldCheck key="s" size={18} />, <BarChart3 key="b" size={18} />, <CreditCard key="c" size={18} />][i]}
                    title={f.title}
                    subtitle={f.subtitle}
                  />
                ))}
              </div>

              <div className="rounded-[1.5rem] border border-neutral-200/80 bg-white/88 p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.24)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  {m.inPractice}
                </p>
                <div className="mt-4 space-y-3">
                  {(m.explanation as string[]).map((paragraph) => (
                    <InfoRow key={paragraph} text={paragraph} />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-neutral-200/80 bg-white/88 p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.24)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  {m.preferencesLabel}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {m.preferencesDesc}
                </p>
              </div>

              <div className="space-y-3">
                {(m.categories as { title: string; description: string }[]).map((cat, i) => (
                  <ConsentRow
                    key={i}
                    title={cat.title}
                    description={cat.description}
                    checked={i === 0 ? true : i === 1 ? draftAnalytics : draftPayments}
                    disabled={i === 0}
                    onChange={i === 0 ? undefined : i === 1 ? () => setDraftAnalytics((v) => !v) : () => setDraftPayments((v) => !v)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-7 border-t border-neutral-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.98))] px-7 pb-1 pt-5 backdrop-blur-xl md:-mx-8 md:px-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={acceptAll}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
              >
                {m.acceptAll}
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950/10"
              >
                {m.rejectAll}
              </button>
              <button
                type="button"
                onClick={saveDraft}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-neutral-950 bg-neutral-950/5 px-5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-950 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
              >
                {m.savePreferences}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <LegalTextModal
        open={activeModal === 'cgv'}
        onClose={closeModal}
        title={t.legalDock.cgv}
        placeholder={LEGAL_PLACEHOLDERS.cgv}
        note={m.cgvNote}
        backLabel={m.back}
        docType="cgv"
      />
      <LegalTextModal
        open={activeModal === 'legal'}
        onClose={closeModal}
        title={t.legalDock.legal}
        placeholder={LEGAL_PLACEHOLDERS.legalNotice}
        note={m.legalNote}
        backLabel={m.back}
        docType="legal"
      />
      <LegalTextModal
        open={activeModal === 'privacy'}
        onClose={closeModal}
        title={t.legalDock.privacy}
        placeholder={LEGAL_PLACEHOLDERS.privacyPolicy}
        note={m.privacyNote}
        backLabel={m.back}
        docType="privacy"
      />
    </>
  )
}

function LegalButton({
  children,
  icon,
  onClick,
  variant = 'floating',
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
  variant?: 'floating' | 'inline'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-[42px] items-center gap-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/15',
        variant === 'inline'
          ? 'rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-2.5 text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
          : 'rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-neutral-100 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
      )}
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
  backLabel,
  docType,
}: {
  open: boolean
  onClose: () => void
  title: string
  placeholder: string
  note: string
  backLabel: string
  docType: 'cgv' | 'legal' | 'privacy'
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      headerAction={{
        label: backLabel,
        icon: <ChevronLeft size={18} />,
        onClick: onClose,
      }}
    >
      <LegalDocumentContent
        note={note}
        placeholder={placeholder}
        type={docType}
      />
    </Modal>
  )
}


function CookieFeatureCard({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="rounded-[1.5rem] border border-neutral-200/80 bg-white/88 p-4 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.24)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-[0_16px_32px_-26px_rgba(15,23,42,0.4)]">
        {icon}
      </div>
      <p className="mt-4 text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
    </div>
  )
}

function InfoRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
      <p className="text-sm leading-relaxed text-neutral-600">{text}</p>
    </div>
  )
}
