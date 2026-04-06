'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { QuestionnaireData, SocialLink } from '@/types'
import { isValidEmail } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { MAX_CHAT_ATTACHMENT_SIZE_MB, MAX_CHAT_ATTACHMENTS, isUploadSizeAllowed, toUploadPayload } from '@/lib/uploads'

interface Props {
  open: boolean
  onClose: () => void
  onComplete: (data: QuestionnaireData) => void
}

const TOTAL_STEPS = 4

const COLOR_PALETTES = [
  {
    id: 'obsidian',
    label: 'Obsidian Gold',
    description: 'Noir dense, ivoire chaud, or maîtrisé.',
    preview: ['#101010', '#F4F0E8', '#B8973E'],
    gradient: 'from-neutral-950 via-neutral-800 to-stone-600',
  },
  {
    id: 'graphite',
    label: 'Graphite Blue',
    description: 'Anthracite, gris clair, bleu professionnel.',
    preview: ['#1F2937', '#E5E7EB', '#2563EB'],
    gradient: 'from-slate-900 via-slate-700 to-blue-600',
  },
  {
    id: 'aurora',
    label: 'Aurora Sage',
    description: 'Vert sauge, crème minérale, vert forêt.',
    preview: ['#E8EFE8', '#4F6F52', '#1F3D2B'],
    gradient: 'from-emerald-50 via-emerald-200 to-emerald-600',
  },
  {
    id: 'sandstone',
    label: 'Sandstone Copper',
    description: 'Beige pierre, brun chaud, cuivre discret.',
    preview: ['#F1E8DC', '#7C5C46', '#C9844B'],
    gradient: 'from-orange-50 via-amber-200 to-orange-500',
  },
  {
    id: 'navy',
    label: 'Maison Beige',
    description: 'Beige luxe, sable clair, espresso profond.',
    preview: ['#E9DDCC', '#F8F3EA', '#35261D'],
    gradient: 'from-stone-200 via-amber-100 to-stone-800',
  },
  {
    id: 'platinum',
    label: 'Platinum Ash',
    description: 'Gris perle, blanc froid, noir élégant.',
    preview: ['#F3F4F6', '#9CA3AF', '#18181B'],
    gradient: 'from-zinc-100 via-zinc-300 to-zinc-700',
  },
  {
    id: 'burgundy',
    label: 'Burgundy Signature',
    description: 'Bordeaux profond, sable clair, moka.',
    preview: ['#5B1F2A', '#F3E9E2', '#7A5C58'],
    gradient: 'from-rose-950 via-rose-700 to-stone-500',
  },
  {
    id: 'teal',
    label: 'Soft Impact',
    description: 'Gris clair, beige premium, noir profond.',
    preview: ['#E7E5E4', '#E8D8C3', '#171717'],
    gradient: 'from-stone-200 via-neutral-100 to-neutral-900',
  },
] as const

const SITE_STYLES = ['minimal', 'creative', 'futuristic'] as const

const SOCIAL_OPTIONS = [
  { id: 'linkedin', label: 'LinkedIn', icon: '/reseaux/linkedin.png' },
  { id: 'instagram', label: 'Instagram', icon: '/reseaux/instagram.png' },
  { id: 'gmail', label: 'Email', icon: '/reseaux/gmail.png' },
  { id: 'snapchat', label: 'Snapchat', icon: '/reseaux/snapchat.png' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '/reseaux/whatsaap.png' },
  { id: 'other', label: 'Autre', icon: null },
] as const

const MOTIVATION_OPTIONS = [
  'Me différencier des autres',
  'Augmenter ma présence numérique',
  'Renforcer mon image professionnelle',
  'Partager mon profil plus facilement',
  'Mieux valoriser mon parcours',
  'Autre',
] as const

const OTHER_SOCIAL_PREFIX = 'other:'

const emptySocial = (): SocialLink => ({ name: '', url: '' })

const emptyForm = (): QuestionnaireData => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  profession: '',
  seekingJob: null,
  positionsSearched: [''],
  motivations: [],
  motivationOther: '',
  colorPalette: '',
  siteStyle: '',
  customRequestEnabled: null,
  customRequest: '',
  socialLinks: [emptySocial()],
  cvLink: '',
  photoLink: '',
  extraLink: '',
  cvFile: null,
  photoFile: null,
  extraFiles: [],
  authorization: false,
})

export function QuestionnaireModal({ open, onClose, onComplete }: Props) {
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<QuestionnaireData>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const stepTopRef = useRef<HTMLDivElement | null>(null)
  const tq = t.cart.questionnaire

  const update = <K extends keyof QuestionnaireData>(key: K, value: QuestionnaireData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const inputClass = (hasError?: boolean) =>
    cn(
      'w-full rounded-2xl border bg-white/85 px-4 py-3.5 text-sm text-neutral-900 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] placeholder:text-neutral-400 transition-all',
      'focus:outline-none focus:ring-2 focus:ring-neutral-950/10',
      hasError ? 'border-red-300 focus:border-red-300' : 'border-neutral-200/80 focus:border-neutral-300'
    )

  function resetModal() {
    setStep(1)
    setData(emptyForm())
    setErrors({})
    onClose()
  }

  function updatePosition(index: number, value: string) {
    setData((prev) => {
      const next = [...prev.positionsSearched]
      next[index] = value
      return { ...prev, positionsSearched: next }
    })
    setErrors((prev) => ({ ...prev, positionsSearched: undefined }))
  }

  function addPosition() {
    setData((prev) => ({ ...prev, positionsSearched: [...prev.positionsSearched, ''] }))
  }

  function removePosition(index: number) {
    if (data.positionsSearched.length <= 1) return
    setData((prev) => ({
      ...prev,
      positionsSearched: prev.positionsSearched.filter((_, i) => i !== index),
    }))
  }

  function toggleMotivation(value: string) {
    const exists = data.motivations.includes(value)
    const next = exists
      ? data.motivations.filter((item) => item !== value)
      : [...data.motivations, value]
    update('motivations', next)
    if (value === 'Autre' && exists) {
      update('motivationOther', '')
    }
  }

  function addSocial() {
    setData((prev) => {
      const sharedName = prev.socialLinks[0]?.name || ''
      return { ...prev, socialLinks: [...prev.socialLinks, { name: sharedName, url: '' }] }
    })
  }

  function removeSocial(index: number) {
    if (data.socialLinks.length <= 1) return
    setData((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }))
  }

  function updateSocial(index: number, patch: Partial<SocialLink>) {
    setData((prev) => {
      const next = [...prev.socialLinks]
      if (index === 0 && Object.prototype.hasOwnProperty.call(patch, 'name')) {
        const sharedName = patch.name ?? ''
        return {
          ...prev,
          socialLinks: next.map((link) => ({
            ...link,
            name: sharedName,
          })),
        }
      }
      next[index] = { ...next[index], ...patch }
      return { ...prev, socialLinks: next }
    })
  }

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      stepTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, step])

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    key: 'cvLink' | 'photoLink' | 'extraLink'
  ) {
    const files = Array.from(event.target.files || [])

    if (key === 'extraLink') {
      if (!files.length) {
        update('extraLink', '')
        update('extraFiles', [])
        return
      }

      const validFiles = files
        .slice(0, MAX_CHAT_ATTACHMENTS)
        .filter((file) => isUploadSizeAllowed(file, MAX_CHAT_ATTACHMENT_SIZE_MB))

      try {
        const payloads = await Promise.all(validFiles.map(toUploadPayload))
        update('extraLink', validFiles.map((file) => file.name).join(' | '))
        update('extraFiles', payloads)
      } catch (err) {
        console.error('[Questionnaire] Erreur lecture fichiers extra:', err)
        update('extraLink', '')
        update('extraFiles', [])
      }
      return
    }

    const file = files[0]
    const uploadKey = key === 'cvLink' ? 'cvFile' : 'photoFile'

    if (!file) {
      update(key, '')
      update(uploadKey, null)
      return
    }

    try {
      const payload = await toUploadPayload(file)
      update(key, file.name)
      update(uploadKey, payload)
    } catch (err) {
      console.error('[Questionnaire] Erreur lecture fichier:', err)
      update(key, '')
      update(uploadKey, null)
    }
  }

  function validate(currentStep: number) {
    const nextErrors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!data.lastName.trim()) nextErrors.lastName = tq.required
      if (!data.firstName.trim()) nextErrors.firstName = tq.required
      if (!isValidEmail(data.email)) nextErrors.email = tq.fields.emailError
      if (data.password.trim().length < 6) nextErrors.password = 'Le mot de passe doit contenir au moins 6 caractères.'
      if (!data.profession.trim()) nextErrors.profession = tq.required
      if (data.seekingJob === null) nextErrors.seekingJob = tq.required
      if (data.seekingJob && !data.positionsSearched.some((value) => value.trim())) {
        nextErrors.positionsSearched = tq.required
      }
      if (!data.motivations.length) nextErrors.motivations = tq.required
      if (data.motivations.includes('Autre') && !data.motivationOther.trim()) {
        nextErrors.motivationOther = tq.required
      }
    }

    if (currentStep === 2) {
      if (!data.colorPalette) nextErrors.colorPalette = tq.required
      if (!data.siteStyle) nextErrors.siteStyle = tq.required
      if (data.customRequestEnabled && !data.customRequest.trim()) {
        nextErrors.customRequest = tq.required
      }
    }

    if (currentStep === 3) {
      if (!data.cvLink.trim()) nextErrors.cvLink = tq.required
      if (!data.photoLink.trim()) nextErrors.photoLink = tq.required
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function next() {
    if (!validate(step)) return
    if (step < TOTAL_STEPS) setStep((prev) => prev + 1)
  }

  function back() {
    if (step > 1) setStep((prev) => prev - 1)
  }

  function submit() {
    if (!validate(step)) return
    onComplete(data)
    onClose()
  }

  const summaryRows = [
    { label: tq.fields.lastName, value: data.lastName || '—' },
    { label: tq.fields.firstName, value: data.firstName || '—' },
    { label: tq.fields.email, value: data.email || '—' },
    { label: 'Mot de passe', value: data.password ? '••••••••' : '—' },
    { label: tq.fields.profession, value: data.profession || '—' },
    { label: 'Recherche d’emploi', value: data.seekingJob === null ? '—' : data.seekingJob ? 'Oui' : 'Non' },
    { label: tq.fields.positions, value: data.seekingJob ? data.positionsSearched.filter(Boolean).join(', ') || '—' : 'Non concerné' },
    { label: 'Objectif du E-CV', value: data.motivations.join(', ') || '—' },
    { label: tq.fields.color, value: COLOR_PALETTES.find((palette) => palette.id === data.colorPalette)?.label || '—' },
    { label: tq.fields.style, value: (tq.styles as Record<string, { name: string }>)[data.siteStyle]?.name || '—' },
    { label: 'Requête particulière', value: data.customRequestEnabled ? data.customRequest || 'Oui' : 'Non' },
    { label: tq.fields.socials, value: data.socialLinks.filter((item) => item.url.trim()).map((item) => getSocialSelection(item.name) === 'other' ? getCustomSocialLabel(item.name) || 'Autre' : SOCIAL_OPTIONS.find((option) => option.id === item.name)?.label || item.name).join(', ') || '—' },
    { label: tq.fields.cvLink, value: data.cvLink || '—' },
    { label: tq.fields.photoLink, value: data.photoLink || '—' },
    { label: tq.fields.extraLink, value: data.extraLink || '—' },
  ]

  return (
    <Modal open={open} onClose={resetModal} size="xl">
      <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(250,247,240,0.98))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(184,151,62,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_32%)]" />
        <div className="relative p-6 md:p-8 space-y-8">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                  Questionnaire sur mesure
                </p>
                <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
                  Construisons un E-CV précis, crédible et vraiment différenciant.
                </h2>
              </div>
              <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-neutral-950 text-white shadow-xl">
                <Sparkles size={22} />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/80 bg-white/70 px-5 py-4 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                <span>Étape {step} sur {TOTAL_STEPS}</span>
                <span>{[
                  'Profil & objectif',
                  'Direction créative',
                  'Réseaux & pièces jointes',
                  'Validation finale',
                ][step - 1]}</span>
              </div>
              <div className="mt-3 flex gap-2">
                {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-2 flex-1 rounded-full transition-all duration-300',
                      index < step ? 'bg-neutral-950' : 'bg-neutral-200'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-6"
            >
              <div ref={stepTopRef} />
              {step === 1 && (
                <div className="space-y-6">
                  <SectionCard
                    title="Identité du client"
                    subtitle="On pose une base propre pour la commande, l’espace “Mon site” et la première maquette."
                    icon={<UserRound size={18} />}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={tq.fields.lastName} required error={errors.lastName}>
                        <input
                          className={inputClass(!!errors.lastName)}
                          placeholder={tq.fields.lastNamePlaceholder}
                          value={data.lastName}
                          onChange={(event) => update('lastName', event.target.value)}
                        />
                      </Field>
                      <Field label={tq.fields.firstName} required error={errors.firstName}>
                        <input
                          className={inputClass(!!errors.firstName)}
                          placeholder={tq.fields.firstNamePlaceholder}
                          value={data.firstName}
                          onChange={(event) => update('firstName', event.target.value)}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={tq.fields.email} required error={errors.email}>
                        <input
                          type="email"
                          className={inputClass(!!errors.email)}
                          placeholder={tq.fields.emailPlaceholder}
                          value={data.email}
                          onChange={(event) => update('email', event.target.value)}
                        />
                      </Field>
                      <Field
                        label="Mot de passe"
                        required
                        hint="Créez un mot de passe pour pouvoir accéder à la maquette de votre E-CV dans “Mon site” avant validation finale."
                        error={errors.password}
                      >
                        <input
                          type="password"
                          className={inputClass(!!errors.password)}
                          placeholder="Choisissez un mot de passe"
                          value={data.password}
                          onChange={(event) => update('password', event.target.value)}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={tq.fields.profession} required error={errors.profession}>
                        <input
                          className={inputClass(!!errors.profession)}
                          placeholder={tq.fields.professionPlaceholder}
                          value={data.profession}
                          onChange={(event) => update('profession', event.target.value)}
                        />
                      </Field>

                      <Field label="Êtes-vous à la recherche d’un emploi ?" required error={errors.seekingJob}>
                        <ToggleChoice
                          value={data.seekingJob}
                          onChange={(value) => update('seekingJob', value)}
                          labels={['Oui', 'Non']}
                        />
                      </Field>
                    </div>

                    {data.seekingJob ? (
                      <div className="space-y-3 rounded-[1.5rem] border border-neutral-200/70 bg-neutral-50/70 p-4">
                        <Field
                          label={tq.fields.positions}
                          required
                          hint="Ajoutez un ou plusieurs postes visés."
                          error={errors.positionsSearched}
                        >
                          <div className="space-y-3">
                            {data.positionsSearched.map((value, index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  className={inputClass(!!errors.positionsSearched && index === 0)}
                                  placeholder={tq.fields.positionsPlaceholder}
                                  value={value}
                                  onChange={(event) => updatePosition(index, event.target.value)}
                                />
                                {data.positionsSearched.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => removePosition(index)}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-400 transition hover:border-red-200 hover:text-red-500"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                ) : null}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={addPosition}
                              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
                            >
                              <Plus size={14} />
                              {tq.fields.addPosition}
                            </button>
                          </div>
                        </Field>
                      </div>
                    ) : null}
                  </SectionCard>

                  <SectionCard
                    title="Objectif du E-CV"
                    subtitle="Plus tu es clair sur l’intention, plus le rendu sera juste."
                    icon={<Briefcase size={18} />}
                  >
                    <Field
                      label="Pourquoi voulez-vous un E-CV ?"
                      required
                      hint="Choix multiple autorisé."
                      error={errors.motivations}
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        {MOTIVATION_OPTIONS.map((option) => {
                          const selected = data.motivations.includes(option)
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleMotivation(option)}
                              className={cn(
                                'rounded-[1.25rem] border px-4 py-3 text-left text-sm transition',
                                selected
                                  ? 'border-neutral-950 bg-neutral-950 text-white shadow-lg'
                                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                              )}
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>
                    </Field>

                    {data.motivations.includes('Autre') ? (
                      <Field label="Précisez votre autre objectif" required error={errors.motivationOther}>
                        <textarea
                          className={cn(inputClass(!!errors.motivationOther), 'min-h-[110px] resize-none')}
                          placeholder="Expliquez brièvement votre objectif spécifique."
                          value={data.motivationOther}
                          onChange={(event) => update('motivationOther', event.target.value)}
                        />
                      </Field>
                    ) : null}
                  </SectionCard>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <SectionCard
                    title="Direction visuelle"
                    subtitle="Choisissez une base graphique sérieuse, élégante et cohérente avec votre profil."
                    icon={<Sparkles size={18} />}
                  >
                    <Field label={tq.fields.color} required hint="8 palettes sérieuses, pensées pour rester crédibles sur un E-CV." error={errors.colorPalette}>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {COLOR_PALETTES.map((palette) => {
                          const selected = data.colorPalette === palette.id
                          return (
                            <button
                              key={palette.id}
                              type="button"
                              onClick={() => update('colorPalette', palette.id)}
                              className={cn(
                                'relative overflow-hidden rounded-[1.5rem] border bg-white p-4 text-left transition',
                                selected
                                  ? 'border-neutral-950 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.55)]'
                                  : 'border-neutral-200 hover:border-neutral-300'
                              )}
                            >
                              <div className={cn('h-16 rounded-2xl bg-gradient-to-r', palette.gradient)} />
                              <div className="mt-3 flex gap-2">
                                {palette.preview.map((color) => (
                                  <span
                                    key={color}
                                    className="h-5 w-5 rounded-full border border-white/80 shadow-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                              <p className="mt-3 text-sm font-semibold text-neutral-900">{palette.label}</p>
                              <p className="mt-1 text-xs leading-relaxed text-neutral-500">{palette.description}</p>
                              {selected ? (
                                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-950 text-white">
                                  <Check size={12} strokeWidth={3} />
                                </span>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => update('colorPalette', 'surprise')}
                        className={cn(
                          'mt-4 flex w-full items-center justify-center gap-3 rounded-[1.5rem] border px-4 py-4 text-sm font-semibold transition',
                          data.colorPalette === 'surprise'
                            ? 'border-neutral-950 bg-neutral-950 text-white'
                            : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
                        )}
                      >
                        <CircleHelp size={18} />
                        Je ne sais pas, impressionnez-moi ! 🤷‍♂️
                      </button>
                    </Field>

                    <Field label={tq.fields.style} required hint="On garde la même logique, avec un libellé plus clair." error={errors.siteStyle}>
                      <div className="grid gap-3 md:grid-cols-3">
                        {SITE_STYLES.map((styleId) => {
                          const info = (tq.styles as Record<string, { name: string; description: string }>)[styleId]
                          const selected = data.siteStyle === styleId
                          return (
                            <button
                              key={styleId}
                              type="button"
                              onClick={() => update('siteStyle', styleId)}
                              className={cn(
                                'rounded-[1.5rem] border p-4 text-left transition',
                                selected
                                  ? 'border-neutral-950 bg-neutral-950 text-white'
                                  : 'border-neutral-200 bg-white hover:border-neutral-300'
                              )}
                            >
                              <p className={cn('text-sm font-semibold', selected ? 'text-white' : 'text-neutral-900')}>
                                {info?.name}
                              </p>
                              <p className={cn('mt-1 text-xs leading-relaxed', selected ? 'text-white/75' : 'text-neutral-500')}>
                                {info?.description}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </Field>
                  </SectionCard>

                  <SectionCard
                    title="Requête particulière"
                    subtitle="C’est ici que le client peut orienter la création au-delà du cadre standard."
                    icon={<CircleHelp size={18} />}
                  >
                    <Field label="Avez-vous une requête particulière concernant votre création de E-CV ?" required error={errors.customRequestEnabled}>
                      <ToggleChoice
                        value={data.customRequestEnabled}
                        onChange={(value) => update('customRequestEnabled', value)}
                        labels={['Oui', 'Non']}
                      />
                    </Field>

                    {data.customRequestEnabled ? (
                      <Field label="Précisez votre demande" required error={errors.customRequest}>
                        <textarea
                          className={cn(inputClass(!!errors.customRequest), 'min-h-[140px] resize-none')}
                          placeholder="Exemple : insister sur votre dimension internationale, intégrer une ambiance plus corporate, éviter un ton trop créatif, mettre davantage vos résultats en avant..."
                          value={data.customRequest}
                          onChange={(event) => update('customRequest', event.target.value)}
                        />
                      </Field>
                    ) : null}
                  </SectionCard>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <SectionCard
                    title="Réseaux & visibilité"
                    subtitle="Choisissez les profils à intégrer, avec une sélection plus rapide et plus visuelle."
                    icon={<Briefcase size={18} />}
                  >
                    <Field label={tq.fields.socials} hint="Ajoutez un ou plusieurs liens. Si vous choisissez “Autre”, précisez le nom du réseau." >
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          {SOCIAL_OPTIONS.map((option) => {
                            const selected = getSocialSelection(data.socialLinks[0]?.name) === option.id
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => updateSocial(0, { name: option.id === 'other' ? `${OTHER_SOCIAL_PREFIX}` : option.id })}
                                className={cn(
                                  'flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition',
                                  selected
                                    ? 'border-neutral-950 bg-neutral-950 text-white'
                                    : 'border-neutral-200 hover:border-neutral-300'
                                )}
                              >
                                {option.icon ? (
                                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90">
                                    <Image src={option.icon} alt={option.label} width={20} height={20} />
                                  </span>
                                ) : (
                                  <span className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold',
                                    selected ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-700'
                                  )}>
                                    ?
                                  </span>
                                )}
                                <span className="text-sm font-medium">{option.label}</span>
                              </button>
                            )
                          })}
                        </div>

                        {getSocialSelection(data.socialLinks[0]?.name) === 'other' ? (
                          <input
                            className={inputClass()}
                            placeholder="Nom du réseau"
                            value={getCustomSocialLabel(data.socialLinks[0]?.name)}
                            onChange={(event) => updateSocial(0, { name: `${OTHER_SOCIAL_PREFIX}${event.target.value}` })}
                          />
                        ) : null}

                        {data.socialLinks.map((link, index) => (
                          <div key={index} className="rounded-[1.5rem] border border-neutral-200 bg-white p-4">
                            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_48px]">
                              <div className="flex items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-medium text-neutral-600">
                                {getSocialSelection(link.name) === 'other'
                                  ? getCustomSocialLabel(link.name) || 'Autre'
                                  : SOCIAL_OPTIONS.find((option) => option.id === getSocialSelection(link.name))?.label || 'Sélectionnez un réseau'}
                              </div>

                              <input
                                className={inputClass()}
                                placeholder={tq.fields.socialUrl}
                                value={link.url}
                                onChange={(event) => updateSocial(index, { url: event.target.value })}
                              />

                              {data.socialLinks.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => removeSocial(index)}
                                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-400 transition hover:border-red-200 hover:text-red-500"
                                >
                                  <Trash2 size={15} />
                                </button>
                              ) : (
                                <div />
                              )}
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addSocial}
                          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-900"
                        >
                          <Plus size={14} />
                          {tq.fields.addSocial}
                        </button>
                      </div>
                    </Field>
                  </SectionCard>

                  <SectionCard
                    title="Pièces jointes"
                    subtitle="Plus les documents sont propres et complets, plus le E-CV final sera convaincant."
                    icon={<Paperclip size={18} />}
                  >
                    <Field
                      label={tq.fields.cvLink}
                      required
                      hint="Les différentes expériences professionnelles doivent être détaillées sur le CV ou sur un document supplémentaire joint."
                      error={errors.cvLink}
                    >
                      <UploadField
                        value={data.cvLink}
                        placeholder={tq.fields.noFile}
                        accept=".pdf,.doc,.docx"
                        onChange={(event) => handleFileChange(event, 'cvLink')}
                        hasError={!!errors.cvLink}
                      />
                    </Field>

                    <Field
                      label={tq.fields.photoLink}
                      required
                      hint="Choisissez une photo propre, nette et exploitable sur desktop comme sur mobile."
                      error={errors.photoLink}
                    >
                      <UploadField
                        value={data.photoLink}
                        placeholder={tq.fields.noFile}
                        accept=".png,.jpg,.jpeg,.webp"
                        onChange={(event) => handleFileChange(event, 'photoLink')}
                        hasError={!!errors.photoLink}
                      />
                    </Field>

                    <Field
                      label={tq.fields.extraLink}
                      hint={`Si une entreprise n’a pas de logo disponible sur le web, ajoutez-le ici au format “logoNomEntreprise.png”. ${MAX_CHAT_ATTACHMENTS} fichiers max · ${MAX_CHAT_ATTACHMENT_SIZE_MB} MB max par fichier.`}
                    >
                      <UploadField
                        value={data.extraLink}
                        placeholder={tq.fields.noFile}
                        multiple
                        onChange={(event) => handleFileChange(event, 'extraLink')}
                      />
                    </Field>
                  </SectionCard>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <SectionCard
                    title="Récapitulatif final"
                    subtitle="Vérifiez les informations clés avant validation. Ce récap s’actualise selon les choix effectués."
                    icon={<Check size={18} />}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      {summaryRows.map(({ label, value }) => (
                        <div key={label} className="rounded-[1.25rem] border border-neutral-200 bg-white px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">{label}</p>
                          <p className="mt-1 text-sm font-medium text-neutral-800 break-words">{value}</p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Autorisation d’affichage"
                    subtitle="Optionnelle. Si vous refusez, votre E-CV restera confidentiel."
                    icon={<Briefcase size={18} />}
                  >
                    <button
                      type="button"
                      onClick={() => update('authorization', !data.authorization)}
                      className={cn(
                        'flex w-full items-start gap-4 rounded-[1.5rem] border p-5 text-left transition',
                        data.authorization
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-200 bg-white text-neutral-800'
                      )}
                    >
                      <span className={cn(
                        'mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border-2',
                        data.authorization
                          ? 'border-white bg-white text-neutral-950'
                          : 'border-neutral-300'
                      )}>
                        {data.authorization ? <Check size={13} strokeWidth={3} /> : null}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{tq.fields.authorization}</span>
                        <span className={cn('mt-1 block text-xs leading-relaxed', data.authorization ? 'text-white/75' : 'text-neutral-500')}>
                          {tq.fields.authorizationHint}
                        </span>
                      </span>
                    </button>
                  </SectionCard>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between border-t border-neutral-200/80 pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={step === 1 ? resetModal : back}
              icon={step > 1 ? <ChevronLeft size={16} /> : undefined}
            >
              {step > 1 ? tq.back : t.common.close}
            </Button>

            {step < TOTAL_STEPS ? (
              <Button size="md" onClick={next} iconRight={<ChevronRight size={16} />}>
                {tq.next}
              </Button>
            ) : (
              <Button size="md" onClick={submit} icon={<Check size={15} />}>
                {tq.submit}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/90 bg-white/75 p-5 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.45)] backdrop-blur-xl md:p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-neutral-950 text-white shadow-lg">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-neutral-950">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-neutral-500">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
        {label} {required ? <span className="normal-case text-red-400">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-2 text-xs leading-relaxed text-neutral-400">{hint}</p> : null}
      {error ? <Error msg={error} /> : null}
    </div>
  )
}

function ToggleChoice({
  value,
  onChange,
  labels,
}: {
  value: boolean | null
  onChange: (value: boolean) => void
  labels: [string, string]
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[true, false].map((item, index) => {
        const selected = value === item
        return (
          <button
            key={labels[index]}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              'rounded-[1.25rem] border px-4 py-3 text-sm font-semibold transition',
              selected
                ? 'border-neutral-950 bg-neutral-950 text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
            )}
          >
            {labels[index]}
          </button>
        )
      })}
    </div>
  )
}

function UploadField({
  value,
  placeholder,
  accept,
  multiple,
  onChange,
  hasError,
}: {
  value: string
  placeholder: string
  accept?: string
  multiple?: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  hasError?: boolean
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-3 rounded-[1.5rem] border bg-white/80 px-4 py-3.5 transition',
        hasError ? 'border-red-300' : 'border-neutral-200 hover:border-neutral-300'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-neutral-100 text-neutral-500">
          <Paperclip size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-800">Choisir un fichier</p>
          <p className="truncate text-xs text-neutral-400">{value || placeholder}</p>
        </div>
      </div>
      <input type="file" className="hidden" accept={accept} multiple={multiple} onChange={onChange} />
    </label>
  )
}

function Error({ msg }: { msg: string }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
      <AlertCircle size={11} />
      {msg}
    </p>
  )
}
  function getSocialSelection(value: string) {
    if (value.startsWith(OTHER_SOCIAL_PREFIX)) return 'other'
    return value
  }

  function getCustomSocialLabel(value: string) {
    return value.startsWith(OTHER_SOCIAL_PREFIX) ? value.replace(OTHER_SOCIAL_PREFIX, '') : ''
  }
