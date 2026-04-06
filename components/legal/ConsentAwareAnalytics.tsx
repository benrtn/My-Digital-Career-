'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { useCookieConsent } from '@/contexts/CookieConsentContext'
import { GA_ID } from '@/lib/analytics'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function ConsentAwareAnalytics() {
  const { hydrated, preferences } = useCookieConsent()

  useEffect(() => {
    if (!hydrated || !window.gtag) return

    window.gtag('consent', 'update', {
      analytics_storage: preferences.analytics ? 'granted' : 'denied',
      ad_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    })
  }, [hydrated, preferences.analytics])

  if (!GA_ID || !hydrated || !preferences.analytics) {
    return null
  }

  return (
    <>
      {/* Google Analytics is intentionally loaded only after analytics consent is granted. */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            functionality_storage: 'granted',
            security_storage: 'granted'
          });
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  )
}
