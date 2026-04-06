'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Zap, Shield, Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ScrollCue } from '@/components/ui/ScrollCue'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] },
})

export function OfferSection() {
  const { t } = useLanguage()

  return (
    <section id="offer" className="py-24 md:py-32 lg:py-40 bg-cream-100/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-neutral-200 to-transparent" />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-200/50 to-transparent" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20 space-y-5">
          <motion.div {...fadeUp(0)} className="flex justify-center">
            <Badge>{t.offer.badge}</Badge>
          </motion.div>
          <motion.h2 {...fadeUp(0.1)} className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-light tracking-[-0.03em] leading-[1.1] text-neutral-950">
            {t.offer.title.split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
            ))}
          </motion.h2>
          <motion.p {...fadeUp(0.2)} className="text-lg text-neutral-500 max-w-xl mx-auto">
            {t.offer.subtitle}
          </motion.p>
        </div>

        {/* Card */}
        <motion.div {...fadeUp(0.2)} className="max-w-lg mx-auto">
          <div className="relative rounded-4xl overflow-hidden">
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-4xl bg-gradient-to-br from-gold-400/20 via-transparent to-transparent blur-xl pointer-events-none -m-2" />

            <div className="relative bg-white/80 backdrop-blur-2xl border border-white/80 rounded-4xl shadow-glass-xl overflow-hidden">
              {/* Inner gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-gold-400/5 pointer-events-none rounded-4xl" />

              {/* Popular badge */}
              <div className="flex justify-center pt-8">
                <Badge variant="gold">
                  <Zap size={10} fill="currentColor" />
                  {t.offer.badge_popular}
                </Badge>
              </div>

              {/* Content */}
              <div className="relative px-8 md:px-10 pb-10 pt-6 space-y-8">
                {/* Product name + price */}
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-semibold text-neutral-900 tracking-tight">
                    {t.offer.product}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-6xl font-bold text-neutral-950 tracking-[-0.04em]">
                      {t.offer.price}
                    </span>
                    <span className="text-2xl font-light text-neutral-600">{t.offer.currency}</span>
                  </div>
                  <p className="text-sm text-neutral-400">{t.offer.period}</p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

                {/* Benefits */}
                <ul className="space-y-3.5">
                  {t.offer.benefits.map((benefit, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-neutral-950 flex items-center justify-center shrink-0">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-neutral-700">{benefit}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href="/panier" className="block">
                  <Button size="xl" className="w-full">
                    {t.offer.cta}
                  </Button>
                </Link>

              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom reassurance strip */}
        <motion.div
          {...fadeUp(0.4)}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-12"
        >
          {[
            { icon: Shield, text: 'Paiement sécurisé' },
            { icon: Clock, text: 'Livraison en 24 heures' },
            { icon: Zap, text: 'Support dédié' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-neutral-500">
              <Icon size={16} />
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <ScrollCue targetId="contact" />
    </section>
  )
}
