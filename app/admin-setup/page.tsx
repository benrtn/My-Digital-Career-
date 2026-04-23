'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Loader2, Trash2, Sparkles } from 'lucide-react'

export default function AdminSetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSetup() {
    if (!email || !password) return
    setStatus('loading')
    setMessage('')

    try {
      // 1. Login as admin to get the secretKey
      const authRes = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const authData = await authRes.json() as { success?: boolean; secretKey?: string; error?: string }

      if (!authRes.ok || !authData.success || !authData.secretKey) {
        setStatus('error')
        setMessage(authData.error ?? 'Identifiants incorrects.')
        return
      }

      // 2. Call setup-sheets: clear data + apply formatting
      const setupRes = await fetch('/api/admin/setup-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': authData.secretKey,
        },
        body: JSON.stringify({ clearData: true }),
      })
      const setupData = await setupRes.json() as { success?: boolean; results?: Record<string, boolean>; error?: string }

      if (!setupRes.ok || !setupData.success) {
        setStatus('error')
        setMessage(setupData.error ?? 'Erreur lors de la configuration des feuilles.')
        return
      }

      setStatus('success')
      setMessage('Feuilles vidées et formatées avec succès.')
    } catch {
      setStatus('error')
      setMessage('Erreur réseau. Vérifiez votre connexion.')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl space-y-6">
        <div className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Configuration Sheets
          </h1>
          <p className="text-sm text-white/50">
            Vide les données de test et applique le design pro sur les 3 feuilles Google Sheets.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email admin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
          <input
            type="password"
            placeholder="Mot de passe admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetup()}
            className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </div>

        <button
          onClick={handleSetup}
          disabled={!email || !password || status === 'loading'}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
          {status === 'loading' ? 'Configuration en cours...' : 'Vider et formater les feuilles'}
        </button>

        {status === 'success' && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
