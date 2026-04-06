'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { LegalDock } from '@/components/legal/LegalDock'

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-neutral-950 text-neutral-400 relative">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="max-w-7xl mx-auto px-6 py-14 relative">
        <div className="grid grid-cols-1 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
                <span className="text-neutral-950 text-xs font-bold tracking-tight">MDC</span>
              </div>
              <span className="font-semibold text-white tracking-tight">My Digital Career</span>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-xs">
              {t.footer.tagline}
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-neutral-800/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
                  <span className="text-neutral-950 text-xs font-bold tracking-tight">MDC</span>
                </div>
                <span className="font-semibold text-white tracking-tight">My Digital Career</span>
              </div>
              <span className="hidden sm:inline text-sm text-neutral-500">
                {t.footer.tagline}
              </span>
            </div>
            <p className="text-xs text-neutral-600">{t.footer.copyright}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-neutral-500">{t.footer.legalButton}</span>
          </div>
        </div>
      </div>
      <LegalDock />
    </footer>
  )
}
