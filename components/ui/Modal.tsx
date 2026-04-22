'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  size?: 'md' | 'lg' | 'xl' | 'full'
  className?: string
  headerAction?: {
    label: string
    icon: React.ReactNode
    onClick: () => void
  }
}

const sizes = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
}

export function Modal({
  open,
  onClose,
  children,
  title,
  size = 'lg',
  className,
  headerAction,
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_28%),linear-gradient(180deg,rgba(10,10,10,0.7),rgba(10,10,10,0.5))] backdrop-blur-md"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={cn(
              'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[2rem]',
              'border border-neutral-100/90 bg-[linear-gradient(180deg,rgba(255,252,246,0.995),rgba(255,255,255,0.985))] backdrop-blur-3xl',
              'shadow-[0_45px_140px_-65px_rgba(15,23,42,0.7)]',
              sizes[size],
              className
            )}
          >
            {/* Inner gradient */}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.04),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.35),transparent_22%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70" />

            {!title ? (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-neutral-500 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-px hover:bg-white hover:text-neutral-800"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            ) : null}

            {/* Header */}
            {title && (
              <div className="relative border-b border-neutral-200/80 px-7 pb-5 pt-6 md:px-8 md:pt-7">
                <div className="mb-3 inline-flex items-center rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)]">
                  My Digital Career
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  {headerAction ? (
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={headerAction.onClick}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white/80 text-neutral-500 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.4)] transition-all duration-200 hover:-translate-y-px hover:bg-white hover:text-neutral-800"
                        aria-label={headerAction.label}
                      >
                        {headerAction.icon}
                      </button>
                      <h2 className="truncate text-[1.35rem] font-semibold tracking-[-0.03em] text-neutral-950">
                        {title}
                      </h2>
                    </div>
                  ) : (
                    <h2 className="truncate text-[1.35rem] font-semibold tracking-[-0.03em] text-neutral-950">
                      {title}
                    </h2>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white/80 text-neutral-500 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.4)] transition-all duration-200 hover:-translate-y-px hover:bg-white hover:text-neutral-800"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="relative flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
