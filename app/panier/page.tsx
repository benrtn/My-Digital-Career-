'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react'
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
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

          <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">
            {/* Left column */}
            <div className="space-y-6">
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
                >
                  <AppointmentScheduler value={appointment} onChange={setAppointment} />
                </motion.div>
              ) : null}
            </div>

            {/* Right column — payment */}
            <div>
              <AnimatePresence>
                {questionnaireDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.97 }}
                    transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                  >
                    <PaymentBlock questionnaireData={questionnaireData} appointment={appointment} />
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

              {questionnaireDone && !appointment ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-4 bg-white/30 backdrop-blur-sm border border-neutral-200/40 rounded-3xl p-8 text-center space-y-3"
                >
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Sélectionne d’abord un rendez-vous Google Meet pour débloquer le paiement démo.
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
