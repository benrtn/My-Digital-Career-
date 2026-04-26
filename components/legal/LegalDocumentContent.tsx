'use client'

import { siteConfig } from '@/config/site'
import { useLanguage } from '@/contexts/LanguageContext'

export function LegalDocumentContent({
  note,
  placeholder,
  type,
}: {
  note: string
  placeholder: string
  type: 'cgv' | 'legal' | 'privacy'
}) {
  const { t } = useLanguage()
  const m = t.legalDock.modal

  return (
    <div className="space-y-6 px-7 py-7 text-sm text-neutral-700 md:px-8">
      <div className="rounded-[1.6rem] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,248,228,0.95),rgba(255,255,255,0.88))] p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.45)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700/75">
          {m.informativeDoc}
        </p>
        <p className="mt-2 leading-relaxed text-neutral-700">{note}</p>
      </div>

      {type === 'cgv' ? <CgvSummary /> : null}
      {type === 'legal' ? <LegalSummary /> : null}
      {type === 'privacy' ? <PrivacySummary /> : null}

      <div className="rounded-[1.6rem] border border-neutral-200/80 bg-white/78 p-5 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            {m.contentLabel}
          </p>
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-medium text-neutral-500">
            {m.toComplete}
          </span>
        </div>
        <div className="whitespace-pre-wrap rounded-[1.25rem] border border-dashed border-neutral-200 bg-neutral-50/75 p-4 leading-7 text-neutral-700">
          {placeholder}
        </div>
      </div>
    </div>
  )
}

function CgvSummary() {
  const { t } = useLanguage()
  const f = t.legalDock.modal.cgvFields as Record<string, string>
  return (
    <div className="rounded-[1.6rem] border border-neutral-200/80 bg-white/82 p-5 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{t.legalDock.modal.cgvSummaryLabel}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SummaryItem label={f.service} value={siteConfig.legal.service} />
        <SummaryItem label={f.price} value={`${siteConfig.price}${siteConfig.currency}`} />
        <SummaryItem label={f.firstDelivery} value={siteConfig.legal.firstDelivery} />
        <SummaryItem label={f.meet} value={siteConfig.legal.meetSession} />
        <SummaryItem label={f.finalDelivery} value={siteConfig.legal.finalDelivery} />
        <SummaryItem label={f.edits} value={siteConfig.legal.freeEdits} />
        <SummaryItem label={f.noShow} value={siteConfig.legal.noShowRule} />
        <SummaryItem label={f.response} value={siteConfig.legal.responseTime} />
      </div>
    </div>
  )
}

function LegalSummary() {
  const { t } = useLanguage()
  const f = t.legalDock.modal.legalFields as Record<string, string>
  return (
    <div className="rounded-[1.6rem] border border-neutral-200/80 bg-white/82 p-5 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{t.legalDock.modal.legalSummaryLabel}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SummaryItem label={f.tradeName} value={siteConfig.name} />
        <SummaryItem label={f.operator} value={siteConfig.legal.operator} />
        <SummaryItem label={f.status} value={siteConfig.legal.businessStatus} />
        <SummaryItem label={f.address} value={siteConfig.legal.address} />
        <SummaryItem label={f.email} value={siteConfig.contactEmail} />
        <SummaryItem label={f.host} value={siteConfig.legal.host} />
        <SummaryItem label={f.domain} value={siteConfig.legal.domain} />
        <SummaryItem label={f.siret} value={siteConfig.legal.siret} />
      </div>
    </div>
  )
}

function PrivacySummary() {
  const { t } = useLanguage()
  const f = t.legalDock.modal.privacyFields as Record<string, string>
  return (
    <div className="rounded-[1.6rem] border border-neutral-200/80 bg-white/82 p-5 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{t.legalDock.modal.privacySummaryLabel}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SummaryItem label={f.dataCollected} value={f.dataCollectedValue} />
        <SummaryItem label={f.retention} value={siteConfig.legal.retention} />
        <SummaryItem label={f.resale} value={f.resaleValue} />
        <SummaryItem label={f.externalTools} value={f.externalToolsValue} />
        <SummaryItem label={f.clientArea} value={f.clientAreaValue} />
        <SummaryItem label={f.newsletter} value={f.newsletterValue} />
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-[1.1rem] border border-neutral-100 bg-neutral-50/70 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="text-sm leading-relaxed text-neutral-700">{value}</p>
    </div>
  )
}
