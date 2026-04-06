import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'gold' | 'success' | 'subtle'
}

const variants = {
  default:
    'bg-neutral-100/80 text-neutral-600 border border-neutral-200/60',
  gold:
    'bg-gold-500/10 text-gold-600 border border-gold-400/30',
  success:
    'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  subtle:
    'bg-white/60 text-neutral-500 border border-white/70 backdrop-blur-sm',
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
