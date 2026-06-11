'use client'

import { motion } from 'framer-motion'
import { Check, Globe, Package, ReceiptText, Tag } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedHostingPrice, getLocalizedPrice } from '@/config/site'
import { cn } from '@/lib/utils'

interface CartSummaryProps {
  hosting: boolean
  onHostingChange: (value: boolean) => void
}

export function CartSummary({ hosting, onHostingChange }: CartSummaryProps) {
  const { t, lang } = useLanguage()
  const price = getLocalizedPrice(lang)
  const hostingPrice = getLocalizedHostingPrice(lang)

  const totalLater = Number(price.amount) + (hosting ? Number(hostingPrice.amount) : 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white/60 backdrop-blur-2xl border border-white/70 rounded-3xl shadow-glass overflow-hidden"
    >
      {/* Inner gradient */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 via-transparent to-transparent pointer-events-none" />

      <div className="relative p-6 sm:p-8 space-y-6">
        {/* Product row */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-neutral-950 flex items-center justify-center shrink-0">
            <Package size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 tracking-tight">{t.cart.product}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Tag size={12} className="text-gold-500" />
              <span className="text-sm text-gold-600 font-medium">My Digital Career</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-neutral-950">{price.inline}</div>
            <div className="text-[11px] text-neutral-400">si vous validez</div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

        {/* Hosting option */}
        <button
          type="button"
          onClick={() => onHostingChange(!hosting)}
          aria-pressed={hosting}
          className={cn(
            'w-full rounded-2xl border p-4 text-left transition-all min-h-[56px]',
            hosting
              ? 'border-gold-400/60 bg-gold-400/10 shadow-[0_12px_30px_-24px_rgba(180,140,40,0.6)]'
              : 'border-neutral-200/80 bg-white/50 hover:border-neutral-300'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                hosting ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300 bg-white'
              )}
            >
              {hosting ? <Check size={12} strokeWidth={3} /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="flex items-center gap-1.5 font-medium text-neutral-900 text-sm">
                  <Globe size={13} className="text-gold-600" />
                  {t.cart.hosting.title}
                </span>
                <span className="text-sm font-bold text-neutral-950">{t.cart.hosting.price}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                {t.cart.hosting.description}
              </p>
            </div>
          </div>
        </button>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

        {/* Totals */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">À payer si vous validez votre E-CV</span>
            <span className="text-sm font-semibold text-neutral-900">
              {totalLater}{price.currency}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ReceiptText size={16} className="text-neutral-500" />
              <span className="font-semibold text-neutral-900">{t.cart.payment.total}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-neutral-950 tracking-tight">0</span>
              <span className="text-lg text-neutral-600">{price.currency}</span>
            </div>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t.cart.payment.paypalNote}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
