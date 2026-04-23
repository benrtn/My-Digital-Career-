'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Info, Lock } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Modal } from '@/components/ui/Modal'
import { getLocalizedPrice } from '@/config/site'
import { buildClientFolderName } from '@/lib/clientDownloads'
import { LegalDocumentContent } from '@/components/legal/LegalDocumentContent'
import { LEGAL_PLACEHOLDERS } from '@/components/legal/legalContent'
import { cn } from '@/lib/utils'
import type { AppointmentSelection, QuestionnaireData } from '@/types'

interface PaymentBlockProps {
  questionnaireData?: QuestionnaireData | null
  appointment?: AppointmentSelection | null
  skipAppointment?: boolean
}

type JsonResponse = {
  success?: boolean
  error?: string
  orderId?: string
  token?: string
  warnings?: string[]
  meetLink?: string | null
  folderName?: string
}

async function readJson(response: Response): Promise<JsonResponse> {
  try {
    return (await response.json()) as JsonResponse
  } catch {
    return {
      success: false,
      error: `Réponse invalide (HTTP ${response.status})`,
    }
  }
}

export function PaymentBlock({ questionnaireData, appointment, skipAppointment }: PaymentBlockProps) {
  const { t, lang } = useLanguage()
  const tp = t.cart.payment
  const price = getLocalizedPrice(lang)

  const [orderSent, setOrderSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [legalModalOpen, setLegalModalOpen] = useState(false)
  const [legalConsents, setLegalConsents] = useState({
    cgvAccepted: false,
    immediateStartAccepted: false,
    rightsConfirmed: false,
  })
  const [legalErrors, setLegalErrors] = useState<Partial<Record<keyof typeof legalConsents, string>>>({})
  const [orderId, setOrderId] = useState<string | null>(null)
  const [clientFolderName, setClientFolderName] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [submitWarnings, setSubmitWarnings] = useState<string[]>([])

  function toggleConsent(key: keyof typeof legalConsents) {
    setLegalConsents((prev) => ({ ...prev, [key]: !prev[key] }))
    setLegalErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validateLegalConsents() {
    const nextErrors: Partial<Record<keyof typeof legalConsents, string>> = {}

    if (!legalConsents.cgvAccepted) nextErrors.cgvAccepted = 'Cette validation est obligatoire.'
    if (!legalConsents.immediateStartAccepted) nextErrors.immediateStartAccepted = 'Cette validation est obligatoire.'
    if (!legalConsents.rightsConfirmed) nextErrors.rightsConfirmed = 'Cette validation est obligatoire.'

    setLegalErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const canSubmit = Boolean(
    questionnaireData &&
    (appointment || skipAppointment) &&
    !orderSent &&
    !submitting
  )

  const handleDemoOrder = async () => {
    if (!questionnaireData || (!appointment && !skipAppointment) || orderSent || submitting) return
    if (!validateLegalConsents()) return

    setSubmitting(true)
    setSubmitError('')
    setSubmitWarnings([])

    try {
      const questionnaireRes = await fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId || undefined,
          firstName: questionnaireData.firstName,
          lastName: questionnaireData.lastName,
          email: questionnaireData.email,
          profession: questionnaireData.profession,
          seekingJob:
            questionnaireData.seekingJob === null
              ? ''
              : questionnaireData.seekingJob
                ? 'Oui'
                : 'Non',
          positionsSearched: questionnaireData.positionsSearched.filter((item) => item.trim()).join(' | '),
          motivation:
            questionnaireData.motivations.join(' | ') +
            (questionnaireData.motivationOther ? ` | ${questionnaireData.motivationOther}` : ''),
          colorPalette: questionnaireData.colorPalette,
          siteStyle: questionnaireData.siteStyle,
          customRequestEnabled:
            questionnaireData.customRequestEnabled === null
              ? ''
              : questionnaireData.customRequestEnabled
                ? 'Oui'
                : 'Non',
          customRequest: questionnaireData.customRequest,
          clientQuestion: questionnaireData.clientQuestion,
          socialLinks: questionnaireData.socialLinks.filter((link) => link.name && link.url),
          cvLink: questionnaireData.cvLink,
          photoLink: questionnaireData.photoLink,
          extraLinks: [questionnaireData.extraLink].filter(Boolean),
          cvUpload: questionnaireData.cvFile ?? null,
          photoUpload: questionnaireData.photoFile ?? null,
          extraUploads: questionnaireData.extraFiles ?? [],
          authorization: questionnaireData.authorization ? 'Oui' : 'Non',
        }),
      })

      const questionnaireResult = await readJson(questionnaireRes)
      if (!questionnaireRes.ok || !questionnaireResult.success || !questionnaireResult.orderId) {
        throw new Error(questionnaireResult.error || 'Le questionnaire n’a pas pu être enregistré dans Google Sheets.')
      }

      const stableOrderId = questionnaireResult.orderId
      setOrderId(stableOrderId)

      const warnings: string[] = [...(questionnaireResult.warnings ?? [])]

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: stableOrderId,
          firstName: questionnaireData.firstName,
          lastName: questionnaireData.lastName,
          email: questionnaireData.email,
          password: questionnaireData.password,
          profession: questionnaireData.profession,
          positionsSearched: questionnaireData.positionsSearched.filter((item) => item.trim()).join(' | '),
          colorPalette: questionnaireData.colorPalette,
          siteStyle: questionnaireData.siteStyle,
          amount: price.amount,
          currency: price.currency,
          skipAppointment: Boolean(skipAppointment),
        }),
      })

      const orderResult = await readJson(orderRes)
      if (!orderRes.ok || !orderResult.success) {
        throw new Error(orderResult.error || 'La commande n’a pas pu être créée.')
      }

      warnings.push(...(orderResult.warnings ?? []))

      const finalOrderId = orderResult.orderId || stableOrderId
      if (finalOrderId) {
        setOrderId(finalOrderId)
      }

      if (orderResult.token) {
        window.localStorage.setItem('mdc-client-token', orderResult.token)
      }

      if (appointment) {
        const appointmentRes = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: questionnaireData.firstName,
            lastName: questionnaireData.lastName,
            email: questionnaireData.email,
            startAt: appointment.startAt,
            durationMinutes: appointment.durationMinutes,
            orderId: finalOrderId,
          }),
        })

        const appointmentResult = await readJson(appointmentRes)
        if (!appointmentRes.ok || !appointmentResult.success) {
          throw new Error(
            appointmentResult.error ||
            'Le rendez-vous n’a pas pu être réservé dans Google Calendar.'
          )
        }

        warnings.push(...(appointmentResult.warnings ?? []))
      }

      const folderRes = await fetch('/api/client-downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: questionnaireData.firstName,
          lastName: questionnaireData.lastName,
          email: questionnaireData.email,
          password: questionnaireData.password,
          orderId: finalOrderId,
          appointment: appointment || null,
        }),
      })

      if (folderRes.ok) {
        const folderResult = await readJson(folderRes)
        setClientFolderName(
          folderResult.folderName ??
          buildClientFolderName(questionnaireData.lastName, questionnaireData.firstName)
        )
      } else {
        warnings.push('Le dossier client local n’a pas pu être préparé automatiquement.')
      }

      setSubmitWarnings(warnings)
      setOrderSent(true)

      window.setTimeout(() => {
        window.location.href = '/mon-site'
      }, 1200)
    } catch (error) {
      console.error('[Payment] Erreur envoi commande:', error)
      setSubmitError(error instanceof Error ? error.message : 'Une erreur est survenue pendant la commande.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/60 shadow-glass backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/60 via-transparent to-transparent" />

      <div className="relative p-8 space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950">
            <Lock size={17} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">{tp.title}</h3>
            <p className="mt-0.5 text-sm text-neutral-500">{tp.subtitle}</p>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{t.cart.product}</span>
            <span className="font-medium">{price.inline}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-900">{tp.total}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-neutral-950">{price.amount}</span>
              <span className="text-neutral-500">{price.currency}</span>
            </div>
          </div>
        </div>

        {skipAppointment && !appointment ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-200/60 bg-blue-50 p-4">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
            <div className="text-xs leading-relaxed text-blue-700">
              <p className="font-medium">Rendez-vous reporté</p>
              <p>Vous pourrez réserver votre créneau Google Meet depuis votre espace client après la commande.</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="rounded-[1.75rem] border border-neutral-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.28)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Cadre juridique
                </p>
                <h4 className="text-base font-semibold text-neutral-950">
                  Validations obligatoires avant paiement
                </h4>
                <p className="text-sm leading-relaxed text-neutral-500">
                  Ces confirmations sont requises avant de lancer la prestation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLegalModalOpen(true)}
                className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950"
              >
                Consulter les CGV
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <ConsentCheckbox
                checked={legalConsents.cgvAccepted}
                onChange={() => toggleConsent('cgvAccepted')}
                label="Je reconnais avoir pris connaissance et accepter sans réserve les Conditions Générales de Vente."
                error={legalErrors.cgvAccepted}
              />
              <ConsentCheckbox
                checked={legalConsents.immediateStartAccepted}
                onChange={() => toggleConsent('immediateStartAccepted')}
                label="Je demande expressément le commencement immédiat de la prestation avant la fin du délai légal de rétractation de 14 jours. Je reconnais qu'en cas de rétractation après le début d'exécution, je devrai payer la part de service déjà réalisée. Je reconnais également qu'une fois la prestation pleinement exécutée et livrée, je perdrai mon droit de rétractation."
                error={legalErrors.immediateStartAccepted}
              />
              <ConsentCheckbox
                checked={legalConsents.rightsConfirmed}
                onChange={() => toggleConsent('rightsConfirmed')}
                label="Je confirme disposer des droits nécessaires sur les contenus, textes, images, documents et éléments transmis à My Digital Career dans le cadre de la prestation."
                error={legalErrors.rightsConfirmed}
              />
            </div>
          </div>

          <button
            onClick={handleDemoOrder}
            disabled={!canSubmit}
            className="relative w-full cursor-pointer overflow-hidden rounded-2xl transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0"
          >
            <div className={`absolute inset-0 ${canSubmit ? 'bg-gradient-to-br from-neutral-950 to-neutral-800' : 'bg-gradient-to-br from-neutral-400 to-neutral-300'}`} />
            <div className="relative flex items-center justify-center gap-3 px-6 py-4">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                Demo
              </span>
              <span className="text-sm font-semibold text-white">
                {submitting ? 'Validation en cours...' : tp.cta}
              </span>
            </div>
          </button>

          {submitError ? (
            <div className="rounded-xl border border-red-200/70 bg-red-50 px-4 py-4 text-xs leading-relaxed text-red-700">
              <p className="font-semibold">Commande interrompue</p>
              <p className="mt-1">{submitError}</p>
            </div>
          ) : null}

          {submitWarnings.length > 0 ? (
            <div className="rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-4 text-xs leading-relaxed text-amber-700">
              <p className="font-semibold">Points à vérifier</p>
              <div className="mt-2 space-y-1">
                {submitWarnings.map((warning) => (
                  <p key={warning}>- {warning}</p>
                ))}
              </div>
            </div>
          ) : null}

          {orderSent ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50 p-4">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
              <div className="space-y-1 text-xs leading-relaxed text-emerald-700">
                <p className="font-medium">Commande confirmée{orderId ? ` — N° ${orderId}` : ''}</p>
                <p>Vos informations ont bien été enregistrées. Redirection vers Mon site…</p>
                {clientFolderName ? (
                  <p>Dossier créé : <span className="font-medium">{clientFolderName}</span></p>
                ) : null}
                {appointment ? (
                  <p>Rendez-vous : <span className="font-medium">{appointment.dateLabel} · {appointment.timeLabel}</span></p>
                ) : null}
                {skipAppointment && !appointment ? (
                  <p>Rendez-vous : <span className="font-medium">À planifier depuis l'espace client</span></p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/60 bg-amber-50 p-4">
            <Info size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <div className="space-y-1 text-xs leading-relaxed text-amber-700">
              <p>{tp.paypalMessage}</p>
              <p className="font-medium">{tp.paypalNote}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          <p className="text-xs text-neutral-400">{tp.secure}</p>
        </div>
      </div>

      <Modal open={legalModalOpen} onClose={() => setLegalModalOpen(false)} title="CGV" size="xl">
        <LegalDocumentContent
          note="Remplacez ce placeholder par vos conditions générales de vente complètes."
          placeholder={LEGAL_PLACEHOLDERS.cgv}
          type="cgv"
        />
      </Modal>
    </motion.div>
  )
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
  error,
}: {
  checked: boolean
  onChange: () => void
  label: string
  error?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[1.35rem] border bg-neutral-50/80 p-4 transition',
        error ? 'border-red-200 bg-red-50/60' : 'border-neutral-200'
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950/20"
        />
        <span className="text-sm leading-relaxed text-neutral-700">{label}</span>
      </label>
      {error ? <p className="mt-2 pl-7 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  )
}
