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
    <div className="px-8 py-7 space-y-6 text-sm text-neutral-700">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
          My Digital Career
        </p>
        <p className="leading-relaxed text-neutral-600">{note}</p>
      </div>

      {type === 'cgv' ? <CgvSummary /> : null}
      {type === 'legal' ? <LegalSummary /> : null}
      {type === 'privacy' ? <PrivacySummary /> : null}

      <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50/80 p-5">
        {/* Replace the placeholder below with your real legal text content. */}
        <div className="whitespace-pre-wrap leading-7 text-neutral-700">{placeholder}</div>
      </div>
    </div>
  )
}

function CgvSummary() {
  return (
    <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.4)]">
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
    <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.4)]">
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
    <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.4)]">
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
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="text-sm leading-relaxed text-neutral-700">{value}</p>
    </div>
  )
}
