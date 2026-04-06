'use client'

import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/Badge'
import { ScrollCue } from '@/components/ui/ScrollCue'

export function ResultsHero() {
  const { t } = useLanguage()
  const h = t.results.hero

  return (
    <section id="results-hero" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-cream-50">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_20%,rgba(200,190,170,0.12),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 text-center space-y-7">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <Badge>
            <Eye size={11} />
            {h.badge}
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-light tracking-[-0.03em] leading-[1.05] text-neutral-950"
        >
          {h.title.split('\n').map((line, i) => (
            <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base text-neutral-500 leading-relaxed max-w-2xl mx-auto"
        >
          {h.subtitle}
        </motion.p>
      </div>

      <ScrollCue targetId="results-gallery" />
    </section>
  )
}
