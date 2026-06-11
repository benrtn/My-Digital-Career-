'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ScrollCue } from '@/components/ui/ScrollCue'
import { resultItems } from '@/data/results'

const SLIDE_INTERVAL = 5000

function BrowserMockup({ item }: { item: typeof resultItems[0] }) {
  // Visual example only — client e-CVs are intentionally not linked.
  return (
    <div className="rounded-[2rem] overflow-hidden shadow-glass-lg border border-white/70 bg-white/60 backdrop-blur-xl">
      <div className="relative overflow-hidden aspect-[16/10]">
        <img
          src={item.imagePath}
          alt="Exemple de site My Digital Career"
          className="h-full w-full object-cover object-top"
          loading="eager"
        />
        <span className="absolute left-4 top-4 rounded-full bg-neutral-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
          Exemple
        </span>
      </div>
    </div>
  )
}

export function ResultsGallery() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % resultItems.length)
    }, SLIDE_INTERVAL)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <section id="results-gallery" className="py-20 md:py-28 bg-cream-50 relative">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="max-w-7xl mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={resultItems[current].id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            >
              <BrowserMockup item={resultItems[current]} />
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-center gap-2">
            {resultItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Voir l'exemple ${index + 1}`}
                onClick={() => setCurrent(index)}
                className={index === current ? 'h-2.5 w-8 rounded-full bg-neutral-950' : 'h-2.5 w-2.5 rounded-full bg-neutral-300 transition-colors hover:bg-neutral-400'}
              />
            ))}
          </div>

          <div className="mt-4 h-1 rounded-full bg-neutral-200/70 overflow-hidden">
            <motion.div
              key={resultItems[current].id}
              className="h-full rounded-full bg-neutral-950"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: SLIDE_INTERVAL / 1000, ease: 'linear' }}
            />
          </div>

          <div className="mt-8 flex justify-center">
            <Link href="/panier">
              <Button size="lg">
                Commander mon E-CV !
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      <ScrollCue targetId="results-concept" />
    </section>
  )
}
