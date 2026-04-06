'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Info, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Modal } from '@/components/ui/Modal'
import { getLocalizedPrice } from '@/config/site'
import { buildClientFolderName } from '@/lib/clientDownloads'
import {
  submitOrder,
  registerClient,
  submitQuestionnaire,
  sendAccountCreationEmail,
  sendOrderConfirmationEmail,
  sendAppointmentConfirmationEmail,
} from '@/lib/googleSheets'
import { LegalDocumentContent } from '@/components/legal/LegalDocumentContent'
import { LEGAL_PLACEHOLDERS } from '@/components/legal/legalContent'
import { cn } from '@/lib/utils'
import type { AppointmentSelection, QuestionnaireData } from '@/types'

/**
 * PaymentBlock — premium placeholder for future PayPal integration.
 *
 * HOW TO INTEGRATE PAYPAL:
 * 1. Create a PayPal developer account at developer.paypal.com
 * 2. Get your client-id from the Developer Dashboard
 * 3. Install the PayPal JS SDK: npm install @paypal/react-paypal-js
 * 4. Replace the placeholder button below with:
 *    <PayPalButtons createOrder={...} onApprove={...} />
 * 5. Wrap your app (or this component) with <PayPalScriptProvider options={...}>
 *
 * See: https://developer.paypal.com/sdk/js/reference/
 */
interface PaymentBlockProps {
  questionnaireData?: QuestionnaireData | null
  appointment?: AppointmentSelection | null
}

export function PaymentBlock({ questionnaireData, appointment }: PaymentBlockProps) {
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

  // Crée la commande + enregistre le client
  // À connecter au callback onApprove de PayPal une fois intégré
  const handleDemoOrder = async () => {
    if (!questionnaireData || !appointment || orderSent || submitting) return
    if (!validateLegalConsents()) return

    setSubmitting(true)
    try {
      const fullName = `${questionnaireData.firstName} ${questionnaireData.lastName}`.trim()
      const createdAt = new Date().toISOString()

      // 1. Créer la commande
      const result = await submitOrder({
        firstName: questionnaireData.firstName,
        lastName: questionnaireData.lastName,
        email: questionnaireData.email,
        colorPalette: questionnaireData.colorPalette,
        siteStyle: questionnaireData.siteStyle,
        profession: questionnaireData.profession,
        positionsSearched: questionnaireData.positionsSearched.filter((p) => p.trim()),
        amount: price.amount,
        currency: price.currency,
      })
      const createdOrderId = result.data?.orderId as string | undefined
      if (createdOrderId) {
        setOrderId(createdOrderId)
      }

      // 2. Enregistrer le client
      await registerClient({
        orderId: createdOrderId,
        firstName: questionnaireData.firstName,
        lastName: questionnaireData.lastName,
        name: fullName,
        email: questionnaireData.email,
        password: questionnaireData.password,
        date: createdAt,
      })

      // 3. Email de bienvenue (compte créé)
      sendAccountCreationEmail({
        email: questionnaireData.email,
        name: fullName,
        firstName: questionnaireData.firstName,
        password: questionnaireData.password,
      }).catch((err) => console.warn('[Payment] Email bienvenue échoué:', err))

      // 4. Email de confirmation de commande
      sendOrderConfirmationEmail({
        email: questionnaireData.email,
        name: fullName,
        firstName: questionnaireData.firstName,
        orderId: createdOrderId,
        amount: price.amount,
        currency: price.currency,
        colorPalette: questionnaireData.colorPalette,
        siteStyle: questionnaireData.siteStyle,
      }).catch((err) => console.warn('[Payment] Email confirmation échoué:', err))

      // 5. Envoyer le questionnaire
      const questionnaireResult = await submitQuestionnaire(questionnaireData, {
        orderId: createdOrderId,
      })
      if (!questionnaireResult.success) {
        throw new Error(questionnaireResult.error || 'Questionnaire upload failed')
      }

      // 6. Réserver le rendez-vous
      const appointmentResponse = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: questionnaireData.firstName,
          lastName: questionnaireData.lastName,
          email: questionnaireData.email,
          startAt: appointment.startAt,
          durationMinutes: appointment.durationMinutes,
          orderId: createdOrderId,
        }),
      })

      if (appointmentResponse.ok) {
        const appointmentResult = await appointmentResponse.json() as { meetLink?: string }

        // 7. Email de confirmation de rendez-vous
        sendAppointmentConfirmationEmail({
          email: questionnaireData.email,
          name: fullName,
          firstName: questionnaireData.firstName,
          dateLabel: appointment.dateLabel,
          timeLabel: appointment.timeLabel,
          meetLink: appointmentResult.meetLink,
          durationMinutes: appointment.durationMinutes,
        }).catch((err) => console.warn('[Payment] Email RDV échoué:', err))
      }

      // 8. Créer le dossier client
      const folderResponse = await fetch('/api/client-downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: questionnaireData.firstName,
          lastName: questionnaireData.lastName,
          email: questionnaireData.email,
          password: questionnaireData.password,
          orderId: createdOrderId,
          appointment,
        }),
      })

      if (!folderResponse.ok) {
        throw new Error('Client folder creation failed')
      }

      const folderResult = await folderResponse.json() as { folderName?: string }
      setClientFolderName(
        folderResult.folderName ??
        buildClientFolderName(questionnaireData.lastName, questionnaireData.firstName)
      )

      setOrderSent(true)
      window.setTimeout(() => {
        window.location.href = '/mon-site'
      }, 1200)
    } catch (err) {
      console.error('[Payment] Erreur envoi commande:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative bg-white/60 backdrop-blur-2xl border border-white/70 rounded-3xl shadow-glass overflow-hidden"
    >
      {/* Inner gradient */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none" />

      <div className="relative p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center shrink-0">
            <Lock size={17} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">{tp.title}</h3>
            <p className="text-sm text-neutral-500 mt-0.5">{tp.subtitle}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

        {/* Order summary */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-neutral-500">{t.cart.product}</span>
            <span className="font-medium">{price.inline}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-neutral-900">{tp.total}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-neutral-950">{price.amount}</span>
              <span className="text-neutral-500">{price.currency}</span>
            </div>
          </div>
        </div>

        {/* Demo validation */}
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
                label="Je demande expressément le commencement immédiat de la prestation avant la fin du délai légal de rétractation de 14 jours. Je reconnais qu’en cas de rétractation après le début d’exécution, je devrai payer la part de service déjà réalisée. Je reconnais également qu’une fois la prestation pleinement exécutée et livrée, je perdrai mon droit de rétractation."
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
            disabled={!appointment || submitting}
            className="relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <div className={`absolute inset-0 ${appointment && !submitting ? 'bg-gradient-to-br from-neutral-950 to-neutral-800' : 'bg-gradient-to-br from-neutral-400 to-neutral-300'}`} />
            <div className="relative flex items-center justify-center gap-3 py-4 px-6">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                Demo
              </span>
              <span className="text-white font-semibold text-sm">{submitting ? 'Validation en cours...' : tp.cta}</span>
            </div>
          </button>

          {/* Confirmation après envoi */}
          {orderSent && (
            <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-700 leading-relaxed space-y-1">
                <p className="font-medium">Commande confirmée{orderId ? ` — N° ${orderId}` : ''}</p>
                <p>Vos informations ont bien été enregistrées. Redirection vers Mon site…</p>
                {clientFolderName ? (
                  <p>Dossier créé : <span className="font-medium">{clientFolderName}</span></p>
                ) : null}
                {appointment ? (
                  <p>Rendez-vous : <span className="font-medium">{appointment.dateLabel} · {appointment.timeLabel}</span></p>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200/60 rounded-xl">
            <Info size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 leading-relaxed space-y-1">
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
    <div className={cn(
      'rounded-[1.35rem] border bg-neutral-50/80 p-4 transition',
      error ? 'border-red-200 bg-red-50/60' : 'border-neutral-200'
    )}>
      <label className="flex items-start gap-3 cursor-pointer">
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
