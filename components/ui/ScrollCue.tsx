'use client'

import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

interface ScrollCueProps {
  targetId: string
  dark?: boolean
  className?: string
}

export function ScrollCue({ targetId, dark = false, className }: ScrollCueProps) {
  const { t } = useLanguage()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2, duration: 0.8 }}
      className={cn(
        'pointer-events-none absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 cursor-default select-none flex-col items-center gap-2',
        className
      )}
      aria-label={t.hero.scrollHint}
    >
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className={cn(
          'flex h-8 w-5 items-start justify-center rounded-full border pt-1.5 transition-colors',
          dark ? 'border-white/30 hover:border-white/60' : 'border-neutral-300 hover:border-neutral-500'
        )}
      >
        <div className={cn('h-2 w-1 rounded-full', dark ? 'bg-white/70' : 'bg-neutral-400')} />
      </motion.div>
    </motion.div>
  )
}
