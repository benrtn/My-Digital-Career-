'use client'

import { motion } from 'framer-motion'
import { Package, Tag, ReceiptText } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedPrice } from '@/config/site'

export function CartSummary() {
  const { t, lang } = useLanguage()
  const price = getLocalizedPrice(lang)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white/60 backdrop-blur-2xl border border-white/70 rounded-3xl shadow-glass overflow-hidden"
    >
      {/* Inner gradient */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 via-transparent to-transparent pointer-events-none" />

      <div className="relative p-8 space-y-6">
        {/* Product row */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-neutral-950 flex items-center justify-center shrink-0">
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
            <div className="text-lg font-bold text-neutral-950">
              {price.inline}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

        {/* Rows */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">{t.cart.quantity}</span>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl border border-neutral-200 flex items-center justify-center text-sm font-semibold text-neutral-900 bg-white/60">
                1
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">{t.cart.price}</span>
            <span className="text-sm font-medium text-neutral-900">{price.inline}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ReceiptText size={16} className="text-neutral-500" />
            <span className="font-semibold text-neutral-900">{t.cart.total}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-neutral-950 tracking-tight">
              {price.amount}
            </span>
            <span className="text-lg text-neutral-600">{price.currency}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
