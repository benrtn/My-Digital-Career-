'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  Shield,
  Zap,
  Smartphone,
  CreditCard,
  QrCode,
  Users,
  Briefcase,
  Globe,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Star,
  Building2,
  Wifi,
  TrendingUp,
  Settings,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// ─── Animation helper ──────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1], delay },
})

// ─── Data ──────────────────────────────────────────────────────────────────
const LOYALTY_FEATURES = [
  'Carte fidélité digitale personnalisée',
  'QR code client unique',
  'Système de points ou de tampons',
  'Interface commerçant pour gérer les clients',
  'Ajout de points ou tampons facilement',
  'Accès simple depuis mobile',
  'Aucune application à télécharger côté client',
  'Notifications client en option',
]

const LOYALTY_TARGETS = [
  { icon: '🍽️', label: 'Restaurants' },
  { icon: '✂️', label: 'Salons de coiffure' },
  { icon: '💅', label: 'Instituts de beauté' },
  { icon: '🛍️', label: 'Boutiques' },
  { icon: '🍷', label: 'Bars' },
  { icon: '💪', label: 'Salles de sport' },
  { icon: '🏪', label: 'Commerces de proximité' },
  { icon: '🧑‍💼', label: 'Indépendants' },
]

const NFC_FEATURES = [
  'Carte NFC personnalisée',
  'Page digitale professionnelle',
  'Partage instantané des coordonnées',
  'QR code inclus',
  'Boutons contact, téléphone, email, WhatsApp, LinkedIn, site web',
  "Design personnalisé selon l'image de l'entreprise",
  'Idéal pour commerciaux, salons, rendez-vous clients et networking',
]

const NFC_TARGETS = [
  'Commerciaux',
  'Indépendants',
  'Entrepreneurs',
  'Agents immobiliers',
  'Consultants',
  'Artisans',
  'Équipes commerciales',
  'Professionnels en rendez-vous',
]

const NFC_PRICING = [
  { quantity: '1 carte', price: '25 €', highlight: false },
  { quantity: '5 cartes', price: '80 €', highlight: false },
  { quantity: '25 cartes', price: '330 €', highlight: true },
  { quantity: '+ de 25 cartes', price: 'Sur devis', highlight: false },
]

const REASSURANCE_ITEMS = [
  {
    icon: Zap,
    title: 'Simple et rapide à mettre en place',
    desc: 'Déployez votre solution en quelques jours sans infrastructure complexe.',
  },
  {
    icon: Users,
    title: 'Adaptée à tous les profils',
    desc: "Des petits commerces aux équipes commerciales, la solution s'adapte à vos besoins.",
  },
  {
    icon: Smartphone,
    title: 'Aucun téléchargement côté client',
    desc: 'Vos clients accèdent à leur carte ou vos coordonnées sans aucune installation.',
  },
  {
    icon: Settings,
    title: 'Design personnalisable',
    desc: 'Chaque solution est adaptée à votre identité visuelle et votre image de marque.',
  },
  {
    icon: TrendingUp,
    title: 'Évolution possible',
    desc: "Commencez simplement et ajoutez des options avancées à votre rythme.",
  },
  {
    icon: Award,
    title: 'Image modernisée',
    desc: "Montrez à vos clients et prospects que vous êtes tourné vers l'avenir.",
  },
]

const NEED_TYPES = [
  'Carte de fidélité digitale',
  'Carte de fidélité digitale avec notifications',
  'Carte NFC commerciale',
  'Plusieurs cartes NFC',
  'Autre demande',
]

// ─── Form types ────────────────────────────────────────────────────────────
type FormState = {
  fullName: string
  company: string
  email: string
  phone: string
  needType: string
  cardCount: string
  notificationOption: string
  message: string
}

const INITIAL_FORM: FormState = {
  fullName: '',
  company: '',
  email: '',
  phone: '',
  needType: '',
  cardCount: '',
  notificationOption: '',
  message: '',
}

// ─── Sub-components ────────────────────────────────────────────────────────
function FeatureItem({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
          dark ? 'bg-gold-500/20' : 'bg-neutral-950'
        )}
      >
        <Check
          size={11}
          strokeWidth={3}
          className={dark ? 'text-gold-400' : 'text-white'}
        />
      </div>
      <span
        className={cn(
          'text-sm leading-relaxed',
          dark ? 'text-neutral-300' : 'text-neutral-700'
        )}
      >
        {text}
      </span>
    </div>
  )
}

function GoldBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 text-sm font-medium text-gold-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
      {children}
    </span>
  )
}

function LightBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-200/80 bg-white/80 text-sm font-medium text-neutral-600 backdrop-blur-sm shadow-glass">
      <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
      {children}
    </span>
  )
}

function SectionHeader({
  badge,
  title,
  subtitle,
  dark = false,
}: {
  badge?: string
  title: string
  subtitle?: string
  dark?: boolean
}) {
  return (
    <div className="text-center mb-12 md:mb-16">
      {badge && (
        <motion.div {...fadeUp(0)} className="mb-4 flex justify-center">
          {dark ? <GoldBadge>{badge}</GoldBadge> : <LightBadge>{badge}</LightBadge>}
        </motion.div>
      )}
      <motion.h2
        {...fadeUp(0.05)}
        className={cn(
          'font-playfair text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4',
          dark ? 'text-white' : 'text-neutral-950'
        )}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          {...fadeUp(0.1)}
          className={cn(
            'text-base md:text-lg max-w-2xl mx-auto leading-relaxed',
            dark ? 'text-neutral-400' : 'text-neutral-500'
          )}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  )
}

function InputField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        {label}{' '}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-neutral-200 bg-cream-50 text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400 transition-all'

// ─── Main component ────────────────────────────────────────────────────────
export function SolutionsProClient() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isNfcType =
    form.needType === 'Carte NFC commerciale' ||
    form.needType === 'Plusieurs cartes NFC'

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const res = await fetch('/api/pro-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Une erreur est survenue.')
      }

      setSubmitStatus('success')
      setForm(INITIAL_FORM)
    } catch (err) {
      setSubmitStatus('error')
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50">

      {/* ════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════ */}
      <section className="relative bg-neutral-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(184,151,62,0.18),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_80%_80%,rgba(184,151,62,0.06),transparent)]" />

        <div className="container-lg relative pt-32 pb-24 md:pt-44 md:pb-32 text-center">
          <motion.div {...fadeUp(0)} className="mb-6 flex justify-center">
            <GoldBadge>Solutions professionnelles</GoldBadge>
          </motion.div>

          <motion.h1
            {...fadeUp(0.06)}
            className="font-playfair text-4xl md:text-5xl lg:text-[3.6rem] text-white tracking-tight mb-6 max-w-4xl mx-auto leading-[1.12]"
          >
            Des cartes digitales intelligentes pour les commerçants et les professionnels
          </motion.h1>

          <motion.p
            {...fadeUp(0.12)}
            className="text-neutral-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Créez une carte de fidélité digitale pour vos clients ou équipez vos commerciaux
            avec des cartes NFC modernes, simples à partager et entièrement personnalisables.
          </motion.p>

          <motion.div
            {...fadeUp(0.18)}
            className="flex flex-wrap justify-center gap-3"
          >
            <a href="#fidelite">
              <Button size="lg" variant="gold" icon={<CreditCard size={18} />}>
                Carte fidélité digitale
              </Button>
            </a>
            <a href="#nfc">
              <Button
                size="lg"
                variant="secondary"
                icon={<Wifi size={18} />}
                className="border-white/20 bg-white/8 text-white hover:bg-white/15 hover:border-white/30 backdrop-blur-xl shadow-none"
              >
                Carte NFC professionnelle
              </Button>
            </a>
          </motion.div>

          {/* Trust row */}
          <motion.div
            {...fadeUp(0.24)}
            className="mt-14 flex flex-wrap justify-center gap-6 text-sm text-neutral-400"
          >
            {[
              { icon: Shield, label: 'Solution sécurisée' },
              { icon: Smartphone, label: 'Sans application client' },
              { icon: Star, label: 'Design personnalisé' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon size={15} className="text-gold-500" />
                <span>{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          OVERVIEW — Two solution cards
      ════════════════════════════════════════════════ */}
      <section className="section-padding bg-cream-50">
        <div className="container-lg">
          <SectionHeader
            badge="Nos solutions"
            title="Deux offres, un seul objectif"
            subtitle="Digitalisez votre relation client ou votre image professionnelle avec des solutions simples et modernes."
          />

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Loyalty card */}
            <motion.a
              href="#fidelite"
              {...fadeUp(0.05)}
              className="group block bg-white rounded-2xl border border-neutral-200/60 shadow-glass p-8 hover:shadow-glass-lg hover:border-neutral-300/60 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-neutral-950 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                <CreditCard size={22} className="text-white" />
              </div>
              <h3 className="font-playfair text-xl text-neutral-950 mb-3">
                Carte de fidélité digitale
              </h3>
              <p className="text-neutral-500 text-sm leading-relaxed mb-5">
                Offrez à vos clients une carte de fidélité accessible par QR code, sans
                application à télécharger. Gérez vos points ou tampons depuis une interface
                simple.
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 group-hover:gap-2.5 transition-all duration-200">
                Voir l'offre <ArrowRight size={15} />
              </div>
            </motion.a>

            {/* NFC card */}
            <motion.a
              href="#nfc"
              {...fadeUp(0.1)}
              className="group block bg-white rounded-2xl border border-neutral-200/60 shadow-glass p-8 hover:shadow-glass-lg hover:border-neutral-300/60 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                <Wifi size={22} className="text-white" />
              </div>
              <h3 className="font-playfair text-xl text-neutral-950 mb-3">
                Carte NFC professionnelle
              </h3>
              <p className="text-neutral-500 text-sm leading-relaxed mb-5">
                Partagez instantanément vos coordonnées, réseaux sociaux, site web ou portfolio
                d'un simple geste ou scan. La carte de visite nouvelle génération.
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 group-hover:gap-2.5 transition-all duration-200">
                Voir l'offre <ArrowRight size={15} />
              </div>
            </motion.a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SECTION 2 — Carte de fidélité
      ════════════════════════════════════════════════ */}
      <section id="fidelite" className="section-padding bg-white">
        <div className="container-lg">
          <SectionHeader
            badge="Carte de fidélité digitale"
            title={"Fidélisez vos clients\nsans carte plastique"}
            subtitle="Une solution simple, moderne et sans application à télécharger pour digitaliser votre programme de fidélité."
          />

          <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-start">
            {/* Left — Targets + Features */}
            <motion.div {...fadeUp(0.05)} className="space-y-10">
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">
                  Pour qui ?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {LOYALTY_TARGETS.map((target) => (
                    <div
                      key={target.label}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-cream-50 border border-neutral-200/60 text-center"
                    >
                      <span className="text-2xl">{target.icon}</span>
                      <span className="text-xs font-medium text-neutral-700 leading-tight">
                        {target.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">
                  Fonctionnalités incluses
                </p>
                <div className="space-y-3">
                  {LOYALTY_FEATURES.map((f) => (
                    <FeatureItem key={f} text={f} />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right — Pricing cards */}
            <motion.div {...fadeUp(0.1)} className="space-y-4">
              {/* Basic */}
              <div className="bg-cream-50 rounded-2xl border border-neutral-200/60 p-8">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h3 className="font-semibold text-neutral-950 mb-1">
                      Carte fidélité digitale
                    </h3>
                    <p className="text-sm text-neutral-500">Sans options · Paiement unique</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-playfair text-3xl text-neutral-950 font-semibold">
                      100 €
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5 mb-7">
                  {[
                    'Carte fidélité digitale personnalisée',
                    'QR code client + système de points ou tampons',
                    'Interface commerçant complète',
                    'Accès mobile sans application',
                  ].map((text) => (
                    <FeatureItem key={text} text={text} />
                  ))}
                </div>
                <a href="#devis">
                  <Button variant="outline" size="md" className="w-full">
                    Demander un devis
                  </Button>
                </a>
              </div>

              {/* With notifications — premium card */}
              <div className="bg-neutral-950 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(184,151,62,0.12),transparent)]" />
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-semibold tracking-wide">
                    Recommandé
                  </span>
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h3 className="font-semibold text-white mb-1">
                        Carte fidélité digitale
                      </h3>
                      <p className="text-sm text-neutral-400">Avec notifications client</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-playfair text-3xl text-white font-semibold">
                        120 €
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2.5 mb-7">
                    {[
                      "Tout inclus dans l'offre de base",
                      'Notifications push/SMS pour vos clients',
                      'Campagnes de fidélisation ciblées',
                      'Alertes de récompenses automatiques',
                    ].map((text) => (
                      <FeatureItem key={text} text={text} dark />
                    ))}
                  </div>
                  <a href="#devis">
                    <Button variant="gold" size="md" className="w-full">
                      Demander un devis
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SECTION 3 — Carte NFC
      ════════════════════════════════════════════════ */}
      <section id="nfc" className="section-padding bg-cream-50">
        <div className="container-lg">
          <SectionHeader
            badge="Carte NFC pour commerciaux"
            title={"La carte de visite\nnouvelle génération"}
            subtitle="Partagez vos coordonnées d'un simple geste. Plus de cartes papier perdues, votre profil toujours à jour."
          />

          <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-start">
            {/* Left — Pricing table */}
            <motion.div {...fadeUp(0.05)} className="space-y-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-6">
                Tarifs
              </p>

              <div className="space-y-3">
                {NFC_PRICING.map((item) => (
                  <div
                    key={item.quantity}
                    className={cn(
                      'flex items-center justify-between px-6 py-4 rounded-xl border transition-all',
                      item.highlight
                        ? 'bg-neutral-950 border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.20)]'
                        : 'bg-white border-neutral-200/60 shadow-glass'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.highlight && (
                        <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0" />
                      )}
                      <span
                        className={cn(
                          'font-medium text-sm',
                          item.highlight ? 'text-white' : 'text-neutral-900'
                        )}
                      >
                        {item.quantity}
                      </span>
                      {item.highlight && (
                        <span className="px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 text-xs font-medium">
                          Populaire
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'font-playfair text-xl font-semibold',
                        item.highlight ? 'text-gold-400' : 'text-neutral-950'
                      )}
                    >
                      {item.price}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed pt-1">
                * Pour les commandes supérieures à 25 cartes, un devis personnalisé est réalisé
                manuellement. Contactez-nous via le formulaire ci-dessous.
              </p>

              <div className="pt-2">
                <a href="#devis">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto"
                    iconRight={<ArrowRight size={17} />}
                  >
                    Demander un devis
                  </Button>
                </a>
              </div>
            </motion.div>

            {/* Right — Targets + Features */}
            <motion.div {...fadeUp(0.1)} className="space-y-10">
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">
                  Idéal pour
                </p>
                <div className="flex flex-wrap gap-2">
                  {NFC_TARGETS.map((label) => (
                    <span
                      key={label}
                      className="px-3 py-1.5 rounded-full bg-white border border-neutral-200/60 text-sm text-neutral-700 shadow-glass"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">
                  Ce qui est inclus
                </p>
                <div className="space-y-3">
                  {NFC_FEATURES.map((f) => (
                    <FeatureItem key={f} text={f} />
                  ))}
                </div>
              </div>

              {/* NFC visual hint */}
              <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-glass p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center shrink-0">
                  <QrCode size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 text-sm mb-1">
                    QR code + NFC inclus
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Compatible avec tous les smartphones. Fonctionne même sans NFC activé grâce
                    au QR code de secours.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SECTION 4 — Quote form
      ════════════════════════════════════════════════ */}
      <section id="devis" className="section-padding bg-white">
        <div className="container-lg">
          <SectionHeader
            badge="Demande de devis"
            title={"Recevoir un devis\npersonnalisé"}
            subtitle="Remplissez ce formulaire et nous vous contactons rapidement avec une proposition adaptée à vos besoins."
          />

          <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              {submitStatus === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white rounded-2xl border border-green-200 shadow-glass p-12 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={28} className="text-green-600" />
                  </div>
                  <h3 className="font-playfair text-2xl text-neutral-950 mb-3">
                    Demande envoyée !
                  </h3>
                  <p className="text-neutral-500 leading-relaxed mb-8 max-w-sm mx-auto">
                    Votre demande de devis a bien été reçue. Nous vous contacterons dans les
                    meilleurs délais avec une proposition personnalisée.
                  </p>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setSubmitStatus('idle')}
                  >
                    Envoyer une nouvelle demande
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  onSubmit={handleSubmit}
                  className="bg-white rounded-2xl border border-neutral-200/60 shadow-glass p-8 md:p-10 space-y-6"
                >
                  {/* Row 1: Name + Company */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <InputField label="Nom / Prénom" required>
                      <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        required
                        placeholder="Jean Dupont"
                        className={inputClass}
                      />
                    </InputField>
                    <InputField label="Nom de l'entreprise">
                      <input
                        type="text"
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        placeholder="Mon Commerce"
                        className={inputClass}
                      />
                    </InputField>
                  </div>

                  {/* Row 2: Email + Phone */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <InputField label="Email" required>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="contact@example.com"
                        className={inputClass}
                      />
                    </InputField>
                    <InputField label="Téléphone">
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+33 6 00 00 00 00"
                        className={inputClass}
                      />
                    </InputField>
                  </div>

                  {/* Need type */}
                  <InputField label="Type de besoin" required>
                    <div className="relative">
                      <select
                        name="needType"
                        value={form.needType}
                        onChange={handleChange}
                        required
                        className={cn(inputClass, 'appearance-none pr-10 cursor-pointer')}
                      >
                        <option value="">Sélectionnez votre besoin</option>
                        {NEED_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {/* Chevron */}
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                        <svg
                          className="w-4 h-4 text-neutral-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </InputField>

                  {/* Card count — shown only for NFC types */}
                  <AnimatePresence>
                    {isNfcType && (
                      <motion.div
                        key="cardCount"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: undefined }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <InputField label="Nombre de cartes souhaitées">
                          <input
                            type="number"
                            name="cardCount"
                            value={form.cardCount}
                            onChange={handleChange}
                            min="1"
                            placeholder="Ex : 5"
                            className={inputClass}
                          />
                        </InputField>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Notification option */}
                  <InputField label="Option notifications client">
                    <div className="flex gap-6 pt-1">
                      {['Oui', 'Non'].map((opt) => (
                        <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="notificationOption"
                            value={opt}
                            checked={form.notificationOption === opt}
                            onChange={handleChange}
                            className="w-4 h-4 accent-neutral-950 cursor-pointer"
                          />
                          <span className="text-sm text-neutral-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </InputField>

                  {/* Message */}
                  <InputField label="Message / Précisions">
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Décrivez votre projet, vos contraintes, vos questions..."
                      className={cn(inputClass, 'resize-none')}
                    />
                  </InputField>

                  {/* Error */}
                  <AnimatePresence>
                    {submitStatus === 'error' && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200"
                      >
                        <AlertCircle
                          size={18}
                          className="text-red-500 shrink-0 mt-0.5"
                        />
                        <p className="text-sm text-red-700">{errorMessage}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={submitting}
                    className="w-full"
                  >
                    Envoyer ma demande
                  </Button>

                  <p className="text-xs text-neutral-400 text-center">
                    Vos données sont utilisées uniquement pour répondre à votre demande de devis.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SECTION 5 — Reassurance
      ════════════════════════════════════════════════ */}
      <section className="section-padding bg-neutral-950">
        <div className="container-lg">
          <SectionHeader
            badge="Pourquoi nous choisir"
            title="Simple, efficace, personnalisé"
            subtitle="Des solutions pensées pour les professionnels qui veulent moderniser leur image sans complexité technique."
            dark
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {REASSURANCE_ITEMS.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp(i * 0.05)}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center mb-4">
                  <item.icon size={20} className="text-gold-400" />
                </div>
                <h3 className="font-semibold text-white mb-2 leading-tight text-sm">
                  {item.title}
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div {...fadeUp(0.3)} className="mt-16 text-center">
            <a href="#devis">
              <Button
                variant="gold"
                size="xl"
                icon={<Briefcase size={18} />}
                iconRight={<ArrowRight size={18} />}
              >
                Demander un devis gratuit
              </Button>
            </a>
            <p className="text-neutral-500 text-sm mt-4">
              Réponse garantie sous 48 h · Sans engagement
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
