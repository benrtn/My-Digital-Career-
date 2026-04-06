'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-neutral-950 text-white hover:bg-neutral-800 shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.22)]',
  secondary:
    'bg-white/80 text-neutral-900 border border-neutral-200/80 hover:bg-white hover:border-neutral-300 shadow-glass hover:shadow-glass-lg backdrop-blur-xl',
  ghost:
    'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/70',
  outline:
    'border border-neutral-900/20 text-neutral-900 hover:bg-neutral-900 hover:text-white hover:border-neutral-900',
  gold:
    'bg-gradient-to-r from-gold-500 to-gold-400 text-white shadow-[0_4px_16px_rgba(184,151,62,0.30)] hover:shadow-[0_8px_28px_rgba(184,151,62,0.40)] hover:from-gold-600 hover:to-gold-500',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm gap-1.5 rounded-xl',
  md: 'px-6 py-3 text-sm gap-2 rounded-xl',
  lg: 'px-8 py-4 text-base gap-2.5 rounded-2xl',
  xl: 'px-10 py-5 text-base gap-3 rounded-2xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      iconRight,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'relative inline-flex items-center justify-center font-medium tracking-[-0.01em]',
          'transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...(props as any)}
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="opacity-70">{children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
            {iconRight && <span className="shrink-0">{iconRight}</span>}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
