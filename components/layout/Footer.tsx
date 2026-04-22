'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { LegalDock } from '@/components/legal/LegalDock'

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="relative overflow-hidden bg-neutral-950 text-neutral-400">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-8 rounded-[2rem] border border-white/8 bg-white/[0.02] p-6 shadow-[0_24px_80px_-56px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">
                  <span className="text-xs font-bold tracking-tight text-neutral-950">MDC</span>
                </div>
                <span className="font-semibold tracking-tight text-white">My Digital Career</span>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-neutral-500">
                {t.footer.tagline}
              </p>
            </div>

            <p className="text-xs text-neutral-600">{t.footer.copyright}</p>
          </div>

          <LegalDock variant="inline" />
        </div>
      </div>
    </footer>
  )
}
