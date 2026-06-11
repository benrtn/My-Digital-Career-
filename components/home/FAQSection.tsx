'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/Badge'
import { ScrollCue } from '@/components/ui/ScrollCue'
import { cn } from '@/lib/utils'

export function FAQSection() {
  const { t } = useLanguage()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 md:py-28 lg:py-32 bg-cream-50 relative">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-12 md:mb-16 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <Badge>{t.faq.badge}</Badge>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.03em] leading-[1.1] text-neutral-950"
          >
            {t.faq.title.split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
            ))}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-neutral-500 max-w-xl mx-auto"
          >
            {t.faq.subtitle}
          </motion.p>
        </div>

        <div className="space-y-3">
          {t.faq.items.map((item, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className={cn(
                  'rounded-2xl border bg-white/70 backdrop-blur-xl transition-colors',
                  isOpen ? 'border-neutral-300 shadow-glass' : 'border-neutral-200/70'
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left min-h-[56px]"
                >
                  <span className="font-medium text-neutral-900 text-[15px] leading-snug">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      'shrink-0 text-neutral-400 transition-transform duration-300',
                      isOpen && 'rotate-180 text-neutral-700'
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 sm:px-6 pb-5 text-sm leading-relaxed text-neutral-600">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>

      <ScrollCue targetId="contact" />
    </section>
  )
}
