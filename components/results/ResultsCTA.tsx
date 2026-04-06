'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/Button'

export function ResultsCTA() {
  const { t } = useLanguage()
  const c = t.results.cta

  return (
    <section id="results-cta" className="py-24 md:py-32 bg-neutral-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-white/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center space-y-8">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-6xl lg:text-7xl font-light tracking-[-0.03em] leading-[1.05] text-white"
        >
          {c.title.split('\n').map((line, i) => (
            <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
          ))}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-lg text-neutral-400 leading-relaxed max-w-lg mx-auto"
        >
          {c.subtitle}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
        >
          <Link href="/panier">
            <Button
              size="xl"
              variant="gold"
              iconRight={<ArrowRight size={18} />}
              className="text-base"
            >
              {c.cta}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
