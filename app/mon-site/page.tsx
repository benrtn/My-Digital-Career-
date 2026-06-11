'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays, CheckCircle2, Clock3, Download, ExternalLink, Lock, LogOut,
  Mail, MessageCircle, Monitor, Smartphone, Tablet, User, Video, X,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ClientChatPanel } from '@/components/chat/ClientChatPanel'
import { AppointmentScheduler } from '@/components/cart/AppointmentScheduler'
import { trackEvent } from '@/lib/analytics'
import { checkChatEligibility, trackClientEvent } from '@/lib/googleSheets'
import { isValidEmail, cn } from '@/lib/utils'
import type { AppointmentSelection, ClientSiteAccess } from '@/types'

const PORTAL_POLL_INTERVAL = 30_000

interface PortalAppointment {
  id: string
  startAt: string
  endAt: string
  durationMinutes: number
  meetLink?: string
}

interface PortalDownloads {
  folderName: string
  unlockAt: string | null
  remainingMs: number
  zipUrl: string | null
  previewUrl: string | null
  previewImageUrl: string | null
  hasZip: boolean
  hasPreview: boolean
  readyAt: boolean
}

interface PortalOrder {
  orderId: string
  date: string
  status: string
  paid: boolean
  hosting: boolean
  amount: string
  siteUrl: string
  firstVersionSent: boolean
  meetTime: string
  meetLink: string
}

interface PortalState {
  name: string
  email: string
  order: PortalOrder | null
  appointment: PortalAppointment | null
  downloads: PortalDownloads | null
}

type ReviewMode = 'idle' | 'chat' | 'approved'

const STATUS_STEPS = [
  'Commande reçue',
  'Création en cours',
  'Première version',
  'Ajustements',
  'Validation & téléchargement',
]

function statusToStep(order: PortalOrder | null): number {
  if (!order) return 0
  const status = order.status.trim().toLowerCase()
  if (order.paid || status === 'payé' || status === 'livré') return 4
  if (status === 'validé') return 4
  if (status === 'révision' || status === 'revision') return 3
  if (status === 'première version' || order.firstVersionSent) return 2
  if (status === 'en cours') return 1
  return 0 // En attente
}

export default function MonSitePage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [account, setAccount] = useState<ClientSiteAccess | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [portal, setPortal] = useState<PortalState | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [reviewMode, setReviewMode] = useState<ReviewMode>('idle')
  const [approving, setApproving] = useState(false)
  const [chatEligible, setChatEligible] = useState(false)
  const [chatClientName, setChatClientName] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  // Booking from the client area (visio skipped during checkout)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSelection, setBookingSelection] = useState<AppointmentSelection | null>(null)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')

  const closePreview = useCallback(() => setPreviewOpen(false), [])

  // ── Session restore ──
  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      try {
        const response = await fetch('/api/client-auth', { cache: 'no-store' })
        const result = await response.json() as {
          authenticated?: boolean
          account?: ClientSiteAccess
        }

        if (cancelled) return
        if (result.authenticated && result.account) {
          setAccount(result.account)
          setEmail(result.account.email)
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    void restoreSession()
    return () => { cancelled = true }
  }, [])

  // ── Portal data (Sheets-driven, polled) ──
  const loadPortal = useCallback(async () => {
    try {
      const response = await fetch('/api/client-portal', { cache: 'no-store' })
      if (response.status === 401) {
        setAccount(null)
        return
      }
      const result = await response.json() as { success?: boolean; portal?: PortalState }
      if (response.ok && result.success && result.portal) {
        setPortal(result.portal)
      }
    } catch { /* keep previous state */ }
  }, [])

  useEffect(() => {
    if (!account) {
      setPortal(null)
      setReviewMode('idle')
      setChatEligible(false)
      setBookingOpen(false)
      return
    }

    setPortalLoading(true)
    loadPortal().finally(() => setPortalLoading(false))
    const interval = window.setInterval(loadPortal, PORTAL_POLL_INTERVAL)
    return () => window.clearInterval(interval)
  }, [account, loadPortal])

  // ── Chat eligibility ──
  useEffect(() => {
    if (!account) return
    let cancelled = false

    checkChatEligibility(account.email)
      .then((result) => {
        if (cancelled) return
        setChatEligible(Boolean(result.eligible))
        setChatClientName(result.clientName || account.name)
      })
      .catch(() => {
        if (cancelled) return
        setChatEligible(false)
        setChatClientName(account.name)
      })

    return () => { cancelled = true }
  }, [account])

  // ── Preview modal: escape + scroll lock ──
  useEffect(() => {
    if (!previewOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePreview() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [previewOpen, closePreview])

  // ── Derived state ──
  const order = portal?.order ?? null
  const downloads = portal?.downloads ?? null
  const appointment = portal?.appointment ?? null
  const currentStep = statusToStep(order)
  const approved = order ? ['validé', 'payé', 'livré'].includes(order.status.trim().toLowerCase()) || order.paid : false
  const paid = Boolean(order?.paid)

  const previewUrl = order?.siteUrl || downloads?.previewUrl || ''
  const previewReady = Boolean(previewUrl) && (Boolean(order?.firstVersionSent) || Boolean(order?.siteUrl) || Boolean(downloads?.readyAt && downloads?.hasPreview))
  const previewImage = downloads?.previewImageUrl || ''
  const downloadUrl = downloads?.zipUrl || ''
  const canDownload = paid && Boolean(downloadUrl)
  const canApprove = previewReady && !approved
  const canOpenChat = chatEligible && previewReady

  // ── Handlers ──
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError(t.mySite.errors.email)
      return
    }

    const run = async () => {
      setSubmitting(true)
      try {
        const response = await fetch('/api/client-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const result = await response.json() as { success?: boolean; account?: ClientSiteAccess }
        if (!response.ok || !result.success || !result.account) {
          setError(t.mySite.errors.invalid)
          return
        }

        setAccount(result.account)
        setPassword('')
        trackEvent('client_login', { method: 'password' })
      } catch {
        setError(t.mySite.errors.invalid)
      } finally {
        setSubmitting(false)
      }
    }

    void run()
  }

  function handleLogout() {
    void fetch('/api/client-auth', { method: 'DELETE' })
    setAccount(null)
    setEmail('')
    setPassword('')
    setError('')
  }

  async function handleApprove() {
    if (!account || !canApprove || approving) return
    setApproving(true)

    try {
      await fetch('/api/client-approval', { method: 'POST' })
      trackEvent('client_site_approved', { client_id: account.id })
      void trackClientEvent({
        email: account.email,
        clientName: account.name,
        orderId: order?.orderId,
        event: 'site_approved',
      })
      setReviewMode('approved')
      await loadPortal()
    } finally {
      setApproving(false)
    }
  }

  async function handleBookAppointment() {
    if (!account || !bookingSelection || bookingSubmitting) return
    setBookingSubmitting(true)
    setBookingError('')

    const nameParts = account.name.trim().split(/\s+/)
    const firstName = nameParts[0] ?? account.name
    const lastName = nameParts.slice(1).join(' ') || firstName

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: account.email,
          startAt: bookingSelection.startAt,
          durationMinutes: bookingSelection.durationMinutes,
          orderId: order?.orderId || '',
        }),
      })

      const result = await response.json() as { success?: boolean; error?: string }
      if (!response.ok || !result.success) {
        setBookingError(result.error || 'La réservation a échoué. Réessayez ou contactez-nous.')
        return
      }

      setBookingOpen(false)
      setBookingSelection(null)
      await loadPortal()
    } catch {
      setBookingError('La réservation a échoué. Réessayez ou contactez-nous.')
    } finally {
      setBookingSubmitting(false)
    }
  }

  function markPreviewViewed() {
    if (!account || !previewReady) return
    trackEvent('client_preview_open', { client_id: account.id })
    void trackClientEvent({
      email: account.email,
      clientName: account.name,
      orderId: order?.orderId,
      event: 'preview_viewed',
    })
  }

  function triggerDownload() {
    if (!canDownload || !downloadUrl) return
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = downloadUrl.split('/').pop() || 'e-cv.zip'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <section className="min-h-screen pt-28 md:pt-32 pb-20 bg-neutral-950 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,170,94,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_24%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative">
        {!account ? (
          <>
            <div className="text-center space-y-5 mb-10">
              <div className="flex justify-center">
                <Badge>{t.mySite.badge}</Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.03em] leading-[1.1] text-white">
                {t.mySite.title.split('\n').map((line, index) => (
                  <span key={index} className={index === 1 ? 'block font-semibold' : 'block'}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className="text-white/60 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
                {t.mySite.subtitle}
              </p>
            </div>

            {hydrated ? (
              <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-neutral-950/90 backdrop-blur-2xl shadow-[0_40px_120px_-60px_rgba(0,0,0,0.9)] p-6 sm:p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <p className="text-sm text-white/55 text-center">{t.mySite.helper}</p>

                  <div className="space-y-2">
                    <label htmlFor="client-email" className="text-sm font-medium text-white">{t.mySite.form.email}</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-white/30 transition-colors">
                      <Mail size={18} className="text-white/35 shrink-0" />
                      <input
                        id="client-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={t.mySite.form.emailPlaceholder}
                        className="w-full bg-transparent outline-none text-white placeholder:text-white/30 min-h-[24px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="client-password" className="text-sm font-medium text-white">{t.mySite.form.password}</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-white/30 transition-colors">
                      <Lock size={18} className="text-white/35 shrink-0" />
                      <input
                        id="client-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={t.mySite.form.passwordPlaceholder}
                        className="w-full bg-transparent outline-none text-white placeholder:text-white/30 min-h-[24px]"
                      />
                    </div>
                  </div>

                  {error ? <p className="text-sm text-red-300">{error}</p> : null}

                  <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? t.common.loading : t.mySite.form.submit}
                  </Button>
                </form>
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <Badge variant="success">{t.mySite.connected}</Badge>
                <h1 className="text-xl sm:text-2xl font-semibold text-white truncate">
                  {t.mySite.welcome} {account.name}
                </h1>
                <p className="text-xs sm:text-sm text-white/50 truncate">
                  {account.email}
                  {order?.orderId ? ` · Commande ${order.orderId}` : ''}
                </p>
              </div>
              <Button variant="secondary" icon={<LogOut size={16} />} onClick={handleLogout} className="shrink-0 self-start sm:self-auto">
                {t.mySite.logout}
              </Button>
            </div>

            {/* Order timeline */}
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-white">Suivi de votre commande</h2>
                {order ? (
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                    {order.status || 'En attente'}
                  </span>
                ) : null}
              </div>

              {portalLoading && !portal ? (
                <p className="text-sm text-white/50">{t.common.loading}</p>
              ) : order ? (
                <ol className="space-y-0">
                  {STATUS_STEPS.map((label, index) => {
                    const done = index < currentStep
                    const active = index === currentStep
                    return (
                      <li key={label} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors',
                              done
                                ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                                : active
                                  ? 'border-amber-300/50 bg-amber-300/15 text-amber-200'
                                  : 'border-white/10 bg-white/[0.03] text-white/35'
                            )}
                          >
                            {done ? <CheckCircle2 size={14} /> : index + 1}
                          </div>
                          {index < STATUS_STEPS.length - 1 ? (
                            <div className={cn('w-px flex-1 min-h-[18px]', done ? 'bg-emerald-400/30' : 'bg-white/10')} />
                          ) : null}
                        </div>
                        <div className="pb-4">
                          <p className={cn('text-sm font-medium leading-7', done ? 'text-emerald-200' : active ? 'text-white' : 'text-white/40')}>
                            {label}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="text-sm leading-relaxed text-white/55">
                  Aucune commande trouvée pour ce compte pour le moment. Si vous venez de commander,
                  patientez quelques instants puis actualisez la page.
                </p>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
              {/* Preview */}
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 sm:p-8 space-y-5">
                <div className="space-y-2">
                  <Badge>{t.mySite.preview.badge}</Badge>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white">
                    {previewReady ? t.mySite.preview.title : 'Votre E-CV est en création'}
                  </h3>
                  <p className="text-sm text-white/55 leading-relaxed">
                    {previewReady
                      ? t.mySite.preview.subtitle
                      : 'Notre équipe prépare votre première version. Elle apparaîtra ici sous 24 h après votre commande.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (previewReady) {
                      markPreviewViewed()
                      setPreviewOpen(true)
                    }
                  }}
                  disabled={!previewReady}
                  className="group relative w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/40 cursor-pointer disabled:cursor-not-allowed aspect-[16/10]"
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={`Aperçu du E-CV de ${account.name}`}
                      className={cn('absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500', previewReady ? 'group-hover:scale-[1.02]' : 'grayscale opacity-50')}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,170,94,0.12),transparent_55%)]" />
                  )}
                  <div className={cn('absolute inset-0 flex items-center justify-center transition-colors duration-300', previewReady ? 'bg-neutral-950/0 group-hover:bg-neutral-950/40' : 'bg-neutral-950/45')}>
                    {previewReady ? (
                      <span className="rounded-2xl bg-white/95 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Naviguer sur mon E-CV
                      </span>
                    ) : (
                      <div className="rounded-[1.5rem] border border-white/10 bg-neutral-950/90 px-6 py-5 text-center shadow-2xl max-w-[260px]">
                        <div className="flex items-center justify-center gap-2 text-white font-semibold">
                          <Clock3 size={16} />
                          Livraison sous 24 h
                        </div>
                        <p className="text-xs text-white/55 mt-2">
                          Vous recevrez un email dès que votre première version sera disponible ici.
                        </p>
                      </div>
                    )}
                  </div>
                </button>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={previewReady ? previewUrl : undefined}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => {
                      if (!previewReady || !previewUrl) event.preventDefault()
                      else markPreviewViewed()
                    }}
                  >
                    <Button size="lg" iconRight={<ExternalLink size={18} />} disabled={!previewReady}>
                      {t.mySite.preview.open}
                    </Button>
                  </a>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Appointment */}
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <CalendarDays size={16} className="text-amber-300" />
                    <span>Visio de 30 minutes</span>
                  </div>

                  {appointment ? (
                    <div className="space-y-2 text-sm text-white/70">
                      <p>{formatAppointmentDate(appointment.startAt)}</p>
                      <p>{formatAppointmentTime(appointment.startAt, appointment.endAt)}</p>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
                        <Video size={13} />
                        Google Meet · {appointment.durationMinutes} min
                      </div>
                      {appointment.meetLink ? (
                        <a
                          href={appointment.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-amber-200 underline underline-offset-2 hover:text-amber-100 break-all"
                        >
                          Rejoindre le Google Meet
                        </a>
                      ) : null}
                      <p className="text-white/45 text-xs leading-relaxed">
                        Pendant ce rendez-vous, vous précisez votre besoin à l'oral et nous améliorons votre E-CV ensemble.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-white/55 leading-relaxed">
                        Offerte et optionnelle : réservez un échange Google Meet pour préciser vos attentes.
                      </p>
                      <Button
                        size="md"
                        variant="secondary"
                        icon={<Video size={15} />}
                        onClick={() => setBookingOpen((open) => !open)}
                      >
                        {bookingOpen ? 'Masquer les créneaux' : 'Réserver ma visio'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Review / approval */}
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold text-white">{t.mySite.review.title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{t.mySite.review.subtitle}</p>
                  </div>

                  {!approved ? (
                    <div className="flex flex-col gap-3">
                      <Button type="button" size="lg" onClick={handleApprove} disabled={!canApprove || approving}>
                        {approving ? t.common.loading : t.mySite.review.approve}
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        variant="secondary"
                        icon={<MessageCircle size={16} />}
                        onClick={() => setReviewMode(reviewMode === 'chat' ? 'idle' : 'chat')}
                        disabled={!canOpenChat}
                      >
                        {t.mySite.review.requestChanges}
                      </Button>
                      {!previewReady ? (
                        <p className="text-xs text-white/45 leading-relaxed">
                          Ces actions seront disponibles dès que votre première version sera livrée.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-4 text-sm text-emerald-200 space-y-2">
                      <div className="flex items-center gap-2 font-medium">
                        <CheckCircle2 size={16} />
                        {t.mySite.review.approved}
                      </div>
                      <p className="leading-relaxed">
                        {paid ? t.mySite.review.approvedPaid : t.mySite.review.approvedSub}
                      </p>
                    </div>
                  )}
                </div>

                {/* Download */}
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Download size={16} className="text-amber-300" />
                    <span>Téléchargement</span>
                  </div>

                  {canDownload ? (
                    <Button size="lg" icon={<Download size={16} />} onClick={triggerDownload}>
                      Télécharger mon E-CV
                    </Button>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/55 leading-relaxed space-y-1.5">
                      <p className="flex items-center gap-2 font-medium text-white/75">
                        <Lock size={14} />
                        {paid ? 'Fichier en préparation' : 'Débloqué après paiement'}
                      </p>
                      <p>
                        {paid
                          ? 'Votre paiement est confirmé. Le fichier de votre E-CV apparaîtra ici très prochainement.'
                          : `Le téléchargement de votre E-CV (20 €${order?.hosting ? ' + 5 € hébergement' : ''}) se débloque ici une fois votre E-CV validé et le paiement confirmé.`}
                      </p>
                    </div>
                  )}

                  {order?.hosting ? (
                    <p className="text-xs text-amber-200/80">
                      Option hébergement en ligne incluse : votre lien permanent vous sera transmis après le paiement.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Inline booking */}
            <AnimatePresence>
              {bookingOpen && !appointment ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <AppointmentScheduler value={bookingSelection} onChange={setBookingSelection} />
                  {bookingError ? (
                    <p className="rounded-2xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                      {bookingError}
                    </p>
                  ) : null}
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={handleBookAppointment}
                      disabled={!bookingSelection || bookingSubmitting}
                    >
                      {bookingSubmitting ? t.common.loading : 'Confirmer ce créneau'}
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Chat */}
            {reviewMode === 'chat' && canOpenChat ? (
              <ClientChatPanel
                clientEmail={account.email}
                clientName={chatClientName || account.name}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* ── Preview popup ── */}
      <AnimatePresence>
        {previewOpen && account ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex flex-col bg-neutral-950/80 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between px-4 md:px-6 h-14 bg-neutral-950/90 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <span className="text-neutral-950 text-[9px] font-bold">MD</span>
                </div>
                <span className="text-white text-sm font-medium hidden sm:block truncate">
                  E-CV de {account.name}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                {([
                  ['desktop', Monitor],
                  ['tablet', Tablet],
                  ['mobile', Smartphone],
                ] as const).map(([device, Icon]) => (
                  <button
                    key={device}
                    type="button"
                    aria-label={device}
                    onClick={() => setPreviewDevice(device)}
                    className={cn('p-2 rounded-lg transition-colors', previewDevice === device ? 'bg-white text-neutral-950' : 'text-white/60 hover:text-white')}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Ouvrir dans un nouvel onglet"
                  className="text-white/60 hover:text-white transition-colors p-2"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  aria-label={t.common.close}
                  onClick={closePreview}
                  className="text-white/60 hover:text-white transition-colors p-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-start justify-center overflow-hidden p-2 sm:p-4">
              <motion.div
                layout
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="bg-white rounded-2xl overflow-hidden shadow-2xl h-full"
                style={{
                  width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px',
                  maxWidth: '100%',
                }}
              >
                <iframe
                  src={previewUrl}
                  title={`E-CV de ${account.name}`}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}

function formatAppointmentDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  })
}

function formatAppointmentTime(startAt: string, endAt: string) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  return `${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} - ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`
}
