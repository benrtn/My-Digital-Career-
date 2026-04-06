'use client'

import { motion } from 'framer-motion'
import { Zap, Award, Palette, Link2, Settings, TrendingUp } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/Badge'
import { GlassCard } from '@/components/ui/GlassCard'

const icons = [Zap, Award, Palette, Link2, Settings, TrendingUp]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] },
})

export function BenefitsSection() {
  const { t } = useLanguage()

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-cream-100/40 relative">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="max-w-2xl mb-16 md:mb-20 space-y-5">
          <motion.div {...fadeUp(0)}>
            <Badge>{t.benefits.badge}</Badge>
          </motion.div>
          <motion.h2 {...fadeUp(0.1)} className="text-4xl md:text-5xl lg:text-6xl font-light tracking-[-0.03em] leading-[1.1] text-neutral-950">
            {t.benefits.title.split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
            ))}
          </motion.h2>
          <motion.p {...fadeUp(0.2)} className="text-lg text-neutral-500 leading-relaxed">
            {t.benefits.subtitle}
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.benefits.items.map((benefit, i) => {
            const Icon = icons[i]
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                <GlassCard hover padding="lg" className="h-full">
                  <div className="space-y-4">
                    <div className="w-11 h-11 rounded-2xl bg-neutral-950 flex items-center justify-center shadow-lg">
                      <Icon size={19} className="text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-neutral-900 tracking-tight">{benefit.title}</h3>
                      <p className="text-sm text-neutral-500 leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
