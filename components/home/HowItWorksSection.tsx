'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, FileText, Monitor, MessageSquareMore, Download } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/Badge'
import { ScrollCue } from '@/components/ui/ScrollCue'

const stepIcons = [ShoppingBag, FileText, Monitor, MessageSquareMore, Download]

export function HowItWorksSection() {
  const { t } = useLanguage()

  return (
    <section id="how-it-works" className="py-24 md:py-32 lg:py-40 bg-neutral-950 relative overflow-hidden">
      {/* Decorative lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-20 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <Badge variant="subtle" className="border-white/20 text-white/60 bg-white/5">
              {t.howItWorks.badge}
            </Badge>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-light tracking-[-0.03em] leading-[1.1] text-white"
          >
            {t.howItWorks.title.split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
            ))}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-neutral-400 max-w-xl mx-auto leading-relaxed"
          >
            {t.howItWorks.subtitle}
          </motion.p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-6 relative">
          {t.howItWorks.steps.map((step, i) => {
            const Icon = stepIcons[i] ?? FileText
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.12, duration: 0.6 }}
                className="relative h-full"
              >
                {/* Card */}
                <div className="h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 space-y-6 hover:bg-white/8 transition-all duration-300">
                  {/* Step number + icon */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                        <Icon size={22} className="text-white/80" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-white text-neutral-950 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <span className="text-5xl font-bold text-white/8 tracking-tighter select-none">
                      {step.number}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white tracking-tight whitespace-pre-line">{step.title}</h3>
                    <p className="text-neutral-400 leading-relaxed text-sm">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <ScrollCue targetId="offer" dark />
    </section>
  )
}
