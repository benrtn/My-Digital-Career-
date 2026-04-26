'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/Button'
import { ScrollCue } from '@/components/ui/ScrollCue'
import { portfolioItems } from '@/data/portfolio'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'

const SLIDE_INTERVAL = 6000

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] },
})

function HeroCarousel() {
  const { t } = useLanguage()
  const [current, setCurrent] = useState(0)
  const currentItem = portfolioItems[current]
  const hoverCta = (t.portfolio as any).hoverCta ?? 'Voir nos créations'

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % portfolioItems.length)
    }, SLIDE_INTERVAL)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-[816px] mx-auto lg:mx-0 space-y-4"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <Link href="/resultats" className="group block" onClick={() => trackEvent('cta_click', { cta_name: 'hero_carousel', page: 'home' })}>
            <div className="relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 shadow-glass-xl">
              <div className={cn('overflow-hidden bg-gradient-to-br', currentItem.gradient)}>
                <img
                  src={currentItem.imagePath}
                  alt="Exemple de site My Digital Career"
                  className="block h-auto w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="eager"
                  width={816}
                  height={500}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/0 transition-colors duration-300 group-hover:bg-neutral-950/40">
                <span className="rounded-2xl bg-white/95 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-lg opacity-0 transition-all duration-300 group-hover:opacity-100">
                  {hoverCta}
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-center gap-2">
        {portfolioItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Voir l'exemple ${index + 1}`}
            onClick={() => setCurrent(index)}
            className={index === current ? 'h-2.5 w-8 rounded-full bg-neutral-950 transition-all' : 'h-2.5 w-2.5 rounded-full bg-neutral-300 transition-colors hover:bg-neutral-400'}
          />
        ))}
      </div>
    </motion.div>
  )
}

export function Hero() {
  const { t } = useLanguage()

  const titleLines = t.hero.title.split('\n')

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-cream-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(200,190,170,0.15),transparent)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gold-400/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-400/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — text */}
          <div className="space-y-8">
            <motion.h1
              {...fadeUp(0.1)}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-light tracking-[-0.03em] leading-[1.08] text-neutral-950"
            >
              {titleLines.map((line, i) => (
                <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>
                  {line}
                </span>
              ))}
            </motion.h1>

            <motion.p {...fadeUp(0.2)} className="text-lg text-neutral-500 leading-relaxed max-w-lg whitespace-pre-line">
              {t.hero.subtitle}
            </motion.p>

            {/* Price tag — mobile */}
            <motion.div {...fadeUp(0.3)} className="inline-flex flex-col gap-0.5 lg:hidden">
              <div className="inline-flex items-baseline gap-2">
                <span className="text-5xl font-bold text-neutral-950 tracking-tight">
                  {t.hero.price}
                </span>
              </div>
              {t.hero.priceSub ? (
                <span className="text-sm text-neutral-400">{t.hero.priceSub}</span>
              ) : null}
            </motion.div>

            {/* CTAs — mobile */}
            <motion.div {...fadeUp(0.35)} className="flex flex-col sm:flex-row gap-3 lg:hidden">
              <Link href="/panier" onClick={() => trackEvent('cta_click', { cta_name: 'hero_order_mobile', page: 'home' })}>
                <Button size="lg" iconRight={<ArrowRight size={18} />}>
                  {t.hero.cta}
                </Button>
              </Link>
              <Link href="/resultats" onClick={() => trackEvent('cta_click', { cta_name: 'hero_examples_mobile', page: 'home' })}>
                <Button size="lg" variant="secondary">
                  {t.hero.ctaSecondary}
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div {...fadeUp(0.45)} className="flex flex-wrap items-stretch justify-center sm:justify-start gap-3 pt-2">
              {(t.hero.trustBadges as { label: string; value: string }[]).map(({ value, label }, i) => {
                const accents = [
                  'bg-amber-50 border-amber-200/70 text-amber-700',
                  'bg-emerald-50 border-emerald-200/70 text-emerald-700',
                  'bg-blue-50 border-blue-200/70 text-blue-700',
                ]
                return (
                  <div
                    key={i}
                    className="min-w-[100px] sm:min-w-[132px] flex-1 sm:flex-none rounded-2xl border border-neutral-200/80 bg-white/80 backdrop-blur-xl px-3 sm:px-5 py-3 sm:py-4 text-center shadow-glass"
                  >
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${accents[i]}`}>
                      {label}
                    </span>
                    <div className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">
                      {value}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          </div>

          {/* Right — browser mockup */}
          <div className="relative hidden lg:block space-y-5">
            <HeroCarousel />

            <motion.div
              {...fadeUp(0.4)}
              className="flex items-center justify-center gap-3 flex-wrap"
            >
              <Link href="/panier" onClick={() => trackEvent('cta_click', { cta_name: 'hero_price_badge', page: 'home' })}>
                <Button size="lg" variant="gold" className="h-[58px] w-[58px] px-0 justify-center">
                  {t.hero.price}
                </Button>
              </Link>
              <Link href="/panier" onClick={() => trackEvent('cta_click', { cta_name: 'hero_order', page: 'home' })}>
                <Button size="lg" iconRight={<ArrowRight size={18} />} className="h-[58px]">
                  {t.hero.cta}
                </Button>
              </Link>
              <Link href="/resultats" onClick={() => trackEvent('cta_click', { cta_name: 'hero_examples', page: 'home' })}>
                <Button size="lg" variant="secondary" className="h-[58px]">
                  {t.hero.ctaSecondary}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        <ScrollCue targetId="how-it-works" />
      </div>
    </section>
  )
}
