'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock, LogOut, MessageCircle, Send, User, Mail,
  Loader2, ArrowLeft, RefreshCw, Search,
  Clock, CheckCircle2, Package, Users, ShoppingCart,
  ExternalLink, Globe, Paperclip, Calendar, TrendingUp,
  BarChart3, Eye, MousePointerClick, ArrowUpRight,
  FileText, Zap, Activity, Video, Download,
  ClipboardList, Briefcase, Palette, LinkIcon,
} from 'lucide-react'
import {
  getAdminConversations, getAdminOrders, getAdminClients,
  getAdminQuestionnaires,
  sendChatMessage, updateOrderStatus, sendFirstVersionEmail,
} from '@/lib/googleSheets'
import type { ChatConversation } from '@/types'
import { cn } from '@/lib/utils'

const ADMIN_SESSION_KEY = 'eworklife-admin-session'
const POLL_INTERVAL = 15_000

type AdminTab = 'dashboard' | 'orders' | 'clients' | 'questionnaires' | 'appointments' | 'messages'

interface AdminOrder {
  orderId: string
  date: string
  name: string
  firstName: string
  lastName: string
  email: string
  status: string
  amount: string
  currency: string
  profession: string
  positionsSearched: string
  chatEnabled: boolean
  firstVersionSent: boolean
  siteUrl: string
}

interface AdminClient {
  date: string
  name: string
  email: string
  siteUrl: string
  status: string
}

interface AdminQuestionnaire {
  date: string
  orderId: string
  lastName: string
  firstName: string
  email: string
  profession: string
  seekingJob: string
  positionsSearched: string
  motivations: string
  customRequest: string
  colorPalette: string
  siteStyle: string
  socialLinks: string
  cv: string
  photo: string
  extras: string
  authorization: string
  driveFolderName: string
  driveFolderUrl: string
  cvUrl: string
  photoUrl: string
  extraUrl: string
}

interface AdminFolderStatus {
  found: boolean
  folderName: string | null
  unlockAt: string | null
  remainingMs: number
  zipUrl: string | null
  previewUrl: string | null
  hasZip: boolean
  hasPreview: boolean
  readyAt: boolean
}

interface AppointmentRecord {
  id: string
  email: string
  firstName: string
  lastName: string
  startAt: string
  endAt: string
  durationMinutes: number
  mode: string
  meetLink?: string
  eventId?: string
  createdAt: string
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [tab, setTab] = useState<AdminTab>('dashboard')

  // Data
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [clients, setClients] = useState<AdminClient[]>([])
  const [questionnaires, setQuestionnaires] = useState<AdminQuestionnaire[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [folderStatuses, setFolderStatuses] = useState<Record<string, AdminFolderStatus>>({})

  const [selected, setSelected] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [orderFilter, setOrderFilter] = useState<'all' | 'action' | string>('all')
  const [mobileSidebar, setMobileSidebar] = useState(true)
  const [expandedQuestionnaire, setExpandedQuestionnaire] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const saved = window.sessionStorage.getItem(ADMIN_SESSION_KEY)
    if (saved) {
      setAdminKey(saved)
      setAuthenticated(true)
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!authenticated) return
    const key = adminKey
    try {
      const [convResult, orderResult, clientResult, questionnaireResult, apptResult] = await Promise.all([
        getAdminConversations(key),
        getAdminOrders(key),
        getAdminClients(key),
        getAdminQuestionnaires(key),
        fetch('/api/appointments').then(r => r.json()).catch(() => ({ success: false })),
      ])
      if (convResult.success && convResult.data?.conversations) {
        setConversations(convResult.data.conversations as ChatConversation[])
      }
      if (orderResult.success && orderResult.data?.orders) {
        setOrders(orderResult.data.orders as AdminOrder[])
      }
      if (clientResult.success && clientResult.data?.clients) {
        setClients(clientResult.data.clients as AdminClient[])
      }
      if (questionnaireResult.success && questionnaireResult.data?.questionnaires) {
        setQuestionnaires(questionnaireResult.data.questionnaires as AdminQuestionnaire[])
      }
      if (apptResult.success && apptResult.appointments) {
        setAppointments(apptResult.appointments as AppointmentRecord[])
      }
    } catch { /* silent */ }
  }, [authenticated, adminKey])

  useEffect(() => {
    if (authenticated) {
      setLoading(true)
      loadData().finally(() => setLoading(false))
      pollRef.current = setInterval(loadData, POLL_INTERVAL)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [authenticated, loadData])

  useEffect(() => {
    if (!authenticated) return

    const emails = Array.from(
      new Set(
        [...orders.map((order) => order.email), ...clients.map((client) => client.email)]
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      )
    )

    if (emails.length === 0) {
      setFolderStatuses({})
      return
    }

    let cancelled = false

    const loadFolderStatuses = async () => {
      const results = await Promise.all(
        emails.map(async (email) => {
          try {
            const response = await fetch(`/api/client-downloads?email=${encodeURIComponent(email)}`)
            const json = await response.json() as Partial<AdminFolderStatus> & { found?: boolean }
            return [
              email,
              {
                found: Boolean(json.found),
                folderName: json.folderName ?? null,
                unlockAt: json.unlockAt ?? null,
                remainingMs: Number(json.remainingMs ?? 0),
                zipUrl: json.zipUrl ?? null,
                previewUrl: json.previewUrl ?? null,
                hasZip: Boolean(json.hasZip),
                hasPreview: Boolean(json.hasPreview),
                readyAt: Boolean(json.readyAt),
              } satisfies AdminFolderStatus,
            ] as const
          } catch {
            return [
              email,
              { found: false, folderName: null, unlockAt: null, remainingMs: 0, zipUrl: null, previewUrl: null, hasZip: false, hasPreview: false, readyAt: false } satisfies AdminFolderStatus,
            ] as const
          }
        })
      )
      if (!cancelled) setFolderStatuses(Object.fromEntries(results))
    }

    loadFolderStatuses()
    return () => { cancelled = true }
  }, [authenticated, orders, clients])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected, conversations])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (data.success && data.secretKey) {
        setAdminKey(data.secretKey)
        setAuthenticated(true)
        window.sessionStorage.setItem(ADMIN_SESSION_KEY, data.secretKey)
      } else {
        setError('Identifiants incorrects.')
      }
    } catch {
      setError('Erreur de connexion.')
    }
  }

  function handleLogout() {
    setAuthenticated(false)
    setAdminKey('')
    setEmail('')
    setPassword('')
    setConversations([])
    setOrders([])
    setClients([])
    setQuestionnaires([])
    setAppointments([])
    setSelected(null)
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
  }

  async function handleSendReply() {
    if (!reply.trim() || !selected || sending) return
    const conv = conversations.find((c) => c.clientEmail === selected)
    if (!conv) return
    setSending(true)
    const msg = reply.trim()
    setReply('')
    try {
      await sendChatMessage({
        clientEmail: selected,
        clientName: conv.clientName,
        author: 'admin',
        message: msg,
        adminKey: adminKey,
      })
      await loadData()
    } catch {
      setReply(msg)
    } finally {
      setSending(false)
    }
  }

  async function handleSendFirstVersion(order: AdminOrder) {
    if (!confirm(`Envoyer l'email de première version à ${order.email} ?`)) return
    try {
      await sendFirstVersionEmail({
        adminKey: adminKey,
        clientEmail: order.email,
        clientName: order.name || `${order.firstName} ${order.lastName}`,
        siteUrl: order.siteUrl,
      })
      await loadData()
      alert('Email envoyé avec succès.')
    } catch {
      alert('Erreur lors de l\'envoi.')
    }
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    try {
      await updateOrderStatus({ adminKey: adminKey, orderId, status: newStatus })
      await loadData()
    } catch { /* silent */ }
  }

  async function handleToggleChat(orderId: string, currentState: boolean) {
    try {
      await updateOrderStatus({ adminKey: adminKey, orderId, chatEnabled: !currentState })
      await loadData()
    } catch { /* silent */ }
  }

  // ── Derived data ──
  const selectedConv = conversations.find((c) => c.clientEmail === selected)
  const unreadMessages = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0)
  const ordersAwaitingAction = orders.filter((order) =>
    ['En attente', 'Payé', 'Première version', 'Révision'].includes(order.status)
  ).length
  const activeOrders = orders.filter((o) => o.status !== 'Annulé')
  const firstVersionsToSend = activeOrders.filter((order) => !order.firstVersionSent && order.status !== 'Annulé').length
  const deliveredCount = orders.filter((o) => o.status === 'Livré').length
  const conversionRate = activeOrders.length > 0 ? Math.round((deliveredCount / activeOrders.length) * 100) : 0
  const totalRevenue = activeOrders.reduce((sum, o) => {
    const amount = parseFloat(o.amount) || 0
    return sum + amount
  }, 0)
  const totalRevenueDisplay = activeOrders.some((o) => (o.currency || '€') !== '€')
    ? totalRevenue.toLocaleString('fr-FR')
    : totalRevenue.toLocaleString('fr-FR')

  const upcomingAppointments = useMemo(() =>
    appointments
      .filter((a) => new Date(a.startAt).getTime() > Date.now())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 5),
    [appointments]
  )

  const filtered = conversations.filter(
    (c) =>
      !search ||
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.clientEmail.toLowerCase().includes(search.toLowerCase())
  )

  const filteredOrders = orders.filter(
    (o) =>
      (!search ||
        o.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        (o.name || '').toLowerCase().includes(search.toLowerCase()) ||
        o.email.toLowerCase().includes(search.toLowerCase())) &&
      (orderFilter === 'all' ||
        (orderFilter === 'action'
          ? ['En attente', 'Payé', 'Première version', 'Révision'].includes(o.status)
          : o.status === orderFilter))
  )

  const filteredClients = clients.filter(
    (c) =>
      !search ||
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  const filteredQuestionnaires = questionnaires.filter(
    (q) =>
      !search ||
      (q.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.lastName || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.orderId || '').toLowerCase().includes(search.toLowerCase())
  )

  // Appends adminKey to /api/client-downloads/file/... URLs so the secure
  // file-serving route accepts the request.
  function buildAdminFileUrl(url: string | null): string | null {
    if (!url) return null
    if (!url.startsWith('/api/client-downloads/file/')) return url
    const u = new URL(url, window.location.origin)
    u.searchParams.set('adminKey', adminKey)
    return u.toString()
  }

  // ── Monthly stats for mini chart ──
  const monthlyOrders = useMemo(() => {
    const now = new Date()
    const months: { label: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('fr-FR', { month: 'short' })
      const count = orders.filter((o) => {
        try {
          const od = new Date(o.date)
          return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear()
        } catch { return false }
      }).length
      months.push({ label, count })
    }
    return months
  }, [orders])

  const maxMonthly = Math.max(...monthlyOrders.map((m) => m.count), 1)

  // ════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════
  if (!authenticated) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-neutral-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-white/[0.03] to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-t from-amber-500/[0.02] to-transparent rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="relative w-full max-w-md mx-4"
        >
          <div className="bg-neutral-900/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] p-10 space-y-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto">
                <Lock size={24} className="text-white/80" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Administration</h1>
                <p className="text-sm text-neutral-500 mt-2">My Digital Career · Back Office</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Email</label>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 focus-within:border-white/20 transition-colors">
                  <Mail size={16} className="text-neutral-500 shrink-0" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@mydigitalcareer.com" className="w-full bg-transparent outline-none text-white placeholder:text-neutral-600 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Mot de passe</label>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 focus-within:border-white/20 transition-colors">
                  <Lock size={16} className="text-neutral-500 shrink-0" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent outline-none text-white placeholder:text-neutral-600 text-sm" />
                </div>
              </div>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  {error}
                </motion.p>
              )}
              <button type="submit" className="w-full py-3.5 rounded-xl bg-white text-neutral-950 font-semibold text-sm hover:bg-neutral-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                Se connecter
              </button>
            </form>
          </div>
        </motion.div>
      </section>
    )
  }

  // ════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════

  const sidebarItems: { id: AdminTab; label: string; icon: typeof Package; badge?: number }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
    { id: 'orders', label: 'Commandes', icon: ShoppingCart, badge: ordersAwaitingAction || undefined },
    { id: 'clients', label: 'Clients', icon: Users, badge: clients.length || undefined },
    { id: 'questionnaires', label: 'Questionnaires', icon: ClipboardList, badge: questionnaires.length || undefined },
    { id: 'appointments', label: 'Rendez-vous', icon: Calendar, badge: upcomingAppointments.length || undefined },
    { id: 'messages', label: 'Messages', icon: MessageCircle, badge: unreadMessages || undefined },
  ]

  return (
    <section className="min-h-screen bg-neutral-950 text-white">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 bottom-0 w-16 lg:w-64 bg-neutral-900/50 border-r border-white/[0.04] z-40 flex flex-col">
        <div className="h-16 flex items-center px-4 lg:px-6 border-b border-white/[0.04]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/[0.12] to-white/[0.04] flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">MDC</span>
          </div>
          <span className="hidden lg:block ml-3 font-semibold text-sm text-white/90 truncate">My Digital Career</span>
        </div>

        <nav className="flex-1 py-4 px-2 lg:px-3 space-y-1">
          {sidebarItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSelected(null); setMobileSidebar(true); setExpandedQuestionnaire(null) }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group',
                tab === id
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03]'
              )}
            >
              <Icon size={18} className="shrink-0 mx-auto lg:mx-0" />
              <span className="hidden lg:block truncate">{label}</span>
              {badge ? (
                <span className={cn(
                  'absolute right-2 lg:relative lg:right-auto ml-auto w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0',
                  tab === id ? 'bg-white text-neutral-950' : 'bg-white/10 text-white/60'
                )}>
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-2 lg:p-3 border-t border-white/[0.04]">
          <button onClick={loadData} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03] transition-all">
            <RefreshCw size={16} className="shrink-0 mx-auto lg:mx-0" />
            <span className="hidden lg:block">Rafraichir</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-neutral-500 hover:text-red-400 hover:bg-red-500/[0.05] transition-all">
            <LogOut size={16} className="shrink-0 mx-auto lg:mx-0" />
            <span className="hidden lg:block">Deconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-16 lg:ml-64 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 h-16 bg-neutral-950/80 backdrop-blur-xl border-b border-white/[0.04] flex items-center px-6 gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">{sidebarItems.find((i) => i.id === tab)?.label}</h2>
          </div>
          {tab !== 'dashboard' && (
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 w-full max-w-sm">
              <Search size={14} className="text-neutral-500 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-neutral-600"
              />
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Activity size={12} className="text-emerald-500" />
            <span>Live</span>
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={28} className="text-neutral-600 animate-spin" />
          </div>
        ) : (
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* ═══ DASHBOARD TAB ═══ */}
              {tab === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                  {/* KPI Cards */}
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                    <KpiCard icon={ShoppingCart} label="Commandes" value={String(orders.length)} sub={`${ordersAwaitingAction} a traiter`} trend={orders.length > 0 ? '+' + orders.length : undefined} color="white" />
                    <KpiCard icon={Users} label="Clients" value={String(clients.length)} sub={`${deliveredCount} livres`} color="blue" />
                    <KpiCard icon={TrendingUp} label="Chiffre d'affaires" value={`${totalRevenue}\u00A0\u20AC`} sub={`${conversionRate}% conversion`} color="emerald" />
                    <KpiCard icon={MessageCircle} label="Messages non lus" value={String(unreadMessages)} sub={`${conversations.length} conversations`} color="amber" />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Mini chart */}
                    <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-sm font-semibold text-white">Commandes par mois</h3>
                          <p className="text-xs text-neutral-500 mt-1">6 derniers mois</p>
                        </div>
                        <BarChart3 size={16} className="text-neutral-600" />
                      </div>
                      <div className="flex items-end gap-3 h-32">
                        {monthlyOrders.map((m, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full relative h-24">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max((m.count / maxMonthly) * 100, 6)}%` }}
                                transition={{ duration: 0.6, delay: i * 0.08 }}
                                className={cn(
                                  'w-full rounded-lg absolute bottom-0',
                                  m.count > 0 ? 'bg-gradient-to-t from-white/10 to-white/25' : 'bg-white/[0.04]'
                                )}
                                style={{ minHeight: 4 }}
                              />
                            </div>
                            <span className="text-[10px] text-neutral-500">{m.label}</span>
                            <span className="text-xs font-semibold text-white/70">{m.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upcoming appointments */}
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white">Prochains rendez-vous</h3>
                        <Calendar size={16} className="text-neutral-600" />
                      </div>
                      {upcomingAppointments.length === 0 ? (
                        <p className="text-xs text-neutral-600 py-8 text-center">Aucun rendez-vous a venir</p>
                      ) : (
                        <div className="space-y-3">
                          {upcomingAppointments.map((appt) => (
                            <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Calendar size={14} className="text-blue-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-white truncate">{appt.firstName} {appt.lastName}</p>
                                <p className="text-[10px] text-neutral-500">
                                  {new Date(appt.startAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })}
                                  {' · '}
                                  {new Date(appt.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                                </p>
                              </div>
                              {appt.meetLink ? (
                                <a href={appt.meetLink} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg hover:bg-blue-500/20 transition-colors">Meet</a>
                              ) : (
                                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">Meet</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status breakdown */}
                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {[
                      { label: 'En attente', count: orders.filter(o => o.status === 'En attente').length, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                      { label: 'En cours', count: orders.filter(o => o.status === 'En cours' || o.status === 'Paye').length, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                      { label: '1ere version', count: orders.filter(o => o.status === 'Première version' || o.status === 'Revision').length, color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
                      { label: 'Livres', count: deliveredCount, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                      { label: 'Questionnaires', count: questionnaires.length, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
                    ].map((s) => (
                      <div key={s.label} className={cn('rounded-xl border px-4 py-3 flex items-center justify-between', s.color)}>
                        <span className="text-xs font-medium">{s.label}</span>
                        <span className="text-lg font-bold">{s.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* KPI section */}
                  <div className="mt-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white">KPI & Performance</h3>
                      <TrendingUp size={16} className="text-neutral-600" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                      <KpiMini icon={Zap} label="Conversion" value={`${conversionRate}%`} sub={`${deliveredCount} livres / ${orders.length} cmd`} />
                      <KpiMini icon={ClipboardList} label="Questionnaires" value={String(questionnaires.length)} sub="Reponses recues" />
                      <KpiMini icon={Calendar} label="RDV a venir" value={String(upcomingAppointments.length)} sub={`${appointments.length} total`} />
                      <KpiMini icon={FileText} label="1ere version" value={String(firstVersionsToSend)} sub="A envoyer" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══ ORDERS TAB ═══ */}
              {tab === 'orders' && (
                <motion.div key="orders" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-6">
                    <DarkSummaryCard icon={ShoppingCart} label="Commandes totales" value={String(orders.length)} />
                    <DarkSummaryCard icon={Clock} label="A traiter" value={String(ordersAwaitingAction)} tone="amber" />
                    <DarkSummaryCard icon={Mail} label="1ere version a envoyer" value={String(firstVersionsToSend)} tone="blue" />
                    <DarkSummaryCard icon={MessageCircle} label="Messages non lus" value={String(unreadMessages)} tone="emerald" />
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'Toutes' },
                      { id: 'action', label: 'A traiter' },
                      { id: 'En attente', label: 'En attente' },
                      { id: 'Payé', label: 'Paye' },
                      { id: 'En cours', label: 'En cours' },
                      { id: 'Première version', label: '1ere version' },
                      { id: 'Révision', label: 'Revision' },
                      { id: 'Livré', label: 'Livre' },
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setOrderFilter(filter.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                          orderFilter === filter.id
                            ? 'bg-white text-neutral-950 border-white'
                            : 'text-neutral-500 border-white/[0.06] hover:border-white/20 hover:text-neutral-300'
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  {filteredOrders.length === 0 ? (
                    <DarkEmpty icon={ShoppingCart} text="Aucune commande" />
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map((order) => {
                        const folder = folderStatuses[order.email.toLowerCase()]
                        return (
                          <div key={order.orderId} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4 hover:border-white/[0.1] transition-colors">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-sm font-semibold text-white">{order.orderId}</span>
                                  <DarkStatusBadge status={order.status} />
                                  {order.chatEnabled && <DarkFlag tone="emerald" label="Chat actif" />}
                                  {folder?.found ? <DarkFlag tone="blue" label="Dossier" /> : <DarkFlag tone="amber" label="Pas de dossier" />}
                                </div>
                                <p className="text-sm text-neutral-400 mt-1">{order.name || `${order.firstName} ${order.lastName}`} — {order.email}</p>
                                <p className="text-xs text-neutral-600 mt-0.5">{formatDate(order.date)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-white">{order.amount}{order.currency}</p>
                                <p className="text-xs text-neutral-500">{order.profession}</p>
                              </div>
                            </div>

                            {order.positionsSearched && (
                              <p className="text-xs text-neutral-500"><span className="font-medium text-neutral-400">Postes :</span> {order.positionsSearched}</p>
                            )}

                            <div className="grid gap-2 text-xs sm:grid-cols-3">
                              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                                <span className="text-neutral-400">Profession :</span> <span className="text-neutral-300">{order.profession || '—'}</span>
                              </div>
                              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                                <span className="text-neutral-400">1ere version :</span> <span className="text-neutral-300">{order.firstVersionSent ? 'Envoyee' : 'En attente'}</span>
                              </div>
                              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                                <span className="text-neutral-400">Chat :</span> <span className="text-neutral-300">{order.chatEnabled ? 'Actif' : 'Masque'}</span>
                              </div>
                            </div>

                            {folder?.found && (
                              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-3 text-xs space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-neutral-400">Dossier :</span>
                                  <span className="text-neutral-300">{folder.folderName}</span>
                                  {folder.hasZip ? <DarkFlag tone="emerald" label="ZIP" /> : <DarkFlag tone="amber" label="ZIP absent" />}
                                  {folder.hasPreview ? <DarkFlag tone="emerald" label="Apercu" /> : <DarkFlag tone="amber" label="Apercu absent" />}
                                </div>
                                {!folder.readyAt && (
                                  <p className="text-neutral-500">Deblocage dans {formatRemaining(folder.remainingMs)}</p>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.04]">
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusChange(order.orderId, e.target.value)}
                                className="text-xs border border-white/[0.08] rounded-lg px-2 py-1.5 bg-white/[0.03] text-neutral-300 outline-none"
                              >
                                {['En attente', 'Payé', 'En cours', 'Première version', 'Révision', 'Livré', 'Annulé'].map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => handleToggleChat(order.orderId, order.chatEnabled)}
                                className={cn(
                                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                                  order.chatEnabled
                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                    : 'bg-white/[0.04] text-neutral-500 hover:bg-white/[0.08]'
                                )}
                              >
                                <MessageCircle size={12} />
                                {order.chatEnabled ? 'Chat actif' : 'Activer chat'}
                              </button>

                              {!order.firstVersionSent && (
                                <button onClick={() => handleSendFirstVersion(order)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors font-medium">
                                  <Mail size={12} />
                                  Envoyer 1ere version
                                </button>
                              )}

                              {order.firstVersionSent && (
                                <span className="flex items-center gap-1 text-xs text-emerald-400">
                                  <CheckCircle2 size={12} />
                                  Envoyee
                                </span>
                              )}

                              {order.siteUrl && (
                                <a href={order.siteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                                  <Globe size={12} />
                                  Site
                                </a>
                              )}

                              {folder?.previewUrl && buildAdminFileUrl(folder.previewUrl) && (
                                <a href={buildAdminFileUrl(folder.previewUrl)!} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                                  <ExternalLink size={12} />
                                  Apercu
                                </a>
                              )}

                              {folder?.zipUrl && buildAdminFileUrl(folder.zipUrl) && (
                                <a href={buildAdminFileUrl(folder.zipUrl)!} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                                  <Download size={12} />
                                  ZIP
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => { setTab('messages'); setSelected(order.email); setMobileSidebar(false) }}
                                className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300"
                              >
                                <MessageCircle size={12} />
                                Messages
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ CLIENTS TAB ═══ */}
              {tab === 'clients' && (
                <motion.div key="clients" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                  {filteredClients.length === 0 ? (
                    <DarkEmpty icon={Users} text="Aucun client" />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {filteredClients.map((client, i) => {
                        const folder = folderStatuses[client.email.toLowerCase()]
                        return (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-3 hover:border-white/[0.1] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center shrink-0">
                                <User size={16} className="text-neutral-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-white truncate">{client.name}</p>
                                <p className="text-xs text-neutral-500 truncate">{client.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600">{formatDate(client.date)}</span>
                              <span className={cn('px-2 py-0.5 rounded-lg font-medium', client.status === 'Actif' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.04] text-neutral-500')}>{client.status || 'Actif'}</span>
                            </div>
                            {folder?.found && (
                              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2 text-xs space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-neutral-500">{folder.folderName}</span>
                                  {folder.hasZip && <DarkFlag tone="emerald" label="ZIP" />}
                                  {folder.hasPreview && <DarkFlag tone="blue" label="Apercu" />}
                                </div>
                                <div className="flex gap-3">
                                  {folder.previewUrl && buildAdminFileUrl(folder.previewUrl) && <a href={buildAdminFileUrl(folder.previewUrl)!} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Apercu</a>}
                                  {folder.zipUrl && buildAdminFileUrl(folder.zipUrl) && <a href={buildAdminFileUrl(folder.zipUrl)!} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">ZIP</a>}
                                </div>
                              </div>
                            )}
                            {client.siteUrl && (
                              <a href={client.siteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                                <ExternalLink size={11} />
                                {client.siteUrl}
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ QUESTIONNAIRES TAB ═══ */}
              {tab === 'questionnaires' && (
                <motion.div key="questionnaires" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 mb-6">
                    <DarkSummaryCard icon={ClipboardList} label="Questionnaires recus" value={String(questionnaires.length)} />
                    <DarkSummaryCard icon={Briefcase} label="Professions uniques" value={String(new Set(questionnaires.map(q => q.profession).filter(Boolean)).size)} tone="blue" />
                    <DarkSummaryCard icon={Palette} label="Palettes utilisees" value={String(new Set(questionnaires.map(q => q.colorPalette).filter(Boolean)).size)} tone="emerald" />
                  </div>

                  {filteredQuestionnaires.length === 0 ? (
                    <DarkEmpty icon={ClipboardList} text="Aucun questionnaire" />
                  ) : (
                    <div className="space-y-3">
                      {filteredQuestionnaires.map((q, i) => {
                        const isExpanded = expandedQuestionnaire === i
                        return (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.1] transition-colors">
                            <button
                              type="button"
                              onClick={() => setExpandedQuestionnaire(isExpanded ? null : i)}
                              className="w-full p-5 text-left"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm text-white">{q.firstName} {q.lastName}</span>
                                    {q.orderId && <span className="font-mono text-[10px] text-neutral-500 bg-white/[0.04] px-2 py-0.5 rounded-lg">{q.orderId}</span>}
                                  </div>
                                  <p className="text-xs text-neutral-500 mt-1">{q.email}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-neutral-400">{q.date}</p>
                                  {q.profession && <p className="text-xs text-neutral-500 mt-0.5">{q.profession}</p>}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-3">
                                {q.colorPalette && <DarkFlag tone="blue" label={q.colorPalette} />}
                                {q.siteStyle && <DarkFlag tone="emerald" label={q.siteStyle} />}
                                {q.seekingJob === 'Oui' && <DarkFlag tone="amber" label="Recherche emploi" />}
                                {q.driveFolderUrl && <DarkFlag tone="blue" label="Dossier Drive" />}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-5 space-y-3 border-t border-white/[0.04] pt-4">
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <QField label="Recherche emploi" value={q.seekingJob} />
                                      <QField label="Postes recherches" value={q.positionsSearched} />
                                      <QField label="Motivations" value={q.motivations} />
                                      <QField label="Requete particuliere" value={q.customRequest} />
                                      <QField label="Palette" value={q.colorPalette} />
                                      <QField label="Style" value={q.siteStyle} />
                                      <QField label="Reseaux sociaux" value={q.socialLinks} />
                                      <QField label="Autorisation" value={q.authorization} />
                                    </div>

                                    <div className="flex flex-wrap gap-3 pt-2">
                                      {q.driveFolderUrl && (
                                        <a href={q.driveFolderUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline bg-blue-500/10 px-3 py-1.5 rounded-lg">
                                          <ExternalLink size={12} />
                                          Dossier Drive
                                        </a>
                                      )}
                                      {q.cvUrl && (
                                        <a href={q.cvUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline bg-blue-500/10 px-3 py-1.5 rounded-lg">
                                          <FileText size={12} />
                                          CV
                                        </a>
                                      )}
                                      {q.photoUrl && (
                                        <a href={q.photoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline bg-blue-500/10 px-3 py-1.5 rounded-lg">
                                          <Eye size={12} />
                                          Photo
                                        </a>
                                      )}
                                      {q.extraUrl && (
                                        <a href={q.extraUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline bg-blue-500/10 px-3 py-1.5 rounded-lg">
                                          <Paperclip size={12} />
                                          Extras
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ APPOINTMENTS TAB ═══ */}
              {tab === 'appointments' && (
                <motion.div key="appointments" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                  <div className="grid gap-3 md:grid-cols-3 mb-6">
                    <DarkSummaryCard icon={Calendar} label="Total rendez-vous" value={String(appointments.length)} />
                    <DarkSummaryCard icon={Clock} label="A venir" value={String(upcomingAppointments.length)} tone="blue" />
                    <DarkSummaryCard icon={Video} label="Google Meet" value={String(appointments.filter(a => a.meetLink).length)} tone="emerald" />
                  </div>

                  {appointments.length === 0 ? (
                    <DarkEmpty icon={Calendar} text="Aucun rendez-vous" />
                  ) : (
                    <div className="space-y-3">
                      {[...appointments]
                        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
                        .map((appt) => {
                          const isPast = new Date(appt.startAt).getTime() < Date.now()
                          return (
                            <div key={appt.id} className={cn('bg-white/[0.02] border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors', isPast ? 'border-white/[0.03] opacity-60' : 'border-white/[0.06] hover:border-white/[0.1]')}>
                              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Calendar size={18} className="text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-white">{appt.firstName} {appt.lastName}</p>
                                <p className="text-xs text-neutral-500">{appt.email}</p>
                              </div>
                              <div className="text-right text-sm">
                                <p className="text-white font-medium">
                                  {new Date(appt.startAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })}
                                </p>
                                <p className="text-neutral-400 text-xs">
                                  {new Date(appt.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                                  {' - '}
                                  {new Date(appt.endAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                                  {' · '}{appt.durationMinutes} min
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {appt.meetLink ? (
                                  <a href={appt.meetLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors font-medium">
                                    <Video size={12} />
                                    Rejoindre Meet
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-neutral-500 bg-white/[0.04] px-2 py-1 rounded-lg">Pas de lien Meet</span>
                                )}
                                <span className={cn('text-[10px] px-2 py-1 rounded-lg font-medium', isPast ? 'bg-neutral-800 text-neutral-500' : 'bg-emerald-500/10 text-emerald-400')}>
                                  {isPast ? 'Passe' : 'A venir'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ MESSAGES TAB ═══ */}
              {tab === 'messages' && (
                <motion.div key="messages" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                  <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-white/[0.06] overflow-hidden">
                    {/* Sidebar */}
                    <div className={cn('w-full md:w-80 bg-white/[0.01] border-r border-white/[0.04] flex flex-col shrink-0', selected && !mobileSidebar ? 'hidden md:flex' : 'flex')}>
                      <div className="flex-1 overflow-y-auto">
                        {filtered.length === 0 ? (
                          <DarkEmpty icon={MessageCircle} text={search ? 'Aucun resultat' : 'Aucune conversation'} />
                        ) : (
                          filtered.map((conv) => (
                            <button
                              key={conv.clientEmail}
                              onClick={() => { setSelected(conv.clientEmail); setMobileSidebar(false) }}
                              className={cn('w-full px-4 py-4 text-left border-b border-white/[0.03] transition-all hover:bg-white/[0.02]', selected === conv.clientEmail && 'bg-white/[0.04]')}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm text-white truncate">{conv.clientName}</p>
                                  <p className="text-xs text-neutral-600 truncate">{conv.clientEmail}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {conv.unreadCount > 0 && (
                                    <span className="w-5 h-5 bg-white text-neutral-950 text-[10px] font-bold rounded-full flex items-center justify-center">{conv.unreadCount}</span>
                                  )}
                                  <DarkStatusBadge status={conv.orderStatus} />
                                </div>
                              </div>
                              {conv.lastMessage && <p className="text-xs text-neutral-500 mt-1.5 truncate">{conv.lastMessage}</p>}
                              {conv.lastMessageDate && <p className="text-[10px] text-neutral-600 mt-1">{formatTime(conv.lastMessageDate)}</p>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Chat */}
                    <div className={cn('flex-1 flex flex-col bg-neutral-950', selected && !mobileSidebar ? 'flex' : 'hidden md:flex')}>
                      {!selectedConv ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                              <MessageCircle size={28} className="text-neutral-700" />
                            </div>
                            <p className="text-neutral-600 text-sm">Selectionnez une conversation</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-4">
                            <button onClick={() => { setSelected(null); setMobileSidebar(true) }} className="md:hidden p-2 rounded-xl hover:bg-white/[0.04] text-neutral-500">
                              <ArrowLeft size={18} />
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center shrink-0">
                              <User size={16} className="text-neutral-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-sm">{selectedConv.clientName}</p>
                              <p className="text-xs text-neutral-500">{selectedConv.clientEmail}</p>
                            </div>
                            <DarkStatusBadge status={selectedConv.orderStatus} />
                          </div>

                          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                            {selectedConv.messages.length === 0 ? (
                              <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-neutral-600">Aucun message.</p>
                              </div>
                            ) : (
                              selectedConv.messages.map((msg) => (
                                <div key={msg.id} className={cn('flex flex-col max-w-[70%]', msg.author === 'admin' ? 'ml-auto items-end' : 'mr-auto items-start')}>
                                  <div className={cn('rounded-2xl px-4 py-2.5 text-sm leading-relaxed space-y-2', msg.author === 'admin' ? 'bg-white text-neutral-900 rounded-br-lg' : 'bg-white/[0.06] text-neutral-200 rounded-bl-lg')}>
                                    {msg.message && <p>{msg.message}</p>}
                                    {msg.attachments?.length ? (
                                      <div className="space-y-1.5">
                                        {msg.attachments.map((att) => (
                                          <div key={`${msg.id}-${att.name}`} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-xs', msg.author === 'admin' ? 'bg-neutral-100 text-neutral-700' : 'bg-white/[0.04] text-neutral-300')}>
                                            {att.url ? (
                                              <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 hover:underline">
                                                <Paperclip size={12} />
                                                <span className="truncate">{att.name}</span>
                                              </a>
                                            ) : (
                                              <><Paperclip size={12} /><span className="truncate">{att.name}</span></>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                  <span className="text-[10px] text-neutral-600 mt-1 px-1">
                                    {msg.author === 'admin' ? 'Vous' : selectedConv.clientName} · {formatTime(msg.timestamp)}
                                  </span>
                                </div>
                              ))
                            )}
                            <div ref={messagesEndRef} />
                          </div>

                          <div className="px-5 py-4 border-t border-white/[0.04]">
                            <div className="flex items-end gap-3">
                              <textarea
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply() } }}
                                placeholder="Repondre..."
                                rows={1}
                                className="flex-1 resize-none rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/20 transition-all max-h-24"
                              />
                              <button
                                onClick={handleSendReply}
                                disabled={!reply.trim() || sending}
                                className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all', reply.trim() && !sending ? 'bg-white text-neutral-950 hover:bg-neutral-100' : 'bg-white/[0.04] text-neutral-600')}
                              >
                                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </section>
  )
}

// ═══════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════

function QField({ label, value }: { label: string; value: string }) {
  if (!value || value === 'Non') return null
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2 text-xs">
      <span className="text-neutral-500 font-medium">{label} :</span>{' '}
      <span className="text-neutral-300">{value}</span>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, trend, color }: {
  icon: typeof Package; label: string; value: string; sub: string; trend?: string; color: 'white' | 'blue' | 'emerald' | 'amber'
}) {
  const colors = {
    white: 'from-white/[0.04] to-white/[0.01] border-white/[0.06]',
    blue: 'from-blue-500/[0.06] to-blue-500/[0.01] border-blue-500/[0.12]',
    emerald: 'from-emerald-500/[0.06] to-emerald-500/[0.01] border-emerald-500/[0.12]',
    amber: 'from-amber-500/[0.06] to-amber-500/[0.01] border-amber-500/[0.12]',
  }
  const iconColors = {
    white: 'text-white/60', blue: 'text-blue-400', emerald: 'text-emerald-400', amber: 'text-amber-400',
  }

  return (
    <div className={cn('rounded-2xl border bg-gradient-to-br p-5', colors[color])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">{label}</p>
          <p className="text-3xl font-bold text-white mt-1 tracking-tight">{value}</p>
          <p className="text-xs text-neutral-600 mt-1">{sub}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center', iconColors[color])}>
          <Icon size={18} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3 text-xs text-emerald-400">
          <ArrowUpRight size={12} />
          {trend}
        </div>
      )}
    </div>
  )
}

function KpiMini({ icon: Icon, label, value, sub }: { icon: typeof Package; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-neutral-500" />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-neutral-600 mt-1">{sub}</p>
    </div>
  )
}

function DarkSummaryCard({ icon: Icon, label, value, tone }: {
  icon: typeof Package; label: string; value: string; tone?: 'amber' | 'blue' | 'emerald'
}) {
  const tones = {
    amber: 'border-amber-500/[0.12] text-amber-400',
    blue: 'border-blue-500/[0.12] text-blue-400',
    emerald: 'border-emerald-500/[0.12] text-emerald-400',
  }
  const t = tone ? tones[tone] : 'border-white/[0.06] text-white'

  return (
    <div className={cn('rounded-2xl border bg-white/[0.02] p-4', t)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-neutral-500">{label}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function DarkStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'En attente': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Payé': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'En cours': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Première version': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'Révision': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Livré': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'Annulé': 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  const c = map[status] || 'bg-white/[0.04] text-neutral-500 border-white/[0.06]'

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium border', c)}>
      {status || 'Inconnu'}
    </span>
  )
}

function DarkFlag({ tone, label }: { tone: 'emerald' | 'blue' | 'amber'; label: string }) {
  const map = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-400',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium', map[tone])}>
      {label}
    </span>
  )
}

function DarkEmpty({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  return (
    <div className="px-4 py-20 text-center">
      <Icon size={32} className="text-neutral-700 mx-auto mb-3" />
      <p className="text-sm text-neutral-600">{text}</p>
    </div>
  )
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '' }
}

function formatRemaining(ms: number) {
  if (ms <= 0) return 'Disponible'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}
