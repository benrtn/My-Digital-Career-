'use client'

import { siteConfig } from '@/config/site'

export function LegalDocumentContent({
  note,
  placeholder,
  type,
}: {
  note: string
  placeholder: string
  type: 'cgv' | 'legal' | 'privacy'
}) {
  return (
    <div className="space-y-6 px-7 py-7 text-sm text-neutral-700 md:px-8">
      <div className="rounded-[1.6rem] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,248,228,0.95),rgba(255,255,255,0.88))] p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.45)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700/75">
          Document informatif
        </p>
        <p className="mt-2 leading-relaxed text-neutral-700">{note}</p>
      </div>

      {type === 'cgv' ? <CgvSummary /> : null}
      {type === 'legal' ? <LegalSummary /> : null}
      {type === 'privacy' ? <PrivacySummary /> : null}

      <div className="rounded-[1.6rem] border border-neutral-200/80 bg-white/78 p-5 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Contenu
          </p>
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-medium text-neutral-500">
            À compléter
          </span>
        </div>
        {/* Replace the placeholder below with your real legal text content. */}
        <div className="whitespace-pre-wrap rounded-[1.25rem] border border-dashed border-neutral-200 bg-neutral-50/75 p-4 leading-7 text-neutral-700">
          {placeholder}
        </div>
      </div>
    </div>
  )
}

function CgvSummary() {
  return (
    <div className="rounded-[1.6rem] border border-neutral-200/80 bg-white/82 p-5 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Repères contractuels</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SummaryItem label="Prestation" value={siteConfig.legal.service} />
        <SummaryItem label="Prix" value={`${siteConfig.price}${siteConfig.currency}`} />
        <SummaryItem label="Première livraison" value={siteConfig.legal.firstDelivery} />
        <SummaryItem label="Rendez-vous" value={siteConfig.legal.meetSession} />
        <SummaryItem label="Version finale" value={siteConfig.legal.finalDelivery} />
        <SummaryItem label="Retouches" value={siteConfig.legal.freeEdits} />
        <SummaryItem label="Absence rendez-vous" value={siteConfig.legal.noShowRule} />
        <SummaryItem label="Réponse" value={siteConfig.legal.responseTime} />
      </div>
    </div>
  )
}

function LegalSummary() {
  return (
    <div className="rounded-[1.6rem] border border-neutral-200/80 bg-white/82 p-5 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Informations d’exploitation</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SummaryItem label="Nom commercial" value={siteConfig.name} />
        <SummaryItem label="Exploitant" value={siteConfig.legal.operator} />
        <SummaryItem label="Statut" value={siteConfig.legal.businessStatus} />
        <SummaryItem label="Adresse" value={siteConfig.legal.address} />
        <SummaryItem label="Email" value={siteConfig.contactEmail} />
        <SummaryItem label="Hébergeur" value={siteConfig.legal.host} />
        <SummaryItem label="Domaine" value={siteConfig.legal.domain} />
        <SummaryItem label="SIRET" value={siteConfig.legal.siret} />
      </div>
    </div>
  )
}

function PrivacySummary() {
  return (
    <div className="rounded-[1.6rem] border border-neutral-200/80 bg-white/82 p-5 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Données & outils</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SummaryItem label="Données collectées" value="Nom, prénom, email, téléphone, photo, CV PDF, expériences, diplômes, LinkedIn, texte de présentation, message libre, données de paiement." />
        <SummaryItem label="Conservation" value={siteConfig.legal.retention} />
        <SummaryItem label="Revente" value="Aucune revente des données." />
        <SummaryItem label="Outils externes" value="Google Analytics, Stripe, PayPal." />
        <SummaryItem label="Espace client" value="Oui" />
        <SummaryItem label="Newsletter" value="Aucune newsletter." />
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
