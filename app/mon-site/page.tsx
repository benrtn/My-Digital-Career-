'use client'

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, Download, ExternalLink, Lock, LogOut, Mail, Monitor, Smartphone, Tablet, Timer, User, Video, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ClientChatPanel } from '@/components/chat/ClientChatPanel'
import { trackEvent } from '@/lib/analytics'
// Chat eligibility is now simplified — if account exists, chat is available
// trackClientEvent is done via /api/chat or local only
import { checkChatEligibility, trackClientEvent } from '@/lib/googleSheets'
import { isValidEmail } from '@/lib/utils'
import type { AppointmentSelection, ClientSiteAccess } from '@/types'

const REVIEW_STORAGE_PREFIX = 'eworklife-mon-site-review-'
const PREVIEW_VIEWED_STORAGE_PREFIX = 'eworklife-mon-site-preview-viewed-'
const APPROVED_STORAGE_PREFIX = 'eworklife-mon-site-approved-'
const FOLDER_STATUS_POLL_INTERVAL = 30_000

type ReviewMode = 'idle' | 'chat' | 'approved'

interface ClientFolderStatus {
  found: boolean
  folderName: string | null
  createdAt: string | null
  unlockAt: string | null
  remainingMs: number
  zipUrl: string | null
  previewUrl: string | null
  previewImageUrl: string | null
  hasZip: boolean
  hasPreview: boolean
  readyAt: boolean
  orderId: string | null
  appointment: AppointmentSelection | null
}

export default function MonSitePage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [account, setAccount] = useState<ClientSiteAccess | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [reviewMode, setReviewMode] = useState<ReviewMode>('idle')
  const [chatEligible, setChatEligible] = useState(false)
  const [chatStatus, setChatStatus] = useState<'idle' | 'checking' | 'ready' | 'locked'>('idle')
  const [chatClientName, setChatClientName] = useState('')
  const [folderStatus, setFolderStatus] = useState<ClientFolderStatus | null>(null)
  const [folderLoading, setFolderLoading] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const closePreview = useCallback(() => setPreviewOpen(false), [])

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
      } catch {
        if (cancelled) return
      } finally {
        if (!cancelled) {
          setHydrated(true)
        }
      }
    }

    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!account) {
      setReviewMode('idle')
      setChatEligible(false)
      setChatStatus('idle')
      setChatClientName('')
      setFolderStatus(null)
      setFolderLoading(false)
      return
    }

    const raw = window.localStorage.getItem(`${REVIEW_STORAGE_PREFIX}${account.id}`)
    if (!raw) {
      setReviewMode('idle')
      return
    }

    try {
      const parsed = JSON.parse(raw) as { mode?: ReviewMode }
      setReviewMode(parsed.mode === 'approved' ? 'approved' : 'idle')
    } catch {
      setReviewMode('idle')
    }
  }, [account])

  useEffect(() => {
    if (!account) return

    let cancelled = false

    const run = async () => {
      setChatStatus('checking')
      try {
        const result = await checkChatEligibility(account.email)
        if (cancelled) return

        const eligible = Boolean(result.eligible)
        setChatEligible(eligible)
        setChatStatus(eligible ? 'ready' : 'locked')
        setChatClientName(result.clientName || account.name)

        if (!eligible && reviewMode === 'chat') {
          setReviewMode('idle')
        }
      } catch {
        if (cancelled) return
        setChatEligible(false)
        setChatStatus('locked')
        setChatClientName(account.name)
        if (reviewMode === 'chat') {
          setReviewMode('idle')
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [account, reviewMode])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!account) return

    let cancelled = false

    const loadFolderStatus = async () => {
      setFolderLoading(true)
      try {
        const response = await fetch(`/api/client-downloads?email=${encodeURIComponent(account.email)}`)
        const result = await response.json() as Partial<ClientFolderStatus> & { found?: boolean }

        if (cancelled) return

        if (result.found) {
          setFolderStatus({
            found: true,
            folderName: result.folderName ?? null,
            createdAt: result.createdAt ?? null,
            unlockAt: result.unlockAt ?? null,
            remainingMs: Number(result.remainingMs ?? 0),
            zipUrl: result.zipUrl ?? null,
            previewUrl: result.previewUrl ?? null,
            previewImageUrl: result.previewImageUrl ?? null,
            hasZip: Boolean(result.hasZip),
            hasPreview: Boolean(result.hasPreview),
            readyAt: Boolean(result.readyAt),
            orderId: result.orderId ?? null,
            appointment: result.appointment ?? null,
          })
        } else {
          setFolderStatus({
            found: false,
            folderName: null,
            createdAt: null,
            unlockAt: null,
            remainingMs: 0,
            zipUrl: null,
            previewUrl: null,
            previewImageUrl: null,
            hasZip: false,
            hasPreview: false,
            readyAt: true,
            orderId: null,
            appointment: null,
          })
        }
      } catch {
        if (cancelled) return
        setFolderStatus(null)
      } finally {
        if (!cancelled) setFolderLoading(false)
      }
    }

    loadFolderStatus()
    const interval = window.setInterval(loadFolderStatus, FOLDER_STATUS_POLL_INTERVAL)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [account])

  function persistReview(nextMode: ReviewMode) {
    if (!account) return

    window.localStorage.setItem(
      `${REVIEW_STORAGE_PREFIX}${account.id}`,
      JSON.stringify({ mode: nextMode })
    )
  }

  function triggerDownload(target: ClientSiteAccess) {
    const dynamicDownloadPath = folderStatus?.found ? folderStatus.zipUrl : null
    const link = document.createElement('a')
    link.href = dynamicDownloadPath || target.downloadPath
    link.download = dynamicDownloadPath
      ? getDownloadFileName(dynamicDownloadPath)
      : `${target.id}-site.zip`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function markPreviewViewed() {
    if (!account || !previewReady) return

    const storageKey = `${PREVIEW_VIEWED_STORAGE_PREFIX}${account.id}`
    if (window.localStorage.getItem(storageKey) === '1') return

    window.localStorage.setItem(storageKey, '1')
    trackEvent('client_preview_open', { client_id: account.id })
    void trackClientEvent({
      email: account.email,
      clientName: account.name,
      orderId: folderStatus?.orderId || undefined,
      event: 'preview_viewed',
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError(t.mySite.errors.email)
      return
    }

    const run = async () => {
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

  function handleRequestChanges() {
    if (!chatEligible || !isPreviewReady(folderStatus, account)) return
    setReviewMode('chat')
  }

  async function handleApprove() {
    if (!account || !isPreviewReady(folderStatus, account)) return

    const approvalStorageKey = `${APPROVED_STORAGE_PREFIX}${account.id}`
    if (window.localStorage.getItem(approvalStorageKey) !== '1') {
      window.localStorage.setItem(approvalStorageKey, '1')
      trackEvent('client_site_approved', { client_id: account.id })
      await trackClientEvent({
        email: account.email,
        clientName: account.name,
        orderId: folderStatus?.orderId || undefined,
        event: 'site_approved',
      })
    }

    setReviewMode('approved')
    persistReview('approved')
    triggerDownload(account)
  }

  const remainingMs = getRemainingMs(folderStatus, now)
  const previewReady = isPreviewReady(folderStatus, account)
  const previewUrl = getPreviewUrl(folderStatus, account)
  const previewImage = folderStatus?.previewImageUrl || account?.previewImagePath || '/creation/siteazzeddine.webp'
  const downloadReady = folderStatus?.found ? Boolean(folderStatus.zipUrl) : Boolean(account?.downloadPath)
  const canApprove = previewReady
  const canOpenChat = chatEligible && previewReady
  const countdown = formatCountdown(remainingMs)

  return (
    <section className="min-h-screen pt-32 pb-20 bg-neutral-950 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,170,94,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_24%)] pointer-events-none" />
      <div className="max-w-5xl mx-auto px-6 relative">
        <div className="text-center space-y-5 mb-12">
          <div className="flex justify-center">
            <Badge>{t.mySite.badge}</Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-[-0.03em] leading-[1.1] text-white">
            {t.mySite.title.split('\n').map((line, index) => (
              <span key={index} className={index === 1 ? 'block font-semibold' : 'block'}>
                {line}
              </span>
            ))}
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto leading-relaxed">
            {t.mySite.subtitle}
          </p>
        </div>

        {!hydrated ? null : account ? (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_40px_120px_-60px_rgba(0,0,0,0.85)] p-8 md:p-10 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <Badge variant="success">{t.mySite.connected}</Badge>
                  <h2 className="text-2xl font-semibold text-white">
                    {t.mySite.welcome} {account.name}
                  </h2>
                  <p className="text-sm text-white/55">{t.mySite.connectedSub}</p>
                </div>
                <Button variant="secondary" icon={<LogOut size={16} />} onClick={handleLogout}>
                  {t.mySite.logout}
                </Button>
              </div>

              <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr]">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 space-y-5">
                  <div className="space-y-2">
                    <Badge>{t.mySite.preview.badge}</Badge>
                    <h3 className="text-2xl font-semibold text-white">{t.mySite.preview.title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{t.mySite.preview.subtitle}</p>
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
                    className="group w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/40 relative cursor-pointer disabled:cursor-not-allowed"
                  >
                    <img
                      src={previewImage}
                      alt={`Aperçu du site de ${account.name}`}
                      className={`block h-auto w-full object-cover object-top transition-transform duration-500 ${previewReady ? 'group-hover:scale-[1.02]' : 'grayscale opacity-60'}`}
                    />
                    <div className={`absolute inset-0 transition-colors duration-300 flex items-center justify-center ${previewReady ? 'bg-neutral-950/0 group-hover:bg-neutral-950/40' : 'bg-neutral-950/45'}`}>
                      {previewReady ? (
                        <span className="rounded-2xl bg-white/95 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Naviguer sur mon site
                        </span>
                      ) : (
                        <div className="rounded-[1.5rem] border border-white/10 bg-neutral-950/92 px-6 py-5 text-center shadow-2xl">
                          <div className="flex items-center justify-center gap-2 text-white font-semibold text-lg">
                            <Timer size={16} />
                            {folderLoading ? 'Préparation en cours...' : countdown}
                          </div>
                          <p className="text-xs text-white/55 mt-3 max-w-[240px]">
                            {folderStatus?.found
                              ? 'Votre aperçu sera disponible ici dès que le délai sera écoulé et que le site sera ajouté à votre dossier.'
                              : 'Le dossier client vient d’être créé. Votre aperçu apparaîtra ici une fois le site ajouté et le délai écoulé.'}
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
                        if (previewReady && previewUrl) markPreviewViewed()
                      }}
                    >
                      <Button size="lg" iconRight={<ExternalLink size={18} />} disabled={!previewReady || !previewUrl}>
                        {t.mySite.preview.open}
                      </Button>
                    </a>
                    {reviewMode === 'approved' && downloadReady ? (
                      <Button
                        size="lg"
                        variant="secondary"
                        iconRight={<Download size={18} />}
                        onClick={() => triggerDownload(account)}
                      >
                        {t.mySite.review.downloadAgain}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 space-y-5">
                  <div className="flex items-center gap-3 text-white">
                    <User size={18} />
                    <span className="font-medium">{account.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/55 text-sm">
                    <Mail size={16} />
                    <span>{account.email}</span>
                  </div>
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                    {folderStatus?.found && folderStatus.folderName
                      ? `Dossier client : ${folderStatus.folderName}`
                      : chatStatus === 'ready'
                        ? t.mySite.review.chatReady
                        : t.mySite.review.chatPending}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">{t.mySite.review.title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{t.mySite.review.subtitle}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/70 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">Aperçu du site</span>
                      <span className={previewReady ? 'text-emerald-400 font-medium' : 'text-amber-300 font-medium'}>
                        {previewReady ? 'Disponible' : countdown}
                      </span>
                    </div>
                    <p>
                      {previewReady
                        ? 'Votre aperçu est disponible. Vous pouvez l’ouvrir, demander des modifications, puis valider votre E-CV.'
                        : 'Pendant 24 heures, l’aperçu reste verrouillé. Il sera automatiquement disponible ici dès que le site sera ajouté dans votre dossier client.'}
                    </p>
                    {folderStatus?.orderId ? (
                      <p className="text-xs text-white/45">Commande : {folderStatus.orderId}</p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/70 space-y-3">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <CalendarDays size={16} className="text-amber-300" />
                      <span>Rendez-vous Google Meet</span>
                    </div>
                    {folderStatus?.appointment ? (
                      <>
                        <p>{formatAppointmentDate(folderStatus.appointment.startAt)}</p>
                        <p>{formatAppointmentTime(folderStatus.appointment.startAt, folderStatus.appointment.endAt)}</p>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
                          <Video size={13} />
                          Google Meet · {folderStatus.appointment.durationMinutes} min
                        </div>
                        <p className="text-white/50">
                          Pendant ce rendez-vous, vous me précisez votre besoin à l’oral et nous améliorons votre E-CV ensemble.
                        </p>
                      </>
                    ) : (
                      <p className="text-white/50">
                        Votre rendez-vous apparaîtra ici dès qu’il sera confirmé pendant la commande.
                      </p>
                    )}
                  </div>

                  {reviewMode !== 'approved' ? (
                    <div className="flex flex-col gap-3">
                      <Button type="button" size="lg" onClick={handleApprove} disabled={!canApprove}>
                        {t.mySite.review.approve}
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        variant="secondary"
                        onClick={handleRequestChanges}
                        disabled={!canOpenChat}
                      >
                        {t.mySite.review.requestChanges}
                      </Button>
                    </div>
                  ) : null}

                  {reviewMode !== 'approved' && (!canOpenChat || chatStatus !== 'ready') ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/55 leading-relaxed">
                      {t.mySite.review.chatHint}
                    </div>
                  ) : null}

                  {reviewMode === 'approved' ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 space-y-2">
                      <div className="flex items-center gap-2 font-medium">
                        <CheckCircle2 size={16} />
                        {t.mySite.review.approved}
                      </div>
                      <p>{t.mySite.review.approvedSub}</p>
                    </div>
                  ) : null}
                </div>
              </div>
              </div>

            {reviewMode === 'chat' && canOpenChat ? (
              <ClientChatPanel
                clientEmail={account.email}
                clientName={chatClientName || account.name}
              />
            ) : null}
          </div>
        ) : (
          <div className="relative min-h-[420px]">
            <div className="max-w-2xl mx-auto rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-sm p-10 text-center opacity-70">
              <Badge>{t.mySite.badge}</Badge>
              <div className="mt-6 space-y-4">
                <h2 className="text-3xl font-semibold text-white">{t.mySite.title.replace('\n', ' ')}</h2>
                <p className="text-white/55">{t.mySite.subtitle}</p>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center px-4">
              <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-neutral-950/90 backdrop-blur-2xl shadow-[0_40px_120px_-60px_rgba(0,0,0,0.9)] p-8 md:p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2 text-center">
                    <Badge>{t.mySite.badge}</Badge>
                    <h2 className="text-2xl md:text-3xl font-semibold text-white">
                      {t.mySite.title.replace('\n', ' ')}
                    </h2>
                    <p className="text-sm text-white/55">{t.mySite.helper}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">{t.mySite.form.email}</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                      <Mail size={18} className="text-white/35 shrink-0" />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={t.mySite.form.emailPlaceholder}
                        className="w-full bg-transparent outline-none text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">{t.mySite.form.password}</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                      <Lock size={18} className="text-white/35 shrink-0" />
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={t.mySite.form.passwordPlaceholder}
                        className="w-full bg-transparent outline-none text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  {error ? <p className="text-sm text-red-300">{error}</p> : null}

                  <div className="flex justify-center pt-2">
                    <Button type="submit" size="lg">
                      {t.mySite.form.submit}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Popup preview iframe ── */}
      <AnimatePresence>
        {previewOpen && account ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex flex-col bg-neutral-950/80 backdrop-blur-sm"
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 md:px-6 h-14 bg-neutral-950/90 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-neutral-950 text-[9px] font-bold">MD</span>
                </div>
                <span className="text-white text-sm font-medium hidden sm:block">
                  Site de {account.name}
                </span>
              </div>

              {/* Device switcher */}
              <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 rounded-lg transition-colors ${previewDevice === 'desktop' ? 'bg-white text-neutral-950' : 'text-white/60 hover:text-white'}`}
                >
                  <Monitor size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-2 rounded-lg transition-colors ${previewDevice === 'tablet' ? 'bg-white text-neutral-950' : 'text-white/60 hover:text-white'}`}
                >
                  <Tablet size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 rounded-lg transition-colors ${previewDevice === 'mobile' ? 'bg-white text-neutral-950' : 'text-white/60 hover:text-white'}`}
                >
                  <Smartphone size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/60 hover:text-white transition-colors p-2"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  onClick={closePreview}
                  className="text-white/60 hover:text-white transition-colors p-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Iframe container */}
            <div className="flex-1 flex items-start justify-center overflow-hidden p-4">
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
                  title={`Site de ${account.name}`}
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

function getRemainingMs(folderStatus: ClientFolderStatus | null, now: number) {
  if (!folderStatus?.found || !folderStatus.unlockAt) return 0
  return Math.max(new Date(folderStatus.unlockAt).getTime() - now, 0)
}

function isPreviewReady(folderStatus: ClientFolderStatus | null, account: ClientSiteAccess | null) {
  if (!account) return false
  if (!folderStatus || !folderStatus.found) return Boolean(account.siteUrl)

  return (
    getRemainingMs(folderStatus, Date.now()) === 0 &&
    folderStatus.hasZip &&
    (Boolean(folderStatus.previewUrl) || Boolean(account.siteUrl))
  )
}

function getPreviewUrl(folderStatus: ClientFolderStatus | null, account: ClientSiteAccess | null) {
  if (!account) return ''
  return folderStatus?.previewUrl || account.siteUrl
}

function getDownloadFileName(url: string) {
  const value = url.split('/').pop()
  return value || 'e-cv.zip'
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

function formatCountdown(ms: number) {
  if (ms <= 0) return 'Disponible'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}
