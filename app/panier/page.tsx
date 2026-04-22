'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle2, ClipboardList, Clock3, ChevronRight, Sparkles } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { CartSummary } from '@/components/cart/CartSummary'
import { QuestionnaireModal } from '@/components/cart/QuestionnaireModal'
import { AppointmentScheduler } from '@/components/cart/AppointmentScheduler'
import { PaymentBlock } from '@/components/cart/PaymentBlock'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GlassCard } from '@/components/ui/GlassCard'
import type { AppointmentSelection, QuestionnaireData } from '@/types'

export default function CartPage() {
  const { t } = useLanguage()
  const [modalOpen, setModalOpen] = useState(false)
  const [questionnaireDone, setQuestionnaireDone] = useState(false)
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null)
  const [appointment, setAppointment] = useState<AppointmentSelection | null>(null)
  const [skipAppointment, setSkipAppointment] = useState(false)

  const handleComplete = (data: QuestionnaireData) => {
    setQuestionnaireData(data)
    setQuestionnaireDone(true)
  }

  return (
    <>
      <div className="min-h-screen bg-cream-50 pt-24 pb-20 relative">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_20%,rgba(200,190,170,0.08),transparent)]" />
        </div>

        <div className="relative mx-auto max-w-7xl overflow-x-hidden px-4 sm:px-6">
          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 space-y-4"
          >
            <Badge>
              <ClipboardList size={11} />
              Commande
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-light tracking-[-0.03em] leading-tight text-neutral-950">
              {t.cart.title}
            </h1>
            <p className="text-neutral-500 max-w-lg leading-relaxed">{t.cart.subtitle}</p>
          </motion.div>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
            {/* Left column */}
            <div className="min-w-0 space-y-6">
              {/* Cart summary */}
              <CartSummary />

              {/* Questionnaire CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                {!questionnaireDone ? (
                  <GlassCard
                    padding="lg"
                    className="cursor-pointer hover:shadow-glass-lg transition-all duration-300"
                    hover
                  >
                    <div
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-5"
                      onClick={() => setModalOpen(true)}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-700 flex items-center justify-center shrink-0 shadow-lg">
                        <ClipboardList size={24} className="text-white" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold text-neutral-900 text-lg tracking-tight">
                          {t.cart.questionnaire.title}
                        </h3>
                        <p className="text-sm text-neutral-500">{t.cart.questionnaire.subtitle}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="gold">
                            <Sparkles size={10} fill="currentColor" />
                            {t.cart.questionnaire.ctaDescription}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="lg"
                        iconRight={<ChevronRight size={17} />}
                        className="shrink-0"
                        onClick={(e) => { e.stopPropagation(); setModalOpen(true) }}
                      >
                        {t.cart.questionnaire.cta}
                      </Button>
                    </div>
                  </GlassCard>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <GlassCard padding="lg" className="border-emerald-200/50 bg-emerald-50/20">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={22} className="text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900">{t.cart.questionnaire.completed}</h3>
                          <p className="text-sm text-neutral-500 mt-1">{t.cart.questionnaire.completedSub}</p>
                          {questionnaireData && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="success">{questionnaireData.firstName} {questionnaireData.lastName}</Badge>
                              {questionnaireData.colorPalette && (
                                <Badge variant="subtle">
                                  {(t.cart.questionnaire.colors as any)[questionnaireData.colorPalette]?.name}
                                </Badge>
                              )}
                              {questionnaireData.siteStyle && (
                                <Badge variant="subtle">
                                  {(t.cart.questionnaire.styles as any)[questionnaireData.siteStyle]?.name}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setModalOpen(true)}
                          className="ml-auto text-xs text-neutral-400 hover:text-neutral-600 underline underline-offset-2 transition-colors shrink-0"
                        >
                          Modifier
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </motion.div>

              {questionnaireDone ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 }}
                  className="space-y-4"
                >
                  {!skipAppointment ? (
                    <>
                      <AppointmentScheduler value={appointment} onChange={setAppointment} />
                      <div className="relative overflow-hidden rounded-[1.8rem] border border-neutral-900/80 bg-neutral-950 text-white shadow-[0_30px_90px_-54px_rgba(15,23,42,0.85)]">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.2),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_55%)]" />
                        <button
                          type="button"
                          onClick={() => { setSkipAppointment(true); setAppointment(null) }}
                          className="relative flex w-full flex-col gap-4 px-6 py-5 text-left transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-neutral-950 shadow-[0_18px_36px_-24px_rgba(212,175,55,0.8)]">
                              <Clock3 size={20} />
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
                                Option flexible
                              </p>
                              <p className="text-lg font-semibold tracking-tight text-white">
                                Prendre mon créneau plus tard
                              </p>
                              <p className="max-w-2xl text-sm leading-relaxed text-white/65">
                                Passez au paiement maintenant et réservez votre rendez-vous Google Meet ensuite depuis votre espace client.
                              </p>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/90 sm:self-center">
                            Continuer
                            <ArrowRight size={15} />
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[2rem] border border-blue-200/60 bg-blue-50/30 backdrop-blur-sm p-6 text-center space-y-3">
                      <p className="text-sm text-blue-700">
                        Vous pourrez réserver votre rendez-vous Google Meet depuis votre <span className="font-medium">espace client</span> après la commande.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSkipAppointment(false)}
                        className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2 transition-colors"
                      >
                        Finalement, je veux choisir un créneau maintenant
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : null}
            </div>

            {/* Right column — payment */}
            <div className="min-w-0">
              <AnimatePresence>
                {questionnaireDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.97 }}
                    transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                  >
                    <PaymentBlock questionnaireData={questionnaireData} appointment={appointment} skipAppointment={skipAppointment} />
                  </motion.div>
                )}
              </AnimatePresence>

              {!questionnaireDone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/30 backdrop-blur-sm border border-neutral-200/40 rounded-3xl p-8 text-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto">
                    <ClipboardList size={20} className="text-neutral-400" />
                  </div>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    Le paiement sera disponible après avoir complété le questionnaire.
                  </p>
                </motion.div>
              )}

              {questionnaireDone && !appointment && !skipAppointment ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-4 bg-white/30 backdrop-blur-sm border border-neutral-200/40 rounded-3xl p-8 text-center space-y-3"
                >
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Sélectionnez un rendez-vous Google Meet ou choisissez de le planifier plus tard pour débloquer le paiement.
                  </p>
                </motion.div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <QuestionnaireModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onComplete={handleComplete}
      />
    </>
  )
}
