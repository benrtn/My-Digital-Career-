'use client'

import { motion } from 'framer-motion'
import { Sparkles, Monitor, Share2, UserCheck, Layers, Smartphone } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/Badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { ScrollCue } from '@/components/ui/ScrollCue'

const icons = [Sparkles, Monitor, Layers, Share2, UserCheck, Smartphone]

export function QualityBlock() {
  const { t } = useLanguage()
  const q = t.results.quality

  return (
    <section id="results-quality" className="py-20 md:py-28 bg-cream-100/40 relative">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-14 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <Badge>{q.badge}</Badge>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-light tracking-[-0.03em] leading-[1.1] text-neutral-950"
          >
            {q.title.split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
            ))}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-neutral-500 max-w-xl mx-auto leading-relaxed"
          >
            {q.subtitle}
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {q.items.map((item, i) => {
            const Icon = icons[i]
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
              >
                <GlassCard hover padding="lg" className="h-full">
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                      <Icon size={18} className="text-neutral-700" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-neutral-900 text-sm tracking-tight">{item.title}</h3>
                      <p className="text-sm text-neutral-500 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>

      <ScrollCue targetId="results-cta" />
    </section>
  )
}
