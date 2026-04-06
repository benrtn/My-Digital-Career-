'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ScrollCue } from '@/components/ui/ScrollCue'
import { portfolioItems } from '@/data/portfolio'
import { cn } from '@/lib/utils'

const SLIDE_INTERVAL = 6000

function MockSite({ item }: { item: typeof portfolioItems[0] }) {
  const [c1, c2] = item.mockColors

  return (
    <div className={cn('rounded-2xl overflow-hidden bg-gradient-to-br', item.gradient)}>
      {item.imagePath ? (
        <div className="overflow-hidden aspect-[16/10]">
          <img
            src={item.imagePath}
            alt="Exemple de site My Digital Career"
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
            loading="eager"
          />
        </div>
      ) : (
        <div className="p-5 space-y-4 min-h-[200px]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${c2}80, ${c2}40)` }} />
            <div className="space-y-1.5">
              <div className="h-3 rounded bg-white/70 w-28" />
              <div className="h-2 rounded bg-white/35 w-20" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 rounded bg-white/25 w-full" />
            <div className="h-2 rounded bg-white/20 w-4/5" />
            <div className="h-2 rounded bg-white/15 w-3/5" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['Design', 'Creative', 'Digital'].map(tag => (
              <div key={tag} className="h-5 px-2 rounded-lg flex items-center" style={{ background: `${c2}30`, border: `1px solid ${c2}40` }}>
                <div className="h-1.5 rounded w-10" style={{ background: `${c2}80` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-1">
            <div className="space-y-1">
              <div className="h-2 rounded bg-white/20 w-24" />
              <div className="h-1.5 rounded bg-white/12 w-16" />
            </div>
            <div className="h-8 w-20 rounded-xl flex items-center justify-center" style={{ background: c2 }}>
              <div className="h-1.5 rounded bg-white/80 w-10" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function PortfolioSlider() {
  const { t } = useLanguage()
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const total = portfolioItems.length

  const goTo = useCallback((idx: number, dir = 1) => {
    setDirection(dir)
    setCurrent(idx)
  }, [])

  const prev = useCallback(() => {
    goTo((current - 1 + total) % total, -1)
  }, [current, total, goTo])

  const next = useCallback(() => {
    goTo((current + 1) % total, 1)
  }, [current, total, goTo])

  useEffect(() => {
    const timer = setInterval(next, SLIDE_INTERVAL)
    return () => clearInterval(timer)
  }, [next])

  const item = portfolioItems[current]
  const title = (t.portfolio.items as any)[item.id]?.title ?? item.id
  const profession = (t.portfolio.items as any)[item.id]?.profession ?? ''
  const description = (t.portfolio.items as any)[item.id]?.description ?? ''
  const hoverCta = (t.portfolio as any).hoverCta ?? 'Voir nos créations'

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: -dir * 40 }),
  }

  return (
    <section id="portfolio" className="py-24 md:py-32 lg:py-40 bg-cream-50 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Subtle bg */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_60%,rgba(180,160,120,0.06),transparent)]" />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-16 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <Badge>{t.portfolio.badge}</Badge>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-light tracking-[-0.03em] leading-[1.1] text-neutral-950"
          >
            {t.portfolio.title.split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
            ))}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed italic"
          >
            {t.portfolio.subtitle}
          </motion.p>
        </div>

        {/* Slider */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: mock site */}
            <div className="relative overflow-hidden rounded-3xl">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Link href="/resultats" className="group block">
                    <div className="relative bg-white/60 backdrop-blur-xl border border-white/70 rounded-3xl shadow-glass-lg p-4 overflow-hidden">
                      <MockSite item={item} />
                      <div className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-[1.25rem] bg-neutral-950/0 transition-colors duration-300 group-hover:bg-neutral-950/40">
                        <span className="rounded-2xl bg-white/95 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-lg opacity-0 transition-all duration-300 group-hover:opacity-100">
                          {hoverCta}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right: info */}
            <div className="space-y-6 flex flex-col h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-2xl font-semibold text-neutral-900 tracking-tight">{title}</h3>
                    <p className="text-gold-500 font-medium text-sm mt-1">{profession}</p>
                  </div>
                  <p className="text-neutral-500 leading-relaxed">{description}</p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-auto pt-4">
                <Link href="/panier">
                  <Button size="lg" icon={<ShoppingBag size={16} />}>
                    {t.portfolio.cta}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-10">
            {/* Dots */}
            <div className="flex gap-2">
              {portfolioItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > current ? 1 : -1)}
                  className={cn(
                    'transition-all duration-300 rounded-full',
                    i === current
                      ? 'w-6 h-2 bg-neutral-950'
                      : 'w-2 h-2 bg-neutral-300 hover:bg-neutral-400'
                  )}
                />
              ))}
            </div>

            {/* Prev / Next */}
            <div className="flex gap-2">
              <button
                onClick={prev}
                className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur-sm border border-neutral-200/60 flex items-center justify-center text-neutral-600 hover:bg-white hover:text-neutral-900 transition-all duration-200 shadow-glass"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center text-white hover:bg-neutral-800 transition-all duration-200 shadow-lg"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-px bg-neutral-200/60 rounded-full overflow-hidden">
            <motion.div
              key={current}
              className="h-full bg-neutral-950 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: SLIDE_INTERVAL / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </div>

      <ScrollCue targetId="how-it-works" />
    </section>
  )
}
