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
}

const sizes = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
}

export function Modal({ open, onClose, children, title, size = 'lg', className }: ModalProps) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-neutral-950/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={cn(
              'relative w-full z-10',
              'bg-white/80 backdrop-blur-3xl',
              'border border-white/80',
              'shadow-glass-xl rounded-3xl',
              'max-h-[90vh] overflow-hidden flex flex-col',
              sizes[size],
              className
            )}
          >
            {/* Inner gradient */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/60 via-white/20 to-transparent pointer-events-none" />

            {/* Header */}
            {title && (
              <div className="relative flex items-center justify-between px-8 pt-7 pb-5 border-b border-neutral-100/70">
                <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-9 h-9 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100/70 transition-all duration-200"
                >
                  <X size={18} />
                </button>
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
