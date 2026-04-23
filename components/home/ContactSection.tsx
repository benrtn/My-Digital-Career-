'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Send } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/Badge'
import { socialConfig } from '@/config/social'
import { siteConfig } from '@/config/site'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] },
})

export function ContactSection() {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  function handleCopyEmail() {
    navigator.clipboard.writeText(siteConfig.contactEmail).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const SOCIALS = [
    {
      key: 'instagram',
      label: 'Instagram',
      iconPath: '/reseaux/instagram.png',
      url: socialConfig.instagram.url,
      handle: socialConfig.instagram.handle,
      isLink: true,
    },
    {
      key: 'gmail',
      label: 'Gmail',
      iconPath: '/reseaux/gmail.png',
      url: null,
      handle: siteConfig.contactEmail,
      isLink: false,
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      iconPath: '/reseaux/tiktok.png',
      url: socialConfig.tiktok.url,
      handle: socialConfig.tiktok.handle,
      isLink: true,
    },
  ]

  const cardClass =
    'group flex min-h-[200px] w-full max-w-[280px] flex-col items-center justify-center gap-4 rounded-[28px] border border-neutral-200/70 bg-white/75 px-6 py-7 text-center shadow-[0_22px_60px_rgba(19,18,16,0.06)] backdrop-blur-sm transition-all duration-300 hover:border-neutral-300 hover:shadow-[0_28px_80px_rgba(19,18,16,0.12)]'

  return (
    <section id="contact" className="py-24 md:py-32 lg:py-40 bg-cream-50 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_80%,rgba(180,160,120,0.06),transparent)]" />

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-16 space-y-5">
          <motion.div {...fadeUp(0)} className="flex justify-center">
            <Badge>{t.contact.badge}</Badge>
          </motion.div>
          <motion.h2 {...fadeUp(0.1)} className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-light tracking-[-0.03em] leading-[1.1] text-neutral-950">
            {t.contact.title.split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'block font-semibold' : 'block'}>{line}</span>
            ))}
          </motion.h2>
          <motion.p {...fadeUp(0.2)} className="text-lg text-neutral-500 max-w-xl mx-auto">
            {t.contact.subtitle}
          </motion.p>
        </div>

        <motion.div {...fadeUp(0.2)} className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-center gap-5">
            {SOCIALS.map((social, i) => {
              const iconEl = (
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-white to-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_34px_rgba(17,17,17,0.08)] transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={social.iconPath}
                    alt={social.label}
                    className="h-12 w-12 object-contain"
                    loading="lazy"
                  />
                </div>
              )
              const infoEl = (
                <div className="space-y-1.5">
                  <div className="text-base font-semibold text-neutral-900">{social.label}</div>
                  <div className="text-sm text-neutral-500">{social.handle}</div>
                </div>
              )

              if (!social.isLink) {
                return (
                  <motion.button
                    key={social.key}
                    type="button"
                    onClick={handleCopyEmail}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className={cardClass}
                  >
                    {iconEl}
                    {infoEl}
                    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors group-hover:border-neutral-300 group-hover:bg-neutral-900 group-hover:text-white">
                      {copied ? (
                        <>Copié ! <Check size={14} /></>
                      ) : (
                        <>Copier <Copy size={14} /></>
                      )}
                    </div>
                  </motion.button>
                )
              }

              return (
                <motion.a
                  key={social.key}
                  href={social.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className={cardClass}
                >
                  {iconEl}
                  {infoEl}
                  <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors group-hover:border-neutral-300 group-hover:bg-neutral-900 group-hover:text-white">
                    Ouvrir
                    <Send size={14} />
                  </div>
                </motion.a>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
