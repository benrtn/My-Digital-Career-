'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/Badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { ScrollCue } from '@/components/ui/ScrollCue'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] },
})

export function ConceptSection() {
  const { t } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const beforeTitle = t.concept.before.label
  const afterTitle = t.concept.after.label

  return (
    <section id="results-concept" ref={ref} className="py-24 md:py-32 lg:py-40 bg-cream-50 relative">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-16 md:mb-20 space-y-5 text-center">
          <motion.div {...fadeUp(0)} className="flex justify-center">
            <Badge>{t.concept.badge}</Badge>
          </motion.div>
          <motion.h2 {...fadeUp(0.1)} className="text-4xl md:text-5xl lg:text-6xl font-light tracking-[-0.03em] leading-[1.1] text-neutral-950">
            {t.concept.title.split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
            ))}
          </motion.h2>
          <motion.p {...fadeUp(0.2)} className="max-w-3xl mx-auto text-lg text-neutral-500 leading-relaxed">
            {t.concept.subtitle}
          </motion.p>
        </div>

        {/* Comparison */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Before */}
          <motion.div {...fadeUp(0.2)}>
            <GlassCard className="border-neutral-200/60" padding="lg">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                    <X size={16} className="text-red-400" strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-neutral-700 text-sm tracking-tight">
                    {beforeTitle}
                  </span>
                </div>
                <ul className="space-y-3.5">
                  {t.concept.before.items.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0 mt-0.5">
                        <X size={10} className="text-red-400" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-neutral-500 leading-relaxed">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          </motion.div>

          {/* After */}
          <motion.div {...fadeUp(0.3)}>
            <GlassCard className="border-emerald-200/40 bg-gradient-to-br from-white/70 to-emerald-50/30" padding="lg">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
                    <Check size={16} className="text-emerald-500" strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-neutral-900 text-sm tracking-tight">
                    {afterTitle}
                  </span>
                </div>
                <ul className="space-y-3.5">
                  {t.concept.after.items.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-neutral-700 leading-relaxed font-medium">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Arrow connector (desktop) */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="hidden md:block absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>

      <ScrollCue targetId="results-quality" />
    </section>
  )
}
