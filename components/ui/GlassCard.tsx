import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10 md:p-12',
}

export function GlassCard({
  children,
  className,
  hover = false,
  padding = 'lg',
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-3xl',
        'bg-white/60 backdrop-blur-2xl',
        'border border-white/70',
        'shadow-glass',
        hover && 'transition-all duration-500 hover:shadow-glass-lg hover:bg-white/75 hover:-translate-y-1',
        paddings[padding],
        className
      )}
    >
      {/* Subtle inner highlight */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
